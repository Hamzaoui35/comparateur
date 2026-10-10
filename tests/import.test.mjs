// Phase 3 : import de données commerciales (imports/data) — validation, idempotence, historique, page pilotée par les données.
// Aucun accès réseau : SQLite en mémoire + fichiers du dépôt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { count, freshDb, repoRoot } from './helpers.mjs';
import { d1 } from './d1-shim.mjs';
import {
  isSafeHttpsUrl,
  isValidGtin,
  loadImportDir,
  toSql,
  validateImport,
} from '../scripts/import.mjs';
import { getActiveOffers, getPublishedPage } from '../src/lib/comparison.ts';
import { rankOffers } from '../src/lib/ranking.ts';

const FIXTURE_DIR = join(repoRoot, 'tests', 'fixtures', 'imports');
const TABLES = ['merchants', 'products', 'offers', 'pages', 'page_offers', 'offer_snapshots'];
const counts = (db) => Object.fromEntries(TABLES.map((t) => [t, count(db, t)]));
const clone = (value) => JSON.parse(JSON.stringify(value));

test('données réelles : imports/data est valide et ne contient aucune fixture', () => {
  assert.deepEqual(validateImport(loadImportDir()), []);
});

test('données réelles : import rejoué deux fois → 0 doublon, chaque offre a un relevé courant', () => {
  const data = loadImportDir();
  const db = freshDb();
  db.exec(toSql(data));
  const first = counts(db);
  db.exec(toSql(data));
  assert.deepEqual(counts(db), first);
  const offers = data.products.reduce((n, p) => n + p.offers.length, 0);
  assert.equal(first.offers, offers);
  assert.equal(count(db, 'current_offers'), offers);
  assert.equal(first.page_offers, offers);
});

test('fixture : import idempotent (0 doublon) sans toucher aux données existantes', () => {
  const db = freshDb({ seeds: ['seed/dev.sql'] });
  const before = counts(db);
  const data = loadImportDir(FIXTURE_DIR);
  assert.deepEqual(validateImport(data, { forbidFixtures: false }), []);
  db.exec(toSql(data));
  const after = counts(db);
  db.exec(toSql(data));
  assert.deepEqual(counts(db), after);
  assert.equal(after.products, before.products + 1);
  assert.equal(after.offer_snapshots, before.offer_snapshots + 3);
});

test('historique : l’ancien relevé est conservé, le nouveau devient courant', () => {
  const db = freshDb();
  const data = loadImportDir(FIXTURE_DIR);
  db.exec(toSql(data));
  const url = 'https://www.delta.example/p/produit-test-d';
  const nextBatch = {
    checked_at: '2026-01-08T08:00:00Z',
    source: 'manual:fixture',
    snapshots: [{ merchant_url: url, price_cents: 9500, shipping_cents: 500, availability: 'in_stock',
      delivery_info: null, warranty_info: null, return_info: null }],
  };
  db.exec(toSql({ merchants: [], products: [], batches: [nextBatch] }));
  db.exec(toSql({ merchants: [], products: [], batches: [nextBatch] }));
  const history = db.prepare(
    `SELECT s.price_cents FROM offer_snapshots s JOIN offers o ON o.id = s.offer_id
      WHERE o.merchant_url = ? ORDER BY s.checked_at`,
  ).all(url).map((r) => r.price_cents);
  assert.deepEqual(history, [10000, 9500]);
  const current = db.prepare('SELECT price_cents FROM current_offers WHERE merchant_url = ?').get(url);
  assert.equal(current.price_cents, 9500);
});

test('page pilotée par les données : produit ajouté uniquement par import → requêtes réelles de la page', async () => {
  const db = freshDb();
  db.exec(toSql(loadImportDir(FIXTURE_DIR)));
  const page = await getPublishedPage(d1(db), 'produit-test-d');
  assert.ok(page, 'page publiée trouvée');
  const offers = rankOffers(await getActiveOffers(d1(db), page.id));
  assert.deepEqual(
    offers.map((o) => [o.merchant_name, o.seller_name, o.price_cents, o.shipping_cents, o.availability]),
    [
      ['Boutique Delta', null, 10000, 500, 'in_stock'],
      ['Boutique Epsilon', 'Vendeur Partenaire', 9900, null, 'in_stock'],
      ['Boutique Epsilon', null, 8000, 0, 'out_of_stock'],
    ],
  );
  assert.equal(await getPublishedPage(d1(db), 'inexistant'), null);
});

test('livraison inconnue : shipping_cents null reste NULL en base, jamais 0', () => {
  const db = freshDb();
  db.exec(toSql(loadImportDir()));
  const unknown = db.prepare('SELECT count(*) AS n FROM current_offers WHERE shipping_cents IS NULL').get().n;
  const expected = loadImportDir().batches.flatMap((b) => b.snapshots).filter((s) => s.shipping_cents === null).length;
  assert.equal(unknown, expected);
});

test('sécurité : seules les destinations https sans identifiants sont acceptées', () => {
  assert.equal(isSafeHttpsUrl('https://www.marchand.example/p?ref={tracking_token}'), true);
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://marchand.example/p', 'http://marchand.example/p',
    'https://user:pass@marchand.example/p', ' https://marchand.example/p', '']) {
    assert.equal(isSafeHttpsUrl(bad), false, bad);
  }
  const data = clone(loadImportDir(FIXTURE_DIR));
  data.products[0].offers[0].affiliate_url = 'javascript:alert(1)';
  data.products[0].offers[1].merchant_url = 'https://autre-domaine.example/p';
  const errors = validateImport(data, { forbidFixtures: false });
  assert.ok(errors.some((e) => e.includes('affiliate_url')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('hors du domaine')), errors.join('\n'));
});

test('validation : disponibilité, prix et livraison hors règles refusés', () => {
  const data = clone(loadImportDir(FIXTURE_DIR));
  const [a, b, c] = data.batches[0].snapshots;
  a.availability = 'bientot';
  b.price_cents = 12.5;
  c.shipping_cents = -1;
  const errors = validateImport(data, { forbidFixtures: false });
  assert.equal(errors.length, 3, errors.join('\n'));
});

test('production : une fixture glissée dans les imports réels est refusée', () => {
  const data = clone(loadImportDir());
  data.merchants.push({ domain: 'delta.example', name: 'Boutique Delta', affiliate_network: null });
  assert.ok(validateImport(data).some((e) => e.includes('fixture')));
});

test('GTIN : clé de contrôle vérifiée', () => {
  for (const product of loadImportDir().products) {
    if (product.product.gtin) assert.equal(isValidGtin(product.product.gtin), true, product.product.gtin);
  }
  assert.equal(isValidGtin('6977328065583'), false);
  assert.equal(isValidGtin('123'), false);
});

test('offre existante rattachée à un autre produit : jamais écrasée par un import', () => {
  const db = freshDb();
  const data = loadImportDir(FIXTURE_DIR);
  db.exec(toSql(data));
  const other = clone(data);
  other.products[0].product.slug = 'produit-test-e';
  other.products[0].page.slug = 'produit-test-e';
  other.products[0].offers[0].seller_name = 'Ne doit pas apparaître';
  db.exec(toSql({ merchants: other.merchants, products: other.products, batches: [] }));
  const row = db.prepare(
    `SELECT p.slug, o.seller_name FROM offers o JOIN products p ON p.id = o.product_id WHERE o.merchant_url = ?`,
  ).get(data.products[0].offers[0].merchant_url);
  assert.deepEqual({ ...row }, { slug: 'produit-test-d', seller_name: null });
});
