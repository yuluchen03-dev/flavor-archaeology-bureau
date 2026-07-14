const FragmentService = require('../FragmentService');

describe('FragmentService', () => {
  test('filters fragments by query, dynasty, source, and tag', () => {
    const results = FragmentService.listFragments({
      q: '蟹',
      dynasty: '宋代',
      source: '山家清供',
      tag: '橙',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      id: 'fragment_shanjiaqinggong_xieniangcheng',
      relatedDishId: 'dish_001',
    });
  });

  test('returns undefined for missing fragment detail', () => {
    expect(FragmentService.getFragmentById('missing')).toBeUndefined();
  });
});
