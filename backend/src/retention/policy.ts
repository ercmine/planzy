import type { DataClass, ProviderRetentionRule, RetentionConfig } from "./types.js";

const MIN_TTL_MS = 1_000;

export function coercePositiveMs(x: unknown, fallback: number): number {
  if (typeof x !== "number" || !Number.isFinite(x) || x <= 0) {
    return fallback;
  }
  return Math.round(x);
}

export function defaultRetentionConfig(): RetentionConfig {
  return {
    enabled: true,
    maxTtlByClass: {
      provider_api_cache: 60 * 60 * 1_000,
      router_deck_cache: 60 * 1_000,
      pagination_snapshot: 10 * 60 * 1_000,
      affiliate_wrapped_links: 5 * 60 * 1_000,
      analytics_clicks: 30 * 24 * 60 * 60 * 1_000,
      venue_claims: 90 * 24 * 60 * 60 * 1_000,
      merchant_promos: 365 * 24 * 60 * 60 * 1_000,
      merchant_specials: 365 * 24 * 60 * 60 * 1_000
    },
    providerRules: [
      { provider: "google", maxCacheTtlMs: 60 * 60 * 1_000, allowLongTermStorage: false },
      { provider: "yelp", maxCacheTtlMs: 60 * 60 * 1_000, allowLongTermStorage: false },
      { provider: "ticketmaster", maxCacheTtlMs: 60 * 60 * 1_000, allowLongTermStorage: false },
      { provider: "tmdb", maxCacheTtlMs: 24 * 60 * 60 * 1_000, allowLongTermStorage: false }
    ]
  };
}

function normalizeProviderRule(rule: ProviderRetentionRule, fallbackTtlMs: number): ProviderRetentionRule {
  return {
    provider: rule.provider.trim().toLowerCase(),
    maxCacheTtlMs: coercePositiveMs(rule.maxCacheTtlMs, fallbackTtlMs),
    allowLongTermStorage: Boolean(rule.allowLongTermStorage)
  };
}

export class RetentionPolicy {
  public readonly config: RetentionConfig;
  private readonly providerRuleByName = new Map<string, ProviderRetentionRule>();

  constructor(cfg?: Partial<RetentionConfig>) {
    const base = defaultRetentionConfig();
    const mergedClassTtls: RetentionConfig["maxTtlByClass"] = { ...base.maxTtlByClass };

    if (cfg?.maxTtlByClass) {
      for (const [key, value] of Object.entries(cfg.maxTtlByClass)) {
        const dataClass = key as DataClass;
        mergedClassTtls[dataClass] = coercePositiveMs(value, base.maxTtlByClass[dataClass]);
      }
    }

    const providerRules = (cfg?.providerRules ?? base.providerRules).map((rule) =>
      normalizeProviderRule(rule, mergedClassTtls.provider_api_cache)
    );

    this.config = {
      enabled: cfg?.enabled ?? base.enabled,
      maxTtlByClass: mergedClassTtls,
      providerRules
    };

    for (const rule of this.config.providerRules) {
      this.providerRuleByName.set(rule.provider, rule);
    }
  }

  public clampTtl(dataClass: DataClass, requestedTtlMs: number): number {
    if (!this.config.enabled) {
      return requestedTtlMs;
    }

    const max = this.config.maxTtlByClass[dataClass];
    const requested = coercePositiveMs(requestedTtlMs, max);
    return Math.min(max, Math.max(MIN_TTL_MS, requested));
  }

  public clampProviderTtl(provider: string, requestedTtlMs: number): number {
    if (!this.config.enabled) {
      return requestedTtlMs;
    }

    const normalized = provider.trim().toLowerCase();
    const rule = this.providerRuleByName.get(normalized);
    const fallbackMax = this.config.maxTtlByClass.provider_api_cache;
    const providerMax = rule ? coercePositiveMs(rule.maxCacheTtlMs, fallbackMax) : fallbackMax;
    const requested = coercePositiveMs(requestedTtlMs, providerMax);

    return Math.min(providerMax, Math.max(MIN_TTL_MS, requested));
  }

  public isLongTermStorageAllowed(provider: string): boolean {
    const normalized = provider.trim().toLowerCase();
    return this.providerRuleByName.get(normalized)?.allowLongTermStorage ?? false;
  }
}
