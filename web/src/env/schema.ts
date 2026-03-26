import { z } from 'zod';

const optionalUrl = z.string().trim().url().optional().or(z.literal(''));

export const publicEnvSchema = z.object({
  DRYAD_APPSTORE_URL: optionalUrl,
  DRYAD_PLAYSTORE_URL: optionalUrl,
  DRYAD_DOCS_GITHUB_URL: optionalUrl,
  DRYAD_SUPPORT_EMAIL: z.string().email().optional().or(z.literal('')),
  DRYAD_SITE_URL: z.string().url().optional().default('https://example.com'),
  DRYAD_ANALYTICS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  DRYAD_ANALYTICS_PROVIDER: z.string().trim().optional().or(z.literal(''))
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
