const DEFAULT_ALLOWED_ORIGINS = [
    "https://app.perbug.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080"
];
const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const DEFAULT_ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "x-user-id",
    "x-request-id",
    "x-acting-profile-type",
    "x-acting-profile-id",
    "x-admin-key",
    "x-market",
    "x-region",
    "x-cohorts",
    "x-account-type",
    "x-admin-id"
];
let cachedKey = "";
let cachedPolicy = null;
function splitCsv(input, fallback) {
    if (!input)
        return [...fallback];
    const values = input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    return values.length > 0 ? values : [...fallback];
}
function toLookup(values) {
    return new Set(values.map((value) => value.toLowerCase()));
}
function loadPolicy() {
    const cacheKey = [
        process.env.CORS_ALLOWED_ORIGINS,
        process.env.CORS_ALLOWED_METHODS,
        process.env.CORS_ALLOWED_HEADERS,
        process.env.CORS_EXPOSE_HEADERS,
        process.env.CORS_ALLOW_CREDENTIALS,
        process.env.CORS_MAX_AGE_SECONDS
    ].join("|");
    if (cachedPolicy && cacheKey === cachedKey) {
        return cachedPolicy;
    }
    const allowedOrigins = splitCsv(process.env.CORS_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);
    const allowedMethods = splitCsv(process.env.CORS_ALLOWED_METHODS, DEFAULT_ALLOWED_METHODS).map((method) => method.toUpperCase());
    const allowedHeaders = splitCsv(process.env.CORS_ALLOWED_HEADERS, DEFAULT_ALLOWED_HEADERS);
    const exposeHeaders = splitCsv(process.env.CORS_EXPOSE_HEADERS, []);
    const allowCredentials = String(process.env.CORS_ALLOW_CREDENTIALS ?? "true").toLowerCase() === "true";
    const maxAgeSeconds = Number.parseInt(process.env.CORS_MAX_AGE_SECONDS ?? "600", 10);
    cachedKey = cacheKey;
    cachedPolicy = {
        allowedOrigins: new Set(allowedOrigins),
        allowedMethods,
        allowedHeaders,
        allowedHeadersLookup: toLookup(allowedHeaders),
        exposeHeaders,
        allowCredentials,
        maxAgeSeconds: Number.isFinite(maxAgeSeconds) && maxAgeSeconds >= 0 ? maxAgeSeconds : 600
    };
    return cachedPolicy;
}
function appendVary(res, value) {
    const current = res.getHeader("Vary");
    const values = new Set();
    const addValues = (raw) => {
        raw.split(",").map((entry) => entry.trim()).filter(Boolean).forEach((entry) => values.add(entry));
    };
    if (typeof current === "string")
        addValues(current);
    if (Array.isArray(current))
        current.filter((entry) => typeof entry === "string").forEach(addValues);
    addValues(value);
    res.setHeader("Vary", [...values].join(", "));
}
function resolveAllowedRequestHeaders(req, policy) {
    const requestedRaw = req.headers["access-control-request-headers"];
    if (typeof requestedRaw !== "string" || requestedRaw.trim().length === 0) {
        return policy.allowedHeaders.join(", ");
    }
    const requested = requestedRaw
        .split(",")
        .map((header) => header.trim())
        .filter(Boolean);
    if (requested.length === 0) {
        return policy.allowedHeaders.join(", ");
    }
    const accepted = requested.filter((header) => policy.allowedHeadersLookup.has(header.toLowerCase()));
    if (accepted.length === 0) {
        return policy.allowedHeaders.join(", ");
    }
    const seen = new Set();
    return accepted
        .filter((header) => {
        const key = header.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .join(", ");
}
export function applyCors(req, res) {
    const policy = loadPolicy();
    const originHeader = req.headers.origin;
    const origin = typeof originHeader === "string" ? originHeader : null;
    appendVary(res, "Origin");
    if (!origin) {
        return { origin: null, originAllowed: false };
    }
    if (!policy.allowedOrigins.has(origin)) {
        return { origin, originAllowed: false };
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", policy.allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", resolveAllowedRequestHeaders(req, policy));
    if (policy.allowCredentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (policy.exposeHeaders.length > 0) {
        res.setHeader("Access-Control-Expose-Headers", policy.exposeHeaders.join(", "));
    }
    return { origin, originAllowed: true };
}
export function handleCorsPreflight(req, res, corsResult) {
    if (req.method !== "OPTIONS")
        return false;
    appendVary(res, "Access-Control-Request-Method");
    appendVary(res, "Access-Control-Request-Headers");
    const policy = loadPolicy();
    if (corsResult.origin && !corsResult.originAllowed) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "CORS origin not allowed" }));
        return true;
    }
    if (!corsResult.origin) {
        res.statusCode = 204;
        res.end();
        return true;
    }
    const requestedMethod = req.headers["access-control-request-method"];
    if (typeof requestedMethod === "string" && requestedMethod.trim().length > 0) {
        const upperMethod = requestedMethod.toUpperCase();
        if (!policy.allowedMethods.includes(upperMethod)) {
            res.statusCode = 405;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "CORS method not allowed" }));
            return true;
        }
    }
    res.setHeader("Access-Control-Max-Age", String(policy.maxAgeSeconds));
    res.statusCode = 204;
    res.end();
    return true;
}
