import type { SolanaClaimsAdapter, SolanaTransferResult } from "../types.js";
export declare class MockSolanaClaimsAdapter implements SolanaClaimsAdapter {
    transferClaim(input: {
        claimantPublicKey: string;
        amountAtomic: bigint;
        idempotencyKey: string;
        memo: string;
    }): Promise<SolanaTransferResult>;
}
