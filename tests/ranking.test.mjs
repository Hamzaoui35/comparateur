// Ordre d'affichage et règles de livraison (src/lib/ranking.ts, src/lib/format.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankOffers, totalCents } from '../src/lib/ranking.ts';
import { shippingLabel } from '../src/lib/format.ts';

const offer = (id, price_cents, shipping_cents, availability) => ({ id, price_cents, shipping_cents, availability });

test('ordre : stock + livraison connue → stock + livraison inconnue → précommande → inconnue → rupture', () => {
  const ranked = rankOffers([
    offer('rupture', 100, 0, 'out_of_stock'),
    offer('inconnue', 150, 0, 'unknown'),
    offer('precommande', 200, 0, 'preorder'),
    offer('stock-livraison-inconnue', 120, null, 'in_stock'),
    offer('stock-cher', 300, 0, 'in_stock'),
    offer('stock-total-bas', 250, 10, 'in_stock'),
  ]);
  assert.deepEqual(ranked.map((o) => o.id), [
    'stock-total-bas', 'stock-cher', 'stock-livraison-inconnue', 'precommande', 'inconnue', 'rupture',
  ]);
});

test('groupe 1 trié sur prix + livraison, pas sur le prix seul', () => {
  const ranked = rankOffers([offer('a', 200, 50, 'in_stock'), offer('b', 220, 0, 'in_stock')]);
  assert.deepEqual(ranked.map((o) => o.id), ['b', 'a']);
});

test('livraison inconnue : jamais comptée comme gratuite', () => {
  assert.equal(totalCents(offer('x', 1000, null, 'in_stock')), null);
  assert.equal(totalCents(offer('y', 1000, 0, 'in_stock')), 1000);
  assert.equal(shippingLabel(null), 'Livraison à vérifier');
  assert.equal(shippingLabel(0), 'Livraison offerte');
});
