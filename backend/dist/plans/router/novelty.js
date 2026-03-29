import { normalizeAddress, normalizeName } from "./similarity.js";
function roundCoord(value) {
    if (!Number.isFinite(value)) {
        return "0.0000";
    }
    return value.toFixed(4);
}
export function planSignature(plan) {
    const normalizedTitle = normalizeName(plan.title);
    const lat = roundCoord(plan.location?.lat ?? 0);
    const lng = roundCoord(plan.location?.lng ?? 0);
    const normalizedAddr = normalizeAddress(plan.location?.address);
    if (normalizedAddr) {
        return `${normalizedTitle}|${lat},${lng}|${normalizedAddr}`;
    }
    return `${normalizedTitle}|${lat},${lng}`;
}
export function noveltyPenalty(plan, signals) {
    if (!signals) {
        return { penalty: 0 };
    }
    const windowSize = typeof signals.noveltyWindowSize === "number" && signals.noveltyWindowSize > 0
        ? Math.floor(signals.noveltyWindowSize)
        : 200;
    const seenPlanIds = Array.isArray(signals.seenPlanIds) ? signals.seenPlanIds.slice(0, windowSize) : [];
    if (seenPlanIds.includes(plan.id)) {
        return { penalty: -100, reason: "seen_plan_id" };
    }
    const seenSignatures = Array.isArray(signals.seenSignatures) ? signals.seenSignatures.slice(0, windowSize) : [];
    if (seenSignatures.length > 0) {
        const signature = planSignature(plan);
        if (seenSignatures.includes(signature)) {
            return { penalty: -40, reason: "seen_signature" };
        }
    }
    return { penalty: 0 };
}
