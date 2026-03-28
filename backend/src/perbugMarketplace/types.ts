export type MarketplaceAssetType = "character" | "item" | "relic" | "cosmetic" | "map_asset" | "special_event_asset" | "nft_backed_asset";

export type MarketplaceListingStatus = "draft" | "active" | "sold" | "cancelled" | "expired" | "reserved" | "hidden";

export type MarketplaceRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type MarketplaceProvenanceTag = "earned" | "event" | "crafted" | "premium" | "nft_backed" | "map_linked";

export type MarketplaceCurrencyCode = "PERBUG" | "GEMS" | "USD_STABLE";

export interface MarketplaceCurrency {
  readonly code: MarketplaceCurrencyCode;
  readonly symbol: string;
  readonly decimals: number;
  readonly displayName: string;
  readonly settlementRail: "offchain_game_balance" | "wallet_bridge" | "hybrid";
}

export interface MarketplacePrice {
  readonly amount: string;
  readonly atomicAmount: string;
  readonly currency: MarketplaceCurrency;
}

export interface MarketplaceSeller {
  readonly sellerId: string;
  readonly handle: string;
  readonly tier: "adventurer" | "guild" | "founder";
  readonly reputationScore: number;
}

export interface MarketplaceMapLink {
  readonly nodeId: string;
  readonly regionId: string;
  readonly regionName: string;
  readonly landmarkName?: string;
  readonly coordinateHint?: { readonly x: number; readonly y: number };
}

export interface MarketplaceAssetReference {
  readonly assetId: string;
  readonly assetType: MarketplaceAssetType;
  readonly sourceModule: "inventory" | "squad" | "relic_vault" | "world_map" | "collectibles";
  readonly sourceRecordId: string;
  readonly nftTokenId?: string;
}

export interface MarketplaceTradeEligibility {
  readonly listable: boolean;
  readonly buyable: boolean;
  readonly reasonCodes: string[];
}

export interface MarketplaceAssetMetadata {
  readonly imageUrl: string;
  readonly summary: string;
  readonly level?: number;
  readonly powerScore?: number;
  readonly roleClass?: string;
  readonly relicSlot?: string;
  readonly relicType?: string;
  readonly itemType?: string;
  readonly mapLink?: MarketplaceMapLink;
  readonly specialEventName?: string;
}

export interface MarketplaceProvenanceSummary {
  readonly originLabel: string;
  readonly tags: MarketplaceProvenanceTag[];
  readonly mintedAt?: string;
  readonly acquiredAt: string;
  readonly chain?: "ethereum" | "solana";
}

export interface MarketplaceListing {
  readonly listingId: string;
  readonly assetReference: MarketplaceAssetReference;
  readonly assetName: string;
  readonly assetType: MarketplaceAssetType;
  readonly rarity: MarketplaceRarity;
  readonly status: MarketplaceListingStatus;
  readonly seller: MarketplaceSeller;
  readonly price: MarketplacePrice;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly featuredRank?: number;
  readonly metadata: MarketplaceAssetMetadata;
  readonly provenance: MarketplaceProvenanceSummary;
  readonly tradeEligibility: MarketplaceTradeEligibility;
}

export interface MarketplaceAssetDetail {
  readonly listing: MarketplaceListing;
  readonly lore: string;
  readonly ownershipPath: Array<{ readonly ownerId: string; readonly at: string; readonly source: string }>;
  readonly debug: {
    readonly projectedFromModules: string[];
    readonly schemaVersion: string;
  };
}

export interface MarketplaceFilters {
  readonly category?: MarketplaceAssetType;
  readonly status?: MarketplaceListingStatus;
  readonly rarity?: MarketplaceRarity;
  readonly provenanceTag?: MarketplaceProvenanceTag;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly search?: string;
}

export type MarketplaceSort =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "rarity_desc"
  | "newest"
  | "ending_soon";

export interface MarketplaceSearchResult {
  readonly items: MarketplaceListing[];
  readonly total: number;
  readonly facets: {
    readonly byType: Record<MarketplaceAssetType, number>;
    readonly byRarity: Record<MarketplaceRarity, number>;
    readonly byProvenance: Partial<Record<MarketplaceProvenanceTag, number>>;
  };
  readonly diagnostics: {
    readonly queryMs: number;
    readonly filtersApplied: string[];
  };
}

export interface MarketplaceAnalyticsSnapshot {
  readonly listingViews: number;
  readonly detailOpens: number;
  readonly categoryPopularity: Partial<Record<MarketplaceAssetType, number>>;
  readonly filterUsage: Record<string, number>;
  readonly rarityDistribution: Partial<Record<MarketplaceRarity, number>>;
  readonly provenanceDistribution: Partial<Record<MarketplaceProvenanceTag, number>>;
  readonly mapLinkedListingCount: number;
  readonly averagePriceByCurrency: Partial<Record<MarketplaceCurrencyCode, number>>;
}
