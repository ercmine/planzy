export interface GeoClientConfig {
  enabled: boolean;
  baseUrl?: string;
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

export interface GeoRuntimeValidation {
  mode: "custom" | "nominatim" | "disabled";
  reason: string;
  shouldFailFast: boolean;
  errors: string[];
  warnings: string[];
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseNum(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isProdEnv(env: NodeJS.ProcessEnv): boolean {
  const appEnv = String(env.APP_ENV ?? "").toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").toLowerCase();
  return appEnv === "prod" || nodeEnv === "production";
}

export function readGeoRuntimeConfig(env: NodeJS.ProcessEnv): GeoRuntimeConfig {
  return {
    client: {
      enabled: parseBool(env.GEO_SERVICE_ENABLED, false),
      baseUrl: env.GEO_SERVICE_BASE_URL?.trim() || undefined,
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
      userAgent: env.NOMINATIM_USER_AGENT ?? "dryad-geocoder/1.0"
    }
  };
}

export function validateGeoRuntimeConfig(config: GeoRuntimeConfig, env: NodeJS.ProcessEnv): GeoRuntimeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = isProdEnv(env);
  const explicitGeoMode = String(env.GEO_MODE ?? "").trim().toLowerCase();

  if (explicitGeoMode) {
    warnings.push(`GEO_MODE="${env.GEO_MODE}" is ignored. Mode is determined by GEO_SERVICE_ENABLED + GEO_SERVICE_BASE_URL, then NOMINATIM_BASE_URL.`);
  }

  const customEnabled = config.client.enabled;
  const hasCustomBaseUrl = Boolean(config.client.baseUrl);
  const hasNominatimBaseUrl = Boolean(config.local.nominatimBaseUrl);

  if (customEnabled && hasCustomBaseUrl) {
    const parsed = URL.canParse(config.client.baseUrl!) ? new URL(config.client.baseUrl!) : null;
    if (!parsed) {
      errors.push("GEO_SERVICE_BASE_URL is invalid.");
    } else if (isProd && parsed.protocol !== "https:") {
      errors.push("GEO_SERVICE_BASE_URL must use https in production.");
    }
    if (!config.client.authSecret) {
      warnings.push("GEO_SERVICE_ENABLED=true but GEO_SERVICE_AUTH_SECRET is not set.");
    }
    return {
      mode: "custom",
      reason: "Selected custom mode because GEO_SERVICE_ENABLED=true and GEO_SERVICE_BASE_URL is set.",
      shouldFailFast: isProd && (errors.length > 0 || parseBool(env.GEO_REQUIRED, true)),
      errors,
      warnings
    };
  }

  if (customEnabled && !hasCustomBaseUrl) {
    warnings.push("GEO_SERVICE_ENABLED=true but GEO_SERVICE_BASE_URL is missing; custom mode not eligible.");
  }

  if (hasNominatimBaseUrl) {
    const parsed = URL.canParse(config.local.nominatimBaseUrl!)
      ? new URL(config.local.nominatimBaseUrl!)
      : null;
    if (!parsed) {
      errors.push("NOMINATIM_BASE_URL is invalid.");
    }
    return {
      mode: "nominatim",
      reason: customEnabled
        ? "Selected nominatim mode because GEO_SERVICE_BASE_URL is missing while NOMINATIM_BASE_URL is set."
        : "Selected nominatim mode because GEO_SERVICE_ENABLED=false and NOMINATIM_BASE_URL is set.",
      shouldFailFast: isProd && errors.length > 0,
      errors,
      warnings
    };
  }

  if (customEnabled) {
    errors.push("GEO_SERVICE_ENABLED=true requires GEO_SERVICE_BASE_URL.");
  }

  errors.push("Geo is disabled because neither GEO_SERVICE_ENABLED=true with GEO_SERVICE_BASE_URL nor NOMINATIM_BASE_URL is configured.");
  return {
    mode: "disabled",
    reason: "Disabled mode because no valid geo upstream configuration was provided.",
    shouldFailFast: isProd && parseBool(env.GEO_REQUIRED, true),
    errors,
    warnings
  };
}
