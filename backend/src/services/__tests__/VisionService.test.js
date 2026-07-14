const VisionService = require('../VisionService');
const VisionCandidateMapper = require('../vision/VisionCandidateMapper');

describe('VisionService', () => {
  const unconfiguredProvider = { isConfigured: () => false };
  const originalMapCandidates = VisionCandidateMapper.mapCandidates;

  afterEach(() => {
    VisionCandidateMapper.mapCandidates = originalMapCandidates;
  });

  test('returns structured fallback evidence and dish candidate from image and text clues', async () => {
    const result = await VisionService.analyzeFoodImage({
      imageLabel: 'crab-orange-steamed.jpg',
      description: 'A steamed crab dish served inside an orange shell.',
      imageData: 'data:image/jpeg;base64,abc123',
      provider: unconfiguredProvider,
    });

    expect(result.provider).toBe('fallback');
    expect(result.labels).toEqual(expect.arrayContaining(['crab', 'orange', 'steamed dish']));
    expect(result.ingredients).toEqual(expect.arrayContaining(['crab', 'orange']));
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
    });
    expect(result.dishCandidates[0].confidence).toBeGreaterThan(0.8);
    expect(result.evidence.join(' ')).toContain('crab');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.metadata).toMatchObject({
      provider: 'local-vision-rules',
      mode: 'degraded',
      configured: false,
      fallbackReason: expect.any(String),
    });
  });

  test('returns low-confidence fallback when no usable image or text clues exist', async () => {
    const result = await VisionService.analyzeFoodImage({ provider: unconfiguredProvider });

    expect(result.provider).toBe('fallback');
    expect(result.labels).toEqual([]);
    expect(result.ingredients).toEqual([]);
    expect(result.dishCandidates).toEqual([]);
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.evidence).toContain('No usable visual or text clues were provided.');
  });

  test('uses configured external provider and maps candidates to known dishes', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockResolvedValue({
        provider: 'external',
        model: 'test-vlm',
        labels: ['crab', 'orange'],
        ingredients: ['crab', 'orange'],
        dishCandidates: [{ name: '蟹酿橙', confidence: 0.91, reason: 'visual match' }],
        confidence: 0.91,
        evidence: ['external evidence'],
      }),
    };

    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'photo.jpg',
      description: '',
      provider,
    });

    expect(provider.analyze).toHaveBeenCalledWith({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'photo.jpg',
      description: '',
    });
    expect(result.provider).toBe('external');
    expect(result.model).toBe('test-vlm');
    expect(result.metadata).toMatchObject({
      provider: 'external',
      model: 'test-vlm',
      mode: 'generated',
      configured: true,
    });
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.91,
    });
    expect(result.evidence).toContain('external evidence');
  });

  test('falls back with evidence when external provider fails', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockRejectedValue(new Error('network down')),
    };

    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'A crab dish served inside an orange shell.',
      provider,
    });

    expect(provider.analyze).toHaveBeenCalledWith({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'A crab dish served inside an orange shell.',
    });
    expect(result.provider).toBe('fallback');
    expect(result.evidence).toContain('External VLM unavailable; fallback used. network down');
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
    });
  });

  test('treats malformed provider object as unconfigured fallback', async () => {
    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'A crab dish served inside an orange shell.',
      provider: { isConfigured: true },
    });

    expect(result.provider).toBe('fallback');
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
    });
  });

  test('falls back with evidence when external provider returns invalid result shape', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockResolvedValue({}),
    };

    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'A crab dish served inside an orange shell.',
      provider,
    });

    expect(result.provider).toBe('fallback');
    expect(result.evidence).toContain(
      'External VLM unavailable; fallback used. External VLM result shape was invalid.'
    );
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
    });
  });

  test('does not swallow local mapper bugs as provider fallback', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockResolvedValue({
        provider: 'external',
        model: 'test-vlm',
        labels: ['crab', 'orange'],
        ingredients: ['crab', 'orange'],
        dishCandidates: [{ name: '蟹酿橙', confidence: 0.91, reason: 'visual match' }],
        confidence: 0.91,
        evidence: ['external evidence'],
      }),
    };
    VisionCandidateMapper.mapCandidates = jest.fn(() => {
      throw new Error('mapper bug');
    });

    await expect(
      VisionService.analyzeFoodImage({
        imageData: 'data:image/jpeg;base64,abc123',
        imageLabel: 'photo.jpg',
        description: '',
        provider,
      })
    ).rejects.toThrow('mapper bug');
  });

  test('keeps external result and records evidence when provider candidates do not map', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockResolvedValue({
        provider: 'external',
        model: 'test-vlm',
        labels: ['unknown'],
        ingredients: ['unknown'],
        dishCandidates: [{ name: 'mystery dish', confidence: 0.62, reason: 'not in graph' }],
        confidence: 0.62,
        evidence: ['external evidence'],
      }),
    };

    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'photo.jpg',
      description: '',
      provider,
    });

    expect(result.provider).toBe('external');
    expect(result.dishCandidates).toEqual([]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        'external evidence',
        'External VLM candidates were not found in the local dish graph.',
      ])
    );
  });

  test('records evidence when only some provider candidates map to local dishes', async () => {
    const provider = {
      isConfigured: () => true,
      analyze: jest.fn().mockResolvedValue({
        provider: 'external',
        model: 'test-vlm',
        labels: ['crab', 'orange', 'unknown'],
        ingredients: ['crab', 'orange', 'unknown'],
        dishCandidates: [
          { name: '蟹酿橙', confidence: 0.91, reason: 'visual match' },
          { name: 'mystery dish', confidence: 0.62, reason: 'not in graph' },
        ],
        confidence: 0.91,
        evidence: ['external evidence'],
      }),
    };

    const result = await VisionService.analyzeFoodImage({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'photo.jpg',
      description: '',
      provider,
    });

    expect(result.provider).toBe('external');
    expect(result.dishCandidates).toHaveLength(1);
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.91,
    });
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        'external evidence',
        'External VLM candidates were not found in the local dish graph.',
      ])
    );
  });
});
