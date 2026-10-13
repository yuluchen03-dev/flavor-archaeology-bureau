const PythonBridge = require('../PythonBridge');
const AnalysisService = require('../AnalysisService');

jest.mock('../PythonBridge', () => ({
  analyze: jest.fn(),
}));

describe('AnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('analyze returns structured analysis from PythonBridge', async () => {
    PythonBridge.analyze.mockResolvedValue({
      clues: {
        matched_dishes: [{ id: 'dish_001', name: '蟹酿橙', confidence: 0.85, matched_keyword: '蟹' }],
        matched_ingredients: [{ id: 'ing_001', name: '蟹肉', matched_keyword: '蟹' }],
        matched_techniques: [{ id: 'tech_001', name: '蒸' }],
        matched_dynasties: [{ id: 'dyn_001', name: '宋代' }],
        matched_regions: [{ id: 'reg_001', name: '江南' }],
        keywords: ['蟹', '橙'],
      },
      restorations: [],
      suggestions: ['试试增加橄榄油'],
    });

    const result = await AnalysisService.analyze({
      inputType: 'text',
      content: '这是一道宋代蟹酿橙的菜',
    });

    expect(result.inputType).toBe('text');
    expect(result.content).toBe('这是一道宋代蟹酿橙的菜');
    expect(result.confidence).toBe(0.85);
    expect(result.possibleDishes).toHaveLength(1);
    expect(result.historicalContext).toContain('宋代');
    expect(result.historicalContext).toContain('江南');
  });

  test('analyze returns fallback confidence when no dishes matched', async () => {
    PythonBridge.analyze.mockResolvedValue({
      clues: {
        matched_dishes: [],
        matched_ingredients: [],
        matched_techniques: [],
        matched_dynasties: [],
        matched_regions: [],
        keywords: [],
      },
      restorations: [],
      suggestions: [],
    });

    const result = await AnalysisService.analyze({ content: '随机文本' });
    expect(result.confidence).toBe(0.3);
    expect(result.historicalContext).toBe('根据古籍记载分析线索，尝试还原历史美味。');
  });

  test('analyze includes all clue categories in output', async () => {
    PythonBridge.analyze.mockResolvedValue({
      clues: {
        matched_dishes: [{ id: 'd1', name: 'Test Dish', confidence: 0.5, matched_keyword: 'test' }],
        matched_ingredients: [{ id: 'i1', name: 'Test Ingredient', matched_keyword: 'test' }],
        matched_techniques: [{ id: 't1', name: 'Test Method' }],
        matched_dynasties: [{ id: 'x1', name: '唐代' }],
        matched_regions: [{ id: 'r1', name: '长安' }],
        keywords: ['test'],
      },
      restorations: ['restoration1'],
      suggestions: ['suggestion1'],
    });

    const result = await AnalysisService.analyze({ content: 'test' });

    expect(result.ingredients).toHaveLength(1);
    expect(result.cookingMethods).toHaveLength(1);
    expect(result.dynasties).toHaveLength(1);
    expect(result.regions).toHaveLength(1);
    expect(result.restorations).toEqual(['restoration1']);
    expect(result.suggestions).toEqual(['suggestion1']);
    expect(result.rawClues).toBeDefined();
  });

  test('getUserHistory returns empty array for unconnected DB', async () => {
    const result = await AnalysisService.getUserHistory(1, 1, 10);
    expect(result).toEqual([]);
  });
});