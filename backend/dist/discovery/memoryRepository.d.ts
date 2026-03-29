import type { CreatorDocument, GuideDocument, PlaceDiscoveryRepository, PlaceDocument, UserRecommendationProfile } from "./types.js";
export declare class InMemoryDiscoveryRepository implements PlaceDiscoveryRepository {
    private readonly places;
    private readonly profiles;
    private readonly creators;
    private readonly guides;
    constructor(places?: PlaceDocument[], profiles?: UserRecommendationProfile[], creators?: CreatorDocument[], guides?: GuideDocument[]);
    listPlaces(): Promise<PlaceDocument[]>;
    listCreators(): Promise<CreatorDocument[]>;
    listGuides(): Promise<GuideDocument[]>;
    getRecommendationProfile(userId: string): Promise<UserRecommendationProfile | undefined>;
}
