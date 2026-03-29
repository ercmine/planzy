const DEFAULTS = {
    onboardingCompleted: false,
    preferredLocation: { source: "unknown" },
    interestCategoryIds: [],
    discoveryMode: "balanced",
    creatorContentMode: "balanced"
};
export class OnboardingService {
    store;
    videos;
    now;
    constructor(store, videos, now = () => new Date()) {
        this.store = store;
        this.videos = videos;
        this.now = now;
    }
    async getPreferences(userId) {
        return (await this.store.get(userId)) ?? this.defaultPreferences(userId);
    }
    async updatePreferences(userId, patch) {
        const existing = await this.getPreferences(userId);
        const next = {
            ...existing,
            ...patch,
            userId,
            interestCategoryIds: (patch.interestCategoryIds ?? existing.interestCategoryIds).filter(Boolean),
            preferredLocation: { ...existing.preferredLocation, ...patch.preferredLocation },
            updatedAt: this.now().toISOString(),
            completedAt: patch.onboardingCompleted === true ? this.now().toISOString() : existing.completedAt
        };
        return this.store.save(next);
    }
    async feedBootstrap(userId) {
        const pref = await this.getPreferences(userId);
        const context = pref.preferredLocation;
        const [local, regional, global] = await Promise.all([
            this.videos.listFeed({ scope: "local", limit: 10, context }),
            this.videos.listFeed({ scope: "regional", limit: 10, context }),
            this.videos.listFeed({ scope: "global", limit: 10, context })
        ]);
        const defaultScope = this.defaultScope(pref.discoveryMode);
        const hasAnyContent = local.items.length + regional.items.length + global.items.length > 0;
        return {
            defaultScope,
            feeds: {
                local: { items: local.items, fallbackHint: local.items.length === 0 ? "Try expanding to Regional for nearby cities." : undefined },
                regional: { items: regional.items, fallbackHint: regional.items.length === 0 ? "Try Global for broader inspiration." : undefined },
                global: { items: global.items }
            },
            emptyState: hasAnyContent
                ? undefined
                : {
                    title: "We are still warming up this area",
                    body: "There is limited local creator coverage right now. You can still explore nearby markets and global highlights.",
                    suggestions: [
                        "Switch to Regional or Global",
                        "Broaden your area in settings",
                        "Pick a few more interests"
                    ]
                },
            preferenceSummary: {
                city: pref.preferredLocation.city,
                region: pref.preferredLocation.region,
                categories: pref.interestCategoryIds,
                discoveryMode: pref.discoveryMode
            }
        };
    }
    defaultPreferences(userId) {
        return { ...DEFAULTS, userId, updatedAt: this.now().toISOString() };
    }
    defaultScope(mode) {
        switch (mode) {
            case "mostly_local":
                return "local";
            case "global_inspiration":
                return "global";
            case "balanced":
            default:
                return "regional";
        }
    }
}
