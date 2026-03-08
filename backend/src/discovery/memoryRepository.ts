import type {
  CreatorDocument,
  GuideDocument,
  PlaceDiscoveryRepository,
  PlaceDocument,
  UserRecommendationProfile
} from "./types.js";

export class InMemoryDiscoveryRepository implements PlaceDiscoveryRepository {
  constructor(
    private readonly places: PlaceDocument[] = [],
    private readonly profiles: UserRecommendationProfile[] = [],
    private readonly creators: CreatorDocument[] = [],
    private readonly guides: GuideDocument[] = []
  ) {}

  async listPlaces(): Promise<PlaceDocument[]> {
    return this.places;
  }

  async listCreators(): Promise<CreatorDocument[]> {
    return this.creators;
  }

  async listGuides(): Promise<GuideDocument[]> {
    return this.guides;
  }

  async getRecommendationProfile(userId: string): Promise<UserRecommendationProfile | undefined> {
    return this.profiles.find((profile) => profile.userId === userId);
  }
}
