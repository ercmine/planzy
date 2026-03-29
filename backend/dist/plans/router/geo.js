function isValidPoint(point) {
    return (!!point &&
        typeof point.lat === "number" &&
        Number.isFinite(point.lat) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        typeof point.lng === "number" &&
        Number.isFinite(point.lng) &&
        point.lng >= -180 &&
        point.lng <= 180);
}
export function haversineMeters(a, b) {
    try {
        if (!isValidPoint(a) || !isValidPoint(b)) {
            return Number.POSITIVE_INFINITY;
        }
        const toRad = (deg) => (deg * Math.PI) / 180;
        const earthRadiusMeters = 6_371_000;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const sinLat = Math.sin(dLat / 2);
        const sinLng = Math.sin(dLng / 2);
        const aa = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return earthRadiusMeters * c;
    }
    catch {
        return Number.POSITIVE_INFINITY;
    }
}
export function withinMeters(a, b, threshold) {
    if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0) {
        return false;
    }
    return haversineMeters(a, b) <= threshold;
}
