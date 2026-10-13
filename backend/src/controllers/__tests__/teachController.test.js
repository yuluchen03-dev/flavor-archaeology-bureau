jest.mock('../../services/TeachingService', () => ({
  teach: jest.fn(),
  getHistory: jest.fn(),
}));

const TeachingService = require('../../services/TeachingService');
const { teach, getHistory } = require('../teachController');

function createResponse() {
  const res = {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
  };
  return res;
}

describe('teachController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates input and returns 400 for missing fields', async () => {
    const res = createResponse();
    await teach({ body: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res._json.message).toBe('菜品ID和消息为必填项');
  });

  test('calls teaching service and returns result', async () => {
    const result = { response: '这是唐代名菜' };
    TeachingService.teach.mockResolvedValue(result);
    const res = createResponse();
    await teach({ body: { dishId: 'dish_001', message: '这是什么菜' }, user: { id: 5 } }, res);

    expect(TeachingService.teach).toHaveBeenCalledWith({
      dishId: 'dish_001',
      message: '这是什么菜',
      userId: 5,
    });
    expect(res._json.success).toBe(true);
    expect(res._json.data).toBe(result);
  });

  test('returns 500 on service error', async () => {
    TeachingService.teach.mockRejectedValue(new Error('ai timeout'));
    const res = createResponse();
    await teach({ body: { dishId: 'dish_001', message: 'hi' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res._json.message).toBe('教学过程中出现错误');
  });

  test('fetches teaching history', async () => {
    const history = [{ role: 'user', content: 'hi' }];
    TeachingService.getHistory.mockResolvedValue(history);
    const res = createResponse();
    await getHistory({ user: { id: 5 }, query: { dishId: 'dish_001' } }, res);

    expect(TeachingService.getHistory).toHaveBeenCalledWith(5, 'dish_001');
    expect(res._json.data).toBe(history);
  });
});
