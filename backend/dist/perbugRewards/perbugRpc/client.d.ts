import type { PerbugRpcConfig, PerbugRpcErrorKind, PerbugRpcWalletDiscovery } from "./types.js";
export declare class PerbugRpcRequestError extends Error {
    readonly details: {
        kind: PerbugRpcErrorKind;
        method: string;
        status?: number;
        code?: number;
        rpcMessage?: string;
        url: string;
    };
    constructor(message: string, details: {
        kind: PerbugRpcErrorKind;
        method: string;
        status?: number;
        code?: number;
        rpcMessage?: string;
        url: string;
    });
}
export declare class PerbugRpcClient {
    private readonly config;
    private readonly configuredWalletName?;
    private walletContextPromise?;
    constructor(config?: PerbugRpcConfig);
    getSafeConnectionDetails(): {
        host: string;
        rpcPort: number;
        nodePort: number;
        hasAuth: boolean;
        walletName: string | undefined;
    };
    validateAddress(address: string): Promise<boolean>;
    sendToAddress(address: string, amount: number, comment?: string): Promise<string>;
    getBalance(): Promise<number>;
    getTransaction(txid: string): Promise<Record<string, unknown>>;
    getBlockchainInfo(): Promise<{
        chain?: string;
        blocks?: number;
    }>;
    detectWalletSupport(): Promise<PerbugRpcWalletDiscovery>;
    private ensureWalletContext;
    private discoverWalletContext;
    private tryListWallets;
    private tryListWalletDir;
    private callNode;
    private callWallet;
    private call;
}
