import type { NotificationStore } from "./store.js";
import type { DeviceTokenRegistration, Notification, NotificationEvent } from "./types.js";
export declare class NotificationService {
    private readonly store;
    private readonly now;
    private readonly composer;
    private readonly metrics;
    private readonly preferences;
    private readonly dedupe;
    constructor(store: NotificationStore, now?: () => Date);
    notify(event: NotificationEvent): Promise<Notification | null>;
    list(userId: string, opts?: {
        limit?: number;
        cursor?: string | null;
        category?: Notification["category"];
        type?: Notification["type"];
    }): Promise<{
        items: Notification[];
        nextCursor: string | null;
    }>;
    unreadCount(userId: string): Promise<number>;
    markRead(userId: string, notificationId: string): Promise<Notification | null>;
    markAllRead(userId: string): Promise<number>;
    getPreferences(userId: string): Promise<import("./types.js").NotificationPreference[]>;
    updatePreference(userId: string, category: Notification["category"], patch: {
        inAppEnabled?: boolean;
        pushEnabled?: boolean;
        emailEnabled?: boolean;
        frequency?: "instant" | "daily_digest" | "weekly_digest";
    }): Promise<import("./types.js").NotificationPreference>;
    registerDeviceToken(input: {
        userId: string;
        token: string;
        platform: "ios" | "android" | "web";
        appVersion?: string;
        locale?: string;
        pushEnabled?: boolean;
    }): Promise<DeviceTokenRegistration>;
    unregisterDeviceToken(userId: string, token: string): Promise<boolean>;
    listActiveDeviceTokens(userId: string): Promise<DeviceTokenRegistration[]>;
    getMetricsSnapshot(): Record<string, number>;
    private bump;
}
