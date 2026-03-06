import { ProviderError, ValidationError } from "../errors.js";
import type { PlanProvider, ProviderContext } from "../provider.js";
import { planId, type Plan } from "../plan.js";
import { validatePlanArray } from "../planValidation.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";
import { validateSearchPlansInput } from "../validation.js";
import { CURATED_TEMPLATES, type CuratedTemplate } from "./curatedData.js";
import { buildLocalSuggestions } from "./suggestions.js";

interface CuratedProviderOptions {
  templates?: CuratedTemplate[];
  enableLocalSuggestions?: boolean;
  includeTemplates?: boolean;
  maxTemplates?: number;
  maxSuggestions?: number;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null): number {
  if (!cursor) {
    return 0;
  }
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number.parseInt(decoded, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(["cursor is invalid"]);
  }
  return parsed;
}

function mapsSearchLink(query: string, lat: number, lng: number): string {
  const params = new URLSearchParams({ api: "1", query, center: `${lat},${lng}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function balancedTemplates(templates: CuratedTemplate[], max: number): CuratedTemplate[] {
  const byCategory = new Map<string, CuratedTemplate[]>();
  for (const template of templates) {
    const list = byCategory.get(template.category) ?? [];
    list.push(template);
    byCategory.set(template.category, list);
  }

  const categories = [...byCategory.keys()].sort();
  const selected: CuratedTemplate[] = [];
  let index = 0;

  while (selected.length < max && categories.length > 0) {
    const category = categories[index % categories.length];
    const queue = byCategory.get(category);
    const item = queue?.shift();
    if (item) {
      selected.push(item);
    }
    index += 1;

    for (let i = categories.length - 1; i >= 0; i -= 1) {
      const key = categories[i];
      if ((byCategory.get(key)?.length ?? 0) === 0) {
        categories.splice(i, 1);
      }
    }
  }

  return selected;
}

function selectTemplates(inputCategories: string[] | undefined, templates: CuratedTemplate[], max: number): CuratedTemplate[] {
  if (max <= 0) {
    return [];
  }

  if (inputCategories?.length) {
    const wanted = new Set(inputCategories);
    const prioritized = templates.filter((template) => wanted.has(template.category));
    if (prioritized.length === 0) {
      return balancedTemplates(templates, max);
    }

    const remainder = templates.filter((template) => !wanted.has(template.category));
    const fallbackLimit = Math.min(remainder.length, Math.floor(prioritized.length / 2));
    return [...prioritized, ...remainder.slice(0, fallbackLimit)].slice(0, max);
  }

  return balancedTemplates(templates, max);
}

export class CuratedProvider implements PlanProvider {
  public readonly name = "curated";
  private readonly templates: CuratedTemplate[];
  private readonly enableLocalSuggestions: boolean;
  private readonly includeTemplates: boolean;
  private readonly maxTemplates: number;
  private readonly maxSuggestions: number;

  constructor(options?: CuratedProviderOptions) {
    this.templates = options?.templates ?? CURATED_TEMPLATES;
    this.enableLocalSuggestions = options?.enableLocalSuggestions ?? true;
    this.includeTemplates = options?.includeTemplates ?? true;
    this.maxTemplates = options?.maxTemplates ?? 30;
    this.maxSuggestions = options?.maxSuggestions ?? 8;
  }

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    const started = Date.now();

    if (ctx?.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "Provider request was aborted",
        retryable: true,
        cause: ctx.signal.reason
      });
    }

    const normalized = validateSearchPlansInput(input);
    const offset = decodeCursor(normalized.cursor);

    const selectedTemplates = selectTemplates(normalized.categories, this.templates, this.maxTemplates);

    if (ctx?.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "Provider request was aborted",
        retryable: true,
        cause: ctx.signal.reason
      });
    }

    const templatePlans: Plan[] = this.includeTemplates
      ? selectedTemplates.map((template) => {
          const sourceId = `template:${template.id}`;
          const query = template.keywords[0] ?? template.title;

          return {
            id: planId(this.name, sourceId),
            source: this.name,
            sourceId,
            title: template.title,
            description: template.description,
            category: template.category,
            location: {
              lat: normalized.location.lat,
              lng: normalized.location.lng
            },
            deepLinks: {
              mapsLink: mapsSearchLink(query, normalized.location.lat, normalized.location.lng)
            },
            priceLevel: template.defaultPriceLevel,
            photos: template.imageUrls?.map((url) => ({ url })),
            metadata: {
              kind: "template",
              templateId: template.id,
              keywords: template.keywords
            }
          };
        })
      : [];

    const suggestionPlans = this.enableLocalSuggestions
      ? buildLocalSuggestions(normalized, selectedTemplates, {
          enableLocalSuggestions: this.enableLocalSuggestions,
          maxSuggestions: this.maxSuggestions
        })
      : [];

    const merged = [...templatePlans, ...suggestionPlans];
    const deduped = Array.from(new Map(merged.map((plan) => [plan.id, plan])).values());
    const paged = deduped.slice(offset, offset + normalized.limit);
    const nextOffset = offset + paged.length;
    const nextCursor = nextOffset < deduped.length ? encodeCursor(nextOffset) : null;

    const validated = validatePlanArray(paged);

    return {
      plans: validated,
      nextCursor,
      source: this.name,
      debug: {
        tookMs: Date.now() - started,
        returned: validated.length
      }
    };
  }
}
