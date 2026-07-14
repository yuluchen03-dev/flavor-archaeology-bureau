import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeSource = readFileSync(resolve(__dirname, '../Home.jsx'), 'utf8');
const layoutSource = readFileSync(resolve(__dirname, '../../components/Layout.jsx'), 'utf8');

test('home page sections use a centered stage width instead of filling the viewport', () => {
  assert.match(homeSource, /max-w-\[1120px\]/);
  assert.match(homeSource, /max-w-\[1040px\]/);
  assert.match(homeSource, /w-full/);
});

test('site header uses the same centered visual rhythm as the page body', () => {
  assert.match(layoutSource, /max-w-\[1180px\]/);
});
