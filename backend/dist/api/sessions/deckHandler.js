import { randomUUID } from "node:crypto";
import { defaultLogger } from "../../logging/logger.js";
import { coarseGeo, hashString } from "../../logging/redact.js";
import { ProviderError, ValidationError } from "../../plans/errors.js";
import { PLAN_CATEGORIES } from "../../plans/plan.js";
import { PolicyViolationError } from "../../policy/noScrapePolicy.js";
import { readHeader, sendJson } from "../../venues/claims/http.js";
const VALID_CATEGORIES = new Set(PLAN_CATEGORIES);
function parseNumber(value) {
    if (value === null) {
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }
    return parsed;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function parseDeckQuery(url) {
    const details = [];
    const lat = parseNumber(url.searchParams.get("lat"));
    const lng = parseNumber(url.searchParams.get("lng"));
    if (lat === undefined) {
        details.push("lat is required and must be a finite number");
    }
    if (lng === undefined) {
        details.push("lng is required and must be a finite number");
    }
    if (lat === undefined || lng === undefined) {
        throw new ValidationError(details);
    }
    const limitValue = parseNumber(url.searchParams.get("limit"));
    const radiusValue = parseNumber(url.searchParams.get("radiusMeters"));
    const priceLevelMaxRaw = parseNumber(url.searchParams.get("priceLevelMax"));
    const categoryParam = url.searchParams.get("categories");
    const timeStart = url.searchParams.get("timeStart") ?? undefined;
    const timeEnd = url.searchParams.get("timeEnd") ?? undefined;
    const categories = categoryParam
        ?.split(",")
        .map((category) => category.trim())
        .filter((category) => category.length > 0 && VALID_CATEGORIES.has(category));
    return {
        cursor: url.searchParams.get("cursor"),
        limit: clamp(limitValue ?? 50, 1, 100),
        radiusMeters: clamp(radiusValue ?? 5000, 100, 50_000),
        categories: categories && categories.length > 0 ? categories : undefined,
        openNow: ["true", "1"].includes((url.searchParams.get("openNow") ?? "").toLowerCase()),
        priceLevelMax: priceLevelMaxRaw === undefined ? undefined : clamp(Math.trunc(priceLevelMaxRaw), 0, 4),
        timeStart,
        timeEnd,
        locale: url.searchParams.get("locale") ?? undefined,
        lat,
        lng
    };
}
export function computeMix(plans, providersUsed) {
    const planSourceCounts = {};
    const categoryCounts = {};
    let sponsoredCount = 0;
    for (const plan of plans) {
        planSourceCounts[plan.source] = (planSourceCounts[plan.source] ?? 0) + 1;
        categoryCounts[plan.category] = (categoryCounts[plan.category] ?? 0) + 1;
        const metadata = plan.metadata;
        if (metadata?.sponsored === true || plan.source === "promoted") {
            sponsoredCount += 1;
        }
    }
    return {
        providersUsed,
        planSourceCounts,
        categoryCounts,
        sponsoredCount
    };
}
function toSearchPlansInput(query) {
    return {
        location: { lat: query.lat, lng: query.lng },
        radiusMeters: query.radiusMeters,
        categories: query.categories,
        openNow: query.openNow,
        priceLevelMax: query.priceLevelMax,
        timeWindow: query.timeStart && query.timeEnd ? { start: query.timeStart, end: query.timeEnd } : undefined,
        limit: query.limit,
        cursor: query.cursor,
        locale: query.locale
    };
}
export function createDeckHandler(deps) {
    const logger = deps.logger ?? defaultLogger;
    return async (req, res, params) => {
        const base = `http://${req.headers.host ?? "localhost"}`;
        const url = new URL(req.url ?? "/", base);
        const requestId = readHeader(req, "x-request-id") ?? randomUUID();
        const userId = readHeader(req, "x-user-id");
        try {
            const query = parseDeckQuery(url);
            const searchInput = toSearchPlansInput(query);
            logger.info("api.deck.fetch", {
                module: "api.sessions.deck",
                requestId,
                sessionHash: hashString(params.sessionId),
                userHash: userId ? hashString(userId) : undefined,
                geo: coarseGeo(query.lat, query.lng)
            });
            const result = await deps.router.search(searchInput, {
                sessionId: params.sessionId,
                requestId,
                userId,
                config: deps.config,
                logger
            });
            sendJson(res, 200, {
                sessionId: params.sessionId,
                plans: result.plans,
                nextCursor: result.nextCursor ?? null,
                mix: computeMix(result.plans, result.sources),
                debug: {
                    requestId,
                    cacheHit: result.debug?.cacheHit
                }
            });
        }
        catch (error) {
            if (error instanceof ValidationError) {
                sendJson(res, 400, { error: "validation_error", details: error.details });
                return;
            }
            if (error instanceof PolicyViolationError) {
                sendJson(res, 403, { error: "policy_violation" });
                return;
            }
            if (error instanceof ProviderError) {
                sendJson(res, 502, { error: "provider_error", code: error.code, retryable: error.retryable });
                return;
            }
            logger.error("api.deck.fetch_failed", {
                module: "api.sessions.deck",
                requestId,
                sessionHash: hashString(params.sessionId),
                userHash: userId ? hashString(userId) : undefined,
                error: error instanceof Error ? error.message : "unknown"
            });
            sendJson(res, 500, { error: "internal_error" });
        }
    };
}
