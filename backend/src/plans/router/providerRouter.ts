import type { AppConfig, ProviderName } from "../../config/schema.js";
import { ProviderError, RateLimitError, TimeoutError } from "../errors.js";
import { isAbortError, type ProviderContext } from "../provider.js";
import { validatePlanArray } from "../planValidation.js";
import type { Category, SearchPlansInput } from "../types.js";
import { PlanSearchCache } from "../cache/planSearchCache.js";
import { validateSearchPlansInput } from "../validation.js";
import { applyNeverEmptyFallback } from "./fallback.js";
import { dedupePlans } from "./dedupe.js";
import { rankPlansAdvanced } from "./ranking.js";
import { applyColdStartBooster } from "./coldStartBooster.js";
import type { NeverEmptyOptions } from "./fallbackTypes.js";
import type { ProviderCallDebug, ProviderRouterOptions, RouterSearchResult } from "./routerTypes.js";
import { DeckBatcher } from "./pagination/deckBatcher.js";
import { QuotaManager } from "./quotas/quotaManager.js";

const DEFAULT_TIMEOUT_MS = 2_500;
const MAX_PROVIDER_QUEUE = 100;

class ProviderSemaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  public async acquire(): Promise<() => void> {
    if (!Number.isFinite(this.maxConcurrent) || this.maxConcurrent <= 0) {
      return () => undefined;
    }

    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return () => this.release();
    }

    if (this.queue.length >= MAX_PROVIDER_QUEUE) {
      throw new ProviderError({
        provider: "unknown",
        code: "BUDGET_EXCEEDED",
        message: "Provider request queue limit exceeded",
        retryable: true
      });
    }

    return await new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    next?.();
  }
}

function asProviderError(provider: string, error: unknown): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  if (isAbortError(error)) {
    return new TimeoutError(provider, "Provider request aborted", error);
  }

  return new ProviderError({
    provider,
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Unknown provider error",
    retryable: false,
    cause: error
  });
}

function createCombinedController(signal: AbortSignal | undefined, timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const onAbort = (): void => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(new DOMException("Provider call timed out", "AbortError"));
  }, timeoutMs);

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    },
    didTimeout: () => timeoutTriggered
  };
}

function getPrimaryCategory(input: SearchPlansInput): Category | undefined {
  return input.categories?.[0];
}

function formatRetryAfterMs(retryAfterMs: number | undefined): string {
  if (retryAfterMs === undefined || !Number.isFinite(retryAfterMs)) {
    return "Retry later.";
  }

  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Retry after ${seconds}s.`;
}

export class ProviderRouter {
  private readonly providers;
  private readonly defaultTimeoutMs;
  private readonly perProviderTimeoutMs;
  private readonly maxFanout;
  private readonly allowPartial;
  private readonly includeDebug;
  private readonly config?: AppConfig;
  private readonly semaphores = new Map<ProviderName, ProviderSemaphore>();
  private readonly neverEmpty: NeverEmptyOptions;
  private readonly deckBatcher: DeckBatcher;
  private readonly planSearchCache: PlanSearchCache;
  private readonly optionsCacheTtlMs?: number;
  private readonly quotaManager: QuotaManager;
  private readonly enforceQuotas: boolean;
  private readonly gracefulOnQuota: boolean;

  constructor(opts: ProviderRouterOptions) {
    this.providers = opts.providers;
    this.config = opts.config;
    this.defaultTimeoutMs = this.config?.plans.router.defaultTimeoutMs ?? opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    const timeoutOverrides: Record<string, number> = { ...(opts.perProviderTimeoutMs ?? {}) };
    for (const provider of this.providers) {
      const timeout = this.config?.plans.providers[provider.name]?.budget?.timeoutMs;
      if (timeout !== undefined) {
        timeoutOverrides[provider.name] = timeout;
      }
    }

    this.perProviderTimeoutMs = timeoutOverrides;
    this.maxFanout = opts.maxFanout ?? this.config?.plans.router.maxFanout;
    this.allowPartial = opts.allowPartial ?? this.config?.plans.router.allowPartial ?? true;
    this.includeDebug = opts.includeDebug ?? false;
    this.enforceQuotas = opts.enforceQuotas ?? true;
    this.gracefulOnQuota = opts.gracefulOnQuota ?? true;
    this.quotaManager = opts.quotaManager ?? new QuotaManager();
    this.neverEmpty = opts.neverEmpty ?? {};
    this.deckBatcher = new DeckBatcher();
    this.optionsCacheTtlMs = opts.cache?.ttlMs;
    this.planSearchCache = new PlanSearchCache(undefined, {
      ttlMs: this.optionsCacheTtlMs,
      enabled: opts.cache?.enabled ?? true,
      precision: opts.cache?.precision ?? 3,
      providerName: "router"
    });

    for (const provider of this.providers) {
      const maxConcurrent = this.config?.plans.providers[provider.name]?.budget?.maxConcurrent ?? Number.POSITIVE_INFINITY;
      this.semaphores.set(provider.name, new ProviderSemaphore(maxConcurrent));
    }
  }

  private resolveCacheTtlMs(fallbackHit: boolean): number {
    const ttlMs = this.config?.plans.providers.router?.cache?.ttlMs ?? this.optionsCacheTtlMs ?? 30_000;
    if (fallbackHit) {
      return Math.min(ttlMs, 5_000);
    }
    return ttlMs;
  }

  public async search(input: SearchPlansInput, ctx?: ProviderContext): Promise<RouterSearchResult> {
    const started = Date.now();
    const normalizedInput = validateSearchPlansInput(input);
    const cachedDeck = this.planSearchCache.get(normalizedInput, ctx);
    const cacheHit = cachedDeck !== null;

    if (cacheHit) {
      const batchResult = this.deckBatcher.batch(cachedDeck, {
        cursor: normalizedInput.cursor,
        requestedBatchSize: normalizedInput.limit,
        sessionId: ctx?.sessionId
      });

      const response: RouterSearchResult = {
        plans: batchResult.items,
        nextCursor: batchResult.nextCursor,
        sources: ["cache"]
      };

      if (this.includeDebug) {
        response.debug = {
          cacheHit: true,
          calls: [],
          deduped: { before: cachedDeck.length, after: cachedDeck.length },
          ranked: { count: cachedDeck.length },
          tookMs: Date.now() - started
        };
      }

      return response;
    }

    const orderedProviders = this.orderProvidersForInput(normalizedInput);
    const primaryProviders = this.selectPrimaryProviders(orderedProviders);
    const fanoutProviders = this.maxFanout ? primaryProviders.slice(0, this.maxFanout) : primaryProviders;
    const callsDebug: ProviderCallDebug[] = [];
    const providerErrors: { provider: string; error: unknown }[] = [];

    const tasks = fanoutProviders.map(async (provider) => {
      const providerConfig = (ctx?.config ?? this.config)?.plans.providers[provider.name];
      const quotaConfig = providerConfig?.quota;
      const timeoutMs = this.perProviderTimeoutMs[provider.name] ?? this.defaultTimeoutMs;
      const callStarted = Date.now();

      if (this.enforceQuotas) {
        this.quotaManager.configure(provider.name, {
          requestsPerMinute: quotaConfig?.requestsPerMinute,
          requestsPerDay: quotaConfig?.requestsPerDay,
          burst: quotaConfig?.burst,
          costPerRequest: providerConfig?.budget?.requestCost ?? 1
        });

        const decision = this.quotaManager.decide(provider.name, providerConfig?.budget?.requestCost ?? 1);
        if (!decision.allowed) {
          const reason = decision.reason ?? "rpm";
          const quotaError = new RateLimitError(
            provider.name,
            `Provider quota exceeded (${reason}). ${formatRetryAfterMs(decision.retryAfterMs)}`
          );

          providerErrors.push({ provider: provider.name, error: quotaError });
          callsDebug.push({
            provider: provider.name,
            tookMs: Date.now() - callStarted,
            returned: 0,
            error: {
              code: "QUOTA_DENIED",
              message: quotaError.message,
              retryable: true,
              retryAfterMs: decision.retryAfterMs
            }
          });

          if (!(this.allowPartial && this.gracefulOnQuota)) {
            throw quotaError;
          }

          return null;
        }
      }

      const combined = createCombinedController(ctx?.signal, timeoutMs);
      const semaphore = this.semaphores.get(provider.name) ?? new ProviderSemaphore(Number.POSITIVE_INFINITY);
      let release: (() => void) | undefined;

      try {
        release = await semaphore.acquire();
      } catch (error) {
        const budgetError = asProviderError(provider.name, error);
        providerErrors.push({ provider: provider.name, error: budgetError });
        callsDebug.push({
          provider: provider.name,
          tookMs: Date.now() - callStarted,
          returned: 0,
          error: {
            code: budgetError.code,
            message: budgetError.message,
            retryable: budgetError.retryable
          }
        });
        if (!this.allowPartial) {
          throw budgetError;
        }
        return null;
      }

      try {
        const result = await provider.searchPlans(normalizedInput, {
          ...ctx,
          config: ctx?.config ?? this.config,
          signal: combined.controller.signal,
          timeoutMs
        });

        callsDebug.push({
          provider: provider.name,
          tookMs: Date.now() - callStarted,
          returned: result.plans.length
        });

        return result;
      } catch (error) {
        const wrapped = combined.didTimeout()
          ? new TimeoutError(provider.name, `Provider ${provider.name} timed out after ${timeoutMs}ms`, error)
          : asProviderError(provider.name, error);

        providerErrors.push({ provider: provider.name, error: wrapped });
        callsDebug.push({
          provider: provider.name,
          tookMs: Date.now() - callStarted,
          returned: 0,
          error: {
            code: wrapped.code,
            message: wrapped.message,
            retryable: wrapped.retryable
          }
        });

        if (!this.allowPartial) {
          throw wrapped;
        }

        return null;
      } finally {
        release?.();
        combined.cleanup();
      }
    });

    let results;
    try {
      results = await Promise.all(tasks);
    } catch (error) {
      const providerError = asProviderError("router", error);
      throw new ProviderError({
        provider: "router",
        code: providerError.code,
        retryable: providerError.retryable,
        message: `Provider fanout failed: ${providerError.message}`,
        cause: error
      });
    }

    const mergedPlans = results.flatMap((result) => result?.plans ?? []);
    const fallback = await applyNeverEmptyFallback({
      input: normalizedInput,
      ctx,
      basePlans: mergedPlans,
      providers: orderedProviders,
      providerErrors,
      opts: {
        ...this.neverEmpty,
        includeDebug: this.includeDebug
      }
    });

    const validatedPlans = validatePlanArray(fallback.plans);
    const dedupedPlans = dedupePlans(validatedPlans);
    const rankedPlans = rankPlansAdvanced(dedupedPlans, { input: normalizedInput, now: new Date(), signals: ctx?.ranking }).plans;
    const boosted = applyColdStartBooster(
      rankedPlans,
      { input: normalizedInput, signals: ctx?.ranking },
      { includeDebug: this.includeDebug }
    );

    const cacheTtlMs = this.resolveCacheTtlMs(fallback.debug?.triggered ?? false);
    if (!ctx?.signal?.aborted) {
      this.planSearchCache.set(normalizedInput, ctx, boosted.plans, cacheTtlMs);
    }

    const batchResult = this.deckBatcher.batch(boosted.plans, {
      cursor: normalizedInput.cursor,
      requestedBatchSize: normalizedInput.limit,
      sessionId: ctx?.sessionId
    });

    const response: RouterSearchResult = {
      plans: batchResult.items,
      nextCursor: batchResult.nextCursor,
      sources: fanoutProviders.map((provider) => provider.name)
    };

    if (this.includeDebug) {
      response.debug = {
        cacheHit: false,
        calls: callsDebug,
        deduped: { before: validatedPlans.length, after: dedupedPlans.length },
        ranked: { count: rankedPlans.length },
        booster: boosted.debug,
        fallback: fallback.debug,
        tookMs: Date.now() - started
      };
    }

    return response;
  }

  public invalidateCache(params: { provider?: string; cellPrefix?: string; category?: Category; sessionId?: string }): number {
    return this.planSearchCache.invalidate(params);
  }

  private selectPrimaryProviders(providers: ProviderRouterOptions["providers"]): ProviderRouterOptions["providers"] {
    const fallbackProviderNames = new Set([
      this.neverEmpty.curatedProviderName ?? "curated",
      this.neverEmpty.byoProviderName ?? "byo"
    ]);
    return providers.filter((provider) => !fallbackProviderNames.has(provider.name));
  }

  private orderProvidersForInput(input: SearchPlansInput) {
    let providers = this.providers.filter((provider) => this.config?.plans.providers[provider.name]?.routing?.enabled !== false);
    const primaryCategory = getPrimaryCategory(input);

    if (primaryCategory) {
      const explicitOrder = this.config?.plans.router.perCategoryProviderOrder?.[primaryCategory];
      if (explicitOrder?.length) {
        const scoreByProvider = new Map(explicitOrder.map((name, idx) => [name, explicitOrder.length - idx]));
        providers = [...providers].sort((a, b) => (scoreByProvider.get(b.name) ?? 0) - (scoreByProvider.get(a.name) ?? 0));
      }
    }

    return providers;
  }
}
