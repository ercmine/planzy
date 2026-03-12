import type { DeviceTokenRegistration, Notification, NotificationCategory, NotificationDeliveryAttempt, NotificationPreference, NotificationType } from "./types.js";

export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("invalid cursor");
  return parsed;
}

export interface NotificationStore {
  create(notification: Notification): Promise<void>;
  getById(notificationId: string): Promise<Notification | null>;
  listByRecipient(recipientUserId: string, opts: { limit: number; cursor?: string | null; category?: NotificationCategory; type?: NotificationType }): Promise<{ items: Notification[]; nextCursor: string | null }>;
  getUnreadCount(recipientUserId: string): Promise<number>;
  markRead(recipientUserId: string, notificationId: string, readAt: string): Promise<Notification | null>;
  markAllRead(recipientUserId: string, readAt: string): Promise<number>;
  getByDedupeKey(recipientUserId: string, dedupeKey: string): Promise<Notification | null>;
  upsertPreference(preference: NotificationPreference): Promise<NotificationPreference>;
  listPreferences(userId: string): Promise<NotificationPreference[]>;
  listDeliveryAttempts(notificationId: string): Promise<NotificationDeliveryAttempt[]>;
  createDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<void>;
  upsertDeviceToken(registration: DeviceTokenRegistration): Promise<DeviceTokenRegistration>;
  revokeDeviceToken(userId: string, token: string, revokedAt: string): Promise<boolean>;
  listActiveDeviceTokens(userId: string): Promise<DeviceTokenRegistration[]>;
}
