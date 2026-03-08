import type { PlaceDiscoveryRepository, PlaceDocument, RecommendationProfile } from "./types.js";

export class InMemoryDiscoveryRepository implements PlaceDiscoveryRepository {
  constructor(
    private readonly places: PlaceDocument[] = [],
    private readonly profiles: RecommendationProfile[] = []
  ) {}

  async listPlaces(): Promise<PlaceDocument[]> {
    return this.places;
  }

  async getRecommendationProfile(userId: string): Promise<RecommendationProfile | undefined> {
    return this.profiles.find((profile) => profile.userId === userId);
  }
}
