export type DocsNavItem = {
  title: string;
  href: string;
  children?: DocsNavItem[];
};

export const docsNav: DocsNavItem[] = [
  { title: 'Introduction', href: '/docs/' },
  { title: 'Getting Started', href: '/docs/getting-started/' },
  { title: 'FAQ', href: '/docs/faq/' },
  {
    title: 'API',
    href: '/docs/api/overview/',
    children: [
      { title: 'Overview', href: '/docs/api/overview/' },
      { title: 'Sessions', href: '/docs/api/sessions/' },
      { title: 'Telemetry', href: '/docs/api/telemetry/' }
    ]
  }
];
