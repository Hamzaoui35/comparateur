const UTM_MAX_LENGTH = 100;
const TOKEN_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
export const INTERNAL_TEST_HEADER = 'x-comparateur-internal-test';

export interface TrackingContext {
  source: string;
  utm_campaign: string | null;
  utm_content: string | null;
  internal_test: 0 | 1;
  bot_suspected: 0 | 1;
}

export interface OutboundTarget {
  page_offer_id: number;
  page_id: number;
  offer_id: number;
  merchant_url: string;
  affiliate_url: string | null;
}

export function sanitizeTrackingValue(value: string | null, maxLength = UTM_MAX_LENGTH): string | null {
  if (value === null) return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
  return cleaned || null;
}

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /(bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|curl\b|wget\b|python-requests|httpclient)/i.test(userAgent);
}

export function isInternalTest(request: Request): boolean {
  return request.headers.get(INTERNAL_TEST_HEADER) === '1';
}

export function shouldCountView(request: Request): boolean {
  if (request.method.toUpperCase() !== 'GET') return false;
  for (const header of ['purpose', 'sec-purpose']) {
    const value = request.headers.get(header)?.toLowerCase() ?? '';
    if (value.includes('prefetch') || value.includes('prerender')) return false;
  }
  return true;
}

export function trackingContext(request: Request, fallbackSource: string): TrackingContext {
  const url = new URL(request.url);
  return {
    source: sanitizeTrackingValue(url.searchParams.get('utm_source')) ?? fallbackSource,
    utm_campaign: sanitizeTrackingValue(url.searchParams.get('utm_campaign')),
    utm_content: sanitizeTrackingValue(url.searchParams.get('utm_content')),
    internal_test: isInternalTest(request) ? 1 : 0,
    bot_suspected: isLikelyBot(request.headers.get('user-agent')) ? 1 : 0,
  };
}

export function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function generateTrackingToken(length = 18): string {
  if (!Number.isInteger(length) || length < 8 || length > 20) {
    throw new Error('tracking token length must be an integer between 8 and 20');
  }

  let token = '';
  while (token.length < length) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      // 252 = floor(256 / 36) * 36: rejection avoids modulo bias.
      // Lowercase + digits keeps the token compatible with affiliate-network constraints such as Awin ClickRef.
      if (byte >= 252) continue;
      token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
      if (token.length === length) break;
    }
  }
  return token;
}

export function makeGoHref(pageOfferId: number, snapshotId: number, sourceParams: URLSearchParams): string {
  const params = new URLSearchParams({ s: String(snapshotId) });
  for (const key of ['utm_source', 'utm_campaign', 'utm_content'] as const) {
    const value = sanitizeTrackingValue(sourceParams.get(key));
    if (value) params.set(key, value);
  }
  return `/go/${pageOfferId}?${params.toString()}`;
}

export function resolveOutboundUrl(rawUrl: string, trackingToken: string): string | null {
  const substituted = rawUrl.replaceAll('{tracking_token}', trackingToken);
  try {
    const url = new URL(substituted);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function recordPageView(db: D1Database, pageId: number, request: Request): Promise<boolean> {
  if (!shouldCountView(request)) return false;
  const context = trackingContext(request, 'direct');
  try {
    await db.prepare(
      `INSERT INTO views
        (page_id, source, utm_campaign, utm_content, internal_test, bot_suspected, viewed_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(
        pageId,
        context.source,
        context.utm_campaign,
        context.utm_content,
        context.internal_test,
        context.bot_suspected,
        new Date().toISOString(),
      )
      .run();
    return true;
  } catch (error) {
    console.warn('view tracking failed', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}

export async function getOutboundTarget(db: D1Database, pageOfferId: number): Promise<OutboundTarget | null> {
  return db
    .prepare(
      `SELECT po.id AS page_offer_id,
              po.page_id,
              o.id AS offer_id,
              o.merchant_url,
              o.affiliate_url
         FROM page_offers AS po
         JOIN pages AS p ON p.id = po.page_id
         JOIN offers AS o ON o.id = po.offer_id
        WHERE po.id = ?1
          AND p.published_at IS NOT NULL`,
    )
    .bind(pageOfferId)
    .first<OutboundTarget>();
}

export async function matchingSnapshotId(
  db: D1Database,
  requestedSnapshotId: number | null,
  offerId: number,
): Promise<number | null> {
  if (requestedSnapshotId === null) return null;
  try {
    const row = await db
      .prepare('SELECT id FROM offer_snapshots WHERE id = ?1 AND offer_id = ?2')
      .bind(requestedSnapshotId, offerId)
      .first<{ id: number }>();
    return row?.id ?? null;
  } catch (error) {
    console.warn('snapshot validation failed', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

export async function recordOutboundClick(
  db: D1Database,
  target: OutboundTarget,
  snapshotId: number | null,
  request: Request,
): Promise<{ token: string; recorded: boolean }> {
  const context = trackingContext(request, 'site');
  const affiliateActive = sanitizeTrackingValue(target.affiliate_url) ? 1 : 0;
  let token = generateTrackingToken();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.prepare(
        `INSERT INTO clicks
          (tracking_token, page_id, page_offer_id, offer_snapshot_id, type, affiliate_active,
           source, utm_campaign, utm_content, internal_test, bot_suspected, clicked_at)
         VALUES (?1, ?2, ?3, ?4, 'offer', ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
        .bind(
          token,
          target.page_id,
          target.page_offer_id,
          snapshotId,
          affiliateActive,
          context.source,
          context.utm_campaign,
          context.utm_content,
          context.internal_test,
          context.bot_suspected,
          new Date().toISOString(),
        )
        .run();
      return { token, recorded: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unique/i.test(message) && /tracking_token/i.test(message) && attempt < 2) {
        token = generateTrackingToken();
        continue;
      }
      console.warn('click tracking failed', message);
      return { token, recorded: false };
    }
  }

  return { token, recorded: false };
}
