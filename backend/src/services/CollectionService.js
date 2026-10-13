const { db } = require('../config/database');

const DAILY_LIMIT = 3;

function buildCollection(dish, status) {
  return {
    status,
    starId: `star-${dish.id}`,
    constellation: `${dish.dynasty || '未知'}风味星座`,
    litAt: new Date().toISOString(),
  };
}

class CollectionService {
  static async recordCollectionEntry({ userId, dish, source = 'ancestor' }) {
    if (!userId) {
      return buildCollection(dish, 'unlocked');
    }

    let result;
    await db.transaction(async (trx) => {
      const existingCollection = await trx('user_collections')
        .where({ user_id: userId, dish_id: dish.id })
        .first();
      const status = existingCollection ? 'duplicate' : 'lit';

      if (!existingCollection) {
        await trx('user_collections').insert({
          user_id: userId,
          dish_id: dish.id,
          source,
          rarity: dish.rarity || null,
          star_id: `star-${dish.id}`,
        });
      }

      result = buildCollection(dish, status);
    });

    return result;
  }

  static async recordDailyRevival({
    userId,
    dish,
    date = new Date().toISOString().slice(0, 10),
    consumeDraw = false,
  }) {
    if (!userId) {
      return {
        draws: { usedToday: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, streakDays: 0 },
        collection: buildCollection(dish, 'preview'),
      };
    }

    let result;
    await db.transaction(async (trx) => {
      const existingDraw = await trx('daily_draws')
        .where({ user_id: userId, draw_date: date, draw_type: 'daily' })
        .first();
      const currentUsed = existingDraw ? existingDraw.draw_count : 0;

      if (!consumeDraw) {
        result = {
          draws: {
            usedToday: currentUsed,
            limit: DAILY_LIMIT,
            remaining: Math.max(0, DAILY_LIMIT - currentUsed),
            streakDays: currentUsed > 0 ? 1 : 0,
          },
          collection: buildCollection(dish, 'preview'),
        };
        return;
      }

      if (currentUsed >= DAILY_LIMIT) {
        result = {
          draws: { usedToday: currentUsed, limit: DAILY_LIMIT, remaining: 0, streakDays: 1 },
          collection: buildCollection(dish, 'preview'),
        };
        return;
      }

      const usedToday = currentUsed + 1;

      if (existingDraw) {
        await trx('daily_draws').where({ id: existingDraw.id }).update({
          draw_count: usedToday,
          updated_at: new Date(),
        });
      } else {
        await trx('daily_draws').insert({
          user_id: userId,
          draw_date: date,
          draw_type: 'daily',
          draw_count: usedToday,
        });
      }

      const existingCollection = await trx('user_collections')
        .where({ user_id: userId, dish_id: dish.id })
        .first();
      const status = existingCollection ? 'duplicate' : 'lit';

      if (!existingCollection) {
        await trx('user_collections').insert({
          user_id: userId,
          dish_id: dish.id,
          source: 'daily',
          rarity: dish.rarity || null,
          star_id: `star-${dish.id}`,
        });
      }

      result = {
        draws: {
          usedToday,
          limit: DAILY_LIMIT,
          remaining: Math.max(0, DAILY_LIMIT - usedToday),
          streakDays: 1,
        },
        collection: buildCollection(dish, status),
      };
    });

    return result;
  }
}

module.exports = CollectionService;
