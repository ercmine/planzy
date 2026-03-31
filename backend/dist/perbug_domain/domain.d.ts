export type TreeId = string;
export type WalletAddress = `0x${string}`;
export type TreeLifecycleState = "planted" | "listed" | "sold" | "dug_up" | "ready_to_replant" | "replanted";
export type SpotClaimState = "unclaimed" | "claimed" | "reserved";
export interface PlaceRef {
    readonly placeId: string;
    readonly label: string;
    readonly lat: number;
    readonly lng: number;
}
export interface SpotRef {
    readonly spotId: string;
    readonly placeId: string;
    readonly label: string;
    readonly lat: number;
    readonly lng: number;
    readonly claimState: SpotClaimState;
}
export interface TreeLifecycleEvent {
    readonly eventId: string;
    readonly treeId: TreeId;
    readonly state: TreeLifecycleState;
    readonly action: string;
    readonly at: string;
    readonly initiatedBy: WalletAddress;
    readonly txHash?: `0x${string}`;
    readonly details?: string;
}
export interface PerbugTree {
    readonly treeId: TreeId;
    readonly nftTokenId: string;
    readonly place: PlaceRef;
    readonly founder: WalletAddress;
    readonly owner: WalletAddress;
    readonly growthLevel: number;
    readonly contributionCount: number;
    readonly listedPriceEth?: string;
    readonly listedPricePerbug?: string;
    readonly lifecycleState?: TreeLifecycleState;
    readonly portable?: boolean;
    readonly currentSpotId?: string;
    readonly dugUpAt?: string;
    readonly digUpFeeWei?: string;
    readonly digUpTxHash?: `0x${string}`;
    readonly lastWateredAt?: string;
    readonly nextWateringAvailableAt?: string;
    readonly waterCooldownSeconds?: number;
}
export interface WaterEligibility {
    readonly treeId: TreeId;
    readonly wallet: WalletAddress;
    readonly eligible: boolean;
    readonly reason?: string;
    readonly now: string;
    readonly nextEligibleAt?: string;
}
export interface DigUpEligibility {
    readonly treeId: TreeId;
    readonly wallet: WalletAddress;
    readonly eligible: boolean;
    readonly reason?: string;
    readonly feeWei: string;
    readonly feeEth: string;
    readonly recipient: WalletAddress;
}
export interface DigUpIntent {
    readonly intentId: string;
    readonly treeId: TreeId;
    readonly ownerWallet: WalletAddress;
    readonly chainId: number;
    readonly feeWei: string;
    readonly feeRecipient: WalletAddress;
    readonly status: "created" | "pending_confirmation" | "confirmed" | "failed";
    readonly createdAt: string;
    readonly paymentTxHash?: `0x${string}`;
    readonly paymentConfirmedAt?: string;
    readonly failureReason?: string;
}
export interface ReplantIntent {
    readonly intentId: string;
    readonly treeId: TreeId;
    readonly ownerWallet: WalletAddress;
    readonly currentSpotId: string;
    readonly nextSpotId: string;
    readonly status: "created" | "confirmed" | "failed";
    readonly createdAt: string;
    readonly confirmedAt?: string;
    readonly failureReason?: string;
}
export interface PlantEligibility {
    readonly wallet: WalletAddress;
    readonly placeId: string;
    readonly distanceMeters: number;
    readonly maxDistanceMeters: number;
    readonly eligible: boolean;
    readonly reason?: string;
}
export interface ContributionRecord {
    readonly treeId: TreeId;
    readonly contributor: WalletAddress;
    readonly assetSymbol: "PERBUG" | "ETH";
    readonly amount: string;
    readonly txHash: `0x${string}`;
    readonly contributedAt: string;
}
export interface GrovePortfolio {
    readonly wallet: WalletAddress;
    readonly foundedTreeIds: TreeId[];
    readonly ownedTreeIds: TreeId[];
    readonly contributedTreeIds: TreeId[];
    readonly watchlistTreeIds: TreeId[];
}
export interface TendTask {
    readonly treeId: TreeId;
    readonly priority: "urgent" | "soon" | "stable";
    readonly reason: "needs_watering" | "cooldown" | "listed" | "ready_to_replant";
    readonly title: string;
    readonly dueAt?: string;
}
export interface MarketPulse {
    readonly listedCount: number;
    readonly soldCount24h: number;
    readonly newlyListedTreeIds: TreeId[];
    readonly recentlyReplantedTreeIds: TreeId[];
    readonly trendingTreeIds: TreeId[];
}
export interface MapPulse {
    readonly plantedTreeCount: number;
    readonly replantedCount24h: number;
    readonly newlyPlantedTreeIds: TreeId[];
    readonly hottestRegions: Array<{
        readonly regionKey: string;
        readonly activityCount: number;
    }>;
}
export interface CreatorTreeProfile {
    readonly creatorWallet: WalletAddress;
    readonly treeIds: TreeId[];
    readonly totalWaterCount: number;
    readonly totalGrowthLevel: number;
    readonly supportMomentum: "rising" | "steady";
}
export interface ProgressionSnapshot {
    readonly ownedTreeCount: number;
    readonly regionsPlantedCount: number;
    readonly totalWaterActions: number;
    readonly plantedMilestoneNext: number;
    readonly wateredMilestoneNext: number;
}
export interface ReturnTrigger {
    readonly kind: "tree_needs_water" | "watchlist_tree_moved" | "watchlist_tree_listed" | "listing_sold" | "tree_received_support";
    readonly treeId: TreeId;
    readonly message: string;
    readonly createdAt: string;
}
export interface LoopMetrics {
    readonly firstPlantCompletedWallets: number;
    readonly firstWaterActionWallets: number;
    readonly firstMarketplaceBuyWallets: number;
    readonly firstReplantWallets: number;
    readonly repeatTendingWallets: number;
}
export interface ForestWorldSnapshot {
    readonly generatedAt: string;
    readonly map: MapPulse;
    readonly market: MarketPulse;
    readonly creatorProfiles: CreatorTreeProfile[];
    readonly trendingTreeIds: TreeId[];
}
