export type WalletChain = "evm" | "solana";
export type WalletProvider = "metamask" | "phantom" | "walletconnect";
export type WalletChallengeIntent = "login" | "link";

export interface WalletIdentity {
  id: string;
  userId: string;
  chain: WalletChain;
  provider: WalletProvider;
  normalizedAddress: string;
  displayAddress: string;
  linkedAt: string;
  lastVerifiedAt: string;
  isPrimary: boolean;
}

export interface WalletLoginChallenge {
  id: string;
  nonce: string;
  chain: WalletChain;
  provider: WalletProvider;
  normalizedAddress: string;
  message: string;
  intent: WalletChallengeIntent;
  accountProvisioningState: "existing" | "new" | "link_pending";
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  requestedBySessionId?: string;
}

export interface AuthSession {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  walletIdentityId?: string;
}

export interface WalletVerificationEvent {
  id: string;
  challengeId: string;
  chain: WalletChain;
  normalizedAddress: string;
  succeeded: boolean;
  reason?: string;
  createdAt: string;
}

export interface WalletAuthStore {
  saveChallenge(challenge: WalletLoginChallenge): void;
  getChallenge(challengeId: string): WalletLoginChallenge | undefined;
  saveIdentity(identity: WalletIdentity): void;
  getIdentityByAddress(chain: WalletChain, normalizedAddress: string): WalletIdentity | undefined;
  listIdentitiesByUser(userId: string): WalletIdentity[];
  saveSession(session: AuthSession): void;
  getSessionByToken(token: string): AuthSession | undefined;
  revokeSession(sessionId: string, revokedAt: string): void;
  saveVerificationEvent(event: WalletVerificationEvent): void;
  listVerificationEvents(limit: number): WalletVerificationEvent[];
}

export type AuthState =
  | "signed_out"
  | "guest"
  | "connecting_wallet"
  | "awaiting_signature"
  | "authenticated"
  | "auth_failed"
  | "restoring_session";
