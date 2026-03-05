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
});
