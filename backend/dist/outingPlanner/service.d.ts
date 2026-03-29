import type { CreatorStore } from "../creator/store.js";
import type { PlaceDocument } from "../discovery/types.js";
import { type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { type OutingPlannerStore } from "./store.js";
import type { GeneratedItinerary, ItineraryRegenerationRequest, ItineraryUsageLimits, OutingPlannerRequest, SavedItinerary } from "./types.js";
export interface PlannerDeps {
    listPlaces(): Promise<PlaceDocument[]>;
    creatorStore: CreatorStore;
    store: OutingPlannerStore;
    subscriptions: SubscriptionService;
    access: FeatureQuotaEngine;
}
export declare class OutingPlannerService {
    private readonly deps;
    constructor(deps: PlannerDeps);
    createOutingPlan(userId: string, request: OutingPlannerRequest): Promise<GeneratedItinerary>;
    saveOutingPlan(userId: string, generated: GeneratedItinerary, title?: string): Promise<{
        readonly error: "saved_itinerary_limit_reached";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly saved?: undefined;
        readonly revision?: undefined;
    } | {
        readonly saved: SavedItinerary;
        readonly revision: import("./types.js").SavedItineraryRevision;
        readonly error?: undefined;
        readonly access?: undefined;
    }>;
    listSavedItineraries(userId: string): Promise<SavedItinerary[]>;
    getSavedItinerary(userId: string, itineraryId: string): Promise<{
        itinerary: SavedItinerary;
        revisions: import("./types.js").SavedItineraryRevision[];
        activeRevision: import("./types.js").SavedItineraryRevision | undefined;
    }>;
    updateSavedItinerary(userId: string, itineraryId: string, patch: Partial<Pick<SavedItinerary, "title" | "favorite" | "archived" | "visibility">>): Promise<SavedItinerary>;
    regenerateItinerary(userId: string, request: ItineraryRegenerationRequest): Promise<{
        itinerary: SavedItinerary;
        revision: import("./types.js").SavedItineraryRevision;
    } | {
        readonly error: "regeneration_limit_reached";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
    }>;
    deleteSavedItinerary(userId: string, itineraryId: string): Promise<{
        ok: boolean;
    }>;
    getItineraryUsageLimits(userId: string): Promise<ItineraryUsageLimits>;
    private persistRevision;
    private requireOwnedItinerary;
    private includePlace;
    private scorePlace;
    private sequenceStops;
    private buildItinerary;
    private resolvePlanTier;
    private target;
    private enforceQuota;
}
