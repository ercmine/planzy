import type { PerbugRpcConfig } from "./types.js";
export declare class PerbugRpcClient {
    private readonly config;
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
    private call;
}
