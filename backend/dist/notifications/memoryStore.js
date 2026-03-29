import { ValidationError } from "../plans/errors.js";
import { decodeOffsetCursor, encodeOffsetCursor } from "./store.js";
export class MemoryNotificationStore {
    notifications = [];
    dedupeIndex = new Map();
    preferencesByUser = new Map();
    deliveryAttemptsByNotification = new Map();
    deviceTokensByUser = new Map();
    createdOrder = new Map();
    sequence = 0;
    async create(notification) {
        this.notifications.push(notification);
        this.sequence += 1;
        this.createdOrder.set(notification.id, this.sequence);
        if (notification.dedupeKey)
            this.dedupeIndex.set(`${notification.recipientUserId}:${notification.dedupeKey}`, notification);
    }
    async getById(notificationId) {
        return this.notifications.find((item) => item.id === notificationId) ?? null;
    }
    async listByRecipient(recipientUserId, opts) {
        const sorted = this.notifications
            .filter((item) => item.recipientUserId === recipientUserId)
            .filter((item) => !opts.category || item.category === opts.category)
            .filter((item) => !opts.type || item.type === opts.type)
            .sort((a, b) => {
            if (a.createdAt !== b.createdAt)
                return b.createdAt.localeCompare(a.createdAt);
            return (this.createdOrder.get(b.id) ?? 0) - (this.createdOrder.get(a.id) ?? 0);
        });
        let offset = 0;
        try {
            offset = decodeOffsetCursor(opts.cursor);
        }
        catch {
            throw new ValidationError(["cursor must be a valid base64 offset"]);
        }
        const limit = Math.max(1, Math.min(100, opts.limit));
        const items = sorted.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        return { items, nextCursor: nextOffset < sorted.length ? encodeOffsetCursor(nextOffset) : null };
    }
    async getUnreadCount(recipientUserId) {
        return this.notifications.filter((item) => item.recipientUserId === recipientUserId && !item.readAt && !item.archivedAt).length;
    }
    async markRead(recipientUserId, notificationId, readAt) {
        const record = this.notifications.find((item) => item.id === notificationId && item.recipientUserId === recipientUserId);
        if (!record)
            return null;
        record.readAt = record.readAt ?? readAt;
        return record;
    }
    async markAllRead(recipientUserId, readAt) {
        let updated = 0;
        for (const record of this.notifications) {
            if (record.recipientUserId !== recipientUserId || record.readAt)
                continue;
            record.readAt = readAt;
            updated += 1;
        }
        return updated;
    }
    async getByDedupeKey(recipientUserId, dedupeKey) {
        return this.dedupeIndex.get(`${recipientUserId}:${dedupeKey}`) ?? null;
    }
    async upsertPreference(preference) {
        const existing = this.preferencesByUser.get(preference.userId) ?? new Map();
        existing.set(preference.category, preference);
        this.preferencesByUser.set(preference.userId, existing);
        return preference;
    }
    async listPreferences(userId) {
        return [...(this.preferencesByUser.get(userId)?.values() ?? [])];
    }
    async createDeliveryAttempt(attempt) {
        const list = this.deliveryAttemptsByNotification.get(attempt.notificationId) ?? [];
        list.push(attempt);
        this.deliveryAttemptsByNotification.set(attempt.notificationId, list);
    }
    async listDeliveryAttempts(notificationId) {
        return this.deliveryAttemptsByNotification.get(notificationId) ?? [];
    }
    async upsertDeviceToken(registration) {
        const map = this.deviceTokensByUser.get(registration.userId) ?? new Map();
        map.set(registration.token, registration);
        this.deviceTokensByUser.set(registration.userId, map);
        return registration;
    }
    async revokeDeviceToken(userId, token, revokedAt) {
        const map = this.deviceTokensByUser.get(userId);
        if (!map)
            return false;
        const existing = map.get(token);
        if (!existing)
            return false;
        existing.revokedAt = revokedAt;
        existing.pushEnabled = false;
        existing.updatedAt = revokedAt;
        map.set(token, existing);
        return true;
    }
    async listActiveDeviceTokens(userId) {
        const map = this.deviceTokensByUser.get(userId);
        if (!map)
            return [];
        return [...map.values()].filter((row) => !row.revokedAt && row.pushEnabled);
    }
}
