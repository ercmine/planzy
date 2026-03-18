import { publicConfig } from '@/env/public';

export type SeoInput = {
  title: string;
  description: string;
  path?: string;
};

export const defaultDescription =
  'Perbug helps you discover the best nearby plans with live results, category filters, and fast swipe decisions.';

export function createSeo({ title, description, path = '/' }: SeoInput) {
  const canonical = new URL(path, publicConfig.PERBUG_SITE_URL).toString();
  const ogImage = new URL('/perbug.svg', publicConfig.PERBUG_SITE_URL).toString();

  return {
    title: `${title} | Perbug`,
    description,
    canonical,
    ogImage
  };
}
