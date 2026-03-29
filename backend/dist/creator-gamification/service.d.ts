import type { CreatorGamificationAdminSnapshot, CreatorGamificationConfig, CreatorGamificationProfile, CreatorGamificationSummaryDto, CreatorPublishInput, CreatorPublishResult } from "./types.js";
export declare class CreatorGamificationService {
    private readonly config;
    private readonly profiles;
    private readonly publishDailyCounts;
    private readonly placeDailyCounts;
    private readonly lastPlacePublishDay;
    private readonly suppressionCounts;
    private readonly milestoneCompletionCounts;
    constructor(config?: Partial<CreatorGamificationConfig>);
    recordPublish(input: CreatorPublishInput): CreatorPublishResult;
    getSummary(creatorId: string): CreatorGamificationSummaryDto;
    featureShowcases(creatorId: string, showcaseIds: string[]): CreatorGamificationProfile;
    getAdminSnapshot(): CreatorGamificationAdminSnapshot;
    private resolveSuppression;
    private applyQualifiedPublish;
    private updateMilestones;
    private updateShowcases;
    private metricValue;
    private addCoverage;
    private buildNotifications;
    private snapshot;
    private getOrCreateProfile;
    private dayKey;
    private weekKey;
    private daysBetween;
    private weeksBetween;
    private bump;
}
