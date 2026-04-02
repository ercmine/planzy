import { randomUUID } from "node:crypto";

import { ValidationError } from "../../plans/errors.js";
import { buildPerbugRpcNodeUrl, buildPerbugRpcWalletUrl, loadPerbugRpcConfig } from "./config.js";
import type { PerbugRpcConfig, PerbugRpcErrorKind, PerbugRpcWalletContext, PerbugRpcWalletDiscovery } from "./types.js";

type RpcResponse<T> = { result: T; error: { code: number; message: string } | null; id: string };

export class PerbugRpcRequestError extends Error {
  constructor(
    message: string,
    readonly details: {
      kind: PerbugRpcErrorKind;
      method: string;
      status?: number;
      code?: number;
      rpcMessage?: string;
      url: string;
    }
  ) {
    super(message);
    this.name = "PerbugRpcRequestError";
  }
}

function normalizeWalletName(walletName?: string): string | undefined {
  const trimmed = walletName?.trim();
  return trimmed ? trimmed : undefined;
}

function classifyRpcError(method: string, url: string, code: number, rpcMessage: string): PerbugRpcRequestError {
  const lower = rpcMessage.toLowerCase();
  if (code === -32601) {
    return new PerbugRpcRequestError(`perbug_rpc_method_unavailable:${method}:${code}:${rpcMessage}`, { kind: "wallet_method_unavailable", method, code, rpcMessage, url });
  }
  if (code === -18) {
    return new PerbugRpcRequestError(`perbug_rpc_no_wallet_loaded:${method}:${code}:${rpcMessage}`, { kind: "no_wallet_loaded", method, code, rpcMessage, url });
  }
  if (code === -19 || lower.includes("wallet file not specified") || lower.includes("wallet not specified")) {
    return new PerbugRpcRequestError(`perbug_rpc_wallet_endpoint_mismatch:${method}:${code}:${rpcMessage}`, { kind: "wallet_endpoint_mismatch", method, code, rpcMessage, url });
  }
  return new PerbugRpcRequestError(`perbug_rpc_method_failed:${method}:${code}:${rpcMessage}`, { kind: "rpc_method_failed", method, code, rpcMessage, url });
}

export class PerbugRpcClient {
  private readonly configuredWalletName?: string;
  private walletContextPromise?: Promise<PerbugRpcWalletContext>;

  constructor(private readonly config: PerbugRpcConfig = loadPerbugRpcConfig()) {
    this.configuredWalletName = normalizeWalletName(config.walletName);
  }

  getSafeConnectionDetails() {
    return {
      host: this.config.host,
      rpcPort: this.config.rpcPort,
      nodePort: this.config.nodePort,
      hasAuth: Boolean(this.config.rpcUser && this.config.rpcPassword),
      walletName: this.configuredWalletName
    };
  }

  async validateAddress(address: string): Promise<boolean> {
    const payload = await this.callWallet<{ isvalid?: boolean }>("validateaddress", [address]);
    return payload?.isvalid === true;
  }

  async sendToAddress(address: string, amount: number, comment = ""): Promise<string> {
    if (amount <= 0) throw new ValidationError(["claim amount must be positive"]);
    return this.callWallet<string>("sendtoaddress", [address, amount, comment]);
  }

  async getBalance(): Promise<number> { return this.callWallet<number>("getbalance", []); }

  async getTransaction(txid: string): Promise<Record<string, unknown>> {
    return this.callWallet<Record<string, unknown>>("gettransaction", [txid]);
  }

  async getBlockchainInfo(): Promise<{ chain?: string; blocks?: number }> {
    return this.callNode<{ chain?: string; blocks?: number }>("getblockchaininfo", []);
  }

  async detectWalletSupport(): Promise<PerbugRpcWalletDiscovery> {
    const loaded = await this.tryListWallets();
    const directory = await this.tryListWalletDir();
    return {
      loadedWallets: loaded.loadedWallets,
      walletDirectories: directory.walletDirectories,
      listWalletsAvailable: loaded.available,
      listWalletDirAvailable: directory.available
    };
  }

  private async ensureWalletContext(): Promise<PerbugRpcWalletContext> {
    if (!this.walletContextPromise) {
      this.walletContextPromise = this.discoverWalletContext();
    }
    return this.walletContextPromise;
  }

  private async discoverWalletContext(): Promise<PerbugRpcWalletContext> {
    if (this.configuredWalletName) {
      return {
        kind: "configured",
        walletName: this.configuredWalletName,
        rpcUrl: buildPerbugRpcWalletUrl(this.config, this.configuredWalletName)
      };
    }
    return {
      kind: "root",
      rpcUrl: buildPerbugRpcWalletUrl(this.config)
    };
  }

  private async tryListWallets(): Promise<{ available: boolean; loadedWallets?: string[] }> {
    try {
      const loadedWallets = await this.callNode<string[]>("listwallets", []);
      return { available: true, loadedWallets };
    } catch (error) {
      if (error instanceof PerbugRpcRequestError && error.details.kind === "wallet_method_unavailable") {
        return { available: false };
      }
      throw error;
    }
  }

  private async tryListWalletDir(): Promise<{ available: boolean; walletDirectories?: string[] }> {
    try {
      const payload = await this.callNode<{ wallets?: Array<{ name?: string }> }>("listwalletdir", []);
      const walletDirectories = (payload.wallets ?? []).map((wallet) => wallet.name).filter((value): value is string => Boolean(value));
      return { available: true, walletDirectories };
    } catch (error) {
      if (error instanceof PerbugRpcRequestError && error.details.kind === "wallet_method_unavailable") {
        return { available: false };
      }
      throw error;
    }
  }

  private async callNode<T>(method: string, params: unknown[]): Promise<T> {
    return this.call<T>(method, params, buildPerbugRpcNodeUrl(this.config));
  }

  private async callWallet<T>(method: string, params: unknown[]): Promise<T> {
    const context = await this.ensureWalletContext();
    return this.call<T>(method, params, context.rpcUrl);
  }

  private async call<T>(method: string, params: unknown[], url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`${this.config.rpcUser}:${this.config.rpcPassword}`).toString("base64")}`
        },
        body: JSON.stringify({ jsonrpc: "1.0", id: randomUUID(), method, params }),
        signal: controller.signal
      });
      if (response.status === 401 || response.status === 403) {
        throw new PerbugRpcRequestError(`perbug_rpc_auth_failed:${method}:rpc_http_${response.status}`, { kind: "auth_failure", method, status: response.status, url });
      }
      if (!response.ok) {
        throw new PerbugRpcRequestError(`perbug_rpc_http_error:${method}:rpc_http_${response.status}`, { kind: "rpc_http_error", method, status: response.status, url });
      }
      const payload = await response.json() as RpcResponse<T>;
      if (payload.error) throw classifyRpcError(method, url, payload.error.code, payload.error.message);
      return payload.result;
    } catch (error) {
      if (error instanceof PerbugRpcRequestError) throw error;
      const reason = error instanceof Error ? error.message : "unknown_error";
      throw new PerbugRpcRequestError(`perbug_rpc_node_unreachable:${method}:${reason}`, {
        kind: "node_unreachable",
        method,
        rpcMessage: reason,
        url
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
