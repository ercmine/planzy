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

  getTree(treeId: string): DryadTree | undefined {
    return this.trees.find((tree) => tree.treeId === treeId);
  }

  claimAndPlant(treeId: string, wallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner !== ("0x0000000000000000000000000000000000000000" as WalletAddress)) {
      throw new Error("tree_not_claimable");
    }
    const updated: DryadTree = { ...tree, owner: wallet };
    this.replaceTree(updated);
    return updated;
  }

  listTree(treeId: string, wallet: WalletAddress, priceEth: string): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() !== wallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");
    const updated: DryadTree = { ...tree, listedPriceEth: priceEth };
    this.replaceTree(updated);
    return updated;
  }

  unlistTree(treeId: string, wallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() != wallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");
    const updated: DryadTree = { ...tree, listedPriceEth: undefined };
    this.replaceTree(updated);
    return updated;
  }

  buyTree(treeId: string, buyerWallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (!tree.listedPriceEth) throw new Error("tree_not_listed");
    const updated: DryadTree = { ...tree, owner: buyerWallet, listedPriceEth: undefined };
    this.replaceTree(updated);
    return updated;
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

    return { wallet, foundedTreeIds, ownedTreeIds, contributedTreeIds, watchlistTreeIds: [] };
  }

  chainContracts() {
    return DRYAD_CONTRACTS;
  }

  private requireTree(treeId: string): DryadTree {
    const tree = this.getTree(treeId);
    if (!tree) throw new Error("tree_not_found");
    return tree;
  }

  private replaceTree(next: DryadTree): void {
    const index = this.trees.findIndex((item) => item.treeId === next.treeId);
    if (index >= 0) this.trees[index] = next;
  }
}
