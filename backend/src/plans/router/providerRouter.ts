import { ProviderError, TimeoutError } from "../errors.js";
import { isAbortError, type ProviderContext } from "../provider.js";
import { validatePlanArray } from "../planValidation.js";
import type { SearchPlansInput } from "../types.js";
import { validateSearchPlansInput } from "../validation.js";
import { dedupePlans } from "./dedupe.js";
import { rankPlans } from "./ranking.js";
import type { ProviderCallDebug, ProviderRouterOptions, RouterSearchResult } from "./routerTypes.js";

const DEFAULT_TIMEOUT_MS = 2_500;

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

export class ProviderRouter {
  private readonly providers;
  private readonly defaultTimeoutMs;
  private readonly perProviderTimeoutMs;
  private readonly maxFanout;
  private readonly allowPartial;
  private readonly includeDebug;

  constructor(opts: ProviderRouterOptions) {
    this.providers = opts.providers;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.perProviderTimeoutMs = opts.perProviderTimeoutMs ?? {};
    this.maxFanout = opts.maxFanout;
    this.allowPartial = opts.allowPartial ?? true;
    this.includeDebug = opts.includeDebug ?? false;
  }

  public async search(input: SearchPlansInput, ctx?: ProviderContext): Promise<RouterSearchResult> {
    const started = Date.now();
    const normalizedInput = validateSearchPlansInput(input);
    const providers = this.maxFanout ? this.providers.slice(0, this.maxFanout) : this.providers;
    const callsDebug: ProviderCallDebug[] = [];

    const tasks = providers.map(async (provider) => {
      const timeoutMs = this.perProviderTimeoutMs[provider.name] ?? this.defaultTimeoutMs;
      const callStarted = Date.now();
      const combined = createCombinedController(ctx?.signal, timeoutMs);

      try {
        const result = await provider.searchPlans(normalizedInput, {
          ...ctx,
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
    const rankedPlans = rankPlans(dedupedPlans, { input: normalizedInput, now: new Date() });

    const offset = decodeCursor(normalizedInput.cursor);
    const plans = rankedPlans.slice(offset, offset + normalizedInput.limit);
    const nextOffset = offset + plans.length;
    const nextCursor = nextOffset < rankedPlans.length ? encodeCursor(nextOffset) : null;

    const response: RouterSearchResult = {
      plans,
      nextCursor,
      sources: providers.map((provider) => provider.name)
      // Future enhancement: merge and persist provider-level cursors.
    };

    if (this.includeDebug) {
      response.debug = {
        calls: callsDebug,
        deduped: { before: validatedPlans.length, after: dedupedPlans.length },
        ranked: { count: rankedPlans.length },
        tookMs: Date.now() - started
      };
    }

    return response;
  }
}
