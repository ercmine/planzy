import type { PerbugRpcTransferResult } from "./types.js";
import { loadPerbugRpcConfig } from "./config.js";
import { PerbugRpcClient } from "./client.js";

import type { PerbugClaimsAdapter } from "../types.js";

export class PerbugRpcClaimsAdapter implements PerbugClaimsAdapter {
  private readonly config = loadPerbugRpcConfig();
  private readonly client = new PerbugRpcClient(this.config);

  async transferClaim(input: { claimantAddress: string; amountDisplay: string; idempotencyKey: string; memo: string; }): Promise<PerbugRpcTransferResult> {
    const valid = await this.client.validateAddress(input.claimantAddress);
    if (!valid) throw new Error("invalid_perbug_address");
    const txid = await this.client.sendToAddress(input.claimantAddress, Number.parseFloat(input.amountDisplay), input.memo.slice(0, 60));
    return {
      txid,
      explorerUrl: this.config.explorerBaseUrl ? `${this.config.explorerBaseUrl.replace(/\/$/, "")}/tx/${txid}` : undefined
    };
  }
}
