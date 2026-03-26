import type { IncomingMessage, ServerResponse } from "node:http";

import type { DryadTree, WalletAddress } from "./domain.js";
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
    priceEth: tree.listedPriceEth == null ? null : Number(tree.listedPriceEth),
    treeImageUrl: `https://metadata.dryad.dev/trees/${tree.treeId}.svg`
  };
}

export function createDryadMarketplaceHttpHandlers(service: DryadMarketplaceService) {
  return {
    listTrees: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { trees: service.listMarketTrees().map(toTreeResponse) });
    },
    listListings: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { trees: service.listMarketTrees().filter((t) => t.listedPriceEth).map(toTreeResponse) });
    },
    getTree: async (_req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const tree = service.getTree(treeId);
      if (!tree) {
        sendJson(res, 404, { error: "tree_not_found" });
        return;
      }
      sendJson(res, 200, toTreeResponse(tree));
    },
    claimAndPlant: async (req: IncomingMessage, res: ServerResponse, treeId: string) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const wallet = String(body.wallet ?? "") as WalletAddress;
      const tree = service.claimAndPlant(treeId, wallet);
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
    }
  };
}
