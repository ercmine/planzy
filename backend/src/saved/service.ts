import type { ProfileType } from "../accounts/types.js";
import { FEATURE_KEYS, QUOTA_KEYS, type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import type { SavedStore } from "./store.js";
import type { ListVisibility, SavedList } from "./types.js";

const DEFAULT_LIST_TITLE = "Saved";

export class SavedService {
  constructor(
    private readonly store: SavedStore,
    private readonly subscriptionService: SubscriptionService,
    private readonly accessEngine: FeatureQuotaEngine
  ) {}

  async savePlace(input: { userId: string; profileType: ProfileType; profileId: string; placeId: string; source?: string }) {
    const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
    this.subscriptionService.ensureAccount(target.targetId, target.targetType);

    const existing = (await this.store.listSavedPlaces(input.userId)).find((row) => row.placeId === input.placeId);
    if (!existing) {
      const feature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_SAVE_PLACES);
      if (!feature.allowed) {
        return { error: "saved_places_not_allowed", access: feature } as const;
      }
      const quota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES, 1);
      if (!quota.allowed) {
        return { error: "saved_places_limit_reached", access: quota } as const;
      }
      await this.store.upsertSavedPlace({ userId: input.userId, placeId: input.placeId, source: input.source, savedAt: new Date().toISOString() });
      await this.accessEngine.consumeQuota(target, QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES, 1);
    }

    const defaultList = await this.ensureDefaultList(input.userId, input.profileType, input.profileId);
    await this.addToList({ userId: input.userId, listId: defaultList.id, placeId: input.placeId, addedBy: input.userId, skipSavedQuota: true });

    return { ok: true } as const;
  }

  async unsavePlace(userId: string, placeId: string) {
    await this.store.deleteSavedPlace(userId, placeId);
    const lists = await this.store.listListsByOwner(userId);
    for (const list of lists) {
      await this.removeFromList(userId, list.id, placeId);
    }
    return { ok: true };
  }

  async createList(input: { userId: string; profileType: ProfileType; profileId: string; title: string; description?: string; visibility: ListVisibility }) {
    const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
    this.subscriptionService.ensureAccount(target.targetId, target.targetType);

    const featureDecision = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_CREATE_CUSTOM);
    if (!featureDecision.allowed) {
      return { error: "custom_lists_not_allowed", access: featureDecision } as const;
    }

    const lists = await this.store.listListsByOwner(input.userId);
    const customCount = lists.filter((list) => !list.isDefault && list.status === "active").length;
    const quota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_SAVED_LISTS, 1);
    if (!quota.allowed || customCount >= (quota.limit ?? 0)) {
      return { error: "custom_lists_limit_reached", access: quota } as const;
    }

    if (input.visibility === "public") {
      const publicFeature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_CREATE_PUBLIC);
      if (!publicFeature.allowed) {
        return { error: "public_lists_not_allowed", access: publicFeature } as const;
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
    return { list } as const;
  }

  async ensureDefaultList(userId: string, profileType: ProfileType, profileId: string): Promise<SavedList> {
    const lists = await this.store.listListsByOwner(userId);
    const existing = lists.find((list) => list.isDefault && list.status === "active");
    if (existing) return existing;
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

  async addToList(input: { userId: string; listId: string; placeId: string; addedBy: string; skipSavedQuota?: boolean }) {
    const list = await this.store.getList(input.listId);
    if (!list || list.status !== "active" || list.ownerUserId !== input.userId) {
      return { error: "list_not_found" } as const;
    }

    const target = { targetType: SubscriptionTargetType.USER, targetId: input.userId };
    this.subscriptionService.ensureAccount(target.targetId, target.targetType);

    const existing = await this.store.hasListItem(input.listId, input.placeId);
    if (!existing) {
      const items = await this.store.listItems(input.listId);
      const feature = await this.accessEngine.checkFeatureAccess(target, FEATURE_KEYS.LISTS_SAVE_PLACES);
      if (!feature.allowed) {
        return { error: "saved_places_not_allowed", access: feature } as const;
      }
      const listQuota = await this.accessEngine.checkQuotaAccess(target, QUOTA_KEYS.LISTS_ITEMS_PER_LIST, 1);
      if (!listQuota.allowed || items.length >= (listQuota.limit ?? 0)) {
        return { error: "list_items_limit_reached", access: listQuota } as const;
      }
      await this.store.upsertListItem({ listId: input.listId, placeId: input.placeId, addedBy: input.addedBy, addedAt: new Date().toISOString() });
      list.itemCount = items.length + 1;
      list.updatedAt = new Date().toISOString();
      await this.store.updateList(list);
    }

    if (!input.skipSavedQuota) {
      await this.savePlace({ userId: input.userId, profileType: list.ownerProfileType, profileId: list.ownerProfileId, placeId: input.placeId });
    }

    return { ok: true } as const;
  }

  async removeFromList(userId: string, listId: string, placeId: string) {
    const list = await this.store.getList(listId);
    if (!list || list.ownerUserId !== userId) {
      return { error: "list_not_found" } as const;
    }
    await this.store.deleteListItem(listId, placeId);
    const items = await this.store.listItems(listId);
    list.itemCount = items.length;
    list.updatedAt = new Date().toISOString();
    await this.store.updateList(list);
    return { ok: true } as const;
  }

  async listSaved(userId: string) {
    const savedPlaces = await this.store.listSavedPlaces(userId);
    const lists = await this.store.listListsByOwner(userId);
    return {
      savedPlaces: savedPlaces.sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
      lists: lists.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    };
  }

  async getList(viewerUserId: string | undefined, listId: string) {
    const list = await this.store.getList(listId);
    if (!list || list.status !== "active") return undefined;
    if (list.visibility === "private" && list.ownerUserId !== viewerUserId) return undefined;
    const items = await this.store.listItems(listId);
    return { list, items: items.sort((a, b) => b.addedAt.localeCompare(a.addedAt)) };
  }

  async listPublicByUser(ownerUserId: string) {
    return this.store.listPublicListsByOwner(ownerUserId);
  }

  async updateList(userId: string, listId: string, patch: { title?: string; description?: string; visibility?: ListVisibility; status?: "active" | "archived" }) {
    const list = await this.store.getList(listId);
    if (!list || list.ownerUserId !== userId || list.isDefault) {
      return { error: "list_not_found" } as const;
    }
    if (patch.visibility) list.visibility = patch.visibility;
    if (patch.title) {
      list.title = patch.title;
      list.slug = slugify(patch.title);
    }
    if (typeof patch.description === "string") list.description = patch.description;
    if (patch.status) list.status = patch.status;
    list.updatedAt = new Date().toISOString();
    await this.store.updateList(list);
    return { list } as const;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "list";
}
