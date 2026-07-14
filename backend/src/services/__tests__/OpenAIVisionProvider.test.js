const OpenAIVisionProvider = require('../vision/OpenAIVisionProvider');

describe('OpenAIVisionProvider', () => {
  test('reports unavailable when no API key is configured', () => {
    const provider = new OpenAIVisionProvider({
      apiKey: '',
      fetchImpl: jest.fn(),
    });

    expect(provider.isConfigured()).toBe(false);
  });

  test('calls the OpenAI responses endpoint and parses strict JSON content from output content text', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name) => (name === 'x-request-id' ? 'req_123' : null),
      },
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  labels: ['crab', 'orange'],
                  ingredients: ['crab', 'orange'],
                  dishCandidates: [
                    {
                      name: '蟹酿橙',
                      confidence: 0.91,
                      reason: 'crab and orange cues',
                    },
                  ],
                  confidence: 0.91,
                  evidence: ['Detected crab.', 'Detected orange.'],
                }),
              },
            ],
          },
        ],
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
      fetchImpl,
    });

    const result = await provider.analyze({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'served in an orange shell',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
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
      model: 'gpt-4.1-mini',
      temperature: 0.2,
    });
    expect(requestBody.input[0].content).toEqual([
      expect.objectContaining({
        type: 'input_text',
        text: expect.stringContaining('crab-orange.jpg'),
      }),
      {
        type: 'input_image',
        image_url: 'data:image/jpeg;base64,abc123',
      },
    ]);
    expect(requestBody.input[0].content[0].text).toContain('served in an orange shell');

    expect(result.provider).toBe('external');
    expect(result.model).toBe('gpt-4.1-mini');
    expect(result.labels).toEqual(['crab', 'orange']);
    expect(result.ingredients).toEqual(['crab', 'orange']);
    expect(result.confidence).toBe(0.91);
    expect(result.dishCandidates[0].name).toBe('蟹酿橙');
    expect(result.rawProvider.requestId).toBe('req_123');
  });

  test('rejects malformed JSON with an explicit provider error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      json: async () => ({
        output_text: 'not json',
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(
      provider.analyze({
        imageData: 'data:image/png;base64,abc123',
      })
    ).rejects.toThrow('External VLM returned malformed JSON.');
  });

  test('rejects parseable JSON with an invalid provider shape', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      json: async () => ({
        output_text: '{}',
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(
      provider.analyze({
        imageData: 'data:image/png;base64,abc123',
      })
    ).rejects.toThrow('External VLM returned invalid JSON shape.');
  });

  test('rejects non-finite confidence in provider JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      json: async () => ({
        output_text: JSON.stringify({
          labels: [],
          ingredients: [],
          dishCandidates: [],
          confidence: null,
          evidence: [],
        }),
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(
      provider.analyze({
        imageData: 'data:image/png;base64,abc123',
      })
    ).rejects.toThrow('External VLM returned invalid JSON shape.');
  });

  test('parses top-level output_text, preserves zero confidence, and uses OpenAI request ID fallback', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name) => (name === 'openai-request-id' ? 'req_fallback' : null),
      },
      json: async () => ({
        output_text: JSON.stringify({
          labels: [],
          ingredients: [],
          dishCandidates: [],
          confidence: 0,
          evidence: [],
        }),
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await provider.analyze({
      imageData: 'data:image/png;base64,abc123',
    });

    expect(result.confidence).toBe(0);
    expect(result.rawProvider.requestId).toBe('req_fallback');
  });

  test.each([
    [-0.2, 0],
    [1.2, 1],
  ])('clamps confidence %p to %p', async (providerConfidence, expectedConfidence) => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      json: async () => ({
        output_text: JSON.stringify({
          labels: [],
          ingredients: [],
          dishCandidates: [],
          confidence: providerConfidence,
          evidence: [],
        }),
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await provider.analyze({
      imageData: 'data:image/png;base64,abc123',
    });

    expect(result.confidence).toBe(expectedConfidence);
  });

  test('throws an explicit status error when the OpenAI response is not ok', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: () => null,
      },
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(
      provider.analyze({
        imageData: 'data:image/png;base64,abc123',
      })
    ).rejects.toThrow('External VLM request failed with status 429.');
  });

  test('throws when imageData is not a data image URL', async () => {
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      fetchImpl: jest.fn(),
    });

    await expect(
      provider.analyze({
        imageData: 'https://example.com/food.jpg',
      })
    ).rejects.toThrow('External VLM requires an image data URL.');
  });
});
