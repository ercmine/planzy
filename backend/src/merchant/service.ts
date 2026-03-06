import { randomUUID } from "node:crypto";

import { planId, PLAN_CATEGORIES, type Category, type Plan } from "../plans/plan.js";
import type { MerchantStore } from "./store.js";
import type {
  ListPromotedResult,
  ListSpecialsResult,
  PromoStatus,
  PromotedPlanInput,
  PromotedPlanRecord,
  SpecialInput,
  SpecialRecord,
  SpecialStatus
} from "./types.js";
import { validateListOptions, validatePromotedPlanInput, validateSpecialInput } from "./validation.js";
import { ValidationError } from "../plans/errors.js";

function inferCategory(input: { title: string; description?: string }): Category {
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase();
  if (text.includes("movie") || text.includes("cinema")) return "movies";
  if (text.includes("drink") || text.includes("bar") || text.includes("cocktail")) return "drinks";
  if (text.includes("coffee")) return "coffee";
  if (text.includes("sport") || text.includes("game")) return "sports";
  if (text.includes("shop") || text.includes("store")) return "shopping";
  if (text.includes("music") || text.includes("concert")) return "music";
  if (text.includes("hike") || text.includes("park") || text.includes("trail")) return "outdoors";
  if (text.includes("spa") || text.includes("wellness")) return "wellness";
  if (text.includes("food") || text.includes("dinner") || text.includes("lunch")) return "food";
  return "other";
}

function isActive(status: PromoStatus | SpecialStatus, startsAtISO: string | undefined, endsAtISO: string | undefined, now: Date): boolean {
  if (status !== "active") return false;
  const nowMs = now.getTime();
  if (startsAtISO && Date.parse(startsAtISO) > nowMs) return false;
  if (endsAtISO && Date.parse(endsAtISO) <= nowMs) return false;
  return true;
}

function toPromotedPlan(input: PromotedPlanInput, promoId: string): Plan {
  const sourceId = `promo:${promoId}`;
  const category = input.category && (PLAN_CATEGORIES as readonly string[]).includes(input.category) ? input.category : inferCategory(input);
  return {
    id: planId("promoted", sourceId),
    source: "promoted",
    sourceId,
    title: input.title,
    description: input.description,
    category,
    location: { lat: 0, lng: 0, address: "Venue-linked promotion" },
    photos: input.imageUrls?.map((url) => ({ url })),
    deepLinks: {
      websiteLink: input.websiteLink,
      bookingLink: input.bookingLink,
      ticketLink: input.ticketLink,
      callLink: input.callLink
    },
    metadata: {
      kind: "promoted",
      venueId: input.venueId,
      provider: input.provider,
      startsAtISO: input.startsAtISO,
      endsAtISO: input.endsAtISO,
      priority: input.priority ?? 0
    }
  };
}

export class MerchantService {
  private readonly now: () => Date;

  constructor(private readonly store: MerchantStore, deps?: { now?: () => Date }) {
    this.now = deps?.now ?? (() => new Date());
  }

  async createPromoted(input: unknown): Promise<PromotedPlanRecord> {
    const valid = validatePromotedPlanInput(input);
    const promoId = randomUUID();
    const createdAtISO = this.now().toISOString();
    const record: PromotedPlanRecord = {
      promoId,
      venueId: valid.venueId,
      provider: valid.provider,
      plan: toPromotedPlan(valid, promoId),
      status: valid.status ?? "active",
      priority: valid.priority ?? 0,
      startsAtISO: valid.startsAtISO,
      endsAtISO: valid.endsAtISO,
      createdAtISO
    };
    await this.store.createPromoted(record);
    return record;
  }

  async updatePromoted(promoId: string, patchInput: unknown): Promise<PromotedPlanRecord> {
    const existing = await this.store.getPromoted(promoId);
    if (!existing) {
      throw new ValidationError(["promoted plan not found"]);
    }
    const patch = patchInput as Record<string, unknown>;
    const merged: PromotedPlanInput = {
      venueId: typeof patch.venueId === "string" ? patch.venueId : existing.venueId,
      provider: typeof patch.provider === "string" ? patch.provider : existing.provider,
      title: typeof patch.title === "string" ? patch.title : existing.plan.title,
      description: typeof patch.description === "string" ? patch.description : existing.plan.description,
      category: (typeof patch.category === "string" ? patch.category : existing.plan.category) as Category,
      websiteLink: typeof patch.websiteLink === "string" ? patch.websiteLink : existing.plan.deepLinks?.websiteLink,
      bookingLink: typeof patch.bookingLink === "string" ? patch.bookingLink : existing.plan.deepLinks?.bookingLink,
      ticketLink: typeof patch.ticketLink === "string" ? patch.ticketLink : existing.plan.deepLinks?.ticketLink,
      callLink: typeof patch.callLink === "string" ? patch.callLink : existing.plan.deepLinks?.callLink,
      imageUrls: Array.isArray(patch.imageUrls) ? (patch.imageUrls as string[]) : existing.plan.photos?.map((item) => item.url),
      startsAtISO: typeof patch.startsAtISO === "string" ? patch.startsAtISO : existing.startsAtISO,
      endsAtISO: typeof patch.endsAtISO === "string" ? patch.endsAtISO : existing.endsAtISO,
      status: (typeof patch.status === "string" ? patch.status : existing.status) as PromoStatus,
      priority: typeof patch.priority === "number" ? patch.priority : existing.priority
    };

    const valid = validatePromotedPlanInput(merged);
    const updated: PromotedPlanRecord = {
      ...existing,
      venueId: valid.venueId,
      provider: valid.provider,
      plan: { ...toPromotedPlan(valid, promoId), id: existing.plan.id, sourceId: existing.plan.sourceId },
      status: valid.status ?? existing.status,
      priority: valid.priority ?? existing.priority,
      startsAtISO: valid.startsAtISO,
      endsAtISO: valid.endsAtISO,
      updatedAtISO: this.now().toISOString()
    };
    await this.store.updatePromoted(promoId, updated);
    return updated;
  }

  async listPromoted(opts?: unknown): Promise<ListPromotedResult> {
    const normalized = validateListOptions(opts);
    const now = new Date(normalized.nowISO ?? this.now().toISOString());
    const result = await this.store.listPromoted(normalized);
    return {
      items: result.items.filter((item) => (normalized.nowISO ? isActive(item.status, item.startsAtISO, item.endsAtISO, now) : true)),
      nextCursor: result.nextCursor
    };
  }

  async deletePromoted(promoId: string): Promise<void> {
    await this.store.deletePromoted(promoId);
  }

  async createSpecial(input: unknown): Promise<SpecialRecord> {
    const valid = validateSpecialInput(input);
    const specialId = randomUUID();
    const record: SpecialRecord = {
      specialId,
      venueId: valid.venueId,
      provider: valid.provider,
      headline: valid.headline,
      details: valid.details,
      couponCode: valid.couponCode,
      bookingLink: valid.bookingLink,
      status: valid.status ?? "active",
      startsAtISO: valid.startsAtISO,
      endsAtISO: valid.endsAtISO,
      createdAtISO: this.now().toISOString()
    };
    await this.store.createSpecial(record);
    return record;
  }

  async updateSpecial(specialId: string, patchInput: unknown): Promise<SpecialRecord> {
    const existing = await this.store.getSpecial(specialId);
    if (!existing) {
      throw new ValidationError(["special not found"]);
    }
    const patch = patchInput as Record<string, unknown>;
    const merged: SpecialInput = {
      venueId: typeof patch.venueId === "string" ? patch.venueId : existing.venueId,
      provider: typeof patch.provider === "string" ? patch.provider : existing.provider,
      headline: typeof patch.headline === "string" ? patch.headline : existing.headline,
      details: typeof patch.details === "string" ? patch.details : existing.details,
      startsAtISO: typeof patch.startsAtISO === "string" ? patch.startsAtISO : existing.startsAtISO,
      endsAtISO: typeof patch.endsAtISO === "string" ? patch.endsAtISO : existing.endsAtISO,
      status: (typeof patch.status === "string" ? patch.status : existing.status) as SpecialStatus,
      couponCode: typeof patch.couponCode === "string" ? patch.couponCode : existing.couponCode,
      bookingLink: typeof patch.bookingLink === "string" ? patch.bookingLink : existing.bookingLink
    };
    const valid = validateSpecialInput(merged);

    const updated: SpecialRecord = {
      ...existing,
      venueId: valid.venueId,
      provider: valid.provider,
      headline: valid.headline,
      details: valid.details,
      startsAtISO: valid.startsAtISO,
      endsAtISO: valid.endsAtISO,
      status: valid.status ?? existing.status,
      couponCode: valid.couponCode,
      bookingLink: valid.bookingLink,
      updatedAtISO: this.now().toISOString()
    };

    await this.store.updateSpecial(specialId, updated);
    return updated;
  }

  async listSpecials(opts?: unknown): Promise<ListSpecialsResult> {
    const normalized = validateListOptions(opts);
    const now = new Date(normalized.nowISO ?? this.now().toISOString());
    const result = await this.store.listSpecials(normalized);
    return {
      items: result.items.filter((item) => (normalized.nowISO ? isActive(item.status, item.startsAtISO, item.endsAtISO, now) : true)),
      nextCursor: result.nextCursor
    };
  }

  async deleteSpecial(specialId: string): Promise<void> {
    await this.store.deleteSpecial(specialId);
  }

  async specialsForVenue(venueId: string, now: Date): Promise<SpecialRecord[]> {
    const list = await this.store.listSpecials({ venueId, limit: 200 });
    return list.items.filter((item) => isActive(item.status, item.startsAtISO, item.endsAtISO, now));
  }
  async attachSpecialsToPlans(plans: Plan[], now: Date): Promise<Plan[]> {
    const byVenue = new Map<string, Plan[]>();
    for (const plan of plans) {
      const venueId = typeof plan.metadata?.venueId === "string"
        ? (plan.metadata.venueId as string)
        : `${plan.source}:${plan.sourceId}`;
      const bucket = byVenue.get(venueId) ?? [];
      bucket.push(plan);
      byVenue.set(venueId, bucket);
    }

    await Promise.all(
      [...byVenue.entries()].map(async ([venueId, venuePlans]) => {
        const specials = (await this.specialsForVenue(venueId, now)).slice(0, 2).map((special) => ({
          headline: special.headline,
          details: special.details,
          couponCode: special.couponCode,
          bookingLink: special.bookingLink,
          startsAtISO: special.startsAtISO,
          endsAtISO: special.endsAtISO
        }));

        if (specials.length === 0) return;

        for (const plan of venuePlans) {
          plan.metadata = { ...(plan.metadata ?? {}), specials };
        }
      })
    );

    return plans;
  }
}

