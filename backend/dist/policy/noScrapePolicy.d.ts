import type { Logger } from "../logging/loggerTypes.js";
export interface NoScrapePolicyConfig {
    enabled: boolean;
    allowedProviders: string[];
    allowedPlanSources: string[];
    allowedApiDomains: string[];
    allowedImageDomains: string[];
    allowedRedirectDomains: string[];
    denyUnknownDomains: boolean;
    denyUnknownProviders: boolean;
    denyUnknownPlanSources: boolean;
}
export declare class PolicyViolationError extends Error {
    readonly code: "POLICY_VIOLATION";
    readonly details: {
        kind: string;
        value: string;
    };
    constructor(message: string, details: {
        kind: string;
        value: string;
    });
}
export declare function defaultNoScrapePolicy(): NoScrapePolicyConfig;
export declare class NoScrapePolicy {
    private readonly cfg;
    private readonly logger;
    constructor(cfg?: Partial<NoScrapePolicyConfig>, deps?: {
        logger?: Logger;
    });
    assertProviderAllowed(name: string): void;
    assertPlanSourceAllowed(source: string): void;
    assertUrlAllowed(url: string, kind: "api" | "image" | "redirect"): void;
    isDomainAllowed(domain: string, kind: "api" | "image" | "redirect"): boolean;
    private getAllowlist;
    private violate;
}
