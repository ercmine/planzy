const defaultDefinitions = [
    {
        id: "first-footprint",
        kind: "badge",
        track: "explorer",
        name: "First Footprint",
        description: "Publish your first place review.",
        iconKey: "badge.first_review",
        rarity: "common",
        condition: { metric: "reviews_count", threshold: 1 }
    },
    {
        id: "city-scout",
        kind: "achievement",
        track: "explorer",
        name: "City Scout",
        description: "Explore cities across regions.",
        iconKey: "achievement.city_scout",
        rarity: "rare",
        tiers: [
            { tier: 1, name: "City Scout I", condition: { metric: "distinct_cities_explored", threshold: 3 }, xpReward: 50 },
            { tier: 2, name: "City Scout II", condition: { metric: "distinct_cities_explored", threshold: 10 }, xpReward: 120 }
        ]
    },
    {
        id: "lens-starter",
        kind: "badge",
        track: "creator",
        name: "Lens Starter",
        description: "Publish your first place video.",
        iconKey: "badge.first_video",
        rarity: "common",
        condition: { metric: "videos_published_count", threshold: 1 }
    },
    {
        id: "trusted-creator-mark",
        kind: "achievement",
        track: "trust",
        name: "Trusted Creator Mark",
        description: "Earn trusted creator status with a clean moderation history.",
        iconKey: "achievement.trusted_creator",
        rarity: "legendary",
        condition: { metric: "trusted_creator_state", threshold: 1 },
        trustGate: { requireTrustedCreator: true, minTrustScore: 80, maxModerationStrikes: 0 }
    },
    {
        id: "coffee-crawl-downtown",
        kind: "collectible",
        track: "collection",
        name: "Downtown Coffee Crawl",
        description: "Review iconic downtown coffee spots.",
        iconKey: "collectible.coffee_crawl",
        rarity: "epic",
        collectible: {
            collectibleId: "coffee-crawl-downtown",
            name: "Downtown Coffee Crawl",
            description: "Complete the signature coffee scene.",
            cityId: "city-downtown",
            requiredPlaceIds: ["plc-c1", "plc-c2", "plc-c3"]
        }
    }
];
export class MemoryAccomplishmentsStore {
    definitions;
    byUser = new Map();
    processed = new Set();
    constructor(definitions = defaultDefinitions) {
        this.definitions = definitions;
    }
    listDefinitions() {
        return this.definitions.map((item) => ({ ...item }));
    }
    getUserState(userId) {
        const state = this.byUser.get(userId);
        return state ? structuredClone(state) : undefined;
    }
    saveUserState(state) {
        this.byUser.set(state.userId, structuredClone(state));
    }
    hasProcessedEvent(eventId) {
        return this.processed.has(eventId);
    }
    markProcessedEvent(eventId) {
        this.processed.add(eventId);
    }
}
