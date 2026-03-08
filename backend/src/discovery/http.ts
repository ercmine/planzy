import type { IncomingMessage, ServerResponse } from "node:http";

import { readHeader, sendJson } from "../venues/claims/http.js";
import { QueryNormalizationService } from "./queryNormalization.js";
import {
  CategoryBrowseService,
  CityPageService,
  DiscoveryFeedService,
  NearbyDiscoveryService,
  PlaceSearchService,
  RecommendationService,
  TrendingService
} from "./services.js";

export interface DiscoveryHandlers {
  search(req: IncomingMessage, res: ServerResponse): Promise<void>;
  browse(req: IncomingMessage, res: ServerResponse): Promise<void>;
  cityPage(req: IncomingMessage, res: ServerResponse, citySlug: string): Promise<void>;
  nearby(req: IncomingMessage, res: ServerResponse): Promise<void>;
  trending(req: IncomingMessage, res: ServerResponse): Promise<void>;
  recommendations(req: IncomingMessage, res: ServerResponse): Promise<void>;
  relatedPlaces(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
  suggestedCreators(req: IncomingMessage, res: ServerResponse): Promise<void>;
  suggestedGuides(req: IncomingMessage, res: ServerResponse): Promise<void>;
  feed(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export interface DiscoveryHttpHandlerDeps {
  searchService: PlaceSearchService;
  browseService: CategoryBrowseService;
  nearbyService: NearbyDiscoveryService;
  trendingService: TrendingService;
  recommendationService: RecommendationService;
  cityPageService: CityPageService;
  feedService: DiscoveryFeedService;
}

export function createDiscoveryHttpHandlers(deps: DiscoveryHttpHandlerDeps): DiscoveryHandlers {
  const normalizer = new QueryNormalizationService();

  function requestContext(req: IncomingMessage) {
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    return { url, context: normalizer.normalize(url.searchParams) };
  }

  return {
    async search(req, res) {
      const { context } = requestContext(req);
      sendJson(res, 200, await deps.searchService.search(context));
    },
    async browse(req, res) {
      const { context } = requestContext(req);
      sendJson(res, 200, await deps.browseService.browse(context));
    },
    async cityPage(req, res, citySlug) {
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await deps.cityPageService.getCityPage(userId, citySlug.replace(/-/g, " ")));
    },
    async nearby(req, res) {
      const { context } = requestContext(req);
      sendJson(res, 200, await deps.nearbyService.nearby(context));
    },
    async trending(req, res) {
      const { context } = requestContext(req);
      sendJson(res, 200, await deps.trendingService.list(context));
    },
    async recommendations(req, res) {
      const { context } = requestContext(req);
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await deps.recommendationService.getPersonalizedRecommendations(userId, context));
    },
    async relatedPlaces(req, res, placeId) {
      const { context } = requestContext(req);
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await deps.recommendationService.getRelatedPlacesForPlace(userId, placeId, context));
    },
    async suggestedCreators(req, res) {
      const { context } = requestContext(req);
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await deps.recommendationService.getSuggestedCreators(userId, context));
    },
    async suggestedGuides(req, res) {
      const { context } = requestContext(req);
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await deps.recommendationService.getSuggestedGuides(userId, context));
    },
    async feed(req, res) {
      const { context, url } = requestContext(req);
      const userId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      const mode = (url.searchParams.get("mode") ?? "for_you") as Parameters<typeof deps.feedService.feed>[1];
      sendJson(res, 200, await deps.feedService.feed(userId, mode, context));
    }
  };
}
