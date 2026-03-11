export interface GeoClientConfig {
  enabled: boolean;
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  authSecret?: string;
  failOpen: boolean;
}

export interface GeoLocalConfig {
  nominatimBaseUrl?: string;
  timeoutMs: number;
  geocodeCacheTtlMs: number;
  reverseCacheTtlMs: number;
  defaultLimit: number;
  userAgent: string;
}

export interface GeoRuntimeConfig {
  client: GeoClientConfig;
  local: GeoLocalConfig;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseNum(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readGeoRuntimeConfig(env: NodeJS.ProcessEnv): GeoRuntimeConfig {
  return {
    client: {
      enabled: parseBool(env.GEO_SERVICE_ENABLED, false),
      baseUrl: env.GEO_SERVICE_BASE_URL ?? "https://geo.perbug.com",
      timeoutMs: parseNum(env.GEO_SERVICE_TIMEOUT_MS, 2000),
      retries: parseNum(env.GEO_SERVICE_RETRIES, 1),
      authSecret: env.GEO_SERVICE_AUTH_SECRET,
      failOpen: parseBool(env.GEO_SERVICE_FAIL_OPEN, true)
    },
    local: {
      nominatimBaseUrl: env.NOMINATIM_BASE_URL,
      timeoutMs: parseNum(env.NOMINATIM_TIMEOUT_MS, 2000),
      geocodeCacheTtlMs: parseNum(env.NOMINATIM_GEOCODE_CACHE_TTL_MS, 3_600_000),
      reverseCacheTtlMs: parseNum(env.NOMINATIM_REVERSE_CACHE_TTL_MS, 86_400_000),
      defaultLimit: parseNum(env.NOMINATIM_DEFAULT_LIMIT, 5),
      userAgent: env.NOMINATIM_USER_AGENT ?? "perbug-geocoder/1.0"
    }
  };
}
