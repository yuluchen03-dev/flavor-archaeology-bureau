import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const starMapSource = readFileSync(resolve(__dirname, '../StarMap.jsx'), 'utf8');
const lightModeSource = readFileSync(resolve(__dirname, '../LightMode.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('star map renders as a constellation archive instead of an emoji card grid', () => {
  for (const className of ['flavor-constellation', 'dynasty-orbit', 'star-node', 'archive-drawer']) {
    assert.match(starMapSource, new RegExp(className), `StarMap should use ${className}`);
  }
  assert.match(starMapSource, /nodePositions/);
  assert.match(starMapSource, /viewBox="0 0 100 100"/);
  assert.doesNotMatch(starMapSource, /getDishEmoji/);
  assert.doesNotMatch(starMapSource, /text-4xl mb-3/);
});

test('light mode renders as a public evidence lab with camera and certificate hierarchy', () => {
  for (const className of ['public-lab', 'camera-stage', 'share-certificate', 'daily-revival-panel', 'daily-revival-card', 'daily-revival-hero', 'daily-certificate-sheet', 'daily-seal']) {
    assert.match(lightModeSource, new RegExp(className), `LightMode should use ${className}`);
  }
  assert.match(lightModeSource, /DailyRevivalCard/);
  assert.match(lightModeSource, /archive-surface/);
  assert.match(lightModeSource, /evidence-panel/);
  assert.match(lightModeSource, /museum-button/);
});

test('global styles include semantic visual systems for constellation and public lab pages', () => {
  for (const className of ['flavor-constellation', 'dynasty-orbit', 'star-node', 'archive-drawer', 'public-lab', 'camera-stage', 'share-certificate', 'daily-revival-panel', 'daily-revival-card', 'daily-certificate-sheet', 'daily-seal']) {
    assert.match(stylesSource, new RegExp(`\\.${className}\\b`), `missing .${className}`);
  }
});
