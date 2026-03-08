import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "../../logging/loggerTypes.js";
import { defaultLogger } from "../../logging/logger.js";
import { ValidationError } from "../../plans/errors.js";
import type { VenueClaimsService } from "./claimsService.js";
import type { BusinessManagedPlaceContentRecord } from "./types.js";

const MAX_BODY_BYTES = 64 * 1024;

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const asBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += asBuffer.byteLength;
    if (total > MAX_BODY_BYTES) throw new ValidationError(["request body must be <= 64KB"]);
    chunks.push(asBuffer);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ValidationError(["request body must be valid JSON"]); }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function readHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}

function actorFromRequest(req: IncomingMessage) {
  const adminKey = process.env.ADMIN_API_KEY;
  return {
    userId: readHeader(req, "x-user-id"),
    businessProfileId: readHeader(req, "x-business-profile-id"),
    isAdmin: Boolean(adminKey && readHeader(req, "x-admin-key") === adminKey)
  };
}

export function createVenueClaimsHttpHandlers(service: VenueClaimsService, deps?: { logger?: Logger }) {
  const logger = deps?.logger ?? defaultLogger;

  async function handleCreate(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody(req);
    const actor = actorFromRequest(req);
    const created = await service.createLead(body, { userId: actor.userId });
    logger.info("venue_claim.created", { claimId: created.claimId, venueHash: hashShort(created.venueId), emailHash: hashShort(created.contactEmail) });
    sendJson(res, 201, { claimId: created.claimId, verificationStatus: created.verificationStatus, createdAtISO: created.createdAtISO });
  }

  async function handleList(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const actor = actorFromRequest(req);
    const result = await service.listLeads({
      placeId: url.searchParams.get("placeId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      cursor: url.searchParams.get("cursor"),
      reviewQueueOnly: url.searchParams.get("reviewQueueOnly") === "true"
    }, actor);
    sendJson(res, 200, result);
  }

  async function handlePatchStatus(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    const body = (await parseJsonBody(req)) as { status?: "pending" | "verified" | "rejected" };
    if (!body.status) throw new ValidationError(["status is required"]);
    await service.setStatus(claimId, body.status);
    sendJson(res, 200, { ok: true });
  }

  async function handleCreateBusinessClaimDraft(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const created = await service.createClaimDraft(await parseJsonBody(req), actorFromRequest(req));
    sendJson(res, 201, created);
  }

  async function handleSubmitClaim(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    sendJson(res, 200, await service.submitClaim(claimId, actorFromRequest(req)));
  }

  async function handleGetClaim(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    sendJson(res, 200, await service.getClaim(claimId, actorFromRequest(req)));
  }

  async function handleAddEvidence(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    sendJson(res, 201, await service.addEvidence(claimId, await parseJsonBody(req), actorFromRequest(req)));
  }

  async function handleListEvidence(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    sendJson(res, 200, { evidence: await service.listEvidence(claimId, actorFromRequest(req)) });
  }

  async function handleReviewClaim(req: IncomingMessage, res: ServerResponse, claimId: string): Promise<void> {
    const body = (await parseJsonBody(req)) as { decision: "approve" | "reject" | "request_more_info"; reasonCode: string; notes?: string };
    sendJson(res, 200, await service.reviewClaim(claimId, body.decision, body.reasonCode, body.notes, actorFromRequest(req)));
  }

  async function handleRevokeOwnership(req: IncomingMessage, res: ServerResponse, ownershipId: string): Promise<void> {
    const body = (await parseJsonBody(req)) as { reasonCode: string };
    await service.revokeOwnership(ownershipId, body.reasonCode, actorFromRequest(req));
    sendJson(res, 200, { ok: true });
  }

  async function handleUpsertOfficialContent(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void> {
    const body = (await parseJsonBody(req)) as { ownershipId: string; contentType: BusinessManagedPlaceContentRecord["contentType"]; value: Record<string, unknown> };
    sendJson(res, 201, await service.upsertOfficialContent(placeId, body.ownershipId, body.contentType, body.value, actorFromRequest(req)));
  }

  async function handlePlaceManagementState(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void> {
    sendJson(res, 200, await service.getPlaceManagementState(placeId, actorFromRequest(req)));
  }

  return {
    handleCreate,
    handleList,
    handlePatchStatus,
    handleCreateBusinessClaimDraft,
    handleSubmitClaim,
    handleGetClaim,
    handleAddEvidence,
    handleListEvidence,
    handleReviewClaim,
    handleRevokeOwnership,
    handleUpsertOfficialContent,
    handlePlaceManagementState
  };
}

