export function loadSolanaConfig(env = process.env) {
    const clusterValue = env.SOLANA_CLUSTER === "mainnet-beta" || env.SOLANA_CLUSTER === "testnet" || env.SOLANA_CLUSTER === "custom"
        ? env.SOLANA_CLUSTER
        : "devnet";
    return {
        cluster: clusterValue,
        rpcUrl: env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
        commitment: env.SOLANA_COMMITMENT === "processed" || env.SOLANA_COMMITMENT === "finalized" ? env.SOLANA_COMMITMENT : "confirmed",
        mintAddress: env.DRYAD_MINT_ADDRESS ?? "So11111111111111111111111111111111111111112",
        treasuryPublicKey: env.DRYAD_TREASURY_PUBLIC_KEY ?? "11111111111111111111111111111111",
        treasurySecret: env.DRYAD_TREASURY_SECRET,
        claimsEnabled: env.CLAIMS_ENABLED !== "false",
        adminWalletAllowlist: (env.ADMIN_WALLET_ALLOWLIST ?? "").split(",").map((item) => item.trim()).filter(Boolean),
        explorerBaseUrl: env.EXPLORER_BASE_URL,
        decimals: Number.parseInt(env.DRYAD_TOKEN_DECIMALS ?? "9", 10)
    };
}
