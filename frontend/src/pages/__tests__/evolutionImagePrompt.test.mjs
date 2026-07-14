import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const evolutionSource = readFileSync(resolve(__dirname, '../Evolution.jsx'), 'utf8');

test('evolution page uses backend-designed image prompt for fused dish generation', () => {
  assert.match(evolutionSource, /imagePrompt/);
  assert.match(evolutionSource, /data\.data\.imagePrompt/);
  assert.doesNotMatch(evolutionSource, /创新融合非遗菜品/);
});
