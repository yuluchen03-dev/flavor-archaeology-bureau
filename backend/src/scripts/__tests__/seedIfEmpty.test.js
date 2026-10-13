const knex = require('knex');
const { seedDishesIfEmpty } = require('../seed-if-empty');

describe('seedDishesIfEmpty', () => {
  let database;

  beforeEach(async () => {
    database = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    await database.schema.createTable('dishes', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('dynasty');
      table.text('description');
      table.json('ingredients');
      table.text('recipe');
      table.string('image_url');
      table.float('flavor_sour');
      table.float('flavor_sweet');
      table.float('flavor_bitter');
      table.float('flavor_spicy');
      table.float('flavor_salty');
      table.float('flavor_umami');
    });
  });

  afterEach(async () => {
    await database.destroy();
  });

  test('imports the baseline dishes when the table is empty', async () => {
    const result = await seedDishesIfEmpty(database);
    const dishes = await database('dishes').select('id', 'name').orderBy('id');

    expect(result).toEqual({ seeded: true, count: 5 });
    expect(dishes).toEqual(expect.arrayContaining([
      { id: 1, name: '东坡肉' },
      { id: 2, name: '蟹酿橙' },
    ]));
    expect(dishes).toHaveLength(5);
  });

  test('leaves every existing dish unchanged when the table is not empty', async () => {
    const existingDish = { id: 42, name: '用户自定义菜', description: '不可覆盖' };
    await database('dishes').insert(existingDish);

    const result = await seedDishesIfEmpty(database);
    const dishes = await database('dishes').select('id', 'name', 'description');

    expect(result).toEqual({ seeded: false, count: 1 });
    expect(dishes).toEqual([existingDish]);
  });
});
