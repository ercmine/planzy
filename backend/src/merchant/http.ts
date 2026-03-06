import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { defaultLogger } from "../logging/logger.js";
import type { Logger } from "../logging/loggerTypes.js";
import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import { MerchantService } from "./service.js";

function hashVenue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function parseIdFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[3] ?? "");
}

export function createMerchantHttpHandlers(service: MerchantService, deps?: { logger?: Logger }) {
  const logger = deps?.logger ?? defaultLogger;

  return {
    async createPromoted(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const body = await parseJsonBody(req);
      const created = await service.createPromoted(body);
      logger.info("merchant.promoted.created", { promoId: created.promoId, venueHash: hashVenue(created.venueId) });
      sendJson(res, 201, { promoId: created.promoId, status: created.status, createdAtISO: created.createdAtISO });
    },

    async patchPromoted(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const body = await parseJsonBody(req);
      const promoId = parseIdFromPath(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname);
      const updated = await service.updatePromoted(promoId, body);
      logger.info("merchant.promoted.updated", { promoId: updated.promoId, venueHash: hashVenue(updated.venueId) });
      sendJson(res, 200, updated);
    },

    async listPromoted(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const result = await service.listPromoted({
        venueId: url.searchParams.get("venueId") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
        cursor: url.searchParams.get("cursor")
      });
      sendJson(res, 200, result);
    },

    async deletePromoted(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const promoId = parseIdFromPath(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname);
      await service.deletePromoted(promoId);
      logger.info("merchant.promoted.deleted", { promoId });
      sendJson(res, 200, { ok: true });
    },

    async createSpecial(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const body = await parseJsonBody(req);
      const created = await service.createSpecial(body);
      logger.info("merchant.special.created", { specialId: created.specialId, venueHash: hashVenue(created.venueId) });
      sendJson(res, 201, { specialId: created.specialId, status: created.status, createdAtISO: created.createdAtISO });
    },

    async patchSpecial(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const body = await parseJsonBody(req);
      const specialId = parseIdFromPath(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname);
      const updated = await service.updateSpecial(specialId, body);
      logger.info("merchant.special.updated", { specialId: updated.specialId, venueHash: hashVenue(updated.venueId) });
      sendJson(res, 200, updated);
    },

    async listSpecials(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const result = await service.listSpecials({
        venueId: url.searchParams.get("venueId") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
        cursor: url.searchParams.get("cursor")
      });
      sendJson(res, 200, result);
    },

    async deleteSpecial(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const specialId = parseIdFromPath(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname);
      await service.deleteSpecial(specialId);
      logger.info("merchant.special.deleted", { specialId });
      sendJson(res, 200, { ok: true });
    }
  };
}

export function handleMerchantHttpError(res: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) {
    sendJson(res, 400, { error: error.message, details: error.details });
    return;
  }
  sendJson(res, 500, { error: "Internal Server Error" });
}
