import { describe, expect, it } from "vitest";

import { RateLimitError } from "../errors.js";
import type { Plan } from "../plan.js";
import type { PlanProvider, ProviderContext } from "../provider.js";
import { ProviderRouter } from "../router/providerRouter.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";

class FakeProvider implements PlanProvider {
  public readonly name: string;
  private readonly plans: Plan[];
  private readonly delayMs: number;
  private readonly failWith?: Error;

  constructor(opts: { name: string; plans?: Plan[]; delayMs?: number; failWith?: Error }) {
    this.name = opts.name;
    this.plans = opts.plans ?? [];
    this.delayMs = opts.delayMs ?? 0;
    this.failWith = opts.failWith;
  }

  public async searchPlans(_input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    if (ctx?.signal?.aborted) {
      throw new DOMException("aborted", "AbortError");
    }

    if (this.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), this.delayMs);
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        };
        ctx?.signal?.addEventListener("abort", onAbort, { once: true });
      });
    }

    if (this.failWith) {
      throw this.failWith;
    }

    return {
      plans: this.plans,
      source: this.name,
      nextCursor: null,
      debug: { tookMs: 0, returned: this.plans.length }
    };
  }
}

function plan(overrides: Partial<Plan> & Pick<Plan, "id" | "source" | "sourceId" | "title" | "category">): Plan {
  return {
    location: { lat: 37.775, lng: -122.418 },
    ...overrides
  };
}

describe("ProviderRouter", () => {
  const baseInput: SearchPlansInput = {
    location: { lat: 37.775, lng: -122.418 },
    radiusMeters: 5_000,
    limit: 10
  };

  it("fans out to providers, merges and dedupes", async () => {
    const p1 = new FakeProvider({
      name: "p1",
      plans: [
        plan({ id: "same", source: "p1", sourceId: "1", title: "A", category: "food" }),
        plan({ id: "u1", source: "p1", sourceId: "2", title: "B", category: "coffee" })
      ]
    });
    const p2 = new FakeProvider({
      name: "p2",
      plans: [
        plan({ id: "same", source: "p2", sourceId: "x", title: "A", category: "food" }),
        plan({ id: "u2", source: "p2", sourceId: "3", title: "C", category: "movies" })
      ]
    });

    const router = new ProviderRouter({ providers: [p1, p2] });
    const result = await router.search(baseInput);

    expect(result.plans).toHaveLength(3);
    expect(result.sources).toEqual(["p1", "p2"]);
  });

  it("ranks using categories, openNow, and distance", async () => {
    const router = new ProviderRouter({
      providers: [
        new FakeProvider({
          name: "rank",
          plans: [
            plan({ id: "a", source: "rank", sourceId: "a", title: "Far Open Coffee", category: "coffee", distanceMeters: 3000, hours: { openNow: true } }),
            plan({ id: "b", source: "rank", sourceId: "b", title: "Near Closed Food", category: "food", distanceMeters: 100, hours: { openNow: false } }),
            plan({ id: "c", source: "rank", sourceId: "c", title: "Mid Open Coffee", category: "coffee", distanceMeters: 700, hours: { openNow: true } })
          ]
        })
      ]
    });

    const result = await router.search({
      ...baseInput,
      categories: ["coffee"],
      openNow: true
    });

    expect(result.plans.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("returns partial results when allowPartial=true", async () => {
    const ok = new FakeProvider({
      name: "ok",
      plans: [plan({ id: "ok-1", source: "ok", sourceId: "1", title: "OK", category: "food" })]
    });
    const bad = new FakeProvider({ name: "bad", failWith: new RateLimitError("bad") });
    const router = new ProviderRouter({ providers: [ok, bad], allowPartial: true, includeDebug: true });

    const result = await router.search(baseInput);

    expect(result.plans).toHaveLength(1);
    expect(result.debug?.calls.find((c) => c.provider === "bad")?.error?.code).toBe("RATE_LIMIT");
  });

  it("throws when allowPartial=false and any provider fails", async () => {
    const ok = new FakeProvider({ name: "ok", plans: [] });
    const bad = new FakeProvider({ name: "bad", failWith: new RateLimitError("bad") });
    const router = new ProviderRouter({ providers: [ok, bad], allowPartial: false });

    await expect(router.search(baseInput)).rejects.toThrow("Provider fanout failed");
  });

  it("supports router-level pagination cursor", async () => {
    const p = new FakeProvider({
      name: "p",
      plans: [
        plan({ id: "1", source: "p", sourceId: "1", title: "A", category: "food" }),
        plan({ id: "2", source: "p", sourceId: "2", title: "B", category: "food" }),
        plan({ id: "3", source: "p", sourceId: "3", title: "C", category: "food" })
      ]
    });
    const router = new ProviderRouter({ providers: [p] });

    const page1 = await router.search({ ...baseInput, limit: 2 });
    const page2 = await router.search({ ...baseInput, limit: 2, cursor: page1.nextCursor ?? null });

    expect(page1.plans).toHaveLength(2);
    expect(page2.plans).toHaveLength(1);
    expect(page1.plans[0]?.id).not.toBe(page2.plans[0]?.id);
  });

  it("aborts slow provider on timeout and still returns other results", async () => {
    const fast = new FakeProvider({
      name: "fast",
      plans: [plan({ id: "fast-1", source: "fast", sourceId: "1", title: "Fast", category: "food" })]
    });
    const slow = new FakeProvider({ name: "slow", delayMs: 100 });

    const router = new ProviderRouter({
      providers: [fast, slow],
      allowPartial: true,
      includeDebug: true,
      defaultTimeoutMs: 20
    });

    const result = await router.search(baseInput);

    expect(result.plans.map((p) => p.id)).toContain("fast-1");
    expect(result.debug?.calls.find((c) => c.provider === "slow")?.error?.code).toBe("TIMEOUT");
  });
});
