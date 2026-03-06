import { describe, expect, it } from "vitest";

import { coarseGeo, redactObject, stripQuery } from "../redact.js";

describe("redact helpers", () => {
  it("strips query and hash from urls", () => {
    expect(stripQuery("https://example.com/path?q=1#frag")).toBe("https://example.com/path");
  });

  it("redacts secrets and removes raw coordinates", () => {
    const output = redactObject({
      apiKey: "secret",
      token: "abc",
      password: "pw",
      lat: 37.7749,
      lng: -122.4194,
      website: "https://example.com/a?token=abc#part"
    });

    expect(output.apiKey).toBe("[REDACTED]");
    expect(output.token).toBe("[REDACTED]");
    expect(output.password).toBe("[REDACTED]");
    expect(output.lat).toBeUndefined();
    expect(output.lng).toBeUndefined();
    expect(output.geo).toEqual(coarseGeo(37.7749, -122.4194));
    expect(output.website).toBe("https://example.com/a");
  });

  it("hashes or truncates text-like keys", () => {
    const output = redactObject({
      title: "private@example.com",
      description: "  Family movie night with snacks and gameshat keeps going beyond forty chars  "
    });

    expect(output.title).toBeUndefined();
    expect(output.titleHash).toMatch(/^[a-f0-9]{12}$/);
    expect(output.description).toBe("Family movie night with snacks and games");
  });

  it("caps recursion depth and array sizes", () => {
    const output = redactObject({
      list: Array.from({ length: 20 }, (_, i) => i),
      nested: { a: { b: { c: { d: { e: true } } } } }
    });

    expect(Array.isArray(output.list)).toBe(true);
    expect((output.list as unknown[]).length).toBe(10);
    expect(output.nested).toEqual({ a: { b: { c: { d: "[TRUNCATED]" } } } });
  });
});
