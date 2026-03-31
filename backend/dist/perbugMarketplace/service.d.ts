import type { MarketplaceAnalyticsSnapshot, MarketplaceAssetDetail, MarketplaceAssetType, MarketplaceFilters, MarketplaceListing, MarketplaceSearchResult, MarketplaceSort } from "./types.js";
export declare class PerbugMarketplaceService {
    private readonly listings;
    private listingViews;
    private detailOpens;
    private readonly categoryPopularity;
    private readonly filterUsage;
    constructor(listings: MarketplaceListing[]);
    listListings(input?: {
        filters?: MarketplaceFilters;
        sort?: MarketplaceSort;
    }): MarketplaceSearchResult;
    getListingDetail(listingId: string): MarketplaceAssetDetail | undefined;
    featuredListings(): MarketplaceListing[];
    categories(): MarketplaceAssetType[];
    analyticsSnapshot(): MarketplaceAnalyticsSnapshot;
}
