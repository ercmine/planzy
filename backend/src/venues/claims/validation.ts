import { ValidationError } from "../../plans/errors.js";
import { sanitizeText } from "../../sanitize/text.js";
import type {
  BusinessClaimEvidenceInput,
  BusinessPlaceClaimInput,
  ClaimStatus,
  EvidenceType,
  ListClaimsOptionsNormalized
} from "./types.js";

const CLAIM_TYPES = ["sole_owner", "manager_operator", "organization_representative", "franchise_representative"] as const;
const OWNERSHIP_ROLES = ["owner", "manager", "operator", "org_admin", "franchise_manager"] as const;
const CLAIM_STATUSES: ClaimStatus[] = ["draft", "submitted", "pending_verification", "under_review", "needs_more_info", "approved", "partially_approved", "rejected", "withdrawn", "expired", "suspended", "revoked"];
const EVIDENCE_TYPES: EvidenceType[] = ["email_domain", "website_match", "phone", "document", "registration", "social_link", "source_consistency", "manual_note"];

function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null; }

function str(v: unknown, key: string, details: string[], max: number, req = false): string | undefined {
  if (v === undefined || v === null) { if (req) details.push(`${key} is required`); return undefined; }
  if (typeof v !== "string") { details.push(`${key} must be a string`); return undefined; }
  const cleaned = sanitizeText(v, { source: "user", maxLen: max, profanityMode: "none", allowNewlines: true });
  const t = (cleaned ?? "").trim();
  if (req && t.length === 0) details.push(`${key} cannot be empty`);
  return t || undefined;
}

function validEmail(email: string): boolean {
  const at = email.indexOf("@");
  const dot = email.lastIndexOf(".");
  return at > 0 && dot > at + 1 && dot < email.length - 1;
}

export function validateBusinessClaimInput(x: unknown): BusinessPlaceClaimInput {
  if (!isObject(x)) throw new ValidationError(["request body must be an object"]);
  const details: string[] = [];
  const placeId = str(x.placeId, "placeId", details, 200, true);
  const contactEmail = str(x.contactEmail, "contactEmail", details, 254, true)?.toLowerCase();
  const claimType = str(x.claimType, "claimType", details, 80, true);
  const requestedRole = str(x.requestedRole, "requestedRole", details, 80, true);
  if (claimType && !CLAIM_TYPES.includes(claimType as (typeof CLAIM_TYPES)[number])) details.push(`claimType must be one of ${CLAIM_TYPES.join(", ")}`);
  if (requestedRole && !OWNERSHIP_ROLES.includes(requestedRole as (typeof OWNERSHIP_ROLES)[number])) details.push(`requestedRole must be one of ${OWNERSHIP_ROLES.join(", ")}`);
  if (!contactEmail || !validEmail(contactEmail)) details.push("contactEmail must be a valid email address");

  const methods = Array.isArray(x.verificationMethodSelection)
    ? x.verificationMethodSelection.filter((v): v is EvidenceType => typeof v === "string" && EVIDENCE_TYPES.includes(v as EvidenceType))
    : [];

  if (details.length) throw new ValidationError(details);

  return {
    placeId: placeId!,
    contactEmail: contactEmail!,
    claimType: claimType as BusinessPlaceClaimInput["claimType"],
    requestedRole: requestedRole as BusinessPlaceClaimInput["requestedRole"],
    verificationMethodSelection: methods,
    ...(str(x.contactPhone, "contactPhone", details, 40) ? { contactPhone: str(x.contactPhone, "contactPhone", details, 40)! } : {}),
    ...(str(x.claimantBusinessProfileId, "claimantBusinessProfileId", details, 120) ? { claimantBusinessProfileId: str(x.claimantBusinessProfileId, "claimantBusinessProfileId", details, 120)! } : {}),
    ...(str(x.message, "message", details, 500) ? { message: str(x.message, "message", details, 500)! } : {})
  };
}

export function validateEvidenceInput(x: unknown): BusinessClaimEvidenceInput {
  if (!isObject(x)) throw new ValidationError(["request body must be an object"]);
  const details: string[] = [];
  const evidenceType = str(x.evidenceType, "evidenceType", details, 80, true);
  if (!evidenceType || !EVIDENCE_TYPES.includes(evidenceType as EvidenceType)) details.push(`evidenceType must be one of ${EVIDENCE_TYPES.join(", ")}`);
  if (details.length) throw new ValidationError(details);
  return {
    evidenceType: evidenceType as EvidenceType,
    ...(typeof x.normalizedValue === "string" ? { normalizedValue: x.normalizedValue } : {}),
    ...(typeof x.storageRef === "string" ? { storageRef: x.storageRef } : {}),
    ...(typeof x.notes === "string" ? { notes: x.notes } : {}),
    metadata: isObject(x.metadata) ? x.metadata : {}
  };
}

export function validateListClaimsOptions(x: unknown): ListClaimsOptionsNormalized {
  if (x === undefined || x === null) return { limit: 50, cursor: null };
  if (!isObject(x)) throw new ValidationError(["list options must be an object"]);
  const limit = typeof x.limit === "number" && Number.isInteger(x.limit) && x.limit > 0 ? Math.min(x.limit, 200) : 50;
  const cursor = typeof x.cursor === "string" ? x.cursor : null;
  const placeId = typeof x.placeId === "string" ? x.placeId.trim() : undefined;
  const claimantUserId = typeof x.claimantUserId === "string" ? x.claimantUserId.trim() : undefined;
  const status = typeof x.status === "string" && CLAIM_STATUSES.includes(x.status as ClaimStatus) ? (x.status as ClaimStatus) : undefined;
  return { limit, cursor, ...(placeId ? { placeId } : {}), ...(claimantUserId ? { claimantUserId } : {}), ...(status ? { status } : {}), ...(x.reviewQueueOnly === true ? { reviewQueueOnly: true } : {}) };
}
