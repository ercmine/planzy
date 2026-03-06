import { describe, expect, it } from "vitest";

import { JsonLogger } from "../logger.js";

describe("JsonLogger", () => {
  it("emits valid json lines", () => {
    const lines: string[] = [];
    const logger = new JsonLogger({
      minLevel: "debug",
      sink: (line) => lines.push(line)
    });

    logger.info("provider_request_start", { provider: "places", requestId: "req-1" });

    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0] ?? "{}");
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("provider_request_start");
    expect(parsed.provider).toBe("places");
    expect(typeof parsed.ts).toBe("string");
  });

  it("filters by level", () => {
    const lines: string[] = [];
    const logger = new JsonLogger({
      minLevel: "warn",
      sink: (line) => lines.push(line)
    });

    logger.debug("d", {});
    logger.info("i", {});
    logger.warn("w", {});

    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0] ?? "{}");
    expect(parsed.event).toBe("w");
  });

  it("redacts pii payloads by default", () => {
    const lines: string[] = [];
    const logger = new JsonLogger({
      minLevel: "info",
      sink: (line) => lines.push(line)
    });

    logger.info("provider_request_end", {
      title: "alice@example.com",
      url: "https://example.com/path?token=abc",
      lat: 10.12345,
      lng: 11.54321,
      token: "secret"
    });

    const parsed = JSON.parse(lines[0] ?? "{}");
    expect(parsed.token).toBe("[REDACTED]");
    expect(parsed.url).toBe("https://example.com/path");
    expect(parsed.geo).toEqual({ cell: "cell:3:10.123:11.543" });
    expect(parsed.lat).toBeUndefined();
    expect(parsed.lng).toBeUndefined();
    expect(parsed.title).toBeUndefined();
    expect(parsed.titleHash).toMatch(/^[a-f0-9]{12}$/);
  });
});
