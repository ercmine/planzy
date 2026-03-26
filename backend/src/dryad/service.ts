import { DRYAD_CONTRACTS } from "./contracts.js";
import type { ContributionRecord, DryadTree, GrovePortfolio, PlantEligibility, WalletAddress } from "./domain.js";

const MAX_PLANT_DISTANCE_METERS = 120;

export class DryadMarketplaceService {
  constructor(
    private readonly trees: DryadTree[] = [],
    private readonly contributions: ContributionRecord[] = [],
  ) {}

  listMarketTrees(): DryadTree[] {
    return this.trees;
  }

  evaluatePlantEligibility(input: Omit<PlantEligibility, "eligible" | "reason" | "maxDistanceMeters">): PlantEligibility {
    const eligible = input.distanceMeters <= MAX_PLANT_DISTANCE_METERS;
    return {
      ...input,
      eligible,
      maxDistanceMeters: MAX_PLANT_DISTANCE_METERS,
      reason: eligible ? undefined : "User is not close enough to claim this place.",
    };
  }

  summarizeGrove(wallet: WalletAddress): GrovePortfolio {
    const foundedTreeIds = this.trees.filter((tree) => tree.founder === wallet).map((tree) => tree.treeId);
    const ownedTreeIds = this.trees.filter((tree) => tree.owner === wallet).map((tree) => tree.treeId);
    const contributedTreeIds = this.contributions.filter((item) => item.contributor === wallet).map((item) => item.treeId);

    return {
      wallet,
      foundedTreeIds,
      ownedTreeIds,
      contributedTreeIds,
      watchlistTreeIds: [],
    };
  }

  chainContracts() {
    return DRYAD_CONTRACTS;
  }
}
