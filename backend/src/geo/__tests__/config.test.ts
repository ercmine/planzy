import { describe, expect, it } from "vitest";

import { readGeoRuntimeConfig, validateGeoRuntimeConfig } from "../config.js";

describe("readGeoRuntimeConfig", () => {
  it("parses remote geo settings", () => {
    const config = readGeoRuntimeConfig({
      GEO_SERVICE_ENABLED: "true",
      GEO_SERVICE_BASE_URL: "https://geo.dryad.dev",
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
});
