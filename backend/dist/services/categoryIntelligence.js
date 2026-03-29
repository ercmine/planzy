const FIT_THRESHOLDS = {
    strict: {
        exact_match: 0.9,
        strong_match: 0.76,
        decent_match: 0.62,
        weak_match: 0.38,
        mismatch: 0
    },
    balanced: {
        exact_match: 0.88,
        strong_match: 0.72,
        decent_match: 0.56,
        weak_match: 0.4,
        mismatch: 0
    },
    broad: {
        exact_match: 0.84,
        strong_match: 0.66,
        decent_match: 0.48,
        weak_match: 0.32,
        mismatch: 0
    }
};
const CATEGORY_DEFINITIONS = [
    {
        id: "food-drink",
        title: "Food & Drink",
        semanticIntent: "Food and beverage destinations",
        aliases: ["food", "restaurants", "dining"],
        synonyms: ["eatery", "meal"],
        primaryTerms: ["restaurant", "dining"],
        secondaryTerms: ["kitchen", "eatery"],
        phraseTerms: ["food and drink"],
        negativeTerms: ["office", "apartment"],
        providerHints: { google: ["restaurant", "cafe", "bar"], foursquare: ["Restaurant", "Food"] },
        strictness: "broad",
        minConfidence: 0.45
    },
    {
        id: "coffee-shops",
        title: "Coffee Shops",
        semanticIntent: "Coffee-forward cafes and espresso bars",
        parentId: "food-drink",
        aliases: ["coffee", "cafes", "coffee spots"],
        synonyms: ["espresso", "latte", "roastery", "coffeehouse"],
        primaryTerms: ["coffee", "espresso", "roastery"],
        secondaryTerms: ["latte", "cafe", "tea house"],
        phraseTerms: ["coffee shop", "espresso bar"],
        negativeTerms: ["gas station", "hotel lobby", "office"],
        providerHints: { google: ["cafe", "coffee_shop"], foursquare: ["Coffee Shop", "Café"] },
        strictness: "strict",
        minConfidence: 0.4
    },
    {
        id: "brunch",
        title: "Brunch",
        semanticIntent: "Breakfast and late-morning meal destinations",
        parentId: "food-drink",
        aliases: ["brunch spots", "breakfast"],
        synonyms: ["mimosa", "eggs benedict"],
        primaryTerms: ["brunch", "breakfast"],
        secondaryTerms: ["mimosa", "pancake", "omelet"],
        phraseTerms: ["all day brunch", "breakfast spot"],
        negativeTerms: ["late night", "night club"],
        providerHints: { google: ["breakfast_restaurant"], foursquare: ["Breakfast Spot", "Brunch Spot"] },
        strictness: "strict",
        minConfidence: 0.58
    },
    {
        id: "fine-dining",
        title: "Fine Dining",
        semanticIntent: "Upscale dining experiences",
        parentId: "food-drink",
        aliases: ["upscale dining"],
        synonyms: ["tasting menu", "chef"],
        primaryTerms: ["fine dining", "tasting menu"],
        secondaryTerms: ["chef", "upscale"],
        phraseTerms: ["prix fixe"],
        negativeTerms: ["fast food", "quick bite"],
        providerHints: { google: ["restaurant"], foursquare: ["French Restaurant", "Steakhouse"] },
        strictness: "strict",
        minConfidence: 0.63
    },
    {
        id: "desserts",
        title: "Desserts",
        semanticIntent: "Dessert-oriented venues",
        parentId: "food-drink",
        aliases: ["dessert", "sweets"],
        synonyms: ["ice cream", "patisserie"],
        primaryTerms: ["dessert", "ice cream", "bakery"],
        secondaryTerms: ["gelato", "patisserie", "chocolate"],
        phraseTerms: ["dessert shop"],
        negativeTerms: ["savory", "steakhouse"],
        providerHints: { google: ["bakery", "ice_cream_shop"], foursquare: ["Dessert Shop", "Ice Cream Parlor"] },
        strictness: "balanced",
        minConfidence: 0.55
    },
    {
        id: "nightlife",
        title: "Nightlife",
        semanticIntent: "Evening social venues",
        aliases: ["night life"],
        synonyms: ["bar", "club", "lounge"],
        primaryTerms: ["nightlife", "cocktail", "club"],
        secondaryTerms: ["bar", "lounge", "live music"],
        phraseTerms: ["night club", "cocktail bar"],
        negativeTerms: ["family", "playground", "coffee"],
        providerHints: { google: ["bar", "night_club"], foursquare: ["Bar", "Nightclub"] },
        strictness: "balanced",
        minConfidence: 0.56
    },
    {
        id: "bars",
        title: "Bars",
        semanticIntent: "Bar-forward drinking venues",
        parentId: "nightlife",
        aliases: ["pubs"],
        synonyms: ["taproom", "cocktail"],
        primaryTerms: ["bar", "pub", "cocktail"],
        secondaryTerms: ["taproom", "brew"],
        phraseTerms: ["wine bar", "sports bar"],
        negativeTerms: ["coffee", "breakfast"],
        providerHints: { google: ["bar"], foursquare: ["Bar", "Cocktail Bar"] },
        strictness: "strict",
        minConfidence: 0.6
    },
    {
        id: "clubs",
        title: "Clubs",
        semanticIntent: "Dance-focused nightlife venues",
        parentId: "nightlife",
        aliases: ["night clubs"],
        synonyms: ["dance floor", "dj"],
        primaryTerms: ["club", "nightclub", "dj"],
        secondaryTerms: ["dance", "bottle service"],
        phraseTerms: ["night club"],
        negativeTerms: ["hotel bar", "coffee"],
        providerHints: { google: ["night_club"], foursquare: ["Nightclub", "Dance Club"] },
        strictness: "strict",
        minConfidence: 0.62
    },
    {
        id: "arts-culture",
        title: "Arts & Culture",
        semanticIntent: "Creative and cultural experiences",
        aliases: ["culture", "arts"],
        synonyms: ["museum", "gallery", "theater"],
        primaryTerms: ["museum", "gallery", "theater"],
        secondaryTerms: ["exhibit", "cultural"],
        phraseTerms: ["art museum"],
        negativeTerms: ["strip mall", "convenience"],
        providerHints: { google: ["museum", "art_gallery"], foursquare: ["Museum", "Art Gallery"] },
        strictness: "balanced",
        minConfidence: 0.5
    },
    {
        id: "museums",
        title: "Museums",
        semanticIntent: "Museum destinations",
        parentId: "arts-culture",
        aliases: ["museum"],
        synonyms: ["exhibition", "curated"],
        primaryTerms: ["museum", "exhibit"],
        secondaryTerms: ["curated", "art"],
        phraseTerms: ["science museum", "history museum"],
        negativeTerms: ["tourist attraction", "souvenir"],
        providerHints: { google: ["museum"], foursquare: ["Museum"] },
        strictness: "strict",
        minConfidence: 0.62
    },
    {
        id: "outdoors",
        title: "Outdoors",
        semanticIntent: "Outdoor destinations and activities",
        aliases: ["outdoor activities"],
        synonyms: ["park", "hiking", "beaches"],
        primaryTerms: ["park", "trail", "outdoor"],
        secondaryTerms: ["hiking", "beach", "nature"],
        phraseTerms: ["outdoor activity"],
        negativeTerms: ["indoor mall"],
        providerHints: { google: ["park", "hiking_area"], foursquare: ["Park", "Trail"] },
        strictness: "balanced",
        minConfidence: 0.5
    },
    {
        id: "dog-parks",
        title: "Dog Parks",
        semanticIntent: "Off-leash canine parks",
        parentId: "outdoors",
        aliases: ["dog park"],
        synonyms: ["off leash", "canine run"],
        primaryTerms: ["dog park", "off leash"],
        secondaryTerms: ["canine", "dog run"],
        phraseTerms: ["off leash area"],
        negativeTerms: ["pet store", "dog grooming"],
        providerHints: { google: ["dog_park"], foursquare: ["Dog Run", "Dog Park"] },
        strictness: "strict",
        minConfidence: 0.65
    }
];
const DEFAULT_DEFINITION = CATEGORY_DEFINITIONS.find((entry) => entry.id === "food-drink") ?? CATEGORY_DEFINITIONS[0];
const CATEGORY_INDEX = new Map(CATEGORY_DEFINITIONS.map((entry) => [entry.id, entry]));
const CATEGORY_ALIASES = new Map();
for (const definition of CATEGORY_DEFINITIONS) {
    CATEGORY_ALIASES.set(definition.id, definition.id);
    for (const alias of [...definition.aliases, ...definition.synonyms]) {
        CATEGORY_ALIASES.set(normalizeToken(alias), definition.id);
    }
}
CATEGORY_ALIASES.set("coffee", "coffee-shops");
CATEGORY_ALIASES.set("dessert", "desserts");
CATEGORY_ALIASES.set("bars near me", "bars");
CATEGORY_ALIASES.set("hiking", "outdoors");
CATEGORY_ALIASES.set("museum", "museums");
const PROVIDER_TYPE_MAPPINGS = {
    google: {
        cafe: [{ categoryId: "coffee-shops", weight: 0.9 }],
        coffee_shop: [{ categoryId: "coffee-shops", weight: 0.96 }],
        bakery: [{ categoryId: "desserts", weight: 0.74 }, { categoryId: "coffee-shops", weight: 0.45 }],
        restaurant: [{ categoryId: "food-drink", weight: 0.52 }, { categoryId: "brunch", weight: 0.2 }],
        breakfast_restaurant: [{ categoryId: "brunch", weight: 0.82 }],
        bar: [{ categoryId: "bars", weight: 0.88 }, { categoryId: "nightlife", weight: 0.68 }],
        night_club: [{ categoryId: "clubs", weight: 0.9 }, { categoryId: "nightlife", weight: 0.84 }],
        museum: [{ categoryId: "museums", weight: 0.92 }, { categoryId: "arts-culture", weight: 0.74 }],
        tourist_attraction: [{ categoryId: "arts-culture", weight: 0.33 }, { categoryId: "museums", weight: 0.12 }],
        park: [{ categoryId: "outdoors", weight: 0.7 }, { categoryId: "dog-parks", weight: 0.18 }],
        dog_park: [{ categoryId: "dog-parks", weight: 0.97 }, { categoryId: "outdoors", weight: 0.52 }],
        hiking_area: [{ categoryId: "outdoors", weight: 0.91 }]
    },
    foursquare: {
        "Coffee Shop": [{ categoryId: "coffee-shops", weight: 0.97 }],
        "Café": [{ categoryId: "coffee-shops", weight: 0.86 }],
        "Breakfast Spot": [{ categoryId: "brunch", weight: 0.78 }],
        Restaurant: [{ categoryId: "food-drink", weight: 0.56 }],
        Bar: [{ categoryId: "bars", weight: 0.86 }, { categoryId: "nightlife", weight: 0.7 }],
        Nightclub: [{ categoryId: "clubs", weight: 0.92 }, { categoryId: "nightlife", weight: 0.86 }],
        Museum: [{ categoryId: "museums", weight: 0.9 }, { categoryId: "arts-culture", weight: 0.72 }],
        "Tourist Attraction": [{ categoryId: "arts-culture", weight: 0.34 }, { categoryId: "museums", weight: 0.12 }],
        Park: [{ categoryId: "outdoors", weight: 0.66 }],
        "Dog Park": [{ categoryId: "dog-parks", weight: 0.96 }, { categoryId: "outdoors", weight: 0.7 }]
    },
    unknown: {}
};
function normalizeToken(value) {
    return value.trim().toLowerCase();
}
function normalizeCategoryId(category) {
    const normalized = normalizeToken(category ?? "");
    return CATEGORY_ALIASES.get(normalized) ?? normalized;
}
function toSearchText(evidence) {
    return [
        evidence.name,
        evidence.description,
        ...(evidence.tags ?? []),
        ...(evidence.features ?? []),
        ...(evidence.menuTerms ?? []),
        evidence.website
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}
function fitFromConfidence(confidence, strictness) {
    const thresholds = FIT_THRESHOLDS[strictness];
    if (confidence >= thresholds.exact_match) {
        return "exact_match";
    }
    if (confidence >= thresholds.strong_match) {
        return "strong_match";
    }
    if (confidence >= thresholds.decent_match) {
        return "decent_match";
    }
    if (confidence >= thresholds.weak_match) {
        return "weak_match";
    }
    return "mismatch";
}
function addContribution(target, categoryId, contribution, bucket) {
    const existing = target.get(categoryId) ??
        {
            contributions: [],
            bonuses: [],
            penalties: [],
            finalScore: 0
        };
    existing[bucket].push(contribution);
    target.set(categoryId, existing);
}
function scoreProviderMappings(evidenceList, scores, breakdown) {
    for (const evidence of evidenceList) {
        const mappings = PROVIDER_TYPE_MAPPINGS[evidence.provider] ?? {};
        const allTypes = [evidence.primaryType, ...(evidence.types ?? []), ...(evidence.subcategories ?? [])]
            .filter(Boolean)
            .map((entry) => entry);
        for (const rawType of allTypes) {
            const mapped = mappings[rawType];
            if (!mapped) {
                continue;
            }
            for (const candidate of mapped) {
                const next = (scores.get(candidate.categoryId) ?? 0) + candidate.weight;
                scores.set(candidate.categoryId, next);
                addContribution(breakdown, candidate.categoryId, { source: `${evidence.provider}:taxonomy`, value: rawType, delta: candidate.weight }, "contributions");
            }
        }
    }
}
function scoreKeywordSignals(evidenceList, scores, breakdown) {
    const texts = evidenceList.map(toSearchText);
    for (const definition of CATEGORY_DEFINITIONS) {
        let keywordScore = 0;
        for (const text of texts) {
            for (const term of definition.primaryTerms) {
                if (text.includes(term)) {
                    keywordScore += 0.34;
                    addContribution(breakdown, definition.id, { source: "keyword:primary", value: term, delta: 0.34 }, "contributions");
                }
            }
            for (const term of definition.secondaryTerms) {
                if (text.includes(term)) {
                    keywordScore += 0.18;
                    addContribution(breakdown, definition.id, { source: "keyword:secondary", value: term, delta: 0.18 }, "contributions");
                }
            }
            for (const term of definition.phraseTerms) {
                if (text.includes(term)) {
                    keywordScore += 0.28;
                    addContribution(breakdown, definition.id, { source: "keyword:phrase", value: term, delta: 0.28 }, "bonuses");
                }
            }
            for (const term of definition.negativeTerms) {
                if (text.includes(term)) {
                    keywordScore -= 0.35;
                    addContribution(breakdown, definition.id, { source: "keyword:negative", value: term, delta: -0.35 }, "penalties");
                }
            }
        }
        if (keywordScore !== 0) {
            scores.set(definition.id, (scores.get(definition.id) ?? 0) + keywordScore);
        }
    }
}
function applySpecificityAndAgreement(evidenceList, scores, breakdown) {
    const providerCount = new Set(evidenceList.map((entry) => entry.provider)).size;
    for (const definition of CATEGORY_DEFINITIONS) {
        const base = scores.get(definition.id) ?? 0;
        if (base <= 0) {
            continue;
        }
        if (providerCount > 1) {
            const bonus = 0.18;
            scores.set(definition.id, base + bonus);
            addContribution(breakdown, definition.id, { source: "agreement:multi_provider", value: String(providerCount), delta: bonus }, "bonuses");
        }
        if (definition.parentId && base > 0.6) {
            const specificityBonus = 0.16;
            scores.set(definition.id, (scores.get(definition.id) ?? 0) + specificityBonus);
            addContribution(breakdown, definition.id, { source: "specificity", value: definition.parentId, delta: specificityBonus }, "bonuses");
            scores.set(definition.parentId, Math.max(scores.get(definition.parentId) ?? 0, base * 0.62));
        }
        if (definition.id === "food-drink" && base > 0.8) {
            scores.set(definition.id, base - 0.12);
            addContribution(breakdown, definition.id, { source: "penalty:generic", value: "generic_category", delta: -0.12 }, "penalties");
        }
    }
    for (const definition of CATEGORY_DEFINITIONS) {
        if (!definition.parentId) {
            continue;
        }
        const childScore = scores.get(definition.id) ?? 0;
        const parentScore = scores.get(definition.parentId) ?? 0;
        if (childScore > 0.65 && parentScore >= childScore * 0.9) {
            const dampen = 0.14;
            scores.set(definition.parentId, parentScore - dampen);
            addContribution(breakdown, definition.parentId, { source: "penalty:parent_competition", value: definition.id, delta: -dampen }, "penalties");
        }
    }
}
function applyManualOverrides(override, scores, breakdown, flags) {
    if (!override) {
        return;
    }
    for (const excluded of override.hardExcludeCategoryIds ?? []) {
        scores.set(excluded, -1);
        const entry = breakdown.get(excluded) ?? { contributions: [], bonuses: [], penalties: [], finalScore: 0 };
        entry.overrideApplied = "hard_exclude";
        breakdown.set(excluded, entry);
        flags.push(`hard_exclude:${excluded}`);
    }
    if (override.hardPrimaryCategoryId) {
        scores.set(override.hardPrimaryCategoryId, 1.05);
        const entry = breakdown.get(override.hardPrimaryCategoryId) ?? { contributions: [], bonuses: [], penalties: [], finalScore: 0 };
        entry.overrideApplied = "hard_primary";
        breakdown.set(override.hardPrimaryCategoryId, entry);
        flags.push(`hard_primary:${override.hardPrimaryCategoryId}`);
    }
    for (const suppressed of override.suppressedCategoryIds ?? []) {
        scores.set(suppressed, -1);
        flags.push(`suppressed:${suppressed}`);
    }
    for (const removed of override.removeCategoryIds ?? []) {
        scores.set(removed, Math.min(scores.get(removed) ?? 0, 0.05));
        flags.push(`remove_secondary:${removed}`);
    }
    for (const added of override.addSecondaryCategoryIds ?? []) {
        scores.set(added, Math.max(scores.get(added) ?? 0, 0.7));
        flags.push(`add_secondary:${added}`);
    }
    for (const [categoryId, adjustment] of Object.entries(override.categoryAdjustments ?? {})) {
        scores.set(categoryId, (scores.get(categoryId) ?? 0) + adjustment);
        flags.push(`adjust:${categoryId}:${adjustment}`);
    }
}
export function classifyPlaceCategories(evidenceList, override) {
    const scores = new Map();
    const breakdown = new Map();
    const flags = [];
    scoreProviderMappings(evidenceList, scores, breakdown);
    scoreKeywordSignals(evidenceList, scores, breakdown);
    applySpecificityAndAgreement(evidenceList, scores, breakdown);
    applyManualOverrides(override, scores, breakdown, flags);
    const candidates = CATEGORY_DEFINITIONS.map((definition) => {
        const rawScore = scores.get(definition.id) ?? 0;
        const clamped = Math.max(0, Math.min(1, rawScore));
        const fit = fitFromConfidence(clamped, definition.strictness);
        const categoryBreakdown = breakdown.get(definition.id) ?? {
            contributions: [],
            bonuses: [],
            penalties: [],
            finalScore: clamped
        };
        categoryBreakdown.finalScore = clamped;
        return {
            categoryId: definition.id,
            score: rawScore,
            confidence: clamped,
            fit,
            evidence: categoryBreakdown
        };
    }).sort((left, right) => right.confidence - left.confidence);
    const primary = candidates
        .filter((entry) => entry.fit !== "mismatch")
        .sort((left, right) => {
        const leftDef = CATEGORY_INDEX.get(left.categoryId);
        const rightDef = CATEGORY_INDEX.get(right.categoryId);
        const leftSpecificity = leftDef?.parentId ? 0.03 : 0;
        const rightSpecificity = rightDef?.parentId ? 0.03 : 0;
        return right.confidence + rightSpecificity - (left.confidence + leftSpecificity);
    })[0];
    const secondaries = candidates
        .filter((entry) => entry.fit === "strong_match" || entry.fit === "decent_match")
        .slice(1, 5)
        .map((entry) => entry.categoryId);
    const weak = candidates.filter((entry) => entry.fit === "weak_match").map((entry) => entry.categoryId);
    const categoryScores = {};
    const fitByCategory = {};
    const evidenceByCategory = {};
    for (const candidate of candidates) {
        categoryScores[candidate.categoryId] = Number(candidate.confidence.toFixed(3));
        fitByCategory[candidate.categoryId] = candidate.fit;
        evidenceByCategory[candidate.categoryId] = candidate.evidence;
    }
    return {
        primaryCategoryId: primary?.categoryId,
        secondaryCategoryIds: secondaries,
        categoryScores,
        fitByCategory,
        evidenceByCategory,
        weakCategoryIds: weak,
        lastComputedAt: new Date().toISOString(),
        overrideFlags: flags,
        provenance: evidenceList.map((entry) => `${entry.provider}:${entry.placeId}`)
    };
}
export function resolveCategoryAlias(category) {
    const normalized = normalizeCategoryId(category);
    return CATEGORY_INDEX.has(normalized) ? normalized : DEFAULT_DEFINITION.id;
}
export function getCategoryDefinition(category) {
    return CATEGORY_INDEX.get(resolveCategoryAlias(category)) ?? DEFAULT_DEFINITION;
}
export function buildCategorySearchPlan(category) {
    const definition = getCategoryDefinition(category);
    const googleHints = definition.providerHints.google ?? [];
    const primaryTypes = googleHints.filter((hint) => {
        const mapped = PROVIDER_TYPE_MAPPINGS.google[hint];
        return (mapped ?? []).some((entry) => entry.categoryId === definition.id && entry.weight >= 0.75);
    });
    const fallbackTypes = googleHints.filter((hint) => !primaryTypes.includes(hint));
    return {
        definition,
        primaryTypes: primaryTypes.length > 0 ? primaryTypes : googleHints,
        fallbackTypes,
        queryTerms: [...definition.primaryTerms, ...definition.secondaryTerms, ...definition.phraseTerms]
    };
}
function googlePlaceToEvidence(place) {
    return {
        provider: "google",
        placeId: place.id,
        primaryType: place.primaryType,
        types: place.types,
        name: place.displayName?.text,
        description: undefined,
        website: place.websiteUri
    };
}
export function scorePlaceForCategory(place, definition, originWeight = 0) {
    const profile = classifyPlaceCategories([googlePlaceToEvidence(place)]);
    const baseConfidence = Math.max(0, Math.min(1, (profile.categoryScores[definition.id] ?? 0) + originWeight / 100));
    const fitLabel = fitFromConfidence(baseConfidence, definition.strictness);
    const keep = fitLabel !== "mismatch" && baseConfidence >= definition.minConfidence;
    const score = Number((baseConfidence * 100).toFixed(2));
    const reasons = (profile.evidenceByCategory[definition.id]?.contributions ?? []).map((entry) => `${entry.source}:${entry.value}`);
    const rejectionReason = keep ? undefined : "low_confidence_or_mismatch";
    return {
        score,
        keep,
        confidence: Number((baseConfidence * 100).toFixed(1)),
        fitLabel,
        reasons,
        rejectionReason,
        evidence: profile.evidenceByCategory[definition.id]
    };
}
function rankScore(categoryScore, place, originWeight) {
    const quality = (place.rating ?? 0) * 0.09 + Math.log10((place.userRatingCount ?? 0) + 1) * 0.1;
    const completeness = place.photos && place.photos.length > 0 ? 0.03 : 0;
    const fitDominant = categoryScore.confidence / 100;
    return fitDominant * 3.8 + quality + completeness + originWeight / 120;
}
export function rankAndFilterCategoryResults(places, definition, opts) {
    const strictness = opts?.strictness ?? definition.strictness;
    const scoreEntries = places.map((place) => {
        const originWeight = opts?.sourcePriority?.get(place.id) ?? 0;
        const override = opts?.placeOverrides?.get(place.id);
        const profile = classifyPlaceCategories([googlePlaceToEvidence(place)], override);
        const confidence = Math.max(0, Math.min(1, (profile.categoryScores[definition.id] ?? 0) + originWeight / 100));
        const fitLabel = fitFromConfidence(confidence, strictness);
        const keepThreshold = definition.minConfidence + (strictness === "strict" ? 0 : strictness === "balanced" ? -0.04 : -0.12);
        const keep = fitLabel !== "mismatch" && confidence >= keepThreshold;
        const score = {
            score: Number((rankScore({
                score: confidence * 100,
                keep,
                confidence: confidence * 100,
                reasons: [],
                fitLabel,
                evidence: profile.evidenceByCategory[definition.id]
            }, place, originWeight) * 100).toFixed(2)),
            keep,
            confidence: Number((confidence * 100).toFixed(2)),
            reasons: (profile.evidenceByCategory[definition.id]?.contributions ?? []).map((entry) => `${entry.source}:${entry.value}`),
            fitLabel,
            rejectionReason: keep ? undefined : `fit:${fitLabel}`,
            evidence: profile.evidenceByCategory[definition.id]
        };
        return { place, score };
    });
    const kept = scoreEntries
        .filter((entry) => entry.score.keep)
        .sort((left, right) => right.score.score - left.score.score)
        .map((entry) => entry.place);
    const rejected = scoreEntries
        .filter((entry) => !entry.score.keep)
        .map((entry) => ({ place: entry.place, reason: entry.score.rejectionReason ?? "rejected" }));
    const scoreMap = new Map();
    for (const entry of scoreEntries) {
        scoreMap.set(entry.place.id, entry.score);
    }
    return { kept, rejected, scoreMap };
}
export function categoryToIncludedTypes(category) {
    return buildCategorySearchPlan(category).primaryTypes;
}
