import type { NotificationStore } from "./store.js";

const DEFAULT_THROTTLE_WINDOWS_MS: Record<string, number> = {
  premium_limit_warning: 1000 * 60 * 60 * 12,
  premium_feature_upsell: 1000 * 60 * 60 * 24,
  review_liked: 1000 * 60 * 2
};

export class NotificationDedupeService {
  constructor(private readonly store: NotificationStore) {}

  async isDuplicate(input: { recipientUserId: string; dedupeKey?: string; type: string; createdAt: string }): Promise<boolean> {
    if (!input.dedupeKey) return false;
    const existing = await this.store.getByDedupeKey(input.recipientUserId, input.dedupeKey);
    if (!existing) return false;
    const windowMs = DEFAULT_THROTTLE_WINDOWS_MS[input.type] ?? 0;
    if (windowMs === 0) return true;
    return (new Date(input.createdAt).getTime() - new Date(existing.createdAt).getTime()) < windowMs;
  }
}
