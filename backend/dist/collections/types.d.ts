export type CollectionType = "place_set" | "district" | "neighborhood" | "cuisine" | "attraction" | "local_scene" | "mixed";
export type CollectionSource = "curated" | "rule_based";
export type CollectionStatus = "draft" | "active" | "archived";
export type QualificationActionType = "save" | "review" | "video" | "meaningful_interaction";
export interface CollectionRewardDefinition {
    xp: number;
    badgeId?: string;
    title?: string;
}
export interface CollectionRule {
    cityId?: string;
    districtId?: string;
    neighborhoodId?: string;
    cuisineTags?: string[];
    attractionTags?: string[];
    sceneTags?: string[];
    minPlaceCount?: number;
}
export interface CanonicalPlaceSnapshot {
    canonicalPlaceId: string;
    cityId: string;
    districtId?: string;
    neighborhoodId?: string;
    cuisineTags: string[];
    attractionTags: string[];
    sceneTags: string[];
    deleted?: boolean;
}
export interface CollectionDefinition {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: CollectionType;
    source: CollectionSource;
    status: CollectionStatus;
    featured?: boolean;
    rarity?: "common" | "rare" | "epic";
    cityId?: string;
    districtId?: string;
    cuisineTag?: string;
    attractionTag?: string;
    sceneTag?: string;
    explicitPlaceIds?: string[];
    rules?: CollectionRule;
    qualifyingActionType: QualificationActionType;
    requiredCount?: number;
    trustGate?: {
        minTrustScore?: number;
        requireTrustedCreator?: boolean;
        maxModerationStrikes?: number;
    };
    reward?: CollectionRewardDefinition;
    visibility: "public" | "internal";
    availability?: {
        startsAt?: string;
        endsAt?: string;
        marketIds?: string[];
    };
    curationNotes?: string;
    createdAtISO: string;
    updatedAtISO: string;
}
export interface CollectionProgress {
    userId: string;
    collectionId: string;
    collectedPlaceIds: string[];
    status: "not_started" | "in_progress" | "completed";
    startedAtISO?: string;
    completedAtISO?: string;
    updatedAtISO: string;
    blockedAttempts: number;
    rewardGrantedAtISO?: string;
}
export interface CollectionActivityEvent {
    eventId: string;
    userId: string;
    canonicalPlaceId: string;
    actionType: QualificationActionType;
    occurredAtISO: string;
    moderationState?: "active" | "hidden" | "removed" | "rejected";
    suspicious?: boolean;
    trustedCreator?: boolean;
    trustScore?: number;
    moderationStrikes?: number;
}
export interface CollectionSummaryDto {
    id: string;
    title: string;
    type: CollectionType;
    cityId?: string;
    badge?: string;
    featured: boolean;
    rarity?: string;
    totalItems: number;
    completedItems: number;
    remainingItems: number;
    status: CollectionProgress["status"];
    reward?: CollectionRewardDefinition;
}
export interface CollectionDetailDto extends CollectionSummaryDto {
    description: string;
    members: Array<{
        canonicalPlaceId: string;
        collected: boolean;
    }>;
    qualifyingActionType: QualificationActionType;
    completionDate?: string;
}
export interface CollectionStore {
    listDefinitions(): CollectionDefinition[];
    saveDefinition(definition: CollectionDefinition): void;
    getDefinition(id: string): CollectionDefinition | null;
    listPlaceSnapshots(): CanonicalPlaceSnapshot[];
    getProgress(userId: string, collectionId: string): CollectionProgress | null;
    saveProgress(progress: CollectionProgress): void;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
}
