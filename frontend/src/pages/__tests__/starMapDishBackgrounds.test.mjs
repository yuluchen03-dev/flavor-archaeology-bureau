import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const starMapSource = readFileSync(resolve(__dirname, '../StarMap.jsx'), 'utf8');

test('star map dish detail panel renders the selected dish background image', () => {
  assert.match(starMapSource, /activeDish\?\.backgroundImage/);
  assert.match(starMapSource, /backgroundImage:\s*`url\(\$\{activeDish\.backgroundImage\}\)`/);
  assert.match(starMapSource, /dish-background-scrim/);
});
