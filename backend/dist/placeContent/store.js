import { randomUUID } from "node:crypto";
export class MemoryPlaceContentStore {
    reviews = new Map();
    videos = new Map();
    saves = new Map();
    guides = new Map();
    guideItems = new Map();
    engagement = new Map();
    metrics = new Map();
    async createReview(input) {
        const now = new Date().toISOString();
        const row = { ...input, id: `rvw_${randomUUID()}`, helpfulCount: 0, reportCount: 0, createdAt: now, updatedAt: now };
        this.reviews.set(row.id, row);
        return row;
    }
    async listReviewsByPlace(canonicalPlaceId) {
        return [...this.reviews.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    async createVideo(input) {
        const now = new Date().toISOString();
        const row = { ...input, id: `vid_${randomUUID()}`, viewCount: 0, likeCount: 0, createdAt: now, updatedAt: now };
        this.videos.set(row.id, row);
        return row;
    }
    async listVideosByPlace(canonicalPlaceId) {
        return [...this.videos.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    async upsertSave(input) {
        const key = `${input.userId}:${input.canonicalPlaceId}`;
        const existing = this.saves.get(key);
        if (existing)
            return existing;
        const row = { ...input, id: `sav_${randomUUID()}`, createdAt: new Date().toISOString() };
        this.saves.set(key, row);
        return row;
    }
    async deleteSave(userId, canonicalPlaceId) {
        this.saves.delete(`${userId}:${canonicalPlaceId}`);
    }
    async listSavesByPlace(canonicalPlaceId) {
        return [...this.saves.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    async createGuide(input) {
        const now = new Date().toISOString();
        const row = { ...input, id: `gde_${randomUUID()}`, createdAt: now, updatedAt: now };
        this.guides.set(row.id, row);
        return row;
    }
    async getGuide(guideId) {
        return this.guides.get(guideId);
    }
    async addGuideItem(input) {
        const key = `${input.guideId}:${input.canonicalPlaceId}`;
        const existing = this.guideItems.get(key);
        if (existing)
            return existing;
        const position = (await this.listGuideItems(input.guideId)).length;
        const row = { ...input, position, addedAt: new Date().toISOString() };
        this.guideItems.set(key, row);
        return row;
    }
    async listGuideItems(guideId) {
        return [...this.guideItems.values()].filter((item) => item.guideId === guideId).sort((a, b) => a.position - b.position);
    }
    async listGuidesByPlace(canonicalPlaceId) {
        const guideIds = [...this.guideItems.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId).map((item) => item.guideId);
        return guideIds.map((id) => this.guides.get(id)).filter((item) => Boolean(item));
    }
    async appendEngagement(input) {
        const row = { ...input, id: `eng_${randomUUID()}` };
        this.engagement.set(row.id, row);
        return row;
    }
    async listEngagementByPlace(canonicalPlaceId) {
        return [...this.engagement.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    async listAllReviews() {
        return [...this.reviews.values()];
    }
    async listAllVideos() {
        return [...this.videos.values()];
    }
    async listAllGuides() {
        return [...this.guides.values()];
    }
    async upsertPlaceMetrics(metrics) {
        this.metrics.set(metrics.canonicalPlaceId, metrics);
        return metrics;
    }
    async getPlaceMetrics(canonicalPlaceId) {
        return this.metrics.get(canonicalPlaceId);
    }
}
