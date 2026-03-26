export type TreeId = string;
export type WalletAddress = `0x${string}`;

export interface PlaceRef {
  readonly placeId: string;
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

export interface DryadTree {
  readonly treeId: TreeId;
  readonly nftTokenId: string;
  readonly place: PlaceRef;
  readonly founder: WalletAddress;
  readonly owner: WalletAddress;
  readonly growthLevel: number;
  readonly contributionCount: number;
  readonly listedPriceEth?: string;
  readonly listedPriceDryad?: string;
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
  readonly assetSymbol: "DRYAD" | "ETH";
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
