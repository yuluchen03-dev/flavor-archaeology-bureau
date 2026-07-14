const DigitalHumanService = require('../DigitalHumanService');

describe('DigitalHumanService', () => {
  const expectConfidence = (narration, expectedConfidence) => {
    expect(narration.evidenceBullets).toContain(`可信度：${expectedConfidence}`);
    expect(narration.shareLine).toContain(`证据可信度${expectedConfidence}`);
  };

  test('builds a role-based ancestor narration from vision and dish evidence', () => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: {
        ancestor: {
          name: '蟹酿橙',
          dynasty: '宋代',
          source_text: '山家清供',
          description: '南宋名菜，将蟹肉填入橙壳中蒸制。',
        },
        rarity: '灭绝',
        confidence: 91,
        vision: {
          provider: 'external',
          labels: ['crab', 'orange', 'steamed dish'],
          evidence: ['Detected crab.', 'Detected orange.'],
          confidence: 0.91,
        },
      },
    });

    expect(narration.speaker).toMatchObject({
      id: 'taotie-curator',
      name: '饕餮考古官',
      role: '风味证据讲解员',
      avatarTone: 'bronze-mask-curator',
    });
    expect(narration.emotion).toBe('curious');
    expect(narration.headline).toContain('蟹酿橙');
    expect(narration.headline).toContain('宋代');
    expect(narration.script).toContain('山家清供');
    expect(narration.script).toContain('蟹酿橙');
    expect(narration.evidenceBullets.join(' ')).toContain('crab');
    expect(narration.evidenceBullets.join(' ')).toContain('91%');
    expect(narration.shareLine).toContain('宋代');
    expect(narration.shareLine).toContain('蟹酿橙');
  });

  test('uses fallback source and confidence when ancestor data is sparse', () => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: {
        vision: {
          provider: 'fallback',
          confidence: 0.62,
          labels: [],
        },
      },
      fragments: [{ source: '碎片档案' }],
    });

    expect(narration.script).toContain('碎片档案');
    expect(narration.evidenceBullets.join(' ')).toContain('62%');
    expect(narration.speaker.name).toBe('饕餮考古官');
  });

  test('tolerates malformed inputs and ignores invalid fragments', () => {
    expect(() => DigitalHumanService.buildAncestorNarration(null)).not.toThrow();
    expect(() => DigitalHumanService.buildAncestorNarration({ ancestorResult: null })).not.toThrow();
    expect(() => DigitalHumanService.buildAncestorNarration({ fragments: null })).not.toThrow();

    const narration = DigitalHumanService.buildAncestorNarration({
      fragments: { source: '不应使用' },
    });

    expect(narration.script).toContain('风味知识库');
    expect(narration.evidenceBullets.join(' ')).toContain('风味知识库');
  });

  test.each([
    [91, '91%'],
    ['91%', '91%'],
    [0.91, '91%'],
    [-20, '0%'],
    [120, '100%'],
    ['not-a-number', '70%'],
    [Number.NaN, '70%'],
  ])('formats ancestor confidence %p as %s', (confidence, expectedConfidence) => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: { confidence },
    });

    expectConfidence(narration, expectedConfidence);
  });

  test.each([
    [0.62, '62%'],
    [62, '62%'],
    [-0.1, '0%'],
    [1.2, '100%'],
    ['invalid', '70%'],
  ])('formats vision confidence %p as %s when ancestor confidence is absent', (confidence, expectedConfidence) => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: {
        vision: { confidence },
      },
    });

    expectConfidence(narration, expectedConfidence);
  });

  test('normalizes labels before rendering script and evidence', () => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: {
        vision: {
          labels: [' crab ', { name: 'orange' }, '', 'orange', 'crab', 'steamed dish', 'bronze bowl', 'ignored label'],
        },
      },
    });
    const renderedText = [narration.script, ...narration.evidenceBullets].join(' ');

    expect(renderedText).toContain('crab');
    expect(renderedText).toContain('orange');
    expect(renderedText).toContain('steamed dish');
    expect(renderedText).toContain('bronze bowl');
    expect(renderedText).not.toContain('ignored label');
    expect(renderedText).not.toContain('[object Object]');
    expect(renderedText.match(/crab/g)).toHaveLength(2);
  });
});
