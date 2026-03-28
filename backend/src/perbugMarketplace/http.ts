import type { IncomingMessage, ServerResponse } from "node:http";

import type { PerbugMarketplaceService } from "./service.js";
import type { MarketplaceAssetType, MarketplaceSort } from "./types.js";
import { sendJson } from "../venues/claims/http.js";

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createPerbugMarketplaceHttpHandlers(service: PerbugMarketplaceService) {
  return {
    listListings: async (req: IncomingMessage, res: ServerResponse) => {
      const base = `http://${req.headers.host ?? "localhost"}`;
      const url = new URL(req.url ?? "/", base);
      const filters = {
        category: (url.searchParams.get("category") ?? undefined) as MarketplaceAssetType | undefined,
        status: (url.searchParams.get("status") ?? undefined) as never,
        rarity: (url.searchParams.get("rarity") ?? undefined) as never,
        provenanceTag: (url.searchParams.get("provenance") ?? undefined) as never,
        minPrice: toNumber(url.searchParams.get("minPrice")),
        maxPrice: toNumber(url.searchParams.get("maxPrice")),
        search: url.searchParams.get("q") ?? undefined,
      };
      const sort = (url.searchParams.get("sort") ?? "featured") as MarketplaceSort;
      sendJson(res, 200, service.listListings({ filters, sort }));
    },
    getListingDetail: async (_req: IncomingMessage, res: ServerResponse, listingId: string) => {
      const detail = service.getListingDetail(listingId);
      if (!detail) {
        sendJson(res, 404, { error: "listing_not_found" });
        return;
      }
      sendJson(res, 200, detail);
    },
    featuredListings: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { items: service.featuredListings() });
    },
    listByCategory: async (_req: IncomingMessage, res: ServerResponse, category: MarketplaceAssetType) => {
      sendJson(res, 200, service.listListings({ filters: { category } }));
    },
    search: async (req: IncomingMessage, res: ServerResponse) => {
      const base = `http://${req.headers.host ?? "localhost"}`;
      const url = new URL(req.url ?? "/", base);
      const q = url.searchParams.get("q") ?? "";
      sendJson(res, 200, service.listListings({ filters: { search: q } }));
    },
    categories: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { categories: service.categories() });
    },
    analytics: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.analyticsSnapshot());
    },
    capabilities: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, {
        createListingDraft: "planned",
        cancelListing: "planned",
        purchaseListing: "planned",
        sellerEligibleInventory: "planned",
        settlementBoundary: "separate_transaction_domain",
      });
    },
  };
}
