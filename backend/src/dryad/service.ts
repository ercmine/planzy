import { DRYAD_CONTRACTS } from "./contracts.js";
import type {
  ContributionRecord,
  DigUpEligibility,
  DigUpIntent,
  DryadTree,
  GrovePortfolio,
  PlantEligibility,
  ReplantIntent,
  SpotRef,
  TreeLifecycleEvent,
  WalletAddress,
} from "./domain.js";

const MAX_PLANT_DISTANCE_METERS = 120;
const ZERO_WALLET = "0x0000000000000000000000000000000000000000" as WalletAddress;
const DIG_UP_FEE_WEI = "100000000000000000";
const DIG_UP_FEE_ETH = "0.1";
const DIG_UP_FEE_RECIPIENT = "0xB7cfa0de6975311DD0fFF05f71FD2110caC0B227" as WalletAddress;

export class DryadMarketplaceService {
  constructor(
    private readonly trees: DryadTree[] = [],
    private readonly contributions: ContributionRecord[] = [],
    private readonly spots: SpotRef[] = [],
    private readonly digUpIntents = new Map<string, DigUpIntent>(),
    private readonly replantIntents = new Map<string, ReplantIntent>(),
    private readonly lifecycle = new Map<string, TreeLifecycleEvent[]>(),
    private readonly seenTx = new Set<string>(),
  ) {
    this.seedTreeDefaults();
  }

  listMarketTrees(): DryadTree[] {
    return this.trees;
  }

  listUnclaimedSpots(): SpotRef[] {
    const reservedSpotIds = new Set(
      Array.from(this.replantIntents.values())
        .filter((intent) => intent.status === "created")
        .map((intent) => intent.nextSpotId),
    );
    return this.spots.map((spot) => {
      const claimState = reservedSpotIds.has(spot.spotId) && spot.claimState === "unclaimed" ? "reserved" : spot.claimState;
      return { ...spot, claimState };
    });
  }

  listReplantableTrees(wallet: WalletAddress): DryadTree[] {
    return this.trees.filter((tree) => tree.owner.toLowerCase() === wallet.toLowerCase() && tree.portable === true);
  }

  getTreeLifecycle(treeId: string): TreeLifecycleEvent[] {
    return this.lifecycle.get(treeId) ?? [];
  }

  getTree(treeId: string): DryadTree | undefined {
    return this.trees.find((tree) => tree.treeId === treeId);
  }

  claimAndPlant(treeId: string, wallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner !== ZERO_WALLET) {
      throw new Error("tree_not_claimable");
    }
    const targetSpot = this.requireSpot(tree.currentSpotId ?? tree.place.placeId);
    if (targetSpot.claimState !== "unclaimed") {
      throw new Error("spot_not_available");
    }
    const updated: DryadTree = {
      ...tree,
      owner: wallet,
      lifecycleState: "planted",
      portable: false,
      currentSpotId: targetSpot.spotId,
    };
    this.replaceTree(updated);
    this.replaceSpot({ ...targetSpot, claimState: "claimed" });
    this.logEvent(updated.treeId, "planted", "claim_and_plant", wallet);
    return updated;
  }

  listTree(treeId: string, wallet: WalletAddress, priceEth: string): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() !== wallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");
    if (tree.portable) throw new Error("portable_tree_cannot_be_listed");
    const updated: DryadTree = { ...tree, listedPriceEth: priceEth, lifecycleState: "listed" };
    this.replaceTree(updated);
    this.logEvent(treeId, "listed", "list_tree", wallet, `Listed for ${priceEth} ETH`);
    return updated;
  }

  unlistTree(treeId: string, wallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() != wallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");
    const updated: DryadTree = { ...tree, listedPriceEth: undefined, lifecycleState: "planted" };
    this.replaceTree(updated);
    this.logEvent(treeId, "planted", "unlist_tree", wallet);
    return updated;
  }

  buyTree(treeId: string, buyerWallet: WalletAddress): DryadTree {
    const tree = this.requireTree(treeId);
    if (!tree.listedPriceEth) throw new Error("tree_not_listed");
    const updated: DryadTree = { ...tree, owner: buyerWallet, listedPriceEth: undefined, lifecycleState: "sold", portable: false };
    this.replaceTree(updated);
    this.logEvent(treeId, "sold", "buy_tree", buyerWallet);
    return updated;
  }

  getDigUpEligibility(treeId: string, wallet: WalletAddress): DigUpEligibility {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() !== wallet.toLowerCase()) {
      return { treeId, wallet, eligible: false, reason: "forbidden_owner_mismatch", feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
    }
    if (tree.portable || tree.lifecycleState === "dug_up" || tree.lifecycleState === "ready_to_replant") {
      return { treeId, wallet, eligible: false, reason: "tree_already_dug_up", feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
    }
    if (tree.listedPriceEth) {
      return { treeId, wallet, eligible: false, reason: "listed_tree_cannot_be_dug_up", feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
    }
    const existingPending = Array.from(this.digUpIntents.values()).some((intent) => intent.treeId === treeId && ["created", "pending_confirmation"].includes(intent.status));
    if (existingPending) {
      return { treeId, wallet, eligible: false, reason: "dig_up_already_pending", feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
    }
    return { treeId, wallet, eligible: true, feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
  }

  createDigUpIntent(treeId: string, wallet: WalletAddress, chainId: number): DigUpIntent {
    const eligibility = this.getDigUpEligibility(treeId, wallet);
    if (!eligibility.eligible) throw new Error(eligibility.reason ?? "tree_not_eligible_for_dig_up");

    const intent: DigUpIntent = {
      intentId: this.newId("dig"),
      treeId,
      ownerWallet: wallet,
      chainId,
      feeWei: DIG_UP_FEE_WEI,
      feeRecipient: DIG_UP_FEE_RECIPIENT,
      status: "created",
      createdAt: new Date().toISOString(),
    };
    this.digUpIntents.set(intent.intentId, intent);
    return intent;
  }

  confirmDigUpIntent(params: {
    intentId: string;
    paymentTxHash: `0x${string}`;
    from: WalletAddress;
    to: WalletAddress;
    valueWei: string;
    chainId: number;
  }): DigUpIntent {
    const intent = this.digUpIntents.get(params.intentId);
    if (!intent) throw new Error("dig_up_intent_not_found");
    if (intent.status === "confirmed") throw new Error("dig_up_already_confirmed");
    if (this.seenTx.has(params.paymentTxHash.toLowerCase())) throw new Error("payment_already_processed");
    if (intent.ownerWallet.toLowerCase() !== params.from.toLowerCase()) throw new Error("payment_sender_mismatch");
    if (intent.feeRecipient.toLowerCase() !== params.to.toLowerCase()) throw new Error("invalid_fee_recipient");
    if (intent.feeWei !== params.valueWei) throw new Error("invalid_fee_amount");
    if (intent.chainId !== params.chainId) throw new Error("wrong_chain");

    const tree = this.requireTree(intent.treeId);
    if (tree.owner.toLowerCase() !== intent.ownerWallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");

    const oldSpotId = tree.currentSpotId;
    if (oldSpotId) {
      const oldSpot = this.requireSpot(oldSpotId);
      this.replaceSpot({ ...oldSpot, claimState: "unclaimed" });
    }

    const confirmedAt = new Date().toISOString();
    const confirmedIntent: DigUpIntent = {
      ...intent,
      status: "confirmed",
      paymentTxHash: params.paymentTxHash,
      paymentConfirmedAt: confirmedAt,
    };
    this.digUpIntents.set(intent.intentId, confirmedIntent);

    const updatedTree: DryadTree = {
      ...tree,
      lifecycleState: "ready_to_replant",
      portable: true,
      currentSpotId: undefined,
      dugUpAt: confirmedAt,
      digUpFeeWei: DIG_UP_FEE_WEI,
      digUpTxHash: params.paymentTxHash,
    };
    this.replaceTree(updatedTree);
    this.seenTx.add(params.paymentTxHash.toLowerCase());
    this.logEvent(tree.treeId, "dug_up", "dig_up_payment_confirmed", intent.ownerWallet, undefined, params.paymentTxHash);
    this.logEvent(tree.treeId, "ready_to_replant", "tree_portable", intent.ownerWallet);
    return confirmedIntent;
  }

  createReplantIntent(treeId: string, wallet: WalletAddress, nextSpotId: string): ReplantIntent {
    const tree = this.requireTree(treeId);
    if (tree.owner.toLowerCase() !== wallet.toLowerCase()) throw new Error("forbidden_owner_mismatch");
    if (!tree.portable || tree.lifecycleState !== "ready_to_replant") throw new Error("tree_not_ready_to_replant");

    const spot = this.requireSpot(nextSpotId);
    if (spot.claimState !== "unclaimed") throw new Error("spot_not_available");
    const spotReserved = Array.from(this.replantIntents.values()).some((intent) => intent.nextSpotId === nextSpotId && intent.status === "created");
    if (spotReserved) throw new Error("spot_pending_claim");

    const intent: ReplantIntent = {
      intentId: this.newId("replant"),
      treeId,
      ownerWallet: wallet,
      currentSpotId: tree.currentSpotId ?? "",
      nextSpotId,
      status: "created",
      createdAt: new Date().toISOString(),
    };
    this.replantIntents.set(intent.intentId, intent);
    return intent;
  }

  confirmReplantIntent(intentId: string): ReplantIntent {
    const intent = this.replantIntents.get(intentId);
    if (!intent) throw new Error("replant_intent_not_found");
    if (intent.status === "confirmed") throw new Error("replant_already_confirmed");

    const tree = this.requireTree(intent.treeId);
    if (!tree.portable || tree.lifecycleState !== "ready_to_replant") throw new Error("tree_not_ready_to_replant");
    const spot = this.requireSpot(intent.nextSpotId);
    if (spot.claimState !== "unclaimed") throw new Error("spot_not_available");

    const confirmedAt = new Date().toISOString();
    this.replaceSpot({ ...spot, claimState: "claimed" });
    const updatedTree: DryadTree = {
      ...tree,
      place: {
        placeId: spot.placeId,
        label: spot.label,
        lat: spot.lat,
        lng: spot.lng,
      },
      currentSpotId: spot.spotId,
      lifecycleState: "replanted",
      portable: false,
    };
    this.replaceTree(updatedTree);

    const confirmed: ReplantIntent = { ...intent, status: "confirmed", confirmedAt };
    this.replantIntents.set(intent.intentId, confirmed);
    this.logEvent(tree.treeId, "replanted", "replant_confirmed", intent.ownerWallet, `Spot ${spot.spotId}`);
    return confirmed;
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

  digUpConfig() {
    return { feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
  }

  private seedTreeDefaults(): void {
    for (const tree of this.trees) {
      const assignedSpotId = tree.currentSpotId ?? tree.place.placeId;
      const hasAssignedSpot = Boolean(assignedSpotId);
      const inferredState = hasAssignedSpot
        ? (tree.listedPriceEth ? "listed" : "planted")
        : "ready_to_replant";
      const inferredPortable = hasAssignedSpot ? false : true;
      this.replaceTree({
        ...tree,
        lifecycleState: tree.lifecycleState ?? inferredState,
        portable: tree.portable ?? inferredPortable,
        currentSpotId: hasAssignedSpot ? assignedSpotId : undefined,
      });

      if (!hasAssignedSpot) {
        continue;
      }

      const spotId = assignedSpotId as string;
      const existingSpot = this.spots.find((spot) => spot.spotId === spotId);
      if (!existingSpot) {
        this.spots.push({
          spotId,
          placeId: tree.place.placeId,
          label: tree.place.label,
          lat: tree.place.lat,
          lng: tree.place.lng,
          claimState: tree.owner === ZERO_WALLET ? "unclaimed" : "claimed",
        });
      }
    }
  }

  private requireTree(treeId: string): DryadTree {
    const tree = this.getTree(treeId);
    if (!tree) throw new Error("tree_not_found");
    return tree;
  }

  private requireSpot(spotId: string): SpotRef {
    const spot = this.spots.find((item) => item.spotId === spotId);
    if (!spot) throw new Error("spot_not_found");
    return spot;
  }

  private replaceTree(next: DryadTree): void {
    const index = this.trees.findIndex((item) => item.treeId === next.treeId);
    if (index >= 0) this.trees[index] = next;
  }

  private replaceSpot(next: SpotRef): void {
    const index = this.spots.findIndex((item) => item.spotId === next.spotId);
    if (index >= 0) this.spots[index] = next;
  }

  private logEvent(treeId: string, state: TreeLifecycleEvent["state"], action: string, initiatedBy: WalletAddress, details?: string, txHash?: `0x${string}`): void {
    const entry: TreeLifecycleEvent = {
      eventId: this.newId("event"),
      treeId,
      state,
      action,
      at: new Date().toISOString(),
      initiatedBy,
      details,
      txHash,
    };
    const items = this.lifecycle.get(treeId) ?? [];
    items.push(entry);
    this.lifecycle.set(treeId, items);
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
