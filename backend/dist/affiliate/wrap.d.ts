import type { Plan } from "../plans/plan.js";
import type { AffiliateConfig, AffiliateParams } from "./types.js";
export declare function getDomain(url: string): string | null;
export declare function domainMatches(ruleDomain: string, actual: string): boolean;
export declare function appendParams(url: string, params: AffiliateParams): string;
export declare function buildRedirectUrl(base: string, targetUrl: string, extraParams: AffiliateParams): string;
export declare function wrapUrl(url: string, cfg: AffiliateConfig, ctx?: {
    sessionId?: string;
    planId?: string;
    linkType?: "booking" | "ticket" | "website";
}): string;
export declare function wrapPlanLinks(plan: Plan, cfg: AffiliateConfig, ctx?: {
    sessionId?: string;
}): Plan;
