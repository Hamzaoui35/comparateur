const base = 'https://comparateur.aymen-for-pic.workers.dev';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(path, expectedStatus) {
  let last;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(base + path, { redirect: 'follow' });
    const body = await response.text();
    last = { response, body };
    if (response.status === expectedStatus) return last;
    if (attempt < 5) await sleep(2000);
  }
  throw new Error(`${path}: HTTP ${last.response.status}, attendu ${expectedStatus}`);
}

const root = await fetchWithRetry('/', 200);
if (!root.body.includes('Fondation technique')) {
  throw new Error('Accueil: contenu attendu absent');
}

const comparison = await fetchWithRetry('/comparatifs/produit-test-a-meilleur-prix', 200);
for (const expected of ['Produit Test A', 'Livraison à vérifier', 'noindex', 'sponsored nofollow']) {
  if (!comparison.body.includes(expected)) {
    throw new Error(`Comparatif: contenu absent: ${expected}`);
  }
}

await fetchWithRetry('/comparatifs/inexistant', 404);

console.log('SMOKE OK: accueil=200 comparatif=200 contenu=OK inconnu=404');
