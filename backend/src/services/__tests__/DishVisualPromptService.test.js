const DishVisualPromptService = require('../DishVisualPromptService');
const AgnesImageService = require('../AgnesImageService');
const EvolutionService = require('../EvolutionService');

describe('DishVisualPromptService', () => {
  test('builds a hard visual prompt for 蟹酿橙 that cannot become whole crabs', () => {
    const prompt = DishVisualPromptService.buildPrompt({
      dishName: '蟹酿橙',
      prompt: '宋代复原成品图',
    });

    expect(prompt).toContain('蟹酿橙');
    expect(prompt).toContain('厚皮黄橙或甜橙作为橙盅容器');
    expect(prompt).toContain('截顶开盖');
    expect(prompt).toContain('蟹膏蟹肉填在橙壳内部');
    expect(prompt).toContain('可见的蟹只能是拆出的蟹肉丝和蟹黄蟹膏');
    expect(prompt).toContain('橙盖覆回或斜靠在旁边');
    expect(prompt).toContain('不得出现整只螃蟹');
    expect(prompt).toContain('不得出现蟹腿、蟹钳、蟹壳或完整蟹身轮廓');
    expect(prompt).toContain('不要把螃蟹当主菜');
  });

  test('蟹酿橙 prompt describes the real orange-cup finished dish, not a crab dish with orange garnish', () => {
    const prompt = DishVisualPromptService.buildPrompt({
      dishName: '蟹酿橙',
      prompt: '南宋蟹酿橙复原菜品图',
    });

    expect(prompt).toContain('单人份橙盅');
    expect(prompt).toContain('小碗或小蒸盏托住橙盅');
    expect(prompt).toContain('高边橙壳口沿');
    expect(prompt).toContain('湿润蟹粉蟹黄蟹肉碎');
    expect(prompt).toContain('内馅齐平或略低于橙盅口沿');
    expect(prompt).toContain('不要把橙片、绿叶或整蟹摆成装饰盘');
    expect(prompt).toContain('不能用整蟹或蟹腿来说明食材来源');
  });

  test('covers every known dish with specific visual anchors and negatives', () => {
    const names = [
      '蟹酿橙',
      '槐叶冷淘',
      '玉糁羹',
      '王太守八宝豆腐',
      '炙羊肉',
      '驼蹄羹',
      '浑羊殁忽',
      '荷包鱼',
      '荔枝腰子',
      '莲房鱼包',
      '东坡肉',
    ];

    for (const name of names) {
      const spec = DishVisualPromptService.getSpec(name);
      expect(spec.evidence).toBeTruthy();
      expect(spec.referenceShape).toBeTruthy();
      expect(spec.composition).toBeTruthy();
      expect(spec.visualIdentity).toBeTruthy();
      expect(spec.mustInclude.length).toBeGreaterThanOrEqual(3);
      expect(spec.mustAvoid.length).toBeGreaterThanOrEqual(2);
      expect(DishVisualPromptService.buildPrompt({ dishName: name })).toContain(spec.visualIdentity);
      expect(DishVisualPromptService.buildPrompt({ dishName: name })).toContain(spec.referenceShape);
      expect(DishVisualPromptService.buildPrompt({ dishName: name })).toContain(spec.composition);
    }
  });

  test('Agnes image prompt uses dish-specific constraints before generic food photography rules', () => {
    const service = new AgnesImageService({ apiKey: 'test', fetchImpl: jest.fn() });
    const prompt = service.buildPrompt({ dishName: '蟹酿橙', prompt: '南宋蟹酿橙复原菜品图' });

    expect(prompt.indexOf('厚皮黄橙或甜橙作为橙盅容器')).toBeLessThan(prompt.indexOf('真实中式菜品摄影'));
    expect(prompt).toContain('不得出现整只螃蟹');
  });

  test('Agnes image prompt gives 蟹酿橙 a concise model-facing orange cup subject', () => {
    const service = new AgnesImageService({ apiKey: 'test', fetchImpl: jest.fn() });
    const prompt = service.buildPrompt({ dishName: '蟹酿橙', prompt: '南宋蟹酿橙复原菜品图' });

    expect(prompt).toContain('主体只有一个蒸熟橙盅');
    expect(prompt).toContain('steamed orange cup stuffed with crab roe and shredded crab meat');
    expect(prompt).toContain('NO grilled meat');
    expect(prompt).toContain('NO fish fillet');
    expect(prompt).toContain('NO whole crab');
    expect(prompt.indexOf('主体只有一个蒸熟橙盅')).toBeLessThan(prompt.indexOf('南宋蟹酿橙复原菜品图'));
  });

  test('evolution image prompt keeps source dish visual facts but still requires one unified dish', () => {
    const prompt = EvolutionService.buildImagePrompt(
      { name: '橙香东坡蟹粉肉', techniques: ['焖', '酿'], description: '东坡肉吸收蟹酿橙的橙香蟹粉风味' },
      [{ name: '蟹酿橙' }, { name: '东坡肉' }],
      '橙香蟹粉与酱红五花肉融合'
    );

    expect(prompt).toContain('一道完整可食用的融合菜');
    expect(prompt).toContain('单一成品菜');
    expect(prompt).toContain('蟹酿橙视觉事实');
    expect(prompt).toContain('橙盅容器');
    expect(prompt).toContain('东坡肉视觉事实');
    expect(prompt).toContain('酱红方块五花肉');
    expect(prompt).toContain('不要出现整只螃蟹');
    expect(prompt).toContain('不要把两个原菜简单并排');
  });
});
