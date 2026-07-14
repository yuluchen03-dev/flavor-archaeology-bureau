const ShareIntentService = require('../ShareIntentService');
const { db } = require('../../config/database');

describe('ShareIntentService', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterEach(async () => {
    await db('share_records').del();
    await db('users').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test('builds Xiaohongshu and Douyin publish-prep intents without claiming autopublish', () => {
    const card = {
      title: 'Share Certificate - crab orange',
      subtitle: 'credible restoration',
      dishName: 'crab orange',
      dynasty: 'Song',
      rarity: 'rare',
      confidence: 90,
      certificateId: 'FAB-REV-00000001',
      shareText: 'Share Certificate - crab orange',
    };

    const intents = ShareIntentService.buildPlatformIntents(card);

    expect(intents.xiaohongshu.canAutoPublish).toBe(false);
    expect(intents.douyin.canAutoPublish).toBe(false);
    expect(intents.xiaohongshu.copyText).toContain('crab orange');
    expect(intents.xiaohongshu.hashtags).toEqual(expect.arrayContaining(['Song', 'rare', 'crab orange']));
    expect(intents.douyin.publishUrl).toContain('douyin.com');
    expect(intents.xiaohongshu.reason).toContain('authorization');
  });

  test('records platform share prep rows for signed-in users', async () => {
    const [userId] = await db('users').insert({
      username: 'sharer',
      email: 'sharer@example.com',
      password_hash: 'hash',
    });
    const card = {
      title: 'Share Certificate - crab orange',
      subtitle: 'credible restoration',
      dishName: 'crab orange',
      dynasty: 'Song',
      rarity: 'rare',
      confidence: 90,
      certificateId: 'FAB-REV-00000001',
      shareText: 'Share Certificate - crab orange',
    };
    card.platformIntents = ShareIntentService.buildPlatformIntents(card);

    const records = await ShareIntentService.recordPreparedShareIntents({ userId, card });
    const rows = await db('share_records').where({ user_id: userId }).orderBy('platform');

    expect(records).toHaveLength(2);
    expect(rows.map((row) => row.platform)).toEqual(['douyin', 'xiaohongshu']);
    expect(rows.every((row) => row.status === 'prepared')).toBe(true);
    expect(rows[0].copy_text).toContain('crab orange');
    expect(JSON.parse(rows[0].card_payload).certificateId).toBe('FAB-REV-00000001');
  });

  test('does not write share records for anonymous users', async () => {
    const card = {
      title: 'anonymous share',
      platformIntents: ShareIntentService.buildPlatformIntents({ title: 'anonymous share' }),
    };

    const records = await ShareIntentService.recordPreparedShareIntents({ userId: null, card });
    const rows = await db('share_records');

    expect(records).toEqual([]);
    expect(rows).toHaveLength(0);
  });
});
