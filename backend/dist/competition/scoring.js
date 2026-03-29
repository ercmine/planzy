export function resolveQualityBand(earlyLikeCount, config) {
    const sorted = [...config.qualityBands].sort((a, b) => b.minLikes - a.minLikes);
    const match = sorted.find((item) => earlyLikeCount >= item.minLikes) ?? sorted[sorted.length - 1];
    return { band: match.band, points: match.points };
}
export function computeCompetitionScore(input) {
    const { config } = input;
    const approvedReviewPoints = input.approvedReviewCount * config.approvedReviewPoints;
    const discoveryBonusPoints = input.discoveryEvents.reduce((sum, event) => sum + (config.discoveryBonusPoints[event.discoveryType] ?? 0), 0);
    const streakPoints = input.streakDays * config.streakPointPerDay;
    const tipBonusPoints = Number(input.tipAtomic) / 1_000_000_000 * config.tipPointsPerDryad;
    const missionCompletionPoints = input.missionCompletionCount * config.missionCompletionPoints;
    return Number((approvedReviewPoints + discoveryBonusPoints + input.qualityPoints + streakPoints + (input.engagementBonusPoints ?? config.engagementBonusPoints) + tipBonusPoints + missionCompletionPoints).toFixed(3));
}
