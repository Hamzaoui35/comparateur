// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  // Pages fixes générées en /a-propos.html : servies sur /a-propos sans redirection, comme les liens, le canonical et le sitemap.
  build: { format: 'file' },
  adapter: cloudflare(),
});
