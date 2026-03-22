import type { SolanaConfig } from "./types.js";

export function loadSolanaConfig(env: NodeJS.ProcessEnv = process.env): SolanaConfig {
  const clusterValue = env.SOLANA_CLUSTER === "mainnet-beta" || env.SOLANA_CLUSTER === "testnet" || env.SOLANA_CLUSTER === "custom"
    ? env.SOLANA_CLUSTER
    : "devnet";
  return {
    cluster: clusterValue,
    rpcUrl: env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    commitment: env.SOLANA_COMMITMENT === "processed" || env.SOLANA_COMMITMENT === "finalized" ? env.SOLANA_COMMITMENT : "confirmed",
    mintAddress: env.PERBUG_MINT_ADDRESS ?? "So11111111111111111111111111111111111111112",
    treasuryPublicKey: env.PERBUG_TREASURY_PUBLIC_KEY ?? "11111111111111111111111111111111",
    treasurySecret: env.PERBUG_TREASURY_SECRET,
    claimsEnabled: env.CLAIMS_ENABLED !== "false",
    adminWalletAllowlist: (env.ADMIN_WALLET_ALLOWLIST ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    explorerBaseUrl: env.EXPLORER_BASE_URL,
    decimals: Number.parseInt(env.PERBUG_TOKEN_DECIMALS ?? "9", 10)
  };
}
