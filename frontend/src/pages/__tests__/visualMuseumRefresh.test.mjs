import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeSource = readFileSync(resolve(__dirname, '../Home.jsx'), 'utf8');
const evolutionSource = readFileSync(resolve(__dirname, '../Evolution.jsx'), 'utf8');
const layoutSource = readFileSync(resolve(__dirname, '../../components/Layout.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('home page uses a real visual asset and museum-grade hero language', () => {
  assert.match(homeSource, /heroImage/);
  assert.match(homeSource, /museum-hero/);
  assert.match(homeSource, /archive-surface/);
  assert.doesNotMatch(homeSource, /text-9xl/);
});

test('global visual system exposes semantic museum surfaces and buttons', () => {
  for (const className of ['museum-hero', 'archive-surface', 'evidence-panel', 'seal-badge', 'museum-button']) {
    assert.match(stylesSource, new RegExp(`\\.${className}\\b`), `missing .${className}`);
  }
  assert.match(stylesSource, /paper-grain/);
  assert.match(stylesSource, /linear-gradient/);
});

test('layout header reads as an archive top bar instead of a generic nav', () => {
  assert.match(layoutSource, /archive-topbar/);
  assert.match(layoutSource, /seal-badge/);
  assert.match(layoutSource, /museum-nav-link/);
});

test('evolution page uses an experiment table treatment for selection', () => {
  assert.match(evolutionSource, /experiment-table/);
  assert.match(evolutionSource, /archive-surface/);
  assert.match(evolutionSource, /evidence-panel/);
});
