import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { ROLLOUT_FEATURE_KEYS } from "../rollouts/featureKeys.js";
import type { RolloutService } from "../rollouts/service.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { OutingPlannerService } from "./service.js";
import type { ItineraryRegenerationRequest, OutingPlannerRequest } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export function createOutingPlannerHandlers(service: OutingPlannerService, rolloutService?: RolloutService) {
  const assertRollout = (req: IncomingMessage) => {
    if (!rolloutService) return;
    const userId = requireUserId(req);
    const cohorts = String(readHeader(req, "x-cohorts") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const context = rolloutService.resolveContext({
      featureKey: ROLLOUT_FEATURE_KEYS.AI_ITINERARY,
      userId,
      market: String(readHeader(req, "x-market") ?? "").trim() || undefined,
      cohorts
    });
    rolloutService.assertFeatureRolledOut(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, context);
  };

  return {
    createPlan: async (req: IncomingMessage, res: ServerResponse) => {
      assertRollout(req);
      const body = await parseJsonBody(req) as OutingPlannerRequest;
      sendJson(res, 200, await service.createOutingPlan(requireUserId(req), body));
    },
    savePlan: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { generated?: unknown; title?: string };
      if (!body.generated) throw new ValidationError(["generated itinerary is required"]);
      const result = await service.saveOutingPlan(requireUserId(req), body.generated as any, body.title);
      sendJson(res, "error" in result ? 403 : 201, result);
    },
    listSaved: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { items: await service.listSavedItineraries(requireUserId(req)) });
    },
    getSaved: async (req: IncomingMessage, res: ServerResponse, itineraryId: string) => {
      sendJson(res, 200, await service.getSavedItinerary(requireUserId(req), itineraryId));
    },
    patchSaved: async (req: IncomingMessage, res: ServerResponse, itineraryId: string) => {
      const body = await parseJsonBody(req) as any;
      sendJson(res, 200, await service.updateSavedItinerary(requireUserId(req), itineraryId, body));
    },
    regenerate: async (req: IncomingMessage, res: ServerResponse) => {
      assertRollout(req);
      const body = await parseJsonBody(req) as ItineraryRegenerationRequest;
      const result = await service.regenerateItinerary(requireUserId(req), body);
      sendJson(res, "error" in result ? 403 : 200, result);
    },
    deleteSaved: async (req: IncomingMessage, res: ServerResponse, itineraryId: string) => {
      sendJson(res, 200, await service.deleteSavedItinerary(requireUserId(req), itineraryId));
    },
    usage: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, await service.getItineraryUsageLimits(requireUserId(req)));
    }
  };
}
