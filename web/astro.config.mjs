import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PERBUG_SITE_URL || 'https://example.com',
  output: 'static',
  vite: {
    server: {
      allowedHosts: ['perbug.dev']
    }
  },
  integrations: [mdx(), react(), tailwind({ applyBaseStyles: false }), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});
