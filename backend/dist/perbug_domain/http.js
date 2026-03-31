import { validatePlantSeed } from "./seed.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
function toTreeResponse(tree) {
    const claimState = tree.owner === "0x0000000000000000000000000000000000000000" ? "claimable" : "planted";
    return {
        id: tree.treeId,
        name: `Perbug Tree ${tree.nftTokenId}`,
        placeName: tree.place.label,
        locationLabel: tree.place.label,
        latitude: tree.place.lat,
        longitude: tree.place.lng,
        founderHandle: tree.founder,
        ownerHandle: tree.owner,
        growthLevel: tree.growthLevel,
        contributionCount: tree.contributionCount,
        rarity: "Rare",
        category: "Location",
        claimState,
        saleStatus: tree.listedPriceEth ? "listed" : "not_listed",
        lifecycleState: tree.lifecycleState ?? "planted",
        isPortable: tree.portable === true,
        currentSpotId: tree.currentSpotId ?? null,
        digUpTxHash: tree.digUpTxHash ?? null,
        priceEth: tree.listedPriceEth == null ? null : Number(tree.listedPriceEth),
        treeImageUrl: `https://metadata.perbug.dev/trees/${tree.treeId}.svg`,
        lastWateredAt: tree.lastWateredAt ?? null,
        nextWateringAvailableAt: tree.nextWateringAvailableAt ?? null,
        waterCooldownSeconds: tree.waterCooldownSeconds ?? null,
    };
}
export function createPerbugMarketplaceHttpHandlers(service) {
    return {
        listTrees: async (_req, res) => {
            sendJson(res, 200, { trees: service.listMarketTrees().map(toTreeResponse) });
        },
        listOwnedTrees: async (_req, res, wallet) => {
            sendJson(res, 200, { trees: service.listOwnedTrees(wallet).map(toTreeResponse) });
        },
        listListings: async (_req, res) => {
            sendJson(res, 200, { trees: service.listMarketTrees().filter((t) => t.listedPriceEth).map(toTreeResponse) });
        },
        listUnclaimedSpots: async (_req, res) => {
            sendJson(res, 200, { spots: service.listUnclaimedSpots() });
        },
        worldSnapshot: async (_req, res) => {
            sendJson(res, 200, service.worldSnapshot());
        },
        marketPulse: async (_req, res) => {
            sendJson(res, 200, service.marketPulse());
        },
        mapPulse: async (_req, res) => {
            sendJson(res, 200, service.mapPulse());
        },
        creatorTreeProfiles: async (_req, res) => {
            sendJson(res, 200, { creators: service.creatorTreeProfiles() });
        },
        listReplantableTrees: async (req, res, wallet) => {
            sendJson(res, 200, { trees: service.listReplantableTrees(wallet).map(toTreeResponse) });
        },
        tendQueue: async (_req, res, wallet) => {
            sendJson(res, 200, { tasks: service.tendQueue(wallet) });
        },
        progression: async (_req, res, wallet) => {
            sendJson(res, 200, service.progression(wallet));
        },
        returnTriggers: async (_req, res, wallet) => {
            sendJson(res, 200, { triggers: service.returnTriggers(wallet) });
        },
        watchTree: async (req, res) => {
            const body = await parseJsonBody(req);
            const wallet = String(body.wallet ?? "");
            const treeId = String(body.treeId ?? "");
            sendJson(res, 200, service.watchTree(wallet, treeId));
        },
        unwatchTree: async (req, res) => {
            const body = await parseJsonBody(req);
            const wallet = String(body.wallet ?? "");
            const treeId = String(body.treeId ?? "");
            sendJson(res, 200, service.unwatchTree(wallet, treeId));
        },
        loopMetrics: async (_req, res) => {
            sendJson(res, 200, service.loopMetrics());
        },
        getTreeLifecycle: async (_req, res, treeId) => {
            sendJson(res, 200, { events: service.getTreeLifecycle(treeId) });
        },
        getTree: async (_req, res, treeId) => {
            const tree = service.getTree(treeId);
            if (!tree) {
                sendJson(res, 404, { error: "tree_not_found" });
                return;
            }
            sendJson(res, 200, toTreeResponse(tree));
        },
        getDigUpEligibility: async (req, res, treeId, wallet) => {
            sendJson(res, 200, service.getDigUpEligibility(treeId, wallet));
        },
        getWaterEligibility: async (_req, res, treeId, wallet) => {
            sendJson(res, 200, service.getWaterEligibility(treeId, wallet));
        },
        createDigUpIntent: async (req, res, treeId) => {
            const body = await parseJsonBody(req);
            const intent = service.createDigUpIntent(treeId, String(body.wallet ?? ""), Number(body.chainId ?? 0));
            sendJson(res, 201, intent);
        },
        confirmDigUpIntent: async (req, res, intentId) => {
            const body = await parseJsonBody(req);
            const intent = service.confirmDigUpIntent({
                intentId,
                paymentTxHash: String(body.paymentTxHash ?? ""),
                from: String(body.from ?? ""),
                to: String(body.to ?? ""),
                valueWei: String(body.valueWei ?? ""),
                chainId: Number(body.chainId ?? 0),
            });
            sendJson(res, 200, intent);
        },
        createReplantIntent: async (req, res) => {
            const body = await parseJsonBody(req);
            const intent = service.createReplantIntent(String(body.treeId ?? ""), String(body.wallet ?? ""), String(body.nextSpotId ?? ""));
            sendJson(res, 201, intent);
        },
        confirmReplantIntent: async (_req, res, intentId) => {
            const intent = service.confirmReplantIntent(intentId);
            sendJson(res, 200, intent);
        },
        claimAndPlant: async (req, res, treeId) => {
            const body = await parseJsonBody(req);
            const wallet = String(body.wallet ?? "");
            const seed = validatePlantSeed(String(body.seed ?? ""));
            const tree = service.claimAndPlant(treeId, wallet, seed);
            sendJson(res, 200, toTreeResponse(tree));
        },
        listTree: async (req, res) => {
            const body = await parseJsonBody(req);
            const tree = service.listTree(String(body.treeId ?? ""), String(body.wallet ?? ""), String(body.priceEth ?? "0"));
            sendJson(res, 200, toTreeResponse(tree));
        },
        unlistTree: async (req, res, treeId) => {
            const body = await parseJsonBody(req);
            const tree = service.unlistTree(treeId, String(body.wallet ?? ""));
            sendJson(res, 200, toTreeResponse(tree));
        },
        buyTree: async (req, res) => {
            const body = await parseJsonBody(req);
            const tree = service.buyTree(String(body.treeId ?? ""), String(body.buyerWallet ?? ""));
            sendJson(res, 200, toTreeResponse(tree));
        },
        waterTree: async (req, res, treeId) => {
            const body = await parseJsonBody(req);
            const tree = service.waterTree(treeId, String(body.wallet ?? ""));
            sendJson(res, 200, toTreeResponse(tree));
        }
    };
}
