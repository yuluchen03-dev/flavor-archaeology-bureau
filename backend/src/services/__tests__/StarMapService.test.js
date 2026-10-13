const PythonBridge = require('../PythonBridge');
const StarMapService = require('../StarMapService');

jest.mock('../PythonBridge', () => ({
  getStarMap: jest.fn(),
}));

describe('StarMapService', () => {
  const mockStarMapData = {
    dishes: [
      {
        id: 'dish_001',
        name: '蟹酿橙',
        dynasty: '宋代',
        x: 10,
        y: 20,
        size: 15,
        difficulty: '困难',
        taste_profile: '鲜',
        description: '蟹肉橙羹',
        source_text: '山家清供',
      },
      {
        id: 'dish_002',
        name: '槐叶冷淘',
        dynasty: '唐代',
        x: 5,
        y: 15,
        size: 12,
        difficulty: '中等',
        taste_profile: '清凉',
        description: '唐代凉面',
        source_text: '唐会要',
      },
    ],
    connections: [
      { from: 'dish_001', to: 'dish_002' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getStarMapData returns points and connections', async () => {
    PythonBridge.getStarMap.mockResolvedValue(mockStarMapData);

    const result = await StarMapService.getStarMapData({});

    expect(result.points).toHaveLength(2);
    expect(result.points[0].name).toBe('蟹酿橙');
    expect(result.points[0].color).toBe('#4169E1');
    expect(result.connections).toHaveLength(1);
    expect(result.statistics.totalDishes).toBe(2);
  });

  test('getStarMapData filters by dynasty', async () => {
    PythonBridge.getStarMap.mockResolvedValue(mockStarMapData);

    const result = await StarMapService.getStarMapData({ dynasty: '宋代' });

    expect(result.points).toHaveLength(1);
    expect(result.points[0].name).toBe('蟹酿橙');
    expect(result.connections).toHaveLength(0);
  });

  test('getDishPosition returns related dishes', async () => {
    PythonBridge.getStarMap.mockResolvedValue(mockStarMapData);

    const result = await StarMapService.getDishPosition('dish_001');

    expect(result.id).toBe('dish_001');
    expect(result.similarDishes).toHaveLength(1);
    expect(result.similarDishes[0].name).toBe('槐叶冷淘');
  });

  test('getDishPosition returns null for unknown dish', async () => {
    PythonBridge.getStarMap.mockResolvedValue(mockStarMapData);

    const result = await StarMapService.getDishPosition('unknown');
    expect(result).toBeNull();
  });

  test('getDishColor returns default color for unknown dynasty', () => {
    expect(StarMapService.getDishColor('Unknown')).toBe('#808080');
  });
});
