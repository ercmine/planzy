import type { IncomingMessage, ServerResponse } from "node:http";

import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { RolloutService } from "./service.js";
import type { AccountTypeRollout } from "./types.js";

function listHeader(req: IncomingMessage, name: string): string[] {
  const raw = String(readHeader(req, name) ?? "").trim();
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function getContext(req: IncomingMessage, rolloutService: RolloutService, featureKey: string) {
  return rolloutService.resolveContext({
    featureKey,
    userId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined,
    market: String(readHeader(req, "x-market") ?? readHeader(req, "x-region") ?? "").trim() || undefined,
    cohorts: listHeader(req, "x-cohorts"),
    accountType: (() => {
      const raw = String(readHeader(req, "x-account-type") ?? "").trim().toLowerCase();
      return raw ? raw as AccountTypeRollout : undefined;
    })(),
  });
}

export function createRolloutHttpHandlers(rolloutService: RolloutService) {
  return {
    summary: async (req: IncomingMessage, res: ServerResponse) => {
      const context = getContext(req, rolloutService, "summary");
      sendJson(res, 200, {
        environment: context.environment,
        context: {
          userId: context.userId,
          market: context.market,
          cohorts: context.cohorts,
          accountType: context.accountType,
          planFamily: context.planFamily
        },
        features: rolloutService.getRolloutSummaryForPrincipal({
          environment: context.environment,
          userId: context.userId,
          targetType: context.targetType,
          targetId: context.targetId,
          market: context.market,
          cohorts: context.cohorts,
          accountType: context.accountType,
          planFamily: context.planFamily,
          roles: context.roles,
          activeProfileType: context.activeProfileType
        })
      });
    },
    evaluate: async (req: IncomingMessage, res: ServerResponse, featureKey: string) => {
      const context = getContext(req, rolloutService, featureKey);
      sendJson(res, 200, rolloutService.evaluate(featureKey, context));
    },
    adminList: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { items: rolloutService.listDefinitions() });
    },
    adminUpsert: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      const changedBy = String(readHeader(req, "x-admin-id") ?? readHeader(req, "x-user-id") ?? "system");
      const saved = rolloutService.updateDefinition({ ...(body as any), updatedBy: changedBy });
      sendJson(res, 200, saved);
    },
    adminAudit: async (req: IncomingMessage, res: ServerResponse) => {
      const limitRaw = Number(String(readHeader(req, "x-limit") ?? "50"));
      sendJson(res, 200, { items: rolloutService.listAudit(Number.isFinite(limitRaw) ? limitRaw : 50) });
    }
  };
}
