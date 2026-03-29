import type { PlanTier } from "../subscriptions/types.js";
export type GroupType = "solo" | "couple" | "family" | "friends";
export type TransportMode = "walk" | "bike" | "car" | "transit";
export type ItineraryVisibility = "private" | "link" | "public";
export interface OutingPlannerRequest {
    prompt?: string;
    city?: string;
    neighborhood?: string;
    date?: string;
    startTime?: string;
    durationMinutes?: number;
    budgetLevel?: "low" | "medium" | "high";
    vibeTags?: string[];
    categoryPreferences?: string[];
    exclusions?: string[];
    indoorOutdoorPreference?: "indoor" | "outdoor" | "mixed";
    accessibilityNeeds?: string[];
    groupType?: GroupType;
    partySize?: number;
    transportMode?: TransportMode;
    creatorOnly?: boolean;
    premiumOnly?: boolean;
}
export interface OutingPlannerContext {
    userId: string;
    planTier: PlanTier;
    followedCreatorIds: string[];
}
export interface ItineraryGenerationReason {
    code: string;
    description: string;
}
export interface ItinerarySourceAttribution {
    sourceType: "place" | "creator" | "business" | "ai";
    sourceId: string;
    label: string;
}
export interface ItineraryStop {
    id: string;
    sequence: number;
    placeId: string;
    placeTitle: string;
    category: string;
    area?: string;
    address?: string;
    startTime?: string;
    relativeStartMinutes?: number;
    estimatedDurationMinutes: number;
    shortDescription: string;
    reasonIncluded: string;
    websiteUrl?: string;
    thumbnailUrl?: string;
    transitionNote?: string;
    creatorAttribution?: string;
    businessAttribution?: string;
    confidence: number;
    locked?: boolean;
}
export interface GeneratedItinerary {
    id: string;
    title: string;
    summary: string;
    city?: string;
    region?: string;
    themeTags: string[];
    estimatedDurationMinutes: number;
    estimatedBudgetRange: string;
    generatedAt: string;
    generationSource: {
        model: string;
        degradedMode: boolean;
    };
    planTierUsed: PlanTier;
    stops: ItineraryStop[];
    metadata: {
        totalPlaces: number;
        routeShape: "clustered" | "linear" | "mixed";
        indoorOutdoorMix: string;
        hasMeal: boolean;
        hasCoffee: boolean;
        hasEntertainment: boolean;
        costBucket: "low" | "medium" | "high";
        moderationStatus: "clean" | "filtered";
        personalizationReasons: ItineraryGenerationReason[];
        sourceAttributions: ItinerarySourceAttribution[];
    };
}
export interface SavedItinerary {
    id: string;
    ownerUserId: string;
    title: string;
    visibility: ItineraryVisibility;
    archived: boolean;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
    activeRevisionId: string;
}
export interface SavedItineraryRevision {
    id: string;
    itineraryId: string;
    revisionNumber: number;
    createdAt: string;
    source: "generated" | "edited" | "regenerated";
    generated: GeneratedItinerary;
}
export interface ItineraryRegenerationRequest {
    itineraryId?: string;
    replaceStopId?: string;
    promptDelta?: string;
    preserveLockedStops?: boolean;
}
export interface ItineraryUsageLimits {
    planTier: PlanTier;
    generations: {
        used: number;
        limit: number;
    };
    savedItineraries: {
        used: number;
        limit: number;
    };
    regenerations: {
        used: number;
        limit: number;
    };
}
export interface OutingPlannerContextualRequest {
    request: OutingPlannerRequest;
    context: OutingPlannerContext;
}
