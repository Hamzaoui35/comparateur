-- seed/dev.sql — données de test FICTIVES (aucun prix réel).
-- Rejouable et sans id explicite : chaque ligne est retrouvée par sa clé naturelle
--   products.slug · merchants.domain · offers.merchant_url · pages.slug ·
--   offer_snapshots (offre, checked_at, source) · page_offers (page, offre, valid_from).
-- Les id sont attribués par la base : aucune collision possible avec des lignes ajoutées ailleurs.
-- Cas limites couverts : livraison inconnue (shipping_cents NULL), rupture, précommande,
-- disponibilité inconnue, ligne page_offers fermée puis remplacée (historisation).

INSERT INTO products (slug, brand, model, category, gtin, mpn, manufacturer_url) VALUES
  ('produit-test-a', 'MarqueTest', 'Produit Test A', 'categorie-test', NULL, 'MT-A', 'https://marquetest.example/produit-test-a'),
  ('produit-test-b', 'MarqueTest', 'Produit Test B', 'categorie-test', NULL, 'MT-B', 'https://marquetest.example/produit-test-b')
ON CONFLICT(slug) DO NOTHING;

INSERT INTO merchants (name, domain, affiliate_network) VALUES
  ('Boutique Alpha', 'alpha.example', 'reseau-test'),
  ('Boutique Beta',  'beta.example',  NULL),
  ('Boutique Gamma', 'gamma.example', NULL)
ON CONFLICT(domain) DO NOTHING;

WITH v(product_slug, merchant_domain, condition, merchant_sku, merchant_url, affiliate_url) AS (VALUES
  ('produit-test-a', 'alpha.example', 'new', 'A-ALPHA', 'https://alpha.example/p/produit-test-a', 'https://alpha.example/p/produit-test-a?aff=test'),
  ('produit-test-a', 'beta.example',  'new', 'A-BETA',  'https://beta.example/p/produit-test-a',  NULL),
  ('produit-test-a', 'gamma.example', 'new', 'A-GAMMA', 'https://gamma.example/p/produit-test-a', NULL),
  ('produit-test-b', 'alpha.example', 'new', 'B-ALPHA', 'https://alpha.example/p/produit-test-b', 'https://alpha.example/p/produit-test-b?aff=test'),
  ('produit-test-b', 'beta.example',  'new', 'B-BETA',  'https://beta.example/p/produit-test-b',  NULL),
  ('produit-test-b', 'gamma.example', 'new', 'B-GAMMA', 'https://gamma.example/p/produit-test-b', NULL)
)
INSERT INTO offers (product_id, merchant_id, seller_name, condition, merchant_sku, merchant_url, affiliate_url, active)
SELECT p.id, m.id, NULL, v.condition, v.merchant_sku, v.merchant_url, v.affiliate_url, 1
  FROM v
  JOIN products AS p ON p.slug = v.product_slug
  JOIN merchants AS m ON m.domain = v.merchant_domain
 WHERE true
ON CONFLICT(merchant_url) DO NOTHING;

WITH v(merchant_url, price_cents, shipping_cents, availability, delivery_info, warranty_info, return_info, checked_at) AS (VALUES
  ('https://alpha.example/p/produit-test-a', 23900, 0,    'in_stock',     '2 à 3 jours', '2 ans', '30 jours', '2026-10-01T08:00:00Z'),
  ('https://alpha.example/p/produit-test-a', 22900, 0,    'in_stock',     '2 à 3 jours', '2 ans', '30 jours', '2026-10-08T08:00:00Z'),
  ('https://beta.example/p/produit-test-a',  22500, NULL, 'in_stock',     NULL,          '2 ans', '14 jours', '2026-10-01T08:00:00Z'),
  ('https://beta.example/p/produit-test-a',  21900, NULL, 'in_stock',     NULL,          '2 ans', '14 jours', '2026-10-08T08:00:00Z'),
  ('https://gamma.example/p/produit-test-a', 24900, 499,  'in_stock',     '5 jours',     '2 ans', '30 jours', '2026-10-01T08:00:00Z'),
  ('https://gamma.example/p/produit-test-a', 19900, 0,    'out_of_stock', NULL,          '2 ans', '30 jours', '2026-10-08T08:00:00Z'),
  ('https://alpha.example/p/produit-test-b', 32900, 990,  'unknown',      NULL,          '2 ans', '30 jours', '2026-10-01T08:00:00Z'),
  ('https://alpha.example/p/produit-test-b', 31900, 990,  'in_stock',     '48 h',        '2 ans', '30 jours', '2026-10-08T08:00:00Z'),
  ('https://beta.example/p/produit-test-b',  33900, 0,    'in_stock',     '3 jours',     '2 ans', '14 jours', '2026-10-01T08:00:00Z'),
  ('https://beta.example/p/produit-test-b',  32900, 0,    'in_stock',     '3 jours',     '2 ans', '14 jours', '2026-10-08T08:00:00Z'),
  ('https://gamma.example/p/produit-test-b', 30900, NULL, 'unknown',      NULL,          '2 ans', '30 jours', '2026-10-01T08:00:00Z'),
  ('https://gamma.example/p/produit-test-b', 29900, NULL, 'preorder',     'Sortie prévue sous 3 semaines', '2 ans', '30 jours', '2026-10-08T08:00:00Z')
)
INSERT INTO offer_snapshots (offer_id, price_cents, shipping_cents, availability, delivery_info, warranty_info, return_info, source, checked_at)
SELECT o.id, v.price_cents, v.shipping_cents, v.availability, v.delivery_info, v.warranty_info, v.return_info, 'seed', v.checked_at
  FROM v
  JOIN offers AS o ON o.merchant_url = v.merchant_url
 WHERE NOT EXISTS (
   SELECT 1 FROM offer_snapshots AS s
    WHERE s.offer_id = o.id AND s.checked_at = v.checked_at AND s.source = 'seed'
 );

INSERT INTO pages (slug, template, "group", main_product_id, signal_at, started_at, published_at, hours_spent)
SELECT v.column1, 'meilleur-prix', 'durable', p.id, NULL, '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', 0
  FROM (VALUES
    ('produit-test-a-meilleur-prix', 'produit-test-a'),
    ('produit-test-b-meilleur-prix', 'produit-test-b')
  ) AS v
  JOIN products AS p ON p.slug = v.column2
 WHERE true
ON CONFLICT(slug) DO NOTHING;

WITH v(page_slug, merchant_url, role, position, is_recommended, valid_from, valid_to) AS (VALUES
  ('produit-test-a-meilleur-prix', 'https://alpha.example/p/produit-test-a', 'offre', 1, 0, '2026-10-01T00:00:00Z', '2026-10-08T00:00:00Z'),
  ('produit-test-a-meilleur-prix', 'https://alpha.example/p/produit-test-a', 'offre', 1, 1, '2026-10-08T00:00:00Z', NULL),
  ('produit-test-a-meilleur-prix', 'https://beta.example/p/produit-test-a',  'offre', 2, 0, '2026-10-01T00:00:00Z', NULL),
  ('produit-test-a-meilleur-prix', 'https://gamma.example/p/produit-test-a', 'offre', 3, 0, '2026-10-01T00:00:00Z', NULL),
  ('produit-test-b-meilleur-prix', 'https://alpha.example/p/produit-test-b', 'offre', 1, 1, '2026-10-01T00:00:00Z', NULL),
  ('produit-test-b-meilleur-prix', 'https://beta.example/p/produit-test-b',  'offre', 2, 0, '2026-10-01T00:00:00Z', NULL),
  ('produit-test-b-meilleur-prix', 'https://gamma.example/p/produit-test-b', 'offre', 3, 0, '2026-10-01T00:00:00Z', NULL)
)
INSERT INTO page_offers (page_id, offer_id, role, position, is_recommended, valid_from, valid_to)
SELECT pg.id, o.id, v.role, v.position, v.is_recommended, v.valid_from, v.valid_to
  FROM v
  JOIN pages AS pg ON pg.slug = v.page_slug
  JOIN offers AS o ON o.merchant_url = v.merchant_url
 WHERE NOT EXISTS (
   SELECT 1 FROM page_offers AS x
    WHERE x.page_id = pg.id AND x.offer_id = o.id AND x.valid_from = v.valid_from
 );
