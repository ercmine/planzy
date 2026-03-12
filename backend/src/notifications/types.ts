export const NOTIFICATION_CATEGORIES = ["social", "reviews", "business", "creator", "moderation", "premium", "collaborations", "system", "saved_places", "discovery", "guides", "studio"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  "creator_followed",
  "review_reply_received",
  "business_reply_received",
  "review_liked",
  "review_approved",
  "creator_milestone_reached",
  "premium_limit_warning",
  "premium_feature_upsell",
  "collaboration_invite_received",
  "collaboration_invite_accepted",
  "collaboration_invite_declined",
  "video_processing_finished",
  "video_processing_failed",
  "video_published",
  "video_moderation_state_changed",
  "followed_creator_posted",
  "saved_place_new_videos",
  "local_discovery_highlights",
  "guide_updated",
  "draft_reminder"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationChannel = "in_app" | "push" | "email";
export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "suppressed";
export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationActorSummary {
  userId?: string;
  businessId?: string;
  displayName?: string;
  avatarUrl?: string;
  profileType?: "user" | "creator" | "business" | "admin";
}

export interface NotificationRoutePayload {
  name: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  category: NotificationCategory;
  actor?: NotificationActorSummary;
  objectType?: string;
  objectId?: string;
  parentObjectType?: string;
  parentObjectId?: string;
  title: string;
  body: string;
  imageUrl?: string;
  route?: NotificationRoutePayload;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  deliveredInAppAt?: string;
  pushStatus?: NotificationDeliveryStatus;
  emailStatus?: NotificationDeliveryStatus;
  dedupeKey?: string;
  batchKey?: string;
  priority: NotificationPriority;
  sourceEventId?: string;
}

export interface NotificationPreference {
  userId: string;
  category: NotificationCategory;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  frequency: "instant" | "daily_digest" | "weekly_digest";
  updatedAt: string;
}

export interface DeviceTokenRegistration {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
  locale?: string;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}

export interface NotificationDeliveryAttempt {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attemptedAt: string;
  errorCode?: string;
  responseMetadata?: Record<string, unknown>;
}

export interface NotificationListResult {
  items: Notification[];
  nextCursor: string | null;
}

export type NotificationEvent =
  | { eventId?: string; type: "follow.created"; recipientUserId: string; actor: NotificationActorSummary; objectId: string; occurredAt?: string }
  | { eventId?: string; type: "review.reply.created"; recipientUserId: string; actor: NotificationActorSummary; reviewId: string; placeId: string; snippet?: string; occurredAt?: string }
  | { eventId?: string; type: "review.business_reply.created"; recipientUserId: string; actor: NotificationActorSummary; reviewId: string; placeId: string; snippet?: string; occurredAt?: string }
  | { eventId?: string; type: "review.liked"; recipientUserId: string; actor: NotificationActorSummary; reviewId: string; placeId: string; occurredAt?: string }
  | { eventId?: string; type: "review.approved"; recipientUserId: string; reviewId: string; placeId: string; placeName?: string; occurredAt?: string }
  | { eventId?: string; type: "creator.milestone.reached"; recipientUserId: string; milestoneKey: string; milestoneValue: number; occurredAt?: string }
  | { eventId?: string; type: "premium.limit.warning"; recipientUserId: string; limitKey: string; percentUsed?: number; occurredAt?: string }
  | { eventId?: string; type: "premium.feature.upsell"; recipientUserId: string; featureKey: string; occurredAt?: string }
  | { eventId?: string; type: "collaboration.invite.received"; recipientUserId: string; actor: NotificationActorSummary; inviteId: string; title: string; businessProfileId: string; occurredAt?: string }
  | { eventId?: string; type: "collaboration.invite.accepted"; recipientUserId: string; actor: NotificationActorSummary; inviteId: string; occurredAt?: string }
  | { eventId?: string; type: "collaboration.invite.declined"; recipientUserId: string; actor: NotificationActorSummary; inviteId: string; occurredAt?: string }
  | { eventId?: string; type: "video.processing.finished"; recipientUserId: string; videoId: string; placeId: string; placeName?: string; occurredAt?: string }
  | { eventId?: string; type: "video.processing.failed"; recipientUserId: string; videoId: string; placeId: string; reason?: string; occurredAt?: string }
  | { eventId?: string; type: "video.published"; recipientUserId: string; videoId: string; placeId: string; placeName?: string; occurredAt?: string }
  | { eventId?: string; type: "video.moderation.changed"; recipientUserId: string; videoId: string; placeId: string; moderationState: "pending" | "hidden" | "rejected" | "approved"; occurredAt?: string }
  | { eventId?: string; type: "creator.followed.posted"; recipientUserId: string; actor: NotificationActorSummary; videoId: string; placeId: string; placeName?: string; localityScope?: "local" | "regional" | "global"; occurredAt?: string }
  | { eventId?: string; type: "saved.place.new_videos"; recipientUserId: string; placeId: string; placeName?: string; newVideoCount: number; occurredAt?: string }
  | { eventId?: string; type: "discovery.local.highlights"; recipientUserId: string; city: string; highlightsCount: number; occurredAt?: string }
  | { eventId?: string; type: "guide.updated"; recipientUserId: string; guideId: string; guideTitle: string; placeId?: string; actor?: NotificationActorSummary; occurredAt?: string }
  | { eventId?: string; type: "studio.draft.reminder"; recipientUserId: string; draftCount: number; oldestDraftAgeHours: number; occurredAt?: string };
