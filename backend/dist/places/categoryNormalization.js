const CATEGORY_RULES = [
    { pattern: /(coffee|cafe|espresso)/i, category: "food_drink", subcategory: "coffee_shop", tags: ["coffee"] },
    { pattern: /(museum|gallery|art)/i, category: "arts_culture", subcategory: "museum" },
    { pattern: /(night|cocktail|lounge|club|bar)/i, category: "nightlife", subcategory: "bar_lounge", tags: ["date_night"] },
    { pattern: /(hike|trail|park|outdoor)/i, category: "outdoors", subcategory: "park_trail", tags: ["outdoor"] },
    { pattern: /(restaurant|food|diner|bistro)/i, category: "food_drink", subcategory: "restaurant" }
];
export function resolveCanonicalCategory(providerCategories, placeName) {
    const haystack = `${providerCategories.join(" ")} ${placeName}`;
    for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(haystack)) {
            return {
                canonicalCategory: rule.category,
                canonicalSubcategory: rule.subcategory,
                tags: rule.tags ?? [],
                confidence: 0.85,
                reasoning: `matched:${rule.pattern.source}`
            };
        }
    }
    return {
        canonicalCategory: "other",
        tags: providerCategories.slice(0, 4).map((entry) => entry.toLowerCase()),
        confidence: 0.4,
        reasoning: "fallback"
    };
}
