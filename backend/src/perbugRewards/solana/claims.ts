import { randomUUID } from "node:crypto";

import type { PerbugClaimsAdapter, PerbugTransferResult } from "../types.js";
import { loadSolanaConfig } from "./config.js";
import { deriveAssociatedTokenAddress, explorerLink } from "./token.js";

/** @deprecated legacy mock adapter kept for backwards compatibility in tests/imports */
export class MockSolanaClaimsAdapter implements PerbugClaimsAdapter {
  async transferClaim(input: { claimantAddress: string; amountDisplay: string; idempotencyKey: string; memo: string; }): Promise<PerbugTransferResult> {
    const config = loadSolanaConfig();
    const signature = `mock-${input.idempotencyKey.slice(0, 16)}-${randomUUID().slice(0, 8)}`;
    return {
      txid: signature,
      explorerUrl: explorerLink(signature, config.cluster, config.explorerBaseUrl)
    };
  }
}

export function deriveLegacyAssociatedTokenAccount(address: string): string {
  const config = loadSolanaConfig();
  return deriveAssociatedTokenAddress(address, config.mintAddress);
}
