import { readFileSync } from 'node:fs';

type DocsPage = {
  file?: string;
  frontmatter: Record<string, string>;
  url?: string;
};

export type SearchDoc = {
  title: string;
  href: string;
  summary: string;
  headings: string[];
};

function extractHeadings(content: string) {
  return content
    .split('\n')
    .filter((line) => /^##?\s+/.test(line))
    .map((line) => line.replace(/^##?\s+/, '').trim());
}

function extractSummary(content: string) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'));

  return lines[0] || 'Documentation entry';
}

export function getDocsSearchIndex(pages: DocsPage[]): SearchDoc[] {
  return pages
    .map((page) => {
      const raw = page.file ? readFileSync(page.file, 'utf8') : '';
      return {
        title: page.frontmatter.title ?? 'Untitled',
        href: page.url ?? '/docs/',
        summary: page.frontmatter.description ?? extractSummary(raw),
        headings: extractHeadings(raw)
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
