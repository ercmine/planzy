import { GeocodingService } from "../geocoding/service.js";
import { GeoServiceClient } from "./client.js";
import { readGeoRuntimeConfig } from "./config.js";
import type { GeoGeocodeRequest, GeoHealthResponse, GeoReverseGeocodeRequest, GeoReverseResult, GeoResult } from "./contracts.js";

export interface GeoGateway {
  geocode(input: GeoGeocodeRequest): Promise<GeoResult[]>;
  reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult>;
  health(): Promise<GeoHealthResponse>;
}

class RemoteGeoGateway implements GeoGateway {
  constructor(private readonly client: GeoServiceClient) {}
  geocode(input: GeoGeocodeRequest): Promise<GeoResult[]> { return this.client.geocode(input); }
  reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult> { return this.client.reverseGeocode(input); }
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

  async health(): Promise<GeoHealthResponse> {
    const upstream = await this.service.health();
    return { ok: upstream.ok, upstream, mode: "local", version: "1.0.0" };
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
