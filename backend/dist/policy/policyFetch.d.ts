import { NoScrapePolicy } from "./noScrapePolicy.js";
export interface PolicyFetchOptions {
    policy: NoScrapePolicy;
    kind: "api" | "image" | "redirect";
    fetchFn?: typeof fetch;
}
export declare function createPolicyFetch(opts: PolicyFetchOptions): typeof fetch;
