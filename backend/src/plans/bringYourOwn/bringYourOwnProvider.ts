import { ProviderError } from "../errors.js";
import { mapProviderCategory } from "../normalization/categoryMap.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "../normalization/urls.js";
import { planId, type Plan } from "../plan.js";
import type { PlanProvider, ProviderContext } from "../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";
import { validateSearchPlansInput } from "../validation.js";
import { validatePlanArray } from "../planValidation.js";
import type { IdeasStore, StoredIdea } from "./storage.js";

export interface BringYourOwnProviderOptions {
  maxIdeasPerSession?: number;
  includeDeleted?: boolean;
}

export class BringYourOwnProvider implements PlanProvider {
  public readonly name = "byo";
  private readonly maxIdeasPerSession: number;

  constructor(
    private readonly store: IdeasStore,
    private readonly options: BringYourOwnProviderOptions = {}
  ) {
    this.maxIdeasPerSession = Math.max(1, this.options.maxIdeasPerSession ?? 500);
  }

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    if (ctx?.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "BringYourOwnProvider search aborted",
        retryable: true
      });
    }

    const normalizedInput = validateSearchPlansInput(input);
    const startedAt = Date.now();

    if (!ctx?.sessionId) {
      return {
        plans: [],
        nextCursor: null,
        source: this.name,
        debug: {
          tookMs: Date.now() - startedAt,
          returned: 0
        }
      };
    }

    const result = await this.store.listIdeas(ctx.sessionId, {
      limit: this.maxIdeasPerSession,
      cursor: normalizedInput.cursor,
      includeDeleted: this.options.includeDeleted
    });

    if (ctx.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "BringYourOwnProvider search aborted",
        retryable: true
      });
    }

    const plans = result.ideas.map((idea) => this.toPlan(idea, normalizedInput.location));
    const validatedPlans = validatePlanArray(plans);

    return {
      plans: validatedPlans,
      nextCursor: result.nextCursor ?? null,
      source: this.name,
      debug: {
        tookMs: Date.now() - startedAt,
        returned: validatedPlans.length
      }
    };
  }

  private toPlan(idea: StoredIdea, location: { lat: number; lng: number }): Plan {
    const sourceId = `idea:${idea.sessionId}:${idea.ideaId}`;
    const title = idea.data.title;
    const description = idea.data.description;

    const metadata: Record<string, unknown> = {
      kind: "user_idea",
      sessionId: idea.sessionId,
      ideaId: idea.ideaId,
      createdAtISO: idea.createdAtISO
    };

    if (idea.createdByUserId && !idea.createdByUserId.startsWith("_")) {
      metadata.createdByUserId = idea.createdByUserId;
    }

    return {
      id: planId(this.name, sourceId),
      source: this.name,
      sourceId,
      title,
      description,
      category: idea.data.category ?? mapProviderCategory(this.name, { categories: [title, description ?? ""], primary: null }),
      location,
      priceLevel: idea.data.priceLevel,
      deepLinks: {
        mapsLink: buildMapsLink(location.lat, location.lng, title),
        websiteLink: normalizeHttpUrl(idea.data.website),
        callLink: normalizeTelUrl(idea.data.phone)
      },
      metadata
    };
  }
}
