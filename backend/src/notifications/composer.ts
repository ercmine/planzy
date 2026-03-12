import type { Notification, NotificationEvent, NotificationType } from "./types.js";

export const TYPE_TO_CATEGORY: Record<NotificationType, Notification["category"]> = {
  creator_followed: "social",
  review_reply_received: "reviews",
  business_reply_received: "business",
  review_liked: "reviews",
  review_approved: "moderation",
  creator_milestone_reached: "creator",
  premium_limit_warning: "premium",
  premium_feature_upsell: "premium",
  collaboration_invite_received: "collaborations",
  collaboration_invite_accepted: "collaborations",
  collaboration_invite_declined: "collaborations",
  video_processing_finished: "studio",
  video_processing_failed: "studio",
  video_published: "studio",
  video_moderation_state_changed: "moderation",
  followed_creator_posted: "social",
  saved_place_new_videos: "saved_places",
  local_discovery_highlights: "discovery",
  guide_updated: "guides",
  draft_reminder: "studio"
};

export interface ComposedNotification {
  type: NotificationType;
  title: string;
  body: string;
  category: Notification["category"];
  objectType?: string;
  objectId?: string;
  parentObjectType?: string;
  parentObjectId?: string;
  route?: Notification["route"];
  metadata: Record<string, unknown>;
  dedupeKey?: string;
  batchKey?: string;
  priority: Notification["priority"];
}

export class NotificationComposer {
  compose(event: NotificationEvent): ComposedNotification {
    switch (event.type) {
      case "follow.created":
        return { type: "creator_followed", category: TYPE_TO_CATEGORY.creator_followed, title: `${event.actor.displayName ?? "Someone"} followed you`, body: "Your profile has a new follower.", objectType: "follow", objectId: event.objectId, route: { name: "profile", params: { userId: event.actor.userId ?? "" } }, metadata: { actor: event.actor }, dedupeKey: `follow:${event.objectId}`, priority: "normal" };
      case "review.reply.created":
        return { type: "review_reply_received", category: TYPE_TO_CATEGORY.review_reply_received, title: `${event.actor.displayName ?? "Someone"} replied to your review`, body: event.snippet ? event.snippet.slice(0, 120) : "You have a new reply.", objectType: "review", objectId: event.reviewId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "review-thread", params: { reviewId: event.reviewId } }, metadata: { placeId: event.placeId }, dedupeKey: `${event.eventId ?? "reply"}:${event.reviewId}`, priority: "high" };
      case "review.business_reply.created":
        return { type: "business_reply_received", category: TYPE_TO_CATEGORY.business_reply_received, title: `${event.actor.displayName ?? "Business"} replied to your review`, body: event.snippet ? event.snippet.slice(0, 120) : "A business sent a response.", objectType: "review", objectId: event.reviewId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "review-thread", params: { reviewId: event.reviewId } }, metadata: { placeId: event.placeId, businessId: event.actor.businessId }, dedupeKey: `${event.eventId ?? "biz-reply"}:${event.reviewId}`, priority: "high" };
      case "review.liked":
        return { type: "review_liked", category: TYPE_TO_CATEGORY.review_liked, title: `${event.actor.displayName ?? "Someone"} liked your review`, body: "Your review is getting appreciation.", objectType: "review", objectId: event.reviewId, route: { name: "review-thread", params: { reviewId: event.reviewId } }, metadata: { placeId: event.placeId }, batchKey: `review-like:${event.reviewId}`, dedupeKey: `review-like:${event.reviewId}:${event.actor.userId ?? event.actor.businessId ?? "unknown"}`, priority: "low" };
      case "review.approved":
        return { type: "review_approved", category: TYPE_TO_CATEGORY.review_approved, title: "Your review was approved", body: event.placeName ? `Your review for ${event.placeName} is now live.` : "Your review is now live.", objectType: "review", objectId: event.reviewId, route: { name: "review-thread", params: { reviewId: event.reviewId } }, metadata: { placeId: event.placeId }, dedupeKey: `review-approved:${event.reviewId}`, priority: "high" };
      case "creator.milestone.reached":
        return { type: "creator_milestone_reached", category: TYPE_TO_CATEGORY.creator_milestone_reached, title: "Creator milestone reached", body: `You reached ${event.milestoneValue} for ${event.milestoneKey}.`, objectType: "creator_milestone", objectId: `${event.milestoneKey}:${event.milestoneValue}`, route: { name: "creator-analytics", query: { metric: event.milestoneKey } }, metadata: { milestoneKey: event.milestoneKey, milestoneValue: event.milestoneValue }, dedupeKey: `milestone:${event.milestoneKey}:${event.milestoneValue}`, priority: "normal" };
      case "premium.limit.warning":
        return { type: "premium_limit_warning", category: TYPE_TO_CATEGORY.premium_limit_warning, title: "You are close to your plan limit", body: event.percentUsed ? `${event.limitKey} is at ${Math.round(event.percentUsed)}% usage.` : `You're near your ${event.limitKey} limit.`, objectType: "subscription_limit", objectId: event.limitKey, route: { name: "subscription-upgrade" }, metadata: { limitKey: event.limitKey, percentUsed: event.percentUsed }, dedupeKey: `premium-limit:${event.limitKey}`, priority: "normal" };
      case "premium.feature.upsell":
        return { type: "premium_feature_upsell", category: TYPE_TO_CATEGORY.premium_feature_upsell, title: "Unlock more with premium", body: `Upgrade to unlock ${event.featureKey}.`, objectType: "subscription_feature", objectId: event.featureKey, route: { name: "subscription-upgrade", query: { feature: event.featureKey } }, metadata: { featureKey: event.featureKey }, dedupeKey: `premium-feature:${event.featureKey}`, priority: "low" };
      case "collaboration.invite.received":
        return { type: "collaboration_invite_received", category: TYPE_TO_CATEGORY.collaboration_invite_received, title: `${event.actor.displayName ?? "A business"} invited you to collaborate`, body: event.title, objectType: "collaboration_invite", objectId: event.inviteId, route: { name: "collaboration-invite", params: { inviteId: event.inviteId } }, metadata: { businessProfileId: event.businessProfileId }, dedupeKey: `collab-invite:${event.inviteId}`, priority: "high" };
      case "collaboration.invite.accepted":
        return { type: "collaboration_invite_accepted", category: TYPE_TO_CATEGORY.collaboration_invite_accepted, title: `${event.actor.displayName ?? "Creator"} accepted your invite`, body: "Your collaboration invite was accepted.", objectType: "collaboration_invite", objectId: event.inviteId, route: { name: "collaboration-invite", params: { inviteId: event.inviteId } }, metadata: {}, dedupeKey: `collab-invite:${event.inviteId}:accepted`, priority: "normal" };
      case "collaboration.invite.declined":
        return { type: "collaboration_invite_declined", category: TYPE_TO_CATEGORY.collaboration_invite_declined, title: `${event.actor.displayName ?? "Creator"} declined your invite`, body: "Your collaboration invite was declined.", objectType: "collaboration_invite", objectId: event.inviteId, route: { name: "collaboration-invite", params: { inviteId: event.inviteId } }, metadata: {}, dedupeKey: `collab-invite:${event.inviteId}:declined`, priority: "normal" };
      case "video.processing.finished":
        return { type: "video_processing_finished", category: TYPE_TO_CATEGORY.video_processing_finished, title: "Video processing complete", body: event.placeName ? `Your ${event.placeName} review is ready to publish.` : "Your video is ready to publish.", objectType: "video", objectId: event.videoId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "studio-video", params: { videoId: event.videoId } }, metadata: { placeId: event.placeId }, dedupeKey: `video-processing-finished:${event.videoId}`, priority: "high" };
      case "video.processing.failed":
        return { type: "video_processing_failed", category: TYPE_TO_CATEGORY.video_processing_failed, title: "Video processing failed", body: event.reason ? `We couldn't process your upload: ${event.reason}.` : "We couldn't process your upload. Try again from Studio.", objectType: "video", objectId: event.videoId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "studio-video", params: { videoId: event.videoId } }, metadata: { placeId: event.placeId, reason: event.reason }, dedupeKey: `video-processing-failed:${event.videoId}`, priority: "high" };
      case "video.published":
        return { type: "video_published", category: TYPE_TO_CATEGORY.video_published, title: "Your video is live", body: event.placeName ? `Your ${event.placeName} review has been published.` : "Your video review has been published.", objectType: "video", objectId: event.videoId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "studio-video", params: { videoId: event.videoId }, query: { tab: "published" } }, metadata: { placeId: event.placeId }, dedupeKey: `video-published:${event.videoId}`, priority: "high" };
      case "video.moderation.changed":
        return { type: "video_moderation_state_changed", category: TYPE_TO_CATEGORY.video_moderation_state_changed, title: "Video moderation update", body: `Your video is now ${event.moderationState.replaceAll("_", " ")}.`, objectType: "video", objectId: event.videoId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "studio-video", params: { videoId: event.videoId } }, metadata: { placeId: event.placeId, moderationState: event.moderationState }, dedupeKey: `video-moderation:${event.videoId}:${event.moderationState}`, priority: "high" };
      case "creator.followed.posted":
        return { type: "followed_creator_posted", category: TYPE_TO_CATEGORY.followed_creator_posted, title: `${event.actor.displayName ?? "A creator"} posted a new place review`, body: event.placeName ? `New video for ${event.placeName}${event.localityScope ? ` • ${event.localityScope}` : ""}.` : "Tap to watch the latest place review.", objectType: "video", objectId: event.videoId, parentObjectType: "place", parentObjectId: event.placeId, route: { name: "feed-video", params: { videoId: event.videoId }, query: { scope: event.localityScope ?? "local" } }, metadata: { placeId: event.placeId, localityScope: event.localityScope }, batchKey: `followed-creator-posted:${event.actor.userId ?? "creator"}`, dedupeKey: `followed-creator-posted:${event.videoId}:${event.recipientUserId}`, priority: "normal" };
      case "saved.place.new_videos":
        return { type: "saved_place_new_videos", category: TYPE_TO_CATEGORY.saved_place_new_videos, title: event.placeName ? `${event.placeName} has new videos` : "A saved place has new videos", body: `${event.newVideoCount} new place reviews are ready to watch.`, objectType: "place", objectId: event.placeId, route: { name: "place", params: { placeId: event.placeId } }, metadata: { placeName: event.placeName, newVideoCount: event.newVideoCount }, dedupeKey: `saved-place-new-videos:${event.placeId}:${new Date(event.occurredAt ?? Date.now()).toISOString().slice(0, 10)}`, priority: "normal" };
      case "discovery.local.highlights":
        return { type: "local_discovery_highlights", category: TYPE_TO_CATEGORY.local_discovery_highlights, title: `Fresh picks in ${event.city}`, body: `${event.highlightsCount} new local videos match your interests.`, objectType: "feed_scope", objectId: `local:${event.city}`, route: { name: "feed", query: { scope: "local", city: event.city } }, metadata: { city: event.city, highlightsCount: event.highlightsCount }, dedupeKey: `local-discovery:${event.city}:${new Date(event.occurredAt ?? Date.now()).toISOString().slice(0, 10)}`, priority: "normal" };
      case "guide.updated":
        return { type: "guide_updated", category: TYPE_TO_CATEGORY.guide_updated, title: "Guide updated", body: event.guideTitle, objectType: "guide", objectId: event.guideId, parentObjectType: event.placeId ? "place" : undefined, parentObjectId: event.placeId, route: { name: "guide", params: { guideId: event.guideId } }, metadata: { guideTitle: event.guideTitle, placeId: event.placeId }, dedupeKey: `guide-updated:${event.guideId}`, priority: "normal" };
      case "studio.draft.reminder":
        return { type: "draft_reminder", category: TYPE_TO_CATEGORY.draft_reminder, title: "Finish your drafts", body: `You have ${event.draftCount} draft${event.draftCount === 1 ? "" : "s"} waiting in Studio.`, objectType: "studio", objectId: "drafts", route: { name: "studio", query: { tab: "drafts" } }, metadata: { draftCount: event.draftCount, oldestDraftAgeHours: event.oldestDraftAgeHours }, dedupeKey: `draft-reminder:${new Date(event.occurredAt ?? Date.now()).toISOString().slice(0, 10)}`, priority: "normal" };
      default:
        return this.assertNever(event);
    }
  }

  private assertNever(event: never): never {
    throw new Error(`Unhandled event ${(event as { type?: string }).type ?? "unknown"}`);
  }
}
