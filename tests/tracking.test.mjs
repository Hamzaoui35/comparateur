import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTrackingToken,
  isLikelyBot,
  makeGoHref,
  parsePositiveInt,
  resolveOutboundUrl,
  sanitizeTrackingValue,
  shouldCountView,
  trackingContext,
} from '../src/lib/tracking.ts';

test('UTM : source/campagne/contenu sont bornés et nettoyés', () => {
  const request = new Request(
    'https://site.example/p?utm_source=%20google%00&utm_campaign=automne&utm_content=bouton-a',
    { headers: { 'x-comparateur-internal-test': '1', 'user-agent': 'Mozilla/5.0' } },
  );
  const context = trackingContext(request, 'direct');
  assert.deepEqual(context, {
    source: 'google',
    utm_campaign: 'automne',
    utm_content: 'bouton-a',
    internal_test: 1,
    bot_suspected: 0,
  });
  assert.equal(sanitizeTrackingValue('x'.repeat(150))?.length, 100);
});

test('source de repli et détection bot sans persister le User-Agent', () => {
  const request = new Request('https://site.example/p', { headers: { 'user-agent': 'Googlebot/2.1' } });
  const context = trackingContext(request, 'direct');
  assert.equal(context.source, 'direct');
  assert.equal(context.bot_suspected, 1);
  assert.equal(isLikelyBot('Mozilla/5.0 Safari/537.36'), false);
  assert.equal(isLikelyBot('curl/8.0'), true);
});

test('vues : GET normal compté, HEAD/prefetch/prerender ignorés', () => {
  assert.equal(shouldCountView(new Request('https://site.example/p')), true);
  assert.equal(shouldCountView(new Request('https://site.example/p', { method: 'HEAD' })), false);
  assert.equal(shouldCountView(new Request('https://site.example/p', { headers: { purpose: 'prefetch' } })), false);
  assert.equal(shouldCountView(new Request('https://site.example/p', { headers: { 'sec-purpose': 'prefetch;prerender' } })), false);
});

test('tracking_token : 18 caractères alphanumériques et pratiquement uniques', () => {
  const tokens = new Set(Array.from({ length: 200 }, () => generateTrackingToken()));
  assert.equal(tokens.size, 200);
  for (const token of tokens) {
    assert.match(token, /^[A-Za-z0-9]{18}$/);
  }
});

test('identifiants positifs stricts', () => {
  assert.equal(parsePositiveInt('42'), 42);
  assert.equal(parsePositiveInt('0'), null);
  assert.equal(parsePositiveInt('-1'), null);
  assert.equal(parsePositiveInt('2.5'), null);
  assert.equal(parsePositiveInt('abc'), null);
  assert.equal(parsePositiveInt(null), null);
});

test('/go conserve seulement les UTM autorisés', () => {
  const params = new URLSearchParams('utm_source=google&utm_campaign=c1&utm_content=b1&secret=non');
  const href = makeGoHref(12, 34, params);
  assert.equal(href, '/go/12?s=34&utm_source=google&utm_campaign=c1&utm_content=b1');
});

test('destination sortante : HTTP(S) seulement et placeholder token supporté', () => {
  assert.equal(
    resolveOutboundUrl('https://merchant.example/p?sub={tracking_token}', 'AbC123'),
    'https://merchant.example/p?sub=AbC123',
  );
  assert.equal(resolveOutboundUrl('http://merchant.example/p', 'AbC123'), 'http://merchant.example/p');
  assert.equal(resolveOutboundUrl('javascript:alert(1)', 'AbC123'), null);
  assert.equal(resolveOutboundUrl('ftp://merchant.example/p', 'AbC123'), null);
});
