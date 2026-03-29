import type { ProfileType } from "../accounts/types.js";
import { type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { SavedStore } from "./store.js";
import type { ListVisibility, SavedList } from "./types.js";
export declare class SavedService {
    private readonly store;
    private readonly subscriptionService;
    private readonly accessEngine;
    constructor(store: SavedStore, subscriptionService: SubscriptionService, accessEngine: FeatureQuotaEngine);
    savePlace(input: {
        userId: string;
        profileType: ProfileType;
        profileId: string;
        placeId: string;
        source?: string;
    }): Promise<{
        readonly error: "saved_places_not_allowed";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly ok?: undefined;
    } | {
        readonly error: "saved_places_limit_reached";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly ok?: undefined;
    } | {
        readonly ok: true;
        readonly error?: undefined;
        readonly access?: undefined;
    }>;
    unsavePlace(userId: string, placeId: string): Promise<{
        ok: boolean;
    }>;
    createList(input: {
        userId: string;
        profileType: ProfileType;
        profileId: string;
        title: string;
        description?: string;
        visibility: ListVisibility;
    }): Promise<{
        readonly error: "custom_lists_not_allowed";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly list?: undefined;
    } | {
        readonly error: "custom_lists_limit_reached";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly list?: undefined;
    } | {
        readonly error: "public_lists_not_allowed";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly list?: undefined;
    } | {
        readonly list: SavedList;
        readonly error?: undefined;
        readonly access?: undefined;
    }>;
    ensureDefaultList(userId: string, profileType: ProfileType, profileId: string): Promise<SavedList>;
    addToList(input: {
        userId: string;
        listId: string;
        placeId: string;
        addedBy: string;
        skipSavedQuota?: boolean;
    }): Promise<{
        readonly error: "list_not_found";
        readonly access?: undefined;
        readonly ok?: undefined;
    } | {
        readonly error: "saved_places_not_allowed";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly ok?: undefined;
    } | {
        readonly error: "list_items_limit_reached";
        readonly access: import("../subscriptions/accessEngine.js").AccessDecision;
        readonly ok?: undefined;
    } | {
        readonly ok: true;
        readonly error?: undefined;
        readonly access?: undefined;
    }>;
    removeFromList(userId: string, listId: string, placeId: string): Promise<{
        readonly error: "list_not_found";
        readonly ok?: undefined;
    } | {
        readonly ok: true;
        readonly error?: undefined;
    }>;
    listSaved(userId: string): Promise<{
        savedPlaces: import("./types.js").SavedPlace[];
        lists: SavedList[];
    }>;
    getList(viewerUserId: string | undefined, listId: string): Promise<{
        list: SavedList;
        items: import("./types.js").SavedListItem[];
    } | undefined>;
    listPublicByUser(ownerUserId: string): Promise<SavedList[]>;
    updateList(userId: string, listId: string, patch: {
        title?: string;
        description?: string;
        visibility?: ListVisibility;
        status?: "active" | "archived";
    }): Promise<{
        readonly error: "list_not_found";
        readonly list?: undefined;
    } | {
        readonly list: SavedList;
        readonly error?: undefined;
    }>;
}
