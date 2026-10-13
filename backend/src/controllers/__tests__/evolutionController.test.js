jest.mock('../../services/EvolutionService', () => ({
  evolve: jest.fn(),
}));

const EvolutionService = require('../../services/EvolutionService');
const { evolve } = require('../evolutionController');

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

describe('evolutionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates input and returns 400 when missing IDs', async () => {
    const res = createResponse();
    await evolve({ body: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res._json.message).toBe('需要提供两个菜品ID: dishId1 和 dishId2');
  });

  test('calls evolution service with valid inputs', async () => {
    const result = { newDish: '新菜品', description: '融合味型' };
    EvolutionService.evolve.mockResolvedValue(result);
    const res = createResponse();
    await evolve({ body: { dishId1: 'dish_001', dishId2: 'dish_002' }, user: { id: 3 } }, res);

    expect(EvolutionService.evolve).toHaveBeenCalledWith({
      dishId1: 'dish_001',
      dishId2: 'dish_002',
      userId: 3,
    });
    expect(res._json.success).toBe(true);
    expect(res._json.data).toBe(result);
  });

  test('returns 500 on service error', async () => {
    EvolutionService.evolve.mockRejectedValue(new Error('evolution failed'));
    const res = createResponse();
    await evolve({ body: { dishId1: '1', dishId2: '2' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res._json.message).toBe('进化分析失败，请稍后重试');
  });
});
