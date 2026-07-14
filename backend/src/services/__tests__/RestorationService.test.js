const fs = require('fs');
const os = require('os');
const path = require('path');

const PythonBridge = require('../PythonBridge');
const RestorationService = require('../RestorationService');

jest.mock('../PythonBridge', () => ({
  analyze: jest.fn(),
  restore: jest.fn(),
  listDishes: jest.fn(),
}));

describe('RestorationService evidence gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeAuditPath() {
    return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'restoration-audit-')), 'runs.jsonl');
  }

  test('returns an uncertain result for weak text clues instead of defaulting to the first dish', async () => {
    PythonBridge.analyze.mockResolvedValue({
      restorations: [],
      suggestions: [],
    });

    const result = await RestorationService.restore({
      clues: { text: '今天中午随便吃点东西' },
    });

    expect(PythonBridge.restore).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dishName: '证据不足',
      evidenceStatus: 'insufficient',
      needsMoreClues: true,
      fallbackReason: expect.stringContaining('未能从输入内容中匹配'),
    });
  });

  test('returns an uncertain result when no meaningful clues are provided', async () => {
    const result = await RestorationService.restore({ clues: {} });

    expect(PythonBridge.listDishes).not.toHaveBeenCalled();
    expect(PythonBridge.restore).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dishName: '证据不足',
      evidenceStatus: 'insufficient',
      needsMoreClues: true,
    });
  });

  test('returns evidence scoring for weak text clues', async () => {
    PythonBridge.analyze.mockResolvedValue({
      restorations: [],
      suggestions: [],
    });

    const result = await RestorationService.restore({
      clues: { text: 'weak text without historical anchors' },
    });

    expect(result.evidenceScore).toBe(0);
    expect(result.evidenceBreakdown).toMatchObject({
      clueMatch: 0,
      sourceMatch: 0,
      ingredientMatch: 0,
      techniqueMatch: 0,
      overallReason: expect.any(String),
    });
  });

  test('returns evidence scoring for missing clues', async () => {
    const result = await RestorationService.restore({ clues: {} });

    expect(result.evidenceScore).toBe(0);
    expect(result.evidenceBreakdown).toMatchObject({
      clueMatch: 0,
      sourceMatch: 0,
      ingredientMatch: 0,
      techniqueMatch: 0,
      overallReason: expect.any(String),
    });
  });

  test('audits missing-clue insufficient restorations when audit persistence is requested', async () => {
    const auditPath = makeAuditPath();

    const result = await RestorationService.restore({
      clues: {},
      auditOptions: { filePath: auditPath },
    });

    expect(result).toMatchObject({
      evidenceStatus: 'insufficient',
      needsMoreClues: true,
      evidenceScore: 0,
      fallbackReason: expect.any(String),
    });

    const lines = fs.readFileSync(auditPath, 'utf8').trim().split(/\r?\n/);
    expect(lines).toHaveLength(1);
    const audit = JSON.parse(lines[0]);
    expect(audit).toMatchObject({
      provider: 'local-python',
      model: 'knowledge-graph-rules',
      mode: 'insufficient',
      fallbackReason: result.fallbackReason,
      citationIds: [],
      promptVersion: expect.any(String),
      dataVersion: expect.any(String),
    });
    expect(audit.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.outputHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('audits successful restorations to JSONL and returns evidence scoring', async () => {
    const auditPath = makeAuditPath();
    PythonBridge.restore.mockResolvedValue({
      dish_id: 'dish_001',
      dish_name: 'Test Dish',
      dynasty: 'Song',
      source: 'Test Source',
      source_url: 'https://example.test/source',
      original_text: 'Original excerpt',
      ingredients: [{ name: 'crab', substitutes: [{ name: 'modern crab' }] }],
      techniques: ['steam'],
      steps: ['steam gently'],
      citations: [{ id: 'source_001' }, { id: 'recipe_001' }],
      ai_metadata: {
        provider: 'local-python',
        model: 'knowledge-graph-rules',
        latencyMs: 7,
        mode: 'local',
        fallbackReason: null,
      },
    });

    const result = await RestorationService.restore({
      clues: { dishId: 'dish_001' },
      auditOptions: { filePath: auditPath },
    });

    expect(result).toMatchObject({
      id: 'dish_001',
      name: 'Test Dish',
      evidenceStatus: 'sufficient',
      evidenceScore: expect.any(Number),
      evidenceBreakdown: expect.objectContaining({
        clueMatch: expect.any(Number),
        sourceMatch: expect.any(Number),
        ingredientMatch: expect.any(Number),
        techniqueMatch: expect.any(Number),
        overallReason: expect.any(String),
      }),
    });
    expect(result.evidenceScore).toBeGreaterThan(0);
    expect(result.evidenceScore).toBeLessThanOrEqual(100);

    const lines = fs.readFileSync(auditPath, 'utf8').trim().split(/\r?\n/);
    expect(lines).toHaveLength(1);
    const audit = JSON.parse(lines[0]);
    expect(audit).toMatchObject({
      provider: 'local-python',
      model: 'knowledge-graph-rules',
      mode: 'local',
      fallbackReason: null,
      citationIds: ['source_001', 'recipe_001'],
      latencyMs: 7,
      promptVersion: expect.any(String),
      dataVersion: expect.any(String),
    });
    expect(audit.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.outputHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('keeps the restoration response when audit persistence fails', async () => {
    const auditDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'restoration-audit-dir-'));
    PythonBridge.restore.mockResolvedValue({
      dish_id: 'dish_001',
      dish_name: 'Test Dish',
      source: 'Test Source',
      ingredients: [],
      steps: [],
      citations: [],
      ai_metadata: {
        provider: 'local-python',
        model: 'knowledge-graph-rules',
        latencyMs: 5,
        mode: 'local',
        fallbackReason: null,
      },
    });

    const result = await RestorationService.restore({
      clues: { dishId: 'dish_001' },
      auditOptions: { filePath: auditDirectory },
    });

    expect(result).toMatchObject({
      id: 'dish_001',
      name: 'Test Dish',
      evidenceStatus: 'sufficient',
      auditError: expect.any(String),
    });
  });

  test('formats restoration engine evidence scoring for successful results', () => {
    const result = RestorationService.formatRestorationResult({
      dish_id: 'dish_001',
      dish_name: 'Test Dish',
      source: 'Test Source',
      source_url: 'https://example.test/source',
      original_text: 'Original excerpt',
      ingredients: [{ name: 'crab' }],
      techniques: ['steam'],
      steps: ['steam gently'],
      citations: [{ id: 'source_001' }],
      ai_metadata: {
        provider: 'local-python',
        model: 'knowledge-graph-rules',
        latencyMs: 3,
        mode: 'local',
        fallbackReason: null,
      },
    });

    expect(result.evidenceStatus).toBe('sufficient');
    expect(result.evidenceScore).toEqual(expect.any(Number));
    expect(result.evidenceScore).toBeGreaterThan(0);
    expect(result.evidenceBreakdown).toMatchObject({
      clueMatch: expect.any(Number),
      sourceMatch: expect.any(Number),
      ingredientMatch: expect.any(Number),
      techniqueMatch: expect.any(Number),
      overallReason: expect.any(String),
    });
  });

  test('preserves citations and ai metadata from the restoration engine', () => {
    const result = RestorationService.formatRestorationResult({
      dish_name: '蟹酿橙',
      dish_id: 'dish_001',
      dynasty: '宋代',
      source: '山家清供',
      source_url: 'https://ci.nii.ac.jp/ncid/BN13499321?l=en',
      original_text: '橙用黄熟大者，以蟹膏肉实其内。',
      ingredients: [],
      steps: ['截顶去瓤'],
      citations: [
        {
          evidence_type: 'source_text',
          title: '山家清供',
          source_url: 'https://ci.nii.ac.jp/ncid/BN13499321?l=en',
          verification_note: 'CiNii Books 可检索该丛刊馆藏。',
          license_note: '仅保存短摘录。',
          copyright_note: '限制为必要短摘录。',
          expertReviewed: false,
        },
      ],
      verification_note: 'CiNii Books 可检索该丛刊馆藏。',
      license_note: '仅保存短摘录。',
      copyright_note: '限制为必要短摘录。',
      expertReviewed: false,
      ai_metadata: {
        provider: 'local-python',
        model: 'knowledge-graph-rules',
        latencyMs: 3,
        mode: 'local',
        configured: false,
        fallbackReason: null,
      },
    });

    expect(result).toMatchObject({
      id: 'dish_001',
      name: '蟹酿橙',
      sourceUrl: 'https://ci.nii.ac.jp/ncid/BN13499321?l=en',
      citations: [
        expect.objectContaining({
          evidence_type: 'source_text',
          title: '山家清供',
          source_url: 'https://ci.nii.ac.jp/ncid/BN13499321?l=en',
        }),
      ],
      ai: {
        provider: 'local-python',
        mode: 'local',
      },
      evidenceStatus: 'sufficient',
      expertReviewed: false,
    });
  });
});
