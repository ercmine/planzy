import type { AuthSession, WalletAuthStore, WalletChain, WalletIdentity, WalletLoginChallenge, WalletVerificationEvent } from "./types.js";

export class MemoryWalletAuthStore implements WalletAuthStore {
  private challenges = new Map<string, WalletLoginChallenge>();
  private identities = new Map<string, WalletIdentity>();
  private identitiesByUser = new Map<string, string[]>();
  private sessionsByToken = new Map<string, AuthSession>();
  private sessionsById = new Map<string, AuthSession>();
  private events: WalletVerificationEvent[] = [];

  saveChallenge(challenge: WalletLoginChallenge): void {
    this.challenges.set(challenge.id, structuredClone(challenge));
  }

  getChallenge(challengeId: string): WalletLoginChallenge | undefined {
    const challenge = this.challenges.get(challengeId);
    return challenge ? structuredClone(challenge) : undefined;
  }

  saveIdentity(identity: WalletIdentity): void {
    const key = this.identityKey(identity.chain, identity.normalizedAddress);
    this.identities.set(key, structuredClone(identity));
    const ids = new Set(this.identitiesByUser.get(identity.userId) ?? []);
    ids.add(identity.id);
    this.identitiesByUser.set(identity.userId, [...ids]);
  }

  getIdentityByAddress(chain: WalletChain, normalizedAddress: string): WalletIdentity | undefined {
    const identity = this.identities.get(this.identityKey(chain, normalizedAddress));
    return identity ? structuredClone(identity) : undefined;
  }

  listIdentitiesByUser(userId: string): WalletIdentity[] {
    const ids = this.identitiesByUser.get(userId) ?? [];
    return ids
      .map((id) => [...this.identities.values()].find((entry) => entry.id === id))
      .filter((entry): entry is WalletIdentity => Boolean(entry))
      .map((entry) => structuredClone(entry));
  }

  saveSession(session: AuthSession): void {
    const cloned = structuredClone(session);
    this.sessionsByToken.set(session.token, cloned);
    this.sessionsById.set(session.id, cloned);
  }

  getSessionByToken(token: string): AuthSession | undefined {
    const session = this.sessionsByToken.get(token);
    return session ? structuredClone(session) : undefined;
  }

  revokeSession(sessionId: string, revokedAt: string): void {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;
    session.revokedAt = revokedAt;
    this.saveSession(session);
  }

  saveVerificationEvent(event: WalletVerificationEvent): void {
    this.events.unshift(structuredClone(event));
    if (this.events.length > 200) this.events.length = 200;
  }

  listVerificationEvents(limit: number): WalletVerificationEvent[] {
    return this.events.slice(0, limit).map((item) => structuredClone(item));
  }

  private identityKey(chain: WalletChain, normalizedAddress: string): string {
    return `${chain}:${normalizedAddress}`;
  }
}
