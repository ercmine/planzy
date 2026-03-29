const MIN_RADIUS = 100;
const MAX_RADIUS = 50_000;
function asIso(value) {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
        return value;
    }
    return new Date(ms).toISOString();
}
export function normalizeKeyParts(parts) {
    const categories = parts.categories?.map((category) => category.trim()).filter(Boolean).sort();
    const normalizedOpenNow = parts.openNow === undefined ? undefined : Boolean(parts.openNow);
    const normalizedRadius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(parts.radiusMeters)));
    const startISO = parts.timeWindow?.startISO;
    const endISO = parts.timeWindow?.endISO;
    return {
        provider: parts.provider?.trim() || "router",
        cell: parts.cell,
        radiusMeters: normalizedRadius,
        categories: categories?.length ? categories : undefined,
        priceLevelMax: parts.priceLevelMax,
        openNow: normalizedOpenNow,
        timeWindow: startISO && endISO
            ? {
                startISO: asIso(startISO),
                endISO: asIso(endISO)
            }
            : null,
        locale: parts.locale?.trim() || undefined,
        sessionId: parts.sessionId?.trim() || null,
        version: parts.version?.trim() || "v1"
    };
}
export function buildCacheKey(parts) {
    const normalized = normalizeKeyParts(parts);
    const segments = [
        normalized.version ?? "v1",
        `p:${normalized.provider ?? "router"}`,
        normalized.cell,
        `r:${normalized.radiusMeters}`
    ];
    if (normalized.categories?.length) {
        segments.push(`cat:${normalized.categories.join(",")}`);
    }
    if (normalized.priceLevelMax !== undefined) {
        segments.push(`px:${normalized.priceLevelMax}`);
    }
    if (normalized.openNow !== undefined) {
        segments.push(`on:${normalized.openNow ? 1 : 0}`);
    }
    if (normalized.timeWindow) {
        segments.push(`tw:${normalized.timeWindow.startISO}/${normalized.timeWindow.endISO}`);
    }
    if (normalized.locale) {
        segments.push(`loc:${normalized.locale}`);
    }
    if (normalized.sessionId) {
        segments.push(`sid:${normalized.sessionId}`);
    }
    return segments.join("|");
}
export function parseCacheKey(key) {
    if (!key || typeof key !== "string") {
        return null;
    }
    const segments = key.split("|");
    if (segments.length < 4) {
        return null;
    }
    const parsed = {
        cell: "",
        radiusMeters: MIN_RADIUS,
        version: segments[0]
    };
    for (const segment of segments.slice(1)) {
        if (segment.startsWith("p:")) {
            parsed.provider = segment.slice(2);
            continue;
        }
        if (segment.startsWith("cell:")) {
            parsed.cell = segment;
            continue;
        }
        if (segment.startsWith("r:")) {
            const radius = Number(segment.slice(2));
            if (!Number.isNaN(radius)) {
                parsed.radiusMeters = radius;
            }
            continue;
        }
        if (segment.startsWith("cat:")) {
            parsed.categories = segment
                .slice(4)
                .split(",")
                .map((cat) => cat.trim())
                .filter(Boolean);
            continue;
        }
        if (segment.startsWith("px:")) {
            const price = Number(segment.slice(3));
            if (!Number.isNaN(price)) {
                parsed.priceLevelMax = price;
            }
            continue;
        }
        if (segment.startsWith("on:")) {
            parsed.openNow = segment.slice(3) === "1";
            continue;
        }
        if (segment.startsWith("tw:")) {
            const [startISO, endISO] = segment.slice(3).split("/");
            if (startISO && endISO) {
                parsed.timeWindow = { startISO, endISO };
            }
            continue;
        }
        if (segment.startsWith("loc:")) {
            parsed.locale = segment.slice(4);
            continue;
        }
        if (segment.startsWith("sid:")) {
            parsed.sessionId = segment.slice(4);
        }
    }
    if (!parsed.cell) {
        return null;
    }
    return normalizeKeyParts(parsed);
}
