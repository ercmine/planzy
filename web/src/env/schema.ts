import { z } from 'zod';

const optionalUrl = z.string().trim().url().optional().or(z.literal(''));

export const publicEnvSchema = z.object({
  PERBUG_APPSTORE_URL: optionalUrl,
  PERBUG_PLAYSTORE_URL: optionalUrl,
  PERBUG_DOCS_GITHUB_URL: optionalUrl,
  PERBUG_SUPPORT_EMAIL: z.string().email().optional().or(z.literal('')),
  PERBUG_SITE_URL: z.string().url().optional().default('https://example.com'),
  PERBUG_ANALYTICS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  PERBUG_ANALYTICS_PROVIDER: z.string().trim().optional().or(z.literal(''))
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
