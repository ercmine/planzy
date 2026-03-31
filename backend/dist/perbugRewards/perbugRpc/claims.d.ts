import type { PerbugRpcTransferResult } from "./types.js";
import type { PerbugClaimsAdapter } from "../types.js";
export declare class PerbugRpcClaimsAdapter implements PerbugClaimsAdapter {
    private readonly config;
    private readonly client;
    transferClaim(input: {
        claimantAddress: string;
        amountDisplay: string;
        idempotencyKey: string;
        memo: string;
    }): Promise<PerbugRpcTransferResult>;
}
