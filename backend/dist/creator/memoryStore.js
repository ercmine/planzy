export class MemoryCreatorStore {
    profilesById = new Map();
    profileSlugToId = new Map();
    profileHandleToId = new Map();
    follows = new Map();
    guides = new Map();
    analytics = new Map();
    guideViews = new Map();
    getProfileById(id) {
        return this.profilesById.get(id);
    }
    getProfileBySlug(slug) {
        const id = this.profileSlugToId.get(slug);
        return id ? this.profilesById.get(id) : undefined;
    }
    getProfileByHandle(handle) {
        const id = this.profileHandleToId.get(handle.toLowerCase());
        return id ? this.profilesById.get(id) : undefined;
    }
    saveProfile(profile) {
        const existing = this.profilesById.get(profile.id);
        if (existing && existing.slug !== profile.slug)
            this.profileSlugToId.delete(existing.slug);
        if (existing?.handle && existing.handle !== profile.handle)
            this.profileHandleToId.delete(existing.handle.toLowerCase());
        this.profilesById.set(profile.id, profile);
        this.profileSlugToId.set(profile.slug, profile.id);
        if (profile.handle)
            this.profileHandleToId.set(profile.handle.toLowerCase(), profile.id);
    }
    listProfiles() {
        return [...this.profilesById.values()];
    }
    createFollow(follow) {
        this.follows.set(`${follow.creatorProfileId}:${follow.followerUserId}`, follow);
    }
    deleteFollow(creatorProfileId, followerUserId) {
        this.follows.delete(`${creatorProfileId}:${followerUserId}`);
    }
    getFollow(creatorProfileId, followerUserId) {
        return this.follows.get(`${creatorProfileId}:${followerUserId}`);
    }
    listFollowedCreatorIds(followerUserId) {
        return [...this.follows.values()]
            .filter((row) => row.followerUserId === followerUserId)
            .map((row) => row.creatorProfileId);
    }
    listFollowsByCreator(creatorProfileId) {
        return [...this.follows.values()].filter((row) => row.creatorProfileId === creatorProfileId);
    }
    countFollowers(creatorProfileId) {
        return [...this.follows.values()].filter((row) => row.creatorProfileId === creatorProfileId).length;
    }
    countFollowing(userId) {
        return [...this.follows.values()].filter((row) => row.followerUserId === userId).length;
    }
    createGuide(guide) {
        this.guides.set(guide.id, guide);
    }
    updateGuide(guide) {
        this.guides.set(guide.id, guide);
    }
    getGuideById(guideId) {
        return this.guides.get(guideId);
    }
    getGuideBySlug(creatorProfileId, slug) {
        return [...this.guides.values()].find((row) => row.creatorProfileId === creatorProfileId && row.slug === slug);
    }
    listGuidesByCreator(creatorProfileId) {
        return [...this.guides.values()].filter((row) => row.creatorProfileId === creatorProfileId);
    }
    incrementProfileView(creatorProfileId, date) {
        const key = `${creatorProfileId}:${date}`;
        const current = this.analytics.get(key) ?? { date, profileViews: 0, followerDelta: 0, guideViews: 0 };
        current.profileViews += 1;
        this.analytics.set(key, current);
    }
    incrementGuideView(guideId, creatorProfileId, date) {
        const key = `${creatorProfileId}:${date}`;
        const current = this.analytics.get(key) ?? { date, profileViews: 0, followerDelta: 0, guideViews: 0 };
        current.guideViews += 1;
        this.analytics.set(key, current);
        this.guideViews.set(guideId, (this.guideViews.get(guideId) ?? 0) + 1);
    }
    listAnalytics(creatorProfileId) {
        return [...this.analytics.entries()]
            .filter(([key]) => key.startsWith(`${creatorProfileId}:`))
            .map(([, value]) => value)
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    getGuideViews(guideId) {
        return this.guideViews.get(guideId) ?? 0;
    }
}
