import type { NotificationCategory, NotificationPreference } from "./types.js";
import type { NotificationStore } from "./store.js";
export declare class NotificationPreferenceService {
    private readonly store;
    private readonly now;
    constructor(store: NotificationStore, now?: () => Date);
    listPreferences(userId: string): Promise<NotificationPreference[]>;
    updatePreference(userId: string, category: NotificationCategory, patch: Partial<Omit<NotificationPreference, "userId" | "category" | "updatedAt">>): Promise<NotificationPreference>;
    canDeliverInApp(userId: string, category: NotificationCategory): Promise<boolean>;
    private defaultPreference;
}
