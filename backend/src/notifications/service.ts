import { randomUUID } from "node:crypto";

import type { NotificationStore } from "./store.js";
import type { DeviceTokenRegistration, Notification, NotificationEvent } from "./types.js";
import { NotificationComposer } from "./composer.js";
import { NotificationPreferenceService } from "./preferences.js";
import { NotificationDedupeService } from "./dedupe.js";

export class NotificationService {
  private readonly composer = new NotificationComposer();
  private readonly metrics = new Map<string, number>();
  private readonly preferences: NotificationPreferenceService;
  private readonly dedupe: NotificationDedupeService;

  constructor(private readonly store: NotificationStore, private readonly now: () => Date = () => new Date()) {
    this.preferences = new NotificationPreferenceService(store, now);
    this.dedupe = new NotificationDedupeService(store);
  }

  async notify(event: NotificationEvent): Promise<Notification | null> {
    const composed = this.composer.compose(event);
    const createdAt = event.occurredAt ?? this.now().toISOString();

    this.bump(`generated.${composed.type}`);
    if (!(await this.preferences.canDeliverInApp(event.recipientUserId, composed.category))) {
      this.bump(`suppressed.preference.${composed.category}`);
      return null;
    }
    if (await this.dedupe.isDuplicate({ recipientUserId: event.recipientUserId, dedupeKey: composed.dedupeKey, type: composed.type, createdAt })) {
      this.bump(`suppressed.dedupe.${composed.type}`);
      return null;
    }

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
    this.bump(`delivered.in_app.${composed.type}`);
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

  async registerDeviceToken(input: { userId: string; token: string; platform: "ios" | "android" | "web"; appVersion?: string; locale?: string; pushEnabled?: boolean }): Promise<DeviceTokenRegistration> {
    const now = this.now().toISOString();
    const registration: DeviceTokenRegistration = {
      id: randomUUID(),
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      appVersion: input.appVersion,
      locale: input.locale,
      pushEnabled: input.pushEnabled ?? true,
      createdAt: now,
      updatedAt: now
    };
    const saved = await this.store.upsertDeviceToken(registration);
    this.bump("device_token.registered");
    return saved;
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<boolean> {
    const removed = await this.store.revokeDeviceToken(userId, token, this.now().toISOString());
    if (removed) this.bump("device_token.revoked");
    return removed;
  }

  async listActiveDeviceTokens(userId: string): Promise<DeviceTokenRegistration[]> {
    return this.store.listActiveDeviceTokens(userId);
  }

  getMetricsSnapshot(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries());
  }

  private bump(key: string): void {
    this.metrics.set(key, (this.metrics.get(key) ?? 0) + 1);
  }
}
