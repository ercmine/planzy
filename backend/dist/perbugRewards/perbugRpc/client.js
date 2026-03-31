import { randomUUID } from "node:crypto";
import { ValidationError } from "../../plans/errors.js";
import { buildPerbugRpcUrl, loadPerbugRpcConfig } from "./config.js";
export class PerbugRpcClient {
    config;
    constructor(config = loadPerbugRpcConfig()) {
        this.config = config;
    }
    getSafeConnectionDetails() {
        return {
            host: this.config.host,
            rpcPort: this.config.rpcPort,
            nodePort: this.config.nodePort,
            hasAuth: Boolean(this.config.rpcUser && this.config.rpcPassword),
            walletName: this.config.walletName
        };
    }
    async validateAddress(address) {
        const payload = await this.call("validateaddress", [address]);
        return payload?.isvalid === true;
    }
    async sendToAddress(address, amount, comment = "") {
        if (amount <= 0)
            throw new ValidationError(["claim amount must be positive"]);
        return this.call("sendtoaddress", [address, amount, comment]);
    }
    async getBalance() { return this.call("getbalance", []); }
    async getTransaction(txid) {
        return this.call("gettransaction", [txid]);
    }
    async getBlockchainInfo() {
        return this.call("getblockchaininfo", []);
    }
    async call(method, params) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(buildPerbugRpcUrl(this.config), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Basic ${Buffer.from(`${this.config.rpcUser}:${this.config.rpcPassword}`).toString("base64")}`
                },
                body: JSON.stringify({ jsonrpc: "1.0", id: randomUUID(), method, params }),
                signal: controller.signal
            });
            if (!response.ok)
                throw new Error(`rpc_http_${response.status}`);
            const payload = await response.json();
            if (payload.error)
                throw new Error(`rpc_${method}_failed:${payload.error.code}:${payload.error.message}`);
            return payload.result;
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : "unknown_error";
            throw new Error(`perbug_rpc_unreachable:${method}:${reason}`);
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
