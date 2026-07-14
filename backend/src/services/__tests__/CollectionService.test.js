const CollectionService = require('../CollectionService');
const { db } = require('../../config/database');

describe('CollectionService', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterEach(async () => {
    await db('user_collections').del();
    await db('daily_draws').del();
    await db('users').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test('anonymous users get deterministic non-persistent draw state', async () => {
    const state = await CollectionService.recordDailyRevival({
      userId: null,
      dish: { id: 'dish_001', dynasty: '宋代' },
      date: '2026-06-30',
    });

    expect(state.draws).toEqual({ usedToday: 0, limit: 3, remaining: 3, streakDays: 0 });
    expect(state.collection).toMatchObject({
      status: 'preview',
      starId: 'star-dish_001',
      constellation: '宋代风味星座',
    });
  });

  test('signed-in ancestor recognition can persist a collection entry without consuming daily draws', async () => {
    const [userId] = await db('users').insert({
      username: 'collector',
      email: 'collector@example.com',
      password_hash: 'hash',
    });

    const first = await CollectionService.recordCollectionEntry({
      userId,
      dish: { id: 'dish_001', dynasty: '瀹嬩唬', rarity: '鐏粷' },
      source: 'ancestor',
    });
    const second = await CollectionService.recordCollectionEntry({
      userId,
      dish: { id: 'dish_001', dynasty: '瀹嬩唬', rarity: '鐏粷' },
      source: 'ancestor',
    });

    const rows = await db('user_collections').where({ user_id: userId, dish_id: 'dish_001' });
    const draws = await db('daily_draws').where({ user_id: userId });

    expect(first.status).toBe('lit');
    expect(second.status).toBe('duplicate');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'ancestor',
      rarity: '鐏粷',
      star_id: 'star-dish_001',
    });
    expect(draws).toHaveLength(0);
  });

  test('signed-in daily preview reports draw state without consuming a draw', async () => {
    const [userId] = await db('users').insert({
      username: 'daily-preview',
      email: 'daily-preview@example.com',
      password_hash: 'hash',
    });

    const preview = await CollectionService.recordDailyRevival({
      userId,
      dish: { id: 'dish_002', dynasty: '唐代' },
      date: '2026-07-05',
      consumeDraw: false,
    });
    const rows = await db('daily_draws').where({ user_id: userId });

    expect(preview.draws).toEqual({ usedToday: 0, limit: 3, remaining: 3, streakDays: 0 });
    expect(preview.collection.status).toBe('preview');
    expect(rows).toHaveLength(0);
  });

  test('signed-in daily draw consumes only when requested', async () => {
    const [userId] = await db('users').insert({
      username: 'daily-draw',
      email: 'daily-draw@example.com',
      password_hash: 'hash',
    });

    const draw = await CollectionService.recordDailyRevival({
      userId,
      dish: { id: 'dish_003', dynasty: '宋代' },
      date: '2026-07-05',
      consumeDraw: true,
    });
    const rows = await db('daily_draws').where({ user_id: userId });

    expect(draw.draws).toMatchObject({ usedToday: 1, limit: 3, remaining: 2 });
    expect(rows).toHaveLength(1);
    expect(rows[0].draw_count).toBe(1);
  });
});
