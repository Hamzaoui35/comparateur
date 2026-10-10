import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getPublishedComparisons } from '../lib/comparison';
import { absoluteSiteUrl } from '../lib/site';

export const prerender = false;

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const GET: APIRoute = async () => {
  const pages = await getPublishedComparisons(env.DB);
  const staticPaths = ['/', '/a-propos', '/comment-ca-marche', '/affiliation-transparence'];
  const entries = [
    ...staticPaths.map((path) => ({ loc: absoluteSiteUrl(path), lastmod: null })),
    ...pages.map((page) => ({
      loc: absoluteSiteUrl(`/comparatifs/${page.slug}`),
      lastmod: page.last_checked_at ?? page.published_at ?? null,
    })),
  ];

  const urls = entries
    .map(({ loc, lastmod }) => {
      const date = lastmod ? `\n    <lastmod>${escapeXml(lastmod.slice(0, 10))}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${date}\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=900',
    },
  });
};
