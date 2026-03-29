export type DataClass = "provider_api_cache" | "router_deck_cache" | "pagination_snapshot" | "affiliate_wrapped_links" | "analytics_clicks" | "venue_claims" | "merchant_promos" | "merchant_specials";
export interface ProviderRetentionRule {
    provider: string;
    maxCacheTtlMs: number;
    allowLongTermStorage: boolean;
}
export interface RetentionConfig {
    enabled: boolean;
    maxTtlByClass: Record<DataClass, number>;
    providerRules: ProviderRetentionRule[];
}
