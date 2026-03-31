import { randomUUID } from "node:crypto";
import { ValidationError } from "../../plans/errors.js";
import { buildPerbugRpcNodeUrl, buildPerbugRpcWalletUrl, loadPerbugRpcConfig } from "./config.js";
export class PerbugRpcRequestError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "PerbugRpcRequestError";
    }
}
function normalizeWalletName(walletName) {
    const trimmed = walletName?.trim();
    return trimmed ? trimmed : undefined;
}
function classifyRpcError(method, url, code, rpcMessage) {
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
    config;
    configuredWalletName;
    walletContextPromise;
    constructor(config = loadPerbugRpcConfig()) {
        this.config = config;
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
    async validateAddress(address) {
        const payload = await this.callWallet("validateaddress", [address]);
        return payload?.isvalid === true;
    }
    async sendToAddress(address, amount, comment = "") {
        if (amount <= 0)
            throw new ValidationError(["claim amount must be positive"]);
        return this.callWallet("sendtoaddress", [address, amount, comment]);
    }
    async getBalance() { return this.callWallet("getbalance", []); }
    async getTransaction(txid) {
        return this.callWallet("gettransaction", [txid]);
    }
    async getBlockchainInfo() {
        return this.callNode("getblockchaininfo", []);
    }
    async detectWalletSupport() {
        const loaded = await this.tryListWallets();
        const directory = await this.tryListWalletDir();
        return {
            loadedWallets: loaded.loadedWallets,
            walletDirectories: directory.walletDirectories,
            listWalletsAvailable: loaded.available,
            listWalletDirAvailable: directory.available
        };
    }
    async ensureWalletContext() {
        if (!this.walletContextPromise) {
            this.walletContextPromise = this.discoverWalletContext();
        }
        return this.walletContextPromise;
    }
    async discoverWalletContext() {
        if (this.configuredWalletName) {
            return {
                kind: "configured",
                walletName: this.configuredWalletName,
                rpcUrl: buildPerbugRpcWalletUrl(this.config, this.configuredWalletName)
            };
        }
        const loaded = await this.tryListWallets();
        if (!loaded.available) {
            return {
                kind: "root",
                rpcUrl: buildPerbugRpcWalletUrl(this.config)
            };
        }
        if ((loaded.loadedWallets?.length ?? 0) === 0) {
            throw new PerbugRpcRequestError("perbug_rpc_no_wallet_loaded:getbalance", {
                kind: "no_wallet_loaded",
                method: "listwallets",
                url: buildPerbugRpcNodeUrl(this.config)
            });
        }
        const [firstWallet] = loaded.loadedWallets ?? [];
        if (!firstWallet) {
            return { kind: "root", rpcUrl: buildPerbugRpcWalletUrl(this.config) };
        }
        return {
            kind: "auto_detected",
            walletName: firstWallet,
            rpcUrl: buildPerbugRpcWalletUrl(this.config, firstWallet)
        };
    }
    async tryListWallets() {
        try {
            const loadedWallets = await this.callNode("listwallets", []);
            return { available: true, loadedWallets };
        }
        catch (error) {
            if (error instanceof PerbugRpcRequestError && error.details.kind === "wallet_method_unavailable") {
                return { available: false };
            }
            throw error;
        }
    }
    async tryListWalletDir() {
        try {
            const payload = await this.callNode("listwalletdir", []);
            const walletDirectories = (payload.wallets ?? []).map((wallet) => wallet.name).filter((value) => Boolean(value));
            return { available: true, walletDirectories };
        }
        catch (error) {
            if (error instanceof PerbugRpcRequestError && error.details.kind === "wallet_method_unavailable") {
                return { available: false };
            }
            throw error;
        }
    }
    async callNode(method, params) {
        return this.call(method, params, buildPerbugRpcNodeUrl(this.config));
    }
    async callWallet(method, params) {
        const context = await this.ensureWalletContext();
        return this.call(method, params, context.rpcUrl);
    }
    async call(method, params, url) {
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
            const payload = await response.json();
            if (payload.error)
                throw classifyRpcError(method, url, payload.error.code, payload.error.message);
            return payload.result;
        }
        catch (error) {
            if (error instanceof PerbugRpcRequestError)
                throw error;
            const reason = error instanceof Error ? error.message : "unknown_error";
            throw new PerbugRpcRequestError(`perbug_rpc_node_unreachable:${method}:${reason}`, {
                kind: "node_unreachable",
                method,
                rpcMessage: reason,
                url
            });
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
