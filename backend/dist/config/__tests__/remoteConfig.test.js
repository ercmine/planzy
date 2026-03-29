import { describe, expect, it, vi } from "vitest";
import { RemoteConfigClient } from "../remoteConfig.js";
describe("RemoteConfigClient", () => {
    it("returns JSON and serves from cache within ttl", async () => {
        const fetchFn = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ plans: { router: { allowPartial: false, defaultTimeoutMs: 3333 } } })
        });
        let current = 1_000;
        const client = new RemoteConfigClient({ fetchFn, now: () => current });
        const first = await client.get("https://config.example.com/app", {
            ttlMs: 60_000,
            timeoutMs: 500,
            allowInsecureHttp: false
        });
        const second = await client.get("https://config.example.com/app", {
            ttlMs: 60_000,
            timeoutMs: 500,
            allowInsecureHttp: false
        });
        expect(first.fromCache).toBe(false);
        expect(second.fromCache).toBe(true);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        current += 61_000;
        await client.get("https://config.example.com/app", {
            ttlMs: 60_000,
            timeoutMs: 500,
            allowInsecureHttp: false
        });
        expect(fetchFn).toHaveBeenCalledTimes(2);
    });
    it("wraps timeout/fetch errors", async () => {
        const fetchFn = vi.fn().mockImplementation(async (_url, init) => {
            const signal = init?.signal;
            await new Promise((_, reject) => {
                signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
            });
            throw new Error("unreachable");
        });
        const client = new RemoteConfigClient({ fetchFn });
        await expect(client.get("https://config.example.com/app?token=abc", {
            ttlMs: 100,
            timeoutMs: 1,
            allowInsecureHttp: false
        })).rejects.toThrow("Remote config fetch failed");
    });
    it("rejects http URL unless allowed", async () => {
        const fetchFn = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({})
        });
        const client = new RemoteConfigClient({ fetchFn });
        await expect(client.get("http://config.example.com/app", {
            ttlMs: 100,
            timeoutMs: 100,
            allowInsecureHttp: false
        })).rejects.toThrow("insecure URL protocol");
        await expect(client.get("http://config.example.com/app", {
            ttlMs: 100,
            timeoutMs: 100,
            allowInsecureHttp: true
        })).resolves.toEqual({ config: {}, fromCache: false });
    });
});
