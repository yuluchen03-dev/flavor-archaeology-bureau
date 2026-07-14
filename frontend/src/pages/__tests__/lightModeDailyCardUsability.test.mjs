import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lightModeSource = readFileSync(resolve(__dirname, '../LightMode.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('daily revival card keeps copy actions usable in constrained browser layouts', () => {
  assert.match(lightModeSource, /copyToClipboard/);
  assert.match(lightModeSource, /document\.execCommand\('copy'\)/);
  assert.match(lightModeSource, /copyState === 'ok'/);
  assert.match(lightModeSource, /minmax\(380px,420px\)/);
  assert.match(lightModeSource, /daily-certificate-heading/);

  assert.match(stylesSource, /\.daily-certificate-heading\b/);
  assert.match(stylesSource, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
  assert.doesNotMatch(stylesSource, /rgba\(36,\s*29,\s*19,\s*0\.95\)\s*47%/);
});

test('daily revival card exposes a real draw action instead of only auto-loading a card', () => {
  assert.match(lightModeSource, /drawDailyCard/);
  assert.match(lightModeSource, /draw=1/);
  assert.match(lightModeSource, /excludeDishId=\$\{encodeURIComponent\(nextExcludedDishIds\.join\(','\)\)\}/);
  assert.match(lightModeSource, /onDraw=\{drawDailyCard\}/);
  assert.match(lightModeSource, /copy\.drawDaily/);
  assert.match(lightModeSource, /copy\.drawAgain/);
});

test('daily redraw sends recently shown dish ids so another click visibly changes the card', () => {
  assert.match(lightModeSource, /recentDailyDishIds/);
  assert.match(lightModeSource, /nextExcludedDishIds/);
  assert.match(lightModeSource, /excludeDishId=\$\{encodeURIComponent\(nextExcludedDishIds\.join\(','\)\)\}/);
});
