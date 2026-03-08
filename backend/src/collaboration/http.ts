import type { IncomingMessage, ServerResponse } from "node:http";

import type { AccountsService } from "../accounts/service.js";
import { ProfileType } from "../accounts/types.js";
import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CollaborationService } from "./service.js";

function resolveActor(accounts: AccountsService, req: IncomingMessage) {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  const actingType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
  const actingId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
  return accounts.resolveActingContext(userId, actingType && actingId ? { profileType: actingType as ProfileType, profileId: actingId } : undefined);
}

export function createCollaborationHttpHandlers(service: CollaborationService, accounts: AccountsService) {
  return {
    async createInvite(req: IncomingMessage, res: ServerResponse) {
      const actor = resolveActor(accounts, req);
      const body = await parseJsonBody(req);
      const invite = await service.createInvite(actor, body as never);
      sendJson(res, 201, { invite });
    },
    async listBusinessInvites(req: IncomingMessage, res: ServerResponse, businessProfileId: string) {
      const actor = resolveActor(accounts, req);
      const invites = await service.listBusinessInvites(actor, businessProfileId);
      sendJson(res, 200, { invites });
    },
    async listCreatorInvites(req: IncomingMessage, res: ServerResponse, creatorProfileId: string) {
      const actor = resolveActor(accounts, req);
      const invites = await service.listCreatorInvites(actor, creatorProfileId);
      sendJson(res, 200, { invites });
    },
    async respondToInvite(req: IncomingMessage, res: ServerResponse, inviteId: string) {
      const actor = resolveActor(accounts, req);
      const body = await parseJsonBody(req);
      const updated = await service.respondToInvite(actor, inviteId, String((body as Record<string, unknown>).decision ?? "") as "accept" | "decline", typeof (body as Record<string, unknown>).note === "string" ? String((body as Record<string, unknown>).note) : undefined);
      sendJson(res, 200, { invite: updated });
    },
    async transitionCampaign(req: IncomingMessage, res: ServerResponse, campaignId: string) {
      const actor = resolveActor(accounts, req);
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const campaign = await service.transitionCampaignStatus(actor, campaignId, String(body.status ?? "") as never);
      sendJson(res, 200, { campaign });
    },
    async linkCampaignContent(req: IncomingMessage, res: ServerResponse) {
      const actor = resolveActor(accounts, req);
      const body = await parseJsonBody(req);
      const link = await service.linkContentToCampaign(actor, body as never);
      sendJson(res, 201, { link });
    },
    async addFeaturedPlacement(req: IncomingMessage, res: ServerResponse) {
      const actor = resolveActor(accounts, req);
      const body = await parseJsonBody(req);
      const placement = await service.addFeaturedPlacement(actor, body as never);
      sendJson(res, 201, { placement });
    },
    async listFeaturedForPlace(_: IncomingMessage, res: ServerResponse, placeId: string) {
      const placements = await service.listFeaturedForPlace(placeId);
      sendJson(res, 200, { placements });
    }
  };
}
