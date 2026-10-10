-- seed/exemple-ajout-produit.sql — modèle pour ajouter un produit UNIQUEMENT par les données.
-- Sert aussi de preuve B (phase 1) : un 3e produit fictif obtient sa page sans aucune modification du code.
-- Aucun id explicite : tout est retrouvé par clé naturelle, le fichier est rejouable sans doublon.

INSERT INTO products (slug, brand, model, category, gtin, mpn, manufacturer_url) VALUES
  ('produit-test-c', 'MarqueTest', 'Produit Test C', 'categorie-test', NULL, 'MT-C', 'https://marquetest.example/produit-test-c')
ON CONFLICT(slug) DO NOTHING;

WITH v(product_slug, merchant_domain, condition, merchant_sku, merchant_url, affiliate_url) AS (VALUES
  ('produit-test-c', 'alpha.example', 'new', 'C-ALPHA', 'https://alpha.example/p/produit-test-c', 'https://alpha.example/p/produit-test-c?aff=test'),
  ('produit-test-c', 'beta.example',  'new', 'C-BETA',  'https://beta.example/p/produit-test-c',  NULL)
)
INSERT INTO offers (product_id, merchant_id, seller_name, condition, merchant_sku, merchant_url, affiliate_url, active)
SELECT p.id, m.id, NULL, v.condition, v.merchant_sku, v.merchant_url, v.affiliate_url, 1
  FROM v
  JOIN products AS p ON p.slug = v.product_slug
  JOIN merchants AS m ON m.domain = v.merchant_domain
 WHERE true
ON CONFLICT(merchant_url) DO NOTHING;

WITH v(merchant_url, price_cents, shipping_cents, availability, delivery_info, warranty_info, return_info, source, checked_at) AS (VALUES
  ('https://alpha.example/p/produit-test-c', 15900, 0,    'in_stock', '24 h', '2 ans', '30 jours', 'seed', '2026-10-09T08:00:00Z'),
  ('https://beta.example/p/produit-test-c',  14900, NULL, 'in_stock', NULL,   '2 ans', '14 jours', 'seed', '2026-10-09T08:00:00Z')
)
INSERT INTO offer_snapshots (offer_id, price_cents, shipping_cents, availability, delivery_info, warranty_info, return_info, source, checked_at)
SELECT o.id, v.price_cents, v.shipping_cents, v.availability, v.delivery_info, v.warranty_info, v.return_info, v.source, v.checked_at
  FROM v
  JOIN offers AS o ON o.merchant_url = v.merchant_url
 WHERE NOT EXISTS (
   SELECT 1 FROM offer_snapshots AS s
    WHERE s.offer_id = o.id AND s.checked_at = v.checked_at AND s.source = v.source
 );

INSERT INTO pages (slug, template, "group", main_product_id, signal_at, started_at, published_at, hours_spent)
SELECT 'produit-test-c-meilleur-prix', 'meilleur-prix', 'durable', p.id, NULL, '2026-10-09T00:00:00Z', '2026-10-09T00:00:00Z', 0
  FROM products AS p
 WHERE p.slug = 'produit-test-c'
ON CONFLICT(slug) DO NOTHING;

WITH v(page_slug, merchant_url, role, position, is_recommended, valid_from) AS (VALUES
  ('produit-test-c-meilleur-prix', 'https://alpha.example/p/produit-test-c', 'offre', 1, 1, '2026-10-09T00:00:00Z'),
  ('produit-test-c-meilleur-prix', 'https://beta.example/p/produit-test-c',  'offre', 2, 0, '2026-10-09T00:00:00Z')
)
INSERT INTO page_offers (page_id, offer_id, role, position, is_recommended, valid_from, valid_to)
SELECT pg.id, o.id, v.role, v.position, v.is_recommended, v.valid_from, NULL
  FROM v
  JOIN pages AS pg ON pg.slug = v.page_slug
  JOIN offers AS o ON o.merchant_url = v.merchant_url
 WHERE NOT EXISTS (
   SELECT 1 FROM page_offers AS x
    WHERE x.page_id = pg.id AND x.offer_id = o.id AND x.valid_from = v.valid_from
 );
