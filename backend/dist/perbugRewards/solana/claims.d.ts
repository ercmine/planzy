import type { PerbugClaimsAdapter, PerbugTransferResult } from "../types.js";
/** @deprecated legacy mock adapter kept for backwards compatibility in tests/imports */
export declare class MockSolanaClaimsAdapter implements PerbugClaimsAdapter {
    transferClaim(input: {
        claimantAddress: string;
        amountDisplay: string;
        idempotencyKey: string;
        memo: string;
    }): Promise<PerbugTransferResult>;
}
export declare function deriveLegacyAssociatedTokenAccount(address: string): string;
