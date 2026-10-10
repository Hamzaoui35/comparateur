#!/usr/bin/env node
// Import de données commerciales vérifiées : imports/data (JSON) → validation → SQL idempotent → D1.
// - Aucune PK numérique : tout est retrouvé par clé naturelle (domain, slug, merchant_url, relevé daté).
// - Rejouable : 0 doublon ; les relevés (offer_snapshots) sont ajoutés, jamais modifiés ni supprimés.
// - Aucune suppression : un import ne retire rien de la base.
//
// Usage :
//   node scripts/import.mjs --check               valide imports/data, n'écrit rien
//   node scripts/import.mjs                        valide puis écrit le SQL sur la sortie standard
//   node scripts/import.mjs --out <fichier.sql>    valide puis écrit le SQL dans un fichier
//   node scripts/import.mjs --dir <répertoire>     autre répertoire de données (tests, fixtures)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AVAILABILITY = ['in_stock', 'preorder', 'out_of_stock', 'unknown'];
export const CONDITIONS = ['new', 'refurbished', 'used'];
export const AFFILIATION_STATUS = ['A', 'B', 'C'];
export const MEDIA_ROLES = ['primary', 'gallery'];
export const MEDIA_RIGHTS = ['owned', 'licensed', 'affiliate_feed', 'manufacturer_permission', 'public_domain'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const TEXT_MAX = 300;
// Marqueurs des fixtures de développement : interdits dans les imports de production.
const FIXTURE_MARKERS = [/\.example\b/i, /marquetest/i, /produit test/i];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = join(repoRoot, 'imports', 'data');

// ---------------------------------------------------------------- chargement

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function jsonFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
}

export function loadImportDir(dir = DEFAULT_DIR) {
  const merchantsFile = join(dir, 'merchants.json');
  const merchants = existsSync(merchantsFile) ? readJson(merchantsFile).merchants ?? [] : [];
  const products = jsonFiles(join(dir, 'products')).map((f) => ({
    file: `products/${f}`,
    ...readJson(join(dir, 'products', f)),
  }));
  const batches = jsonFiles(join(dir, 'snapshots')).map((f) => ({
    file: `snapshots/${f}`,
    ...readJson(join(dir, 'snapshots', f)),
  }));
  return { merchants, products, batches };
}

// ---------------------------------------------------------------- validation

export function isValidGtin(value) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** URL HTTPS sans identifiants ; le placeholder {tracking_token} est accepté. */
export function isSafeHttpsUrl(value) {
  if (typeof value !== 'string' || value.trim() !== value || value === '') return false;
  try {
    const url = new URL(value.replaceAll('{tracking_token}', 'TOKEN'));
    return url.protocol === 'https:' && url.hostname !== '' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export function hostMatchesDomain(urlValue, domain) {
  try {
    const host = new URL(urlValue.replaceAll('{tracking_token}', 'TOKEN')).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function isText(value, { nullable = true, max = TEXT_MAX } = {}) {
  if (value === null || value === undefined) return nullable;
  return typeof value === 'string' && value.trim() !== '' && value.length <= max;
}

export function validateImport(data, { forbidFixtures = true } = {}) {
  const errors = [];
  const err = (where, message) => errors.push(`${where} : ${message}`);

  const merchantDomains = new Set();
  data.merchants.forEach((m, i) => {
    const where = `merchants.json[${i}]`;
    if (typeof m.domain !== 'string' || !DOMAIN.test(m.domain)) err(where, `domain invalide (${m.domain})`);
    else if (merchantDomains.has(m.domain)) err(where, `domain en double (${m.domain})`);
    else merchantDomains.add(m.domain);
    if (!isText(m.name, { nullable: false })) err(where, 'name obligatoire');
    if (!isText(m.affiliate_network)) err(where, 'affiliate_network doit être null ou un texte');
    if (m.affiliation && !AFFILIATION_STATUS.includes(m.affiliation.status)) {
      err(where, `affiliation.status doit valoir ${AFFILIATION_STATUS.join('/')}`);
    }
  });

  const productSlugs = new Set();
  const pageSlugs = new Set();
  const gtins = new Set();
  const offerUrls = new Set();

  for (const entry of data.products) {
    const where = entry.file ?? 'products';
    const p = entry.product ?? {};
    if (typeof p.slug !== 'string' || !SLUG.test(p.slug)) err(where, `product.slug invalide (${p.slug})`);
    else if (productSlugs.has(p.slug)) err(where, `product.slug en double (${p.slug})`);
    else productSlugs.add(p.slug);
    for (const field of ['brand', 'model']) {
      if (!isText(p[field], { nullable: false, max: 120 })) err(where, `product.${field} obligatoire`);
    }
    if (typeof p.category !== 'string' || !SLUG.test(p.category)) err(where, 'product.category doit être un slug');
    if (p.gtin !== null && p.gtin !== undefined) {
      if (typeof p.gtin !== 'string' || !isValidGtin(p.gtin)) err(where, `product.gtin invalide (${p.gtin})`);
      else if (gtins.has(p.gtin)) err(where, `product.gtin en double (${p.gtin})`);
      else gtins.add(p.gtin);
    }
    if (!isText(p.mpn, { max: 80 })) err(where, 'product.mpn doit être null ou un texte');
    if (!isSafeHttpsUrl(p.manufacturer_url)) err(where, 'product.manufacturer_url doit être une URL https');

    if (entry.media !== undefined && !Array.isArray(entry.media)) err(where, 'media doit être un tableau');
    const media = Array.isArray(entry.media) ? entry.media : [];
    const mediaPositions = new Set();
    let primaryCount = 0;
    media.forEach((item, i) => {
      const at = `${where} media[${i}]`;
      if (!isSafeHttpsUrl(item.url)) err(at, 'url doit être une URL https');
      if (!isText(item.alt_text, { nullable: false, max: 220 })) err(at, 'alt_text obligatoire');
      if (!MEDIA_ROLES.includes(item.role)) err(at, `role doit valoir ${MEDIA_ROLES.join('/')}`);
      if (!Number.isSafeInteger(item.position) || item.position < 1) err(at, 'position doit être un entier >= 1');
      else if (mediaPositions.has(item.position)) err(at, `position en double (${item.position})`);
      else mediaPositions.add(item.position);
      if (item.role === 'primary') {
        primaryCount++;
        if (item.position !== 1) err(at, 'le média primary doit avoir position=1');
      } else if (item.role === 'gallery' && item.position === 1) {
        err(at, 'position=1 est réservée au média primary');
      }
      if (!isSafeHttpsUrl(item.source_url)) err(at, 'source_url doit être une URL https');
      if (!MEDIA_RIGHTS.includes(item.rights_basis)) {
        err(at, `rights_basis doit valoir ${MEDIA_RIGHTS.join('/')}`);
      }
      if (!isText(item.rights_note, { nullable: false, max: 300 })) err(at, 'rights_note obligatoire');
      if (typeof item.checked_at !== 'string' || !ISO_UTC.test(item.checked_at)) {
        err(at, 'checked_at doit être une date UTC ISO 8601');
      }
    });
    if (media.length > 0 && primaryCount !== 1) err(where, 'media doit contenir exactement un primary');

    const page = entry.page ?? {};
    if (typeof page.slug !== 'string' || !SLUG.test(page.slug)) err(where, `page.slug invalide (${page.slug})`);
    else if (pageSlugs.has(page.slug)) err(where, `page.slug en double (${page.slug})`);
    else pageSlugs.add(page.slug);
    if (typeof page.template !== 'string' || !SLUG.test(page.template)) err(where, 'page.template doit être un slug');
    if (typeof page.group !== 'string' || !SLUG.test(page.group)) err(where, 'page.group doit être un slug');
    if (typeof page.started_at !== 'string' || !ISO_UTC.test(page.started_at)) err(where, 'page.started_at doit être une date UTC ISO 8601');
    if (page.published_at !== null && (typeof page.published_at !== 'string' || !ISO_UTC.test(page.published_at))) {
      err(where, 'page.published_at doit être null ou une date UTC ISO 8601');
    }

    if (!Array.isArray(entry.offers) || entry.offers.length === 0) err(where, 'au moins une offre est requise');
    (entry.offers ?? []).forEach((o, i) => {
      const at = `${where} offers[${i}]`;
      if (!merchantDomains.has(o.merchant_domain)) err(at, `marchand inconnu (${o.merchant_domain})`);
      if (!isSafeHttpsUrl(o.merchant_url)) err(at, 'merchant_url doit être une URL https');
      else if (!hostMatchesDomain(o.merchant_url, o.merchant_domain)) err(at, 'merchant_url hors du domaine du marchand');
      else if (offerUrls.has(o.merchant_url)) err(at, 'merchant_url en double');
      else offerUrls.add(o.merchant_url);
      if (o.affiliate_url !== null && o.affiliate_url !== undefined && !isSafeHttpsUrl(o.affiliate_url)) {
        err(at, 'affiliate_url doit être null ou une URL https');
      }
      if (!CONDITIONS.includes(o.condition)) err(at, `condition doit valoir ${CONDITIONS.join('/')}`);
      if (!isText(o.seller_name, { max: 120 })) err(at, 'seller_name doit être null ou un texte');
      if (!isText(o.merchant_sku, { max: 80 })) err(at, 'merchant_sku doit être null ou un texte');
      if (o.is_recommended !== undefined && typeof o.is_recommended !== 'boolean') err(at, 'is_recommended doit être un booléen');
    });
  }

  const snapshotKeys = new Set();
  for (const batch of data.batches) {
    const where = batch.file ?? 'snapshots';
    if (typeof batch.checked_at !== 'string' || !ISO_UTC.test(batch.checked_at)) err(where, 'checked_at doit être une date UTC ISO 8601');
    if (!isText(batch.source, { nullable: false, max: 60 })) err(where, 'source obligatoire');
    (batch.snapshots ?? []).forEach((s, i) => {
      const at = `${where} snapshots[${i}]`;
      if (!offerUrls.has(s.merchant_url)) err(at, `offre inconnue (${s.merchant_url})`);
      const key = `${s.merchant_url}|${batch.checked_at}|${batch.source}`;
      if (snapshotKeys.has(key)) err(at, 'relevé en double (même offre, date et source)');
      snapshotKeys.add(key);
      if (!Number.isSafeInteger(s.price_cents) || s.price_cents <= 0) err(at, 'price_cents doit être un entier > 0');
      if (s.shipping_cents !== null && (!Number.isSafeInteger(s.shipping_cents) || s.shipping_cents < 0)) {
        err(at, 'shipping_cents doit être null (inconnu) ou un entier >= 0');
      }
      if (!AVAILABILITY.includes(s.availability)) err(at, `availability doit valoir ${AVAILABILITY.join('/')}`);
      for (const field of ['delivery_info', 'warranty_info', 'return_info']) {
        if (!isText(s[field])) err(at, `${field} doit être null ou un texte de ${TEXT_MAX} caractères max`);
      }
    });
  }

  if (forbidFixtures) {
    const serialized = JSON.stringify(data);
    for (const marker of FIXTURE_MARKERS) {
      if (marker.test(serialized)) err('imports', `donnée de fixture interdite en production (${marker})`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------- génération SQL

export function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`valeur numérique non entière : ${value}`);
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

const v = sqlValue;

/** Instructions SQL idempotentes, dans l'ordre des dépendances. */
export function toSqlStatements(data) {
  const statements = [];

  for (const m of data.merchants) {
    statements.push(
      `INSERT INTO merchants (name, domain, affiliate_network) VALUES (${v(m.name)}, ${v(m.domain)}, ${v(m.affiliate_network)}) ` +
        `ON CONFLICT(domain) DO UPDATE SET name = excluded.name, affiliate_network = excluded.affiliate_network`,
    );
  }

  for (const { product: p } of data.products) {
    statements.push(
      `INSERT INTO products (slug, brand, model, category, gtin, mpn, manufacturer_url) ` +
        `VALUES (${v(p.slug)}, ${v(p.brand)}, ${v(p.model)}, ${v(p.category)}, ${v(p.gtin)}, ${v(p.mpn)}, ${v(p.manufacturer_url)}) ` +
        `ON CONFLICT(slug) DO UPDATE SET brand = excluded.brand, model = excluded.model, category = excluded.category, ` +
        `gtin = excluded.gtin, mpn = excluded.mpn, manufacturer_url = excluded.manufacturer_url`,
    );
  }

  for (const { product: p, media = [] } of data.products) {
    for (const item of media) {
      statements.push(
        `INSERT INTO product_media (product_id, url, alt_text, role, position, source_url, rights_basis, rights_note, checked_at) ` +
          `SELECT p.id, ${v(item.url)}, ${v(item.alt_text)}, ${v(item.role)}, ${v(item.position)}, ${v(item.source_url)}, ` +
          `${v(item.rights_basis)}, ${v(item.rights_note)}, ${v(item.checked_at)} FROM products AS p WHERE p.slug = ${v(p.slug)} ` +
          `ON CONFLICT(product_id, role, position) DO UPDATE SET url = excluded.url, alt_text = excluded.alt_text, ` +
          `source_url = excluded.source_url, rights_basis = excluded.rights_basis, rights_note = excluded.rights_note, checked_at = excluded.checked_at`
      );
    }
  }

  for (const { product: p, offers } of data.products) {
    for (const o of offers) {
      // La mise à jour ne s'applique que si l'offre existante pointe vers le même produit et le même marchand.
      statements.push(
        `INSERT INTO offers (product_id, merchant_id, seller_name, condition, merchant_sku, merchant_url, affiliate_url, active) ` +
          `SELECT p.id, m.id, ${v(o.seller_name)}, ${v(o.condition)}, ${v(o.merchant_sku)}, ${v(o.merchant_url)}, ${v(o.affiliate_url)}, 1 ` +
          `FROM products AS p, merchants AS m WHERE p.slug = ${v(p.slug)} AND m.domain = ${v(o.merchant_domain)} ` +
          `ON CONFLICT(merchant_url) DO UPDATE SET seller_name = excluded.seller_name, condition = excluded.condition, ` +
          `merchant_sku = excluded.merchant_sku, affiliate_url = excluded.affiliate_url, active = excluded.active ` +
          `WHERE offers.product_id = excluded.product_id AND offers.merchant_id = excluded.merchant_id`,
      );
    }
  }

  for (const { product: p, page } of data.products) {
    statements.push(
      `INSERT INTO pages (slug, template, "group", main_product_id, signal_at, started_at, published_at, hours_spent) ` +
        `SELECT ${v(page.slug)}, ${v(page.template)}, ${v(page.group)}, p.id, NULL, ${v(page.started_at)}, ${v(page.published_at)}, 0 ` +
        `FROM products AS p WHERE p.slug = ${v(p.slug)} ON CONFLICT(slug) DO NOTHING`,
    );
  }

  for (const { page, offers } of data.products) {
    offers.forEach((o, i) => {
      // Historisation : on n'insère que s'il n'existe aucune ligne active pour ce couple page/offre.
      statements.push(
        `INSERT INTO page_offers (page_id, offer_id, role, position, is_recommended, valid_from, valid_to) ` +
          `SELECT pg.id, o.id, 'offre', ${i + 1}, ${v(o.is_recommended ?? false)}, ${v(page.started_at)}, NULL ` +
          `FROM pages AS pg, offers AS o WHERE pg.slug = ${v(page.slug)} AND o.merchant_url = ${v(o.merchant_url)} ` +
          `AND NOT EXISTS (SELECT 1 FROM page_offers AS x WHERE x.page_id = pg.id AND x.offer_id = o.id AND x.valid_to IS NULL)`,
      );
    });
  }

  for (const batch of data.batches) {
    for (const s of batch.snapshots) {
      // Ajout seul : un relevé = (offre, checked_at, source).
      statements.push(
        `INSERT INTO offer_snapshots (offer_id, price_cents, shipping_cents, availability, delivery_info, warranty_info, return_info, source, checked_at) ` +
          `SELECT o.id, ${v(s.price_cents)}, ${v(s.shipping_cents)}, ${v(s.availability)}, ${v(s.delivery_info)}, ${v(s.warranty_info)}, ` +
          `${v(s.return_info)}, ${v(batch.source)}, ${v(batch.checked_at)} FROM offers AS o WHERE o.merchant_url = ${v(s.merchant_url)} ` +
          `AND NOT EXISTS (SELECT 1 FROM offer_snapshots AS x WHERE x.offer_id = o.id AND x.checked_at = ${v(batch.checked_at)} AND x.source = ${v(batch.source)})`,
      );
    }
  }

  return statements;
}

export function toSql(data) {
  return `${toSqlStatements(data).join(';\n')};\n`;
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const args = { dir: DEFAULT_DIR, out: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dir') args.dir = resolve(argv[++i]);
    else if (argv[i] === '--out') args.out = resolve(argv[++i]);
    else throw new Error(`argument inconnu : ${argv[i]}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = loadImportDir(args.dir);
  const errors = validateImport(data, { forbidFixtures: args.dir === DEFAULT_DIR });
  if (errors.length > 0) {
    console.error(`Import refusé : ${errors.length} erreur(s)\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  const offers = data.products.reduce((n, p) => n + p.offers.length, 0);
  const snapshots = data.batches.reduce((n, b) => n + b.snapshots.length, 0);
  const media = data.products.reduce((n, p) => n + (p.media?.length ?? 0), 0);
  const summary = `OK : ${data.merchants.length} marchands, ${data.products.length} produits, ${offers} offres, ${snapshots} relevés, ${media} médias`;
  if (args.check) {
    console.log(summary);
    return;
  }
  const sql = toSql(data);
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, sql);
    console.error(`${summary} → ${args.out}`);
  } else {
    process.stdout.write(sql);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
