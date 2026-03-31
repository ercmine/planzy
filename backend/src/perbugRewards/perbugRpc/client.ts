import { randomUUID } from "node:crypto";

import { ValidationError } from "../../plans/errors.js";
import { buildPerbugRpcUrl, loadPerbugRpcConfig } from "./config.js";
import type { PerbugRpcConfig } from "./types.js";

type RpcResponse<T> = { result: T; error: { code: number; message: string } | null; id: string };

export class PerbugRpcClient {
  constructor(private readonly config: PerbugRpcConfig = loadPerbugRpcConfig()) {}

  getSafeConnectionDetails() {
    return {
      host: this.config.host,
      rpcPort: this.config.rpcPort,
      nodePort: this.config.nodePort,
      hasAuth: Boolean(this.config.rpcUser && this.config.rpcPassword),
      walletName: this.config.walletName
    };
  }

  async validateAddress(address: string): Promise<boolean> {
    const payload = await this.call<{ isvalid?: boolean }>("validateaddress", [address]);
    return payload?.isvalid === true;
  }

  async sendToAddress(address: string, amount: number, comment = ""): Promise<string> {
    if (amount <= 0) throw new ValidationError(["claim amount must be positive"]);
    return this.call<string>("sendtoaddress", [address, amount, comment]);
  }

  async getBalance(): Promise<number> { return this.call<number>("getbalance", []); }

  async getTransaction(txid: string): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>("gettransaction", [txid]);
  }

  async getBlockchainInfo(): Promise<{ chain?: string; blocks?: number }> {
    return this.call<{ chain?: string; blocks?: number }>("getblockchaininfo", []);
  }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
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
      if (!response.ok) throw new Error(`rpc_http_${response.status}`);
      const payload = await response.json() as RpcResponse<T>;
      if (payload.error) throw new Error(`rpc_${method}_failed:${payload.error.code}:${payload.error.message}`);
      return payload.result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      throw new Error(`perbug_rpc_unreachable:${method}:${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
