import { randomUUID } from "node:crypto";

import type { SolanaClaimsAdapter, SolanaTransferResult } from "../types.js";
import { loadSolanaConfig } from "./config.js";
import { deriveAssociatedTokenAddress, explorerLink } from "./token.js";

export class MockSolanaClaimsAdapter implements SolanaClaimsAdapter {
  async transferClaim(input: { claimantPublicKey: string; amountAtomic: bigint; idempotencyKey: string; memo: string }): Promise<SolanaTransferResult> {
    const config = loadSolanaConfig();
    const signature = `mock-${input.idempotencyKey.slice(0, 16)}-${randomUUID().slice(0, 8)}`;
    return {
      signature,
      associatedTokenAccount: deriveAssociatedTokenAddress(input.claimantPublicKey, config.mintAddress),
      explorerUrl: explorerLink(signature, config.cluster, config.explorerBaseUrl)
    };
  }
}
