import { createHash } from "node:crypto";
import { defaultLogger } from "../../logging/logger.js";
import { ValidationError } from "../../plans/errors.js";
const MAX_BODY_BYTES = 64 * 1024;
function hashShort(value) {
    return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
export async function parseJsonBody(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        const asBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += asBuffer.byteLength;
        if (total > MAX_BODY_BYTES)
            throw new ValidationError(["request body must be <= 64KB"]);
        chunks.push(asBuffer);
    }
    if (!chunks.length)
        return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    catch {
        throw new ValidationError(["request body must be valid JSON"]);
    }
}
export function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}
export function readHeader(req, name) {
    const value = req.headers[name.toLowerCase()];
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}
function actorFromRequest(req) {
    const adminKey = process.env.ADMIN_API_KEY;
    return {
        userId: readHeader(req, "x-user-id"),
        businessProfileId: readHeader(req, "x-business-profile-id"),
        isAdmin: Boolean(adminKey && readHeader(req, "x-admin-key") === adminKey)
    };
}
export function createVenueClaimsHttpHandlers(service, deps) {
    const logger = deps?.logger ?? defaultLogger;
    async function handleCreate(req, res) {
        const body = await parseJsonBody(req);
        const actor = actorFromRequest(req);
        const created = await service.createLead(body, { userId: actor.userId });
        logger.info("venue_claim.created", { claimId: created.claimId, venueHash: hashShort(created.venueId), emailHash: hashShort(created.contactEmail) });
        sendJson(res, 201, { claimId: created.claimId, verificationStatus: created.verificationStatus, createdAtISO: created.createdAtISO });
    }
    async function handleList(req, res) {
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
    async function handlePatchStatus(req, res, claimId) {
        const body = (await parseJsonBody(req));
        if (!body.status)
            throw new ValidationError(["status is required"]);
        await service.setStatus(claimId, body.status);
        sendJson(res, 200, { ok: true });
    }
    async function handleCreateBusinessClaimDraft(req, res) {
        const created = await service.createClaimDraft(await parseJsonBody(req), actorFromRequest(req));
        sendJson(res, 201, created);
    }
    async function handleSubmitClaim(req, res, claimId) {
        sendJson(res, 200, await service.submitClaim(claimId, actorFromRequest(req)));
    }
    async function handleGetClaim(req, res, claimId) {
        sendJson(res, 200, await service.getClaim(claimId, actorFromRequest(req)));
    }
    async function handleAddEvidence(req, res, claimId) {
        sendJson(res, 201, await service.addEvidence(claimId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleListEvidence(req, res, claimId) {
        sendJson(res, 200, { evidence: await service.listEvidence(claimId, actorFromRequest(req)) });
    }
    async function handleReviewClaim(req, res, claimId) {
        const body = (await parseJsonBody(req));
        sendJson(res, 200, await service.reviewClaim(claimId, body.decision, body.reasonCode, body.notes, actorFromRequest(req)));
    }
    async function handleRevokeOwnership(req, res, ownershipId) {
        const body = (await parseJsonBody(req));
        await service.revokeOwnership(ownershipId, body.reasonCode, actorFromRequest(req));
        sendJson(res, 200, { ok: true });
    }
    async function handleUpsertOfficialContent(req, res, placeId) {
        const body = (await parseJsonBody(req));
        sendJson(res, 201, await service.upsertOfficialContent(placeId, body.ownershipId, body.contentType, body.value, actorFromRequest(req)));
    }
    async function handlePlaceManagementState(req, res, placeId) {
        sendJson(res, 200, await service.getPlaceManagementState(placeId, actorFromRequest(req)));
    }
    async function handleUpdateOfficialDescription(req, res, placeId) {
        const body = (await parseJsonBody(req));
        sendJson(res, 200, await service.updateOfficialDescription(placeId, body.content, actorFromRequest(req)));
    }
    async function handleSubmitCategorySuggestion(req, res, placeId) {
        const body = (await parseJsonBody(req));
        sendJson(res, 200, await service.submitCategorySuggestion(placeId, body, actorFromRequest(req)));
    }
    async function handleUpdateManagedHours(req, res, placeId) {
        sendJson(res, 200, await service.updateManagedHours(placeId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleUpsertBusinessLink(req, res, placeId) {
        sendJson(res, 200, await service.upsertBusinessLink(placeId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleUpsertMenuServices(req, res, placeId) {
        sendJson(res, 200, await service.upsertMenuServices(placeId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleUpsertBusinessImage(req, res, placeId) {
        sendJson(res, 200, await service.upsertBusinessImage(placeId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleUpsertBusinessContactMethod(req, res, placeId) {
        sendJson(res, 200, await service.upsertBusinessContactMethod(placeId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleListBusinessContactMethods(req, res, placeId) {
        sendJson(res, 200, { contacts: await service.listBusinessContactMethods(placeId, actorFromRequest(req)) });
    }
    async function handleVerifyBusinessContactMethod(req, res, placeId, contactMethodId) {
        sendJson(res, 200, await service.verifyBusinessContactMethod(placeId, contactMethodId, await parseJsonBody(req), actorFromRequest(req)));
    }
    async function handleBusinessTrustStatus(req, res, placeId) {
        sendJson(res, 200, await service.getBusinessTrustStatus(placeId, actorFromRequest(req)));
    }
    async function handlePublicBusinessTrust(req, res, placeId) {
        const projection = await service.buildPublicPlaceProjection(placeId, {});
        sendJson(res, 200, { trust: projection.trust });
    }
    async function handleAdminBusinessTrust(req, res, placeId) {
        sendJson(res, 200, await service.getAdminBusinessTrustState(placeId, actorFromRequest(req)));
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
        handlePlaceManagementState,
        handleUpdateOfficialDescription,
        handleSubmitCategorySuggestion,
        handleUpdateManagedHours,
        handleUpsertBusinessLink,
        handleUpsertMenuServices,
        handleUpsertBusinessImage,
        handleUpsertBusinessContactMethod,
        handleListBusinessContactMethods,
        handleVerifyBusinessContactMethod,
        handleBusinessTrustStatus,
        handlePublicBusinessTrust,
        handleAdminBusinessTrust
    };
}
