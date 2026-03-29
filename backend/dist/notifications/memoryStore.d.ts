import type { DeviceTokenRegistration, Notification, NotificationCategory, NotificationDeliveryAttempt, NotificationPreference, NotificationType } from "./types.js";
import { type NotificationStore } from "./store.js";
export declare class MemoryNotificationStore implements NotificationStore {
    private readonly notifications;
    private readonly dedupeIndex;
    private readonly preferencesByUser;
    private readonly deliveryAttemptsByNotification;
    private readonly deviceTokensByUser;
    private readonly createdOrder;
    private sequence;
    create(notification: Notification): Promise<void>;
    getById(notificationId: string): Promise<Notification | null>;
    listByRecipient(recipientUserId: string, opts: {
        limit: number;
        cursor?: string | null;
        category?: NotificationCategory;
        type?: NotificationType;
    }): Promise<{
        items: Notification[];
        nextCursor: string | null;
    }>;
    getUnreadCount(recipientUserId: string): Promise<number>;
    markRead(recipientUserId: string, notificationId: string, readAt: string): Promise<Notification | null>;
    markAllRead(recipientUserId: string, readAt: string): Promise<number>;
    getByDedupeKey(recipientUserId: string, dedupeKey: string): Promise<Notification | null>;
    upsertPreference(preference: NotificationPreference): Promise<NotificationPreference>;
    listPreferences(userId: string): Promise<NotificationPreference[]>;
    createDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<void>;
    listDeliveryAttempts(notificationId: string): Promise<NotificationDeliveryAttempt[]>;
    upsertDeviceToken(registration: DeviceTokenRegistration): Promise<DeviceTokenRegistration>;
    revokeDeviceToken(userId: string, token: string, revokedAt: string): Promise<boolean>;
    listActiveDeviceTokens(userId: string): Promise<DeviceTokenRegistration[]>;
}
