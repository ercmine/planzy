import type { UserRole } from "../accounts/types.js";

export type AdminPermission =
  | "admin.read"
  | "admin.moderation"
  | "admin.users.manage"
  | "admin.creators.manage"
  | "admin.businesses.manage"
  | "admin.places.manage"
  | "admin.subscriptions.read"
  | "admin.subscriptions.manage"
  | "admin.ads.read"
  | "admin.ads.manage"
  | "admin.source_health.read"
  | "admin.ops.manage"
  | "admin.audit.read";

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
