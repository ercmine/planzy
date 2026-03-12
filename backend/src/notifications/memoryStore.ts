import { ValidationError } from "../plans/errors.js";
import type { DeviceTokenRegistration, Notification, NotificationCategory, NotificationDeliveryAttempt, NotificationPreference, NotificationType } from "./types.js";
import { decodeOffsetCursor, encodeOffsetCursor, type NotificationStore } from "./store.js";

export class MemoryNotificationStore implements NotificationStore {
  private readonly notifications: Notification[] = [];
  private readonly dedupeIndex = new Map<string, Notification>();
  private readonly preferencesByUser = new Map<string, Map<string, NotificationPreference>>();
  private readonly deliveryAttemptsByNotification = new Map<string, NotificationDeliveryAttempt[]>();
  private readonly deviceTokensByUser = new Map<string, Map<string, DeviceTokenRegistration>>();

  async create(notification: Notification): Promise<void> {
    this.notifications.push(notification);
    if (notification.dedupeKey) this.dedupeIndex.set(`${notification.recipientUserId}:${notification.dedupeKey}`, notification);
  }

  async getById(notificationId: string): Promise<Notification | null> {
    return this.notifications.find((item) => item.id === notificationId) ?? null;
  }

  async listByRecipient(recipientUserId: string, opts: { limit: number; cursor?: string | null; category?: NotificationCategory; type?: NotificationType }): Promise<{ items: Notification[]; nextCursor: string | null }> {
    const sorted = this.notifications
      .filter((item) => item.recipientUserId === recipientUserId)
      .filter((item) => !opts.category || item.category === opts.category)
      .filter((item) => !opts.type || item.type === opts.type)
      .sort((a, b) => (a.createdAt === b.createdAt ? b.id.localeCompare(a.id) : b.createdAt.localeCompare(a.createdAt)));
    let offset = 0;
    try {
      offset = decodeOffsetCursor(opts.cursor);
    } catch {
      throw new ValidationError(["cursor must be a valid base64 offset"]);
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    const items = sorted.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return { items, nextCursor: nextOffset < sorted.length ? encodeOffsetCursor(nextOffset) : null };
  }

  async getUnreadCount(recipientUserId: string): Promise<number> {
    return this.notifications.filter((item) => item.recipientUserId === recipientUserId && !item.readAt && !item.archivedAt).length;
  }

  async markRead(recipientUserId: string, notificationId: string, readAt: string): Promise<Notification | null> {
    const record = this.notifications.find((item) => item.id === notificationId && item.recipientUserId === recipientUserId);
    if (!record) return null;
    record.readAt = record.readAt ?? readAt;
    return record;
  }

  async markAllRead(recipientUserId: string, readAt: string): Promise<number> {
    let updated = 0;
    for (const record of this.notifications) {
      if (record.recipientUserId !== recipientUserId || record.readAt) continue;
      record.readAt = readAt;
      updated += 1;
    }
    return updated;
  }

  async getByDedupeKey(recipientUserId: string, dedupeKey: string): Promise<Notification | null> {
    return this.dedupeIndex.get(`${recipientUserId}:${dedupeKey}`) ?? null;
  }

  async upsertPreference(preference: NotificationPreference): Promise<NotificationPreference> {
    const existing = this.preferencesByUser.get(preference.userId) ?? new Map<string, NotificationPreference>();
    existing.set(preference.category, preference);
    this.preferencesByUser.set(preference.userId, existing);
    return preference;
  }

  async listPreferences(userId: string): Promise<NotificationPreference[]> {
    return [...(this.preferencesByUser.get(userId)?.values() ?? [])];
  }

  async createDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<void> {
    const list = this.deliveryAttemptsByNotification.get(attempt.notificationId) ?? [];
    list.push(attempt);
    this.deliveryAttemptsByNotification.set(attempt.notificationId, list);
  }

  async listDeliveryAttempts(notificationId: string): Promise<NotificationDeliveryAttempt[]> {
    return this.deliveryAttemptsByNotification.get(notificationId) ?? [];
  }


  async upsertDeviceToken(registration: DeviceTokenRegistration): Promise<DeviceTokenRegistration> {
    const map = this.deviceTokensByUser.get(registration.userId) ?? new Map<string, DeviceTokenRegistration>();
    map.set(registration.token, registration);
    this.deviceTokensByUser.set(registration.userId, map);
    return registration;
  }

  async revokeDeviceToken(userId: string, token: string, revokedAt: string): Promise<boolean> {
    const map = this.deviceTokensByUser.get(userId);
    if (!map) return false;
    const existing = map.get(token);
    if (!existing) return false;
    existing.revokedAt = revokedAt;
    existing.pushEnabled = false;
    existing.updatedAt = revokedAt;
    map.set(token, existing);
    return true;
  }

  async listActiveDeviceTokens(userId: string): Promise<DeviceTokenRegistration[]> {
    const map = this.deviceTokensByUser.get(userId);
    if (!map) return [];
    return [...map.values()].filter((row) => !row.revokedAt && row.pushEnabled);
  }

}
