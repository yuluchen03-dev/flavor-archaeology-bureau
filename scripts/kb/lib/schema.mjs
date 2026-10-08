// KB-001 schema loading and schema-derived helpers.
// Contract: docs/kb-001/01-schema-contract.md section 12.3.
//
// IMPORTANT: the entity/field/enum/relation lists are NEVER hard-coded here.
// They are read from data/kb/schema/kb-schema.v2.json so there is exactly one
// source of truth and no drift between schema and validator.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = '2.0.0';
export const SCHEMA_RELATIVE_PATH = 'data/kb/schema/kb-schema.v2.json';
export const DOC_EXTENSION = '.kb.json';

// scripts/kb/lib/schema.mjs -> scripts/kb/lib -> scripts/kb -> scripts -> repo root
const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(LIB_DIR, '..', '..', '..');

export class SchemaUnreadableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaUnreadableError';
  }
}

export function loadSchema(schemaPath) {
  const absolute = schemaPath
    ? path.resolve(REPO_ROOT, schemaPath)
    : path.join(REPO_ROOT, SCHEMA_RELATIVE_PATH);

  let raw;
  try {
    raw = fs.readFileSync(absolute, 'utf8');
  } catch {
    throw new SchemaUnreadableError(`schema file is missing or unreadable: ${SCHEMA_RELATIVE_PATH}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SchemaUnreadableError(`schema file is not valid JSON: ${SCHEMA_RELATIVE_PATH}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SchemaUnreadableError(`schema file root must be an object: ${SCHEMA_RELATIVE_PATH}`);
  }
  if (!parsed.entities || !parsed.relations || !parsed.enums || !parsed.common_fields) {
    throw new SchemaUnreadableError(`schema file is missing entities/relations/enums/common_fields: ${SCHEMA_RELATIVE_PATH}`);
  }
  if (parsed.schema_version !== SCHEMA_VERSION) {
    throw new SchemaUnreadableError(`schema_version must be ${SCHEMA_VERSION}, got ${String(parsed.schema_version)}`);
  }

  return parsed;
}

export function entityTypes(schema) {
  return Object.keys(schema.entities).sort();
}

export function enumValues(schema, name) {
  const values = schema.enums?.[name];
  return Array.isArray(values) ? values : [];
}

export function relationTypes(schema) {
  return Object.keys(schema.relations).sort();
}

// Legal field paths for unknown_fields validation (contract U3).
// Accepts both `locator.page` and `locator` style entries; array item fields are
// registered in flat form (`steps.text`) and normalised at call time.
export function legalFieldPaths(schema, entityType) {
  const paths = new Set();
  for (const key of Object.keys(schema.common_fields)) {
    paths.add(key);
  }

  for (const key of Object.keys(schema.provenance_fields)) {
    paths.add(`provenance.${key}`);
  }
  const locatorMembers = schema.provenance_fields?.source_locator?.members;
  if (locatorMembers) {
    for (const member of Object.keys(locatorMembers)) {
      paths.add(`provenance.source_locator.${member}`);
    }
  }

  const entity = schema.entities?.[entityType];
  if (entity?.fields) {
    for (const [fieldName, spec] of Object.entries(entity.fields)) {
      paths.add(fieldName);
      if (spec.type === 'object' && spec.members) {
        for (const member of Object.keys(spec.members)) {
          paths.add(`${fieldName}.${member}`);
        }
      }
      if (spec.type === 'array' && spec.item_fields) {
        for (const [itemField, itemSpec] of Object.entries(spec.item_fields)) {
          paths.add(`${fieldName}.${itemField}`);
          if (itemSpec.type === 'array') {
            paths.add(`${fieldName}.${itemField}[]`);
          }
        }
      }
    }
  }

  return paths;
}

// Normalises `steps[0].text` / `steps[].text` to `steps.text` so a single flat
// path set can validate nested declarations.
export function normalizeUnknownPath(rawPath) {
  return String(rawPath)
    .replace(/\[\d+\]/g, '')
    .replace(/\[\]/g, '')
    .replace(/\.\./g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
}
