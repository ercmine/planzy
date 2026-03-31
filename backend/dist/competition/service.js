import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
import { computeCompetitionScore, resolveQualityBand } from "./scoring.js";
const DEFAULT_CONFIG = {
    enabled: process.env.COMPETITION_ENABLED !== "false",
    qualityWindowHours: Number.parseInt(process.env.COMPETITION_QUALITY_WINDOW_HOURS ?? "48", 10),
    qualityBands: JSON.parse(process.env.COMPETITION_QUALITY_BANDS_JSON ?? JSON.stringify([
        { minLikes: 40, band: "FEATURED", points: 40 },
        { minLikes: 15, band: "HIGH", points: 20 },
        { minLikes: 5, band: "STANDARD", points: 8 },
        { minLikes: 0, band: "LOW", points: 0 }
    ])),
    approvedReviewPoints: Number(process.env.COMPETITION_APPROVED_REVIEW_POINTS ?? "10"),
    discoveryBonusPoints: { first_review: 12, first_five: 7, under_covered: 5, standard: 0 },
    streakPointPerDay: Number(process.env.COMPETITION_STREAK_POINTS_PER_DAY ?? "2"),
    tipPointsPerPerbug: Number(process.env.COMPETITION_TIP_POINTS_PER_PERBUG ?? "1"),
    missionCompletionPoints: Number(process.env.COMPETITION_MISSION_COMPLETION_POINTS ?? "6"),
    engagementBonusPoints: Number(process.env.COMPETITION_ENGAGEMENT_BONUS_POINTS ?? "0"),
    rewardClaimPrefix: process.env.COMPETITION_REWARD_CLAIM_PREFIX ?? "competition"
};
function nowIso(now = new Date()) { return now.toISOString(); }
function clone(value) { return structuredClone(value); }
export class CompetitionService {
    store;
    rewardsService;
    nowProvider;
    config;
    constructor(store, rewardsService, nowProvider = () => new Date(), config = DEFAULT_CONFIG) {
        this.store = store;
        this.rewardsService = rewardsService;
        this.nowProvider = nowProvider;
        this.config = config;
        this.seedDefaults();
    }
    getCurrentSeason() {
        const now = this.nowProvider().getTime();
        return this.store.listSeasons().find((season) => new Date(season.startsAt).getTime() <= now && new Date(season.endsAt).getTime() >= now) ?? null;
    }
    listMissions() { return this.store.listMissions().filter((m) => m.active); }
    listLeaderboards() { this.rebuildLeaderboards(); return this.store.listLeaderboards().filter((l) => l.active); }
    getLeaderboard(id) { this.rebuildLeaderboards(); return { leaderboard: this.requireLeaderboard(id), entries: this.store.listLeaderboardEntries(id) }; }
    getMissionProgress(missionId, userId) { return this.ensureProgress(missionId, userId); }
    listRewards(userId) { return this.store.listRewards(userId); }
    getVideoQuality(videoId) { return this.finalizeQualityForVideo(videoId); }
    listAuditLogs() { return this.store.listAuditLogs(); }
    getHome(userId) {
        this.finalizeExpiredQualityWindows();
        this.rebuildLeaderboards();
        const season = this.getCurrentSeason();
        const missions = this.listMissions().map((mission) => this.attachMissionProgress(mission, userId));
        const leaderboards = this.listLeaderboards().map((board) => ({ ...board, topEntries: this.store.listLeaderboardEntries(board.id).slice(0, 5), myEntry: this.store.listLeaderboardEntries(board.id).find((entry) => entry.userId === userId) }));
        const rewards = this.store.listRewards(userId);
        const profile = this.store.getUserProfile(userId) ?? { userId, streakDays: 0 };
        const score = this.computeUserScore(userId);
        return {
            season,
            score,
            streakDays: profile.streakDays,
            cityRank: leaderboards.find((entry) => entry.type === "weekly_city")?.myEntry?.rank,
            claimableRewardAtomic: rewards.filter((reward) => reward.status === "claimable").reduce((sum, reward) => sum + reward.rewardAtomic, 0n).toString(),
            missions,
            leaderboards,
            featuredChallenge: missions.find((mission) => mission.type === "featured_quality_band") ?? missions[0],
            rewards: rewards.filter((reward) => ["pending", "claimable", "claiming"].includes(reward.status)),
            rewardHistory: rewards.filter((reward) => ["claimed", "blocked", "expired"].includes(reward.status))
        };
    }
    claimMission(missionId, userId) {
        const progress = this.ensureProgress(missionId, userId);
        const mission = this.requireMission(missionId);
        if (!progress.completed)
            throw new ValidationError(["mission not complete"]);
        if (progress.claimed) {
            const existing = this.store.listRewards(userId).find((reward) => reward.sourceType === "mission" && reward.sourceId === missionId);
            if (!existing)
                throw new ValidationError(["mission already claimed"]);
            return existing;
        }
        progress.claimed = true;
        progress.claimedAt = nowIso(this.nowProvider());
        progress.updatedAt = progress.claimedAt;
        this.store.saveMissionProgress(progress);
        const reward = this.issueReward({ userId, sourceType: "mission", sourceId: mission.id, rewardAtomic: mission.rewardAtomic });
        this.audit(userId, "mission.claimed", "mission", missionId, { rewardAtomic: mission.rewardAtomic.toString() });
        return reward;
    }
    claimReward(rewardId, userId) {
        const reward = this.store.getReward(rewardId);
        if (!reward || reward.userId !== userId)
            throw new ValidationError(["reward not found"]);
        if (reward.status === "claimed")
            return reward;
        if (reward.status !== "claimable")
            throw new ValidationError(["reward is not claimable"]);
        reward.status = "claimed";
        reward.claimedAt = nowIso(this.nowProvider());
        reward.updatedAt = reward.claimedAt;
        reward.claimTransactionSignature = `${this.config.rewardClaimPrefix}_${reward.id}`;
        this.store.saveReward(reward);
        this.audit(userId, "competition.reward.claimed", "reward", reward.id, { transactionSignature: reward.claimTransactionSignature });
        return reward;
    }
    createMission(input, actorUserId = "admin") {
        const timestamp = nowIso(this.nowProvider());
        const mission = { ...input, createdAt: timestamp, updatedAt: timestamp };
        this.store.saveMission(mission);
        this.audit(actorUserId, "competition.mission.upserted", "mission", mission.id, { type: mission.type });
        return mission;
    }
    createLeaderboard(input, actorUserId = "admin") {
        const timestamp = nowIso(this.nowProvider());
        const leaderboard = { ...input, createdAt: timestamp, updatedAt: timestamp };
        this.store.saveLeaderboard(leaderboard);
        this.audit(actorUserId, "competition.leaderboard.upserted", "leaderboard", leaderboard.id, { type: leaderboard.type });
        return leaderboard;
    }
    blockReward(rewardId, actorUserId = "admin") {
        const reward = this.store.getReward(rewardId);
        if (!reward)
            throw new ValidationError(["reward not found"]);
        reward.status = "blocked";
        reward.updatedAt = nowIso(this.nowProvider());
        this.store.saveReward(reward);
        this.audit(actorUserId, "competition.reward.blocked", "reward", rewardId, {});
        return reward;
    }
    recomputeVideoQuality(videoId, actorUserId = "admin") {
        const quality = this.finalizeQualityForVideo(videoId, true);
        this.audit(actorUserId, "competition.quality.recomputed", "video", videoId, { earlyLikeCount: quality?.earlyLikeCount ?? 0 });
        this.updateMissionProgressForAllUsers();
        this.rebuildLeaderboards();
        return quality;
    }
    recordVideoPublished(input) {
        const publishedAt = input.publishedAt ?? nowIso(this.nowProvider());
        const timestamp = nowIso(this.nowProvider());
        const snapshot = {
            id: `cq_${randomUUID()}`,
            videoId: input.videoId,
            reviewId: input.reviewId,
            userId: input.userId,
            publishedAt,
            qualityWindowEndsAt: new Date(Date.parse(publishedAt) + this.config.qualityWindowHours * 3600 * 1000).toISOString(),
            earlyLikeCount: 0,
            qualityBand: "LOW",
            qualityPoints: 0,
            finalized: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            city: input.city,
            category: input.category,
            canonicalPlaceId: input.canonicalPlaceId
        };
        this.store.saveQualitySnapshot(snapshot);
        this.store.saveUserProfile(this.store.getUserProfile(input.userId) ?? { userId: input.userId, city: input.city, streakDays: 0 });
        return snapshot;
    }
    recordLike(event) {
        this.store.saveLikeEvent(event);
        const quality = this.finalizeQualityForVideo(event.videoId);
        this.updateMissionProgressForAllUsers();
        this.rebuildLeaderboards();
        return quality;
    }
    recordApprovedReview(event) {
        this.store.saveReviewEvent(event);
        const profile = this.store.getUserProfile(event.userId) ?? { userId: event.userId, city: event.city, streakDays: 0 };
        profile.city = event.city ?? profile.city;
        profile.streakDays = Math.max(profile.streakDays, 1);
        this.store.saveUserProfile(profile);
        this.updateMissionProgressForAllUsers();
        this.rebuildLeaderboards();
        return event;
    }
    recordTip(event) {
        this.store.saveTipEvent(event);
        this.updateMissionProgressForAllUsers();
        this.rebuildLeaderboards();
        return event;
    }
    updateStreak(userId, streakDays) {
        const profile = this.store.getUserProfile(userId) ?? { userId, streakDays: 0 };
        profile.streakDays = streakDays;
        this.store.saveUserProfile(profile);
        this.updateMissionProgressForAllUsers();
        this.rebuildLeaderboards();
        return profile;
    }
    finalizeExpiredQualityWindows() {
        for (const snapshot of this.store.listQualitySnapshots()) {
            this.finalizeQualityForVideo(snapshot.videoId);
        }
    }
    attachMissionProgress(mission, userId) {
        return { ...mission, progress: this.ensureProgress(mission.id, userId) };
    }
    ensureProgress(missionId, userId) {
        const existing = this.store.getMissionProgress(missionId, userId);
        if (existing)
            return existing;
        const timestamp = nowIso(this.nowProvider());
        const progress = { id: `cmp_${randomUUID()}`, missionId, userId, progressValue: 0, completed: false, claimed: false, createdAt: timestamp, updatedAt: timestamp };
        this.store.saveMissionProgress(progress);
        return progress;
    }
    finalizeQualityForVideo(videoId, force = false) {
        const snapshot = this.store.getQualitySnapshot(videoId);
        if (!snapshot)
            return null;
        if (snapshot.removed || snapshot.blocked) {
            snapshot.finalized = true;
            snapshot.earlyLikeCount = 0;
            snapshot.qualityPoints = 0;
            snapshot.qualityBand = "LOW";
            snapshot.finalizedAt = nowIso(this.nowProvider());
            snapshot.updatedAt = snapshot.finalizedAt;
            this.store.saveQualitySnapshot(snapshot);
            return snapshot;
        }
        if (!force && snapshot.finalized && Date.parse(snapshot.qualityWindowEndsAt) <= this.nowProvider().getTime())
            return snapshot;
        const deduped = new Map();
        for (const like of this.store.listLikeEvents(videoId)) {
            if (!like.valid || like.bannedUser || like.blockedUser || like.fraudFlagged)
                continue;
            if (Date.parse(like.createdAt) > Date.parse(snapshot.qualityWindowEndsAt))
                continue;
            const existing = deduped.get(like.userId);
            if (!existing || Date.parse(existing.createdAt) > Date.parse(like.createdAt))
                deduped.set(like.userId, like);
        }
        snapshot.earlyLikeCount = deduped.size;
        const resolved = resolveQualityBand(snapshot.earlyLikeCount, this.config);
        snapshot.qualityBand = resolved.band;
        snapshot.qualityPoints = resolved.points;
        if (force || Date.parse(snapshot.qualityWindowEndsAt) <= this.nowProvider().getTime()) {
            snapshot.finalized = true;
            snapshot.finalizedAt = nowIso(this.nowProvider());
        }
        snapshot.updatedAt = nowIso(this.nowProvider());
        this.store.saveQualitySnapshot(snapshot);
        return snapshot;
    }
    rebuildLeaderboards() {
        const boards = this.store.listLeaderboards().filter((board) => board.active);
        const season = this.getCurrentSeason();
        for (const board of boards) {
            const entries = new Map();
            const activeReviews = this.store.listReviewEvents().filter((event) => event.approved && !event.blocked && this.withinWindow(event.approvedAt, board.startsAt, board.endsAt));
            const activeQuality = this.store.listQualitySnapshots().filter((snapshot) => this.withinWindow(snapshot.publishedAt, board.startsAt, board.endsAt));
            const activeTips = this.store.listTipEvents().filter((tip) => this.withinWindow(tip.createdAt, board.startsAt, board.endsAt));
            const users = new Set([...activeReviews.map((event) => event.userId), ...activeQuality.map((snapshot) => snapshot.userId), ...activeTips.map((tip) => tip.userId)]);
            for (const userId of users) {
                const userReviews = activeReviews.filter((event) => event.userId === userId && this.matchesBoardScope(board, event.city, event.category));
                const userQuality = activeQuality.filter((snapshot) => snapshot.userId === userId && this.matchesBoardScope(board, snapshot.city, snapshot.category));
                const userTips = activeTips.filter((tip) => tip.userId === userId);
                const profile = this.store.getUserProfile(userId) ?? { userId, streakDays: 0 };
                const score = board.type === "weekly_quality"
                    ? userQuality.reduce((sum, item) => sum + item.qualityPoints, 0)
                    : board.type === "weekly_discovery"
                        ? userReviews.reduce((sum, item) => sum + (this.config.discoveryBonusPoints[item.discoveryType] ?? 0), 0)
                        : board.type === "weekly_most_tipped"
                            ? Number(userTips.reduce((sum, item) => sum + item.amountAtomic, 0n)) / 1_000_000_000
                            : this.computeUserScore(userId, board);
                entries.set(userId, { id: `cle_${board.id}_${userId}`, leaderboardId: board.id, userId, score: Number(score.toFixed(3)), rank: 0, claimed: false, updatedAt: nowIso(this.nowProvider()) });
            }
            const ranked = [...entries.values()].filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId)).map((entry, index) => ({ ...entry, rank: index + 1 }));
            const rewardSlices = ranked.length ? [0.5, 0.3, 0.2] : [];
            const rewardPool = board.rewardPoolAtomic;
            const withRewards = ranked.map((entry, index) => ({ ...entry, rewardAtomic: index < rewardSlices.length ? BigInt(Math.floor(Number(rewardPool) * rewardSlices[index])) : 0n }));
            this.store.saveLeaderboardEntries(board.id, withRewards);
            if (season && new Date(board.endsAt).getTime() < this.nowProvider().getTime()) {
                for (const entry of withRewards.filter((item) => (item.rewardAtomic ?? 0n) > 0n)) {
                    const existing = this.store.listRewards(entry.userId).find((reward) => reward.sourceType === "leaderboard" && reward.sourceId === `${board.id}:${entry.userId}`);
                    if (!existing)
                        this.issueReward({ userId: entry.userId, sourceType: "leaderboard", sourceId: `${board.id}:${entry.userId}`, rewardAtomic: entry.rewardAtomic ?? 0n });
                }
            }
        }
    }
    computeUserScore(userId, board) {
        const reviews = this.store.listReviewEvents(userId).filter((event) => event.approved && !event.blocked).filter((event) => !board || this.matchesBoardScope(board, event.city, event.category)).filter((event) => !board || this.withinWindow(event.approvedAt, board.startsAt, board.endsAt));
        const quality = this.store.listQualitySnapshots().filter((item) => item.userId === userId).filter((item) => !board || this.matchesBoardScope(board, item.city, item.category)).filter((item) => !board || this.withinWindow(item.publishedAt, board.startsAt, board.endsAt));
        const tips = this.store.listTipEvents(userId).filter((item) => !board || this.withinWindow(item.createdAt, board.startsAt, board.endsAt));
        const missions = this.store.listMissionProgress().filter((item) => item.userId === userId && item.completed);
        const profile = this.store.getUserProfile(userId) ?? { userId, streakDays: 0 };
        return computeCompetitionScore({
            approvedReviewCount: reviews.length,
            discoveryEvents: reviews,
            qualityPoints: quality.reduce((sum, item) => sum + item.qualityPoints, 0),
            streakDays: profile.streakDays,
            tipAtomic: tips.reduce((sum, item) => sum + item.amountAtomic, 0n),
            missionCompletionCount: missions.length,
            config: this.config
        });
    }
    updateMissionProgressForAllUsers() {
        const users = new Set([
            ...this.store.listReviewEvents().map((e) => e.userId),
            ...this.store.listQualitySnapshots().map((e) => e.userId),
            ...this.store.listTipEvents().map((e) => e.userId),
            ...this.store.listMissionProgress().map((e) => e.userId)
        ]);
        for (const userId of users) {
            for (const mission of this.listMissions()) {
                const progress = this.ensureProgress(mission.id, userId);
                progress.progressValue = this.measureMission(userId, mission);
                progress.completed = progress.progressValue >= mission.goalValue;
                if (progress.completed && !progress.completedAt)
                    progress.completedAt = nowIso(this.nowProvider());
                progress.updatedAt = nowIso(this.nowProvider());
                this.store.saveMissionProgress(progress);
            }
        }
    }
    measureMission(userId, mission) {
        const reviews = this.store.listReviewEvents(userId).filter((e) => e.approved && !e.blocked).filter((e) => this.withinWindow(e.approvedAt, mission.startsAt, mission.endsAt));
        const quality = this.store.listQualitySnapshots().filter((e) => e.userId === userId).filter((e) => this.withinWindow(e.publishedAt, mission.startsAt, mission.endsAt));
        const tips = this.store.listTipEvents(userId).filter((e) => this.withinWindow(e.createdAt, mission.startsAt, mission.endsAt));
        const profile = this.store.getUserProfile(userId) ?? { userId, streakDays: 0 };
        switch (mission.type) {
            case "first_approved_review_of_day": return reviews.length > 0 ? 1 : 0;
            case "approved_reviews_in_period": return reviews.length;
            case "review_new_place": return reviews.filter((review) => review.discoveryType === "first_review").length;
            case "review_category": return reviews.filter((review) => review.category === mission.category).length;
            case "likes_in_48h": return Math.max(0, ...quality.map((item) => item.earlyLikeCount), 0);
            case "featured_quality_band": return quality.some((item) => item.qualityBand === "FEATURED") ? 1 : 0;
            case "streak_days": return profile.streakDays;
            case "tips_received": return Number(tips.reduce((sum, tip) => sum + tip.amountAtomic, 0n) / 1000000000n);
            case "rank_top_n_city": {
                this.rebuildLeaderboards();
                const cityBoard = this.store.listLeaderboards().find((item) => item.type === "weekly_city" && (item.scopeValue == null || item.scopeValue === profile.city));
                const rank = cityBoard ? this.store.listLeaderboardEntries(cityBoard.id).find((entry) => entry.userId === userId)?.rank ?? mission.goalValue + 1 : mission.goalValue + 1;
                return rank <= mission.goalValue ? 1 : 0;
            }
            case "complete_missions_in_week": return this.store.listMissionProgress().filter((item) => item.userId === userId && item.completed).length;
        }
    }
    issueReward(input) {
        const existing = this.store.listRewards(input.userId).find((reward) => reward.sourceType === input.sourceType && reward.sourceId === input.sourceId);
        if (existing)
            return existing;
        const timestamp = nowIso(this.nowProvider());
        const reward = { id: `cr_${randomUUID()}`, userId: input.userId, sourceType: input.sourceType, sourceId: input.sourceId, rewardAtomic: input.rewardAtomic, status: "claimable", createdAt: timestamp, updatedAt: timestamp };
        this.store.saveReward(reward);
        return reward;
    }
    matchesBoardScope(board, city, category) {
        if (board.scopeType === "global" || !board.scopeValue)
            return true;
        if (board.scopeType === "city")
            return board.scopeValue === city;
        if (board.scopeType === "category")
            return board.scopeValue === category;
        return true;
    }
    withinWindow(dateIso, startsAt, endsAt) {
        const value = Date.parse(dateIso);
        return value >= Date.parse(startsAt) && value <= Date.parse(endsAt);
    }
    requireMission(id) { const mission = this.store.getMission(id); if (!mission)
        throw new ValidationError(["mission not found"]); return mission; }
    requireLeaderboard(id) { const leaderboard = this.store.getLeaderboard(id); if (!leaderboard)
        throw new ValidationError(["leaderboard not found"]); return leaderboard; }
    audit(actorUserId, action, targetType, targetId, payload) {
        const log = { id: `cal_${randomUUID()}`, actorUserId, action, targetType, targetId, payload, createdAt: nowIso(this.nowProvider()) };
        this.store.addAuditLog(log);
        return log;
    }
    seedDefaults() {
        if (this.store.listSeasons().length)
            return;
        const now = this.nowProvider();
        const weekStart = new Date(now);
        weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
        weekStart.setUTCHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);
        const seasonEnd = new Date(now);
        seasonEnd.setUTCDate(now.getUTCDate() + Number.parseInt(process.env.COMPETITION_DEFAULT_SEASON_LENGTH_DAYS ?? "30", 10));
        const timestamp = nowIso(now);
        this.store.saveSeason({ id: "season_current", name: "Season 1 · Perbug Competition", status: "active", startsAt: timestamp, endsAt: seasonEnd.toISOString(), rewardPoolAtomic: 2500000000n, createdAt: timestamp, updatedAt: timestamp });
        const missions = [
            { id: "daily_approved_review", type: "first_approved_review_of_day", title: "Earn PERBUG", description: "Upload 1 approved place review today to earn a fixed PERBUG drop.", rewardAtomic: 25000000n, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), repeatMode: "daily", goalType: "approved_reviews", goalValue: 1, active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "weekly_coffee_reviews", type: "review_category", title: "Complete missions", description: "Review 3 new coffee shops this week for a city discovery bonus.", rewardAtomic: 75000000n, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), repeatMode: "weekly", goalType: "category_reviews", goalValue: 3, category: "coffee", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "quality_likes_10", type: "likes_in_48h", title: "Get 10 likes in the first 48 hours to earn a bonus", description: "Likes in the first 48 hours boost your quality score and complete this mission at 10 likes.", rewardAtomic: 90000000n, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), repeatMode: "weekly", goalType: "early_likes", goalValue: 10, active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "featured_quality", type: "featured_quality_band", title: "Featured challenge", description: "Hit the FEATURED quality band on one video within the 48h quality window.", rewardAtomic: 150000000n, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), repeatMode: "weekly", goalType: "featured_quality", goalValue: 1, active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "streak_3", type: "streak_days", title: "Post 3 days in a row", description: "Keep your streak alive to earn consistency PERBUG.", rewardAtomic: 60000000n, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), repeatMode: "weekly", goalType: "streak_days", goalValue: 3, active: true, createdAt: timestamp, updatedAt: timestamp }
        ];
        missions.forEach((mission) => this.store.saveMission(mission));
        const boards = [
            { id: "lb_weekly_global", type: "weekly_global", name: "Global weekly leaderboard", scopeType: "global", startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), rewardPoolAtomic: 600000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "lb_weekly_city", type: "weekly_city", name: "Bloomington weekly leaderboard", scopeType: "city", scopeValue: "Bloomington", startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), rewardPoolAtomic: 300000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "lb_weekly_quality", type: "weekly_quality", name: "Most liked in first 48h", scopeType: "global", startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), rewardPoolAtomic: 250000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "lb_weekly_discovery", type: "weekly_discovery", name: "Discovery leaderboard", scopeType: "global", startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), rewardPoolAtomic: 250000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "lb_weekly_tips", type: "weekly_most_tipped", name: "Most tipped creator leaderboard", scopeType: "global", startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString(), rewardPoolAtomic: 200000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp },
            { id: "lb_seasonal_overall", type: "seasonal_overall", name: "Seasonal overall score", scopeType: "season", scopeValue: "season_current", startsAt: timestamp, endsAt: seasonEnd.toISOString(), rewardPoolAtomic: 900000000n, scoringRuleVersion: "v1", active: true, createdAt: timestamp, updatedAt: timestamp }
        ];
        boards.forEach((board) => this.store.saveLeaderboard(board));
    }
}
