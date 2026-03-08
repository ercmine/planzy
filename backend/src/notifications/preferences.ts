import type { NotificationCategory, NotificationPreference } from "./types.js";
import { NOTIFICATION_CATEGORIES } from "./types.js";
import type { NotificationStore } from "./store.js";

const DEFAULT_DISABLED_PROMO: NotificationCategory[] = [];

export class NotificationPreferenceService {
  constructor(private readonly store: NotificationStore, private readonly now: () => Date = () => new Date()) {}

  async listPreferences(userId: string): Promise<NotificationPreference[]> {
    const existing = await this.store.listPreferences(userId);
    const byCategory = new Map(existing.map((item) => [item.category, item]));
    return NOTIFICATION_CATEGORIES.map((category) => byCategory.get(category) ?? this.defaultPreference(userId, category));
  }

  async updatePreference(userId: string, category: NotificationCategory, patch: Partial<Omit<NotificationPreference, "userId" | "category" | "updatedAt">>): Promise<NotificationPreference> {
    const defaults = await this.listPreferences(userId);
    const base = defaults.find((item) => item.category === category) ?? this.defaultPreference(userId, category);
    const next: NotificationPreference = {
      ...base,
      ...patch,
      userId,
      category,
      updatedAt: this.now().toISOString()
    };
    return this.store.upsertPreference(next);
  }

  async canDeliverInApp(userId: string, category: NotificationCategory): Promise<boolean> {
    const pref = (await this.listPreferences(userId)).find((item) => item.category === category);
    return pref?.inAppEnabled ?? true;
  }

  private defaultPreference(userId: string, category: NotificationCategory): NotificationPreference {
    const enabled = !DEFAULT_DISABLED_PROMO.includes(category);
    return {
      userId,
      category,
      inAppEnabled: enabled,
      pushEnabled: false,
      emailEnabled: false,
      frequency: "instant",
      updatedAt: this.now().toISOString()
    };
  }
}
