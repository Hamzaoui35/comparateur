// Ordre d'affichage des offres (règle « Ordre d'affichage » d'AGENTS.md).
// Module autonome (aucun import) : testé directement par node --test.

export type Availability = 'in_stock' | 'preorder' | 'out_of_stock' | 'unknown';

export interface RankableOffer {
  price_cents: number;
  shipping_cents: number | null; // null = livraison inconnue, jamais gratuite
  availability: Availability;
}

/**
 * 1 = en stock, livraison connue · 2 = en stock, livraison inconnue ·
 * 3 = précommande · 4 = disponibilité inconnue · 5 = rupture.
 */
export function rankGroup(offer: RankableOffer): number {
  switch (offer.availability) {
    case 'in_stock':
      return offer.shipping_cents === null ? 2 : 1;
    case 'preorder':
      return 3;
    case 'unknown':
      return 4;
    default:
      return 5;
  }
}

/** Prix total quand la livraison est connue, sinon null (jamais d'hypothèse « gratuite »). */
export function totalCents(offer: RankableOffer): number | null {
  return offer.shipping_cents === null ? null : offer.price_cents + offer.shipping_cents;
}

function sortValue(offer: RankableOffer): number {
  return rankGroup(offer) === 1 ? offer.price_cents + (offer.shipping_cents ?? 0) : offer.price_cents;
}

/** Trie sans modifier le tableau d'origine ; à égalité, l'ordre d'entrée est conservé. */
export function rankOffers<T extends RankableOffer>(offers: readonly T[]): T[] {
  return [...offers].sort((a, b) => rankGroup(a) - rankGroup(b) || sortValue(a) - sortValue(b));
}
