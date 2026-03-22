export interface SolanaConfig {
  cluster: "devnet" | "mainnet-beta" | "testnet" | "custom";
  rpcUrl: string;
  commitment: "processed" | "confirmed" | "finalized";
  mintAddress: string;
  treasuryPublicKey: string;
  treasurySecret?: string;
  claimsEnabled: boolean;
  adminWalletAllowlist: string[];
  explorerBaseUrl?: string;
  decimals: number;
}
