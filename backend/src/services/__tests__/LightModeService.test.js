const LightModeService = require('../LightModeService');

describe('LightModeService', () => {
  test('maps a photographed food clue to an ancestor dish and share card data', async () => {
    const result = await LightModeService.recognizeAncestor({
      description: '午饭是一碗蟹粉拌面，带一点橙香。',
    });

    expect(result.mode).toBe('ancestor');
    expect(result.input.description).toContain('蟹粉拌面');
    expect(result.ancestor.name).toBe('蟹酿橙');
    expect(result.ancestor.dynasty).toBe('宋代');
    expect(result.story).toContain(result.ancestor.name);
    expect(result.shareCard.title).toContain(result.ancestor.name);
    expect(result.shareCard.certificateId).toMatch(/^FAB-/);
  });

  test('returns a daily revival card with rarity and certificate metadata', async () => {
    const result = await LightModeService.getDailyRevival({ date: '2026-06-22' });

    expect(result.mode).toBe('daily');
    expect(result.dish.name).toBeTruthy();
    expect(['常见', '稀有', '濒危', '灭绝', '传说']).toContain(result.rarity);
    expect(result.shareCard.confidence).toBeGreaterThan(0);
    expect(result.shareCard.signature).toBe('首席风味考古官');
  });

  test('builds a true-or-fake heritage round with exactly one real answer', async () => {
    const round = await LightModeService.getAuthenticityRound();

    expect(round.mode).toBe('authenticity');
    expect(round.options).toHaveLength(2);
    expect(round.options.filter((option) => option.isReal)).toHaveLength(1);
    expect(round.explanation).toBeTruthy();
    expect(round.shareCard.title).toContain('真假非遗');
  });

  test('creates a one-click share certificate for a restored dish', async () => {
    const card = await LightModeService.createShareCard({
      dishId: 'dish_001',
      type: 'revival',
      signature: '测试考古官',
    });

    expect(card.title).toContain('蟹酿橙');
    expect(card.type).toBe('revival');
    expect(card.signature).toBe('测试考古官');
    expect(card.certificateId).toMatch(/^FAB-/);
  });
});
