-- 0001_init.sql — schéma initial (source de vérité : docs/SCHEMA.md)
-- Conventions : montants en centimes (INTEGER), dates UTC ISO 8601 (TEXT), booléens 0/1.
-- "group" est un mot réservé SQL : toujours l'écrire entre guillemets doubles.

-- ============================================================ TECHNIQUE
CREATE TABLE job_runs (
  id             INTEGER PRIMARY KEY,
  job            TEXT    NOT NULL,
  started_at     TEXT    NOT NULL,
  finished_at    TEXT,
  status         TEXT    NOT NULL,
  watermark_from TEXT,
  watermark_to   TEXT,
  items_read     INTEGER NOT NULL DEFAULT 0,
  items_written  INTEGER NOT NULL DEFAULT 0,
  error          TEXT
);

-- ============================================================ CORE
CREATE TABLE products (
  id               INTEGER PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  brand            TEXT NOT NULL,
  model            TEXT NOT NULL,
  category         TEXT NOT NULL,
  gtin             TEXT,
  mpn              TEXT,
  manufacturer_url TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_products_gtin ON products(gtin) WHERE gtin IS NOT NULL;

CREATE TABLE product_specs (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  spec_key   TEXT    NOT NULL,
  value_num  REAL,
  value_text TEXT,
  unit       TEXT,
  source_url TEXT    NOT NULL,
  checked_at TEXT    NOT NULL,
  UNIQUE (product_id, spec_key)
);

CREATE TABLE merchants (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  domain            TEXT NOT NULL UNIQUE,
  affiliate_network TEXT
);

CREATE TABLE offers (
  id            INTEGER PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  merchant_id   INTEGER NOT NULL REFERENCES merchants(id),
  seller_name   TEXT,
  condition     TEXT    NOT NULL,
  merchant_sku  TEXT,
  merchant_url  TEXT    NOT NULL UNIQUE,
  affiliate_url TEXT,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE INDEX ix_offers_product ON offers(product_id);

CREATE TABLE pages (
  id              INTEGER PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  template        TEXT    NOT NULL,
  "group"         TEXT    NOT NULL,
  main_product_id INTEGER REFERENCES products(id),
  signal_at       TEXT,
  started_at      TEXT    NOT NULL,
  published_at    TEXT,
  hours_spent     REAL    NOT NULL DEFAULT 0
);

CREATE TABLE page_offers (
  id             INTEGER PRIMARY KEY,
  page_id        INTEGER NOT NULL REFERENCES pages(id),
  offer_id       INTEGER NOT NULL REFERENCES offers(id),
  role           TEXT    NOT NULL,
  position       INTEGER NOT NULL,
  is_recommended INTEGER NOT NULL DEFAULT 0 CHECK (is_recommended IN (0, 1)),
  valid_from     TEXT    NOT NULL,
  valid_to       TEXT,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE UNIQUE INDEX ux_page_offers_active ON page_offers(page_id, offer_id) WHERE valid_to IS NULL;
CREATE INDEX ix_page_offers_page_valid ON page_offers(page_id, valid_to);

CREATE TABLE watch_terms (
  id         INTEGER PRIMARY KEY,
  term       TEXT    NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('discovery', 'monitoring')),
  category   TEXT    NOT NULL,
  product_id INTEGER REFERENCES products(id),
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  added_at   TEXT    NOT NULL
);

-- ============================================================ RAW
CREATE TABLE offer_snapshots (
  id             INTEGER PRIMARY KEY,
  offer_id       INTEGER NOT NULL REFERENCES offers(id),
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  shipping_cents INTEGER CHECK (shipping_cents IS NULL OR shipping_cents >= 0),
  availability   TEXT    NOT NULL CHECK (availability IN ('in_stock', 'preorder', 'out_of_stock', 'unknown')),
  delivery_info  TEXT,
  warranty_info  TEXT,
  return_info    TEXT,
  source         TEXT    NOT NULL,
  checked_at     TEXT    NOT NULL
);
CREATE INDEX ix_offer_snapshots_offer_checked ON offer_snapshots(offer_id, checked_at);

CREATE TABLE views (
  id            INTEGER PRIMARY KEY,
  page_id       INTEGER NOT NULL REFERENCES pages(id),
  source        TEXT    NOT NULL,
  utm_campaign  TEXT,
  utm_content   TEXT,
  internal_test INTEGER NOT NULL DEFAULT 0 CHECK (internal_test IN (0, 1)),
  bot_suspected INTEGER NOT NULL DEFAULT 0 CHECK (bot_suspected IN (0, 1)),
  viewed_at     TEXT    NOT NULL
);
CREATE INDEX ix_views_page_viewed ON views(page_id, viewed_at);

CREATE TABLE clicks (
  id                INTEGER PRIMARY KEY,
  tracking_token    TEXT    NOT NULL UNIQUE,
  page_id           INTEGER NOT NULL REFERENCES pages(id),
  page_offer_id     INTEGER REFERENCES page_offers(id),
  offer_snapshot_id INTEGER REFERENCES offer_snapshots(id),
  type              TEXT    NOT NULL,
  affiliate_active  INTEGER NOT NULL CHECK (affiliate_active IN (0, 1)),
  source            TEXT    NOT NULL,
  utm_campaign      TEXT,
  utm_content       TEXT,
  internal_test     INTEGER NOT NULL DEFAULT 0 CHECK (internal_test IN (0, 1)),
  bot_suspected     INTEGER NOT NULL DEFAULT 0 CHECK (bot_suspected IN (0, 1)),
  clicked_at        TEXT    NOT NULL
);
CREATE INDEX ix_clicks_page_clicked ON clicks(page_id, clicked_at);

CREATE TABLE sales (
  id                INTEGER PRIMARY KEY,
  network           TEXT    NOT NULL,
  tracking_token    TEXT    NOT NULL REFERENCES clicks(tracking_token),
  order_date        TEXT    NOT NULL,
  amount_cents      INTEGER NOT NULL,
  commission_cents  INTEGER NOT NULL,
  status            TEXT    NOT NULL,
  status_updated_at TEXT    NOT NULL
);
CREATE INDEX ix_sales_tracking_token ON sales(tracking_token);

CREATE TABLE signals (
  id              INTEGER PRIMARY KEY,
  run_id          INTEGER REFERENCES job_runs(id),
  source          TEXT    NOT NULL,
  metric          TEXT    NOT NULL,
  subject         TEXT    NOT NULL,
  subject_key     TEXT    NOT NULL,
  product_id      INTEGER REFERENCES products(id),
  page_id         INTEGER REFERENCES pages(id),
  value           REAL    NOT NULL,
  reference_value REAL    NOT NULL,
  url             TEXT,
  cause           TEXT,
  is_promotion    INTEGER NOT NULL DEFAULT 0 CHECK (is_promotion IN (0, 1)),
  observed_at     TEXT    NOT NULL CHECK (date(observed_at) IS NOT NULL),
  observed_day    TEXT    GENERATED ALWAYS AS (date(observed_at)) STORED,
  UNIQUE (source, metric, subject_key, observed_day)
);
CREATE INDEX ix_signals_product_observed ON signals(product_id, observed_at);

-- ============================================================ MART
CREATE TABLE fact_product_daily (
  product_id INTEGER NOT NULL REFERENCES products(id),
  day        TEXT    NOT NULL,
  metric     TEXT    NOT NULL,
  value      REAL    NOT NULL,
  run_id     INTEGER NOT NULL REFERENCES job_runs(id),
  PRIMARY KEY (product_id, day, metric)
);

-- ============================================================ DÉCISIONS
CREATE TABLE trend_candidates (
  id             INTEGER PRIMARY KEY,
  subject_key    TEXT    NOT NULL,
  category       TEXT    NOT NULL,
  product_id     INTEGER REFERENCES products(id),
  score          REAL    NOT NULL,
  score_version  TEXT    NOT NULL,
  reasons        TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'watching', 'accepted', 'rejected', 'expired')),
  first_seen_at  TEXT    NOT NULL,
  last_scored_at TEXT    NOT NULL,
  decided_at     TEXT,
  decision_note  TEXT,
  page_id        INTEGER REFERENCES pages(id)
);

CREATE TABLE product_reviews (
  id                       INTEGER PRIMARY KEY,
  product_id               INTEGER NOT NULL REFERENCES products(id),
  reviewed_at              TEXT    NOT NULL,
  trend_score              REAL    NOT NULL,
  performance_score        REAL    NOT NULL,
  performance_is_estimated INTEGER NOT NULL CHECK (performance_is_estimated IN (0, 1)),
  offers_ok                INTEGER NOT NULL CHECK (offers_ok IN (0, 1)),
  score_version            TEXT    NOT NULL,
  reasons                  TEXT    NOT NULL,
  decision                 TEXT    NOT NULL CHECK (decision IN ('push', 'keep', 'watch', 'replace')),
  successor_product_id     INTEGER REFERENCES products(id),
  note                     TEXT
);

-- ============================================================ VUE
CREATE VIEW current_offers AS
SELECT
  o.id AS offer_id,
  o.product_id,
  o.merchant_id,
  o.seller_name,
  o.condition,
  o.merchant_url,
  o.affiliate_url,
  o.active,
  s.id AS snapshot_id,
  s.price_cents,
  s.shipping_cents,
  s.availability,
  s.delivery_info,
  s.warranty_info,
  s.return_info,
  s.source,
  s.checked_at
FROM offers AS o
JOIN (
  SELECT os.*,
         ROW_NUMBER() OVER (PARTITION BY os.offer_id ORDER BY os.checked_at DESC, os.id DESC) AS rn
  FROM offer_snapshots AS os
) AS s ON s.offer_id = o.id AND s.rn = 1;
