import type { ModerationService } from "../moderation/service.js";
import type { ModerationTargetRef } from "../moderation/types.js";
import type { ContentTrustSummary, CreatorTrustSummary, PlaceTrustSummary, TrustTier } from "./types.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toTier(score: number): TrustTier {
  if (score >= 0.82) return "high";
  if (score >= 0.65) return "trusted";
  if (score >= 0.42) return "developing";
  return "low";
}

export class TrustSafetyService {
  constructor(private readonly moderation: ModerationService) {}

  getContentSummary(target: ModerationTargetRef, baseQuality = 0.5): ContentTrustSummary {
    const aggregate = this.moderation.getAggregate(target);
    const moderationPenalty = ["hidden", "removed", "rejected"].includes(aggregate.state)
      ? 0.7
      : ["pending_review", "auto_limited", "escalated"].includes(aggregate.state)
        ? 0.25
        : 0;
    const reportPenalty = Math.min(0.3, aggregate.uniqueReporterCount * 0.06);
    const riskPenalty = Math.max(
      aggregate.scoreSummary.spamScore,
      aggregate.scoreSummary.toxicityScore,
      aggregate.scoreSummary.duplicateScore,
      aggregate.scoreSummary.suspiciousActivityScore,
      aggregate.scoreSummary.fraudScore
    ) * 0.45;
    const trustScore = clamp01(baseQuality - moderationPenalty - reportPenalty - riskPenalty + 0.2);
    const reasons = [
      `state:${aggregate.state}`,
      `reports:${aggregate.reportCount}`,
      `risk:${Math.max(aggregate.scoreSummary.spamScore, aggregate.scoreSummary.toxicityScore, aggregate.scoreSummary.fraudScore).toFixed(2)}`
    ];
    const badges = [] as string[];
    if (trustScore >= 0.65 && aggregate.state === "active") badges.push("trusted_content");
    if (aggregate.state === "pending_review" || aggregate.state === "auto_limited") badges.push("under_review");
    if (["hidden", "removed", "rejected"].includes(aggregate.state)) badges.push("not_public");
    return {
      target,
      moderationState: aggregate.state,
      trustScore,
      trustTier: toTier(trustScore),
      badges,
      rankingAdjustment: ["hidden", "removed", "rejected"].includes(aggregate.state)
        ? -1
        : aggregate.state === "auto_limited"
          ? -0.25
          : trustScore >= 0.82
            ? 0.2
            : trustScore >= 0.65
              ? 0.12
              : trustScore <= 0.3
                ? -0.12
                : 0,
      reasons
    };
  }

  summarizeCreator(input: { creatorUserId: string; contentTargets: ModerationTargetRef[]; verifiedCreator?: boolean }): CreatorTrustSummary {
    const summaries = input.contentTargets.map((target) => this.getContentSummary(target));
    const publishedCount = summaries.filter((entry) => entry.moderationState === "active" || entry.moderationState === "restored").length;
    const hiddenOrRejectedCount = summaries.filter((entry) => ["hidden", "removed", "rejected"].includes(entry.moderationState)).length;
    const mean = summaries.length ? summaries.reduce((acc, entry) => acc + entry.trustScore, 0) / summaries.length : 0.5;
    const moderationPenalty = summaries.length ? hiddenOrRejectedCount / summaries.length : 0;
    const score = clamp01(mean - moderationPenalty * 0.45 + (input.verifiedCreator ? 0.08 : 0));
    return {
      creatorUserId: input.creatorUserId,
      trustScore: score,
      trustTier: toTier(score),
      moderationPenalty: Number(moderationPenalty.toFixed(3)),
      verifiedCreator: Boolean(input.verifiedCreator),
      publishedCount,
      hiddenOrRejectedCount
    };
  }

  summarizePlace(input: { placeId: string; contentTargets: ModerationTargetRef[] }): PlaceTrustSummary {
    const summaries = input.contentTargets.map((target) => this.getContentSummary(target));
    const trustedContentCount = summaries.filter((entry) => entry.trustScore >= 0.65 && entry.moderationState !== "hidden" && entry.moderationState !== "removed" && entry.moderationState !== "rejected").length;
    const moderationIssueCount = summaries.filter((entry) => ["pending_review", "auto_limited", "hidden", "removed", "rejected", "escalated"].includes(entry.moderationState)).length;
    const totalContentCount = summaries.length;
    const trustedContentRatio = totalContentCount ? trustedContentCount / totalContentCount : 0;
    const trustScore = clamp01(trustedContentRatio * 0.75 + (1 - (moderationIssueCount / Math.max(totalContentCount, 1))) * 0.25);
    return {
      placeId: input.placeId,
      trustedContentCount,
      totalContentCount,
      moderationIssueCount,
      trustedContentRatio: Number(trustedContentRatio.toFixed(3)),
      trustScore: Number(trustScore.toFixed(3)),
      trustTier: toTier(trustScore)
    };
  }
}
