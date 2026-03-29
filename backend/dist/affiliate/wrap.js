import { hashString } from "../logging/redact.js";
import { isSafeHttpUrl } from "../plans/deeplinks/deepLinkValidation.js";
function toSafeUrl(url) {
    if (!isSafeHttpUrl(url)) {
        return null;
    }
    try {
        return new URL(url);
    }
    catch {
        return null;
    }
}
export function getDomain(url) {
    const parsed = toSafeUrl(url);
    return parsed?.hostname.toLowerCase() ?? null;
}
export function domainMatches(ruleDomain, actual) {
    const normalizedRule = ruleDomain.trim().toLowerCase();
    const normalizedActual = actual.trim().toLowerCase();
    if (!normalizedRule || !normalizedActual) {
        return false;
    }
    const bareRule = normalizedRule.startsWith(".") ? normalizedRule.slice(1) : normalizedRule;
    return normalizedActual === bareRule || normalizedActual.endsWith(`.${bareRule}`);
}
export function appendParams(url, params) {
    const parsed = toSafeUrl(url);
    if (!parsed) {
        return url;
    }
    const merged = {};
    for (const [key, value] of parsed.searchParams.entries()) {
        merged[key] = value;
    }
    for (const [key, value] of Object.entries(params)) {
        merged[key] = value;
    }
    const keys = Object.keys(merged).sort((a, b) => a.localeCompare(b));
    parsed.search = "";
    for (const key of keys) {
        parsed.searchParams.set(key, merged[key] ?? "");
    }
    return parsed.toString();
}
export function buildRedirectUrl(base, targetUrl, extraParams) {
    const parsedBase = toSafeUrl(base);
    const parsedTarget = toSafeUrl(targetUrl);
    if (!parsedBase || !parsedTarget) {
        return targetUrl;
    }
    parsedBase.search = "";
    parsedBase.hash = "";
    parsedBase.searchParams.set("u", parsedTarget.toString());
    const orderedExtraKeys = Object.keys(extraParams).sort((a, b) => a.localeCompare(b));
    for (const key of orderedExtraKeys) {
        parsedBase.searchParams.set(key, extraParams[key] ?? "");
    }
    return parsedBase.toString();
}
function resolveRule(rules, actualDomain) {
    if (!rules?.length) {
        return undefined;
    }
    for (const rule of rules) {
        if (rule.enabled === false) {
            continue;
        }
        if (domainMatches(rule.matchDomain, actualDomain)) {
            return rule;
        }
    }
    return undefined;
}
export function wrapUrl(url, cfg, ctx) {
    if (!cfg.enabled) {
        return url;
    }
    const domain = getDomain(url);
    if (!domain) {
        return url;
    }
    const rule = resolveRule(cfg.domainRules, domain);
    const params = {
        ...cfg.defaultParams,
        ...(rule?.params ?? {})
    };
    if (cfg.includeSession && ctx?.sessionId) {
        params.sid = hashString(ctx.sessionId);
    }
    if (cfg.includePlan && ctx?.planId) {
        params.pid = hashString(ctx.planId);
    }
    if (ctx?.linkType) {
        params.lt = ctx.linkType;
    }
    const mode = rule?.mode ?? cfg.mode;
    const wrapped = mode === "redirect"
        ? cfg.redirectBaseUrl
            ? buildRedirectUrl(cfg.redirectBaseUrl, url, params)
            : url
        : appendParams(url, params);
    return isSafeHttpUrl(wrapped) ? wrapped : url;
}
export function wrapPlanLinks(plan, cfg, ctx) {
    if (!plan.deepLinks) {
        return plan;
    }
    const deepLinks = { ...plan.deepLinks };
    if (cfg.wrapBooking && deepLinks.bookingLink) {
        deepLinks.bookingLink = wrapUrl(deepLinks.bookingLink, cfg, {
            sessionId: ctx?.sessionId,
            planId: plan.id,
            linkType: "booking"
        });
    }
    if (cfg.wrapTicket && deepLinks.ticketLink) {
        deepLinks.ticketLink = wrapUrl(deepLinks.ticketLink, cfg, {
            sessionId: ctx?.sessionId,
            planId: plan.id,
            linkType: "ticket"
        });
    }
    if (cfg.wrapWebsite && deepLinks.websiteLink) {
        deepLinks.websiteLink = wrapUrl(deepLinks.websiteLink, cfg, {
            sessionId: ctx?.sessionId,
            planId: plan.id,
            linkType: "website"
        });
    }
    return {
        ...plan,
        deepLinks
    };
}
