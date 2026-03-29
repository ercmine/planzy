export function assertGeoAuth(req, expectedSecret) {
    if (!expectedSecret)
        return;
    const actual = req.headers["x-dryad-geo-service"];
    if (actual !== expectedSecret) {
        throw new Error("unauthorized_geo_service_call");
    }
}
export function shouldProtectGeoEndpoint(pathname) {
    return pathname.startsWith("/v1/");
}
