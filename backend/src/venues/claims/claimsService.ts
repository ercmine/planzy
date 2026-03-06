import { randomUUID } from "node:crypto";

import { ValidationError } from "../../plans/errors.js";
import type { ListClaimsResult, VerificationStatus, VenueClaimLeadRecord } from "./types.js";
import type { VenueClaimStore } from "./store.js";
import { validateListClaimsOptions, validateVenueClaimLeadInput } from "./validation.js";

const STATUS_VALUES: VerificationStatus[] = ["pending", "verified", "rejected"];

export class VenueClaimsService {
  private readonly store: VenueClaimStore;
  private readonly now: () => Date;

  constructor(store: VenueClaimStore, deps?: { now?: () => Date }) {
    this.store = store;
    this.now = deps?.now ?? (() => new Date());
  }

  public async createLead(input: unknown, ctx?: { userId?: string }): Promise<VenueClaimLeadRecord> {
    const validated = validateVenueClaimLeadInput(input);
    const userId = validated.userId ?? ctx?.userId;

    const existing = await this.store.findByVenueAndEmail(validated.venueId, validated.contactEmail);
    if (existing && existing.verificationStatus === "pending") {
      return existing;
    }

    const record: VenueClaimLeadRecord = {
      claimId: randomUUID(),
      venueId: validated.venueId,
      contactEmail: validated.contactEmail,
      verificationStatus: "pending",
      createdAtISO: this.now().toISOString(),
      ...(validated.message ? { message: validated.message } : {}),
      ...(userId ? { userId } : {}),
      ...(validated.planId ? { planId: validated.planId } : {}),
      ...(validated.provider ? { provider: validated.provider } : {})
    };

    await this.store.create(record);
    return record;
  }

  public async listLeads(opts?: unknown): Promise<ListClaimsResult> {
    const normalized = validateListClaimsOptions(opts);
    return this.store.list(normalized);
  }

  public async setStatus(claimId: string, status: VerificationStatus): Promise<void> {
    if (!STATUS_VALUES.includes(status)) {
      throw new ValidationError([`status must be one of ${STATUS_VALUES.join(", ")}`]);
    }

    await this.store.updateStatus(claimId, status, { updatedAtISO: this.now().toISOString() });
  }
}
