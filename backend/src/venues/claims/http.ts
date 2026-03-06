import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "../../logging/loggerTypes.js";
import { defaultLogger } from "../../logging/logger.js";
import { ValidationError } from "../../plans/errors.js";
import type { VenueClaimsService } from "./claimsService.js";
import type { VerificationStatus } from "./types.js";

const MAX_BODY_BYTES = 64 * 1024;
const STATUS_VALUES: VerificationStatus[] = ["pending", "verified", "rejected"];

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const asBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += asBuffer.byteLength;
    if (total > MAX_BODY_BYTES) {
      throw new ValidationError(["request body must be <= 64KB"]);
    }
    chunks.push(asBuffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError(["request body must be valid JSON"]);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(payload);
}

export function readHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export function createVenueClaimsHttpHandlers(service: VenueClaimsService, deps?: { logger?: Logger }) {
  const logger = deps?.logger ?? defaultLogger;

  async function handleCreate(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody(req);
    const userId = readHeader(req, "x-user-id");
    const created = await service.createLead(body, { userId });

    logger.info("venue_claim.created", {
      claimId: created.claimId,
      venueHash: hashShort(created.venueId),
      emailHash: hashShort(created.contactEmail)
    });

    sendJson(res, 201, {
      claimId: created.claimId,
      verificationStatus: created.verificationStatus,
      createdAtISO: created.createdAtISO
    });
  }

  async function handleList(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const statusParam = url.searchParams.get("status");
    const status = statusParam && STATUS_VALUES.includes(statusParam as VerificationStatus)
      ? (statusParam as VerificationStatus)
      : statusParam;

    const result = await service.listLeads({
      venueId: url.searchParams.get("venueId") ?? undefined,
      status: status ?? undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      cursor: url.searchParams.get("cursor")
    });

    // TODO: protect this endpoint (admin only) before production.
    sendJson(res, 200, result);
  }

  async function handlePatchStatus(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    const body = await parseJsonBody(req);
    if (typeof body !== "object" || body === null || typeof (body as { status?: unknown }).status !== "string") {
      throw new ValidationError(["status is required"]);
    }

    await service.setStatus(claimId, (body as { status: VerificationStatus }).status);

    logger.info("venue_claim.status_updated", {
      claimId,
      status: (body as { status: VerificationStatus }).status
    });

    sendJson(res, 200, { ok: true });
  }

  return { handleCreate, handleList, handlePatchStatus };
}
