export type AffiliateMode = "append_params" | "redirect";

export interface AffiliateParams {
  [k: string]: string;
}

export interface DomainRule {
  matchDomain: string;
  mode?: AffiliateMode;
  params?: AffiliateParams;
  enabled?: boolean;
}

export interface AffiliateConfig {
  enabled: boolean;
  mode: AffiliateMode;
  wrapBooking: boolean;
  wrapTicket: boolean;
  wrapWebsite: boolean;
  redirectBaseUrl?: string;
  defaultParams: AffiliateParams;
  domainRules?: DomainRule[];
  includeSession: boolean;
  includePlan: boolean;
}
