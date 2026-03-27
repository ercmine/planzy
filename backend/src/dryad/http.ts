import type { IncomingMessage, ServerResponse } from "node:http";

import type { DryadTree, WalletAddress } from "./domain.js";
import { validatePlantSeed } from "./seed.js";
import type { DryadMarketplaceService } from "./service.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";

function toTreeResponse(tree: DryadTree): Record<string, unknown> {
  const claimState = tree.owner === "0x0000000000000000000000000000000000000000" ? "claimable" : "planted";
  return {
    id: tree.treeId,
    name: `Dryad Tree ${tree.nftTokenId}`,
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
    treeImageUrl: `https://metadata.dryad.dev/trees/${tree.treeId}.svg`,
    lastWateredAt: tree.lastWateredAt ?? null,
    nextWateringAvailableAt: tree.nextWateringAvailableAt ?? null,
    waterCooldownSeconds: tree.waterCooldownSeconds ?? null,
  };
}

export function createDryadMarketplaceHttpHandlers(service: DryadMarketplaceService) {
  return {
    listTrees: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { trees: service.listMarketTrees().map(toTreeResponse) });
    },
    listOwnedTrees: async (_req: IncomingMessage, res: ServerResponse, wallet: WalletAddress) => {
      sendJson(res, 200, { trees: service.listOwnedTrees(wallet).map(toTreeResponse) });
    },
    listListings: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { trees: service.listMarketTrees().filter((t) => t.listedPriceEth).map(toTreeResponse) });
    },
    listUnclaimedSpots: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { spots: service.listUnclaimedSpots() });
    },
    worldSnapshot: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.worldSnapshot());
    },
    marketPulse: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.marketPulse());
    },
    mapPulse: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.mapPulse());
    },
    creatorTreeProfiles: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { creators: service.creatorTreeProfiles() });
    },
    listReplantableTrees: async (req: IncomingMessage, res: ServerResponse, wallet: WalletAddress) => {
      sendJson(res, 200, { trees: service.listReplantableTrees(wallet).map(toTreeResponse) });
    },
    tendQueue: async (_req: IncomingMessage, res: ServerResponse, wallet: WalletAddress) => {
      sendJson(res, 200, { tasks: service.tendQueue(wallet) });
    },
    progression: async (_req: IncomingMessage, res: ServerResponse, wallet: WalletAddress) => {
      sendJson(res, 200, service.progression(wallet));
    },
    returnTriggers: async (_req: IncomingMessage, res: ServerResponse, wallet: WalletAddress) => {
      sendJson(res, 200, { triggers: service.returnTriggers(wallet) });
    },
    watchTree: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const wallet = String(body.wallet ?? "") as WalletAddress;
      const treeId = String(body.treeId ?? "");
      sendJson(res, 200, service.watchTree(wallet, treeId));
    },
    unwatchTree: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const wallet = String(body.wallet ?? "") as WalletAddress;
      const treeId = String(body.treeId ?? "");
      sendJson(res, 200, service.unwatchTree(wallet, treeId));
    },
    loopMetrics: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.loopMetrics());
    },
    getTreeLifecycle: async (_req: IncomingMessage, res: ServerResponse, treeId: string) => {
      sendJson(res, 200, { events: service.getTreeLifecycle(treeId) });
    },
    getTree: async (_req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const tree = service.getTree(treeId);
      if (!tree) {
        sendJson(res, 404, { error: "tree_not_found" });
        return;
      }
      sendJson(res, 200, toTreeResponse(tree));
    },
    getDigUpEligibility: async (req: IncomingMessage, res: ServerResponse, treeId: string, wallet: WalletAddress) => {
      sendJson(res, 200, service.getDigUpEligibility(treeId, wallet));
    },
    getWaterEligibility: async (_req: IncomingMessage, res: ServerResponse, treeId: string, wallet: WalletAddress) => {
      sendJson(res, 200, service.getWaterEligibility(treeId, wallet));
    },
    createDigUpIntent: async (req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const intent = service.createDigUpIntent(
        treeId,
        String(body.wallet ?? "") as WalletAddress,
        Number(body.chainId ?? 0),
      );
      sendJson(res, 201, intent);
    },
    confirmDigUpIntent: async (req: IncomingMessage, res: ServerResponse, intentId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const intent = service.confirmDigUpIntent({
        intentId,
        paymentTxHash: String(body.paymentTxHash ?? "") as `0x${string}`,
        from: String(body.from ?? "") as WalletAddress,
        to: String(body.to ?? "") as WalletAddress,
        valueWei: String(body.valueWei ?? ""),
        chainId: Number(body.chainId ?? 0),
      });
      sendJson(res, 200, intent);
    },
    createReplantIntent: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const intent = service.createReplantIntent(
        String(body.treeId ?? ""),
        String(body.wallet ?? "") as WalletAddress,
        String(body.nextSpotId ?? ""),
      );
      sendJson(res, 201, intent);
    },
    confirmReplantIntent: async (_req: IncomingMessage, res: ServerResponse, intentId: string) => {
      const intent = service.confirmReplantIntent(intentId);
      sendJson(res, 200, intent);
    },
    claimAndPlant: async (req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const wallet = String(body.wallet ?? "") as WalletAddress;
      const seed = validatePlantSeed(String(body.seed ?? ""));
      const tree = service.claimAndPlant(treeId, wallet, seed);
      sendJson(res, 200, toTreeResponse(tree));
    },
    listTree: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const tree = service.listTree(String(body.treeId ?? ""), String(body.wallet ?? "") as WalletAddress, String(body.priceEth ?? "0"));
      sendJson(res, 200, toTreeResponse(tree));
    },
    unlistTree: async (req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const tree = service.unlistTree(treeId, String(body.wallet ?? "") as WalletAddress);
      sendJson(res, 200, toTreeResponse(tree));
    },
    buyTree: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const tree = service.buyTree(String(body.treeId ?? ""), String(body.buyerWallet ?? "") as WalletAddress);
      sendJson(res, 200, toTreeResponse(tree));
    },
    waterTree: async (req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const tree = service.waterTree(treeId, String(body.wallet ?? "") as WalletAddress);
      sendJson(res, 200, toTreeResponse(tree));
    }
  };
}
