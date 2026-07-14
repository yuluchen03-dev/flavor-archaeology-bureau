const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AiRunAuditService = require('../AiRunAuditService');

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('AiRunAuditService', () => {
  test('builds an auditable run record with input and output hashes', () => {
    const input = { clues: { text: 'crab and orange' }, preferences: { spicy: false } };
    const output = { dishName: 'Test Dish', evidenceScore: 88 };

    const record = AiRunAuditService.buildAuditRecord({
      runId: 'run-fixed',
      timestamp: '2026-07-06T12:00:00.000Z',
      input,
      output,
      provider: 'local-python',
      model: 'knowledge-graph-rules',
      mode: 'local',
      fallbackReason: null,
      promptVersion: 'restoration-v1',
      dataVersion: 'kg-2026-07',
      citationIds: ['source_001', 'recipe_001'],
      latencyMs: 42,
    });

    expect(record).toEqual({
      runId: 'run-fixed',
      timestamp: '2026-07-06T12:00:00.000Z',
      inputHash: sha256(input),
      outputHash: sha256(output),
      provider: 'local-python',
      model: 'knowledge-graph-rules',
      mode: 'local',
      fallbackReason: null,
      promptVersion: 'restoration-v1',
      dataVersion: 'kg-2026-07',
      citationIds: ['source_001', 'recipe_001'],
      latencyMs: 42,
    });
  });

  test('appends audit records as JSONL and creates the parent directory', async () => {
    const auditPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ai-run-audit-')),
      'nested',
      'runs.jsonl'
    );

    const first = AiRunAuditService.buildAuditRecord({
      runId: 'run-1',
      timestamp: '2026-07-06T12:00:00.000Z',
      input: { id: 1 },
      output: { ok: true },
      provider: 'local-python',
      model: 'rules',
      mode: 'local',
      citationIds: [],
      latencyMs: 3,
    });
    const second = AiRunAuditService.buildAuditRecord({
      runId: 'run-2',
      timestamp: '2026-07-06T12:00:01.000Z',
      input: { id: 2 },
      output: { ok: false },
      provider: 'local-python',
      model: 'rules',
      mode: 'insufficient',
      fallbackReason: 'weak clues',
      citationIds: ['source_010'],
      latencyMs: 4,
    });

    await AiRunAuditService.appendAuditRecord(first, { filePath: auditPath });
    await AiRunAuditService.appendAuditRecord(second, { filePath: auditPath });

    const lines = fs.readFileSync(auditPath, 'utf8').trim().split(/\r?\n/);
    expect(lines.map((line) => JSON.parse(line))).toEqual([first, second]);
  });
});
