// Vérifie le schéma courant : tables métier + médias produit + current_offers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb } from './helpers.mjs';

const EXPECTED_TABLES = [
  'clicks', 'fact_product_daily', 'job_runs', 'merchants', 'offer_snapshots', 'offers',
  'page_offers', 'pages', 'product_media', 'product_reviews', 'product_specs', 'products', 'sales',
  'signals', 'trend_candidates', 'views', 'watch_terms',
];

function baseRows(db) {
  db.exec(`
    INSERT INTO products (id, slug, brand, model, category, manufacturer_url)
      VALUES (1, 'p', 'b', 'm', 'c', 'https://fabricant.example/p');
    INSERT INTO merchants (id, name, domain) VALUES (1, 'M', 'm.example');
    INSERT INTO offers (id, product_id, merchant_id, condition, merchant_url)
      VALUES (1, 1, 1, 'new', 'https://m.example/p');
    INSERT INTO pages (id, slug, template, "group", main_product_id, started_at)
      VALUES (1, 'page', 'meilleur-prix', 'durable', 1, '2026-10-10T00:00:00Z');
  `);
}

test('17 tables + la vue current_offers', () => {
  const db = freshDb();
  const rows = db.prepare(
    "SELECT name, type FROM sqlite_schema WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all();
  assert.deepEqual(rows.filter((r) => r.type === 'table').map((r) => r.name), EXPECTED_TABLES);
  assert.deepEqual(rows.filter((r) => r.type === 'view').map((r) => r.name), ['current_offers']);
});

test('page_offers : deux lignes actives pour le même couple → refusé', () => {
  const db = freshDb();
  baseRows(db);
  const insert = db.prepare(
    `INSERT INTO page_offers (page_id, offer_id, role, position, is_recommended, valid_from, valid_to)
     VALUES (1, 1, 'offre', 1, 0, ?, ?)`,
  );
  insert.run('2026-10-01T00:00:00Z', null);
  assert.throws(() => insert.run('2026-10-02T00:00:00Z', null), /UNIQUE/);
});

test('page_offers : lignes fermées multiples + une active → accepté', () => {
  const db = freshDb();
  baseRows(db);
  const insert = db.prepare(
    `INSERT INTO page_offers (page_id, offer_id, role, position, is_recommended, valid_from, valid_to)
     VALUES (1, 1, 'offre', 1, 0, ?, ?)`,
  );
  insert.run('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
  insert.run('2026-10-02T00:00:00Z', '2026-10-03T00:00:00Z');
  insert.run('2026-10-03T00:00:00Z', null);
  const active = db.prepare('SELECT count(*) AS n FROM page_offers WHERE valid_to IS NULL').get().n;
  assert.equal(active, 1);
});

test('signals : un seul relevé par (source, metric, subject_key, jour)', () => {
  const db = freshDb();
  const insert = db.prepare(
    `INSERT INTO signals (source, metric, subject, subject_key, value, reference_value, observed_at)
     VALUES ('manual', 'note', 'Sujet', 'sujet', 1, 0, ?)`,
  );
  insert.run('2026-10-10T08:00:00Z');
  assert.throws(() => insert.run('2026-10-10T21:30:00Z'), /UNIQUE/);
  insert.run('2026-10-11T08:00:00Z');
  const days = db.prepare('SELECT observed_day FROM signals ORDER BY observed_day').all().map((r) => r.observed_day);
  assert.deepEqual(days, ['2026-10-10', '2026-10-11']);
});

test('signals : une date invalide est refusée', () => {
  const db = freshDb();
  assert.throws(() => db.exec(
    `INSERT INTO signals (source, metric, subject, subject_key, value, reference_value, observed_at)
     VALUES ('manual', 'note', 'S', 's', 1, 0, 'pas une date')`,
  ), /CHECK/);
});

test('offer_snapshots : disponibilité hors liste refusée', () => {
  const db = freshDb();
  baseRows(db);
  assert.throws(() => db.exec(
    `INSERT INTO offer_snapshots (offer_id, price_cents, availability, source, checked_at)
     VALUES (1, 1000, 'bientot', 'manual', '2026-10-10T00:00:00Z')`,
  ), /CHECK/);
});

test('current_offers : dernier relevé, égalité de date départagée par id', () => {
  const db = freshDb();
  baseRows(db);
  db.exec(`
    INSERT INTO offer_snapshots (id, offer_id, price_cents, shipping_cents, availability, source, checked_at) VALUES
      (1, 1, 30000, 0,    'in_stock', 'manual', '2026-10-01T00:00:00Z'),
      (2, 1, 25000, NULL, 'in_stock', 'manual', '2026-10-05T00:00:00Z'),
      (3, 1, 24000, NULL, 'in_stock', 'manual', '2026-10-05T00:00:00Z');
  `);
  const row = db.prepare('SELECT snapshot_id, price_cents, shipping_cents FROM current_offers WHERE offer_id = 1').get();
  assert.equal(row.snapshot_id, 3);
  assert.equal(row.price_cents, 24000);
  assert.equal(row.shipping_cents, null);
});


test('product_media : droits explicites, position unique et primary en rôle valide', () => {
  const db = freshDb();
  baseRows(db);
  db.exec(`
    INSERT INTO product_media
      (product_id, url, alt_text, role, position, source_url, rights_basis, rights_note, checked_at)
    VALUES
      (1, 'https://cdn.example/p.webp', 'Produit', 'primary', 1, 'https://licence.example/p',
       'licensed', 'Licence commerciale de test', '2026-10-10T00:00:00Z');
  `);
  assert.throws(() => db.exec(`
    INSERT INTO product_media
      (product_id, url, alt_text, role, position, source_url, rights_basis, rights_note, checked_at)
    VALUES
      (1, 'https://cdn.example/p2.webp', 'Produit 2', 'primary', 1, 'https://licence.example/p2',
       'licensed', 'Licence commerciale de test', '2026-10-10T00:00:00Z');
  `), /UNIQUE/);
  assert.throws(() => db.exec(`
    INSERT INTO product_media
      (product_id, url, alt_text, role, position, source_url, rights_basis, rights_note, checked_at)
    VALUES
      (1, 'https://cdn.example/p3.webp', 'Produit 3', 'gallery', 2, 'https://licence.example/p3',
       'unknown', 'Pas de droit', '2026-10-10T00:00:00Z');
  `), /CHECK/);
});
