// Formatage d'affichage (fr-FR). Module autonome : testé directement par node --test.

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });

const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: 'En stock',
  preorder: 'Précommande',
  out_of_stock: 'Rupture de stock',
  unknown: 'Disponibilité à vérifier',
};

export function formatCents(cents: number): string {
  return euros.format(cents / 100);
}

export function formatDate(isoUtc: string): string {
  return longDate.format(new Date(isoUtc));
}

export function formatDateTime(isoUtc: string): string {
  return dateTime.format(new Date(isoUtc));
}

export function shippingLabel(shippingCents: number | null): string {
  if (shippingCents === null) return 'Livraison à vérifier';
  if (shippingCents === 0) return 'Livraison offerte';
  return formatCents(shippingCents);
}

export function availabilityLabel(availability: string): string {
  return AVAILABILITY_LABELS[availability] ?? AVAILABILITY_LABELS.unknown;
}
