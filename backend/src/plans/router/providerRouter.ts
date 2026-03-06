import type { AppConfig, ProviderName } from "../../config/schema.js";
import { ProviderError, TimeoutError } from "../errors.js";
import { isAbortError, type ProviderContext } from "../provider.js";
import { validatePlanArray } from "../planValidation.js";
import type { Category, SearchPlansInput } from "../types.js";
import { validateSearchPlansInput } from "../validation.js";
import { dedupePlans } from "./dedupe.js";
import { rankPlansAdvanced } from "./ranking.js";
import { applyColdStartBooster } from "./coldStartBooster.js";
import type { ProviderCallDebug, ProviderRouterOptions, RouterSearchResult } from "./routerTypes.js";

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

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as { offset?: unknown };
    if (typeof parsed.offset !== "number" || !Number.isInteger(parsed.offset) || parsed.offset < 0) {
      return 0;
    }
    return parsed.offset;
  } catch {
    return 0;
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

export class ProviderRouter {
  private readonly providers;
  private readonly defaultTimeoutMs;
  private readonly perProviderTimeoutMs;
  private readonly maxFanout;
  private readonly allowPartial;
  private readonly includeDebug;
  private readonly config?: AppConfig;
  private readonly semaphores = new Map<ProviderName, ProviderSemaphore>();

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

    for (const provider of this.providers) {
      const maxConcurrent = this.config?.plans.providers[provider.name]?.budget?.maxConcurrent ?? Number.POSITIVE_INFINITY;
      this.semaphores.set(provider.name, new ProviderSemaphore(maxConcurrent));
    }
  }

  public async search(input: SearchPlansInput, ctx?: ProviderContext): Promise<RouterSearchResult> {
    const started = Date.now();
    const normalizedInput = validateSearchPlansInput(input);
    const orderedProviders = this.orderProvidersForInput(normalizedInput);
    const fanoutProviders = this.maxFanout ? orderedProviders.slice(0, this.maxFanout) : orderedProviders;
    const callsDebug: ProviderCallDebug[] = [];

    const tasks = fanoutProviders.map(async (provider) => {
      const timeoutMs = this.perProviderTimeoutMs[provider.name] ?? this.defaultTimeoutMs;
      const callStarted = Date.now();
      const combined = createCombinedController(ctx?.signal, timeoutMs);
      const semaphore = this.semaphores.get(provider.name) ?? new ProviderSemaphore(Number.POSITIVE_INFINITY);
      let release: (() => void) | undefined;

      try {
        release = await semaphore.acquire();
      } catch (error) {
        const budgetError = asProviderError(provider.name, error);
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
    const validatedPlans = validatePlanArray(mergedPlans);
    const dedupedPlans = dedupePlans(validatedPlans);
    const rankedPlans = rankPlansAdvanced(dedupedPlans, { input: normalizedInput, now: new Date(), signals: ctx?.ranking }).plans;
    const boosted = applyColdStartBooster(
      rankedPlans,
      { input: normalizedInput, signals: ctx?.ranking },
      { includeDebug: this.includeDebug }
    );

    const offset = decodeCursor(normalizedInput.cursor);
    const plans = boosted.plans.slice(offset, offset + normalizedInput.limit);
    const nextOffset = offset + plans.length;
    const nextCursor = nextOffset < boosted.plans.length ? encodeCursor(nextOffset) : null;

    const response: RouterSearchResult = {
      plans,
      nextCursor,
      sources: fanoutProviders.map((provider) => provider.name)
      // TODO: wire quotas and costs against provider budgets.
    };

    if (this.includeDebug) {
      response.debug = {
        calls: callsDebug,
        deduped: { before: validatedPlans.length, after: dedupedPlans.length },
        ranked: { count: rankedPlans.length },
        booster: boosted.debug,
        tookMs: Date.now() - started
      };
    }

    return response;
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
