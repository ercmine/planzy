function normalize(text) {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
}
function distanceMeters(latA, lngA, latB, lngB) {
    const earthRadius = 6_371_000;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(latB - latA);
    const dLng = toRad(lngB - lngA);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}
function tokenScore(haystack, query) {
    if (!query)
        return 0;
    if (haystack === query)
        return 1;
    if (haystack.startsWith(query))
        return 0.85;
    if (haystack.includes(query))
        return 0.45;
    const queryTokens = query.split(" ").filter(Boolean);
    const hayTokens = haystack.split(" ").filter(Boolean);
    const matched = queryTokens.filter((token) => hayTokens.some((item) => item.startsWith(token))).length;
    return queryTokens.length === 0 ? 0 : (matched / queryTokens.length) * 0.35;
}
export function autocompleteCanonicalPlaces(places, query) {
    const normalizedQuery = normalize(query.q);
    if (!normalizedQuery)
        return [];
    const scopedPlaces = places.filter((place) => {
        if (place.status !== "active")
            return false;
        if (query.category && place.canonicalCategory !== query.category)
            return false;
        return true;
    });
    const suggestions = scopedPlaces
        .map((place) => {
        const nameScore = tokenScore(normalize(place.primaryDisplayName), normalizedQuery);
        const aliasScore = Math.max(0, ...place.alternateNames.map((alias) => tokenScore(normalize(alias), normalizedQuery)));
        const localityText = normalize([place.neighborhood, place.locality, place.region].filter(Boolean).join(" "));
        const localityQueryBoost = tokenScore(localityText, normalizedQuery) * 0.2;
        let localityBias = 0;
        let distance;
        if (typeof query.lat === "number" && typeof query.lng === "number") {
            distance = distanceMeters(query.lat, query.lng, place.latitude, place.longitude);
            const localityRange = query.scope === "global" ? 80_000 : query.scope === "regional" ? 30_000 : 8_000;
            localityBias = Math.max(0, 1 - distance / localityRange) * 0.4;
        }
        else if (query.city && place.locality && normalize(query.city) === normalize(place.locality)) {
            localityBias = 0.25;
        }
        else if (query.region && place.region && normalize(query.region) === normalize(place.region)) {
            localityBias = 0.15;
        }
        const qualityBoost = Math.max(0, Math.min(1, place.dataCompletenessScore)) * 0.15;
        const popularityBoost = Math.min(0.1, place.sourceLinks.length * 0.01);
        const score = Math.max(nameScore, aliasScore) + localityQueryBoost + localityBias + qualityBoost + popularityBoost;
        const addressSnippet = [place.address1, place.locality, place.region].filter(Boolean).join(", ");
        return {
            canonicalPlaceId: place.canonicalPlaceId,
            displayName: place.primaryDisplayName,
            category: place.canonicalCategory,
            addressSnippet,
            city: place.locality,
            region: place.region,
            distanceMeters: distance,
            thumbnailUrl: place.primaryPhoto?.thumbnailUrl,
            lat: place.latitude,
            lng: place.longitude,
            score
        };
    })
        .filter((item) => item.score > 0.15)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, Math.min(query.limit ?? 8, 20)));
    return suggestions;
}
