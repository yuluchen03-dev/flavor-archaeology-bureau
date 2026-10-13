import test from 'node:test';
import assert from 'node:assert/strict';
import { toRuntimeDishBackground } from '../dishAssets.js';

test('maps approved PNG source paths to optimized runtime WebP paths', () => {
  assert.equal(
    toRuntimeDishBackground('/dish-backgrounds/dish_001.png'),
    '/dish-backgrounds/dish_001.webp',
  );
  assert.equal(
    toRuntimeDishBackground('/dish-backgrounds/dish_040.PNG'),
    '/dish-backgrounds/dish_040.webp',
  );
});

test('does not rewrite external or unapproved variant paths', () => {
  assert.equal(toRuntimeDishBackground('https://example.test/dish.png'), 'https://example.test/dish.png');
  assert.equal(
    toRuntimeDishBackground('/dish-backgrounds/dish_001-candidate-a.png'),
    '/dish-backgrounds/dish_001-candidate-a.png',
  );
  assert.equal(toRuntimeDishBackground(''), '');
});
