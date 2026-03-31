function toPort(value, fallback) {
    const parsed = Number.parseInt(String(value ?? fallback), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function loadPerbugRpcConfig(env = process.env) {
    return {
        host: env.PERBUG_RPC_HOST ?? env.BITCOIN_RPC_HOST ?? "127.0.0.1",
        rpcPort: toPort(env.PERBUG_RPC_PORT ?? env.BITCOIN_RPC_PORT, 9332),
        nodePort: toPort(env.PERBUG_NODE_PORT ?? env.BITCOIN_NODE_PORT, 9333),
        rpcUser: env.PERBUG_RPC_USER ?? env.BITCOIN_RPC_USER ?? "perbugrpc",
        rpcPassword: env.PERBUG_RPC_PASSWORD ?? env.BITCOIN_RPC_PASSWORD ?? "change_this_to_a_long_random_password",
        timeoutMs: toPort(env.PERBUG_RPC_TIMEOUT_MS, 10_000),
        walletName: env.PERBUG_RPC_WALLET_NAME,
        explorerBaseUrl: env.PERBUG_EXPLORER_BASE_URL
    };
}
export function buildPerbugRpcNodeUrl(config) {
    return `http://${config.host}:${config.rpcPort}/`;
}
export function buildPerbugRpcWalletUrl(config, walletName) {
    const trimmed = walletName?.trim();
    const path = trimmed ? `/wallet/${encodeURIComponent(trimmed)}` : "/";
    return `http://${config.host}:${config.rpcPort}${path}`;
}
export const buildPerbugRpcUrl = buildPerbugRpcWalletUrl;
