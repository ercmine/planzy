import { planId, type Plan } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import type { SearchPlansInputNormalized } from "../validation.js";
import type { CuratedTemplate } from "./curatedData.js";

export interface SuggestionOptions {
  enableLocalSuggestions: boolean;
  maxSuggestions: number;
}

const DEFAULT_OPTIONS: SuggestionOptions = {
  enableLocalSuggestions: true,
  maxSuggestions: 8
};

function mapsSearchLink(query: string, lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: "1",
    query,
    center: `${lat},${lng}`
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function chooseTemplates(input: SearchPlansInputNormalized, templates: CuratedTemplate[], max: number): CuratedTemplate[] {
  if (max <= 0 || templates.length === 0) {
    return [];
  }

  if (input.categories?.length) {
    const categories = new Set(input.categories);
    const matching = templates.filter((template) => categories.has(template.category));
    if (matching.length === 0) {
      return chooseTemplates({ ...input, categories: undefined }, templates, max);
    }
    if (matching.length >= max) {
      return matching.slice(0, max);
    }

    const remaining = templates.filter((template) => !categories.has(template.category));
    const fallbackLimit = Math.min(remaining.length, Math.floor(matching.length / 2));
    return [...matching, ...remaining.slice(0, fallbackLimit)].slice(0, max);
  }

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
    const next = queue?.shift();
    if (next) {
      selected.push(next);
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

export function buildLocalSuggestions(
  input: SearchPlansInputNormalized,
  templates: CuratedTemplate[],
  opts?: Partial<SuggestionOptions>
): Plan[] {
  const options: SuggestionOptions = {
    ...DEFAULT_OPTIONS,
    ...opts
  };

  if (!options.enableLocalSuggestions) {
    return [];
  }

  const selected = chooseTemplates(input, templates, options.maxSuggestions);

  return selected.map((template) => {
    const query = template.keywords[0] ?? template.title;
    const sourceId = `suggestion:${template.id}`;

    return validatePlan({
      id: planId("curated", sourceId),
      source: "curated",
      sourceId,
      title: `Find ${template.title} nearby`,
      description: "Search near you in Maps.",
      category: template.category,
      location: {
        lat: input.location.lat,
        lng: input.location.lng
      },
      deepLinks: {
        maps: mapsSearchLink(query, input.location.lat, input.location.lng)
      },
      metadata: {
        kind: "suggestion",
        templateId: template.id,
        keywords: template.keywords
      }
    });
  });
}
