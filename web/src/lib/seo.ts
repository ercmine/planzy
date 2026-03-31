import { publicConfig } from '@/env/public';

export type SeoInput = {
  title: string;
  description: string;
  path?: string;
};

export const defaultDescription =
  'Perbug is a SHA-256 coin with Proof of Exploration, connecting blockchain participation to real-world discovery and gameplay.';

export function createSeo({ title, description, path = '/' }: SeoInput) {
  const canonical = new URL(path, publicConfig.PERBUG_SITE_URL).toString();
  const ogImage = new URL('/social-card.svg', publicConfig.PERBUG_SITE_URL).toString();

  return {
    title: typeof title === 'string' && title.includes('Perbug') ? title : `${title} | Perbug`,
    description,
    canonical,
    ogImage
  };
}
