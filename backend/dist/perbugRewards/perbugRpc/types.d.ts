export interface PerbugRpcConfig {
    host: string;
    rpcPort: number;
    nodePort: number;
    rpcUser: string;
    rpcPassword: string;
    timeoutMs: number;
    walletName?: string;
    explorerBaseUrl?: string;
}
export interface PerbugRpcTransferResult {
    txid: string;
    explorerUrl?: string;
}
export interface PerbugRpcHealthSnapshot {
    configured: {
        host: string;
        rpcPort: number;
        nodePort: number;
        hasAuth: boolean;
        walletName?: string;
    };
    reachable: boolean;
    walletMethodsAvailable: boolean;
    balance?: number;
    chain?: string;
    blocks?: number;
    error?: string;
}
