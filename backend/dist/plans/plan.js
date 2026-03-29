import { makePlanId } from "./provider.js";
export const PLAN_CATEGORIES = [
    "food",
    "drinks",
    "coffee",
    "outdoors",
    "movies",
    "music",
    "shopping",
    "wellness",
    "sports",
    "other"
];
export function planId(source, sourceId) {
    if (typeof makePlanId === "function") {
        return makePlanId(source, sourceId);
    }
    return `${source}:${sourceId}`;
}
function stripPrivateMetadata(value) {
    if (Array.isArray(value)) {
        return value.map((item) => stripPrivateMetadata(item));
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    const source = value;
    const cleaned = {};
    for (const [key, child] of Object.entries(source)) {
        if (key.startsWith("_")) {
            continue;
        }
        cleaned[key] = stripPrivateMetadata(child);
    }
    return cleaned;
}
export function toPublicPlan(plan) {
    const cloned = {
        ...plan,
        location: { ...plan.location },
        photos: plan.photos?.map((photo) => ({ ...photo })),
        hours: plan.hours ? { ...plan.hours, weekdayText: plan.hours.weekdayText ? [...plan.hours.weekdayText] : undefined } : undefined,
        deepLinks: plan.deepLinks ? { ...plan.deepLinks } : undefined
    };
    if (plan.metadata) {
        cloned.metadata = stripPrivateMetadata(plan.metadata);
    }
    return cloned;
}
