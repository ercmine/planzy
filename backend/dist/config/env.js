import { coerceAffiliateConfig, defaultAffiliateConfig } from "../affiliate/config.js";
function parseBoolean(value) {
    if (value === undefined) {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }
    return undefined;
}
function parseNumber(value) {
    if (value === undefined || value.trim() === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseJsonObject(value) {
    if (!value) {
        return undefined;
    }
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
    }
    return undefined;
}
function parseJsonArray(value) {
    if (!value) {
        return undefined;
    }
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
}
function ensureProvider(config, providerName) {
    if (!config.plans) {
        config.plans = {};
    }
    if (!config.plans.providers) {
        config.plans.providers = {};
    }
    if (!config.plans.providers[providerName]) {
        config.plans.providers[providerName] = { name: providerName };
    }
    return config.plans.providers[providerName];
}
/**
 * Supported env vars:
 * APP_ENV, REMOTE_CONFIG_URL, REMOTE_CONFIG_TTL_MS, REMOTE_CONFIG_TIMEOUT_MS, REMOTE_CONFIG_ALLOW_HTTP,
 * PLANS_ROUTER_DEFAULT_TIMEOUT_MS, PLANS_ROUTER_ALLOW_PARTIAL, PLANS_ROUTER_MAX_FANOUT,
 * PROVIDERS_ENABLED,
 * PROVIDER_<NAME>_API_KEY, PROVIDER_<NAME>_TIMEOUT_MS, PROVIDER_<NAME>_MAX_CONCURRENT,
 * PROVIDER_<NAME>_CACHE_TTL_MS, PROVIDER_<NAME>_RPM, PROVIDER_<NAME>_RPD,
 * PROVIDER_<NAME>_CATEGORY_WEIGHTS (JSON),
 * PLANS_ROUTER_CATEGORY_ORDER (JSON),
 * AFFILIATE_ENABLED, AFFILIATE_MODE, AFFILIATE_REDIRECT_BASE_URL,
 * AFFILIATE_DEFAULT_PARAMS (JSON), AFFILIATE_DOMAIN_RULES (JSON),
 * AFFILIATE_WRAP_BOOKING, AFFILIATE_WRAP_TICKET, AFFILIATE_WRAP_WEBSITE,
 * AFFILIATE_INCLUDE_SESSION, AFFILIATE_INCLUDE_PLAN
 */
export function readEnvConfigWithWarnings(processEnv) {
    const warnings = [];
    const config = {};
    const appEnv = processEnv.APP_ENV;
    if (appEnv === "dev" || appEnv === "stage" || appEnv === "prod") {
        config.env = appEnv;
    }
    else if (appEnv) {
        warnings.push(`Invalid APP_ENV value '${appEnv}', using default.`);
    }
    const remoteUrl = processEnv.REMOTE_CONFIG_URL;
    const remoteTtlMs = parseNumber(processEnv.REMOTE_CONFIG_TTL_MS);
    const remoteTimeoutMs = parseNumber(processEnv.REMOTE_CONFIG_TIMEOUT_MS);
    const allowHttp = parseBoolean(processEnv.REMOTE_CONFIG_ALLOW_HTTP);
    if (remoteUrl || remoteTtlMs !== undefined || remoteTimeoutMs !== undefined || allowHttp !== undefined) {
        config.remoteConfig = {
            url: remoteUrl,
            ttlMs: remoteTtlMs ?? 60_000,
            timeoutMs: remoteTimeoutMs ?? 2_000,
            allowInsecureHttp: allowHttp ?? false
        };
    }
    const nominatimBaseUrl = processEnv.NOMINATIM_BASE_URL;
    const nominatimTimeoutMs = parseNumber(processEnv.NOMINATIM_TIMEOUT_MS);
    const nominatimGeocodeCacheTtlMs = parseNumber(processEnv.NOMINATIM_GEOCODE_CACHE_TTL_MS);
    const nominatimReverseCacheTtlMs = parseNumber(processEnv.NOMINATIM_REVERSE_CACHE_TTL_MS);
    const nominatimDefaultLimit = parseNumber(processEnv.NOMINATIM_DEFAULT_LIMIT);
    const nominatimFallback = parseBoolean(processEnv.NOMINATIM_ENABLE_FALLBACK);
    if (nominatimBaseUrl || nominatimTimeoutMs !== undefined || nominatimGeocodeCacheTtlMs !== undefined || nominatimReverseCacheTtlMs !== undefined || nominatimDefaultLimit !== undefined || nominatimFallback !== undefined) {
        config.geocoding = {
            baseUrl: nominatimBaseUrl,
            timeoutMs: nominatimTimeoutMs ?? 2_000,
            geocodeCacheTtlMs: nominatimGeocodeCacheTtlMs ?? 3_600_000,
            reverseCacheTtlMs: nominatimReverseCacheTtlMs ?? 86_400_000,
            defaultLimit: nominatimDefaultLimit ?? 5,
            enableFallback: nominatimFallback ?? false,
            fallbackBaseUrl: processEnv.NOMINATIM_FALLBACK_BASE_URL,
            userAgent: processEnv.NOMINATIM_USER_AGENT
        };
    }
    const routerTimeoutMs = parseNumber(processEnv.PLANS_ROUTER_DEFAULT_TIMEOUT_MS);
    const routerAllowPartial = parseBoolean(processEnv.PLANS_ROUTER_ALLOW_PARTIAL);
    const routerMaxFanout = parseNumber(processEnv.PLANS_ROUTER_MAX_FANOUT);
    if (routerTimeoutMs !== undefined || routerAllowPartial !== undefined || routerMaxFanout !== undefined) {
        config.plans = config.plans ?? {};
        config.plans.router = {
            defaultTimeoutMs: routerTimeoutMs ?? 2_500,
            allowPartial: routerAllowPartial ?? true,
            ...(routerMaxFanout !== undefined ? { maxFanout: routerMaxFanout } : {})
        };
    }
    const enabledProvidersRaw = processEnv.PROVIDERS_ENABLED;
    if (enabledProvidersRaw) {
        const enabled = enabledProvidersRaw
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        config.plans = config.plans ?? {};
        config.plans.providers = config.plans.providers ?? {};
        for (const providerName of enabled) {
            const provider = ensureProvider(config, providerName);
            provider.routing = { ...(provider.routing ?? {}), enabled: true };
        }
    }
    for (const [rawKey, rawValue] of Object.entries(processEnv)) {
        const match = /^PROVIDER_([A-Z0-9_]+)_(API_KEY|TIMEOUT_MS|MAX_CONCURRENT|CACHE_TTL_MS|RPM|RPD|CATEGORY_WEIGHTS)$/.exec(rawKey);
        if (!match) {
            continue;
        }
        const providerName = match[1].toLowerCase();
        const field = match[2];
        const provider = ensureProvider(config, providerName);
        switch (field) {
            case "API_KEY":
                provider.secrets = { ...(provider.secrets ?? {}), apiKey: rawValue };
                break;
            case "TIMEOUT_MS": {
                const num = parseNumber(rawValue);
                if (num === undefined) {
                    warnings.push(`Invalid number for ${rawKey}.`);
                    break;
                }
                provider.budget = { ...(provider.budget ?? {}), timeoutMs: num };
                break;
            }
            case "MAX_CONCURRENT": {
                const num = parseNumber(rawValue);
                if (num === undefined) {
                    warnings.push(`Invalid number for ${rawKey}.`);
                    break;
                }
                provider.budget = { ...(provider.budget ?? {}), maxConcurrent: num };
                break;
            }
            case "CACHE_TTL_MS": {
                const num = parseNumber(rawValue);
                if (num === undefined) {
                    warnings.push(`Invalid number for ${rawKey}.`);
                    break;
                }
                provider.cache = { ...(provider.cache ?? {}), ttlMs: num };
                break;
            }
            case "RPM": {
                const num = parseNumber(rawValue);
                if (num === undefined) {
                    warnings.push(`Invalid number for ${rawKey}.`);
                    break;
                }
                provider.quota = { ...(provider.quota ?? {}), requestsPerMinute: num };
                break;
            }
            case "RPD": {
                const num = parseNumber(rawValue);
                if (num === undefined) {
                    warnings.push(`Invalid number for ${rawKey}.`);
                    break;
                }
                provider.quota = { ...(provider.quota ?? {}), requestsPerDay: num };
                break;
            }
            case "CATEGORY_WEIGHTS":
                try {
                    const parsed = parseJsonObject(rawValue);
                    if (!parsed) {
                        warnings.push(`Expected object JSON for ${rawKey}.`);
                        break;
                    }
                    provider.routing = { ...(provider.routing ?? {}), categories: parsed };
                }
                catch {
                    warnings.push(`Invalid JSON for ${rawKey}.`);
                }
                break;
            default:
                break;
        }
    }
    if (enabledProvidersRaw) {
        const enabledSet = new Set(enabledProvidersRaw
            .split(",")
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean));
        config.plans = config.plans ?? {};
        config.plans.providers = config.plans.providers ?? {};
        for (const providerName of Object.keys(config.plans.providers)) {
            const provider = ensureProvider(config, providerName);
            provider.routing = {
                ...(provider.routing ?? {}),
                enabled: enabledSet.has(providerName)
            };
        }
    }
    const categoryOrderRaw = processEnv.PLANS_ROUTER_CATEGORY_ORDER;
    if (categoryOrderRaw) {
        try {
            const parsed = parseJsonObject(categoryOrderRaw);
            if (!parsed) {
                warnings.push("Expected object JSON for PLANS_ROUTER_CATEGORY_ORDER.");
            }
            else {
                config.plans = config.plans ?? {};
                config.plans.router = {
                    defaultTimeoutMs: config.plans.router?.defaultTimeoutMs ?? 2_500,
                    allowPartial: config.plans.router?.allowPartial ?? true,
                    ...(config.plans.router?.maxFanout !== undefined ? { maxFanout: config.plans.router.maxFanout } : {}),
                    perCategoryProviderOrder: parsed
                };
            }
        }
        catch {
            warnings.push("Invalid JSON for PLANS_ROUTER_CATEGORY_ORDER.");
        }
    }
    const affiliatePartial = {};
    let hasAffiliateSetting = false;
    const affiliateEnabled = parseBoolean(processEnv.AFFILIATE_ENABLED);
    if (affiliateEnabled !== undefined) {
        affiliatePartial.enabled = affiliateEnabled;
        hasAffiliateSetting = true;
    }
    const affiliateMode = processEnv.AFFILIATE_MODE;
    if (affiliateMode) {
        affiliatePartial.mode = affiliateMode;
        hasAffiliateSetting = true;
    }
    const redirectBaseUrl = processEnv.AFFILIATE_REDIRECT_BASE_URL;
    if (redirectBaseUrl) {
        affiliatePartial.redirectBaseUrl = redirectBaseUrl;
        hasAffiliateSetting = true;
    }
    const wrapBooking = parseBoolean(processEnv.AFFILIATE_WRAP_BOOKING);
    if (wrapBooking !== undefined) {
        affiliatePartial.wrapBooking = wrapBooking;
        hasAffiliateSetting = true;
    }
    const wrapTicket = parseBoolean(processEnv.AFFILIATE_WRAP_TICKET);
    if (wrapTicket !== undefined) {
        affiliatePartial.wrapTicket = wrapTicket;
        hasAffiliateSetting = true;
    }
    const wrapWebsite = parseBoolean(processEnv.AFFILIATE_WRAP_WEBSITE);
    if (wrapWebsite !== undefined) {
        affiliatePartial.wrapWebsite = wrapWebsite;
        hasAffiliateSetting = true;
    }
    const includeSession = parseBoolean(processEnv.AFFILIATE_INCLUDE_SESSION);
    if (includeSession !== undefined) {
        affiliatePartial.includeSession = includeSession;
        hasAffiliateSetting = true;
    }
    const includePlan = parseBoolean(processEnv.AFFILIATE_INCLUDE_PLAN);
    if (includePlan !== undefined) {
        affiliatePartial.includePlan = includePlan;
        hasAffiliateSetting = true;
    }
    const defaultParamsRaw = processEnv.AFFILIATE_DEFAULT_PARAMS;
    if (defaultParamsRaw) {
        hasAffiliateSetting = true;
        try {
            const parsed = parseJsonObject(defaultParamsRaw);
            if (!parsed) {
                warnings.push("Expected object JSON for AFFILIATE_DEFAULT_PARAMS.");
            }
            else {
                affiliatePartial.defaultParams = parsed;
            }
        }
        catch {
            warnings.push("Invalid JSON for AFFILIATE_DEFAULT_PARAMS.");
        }
    }
    const domainRulesRaw = processEnv.AFFILIATE_DOMAIN_RULES;
    if (domainRulesRaw) {
        hasAffiliateSetting = true;
        try {
            const parsed = parseJsonArray(domainRulesRaw);
            if (!parsed) {
                warnings.push("Expected array JSON for AFFILIATE_DOMAIN_RULES.");
            }
            else {
                affiliatePartial.domainRules = parsed;
            }
        }
        catch {
            warnings.push("Invalid JSON for AFFILIATE_DOMAIN_RULES.");
        }
    }
    if (hasAffiliateSetting) {
        config.affiliate = { ...defaultAffiliateConfig(), ...coerceAffiliateConfig(affiliatePartial) };
    }
    return { config, warnings };
}
export function readEnvConfig(processEnv) {
    return readEnvConfigWithWarnings(processEnv).config;
}
