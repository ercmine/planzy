function parseBool(value, fallback) {
    if (value == null)
        return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return fallback;
    if (["1", "true", "yes", "on"].includes(normalized))
        return true;
    if (["0", "false", "no", "off"].includes(normalized))
        return false;
    return fallback;
}
function parseNum(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function isProdEnv(env) {
    const appEnv = String(env.APP_ENV ?? "").toLowerCase();
    const nodeEnv = String(env.NODE_ENV ?? "").toLowerCase();
    return appEnv === "prod" || nodeEnv === "production";
}
export function readGeoRuntimeConfig(env) {
    return {
        client: {
            enabled: parseBool(env.GEO_SERVICE_ENABLED, false),
            baseUrl: env.GEO_SERVICE_BASE_URL ?? "https://geo.perbug.com",
            timeoutMs: parseNum(env.GEO_SERVICE_TIMEOUT_MS, 2000),
            retries: parseNum(env.GEO_SERVICE_RETRIES, 1),
            authSecret: env.GEO_SERVICE_AUTH_SECRET,
            failOpen: parseBool(env.GEO_SERVICE_FAIL_OPEN, true)
        },
        local: {
            nominatimBaseUrl: env.NOMINATIM_BASE_URL,
            timeoutMs: parseNum(env.NOMINATIM_TIMEOUT_MS, 2000),
            geocodeCacheTtlMs: parseNum(env.NOMINATIM_GEOCODE_CACHE_TTL_MS, 3_600_000),
            reverseCacheTtlMs: parseNum(env.NOMINATIM_REVERSE_CACHE_TTL_MS, 86_400_000),
            defaultLimit: parseNum(env.NOMINATIM_DEFAULT_LIMIT, 5),
            userAgent: env.NOMINATIM_USER_AGENT ?? "dryad-geocoder/1.0"
        }
    };
}
export function validateGeoRuntimeConfig(config, env) {
    const errors = [];
    const warnings = [];
    const isProd = isProdEnv(env);
    const explicitGeoMode = String(env.GEO_MODE ?? "").trim().toLowerCase();
    const geoMode = explicitGeoMode === "custom" || explicitGeoMode === "nominatim" || explicitGeoMode === "disabled"
        ? explicitGeoMode
        : undefined;
    if (explicitGeoMode && !geoMode) {
        warnings.push(`Unknown GEO_MODE="${env.GEO_MODE}". Falling back to legacy GEO_SERVICE_ENABLED/NOMINATIM_BASE_URL detection.`);
    }
    const customRequested = geoMode
        ? geoMode === "custom"
        : config.client.enabled;
    if (customRequested) {
        const parsed = URL.canParse(config.client.baseUrl) ? new URL(config.client.baseUrl) : null;
        if (!parsed) {
            errors.push("GEO_SERVICE_BASE_URL is invalid.");
        }
        else if (isProd && parsed.protocol !== "https:") {
            errors.push("GEO_SERVICE_BASE_URL must use https in production.");
        }
        if (config.client.enabled && !config.client.authSecret) {
            warnings.push("GEO_SERVICE_ENABLED=true but GEO_SERVICE_AUTH_SECRET is not set.");
        }
        return {
            mode: "custom",
            shouldFailFast: isProd && (errors.length > 0 || parseBool(env.GEO_REQUIRED, true)),
            errors,
            warnings
        };
    }
    const nominatimRequested = geoMode
        ? geoMode === "nominatim"
        : Boolean(config.local.nominatimBaseUrl);
    if (nominatimRequested) {
        if (!config.local.nominatimBaseUrl) {
            errors.push("NOMINATIM_BASE_URL is required when GEO_MODE=nominatim.");
        }
        const parsed = config.local.nominatimBaseUrl && URL.canParse(config.local.nominatimBaseUrl)
            ? new URL(config.local.nominatimBaseUrl)
            : null;
        if (config.local.nominatimBaseUrl && !parsed) {
            errors.push("NOMINATIM_BASE_URL is invalid.");
        }
        return {
            mode: "nominatim",
            shouldFailFast: isProd && errors.length > 0,
            errors,
            warnings
        };
    }
    errors.push("Geo is disabled because neither GEO_MODE, GEO_SERVICE_ENABLED=true, nor NOMINATIM_BASE_URL is configured.");
    return {
        mode: "disabled",
        shouldFailFast: isProd && parseBool(env.GEO_REQUIRED, true),
        errors,
        warnings
    };
}
