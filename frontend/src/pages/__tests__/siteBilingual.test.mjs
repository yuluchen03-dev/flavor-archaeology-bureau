import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(__dirname, '..');
const pageFiles = ['Home.jsx', 'Input.jsx', 'LightMode.jsx', 'Result.jsx', 'StarMap.jsx', 'Evolution.jsx', 'Teaching.jsx', 'NotFound.jsx'];

test('all visible pages consume the global language hook', () => {
  for (const file of pageFiles) {
    const source = readFileSync(resolve(pagesDir, file), 'utf8');
    assert.match(source, /useLanguage/, `${file} should use language state`);
  }
});

test('light mode Chinese copy has no hard-coded English UI labels', () => {
  const source = readFileSync(resolve(pagesDir, 'LightMode.jsx'), 'utf8');
  assert.match(source, /copy\.heroTitle/);
  assert.match(source, /sanitizeChineseText/);
  assert.doesNotMatch(source, />Photo, proof, and a shareable revival</);
  assert.doesNotMatch(source, />SHARE CARD \| Flavor Certificate</);
  assert.doesNotMatch(source, />Copy share text</);
  assert.doesNotMatch(source, />Next round</);
});
