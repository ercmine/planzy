import { describe, expect, it, vi } from "vitest";
import { buildPerbugRpcUrl, loadPerbugRpcConfig } from "../perbugRpc/config.js";
import { PerbugRpcClient } from "../perbugRpc/client.js";
describe("Perbug RPC config", () => {
    it("uses Perbug defaults and localhost ports", () => {
        const config = loadPerbugRpcConfig({});
        expect(config.host).toBe("127.0.0.1");
        expect(config.rpcPort).toBe(9332);
        expect(config.nodePort).toBe(9333);
        expect(config.rpcUser).toBe("perbugrpc");
    });
    it("supports legacy bitcoin aliases while keeping Perbug canonical", () => {
        const config = loadPerbugRpcConfig({ BITCOIN_RPC_HOST: "127.0.0.1", BITCOIN_RPC_PORT: "19000", BITCOIN_RPC_USER: "legacy", BITCOIN_RPC_PASSWORD: "secret" });
        expect(config.host).toBe("127.0.0.1");
        expect(config.rpcPort).toBe(19000);
        expect(config.rpcUser).toBe("legacy");
        expect(config.rpcPassword).toBe("secret");
    });
    it("builds wallet scoped RPC URL when wallet name is configured", () => {
        const url = buildPerbugRpcUrl({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "u", rpcPassword: "p", timeoutMs: 1000, walletName: "payout-wallet" });
        expect(url).toBe("http://127.0.0.1:9332/wallet/payout-wallet");
    });
});
describe("PerbugRpcClient", () => {
    it("formats Bitcoin-style JSON-RPC request and auth header", async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: { isvalid: true }, error: null, id: "1" }) }));
        vi.stubGlobal("fetch", fetchMock);
        const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000 });
        await expect(client.validateAddress("addr")).resolves.toBe(true);
        const [, options] = (fetchMock.mock.calls[0] ?? []);
        const body = JSON.parse(String(options.body));
        expect(body.jsonrpc).toBe("1.0");
        expect(body.method).toBe("validateaddress");
        expect(String(options.headers && options.headers.authorization)).toContain("Basic");
    });
    it("throws clear error when node is unreachable", async () => {
        const fetchMock = vi.fn(async () => { throw new Error("connect ECONNREFUSED"); });
        vi.stubGlobal("fetch", fetchMock);
        const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000 });
        await expect(client.getBalance()).rejects.toThrow(/perbug_rpc_unreachable:getbalance/);
    });
});
