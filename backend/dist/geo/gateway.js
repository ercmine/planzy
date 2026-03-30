import { GeocodingService } from "../geocoding/service.js";
import { GeoServiceClient } from "./client.js";
import { readGeoRuntimeConfig, validateGeoRuntimeConfig } from "./config.js";
class RemoteGeoGateway {
    client;
    constructor(client) {
        this.client = client;
    }
    geocode(input) { return this.client.geocode(input); }
    reverseGeocode(input) { return this.client.reverseGeocode(input); }
    autocomplete(input) { return this.client.autocomplete(input); }
    placeLookup(input) { return this.client.placeLookup(input); }
    areaContext(input) { return this.client.areaContext(input); }
    health() { return this.client.health(); }
}
class LocalGeoGateway {
    service;
    constructor(service) {
        this.service = service;
    }
    async geocode(input) {
        return this.service.geocode({ ...input, viewbox: input.bounds ? [input.bounds.west, input.bounds.north, input.bounds.east, input.bounds.south] : undefined });
    }
    async reverseGeocode(input) {
        return this.service.reverseGeocode(input);
    }
    async autocomplete(input) {
        const geocoded = await this.service.geocode({
            query: input.query,
            language: input.language,
            limit: Math.min(15, Math.max(1, input.limit ?? 8)),
            countryCodes: input.bias?.countryCode ? [input.bias.countryCode] : undefined,
            viewbox: input.bounds ? [input.bounds.west, input.bounds.north, input.bounds.east, input.bounds.south] : undefined
        });
        return geocoded.map((item, index) => ({
            id: `${item.source}:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}:${index}`,
            displayName: item.displayName,
            normalizedName: item.displayName.toLowerCase(),
            lat: item.lat,
            lng: item.lng,
            city: item.city,
            region: item.state,
            country: item.country,
            countryCode: item.countryCode,
            category: item.class,
            type: item.type,
            relevanceScore: Number((item.importance ?? Math.max(0.1, 1 - index * 0.08)).toFixed(4)),
            source: item.source
        }));
    }
    async placeLookup(input) {
        const geocoded = await this.service.geocode({ query: input.query, language: input.language, limit: input.limit ?? 5 });
        return geocoded.map((item) => ({
            displayName: item.displayName,
            lat: item.lat,
            lng: item.lng,
            city: item.city,
            region: item.state,
            country: item.country,
            countryCode: item.countryCode,
            category: item.class,
            confidence: item.importance,
            canonicalSummary: {
                canonicalKey: `${(item.displayName ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${item.lat.toFixed(3)}-${item.lng.toFixed(3)}`,
                normalizedName: item.displayName.toLowerCase()
            }
        }));
    }
    async areaContext(input) {
        const result = await this.service.reverseGeocode(input);
        return {
            city: result.city,
            region: result.state,
            county: result.county,
            country: result.country,
            countryCode: result.countryCode,
            postalCode: result.postalCode,
            neighborhood: result.neighborhood,
            lat: result.lat,
            lng: result.lng,
            source: result.source
        };
    }
    async health() {
        const upstream = await this.service.health();
        return { ok: upstream.ok, upstream, mode: "local", metrics: this.service.metricsSnapshot(), version: "1.0.0" };
    }
}
export function initBackendGeoRuntime(env = process.env) {
    const config = readGeoRuntimeConfig(env);
    const validation = validateGeoRuntimeConfig(config, env);
    let gateway = null;
    let upstreamBaseUrl;
    if (validation.mode === "custom" && validation.errors.length === 0) {
        upstreamBaseUrl = config.client.baseUrl;
        gateway = new RemoteGeoGateway(new GeoServiceClient(config.client));
    }
    if (validation.mode === "nominatim" && validation.errors.length === 0 && config.local.nominatimBaseUrl) {
        upstreamBaseUrl = config.local.nominatimBaseUrl;
        const service = new GeocodingService({
            baseUrl: config.local.nominatimBaseUrl,
            timeoutMs: config.local.timeoutMs,
            geocodeCacheTtlMs: config.local.geocodeCacheTtlMs,
            reverseCacheTtlMs: config.local.reverseCacheTtlMs,
            defaultLimit: config.local.defaultLimit,
            userAgent: config.local.userAgent,
            env: env.APP_ENV ?? "dev"
        });
        gateway = new LocalGeoGateway(service);
    }
    if (validation.shouldFailFast && (validation.errors.length > 0 || gateway === null)) {
        throw new Error(`Geo misconfiguration: ${validation.errors.join(" ")}`);
    }
    return {
        gateway,
        mode: validation.mode,
        routesMounted: true,
        upstreamBaseUrl,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings
    };
}
export function createBackendGeoGatewayFromEnv(env = process.env) {
    return initBackendGeoRuntime(env).gateway;
}
