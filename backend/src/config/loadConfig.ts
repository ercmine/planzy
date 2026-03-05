import { readEnvConfigWithWarnings } from "./env.js";
import { RemoteConfigClient } from "./remoteConfig.js";
import { defaultConfig, type AppConfig } from "./schema.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T>(base: T, overlay: Partial<T>): T {
  if (!isRecord(base) || !isRecord(overlay)) {
    return (overlay === undefined ? base : (overlay as T));
  }

  const merged: Record<string, unknown> = { ...base };
  for (const [key, overlayValue] of Object.entries(overlay)) {
    if (overlayValue === undefined) {
      continue;
    }
    const baseValue = merged[key];
    if (Array.isArray(overlayValue)) {
      merged[key] = [...overlayValue];
    } else if (isRecord(baseValue) && isRecord(overlayValue)) {
      merged[key] = deepMerge(baseValue, overlayValue);
    } else {
      merged[key] = overlayValue;
    }
  }
  return merged as T;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function mergeConfig(base: AppConfig, overlay: Partial<AppConfig>): AppConfig {
  const merged = deepMerge(base, overlay);

  const baseProviders = base.plans.providers;
  const overlayProviders = overlay.plans?.providers ?? {};
  merged.plans.providers = { ...baseProviders };

  for (const [providerName, providerConfig] of Object.entries(overlayProviders)) {
    const existing = merged.plans.providers[providerName] ?? { name: providerName };
    merged.plans.providers[providerName] = deepMerge(existing, providerConfig ?? {});
    merged.plans.providers[providerName].name = providerName;
  }

  return merged;
}

export async function loadConfig(params?: {
  env?: NodeJS.ProcessEnv;
  remoteClient?: RemoteConfigClient;
  fetchRemote?: boolean;
  now?: () => number;
}): Promise<{ config: AppConfig; warnings: string[] }> {
  const envSource = params?.env ?? process.env;
  const envName = envSource.APP_ENV === "stage" || envSource.APP_ENV === "prod" || envSource.APP_ENV === "dev" ? envSource.APP_ENV : "dev";

  const base = defaultConfig(envName);
  const envResult = readEnvConfigWithWarnings(envSource);
  let config = mergeConfig(base, envResult.config);
  const warnings = [...envResult.warnings];

  const shouldFetchRemote = params?.fetchRemote ?? Boolean(config.remoteConfig?.url);
  if (shouldFetchRemote && config.remoteConfig?.url) {
    try {
      const client = params?.remoteClient ?? new RemoteConfigClient({ now: params?.now });
      const remoteResult = await client.get(config.remoteConfig.url, {
        ttlMs: config.remoteConfig.ttlMs,
        timeoutMs: config.remoteConfig.timeoutMs,
        allowInsecureHttp: config.remoteConfig.allowInsecureHttp
      });
      config = mergeConfig(config, remoteResult.config);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Remote config fetch failed.");
    }
  }

  config.plans.router.defaultTimeoutMs = clamp(config.plans.router.defaultTimeoutMs, 250, 30_000, 2_500);
  if (config.remoteConfig) {
    config.remoteConfig.ttlMs = clamp(config.remoteConfig.ttlMs, 1_000, 86_400_000, 60_000);
    config.remoteConfig.timeoutMs = clamp(config.remoteConfig.timeoutMs, 250, 30_000, 2_000);
  }

  for (const provider of Object.values(config.plans.providers)) {
    provider.name = provider.name || "unknown";
    if (provider.budget?.timeoutMs !== undefined) {
      provider.budget.timeoutMs = clamp(provider.budget.timeoutMs, 250, 30_000, config.plans.router.defaultTimeoutMs);
    }
    if (provider.cache?.ttlMs !== undefined) {
      provider.cache.ttlMs = clamp(provider.cache.ttlMs, 1_000, 86_400_000, 30_000);
    }
  }

  return { config, warnings };
}
