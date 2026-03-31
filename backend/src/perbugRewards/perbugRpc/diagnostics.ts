import { amountToDisplay } from "../solana/token.js";
import { PERBUG_DECIMALS } from "../defaults.js";
import { PerbugRpcClient } from "./client.js";

export async function logPerbugRpcStartupDiagnostics(): Promise<void> {
  const client = new PerbugRpcClient();
  const safe = client.getSafeConnectionDetails();
  try {
    const [chain, balance] = await Promise.all([client.getBlockchainInfo(), client.getBalance()]);
    console.info("[perbug.rpc.startup]", {
      ...safe,
      reachable: true,
      walletMethodsAvailable: true,
      chain: chain.chain,
      blocks: chain.blocks,
      balanceDisplay: amountToDisplay(BigInt(Math.round(balance * 10 ** PERBUG_DECIMALS)), PERBUG_DECIMALS)
    });
  } catch (error) {
    console.warn("[perbug.rpc.startup]", {
      ...safe,
      reachable: false,
      walletMethodsAvailable: false,
      error: error instanceof Error ? error.message : "unknown_error"
    });
  }
}
