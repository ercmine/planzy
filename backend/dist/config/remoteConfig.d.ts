import type { AppConfig } from "./schema.js";
export interface RemoteConfigClientOptions {
    fetchFn?: typeof fetch;
    now?: () => number;
}
export declare class RemoteConfigClient {
    private readonly fetchFn;
    private readonly now;
    private readonly cache;
    constructor(opts?: RemoteConfigClientOptions);
    get(url: string, opts: {
        ttlMs: number;
        timeoutMs: number;
        allowInsecureHttp: boolean;
    }): Promise<{
        config: Partial<AppConfig>;
        fromCache: boolean;
    }>;
}
