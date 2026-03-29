import { FEATURE_KEYS, QUOTA_KEYS } from "../subscriptions/accessEngine.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
const DEFAULT_LIST_TITLE = "Saved";
export class SavedService {
    store;
    subscriptionService;
    accessEngine;
    constructor(store, subscriptionService, accessEngine) {
        this.store = store;
        this.subscriptionService = subscriptionService;
        this.accessEngine = accessEngine;
    }
    async savePlace(input) {
        const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
        this.subscriptionService.ensureAccount(target.targetId, target.targetType);
        const existing = (await this.store.listSavedPlaces(input.userId)).find((row) => row.placeId === input.placeId);
        if (!existing) {
            const feature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_SAVE_PLACES);
            if (!feature.allowed) {
                return { error: "saved_places_not_allowed", access: feature };
            }
            const quota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES, 1);
            if (!quota.allowed) {
                return { error: "saved_places_limit_reached", access: quota };
            }
            await this.store.upsertSavedPlace({ userId: input.userId, placeId: input.placeId, source: input.source, savedAt: new Date().toISOString() });
            await this.accessEngine.consumeQuota(target, QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES, 1);
        }
        const defaultList = await this.ensureDefaultList(input.userId, input.profileType, input.profileId);
        await this.addToList({ userId: input.userId, listId: defaultList.id, placeId: input.placeId, addedBy: input.userId, skipSavedQuota: true });
        return { ok: true };
    }
    async unsavePlace(userId, placeId) {
        await this.store.deleteSavedPlace(userId, placeId);
        const lists = await this.store.listListsByOwner(userId);
        for (const list of lists) {
            await this.removeFromList(userId, list.id, placeId);
        }
        return { ok: true };
    }
    async createList(input) {
        const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
        this.subscriptionService.ensureAccount(target.targetId, target.targetType);
        const featureDecision = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_CREATE_CUSTOM);
        if (!featureDecision.allowed) {
            return { error: "custom_lists_not_allowed", access: featureDecision };
        }
        const lists = await this.store.listListsByOwner(input.userId);
        const customCount = lists.filter((list) => !list.isDefault && list.status === "active").length;
        const quota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_SAVED_LISTS, 1);
        if (!quota.allowed || customCount >= (quota.limit ?? 0)) {
            return { error: "custom_lists_limit_reached", access: quota };
        }
        if (input.visibility === "public") {
            const publicFeature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_CREATE_PUBLIC);
            if (!publicFeature.allowed) {
                return { error: "public_lists_not_allowed", access: publicFeature };
            }
        }
        const list = await this.store.createList({
            ownerUserId: input.userId,
            ownerProfileType: input.profileType,
            ownerProfileId: input.profileId,
            title: input.title.trim(),
            slug: slugify(input.title),
            description: input.description,
            visibility: input.visibility,
            status: "active",
            isDefault: false,
            coverImageUrl: undefined
        });
        await this.accessEngine.consumeQuota(target, QUOTA_KEYS.LISTS_SAVED_LISTS, 1);
        return { list };
    }
    async ensureDefaultList(userId, profileType, profileId) {
        const lists = await this.store.listListsByOwner(userId);
        const existing = lists.find((list) => list.isDefault && list.status === "active");
        if (existing)
            return existing;
        return this.store.createList({
            ownerUserId: userId,
            ownerProfileType: profileType,
            ownerProfileId: profileId,
            title: DEFAULT_LIST_TITLE,
            slug: "saved",
            description: "",
            visibility: "private",
            status: "active",
            isDefault: true,
            coverImageUrl: undefined
        });
    }
    async addToList(input) {
        const list = await this.store.getList(input.listId);
        if (!list || list.status !== "active" || list.ownerUserId !== input.userId) {
            return { error: "list_not_found" };
        }
        const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
        this.subscriptionService.ensureAccount(target.targetId, target.targetType);
        const existing = await this.store.hasListItem(input.listId, input.placeId);
        if (!existing) {
            const items = await this.store.listItems(input.listId);
            const feature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_SAVE_PLACES);
            if (!feature.allowed) {
                return { error: "saved_places_not_allowed", access: feature };
            }
            const listQuota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_ITEMS_PER_LIST, 1);
            if (!listQuota.allowed || items.length >= (listQuota.limit ?? 0)) {
                return { error: "list_items_limit_reached", access: listQuota };
            }
            await this.store.upsertListItem({ listId: input.listId, placeId: input.placeId, addedBy: input.addedBy, addedAt: new Date().toISOString() });
            list.itemCount = items.length + 1;
            list.updatedAt = new Date().toISOString();
            await this.store.updateList(list);
        }
        if (!input.skipSavedQuota) {
            await this.savePlace({ userId: input.userId, profileType: list.ownerProfileType, profileId: list.ownerProfileId, placeId: input.placeId });
        }
        return { ok: true };
    }
    async removeFromList(userId, listId, placeId) {
        const list = await this.store.getList(listId);
        if (!list || list.ownerUserId !== userId) {
            return { error: "list_not_found" };
        }
        await this.store.deleteListItem(listId, placeId);
        const items = await this.store.listItems(listId);
        list.itemCount = items.length;
        list.updatedAt = new Date().toISOString();
        await this.store.updateList(list);
        return { ok: true };
    }
    async listSaved(userId) {
        const savedPlaces = await this.store.listSavedPlaces(userId);
        const lists = await this.store.listListsByOwner(userId);
        return {
            savedPlaces: savedPlaces.sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
            lists: lists.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        };
    }
    async getList(viewerUserId, listId) {
        const list = await this.store.getList(listId);
        if (!list || list.status !== "active")
            return undefined;
        if (list.visibility === "private" && list.ownerUserId !== viewerUserId)
            return undefined;
        const items = await this.store.listItems(listId);
        return { list, items: items.sort((a, b) => b.addedAt.localeCompare(a.addedAt)) };
    }
    async listPublicByUser(ownerUserId) {
        return this.store.listPublicListsByOwner(ownerUserId);
    }
    async updateList(userId, listId, patch) {
        const list = await this.store.getList(listId);
        if (!list || list.ownerUserId !== userId || list.isDefault) {
            return { error: "list_not_found" };
        }
        if (patch.visibility)
            list.visibility = patch.visibility;
        if (patch.title) {
            list.title = patch.title;
            list.slug = slugify(patch.title);
        }
        if (typeof patch.description === "string")
            list.description = patch.description;
        if (patch.status)
            list.status = patch.status;
        list.updatedAt = new Date().toISOString();
        await this.store.updateList(list);
        return { list };
    }
}
function slugify(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "list";
}
