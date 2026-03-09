import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CreatorVerificationApplicationDraft } from "./types.js";
import type { CreatorVerificationService } from "./service.js";

function userId(req: IncomingMessage): string {
  const id = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!id) throw new ValidationError(["x-user-id header is required"]);
  return id;
}

function mapError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (["APPLICATION_NOT_FOUND"].includes(code)) return sendJson(res, 404, { error: code });
  if (["ACTIVE_APPLICATION_EXISTS", "INVALID_STATUS_TRANSITION", "APPROVED_APPLICATION_REQUIRED"].includes(code)) return sendJson(res, 409, { error: code });
  if (["CREATOR_PROFILE_REQUIRED", "CREATOR_NOT_FOUND"].includes(code)) return sendJson(res, 403, { error: code });
  if (["REAPPLY_COOLDOWN_ACTIVE", "DRAFT_REQUIRED"].includes(code)) return sendJson(res, 400, { error: code });
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, details: error.details });
  throw error;
}

function parseDraftUpdateBody(payload: unknown): Partial<CreatorVerificationApplicationDraft> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError(["request body must be a JSON object"]);
  }

  const source = payload as Record<string, unknown>;
  const draft: Partial<CreatorVerificationApplicationDraft> = {};

  if ("reason" in source) {
    if (typeof source.reason !== "string") throw new ValidationError(["reason must be a string"]);
    draft.reason = source.reason;
  }
  if ("niche" in source) {
    if (source.niche !== undefined && typeof source.niche !== "string") throw new ValidationError(["niche must be a string"]);
    draft.niche = source.niche;
  }
  if ("cityRegion" in source) {
    if (source.cityRegion !== undefined && typeof source.cityRegion !== "string") throw new ValidationError(["cityRegion must be a string"]);
    draft.cityRegion = source.cityRegion;
  }
  if ("portfolioLinks" in source) {
    if (!Array.isArray(source.portfolioLinks) || source.portfolioLinks.some((item) => typeof item !== "string")) {
      throw new ValidationError(["portfolioLinks must be an array of strings"]);
    }
    draft.portfolioLinks = source.portfolioLinks;
  }
  if ("socialLinks" in source) {
    if (!Array.isArray(source.socialLinks) || source.socialLinks.some((item) => typeof item !== "string")) {
      throw new ValidationError(["socialLinks must be an array of strings"]);
    }
    draft.socialLinks = source.socialLinks;
  }
  if ("evidence" in source) {
    if (source.evidence !== undefined && typeof source.evidence !== "string") throw new ValidationError(["evidence must be a string"]);
    draft.evidence = source.evidence;
  }

  return draft;
}

export function createCreatorVerificationHttpHandlers(service: CreatorVerificationService) {
  return {
    async status(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        sendJson(res, 200, service.getStatusForUser(userId(req)));
      } catch (error) {
        mapError(res, error);
      }
    },

    async eligibility(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        sendJson(res, 200, service.getEligibilityForUser(userId(req)));
      } catch (error) {
        mapError(res, error);
      }
    },

    async saveDraft(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const draft = parseDraftUpdateBody(await parseJsonBody(req));
        const application = service.saveDraft(userId(req), draft);
        sendJson(res, 200, { application });
      } catch (error) {
        mapError(res, error);
      }
    },

    async submit(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const application = service.submit(userId(req));
        sendJson(res, 200, { application });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminList(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const status = String(search.get("status") ?? "").trim() || undefined;
        const creatorProfileId = String(search.get("creatorProfileId") ?? "").trim() || undefined;
        sendJson(res, 200, { applications: service.listAdminApplications({ status: status as never, creatorProfileId }) });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminDetail(_req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void> {
      try {
        sendJson(res, 200, service.getAdminApplicationDetail(applicationId));
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminUnderReview(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { note?: string };
        sendJson(res, 200, { application: service.transitionToUnderReview(userId(req), applicationId, body.note) });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminNeedsMoreInfo(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { publicMessage: string; note?: string };
        sendJson(res, 200, { application: service.requestMoreInfo(userId(req), applicationId, body.publicMessage ?? "Please provide more information.", body.note) });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminApprove(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { note?: string };
        sendJson(res, 200, { application: service.approve(userId(req), applicationId, body.note) });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminReject(req: IncomingMessage, res: ServerResponse, applicationId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { reasonCode: Parameters<CreatorVerificationService["reject"]>[2]; publicMessage: string; note?: string };
        sendJson(res, 200, { application: service.reject(userId(req), applicationId, body.reasonCode ?? "other", body.publicMessage ?? "Your application was not approved at this time.", body.note) });
      } catch (error) {
        mapError(res, error);
      }
    },

    async adminRevoke(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { reasonCode: Parameters<CreatorVerificationService["revoke"]>[2]; publicMessage: string; note?: string };
        sendJson(res, 200, { application: service.revoke(userId(req), creatorProfileId, body.reasonCode ?? "other", body.publicMessage ?? "Your creator verification has been revoked.", body.note) });
      } catch (error) {
        mapError(res, error);
      }
    }
  };
}
