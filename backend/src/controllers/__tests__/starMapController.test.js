jest.mock('../../services/StarMapService', () => ({
  getStarMapData: jest.fn(),
  getDishPosition: jest.fn(),
}));

const StarMapService = require('../../services/StarMapService');
const { getStarMap, getDishPosition } = require('../starMapController');

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

describe('starMapController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns star map data filtered by dynasty', async () => {
    const data = { nodes: [], edges: [] };
    StarMapService.getStarMapData.mockResolvedValue(data);
    const res = createResponse();
    await getStarMap({ query: { dynasty: '唐' } }, res);

    expect(StarMapService.getStarMapData).toHaveBeenCalledWith({ dynasty: '唐' });
    expect(res._json.success).toBe(true);
    expect(res._json.data).toBe(data);
  });

  test('returns dish position', async () => {
    const position = { x: 10, y: 20 };
    StarMapService.getDishPosition.mockResolvedValue(position);
    const res = createResponse();
    await getDishPosition({ params: { id: 'dish_001' } }, res);

    expect(StarMapService.getDishPosition).toHaveBeenCalledWith('dish_001');
    expect(res._json.data).toBe(position);
  });

  test('returns 404 when position is missing', async () => {
    StarMapService.getDishPosition.mockResolvedValue(null);
    const res = createResponse();
    await getDishPosition({ params: { id: 'missing' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res._json).toEqual({ success: false, message: '菜品不存在' });
  });

  test('catches and returns 500 on errors', async () => {
    StarMapService.getDishPosition.mockRejectedValue(new Error('service error'));
    const res = createResponse();
    await getDishPosition({ params: { id: 'dish_001' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res._json.success).toBe(false);
  });
});
