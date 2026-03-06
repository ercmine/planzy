import { defaultLogger } from "../logging/logger.js";
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

export class PolicyViolationError extends Error {
  public readonly code = "POLICY_VIOLATION" as const;
  public readonly details: { kind: string; value: string };

  constructor(message: string, details: { kind: string; value: string }) {
    super(message);
    this.name = "PolicyViolationError";
    this.details = details;
  }
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeUrl(input: string): string {
  try {
    const parsed = new URL(input);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return input;
  }
}

export function defaultNoScrapePolicy(): NoScrapePolicyConfig {
  return {
    enabled: true,
    allowedProviders: ["router", "curated", "byo", "places", "events", "movies", "promoted", "stub"],
    // Keep in sync with emitted plan.source values across providers/router post-processing.
    allowedPlanSources: ["google", "yelp", "ticketmaster", "tmdb", "curated", "byo", "promoted", "stub", "deduped", "movies", "events", "places"],
    allowedApiDomains: ["places.googleapis.com", "api.yelp.com", "app.ticketmaster.com", "api.themoviedb.org"],
    allowedImageDomains: ["image.tmdb.org"],
    allowedRedirectDomains: ["ourplanplan.com", "api.ourplanplan.com"],
    denyUnknownDomains: true,
    denyUnknownProviders: true,
    denyUnknownPlanSources: true
  };
}

export class NoScrapePolicy {
  private readonly cfg: NoScrapePolicyConfig;
  private readonly logger: Logger;

  constructor(cfg?: Partial<NoScrapePolicyConfig>, deps?: { logger?: Logger }) {
    this.cfg = { ...defaultNoScrapePolicy(), ...cfg };
    this.logger = deps?.logger ?? defaultLogger;
  }

  public assertProviderAllowed(name: string): void {
    const normalized = normalizeValue(name);
    if (!this.cfg.enabled || !this.cfg.denyUnknownProviders) {
      return;
    }

    if (!this.cfg.allowedProviders.map(normalizeValue).includes(normalized)) {
      this.violate("provider", normalized, `Provider '${normalized}' is not allowlisted by no-scrape policy`);
    }
  }

  public assertPlanSourceAllowed(source: string): void {
    const normalized = normalizeValue(source);
    if (!this.cfg.enabled || !this.cfg.denyUnknownPlanSources) {
      return;
    }

    if (!this.cfg.allowedPlanSources.map(normalizeValue).includes(normalized)) {
      this.violate("plan_source", normalized, `Plan source '${normalized}' is not allowlisted by no-scrape policy`);
    }
  }

  public assertUrlAllowed(url: string, kind: "api" | "image" | "redirect"): void {
    if (!this.cfg.enabled || !this.cfg.denyUnknownDomains) {
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      const safe = sanitizeUrl(url);
      this.violate(`domain_${kind}`, safe, `URL is invalid or unsupported by no-scrape policy (${kind})`);
      return;
    }

    const domain = normalizeValue(parsed.hostname);
    if (!this.isDomainAllowed(domain, kind)) {
      this.violate(`domain_${kind}`, sanitizeUrl(parsed.toString()), `Domain '${domain}' is not allowlisted for ${kind} requests`);
    }
  }

  public isDomainAllowed(domain: string, kind: "api" | "image" | "redirect"): boolean {
    const normalized = normalizeValue(domain);
    return this.getAllowlist(kind).includes(normalized);
  }

  private getAllowlist(kind: "api" | "image" | "redirect"): string[] {
    if (kind === "api") {
      return this.cfg.allowedApiDomains.map(normalizeValue);
    }
    if (kind === "image") {
      return this.cfg.allowedImageDomains.map(normalizeValue);
    }
    return this.cfg.allowedRedirectDomains.map(normalizeValue);
  }

  private violate(kind: string, value: string, message: string): never {
    const safeValue = sanitizeUrl(value);
    this.logger.warn("policy_violation", {
      module: "noScrapePolicy",
      kind,
      value: safeValue
    });

    throw new PolicyViolationError(message, { kind, value: safeValue });
  }
}
