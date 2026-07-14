const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const DEFAULT_AUDIT_PATH = path.join(__dirname, '../../data/ai-runs.jsonl');
const DEFAULT_PROMPT_VERSION = 'restoration-v1';
const DEFAULT_DATA_VERSION = 'local-knowledge-graph';

function hashJson(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex');
}

function createRunId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function readLatency(latencyMs) {
  const value = Number(latencyMs);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

class AiRunAuditService {
  static buildAuditRecord({
    runId = createRunId(),
    timestamp = new Date().toISOString(),
    input = null,
    output = null,
    provider = 'local-python',
    model = 'knowledge-graph-rules',
    mode = 'local',
    fallbackReason = null,
    promptVersion = process.env.RESTORATION_PROMPT_VERSION || DEFAULT_PROMPT_VERSION,
    dataVersion = process.env.RESTORATION_DATA_VERSION || DEFAULT_DATA_VERSION,
    citationIds = [],
    latencyMs = 0,
  } = {}) {
    return {
      runId,
      timestamp,
      inputHash: hashJson(input),
      outputHash: hashJson(output),
      provider,
      model,
      mode,
      fallbackReason: fallbackReason || null,
      promptVersion,
      dataVersion,
      citationIds: Array.isArray(citationIds) ? citationIds.filter(Boolean).map(String) : [],
      latencyMs: readLatency(latencyMs),
    };
  }

  static async appendAuditRecord(record, options = {}) {
    const filePath = options.filePath || DEFAULT_AUDIT_PATH;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
    return { filePath, record };
  }

  static async auditRun(input, options = {}) {
    const record = this.buildAuditRecord(input);
    await this.appendAuditRecord(record, options);
    return record;
  }
}

AiRunAuditService.DEFAULT_AUDIT_PATH = DEFAULT_AUDIT_PATH;

module.exports = AiRunAuditService;
