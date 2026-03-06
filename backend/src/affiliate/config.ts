import type { AffiliateConfig, AffiliateMode, AffiliateParams, DomainRule } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coerceParams(value: unknown): AffiliateParams | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const params: AffiliateParams = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      params[key] = raw;
    }
  }
  return params;
}

function coerceMode(value: unknown): AffiliateMode | undefined {
  if (value === "append_params" || value === "redirect") {
    return value;
  }
  return undefined;
}

function coerceDomainRule(value: unknown): DomainRule | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.matchDomain !== "string" || value.matchDomain.trim().length === 0) {
    return undefined;
  }

  const rule: DomainRule = {
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

export function defaultAffiliateConfig(): AffiliateConfig {
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

export function coerceAffiliateConfig(x: unknown): Partial<AffiliateConfig> {
  if (!isRecord(x)) {
    return {};
  }

  const out: Partial<AffiliateConfig> = {};

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
      .filter((rule): rule is DomainRule => Boolean(rule));
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
