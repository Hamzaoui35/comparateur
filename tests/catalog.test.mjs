import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb } from './helpers.mjs';
import { d1 } from './d1-shim.mjs';
import { getPublishedComparisons, getPublishedPage } from '../src/lib/comparison.ts';

test('catalogue : fixtures exclues par provenance, produits publiés ajoutés sans template', async () => {
  const db = freshDb({ seeds: ['seed/dev.sql'] });
  try {
    assert.deepEqual(await getPublishedComparisons(d1(db)), []);
    db.exec(`UPDATE offer_snapshots SET source = 'manual:test' WHERE offer_id IN (SELECT id FROM offers WHERE product_id = (SELECT main_product_id FROM pages ORDER BY id LIMIT 1));`);
    assert.equal((await getPublishedComparisons(d1(db))).length, 1);
    db.exec(`INSERT INTO products (slug,brand,model,category,manufacturer_url) VALUES ('nouveau-modele','Autre marque','Modèle indépendant','Autre catégorie','https://fabricant.invalid');
      INSERT INTO pages (slug,template,"group",main_product_id,started_at,published_at,hours_spent)
      SELECT 'nouveau-comparatif','meilleur-prix','durable',id,'2026-10-10T00:00:00Z','2026-10-10T00:00:00Z',0 FROM products WHERE slug='nouveau-modele';`);
    const pages = await getPublishedComparisons(d1(db));
    assert.equal(pages.length, 2);
    assert.equal(pages[0].model, 'Modèle indépendant');
    const page = await getPublishedPage(d1(db), 'nouveau-comparatif');
    assert.equal(page.brand, 'Autre marque');
    db.exec(`UPDATE pages SET published_at=NULL WHERE slug='nouveau-comparatif'`);
    assert.equal(await getPublishedPage(d1(db), 'nouveau-comparatif'), null);
    assert.equal((await getPublishedComparisons(d1(db))).length, 1);
  } finally { db.close(); }
});
