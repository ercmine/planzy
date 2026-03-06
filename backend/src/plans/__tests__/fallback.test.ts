import { describe, expect, it } from "vitest";

import { ProviderError, RateLimitError } from "../errors.js";
import type { Plan } from "../plan.js";
import type { PlanProvider, ProviderContext } from "../provider.js";
import { applyNeverEmptyFallback } from "../router/fallback.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";

function makePlan(id: string, source: string, category: Plan["category"]): Plan {
  return {
    id,
    source,
    sourceId: id,
    title: id,
    category,
    location: { lat: 37.775, lng: -122.418 }
  };
}

class FakeFailProvider implements PlanProvider {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async searchPlans(_input: SearchPlansInput, _ctx?: ProviderContext): Promise<SearchPlansResult> {
    throw new RateLimitError(this.name);
  }
}

class FakeEmptyProvider implements PlanProvider {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async searchPlans(_input: SearchPlansInput, _ctx?: ProviderContext): Promise<SearchPlansResult> {
    return { plans: [], source: this.name, nextCursor: null };
  }
}

class FakeFewProvider implements PlanProvider {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async searchPlans(_input: SearchPlansInput, _ctx?: ProviderContext): Promise<SearchPlansResult> {
    return {
      plans: [makePlan("few-1", this.name, "food"), makePlan("few-2", this.name, "coffee"), makePlan("few-3", this.name, "movies")],
      source: this.name,
      nextCursor: null
    };
  }
}

class FakeByoProvider implements PlanProvider {
  public readonly name = "byo";
  public calls = 0;
  public categoriesSeen: SearchPlansInput["categories"] | undefined;

  public async searchPlans(input: SearchPlansInput, _ctx?: ProviderContext): Promise<SearchPlansResult> {
    this.calls += 1;
    this.categoriesSeen = input.categories;
    return {
      plans: [
        makePlan("byo-1", this.name, "movies"),
        makePlan("byo-2", this.name, "food"),
        makePlan("byo-3", this.name, "movies"),
        makePlan("byo-4", this.name, "coffee"),
        makePlan("byo-5", this.name, "movies")
      ],
      source: this.name,
      nextCursor: null
    };
  }
}

class FakeCuratedProvider implements PlanProvider {
  public readonly name = "curated";
  public calls = 0;
  public categoriesSeen: SearchPlansInput["categories"] | undefined;

  public async searchPlans(input: SearchPlansInput, _ctx?: ProviderContext): Promise<SearchPlansResult> {
    this.calls += 1;
    this.categoriesSeen = input.categories;
    const plans = Array.from({ length: 30 }, (_, index) =>
      makePlan(`curated-${index + 1}`, this.name, index % 2 === 0 ? "movies" : "food")
    );
    return { plans, source: this.name, nextCursor: null };
  }
}

describe("applyNeverEmptyFallback", () => {
  const input: SearchPlansInput = {
    location: { lat: 37.775, lng: -122.418 },
    radiusMeters: 2000,
    limit: 50
  };

  it("backfills when base providers all fail", async () => {
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();

    const result = await applyNeverEmptyFallback({
      input,
      basePlans: [],
      providers: [new FakeFailProvider("places"), new FakeFailProvider("events"), byo, curated],
      providerErrors: [
        { provider: "places", error: new RateLimitError("places") },
        { provider: "events", error: new RateLimitError("events") }
      ],
      opts: { minResults: 25, maxBackfill: 28, includeDebug: true }
    });

    expect(result.plans.length).toBeGreaterThanOrEqual(25);
    expect(result.plans.length).toBe(28);
    expect(result.debug?.triggered).toBe(true);
    expect(result.debug?.reason).toBe("all_failed");
  });

  it("triggers on too few and uses byo then curated", async () => {
    const calls: string[] = [];
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();
    const byoSearch = byo.searchPlans.bind(byo);
    byo.searchPlans = async (inputArg: SearchPlansInput, ctx?: ProviderContext) => {
      calls.push("byo");
      return byoSearch(inputArg, ctx);
    };
    const curatedSearch = curated.searchPlans.bind(curated);
    curated.searchPlans = async (inputArg: SearchPlansInput, ctx?: ProviderContext) => {
      calls.push("curated");
      return curatedSearch(inputArg, ctx);
    };

    const basePlans = (await new FakeFewProvider("places").searchPlans(input)).plans;
    const result = await applyNeverEmptyFallback({
      input,
      basePlans,
      providers: [new FakeFewProvider("places"), byo, curated],
      providerErrors: [],
      opts: { minResults: 25, includeDebug: true, preferByoFirst: true }
    });

    expect(result.debug?.triggered).toBe(true);
    expect(result.debug?.reason).toBe("too_few");
    expect(calls).toEqual(["byo", "curated"]);
    expect(result.debug?.afterByoCount).toBe(8);
    expect(result.debug?.afterCuratedCount).toBeGreaterThanOrEqual(25);
  });

  it("does not trigger when base count is enough", async () => {
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();
    const basePlans = Array.from({ length: 30 }, (_, index) => makePlan(`base-${index + 1}`, "places", "movies"));

    const result = await applyNeverEmptyFallback({
      input,
      basePlans,
      providers: [new FakeEmptyProvider("places"), byo, curated],
      providerErrors: [],
      opts: { minResults: 25, includeDebug: true }
    });

    expect(result.debug?.triggered).toBe(false);
    expect(byo.calls).toBe(0);
    expect(curated.calls).toBe(0);
    expect(result.plans).toHaveLength(30);
  });

  it("dedupes against existing ids when backfilling", async () => {
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();
    const basePlans = [makePlan("byo-1", "places", "movies"), makePlan("curated-1", "events", "movies")];

    const result = await applyNeverEmptyFallback({
      input,
      basePlans,
      providers: [byo, curated],
      providerErrors: [],
      opts: { minResults: 20, includeDebug: true }
    });

    const ids = result.plans.map((plan) => plan.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids.filter((id) => id === "byo-1")).toHaveLength(1);
    expect(ids.filter((id) => id === "curated-1")).toHaveLength(1);
  });

  it("propagates ABORTED when signal is aborted before fallback", async () => {
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();
    const controller = new AbortController();
    controller.abort("cancelled");

    await expect(
      applyNeverEmptyFallback({
        input,
        ctx: { signal: controller.signal },
        basePlans: [],
        providers: [byo, curated],
        providerErrors: [],
        opts: { includeDebug: true }
      })
    ).rejects.toMatchObject({ code: "ABORTED" } satisfies Partial<ProviderError>);
    expect(byo.calls).toBe(0);
    expect(curated.calls).toBe(0);
  });

  it("passes category filters through to fallback providers", async () => {
    const byo = new FakeByoProvider();
    const curated = new FakeCuratedProvider();

    const result = await applyNeverEmptyFallback({
      input: { ...input, categories: ["movies"] },
      basePlans: [],
      providers: [byo, curated],
      providerErrors: [],
      opts: { includeDebug: true }
    });

    expect(byo.categoriesSeen).toEqual(["movies"]);
    expect(curated.categoriesSeen).toEqual(["movies"]);
    expect(result.plans.length).toBeGreaterThan(0);
  });
});
