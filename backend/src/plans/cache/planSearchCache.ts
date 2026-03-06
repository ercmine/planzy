import type { Plan } from "../plan.js";
import type { ProviderContext } from "../provider.js";
import type { Category, SearchPlansInput } from "../types.js";
import { validatePlanArray } from "../planValidation.js";
import { geoCell } from "./geoCell.js";
import { buildCacheKey, normalizeKeyParts, type CacheKeyParts } from "./key.js";
import { MemoryCache } from "./memoryCache.js";
import { makeTags } from "./tags.js";

export interface PlanSearchCacheOptions {
  enabled?: boolean;
  ttlMs?: number;
  precision?: 3 | 4 | 5;
  providerName?: string;
}

const DEFAULT_TTL_MS = 30_000;

export class PlanSearchCache {
  private readonly cache: MemoryCache<Plan[]>;
  private readonly opts: Required<PlanSearchCacheOptions>;

  constructor(cache?: MemoryCache<Plan[]>, opts?: PlanSearchCacheOptions, deps?: { now?: () => number }) {
    this.cache = cache ?? new MemoryCache<Plan[]>(undefined, deps);
    this.opts = {
      enabled: opts?.enabled ?? true,
      ttlMs: opts?.ttlMs ?? DEFAULT_TTL_MS,
      precision: opts?.precision ?? 3,
      providerName: opts?.providerName ?? "router"
    };
  }

  public buildKey(input: SearchPlansInput, ctx?: ProviderContext): string {
    const parts = this.toParts(input, ctx);
    return buildCacheKey(parts);
  }

  public get(input: SearchPlansInput, ctx?: ProviderContext): Plan[] | null {
    if (!this.opts.enabled) {
      return null;
    }

    const key = this.buildKey(input, ctx);
    return this.cache.get(key);
  }

  public set(input: SearchPlansInput, ctx: ProviderContext | undefined, plans: Plan[], ttlMs?: number): void {
    if (!this.opts.enabled || ctx?.signal?.aborted) {
      return;
    }

    const validPlans = validatePlanArray(plans);
    const keyParts = this.toParts(input, ctx);
    const tags = makeTags(keyParts);
    const key = buildCacheKey(keyParts);
    this.cache.set(key, validPlans, ttlMs ?? this.opts.ttlMs, tags);
  }

  public invalidate(params: { provider?: string; cellPrefix?: string; category?: Category; sessionId?: string }): number {
    let removed = 0;

    if (params.provider) {
      removed += this.cache.invalidateByTag(`provider:${params.provider}`);
    }

    if (params.category) {
      removed += this.cache.invalidateByTag(`cat:${params.category}`);
    }

    if (params.sessionId) {
      removed += this.cache.invalidateByTag(`session:${params.sessionId}`);
    }

    if (params.cellPrefix) {
      const cellPrefix = params.cellPrefix.startsWith("cell:") ? params.cellPrefix : `cell:${params.cellPrefix}`;
      removed += this.cache.invalidateByTag(`cell:${cellPrefix}`);
      removed += this.cache.invalidateByTag(`cellp:${cellPrefix}`);
      removed += this.cache.invalidateByPrefix(cellPrefix);
    }

    return removed;
  }

  public stats(): { entries: number; hits: number; misses: number } {
    return this.cache.stats();
  }

  private toParts(input: SearchPlansInput, ctx?: ProviderContext): CacheKeyParts {
    return normalizeKeyParts({
      provider: this.opts.providerName,
      cell: geoCell(input.location.lat, input.location.lng, this.opts.precision),
      radiusMeters: input.radiusMeters,
      categories: input.categories,
      priceLevelMax: input.priceLevelMax,
      openNow: input.openNow,
      timeWindow: input.timeWindow
        ? {
            startISO: input.timeWindow.start,
            endISO: input.timeWindow.end
          }
        : null,
      locale: input.locale,
      sessionId: ctx?.sessionId,
      version: "v2"
    });
  }
}
