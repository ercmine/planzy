import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { OnboardingService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export interface OnboardingHttpHandlers {
  getPreferences(req: IncomingMessage, res: ServerResponse): Promise<void>;
  upsertPreferences(req: IncomingMessage, res: ServerResponse): Promise<void>;
  bootstrapFeed(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export function createOnboardingHttpHandlers(service: OnboardingService): OnboardingHttpHandlers {
  return {
    async getPreferences(req, res) {
      sendJson(res, 200, { preferences: await service.getPreferences(requireUserId(req)) });
    },
    async upsertPreferences(req, res) {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 200, { preferences: await service.updatePreferences(requireUserId(req), body) });
    },
    async bootstrapFeed(req, res) {
      sendJson(res, 200, await service.feedBootstrap(requireUserId(req)));
    }
  };
}
