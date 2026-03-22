import type { CompetitionStore } from "./store.js";
import type {
  CompetitionAuditLog,
  CompetitionLeaderboard,
  CompetitionLeaderboardEntry,
  CompetitionLikeEvent,
  CompetitionMission,
  CompetitionMissionProgress,
  CompetitionReward,
  CompetitionReviewEvent,
  CompetitionSeason,
  CompetitionTipEvent,
  CompetitionUserProfile,
  CompetitionVideoQualitySnapshot
} from "./types.js";

function clone<T>(value: T): T { return structuredClone(value); }

export class MemoryCompetitionStore implements CompetitionStore {
  private readonly seasons = new Map<string, CompetitionSeason>();
  private readonly missions = new Map<string, CompetitionMission>();
  private readonly progress = new Map<string, CompetitionMissionProgress>();
  private readonly leaderboards = new Map<string, CompetitionLeaderboard>();
  private readonly leaderboardEntries = new Map<string, CompetitionLeaderboardEntry[]>();
  private readonly qualitySnapshots = new Map<string, CompetitionVideoQualitySnapshot>();
  private readonly likeEvents = new Map<string, CompetitionLikeEvent[]>();
  private readonly tipEvents: CompetitionTipEvent[] = [];
  private readonly reviewEvents: CompetitionReviewEvent[] = [];
  private readonly userProfiles = new Map<string, CompetitionUserProfile>();
  private readonly rewards = new Map<string, CompetitionReward>();
  private readonly auditLogs: CompetitionAuditLog[] = [];

  getSeason(id: string) { return this.seasons.get(id) ? clone(this.seasons.get(id)!) : null; }
  listSeasons() { return [...this.seasons.values()].map(clone); }
  saveSeason(season: CompetitionSeason) { this.seasons.set(season.id, clone(season)); }
  listMissions() { return [...this.missions.values()].map(clone); }
  getMission(id: string) { return this.missions.get(id) ? clone(this.missions.get(id)!) : null; }
  saveMission(mission: CompetitionMission) { this.missions.set(mission.id, clone(mission)); }
  listMissionProgress() { return [...this.progress.values()].map(clone); }
  getMissionProgress(missionId: string, userId: string) { return this.progress.get(`${missionId}:${userId}`) ? clone(this.progress.get(`${missionId}:${userId}`)!) : null; }
  saveMissionProgress(progress: CompetitionMissionProgress) { this.progress.set(`${progress.missionId}:${progress.userId}`, clone(progress)); }
  listLeaderboards() { return [...this.leaderboards.values()].map(clone); }
  getLeaderboard(id: string) { return this.leaderboards.get(id) ? clone(this.leaderboards.get(id)!) : null; }
  saveLeaderboard(leaderboard: CompetitionLeaderboard) { this.leaderboards.set(leaderboard.id, clone(leaderboard)); }
  listLeaderboardEntries(leaderboardId: string) { return (this.leaderboardEntries.get(leaderboardId) ?? []).map(clone); }
  saveLeaderboardEntries(leaderboardId: string, entries: CompetitionLeaderboardEntry[]) { this.leaderboardEntries.set(leaderboardId, entries.map(clone)); }
  getQualitySnapshot(videoId: string) { return this.qualitySnapshots.get(videoId) ? clone(this.qualitySnapshots.get(videoId)!) : null; }
  listQualitySnapshots() { return [...this.qualitySnapshots.values()].map(clone); }
  saveQualitySnapshot(snapshot: CompetitionVideoQualitySnapshot) { this.qualitySnapshots.set(snapshot.videoId, clone(snapshot)); }
  listLikeEvents(videoId: string) { return (this.likeEvents.get(videoId) ?? []).map(clone); }
  saveLikeEvent(event: CompetitionLikeEvent) { const arr = this.likeEvents.get(event.videoId) ?? []; arr.push(clone(event)); this.likeEvents.set(event.videoId, arr); }
  listTipEvents(userId?: string) { return this.tipEvents.filter((e) => !userId || e.userId === userId).map(clone); }
  saveTipEvent(event: CompetitionTipEvent) { this.tipEvents.push(clone(event)); }
  listReviewEvents(userId?: string) { return this.reviewEvents.filter((e) => !userId || e.userId === userId).map(clone); }
  saveReviewEvent(event: CompetitionReviewEvent) { this.reviewEvents.push(clone(event)); }
  getUserProfile(userId: string) { return this.userProfiles.get(userId) ? clone(this.userProfiles.get(userId)!) : null; }
  saveUserProfile(profile: CompetitionUserProfile) { this.userProfiles.set(profile.userId, clone(profile)); }
  listRewards(userId?: string) { return [...this.rewards.values()].filter((r) => !userId || r.userId === userId).map(clone); }
  getReward(id: string) { return this.rewards.get(id) ? clone(this.rewards.get(id)!) : null; }
  saveReward(reward: CompetitionReward) { this.rewards.set(reward.id, clone(reward)); }
  listAuditLogs() { return this.auditLogs.map(clone); }
  addAuditLog(log: CompetitionAuditLog) { this.auditLogs.push(clone(log)); }
}
