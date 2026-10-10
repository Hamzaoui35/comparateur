// Preuve C : aucun nom de marque, de produit ou de marchand codé en dur dans src/.
// Ce fichier vit hors de src/ pour ne pas se détecter lui-même.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { repoRoot } from './helpers.mjs';

const FORBIDDEN = [/\bdarty\b/i, /\bfnac\b/i, /\bcarrefour\b/i, /\bboulanger\b/i, /\bleclerc\b/i, /\balternate\b/i, /dreame/i, /tineco/i, /marquetest/i, /produit test/i, /boutique (alpha|beta|gamma)/i, /\.example\b/i];

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

test('src/ ne contient aucun nom de marque, produit ou marchand', () => {
  const hits = [];
  for (const file of listFiles(join(repoRoot, 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const pattern of FORBIDDEN) {
        if (pattern.test(line)) hits.push(`${relative(repoRoot, file)}:${i + 1} → ${pattern}`);
      }
    });
  }
  assert.deepEqual(hits, [], `Noms codés en dur trouvés :\n${hits.join('\n')}`);
});
