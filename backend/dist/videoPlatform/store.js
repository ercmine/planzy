export class MemoryVideoPlatformStore {
    videos = new Map();
    uploadSessions = new Map();
    processingJobs = new Map();
    likes = new Map();
    saves = new Map();
    watchHistory = new Map();
    async createVideo(video) { this.videos.set(video.id, video); return video; }
    async updateVideo(video) { this.videos.set(video.id, video); return video; }
    async getVideo(videoId) { return this.videos.get(videoId); }
    async listByAuthor(authorUserId) { return [...this.videos.values()].filter((video) => video.authorUserId === authorUserId); }
    async listVideos() { return [...this.videos.values()]; }
    async listPublishedByPlace(canonicalPlaceId) {
        return [...this.videos.values()].filter((video) => video.canonicalPlaceId === canonicalPlaceId && video.status === "published" && video.moderationStatus === "approved");
    }
    async listPublishedFeed(limit, cursor) {
        const sorted = [...this.videos.values()]
            .filter((video) => video.status === "published" && video.moderationStatus === "approved" && video.visibility === "public")
            .sort((a, b) => (b.lifecycle.publishedAt ?? b.lifecycle.createdAt).localeCompare(a.lifecycle.publishedAt ?? a.lifecycle.createdAt));
        const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
        const items = sorted.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        return { items, nextCursor: nextOffset < sorted.length ? String(nextOffset) : undefined };
    }
    async createUploadSession(session) { this.uploadSessions.set(session.id, session); return session; }
    async getUploadSession(sessionId) { return this.uploadSessions.get(sessionId); }
    async updateUploadSession(session) { this.uploadSessions.set(session.id, session); return session; }
    async createProcessingJob(job) { this.processingJobs.set(job.id, job); return job; }
    async getProcessingJob(jobId) { return this.processingJobs.get(jobId); }
    async getLatestProcessingJobByVideo(videoId) {
        return [...this.processingJobs.values()].filter((job) => job.videoId === videoId).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))[0];
    }
    async updateProcessingJob(job) { this.processingJobs.set(job.id, job); return job; }
    async claimNextQueuedProcessingJob() {
        const next = [...this.processingJobs.values()].filter((job) => job.status === "queued").sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0];
        if (!next)
            return undefined;
        const claimed = { ...next, status: "running", startedAt: new Date().toISOString() };
        this.processingJobs.set(claimed.id, claimed);
        return claimed;
    }
    async listProcessingJobs() { return [...this.processingJobs.values()]; }
    async likeVideo(input) { this.likes.set(`${input.videoId}:${input.userId}`, input); }
    async unlikeVideo(videoId, userId) { this.likes.delete(`${videoId}:${userId}`); }
    async hasLikedVideo(videoId, userId) { return this.likes.has(`${videoId}:${userId}`); }
    async countLikes(videoId) { return [...this.likes.values()].filter((row) => row.videoId === videoId).length; }
    async saveVideo(input) { this.saves.set(`${input.videoId}:${input.userId}`, input); }
    async unsaveVideo(videoId, userId) { this.saves.delete(`${videoId}:${userId}`); }
    async hasSavedVideo(videoId, userId) { return this.saves.has(`${videoId}:${userId}`); }
    async countSaves(videoId) { return [...this.saves.values()].filter((row) => row.videoId === videoId).length; }
    async listSavedVideos(userId, limit, cursor) {
        const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
        const rows = [...this.saves.values()].filter((row) => row.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const items = rows.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        return { items, nextCursor: nextOffset < rows.length ? String(nextOffset) : undefined };
    }
    async appendWatchHistory(entry) {
        const rows = this.watchHistory.get(entry.userId) ?? [];
        rows.push(entry);
        this.watchHistory.set(entry.userId, rows.sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)).slice(0, 500));
    }
    async listWatchHistory(userId, limit) {
        return (this.watchHistory.get(userId) ?? []).slice(0, Math.max(1, Math.min(limit, 200)));
    }
    async getLatestWatch(videoId, userId) {
        return (this.watchHistory.get(userId) ?? []).find((row) => row.videoId === videoId);
    }
}
