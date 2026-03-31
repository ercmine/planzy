import { loadPerbugRpcConfig } from "./config.js";
import { PerbugRpcClient } from "./client.js";
export class PerbugRpcClaimsAdapter {
    config = loadPerbugRpcConfig();
    client = new PerbugRpcClient(this.config);
    async transferClaim(input) {
        const valid = await this.client.validateAddress(input.claimantAddress);
        if (!valid)
            throw new Error("invalid_perbug_address");
        const txid = await this.client.sendToAddress(input.claimantAddress, Number.parseFloat(input.amountDisplay), input.memo.slice(0, 60));
        return {
            txid,
            explorerUrl: this.config.explorerBaseUrl ? `${this.config.explorerBaseUrl.replace(/\/$/, "")}/tx/${txid}` : undefined
        };
    }
}
