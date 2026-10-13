const PythonBridge = require('../PythonBridge');
const TeachingService = require('../TeachingService');

jest.mock('../PythonBridge', () => ({
  teach: jest.fn(),
}));

describe('TeachingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('teach forwards input to PythonBridge and returns structured response', async () => {
    PythonBridge.teach.mockResolvedValue({
      answer: '这道菜起源于宋代。',
      suggestions: ['这道菜的历史是什么？'],
      tips: ['火候很重要'],
      historical_fact: '宋代食谱记载',
    });

    const result = await TeachingService.teach({
      dishId: 'dish_001',
      message: '这道菜的历史？',
      sessionId: 'session_123',
    });

    expect(PythonBridge.teach).toHaveBeenCalledWith('dish_001', '这道菜的历史？');
    expect(result.dishId).toBe('dish_001');
    expect(result.response).toBe('这道菜起源于宋代。');
    expect(result.sessionId).toBe('session_123');
  });

  test('teach returns defaults when PythonBridge has no data', async () => {
    PythonBridge.teach.mockResolvedValue({});

    const result = await TeachingService.teach({
      dishId: 'dish_002',
      message: 'hello',
    });

    expect(result.response).toBe('抱歉，我暂时无法回答这个问题。');
    expect(result.dishName).toBe('未知菜品');
    expect(result.suggestions).toHaveLength(4);
    expect(result.tips).toEqual([]);
    expect(result.historicalFact).toBe('');
  });

  test('getHistory returns empty array', async () => {
    const result = await TeachingService.getHistory('user_1', 'dish_001');
    expect(result).toEqual([]);
  });
});
