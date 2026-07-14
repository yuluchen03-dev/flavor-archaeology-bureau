import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialEvolutionSelection,
  fallbackEvolutionDishes,
  normalizeEvolutionDishes,
} from '../evolutionDishes.js';

test('normalizes recipe search rows to graph dish ids used by the evolution API', () => {
  const apiRows = [
    { id: 1, name: '东坡肉', dynasty: '宋朝', flavor_sour: 0.1, flavor_umami: 0.8 },
    { id: 2, name: '蟹酿橙', dynasty: '宋朝', flavor_sour: 0.5, flavor_umami: 0.9 },
  ];

  const dishes = normalizeEvolutionDishes(apiRows);

  assert.equal(dishes[0].id, 'dish_010');
  assert.equal(dishes[1].id, 'dish_001');
  assert.equal(dishes[1].name, '蟹酿橙');
  assert.deepEqual(dishes[1].flavor_profile, {
    sour: 0.5,
    sweet: 0,
    bitter: 0,
    spicy: 0,
    salty: 0,
    umami: 0.9,
  });
});

test('keeps default evolution parents selectable after API data replaces fallback data', () => {
  const apiRows = [
    { id: 1, name: '东坡肉', dynasty: '宋朝' },
    { id: 2, name: '蟹酿橙', dynasty: '宋朝' },
    { id: 3, name: '太白鸭', dynasty: '唐朝' },
  ];

  const dishes = normalizeEvolutionDishes(apiRows);
  const selection = createInitialEvolutionSelection(dishes);

  assert.equal(selection.selectedDish1, 'dish_010');
  assert.equal(selection.selectedDish2, 'dish_001');
  assert.notEqual(selection.selectedDish1, selection.selectedDish2);
  assert.ok(dishes.some((dish) => dish.id === selection.selectedDish1));
  assert.ok(dishes.some((dish) => dish.id === selection.selectedDish2));
});

test('fills missing API matches with fallback dishes so the selector has real choices', () => {
  const apiRows = [
    { id: 1, name: '东坡肉', dynasty: '宋朝' },
    { id: 2, name: '蟹酿橙', dynasty: '宋朝' },
  ];

  const dishes = normalizeEvolutionDishes(apiRows);

  assert.ok(dishes.length >= 40);
  assert.deepEqual(dishes.slice(0, 2).map((dish) => dish.id), ['dish_010', 'dish_001']);
  assert.equal(new Set(dishes.map((dish) => dish.id)).size, dishes.length);
});

test('fallback pool contains a broad set of selectable niche heritage foods', () => {
  assert.ok(fallbackEvolutionDishes.length >= 40);
  for (const name of ['柳州螺蛳粉', '沙县小吃', '缙云烧饼', '苗家酸汤鱼', '新疆馕']) {
    assert.ok(fallbackEvolutionDishes.some((dish) => dish.name === name), `${name} should be selectable`);
  }
});
