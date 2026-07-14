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

    const existingCollection = await db('user_collections')
      .where({ user_id: userId, dish_id: dish.id })
      .first();
    const status = existingCollection ? 'duplicate' : 'lit';

    if (!existingCollection) {
      await db('user_collections').insert({
        user_id: userId,
        dish_id: dish.id,
        source,
        rarity: dish.rarity || null,
        star_id: `star-${dish.id}`,
      });
    }

    return buildCollection(dish, status);
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

    const existingDraw = await db('daily_draws')
      .where({ user_id: userId, draw_date: date, draw_type: 'daily' })
      .first();
    const currentUsed = existingDraw ? existingDraw.draw_count : 0;

    if (!consumeDraw) {
      return {
        draws: {
          usedToday: currentUsed,
          limit: DAILY_LIMIT,
          remaining: Math.max(0, DAILY_LIMIT - currentUsed),
          streakDays: currentUsed > 0 ? 1 : 0,
        },
        collection: buildCollection(dish, 'preview'),
      };
    }

    if (currentUsed >= DAILY_LIMIT) {
      return {
        draws: { usedToday: currentUsed, limit: DAILY_LIMIT, remaining: 0, streakDays: 1 },
        collection: buildCollection(dish, 'preview'),
      };
    }

    const usedToday = currentUsed + 1;

    if (existingDraw) {
      await db('daily_draws').where({ id: existingDraw.id }).update({
        draw_count: usedToday,
        updated_at: new Date(),
      });
    } else {
      await db('daily_draws').insert({
        user_id: userId,
        draw_date: date,
        draw_type: 'daily',
        draw_count: usedToday,
      });
    }

    const existingCollection = await db('user_collections')
      .where({ user_id: userId, dish_id: dish.id })
      .first();
    const status = existingCollection ? 'duplicate' : 'lit';

    if (!existingCollection) {
      await db('user_collections').insert({
        user_id: userId,
        dish_id: dish.id,
        source: 'daily',
        rarity: dish.rarity || null,
        star_id: `star-${dish.id}`,
      });
    }

    return {
      draws: {
        usedToday,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - usedToday),
        streakDays: 1,
      },
      collection: buildCollection(dish, status),
    };
  }
}

module.exports = CollectionService;
