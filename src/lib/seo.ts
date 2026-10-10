import type { ComparisonPage, PageOfferRow, ProductMedia } from './comparison';

const euros = (cents: number) => Number((cents / 100).toFixed(2));

export function productJsonLd(
  page: ComparisonPage,
  offers: readonly PageOfferRow[],
  media: readonly ProductMedia[],
  canonicalUrl: string,
) {
  if (!page.brand || !page.model || offers.length === 0) return null;

  const prices = offers.map((offer) => offer.price_cents).filter(Number.isFinite);
  if (prices.length === 0) return null;

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${page.brand} ${page.model}`,
    url: canonicalUrl,
    brand: { '@type': 'Brand', name: page.brand },
    category: page.category?.replaceAll('-', ' ') ?? undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: euros(Math.min(...prices)),
      highPrice: euros(Math.max(...prices)),
      offerCount: offers.length,
    },
  };

  if (page.gtin && /^\d{13}$/.test(page.gtin)) product.gtin13 = page.gtin;
  else if (page.gtin) product.gtin = page.gtin;
  if (page.mpn) product.mpn = page.mpn;

  const images = media.map((item) => item.url);
  if (images.length > 0) product.image = images;

  return product;
}

export function breadcrumbJsonLd(productName: string, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: new URL('/', canonicalUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: productName,
        item: canonicalUrl,
      },
    ],
  };
}

export function websiteJsonLd(homeUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Comparateur',
    url: homeUrl,
    inLanguage: 'fr-FR',
  };
}
