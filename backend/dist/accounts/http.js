import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { PermissionAction, ProfileType } from "./types.js";
function getUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
function parseRequestedContext(req) {
    const profileType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
    const profileId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
    if (!profileType || !profileId)
        return undefined;
    return { profileType: profileType, profileId };
}
function mapServiceError(res, error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code.includes("NOT_ALLOWED") || code.includes("ESCALATION") || code.includes("MISMATCH")) {
        sendJson(res, 403, { error: code });
        return;
    }
    if (code.includes("ALREADY_EXISTS")) {
        sendJson(res, 409, { error: code });
        return;
    }
    if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message, details: error.details });
        return;
    }
    throw error;
}
export function createAccountsHttpHandlers(accounts) {
    return {
        async getCurrentIdentity(req, res) {
            try {
                const userId = getUserId(req);
                sendJson(res, 200, accounts.getIdentitySummary(userId));
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async getActingContexts(req, res) {
            try {
                const userId = getUserId(req);
                sendJson(res, 200, { contexts: accounts.listActingContexts(userId) });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async switchContext(req, res) {
            try {
                const userId = getUserId(req);
                const payload = (await parseJsonBody(req));
                const actor = accounts.switchActiveContext(userId, payload);
                sendJson(res, 200, { actor });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async createCreatorProfile(req, res) {
            try {
                const userId = getUserId(req);
                const actor = accounts.resolveActingContext(userId);
                const decision = accounts.authorizeAction(actor, PermissionAction.CREATE_CREATOR_PROFILE);
                if (!decision.allowed) {
                    sendJson(res, 403, { decision });
                    return;
                }
                const payload = (await parseJsonBody(req));
                const profile = accounts.createCreatorProfile(userId, payload);
                sendJson(res, 201, { profile });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async createBusinessProfile(req, res) {
            try {
                const userId = getUserId(req);
                const payload = (await parseJsonBody(req));
                const profile = accounts.createBusinessProfile(userId, payload);
                sendJson(res, 201, { profile });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async getPermissions(req, res) {
            try {
                const userId = getUserId(req);
                const requested = parseRequestedContext(req);
                const actor = accounts.resolveActingContext(userId, requested);
                sendJson(res, 200, {
                    actor,
                    permissions: {
                        creatorPublish: accounts.authorizeAction(actor, PermissionAction.PUBLISH_CREATOR_CONTENT),
                        businessReply: accounts.authorizeAction(actor, PermissionAction.BUSINESS_REPLY),
                        manageBusinessMembers: accounts.authorizeAction(actor, PermissionAction.MANAGE_BUSINESS_MEMBERS)
                    }
                });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async inviteBusinessMember(req, res, businessProfileId) {
            try {
                const userId = getUserId(req);
                const actor = accounts.resolveActingContext(userId, { profileType: ProfileType.BUSINESS, profileId: businessProfileId });
                const payload = (await parseJsonBody(req));
                const member = accounts.inviteBusinessMember(actor, { ...payload, role: payload.role, businessProfileId });
                sendJson(res, 201, { member });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        },
        async listBusinessMembers(req, res, businessProfileId) {
            try {
                const userId = getUserId(req);
                const actor = accounts.resolveActingContext(userId, { profileType: ProfileType.BUSINESS, profileId: businessProfileId });
                const members = accounts.listBusinessMembers(actor, businessProfileId);
                sendJson(res, 200, { members });
            }
            catch (error) {
                mapServiceError(res, error);
            }
        }
    };
}
