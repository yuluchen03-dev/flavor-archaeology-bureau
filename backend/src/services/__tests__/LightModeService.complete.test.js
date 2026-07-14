const LightModeService = require('../LightModeService');
const VisionService = require('../VisionService');
const CollectionService = require('../CollectionService');

const originalAnalyzeFoodImage = VisionService.analyzeFoodImage;
const originalRecordCollectionEntry = CollectionService.recordCollectionEntry;

function useFallbackVisionFixture() {
  VisionService.analyzeFoodImage = jest.fn().mockResolvedValue({
    provider: 'fallback',
    labels: ['crab', 'orange', 'steamed dish'],
    ingredients: ['crab', 'orange'],
    dishCandidates: [
      {
        dishId: 'dish_001',
        name: '蟹酿橙',
        confidence: 0.98,
        reason: 'test fallback',
      },
    ],
    confidence: 0.98,
    evidence: ['Matched cue: crab', 'Matched cue: orange'],
  });
}

describe('LightModeService completed MVP contracts', () => {
  afterEach(() => {
    VisionService.analyzeFoodImage = originalAnalyzeFoodImage;
    CollectionService.recordCollectionEntry = originalRecordCollectionEntry;
  });

  test('returns readable Chinese ancestor data with collection and share metadata', async () => {
    useFallbackVisionFixture();

    const result = await LightModeService.recognizeAncestor({
      description: '午饭是一碗蟹粉拌面，带一点橙香。',
      imageLabel: 'crab-noodle.jpg',
    });

    expect(result.mode).toBe('ancestor');
    expect(result.ancestor.name).toBe('蟹酿橙');
    expect(result.story).toContain('蟹酿橙');
    expect(result.collection.status).toBe('unlocked');
    expect(result.collection.starId).toBe('star-dish_001');
    expect(result.shareCard.title).toContain('蟹酿橙');
    expect(result.shareCard.badges).toContain('宋代');
    expect(result.shareCard.shareText).toContain('蟹酿橙');
  });

  test('daily revival includes rarity, star lighting, and a certificate', async () => {
    const result = await LightModeService.getDailyRevival({ date: '2026-06-22' });

    expect(result.mode).toBe('daily');
    expect(result.collection.status).toBe('preview');
    expect(result.collection.starId).toMatch(/^star-dish_/);
    expect(result.shareCard.type).toBe('daily');
    expect(result.shareCard.shareText).toContain(result.dish.name);
  });

  test('true-or-fake round exposes one real answer and shareable explanation', async () => {
    const result = await LightModeService.getAuthenticityRound({ seed: 42 });

    expect(result.mode).toBe('authenticity');
    expect(result.options).toHaveLength(2);
    expect(result.options.filter((option) => option.isReal)).toHaveLength(1);
    expect(result.explanation).toContain(result.options.find((option) => option.isReal).name);
    expect(result.shareCard.shareText).toContain('真假非遗');
  });

  test('true-or-fake round can filter expanded quiz bank by difficulty', async () => {
    const result = await LightModeService.getAuthenticityRound({ seed: 7, difficulty: 'easy' });

    expect(result.mode).toBe('authenticity');
    expect(result.options).toHaveLength(2);
    expect(result.options.some((option) => option.isReal)).toBe(true);
    expect(result.options.some((option) => option.isReal === false)).toBe(true);
    expect(result.difficulty).toBe('easy');
    expect(result.fakeTell).toBeTruthy();
  });

  test('ancestor recognition includes vision evidence and platform share intents', async () => {
    useFallbackVisionFixture();

    const result = await LightModeService.recognizeAncestor({
      description: 'steamed crab in orange shell',
      imageLabel: 'crab-orange.jpg',
      imageData: 'data:image/jpeg;base64,abc123',
    });

    expect(result.mode).toBe('ancestor');
    expect(result.vision.provider).toBe('fallback');
    expect(result.vision.dishCandidates[0].dishId).toBe('dish_001');
    expect(result.vision.dishCandidates[0].reason).toBe('test fallback');
    expect(result.ancestor.id).toBe('dish_001');
    expect(result.shareCard.platformIntents.xiaohongshu.canAutoPublish).toBe(false);
    expect(result.shareCard.platformIntents.douyin.copyText).toContain(result.ancestor.name);
  });

  test('daily revival includes draw economy state', async () => {
    const result = await LightModeService.getDailyRevival({ date: '2026-06-30' });

    expect(result.draws).toMatchObject({ usedToday: 0, limit: 3, remaining: 3 });
    expect(result.collection.status).toBe('preview');
  });

  test('daily revival seed changes the drawn dish for card draw interaction', async () => {
    const first = await LightModeService.getDailyRevival({ date: '2026-06-30', seed: 1 });
    const second = await LightModeService.getDailyRevival({ date: '2026-06-30', seed: 2 });

    expect(first.dish.id).not.toBe(second.dish.id);
    expect(first.shareCard.title).toContain(first.dish.name);
    expect(second.shareCard.title).toContain(second.dish.name);
  });

  test('daily revival can exclude the current card so a redraw visibly changes', async () => {
    const first = await LightModeService.getDailyRevival({ date: '2026-06-30', seed: 1, draw: true });
    const second = await LightModeService.getDailyRevival({
      date: '2026-06-30',
      seed: 1,
      excludeDishId: first.dish.id,
      draw: true,
    });

    expect(second.dish.id).not.toBe(first.dish.id);
  });

  test('daily revival redraw skips recently shown cards so repeated clicks visibly change', async () => {
    const result = await LightModeService.getDailyRevival({
      date: '2026-06-30',
      seed: 1,
      excludeDishId: 'dish_001,dish_002,dish_003',
      draw: true,
    });

    expect(['dish_001', 'dish_002', 'dish_003']).not.toContain(result.dish.id);
  });

  test('ancestor recognition includes digital human narration and voice cue', async () => {
    useFallbackVisionFixture();

    const result = await LightModeService.recognizeAncestor({
      description: '午饭是一碗蟹粉拌面，带一点橙香。',
      imageLabel: 'crab-orange.jpg',
      imageData: 'data:image/jpeg;base64,abc123',
    });

    expect(result.digitalHuman.speaker.id).toBe('taotie-curator');
    expect(result.digitalHuman.speaker.name).toBe('饕餮考古官');
    expect(result.digitalHuman.emotion).toBe('curious');
    expect(result.digitalHuman.script).toContain(result.ancestor.name);
    expect(result.digitalHuman.evidenceBullets.length).toBeGreaterThan(1);
    expect(result.voice).toMatchObject({
      mode: 'browser-tts',
      language: 'zh-CN',
      text: result.digitalHuman.script,
    });
    expect(result.voice.speakerId).toBe(result.digitalHuman.speaker.id);
    expect(result.voice.emotion).toBe(result.digitalHuman.emotion);
    expect(result.shareCard.platformIntents.xiaohongshu.canAutoPublish).toBe(false);
  });

  test('ancestor recognition persists collection state for signed-in users', async () => {
    useFallbackVisionFixture();
    CollectionService.recordCollectionEntry = jest.fn().mockResolvedValue({
      status: 'lit',
      starId: 'star-dish_001',
      constellation: '瀹嬩唬椋庡懗鏄熷骇',
      litAt: '2026-07-02T00:00:00.000Z',
    });

    const result = await LightModeService.recognizeAncestor({
      userId: 7,
      description: 'steamed crab in orange shell',
      imageLabel: 'crab-orange.jpg',
      imageData: 'data:image/jpeg;base64,abc123',
    });

    expect(CollectionService.recordCollectionEntry).toHaveBeenCalledWith({
      userId: 7,
      dish: expect.objectContaining({ id: 'dish_001', rarity: expect.any(String) }),
      source: 'ancestor',
    });
    expect(result.collection.status).toBe('lit');
  });
});
