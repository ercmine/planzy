import { randomBytes, randomUUID } from "node:crypto";

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { getAddress, verifyMessage } from "viem";

import { ValidationError } from "../plans/errors.js";
import type { AccountsService } from "../accounts/service.js";
import type { AuthSession, WalletAuthStore, WalletChallengeIntent, WalletChain, WalletIdentity, WalletLoginChallenge, WalletProvider } from "./types.js";

function nowIso() { return new Date().toISOString(); }

export class WalletAuthService {
  private readonly challengeTtlMs = Number.parseInt(process.env.PERBUG_WALLET_CHALLENGE_TTL_MS ?? String(5 * 60 * 1000), 10);
  private readonly sessionTtlMs = Number.parseInt(process.env.PERBUG_WALLET_SESSION_TTL_MS ?? String(30 * 24 * 60 * 60 * 1000), 10);

  constructor(private readonly store: WalletAuthStore, private readonly accounts: AccountsService) {}

  createChallenge(input: { chain: WalletChain; provider: WalletProvider; address: string; intent?: WalletChallengeIntent; sessionToken?: string }) {
    const normalizedAddress = this.normalizeAddress(input.chain, input.address);
    const existingIdentity = this.store.getIdentityByAddress(input.chain, normalizedAddress);
    const challengeId = `wch_${randomUUID()}`;
    const nonce = randomBytes(18).toString("base64url");
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + this.challengeTtlMs).toISOString();
    const intent = input.intent ?? "login";
    const requestingSession = input.sessionToken ? this.getSession(input.sessionToken) : undefined;
    const accountProvisioningState = intent === "link"
      ? "link_pending"
      : existingIdentity ? "existing" : "new";
    const message = this.buildMessage({ chain: input.chain, address: normalizedAddress, nonce, createdAt, challengeId, intent });
    const challenge: WalletLoginChallenge = {
      id: challengeId,
      nonce,
      chain: input.chain,
      provider: input.provider,
      normalizedAddress,
      message,
      intent,
      accountProvisioningState,
      createdAt,
      expiresAt,
      requestedBySessionId: requestingSession?.id
    };
    this.store.saveChallenge(challenge);
    return {
      challengeId,
      nonce,
      message,
      expiresAt,
      authState: "awaiting_signature" as const,
      accountProvisioningState
    };
  }

  async verifyChallenge(input: { challengeId: string; signature: string; address: string; sessionToken?: string }) {
    const challenge = this.store.getChallenge(input.challengeId);
    if (!challenge) throw new ValidationError(["challenge_not_found"]);
    if (challenge.consumedAt) throw new ValidationError(["challenge_already_used"]);
    if (Date.parse(challenge.expiresAt) <= Date.now()) throw new ValidationError(["challenge_expired"]);

    const normalizedAddress = this.normalizeAddress(challenge.chain, input.address);
    if (normalizedAddress !== challenge.normalizedAddress) throw new ValidationError(["address_mismatch"]);

    const verified = await this.verifySignature(challenge.chain, challenge.message, challenge.normalizedAddress, input.signature);
    if (!verified) {
      this.auditVerification(challenge, false, "invalid_signature");
      throw new ValidationError(["invalid_signature"]);
    }

    challenge.consumedAt = nowIso();
    this.store.saveChallenge(challenge);
    this.auditVerification(challenge, true);

    const linked = this.store.getIdentityByAddress(challenge.chain, challenge.normalizedAddress);
    const linkingSession = challenge.intent === "link" ? this.requireSession(input.sessionToken) : undefined;
    const userId = linkingSession?.userId ?? linked?.userId ?? `wallet_${challenge.chain}_${challenge.normalizedAddress.slice(0, 10).replace(/[^a-zA-Z0-9]/g, "")}`;
    this.accounts.ensureUserIdentity(userId);

    const identity = linked ?? this.createIdentity({
      userId,
      chain: challenge.chain,
      provider: challenge.provider,
      normalizedAddress: challenge.normalizedAddress
    });
    if (identity.userId !== userId) throw new ValidationError(["wallet_already_linked_to_other_account"]);
    identity.provider = challenge.provider;
    identity.lastVerifiedAt = nowIso();
    identity.isPrimary = true;
    this.store.saveIdentity(identity);

    const session = this.createSession(userId, identity.id);

    return {
      authState: "authenticated" as const,
      userId,
      sessionToken: session.token,
      sessionExpiresAt: session.expiresAt,
      wallet: identity,
      accountProvisioningState: linked ? "existing" : "new"
    };
  }

  restoreSession(token?: string) {
    if (!token) return { authState: "signed_out" as const };
    const session = this.getSession(token);
    if (!session) return { authState: "signed_out" as const };
    const wallets = this.store.listIdentitiesByUser(session.userId);
    return {
      authState: "authenticated" as const,
      userId: session.userId,
      sessionExpiresAt: session.expiresAt,
      wallets
    };
  }

  logout(token?: string): { ok: boolean } {
    if (!token) return { ok: true };
    const session = this.getSession(token);
    if (!session) return { ok: true };
    this.store.revokeSession(session.id, nowIso());
    return { ok: true };
  }

  listWalletsForSession(token: string): WalletIdentity[] {
    const session = this.requireSession(token);
    return this.store.listIdentitiesByUser(session.userId);
  }

  getVerificationEvents(limit = 50) {
    return this.store.listVerificationEvents(limit);
  }

  private buildMessage(input: { chain: WalletChain; address: string; nonce: string; createdAt: string; challengeId: string; intent: WalletChallengeIntent }): string {
    return [
      "Enter Perbug world with your wallet identity.",
      `Action: ${input.intent}`,
      `Chain: ${input.chain}`,
      `Wallet: ${input.address}`,
      `Nonce: ${input.nonce}`,
      `Challenge: ${input.challengeId}`,
      `Issued At: ${input.createdAt}`,
      "This request signs in to Perbug and does not trigger a blockchain transaction."
    ].join("\n");
  }

  private normalizeAddress(chain: WalletChain, address: string): string {
    if (!address?.trim()) throw new ValidationError(["address_required"]);
    if (chain === "evm") {
      try {
        return getAddress(address.trim());
      } catch {
        throw new ValidationError(["invalid_evm_address"]);
      }
    }
    try {
      return new PublicKey(address.trim()).toBase58();
    } catch {
      throw new ValidationError(["invalid_solana_address"]);
    }
  }

  private async verifySignature(chain: WalletChain, message: string, normalizedAddress: string, signature: string): Promise<boolean> {
    if (chain === "evm") {
      try {
        return await verifyMessage({ address: normalizedAddress as `0x${string}`, message, signature: signature as `0x${string}` });
      } catch {
        return false;
      }
    }
    try {
      const signatureBytes = bs58.decode(signature);
      const keyBytes = new PublicKey(normalizedAddress).toBytes();
      return nacl.sign.detached.verify(new TextEncoder().encode(message), signatureBytes, keyBytes);
    } catch {
      return false;
    }
  }

  private createIdentity(input: { userId: string; chain: WalletChain; provider: WalletProvider; normalizedAddress: string }): WalletIdentity {
    return {
      id: `wid_${randomUUID()}`,
      userId: input.userId,
      chain: input.chain,
      provider: input.provider,
      normalizedAddress: input.normalizedAddress,
      displayAddress: this.displayAddress(input.normalizedAddress),
      linkedAt: nowIso(),
      lastVerifiedAt: nowIso(),
      isPrimary: true
    };
  }

  private createSession(userId: string, walletIdentityId: string): AuthSession {
    const session: AuthSession = {
      id: `sess_${randomUUID()}`,
      token: randomBytes(32).toString("base64url"),
      userId,
      walletIdentityId,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + this.sessionTtlMs).toISOString()
    };
    this.store.saveSession(session);
    return session;
  }

  private displayAddress(address: string): string {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  private getSession(token: string): AuthSession | undefined {
    const session = this.store.getSessionByToken(token);
    if (!session) return undefined;
    if (session.revokedAt) return undefined;
    if (Date.parse(session.expiresAt) <= Date.now()) return undefined;
    return session;
  }

  private requireSession(token?: string): AuthSession {
    if (!token) throw new ValidationError(["session_required"]);
    const session = this.getSession(token);
    if (!session) throw new ValidationError(["invalid_session"]);
    return session;
  }

  private auditVerification(challenge: WalletLoginChallenge, succeeded: boolean, reason?: string): void {
    this.store.saveVerificationEvent({
      id: `wev_${randomUUID()}`,
      challengeId: challenge.id,
      chain: challenge.chain,
      normalizedAddress: challenge.normalizedAddress,
      succeeded,
      reason,
      createdAt: nowIso()
    });
  }
}
