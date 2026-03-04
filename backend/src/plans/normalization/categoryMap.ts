import type { Category } from "../plan.js";

const CATEGORY_KEYWORDS: Array<{ category: Category; keywords: string[] }> = [
  {
    category: "food",
    keywords: ["restaurant", "dining", "ramen", "pizza", "burger", "sushi", "steak", "bbq", "brunch"]
  },
  {
    category: "drinks",
    keywords: ["bar", "pub", "brewery", "cocktail", "wine", "lounge"]
  },
  {
    category: "coffee",
    keywords: ["coffee", "cafe", "espresso", "tea", "boba"]
  },
  {
    category: "outdoors",
    keywords: ["park", "trail", "hiking", "nature", "beach", "camping"]
  },
  {
    category: "movies",
    keywords: ["cinema", "movie", "theater", "film"]
  },
  {
    category: "music",
    keywords: ["concert", "live music", "venue", "jazz", "music club"]
  },
  {
    category: "sports",
    keywords: ["stadium", "arena", "bowling", "pickleball", "basketball", "soccer"]
  },
  {
    category: "wellness",
    keywords: ["gym", "yoga", "spa", "massage", "fitness"]
  },
  {
    category: "shopping",
    keywords: ["mall", "store", "boutique", "market"]
  }
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeCategoryInputs(input: { categories?: string[]; primary?: string | null }): string[] {
  const joined = [...(input.categories ?? []), input.primary ?? ""];
  return joined.flatMap((entry) => tokenize(entry));
}

/**
 * Priority is ordered from most broad / intentful to fallback categories.
 * This is intentionally deterministic for providers that emit many overlapping tags.
 */
export function mapProviderCategory(
  _provider: string,
  input: { categories?: string[]; primary?: string | null }
): Category {
  const tokens = new Set(normalizeCategoryInputs(input));
  if (tokens.size === 0) {
    return "other";
  }

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const matched = keywords.some((keyword) => {
      const keywordTokens = tokenize(keyword);
      return keywordTokens.every((token) => tokens.has(token));
    });
    if (matched) {
      return category;
    }
  }

  return "other";
}
