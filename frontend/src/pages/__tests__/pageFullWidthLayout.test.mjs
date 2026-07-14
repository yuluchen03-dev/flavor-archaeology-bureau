import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(__dirname, '..');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
const pageFiles = ['Home.jsx', 'Input.jsx', 'LightMode.jsx', 'Result.jsx', 'StarMap.jsx', 'Evolution.jsx', 'Teaching.jsx'];

test('visible pages give their primary layout containers full available width before centering content', () => {
  for (const file of pageFiles) {
    const source = readFileSync(resolve(pagesDir, file), 'utf8');
    assert.match(source, /w-full/, `${file} should include a full-width primary container`);
    assert.match(source, /mx-auto/, `${file} should center its constrained content`);
  }
});

test('star map outer band spans the viewport before centering its max-width stage', () => {
  const source = readFileSync(resolve(pagesDir, 'StarMap.jsx'), 'utf8');
  assert.match(source, /className="w-full bg-paper text-ink/);
  assert.match(source, /className="relative mx-auto w-full max-w-6xl/);
});

test('global styles preserve centered Tailwind containers in this build', () => {
  assert.match(stylesSource, /\.mx-auto\s*\{/);
  assert.match(stylesSource, /margin-inline:\s*auto/);
});
