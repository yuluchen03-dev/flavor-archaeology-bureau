// KB-001 error collection and output formatting.
// Contract: docs/kb-001/01-schema-contract.md sections 12.4 / 12.6.
// Every record carries exactly the five contract fields:
//   file / entityOrRelationId / fieldPath / code / message

const ABSOLUTE_PATH_PATTERNS = [
  // Windows drive paths, e.g. C:\Users\name\repo\...
  /[A-Za-z]:\\[^\s"']*/g,
  // UNC paths
  /\\\\[^\s"']*/g,
  // POSIX home paths
  /\/(?:home|Users)\/[^\s"']*/g,
];

// V4: messages must not echo whole source text, .env values, or absolute paths
// containing a user name. Messages are built from field paths and codes only;
// this is a defensive second pass over anything that reaches a message.
export function sanitizeMessage(message) {
  let out = String(message ?? '');
  for (const pattern of ABSOLUTE_PATH_PATTERNS) {
    out = out.replace(pattern, '<path>');
  }
  return out;
}

export class ErrorCollector {
  constructor() {
    this.records = [];
  }

  add({ file, entityOrRelationId, fieldPath, code, message }) {
    this.records.push({
      file: file ?? '-',
      entityOrRelationId: entityOrRelationId ?? '-',
      fieldPath: fieldPath ?? '-',
      code,
      message: sanitizeMessage(message),
    });
  }

  get count() {
    return this.records.length;
  }

  get ok() {
    return this.records.length === 0;
  }

  // JSONL, one record per line, in insertion order. Callers insert in
  // deterministic (file, document) order so repeated runs are byte-identical.
  toJSONL() {
    return this.records.map((record) => JSON.stringify(record)).join('\n');
  }
}
