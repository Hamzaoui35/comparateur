// Seeds : rejouables sans doublon, cas limites présents, ajout d'un produit uniquement par les données.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { count, freshDb, readRepoFile } from './helpers.mjs';

const TABLES = ['products', 'merchants', 'offers', 'offer_snapshots', 'pages', 'page_offers'];
const snapshotCounts = (db) => Object.fromEntries(TABLES.map((t) => [t, count(db, t)]));

test('seed/dev.sql rejoué deux fois : aucun doublon', () => {
  const db = freshDb({ seeds: ['seed/dev.sql'] });
  const first = snapshotCounts(db);
  db.exec(readRepoFile('seed/dev.sql'));
  assert.deepEqual(snapshotCounts(db), first);
  assert.deepEqual(first, { products: 2, merchants: 3, offers: 6, offer_snapshots: 12, pages: 2, page_offers: 7 });
});

test('seed/dev.sql couvre les cas limites (livraison inconnue, rupture, historisation)', () => {
  const db = freshDb({ seeds: ['seed/dev.sql'] });
  const current = db.prepare('SELECT shipping_cents, availability FROM current_offers').all();
  assert.ok(current.some((o) => o.shipping_cents === null), 'au moins une livraison inconnue');
  assert.ok(current.some((o) => o.availability === 'out_of_stock'), 'au moins une rupture');
  const closed = db.prepare('SELECT count(*) AS n FROM page_offers WHERE valid_to IS NOT NULL').get().n;
  assert.ok(closed >= 1, 'au moins une ligne page_offers fermée');
});

test('preuve B (données) : un 3e produit ajouté par SQL a ses offres actives sur sa page', () => {
  const db = freshDb({ seeds: ['seed/dev.sql', 'seed/exemple-ajout-produit.sql', 'seed/exemple-ajout-produit.sql'] });
  const rows = db.prepare(`
    SELECT co.price_cents
      FROM pages p
      JOIN page_offers po ON po.page_id = p.id AND po.valid_to IS NULL
      JOIN current_offers co ON co.offer_id = po.offer_id
     WHERE p.slug = 'produit-test-c-meilleur-prix'`).all();
  assert.equal(rows.length, 2);
  assert.equal(count(db, 'products'), 3);
});

test('non-régression : un relevé ajouté entre-temps ne fait perdre aucune ligne au seed suivant', () => {
  const db = freshDb({ seeds: ['seed/dev.sql'] });
  db.exec(`INSERT INTO offer_snapshots (offer_id, price_cents, shipping_cents, availability, source, checked_at)
           SELECT id, 20900, 0, 'in_stock', 'manuel', '2026-10-10T09:00:00Z' FROM offers WHERE merchant_url = 'https://alpha.example/p/produit-test-a'`);
  db.exec(readRepoFile('seed/exemple-ajout-produit.sql'));
  const offersOnPage = db.prepare(`
    SELECT count(*) AS n
      FROM pages p
      JOIN page_offers po ON po.page_id = p.id AND po.valid_to IS NULL
      JOIN current_offers co ON co.offer_id = po.offer_id
     WHERE p.slug = 'produit-test-c-meilleur-prix'`).get().n;
  assert.equal(offersOnPage, 2);
});
