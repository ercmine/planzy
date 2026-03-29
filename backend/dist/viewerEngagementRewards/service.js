import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
const DAY_MS = 24 * 60 * 60 * 1000;
const nowIso = () => new Date().toISOString();
const dateKey = (iso) => iso.slice(0, 10);
const clean = (v) => v.toLowerCase().replace(/\s+/g, " ").trim();
const DEFAULT_RULES = [
    { action: "watch", enabled: true, baseRewardAtomic: 80000n, minWatchMs: 15_000, minWatchPct: 0.25, cooldownHours: 12, maxPerDay: 20, pendingIfRiskAtOrAbove: 0.6 },
    { action: "completion", enabled: true, baseRewardAtomic: 120000n, minWatchMs: 35_000, minWatchPct: 0.85, cooldownHours: 24, maxPerDay: 12, pendingIfRiskAtOrAbove: 0.55 },
    { action: "rating", enabled: true, baseRewardAtomic: 45000n, minWatchMs: 15_000, minWatchPct: 0.3, cooldownHours: 24, maxPerDay: 20, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.6 },
    { action: "comment", enabled: true, baseRewardAtomic: 90000n, minWatchMs: 20_000, minWatchPct: 0.35, cooldownHours: 24, maxPerDay: 15, requiresUniqueComment: true, requiresMinCommentLength: 25, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.5 },
    { action: "comment_reply", enabled: true, baseRewardAtomic: 50000n, minWatchMs: 20_000, minWatchPct: 0.35, cooldownHours: 12, maxPerDay: 20, requiresUniqueComment: true, requiresMinCommentLength: 18, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.55 },
    { action: "save", enabled: true, baseRewardAtomic: 25000n, minWatchMs: 12_000, minWatchPct: 0.25, cooldownHours: 48, maxPerDay: 20, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.7 },
    { action: "place_click", enabled: true, baseRewardAtomic: 30000n, minWatchMs: 10_000, minWatchPct: 0.2, cooldownHours: 24, maxPerDay: 20, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.65 },
    { action: "follow_creator", enabled: true, baseRewardAtomic: 30000n, minWatchMs: 12_000, minWatchPct: 0.25, cooldownHours: 72, maxPerDay: 12, requiresWatchFirst: true, pendingIfRiskAtOrAbove: 0.65 },
    { action: "share", enabled: true, baseRewardAtomic: 10000n, cooldownHours: 72, maxPerDay: 5, pendingIfRiskAtOrAbove: 0.8 },
    { action: "session_completion", enabled: true, baseRewardAtomic: 150000n, cooldownHours: 24, maxPerDay: 4, pendingIfRiskAtOrAbove: 0.55 },
    { action: "playlist_chain", enabled: true, baseRewardAtomic: 90000n, cooldownHours: 24, maxPerDay: 4, pendingIfRiskAtOrAbove: 0.5 },
    { action: "streak", enabled: true, baseRewardAtomic: 110000n, cooldownHours: 24, maxPerDay: 1, pendingIfRiskAtOrAbove: 0.5 },
    { action: "sponsored_watch", enabled: true, baseRewardAtomic: 95000n, minWatchMs: 18_000, minWatchPct: 0.35, cooldownHours: 24, maxPerDay: 20, pendingIfRiskAtOrAbove: 0.5 },
    { action: "boosted_engagement", enabled: true, baseRewardAtomic: 130000n, cooldownHours: 24, maxPerDay: 10, pendingIfRiskAtOrAbove: 0.55 }
];
const DEFAULT_CONFIG = {
    minHeartbeatMs: 4_000,
    minForegroundRatio: 0.65,
    minimumMeaningfulWatchMs: 15_000,
    minimumMeaningfulWatchPct: 0.25,
    maxRewardsPerDayAtomic: 1800000n,
    maxRewardsPerVideoPerDayAtomic: 350000n,
    duplicateCommentWindowHours: 72,
    selfEngagementForbidden: true,
    trustTierRiskThresholds: { pending: 0.5, reject: 0.85 }
};
export class ViewerEngagementRewardsService {
    store;
    deps;
    config = { ...DEFAULT_CONFIG };
    constructor(store, deps) {
        this.store = store;
        this.deps = deps;
        for (const rule of DEFAULT_RULES)
            this.store.upsertRewardRule(rule);
    }
    startWatchSession(input) {
        const ctx = this.requireVideoContext(input.videoId);
        if (!Number.isFinite(input.durationMs) || input.durationMs < 2_000)
            throw new ValidationError(["durationMs must be >= 2000"]);
        const session = {
            id: `vw_${randomUUID()}`,
            userId: input.userId,
            videoId: input.videoId,
            creatorId: ctx.creatorId,
            placeId: ctx.placeId,
            startedAt: nowIso(),
            totalWatchMs: 0,
            maxProgressMs: 0,
            durationMs: input.durationMs,
            heartbeatCount: 0,
            foregroundHeartbeats: 0,
            milestonesPaid: [],
            status: "active",
            deviceId: input.deviceId,
            ipHash: input.ipHash
        };
        this.store.createWatchSession(session);
        this.track("viewer_watch_session_started", input.userId, { videoId: input.videoId, sessionId: session.id });
        return session;
    }
    heartbeat(input) {
        const session = this.requireOwnedSession(input.userId, input.sessionId);
        if (session.status !== "active" && session.status !== "paused")
            throw new ValidationError(["session_not_active"]);
        if (input.watchMs < this.config.minHeartbeatMs)
            throw new ValidationError(["heartbeat_too_short"]);
        session.status = "active";
        session.totalWatchMs += input.watchMs;
        session.maxProgressMs = Math.max(session.maxProgressMs, input.progressMs);
        session.heartbeatCount += 1;
        if (input.foreground)
            session.foregroundHeartbeats += 1;
        const pct = session.durationMs > 0 ? session.maxProgressMs / session.durationMs : 0;
        const milestones = [0.25, 0.5, 0.75, 1].filter((m) => pct >= m && !session.milestonesPaid.includes(m));
        for (const milestone of milestones) {
            session.milestonesPaid.push(milestone);
            if (milestone >= 0.25) {
                const action = milestone === 1 ? "completion" : "watch";
                this.tryRewardAction({ userId: input.userId, videoId: session.videoId, action, session, metadata: { milestone } });
            }
        }
        this.store.updateWatchSession(session);
        return { session, watchPct: Number(pct.toFixed(4)) };
    }
    pauseSession(input) {
        const session = this.requireOwnedSession(input.userId, input.sessionId);
        session.status = "paused";
        this.store.updateWatchSession(session);
        return session;
    }
    completeWatchSession(input) {
        const session = this.requireOwnedSession(input.userId, input.sessionId);
        session.status = "completed";
        session.endedAt = nowIso();
        this.store.updateWatchSession(session);
        if (this.isMeaningfulWatch(session)) {
            this.tryRewardAction({ userId: input.userId, videoId: session.videoId, action: "session_completion", session });
            this.tryRewardStreak(input.userId, session.videoId, session);
        }
        this.track("viewer_watch_session_completed", input.userId, { videoId: session.videoId, sessionId: session.id, totalWatchMs: session.totalWatchMs });
        return session;
    }
    submitRating(input) {
        if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5)
            throw new ValidationError(["rating must be between 1 and 5"]);
        const event = this.saveEvent({ ...input, action: "rating", value: input.rating });
        const decision = this.tryRewardAction({ userId: input.userId, videoId: input.videoId, action: "rating", metadata: { rating: input.rating } });
        return { event, decision };
    }
    submitEngagement(input) {
        const event = this.saveEvent({ ...input });
        const decision = this.tryRewardAction({ userId: input.userId, videoId: input.videoId, action: input.action, metadata: input.metadata });
        return { event, decision };
    }
    submitComment(input) {
        const action = input.parentCommentId ? "comment_reply" : "comment";
        const decision = this.tryRewardAction({ userId: input.userId, videoId: input.videoId, action, text: input.text, metadata: { parentCommentId: input.parentCommentId, moderated: input.moderated, deleted: input.deleted } });
        const event = this.saveEvent({ userId: input.userId, videoId: input.videoId, action, text: input.text, metadata: { parentCommentId: input.parentCommentId } });
        return { event, decision };
    }
    createSponsoredPool(input) {
        if (input.fundedAtomic <= 0n)
            throw new ValidationError(["fundedAtomic must be positive"]);
        const pool = {
            ...input,
            id: input.id ?? `svp_${randomUUID()}`,
            remainingAtomic: input.fundedAtomic
        };
        this.store.saveSponsoredPool(pool);
        return pool;
    }
    mapVideoToCampaign(input) {
        if (!this.store.getSponsoredPool(input.poolId))
            throw new ValidationError(["pool not found"]);
        this.store.setVideoCampaign(input.videoId, input.poolId);
        return { ok: true };
    }
    getEligibility(input) {
        return this.evaluateEligibility(input.userId, input.videoId, input.action, undefined, undefined);
    }
    listViewerRewards(userId) {
        return this.store.listLedgerEntries(userId);
    }
    getViewerSummary(userId) {
        return this.getOrCreateSummary(userId);
    }
    getCampaignMetadata(videoId) {
        const pool = this.store.findSponsoredPoolForVideo(videoId, nowIso());
        if (!pool)
            return null;
        return {
            poolId: pool.id,
            campaignId: pool.campaignId,
            sponsorBusinessId: pool.sponsorBusinessId,
            remainingAtomic: pool.remainingAtomic,
            eligibleActions: pool.eligibleActions
        };
    }
    listRiskFlags(userId) {
        return this.store.listRiskFlags(userId);
    }
    reverseReward(input) {
        const entry = this.store.getLedgerEntry(input.ledgerEntryId);
        if (!entry)
            throw new ValidationError(["ledger entry not found"]);
        if (entry.status === "reversed")
            return entry;
        entry.status = "reversed";
        entry.updatedAt = nowIso();
        entry.metadata = { ...entry.metadata, reversedBy: input.actor, reverseReason: input.reason };
        this.store.saveLedgerEntry(entry);
        const summary = this.getOrCreateSummary(entry.userId);
        summary.earnedAtomic = summary.earnedAtomic > entry.amountAtomic ? summary.earnedAtomic - entry.amountAtomic : 0n;
        summary.updatedAt = nowIso();
        this.store.saveRewardSummary(summary);
        return entry;
    }
    updateRule(rule) {
        this.store.upsertRewardRule(rule);
        return rule;
    }
    listRules() {
        return this.store.listRewardRules();
    }
    tryRewardStreak(userId, videoId, session) {
        const summary = this.getOrCreateSummary(userId);
        const today = dateKey(nowIso());
        const yesterday = dateKey(new Date(Date.now() - DAY_MS).toISOString());
        if (summary.lastEngagementDate === today)
            return;
        summary.streakDays = summary.lastEngagementDate === yesterday ? summary.streakDays + 1 : 1;
        summary.lastEngagementDate = today;
        summary.updatedAt = nowIso();
        this.store.saveRewardSummary(summary);
        if (summary.streakDays > 1)
            this.tryRewardAction({ userId, videoId, action: "streak", session, metadata: { streakDays: summary.streakDays } });
    }
    tryRewardAction(input) {
        const decision = this.evaluateEligibility(input.userId, input.videoId, input.action, input.session, input.text, input.metadata);
        this.store.saveEligibilityDecision(decision);
        if (!decision.eligible)
            return decision;
        const rule = decision.ruleSnapshot;
        const source = this.resolveRewardSource(input.videoId, input.action, rule.baseRewardAtomic, input.userId);
        if (!source.ok) {
            const rejected = { ...decision, eligible: false, reasonCodes: [...decision.reasonCodes, source.reason] };
            this.store.saveEligibilityDecision(rejected);
            return rejected;
        }
        const status = decision.pendingReview ? "pending" : "settled";
        const now = nowIso();
        const ledger = {
            id: `vrl_${randomUUID()}`,
            userId: input.userId,
            videoId: input.videoId,
            creatorId: this.requireVideoContext(input.videoId).creatorId,
            placeId: this.requireVideoContext(input.videoId).placeId,
            action: input.action,
            amountAtomic: source.amountAtomic,
            source: source.source,
            sourceId: source.sourceId,
            campaignId: source.campaignId,
            status,
            reason: "eligible",
            decisionId: decision.id,
            createdAt: now,
            updatedAt: now,
            metadata: input.metadata ?? {}
        };
        this.store.saveLedgerEntry(ledger);
        const summary = this.getOrCreateSummary(input.userId);
        if (status === "settled") {
            summary.earnedAtomic += ledger.amountAtomic;
            if (dateKey(now) === dateKey(nowIso()))
                summary.todayEarnedAtomic += ledger.amountAtomic;
        }
        else {
            summary.pendingAtomic += ledger.amountAtomic;
        }
        summary.updatedAt = now;
        this.store.saveRewardSummary(summary);
        this.track(status === "settled" ? "viewer_reward_paid" : "viewer_reward_pending", input.userId, { action: input.action, amountAtomic: String(ledger.amountAtomic), source: ledger.source, videoId: input.videoId });
        return decision;
    }
    evaluateEligibility(userId, videoId, action, session, text, metadata) {
        const now = nowIso();
        const ctx = this.requireVideoContext(videoId);
        const reasons = [];
        const rule = this.store.getRewardRule(action);
        if (!rule?.enabled)
            reasons.push("rule_disabled");
        if (this.config.selfEngagementForbidden && ctx.creatorId === userId)
            reasons.push("self_engagement_blocked");
        const recent = this.store.listLedgerEntries(userId).filter((entry) => entry.action === action && entry.videoId === videoId && entry.status !== "reversed");
        if (rule && recent.some((entry) => Date.now() - Date.parse(entry.createdAt) < rule.cooldownHours * 60 * 60 * 1000))
            reasons.push("cooldown_active");
        const sessionForVideo = session ?? this.store.listUserWatchSessions(userId, 50).find((item) => item.videoId === videoId);
        const watchPct = sessionForVideo ? sessionForVideo.maxProgressMs / Math.max(1, sessionForVideo.durationMs) : 0;
        const foregroundRatio = sessionForVideo ? sessionForVideo.foregroundHeartbeats / Math.max(1, sessionForVideo.heartbeatCount) : 0;
        if (rule?.requiresWatchFirst && !sessionForVideo)
            reasons.push("watch_required_before_action");
        if ((rule?.minWatchMs ?? 0) > 0 && (sessionForVideo?.totalWatchMs ?? 0) < (rule?.minWatchMs ?? 0))
            reasons.push("watch_ms_below_threshold");
        if ((rule?.minWatchPct ?? 0) > 0 && watchPct < (rule?.minWatchPct ?? 0))
            reasons.push("watch_pct_below_threshold");
        if (sessionForVideo && foregroundRatio < this.config.minForegroundRatio)
            reasons.push("insufficient_foreground_engagement");
        if ((action === "comment" || action === "comment_reply") && metadata?.deleted === true)
            reasons.push("comment_deleted");
        if ((action === "comment" || action === "comment_reply") && metadata?.moderated === true)
            reasons.push("comment_under_review");
        if ((action === "comment" || action === "comment_reply") && rule?.requiresMinCommentLength && (text?.trim().length ?? 0) < rule.requiresMinCommentLength)
            reasons.push("comment_too_short");
        if ((action === "comment" || action === "comment_reply") && rule?.requiresUniqueComment && text) {
            const dupWindow = this.config.duplicateCommentWindowHours * 60 * 60 * 1000;
            const normalized = clean(text);
            const dup = this.store.listUserEvents(userId, action).some((event) => clean(event.text ?? "") === normalized && Date.now() - Date.parse(event.occurredAt) < dupWindow);
            if (dup)
                reasons.push("comment_duplicate_template");
            if (new Set(normalized.split(" ")).size <= 3)
                reasons.push("comment_low_entropy");
        }
        const todayKey = dateKey(now);
        const todayEntries = this.store.listLedgerEntries(userId).filter((entry) => dateKey(entry.createdAt) === todayKey && entry.status !== "reversed");
        const todaySum = todayEntries.reduce((acc, entry) => acc + entry.amountAtomic, 0n);
        if (todaySum >= this.config.maxRewardsPerDayAtomic)
            reasons.push("daily_cap_reached");
        const todayPerVideo = todayEntries.filter((entry) => entry.videoId === videoId).reduce((acc, entry) => acc + entry.amountAtomic, 0n);
        if (todayPerVideo >= this.config.maxRewardsPerVideoPerDayAtomic)
            reasons.push("per_video_daily_cap_reached");
        if (rule && todayEntries.filter((entry) => entry.action === action).length >= rule.maxPerDay)
            reasons.push("action_daily_cap_reached");
        const riskScore = this.computeRiskScore(userId, videoId, sessionForVideo);
        if (riskScore >= this.config.trustTierRiskThresholds.reject)
            reasons.push("risk_rejected");
        const pendingReview = riskScore >= Math.max(this.config.trustTierRiskThresholds.pending, rule?.pendingIfRiskAtOrAbove ?? 1);
        const decision = {
            id: `vrd_${randomUUID()}`,
            userId,
            videoId,
            action,
            eligible: reasons.length === 0,
            reasonCodes: reasons,
            riskScore,
            pendingReview,
            ruleSnapshot: rule ?? undefined,
            createdAt: now
        };
        if (riskScore >= this.config.trustTierRiskThresholds.pending) {
            this.store.saveRiskFlag({
                id: `vrf_${randomUUID()}`,
                userId,
                videoId,
                sessionId: sessionForVideo?.id,
                severity: riskScore > 0.85 ? "high" : riskScore > 0.65 ? "medium" : "low",
                reason: reasons.join(",") || "suspicious_pattern",
                score: riskScore,
                createdAt: now
            });
            this.track("viewer_engagement_flagged", userId, { videoId, action, riskScore, reasons });
        }
        if (!decision.eligible)
            this.track("viewer_reward_denied", userId, { videoId, action, reasons, riskScore });
        return decision;
    }
    computeRiskScore(userId, videoId, session) {
        let score = 0;
        const now = Date.now();
        const sessions = this.store.listUserWatchSessions(userId, 25);
        const quickSessions = sessions.filter((item) => now - Date.parse(item.startedAt) < 10 * 60 * 1000 && item.totalWatchMs < 8_000).length;
        if (quickSessions >= 6)
            score += 0.4;
        const sameVideoSessions = sessions.filter((item) => item.videoId === videoId && now - Date.parse(item.startedAt) < 24 * 60 * 60 * 1000).length;
        if (sameVideoSessions >= 4)
            score += 0.3;
        if (session && session.heartbeatCount > 0 && session.foregroundHeartbeats / session.heartbeatCount < this.config.minForegroundRatio)
            score += 0.2;
        if (session && session.totalWatchMs < this.config.minimumMeaningfulWatchMs)
            score += 0.2;
        return Math.min(1, Number(score.toFixed(2)));
    }
    resolveRewardSource(videoId, action, amountAtomic, userId) {
        const pool = this.store.findSponsoredPoolForVideo(videoId, nowIso());
        if (!pool || !pool.eligibleActions.includes(action)) {
            return { ok: true, source: "platform", sourceId: "platform_viewer_pool", amountAtomic };
        }
        const today = dateKey(nowIso());
        const paidToday = this.store.listLedgerEntries(userId)
            .filter((entry) => entry.campaignId === pool.campaignId && dateKey(entry.createdAt) === today && entry.status !== "reversed")
            .reduce((acc, entry) => acc + entry.amountAtomic, 0n);
        if (paidToday + amountAtomic > pool.perUserDailyCapAtomic)
            return { ok: false, reason: "campaign_user_cap_reached" };
        if (pool.remainingAtomic < amountAtomic)
            return { ok: false, reason: "campaign_budget_exhausted" };
        pool.remainingAtomic -= amountAtomic;
        this.store.saveSponsoredPool(pool);
        return { ok: true, source: "campaign", sourceId: pool.id, campaignId: pool.campaignId, amountAtomic };
    }
    isMeaningfulWatch(session) {
        const pct = session.maxProgressMs / Math.max(1, session.durationMs);
        const foregroundRatio = session.foregroundHeartbeats / Math.max(1, session.heartbeatCount);
        return session.totalWatchMs >= this.config.minimumMeaningfulWatchMs
            && pct >= this.config.minimumMeaningfulWatchPct
            && foregroundRatio >= this.config.minForegroundRatio;
    }
    requireOwnedSession(userId, sessionId) {
        const session = this.store.getWatchSession(sessionId);
        if (!session || session.userId !== userId)
            throw new ValidationError(["session_not_found"]);
        return session;
    }
    requireVideoContext(videoId) {
        const ctx = this.deps.getVideoContext(videoId);
        if (!ctx)
            throw new ValidationError(["video_not_found"]);
        return ctx;
    }
    saveEvent(input) {
        const ctx = this.requireVideoContext(input.videoId);
        const event = {
            id: `vee_${randomUUID()}`,
            userId: input.userId,
            videoId: input.videoId,
            creatorId: ctx.creatorId,
            placeId: ctx.placeId,
            action: input.action,
            value: input.value,
            text: input.text,
            metadata: input.metadata,
            occurredAt: nowIso()
        };
        this.store.saveEvent(event);
        this.track("viewer_engagement_event", input.userId, { action: input.action, videoId: input.videoId });
        return event;
    }
    getOrCreateSummary(userId) {
        return this.store.getRewardSummary(userId) ?? {
            userId,
            earnedAtomic: 0n,
            pendingAtomic: 0n,
            rejectedAtomic: 0n,
            todayEarnedAtomic: 0n,
            streakDays: 0,
            updatedAt: nowIso()
        };
    }
    track(eventName, userId, metadata) {
        void this.deps.analytics?.track({ eventName: eventName, metadata: metadata }, {
            actorUserId: userId,
            actorProfileType: "user",
            platform: "backend",
            environment: process.env.NODE_ENV ?? "dev"
        });
    }
}
