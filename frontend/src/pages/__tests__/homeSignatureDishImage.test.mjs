import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeSource = readFileSync(resolve(__dirname, '../Home.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('home signature dish shows the complete crab orange photo instead of a cropped plate detail', () => {
  assert.match(homeSource, /signature-dish-frame/);
  assert.match(homeSource, /signature-dish-image/);
  assert.match(homeSource, /aspect-\[4\/3\]/);
  assert.doesNotMatch(homeSource, /crabOrangeImage[^>]+object-cover/);

  assert.match(stylesSource, /\.signature-dish-image\b/);
  assert.match(stylesSource, /object-fit:\s*contain/);
  assert.match(stylesSource, /object-position:\s*center/);
});
