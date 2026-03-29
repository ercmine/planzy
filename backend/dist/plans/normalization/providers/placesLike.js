import { normalizeBasePlan } from "../normalize.js";
export function normalizePlacesLike(raw, provider) {
    return normalizeBasePlan({
        title: raw.name,
        categoryInput: {
            categories: [...(raw.types ?? []), ...(raw.category_tags ?? [])],
            primary: raw.types?.[0] ?? raw.category_tags?.[0] ?? null
        },
        location: {
            lat: raw.geometry?.location?.lat,
            lng: raw.geometry?.location?.lng,
            address: raw.formatted_address
        },
        rating: raw.rating,
        reviewCount: raw.user_ratings_total,
        price: raw.price_level,
        photos: raw.photos,
        hoursOpenNow: raw.opening_hours?.open_now,
        hoursWeekdayText: raw.opening_hours?.weekday_text,
        website: raw.website,
        phone: raw.international_phone_number,
        metadata: raw.metadata
    }, {
        provider,
        sourceId: raw.id
    });
}
