export class InMemoryDiscoveryRepository {
    places;
    profiles;
    creators;
    guides;
    constructor(places = [], profiles = [], creators = [], guides = []) {
        this.places = places;
        this.profiles = profiles;
        this.creators = creators;
        this.guides = guides;
    }
    async listPlaces() {
        return this.places;
    }
    async listCreators() {
        return this.creators;
    }
    async listGuides() {
        return this.guides;
    }
    async getRecommendationProfile(userId) {
        return this.profiles.find((profile) => profile.userId === userId);
    }
}
