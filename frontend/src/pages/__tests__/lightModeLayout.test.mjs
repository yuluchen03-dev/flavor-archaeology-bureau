import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lightModeSource = readFileSync(resolve(__dirname, '../LightMode.jsx'), 'utf8');

test('light mode constrains wide content and prevents horizontal overflow', () => {
  assert.match(lightModeSource, /overflow-x-hidden/);
  assert.match(lightModeSource, /max-w-\[1120px\]/);
  assert.match(lightModeSource, /min-w-0/);
  assert.match(lightModeSource, /break-words/);
});

test('light mode headline scales down on small and medium viewports', () => {
  assert.match(lightModeSource, /text-4xl/);
  assert.match(lightModeSource, /md:text-5xl/);
  assert.doesNotMatch(lightModeSource, /className="mb-4 mt-4 text-5xl/);
});
