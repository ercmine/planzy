import { ProviderError } from "../../errors.js";
import { buildMapsLink } from "../../normalization/urls.js";
import { planId } from "../../plan.js";
import { validatePlanArray } from "../../planValidation.js";
import { haversineMeters } from "../../router/geo.js";
import { fakeAddress, fakePhone, fakePhotoUrl, fakeWebsite, jitterLocation, seedFromSearch } from "./geoSeed.js";
import { pick, randInt, seededRng, shuffle } from "./prng.js";
const CATEGORY_TEMPLATES = {
    food: ["{adj} Kitchen", "{prefix} Pizza", "{prefix} Bistro", "{adj} Noodles"],
    drinks: ["{prefix} Taproom", "{adj} Lounge", "{prefix} Wine Bar"],
    coffee: ["{prefix} Coffee", "{adj} Roasters", "{prefix} Espresso"],
    outdoors: ["{adj} Trail", "{prefix} Park Loop", "{adj} Gardens"],
    movies: ["{prefix} Cinema", "{adj} Screens", "{prefix} Theater"],
    music: ["{adj} Live Hall", "{prefix} Music Room", "{adj} Stage"],
    shopping: ["{prefix} Market", "{adj} Outlet", "{prefix} Plaza"],
    wellness: ["{adj} Wellness", "{prefix} Studio", "{adj} Spa"],
    sports: ["{prefix} Sports Club", "{adj} Arena", "{prefix} Athletics"],
    other: ["{adj} Spot", "{prefix} House", "{adj} Collective"]
};
const PREFIXES = ["Oak Street", "Northside", "Lakeside", "Grand", "Urban", "Riverside", "Cedar", "Hilltop"];
const ADJECTIVES = ["Golden", "Sunny", "Blue", "Silver", "Rustic", "Electric", "Cozy", "Classic"];
const BASE_CATEGORY_WEIGHTS = {
    food: 1.5,
    drinks: 1.1,
    coffee: 1.2,
    outdoors: 0.8,
    movies: 0.7,
    music: 0.8,
    shopping: 0.7,
    wellness: 0.6,
    sports: 0.6,
    other: 0.5
};
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "plan";
}
function delay(ms, signal) {
    if (ms <= 0) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timeout);
            reject(new ProviderError({
                provider: "deterministic_stub",
                code: "ABORTED",
                message: "Provider request was aborted",
                retryable: true,
                cause: signal?.reason
            }));
        };
        if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
            if (signal.aborted) {
                onAbort();
            }
        }
    });
}
function weightedPickCategory(rng, categories) {
    const totalWeight = categories.reduce((sum, entry) => sum + entry.weight, 0);
    const threshold = rng() * totalWeight;
    let running = 0;
    for (const entry of categories) {
        running += entry.weight;
        if (threshold <= running) {
            return entry.category;
        }
    }
    return categories[categories.length - 1]?.category ?? "other";
}
function buildCategoryWeights(input, opts) {
    const requested = input.categories ?? [];
    const requestedSet = new Set(requested);
    return Object.keys(BASE_CATEGORY_WEIGHTS).map((category) => {
        const base = BASE_CATEGORY_WEIGHTS[category] ?? 0.5;
        const bias = opts.categoriesBias?.[category] ?? 1;
        const requestedBoost = requestedSet.has(category) ? 7 : requested.length > 0 ? 0.3 : 1;
        return {
            category,
            weight: Math.max(0.01, base * bias * requestedBoost)
        };
    });
}
function buildTitle(rng, category) {
    const template = pick(rng, CATEGORY_TEMPLATES[category]);
    return template.replace("{prefix}", pick(rng, PREFIXES)).replace("{adj}", pick(rng, ADJECTIVES));
}
function buildBaseEntities(seed, input, count, categories) {
    const rng = seededRng(seed);
    const maxDistance = Math.min(input.radiusMeters, 4_000);
    const entities = [];
    for (let index = 0; index < count; index += 1) {
        const category = weightedPickCategory(rng, categories);
        const location = jitterLocation(rng, input.location.lat, input.location.lng, maxDistance);
        const title = buildTitle(rng, category);
        entities.push({
            key: `${slugify(title)}-${index}`,
            title,
            category,
            address: fakeAddress(rng),
            location
        });
    }
    return entities;
}
function fixedBaseDate(seed) {
    const rng = seededRng(`date:${seed}`);
    const start = Date.parse("2026-01-01T00:00:00.000Z");
    const dayOffset = randInt(rng, 0, 90);
    return new Date(start + dayOffset * 24 * 60 * 60 * 1000);
}
function createPlan(entity, input, opts, rng, index) {
    const sourceId = `${opts.provider}-${entity.key}-${index}`;
    const locationAddress = entity.address;
    const rating = Number((3 + rng() * 1.9).toFixed(1));
    const reviewCount = randInt(rng, 5, 5000);
    const maybePrice = rng() < 0.2 ? undefined : randInt(rng, 1, 4);
    const openChance = input.openNow === true ? 0.8 : 0.55;
    const openNow = rng() < openChance;
    const photosCount = randInt(rng, 0, 3);
    const nameSlug = slugify(entity.title);
    const photos = Array.from({ length: photosCount }, () => ({
        url: fakePhotoUrl(rng, opts.kind ?? "places"),
        width: 1200,
        height: 800
    }));
    const deepLinks = {
        mapsLink: buildMapsLink(entity.location.lat, entity.location.lng, entity.title),
        websiteLink: fakeWebsite(rng, nameSlug),
        callLink: fakePhone(rng)
    };
    if (entity.category === "food" && rng() < 0.35) {
        deepLinks.bookingLink = `https://ourplanplan.com/booking/${nameSlug}`;
    }
    if ((opts.kind === "events" || entity.category === "music") && rng() < 0.7) {
        deepLinks.ticketLink = `https://ourplanplan.com/tickets/${nameSlug}`;
    }
    const baseDate = fixedBaseDate(`${sourceId}:${opts.kind ?? "places"}`);
    const metadata = {};
    if (opts.kind === "events") {
        const hoursAhead = randInt(rng, 12, 14 * 24);
        const start = new Date(baseDate.getTime() + hoursAhead * 60 * 60 * 1000);
        metadata.kind = "event";
        metadata.startTimeISO = start.toISOString();
    }
    else if (opts.kind === "movies") {
        const releaseOffsetDays = randInt(rng, -120, 120);
        const release = new Date(baseDate.getTime() + releaseOffsetDays * 24 * 60 * 60 * 1000);
        metadata.kind = "movie";
        metadata.releaseDate = release.toISOString().slice(0, 10);
        metadata.tmdbId = randInt(rng, 1000, 999999);
        metadata.posterUrl = fakePhotoUrl(rng, "movies-posters");
    }
    else {
        metadata.kind = "venue";
    }
    const distanceMeters = Math.round(haversineMeters(input.location, {
        lat: entity.location.lat,
        lng: entity.location.lng
    }));
    return {
        id: planId(opts.source, sourceId),
        source: opts.source,
        sourceId,
        title: entity.title,
        category: entity.category,
        location: {
            lat: entity.location.lat,
            lng: entity.location.lng,
            address: locationAddress
        },
        distanceMeters,
        rating,
        reviewCount,
        priceLevel: maybePrice,
        hours: { openNow },
        deepLinks,
        photos,
        metadata
    };
}
export async function generatePlans(input, opts) {
    const overlapRate = opts.overlapRate ?? 0.25;
    const failureRate = opts.failureRate ?? 0;
    const categories = buildCategoryWeights(input, opts);
    const seed = seedFromSearch(input, opts.provider);
    const rng = seededRng(`${seed}|${opts.overlapKey ?? "no-overlap"}`);
    if (failureRate > 0 && rng() < failureRate) {
        throw new ProviderError({
            provider: opts.provider,
            code: "SIMULATED_FAILURE",
            message: `Deterministic stub ${opts.provider} simulated failure`,
            retryable: true
        });
    }
    if ((opts.latencyMs ?? 0) > 0) {
        await delay(opts.latencyMs ?? 0, opts.signal);
    }
    const requestedCount = Math.max(opts.count, input.limit);
    const overlapCount = opts.overlapKey ? Math.round(requestedCount * overlapRate) : 0;
    const uniqueCount = Math.max(0, requestedCount - overlapCount);
    const overlapEntities = opts.overlapKey
        ? buildBaseEntities(`${seedFromSearch(input, opts.overlapKey)}|overlap`, input, overlapCount, categories)
        : [];
    const providerEntities = buildBaseEntities(`${seed}|provider`, input, uniqueCount, categories);
    const allEntities = shuffle(rng, [...overlapEntities, ...providerEntities]);
    const plans = allEntities.map((entity, index) => createPlan(entity, input, opts, rng, index));
    return validatePlanArray(plans);
}
