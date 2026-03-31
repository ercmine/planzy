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
export type PerbugRpcErrorKind = "auth_failure" | "node_unreachable" | "wallet_method_unavailable" | "no_wallet_loaded" | "wallet_endpoint_mismatch" | "rpc_http_error" | "rpc_method_failed";
export interface PerbugRpcWalletContext {
    kind: "configured" | "auto_detected" | "root";
    rpcUrl: string;
    walletName?: string;
}
export interface PerbugRpcWalletDiscovery {
    loadedWallets?: string[];
    walletDirectories?: string[];
    listWalletsAvailable: boolean;
    listWalletDirAvailable: boolean;
}
export interface PerbugRpcHealthSnapshot {
    configured: {
        host: string;
        rpcPort: number;
        nodePort: number;
        hasAuth: boolean;
        walletName?: string;
    };
    node: {
        reachable: boolean;
        chain?: string;
        blocks?: number;
        errorKind?: PerbugRpcErrorKind;
        error?: string;
    };
    wallet: {
        methodsAvailable: boolean;
        selectedEndpoint: "root" | "wallet";
        selectedWalletName?: string;
        loadedWallets?: string[];
        walletDirectories?: string[];
        balance?: number;
        errorKind?: PerbugRpcErrorKind;
        error?: string;
    };
}
