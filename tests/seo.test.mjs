import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breadcrumbJsonLd, productJsonLd, websiteJsonLd } from '../src/lib/seo.ts';

const page = {
  id: 1,
  slug: 'produit-exemple',
  template: 'meilleur-prix',
  main_product_id: 1,
  published_at: '2026-10-10T00:00:00Z',
  brand: 'Marque Exemple',
  model: 'Modèle X',
  category: 'categorie-test',
  gtin: '4006381333931',
  mpn: null,
  manufacturer_url: 'https://fabricant.invalid/p',
  image_url: null,
  image_alt: null,
  last_checked_at: '2026-10-10T12:00:00Z',
};

const offers = [
  { price_cents: 12999 },
  { price_cents: 14950 },
  { price_cents: 13900 },
];

test('SEO Product : comparatif → AggregateOffer avec GTIN et image autorisée', () => {
  const media = [{
    id: 1,
    product_id: 1,
    url: 'https://cdn.invalid/p.webp',
    alt_text: 'Marque Exemple Modèle X',
    role: 'primary',
    position: 1,
    source_url: 'https://licence.invalid/p',
    rights_basis: 'licensed',
    rights_note: 'Licence de test',
    checked_at: '2026-10-10T00:00:00Z',
  }];
  const json = productJsonLd(page, offers, media, 'https://site.invalid/comparatifs/produit-exemple');
  assert.equal(json['@type'], 'Product');
  assert.equal(json.name, 'Marque Exemple Modèle X');
  assert.equal(json.gtin13, '4006381333931');
  assert.deepEqual(json.image, ['https://cdn.invalid/p.webp']);
  assert.deepEqual(json.offers, {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    lowPrice: 129.99,
    highPrice: 149.5,
    offerCount: 3,
  });
});

test('SEO Product : aucune image inventée et aucune donnée produit sans offre', () => {
  const json = productJsonLd(page, offers, [], 'https://site.invalid/comparatifs/produit-exemple');
  assert.equal('image' in json, false);
  assert.equal(productJsonLd(page, [], [], 'https://site.invalid/comparatifs/produit-exemple'), null);
});

test('SEO : WebSite et BreadcrumbList restent cohérents', () => {
  const website = websiteJsonLd('https://site.invalid/');
  assert.equal(website['@type'], 'WebSite');
  const breadcrumb = breadcrumbJsonLd('Marque Exemple Modèle X', 'https://site.invalid/comparatifs/produit-exemple');
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.equal(breadcrumb.itemListElement.length, 2);
  assert.equal(breadcrumb.itemListElement[1].item, 'https://site.invalid/comparatifs/produit-exemple');
});
