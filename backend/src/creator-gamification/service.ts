import { DEFAULT_CREATOR_GAMIFICATION_CONFIG } from "./config.js";
import type {
  CoverageProgress,
  CreatorGamificationAdminSnapshot,
  CreatorGamificationConfig,
  CreatorGamificationProfile,
  CreatorGamificationSummaryDto,
  CreatorMilestoneDefinition,
  CreatorMilestoneProgress,
  CreatorPrestigeShowcase,
  CreatorPublishInput,
  CreatorPublishResult,
  PublishSuppressionReason,
  TrustTier
} from "./types.js";

type InternalProfile = Omit<CreatorGamificationProfile, "milestones" | "showcases" | "coverage"> & {
  milestones: Map<string, CreatorMilestoneProgress>;
  showcases: Map<string, CreatorPrestigeShowcase>;
  coverageMaps: {
    cityPlaces: Map<string, Set<string>>;
    cityNeighborhoods: Map<string, Set<string>>;
    categoryPlaces: Map<string, Set<string>>;
    districtPlaces: Map<string, Set<string>>;
  };
  trustTier: TrustTier;
};

const TRUST_LEVEL: Record<TrustTier, number> = { low: 1, developing: 2, trusted: 3, high: 4 };

export class CreatorGamificationService {
  private readonly config: CreatorGamificationConfig;
  private readonly profiles = new Map<string, InternalProfile>();
  private readonly publishDailyCounts = new Map<string, number>();
  private readonly placeDailyCounts = new Map<string, number>();
  private readonly lastPlacePublishDay = new Map<string, string>();
  private readonly suppressionCounts = new Map<PublishSuppressionReason, number>();
  private readonly milestoneCompletionCounts = new Map<string, number>();

  constructor(config: Partial<CreatorGamificationConfig> = {}) {
    this.config = {
      ...DEFAULT_CREATOR_GAMIFICATION_CONFIG,
      ...config,
      milestones: config.milestones ?? DEFAULT_CREATOR_GAMIFICATION_CONFIG.milestones,
      showcases: config.showcases ?? DEFAULT_CREATOR_GAMIFICATION_CONFIG.showcases
    };
  }

  recordPublish(input: CreatorPublishInput): CreatorPublishResult {
    const occurredAt = input.occurredAt ?? new Date();
    const profile = this.getOrCreateProfile(input.creatorId);
    profile.trustTier = input.trustTier ?? profile.trustTier;
    const day = this.dayKey(occurredAt);
    const week = this.weekKey(occurredAt);

    const suppressionReason = this.resolveSuppression(input, day, profile.trustTier);
    const unlockedMilestones: CreatorMilestoneDefinition[] = [];
    const unlockedShowcases: CreatorPrestigeShowcase[] = [];

    if (!suppressionReason) {
      this.applyQualifiedPublish(profile, input, day, week, occurredAt);
      unlockedMilestones.push(...this.updateMilestones(profile, occurredAt));
      unlockedShowcases.push(...this.updateShowcases(profile, occurredAt));
    } else {
      profile.antiAbuseFlags = Array.from(new Set([...profile.antiAbuseFlags, suppressionReason]));
      this.suppressionCounts.set(suppressionReason, (this.suppressionCounts.get(suppressionReason) ?? 0) + 1);
    }

    profile.lastUpdatedAt = occurredAt.toISOString();
    const notifications = this.buildNotifications(unlockedMilestones, unlockedShowcases, suppressionReason);

    return {
      qualifies: !suppressionReason,
      suppressionReason,
      unlockedMilestones,
      unlockedShowcases: unlockedShowcases.map((showcase) => this.config.showcases.find((item) => item.id === showcase.showcaseId)!).filter(Boolean),
      profile: this.snapshot(profile),
      notifications
    };
  }

  getSummary(creatorId: string): CreatorGamificationSummaryDto {
    const profile = this.snapshot(this.getOrCreateProfile(creatorId));
    const nextMilestones = profile.milestones
      .filter((milestone) => !milestone.completedAt)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
    return { profile, nextMilestones };
  }

  featureShowcases(creatorId: string, showcaseIds: string[]): CreatorGamificationProfile {
    const profile = this.getOrCreateProfile(creatorId);
    const allowed = new Set(showcaseIds.slice(0, this.config.showcaseSlots));
    for (const showcase of profile.showcases.values()) {
      showcase.featured = allowed.has(showcase.showcaseId);
    }
    return this.snapshot(profile);
  }

  getAdminSnapshot(): CreatorGamificationAdminSnapshot {
    const suppressionCounts: Partial<Record<PublishSuppressionReason, number>> = {};
    for (const [reason, count] of this.suppressionCounts.entries()) suppressionCounts[reason] = count;
    const milestoneCompletionCounts: Record<string, number> = {};
    for (const [milestoneId, count] of this.milestoneCompletionCounts.entries()) milestoneCompletionCounts[milestoneId] = count;
    return { config: this.config, suppressionCounts, milestoneCompletionCounts };
  }

  private resolveSuppression(input: CreatorPublishInput, day: string, trustTier: TrustTier): PublishSuppressionReason | undefined {
    if (["hidden", "removed", "rejected"].includes(input.moderationState ?? "active")) return "moderation_blocked";
    if (input.suspicious) return "suspicious_activity";
    if (input.qualityScore < this.config.minQualityScoreForQualifyingPublish || input.engagementScore < this.config.minEngagementScoreForQualityPublish) {
      return "quality_gate";
    }

    const dailyKey = `${input.creatorId}:${day}`;
    if ((this.publishDailyCounts.get(dailyKey) ?? 0) >= this.config.maxQualifyingPublishesPerDay) return "daily_publish_cap";

    const placeDailyKey = `${input.creatorId}:${input.canonicalPlaceId}:${day}`;
    if ((this.placeDailyCounts.get(placeDailyKey) ?? 0) >= this.config.repeatedPlaceDailyCap) return "repeat_place_cap";

    const lastPlaceKey = `${input.creatorId}:${input.canonicalPlaceId}`;
    const lastDay = this.lastPlacePublishDay.get(lastPlaceKey);
    if (lastDay && this.daysBetween(lastDay, day) < this.config.repeatedPlaceCooldownDays) return "repeat_place_cooldown";

    if (TRUST_LEVEL[trustTier] < TRUST_LEVEL.developing && input.trustedSignals && (input.trustedSignals.helpfulSaves > 0 || input.trustedSignals.verifiedCompletes > 0)) {
      return "trust_gate";
    }

    return undefined;
  }

  private applyQualifiedPublish(profile: InternalProfile, input: CreatorPublishInput, day: string, week: string, occurredAt: Date): void {
    profile.qualifyingPublishes += 1;
    profile.qualityPublishes += 1;

    const trustIsEligible = TRUST_LEVEL[profile.trustTier] >= TRUST_LEVEL[this.config.trustedMilestoneMinTrust];
    if (trustIsEligible && (input.trustedSignals?.helpfulSaves ?? 0) + (input.trustedSignals?.verifiedCompletes ?? 0) > 0) {
      profile.trustedReviewCount += 1;
    }

    if (!profile.streaks.lastQualifiedDay || this.daysBetween(profile.streaks.lastQualifiedDay, day) <= this.config.dailyStreakGraceDays + 1) {
      profile.streaks.dailyCount = this.bump(profile.streaks.lastQualifiedDay, day, profile.streaks.dailyCount, this.config.dailyStreakGraceDays + 1);
    } else {
      profile.streaks.dailyCount = 1;
    }

    if (!profile.streaks.lastQualifiedWeek || this.weeksBetween(profile.streaks.lastQualifiedWeek, week) <= this.config.weeklyStreakGraceWeeks + 1) {
      profile.streaks.weeklyCount = this.bump(profile.streaks.lastQualifiedWeek, week, profile.streaks.weeklyCount, this.config.weeklyStreakGraceWeeks + 1);
    } else {
      profile.streaks.weeklyCount = 1;
    }

    profile.streaks.bestDailyCount = Math.max(profile.streaks.bestDailyCount, profile.streaks.dailyCount);
    profile.streaks.bestWeeklyCount = Math.max(profile.streaks.bestWeeklyCount, profile.streaks.weeklyCount);
    profile.streaks.lastQualifiedDay = day;
    profile.streaks.lastQualifiedWeek = week;

    const dailyKey = `${input.creatorId}:${day}`;
    this.publishDailyCounts.set(dailyKey, (this.publishDailyCounts.get(dailyKey) ?? 0) + 1);

    const placeDailyKey = `${input.creatorId}:${input.canonicalPlaceId}:${day}`;
    this.placeDailyCounts.set(placeDailyKey, (this.placeDailyCounts.get(placeDailyKey) ?? 0) + 1);
    this.lastPlacePublishDay.set(`${input.creatorId}:${input.canonicalPlaceId}`, day);

    this.addCoverage(profile.coverageMaps.cityPlaces, input.cityId, input.canonicalPlaceId);
    if (input.neighborhoodId) this.addCoverage(profile.coverageMaps.cityNeighborhoods, input.cityId, input.neighborhoodId);
    for (const categoryId of input.categoryIds) this.addCoverage(profile.coverageMaps.categoryPlaces, categoryId, input.canonicalPlaceId);
    if (input.districtId) this.addCoverage(profile.coverageMaps.districtPlaces, input.districtId, input.canonicalPlaceId);

    if (TRUST_LEVEL[profile.trustTier] >= TRUST_LEVEL.trusted && input.moderationState !== "pending_review") {
      const latest = profile.lastUpdatedAt ? this.dayKey(new Date(profile.lastUpdatedAt)) : undefined;
      if (!latest || this.daysBetween(latest, day) > 0) profile.cleanContributionDays += 1;
    }

    profile.lastUpdatedAt = occurredAt.toISOString();
  }

  private updateMilestones(profile: InternalProfile, occurredAt: Date): CreatorMilestoneDefinition[] {
    const unlocked: CreatorMilestoneDefinition[] = [];
    for (const definition of this.config.milestones) {
      const progress = this.metricValue(profile, definition);
      const current = profile.milestones.get(definition.id) ?? { milestoneId: definition.id, progress: 0 };
      current.progress = progress;
      if (definition.minTrustTier && TRUST_LEVEL[profile.trustTier] < TRUST_LEVEL[definition.minTrustTier]) {
        current.suppressed = true;
      } else if (!current.completedAt && progress >= definition.threshold) {
        current.completedAt = occurredAt.toISOString();
        current.suppressed = false;
        unlocked.push(definition);
        this.milestoneCompletionCounts.set(definition.id, (this.milestoneCompletionCounts.get(definition.id) ?? 0) + 1);
      }
      profile.milestones.set(definition.id, current);
    }
    return unlocked;
  }

  private updateShowcases(profile: InternalProfile, occurredAt: Date): CreatorPrestigeShowcase[] {
    const unlocked: CreatorPrestigeShowcase[] = [];
    for (const definition of this.config.showcases) {
      const existing = profile.showcases.get(definition.id);
      if (existing) continue;
      const hasAllMilestones = definition.milestoneIds.every((milestoneId) => profile.milestones.get(milestoneId)?.completedAt);
      const trustEligible = !definition.trustedOnly || TRUST_LEVEL[profile.trustTier] >= TRUST_LEVEL.trusted;
      if (hasAllMilestones && trustEligible) {
        const showcase: CreatorPrestigeShowcase = { showcaseId: definition.id, unlockedAt: occurredAt.toISOString(), featured: false };
        profile.showcases.set(definition.id, showcase);
        unlocked.push(showcase);
      }
    }
    return unlocked;
  }

  private metricValue(profile: InternalProfile, definition: CreatorMilestoneDefinition): number {
    const cityId = definition.cityId ?? "";
    const categoryId = definition.categoryId ?? "";
    const districtId = definition.districtId ?? "";
    switch (definition.metric) {
      case "daily_streak":
        return profile.streaks.dailyCount;
      case "weekly_streak":
        return profile.streaks.weeklyCount;
      case "quality_publishes":
        return profile.qualityPublishes;
      case "trusted_reviews":
        return profile.trustedReviewCount;
      case "trusted_clean_days":
        return profile.cleanContributionDays;
      case "city_distinct_places":
        return profile.coverageMaps.cityPlaces.get(cityId)?.size ?? 0;
      case "city_neighborhoods":
        return profile.coverageMaps.cityNeighborhoods.get(cityId)?.size ?? 0;
      case "category_distinct_places":
        return profile.coverageMaps.categoryPlaces.get(categoryId)?.size ?? 0;
      case "district_distinct_places":
        return profile.coverageMaps.districtPlaces.get(districtId)?.size ?? 0;
    }
  }

  private addCoverage(map: Map<string, Set<string>>, key: string, value: string): void {
    const set = map.get(key) ?? new Set<string>();
    set.add(value);
    map.set(key, set);
  }

  private buildNotifications(unlockedMilestones: CreatorMilestoneDefinition[], unlockedShowcases: CreatorPrestigeShowcase[], suppressionReason?: PublishSuppressionReason): string[] {
    const notifications: string[] = [];
    for (const milestone of unlockedMilestones) notifications.push(`milestone_unlocked:${milestone.id}`);
    for (const showcase of unlockedShowcases) notifications.push(`showcase_unlocked:${showcase.showcaseId}`);
    if (suppressionReason === "quality_gate") notifications.push("creator_tip:focus_on_quality");
    if (suppressionReason === "daily_publish_cap") notifications.push("creator_tip:post_tomorrow_for_streak");
    return notifications;
  }

  private snapshot(profile: InternalProfile): CreatorGamificationProfile {
    const coverage = (map: Map<string, Set<string>>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const [key, values] of map.entries()) out[key] = values.size;
      return out;
    };
    const coverageState: CoverageProgress = {
      cityPlaceCounts: coverage(profile.coverageMaps.cityPlaces),
      cityNeighborhoodCounts: coverage(profile.coverageMaps.cityNeighborhoods),
      categoryPlaceCounts: coverage(profile.coverageMaps.categoryPlaces),
      districtPlaceCounts: coverage(profile.coverageMaps.districtPlaces)
    };

    return {
      creatorId: profile.creatorId,
      qualifyingPublishes: profile.qualifyingPublishes,
      qualityPublishes: profile.qualityPublishes,
      trustedReviewCount: profile.trustedReviewCount,
      cleanContributionDays: profile.cleanContributionDays,
      streaks: { ...profile.streaks },
      coverage: coverageState,
      milestones: Array.from(profile.milestones.values()),
      showcases: Array.from(profile.showcases.values()),
      antiAbuseFlags: [...profile.antiAbuseFlags],
      lastUpdatedAt: profile.lastUpdatedAt
    };
  }

  private getOrCreateProfile(creatorId: string): InternalProfile {
    const existing = this.profiles.get(creatorId);
    if (existing) return existing;
    const created: InternalProfile = {
      creatorId,
      qualifyingPublishes: 0,
      qualityPublishes: 0,
      trustedReviewCount: 0,
      cleanContributionDays: 0,
      streaks: { dailyCount: 0, weeklyCount: 0, bestDailyCount: 0, bestWeeklyCount: 0 },
      milestones: new Map(),
      showcases: new Map(),
      coverageMaps: {
        cityPlaces: new Map(),
        cityNeighborhoods: new Map(),
        categoryPlaces: new Map(),
        districtPlaces: new Map()
      },
      antiAbuseFlags: [],
      trustTier: "developing"
    };
    this.profiles.set(creatorId, created);
    return created;
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private weekKey(date: Date): string {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  private daysBetween(startDayIso: string, endDayIso: string): number {
    const start = Date.parse(`${startDayIso}T00:00:00.000Z`);
    const end = Date.parse(`${endDayIso}T00:00:00.000Z`);
    return Math.floor((end - start) / 86400000);
  }

  private weeksBetween(startWeek: string, endWeek: string): number {
    const [startYear, startWeekPart] = startWeek.split("-W");
    const [endYear, endWeekPart] = endWeek.split("-W");
    return (Number(endYear) - Number(startYear)) * 52 + (Number(endWeekPart) - Number(startWeekPart));
  }

  private bump(previousDateOrWeek: string | undefined, currentDateOrWeek: string, currentCount: number, threshold: number): number {
    if (!previousDateOrWeek) return 1;
    if (previousDateOrWeek === currentDateOrWeek) return currentCount;
    return threshold >= 1 ? currentCount + 1 : 1;
  }
}
