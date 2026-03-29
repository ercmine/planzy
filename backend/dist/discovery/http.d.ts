import type { IncomingMessage, ServerResponse } from "node:http";
import { CategoryBrowseService, CityPageService, DiscoveryFeedService, NearbyDiscoveryService, PlaceSearchService, RecommendationService, TrendingService } from "./services.js";
import type { PremiumExperienceService } from "../subscriptions/premiumExperience.js";
import type { AnalyticsService } from "../analytics/service.js";
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
    premiumExperienceState(req: IncomingMessage, res: ServerResponse): Promise<void>;
    premiumDiscoveryModules(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
export interface DiscoveryHttpHandlerDeps {
    searchService: PlaceSearchService;
    browseService: CategoryBrowseService;
    nearbyService: NearbyDiscoveryService;
    trendingService: TrendingService;
    recommendationService: RecommendationService;
    cityPageService: CityPageService;
    feedService: DiscoveryFeedService;
    premiumExperience: PremiumExperienceService;
    analyticsService?: AnalyticsService;
}
export declare function createDiscoveryHttpHandlers(deps: DiscoveryHttpHandlerDeps): DiscoveryHandlers;
