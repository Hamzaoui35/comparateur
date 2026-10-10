-- 0002_product_media.sql — médias produit avec provenance et base de droit explicites.
-- Aucun média ne doit être affiché sans droit commercial documenté.

CREATE TABLE product_media (
  id           INTEGER PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          TEXT    NOT NULL,
  alt_text     TEXT    NOT NULL,
  role         TEXT    NOT NULL CHECK (role IN ('primary', 'gallery')),
  position     INTEGER NOT NULL CHECK (position >= 1),
  source_url   TEXT    NOT NULL,
  rights_basis TEXT    NOT NULL CHECK (
    rights_basis IN ('owned', 'licensed', 'affiliate_feed', 'manufacturer_permission', 'public_domain')
  ),
  rights_note  TEXT    NOT NULL,
  checked_at   TEXT    NOT NULL,
  UNIQUE (product_id, role, position)
);

CREATE INDEX ix_product_media_product ON product_media(product_id, role, position);
