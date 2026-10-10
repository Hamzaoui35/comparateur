import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import {
  getOutboundTarget,
  matchingSnapshotId,
  parsePositiveInt,
  recordOutboundClick,
  resolveOutboundUrl,
} from '../../lib/tracking';

export const prerender = false;

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  const pageOfferId = parsePositiveInt(params.pageOfferId);
  if (pageOfferId === null) return textResponse('Lien introuvable', 404);

  let target;
  try {
    target = await getOutboundTarget(env.DB, pageOfferId);
  } catch {
    return textResponse('Service temporairement indisponible', 503);
  }
  if (!target) return textResponse('Lien introuvable', 404);

  const rawDestination = target.affiliate_url?.trim() || target.merchant_url;
  if (!resolveOutboundUrl(rawDestination, 'ValidationToken')) {
    return textResponse('Destination invalide', 502);
  }

  const url = new URL(request.url);
  const requestedSnapshotId = parsePositiveInt(url.searchParams.get('s'));
  const snapshotId = await matchingSnapshotId(env.DB, requestedSnapshotId, target.offer_id);
  const { token } = await recordOutboundClick(env.DB, target, snapshotId, request);
  const destination = resolveOutboundUrl(rawDestination, token);

  if (!destination) return textResponse('Destination invalide', 502);

  return new Response(null, {
    status: 302,
    headers: {
      location: destination,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
