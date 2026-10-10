const base = 'https://comparateur.aymen-for-pic.workers.dev';
const internalHeaders = {
  'x-comparateur-internal-test': '1',
  'user-agent': 'comparateur-smoke',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(path, expectedStatus, options = {}) {
  let last;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(base + path, { redirect: 'follow', headers: internalHeaders, ...options });
    const body = await response.text();
    last = { response, body };
    if (response.status === expectedStatus) return last;
    if (attempt < 5) await sleep(2000);
  }
  throw new Error(`${path}: HTTP ${last.response.status}, attendu ${expectedStatus}`);
}

const root = await fetchWithRetry('/', 200);
if (!root.body.includes('Fondation technique')) throw new Error('Accueil: contenu attendu absent');

const comparisonPath = '/comparatifs/produit-test-a-meilleur-prix?utm_source=smoke&utm_campaign=phase2&utm_content=remote';
const comparison = await fetchWithRetry(comparisonPath, 200);
for (const expected of ['Produit Test A', 'Livraison à vérifier', 'noindex', 'sponsored nofollow', '/go/']) {
  if (!comparison.body.includes(expected)) throw new Error(`Comparatif: contenu absent: ${expected}`);
}

const hrefMatch = comparison.body.match(/href="(\/go\/\d+\?[^"]+)"/);
if (!hrefMatch) throw new Error('Comparatif: aucun lien /go trouvé');
const goHref = hrefMatch[1].replaceAll('&amp;', '&');
if (!goHref.includes('utm_source=smoke') || !goHref.includes('utm_campaign=phase2')) {
  throw new Error('Comparatif: UTM non propagés vers /go');
}

const outbound = await fetchWithRetry(goHref, 302, { redirect: 'manual' });
const location = outbound.response.headers.get('location');
if (!location || !/^https?:\/\//.test(location)) throw new Error('/go: Location HTTP(S) absente');

const mismatchUrl = new URL(goHref, base);
mismatchUrl.searchParams.set('s', '999999999');
await fetchWithRetry(mismatchUrl.pathname + mismatchUrl.search, 302, { redirect: 'manual' });

await fetchWithRetry('/go/999999999?s=1', 404, { redirect: 'manual' });
await fetchWithRetry('/comparatifs/inexistant', 404);

console.log('SMOKE OK: accueil=200 comparatif=200 vue=trackée /go=302 mismatch=302 go-inconnu=404 page-inconnue=404');
