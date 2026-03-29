import { randomUUID } from "node:crypto";
import { loadSolanaConfig } from "./config.js";
import { deriveAssociatedTokenAddress, explorerLink } from "./token.js";
export class MockSolanaClaimsAdapter {
    async transferClaim(input) {
        const config = loadSolanaConfig();
        const signature = `mock-${input.idempotencyKey.slice(0, 16)}-${randomUUID().slice(0, 8)}`;
        return {
            signature,
            associatedTokenAccount: deriveAssociatedTokenAddress(input.claimantPublicKey, config.mintAddress),
            explorerUrl: explorerLink(signature, config.cluster, config.explorerBaseUrl)
        };
    }
}
