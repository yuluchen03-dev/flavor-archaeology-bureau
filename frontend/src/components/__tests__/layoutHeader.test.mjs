import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutSource = readFileSync(resolve(__dirname, '../Layout.jsx'), 'utf8');
const authPanelSource = readFileSync(resolve(__dirname, '../AuthPanel.jsx'), 'utf8');

test('desktop header separates brand, wrapping navigation, and compact auth area', () => {
  assert.match(layoutSource, /md:grid-cols-\[minmax\(260px,auto\)_1fr_minmax\(220px,270px\)\]/);
  assert.match(layoutSource, /flex-wrap/);
  assert.match(layoutSource, /justify-center/);
  assert.match(layoutSource, /justify-self-end/);
});

test('auth panel is compact enough to sit in the header without crowding navigation text', () => {
  assert.match(authPanelSource, /group\/auth/);
  assert.match(authPanelSource, /absolute right-0 top-full/);
  assert.match(authPanelSource, /进入风味局/);
  assert.match(authPanelSource, /space-y-1\.5/);
  assert.match(authPanelSource, /h-8/);
  assert.doesNotMatch(authPanelSource, /p-4 text-sm shadow-sm/);
});
