function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function coerceParams(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    const params = {};
    for (const [key, raw] of Object.entries(value)) {
        if (typeof raw === "string") {
            params[key] = raw;
        }
    }
    return params;
}
function coerceMode(value) {
    if (value === "append_params" || value === "redirect") {
        return value;
    }
    return undefined;
}
function coerceDomainRule(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    if (typeof value.matchDomain !== "string" || value.matchDomain.trim().length === 0) {
        return undefined;
    }
    const rule = {
        matchDomain: value.matchDomain.trim().toLowerCase()
    };
    const mode = coerceMode(value.mode);
    if (mode) {
        rule.mode = mode;
    }
    const params = coerceParams(value.params);
    if (params && Object.keys(params).length > 0) {
        rule.params = params;
    }
    if (typeof value.enabled === "boolean") {
        rule.enabled = value.enabled;
    }
    return rule;
}
export function defaultAffiliateConfig() {
    return {
        enabled: false,
        mode: "append_params",
        wrapBooking: true,
        wrapTicket: true,
        wrapWebsite: false,
        defaultParams: {},
        includeSession: true,
        includePlan: true
    };
}
export function coerceAffiliateConfig(x) {
    if (!isRecord(x)) {
        return {};
    }
    const out = {};
    if (typeof x.enabled === "boolean") {
        out.enabled = x.enabled;
    }
    const mode = coerceMode(x.mode);
    if (mode) {
        out.mode = mode;
    }
    if (typeof x.wrapBooking === "boolean") {
        out.wrapBooking = x.wrapBooking;
    }
    if (typeof x.wrapTicket === "boolean") {
        out.wrapTicket = x.wrapTicket;
    }
    if (typeof x.wrapWebsite === "boolean") {
        out.wrapWebsite = x.wrapWebsite;
    }
    if (typeof x.redirectBaseUrl === "string") {
        out.redirectBaseUrl = x.redirectBaseUrl;
    }
    const defaultParams = coerceParams(x.defaultParams);
    if (defaultParams) {
        out.defaultParams = defaultParams;
    }
    if (Array.isArray(x.domainRules)) {
        const rules = x.domainRules
            .map((rule) => coerceDomainRule(rule))
            .filter((rule) => Boolean(rule));
        out.domainRules = rules;
    }
    if (typeof x.includeSession === "boolean") {
        out.includeSession = x.includeSession;
    }
    if (typeof x.includePlan === "boolean") {
        out.includePlan = x.includePlan;
    }
    return out;
}
