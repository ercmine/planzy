export const CATEGORY_NORMALIZATION_VERSION = "v1";
export const DRYAD_CATEGORIES = [
    { id: "cat_coffee", slug: "coffee", displayName: "Coffee", parentCategoryId: "cat_food", status: "ACTIVE" },
    { id: "cat_restaurants", slug: "restaurants", displayName: "Restaurants", parentCategoryId: "cat_food", status: "ACTIVE" },
    { id: "cat_bars", slug: "bars", displayName: "Bars", parentCategoryId: "cat_nightlife", status: "ACTIVE" },
    { id: "cat_nightlife", slug: "nightlife", displayName: "Nightlife", status: "ACTIVE" },
    { id: "cat_parks", slug: "parks", displayName: "Parks", parentCategoryId: "cat_outdoors", status: "ACTIVE" },
    { id: "cat_museums", slug: "museums", displayName: "Museums", parentCategoryId: "cat_arts", status: "ACTIVE" },
    { id: "cat_bookstores", slug: "bookstores", displayName: "Bookstores", parentCategoryId: "cat_shopping", status: "ACTIVE" },
    { id: "cat_pizza", slug: "pizza", displayName: "Pizza", parentCategoryId: "cat_restaurants", status: "ACTIVE" },
    { id: "cat_asian_food", slug: "asian-food", displayName: "Asian Food", parentCategoryId: "cat_restaurants", status: "ACTIVE" },
    { id: "cat_mexican_food", slug: "mexican-food", displayName: "Mexican Food", parentCategoryId: "cat_restaurants", status: "ACTIVE" },
    { id: "cat_breakfast", slug: "breakfast", displayName: "Breakfast", parentCategoryId: "cat_restaurants", status: "ACTIVE" },
    { id: "cat_hotels", slug: "hotels", displayName: "Hotels", status: "ACTIVE" },
    { id: "cat_landmarks", slug: "landmarks", displayName: "Landmarks", status: "ACTIVE" },
    { id: "cat_outdoors", slug: "outdoors", displayName: "Outdoors", status: "ACTIVE" },
    { id: "cat_arts", slug: "arts", displayName: "Arts", status: "ACTIVE" },
    { id: "cat_shopping", slug: "shopping", displayName: "Shopping", status: "ACTIVE" },
    { id: "cat_food", slug: "food", displayName: "Food", status: "ACTIVE" }
];
export const OSM_CATEGORY_RULES = [
    { id: "osm_amenity_cafe", sourceName: "osm", sourceKey: "amenity", sourceValue: "cafe", categoryId: "cat_coffee", confidence: 0.95, priority: 30, status: "ACTIVE" },
    { id: "osm_tourism_museum", sourceName: "osm", sourceKey: "tourism", sourceValue: "museum", categoryId: "cat_museums", confidence: 0.96, priority: 40, status: "ACTIVE" },
    { id: "osm_leisure_park", sourceName: "osm", sourceKey: "leisure", sourceValue: "park", categoryId: "cat_parks", confidence: 0.94, priority: 40, status: "ACTIVE" },
    { id: "osm_shop_books", sourceName: "osm", sourceKey: "shop", sourceValue: "books", categoryId: "cat_bookstores", confidence: 0.94, priority: 40, status: "ACTIVE" },
    { id: "osm_amenity_bar", sourceName: "osm", sourceKey: "amenity", sourceValue: "bar", categoryId: "cat_bars", confidence: 0.93, priority: 40, status: "ACTIVE" },
    { id: "osm_amenity_restaurant", sourceName: "osm", sourceKey: "amenity", sourceValue: "restaurant", categoryId: "cat_restaurants", confidence: 0.8, priority: 10, status: "ACTIVE" },
    { id: "osm_tourism_hotel", sourceName: "osm", sourceKey: "tourism", sourceValue: "hotel", categoryId: "cat_hotels", confidence: 0.88, priority: 25, status: "ACTIVE" },
    { id: "osm_historic_landmark", sourceName: "osm", sourceKey: "historic", categoryId: "cat_landmarks", confidence: 0.75, priority: 10, status: "ACTIVE" }
];
const CUISINE_REFINEMENTS = [
    { token: "pizza", categoryId: "cat_pizza", confidence: 0.93, priority: 60 },
    { token: "sushi", categoryId: "cat_asian_food", confidence: 0.9, priority: 55 },
    { token: "ramen", categoryId: "cat_asian_food", confidence: 0.89, priority: 54 },
    { token: "mexican", categoryId: "cat_mexican_food", confidence: 0.9, priority: 55 },
    { token: "breakfast", categoryId: "cat_breakfast", confidence: 0.88, priority: 53 }
];
function parseTagList(raw) {
    if (!raw)
        return [];
    return raw.split(/[;,]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}
export class OsmCategoryNormalizationEngine {
    rules;
    constructor(rules) {
        this.rules = rules;
    }
    normalize(tags) {
        const directMatches = this.rules
            .filter((rule) => {
            const value = tags[rule.sourceKey];
            if (!value)
                return false;
            return rule.sourceValue ? value.toLowerCase() === rule.sourceValue.toLowerCase() : true;
        })
            .map((rule) => ({ categoryId: rule.categoryId, confidence: rule.confidence, ruleId: rule.id, priority: rule.priority, reason: `${rule.sourceKey}${rule.sourceValue ? `=${rule.sourceValue}` : " present"}` }));
        const cuisine = parseTagList(tags.cuisine);
        const cuisineMatches = CUISINE_REFINEMENTS
            .filter((candidate) => cuisine.some((token) => token.includes(candidate.token)))
            .map((candidate) => ({ categoryId: candidate.categoryId, confidence: candidate.confidence, ruleId: `cuisine_${candidate.token}`, priority: candidate.priority, reason: `cuisine contains ${candidate.token}` }));
        const scored = [...directMatches, ...cuisineMatches]
            .sort((a, b) => (b.priority - a.priority) || (b.confidence - a.confidence) || a.categoryId.localeCompare(b.categoryId));
        const deduped = [];
        const seen = new Set();
        for (const match of scored) {
            if (seen.has(match.categoryId))
                continue;
            deduped.push(match);
            seen.add(match.categoryId);
        }
        return {
            primaryCategoryId: deduped[0]?.categoryId,
            secondaryCategoryIds: deduped.slice(1).map((item) => item.categoryId),
            matches: deduped,
            unmapped: deduped.length === 0,
            version: CATEGORY_NORMALIZATION_VERSION
        };
    }
}
