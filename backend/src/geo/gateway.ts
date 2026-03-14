import { GeocodingService } from "../geocoding/service.js";
import { GeoServiceClient } from "./client.js";
import { readGeoRuntimeConfig } from "./config.js";
import type {
  GeoAreaContext,
  GeoAreaContextRequest,
  GeoAutocompleteRequest,
  GeoHealthResponse,
  GeoGeocodeRequest,
  GeoPlaceLookupCandidate,
  GeoPlaceLookupRequest,
  GeoReverseGeocodeRequest,
  GeoReverseResult,
  GeoResult,
  GeoSuggestion
} from "./contracts.js";

export interface GeoGateway {
  geocode(input: GeoGeocodeRequest): Promise<GeoResult[]>;
  reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult>;
  autocomplete(input: GeoAutocompleteRequest): Promise<GeoSuggestion[]>;
  placeLookup(input: GeoPlaceLookupRequest): Promise<GeoPlaceLookupCandidate[]>;
  areaContext(input: GeoAreaContextRequest): Promise<GeoAreaContext>;
  health(): Promise<GeoHealthResponse>;
}

class RemoteGeoGateway implements GeoGateway {
  constructor(private readonly client: GeoServiceClient) {}
  geocode(input: GeoGeocodeRequest): Promise<GeoResult[]> { return this.client.geocode(input); }
  reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult> { return this.client.reverseGeocode(input); }
  autocomplete(input: GeoAutocompleteRequest): Promise<GeoSuggestion[]> { return this.client.autocomplete(input); }
  placeLookup(input: GeoPlaceLookupRequest): Promise<GeoPlaceLookupCandidate[]> { return this.client.placeLookup(input); }
  areaContext(input: GeoAreaContextRequest): Promise<GeoAreaContext> { return this.client.areaContext(input); }
  health(): Promise<GeoHealthResponse> { return this.client.health(); }
}

class LocalGeoGateway implements GeoGateway {
  constructor(private readonly service: GeocodingService) {}

  async geocode(input: GeoGeocodeRequest): Promise<GeoResult[]> {
    return this.service.geocode(input);
  }

  async reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult> {
    return this.service.reverseGeocode(input);
  }

  async autocomplete(input: GeoAutocompleteRequest): Promise<GeoSuggestion[]> {
    const geocoded = await this.service.geocode({
      query: input.query,
      language: input.language,
      limit: Math.min(15, Math.max(1, input.limit ?? 8)),
      countryCodes: input.bias?.countryCode ? [input.bias.countryCode] : undefined
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

  async placeLookup(input: GeoPlaceLookupRequest): Promise<GeoPlaceLookupCandidate[]> {
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

  async areaContext(input: GeoAreaContextRequest): Promise<GeoAreaContext> {
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

  async health(): Promise<GeoHealthResponse> {
    const upstream = await this.service.health();
    return { ok: upstream.ok, upstream, mode: "local", metrics: this.service.metricsSnapshot(), version: "1.0.0" };
  }
}

export function createBackendGeoGatewayFromEnv(env: NodeJS.ProcessEnv = process.env): GeoGateway | null {
  const config = readGeoRuntimeConfig(env);

  if (config.client.enabled) {
    return new RemoteGeoGateway(new GeoServiceClient(config.client));
  }

  if (!config.local.nominatimBaseUrl) {
    return null;
  }

  const service = new GeocodingService({
    baseUrl: config.local.nominatimBaseUrl,
    timeoutMs: config.local.timeoutMs,
    geocodeCacheTtlMs: config.local.geocodeCacheTtlMs,
    reverseCacheTtlMs: config.local.reverseCacheTtlMs,
    defaultLimit: config.local.defaultLimit,
    userAgent: config.local.userAgent,
    env: (env.APP_ENV as "dev" | "stage" | "prod" | undefined) ?? "dev"
  });

  return new LocalGeoGateway(service);
}
