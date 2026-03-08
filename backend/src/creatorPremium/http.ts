import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CreatorPremiumService } from "./service.js";

function userId(req: IncomingMessage): string {
  const id = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!id) throw new ValidationError(["x-user-id header is required"]);
  return id;
}

function mapError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (["CREATOR_NOT_FOUND"].includes(code)) return sendJson(res, 404, { error: code });
  if (["FORBIDDEN", "CREATOR_ENTITLEMENT_REQUIRED"].includes(code)) return sendJson(res, 403, { error: code });
  if (["CREATOR_QUOTA_EXCEEDED"].includes(code)) return sendJson(res, 429, { error: code });
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, details: error.details });
  throw error;
}

export function createCreatorPremiumHttpHandlers(service: CreatorPremiumService) {
  return {
    async premiumState(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        sendJson(res, 200, { state: service.getCreatorPremiumState(creatorProfileId) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async analyticsOverview(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const uid = userId(req);
        const state = service.getCreatorPremiumState(creatorProfileId);
        if (!state) throw new Error("CREATOR_NOT_FOUND");
        if (!service.canAccessAdvancedCreatorAnalytics(creatorProfileId)) throw new Error("CREATOR_ENTITLEMENT_REQUIRED");
        sendJson(res, 200, { overview: service.getCreatorAnalyticsOverview(creatorProfileId), requestedBy: uid });
      } catch (error) {
        mapError(res, error);
      }
    },
    async analyticsAudience(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        sendJson(res, 200, { audience: service.getCreatorAudienceBreakdown(creatorProfileId) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async trackAnalytics(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        await parseJsonBody(req).then((payload) => service.recordAnalyticsEvent({ creatorProfileId, ...(payload as object) } as never));
        sendJson(res, 202, { accepted: true });
      } catch (error) {
        mapError(res, error);
      }
    },
    async quotaState(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string, feature: string): Promise<void> {
      try {
        sendJson(res, 200, { quota: service.getCreatorQuota(creatorProfileId, feature as never) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async consumeQuota(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string, feature: string): Promise<void> {
      try {
        sendJson(res, 200, { quota: service.consumeQuota(creatorProfileId, feature as never) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async discoverability(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const query = new URL(req.url ?? "", "http://localhost").searchParams;
        const decision = service.getCreatorDiscoverabilityEligibility(creatorProfileId, {
          trustScore: Number(query.get("trustScore") ?? "0.7"),
          moderationHealthy: String(query.get("moderationHealthy") ?? "true") !== "false",
          profileCompleteness: Number(query.get("profileCompleteness") ?? "0.8"),
          relevanceScore: Number(query.get("relevanceScore") ?? "0.8")
        });
        sendJson(res, 200, { decision });
      } catch (error) {
        mapError(res, error);
      }
    },
    async updateBranding(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        sendJson(res, 200, { branding: service.updateCreatorBranding(userId(req), creatorProfileId, await parseJsonBody(req) as never) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async updateMonetization(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        sendJson(res, 200, { monetization: service.updateCreatorMonetizationSettings(userId(req), creatorProfileId, await parseJsonBody(req) as never) });
      } catch (error) {
        mapError(res, error);
      }
    },
    async upgradeContext(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        sendJson(res, 200, { upgrade: service.getCreatorUpgradeContext(creatorProfileId) });
      } catch (error) {
        mapError(res, error);
      }
    }
  };
}
