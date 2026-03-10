import { describe, expect, it } from "vitest";

import { readEnvConfigWithWarnings } from "../env.js";
import { loadConfig, mergeConfig } from "../loadConfig.js";
import { defaultConfig } from "../schema.js";

describe("config", () => {
  it("defaultConfig produces stub provider enabled", () => {
    const config = defaultConfig("dev");
    expect(config.plans.providers.stub).toBeDefined();
    expect(config.plans.providers.stub.routing?.enabled).toBe(true);
  });

  it("env overlay parses numeric fields and enabled providers", () => {
    const result = readEnvConfigWithWarnings({
      APP_ENV: "prod",
      PROVIDERS_ENABLED: "stub,places",
      PROVIDER_PLACES_TIMEOUT_MS: "2200",
      PROVIDER_PLACES_MAX_CONCURRENT: "4",
      PROVIDER_PLACES_RPM: "60"
    });

    expect(result.config.env).toBe("prod");
    expect(result.config.plans?.providers?.places?.routing?.enabled).toBe(true);
    expect(result.config.plans?.providers?.places?.budget?.timeoutMs).toBe(2200);
    expect(result.config.plans?.providers?.places?.budget?.maxConcurrent).toBe(4);
    expect(result.config.plans?.providers?.places?.quota?.requestsPerMinute).toBe(60);
    expect(result.warnings).toHaveLength(0);
  });

  it("mergeConfig deep merges provider config without wiping defaults", () => {
    const base = defaultConfig("dev");
    const merged = mergeConfig(base, {
      plans: {
        providers: {
          stub: {
            name: "stub",
            budget: { timeoutMs: 9999 }
          }
        },
        router: base.plans.router
      }
    });

    expect(merged.plans.providers.stub.budget?.timeoutMs).toBe(9999);
    expect(merged.plans.providers.stub.routing?.enabled).toBe(true);
    expect(merged.plans.providers.stub.cache?.ttlMs).toBe(30000);
  });

  it("loadConfig returns warnings on bad JSON but still loads", async () => {
    const { config, warnings } = await loadConfig({
      env: {
        APP_ENV: "dev",
        PROVIDER_STUB_CATEGORY_WEIGHTS: "{bad-json}",
        PLANS_ROUTER_CATEGORY_ORDER: "{also-bad}"
      },
      fetchRemote: false
    });

    expect(config.plans.providers.stub).toBeDefined();
    expect(warnings.some((warning) => warning.includes("Invalid JSON"))).toBe(true);
  });

  it("env overlay parses affiliate settings", () => {
    const result = readEnvConfigWithWarnings({
      AFFILIATE_ENABLED: "true",
      AFFILIATE_MODE: "append_params",
      AFFILIATE_DEFAULT_PARAMS: '{"utm_source":"planzy"}',
      AFFILIATE_DOMAIN_RULES: '[{"matchDomain":"ticketmaster.com","params":{"utm_campaign":"tm"}}]',
      AFFILIATE_WRAP_BOOKING: "true",
      AFFILIATE_WRAP_TICKET: "false",
      AFFILIATE_WRAP_WEBSITE: "true",
      AFFILIATE_INCLUDE_SESSION: "false",
      AFFILIATE_INCLUDE_PLAN: "true"
    });

    expect(result.config.affiliate?.enabled).toBe(true);
    expect(result.config.affiliate?.mode).toBe("append_params");
    expect(result.config.affiliate?.defaultParams).toEqual({ utm_source: "planzy" });
    expect(result.config.affiliate?.domainRules?.[0]?.matchDomain).toBe("ticketmaster.com");
    expect(result.config.affiliate?.wrapTicket).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("env overlay parses nominatim settings", () => {
    const result = readEnvConfigWithWarnings({
      NOMINATIM_BASE_URL: "http://nominatim.internal",
      NOMINATIM_TIMEOUT_MS: "1500",
      NOMINATIM_GEOCODE_CACHE_TTL_MS: "120000",
      NOMINATIM_REVERSE_CACHE_TTL_MS: "300000",
      NOMINATIM_DEFAULT_LIMIT: "8",
      NOMINATIM_ENABLE_FALLBACK: "false"
    });

    expect(result.config.geocoding?.baseUrl).toBe("http://nominatim.internal");
    expect(result.config.geocoding?.timeoutMs).toBe(1500);
    expect(result.config.geocoding?.defaultLimit).toBe(8);
    expect(result.warnings).toHaveLength(0);
  });
});
