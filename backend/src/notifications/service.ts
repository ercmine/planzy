import { randomUUID } from "node:crypto";

import type { NotificationStore } from "./store.js";
import type { Notification, NotificationEvent } from "./types.js";
import { NotificationComposer } from "./composer.js";
import { NotificationPreferenceService } from "./preferences.js";
import { NotificationDedupeService } from "./dedupe.js";

export class NotificationService {
  private readonly composer = new NotificationComposer();
  private readonly preferences: NotificationPreferenceService;
  private readonly dedupe: NotificationDedupeService;

  constructor(private readonly store: NotificationStore, private readonly now: () => Date = () => new Date()) {
    this.preferences = new NotificationPreferenceService(store, now);
    this.dedupe = new NotificationDedupeService(store);
  }

  async notify(event: NotificationEvent): Promise<Notification | null> {
    const composed = this.composer.compose(event);
    const createdAt = event.occurredAt ?? this.now().toISOString();

    if (!(await this.preferences.canDeliverInApp(event.recipientUserId, composed.category))) return null;
    if (await this.dedupe.isDuplicate({ recipientUserId: event.recipientUserId, dedupeKey: composed.dedupeKey, type: composed.type, createdAt })) return null;

    const notification: Notification = {
      id: randomUUID(),
      recipientUserId: event.recipientUserId,
      type: composed.type,
      category: composed.category,
      actor: "actor" in event ? event.actor : undefined,
      objectType: composed.objectType,
      objectId: composed.objectId,
      parentObjectType: composed.parentObjectType,
      parentObjectId: composed.parentObjectId,
      title: composed.title,
      body: composed.body,
      route: composed.route,
      metadata: composed.metadata,
      createdAt,
      deliveredInAppAt: createdAt,
      pushStatus: "pending",
      emailStatus: "pending",
      dedupeKey: composed.dedupeKey,
      batchKey: composed.batchKey,
      priority: composed.priority,
      sourceEventId: event.eventId
    };

    await this.store.create(notification);
    await this.store.createDeliveryAttempt({ id: randomUUID(), notificationId: notification.id, channel: "in_app", status: "sent", attemptedAt: createdAt });
    return notification;
  }

  async list(userId: string, opts?: { limit?: number; cursor?: string | null; category?: Notification["category"]; type?: Notification["type"] }) {
    return this.store.listByRecipient(userId, { limit: opts?.limit ?? 20, cursor: opts?.cursor, category: opts?.category, type: opts?.type });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.store.getUnreadCount(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<Notification | null> {
    return this.store.markRead(userId, notificationId, this.now().toISOString());
  }

  async markAllRead(userId: string): Promise<number> {
    return this.store.markAllRead(userId, this.now().toISOString());
  }

  async getPreferences(userId: string) {
    return this.preferences.listPreferences(userId);
  }

  async updatePreference(userId: string, category: Notification["category"], patch: { inAppEnabled?: boolean; pushEnabled?: boolean; emailEnabled?: boolean; frequency?: "instant" | "daily_digest" | "weekly_digest" }) {
    return this.preferences.updatePreference(userId, category, patch);
  }
}
