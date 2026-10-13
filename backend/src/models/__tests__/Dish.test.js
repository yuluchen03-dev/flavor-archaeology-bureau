const { db } = require('../../config/database');
const Dish = require('../../models/Dish');

beforeAll(async () => {
  await db.schema.createTable('dishes', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('dynasty').nullable();
    table.text('description').nullable();
    table.json('ingredients').nullable();
    table.text('recipe').nullable();
    table.string('image_url').nullable();
    table.float('flavor_sour').defaultTo(0);
    table.float('flavor_sweet').defaultTo(0);
    table.float('flavor_bitter').defaultTo(0);
    table.float('flavor_spicy').defaultTo(0);
    table.float('flavor_salty').defaultTo(0);
    table.float('flavor_umami').defaultTo(0);
    table.timestamp('created_at').defaultTo(db.fn.now());
  });
});

afterAll(async () => {
  await db.destroy();
});

describe('Dish.search', () => {
  beforeEach(async () => {
    await db('dishes').truncate();
    await db('dishes').insert([
      { name: '蟹酿橙', description: '宋代名菜', dynasty: '宋代' },
      { name: '叫花鸡', description: '江南特色', dynasty: '清代' },
      { name: '蟹黄汤包', description: '扬州 _特色%', dynasty: '清代' },
    ]);
  });

  test('search by normal keyword returns matching rows', async () => {
    const results = await Dish.search('蟹');
    expect(results.length).toBe(2);
    expect(results.map(r => r.name)).toContain('蟹酿橙');
    expect(results.map(r => r.name)).toContain('蟹黄汤包');
  });

  test('search with % literal is escaped and treated as plain text', async () => {
    // The description of '蟹黄汤包' contains literal '%': '扬州 _特色%'
    // Without escaping, `%${keyword}%` would match any row because % is a wildcard.
    // With escaping, searching for '%' should only match rows containing literal '%'.
    const results = await Dish.search('%');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('蟹黄汤包');
  });

  test('search with _ literal is escaped and treated as plain text', async () => {
    // The description of '蟹黄汤包' contains literal '_': '扬州 _特色%'
    const results = await Dish.search('_');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('蟹黄汤包');
  });

  test('both % and _ are escaped so no wildcard matching occurs', async () => {
    // '%' and '_' are escaped to literals, preventing wildcard interpretation.
    // Searching for '%' only matches rows containing literal '%', not all rows.
    const wildcardResults = await Dish.search('%');
    const wildcardNames = wildcardResults.map(r => r.name);
    expect(wildcardNames).not.toContain('叫花鸡');
    expect(wildcardNames).not.toContain('蟹酿橙');
    expect(wildcardNames).toContain('蟹黄汤包');
  });

  test('search with special chars returns no false positives', async () => {
    // '叫花鸡' has description '江南特色' — no % or _
    // Searching for '%' should NOT match it
    const results = await Dish.search('%');
    const names = results.map(r => r.name);
    expect(names).not.toContain('叫花鸡');
    expect(names).not.toContain('蟹酿橙');
  });
});
