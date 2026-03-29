import type { UserRole } from "../accounts/types.js";
export type AdminPermission = "admin.read" | "admin.moderation" | "admin.users.manage" | "admin.creators.manage" | "admin.businesses.manage" | "admin.places.manage" | "admin.subscriptions.read" | "admin.subscriptions.manage" | "admin.ads.read" | "admin.ads.manage" | "admin.source_health.read" | "admin.ops.manage" | "admin.audit.read";
export interface AdminActor {
    userId: string;
    roles: UserRole[];
    permissions: AdminPermission[];
}
export interface AdminActionAudit {
    id: string;
    actorUserId: string;
    actionType: string;
    targetType: string;
    targetId: string;
    reason?: string;
    note?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    createdAt: string;
}
export type CurationStatus = "draft" | "active" | "paused" | "expired" | "removed";
export type CurationContextType = "global" | "city" | "category" | "campaign" | "launch_set";
export interface CurationContext {
    type: CurationContextType;
    city?: string;
    categoryId?: string;
    campaignId?: string;
    launchSetId?: string;
}
export interface FeaturedCreatorEntry {
    id: string;
    creatorId: string;
    status: CurationStatus;
    priority: number;
    weight: number;
    context: CurationContext;
    startsAt?: string;
    endsAt?: string;
    reason: string;
    notes?: string;
    trustWarning?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export interface FeaturedPlaceEntry {
    id: string;
    canonicalPlaceId: string;
    status: CurationStatus;
    priority: number;
    weight: number;
    context: CurationContext;
    startsAt?: string;
    endsAt?: string;
    reason: string;
    notes?: string;
    moderationWarning?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export type LaunchReadinessStatus = "draft" | "seeding_in_progress" | "soft_launch" | "ready_for_promotion" | "featured_market" | "hold";
export interface FeaturedCityEntry {
    id: string;
    city: string;
    region?: string;
    country?: string;
    status: CurationStatus;
    launchReadiness: LaunchReadinessStatus;
    priority: number;
    startsAt?: string;
    endsAt?: string;
    reason: string;
    notes?: string;
    readinessMetadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export type BoostTargetType = "creator" | "place" | "city" | "category" | "campaign";
export interface ManualBoostRule {
    id: string;
    targetType: BoostTargetType;
    targetId: string;
    scope: CurationContext;
    status: CurationStatus;
    weight: number;
    priority: number;
    mode: "boost" | "suppress";
    startsAt?: string;
    endsAt?: string;
    reason: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export interface LaunchCollectionItem {
    id: string;
    itemType: "creator" | "place";
    itemId: string;
    order: number;
    note?: string;
}
export interface LaunchCollection {
    id: string;
    name: string;
    city?: string;
    categoryId?: string;
    status: CurationStatus;
    visibility: "internal" | "public";
    reason: string;
    notes?: string;
    items: LaunchCollectionItem[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
export interface SourceHealthReviewItem {
    id: string;
    city?: string;
    provider?: string;
    issueType: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "open" | "triaged" | "in_progress" | "resolved";
    canonicalPlaceId?: string;
    assignedTo?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}
