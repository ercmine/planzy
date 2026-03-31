import { PERBUG_CONTRACTS } from "./contracts.js";
const MAX_PLANT_DISTANCE_METERS = 120;
const ZERO_WALLET = "0x0000000000000000000000000000000000000000";
const DIG_UP_FEE_WEI = "100000000000000000";
const DIG_UP_FEE_ETH = "0.1";
const DIG_UP_FEE_RECIPIENT = "0xB7cfa0de6975311DD0fFF05f71FD2110caC0B227";
const WATER_COOLDOWN_SECONDS = 60 * 60 * 6;
export class PerbugMarketplaceService {
    trees;
    contributions;
    spots;
    digUpIntents;
    replantIntents;
    lifecycle;
    seenTx;
    watchedTreesByWallet = new Map();
    firstPlantWallets = new Set();
    firstWaterWallets = new Set();
    firstMarketBuyWallets = new Set();
    firstReplantWallets = new Set();
    tendingSessionsByWallet = new Map();
    constructor(trees = [], contributions = [], spots = [], digUpIntents = new Map(), replantIntents = new Map(), lifecycle = new Map(), seenTx = new Set()) {
        this.trees = trees;
        this.contributions = contributions;
        this.spots = spots;
        this.digUpIntents = digUpIntents;
        this.replantIntents = replantIntents;
        this.lifecycle = lifecycle;
        this.seenTx = seenTx;
        this.seedTreeDefaults();
    }
    listMarketTrees() {
        return this.trees;
    }
    worldSnapshot() {
        return {
            generatedAt: new Date().toISOString(),
            map: this.mapPulse(),
            market: this.marketPulse(),
            creatorProfiles: this.creatorTreeProfiles(),
            trendingTreeIds: this.trendingTreeIds(),
        };
    }
    listUnclaimedSpots() {
        const reservedSpotIds = new Set(Array.from(this.replantIntents.values())
            .filter((intent) => intent.status === "created")
            .map((intent) => intent.nextSpotId));
        return this.spots.map((spot) => {
            const claimState = reservedSpotIds.has(spot.spotId) && spot.claimState === "unclaimed" ? "reserved" : spot.claimState;
            return { ...spot, claimState };
        });
    }
    listReplantableTrees(wallet) {
        return this.trees.filter((tree) => tree.owner.toLowerCase() === wallet.toLowerCase() && tree.portable === true);
    }
    getTreeLifecycle(treeId) {
        return this.lifecycle.get(treeId) ?? [];
    }
    getTree(treeId) {
        return this.trees.find((tree) => tree.treeId === treeId);
    }
    listOwnedTrees(wallet) {
        return this.trees.filter((tree) => tree.owner.toLowerCase() === wallet.toLowerCase());
    }
    claimAndPlant(treeId, wallet, seed) {
        const tree = this.requireTree(treeId);
        if (tree.owner !== ZERO_WALLET) {
            throw new Error("tree_not_claimable");
        }
        const targetSpot = this.requireSpot(tree.currentSpotId ?? tree.place.placeId);
        if (targetSpot.claimState !== "unclaimed") {
            throw new Error("spot_not_available");
        }
        const updated = {
            ...tree,
            owner: wallet,
            lifecycleState: "planted",
            portable: false,
            currentSpotId: targetSpot.spotId,
        };
        this.replaceTree(updated);
        this.replaceSpot({ ...targetSpot, claimState: "claimed" });
        this.logEvent(updated.treeId, "planted", "claim_and_plant", wallet, `seed:${seed}`);
        this.firstPlantWallets.add(wallet);
        return updated;
    }
    listTree(treeId, wallet, priceEth) {
        const tree = this.requireTree(treeId);
        if (tree.owner.toLowerCase() !== wallet.toLowerCase())
            throw new Error("forbidden_owner_mismatch");
        if (tree.portable)
            throw new Error("portable_tree_cannot_be_listed");
        const updated = { ...tree, listedPriceEth: priceEth, lifecycleState: "listed" };
        this.replaceTree(updated);
        this.logEvent(treeId, "listed", "list_tree", wallet, `Listed for ${priceEth} ETH`);
        return updated;
    }
    unlistTree(treeId, wallet) {
        const tree = this.requireTree(treeId);
        if (tree.owner.toLowerCase() != wallet.toLowerCase())
            throw new Error("forbidden_owner_mismatch");
        const updated = { ...tree, listedPriceEth: undefined, lifecycleState: "planted" };
        this.replaceTree(updated);
        this.logEvent(treeId, "planted", "unlist_tree", wallet);
        return updated;
    }
    buyTree(treeId, buyerWallet) {
        const tree = this.requireTree(treeId);
        if (!tree.listedPriceEth)
            throw new Error("tree_not_listed");
        const updated = { ...tree, owner: buyerWallet, listedPriceEth: undefined, lifecycleState: "sold", portable: false };
        this.replaceTree(updated);
        this.logEvent(treeId, "sold", "buy_tree", buyerWallet);
        this.firstMarketBuyWallets.add(buyerWallet);
        return updated;
    }
    getWaterEligibility(treeId, wallet) {
        const tree = this.requireTree(treeId);
        const now = new Date();
        if (tree.owner.toLowerCase() !== wallet.toLowerCase()) {
            return { treeId, wallet, eligible: false, reason: "forbidden_owner_mismatch", now: now.toISOString() };
        }
        if (tree.owner === ZERO_WALLET) {
            return { treeId, wallet, eligible: false, reason: "tree_not_owned", now: now.toISOString() };
        }
        const next = tree.nextWateringAvailableAt ? new Date(tree.nextWateringAvailableAt) : null;
        if (next && next.getTime() > now.getTime()) {
            return { treeId, wallet, eligible: false, reason: "watering_cooldown_active", now: now.toISOString(), nextEligibleAt: next.toISOString() };
        }
        return { treeId, wallet, eligible: true, now: now.toISOString() };
    }
    waterTree(treeId, wallet) {
        const eligibility = this.getWaterEligibility(treeId, wallet);
        if (!eligibility.eligible)
            throw new Error(eligibility.reason ?? "watering_not_allowed");
        const tree = this.requireTree(treeId);
        const now = new Date();
        const next = new Date(now.getTime() + WATER_COOLDOWN_SECONDS * 1000);
        const updated = {
            ...tree,
            growthLevel: tree.growthLevel + 1,
            contributionCount: tree.contributionCount + 1,
            lastWateredAt: now.toISOString(),
            nextWateringAvailableAt: next.toISOString(),
            waterCooldownSeconds: WATER_COOLDOWN_SECONDS,
        };
        this.replaceTree(updated);
        this.logEvent(treeId, updated.lifecycleState ?? "planted", "water_tree_remote", wallet);
        this.firstWaterWallets.add(wallet);
        this.bumpTendSession(wallet);
        return updated;
    }
    getDigUpEligibility(treeId, wallet) {
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
    createDigUpIntent(treeId, wallet, chainId) {
        const eligibility = this.getDigUpEligibility(treeId, wallet);
        if (!eligibility.eligible)
            throw new Error(eligibility.reason ?? "tree_not_eligible_for_dig_up");
        const intent = {
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
    confirmDigUpIntent(params) {
        const intent = this.digUpIntents.get(params.intentId);
        if (!intent)
            throw new Error("dig_up_intent_not_found");
        if (intent.status === "confirmed")
            throw new Error("dig_up_already_confirmed");
        if (this.seenTx.has(params.paymentTxHash.toLowerCase()))
            throw new Error("payment_already_processed");
        if (intent.ownerWallet.toLowerCase() !== params.from.toLowerCase())
            throw new Error("payment_sender_mismatch");
        if (intent.feeRecipient.toLowerCase() !== params.to.toLowerCase())
            throw new Error("invalid_fee_recipient");
        if (intent.feeWei !== params.valueWei)
            throw new Error("invalid_fee_amount");
        if (intent.chainId !== params.chainId)
            throw new Error("wrong_chain");
        const tree = this.requireTree(intent.treeId);
        if (tree.owner.toLowerCase() !== intent.ownerWallet.toLowerCase())
            throw new Error("forbidden_owner_mismatch");
        const oldSpotId = tree.currentSpotId;
        if (oldSpotId) {
            const oldSpot = this.requireSpot(oldSpotId);
            this.replaceSpot({ ...oldSpot, claimState: "unclaimed" });
        }
        const confirmedAt = new Date().toISOString();
        const confirmedIntent = {
            ...intent,
            status: "confirmed",
            paymentTxHash: params.paymentTxHash,
            paymentConfirmedAt: confirmedAt,
        };
        this.digUpIntents.set(intent.intentId, confirmedIntent);
        const updatedTree = {
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
    createReplantIntent(treeId, wallet, nextSpotId) {
        const tree = this.requireTree(treeId);
        if (tree.owner.toLowerCase() !== wallet.toLowerCase())
            throw new Error("forbidden_owner_mismatch");
        if (!tree.portable || tree.lifecycleState !== "ready_to_replant")
            throw new Error("tree_not_ready_to_replant");
        const spot = this.requireSpot(nextSpotId);
        if (spot.claimState !== "unclaimed")
            throw new Error("spot_not_available");
        const spotReserved = Array.from(this.replantIntents.values()).some((intent) => intent.nextSpotId === nextSpotId && intent.status === "created");
        if (spotReserved)
            throw new Error("spot_pending_claim");
        const intent = {
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
    confirmReplantIntent(intentId) {
        const intent = this.replantIntents.get(intentId);
        if (!intent)
            throw new Error("replant_intent_not_found");
        if (intent.status === "confirmed")
            throw new Error("replant_already_confirmed");
        const tree = this.requireTree(intent.treeId);
        if (!tree.portable || tree.lifecycleState !== "ready_to_replant")
            throw new Error("tree_not_ready_to_replant");
        const spot = this.requireSpot(intent.nextSpotId);
        if (spot.claimState !== "unclaimed")
            throw new Error("spot_not_available");
        const confirmedAt = new Date().toISOString();
        this.replaceSpot({ ...spot, claimState: "claimed" });
        const updatedTree = {
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
        const confirmed = { ...intent, status: "confirmed", confirmedAt };
        this.replantIntents.set(intent.intentId, confirmed);
        this.logEvent(tree.treeId, "replanted", "replant_confirmed", intent.ownerWallet, `Spot ${spot.spotId}`);
        this.firstReplantWallets.add(intent.ownerWallet);
        return confirmed;
    }
    evaluatePlantEligibility(input) {
        const eligible = input.distanceMeters <= MAX_PLANT_DISTANCE_METERS;
        return {
            ...input,
            eligible,
            maxDistanceMeters: MAX_PLANT_DISTANCE_METERS,
            reason: eligible ? undefined : "User is not close enough to claim this place.",
        };
    }
    summarizeGrove(wallet) {
        const foundedTreeIds = this.trees.filter((tree) => tree.founder === wallet).map((tree) => tree.treeId);
        const ownedTreeIds = this.trees.filter((tree) => tree.owner === wallet).map((tree) => tree.treeId);
        const contributedTreeIds = this.contributions.filter((item) => item.contributor === wallet).map((item) => item.treeId);
        const watchlistTreeIds = Array.from(this.watchedTreesByWallet.get(wallet) ?? []);
        return { wallet, foundedTreeIds, ownedTreeIds, contributedTreeIds, watchlistTreeIds };
    }
    watchTree(wallet, treeId) {
        this.requireTree(treeId);
        const existing = this.watchedTreesByWallet.get(wallet) ?? new Set();
        existing.add(treeId);
        this.watchedTreesByWallet.set(wallet, existing);
        return this.summarizeGrove(wallet);
    }
    unwatchTree(wallet, treeId) {
        const existing = this.watchedTreesByWallet.get(wallet);
        existing?.delete(treeId);
        return this.summarizeGrove(wallet);
    }
    tendQueue(wallet) {
        const now = Date.now();
        const tasks = this.listOwnedTrees(wallet).map((tree) => {
            if (tree.lifecycleState === "ready_to_replant" || tree.portable) {
                return { treeId: tree.treeId, priority: "urgent", reason: "ready_to_replant", title: "Replant to get back on the world map" };
            }
            if (tree.listedPriceEth) {
                return { treeId: tree.treeId, priority: "soon", reason: "listed", title: "Listing is live — monitor buyer activity" };
            }
            if (!tree.nextWateringAvailableAt) {
                return { treeId: tree.treeId, priority: "urgent", reason: "needs_watering", title: "Needs water now" };
            }
            const next = new Date(tree.nextWateringAvailableAt).getTime();
            if (next <= now) {
                return { treeId: tree.treeId, priority: "urgent", reason: "needs_watering", title: "Ready for watering", dueAt: tree.nextWateringAvailableAt };
            }
            return { treeId: tree.treeId, priority: "stable", reason: "cooldown", title: "Cooling down until next watering", dueAt: tree.nextWateringAvailableAt };
        });
        this.bumpTendSession(wallet);
        return tasks.sort((a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority));
    }
    mapPulse() {
        const plantedTrees = this.trees.filter((tree) => !tree.portable && tree.owner !== ZERO_WALLET);
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const replantedCount24h = Array.from(this.lifecycle.values())
            .flat()
            .filter((event) => event.action === "replant_confirmed" && now - new Date(event.at).getTime() <= dayMs).length;
        const newlyPlantedTreeIds = Array.from(this.lifecycle.values())
            .flat()
            .filter((event) => event.action === "claim_and_plant" && now - new Date(event.at).getTime() <= dayMs)
            .map((event) => event.treeId);
        const regionCounts = new Map();
        for (const tree of plantedTrees) {
            const regionKey = `${tree.place.lat.toFixed(1)},${tree.place.lng.toFixed(1)}`;
            regionCounts.set(regionKey, (regionCounts.get(regionKey) ?? 0) + 1);
        }
        const hottestRegions = Array.from(regionCounts.entries())
            .map(([regionKey, activityCount]) => ({ regionKey, activityCount }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 5);
        return {
            plantedTreeCount: plantedTrees.length,
            replantedCount24h,
            newlyPlantedTreeIds,
            hottestRegions,
        };
    }
    marketPulse() {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const listed = this.trees.filter((tree) => Boolean(tree.listedPriceEth));
        const soldCount24h = Array.from(this.lifecycle.values())
            .flat()
            .filter((event) => event.action === "buy_tree" && now - new Date(event.at).getTime() <= dayMs).length;
        const newlyListedTreeIds = Array.from(this.lifecycle.values())
            .flat()
            .filter((event) => event.action === "list_tree" && now - new Date(event.at).getTime() <= dayMs)
            .map((event) => event.treeId);
        const recentlyReplantedTreeIds = Array.from(this.lifecycle.values())
            .flat()
            .filter((event) => event.action === "replant_confirmed" && now - new Date(event.at).getTime() <= dayMs)
            .map((event) => event.treeId);
        return {
            listedCount: listed.length,
            soldCount24h,
            newlyListedTreeIds,
            recentlyReplantedTreeIds,
            trendingTreeIds: this.trendingTreeIds(),
        };
    }
    creatorTreeProfiles() {
        const byCreator = new Map();
        for (const tree of this.trees) {
            const existing = byCreator.get(tree.founder) ?? [];
            existing.push(tree);
            byCreator.set(tree.founder, existing);
        }
        return Array.from(byCreator.entries()).map(([creatorWallet, trees]) => {
            const totalWaterCount = trees.reduce((sum, tree) => sum + tree.contributionCount, 0);
            const totalGrowthLevel = trees.reduce((sum, tree) => sum + tree.growthLevel, 0);
            return {
                creatorWallet,
                treeIds: trees.map((tree) => tree.treeId),
                totalWaterCount,
                totalGrowthLevel,
                supportMomentum: totalWaterCount >= 20 ? "rising" : "steady",
            };
        });
    }
    progression(wallet) {
        const owned = this.listOwnedTrees(wallet);
        const regions = new Set(owned.map((tree) => `${tree.place.lat.toFixed(1)},${tree.place.lng.toFixed(1)}`));
        const totalWaterActions = owned.reduce((sum, tree) => sum + tree.contributionCount, 0);
        return {
            ownedTreeCount: owned.length,
            regionsPlantedCount: regions.size,
            totalWaterActions,
            plantedMilestoneNext: this.nextMilestone(owned.length, [1, 3, 5, 8, 13, 21]),
            wateredMilestoneNext: this.nextMilestone(totalWaterActions, [5, 10, 25, 50, 100, 250]),
        };
    }
    returnTriggers(wallet) {
        const triggers = [];
        const now = Date.now();
        const watchlist = this.watchedTreesByWallet.get(wallet) ?? new Set();
        const ownedTrees = this.listOwnedTrees(wallet);
        for (const tree of ownedTrees) {
            if (!tree.nextWateringAvailableAt || new Date(tree.nextWateringAvailableAt).getTime() <= now) {
                triggers.push({ kind: "tree_needs_water", treeId: tree.treeId, message: "Your tree is ready for watering.", createdAt: new Date().toISOString() });
            }
            const recentSupport = this.getTreeLifecycle(tree.treeId).find((event) => event.action === "water_tree_remote");
            if (recentSupport) {
                triggers.push({ kind: "tree_received_support", treeId: tree.treeId, message: "Your tree received support and grew.", createdAt: recentSupport.at });
            }
        }
        for (const treeId of watchlist) {
            const tree = this.getTree(treeId);
            if (!tree)
                continue;
            if (tree.listedPriceEth) {
                triggers.push({ kind: "watchlist_tree_listed", treeId, message: "A watched tree is now listed.", createdAt: new Date().toISOString() });
            }
            const moved = this.getTreeLifecycle(treeId).find((event) => ["replant_confirmed", "dig_up_payment_confirmed"].includes(event.action));
            if (moved) {
                triggers.push({ kind: "watchlist_tree_moved", treeId, message: "A watched tree moved location.", createdAt: moved.at });
            }
        }
        return triggers.slice(0, 15);
    }
    loopMetrics() {
        const repeatTendingWallets = Array.from(this.tendingSessionsByWallet.values()).filter((count) => count >= 2).length;
        return {
            firstPlantCompletedWallets: this.firstPlantWallets.size,
            firstWaterActionWallets: this.firstWaterWallets.size,
            firstMarketplaceBuyWallets: this.firstMarketBuyWallets.size,
            firstReplantWallets: this.firstReplantWallets.size,
            repeatTendingWallets,
        };
    }
    chainContracts() {
        return PERBUG_CONTRACTS;
    }
    digUpConfig() {
        return { feeWei: DIG_UP_FEE_WEI, feeEth: DIG_UP_FEE_ETH, recipient: DIG_UP_FEE_RECIPIENT };
    }
    trendingTreeIds() {
        return [...this.trees]
            .sort((a, b) => (b.contributionCount + b.growthLevel) - (a.contributionCount + a.growthLevel))
            .slice(0, 8)
            .map((tree) => tree.treeId);
    }
    nextMilestone(current, thresholds) {
        return thresholds.find((value) => value > current) ?? thresholds[thresholds.length - 1];
    }
    bumpTendSession(wallet) {
        this.tendingSessionsByWallet.set(wallet, (this.tendingSessionsByWallet.get(wallet) ?? 0) + 1);
    }
    priorityRank(priority) {
        if (priority === "urgent")
            return 0;
        if (priority === "soon")
            return 1;
        return 2;
    }
    seedTreeDefaults() {
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
            const spotId = assignedSpotId;
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
    requireTree(treeId) {
        const tree = this.getTree(treeId);
        if (!tree)
            throw new Error("tree_not_found");
        return tree;
    }
    requireSpot(spotId) {
        const spot = this.spots.find((item) => item.spotId === spotId);
        if (!spot)
            throw new Error("spot_not_found");
        return spot;
    }
    replaceTree(next) {
        const index = this.trees.findIndex((item) => item.treeId === next.treeId);
        if (index >= 0)
            this.trees[index] = next;
    }
    replaceSpot(next) {
        const index = this.spots.findIndex((item) => item.spotId === next.spotId);
        if (index >= 0)
            this.spots[index] = next;
    }
    logEvent(treeId, state, action, initiatedBy, details, txHash) {
        const entry = {
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
    newId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    }
}
