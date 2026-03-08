import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import type { BusinessPremiumService } from "./service.js";

function mapError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (["FEATURED_PLACEMENT_LOCKED", "ENHANCED_PROFILE_LOCKED", "MULTI_LOCATION_LIMIT_REACHED", "CAMPAIGNS_LOCKED", "CAMPAIGN_LOCATION_NOT_OWNED"].includes(code)) {
    sendJson(res, 403, { error: code });
    return;
  }
  if (["FEATURED_POLICY_DENIED"].includes(code)) {
    sendJson(res, 422, { error: code });
    return;
  }
  if (error instanceof ValidationError) {
    sendJson(res, 400, { error: error.message, details: error.details });
    return;
  }
  throw error;
}

export function createBusinessPremiumHttpHandlers(service: BusinessPremiumService) {
  return {
    async getPremiumState(_req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      try {
        const tier = await service.getBusinessTier(businessId);
        const entitlements = await service.getBusinessEntitlements(businessId);
        const upgrade = await service.getBusinessUpgradeContext(businessId);
        sendJson(res, 200, { businessId, tier, entitlements, upgrade });
      } catch (error) {
        mapError(res, error);
      }
    },
    async setTier(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as { tier: "standard" | "pro" | "elite" };
        const state = await service.setBusinessTier(businessId, body.tier);
        sendJson(res, 200, { state });
      } catch (error) {
        mapError(res, error);
      }
    },
    async updateFeaturedPlacementSettings(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as Omit<Parameters<BusinessPremiumService["updateBusinessFeaturedPlacementSettings"]>[0], "businessId">;
        const settings = await service.updateBusinessFeaturedPlacementSettings({ ...body, businessId });
        sendJson(res, 200, { settings });
      } catch (error) {
        mapError(res, error);
      }
    },
    async updateEnhancedProfile(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as Omit<Parameters<BusinessPremiumService["updateBusinessEnhancedProfileSettings"]>[0], "businessId">;
        const settings = await service.updateBusinessEnhancedProfileSettings({ ...body, businessId });
        sendJson(res, 200, { settings });
      } catch (error) {
        mapError(res, error);
      }
    },
    async createCampaign(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      try {
        const body = await parseJsonBody(req) as Omit<Parameters<BusinessPremiumService["createBusinessCampaign"]>[0], "businessId">;
        const campaign = await service.createBusinessCampaign({ ...body, businessId });
        sendJson(res, 201, { campaign });
      } catch (error) {
        mapError(res, error);
      }
    }
  };
}
