const VisionCandidateMapper = require('../vision/VisionCandidateMapper');

describe('VisionCandidateMapper', () => {
  test('returns an empty array for null and non-array inputs', () => {
    expect(VisionCandidateMapper.mapCandidates(null)).toEqual([]);
    expect(VisionCandidateMapper.mapCandidates({ name: '蟹酿橙' })).toEqual([]);
    expect(VisionCandidateMapper.mapCandidates('蟹酿橙')).toEqual([]);
  });

  test('ignores null undefined and non-object entries inside candidate arrays', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      null,
      undefined,
      '蟹酿橙',
      7,
      { dishId: 'dish_001', confidence: 0.91, reason: 'valid candidate' },
    ]);

    expect(mapped).toEqual([
      {
        dishId: 'dish_001',
        name: '蟹酿橙',
        confidence: 0.91,
        reason: 'valid candidate',
      },
    ]);
  });

  test('maps provider candidates by dish id and Chinese dish name', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { dishId: 'dish_001', name: 'orange crab', confidence: 0.9, reason: 'id supplied' },
      { name: '蟹酿橙', confidence: 0.88, reason: 'name supplied' },
    ]);

    expect(mapped).toEqual([
      {
        dishId: 'dish_001',
        name: '蟹酿橙',
        confidence: 0.9,
        reason: 'id supplied',
      },
      {
        dishId: 'dish_001',
        name: '蟹酿橙',
        confidence: 0.88,
        reason: 'name supplied',
      },
    ]);
  });

  test('trims candidate names before exact local dish name matching', () => {
    const mapped = VisionCandidateMapper.mapCandidates([{ name: '东坡肉 ', confidence: 0.61 }]);

    expect(mapped).toEqual([
      {
        dishId: 'dish_010',
        name: '东坡肉',
        confidence: 0.61,
        reason: 'Mapped provider candidate to 东坡肉.',
      },
    ]);
  });

  test('maps by keyword when id and exact name are absent', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { name: 'steamed orange shell with crab', confidence: 0.77, reason: 'visual text' },
    ]);

    expect(mapped).toEqual([
      {
        dishId: 'dish_001',
        name: '蟹酿橙',
        confidence: 0.77,
        reason: 'visual text',
      },
    ]);
  });

  test('excludes unmapped candidates', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { name: 'unknown fantasy dish', confidence: 0.8, reason: 'no local match' },
    ]);

    expect(mapped).toEqual([]);
  });
});
