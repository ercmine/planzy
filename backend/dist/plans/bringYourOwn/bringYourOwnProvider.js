import { ProviderError } from "../errors.js";
import { mapProviderCategory } from "../normalization/categoryMap.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "../normalization/urls.js";
import { planId } from "../plan.js";
import { validateSearchPlansInput } from "../validation.js";
import { validatePlanArray } from "../planValidation.js";
export class BringYourOwnProvider {
    store;
    options;
    name = "byo";
    maxIdeasPerSession;
    constructor(store, options = {}) {
        this.store = store;
        this.options = options;
        this.maxIdeasPerSession = Math.max(1, this.options.maxIdeasPerSession ?? 500);
    }
    async searchPlans(input, ctx) {
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
    toPlan(idea, location) {
        const sourceId = `idea:${idea.sessionId}:${idea.ideaId}`;
        const title = idea.data.title;
        const description = idea.data.description;
        const metadata = {
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
