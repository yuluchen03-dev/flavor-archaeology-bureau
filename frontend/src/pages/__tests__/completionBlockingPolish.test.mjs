import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeSource = readFileSync(resolve(__dirname, '../Home.jsx'), 'utf8');
const evolutionSource = readFileSync(resolve(__dirname, '../Evolution.jsx'), 'utf8');
const resultSource = readFileSync(resolve(__dirname, '../Result.jsx'), 'utf8');
const starMapSource = readFileSync(resolve(__dirname, '../StarMap.jsx'), 'utf8');

test('home and evolution do not hard-code English labels in Chinese mode surfaces', () => {
  assert.doesNotMatch(homeSource, />CURRENT DOSSIER</);
  assert.match(homeSource, /t\('当前档案', 'CURRENT DOSSIER'\)/);
  assert.doesNotMatch(evolutionSource, />LAB RULE</);
  assert.match(evolutionSource, /t\('实验规则', 'LAB RULE'\)/);
});

test('result and evolution sanitize backend share certificate text in Chinese mode', () => {
  assert.match(resultSource, /sanitizeChineseText/);
  assert.match(resultSource, /safeCardText/);
  assert.match(resultSource, /safeCardId/);
  assert.doesNotMatch(resultSource, /<h3 className="text-2xl font-bold text-ink mb-2">\{card\.title\}<\/h3>/);

  assert.match(evolutionSource, /sanitizeChineseText/);
  assert.match(evolutionSource, /safeCardText/);
  assert.match(evolutionSource, /safeCardId/);
  assert.doesNotMatch(evolutionSource, /<h3 className="text-2xl font-bold text-ink mb-2">\{card\.title\}<\/h3>/);
});

test('star map avoids clipping edge nodes and gives mobile more vertical room', () => {
  assert.doesNotMatch(starMapSource, /paper-grain overflow-hidden/);
  assert.match(starMapSource, /overflow-x-hidden/);
  assert.match(starMapSource, /min-h-\[760px\] md:min-h-\[620px\]/);
});
