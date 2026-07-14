const express = require('express');

const mockGenerate = jest.fn();

jest.mock('../../services/AgnesImageService', () => {
  return jest.fn().mockImplementation(() => ({
    isConfigured: () => true,
    generate: mockGenerate,
  }));
});

const apiRoutes = require('../api');

function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('generate-image route', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    baseUrl = testServer.baseUrl;
  });

  beforeEach(() => {
    mockGenerate.mockReset();
    mockGenerate.mockResolvedValue({
      imageUrl: 'https://example.test/dish.png',
      type: 'generated',
      status: 'generated',
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      prompt: 'mock prompt',
      metadata: {
        provider: 'agnes',
        model: 'agnes-image-2.0-flash',
        latencyMs: 10,
        mode: 'generated',
        fallbackReason: null,
        configured: true,
      },
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('accepts POST JSON so Chinese dish names are preserved', async () => {
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishName: '蟹酿橙',
        prompt: '南宋蟹酿橙复原成品图',
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data).toMatchObject({
      imageUrl: 'https://example.test/dish.png',
      status: 'generated',
      metadata: {
        provider: 'agnes',
        mode: 'generated',
        configured: true,
      },
    });
    expect(mockGenerate).toHaveBeenCalledWith({
      dishName: '蟹酿橙',
      prompt: '南宋蟹酿橙复原成品图',
    });
  });

  test('recovers known dish name from encoded GET url when query decoding is damaged', async () => {
    const encodedDish = encodeURIComponent('蟹酿橙');
    const encodedPrompt = encodeURIComponent('南宋蟹酿橙复原成品图');
    const response = await fetch(`${baseUrl}/api/generate-image?dishName=???&prompt=${encodedPrompt}&hint=${encodedDish}`);

    expect(response.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledWith({
      dishName: '蟹酿橙',
      prompt: '南宋蟹酿橙复原成品图',
    });
  });

  test('uses dishId as a stable visual key when Chinese text is damaged', async () => {
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishId: 'dish_001',
        dishName: '???',
        prompt: '???',
      }),
    });

    expect(response.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledWith({
      dishName: '蟹酿橙',
      prompt: '???',
    });
  });

  test('maps recipe ids independently from graph dish ids', async () => {
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishId: 'recipe_005',
        dishName: '???',
        prompt: '???',
      }),
    });

    expect(response.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledWith({
      dishName: '炙羊肉',
      prompt: '???',
    });
  });

  test('marks placeholder fallback as degraded instead of pretending it was generated', async () => {
    mockGenerate.mockRejectedValue(new Error('provider unavailable'));

    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishId: 'dish_001',
        dishName: '蟹酿橙',
        prompt: '南宋蟹酿橙复原成品图',
      }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      type: 'placeholder',
      status: 'degraded',
      fallbackReason: expect.stringContaining('provider unavailable'),
      metadata: {
        provider: 'agnes',
        mode: 'degraded',
        configured: true,
      },
    });
  });
});
