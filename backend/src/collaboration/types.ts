export type InviteStatus = "invited" | "accepted" | "declined" | "expired" | "archived" | "cancelled";
export type CampaignStatus = "draft" | "invited" | "accepted" | "declined" | "expired" | "active" | "completed" | "cancelled" | "archived";
export type DisclosureLabel = "none" | "partnered" | "sponsored";

export interface CreatorBusinessInvite { id: string; businessProfileId: string; creatorProfileId: string; title: string; message?: string; targetPlaceIds: string[]; deliverablesSummary?: string; proposedStartAt?: string; proposedEndAt?: string; expiresAt?: string; status: InviteStatus; disclosureExpectation: DisclosureLabel; compensationType?: "fixed" | "gifted" | "affiliate" | "other"; compensationNote?: string; highlightedContentPermissionMode: "campaign_opt_in" | "per_content_approval"; createdByUserId: string; createdAt: string; updatedAt: string; respondedAt?: string; responseNote?: string; campaignId?: string; }

export interface CreatorBusinessCampaign { id: string; businessProfileId: string; title: string; description?: string; status: CampaignStatus; startAt?: string; endAt?: string; createdFromInviteId?: string; campaignType: "single_creator" | "multi_creator"; visibility: "private" | "listed"; collaborationTermsVersion: string; notesInternal?: string; createdByUserId: string; createdAt: string; updatedAt: string; archivedAt?: string; }

export interface CampaignParticipant { id: string; campaignId: string; creatorProfileId: string; status: "invited" | "accepted" | "declined" | "removed"; invitedByUserId: string; createdAt: string; updatedAt: string; }

export interface CampaignContentLink { id: string; campaignId: string; creatorProfileId: string; contentType: "video_review" | "text_review" | "guide"; contentId: string; disclosureLabel: DisclosureLabel; creatorApprovedForFeaturing: boolean; moderationStatus: "approved" | "flagged" | "removed"; createdAt: string; updatedAt: string; }

export interface FeaturedCreatorContentPlacement { id: string; businessProfileId: string; placeId: string; creatorProfileId: string; contentType: CampaignContentLink["contentType"]; contentId: string; sourceCampaignId?: string; sourceCampaignContentLinkId?: string; sortOrder: number; isActive: boolean; approvedByCreator: boolean; disclosureLabel: DisclosureLabel; createdAt: string; updatedAt: string; }

export interface CollaborationAuditEvent { id: string; entityType: "invite" | "campaign" | "content_link" | "featured_content"; entityId: string; action: string; actorUserId: string; businessProfileId?: string; creatorProfileId?: string; metadata?: Record<string, unknown>; createdAt: string; }
