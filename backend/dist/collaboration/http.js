import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function resolveActor(accounts, req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    const actingType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
    const actingId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
    return accounts.resolveActingContext(userId, actingType && actingId ? { profileType: actingType, profileId: actingId } : undefined);
}
export function createCollaborationHttpHandlers(service, accounts) {
    return {
        async createInvite(req, res) {
            const actor = resolveActor(accounts, req);
            const body = await parseJsonBody(req);
            const invite = await service.createInvite(actor, body);
            sendJson(res, 201, { invite });
        },
        async listBusinessInvites(req, res, businessProfileId) {
            const actor = resolveActor(accounts, req);
            const invites = await service.listBusinessInvites(actor, businessProfileId);
            sendJson(res, 200, { invites });
        },
        async listCreatorInvites(req, res, creatorProfileId) {
            const actor = resolveActor(accounts, req);
            const invites = await service.listCreatorInvites(actor, creatorProfileId);
            sendJson(res, 200, { invites });
        },
        async respondToInvite(req, res, inviteId) {
            const actor = resolveActor(accounts, req);
            const body = await parseJsonBody(req);
            const updated = await service.respondToInvite(actor, inviteId, String(body.decision ?? ""), typeof body.note === "string" ? String(body.note) : undefined);
            sendJson(res, 200, { invite: updated });
        },
        async transitionCampaign(req, res, campaignId) {
            const actor = resolveActor(accounts, req);
            const body = await parseJsonBody(req);
            const campaign = await service.transitionCampaignStatus(actor, campaignId, String(body.status ?? ""));
            sendJson(res, 200, { campaign });
        },
        async linkCampaignContent(req, res) {
            const actor = resolveActor(accounts, req);
            const body = await parseJsonBody(req);
            const link = await service.linkContentToCampaign(actor, body);
            sendJson(res, 201, { link });
        },
        async addFeaturedPlacement(req, res) {
            const actor = resolveActor(accounts, req);
            const body = await parseJsonBody(req);
            const placement = await service.addFeaturedPlacement(actor, body);
            sendJson(res, 201, { placement });
        },
        async listFeaturedForPlace(_, res, placeId) {
            const placements = await service.listFeaturedForPlace(placeId);
            sendJson(res, 200, { placements });
        }
    };
}
