# SCHEMA — source de vérité du modèle D1

Implémentation : migrations/0001_init.sql. Toute évolution passe par une nouvelle migration, jamais par la modification d'une migration déjà appliquée.
Conventions : montants en centimes (INTEGER), dates UTC ISO 8601 (TEXT), booléens 0/1. `?` = colonne facultative (NULL autorisé).

```
-- RAW
signals         (id, run_id? → job_runs, source, metric, subject, subject_key,
                 product_id? → products, page_id? → pages, value, reference_value,
                 url?, cause?, is_promotion, observed_at,
                 observed_day GENERATED ALWAYS AS (date(observed_at)) STORED)
offer_snapshots (id, offer_id → offers, price_cents, shipping_cents?, availability,
                 delivery_info?, warranty_info?, return_info?, source, checked_at)
views           (id, page_id → pages, source, utm_campaign?, utm_content?,
                 internal_test, bot_suspected, viewed_at)
clicks          (id, tracking_token, page_id → pages, page_offer_id? → page_offers,
                 offer_snapshot_id? → offer_snapshots, type, affiliate_active,
                 source, utm_campaign?, utm_content?, internal_test, bot_suspected, clicked_at)
sales           (id, network, tracking_token → clicks, order_date, amount_cents,
                 commission_cents, status, status_updated_at)
-- CORE
products        (id, slug, brand, model, category, gtin?, mpn?, manufacturer_url)
product_specs   (id, product_id → products, spec_key, value_num?, value_text?, unit?,
                 source_url, checked_at)
merchants       (id, name, domain, affiliate_network?)
offers          (id, product_id → products, merchant_id → merchants, seller_name?,
                 condition, merchant_sku?, merchant_url, affiliate_url?, active)
pages           (id, slug, template, group, main_product_id? → products,
                 signal_at?, started_at, published_at?, hours_spent)
page_offers     (id, page_id → pages, offer_id → offers, role, position,
                 is_recommended, valid_from, valid_to?)
watch_terms     (id, term, kind, category, product_id? → products, active, added_at)
-- MART
fact_product_daily (product_id → products, day, metric, value, run_id → job_runs)
-- DÉCISIONS
trend_candidates (id, subject_key, category, product_id? → products, score, score_version,
                  reasons, status, first_seen_at, last_scored_at, decided_at?,
                  decision_note?, page_id? → pages)
product_reviews  (id, product_id → products, reviewed_at, trend_score, performance_score,
                  performance_is_estimated, offers_ok, score_version, reasons, decision,
                  successor_product_id? → products, note?)
-- TECHNIQUE
job_runs        (id, job, started_at, finished_at?, status, watermark_from?, watermark_to?,
                 items_read, items_written, error?)
-- VUE
current_offers = dernier offer_snapshot de chaque offre (ROW_NUMBER par offer_id, ORDER BY checked_at DESC, id DESC)
```

## Contraintes

UNIQUE : products.slug · merchants.domain · offers.merchant_url · pages.slug ·
clicks.tracking_token · product_specs(product_id, spec_key) ·
signals(source, metric, subject_key, observed_day) · fact_product_daily(product_id, day, metric).

INDEX UNIQUES PARTIELS :
- products(gtin) WHERE gtin IS NOT NULL ;
- page_offers(page_id, offer_id) WHERE valid_to IS NULL → plusieurs lignes fermées autorisées, jamais deux lignes actives pour le même couple. Aucun UNIQUE classique sur (page_id, offer_id).

Si D1 refuse la colonne générée observed_day : index unique d'expression équivalent sur (source, metric, subject_key, date(observed_at)), décision notée.

CHECK : availability ∈ {in_stock, preorder, out_of_stock, unknown} · watch_terms.kind ∈ {discovery, monitoring} ·
trend_candidates.status ∈ {new, watching, accepted, rejected, expired} ·
product_reviews.decision ∈ {push, keep, watch, replace} · tous les booléens ∈ {0, 1}.

INDEX : offer_snapshots(offer_id, checked_at) · offers(product_id) · page_offers(page_id, valid_to) ·
views(page_id, viewed_at) · clicks(page_id, clicked_at) · signals(product_id, observed_at) · sales(tracking_token).

## Règles d'usage
- Le prix courant vient toujours de current_offers, jamais d'une copie dans offers.
- shipping_cents NULL = livraison inconnue (jamais gratuite).
- page_offers historisée : fermer (valid_to) puis insérer, jamais réécrire.
- Tables RAW en ajout seul, sauf purge imposée par les conditions d'une source.
