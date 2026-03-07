import { describe, expect, it } from "vitest";

import type { AppConfig } from "../../config/schema.js";
import { defaultConfig } from "../../config/schema.js";
import { CuratedProvider } from "../curated/curatedProvider.js";
import { MemoryIdeasStore } from "../bringYourOwn/memoryStorage.js";
import { BringYourOwnProvider } from "../bringYourOwn/bringYourOwnProvider.js";
import { ProviderError } from "../errors.js";
import type { Plan } from "../plan.js";
import type { PlanProvider, ProviderContext } from "../provider.js";
import { ProviderRouter } from "../router/providerRouter.js";
import { ProviderHealthMonitor } from "../router/health/healthMonitor.js";
import { QuotaManager } from "../router/quotas/quotaManager.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";

const INPUT: SearchPlansInput = {
  location: { lat: 37.775, lng: -122.418 },
  radiusMeters: 5_000,
  limit: 20
};

const SESSION_ID = "integration-session";

function makeConfig(providerNames: string[]): AppConfig {
  const cfg = defaultConfig("dev");
  cfg.plans.router.defaultTimeoutMs = 100;
  cfg.plans.providers = Object.fromEntries(
    providerNames.map((name) => [
      name,
      {
        name,
        routing: { enabled: true },
        quota: { requestsPerMinute: 100, burst: 100 }
      }
    ])
  );
  return cfg;
}

function makePlan(id: string, source: string, category: Plan["category"] = "food"): Plan {
  return {
    id,
    source,
    sourceId: id,
    title: `${source}-${id}`,
    category,
    location: { lat: 37.775, lng: -122.418 },
    deepLinks: {
      bookingLink: `https://example.com/${source}/${id}`
    }
  };
}

async function buildFallbackProviders(): Promise<{ curated: CuratedProvider; byo: BringYourOwnProvider }> {
  const store = new MemoryIdeasStore();
  await store.addIdea(SESSION_ID, { title: "BYO sushi night", category: "food" });
  await store.addIdea(SESSION_ID, { title: "BYO jazz spot", category: "music" });
  await store.addIdea(SESSION_ID, { title: "BYO sunrise hike", category: "outdoors" });

  return {
    curated: new CuratedProvider({ maxTemplates: 30, maxSuggestions: 0 }),
    byo: new BringYourOwnProvider(store)
  };
}

class FastProvider implements PlanProvider {
  public constructor(
    public readonly name: string,
    private readonly count: number
  ) {}

  public async searchPlans(): Promise<SearchPlansResult> {
    const plans = Array.from({ length: this.count }, (_, index) =>
      makePlan(`${this.name}-${index + 1}`, this.name, index % 2 === 0 ? "food" : "coffee")
    );

    return { plans, source: this.name, nextCursor: null };
  }
}

class SlowProvider implements PlanProvider {
  public constructor(
    public readonly name: string,
    private readonly delayMs: number
  ) {}

  public async searchPlans(_input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, this.delayMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      };

      if (ctx?.signal?.aborted) {
        onAbort();
        return;
      }

      ctx?.signal?.addEventListener("abort", onAbort, { once: true });
    });

    return { plans: [makePlan(`${this.name}-late`, this.name)], source: this.name, nextCursor: null };
  }
}

class ErrorProvider implements PlanProvider {
  public constructor(public readonly name: string) {}

  public async searchPlans(): Promise<SearchPlansResult> {
    throw new ProviderError({
      provider: this.name,
      code: "HTTP_500",
      message: `${this.name} failed`,
      retryable: true
    });
  }
}

class FlakyProvider implements PlanProvider {
  private calls = 0;

  public constructor(
    public readonly name: string,
    private readonly failCount: number
  ) {}

  public async searchPlans(): Promise<SearchPlansResult> {
    this.calls += 1;
    if (this.calls <= this.failCount) {
      throw new ProviderError({
        provider: this.name,
        code: "HTTP_500",
        message: `${this.name} failed attempt ${this.calls}`,
        retryable: true
      });
    }

    return { plans: [makePlan(`${this.name}-ok`, this.name)], source: this.name, nextCursor: null };
  }
}

describe("ProviderRouter integration resilience", () => {
  it("handles timeout + partial success and still returns a usable deck", async () => {
    const { curated, byo } = await buildFallbackProviders();
    const providers: PlanProvider[] = [new SlowProvider("p_slow", 500), new FastProvider("p_fast", 4), curated, byo];

    const router = new ProviderRouter({
      enforceNoScrape: false,
      providers,
      config: makeConfig(providers.map((provider) => provider.name)),
      allowPartial: true,
      includeDebug: true,
      defaultTimeoutMs: 100,
      neverEmpty: { enabled: true, minResults: 25, hardMinResults: 10 },
      cache: { enabled: false }
    });

    const result = await router.search(INPUT, { sessionId: SESSION_ID });

    expect(result.plans.length).toBeGreaterThanOrEqual(10);
    expect(result.plans.some((plan) => plan.source === "p_fast")).toBe(true);
    expect(result.debug?.calls.find((call) => call.provider === "p_slow")?.error?.code).toBe("TIMEOUT");
    expect(result.nextCursor).toBeTruthy();
  });

  it("uses curated/byo fallback when all primary providers fail", async () => {
    const { curated, byo } = await buildFallbackProviders();
    const providers: PlanProvider[] = [new ErrorProvider("p_err1"), new ErrorProvider("p_err2"), curated, byo];

    const router = new ProviderRouter({
      enforceNoScrape: false,
      providers,
      config: makeConfig(providers.map((provider) => provider.name)),
      allowPartial: true,
      includeDebug: true,
      neverEmpty: { enabled: true, minResults: 25, hardMinResults: 10 },
      cache: { enabled: false }
    });

    const result = await router.search(INPUT, { sessionId: SESSION_ID });

    expect(result.plans.length).toBeGreaterThan(0);
    expect(result.plans.every((plan) => plan.source === "curated" || plan.source === "byo")).toBe(true);
    expect(result.debug?.fallback?.triggered).toBe(true);
  });

  it("gracefully degrades on quota denial", async () => {
    const { curated, byo } = await buildFallbackProviders();
    const pQuota = new FastProvider("p_quota", 3);
    const providers: PlanProvider[] = [pQuota, curated, byo];
    const config = makeConfig(providers.map((provider) => provider.name));
    config.plans.providers.p_quota.quota = { requestsPerMinute: 1, burst: 1 };

    const quotaManager = new QuotaManager({ now: () => 0 });
    const router = new ProviderRouter({
      enforceNoScrape: false,
      providers,
      config,
      quotaManager,
      allowPartial: true,
      includeDebug: true,
      neverEmpty: { enabled: true, minResults: 12, hardMinResults: 10 },
      cache: { enabled: false }
    });

    const first = await router.search(INPUT, { sessionId: SESSION_ID });
    const second = await router.search(INPUT, { sessionId: SESSION_ID });

    expect(first.plans.some((plan) => plan.source === "p_quota")).toBe(true);
    expect(second.plans.length).toBeGreaterThan(0);
    expect(second.debug?.calls.find((call) => call.provider === "p_quota")?.error?.code).toBe("QUOTA_DENIED");
    expect(second.plans.some((plan) => plan.source === "curated" || plan.source === "byo")).toBe(true);
  });

  it("auto-disables unhealthy providers and continues with curated", async () => {
    let nowMs = 0;
    const flaky = new FlakyProvider("p_flaky", 5);
    const curated = new CuratedProvider({ maxTemplates: 8, maxSuggestions: 0 });
    const providers: PlanProvider[] = [flaky, curated];

    const healthMonitor = new ProviderHealthMonitor(
      { maxConsecutiveFailures: 3, disableForMs: 60_000, halfOpenAfterMs: 10_000, minCallsForRate: 1000 },
      { now: () => nowMs }
    );

    const router = new ProviderRouter({
      enforceNoScrape: false,
      providers,
      config: makeConfig(providers.map((provider) => provider.name)),
      includeDebug: true,
      allowPartial: true,
      healthMonitor,
      enforceHealth: true,
      cache: { enabled: false }
    });

    await router.search(INPUT, { sessionId: SESSION_ID });
    nowMs += 100;
    await router.search(INPUT, { sessionId: SESSION_ID });
    nowMs += 100;
    await router.search(INPUT, { sessionId: SESSION_ID });
    nowMs += 100;
    const disabledResult = await router.search(INPUT, { sessionId: SESSION_ID });

    expect(disabledResult.plans.length).toBeGreaterThan(0);
    expect(disabledResult.debug?.calls.find((call) => call.provider === "p_flaky")?.error?.code).toBe("HEALTH_DISABLED");
    expect(disabledResult.plans.some((plan) => plan.source === "curated")).toBe(true);
  });
});
