import { describe, expect, it, vi } from "vitest";

import { NoScrapePolicy, PolicyViolationError, defaultNoScrapePolicy } from "../noScrapePolicy.js";
import { createPolicyFetch } from "../policyFetch.js";

describe("createPolicyFetch", () => {
  it("passes through allowlisted requests", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    const policyFetch = createPolicyFetch({ policy: new NoScrapePolicy(defaultNoScrapePolicy()), kind: "api", fetchFn });

    const result = await policyFetch("https://api.themoviedb.org/3/movie/now_playing");

    expect(result.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("blocks unknown domains and does not call underlying fetch", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("should not be called"));
    const policyFetch = createPolicyFetch({ policy: new NoScrapePolicy(defaultNoScrapePolicy()), kind: "api", fetchFn });

    await expect(policyFetch("https://example.com/scrape")).rejects.toBeInstanceOf(PolicyViolationError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("strips query string details from policy violations", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("should not be called"));
    const policyFetch = createPolicyFetch({ policy: new NoScrapePolicy(defaultNoScrapePolicy()), kind: "api", fetchFn });

    try {
      await policyFetch("https://example.com/scrape?secret=token");
      throw new Error("Expected policy violation");
    } catch (error) {
      expect(error).toBeInstanceOf(PolicyViolationError);
      const violation = error as PolicyViolationError;
      expect(violation.message).not.toContain("secret=token");
      expect(violation.details.value).not.toContain("secret=token");
    }

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
