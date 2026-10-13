require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { db } = require('../config/database');
const baselineDishes = require('../seeds/001_sample_dishes');

async function countDishes(database) {
  const result = await database('dishes').count({ count: 'id' }).first();
  return Number(result?.count || 0);
}

async function seedDishesIfEmpty(database = db) {
  const existingCount = await countDishes(database);
  if (existingCount > 0) {
    return { seeded: false, count: existingCount };
  }

  await baselineDishes.seed(database);
  return { seeded: true, count: await countDishes(database) };
}

async function main() {
  const result = await seedDishesIfEmpty(db);
  console.log(result.seeded
    ? `Seeded ${result.count} baseline dishes.`
    : `Skipped baseline seed; ${result.count} dishes already exist.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Conditional database seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.destroy();
    });
}

module.exports = { seedDishesIfEmpty };
