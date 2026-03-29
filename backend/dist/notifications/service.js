import { randomUUID } from "node:crypto";
import { NotificationComposer } from "./composer.js";
import { NotificationPreferenceService } from "./preferences.js";
import { NotificationDedupeService } from "./dedupe.js";
export class NotificationService {
    store;
    now;
    composer = new NotificationComposer();
    metrics = new Map();
    preferences;
    dedupe;
    constructor(store, now = () => new Date()) {
        this.store = store;
        this.now = now;
        this.preferences = new NotificationPreferenceService(store, now);
        this.dedupe = new NotificationDedupeService(store);
    }
    async notify(event) {
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
        const notification = {
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
    async list(userId, opts) {
        return this.store.listByRecipient(userId, { limit: opts?.limit ?? 20, cursor: opts?.cursor, category: opts?.category, type: opts?.type });
    }
    async unreadCount(userId) {
        return this.store.getUnreadCount(userId);
    }
    async markRead(userId, notificationId) {
        return this.store.markRead(userId, notificationId, this.now().toISOString());
    }
    async markAllRead(userId) {
        return this.store.markAllRead(userId, this.now().toISOString());
    }
    async getPreferences(userId) {
        return this.preferences.listPreferences(userId);
    }
    async updatePreference(userId, category, patch) {
        return this.preferences.updatePreference(userId, category, patch);
    }
    async registerDeviceToken(input) {
        const now = this.now().toISOString();
        const registration = {
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
    async unregisterDeviceToken(userId, token) {
        const removed = await this.store.revokeDeviceToken(userId, token, this.now().toISOString());
        if (removed)
            this.bump("device_token.revoked");
        return removed;
    }
    async listActiveDeviceTokens(userId) {
        return this.store.listActiveDeviceTokens(userId);
    }
    getMetricsSnapshot() {
        return Object.fromEntries(this.metrics.entries());
    }
    bump(key) {
        this.metrics.set(key, (this.metrics.get(key) ?? 0) + 1);
    }
}
