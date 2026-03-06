import type { ProviderContext, PlanProvider } from "../plans/provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../plans/types.js";
import { validateSearchPlansInput } from "../plans/validation.js";
import { MerchantService } from "./service.js";

function encodeOffset(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function decodeOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export class PromotedProvider implements PlanProvider {
  readonly name = "promoted";

  constructor(
    private readonly service: MerchantService,
    private readonly opts?: { maxReturn?: number }
  ) {}

  async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    const normalized = validateSearchPlansInput(input);
    const now = new Date(ctx?.config ? new Date().toISOString() : new Date().toISOString());
    const promoted = await this.service.listPromoted({ limit: 200, nowISO: now.toISOString() });

    const filtered = promoted.items
      .filter((item) => {
        if (!normalized.categories || normalized.categories.length === 0) return true;
        return normalized.categories.includes(item.plan.category);
      })
      .sort((a, b) => b.priority - a.priority)
      .map((item) => item.plan);

    const maxReturn = this.opts?.maxReturn ?? normalized.limit;
    const offset = decodeOffset(normalized.cursor);
    const plans = filtered.slice(offset, offset + maxReturn);
    const nextOffset = offset + plans.length;

    return {
      plans,
      nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null,
      source: this.name
    };
  }
}
