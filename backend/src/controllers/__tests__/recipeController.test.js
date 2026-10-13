jest.mock('../../models/Dish', () => ({
  findById: jest.fn(),
  findSimilar: jest.fn(),
  search: jest.fn(),
  findByDynasty: jest.fn(),
  findAll: jest.fn(),
}));

const Dish = require('../../models/Dish');
const { getRecipe, searchRecipes } = require('../recipeController');

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

describe('recipeController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns dish detail with similar dishes', async () => {
    const dish = { id: '1', name: '东坡肉' };
    const similar = [{ id: '2', name: '红烧肉' }];
    Dish.findById.mockResolvedValue(dish);
    Dish.findSimilar.mockResolvedValue(similar);

    const res = createResponse();
    await getRecipe({ params: { id: '1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.data.dish).toBe(dish);
    expect(res._json.data.similarDishes).toBe(similar);
  });

  test('returns 404 when dish is missing', async () => {
    Dish.findById.mockResolvedValue(null);
    const res = createResponse();
    await getRecipe({ params: { id: 'missing' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res._json).toEqual({ success: false, message: '菜品不存在' });
  });

  test('search recipes by keyword', async () => {
    const results = [{ id: '1' }];
    Dish.search.mockResolvedValue(results);
    const res = createResponse();
    await searchRecipes({ query: { keyword: '东坡' } }, res);

    expect(Dish.search).toHaveBeenCalledWith('东坡');
    expect(res._json.data).toBe(results);
  });

  test('search recipes by dynasty', async () => {
    const results = [{ id: '1', dynasty: '宋' }];
    Dish.findByDynasty.mockResolvedValue(results);
    const res = createResponse();
    await searchRecipes({ query: { dynasty: '宋' } }, res);

    expect(Dish.findByDynasty).toHaveBeenCalledWith('宋');
  });

  test('lists all recipes when no filters', async () => {
    const all = [{ id: '1' }];
    Dish.findAll.mockResolvedValue(all);
    const res = createResponse();
    await searchRecipes({ query: { page: 1, limit: 10 } }, res);

    expect(Dish.findAll).toHaveBeenCalledWith(1, 10);
  });

  test('catches and returns 500 on errors', async () => {
    Dish.findById.mockRejectedValue(new Error('db error'));
    const res = createResponse();
    await getRecipe({ params: { id: '1' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res._json.success).toBe(false);
  });
});
