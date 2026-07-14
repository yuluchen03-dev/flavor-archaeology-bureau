import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const evolutionSource = readFileSync(resolve(__dirname, '../Evolution.jsx'), 'utf8');

test('evolution selection area remains independently selectable above comparison panel', () => {
  assert.match(evolutionSource, /data-testid="evolution-selection-stage"/);
  assert.match(evolutionSource, /data-testid="dish-option-list"/);
  assert.match(evolutionSource, /data-testid="dish-option"/);
  assert.match(evolutionSource, /data-testid="dish-parent-panel"/);
  assert.match(evolutionSource, /relative z-10/);
  assert.match(evolutionSource, /overflow-y-auto/);
  assert.match(evolutionSource, /max-h-\[(320|420)px\]/);
  assert.match(evolutionSource, /w-full/);
});

test('evolution page has a constrained centered stage without horizontal spill', () => {
  assert.match(evolutionSource, /data-testid="evolution-page"/);
  assert.match(evolutionSource, /data-testid="evolution-inner"/);
  assert.match(evolutionSource, /overflow-x-hidden/);
  assert.match(evolutionSource, /max-w-\[1120px\]/);
  assert.match(evolutionSource, /min-w-0/);
});

test('evolution selector exposes the expanded catalog instead of truncating to ten dishes', () => {
  assert.match(evolutionSource, /recipe\/search\?limit=(60|80|100)/);
  assert.doesNotMatch(evolutionSource, /dishes\.slice\(0,\s*10\)/);
});
