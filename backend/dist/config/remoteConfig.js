function stripUrlQuery(url) {
    try {
        const parsed = new URL(url);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
    }
    catch {
        return url.split("?")[0] ?? url;
    }
}
export class RemoteConfigClient {
    fetchFn;
    now;
    cache = new Map();
    constructor(opts) {
        this.fetchFn = opts?.fetchFn ?? fetch;
        this.now = opts?.now ?? Date.now;
    }
    async get(url, opts) {
        const cached = this.cache.get(url);
        const nowMs = this.now();
        if (cached && nowMs - cached.fetchedAtMs < opts.ttlMs) {
            return { config: cached.config, fromCache: true };
        }
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === "http:" && !opts.allowInsecureHttp) {
            throw new Error(`Remote config fetch failed: insecure URL protocol is not allowed (${stripUrlQuery(url)})`);
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort(new DOMException("Remote config timeout", "AbortError"));
        }, opts.timeoutMs);
        try {
            const response = await this.fetchFn(url, {
                method: "GET",
                signal: controller.signal,
                headers: { accept: "application/json" }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = (await response.json());
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                throw new Error("payload must be a JSON object");
            }
            const config = payload;
            this.cache.set(url, { fetchedAtMs: nowMs, config });
            return { config, fromCache: false };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            throw new Error(`Remote config fetch failed: ${message} (${stripUrlQuery(url)})`);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
