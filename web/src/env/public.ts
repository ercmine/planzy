import { publicEnvSchema, type PublicEnv } from './schema';

const parsed = publicEnvSchema.safeParse({
  DRYAD_APPSTORE_URL: import.meta.env.DRYAD_APPSTORE_URL,
  DRYAD_PLAYSTORE_URL: import.meta.env.DRYAD_PLAYSTORE_URL,
  DRYAD_DOCS_GITHUB_URL: import.meta.env.DRYAD_DOCS_GITHUB_URL,
  DRYAD_SUPPORT_EMAIL: import.meta.env.DRYAD_SUPPORT_EMAIL,
  DRYAD_SITE_URL: import.meta.env.DRYAD_SITE_URL,
  DRYAD_ANALYTICS_ENABLED: import.meta.env.DRYAD_ANALYTICS_ENABLED,
  DRYAD_ANALYTICS_PROVIDER: import.meta.env.DRYAD_ANALYTICS_PROVIDER
});

if (!parsed.success) {
  console.warn('[dryad-web] Invalid public env values. Falling back to defaults.', parsed.error.flatten());
}

const safeData = parsed.success ? parsed.data : publicEnvSchema.parse({});

export const publicConfig: PublicEnv = {
  ...safeData,
  DRYAD_APPSTORE_URL: safeData.DRYAD_APPSTORE_URL || undefined,
  DRYAD_PLAYSTORE_URL: safeData.DRYAD_PLAYSTORE_URL || undefined,
  DRYAD_DOCS_GITHUB_URL: safeData.DRYAD_DOCS_GITHUB_URL || undefined,
  DRYAD_SUPPORT_EMAIL: safeData.DRYAD_SUPPORT_EMAIL || undefined,
  DRYAD_ANALYTICS_PROVIDER: safeData.DRYAD_ANALYTICS_PROVIDER || undefined
};
