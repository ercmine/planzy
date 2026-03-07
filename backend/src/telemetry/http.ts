import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { TelemetryService } from "./telemetryService.js";

function canInspectTelemetry(req: IncomingMessage): boolean {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (expectedKey && readHeader(req, "x-admin-key") === expectedKey) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function createTelemetryHttpHandlers(service: TelemetryService) {
  async function ingest(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void> {
    const body = await parseJsonBody(req);
    const events = Array.isArray(body)
      ? body
      : typeof body === "object" && body !== null && Array.isArray((body as { events?: unknown }).events)
        ? (body as { events: unknown[] }).events
        : null;

    if (!events) {
      throw new ValidationError(["request body must be an array or an object with events[]"]);
    }

    const result = await service.ingestBatch(sessionId, events, {
      userId: readHeader(req, "x-user-id"),
      requestId: readHeader(req, "x-request-id") ?? randomUUID()
    });

    sendJson(res, 202, result);
  }

  async function list(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void> {
    if (!canInspectTelemetry(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);

    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const limit = limitParam !== null ? Number(limitParam) : undefined;

    const result = await service.list(sessionId, {
      limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
      cursor
    });

    sendJson(res, 200, result);
  }

  async function aggregate(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void> {
    if (!canInspectTelemetry(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const result = await service.aggregate(sessionId);
    sendJson(res, 200, result);
  }

  return { ingest, list, aggregate };
}
