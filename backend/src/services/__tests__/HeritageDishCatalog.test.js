const path = require('path');

const dishes = require(path.join(__dirname, '../../../../data/knowledge_graph/nodes_dish.json'));
const realQuizBank = require(path.join(__dirname, '../../../../data/light_mode/quiz_real_dishes.json'));

describe('expanded heritage dish catalog', () => {
  test('knowledge graph offers a broad pool of niche heritage foods', () => {
    expect(dishes.length).toBeGreaterThanOrEqual(40);

    const names = dishes.map((dish) => dish.name);
    for (const name of ['柳州螺蛳粉', '沙县小吃', '缙云烧饼', '苗家酸汤鱼', '新疆馕']) {
      expect(names).toContain(name);
    }
  });

  test('expanded dishes carry usable heritage metadata for selection and draw cards', () => {
    const expanded = dishes.filter((dish) => String(dish.id).localeCompare('dish_010') > 0);

    expect(expanded.length).toBeGreaterThanOrEqual(30);
    for (const dish of expanded) {
      expect(dish.source_text).toMatch(/非遗|传统|地方/);
      expect(dish.description.length).toBeGreaterThan(12);
      expect(dish.taste_profile).toBeTruthy();
      expect(dish.flavor_profile).toEqual(expect.objectContaining({
        sour: expect.any(Number),
        sweet: expect.any(Number),
        bitter: expect.any(Number),
        spicy: expect.any(Number),
        salty: expect.any(Number),
        umami: expect.any(Number),
      }));
    }
  });

  test('true-or-fake quiz can draw from the expanded real heritage pool', () => {
    const realIds = new Set(realQuizBank.map((entry) => entry.dishId));
    const graphIds = new Set(dishes.map((dish) => dish.id));

    expect(realIds.size).toBeGreaterThanOrEqual(30);
    for (const id of realIds) {
      expect(graphIds.has(id)).toBe(true);
    }
  });
});
