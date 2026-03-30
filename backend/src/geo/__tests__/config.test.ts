import { describe, expect, it } from "vitest";

import { readGeoRuntimeConfig, validateGeoRuntimeConfig } from "../config.js";

describe("readGeoRuntimeConfig", () => {
  it("parses remote geo settings", () => {
    const config = readGeoRuntimeConfig({
      GEO_SERVICE_ENABLED: "true",
      GEO_SERVICE_BASE_URL: "https://geo.perbug.com",
      GEO_SERVICE_TIMEOUT_MS: "3500",
      GEO_SERVICE_RETRIES: "2",
      GEO_SERVICE_FAIL_OPEN: "false",
      GEO_SERVICE_AUTH_SECRET: "secret"
    });

    expect(config.client.enabled).toBe(true);
    expect(config.client.timeoutMs).toBe(3500);
    expect(config.client.retries).toBe(2);
    expect(config.client.failOpen).toBe(false);
    expect(config.client.authSecret).toBe("secret");
  });

  it("flags disabled geo in production", () => {
    const config = readGeoRuntimeConfig({
      APP_ENV: "prod"
    });
    const validation = validateGeoRuntimeConfig(config, { APP_ENV: "prod" });
    expect(validation.mode).toBe("disabled");
    expect(validation.shouldFailFast).toBe(true);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("honors GEO_SERVICE_ENABLED=false when custom base URL exists", () => {
    const env = {
      GEO_SERVICE_ENABLED: "false",
      GEO_SERVICE_BASE_URL: "https://geo.perbug.com",
      NOMINATIM_BASE_URL: "https://nominatim.perbug.com"
    };
    const config = readGeoRuntimeConfig(env);
    const validation = validateGeoRuntimeConfig(config, env);
    expect(validation.mode).toBe("nominatim");
  });

  it("parses explicit false-ish GEO_SERVICE_ENABLED values", () => {
    const env = {
      GEO_SERVICE_ENABLED: "off",
      GEO_SERVICE_BASE_URL: "https://geo.perbug.com",
      NOMINATIM_BASE_URL: "https://nominatim.perbug.com"
    };
    const config = readGeoRuntimeConfig(env);
    const validation = validateGeoRuntimeConfig(config, env);
    expect(config.client.enabled).toBe(false);
    expect(validation.mode).toBe("nominatim");
  });

  it("uses explicit GEO_MODE for custom and nominatim modes", () => {
    const nominatimEnv = {
      GEO_MODE: "nominatim",
      GEO_SERVICE_ENABLED: "true",
      NOMINATIM_BASE_URL: "https://nominatim.perbug.com"
    };
    const nominatimConfig = readGeoRuntimeConfig(nominatimEnv);
    expect(validateGeoRuntimeConfig(nominatimConfig, nominatimEnv).mode).toBe("nominatim");

    const customEnv = {
      GEO_MODE: "custom",
      GEO_SERVICE_BASE_URL: "https://geo.perbug.com"
    };
    const customConfig = readGeoRuntimeConfig(customEnv);
    expect(validateGeoRuntimeConfig(customConfig, customEnv).mode).toBe("custom");
  });
});
