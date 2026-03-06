import { ProviderError } from "../../errors.js";
import { validatePlanArray } from "../../planValidation.js";
import type { Plan } from "../../plan.js";
import type { PlanProvider, ProviderContext } from "../../provider.js";
import { mapProviderCategory } from "../../normalization/categoryMap.js";
import { normalizePriceLevel } from "../../normalization/price.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "../../normalization/urls.js";
import { dedupePlans } from "../../router/dedupe.js";
import { rankPlans } from "../../router/ranking.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { validateSearchPlansInput } from "../../validation.js";
import { SimpleCache } from "./cache.js";
import { GooglePlacesClient, type GoogleNearbySearchParams, type GooglePlaceLite, type GooglePlacesConfig } from "./googlePlacesClient.js";
import { YelpClient, type YelpBusinessLite, type YelpConfig, type YelpSearchParams } from "./yelpClient.js";

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_COMBINED = 60;

const GOOGLE_CATEGORY_MAP: Record<string, string[]> = {
  food: ["restaurant"],
  drinks: ["bar"],
  coffee: ["cafe"],
  outdoors: ["park"],
  movies: ["movie_theater"],
  music: ["night_club"],
  shopping: ["shopping_mall"],
  wellness: ["gym"],
  sports: ["stadium", "bowling_alley"],
  other: []
};

const YELP_CATEGORY_MAP: Record<string, string[]> = {
  food: ["restaurants"],
  drinks: ["bars"],
  coffee: ["coffee", "cafes"],
  outdoors: ["parks"],
  movies: ["movietheaters"],
  music: ["musicvenues"],
  shopping: ["shopping"],
  wellness: ["gyms", "yoga", "spas"],
  sports: ["bowling", "recreation"],
  other: []
};

export interface PlacesProviderOptions {
  google?: Partial<GooglePlacesConfig>;
  yelp?: Partial<YelpConfig>;
  enableGoogle?: boolean;
  enableYelp?: boolean;
  cache?: SimpleCache;
  cacheTtlMs?: number;
  maxCombined?: number;
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
    if (typeof parsed.offset === "number" && Number.isInteger(parsed.offset) && parsed.offset >= 0) {
      return parsed.offset;
    }
  } catch {
    return 0;
  }

  return 0;
}

function createCombinedController(signal: AbortSignal | undefined, timeoutMs: number): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Places provider timed out", "AbortError"));
  }, timeoutMs);

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function buildCacheKey(source: "google" | "yelp", input: SearchPlansInput): string {
  return [
    source,
    roundCoord(input.location.lat),
    roundCoord(input.location.lng),
    input.radiusMeters,
    (input.categories ?? []).join(","),
    input.openNow ?? "",
    input.priceLevelMax ?? "",
    input.locale ?? ""
  ].join("|");
}

function resolveRoutingOrder(input: SearchPlansInput, ctx: ProviderContext | undefined): Array<"google" | "yelp"> {
  const primary = input.categories?.[0];
  const order = primary ? ctx?.config?.plans.router.perCategoryProviderOrder?.[primary] : undefined;
  const normalized: Array<"google" | "yelp"> = (order ?? []).flatMap((name) => {
    if (name === "google" || name === "yelp") {
      return [name];
    }
    if (name === "places") {
      return ["google", "yelp"];
    }
    return [];
  });
  return normalized.length > 0 ? normalized : ["google", "yelp"];
}

export class PlacesProvider implements PlanProvider {
  public readonly name = "places";
  private readonly opts: PlacesProviderOptions & { googleApiKey?: string; yelpApiKey?: string };
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly cache: SimpleCache;

  constructor(opts: PlacesProviderOptions & { googleApiKey?: string; yelpApiKey?: string }, extra?: { fetchFn?: typeof fetch; now?: () => number }) {
    this.opts = opts;
    this.fetchFn = extra?.fetchFn ?? fetch;
    this.now = extra?.now ?? (() => Date.now());
    this.cache = opts.cache ?? new SimpleCache();
  }

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    const normalizedInput = validateSearchPlansInput(input);
    const overallTimeout = Math.max(1, ctx?.timeoutMs ?? 2_500);
    const combined = createCombinedController(ctx?.signal, overallTimeout);

    try {
      const routing = resolveRoutingOrder(normalizedInput, ctx);
      const enabledGoogle = this.opts.enableGoogle ?? true;
      const enabledYelp = this.opts.enableYelp ?? true;
      const debugErrors: Array<{ provider: string; code: string; message: string; retryable: boolean }> = [];

      const tasks: Array<Promise<Plan[]>> = [];
      for (const source of routing) {
        if (source === "google" && enabledGoogle) {
          tasks.push(this.fetchGoogle(normalizedInput, { ...ctx, signal: combined.controller.signal }, debugErrors));
        }
        if (source === "yelp" && enabledYelp) {
          tasks.push(this.fetchYelp(normalizedInput, { ...ctx, signal: combined.controller.signal }, debugErrors));
        }
      }

      const settled = await Promise.allSettled(tasks);
      const plans = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
      const sourceFailures = settled
        .filter((item): item is PromiseRejectedResult => item.status === "rejected")
        .map((item) => item.reason)
        .filter((err): err is ProviderError => err instanceof ProviderError);

      if (plans.length === 0 && sourceFailures.length > 0) {
        throw new ProviderError({
          provider: "places",
          code: "ALL_SOURCES_FAILED",
          message: "All places sources failed",
          retryable: sourceFailures.some((failure) => failure.retryable),
          cause: sourceFailures[0]
        });
      }

      const validated = validatePlanArray(plans);
      const deduped = dedupePlans(validated);
      const ranked = rankPlans(deduped, { input: normalizedInput, now: new Date() }).slice(0, this.opts.maxCombined ?? DEFAULT_MAX_COMBINED);

      const offset = decodeCursor(normalizedInput.cursor);
      const page = ranked.slice(offset, offset + normalizedInput.limit);
      const nextOffset = offset + page.length;

      return {
        plans: page,
        nextCursor: nextOffset < ranked.length ? encodeCursor(nextOffset) : null,
        source: "places",
        debug: {
          tookMs: this.now(),
          returned: page.length,
          errors: debugErrors
        } as SearchPlansResult["debug"] & { errors?: unknown }
      };
    } finally {
      combined.cleanup();
    }
  }

  private async fetchGoogle(input: SearchPlansInput, ctx: ProviderContext | undefined, errors: Array<{ provider: string; code: string; message: string; retryable: boolean }>): Promise<Plan[]> {
    const providerConfig = ctx?.config?.plans.providers.google;
    const placesConfig = ctx?.config?.plans.providers.places;
    const apiKey = this.opts.googleApiKey ?? providerConfig?.secrets?.apiKey ?? placesConfig?.secrets?.apiKey;

    if (!apiKey) {
      const error = new ProviderError({ provider: "google", code: "MISSING_API_KEY", message: "Missing Google Places API key", retryable: false });
      errors.push({ provider: "google", code: error.code, message: error.message, retryable: error.retryable });
      throw error;
    }

    const timeoutMs = Math.min(this.opts.google?.timeoutMs ?? 1_500, ctx?.timeoutMs ?? Number.POSITIVE_INFINITY);
    const client = new GooglePlacesClient(
      {
        apiKey,
        timeoutMs,
        maxResults: Math.min(20, this.opts.google?.maxResults ?? 20),
        languageCode: input.locale ?? this.opts.google?.languageCode
      },
      { fetchFn: this.fetchFn }
    );

    const primary = input.categories?.[0] ?? "other";
    const includedTypes = input.categories?.length === 1 ? GOOGLE_CATEGORY_MAP[primary] : [];
    const keyword = input.categories && input.categories.length > 1 ? input.categories.join(" ") : undefined;

    const cacheKey = buildCacheKey("google", input);
    const nowMs = this.now();
    const cached = this.cache.get<Plan[]>(cacheKey, nowMs);
    if (cached) {
      return cached;
    }

    try {
      const raw = await client.searchNearby(
        {
          lat: input.location.lat,
          lng: input.location.lng,
          radiusMeters: input.radiusMeters,
          includedTypes,
          keyword,
          openNow: input.openNow,
          maxResultCount: Math.min(input.limit ?? 20, 20)
        } satisfies GoogleNearbySearchParams,
        { signal: ctx?.signal }
      );

      const mapped = raw.map((item) => this.googleToPlan(item)).filter((plan): plan is Plan => plan !== null);
      this.cache.set(cacheKey, mapped, nowMs, this.opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
      return mapped;
    } catch (error) {
      if (error instanceof ProviderError) {
        errors.push({ provider: "google", code: error.code, message: error.message, retryable: error.retryable });
      }
      throw error;
    }
  }

  private async fetchYelp(input: SearchPlansInput, ctx: ProviderContext | undefined, errors: Array<{ provider: string; code: string; message: string; retryable: boolean }>): Promise<Plan[]> {
    const providerConfig = ctx?.config?.plans.providers.yelp;
    const placesConfig = ctx?.config?.plans.providers.places;
    const apiKey = this.opts.yelpApiKey ?? providerConfig?.secrets?.apiKey ?? placesConfig?.secrets?.apiKey;

    if (!apiKey) {
      const error = new ProviderError({ provider: "yelp", code: "MISSING_API_KEY", message: "Missing Yelp API key", retryable: false });
      errors.push({ provider: "yelp", code: error.code, message: error.message, retryable: error.retryable });
      throw error;
    }

    const timeoutMs = Math.min(this.opts.yelp?.timeoutMs ?? 1_500, ctx?.timeoutMs ?? Number.POSITIVE_INFINITY);
    const client = new YelpClient(
      {
        apiKey,
        timeoutMs,
        limit: Math.min(30, this.opts.yelp?.limit ?? 30),
        locale: input.locale ?? this.opts.yelp?.locale
      },
      { fetchFn: this.fetchFn }
    );

    const primary = input.categories?.[0] ?? "other";
    const categories = input.categories?.length === 1 ? YELP_CATEGORY_MAP[primary] : [];
    const term = input.categories && input.categories.length > 1 ? input.categories.join(" ") : undefined;
    const yelpPrice = input.priceLevelMax ? (Math.max(1, Math.min(4, input.priceLevelMax)) as 1 | 2 | 3 | 4) : undefined;

    const cacheKey = buildCacheKey("yelp", input);
    const nowMs = this.now();
    const cached = this.cache.get<Plan[]>(cacheKey, nowMs);
    if (cached) {
      return cached;
    }

    try {
      const raw = await client.search(
        {
          lat: input.location.lat,
          lng: input.location.lng,
          radiusMeters: input.radiusMeters,
          categories,
          term,
          openNow: input.openNow,
          priceLevelMax: yelpPrice,
          limit: Math.min(input.limit ?? 30, 30),
          offset: 0
        } satisfies YelpSearchParams,
        { signal: ctx?.signal }
      );

      const mapped = raw.businesses.map((item) => this.yelpToPlan(item, input.openNow)).filter((plan): plan is Plan => plan !== null);
      this.cache.set(cacheKey, mapped, nowMs, this.opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
      return mapped;
    } catch (error) {
      if (error instanceof ProviderError) {
        errors.push({ provider: "yelp", code: error.code, message: error.message, retryable: error.retryable });
      }
      throw error;
    }
  }

  private googleToPlan(place: GooglePlaceLite): Plan | null {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    const title = place.displayName?.trim();
    if (!title) {
      return null;
    }

    return {
      id: `google:${place.id}`,
      source: "google",
      sourceId: place.id,
      title,
      category: mapProviderCategory("google", { categories: place.types, primary: place.types?.[0] ?? null }),
      location: {
        lat,
        lng,
        address: place.formattedAddress
      },
      rating: place.rating,
      reviewCount: place.userRatingCount,
      priceLevel: normalizePriceLevel(place.priceLevel),
      hours: {
        openNow: place.regularOpeningHours?.openNow,
        weekdayText: place.regularOpeningHours?.weekdayDescriptions
      },
      photos: undefined,
      deepLinks: {
        websiteLink: normalizeHttpUrl(place.websiteUri),
        mapsLink: normalizeHttpUrl(place.googleMapsUri) ?? buildMapsLink(lat, lng, title),
        callLink: normalizeTelUrl(place.internationalPhoneNumber)
      },
      metadata: {
        googlePhotoRefs: place.photos?.map((photo) => ({ name: photo.name, widthPx: photo.widthPx, heightPx: photo.heightPx }))
      }
    };
  }

  private yelpToPlan(business: YelpBusinessLite, openNowRequested: boolean | undefined): Plan | null {
    const lat = business.coordinates?.latitude;
    const lng = business.coordinates?.longitude;
    const title = business.name?.trim();
    if (typeof lat !== "number" || typeof lng !== "number" || !title) {
      return null;
    }

    const categories = business.categories?.map((cat) => cat.alias).filter((value): value is string => typeof value === "string") ?? [];

    return {
      id: `yelp:${business.id}`,
      source: "yelp",
      sourceId: business.id,
      title,
      category: mapProviderCategory("yelp", { categories, primary: categories[0] ?? null }),
      location: {
        lat,
        lng,
        address: business.location?.display_address?.join(", ")
      },
      distanceMeters: business.distance,
      rating: business.rating,
      reviewCount: business.review_count,
      priceLevel: normalizePriceLevel(business.price),
      photos: normalizeHttpUrl(business.image_url) ? [{ url: normalizeHttpUrl(business.image_url) as string }] : undefined,
      hours: openNowRequested ? { openNow: true } : undefined,
      deepLinks: {
        websiteLink: normalizeHttpUrl(business.url),
        mapsLink: buildMapsLink(lat, lng, title),
        callLink: normalizeTelUrl(business.display_phone ?? business.phone)
      }
    };
  }
}
