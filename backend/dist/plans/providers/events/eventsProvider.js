import { ProviderError } from "../../errors.js";
import { mapProviderCategory } from "../../normalization/categoryMap.js";
import { buildMapsLink, normalizeHttpUrl } from "../../normalization/urls.js";
import { validatePlanArray } from "../../planValidation.js";
import { validateSearchPlansInput } from "../../validation.js";
import { buildEventsCacheKey, SimpleCache } from "./cache.js";
import { TicketmasterClient } from "./ticketmasterClient.js";
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_MAX_RESULTS = 50;
function decodeCursor(cursor) {
    if (!cursor) {
        return 0;
    }
    try {
        const decoded = Buffer.from(cursor, "base64").toString("utf8");
        const offset = Number.parseInt(decoded, 10);
        if (Number.isInteger(offset) && offset >= 0) {
            return offset;
        }
    }
    catch {
        return 0;
    }
    return 0;
}
function encodeCursor(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64");
}
function normalizeIso(value) {
    if (!value) {
        return undefined;
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        return undefined;
    }
    return new Date(parsed).toISOString();
}
function categoryToClassification(categories) {
    if (!categories?.length) {
        return undefined;
    }
    if (categories.includes("music")) {
        return "Music";
    }
    if (categories.includes("sports")) {
        return "Sports";
    }
    if (categories.includes("movies")) {
        return "Arts & Theatre";
    }
    return undefined;
}
function categoryToKeyword(categories) {
    if (!categories?.length) {
        return undefined;
    }
    if (categories.includes("food")) {
        return "food festival";
    }
    if (categories.includes("drinks")) {
        return "tasting";
    }
    if (categories.includes("coffee")) {
        return "coffee festival";
    }
    return undefined;
}
function expandCategoryTerms(terms) {
    const lowered = terms.map((term) => term.toLowerCase());
    const expanded = [...terms];
    if (lowered.some((term) => term.includes("music"))) {
        expanded.push("concert", "live music");
    }
    if (lowered.some((term) => term.includes("sports"))) {
        expanded.push("stadium", "arena");
    }
    if (lowered.some((term) => term.includes("arts") || term.includes("theatre") || term.includes("theater"))) {
        expanded.push("theater", "movie");
    }
    return expanded;
}
function parseCoord(value) {
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function inferPriceLevel(event) {
    const min = event.priceRanges?.find((entry) => typeof entry.min === "number")?.min;
    if (typeof min !== "number") {
        return undefined;
    }
    if (min <= 20) {
        return 1;
    }
    if (min <= 60) {
        return 2;
    }
    if (min <= 150) {
        return 3;
    }
    return 4;
}
function pickPhotos(event) {
    const images = event.images?.filter((img) => typeof img.url === "string") ?? [];
    if (images.length === 0) {
        return undefined;
    }
    const sorted = [...images].sort((a, b) => {
        const aIsPreferred = a.ratio === "16_9" && (a.width ?? 0) >= 640;
        const bIsPreferred = b.ratio === "16_9" && (b.width ?? 0) >= 640;
        if (aIsPreferred !== bIsPreferred) {
            return aIsPreferred ? -1 : 1;
        }
        return (b.width ?? 0) - (a.width ?? 0);
    });
    return sorted.slice(0, 3).map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height
    }));
}
function eventToPlan(event) {
    const title = event.name?.trim();
    if (!title) {
        return null;
    }
    const venue = event._embedded?.venues?.[0];
    const lat = parseCoord(venue?.location?.latitude) ?? 0;
    const lng = parseCoord(venue?.location?.longitude) ?? 0;
    const addressParts = [venue?.address?.line1, venue?.city?.name, venue?.state?.stateCode, venue?.postalCode].filter((part) => typeof part === "string" && part.trim().length > 0);
    const categoryTerms = expandCategoryTerms([
        ...(event.classifications ?? []).flatMap((classification) => [
            classification.segment?.name,
            classification.genre?.name,
            classification.subGenre?.name,
            classification.type?.name,
            classification.subType?.name
        ]),
        title
    ].filter((value) => typeof value === "string" && value.trim().length > 0));
    const eventUrl = normalizeHttpUrl(event.url);
    return {
        id: `ticketmaster:${event.id}`,
        source: "ticketmaster",
        sourceId: event.id,
        title,
        category: mapProviderCategory("ticketmaster", {
            categories: categoryTerms,
            primary: categoryTerms[0] ?? null
        }),
        location: {
            lat,
            lng,
            address: addressParts.length > 0 ? addressParts.join(", ") : undefined
        },
        photos: pickPhotos(event),
        deepLinks: {
            ticketLink: eventUrl,
            websiteLink: eventUrl,
            mapsLink: Number.isFinite(lat) && Number.isFinite(lng) ? buildMapsLink(lat, lng, title) : undefined
        },
        priceLevel: inferPriceLevel(event),
        metadata: {
            kind: "event",
            startTimeISO: event.dates?.start?.dateTime,
            venueName: venue?.name,
            ticketmaster: {
                id: event.id,
                url: eventUrl
            }
        }
    };
}
export class EventsProvider {
    name = "events";
    opts;
    fetchFn;
    now;
    cache;
    constructor(opts, extra) {
        this.opts = opts ?? {};
        this.fetchFn = extra?.fetchFn ?? fetch;
        this.now = extra?.now ?? (() => Date.now());
        this.cache = new SimpleCache();
    }
    async searchPlans(input, ctx) {
        if (ctx?.signal?.aborted) {
            throw new ProviderError({ provider: "events", code: "ABORTED", message: "Events request aborted", retryable: true });
        }
        const startedAt = this.now();
        const normalizedInput = validateSearchPlansInput(input);
        const apiKey = this.opts.ticketmasterApiKey ??
            ctx?.config?.plans.providers.ticketmaster?.secrets?.apiKey ??
            ctx?.config?.plans.providers.events?.secrets?.apiKey;
        if (!apiKey) {
            throw new ProviderError({ provider: "events", code: "MISSING_API_KEY", message: "Missing Ticketmaster API key", retryable: false });
        }
        const providerCacheTtl = ctx?.config?.plans.providers.events?.cache?.ttlMs;
        const cacheTtlMs = this.opts.cacheTtlMs ?? providerCacheTtl ?? DEFAULT_CACHE_TTL_MS;
        const enableCache = this.opts.enableCache ?? true;
        const cacheKey = buildEventsCacheKey(normalizedInput);
        const nowMs = this.now();
        const cached = enableCache ? this.cache.get(cacheKey, nowMs) : undefined;
        let rankedPlans = cached;
        if (!rankedPlans) {
            const timeoutMs = Math.max(1, Math.min(this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, ctx?.timeoutMs ?? Number.POSITIVE_INFINITY));
            const maxResults = Math.max(1, Math.min(50, this.opts.maxResults ?? DEFAULT_MAX_RESULTS));
            const radiusMiles = Math.max(1, Math.min(100, normalizedInput.radiusMeters / 1609.344));
            const clientConfig = {
                apiKey,
                timeoutMs,
                size: maxResults
            };
            const client = new TicketmasterClient(clientConfig, { fetchFn: this.fetchFn });
            const rawEvents = await client.search({
                lat: normalizedInput.location.lat,
                lng: normalizedInput.location.lng,
                radiusMiles,
                startDateTimeISO: normalizeIso(normalizedInput.timeWindow?.start),
                endDateTimeISO: normalizeIso(normalizedInput.timeWindow?.end),
                classificationName: categoryToClassification(normalizedInput.categories),
                keyword: categoryToKeyword(normalizedInput.categories),
                page: 0,
                size: Math.min(maxResults, 50)
            }, { signal: ctx?.signal });
            const normalizedPlans = rawEvents.map((event) => eventToPlan(event)).filter((plan) => plan !== null);
            const validated = validatePlanArray(normalizedPlans);
            rankedPlans = [...validated].sort((a, b) => {
                const aStart = typeof a.metadata?.startTimeISO === "string" ? Date.parse(a.metadata.startTimeISO) : Number.POSITIVE_INFINITY;
                const bStart = typeof b.metadata?.startTimeISO === "string" ? Date.parse(b.metadata.startTimeISO) : Number.POSITIVE_INFINITY;
                if (aStart !== bStart) {
                    return aStart - bStart;
                }
                return a.title.localeCompare(b.title);
            });
            if (enableCache) {
                this.cache.set(cacheKey, rankedPlans, nowMs, cacheTtlMs);
            }
        }
        const offset = decodeCursor(normalizedInput.cursor);
        const limited = rankedPlans.slice(offset, offset + normalizedInput.limit);
        const nextOffset = offset + limited.length;
        return {
            plans: limited,
            nextCursor: nextOffset < rankedPlans.length ? encodeCursor(nextOffset) : null,
            source: "events",
            debug: {
                tookMs: this.now() - startedAt,
                returned: limited.length
            }
        };
    }
}
