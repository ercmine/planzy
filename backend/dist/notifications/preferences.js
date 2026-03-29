import { NOTIFICATION_CATEGORIES } from "./types.js";
const DEFAULT_DISABLED_PROMO = [];
export class NotificationPreferenceService {
    store;
    now;
    constructor(store, now = () => new Date()) {
        this.store = store;
        this.now = now;
    }
    async listPreferences(userId) {
        const existing = await this.store.listPreferences(userId);
        const byCategory = new Map(existing.map((item) => [item.category, item]));
        return NOTIFICATION_CATEGORIES.map((category) => byCategory.get(category) ?? this.defaultPreference(userId, category));
    }
    async updatePreference(userId, category, patch) {
        const defaults = await this.listPreferences(userId);
        const base = defaults.find((item) => item.category === category) ?? this.defaultPreference(userId, category);
        const next = {
            ...base,
            ...patch,
            userId,
            category,
            updatedAt: this.now().toISOString()
        };
        return this.store.upsertPreference(next);
    }
    async canDeliverInApp(userId, category) {
        const pref = (await this.listPreferences(userId)).find((item) => item.category === category);
        return pref?.inAppEnabled ?? true;
    }
    defaultPreference(userId, category) {
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
