import type { BrowseResponse, CityPageResponse, DiscoveryFeedCard, DiscoveryFeedMode, DiscoveryFeedResponse, DiscoveryQueryContext, NearbyResponse, PlaceDiscoveryRepository, RecommendationsResponse, RelatedPlacesResponse, SearchResponse, SuggestedCreatorsResponse, SuggestedGuidesResponse, TrendingResponse } from "./types.js";
import type { PremiumExperienceService } from "../subscriptions/premiumExperience.js";
import { RankingConfigResolver } from "./tuning.js";
export declare class PlaceSearchService {
    private readonly repo;
    private readonly resolver?;
    constructor(repo: PlaceDiscoveryRepository, resolver?: RankingConfigResolver | undefined);
    search(context: DiscoveryQueryContext): Promise<SearchResponse>;
}
export declare class CategoryBrowseService {
    private readonly repo;
    private readonly resolver?;
    constructor(repo: PlaceDiscoveryRepository, resolver?: RankingConfigResolver | undefined);
    browse(context: DiscoveryQueryContext): Promise<BrowseResponse>;
}
export declare class NearbyDiscoveryService {
    private readonly repo;
    private readonly resolver?;
    constructor(repo: PlaceDiscoveryRepository, resolver?: RankingConfigResolver | undefined);
    nearby(context: DiscoveryQueryContext): Promise<NearbyResponse>;
}
export declare class TrendingService {
    private readonly repo;
    private readonly resolver?;
    constructor(repo: PlaceDiscoveryRepository, resolver?: RankingConfigResolver | undefined);
    list(context: DiscoveryQueryContext): Promise<TrendingResponse>;
}
export declare class RecommendationService {
    private readonly repo;
    private readonly premiumExperience?;
    private readonly resolver?;
    private readonly generator;
    private readonly scorer;
    private readonly balancer;
    constructor(repo: PlaceDiscoveryRepository, premiumExperience?: PremiumExperienceService | undefined, resolver?: RankingConfigResolver | undefined);
    getPersonalizedRecommendations(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse>;
    getRecommendedPlacesForContext(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse>;
    recommend(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse>;
    getRelatedPlacesForPlace(userId: string | undefined, placeId: string, context: DiscoveryQueryContext): Promise<RelatedPlacesResponse>;
    getSuggestedCreators(userId: string | undefined, context: DiscoveryQueryContext): Promise<SuggestedCreatorsResponse>;
    getSuggestedGuides(userId: string | undefined, context: DiscoveryQueryContext): Promise<SuggestedGuidesResponse>;
}
export declare class AdInsertionService {
    insertEveryTen(organic: DiscoveryFeedCard[]): DiscoveryFeedCard[];
}
export declare class DiscoveryFeedService {
    private readonly recommendationService;
    private readonly nearbyService;
    private readonly trendingService;
    private readonly browseService;
    private readonly searchService;
    private readonly premiumExperience?;
    private readonly adService;
    constructor(recommendationService: RecommendationService, nearbyService: NearbyDiscoveryService, trendingService: TrendingService, browseService: CategoryBrowseService, searchService: PlaceSearchService, premiumExperience?: PremiumExperienceService | undefined);
    feed(userId: string | undefined, mode: DiscoveryFeedMode, context: DiscoveryQueryContext): Promise<DiscoveryFeedResponse>;
}
export declare class CityPageService {
    private readonly trendingService;
    private readonly recommendationService;
    private readonly browseService;
    constructor(trendingService: TrendingService, recommendationService: RecommendationService, browseService: CategoryBrowseService);
    getCityPage(userId: string | undefined, city: string): Promise<CityPageResponse>;
}
