import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { BusinessMembershipRole, PermissionAction, ProfileType, type ActingContext } from "./types.js";
import type { AccountsService } from "./service.js";

function getUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

function parseRequestedContext(req: IncomingMessage): ActingContext | undefined {
  const profileType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
  const profileId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
  if (!profileType || !profileId) return undefined;
  return { profileType: profileType as ProfileType, profileId };
}

function mapServiceError(res: ServerResponse, error: unknown): void {
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

export function createAccountsHttpHandlers(accounts: AccountsService) {
  return {
    async getCurrentIdentity(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const userId = getUserId(req);
        sendJson(res, 200, accounts.getIdentitySummary(userId));
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async getActingContexts(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const userId = getUserId(req);
        sendJson(res, 200, { contexts: accounts.listActingContexts(userId) });
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async switchContext(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const userId = getUserId(req);
        const payload = (await parseJsonBody(req)) as { profileType: ProfileType; profileId: string };
        const actor = accounts.switchActiveContext(userId, payload);
        sendJson(res, 200, { actor });
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async createCreatorProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const userId = getUserId(req);
        const actor = accounts.resolveActingContext(userId);
        const decision = accounts.authorizeAction(actor, PermissionAction.CREATE_CREATOR_PROFILE);
        if (!decision.allowed) {
          sendJson(res, 403, { decision });
          return;
        }
        const payload = (await parseJsonBody(req)) as { creatorName: string; handle?: string; bio?: string; category?: string };
        const profile = accounts.createCreatorProfile(userId, payload);
        sendJson(res, 201, { profile });
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async createBusinessProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const userId = getUserId(req);
        const payload = (await parseJsonBody(req)) as { businessName: string; slug: string; description?: string };
        const profile = accounts.createBusinessProfile(userId, payload);
        sendJson(res, 201, { profile });
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async getPermissions(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async inviteBusinessMember(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void> {
      try {
        const userId = getUserId(req);
        const actor = accounts.resolveActingContext(userId, { profileType: ProfileType.BUSINESS, profileId: businessProfileId });
        const payload = (await parseJsonBody(req)) as { userId: string; role: "OWNER" | "MANAGER" | "EDITOR" | "VIEWER" };
        const member = accounts.inviteBusinessMember(actor, { ...payload, role: payload.role as BusinessMembershipRole, businessProfileId });
        sendJson(res, 201, { member });
      } catch (error) {
        mapServiceError(res, error);
      }
    },

    async listBusinessMembers(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void> {
      try {
        const userId = getUserId(req);
        const actor = accounts.resolveActingContext(userId, { profileType: ProfileType.BUSINESS, profileId: businessProfileId });
        const members = accounts.listBusinessMembers(actor, businessProfileId);
        sendJson(res, 200, { members });
      } catch (error) {
        mapServiceError(res, error);
      }
    }
  };
}
