import { publicEnvSchema, type PublicEnv } from './schema';

const parsed = publicEnvSchema.safeParse({
  PERBUG_APPSTORE_URL: import.meta.env.PERBUG_APPSTORE_URL,
  PERBUG_PLAYSTORE_URL: import.meta.env.PERBUG_PLAYSTORE_URL,
  PERBUG_DOCS_GITHUB_URL: import.meta.env.PERBUG_DOCS_GITHUB_URL,
  PERBUG_SUPPORT_EMAIL: import.meta.env.PERBUG_SUPPORT_EMAIL,
  PERBUG_SITE_URL: import.meta.env.PERBUG_SITE_URL,
  PERBUG_ANALYTICS_ENABLED: import.meta.env.PERBUG_ANALYTICS_ENABLED,
  PERBUG_ANALYTICS_PROVIDER: import.meta.env.PERBUG_ANALYTICS_PROVIDER
});

if (!parsed.success) {
  console.warn('[perbug-web] Invalid public env values. Falling back to defaults.', parsed.error.flatten());
}

const safeData = parsed.success ? parsed.data : publicEnvSchema.parse({});

export const publicConfig: PublicEnv = {
  ...safeData,
  PERBUG_APPSTORE_URL: safeData.PERBUG_APPSTORE_URL || undefined,
  PERBUG_PLAYSTORE_URL: safeData.PERBUG_PLAYSTORE_URL || undefined,
  PERBUG_DOCS_GITHUB_URL: safeData.PERBUG_DOCS_GITHUB_URL || undefined,
  PERBUG_SUPPORT_EMAIL: safeData.PERBUG_SUPPORT_EMAIL || undefined,
  PERBUG_ANALYTICS_PROVIDER: safeData.PERBUG_ANALYTICS_PROVIDER || undefined
};
