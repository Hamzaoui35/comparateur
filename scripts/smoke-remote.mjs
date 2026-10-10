const base = 'https://comparateur.aymen-for-pic.workers.dev';
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

const root = await fetchUntil('/', 200, ({ body }) => body.includes('Fondation technique'));
if (!root.body.includes('Fondation technique')) throw new Error('Accueil: contenu attendu absent');

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
