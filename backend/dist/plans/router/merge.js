import { planId } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import { haversineMeters } from "./geo.js";
import { normalizeAddress, normalizeName } from "./similarity.js";
function cleanString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function roundedCoord(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "0.0000";
    }
    return value.toFixed(4);
}
function pickTitle(candidates) {
    const valid = candidates
        .map((candidate) => cleanString(candidate.title))
        .filter((value) => Boolean(value));
    if (valid.length === 0) {
        return "Untitled";
    }
    const withinLimit = valid.filter((value) => value.length <= 140);
    if (withinLimit.length === 0) {
        return valid[0] ?? "Untitled";
    }
    return withinLimit.sort((a, b) => b.length - a.length || a.localeCompare(b))[0] ?? "Untitled";
}
function pickDescription(candidates) {
    const valid = candidates
        .map((candidate) => cleanString(candidate.description))
        .filter((value) => typeof value === "string" && value.length > 0 && value.length <= 400);
    if (valid.length === 0) {
        return undefined;
    }
    return valid.sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}
function pickAddress(candidates) {
    const addresses = candidates
        .map((candidate) => cleanString(candidate.location.address))
        .filter((value) => Boolean(value));
    if (addresses.length === 0) {
        return undefined;
    }
    return addresses.sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}
function shouldAverageCoordinates(candidates) {
    for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
            const a = candidates[i];
            const b = candidates[j];
            if (!a || !b) {
                continue;
            }
            if (haversineMeters(a.location, b.location) > 50) {
                return false;
            }
        }
    }
    return true;
}
function pickLocation(candidates) {
    const address = pickAddress(candidates);
    if (shouldAverageCoordinates(candidates)) {
        const lat = candidates.reduce((sum, candidate) => sum + candidate.location.lat, 0) / candidates.length;
        const lng = candidates.reduce((sum, candidate) => sum + candidate.location.lng, 0) / candidates.length;
        return { lat, lng, address };
    }
    const preferred = candidates.find((candidate) => cleanString(candidate.location.address)) ?? candidates[0];
    return {
        lat: preferred?.location.lat ?? 0,
        lng: preferred?.location.lng ?? 0,
        address
    };
}
function pickDistanceMeters(candidates) {
    const values = candidates
        .map((candidate) => candidate.distanceMeters)
        .filter((distance) => typeof distance === "number" && Number.isFinite(distance));
    if (values.length === 0) {
        return undefined;
    }
    return Math.min(...values);
}
function pickPriceLevel(candidates) {
    const values = candidates
        .map((candidate) => candidate.priceLevel)
        .filter((price) => typeof price === "number" && price > 0);
    if (values.length === 0) {
        return undefined;
    }
    return values.sort((a, b) => a - b)[0];
}
function pickRating(candidates) {
    const weighted = candidates
        .map((candidate) => ({ rating: candidate.rating, reviewCount: candidate.reviewCount }))
        .filter((item) => typeof item.rating === "number" && Number.isFinite(item.rating) && typeof item.reviewCount === "number" && item.reviewCount > 0);
    if (weighted.length > 0) {
        const totalWeight = weighted.reduce((sum, item) => sum + item.reviewCount, 0);
        const weightedTotal = weighted.reduce((sum, item) => sum + item.rating * item.reviewCount, 0);
        if (totalWeight > 0) {
            return Number((weightedTotal / totalWeight).toFixed(3));
        }
    }
    const ratings = candidates
        .map((candidate) => candidate.rating)
        .filter((rating) => typeof rating === "number" && Number.isFinite(rating));
    if (ratings.length === 0) {
        return undefined;
    }
    return Math.max(...ratings);
}
function pickReviewCount(candidates) {
    const reviewCounts = candidates
        .map((candidate) => candidate.reviewCount)
        .filter((count) => typeof count === "number" && Number.isInteger(count) && count >= 0);
    if (reviewCounts.length === 0) {
        return undefined;
    }
    return Math.max(...reviewCounts);
}
function mergePhotos(candidates) {
    const seen = new Set();
    const merged = candidates
        .flatMap((candidate) => candidate.photos ?? [])
        .filter((photo) => {
        if (!photo?.url || seen.has(photo.url)) {
            return false;
        }
        seen.add(photo.url);
        return true;
    })
        .slice(0, 20)
        .map((photo) => ({ ...photo }));
    return merged.length > 0 ? merged : undefined;
}
function mergeOpenNow(candidates) {
    const values = candidates
        .map((candidate) => candidate.hours?.openNow)
        .filter((value) => typeof value === "boolean");
    if (values.includes(true)) {
        return true;
    }
    if (values.length === candidates.length && values.every((value) => value === false)) {
        return false;
    }
    return undefined;
}
function pickFirstDefined(values) {
    return values.find((value) => typeof value === "string" && value.trim().length > 0);
}
function pickWebsite(values) {
    const valid = values.filter((value) => typeof value === "string" && value.trim().length > 0);
    if (valid.length === 0) {
        return undefined;
    }
    const https = valid.find((value) => value.startsWith("https://"));
    return https ?? valid[0];
}
function mergeDeepLinks(candidates) {
    const mapsLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.mapsLink));
    const websiteLink = pickWebsite(candidates.map((candidate) => candidate.deepLinks?.websiteLink));
    const bookingLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.bookingLink));
    const ticketLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.ticketLink));
    const callLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.callLink));
    const deepLinks = { mapsLink, websiteLink, bookingLink, ticketLink, callLink };
    if (!mapsLink && !websiteLink && !bookingLink && !ticketLink && !callLink) {
        return undefined;
    }
    return deepLinks;
}
function mergeMetadata(candidates) {
    const merged = {};
    for (const candidate of candidates) {
        const sourcePrefix = candidate.source;
        const metadata = candidate.metadata;
        if (!metadata || typeof metadata !== "object") {
            continue;
        }
        for (const [key, value] of Object.entries(metadata)) {
            const canOverride = key.startsWith(sourcePrefix);
            if (!(key in merged) || canOverride) {
                merged[key] = value;
            }
        }
    }
    const sources = Array.from(new Set(candidates.map((candidate) => candidate.source)));
    merged._dedupe = { sources, mergedCount: candidates.length };
    const sortedKeys = Object.keys(merged).sort((a, b) => a.localeCompare(b));
    if (sortedKeys.length <= 50) {
        return merged;
    }
    const trimmed = {};
    if ("_dedupe" in merged) {
        trimmed._dedupe = merged._dedupe;
    }
    for (const key of sortedKeys) {
        if (key === "_dedupe") {
            continue;
        }
        if (Object.keys(trimmed).length >= 50) {
            break;
        }
        trimmed[key] = merged[key];
    }
    return trimmed;
}
function buildStableKey(title, location) {
    const normalizedTitle = normalizeName(title) || "untitled";
    const rounded = `${roundedCoord(location.lat)},${roundedCoord(location.lng)}`;
    const normalizedAddress = normalizeAddress(location.address);
    if (normalizedAddress) {
        return `${normalizedTitle}|${normalizedAddress}|${rounded}`;
    }
    return `${normalizedTitle}|${rounded}`;
}
export function mergePlans(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error("mergePlans requires at least one candidate");
    }
    const mergedFrom = candidates.map((candidate) => candidate.id);
    const title = pickTitle(candidates);
    const location = pickLocation(candidates);
    const stableKey = buildStableKey(title, location);
    const merged = {
        id: planId("deduped", stableKey),
        source: "deduped",
        sourceId: stableKey,
        title,
        category: candidates[0]?.category ?? "other",
        description: pickDescription(candidates),
        location,
        distanceMeters: pickDistanceMeters(candidates),
        priceLevel: pickPriceLevel(candidates),
        rating: pickRating(candidates),
        reviewCount: pickReviewCount(candidates),
        photos: mergePhotos(candidates),
        hours: { openNow: mergeOpenNow(candidates) },
        deepLinks: mergeDeepLinks(candidates),
        metadata: mergeMetadata(candidates)
    };
    if (merged.hours?.openNow === undefined) {
        delete merged.hours;
    }
    const plan = validatePlan(merged);
    return { plan, mergedFrom };
}
