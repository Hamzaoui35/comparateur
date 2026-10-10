export const SITE_NAME = 'Comparateur';
export const SITE_ORIGIN = 'https://comparateur.aymen-for-pic.workers.dev';

export function absoluteSiteUrl(pathname = '/') {
  return new URL(pathname, SITE_ORIGIN).toString();
}
