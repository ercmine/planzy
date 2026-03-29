import { searchCanonicalPlacesInBounds } from "../places/mapDiscovery.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import { assertGeoAuth } from "./middleware.js";
class InMemoryGeoRateLimiter {
    options;
    windows = new Map();
    constructor(options) {
        this.options = options;
    }
    allow(key) {
        const now = Date.now();
        const existing = this.windows.get(key);
        if (!existing || now >= existing.resetAtMs) {
            this.windows.set(key, { count: 1, resetAtMs: now + 60_000 });
            return true;
        }
        if (existing.count >= this.options.maxRequestsPerMinute) {
            return false;
        }
        existing.count += 1;
        return true;
    }
}
function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseBounds(body) {
    const north = toNumber(body.north);
    const south = toNumber(body.south);
    const east = toNumber(body.east);
    const west = toNumber(body.west);
    if ([north, south, east, west].some((item) => item === undefined))
        return undefined;
    return { north: north, south: south, east: east, west: west };
}
function normalizePlace(result, index) {
    const shortAddress = [result.city, result.state, result.country].filter(Boolean).join(", ") || undefined;
    const boundingBox = "boundingBox" in result ? result.boundingBox : undefined;
    const bounds = boundingBox
        ? { south: boundingBox[0], north: boundingBox[1], west: boundingBox[2], east: boundingBox[3] }
        : undefined;
    const importance = "importance" in result ? result.importance : undefined;
    const base = "osmType" in result && result.osmType && "osmId" in result && result.osmId !== undefined
        ? `osm-${normalizeToken(result.osmType)}-${result.osmId}`
        : `${(result.displayName ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${result.lat.toFixed(4)}-${result.lng.toFixed(4)}-${index}`;
    return {
        id: `geo:${base}`,
        name: result.displayName.split(",")[0]?.trim() || result.displayName,
        displayName: result.displayName,
        shortAddress,
        lat: result.lat,
        lon: result.lng,
        boundingBox: bounds,
        category: result.class,
        subcategory: result.type,
        city: result.city,
        region: result.state,
        country: result.country,
        postcode: result.postalCode,
        source: "nominatim",
        confidence: result.confidence,
        importance,
        osm: { canonicalKey: base },
        match: {
            knownPlace: false,
            rewardEnabled: false,
            sponsored: false,
            hasReviews: false,
            checkInEligible: false
        }
    };
}
function toBoundsFromRadius(lat, lng, radiusMeters) {
    const latDelta = radiusMeters / 111_000;
    const lngDelta = radiusMeters / (111_000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.15));
    return {
        north: lat + latDelta,
        south: lat - latDelta,
        east: lng + lngDelta,
        west: lng - lngDelta
    };
}
const DEFAULT_CATEGORY_TOKEN_PACKS = {
    cafe: ["cafe", "coffee", "coffee shop", "espresso"],
    restaurant: ["restaurant", "food", "diner", "eatery"],
    bar: ["bar", "pub", "cocktail", "taproom"],
    bakery: ["bakery", "dessert", "ice cream", "pastry"],
    culture: ["museum", "gallery", "attraction", "landmark"],
    park: ["park", "playground", "garden", "trail"],
    shopping: ["shopping", "store", "boutique", "market"],
    hotel: ["hotel", "lodging", "inn", "resort"],
    gym: ["gym", "fitness", "workout", "yoga"],
    nightlife: ["nightlife", "club", "music venue", "late night"]
};
function normalizeToken(value) {
    return value.trim().toLowerCase();
}
function parseNearbyDiscoveryConfig(env = process.env) {
    const readInt = (key, fallback) => {
        const parsed = Number(env[key]);
        return Number.isFinite(parsed) ? parsed : fallback;
    };
    return {
        targetCandidates: Math.max(20, Math.min(250, readInt("GEO_NEARBY_TARGET_CANDIDATES", 140))),
        maxQueryFanout: Math.max(4, Math.min(80, readInt("GEO_NEARBY_MAX_QUERY_FANOUT", 32))),
        cellSubdivisions: Math.max(1, Math.min(7, readInt("GEO_NEARBY_CELL_SUBDIVISIONS", 6))),
        perQueryLimit: Math.max(5, Math.min(40, readInt("GEO_NEARBY_PER_QUERY_LIMIT", 22))),
        queryTimeoutMs: Math.max(200, Math.min(10_000, readInt("GEO_NEARBY_QUERY_TIMEOUT_MS", 2500))),
        queryConcurrency: Math.max(1, Math.min(8, readInt("GEO_NEARBY_QUERY_CONCURRENCY", 3))),
        cacheTtlMs: Math.max(500, Math.min(120_000, readInt("GEO_NEARBY_CACHE_TTL_MS", 15_000))),
        cacheStaleMs: Math.max(2_000, Math.min(300_000, readInt("GEO_NEARBY_CACHE_STALE_MS", 45_000)))
    };
}
function parseCategoryTokenPacks(raw) {
    if (!raw?.trim())
        return DEFAULT_CATEGORY_TOKEN_PACKS;
    const next = {};
    for (const entry of raw.split(";")) {
        const [name, values] = entry.split(":");
        const key = normalizeToken(name ?? "");
        if (!key || !values)
            continue;
        const tokens = values.split("|").map((item) => normalizeToken(item)).filter(Boolean);
        if (tokens.length > 0)
            next[key] = [...new Set(tokens)];
    }
    return Object.keys(next).length > 0 ? next : DEFAULT_CATEGORY_TOKEN_PACKS;
}
function haversineMeters(fromLat, fromLng, toLat, toLng) {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (value) => (value * Math.PI) / 180;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
}
function buildAnchorPoints(lat, lng, radiusMeters) {
    const latDelta = radiusMeters / 111_000;
    const lngDelta = radiusMeters / (111_000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.15));
    const anchors = [
        { lat, lng, label: "center" },
        { lat: lat + latDelta * 0.6, lng, label: "north" },
        { lat: lat - latDelta * 0.6, lng, label: "south" },
        { lat, lng: lng + lngDelta * 0.6, label: "east" },
        { lat, lng: lng - lngDelta * 0.6, label: "west" }
    ];
    if (radiusMeters >= 4000) {
        anchors.push({ lat: lat + latDelta * 0.75, lng: lng + lngDelta * 0.75, label: "north-east" }, { lat: lat + latDelta * 0.75, lng: lng - lngDelta * 0.75, label: "north-west" }, { lat: lat - latDelta * 0.75, lng: lng + lngDelta * 0.75, label: "south-east" }, { lat: lat - latDelta * 0.75, lng: lng - lngDelta * 0.75, label: "south-west" });
    }
    return anchors;
}
function buildCells(bounds, subdivisions) {
    if (subdivisions <= 1)
        return [{ bounds, label: "cell-1-1" }];
    const rows = Math.max(1, Math.round(Math.sqrt(subdivisions)));
    const cols = Math.max(1, Math.ceil(subdivisions / rows));
    const latStep = (bounds.north - bounds.south) / rows;
    const lngStep = (bounds.east - bounds.west) / cols;
    const cells = [];
    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            if (cells.length >= subdivisions)
                break;
            cells.push({
                bounds: {
                    north: bounds.north - r * latStep,
                    south: bounds.north - (r + 1) * latStep,
                    west: bounds.west + c * lngStep,
                    east: bounds.west + (c + 1) * lngStep
                },
                label: `cell-${r + 1}-${c + 1}`
            });
        }
    }
    return cells;
}
function expandCategoryTokens(categories, packs) {
    if (categories.length === 0) {
        return [...new Set(Object.values(packs).flat().map(normalizeToken).filter(Boolean))];
    }
    const tokens = new Set();
    for (const category of categories.map(normalizeToken)) {
        tokens.add(category);
        if (packs[category]) {
            for (const token of packs[category])
                tokens.add(token);
            continue;
        }
        for (const [pack, values] of Object.entries(packs)) {
            if (pack.includes(category) || category.includes(pack) || values.includes(category)) {
                for (const token of values)
                    tokens.add(token);
            }
        }
    }
    return [...tokens].filter(Boolean);
}
function buildAreaLabels(area) {
    const labels = [area.neighborhood, area.city, area.state, area.county, area.displayName]
        .map((item) => item?.trim())
        .filter((item) => Boolean(item));
    const unique = new Set(labels);
    if (area.city && area.state)
        unique.add(`${area.city}, ${area.state}`);
    if (area.neighborhood && area.city)
        unique.add(`${area.neighborhood}, ${area.city}`);
    return [...unique];
}
function buildFallbackQueries(categoryTokens, areaLabels) {
    const queries = new Set();
    const templates = [
        (token, area) => `${token} near ${area}`,
        (token, area) => `${token} ${area}`,
        (token, area) => `${token} in ${area}`
    ];
    for (const area of areaLabels) {
        queries.add(area);
        for (const token of categoryTokens) {
            for (const template of templates)
                queries.add(template(token, area).trim());
        }
    }
    for (const token of categoryTokens)
        queries.add(token);
    return [...queries].filter((item) => item.length >= 2);
}
function isBroadAdministrativeRow(row) {
    const cls = normalizeToken(row.class ?? "");
    const type = normalizeToken(row.type ?? "");
    const broadTypes = new Set(["administrative", "city", "county", "state", "region", "postcode", "political", "municipality"]);
    if (cls === "boundary")
        return true;
    if (cls === "place" && broadTypes.has(type))
        return true;
    return false;
}
function normalizeNameKey(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function buildDedupKey(result) {
    if (result.osmType && result.osmId !== undefined) {
        return `osm:${normalizeToken(result.osmType)}:${result.osmId}`;
    }
    return `fallback:${normalizeNameKey(result.displayName)}:${result.lat.toFixed(4)}:${result.lng.toFixed(4)}`;
}
function normalizeCanonicalPlace(place) {
    return {
        id: place.canonicalPlaceId,
        name: place.name,
        displayName: place.name,
        shortAddress: [place.city, place.region].filter(Boolean).join(", ") || undefined,
        lat: place.latitude,
        lon: place.longitude,
        category: place.category,
        city: place.city,
        region: place.region,
        source: "nominatim",
        importance: place.rating,
        match: {
            knownPlace: true,
            internalPlaceId: place.canonicalPlaceId,
            rewardEnabled: false,
            sponsored: false,
            hasReviews: place.reviewCount > 0,
            checkInEligible: true
        }
    };
}
function geoUnavailablePayload(status) {
    return {
        error: "geo_unavailable",
        message: "Geo service is not configured on this deployment.",
        status
    };
}
export function createGeoHttpHandlers(gateway, options = {}) {
    const limiter = new InMemoryGeoRateLimiter({ maxRequestsPerMinute: Math.max(30, options.rateLimitPerMinute ?? 180) });
    const nearbyConfig = { ...parseNearbyDiscoveryConfig(), ...options.nearbyConfig };
    const categoryTokenPacks = parseCategoryTokenPacks(process.env.GEO_NEARBY_CATEGORY_TOKEN_PACKS);
    const nearbyCache = new Map();
    const requireAuth = (req) => {
        try {
            assertGeoAuth(req, options.authSecret);
            return true;
        }
        catch {
            return false;
        }
    };
    const guardPublicEndpoint = (req, res) => {
        const source = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            ?? req.socket?.remoteAddress
            ?? "unknown";
        if (!limiter.allow(source)) {
            sendJson(res, 429, { error: "geo_rate_limited", message: "Too many geo requests. Please retry shortly." });
            return false;
        }
        return true;
    };
    const status = () => options.getStatus?.() ?? {
        mode: gateway ? "remote" : "disabled",
        routesMounted: true,
        envValidationErrors: gateway ? [] : ["geo gateway unavailable"],
        envValidationWarnings: []
    };
    const getGatewayOrRespond = (res) => {
        if (gateway)
            return gateway;
        sendJson(res, 503, geoUnavailablePayload(status()));
        return null;
    };
    return {
        async geocode(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!requireAuth(req)) {
                sendJson(res, 401, { error: "geo_service_unauthorized" });
                return;
            }
            try {
                const body = req.method === "GET"
                    ? Object.fromEntries(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.entries())
                    : (await parseJsonBody(req));
                const countryCodes = typeof body.countryCodes === "string"
                    ? body.countryCodes.split(",").map((v) => v.trim()).filter(Boolean)
                    : Array.isArray(body.countryCodes) ? body.countryCodes.map((value) => String(value)) : undefined;
                const results = await activeGateway.geocode({
                    query: String(body.q ?? body.query ?? ""),
                    limit: body.limit ? Number(body.limit) : undefined,
                    language: body.language ? String(body.language) : undefined,
                    countryCodes
                });
                sendJson(res, 200, { results });
            }
            catch (error) {
                sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async reverseGeocode(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!requireAuth(req)) {
                sendJson(res, 401, { error: "geo_service_unauthorized" });
                return;
            }
            try {
                const body = req.method === "GET"
                    ? Object.fromEntries(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.entries())
                    : (await parseJsonBody(req));
                const result = await activeGateway.reverseGeocode({
                    lat: Number(body.lat),
                    lng: Number(body.lng),
                    zoom: body.zoom ? Number(body.zoom) : undefined,
                    language: body.language ? String(body.language) : undefined
                });
                sendJson(res, 200, { result });
            }
            catch (error) {
                sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async apiSearch(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!guardPublicEndpoint(req, res))
                return;
            try {
                const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
                const query = String(url.searchParams.get("q") ?? "").trim();
                if (!query || query.length < 2) {
                    sendJson(res, 400, { error: "invalid_query", message: "q must be at least 2 characters" });
                    return;
                }
                const request = {
                    query,
                    limit: toNumber(url.searchParams.get("limit")) ?? 8,
                    language: url.searchParams.get("language") ?? undefined,
                    countryCodes: (url.searchParams.get("countryCodes") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
                    bounds: parseBounds(Object.fromEntries(url.searchParams.entries()))
                };
                const startedAt = Date.now();
                const results = await activeGateway.geocode(request);
                console.info("[geo.api.search]", { query, limit: request.limit, resultCount: results.length, latencyMs: Date.now() - startedAt });
                sendJson(res, 200, { results: results.map(normalizePlace) });
            }
            catch (error) {
                console.warn("[geo.api.search.error]", { error: error instanceof Error ? error.message : String(error) });
                sendJson(res, 502, { error: "geo_search_failed", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async apiReverse(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!guardPublicEndpoint(req, res))
                return;
            try {
                const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
                const lat = toNumber(url.searchParams.get("lat"));
                const lng = toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"));
                if (lat === undefined || lng === undefined) {
                    sendJson(res, 400, { error: "invalid_coordinates", message: "lat and lon are required numbers" });
                    return;
                }
                const startedAt = Date.now();
                const result = await activeGateway.reverseGeocode({ lat, lng, language: url.searchParams.get("language") ?? undefined });
                console.info("[geo.api.reverse]", { lat, lng, hasResult: Boolean(result.displayName), latencyMs: Date.now() - startedAt });
                sendJson(res, 200, { result: normalizePlace(result, 0) });
            }
            catch (error) {
                console.warn("[geo.api.reverse.error]", { error: error instanceof Error ? error.message : String(error) });
                sendJson(res, 502, { error: "geo_reverse_failed", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async apiAutocomplete(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!guardPublicEndpoint(req, res))
                return;
            try {
                const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
                const query = String(url.searchParams.get("q") ?? "").trim();
                if (!query || query.length < 2) {
                    sendJson(res, 400, { error: "invalid_query", message: "q must be at least 2 characters" });
                    return;
                }
                const startedAt = Date.now();
                const suggestions = await activeGateway.autocomplete({
                    query,
                    limit: toNumber(url.searchParams.get("limit")) ?? 8,
                    language: url.searchParams.get("language") ?? undefined,
                    bounds: parseBounds(Object.fromEntries(url.searchParams.entries())),
                    bias: {
                        lat: toNumber(url.searchParams.get("lat")),
                        lng: toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"))
                    }
                });
                console.info("[geo.api.autocomplete]", { query, count: suggestions.length, latencyMs: Date.now() - startedAt });
                sendJson(res, 200, { suggestions });
            }
            catch (error) {
                console.warn("[geo.api.autocomplete.error]", { error: error instanceof Error ? error.message : String(error) });
                sendJson(res, 502, { error: "geo_autocomplete_failed", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async apiNearby(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!guardPublicEndpoint(req, res))
                return;
            try {
                const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
                const lat = toNumber(url.searchParams.get("lat"));
                const lng = toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"));
                if (lat === undefined || lng === undefined) {
                    sendJson(res, 400, { error: "invalid_coordinates", message: "lat and lon are required numbers" });
                    return;
                }
                const radiusMeters = Math.max(200, Math.min(25_000, toNumber(url.searchParams.get("radius")) ?? 3_500));
                const limit = Math.max(1, Math.min(120, toNumber(url.searchParams.get("limit")) ?? 60));
                const categories = (url.searchParams.get("categories") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
                const bounds = toBoundsFromRadius(lat, lng, radiusMeters);
                const language = url.searchParams.get("language") ?? undefined;
                const cacheKey = `nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${Math.round(radiusMeters / 100)}:${limit}:${categories.map(normalizeToken).sort().join("|")}:${language ?? ""}`;
                const now = Date.now();
                const cached = nearbyCache.get(cacheKey);
                if (cached && now <= cached.staleUntilMs) {
                    sendJson(res, 200, cached.payload);
                    return;
                }
                const canonicalPlaces = searchCanonicalPlacesInBounds(options.listCanonicalPlaces?.() ?? [], {
                    bounds,
                    categories,
                    centerLat: lat,
                    centerLng: lng,
                    limit
                });
                const fallbackNeeded = canonicalPlaces.length < Math.min(limit, 24);
                const fallbackRows = [];
                const fallbackMeta = new Map();
                const queryDiagnostics = [];
                if (fallbackNeeded) {
                    const area = await activeGateway.reverseGeocode({ lat, lng, language });
                    const areaLabels = buildAreaLabels(area);
                    const categoryTokens = expandCategoryTokens(categories, categoryTokenPacks);
                    const allQueries = buildFallbackQueries(categoryTokens, areaLabels);
                    const anchors = buildAnchorPoints(lat, lng, radiusMeters);
                    const cells = buildCells(bounds, nearbyConfig.cellSubdivisions);
                    const queryPlans = [];
                    for (const query of allQueries) {
                        const normalizedQuery = normalizeToken(query);
                        for (const anchor of anchors) {
                            for (const cell of cells) {
                                queryPlans.push({
                                    query,
                                    anchor: anchor.label,
                                    cell: cell.label,
                                    bounds: cell.bounds,
                                    categoryToken: categoryTokens.find((token) => normalizedQuery.includes(normalizeToken(token)))
                                });
                                if (queryPlans.length >= nearbyConfig.maxQueryFanout)
                                    break;
                            }
                            if (queryPlans.length >= nearbyConfig.maxQueryFanout)
                                break;
                        }
                        if (queryPlans.length >= nearbyConfig.maxQueryFanout)
                            break;
                    }
                    for (let index = 0; index < queryPlans.length; index += nearbyConfig.queryConcurrency) {
                        if (fallbackRows.length >= nearbyConfig.targetCandidates)
                            break;
                        const chunk = queryPlans.slice(index, index + nearbyConfig.queryConcurrency);
                        const chunkResults = await Promise.all(chunk.map(async (plan) => {
                            try {
                                const results = await Promise.race([
                                    activeGateway.geocode({
                                        query: plan.query,
                                        bounds: plan.bounds,
                                        language,
                                        limit: nearbyConfig.perQueryLimit
                                    }),
                                    new Promise((resolve) => setTimeout(() => resolve([]), nearbyConfig.queryTimeoutMs))
                                ]);
                                queryDiagnostics.push({ query: plan.query, anchor: plan.anchor, cell: plan.cell, resultCount: results.length });
                                return { plan, results };
                            }
                            catch {
                                queryDiagnostics.push({ query: plan.query, anchor: plan.anchor, cell: plan.cell, resultCount: 0 });
                                return { plan, results: [] };
                            }
                        }));
                        for (const result of chunkResults) {
                            for (const row of result.results) {
                                fallbackRows.push(row);
                                const key = buildDedupKey(row);
                                if (!fallbackMeta.has(key)) {
                                    fallbackMeta.set(key, {
                                        source: "geo_fallback",
                                        query: result.plan.query,
                                        anchorLabel: result.plan.anchor,
                                        cellLabel: result.plan.cell,
                                        categoryToken: result.plan.categoryToken
                                    });
                                }
                                if (fallbackRows.length >= nearbyConfig.targetCandidates)
                                    break;
                            }
                            if (fallbackRows.length >= nearbyConfig.targetCandidates)
                                break;
                        }
                    }
                }
                const deduped = new Map();
                let filteredAdminCount = 0;
                for (const place of canonicalPlaces) {
                    const normalized = normalizeCanonicalPlace(place);
                    const distanceMeters = haversineMeters(lat, lng, normalized.lat, normalized.lon);
                    deduped.set(`canonical:${place.canonicalPlaceId}`, {
                        place: normalized,
                        distanceMeters,
                        adminOnly: false,
                        canonicalScore: 1,
                        categoryMatch: categories.length === 0 || categories.map(normalizeToken).includes(normalizeToken(place.category)) ? 1 : 0.6,
                        meta: { source: "canonical" }
                    });
                }
                for (const [index, row] of fallbackRows.entries()) {
                    const key = buildDedupKey(row);
                    if (deduped.has(key))
                        continue;
                    const adminOnly = isBroadAdministrativeRow(row);
                    if (adminOnly)
                        filteredAdminCount += 1;
                    const normalized = normalizePlace(row, index);
                    const categoryMatch = categories.length === 0
                        ? (adminOnly ? 0 : 0.8)
                        : categories.some((category) => normalizeToken(normalized.displayName).includes(normalizeToken(category)) || normalizeToken(normalized.category ?? "").includes(normalizeToken(category))) ? 1 : 0.45;
                    deduped.set(key, {
                        place: normalized,
                        distanceMeters: haversineMeters(lat, lng, row.lat, row.lng),
                        adminOnly,
                        categoryMatch,
                        canonicalScore: 0,
                        meta: fallbackMeta.get(key) ?? { source: "geo_fallback" }
                    });
                }
                const ranked = [...deduped.values()].sort((a, b) => {
                    const scoreA = a.canonicalScore * 4 + a.categoryMatch * 2 + (a.place.importance ?? 0.15) - (a.distanceMeters / Math.max(radiusMeters * 3, 1000)) - (a.adminOnly ? 2 : 0);
                    const scoreB = b.canonicalScore * 4 + b.categoryMatch * 2 + (b.place.importance ?? 0.15) - (b.distanceMeters / Math.max(radiusMeters * 3, 1000)) - (b.adminOnly ? 2 : 0);
                    return scoreB - scoreA;
                });
                const nonAdmin = ranked.filter((entry) => !entry.adminOnly);
                const adminFallback = ranked.filter((entry) => entry.adminOnly);
                const places = [...nonAdmin, ...adminFallback].slice(0, limit).map((entry) => entry.place);
                const payload = {
                    origin: { lat, lng },
                    radiusMeters,
                    places,
                    sourceBreakdown: {
                        canonicalCount: canonicalPlaces.length,
                        geoFallbackCount: fallbackRows.length
                    }
                };
                nearbyCache.set(cacheKey, {
                    payload,
                    freshUntilMs: now + nearbyConfig.cacheTtlMs,
                    staleUntilMs: now + nearbyConfig.cacheStaleMs
                });
                console.info("[geo.api.nearby]", {
                    lat,
                    lng,
                    radiusMeters,
                    categoryCount: categories.length,
                    sourceCounts: { canonical: canonicalPlaces.length, fallback: fallbackRows.length },
                    resultCount: places.length,
                    fallbackQueryCount: queryDiagnostics.length,
                    dedupedCandidateCount: deduped.size,
                    filteredAdminCount,
                    usefulQueries: queryDiagnostics.filter((item) => item.resultCount > 0).slice(0, 8)
                });
                sendJson(res, 200, payload);
            }
            catch (error) {
                console.warn("[geo.api.nearby.error]", { error: error instanceof Error ? error.message : String(error) });
                sendJson(res, 502, { error: "geo_nearby_failed", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async autocomplete(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!requireAuth(req)) {
                sendJson(res, 401, { error: "geo_service_unauthorized" });
                return;
            }
            try {
                const body = (await parseJsonBody(req));
                const suggestions = await activeGateway.autocomplete({
                    query: String(body.q ?? body.query ?? ""),
                    limit: body.limit ? Number(body.limit) : undefined,
                    language: body.language ? String(body.language) : undefined,
                    bias: {
                        lat: body.lat ? Number(body.lat) : undefined,
                        lng: body.lng ? Number(body.lng) : undefined,
                        city: body.city ? String(body.city) : undefined,
                        region: body.region ? String(body.region) : undefined,
                        countryCode: body.countryCode ? String(body.countryCode) : undefined
                    }
                });
                sendJson(res, 200, { suggestions });
            }
            catch (error) {
                sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async placeLookup(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!requireAuth(req)) {
                sendJson(res, 401, { error: "geo_service_unauthorized" });
                return;
            }
            try {
                const body = (await parseJsonBody(req));
                const candidates = await activeGateway.placeLookup({
                    query: String(body.q ?? body.query ?? ""),
                    limit: body.limit ? Number(body.limit) : undefined,
                    language: body.language ? String(body.language) : undefined
                });
                sendJson(res, 200, { candidates });
            }
            catch (error) {
                sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async areaContext(req, res) {
            const activeGateway = getGatewayOrRespond(res);
            if (!activeGateway)
                return;
            if (!requireAuth(req)) {
                sendJson(res, 401, { error: "geo_service_unauthorized" });
                return;
            }
            try {
                const body = (await parseJsonBody(req));
                const context = await activeGateway.areaContext({
                    lat: Number(body.lat),
                    lng: Number(body.lng),
                    language: body.language ? String(body.language) : undefined
                });
                sendJson(res, 200, { context });
            }
            catch (error) {
                sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
            }
        },
        async health(_req, res) {
            if (!gateway) {
                sendJson(res, 503, { ok: false, mode: status().mode, version: "1.0.0", status: status() });
                return;
            }
            try {
                const payload = await gateway.health();
                sendJson(res, payload.ok ? 200 : 503, { ...payload, status: status() });
            }
            catch (error) {
                sendJson(res, 503, {
                    ok: false,
                    mode: status().mode,
                    version: "1.0.0",
                    error: "geo_health_failed",
                    message: error instanceof Error ? error.message : String(error),
                    status: status()
                });
            }
        },
        async debugStatus(_req, res) {
            sendJson(res, gateway ? 200 : 503, {
                ok: Boolean(gateway),
                gatewayAvailable: Boolean(gateway),
                status: status()
            });
        },
        async ready(_req, res) {
            if (!gateway) {
                sendJson(res, 503, { ok: false, ready: false, mode: status().mode, status: status() });
                return;
            }
            const payload = await gateway.health();
            sendJson(res, payload.ok ? 200 : 503, { ok: payload.ok, ready: payload.ok, mode: payload.mode, status: status() });
        },
        async version(_req, res) {
            sendJson(res, 200, { service: "dryad-geo", version: "1.0.0", status: status() });
        },
        async metrics(_req, res) {
            if (!gateway) {
                sendJson(res, 503, { service: "dryad-geo", metrics: null, upstream: null, status: status() });
                return;
            }
            const payload = await gateway.health();
            sendJson(res, 200, { service: "dryad-geo", metrics: payload.metrics ?? null, upstream: payload.upstream ?? null, status: status() });
        }
    };
}
