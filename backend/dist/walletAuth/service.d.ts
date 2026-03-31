import type { AccountsService } from "../accounts/service.js";
import type { WalletAuthStore, WalletChallengeIntent, WalletChain, WalletIdentity, WalletProvider } from "./types.js";
export declare class WalletAuthService {
    private readonly store;
    private readonly accounts;
    private readonly challengeTtlMs;
    private readonly sessionTtlMs;
    constructor(store: WalletAuthStore, accounts: AccountsService);
    createChallenge(input: {
        chain: WalletChain;
        provider: WalletProvider;
        address: string;
        intent?: WalletChallengeIntent;
        sessionToken?: string;
    }): {
        challengeId: string;
        nonce: string;
        message: string;
        expiresAt: string;
        authState: "awaiting_signature";
        accountProvisioningState: string;
    };
    verifyChallenge(input: {
        challengeId: string;
        signature: string;
        address: string;
        sessionToken?: string;
    }): Promise<{
        authState: "authenticated";
        userId: string;
        sessionToken: string;
        sessionExpiresAt: string;
        wallet: WalletIdentity;
        accountProvisioningState: string;
    }>;
    restoreSession(token?: string): {
        authState: "signed_out";
        userId?: undefined;
        sessionExpiresAt?: undefined;
        wallets?: undefined;
    } | {
        authState: "authenticated";
        userId: string;
        sessionExpiresAt: string;
        wallets: WalletIdentity[];
    };
    logout(token?: string): {
        ok: boolean;
    };
    listWalletsForSession(token: string): WalletIdentity[];
    getVerificationEvents(limit?: number): import("./types.js").WalletVerificationEvent[];
    private buildMessage;
    private normalizeAddress;
    private verifySignature;
    private createIdentity;
    private createSession;
    private displayAddress;
    private getSession;
    private requireSession;
    private auditVerification;
}
