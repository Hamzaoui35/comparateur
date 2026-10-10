// Lecture D1 d'une page comparative : pages → page_offers actives → offers → products → merchants → current_offers.
// Aucune donnée produit ici : tout vient de la base.
import type { Availability } from './ranking';

export interface ComparisonPage {
  id: number;
  slug: string;
  template: string;
  main_product_id: number | null;
  brand: string | null;
  model: string | null;
  category: string | null;
}

export interface PageOfferRow {
  page_offer_id: number;
  position: number;
  is_recommended: number;
  product_id: number;
  product_slug: string;
  brand: string;
  model: string;
  merchant_name: string;
  seller_name: string | null; // vendeur tiers (marketplace) ; null = vendu par le marchand lui-même ou non précisé
  offer_id: number;
  snapshot_id: number;
  price_cents: number;
  shipping_cents: number | null;
  availability: Availability;
  delivery_info: string | null;
  checked_at: string;
  merchant_url: string;
  affiliate_url: string | null;
}

export interface ProductGroup {
  product_id: number;
  product_slug: string;
  brand: string;
  model: string;
  offers: PageOfferRow[];
}

/** Page publiée correspondant au slug, sinon null (→ 404). */
export async function getPublishedPage(db: D1Database, slug: string): Promise<ComparisonPage | null> {
  return db
    .prepare(
      `SELECT pg.id, pg.slug, pg.template, pg.main_product_id, p.brand, p.model, p.category
         FROM pages pg LEFT JOIN products p ON p.id = pg.main_product_id
        WHERE pg.slug = ?1 AND pg.published_at IS NOT NULL`,
    )
    .bind(slug)
    .first<ComparisonPage>();
}

/** Vitrine SSR : pages publiées, sans les produits dont les seules preuves sont des seeds.
 * Un produit publié sans offre reste visible. Aucun catalogue ni nom en dur.
 */
export async function getPublishedComparisons(db: D1Database): Promise<ComparisonPage[]> {
  const { results } = await db.prepare(
    `SELECT pg.id, pg.slug, pg.template, pg.main_product_id, p.brand, p.model, p.category
       FROM pages pg JOIN products p ON p.id = pg.main_product_id
      WHERE pg.published_at IS NOT NULL
        AND (NOT EXISTS (
          SELECT 1 FROM offers o JOIN offer_snapshots s ON s.offer_id = o.id WHERE o.product_id = p.id
        ) OR EXISTS (
          SELECT 1 FROM offers o JOIN offer_snapshots s ON s.offer_id = o.id
           WHERE o.product_id = p.id AND s.source <> 'seed'
        ))
      ORDER BY pg.published_at DESC, pg.id ASC`,
  ).all<ComparisonPage>();
  return results;
}

/** Offres actives de la page avec leur dernier relevé (offres sans relevé ou désactivées exclues). */
export async function getActiveOffers(db: D1Database, pageId: number): Promise<PageOfferRow[]> {
  const { results } = await db
    .prepare(
      `SELECT po.id            AS page_offer_id,
              po.position,
              po.is_recommended,
              p.id             AS product_id,
              p.slug           AS product_slug,
              p.brand,
              p.model,
              m.name           AS merchant_name,
              co.seller_name,
              co.offer_id,
              co.snapshot_id,
              co.price_cents,
              co.shipping_cents,
              co.availability,
              co.delivery_info,
              co.checked_at,
              co.merchant_url,
              co.affiliate_url
         FROM page_offers    AS po
         JOIN current_offers AS co ON co.offer_id = po.offer_id
         JOIN products       AS p  ON p.id = co.product_id
         JOIN merchants      AS m  ON m.id = co.merchant_id
        WHERE po.page_id = ?1
          AND po.valid_to IS NULL
          AND co.active = 1
        ORDER BY po.position, po.id`,
    )
    .bind(pageId)
    .all<PageOfferRow>();
  return results;
}

/** Regroupe par produit en conservant l'ordre d'apparition (position sur la page). */
export function groupByProduct(rows: readonly PageOfferRow[]): ProductGroup[] {
  const groups = new Map<number, ProductGroup>();
  for (const row of rows) {
    let group = groups.get(row.product_id);
    if (!group) {
      group = {
        product_id: row.product_id,
        product_slug: row.product_slug,
        brand: row.brand,
        model: row.model,
        offers: [],
      };
      groups.set(row.product_id, group);
    }
    group.offers.push(row);
  }
  return [...groups.values()];
}
