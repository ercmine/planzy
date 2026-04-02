import { describe, expect, it, vi } from "vitest";

import { buildPerbugRpcNodeUrl, buildPerbugRpcWalletUrl, loadPerbugRpcConfig } from "../perbugRpc/config.js";
import { PerbugRpcClient } from "../perbugRpc/client.js";

describe("Perbug RPC config", () => {
  it("uses Perbug defaults and localhost ports", () => {
    const config = loadPerbugRpcConfig({} as NodeJS.ProcessEnv);
    expect(config.host).toBe("127.0.0.1");
    expect(config.rpcPort).toBe(9332);
    expect(config.nodePort).toBe(9333);
    expect(config.rpcUser).toBe("perbugrpc");
  });

  it("supports legacy bitcoin aliases while keeping Perbug canonical", () => {
    const config = loadPerbugRpcConfig({ BITCOIN_RPC_HOST: "127.0.0.1", BITCOIN_RPC_PORT: "19000", BITCOIN_RPC_USER: "legacy", BITCOIN_RPC_PASSWORD: "secret" } as NodeJS.ProcessEnv);
    expect(config.host).toBe("127.0.0.1");
    expect(config.rpcPort).toBe(19000);
    expect(config.rpcUser).toBe("legacy");
    expect(config.rpcPassword).toBe("secret");
  });

  it("builds wallet scoped RPC URL when wallet name is configured", () => {
    const url = buildPerbugRpcWalletUrl({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "u", rpcPassword: "p", timeoutMs: 1000 }, "payout-wallet");
    expect(url).toBe("http://127.0.0.1:9332/wallet/payout-wallet");
  });

  it("builds root URL for node RPC", () => {
    const url = buildPerbugRpcNodeUrl({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "u", rpcPassword: "p", timeoutMs: 1000 });
    expect(url).toBe("http://127.0.0.1:9332/");
  });
});

describe("PerbugRpcClient", () => {
  it("formats Bitcoin-style JSON-RPC request and auth header", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ result: { isvalid: true }, error: null, id: "1" }) }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000, walletName: "wallet-a" });
    await expect(client.validateAddress("addr")).resolves.toBe(true);

    const [requestUrl, options] = (fetchMock.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(requestUrl).toContain("/wallet/wallet-a");
    const body = JSON.parse(String(options.body));
    expect(body.jsonrpc).toBe("1.0");
    expect(body.method).toBe("validateaddress");
    expect(String(options.headers && (options.headers as Record<string, string>).authorization)).toContain("Basic");
  });

  it("classifies auth failures separately", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000 });
    await expect(client.getBlockchainInfo()).rejects.toMatchObject({ details: { kind: "auth_failure" } });
  });

  it("throws clear error when node is unreachable", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("connect ECONNREFUSED"); });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000 });
    await expect(client.getBalance()).rejects.toMatchObject({ details: { kind: "node_unreachable" } });
  });

  it("uses root wallet endpoint for getbalance when wallet name is not configured", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      const payload = JSON.parse(String(options?.body ?? "{}")) as { method: string };
      if (payload.method === "getbalance") {
        return { ok: true, status: 200, json: async () => ({ result: 1.5, error: null, id: "2" }) };
      }
      return { ok: true, status: 200, json: async () => ({ result: null, error: null, id: "3" }) };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = new PerbugRpcClient({ host: "127.0.0.1", rpcPort: 9332, nodePort: 9333, rpcUser: "perbugrpc", rpcPassword: "pw", timeoutMs: 1000 });
    await expect(client.getBalance()).resolves.toBe(1.5);

    const calls = fetchMock.mock.calls.map(([url, opts]) => ({
      url,
      method: JSON.parse(String((opts as RequestInit).body)).method
    }));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: "http://127.0.0.1:9332/", method: "getbalance" });
  });
});
