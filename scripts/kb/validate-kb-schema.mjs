#!/usr/bin/env node
// KB-001 V2 data validator CLI.
// Contract: docs/kb-001/01-schema-contract.md sections 12.1-12.6.
//
// Usage:
//   node scripts/kb/validate-kb-schema.mjs [<path>...]
//
// Exit codes: 0 = pass, 1 = validation failure, 2 = runtime error.
// Output: stdout is JSONL only (one record per line); stderr carries the summary.
// This tool never modifies its inputs; it only reads them.

import fs from 'node:fs';
import path from 'node:path';

import { ErrorCollector } from './lib/errors.mjs';
import { DOC_EXTENSION, REPO_ROOT, SchemaUnreadableError, loadSchema } from './lib/schema.mjs';
import { validateDocument, validateDocuments } from './lib/validate.mjs';

const DEFAULT_TARGET = 'data/kb/examples/valid';

function toRepoRelative(absolutePath) {
  const relative = path.relative(REPO_ROOT, absolutePath);
  return relative.split(path.sep).join('/');
}

// Recursively collects *.kb.json files, returned in lexicographic order of the
// repo-relative POSIX path (contract section 4).
function collectDocuments(target) {
  const absolute = path.resolve(REPO_ROOT, target);
  let stats;
  try {
    stats = fs.statSync(absolute);
  } catch {
    return { error: `target path does not exist: ${toRepoRelative(absolute)}`, files: [] };
  }

  if (stats.isFile()) {
    return { files: [absolute], error: null };
  }
  if (!stats.isDirectory()) {
    return { error: `target path is neither a file nor a directory: ${toRepoRelative(absolute)}`, files: [] };
  }

  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(DOC_EXTENSION)) {
        found.push(full);
      }
    }
  };
  walk(absolute);

  found.sort((a, b) => (toRepoRelative(a) < toRepoRelative(b) ? -1 : toRepoRelative(a) > toRepoRelative(b) ? 1 : 0));
  return { files: found, error: null };
}

function main(argv) {
  const targets = argv.length > 0 ? argv : [DEFAULT_TARGET];

  let schema;
  try {
    schema = loadSchema();
  } catch (error) {
    if (error instanceof SchemaUnreadableError) {
      process.stderr.write(`KB schema validation FAILED: ${error.message}\n`);
      const collector = new ErrorCollector();
      collector.add({
        file: '-',
        entityOrRelationId: '-',
        fieldPath: '-',
        code: 'E_SCHEMA_UNREADABLE',
        message: error.message,
      });
      process.stdout.write(`${collector.toJSONL()}\n`);
      return 2;
    }
    throw error;
  }

  const files = [];
  for (const target of targets) {
    const result = collectDocuments(target);
    if (result.error) {
      process.stderr.write(`KB schema validation FAILED: ${result.error}\n`);
      const collector = new ErrorCollector();
      collector.add({
        file: '-',
        entityOrRelationId: '-',
        fieldPath: '-',
        code: 'E_DOC_SHAPE',
        message: result.error,
      });
      process.stdout.write(`${collector.toJSONL()}\n`);
      return 2;
    }
    files.push(...result.files);
  }

  // A directory scan that finds nothing must not pass silently.
  if (files.length === 0) {
    const collector = new ErrorCollector();
    collector.add({
      file: toRepoRelative(path.resolve(REPO_ROOT, targets[0])),
      entityOrRelationId: '-',
      fieldPath: '-',
      code: 'E_DOC_SHAPE',
      message: `no ${DOC_EXTENSION} documents found under the requested path`,
    });
    process.stdout.write(`${collector.toJSONL()}\n`);
    process.stderr.write('KB schema validation FAILED: 1 error(s) across 1 file(s)\n');
    return 1;
  }

  const collector = new ErrorCollector();
  const documents = [];
  let entityCount = 0;
  let relationCount = 0;

  for (const absolute of files) {
    const relative = toRepoRelative(absolute);
    let rawText;
    try {
      rawText = fs.readFileSync(absolute, 'utf8');
    } catch {
      collector.add({
        file: relative,
        entityOrRelationId: '-',
        fieldPath: '-',
        code: 'E_FILE_PARSE',
        message: 'file could not be read',
      });
      continue;
    }

    const result = validateDocument({ schema, file: relative, rawText });
    for (const record of result.errors) collector.add(record);
    entityCount += result.entities.length;
    relationCount += result.relations.length;
    documents.push({ file: relative, entities: result.entities, relations: result.relations });
  }

  validateDocuments({ schema, documents, errors: collector });

  const jsonl = collector.toJSONL();
  if (jsonl.length > 0) process.stdout.write(`${jsonl}\n`);

  const fileCount = new Set(documents.map((doc) => doc.file)).size;
  if (!collector.ok) {
    process.stderr.write(`KB schema validation FAILED: ${collector.count} error(s) across ${fileCount} file(s)\n`);
    return 1;
  }

  process.stderr.write(`KB schema validation PASSED: ${fileCount} file(s), ${entityCount} entities, ${relationCount} relations\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
