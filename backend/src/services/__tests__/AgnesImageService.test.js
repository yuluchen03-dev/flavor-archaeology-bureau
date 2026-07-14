const AgnesImageService = require('../AgnesImageService');

describe('AgnesImageService', () => {
  test('reports unavailable when no Agnes API key is configured', () => {
    const service = new AgnesImageService({
      apiKey: '',
      fetchImpl: jest.fn(),
    });

    expect(service.isConfigured()).toBe(false);
  });

  test('calls Agnes image generation endpoint and returns generated image URL', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://cdn.agnes-ai.com/generated/dish.png' }],
      }),
    });
    const service = new AgnesImageService({
      apiKey: 'test-key',
      baseUrl: 'https://apihub.agnes-ai.com/v1',
      model: 'agnes-image-2.0-flash',
      fetchImpl,
    });

    const result = await service.generate({
      dishName: '蟹酿橙',
      prompt: '南宋蟹酿橙复原菜品图',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://apihub.agnes-ai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
      })
    );

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({
      model: 'agnes-image-2.0-flash',
      size: '1024x768',
      extra_body: { response_format: 'url' },
    });
    expect(requestBody.prompt).toContain('南宋蟹酿橙复原菜品图');
    expect(requestBody.prompt).toContain('真实中式菜品摄影');
    expect(requestBody.prompt).toContain('看起来必须是一道真实能上桌的菜');
    expect(requestBody.prompt).toContain('只能生成一盘单一成品菜');
    expect(requestBody.prompt).toContain('所有食材都要是切配、熟制、调味后的可入口状态');
    expect(requestBody.prompt).toContain('不要把两个食材或两道菜简单并排拼贴');

    expect(result).toEqual({
      imageUrl: 'https://cdn.agnes-ai.com/generated/dish.png',
      type: 'generated',
      status: 'generated',
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      prompt: expect.any(String),
      metadata: {
        provider: 'agnes',
        model: 'agnes-image-2.0-flash',
        latencyMs: expect.any(Number),
        mode: 'generated',
        fallbackReason: null,
        configured: true,
      },
    });
  });

  test('supports base64 Agnes image responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: 'abc123' }],
      }),
    });
    const service = new AgnesImageService({
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await service.generate({ dishName: '东坡肉' });

    expect(result.imageUrl).toBe('data:image/png;base64,abc123');
    expect(result.provider).toBe('agnes');
  });

  test('throws an explicit provider error when Agnes rejects the request', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    });
    const service = new AgnesImageService({
      apiKey: 'bad-key',
      fetchImpl,
    });

    await expect(service.generate({ dishName: '东坡肉' })).rejects.toThrow(
      'Agnes image generation failed with status 401: invalid api key'
    );
  });
});
