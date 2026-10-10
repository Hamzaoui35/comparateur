import { readdirSync, readFileSync } from 'node:fs';

const base = process.env.SMOKE_BASE_URL || 'https://comparateur.aymen-for-pic.workers.dev';
const internalHeaders = {
  'x-comparateur-internal-test': '1',
  'user-agent': 'comparateur-smoke',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUntil(path, expectedStatus, validator = () => true, options = {}) {
  let last;
  for (let attempt = 1; attempt <= 10; attempt++) {
    const response = await fetch(base + path, { redirect: 'follow', headers: internalHeaders, ...options });
    const body = await response.text();
    last = { response, body };
    if (response.status === expectedStatus && validator(last)) return last;
    if (attempt < 10) await sleep(2000);
  }
  throw new Error(`${path}: validation distante échouée après 10 tentatives (HTTP ${last.response.status})`);
}

const root = await fetchUntil('/', 200, ({ body }) => body.includes('Les offres en clair.'));
if (!root.body.includes('Les offres en clair.')) throw new Error('Accueil: contenu attendu absent');

const comparisonPath = '/comparatifs/produit-test-a-meilleur-prix?utm_source=smoke&utm_campaign=phase2&utm_content=remote';
const comparison = await fetchUntil(
  comparisonPath,
  200,
  ({ body }) => body.includes('/go/') && body.includes('Produit Test A'),
);
for (const expected of ['Produit Test A', 'Livraison à vérifier', 'noindex', 'sponsored nofollow', '/go/']) {
  if (!comparison.body.includes(expected)) throw new Error(`Comparatif: contenu absent: ${expected}`);
}

const hrefMatch = comparison.body.match(/href="(\/go\/\d+\?[^"]+)"/);
if (!hrefMatch) throw new Error('Comparatif: aucun lien /go trouvé');
const goHref = hrefMatch[1].replaceAll('&amp;', '&');
if (!goHref.includes('utm_source=smoke') || !goHref.includes('utm_campaign=phase2')) {
  throw new Error('Comparatif: UTM non propagés vers /go');
}

const outbound = await fetchUntil(goHref, 302, () => true, { redirect: 'manual' });
const location = outbound.response.headers.get('location');
if (!location || !/^https?:\/\//.test(location)) throw new Error('/go: Location HTTP(S) absente');

const mismatchUrl = new URL(goHref, base);
mismatchUrl.searchParams.set('s', '999999999');
await fetchUntil(mismatchUrl.pathname + mismatchUrl.search, 302, () => true, { redirect: 'manual' });

await fetchUntil('/go/999999999?s=1', 404, () => true, { redirect: 'manual' });
await fetchUntil('/comparatifs/inexistant', 404);

console.log('SMOKE OK: accueil=200 comparatif=200 vue=trackée /go=302 mismatch=302 go-inconnu=404 page-inconnue=404');

// ---------------------------------------------------------------- Phase 3 : pages réelles (pilotées par imports/data)
// Toutes les requêtes portent l'en-tête internal_test : aucune pollution des métriques business.
const productsDir = new URL('../imports/data/products/', import.meta.url);
const realProducts = readdirSync(productsDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(readFileSync(new URL(file, productsDir), 'utf8')));

for (const entry of realProducts) {
  const slug = entry.page.slug;
  const path = `/comparatifs/${slug}?utm_source=smoke&utm_campaign=phase3&utm_content=remote`;
  const page = await fetchUntil(path, 200, ({ body }) => body.includes(entry.product.model) && body.includes('/go/'));
  const sellers = entry.offers.filter((offer) => offer.seller_name).map((offer) => `vendu par ${offer.seller_name}`);
  for (const expected of [entry.product.brand, entry.product.model, 'noindex', 'sponsored nofollow', ...sellers]) {
    if (!page.body.includes(expected)) throw new Error(`${slug}: contenu absent: ${expected}`);
  }
  const anchorHrefs = [...page.body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)]
    .map((match) => match[1].replaceAll('&amp;', '&'));
  if (anchorHrefs.some((href) => /^https?:/i.test(href))) throw new Error(`${slug}: lien marchand direct dans la page`);
  const goLinks = anchorHrefs.filter((href) => href.startsWith('/go/'));
  if (new Set(goLinks).size !== entry.offers.length) {
    throw new Error(`${slug}: ${new Set(goLinks).size} offres uniques /go/ pour ${entry.offers.length} offres importées`);
  }
  if (!goLinks.every((href) => /^\/go\/\d+\?s=\d+&utm_source=smoke&utm_campaign=phase3/.test(href))) {
    throw new Error(`${slug}: lien /go/ sans snapshot ou sans UTM`);
  }
  const outbound = await fetchUntil(goLinks[0], 302, () => true, { redirect: 'manual' });
  const location = new URL(outbound.response.headers.get('location'));
  const merchantHosts = entry.offers.map((offer) => new URL(offer.merchant_url).hostname);
  if (location.protocol !== 'https:' || !merchantHosts.includes(location.hostname)) {
    throw new Error(`${slug}: /go/ redirige vers une destination inattendue (${location.hostname})`);
  }
  console.log(`SMOKE PHASE 3 OK: ${slug} page=200 offres=${new Set(goLinks).size} /go=302 → ${location.hostname}`);
}

// Marqueur de fin : cette vue interne n'existe en D1 que si tous les contrôles précédents ont réussi.
if (realProducts.length > 0) {
  await fetchUntil(
    `/comparatifs/${realProducts[0].page.slug}?utm_source=smoke&utm_campaign=phase3&utm_content=complete`,
    200,
  );
}

// Phase 4B : vitrine dynamique et pages publiques.
for (const entry of realProducts) {
  if (!root.body.includes(`/comparatifs/${entry.page.slug}`) || !root.body.includes(entry.product.model)) throw new Error('Accueil : produit réel manquant');
}
if (root.body.includes('Produit Test')) throw new Error('Accueil : fixture affichée');
for (const path of ['/', '/a-propos', '/comment-ca-marche', '/affiliation-transparence', '/confidentialite', '/mentions-legales', '/contact']) {
  const { body } = await fetchUntil(path, 200);
  if (!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(body) || !body.includes('<main') || !body.includes('<footer')) {
    throw new Error(`${path}: structure publique ou noindex absent`);
  }
}
const notFound = await fetchUntil('/page-inexistante-phase4b', 404);
if (!notFound.body.includes('noindex') || !notFound.body.includes('Revenir aux comparatifs')) throw new Error('404 sans interface publique');
if (!root.body.includes('Certains liens peuvent être affiliés')) throw new Error('Disclosure absente');
console.log('SMOKE PHASE 4B OK : catalogue réel, 6 pages fixes, 404, disclosure, noindex');


// Phase 4C : SEO technique prêt mais indexation encore bloquée par noindex.
const seoHome = await fetchUntil('/', 200);
if (!seoHome.body.includes('rel="canonical" href="https://comparateur.aymen-for-pic.workers.dev/"')) {
  throw new Error('SEO: canonical accueil absent ou incorrect');
}
if (!seoHome.body.includes('"@type":"WebSite"')) throw new Error('SEO: JSON-LD WebSite absent');

for (const entry of realProducts) {
  const slug = entry.page.slug;
  const { body } = await fetchUntil(`/comparatifs/${slug}?utm_source=smoke&utm_campaign=phase4c`, 200);
  if (!body.includes(`rel="canonical" href="https://comparateur.aymen-for-pic.workers.dev/comparatifs/${slug}"`)) {
    throw new Error(`${slug}: canonical absent ou pollué par UTM`);
  }
  for (const expected of ['"@type":"Product"', '"@type":"AggregateOffer"', '"priceCurrency":"EUR"', '"@type":"BreadcrumbList"']) {
    if (!body.includes(expected)) throw new Error(`${slug}: donnée structurée absente: ${expected}`);
  }
  if (entry.product.gtin && !body.includes(entry.product.gtin)) throw new Error(`${slug}: GTIN absent du JSON-LD`);
}

const sitemap = await fetchUntil('/sitemap.xml', 200, ({ response, body }) =>
  response.headers.get('content-type')?.includes('application/xml') && body.includes('<urlset'));
for (const entry of realProducts) {
  if (!sitemap.body.includes(`/comparatifs/${entry.page.slug}`)) throw new Error('Sitemap: comparatif réel manquant');
}
if (sitemap.body.includes('produit-test')) throw new Error('Sitemap: fixture exposée');

const robots = await fetchUntil('/robots.txt', 200, ({ response, body }) =>
  response.headers.get('content-type')?.includes('text/plain') && body.includes('User-agent: *'));
if (!robots.body.includes('Sitemap: https://comparateur.aymen-for-pic.workers.dev/sitemap.xml')) {
  throw new Error('robots.txt: sitemap absent');
}

console.log('SMOKE PHASE 4C OK : canonical, Product/AggregateOffer, Breadcrumb, sitemap, robots, noindex conservé');

// Phase 4D : pages fixes servies sans redirection, canonical identique au lien interne et au sitemap.
for (const path of ['/a-propos', '/comment-ca-marche', '/affiliation-transparence']) {
  const { body } = await fetchUntil(path, 200, () => true, { redirect: 'manual' });
  if (!body.includes(`rel="canonical" href="https://comparateur.aymen-for-pic.workers.dev${path}"`)) {
    throw new Error(`${path}: canonical incohérent avec l'URL servie`);
  }
}
console.log('SMOKE PHASE 4D OK : pages fixes sans redirection, canonical cohérent');
