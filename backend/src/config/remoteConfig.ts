import type { AppConfig } from "./schema.js";

export interface RemoteConfigClientOptions {
  fetchFn?: typeof fetch;
  now?: () => number;
}

interface CachedConfig {
  fetchedAtMs: number;
  config: Partial<AppConfig>;
}

function stripUrlQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export class RemoteConfigClient {
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new Map<string, CachedConfig>();

  constructor(opts?: RemoteConfigClientOptions) {
    this.fetchFn = opts?.fetchFn ?? fetch;
    this.now = opts?.now ?? Date.now;
  }

  public async get(
    url: string,
    opts: { ttlMs: number; timeoutMs: number; allowInsecureHttp: boolean }
  ): Promise<{ config: Partial<AppConfig>; fromCache: boolean }> {
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

      const payload = (await response.json()) as unknown;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("payload must be a JSON object");
      }

      const config = payload as Partial<AppConfig>;
      this.cache.set(url, { fetchedAtMs: nowMs, config });
      return { config, fromCache: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      throw new Error(`Remote config fetch failed: ${message} (${stripUrlQuery(url)})`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
