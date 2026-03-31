import { afterEach, describe, expect, it, vi } from "vitest";
import { initBackendGeoRuntime } from "../gateway.js";
describe("initBackendGeoRuntime", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it("uses direct nominatim mode without probing upstream health", async () => {
        const fetchSpy = vi.fn(async () => new Response("not found", { status: 404 }));
        vi.stubGlobal("fetch", fetchSpy);
        const runtime = initBackendGeoRuntime({
            GEO_SERVICE_ENABLED: "false",
            GEO_SERVICE_BASE_URL: "",
            NOMINATIM_BASE_URL: "https://geo.perbug.com"
        });
        expect(runtime.mode).toBe("nominatim");
        expect(runtime.customGeoServiceEnabled).toBe(false);
        expect(runtime.upstreamBaseUrl).toBe("https://geo.perbug.com");
        expect(runtime.gateway).not.toBeNull();
        const payload = await runtime.gateway.health();
        expect(payload.ok).toBe(true);
        expect(payload.mode).toBe("local");
        expect(fetchSpy).not.toHaveBeenCalled();
    });
    it("uses custom geo service mode and probes upstream /health", async () => {
        const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true, mode: "remote", version: "1.0.0" }), {
            status: 200,
            headers: { "content-type": "application/json" }
        }));
        vi.stubGlobal("fetch", fetchSpy);
        const runtime = initBackendGeoRuntime({
            GEO_SERVICE_ENABLED: "true",
            GEO_SERVICE_BASE_URL: "https://geo.example.test",
            GEO_SERVICE_RETRIES: "0"
        });
        expect(runtime.mode).toBe("custom");
        expect(runtime.gateway).not.toBeNull();
        await expect(runtime.gateway.health()).resolves.toMatchObject({ ok: true, mode: "remote" });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const firstCall = fetchSpy.mock.calls[0];
        expect(firstCall).toBeDefined();
        expect(String(firstCall?.[0])).toBe("https://geo.example.test/health");
    });
    it("keeps direct nominatim mode when GEO_MODE=custom but custom service is disabled", async () => {
        const fetchSpy = vi.fn(async () => new Response("not found", { status: 404 }));
        vi.stubGlobal("fetch", fetchSpy);
        const runtime = initBackendGeoRuntime({
            GEO_MODE: "custom",
            GEO_SERVICE_ENABLED: "false",
            NOMINATIM_BASE_URL: "https://geo.perbug.com"
        });
        expect(runtime.mode).toBe("nominatim");
        expect(runtime.modeReason).toContain("GEO_SERVICE_ENABLED=false");
        await expect(runtime.gateway.health()).resolves.toMatchObject({ ok: true, mode: "local" });
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
