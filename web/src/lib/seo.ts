import { publicConfig } from '@/env/public';

export type SeoInput = {
  title: string;
  description: string;
  path?: string;
};

export const defaultDescription =
  'Dryad helps you discover the best nearby plans with live results, category filters, and fast swipe decisions.';

export function createSeo({ title, description, path = '/' }: SeoInput) {
  const canonical = new URL(path, publicConfig.DRYAD_SITE_URL).toString();
  const ogImage = new URL('/dryad.svg', publicConfig.DRYAD_SITE_URL).toString();

  return {
    title: `${title} | Dryad`,
    description,
    canonical,
    ogImage
  };
}
