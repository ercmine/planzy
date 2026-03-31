import type { AuthSession, WalletAuthStore, WalletChain, WalletIdentity, WalletLoginChallenge, WalletVerificationEvent } from "./types.js";
export declare class MemoryWalletAuthStore implements WalletAuthStore {
    private challenges;
    private identities;
    private identitiesByUser;
    private sessionsByToken;
    private sessionsById;
    private events;
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
    private identityKey;
}
