function clone(value) { return structuredClone(value); }
export class MemoryCompetitionStore {
    seasons = new Map();
    missions = new Map();
    progress = new Map();
    leaderboards = new Map();
    leaderboardEntries = new Map();
    qualitySnapshots = new Map();
    likeEvents = new Map();
    tipEvents = [];
    reviewEvents = [];
    userProfiles = new Map();
    rewards = new Map();
    auditLogs = [];
    getSeason(id) { return this.seasons.get(id) ? clone(this.seasons.get(id)) : null; }
    listSeasons() { return [...this.seasons.values()].map(clone); }
    saveSeason(season) { this.seasons.set(season.id, clone(season)); }
    listMissions() { return [...this.missions.values()].map(clone); }
    getMission(id) { return this.missions.get(id) ? clone(this.missions.get(id)) : null; }
    saveMission(mission) { this.missions.set(mission.id, clone(mission)); }
    listMissionProgress() { return [...this.progress.values()].map(clone); }
    getMissionProgress(missionId, userId) { return this.progress.get(`${missionId}:${userId}`) ? clone(this.progress.get(`${missionId}:${userId}`)) : null; }
    saveMissionProgress(progress) { this.progress.set(`${progress.missionId}:${progress.userId}`, clone(progress)); }
    listLeaderboards() { return [...this.leaderboards.values()].map(clone); }
    getLeaderboard(id) { return this.leaderboards.get(id) ? clone(this.leaderboards.get(id)) : null; }
    saveLeaderboard(leaderboard) { this.leaderboards.set(leaderboard.id, clone(leaderboard)); }
    listLeaderboardEntries(leaderboardId) { return (this.leaderboardEntries.get(leaderboardId) ?? []).map(clone); }
    saveLeaderboardEntries(leaderboardId, entries) { this.leaderboardEntries.set(leaderboardId, entries.map(clone)); }
    getQualitySnapshot(videoId) { return this.qualitySnapshots.get(videoId) ? clone(this.qualitySnapshots.get(videoId)) : null; }
    listQualitySnapshots() { return [...this.qualitySnapshots.values()].map(clone); }
    saveQualitySnapshot(snapshot) { this.qualitySnapshots.set(snapshot.videoId, clone(snapshot)); }
    listLikeEvents(videoId) { return (this.likeEvents.get(videoId) ?? []).map(clone); }
    saveLikeEvent(event) { const arr = this.likeEvents.get(event.videoId) ?? []; arr.push(clone(event)); this.likeEvents.set(event.videoId, arr); }
    listTipEvents(userId) { return this.tipEvents.filter((e) => !userId || e.userId === userId).map(clone); }
    saveTipEvent(event) { this.tipEvents.push(clone(event)); }
    listReviewEvents(userId) { return this.reviewEvents.filter((e) => !userId || e.userId === userId).map(clone); }
    saveReviewEvent(event) { this.reviewEvents.push(clone(event)); }
    getUserProfile(userId) { return this.userProfiles.get(userId) ? clone(this.userProfiles.get(userId)) : null; }
    saveUserProfile(profile) { this.userProfiles.set(profile.userId, clone(profile)); }
    listRewards(userId) { return [...this.rewards.values()].filter((r) => !userId || r.userId === userId).map(clone); }
    getReward(id) { return this.rewards.get(id) ? clone(this.rewards.get(id)) : null; }
    saveReward(reward) { this.rewards.set(reward.id, clone(reward)); }
    listAuditLogs() { return this.auditLogs.map(clone); }
    addAuditLog(log) { this.auditLogs.push(clone(log)); }
}
