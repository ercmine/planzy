import type { GooglePlace } from "./googlePlaces.js";

export interface CategoryDefinition {
  id: string;
  title: string;
  semanticIntent: string;
  primaryTerms: string[];
  secondaryTerms: string[];
  excludedTerms: string[];
  preferredTypes: string[];
  fallbackTypes: string[];
  bannedTypes: string[];
  deboostTypes: string[];
  minConfidence: number;
}

export interface CategorySearchPlan {
  definition: CategoryDefinition;
  primaryTypes: string[];
  fallbackTypes: string[];
  queryTerms: string[];
}

export interface CategoryScore {
  score: number;
  keep: boolean;
  confidence: number;
  reasons: string[];
  rejectionReason?: string;
}

const DEFAULT_DEFINITION: CategoryDefinition = {
  id: "default",
  title: "Explore",
  semanticIntent: "General local recommendations",
  primaryTerms: ["popular places", "local spots"],
  secondaryTerms: ["nearby"],
  excludedTerms: [],
  preferredTypes: ["restaurant", "cafe", "tourist_attraction"],
  fallbackTypes: ["store", "park"],
  bannedTypes: ["apartment_building", "administrative_area_level_1", "country"],
  deboostTypes: ["lodging", "gas_station"],
  minConfidence: 20
};

const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  coffee: {
    id: "coffee",
    title: "Coffee",
    semanticIntent: "Coffee-forward spots for drinks, pastries, and work-friendly visits",
    primaryTerms: ["coffee", "cafe", "espresso", "roastery"],
    secondaryTerms: ["latte", "tea house", "bakery cafe"],
    excludedTerms: ["gas station", "hotel lobby"],
    preferredTypes: ["coffee_shop", "cafe", "bakery"],
    fallbackTypes: ["restaurant"],
    bannedTypes: ["lodging", "apartment_building"],
    deboostTypes: ["restaurant", "bar"],
    minConfidence: 24
  },
  food: {
    id: "food",
    title: "Food",
    semanticIntent: "Meal-oriented venues with clear dining relevance",
    primaryTerms: ["restaurant", "eatery", "bistro", "diner"],
    secondaryTerms: ["grill", "kitchen", "cuisine"],
    excludedTerms: ["hotel", "gas station"],
    preferredTypes: ["restaurant", "meal_takeaway", "meal_delivery"],
    fallbackTypes: ["cafe"],
    bannedTypes: ["apartment_building"],
    deboostTypes: ["lodging", "store"],
    minConfidence: 20
  },
  outdoors: {
    id: "outdoors",
    title: "Outdoors",
    semanticIntent: "Trails, parks, nature and scenic outdoor experiences",
    primaryTerms: ["hiking trail", "nature preserve", "state park", "scenic overlook"],
    secondaryTerms: ["trail", "nature", "park", "botanical"],
    excludedTerms: ["apartment", "office"],
    preferredTypes: ["hiking_area", "park", "national_park", "campground"],
    fallbackTypes: ["tourist_attraction"],
    bannedTypes: ["apartment_building", "lodging"],
    deboostTypes: ["restaurant", "store"],
    minConfidence: 24
  },
  nightlife: {
    id: "nightlife",
    title: "Nightlife",
    semanticIntent: "Evening social venues like bars, clubs and live music",
    primaryTerms: ["bar", "cocktail", "club", "live music", "lounge"],
    secondaryTerms: ["pub", "night"],
    excludedTerms: ["coffee", "brunch"],
    preferredTypes: ["bar", "night_club", "event_venue"],
    fallbackTypes: ["restaurant"],
    bannedTypes: ["apartment_building"],
    deboostTypes: ["coffee_shop", "cafe"],
    minConfidence: 24
  },
  family: {
    id: "family",
    title: "Family",
    semanticIntent: "Kid-friendly attractions and activity destinations",
    primaryTerms: ["zoo", "museum", "aquarium", "playground", "children"],
    secondaryTerms: ["science", "park", "family"],
    excludedTerms: ["night club"],
    preferredTypes: ["zoo", "aquarium", "museum", "playground", "amusement_park"],
    fallbackTypes: ["park", "tourist_attraction"],
    bannedTypes: ["night_club"],
    deboostTypes: ["bar", "lodging"],
    minConfidence: 22
  },
  date: {
    id: "date",
    title: "Date Spots",
    semanticIntent: "Romantic or experiential places suitable for dates",
    primaryTerms: ["romantic", "wine bar", "botanical garden", "art museum", "scenic"],
    secondaryTerms: ["cocktail", "view", "cozy"],
    excludedTerms: ["fast food"],
    preferredTypes: ["wine_bar", "restaurant", "art_gallery", "museum", "park"],
    fallbackTypes: ["tourist_attraction", "cafe"],
    bannedTypes: ["gas_station"],
    deboostTypes: ["meal_takeaway", "convenience_store"],
    minConfidence: 22
  },
  shopping: {
    id: "shopping",
    title: "Shopping",
    semanticIntent: "Retail-focused places for browsing and buying",
    primaryTerms: ["shopping", "retail", "boutique", "mall"],
    secondaryTerms: ["store", "market"],
    excludedTerms: ["office"],
    preferredTypes: ["shopping_mall", "store", "clothing_store", "book_store"],
    fallbackTypes: ["market"],
    bannedTypes: ["apartment_building"],
    deboostTypes: ["restaurant", "lodging"],
    minConfidence: 20
  },
  productivity: {
    id: "productivity",
    title: "Productivity",
    semanticIntent: "Work-friendly spots for focus and meetings",
    primaryTerms: ["coworking", "library", "cafe"],
    secondaryTerms: ["study", "workspace", "quiet"],
    excludedTerms: ["night club"],
    preferredTypes: ["library", "cafe", "coworking_space"],
    fallbackTypes: ["coffee_shop"],
    bannedTypes: ["night_club"],
    deboostTypes: ["bar"],
    minConfidence: 20
  },
  drinks: {
    id: "drinks",
    title: "Drinks",
    semanticIntent: "Beverage-centric places",
    primaryTerms: ["bar", "brewery", "taproom", "cocktail"],
    secondaryTerms: ["wine", "pub"],
    excludedTerms: ["gas station"],
    preferredTypes: ["bar", "brewery", "wine_bar", "liquor_store"],
    fallbackTypes: ["restaurant"],
    bannedTypes: ["apartment_building"],
    deboostTypes: ["coffee_shop"],
    minConfidence: 20
  }
};

const CATEGORY_ALIASES: Record<string, string> = {
  bar: "nightlife",
  fun: "family",
  park: "outdoors",
  hiking: "outdoors",
  museum: "family",
  date_spots: "date",
  date_spot: "date",
  date_spots_romantic: "date",
  work: "productivity"
};

function normalizeCategoryId(category?: string): string {
  const normalized = (category ?? "").trim().toLowerCase();
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function getCategoryDefinition(category?: string): CategoryDefinition {
  const normalized = normalizeCategoryId(category);
  return CATEGORY_DEFINITIONS[normalized] ?? DEFAULT_DEFINITION;
}

export function buildCategorySearchPlan(category?: string): CategorySearchPlan {
  const definition = getCategoryDefinition(category);
  return {
    definition,
    primaryTypes: definition.preferredTypes,
    fallbackTypes: definition.fallbackTypes,
    queryTerms: [...definition.primaryTerms, ...definition.secondaryTerms]
  };
}

function includesTerm(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

export function scorePlaceForCategory(place: GooglePlace, definition: CategoryDefinition, originWeight = 0): CategoryScore {
  const typeSet = new Set((place.types ?? []).map((type) => type.toLowerCase()));
  const primaryType = (place.primaryType ?? "").toLowerCase();
  const name = (place.displayName?.text ?? "").toLowerCase();

  for (const bannedType of definition.bannedTypes) {
    if (typeSet.has(bannedType) || primaryType === bannedType) {
      return {
        score: -100,
        keep: false,
        confidence: 0,
        reasons: ["banned_type"],
        rejectionReason: `banned_type:${bannedType}`
      };
    }
  }

  const excludedMatches = includesTerm(name, definition.excludedTerms);
  if (excludedMatches.length > 0) {
    return {
      score: -80,
      keep: false,
      confidence: 0,
      reasons: ["excluded_term"],
      rejectionReason: `excluded_term:${excludedMatches[0]}`
    };
  }

  let score = originWeight;
  const reasons: string[] = [];

  if (definition.preferredTypes.includes(primaryType)) {
    score += 30;
    reasons.push(`preferred_primary_type:${primaryType}`);
  }

  const preferredTypeMatches = definition.preferredTypes.filter((type) => typeSet.has(type));
  if (preferredTypeMatches.length > 0) {
    score += 20;
    reasons.push(`preferred_type:${preferredTypeMatches[0]}`);
  }

  const deboostMatches = definition.deboostTypes.filter((type) => typeSet.has(type) || primaryType === type);
  if (deboostMatches.length > 0) {
    score -= 14;
    reasons.push(`deboost_type:${deboostMatches[0]}`);
  }

  const primaryTermMatches = includesTerm(name, definition.primaryTerms);
  if (primaryTermMatches.length > 0) {
    score += 18;
    reasons.push(`primary_term:${primaryTermMatches[0]}`);
  }

  const secondaryTermMatches = includesTerm(name, definition.secondaryTerms);
  if (secondaryTermMatches.length > 0) {
    score += 9;
    reasons.push(`secondary_term:${secondaryTermMatches[0]}`);
  }

  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;
  score += Math.min(10, rating * 2);
  score += Math.min(10, Math.log10(reviewCount + 1) * 4);

  if ((place.photos ?? []).length > 0) {
    score += 2;
    reasons.push("has_photo");
  }

  const hasStrongTypeMatch = preferredTypeMatches.length > 0 || definition.preferredTypes.includes(primaryType);
  const confidence = Math.round(score);
  const keep = confidence >= definition.minConfidence && (hasStrongTypeMatch || confidence >= definition.minConfidence + 10);

  return {
    score,
    confidence,
    keep,
    reasons,
    rejectionReason: keep ? undefined : "low_confidence_or_type_mismatch"
  };
}

export interface CategoryFilterResult {
  kept: GooglePlace[];
  rejected: Array<{ place: GooglePlace; reason: string }>;
  scoreMap: Map<string, CategoryScore>;
}

export function rankAndFilterCategoryResults(
  places: GooglePlace[],
  definition: CategoryDefinition,
  opts?: { sourcePriority?: Map<string, number> }
): CategoryFilterResult {
  const scored = places.map((place) => {
    const priority = opts?.sourcePriority?.get(place.id) ?? 0;
    const score = scorePlaceForCategory(place, definition, priority);
    return { place, score };
  });

  const kept = scored
    .filter((entry) => entry.score.keep)
    .sort((left, right) => right.score.score - left.score.score)
    .map((entry) => entry.place);

  const rejected = scored
    .filter((entry) => !entry.score.keep)
    .map((entry) => ({
      place: entry.place,
      reason: entry.score.rejectionReason ?? "rejected"
    }));

  const scoreMap = new Map<string, CategoryScore>();
  for (const entry of scored) {
    scoreMap.set(entry.place.id, entry.score);
  }

  return { kept, rejected, scoreMap };
}
