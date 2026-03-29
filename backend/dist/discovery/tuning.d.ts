import type { PlaceDocument, RecommendationSurface } from "./types.js";
export type ConfigScopeType = "global" | "city" | "category" | "category_city" | "surface" | "provider";
export type ConfigStatus = "draft" | "published" | "archived";
export interface RankingWeights {
    featuredBoost: number;
    trendingBoost: number;
    qualityBoost: number;
    reviewBoost: number;
    saveWeight: number;
    clickWeight: number;
    viewWeight: number;
    creatorAffinityWeight: number;
    sourceTrustWeight: number;
    freshnessWeight: number;
    diversityWeight: number;
}
export interface CategoryRankingRule {
    categoryId: string;
    enabled: boolean;
    confidenceThreshold: number;
    manualBoost: number;
    pinnedPlaceIds: string[];
    excludedPlaceIds: string[];
    sourcePreferences: Record<string, number>;
}
export interface FeaturedPlacementRule {
    placeId: string;
    scopeType: "global" | "city" | "category" | "category_city";
    city?: string;
    categoryId?: string;
    mode: "hard_pin" | "soft_boost";
    slot?: number;
    boost: number;
    startsAt?: string;
    endsAt?: string;
    enabled: boolean;
}
export interface TrendingRuleSet {
    recencyDecay: number;
    minEngagement: number;
    viewWeight: number;
    clickWeight: number;
    saveWeight: number;
    reviewWeight: number;
    trustWeight: number;
}
export interface SourceWeightRule {
    provider: string;
    qualityWeight: number;
    categoryConfidenceWeight: number;
    enabled: boolean;
    fallbackPriority: number;
    cityScope?: string;
    categoryScope?: string;
}
export interface RecommendationTuningRule {
    surface: RecommendationSurface;
    personalizedWeight: number;
    trendingWeight: number;
    nearbyWeight: number;
    creatorWeight: number;
    featuredWeight: number;
    diversityLimit: number;
    duplicationThreshold: number;
    freshnessBias: number;
}
export interface RankingConfigPayload {
    weights: RankingWeights;
    categoryRules: CategoryRankingRule[];
    featuredRules: FeaturedPlacementRule[];
    trendingRules: TrendingRuleSet;
    sourceRules: SourceWeightRule[];
    recommendationRules: RecommendationTuningRule[];
}
export interface RankingConfigSet {
    id: string;
    name: string;
    scopeType: ConfigScopeType;
    scopeKey?: string;
    status: ConfigStatus;
    version: number;
    createdBy: string;
    updatedBy: string;
    publishedBy?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    notes?: string;
    changeReason?: string;
    payload: RankingConfigPayload;
}
export interface RankingAuditEvent {
    id: string;
    configSetId: string;
    action: "created" | "updated" | "validated" | "published" | "rollback";
    actorId: string;
    at: string;
    reason?: string;
}
export declare class RankingConfigService {
    private readonly configs;
    private readonly audits;
    constructor();
    listConfigSets(options?: {
        includeDrafts?: boolean;
    }): RankingConfigSet[];
    getConfig(id: string): RankingConfigSet | undefined;
    createDraft(input: {
        actorId: string;
        name: string;
        scopeType: ConfigScopeType;
        scopeKey?: string;
        payload?: RankingConfigPayload;
        notes?: string;
    }): RankingConfigSet;
    updateDraft(input: {
        actorId: string;
        configSetId: string;
        payload: RankingConfigPayload;
        notes?: string;
    }): RankingConfigSet;
    validateDraft(configSetId: string, actorId: string): {
        valid: boolean;
        errors: string[];
    };
    publish(input: {
        actorId: string;
        configSetId: string;
        reason: string;
    }): RankingConfigSet;
    rollback(input: {
        actorId: string;
        scopeType: ConfigScopeType;
        scopeKey?: string;
        toVersion?: number;
        reason: string;
    }): RankingConfigSet;
    listAuditHistory(configSetId?: string): RankingAuditEvent[];
    private findById;
    private findByIdRef;
    private audit;
}
export interface RankingScope {
    city?: string;
    categoryId?: string;
    surface?: RecommendationSurface;
}
export interface ResolvedRankingConfig {
    weights: RankingWeights;
    categoryRules: CategoryRankingRule[];
    featuredRules: FeaturedPlacementRule[];
    trendingRules: TrendingRuleSet;
    sourceRules: SourceWeightRule[];
    recommendationRule?: RecommendationTuningRule;
    matchedConfigIds: string[];
}
export declare class RankingConfigResolver {
    private readonly service;
    constructor(service: RankingConfigService);
    resolve(scope: RankingScope): ResolvedRankingConfig;
    private scopeMatches;
}
export interface RankingEvaluation {
    score: number;
    reasons: string[];
    hardPinnedSlot?: number;
    excluded: boolean;
}
export declare function evaluateRankingAdjustments(place: PlaceDocument, baseScore: number, resolved: ResolvedRankingConfig, context: RankingScope & {
    provider?: string;
}): RankingEvaluation;
