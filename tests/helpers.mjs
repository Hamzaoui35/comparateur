// Outils de test : base SQLite en mémoire construite à partir des migrations et des seeds du dépôt.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

export function readRepoFile(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

export function freshDb({ seeds = [] } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const migrations = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of migrations) db.exec(readRepoFile(join('migrations', file)));
  for (const seed of seeds) db.exec(readRepoFile(seed));
  return db;
}

export function count(db, table) {
  return db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
}

export const repoRoot = root;
