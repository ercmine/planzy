import type { IncomingMessage, ServerResponse } from "node:http";
import type { PerbugMarketplaceService } from "./service.js";
import type { MarketplaceAssetType } from "./types.js";
export declare function createPerbugMarketplaceHttpHandlers(service: PerbugMarketplaceService): {
    listListings: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    getListingDetail: (_req: IncomingMessage, res: ServerResponse, listingId: string) => Promise<void>;
    featuredListings: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    listByCategory: (_req: IncomingMessage, res: ServerResponse, category: MarketplaceAssetType) => Promise<void>;
    search: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    categories: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    analytics: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    capabilities: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
