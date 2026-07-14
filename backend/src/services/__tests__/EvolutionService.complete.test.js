const EvolutionService = require('../EvolutionService');
const PythonBridge = require('../PythonBridge');

describe('EvolutionService completed MVP contracts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns a fusion dish with certificate metadata for sharing', async () => {
    const result = await EvolutionService.evolve({
      dishId1: 'dish_001',
      dishId2: 'dish_002',
    });

    expect(result.newDish.name).toBeTruthy();
    expect(result.sourceDishes).toHaveLength(2);
    expect(result.fusionConcept).toBeTruthy();
    expect(result.shareCard.type).toBe('evolution');
    expect(result.shareCard.title).toContain(result.newDish.name);
    expect(result.shareCard.certificateId).toMatch(/^FAB-/);
    expect(result.shareCard.shareText).toContain(result.newDish.name);
    expect(result.imagePrompt).toContain(result.newDish.name);
    expect(result.imagePrompt).toContain('一道完整可食用的融合菜');
    expect(result.imagePrompt).toContain('单一成品菜');
    expect(result.imagePrompt).toContain('只提取风味、技法和食材线索');
    expect(result.imagePrompt).toContain('所有食材都必须呈现为熟制、切配、调味后的可入口状态');
    expect(result.imagePrompt).toContain('不要把两个原菜简单并排');
  });

  test('renames mechanical fusion output into an elegant related archaic dish name', async () => {
    jest.spyOn(PythonBridge, 'evolution').mockResolvedValue({
      new_dish: {
        name: '玉糁羹槐叶冷淘融合',
        description: '把玉糁羹的温润羹体与槐叶冷淘的碧槐清香合为一盏。',
        dynasty: '宋代→唐代融合',
        techniques: ['羹', '冷淘'],
      },
      source_dishes: [
        { id: 'dish_003', name: '玉糁羹', dynasty: '宋代' },
        { id: 'dish_002', name: '槐叶冷淘', dynasty: '唐代' },
      ],
      fusion_concept: '玉糁羹与槐叶冷淘的清润融合。',
      llm_enhanced: true,
    });

    const result = await EvolutionService.evolve({
      dishId1: 'dish_003',
      dishId2: 'dish_002',
    });

    expect(result.newDish.name).toBe('碧槐玉糁');
    expect(result.newDish.name).not.toContain('融合');
    expect(result.shareCard.title).toContain('碧槐玉糁');
    expect(result.shareCard.shareText).toContain('碧槐玉糁');
    expect(result.imagePrompt).toContain('碧槐玉糁');
    expect(result.imagePrompt).not.toContain('玉糁羹槐叶冷淘融合');
  });

  test('deterministic fusion names stay concise and avoid pasted source names for all built-in dishes', () => {
    const dishNames = ['蟹酿橙', '槐叶冷淘', '玉糁羹', '王太守八宝豆腐', '驼蹄羹', '浑羊殁忽', '荷包鱼', '荔枝腰子', '莲房鱼包', '东坡肉'];

    for (let i = 0; i < dishNames.length; i += 1) {
      for (let j = i + 1; j < dishNames.length; j += 1) {
        const sourceDishes = [{ name: dishNames[i] }, { name: dishNames[j] }];
        const name = EvolutionService.buildFusionDishName(sourceDishes);

        expect(name).toBeTruthy();
        expect(name.length).toBeLessThanOrEqual(6);
        expect(name).not.toContain('融合');
        expect(name).not.toContain('×');
        expect(name).not.toBe(`${dishNames[i]}${dishNames[j]}`);
        expect(name).not.toBe(`${dishNames[j]}${dishNames[i]}`);
      }
    }
  });
});
