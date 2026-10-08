// KB-001 document validation engine.
// Contract: docs/kb-001/01-schema-contract.md sections 4-12.
//
// Design notes:
// - Structure errors fail (exit 1). Explicitly-insufficient records are kept and
//   are NOT errors: review_status has no `verified` value at all (R1), and R2/R3
//   force insufficient/unresolved records into {unreviewed, rejected}. That makes
//   "silently marked verified" structurally impossible rather than merely checked.
// - This module never writes to any input file; it only reads parsed documents.

import {
  DOC_EXTENSION,
  SCHEMA_VERSION,
  entityTypes,
  enumValues,
  legalFieldPaths,
  normalizeUnknownPath,
} from './schema.mjs';

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MIN = -3000;
const YEAR_MAX = 2200;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typeOfValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function expectedLabel(spec) {
  return spec.type;
}

// ---------------------------------------------------------------------------
// Field-level checks
// ---------------------------------------------------------------------------

function checkFieldValue(ctx, spec, value, path) {
  const { errors, entityId, file } = ctx;
  const add = (code, message) => errors.add({ file, entityOrRelationId: entityId, fieldPath: path, code, message });

  if (value === null) {
    if (spec.nullable === false) {
      add('E_NULL_NOT_ALLOWED', `field "${path}" is not nullable but is null`);
    }
    return;
  }

  const actual = typeOfValue(value);
  // JSON has a single numeric type, so "integer" and "number" both arrive as
  // typeof "number"; integrality is enforced separately below.
  const numericMatch = actual === 'number' && (spec.type === 'number' || spec.type === 'integer');
  if (actual !== spec.type && !numericMatch) {
    add('E_FIELD_TYPE', `field "${path}" must be ${expectedLabel(spec)} but is ${actual}`);
    return;
  }

  if (spec.type === 'integer' && !Number.isInteger(value)) {
    add('E_FIELD_TYPE', `field "${path}" must be an integer`);
    return;
  }

  if (spec.type === 'string') {
    if (spec.min_length !== undefined && value.trim().length < spec.min_length) {
      add('E_FIELD_TYPE', `field "${path}" must be a non-empty string`);
      return;
    }
    if (spec.pattern && !new RegExp(spec.pattern).test(value)) {
      add('E_FIELD_TYPE', `field "${path}" does not match required format ${spec.pattern}`);
      return;
    }
  }

  if (spec.type === 'number' || spec.type === 'integer') {
    if (spec.min !== undefined && value < spec.min) {
      add('E_FIELD_TYPE', `field "${path}" must be >= ${spec.min}`);
      return;
    }
    if (spec.max !== undefined && value > spec.max) {
      add('E_FIELD_TYPE', `field "${path}" must be <= ${spec.max}`);
      return;
    }
  }

  if (spec.type === 'array') {
    if (spec.min_items !== undefined && value.length < spec.min_items) {
      add('E_FIELD_TYPE', `field "${path}" must contain at least ${spec.min_items} item(s)`);
      return;
    }
    value.forEach((item, index) => {
      if (spec.items === 'string' && typeof item !== 'string') {
        add('E_FIELD_TYPE', `field "${path}[${index}]" must be string but is ${typeOfValue(item)}`);
      }
    });
  }

  if (spec.enum) {
    const allowed = enumValues(ctx.schema, spec.enum);
    if (!allowed.includes(value)) {
      add('E_ENUM_INVALID', `field "${path}" value is not one of: ${allowed.join(', ')}`);
      return;
    }
  }

  if (spec.const !== undefined && value !== spec.const) {
    add('E_ENUM_INVALID', `field "${path}" must equal "${spec.const}"`);
    return;
  }

  if (spec.type === 'object' && spec.members) {
    for (const [memberName, memberSpec] of Object.entries(spec.members)) {
      const memberPath = `${path}.${memberName}`;
      const present = Object.prototype.hasOwnProperty.call(value, memberName);
      if (!present) {
        if (memberSpec.required) {
          add('E_MISSING_FIELD', `field "${memberPath}" is required`);
        }
        continue;
      }
      checkFieldValue(ctx, memberSpec, value[memberName], memberPath);
    }
  }
}

// Collects the set of field paths that are declared nullable-and-required so that
// U1 ("null must be declared in unknown_fields") can be enforced.
function requiredNullablePaths(schema, entityType) {
  const paths = new Set();

  for (const [fieldName, spec] of Object.entries(schema.common_fields)) {
    if (spec.required && spec.nullable === true) paths.add(fieldName);
  }
  for (const [fieldName, spec] of Object.entries(schema.provenance_fields)) {
    if (spec.required && spec.nullable === true) paths.add(`provenance.${fieldName}`);
  }

  const entity = schema.entities?.[entityType];
  for (const [fieldName, spec] of Object.entries(entity?.fields ?? {})) {
    if (spec.required && spec.nullable === true) {
      paths.add(fieldName);
    } else if (spec.type === 'object' && spec.members) {
      for (const [memberName, memberSpec] of Object.entries(spec.members)) {
        if (memberSpec.required && memberSpec.nullable === true) {
          paths.add(`${fieldName}.${memberName}`);
        }
      }
    }
  }

  return paths;
}

// Walks the declared structure and returns the paths whose value is null.
function collectNullPaths(schema, entityType, entity) {
  const nullPaths = new Set();
  const mark = (path, value, spec) => {
    if (value === null) {
      nullPaths.add(path);
      return;
    }
    if (spec?.type === 'object' && spec.members && isPlainObject(value)) {
      for (const [memberName, memberSpec] of Object.entries(spec.members)) {
        if (Object.prototype.hasOwnProperty.call(value, memberName)) {
          mark(`${path}.${memberName}`, value[memberName], memberSpec);
        }
      }
    }
  };

  for (const [fieldName, spec] of Object.entries(schema.common_fields)) {
    if (Object.prototype.hasOwnProperty.call(entity, fieldName)) {
      mark(fieldName, entity[fieldName], spec);
    }
  }
  for (const [fieldName, spec] of Object.entries(schema.provenance_fields)) {
    if (isPlainObject(entity.provenance) && Object.prototype.hasOwnProperty.call(entity.provenance, fieldName)) {
      mark(`provenance.${fieldName}`, entity.provenance[fieldName], spec);
    }
  }

  const entitySpec = schema.entities?.[entityType];
  for (const [fieldName, spec] of Object.entries(entitySpec?.fields ?? {})) {
    if (Object.prototype.hasOwnProperty.call(entity, fieldName)) {
      mark(fieldName, entity[fieldName], spec);
    }
  }

  return nullPaths;
}

// ---------------------------------------------------------------------------
// Entity checks
// ---------------------------------------------------------------------------

function checkProvenance(ctx, provenance, ownerLabel, unknownPaths, hasUnknownDeclaration) {
  const { errors, file, entityId } = ctx;
  const path_ = 'provenance';
  const add = (code, message) => errors.add({ file, entityOrRelationId: entityId, fieldPath: path_, code, message });

  if (!isPlainObject(provenance)) {
    add('E_PROVENANCE_SHAPE', `${ownerLabel} provenance must be an object`);
    return;
  }

  for (const [fieldName, spec] of Object.entries(ctx.schema.provenance_fields)) {
    const present = Object.prototype.hasOwnProperty.call(provenance, fieldName);
    if (!present) {
      if (spec.required) {
        add('E_PROVENANCE_SHAPE', `${ownerLabel} provenance is missing required field "${fieldName}"`);
      }
      continue;
    }
    checkFieldValue(ctx, spec, provenance[fieldName], `${path_}.${fieldName}`);
  }

  const derivation = provenance.derivation;
  const assertedBy = provenance.asserted_by;

  // P1: primary_source requires basis_ids and a non-empty source_locator member.
  if (derivation === 'primary_source') {
    const basis = Array.isArray(provenance.basis_ids) ? provenance.basis_ids : [];
    const locator = isPlainObject(provenance.source_locator) ? provenance.source_locator : null;
    const locatorHasMember = locator
      ? ['work_id', 'edition_id', 'passage_id', 'locator'].some((key) => typeof locator[key] === 'string' && locator[key].length > 0)
      : false;
    if (basis.length === 0 || !locator || !locatorHasMember) {
      add('E_PROVENANCE_MISSING', `${ownerLabel} provenance.derivation=primary_source requires non-empty basis_ids and a non-empty source_locator member`);
    }
  }

  // P2: unresolved requires an explicit declaration (unknown_fields for entities,
  // provenance.notes for relations).
  if (derivation === 'unresolved') {
    const hasNotes = typeof provenance.notes === 'string' && provenance.notes.trim().length > 0;
    if (!hasUnknownDeclaration && !hasNotes) {
      add('E_PROVENANCE_SHAPE', `${ownerLabel} provenance.derivation=unresolved requires a non-empty unknown_fields (entity) or provenance.notes (relation)`);
    }
  }

  // P3: v1_adapter must be asserted by v1_import.
  if (derivation === 'v1_adapter' && assertedBy !== 'v1_import') {
    add('E_PROVENANCE_SHAPE', `${ownerLabel} provenance.derivation=v1_adapter requires asserted_by=v1_import`);
  }

  // asserted_at unknown must be declared.
  if (provenance.asserted_at === null && !unknownPaths.has('provenance.asserted_at')) {
    add('E_UNKNOWN_UNDECLARED', `${ownerLabel} provenance.asserted_at is null and must be listed in unknown_fields`);
  }
}

function checkEntity(ctx, entity, index) {
  const { schema, errors, file } = ctx;
  const label = `entities[${index}]`;

  if (!isPlainObject(entity)) {
    errors.add({ file, entityOrRelationId: '-', fieldPath: label, code: 'E_DOC_SHAPE', message: `${label} must be an object` });
    return null;
  }

  const rawId = typeof entity.id === 'string' ? entity.id : '-';
  const entityId = rawId === '-' ? `entities[${index}]` : rawId;
  const localCtx = { ...ctx, entityId };
  const add = (code, fieldPath, message) => errors.add({ file, entityOrRelationId: entityId, fieldPath, code, message });

  // entity_type first: it selects the field set.
  const entityType = entity.entity_type;
  if (typeof entityType !== 'string' || !schema.entities[entityType]) {
    add('E_UNKNOWN_ENTITY_TYPE', 'entity_type', `entity_type must be one of: ${entityTypes(schema).join(', ')}`);
    return null;
  }

  // Common envelope.
  for (const [fieldName, spec] of Object.entries(schema.common_fields)) {
    const present = Object.prototype.hasOwnProperty.call(entity, fieldName);
    if (!present) {
      if (spec.required) add('E_MISSING_FIELD', fieldName, `field "${fieldName}" is required`);
      continue;
    }
    checkFieldValue(localCtx, spec, entity[fieldName], fieldName);
  }

  // ID format and prefix.
  if (typeof entity.id === 'string') {
    if (!ID_PATTERN.test(entity.id) || entity.id.length < schema.id_min_length || entity.id.length > schema.id_max_length) {
      add('E_ID_FORMAT', 'id', `id must match ${schema.id_pattern} and be ${schema.id_min_length}-${schema.id_max_length} characters`);
    } else {
      const prefix = schema.entities[entityType].id_prefix;
      if (!entity.id.startsWith(prefix)) {
        add('E_ID_FORMAT', 'id', `id for entity_type "${entityType}" must start with "${prefix}"`);
      }
    }
  }

  if (entity.schema_version !== SCHEMA_VERSION) {
    add('E_SCHEMA_VERSION', 'schema_version', `schema_version must be "${SCHEMA_VERSION}"`);
  }

  // Type-specific fields.
  for (const [fieldName, spec] of Object.entries(schema.entities[entityType].fields)) {
    const present = Object.prototype.hasOwnProperty.call(entity, fieldName);
    if (!present) {
      if (spec.required) add('E_MISSING_FIELD', fieldName, `field "${fieldName}" is required for entity_type "${entityType}"`);
      continue;
    }
    checkFieldValue(localCtx, spec, entity[fieldName], fieldName);
  }

  // unknown_fields declaration rules (U1/U3/U4).
  const unknownFields = Array.isArray(entity.unknown_fields) ? entity.unknown_fields : [];
  const declared = new Set();
  const legal = legalFieldPaths(schema, entityType);
  for (const entry of unknownFields) {
    if (typeof entry !== 'string') {
      add('E_UNKNOWN_PATH_INVALID', 'unknown_fields', 'unknown_fields entries must be strings');
      continue;
    }
    const normalized = normalizeUnknownPath(entry);
    declared.add(normalized);
    if (!legal.has(normalized)) {
      add('E_UNKNOWN_PATH_INVALID', 'unknown_fields', `unknown_fields entry "${entry}" is not a declared field path for entity_type "${entityType}"`);
    }
  }

  const nullPaths = collectNullPaths(schema, entityType, entity);
  const nullableRequired = requiredNullablePaths(schema, entityType);
  for (const nullPath of nullPaths) {
    if (nullableRequired.has(nullPath) && !declared.has(nullPath)) {
      add('E_UNKNOWN_UNDECLARED', nullPath, `field "${nullPath}" is null and must be listed in unknown_fields`);
    }
  }

  if (unknownFields.length > 0 && entity.evidence_status === 'sufficient') {
    add('E_EVIDENCE_UNKNOWN_CONFLICT', 'evidence_status', 'evidence_status must not be "sufficient" when unknown_fields is non-empty');
  }

  // R2: insufficient/unknown cannot carry a reviewed status.
  if (['insufficient', 'unknown'].includes(entity.evidence_status)
    && !schema.unreviewed_statuses.includes(entity.review_status)) {
    add('E_EVIDENCE_REVIEW_CONFLICT', 'review_status', `review_status must be one of ${schema.unreviewed_statuses.join(', ')} when evidence_status is "${entity.evidence_status}"`);
  }

  // R3: unresolved provenance cannot carry a reviewed status.
  if (entity.provenance?.derivation === 'unresolved'
    && !schema.unreviewed_statuses.includes(entity.review_status)) {
    add('E_PROVENANCE_UNRESOLVED_CONFLICT', 'review_status', `review_status must be one of ${schema.unreviewed_statuses.join(', ')} when provenance.derivation is "unresolved"`);
  }

  checkProvenance(localCtx, entity.provenance, `entity "${entityId}"`, declared, unknownFields.length > 0);

  // Per-type rules.
  checkEntityRules(localCtx, entity, entityType);

  return entity;
}

function checkEntityRules(ctx, entity, entityType) {
  const { errors, file, entityId, schema } = ctx;
  const add = (code, fieldPath, message) => errors.add({ file, entityOrRelationId: entityId, fieldPath, code, message });
  const notes = (value) => Array.isArray(value) && value.length > 0;

  switch (entityType) {
    case 'SourcePassage': {
      const resolved = entity.edition_resolution === 'resolved';
      if (resolved && (entity.edition_id === null || entity.edition_id === undefined)) {
        add('E_TRACE_MISSING', 'edition_id', 'edition_resolution=resolved requires a non-null edition_id');
      }
      if (!resolved && entity.edition_id !== null && entity.edition_id !== undefined) {
        add('E_TRACE_MISSING', 'edition_id', `edition_resolution=${String(entity.edition_resolution)} requires edition_id to be null (no disambiguation)`);
      }
      if (!resolved && entity.evidence_status === 'sufficient') {
        add('E_TRACE_WEAKENS_CLAIM', 'evidence_status', `edition_resolution=${String(entity.edition_resolution)} requires evidence_status other than "sufficient"`);
      }
      if (resolved && Array.isArray(entity.edition_candidates)
        && !entity.edition_candidates.includes(entity.edition_id)) {
        add('E_TRACE_MISSING', 'edition_candidates', 'edition_id must be one of edition_candidates');
      }
      break;
    }
    case 'HistoricalClaim': {
      // C1 / TR4 are enforced with relation data; C2 and C3 are local.
      if (['insufficient', 'unknown'].includes(entity.evidence_status) && !notes(entity.uncertainty_notes)) {
        add('E_CLAIM_UNCERTAINTY_MISSING', 'uncertainty_notes', 'uncertainty_notes must be non-empty when evidence_status is insufficient or unknown');
      }
      if (!['historical_fact', 'historical_inference'].includes(entity.content_class)) {
        add('E_CONTENT_CLASS_TYPE', 'content_class', 'HistoricalClaim content_class must be historical_fact or historical_inference');
      }
      break;
    }
    case 'Dish': {
      if (entity.dish_kind === 'heritage_practice_lead' && entity.evidence_status === 'sufficient') {
        add('E_CONTENT_CLASS_TYPE', 'evidence_status', 'dish_kind=heritage_practice_lead must not be evidence_status=sufficient');
      }
      break;
    }
    case 'Technique': {
      const level = entity.heritage_designation?.level;
      if (schema.heritage_sourcing_required_levels.includes(level) && entity.provenance?.derivation !== 'primary_source') {
        // A supporting claim chain is resolved in the relation pass; here we only
        // require that a non-primary_source designation is not silently accepted.
        // Marked via a deferred check list so the relation pass can clear it.
        ctx.deferredHeritage.push({ entityId, file, fieldPath: 'heritage_designation.level', level });
      }
      break;
    }
    case 'TimePeriod': {
      const { start_year: start, end_year: end, certainty } = entity;
      if (start !== null && start !== undefined && (start < YEAR_MIN || start > YEAR_MAX)) {
        add('E_TIME_RANGE_INVALID', 'start_year', `start_year must be within ${YEAR_MIN}..${YEAR_MAX}`);
      }
      if (end !== null && end !== undefined && (end < YEAR_MIN || end > YEAR_MAX)) {
        add('E_TIME_RANGE_INVALID', 'end_year', `end_year must be within ${YEAR_MIN}..${YEAR_MAX}`);
      }
      if (typeof start === 'number' && typeof end === 'number' && start > end) {
        add('E_TIME_RANGE_INVALID', 'start_year', 'start_year must be <= end_year');
      }
      if (certainty === 'exact' && (start === null || end === null || start === undefined || end === undefined)) {
        add('E_TIME_RANGE_INVALID', 'certainty', 'certainty=exact requires both start_year and end_year to be non-null');
      }
      break;
    }
    case 'Measurement': {
      const status = entity.normalization_status;
      if (['as_recorded', 'unnormalizable'].includes(status)) {
        if (entity.quantity_value !== null && entity.quantity_value !== undefined) {
          add('E_MEASUREMENT_FABRICATED', 'quantity_value', `normalization_status=${status} requires quantity_value to be null`);
        }
        if (typeof entity.quantity_text !== 'string' || entity.quantity_text.trim().length === 0) {
          add('E_MEASUREMENT_FABRICATED', 'quantity_text', `normalization_status=${status} requires a non-empty quantity_text`);
        }
      }
      if (status === 'normalized') {
        const hasValue = entity.quantity_value !== null && entity.quantity_value !== undefined;
        if (!hasValue || ['unknown', 'to_taste'].includes(entity.unit)) {
          add('E_MEASUREMENT_INCOMPLETE', 'quantity_value', 'normalization_status=normalized requires a numeric quantity_value and a concrete unit');
        }
      }
      break;
    }
    case 'Region': {
      if (entity.region_kind === 'unknown' && Array.isArray(entity.modern_admin_codes) && entity.modern_admin_codes.length > 0) {
        add('E_FIELD_TYPE', 'modern_admin_codes', 'region_kind=unknown requires modern_admin_codes to be an empty array');
      }
      break;
    }
    case 'RestorationVersion': {
      if (entity.version_kind === 'historical_faithful'
        && !['historical_fact', 'historical_inference'].includes(entity.content_class)) {
        add('E_CONTENT_CLASS_TYPE', 'content_class', 'version_kind=historical_faithful requires content_class historical_fact or historical_inference');
      }
      if (['modern_kitchen', 'experimental'].includes(entity.version_kind)) {
        if (!['modern_adaptation', 'user_experiment'].includes(entity.content_class)) {
          add('E_CONTENT_CLASS_TYPE', 'content_class', `version_kind=${entity.version_kind} requires content_class modern_adaptation or user_experiment`);
        }
        if (!notes(entity.adaptation_notes)) {
          add('E_CONTENT_CLASS_TYPE', 'adaptation_notes', `version_kind=${entity.version_kind} requires non-empty adaptation_notes`);
        }
      }
      if (Array.isArray(entity.steps)) {
        const seen = new Set();
        entity.steps.forEach((step, index) => {
          if (!isPlainObject(step)) {
            add('E_FIELD_TYPE', `steps[${index}]`, 'step must be an object');
            return;
          }
          if (Number.isInteger(step.order)) {
            if (seen.has(step.order)) {
              add('E_FIELD_TYPE', `steps[${index}].order`, 'step order must be unique within the document');
            }
            seen.add(step.order);
          }
        });
      }
      break;
    }
    case 'ExpertReview': {
      if (['anonymous', 'unknown'].includes(entity.reviewer_kind) && entity.review_outcome === 'approved') {
        add('E_REVIEW_UNVERIFIABLE', 'review_outcome', `reviewer_kind=${entity.reviewer_kind} must not produce review_outcome=approved`);
      }
      break;
    }
    case 'Experiment': {
      if (entity.content_class !== 'user_experiment') {
        add('E_CONTENT_CLASS_TYPE', 'content_class', 'Experiment content_class must be user_experiment');
      }
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Relation checks
// ---------------------------------------------------------------------------

function relationLabel(relation) {
  if (isPlainObject(relation) && typeof relation.type === 'string') {
    return `${String(relation.source)}->${relation.type}->${String(relation.target)}`;
  }
  return '-';
}

function checkRelation(ctx, relation, index) {
  const { schema, errors, file } = ctx;
  const label = `relations[${index}]`;

  if (!isPlainObject(relation)) {
    errors.add({ file, entityOrRelationId: '-', fieldPath: label, code: 'E_RELATION_SHAPE', message: `${label} must be an object` });
    return null;
  }

  const relationId = relationLabel(relation);
  const localCtx = { ...ctx, entityId: relationId };
  const add = (code, fieldPath, message) => errors.add({ file, entityOrRelationId: relationId, fieldPath, code, message });

  if (typeof relation.type !== 'string' || typeof relation.source !== 'string' || typeof relation.target !== 'string') {
    add('E_RELATION_SHAPE', 'type', `${label} must have string "type", "source" and "target"`);
    return null;
  }

  const spec = schema.relations[relation.type];
  if (!spec) {
    add('E_UNKNOWN_RELATION_TYPE', 'type', `relation type "${relation.type}" is not in the schema relation list`);
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(relation, 'evidence_status')) {
    const allowed = enumValues(schema, 'evidence_status');
    if (!allowed.includes(relation.evidence_status)) {
      add('E_ENUM_INVALID', 'evidence_status', `field "evidence_status" value is not one of: ${allowed.join(', ')}`);
    }
  } else {
    add('E_RELATION_SHAPE', 'evidence_status', 'relation is missing required field "evidence_status"');
  }

  const relationUnknown = Array.isArray(relation.provenance?.basis_ids) ? relation.provenance.basis_ids : [];
  checkProvenance(localCtx, relation.provenance, `relation "${relationId}"`, new Set(), relationUnknown.length > 0);

  if (relation.properties !== undefined) {
    if (!isPlainObject(relation.properties)) {
      add('E_RELATION_SHAPE', 'properties', 'relation properties must be an object when present');
    } else {
      for (const [key, value] of Object.entries(relation.properties)) {
        const propSpec = spec.properties?.[key];
        if (!propSpec) {
          add('E_RELATION_SHAPE', `properties.${key}`, `property "${key}" is not allowed for relation type "${relation.type}"`);
          continue;
        }
        if (value === null) continue;
        const actual = typeOfValue(value);
        const numericMatch = actual === 'number' && (propSpec.type === 'number' || propSpec.type === 'integer');
        if (actual !== propSpec.type && !numericMatch) {
          add('E_RELATION_SHAPE', `properties.${key}`, `property "${key}" must be ${propSpec.type} but is ${actual}`);
          continue;
        }
        if (propSpec.type === 'integer' && !Number.isInteger(value)) {
          add('E_RELATION_SHAPE', `properties.${key}`, `property "${key}" must be an integer`);
          continue;
        }
        if (propSpec.type === 'number' || propSpec.type === 'integer') {
          if (propSpec.min !== undefined && value < propSpec.min) add('E_RELATION_SHAPE', `properties.${key}`, `property "${key}" must be >= ${propSpec.min}`);
          if (propSpec.max !== undefined && value > propSpec.max) add('E_RELATION_SHAPE', `properties.${key}`, `property "${key}" must be <= ${propSpec.max}`);
        }
      }
    }
  }

  return relation;
}

// ---------------------------------------------------------------------------
// Document-level checks (after all entities/relations of the whole run are known)
// ---------------------------------------------------------------------------

export function validateDocuments({ schema, documents, errors }) {
  const entitiesById = new Map();
  const entityTypeById = new Map();

  const firstFileById = new Map();
  const duplicateOccurrences = [];

  for (const doc of documents) {
    for (const entity of doc.entities) {
      if (!isPlainObject(entity) || typeof entity.id !== 'string') continue;
      if (entitiesById.has(entity.id)) {
        duplicateOccurrences.push({ id: entity.id, file: doc.file, firstFile: firstFileById.get(entity.id) ?? doc.file });
        continue;
      }
      entitiesById.set(entity.id, entity);
      entityTypeById.set(entity.id, entity.entity_type);
      firstFileById.set(entity.id, doc.file);
    }
  }

  // One record per duplicate occurrence, attributed to the file where the repeat
  // was found so the five-field output always carries a real repo-relative path.
  for (const occurrence of duplicateOccurrences.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.file < b.file ? -1 : 1))) {
    errors.add({
      file: occurrence.file,
      entityOrRelationId: occurrence.id,
      fieldPath: 'id',
      code: 'E_DUPLICATE_ID',
      message: `id "${occurrence.id}" is already defined in ${occurrence.firstFile}; ids must be unique across the validated document set`,
    });
  }

  // Index relations per document, keeping the owning file for error attribution.
  const relationsByType = new Map();
  const passageEdition = new Map(); // passage id -> [edition ids]
  const editionOfWork = new Map(); // edition id -> [work ids]
  const claimSupportedBy = new Map();
  const claimRefutedBy = new Map();
  const claimAbout = new Map();
  const reviewOf = new Map();
  const experimentTests = new Map();

  for (const doc of documents) {
    for (const relation of doc.relations) {
      if (!isPlainObject(relation) || typeof relation.type !== 'string') continue;
      if (!relationsByType.has(relation.type)) relationsByType.set(relation.type, []);
      relationsByType.get(relation.type).push({ relation, file: doc.file });

      const push = (map, key, value) => {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(value);
      };

      switch (relation.type) {
        case 'passage_in_edition': push(passageEdition, relation.source, relation.target); break;
        case 'edition_of_work': push(editionOfWork, relation.source, relation.target); break;
        case 'claim_supported_by': push(claimSupportedBy, relation.source, relation.target); break;
        case 'claim_refuted_by': push(claimRefutedBy, relation.source, relation.target); break;
        case 'claim_about': push(claimAbout, relation.source, relation.target); break;
        case 'review_of': push(reviewOf, relation.source, relation.target); break;
        case 'experiment_tests': push(experimentTests, relation.source, relation.target); break;
        default: break;
      }
    }
  }

  // Endpoint existence + endpoint type legality.
  for (const doc of documents) {
    for (const relation of doc.relations) {
      if (!isPlainObject(relation) || typeof relation.type !== 'string') continue;
      const spec = schema.relations[relation.type];
      if (!spec) continue;
      const relationId = relationLabel(relation);
      const add = (code, fieldPath, message) => errors.add({ file: doc.file, entityOrRelationId: relationId, fieldPath, code, message });

      for (const end of ['source', 'target']) {
        const id = relation[end];
        if (typeof id !== 'string') continue;
        if (!entitiesById.has(id)) {
          add('E_DANGLING_REFERENCE', end, `relation ${end} "${id}" does not resolve to any entity in the validated document set`);
          continue;
        }
        const actualType = entityTypeById.get(id);
        const allowed = spec[end];
        const wildcard = allowed.includes('*');
        if (!wildcard && !allowed.includes(actualType)) {
          add('E_RELATION_ENDPOINT_TYPE', end, `relation ${end} "${id}" is ${actualType}, expected one of: ${allowed.join(', ')}`);
        }
      }
    }
  }

  // ID-typed field references (dangling checks for *_id / *_ids fields).
  for (const doc of documents) {
    for (const entity of doc.entities) {
      if (!isPlainObject(entity) || typeof entity.id !== 'string') continue;
      const entityType = entity.entity_type;
      const spec = schema.entities?.[entityType];
      if (!spec) continue;
      const add = (code, fieldPath, message) => errors.add({ file: doc.file, entityOrRelationId: entity.id, fieldPath, code, message });

      const checkRef = (fieldPath, idValue, expectedTypes) => {
        if (typeof idValue !== 'string') return;
        if (!entitiesById.has(idValue)) {
          add('E_DANGLING_REFERENCE', fieldPath, `field "${fieldPath}" references "${idValue}" which does not resolve to any entity`);
          return;
        }
        if (expectedTypes && !expectedTypes.includes('*')) {
          const actualType = entityTypeById.get(idValue);
          if (!expectedTypes.includes(actualType)) {
            add('E_DANGLING_REFERENCE', fieldPath, `field "${fieldPath}" references "${idValue}" which is ${actualType}, expected one of: ${expectedTypes.join(', ')}`);
          }
        }
      };

      for (const [fieldName, fieldSpec] of Object.entries(spec.fields)) {
        const value = entity[fieldName];
        if (fieldSpec.id_ref && fieldSpec.type === 'string') {
          checkRef(fieldName, value, fieldSpec.id_ref);
        } else if (fieldSpec.id_ref && fieldSpec.type === 'array' && Array.isArray(value)) {
          value.forEach((item, index) => checkRef(`${fieldName}[${index}]`, item, fieldSpec.id_ref));
        } else if (fieldSpec.type === 'array' && fieldSpec.item_fields) {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (!isPlainObject(item)) return;
              for (const [itemField, itemSpec] of Object.entries(fieldSpec.item_fields)) {
                if (itemSpec.id_ref && itemSpec.type === 'array' && Array.isArray(item[itemField])) {
                  item[itemField].forEach((ref, refIndex) => checkRef(`${fieldName}[${index}].${itemField}[${refIndex}]`, ref, itemSpec.id_ref));
                }
              }
            });
          }
        }
      }
    }
  }

  // Trace chain rules TR1-TR8 and per-entity relation rules.
  for (const doc of documents) {
    for (const entity of doc.entities) {
      if (!isPlainObject(entity) || typeof entity.id !== 'string') continue;
      const entityType = entity.entity_type;
      const add = (code, fieldPath, message) => errors.add({ file: doc.file, entityOrRelationId: entity.id, fieldPath, code, message });

      if (entityType === 'SourcePassage') {
        const inbound = passageEdition.get(entity.id) ?? [];
        const resolved = entity.edition_resolution === 'resolved';
        if (resolved && inbound.length !== 1) {
          add('E_TRACE_MISSING', 'edition_id', `edition_resolution=resolved requires exactly 1 passage_in_edition relation, found ${inbound.length}`);
        }
        if (!resolved && inbound.length !== 0) {
          add('E_TRACE_MISSING', 'edition_id', `edition_resolution=${String(entity.edition_resolution)} requires 0 passage_in_edition relations, found ${inbound.length}`);
        }
        if (resolved && inbound.length === 1 && typeof entity.edition_id === 'string' && entity.edition_id !== inbound[0]) {
          add('E_MIRROR_MISMATCH', 'edition_id', `edition_id "${entity.edition_id}" does not match passage_in_edition target "${inbound[0]}"`);
        }
      }

      if (entityType === 'SourceEdition') {
        const outbound = editionOfWork.get(entity.id) ?? [];
        if (outbound.length !== 1) {
          add('E_TRACE_MISSING', 'work_id', `each SourceEdition requires exactly 1 edition_of_work relation, found ${outbound.length}`);
        } else if (typeof entity.work_id === 'string' && entity.work_id !== outbound[0]) {
          add('E_MIRROR_MISMATCH', 'work_id', `work_id "${entity.work_id}" does not match edition_of_work target "${outbound[0]}"`);
        }
      }

      if (entityType === 'HistoricalClaim') {
        const supported = claimSupportedBy.get(entity.id) ?? [];
        const refuted = claimRefutedBy.get(entity.id) ?? [];
        const about = claimAbout.get(entity.id) ?? [];

        if (entity.evidence_status === 'sufficient') {
          const chainOk = supported.some((passageId) => {
            const passage = entitiesById.get(passageId);
            if (!isPlainObject(passage) || passage.entity_type !== 'SourcePassage') return false;
            if (passage.edition_resolution !== 'resolved') return false;
            if (passage.evidence_status !== 'sufficient') return false;
            const inbound = passageEdition.get(passageId) ?? [];
            if (inbound.length !== 1) return false;
            const edition = entitiesById.get(inbound[0]);
            if (!isPlainObject(edition) || edition.entity_type !== 'SourceEdition') return false;
            const workLinks = editionOfWork.get(inbound[0]) ?? [];
            if (workLinks.length !== 1) return false;
            const work = entitiesById.get(workLinks[0]);
            return isPlainObject(work) && work.entity_type === 'SourceWork';
          });
          if (!chainOk) {
            add('E_CLAIM_NO_EVIDENCE', 'evidence_status', 'evidence_status=sufficient requires at least one claim_supported_by whose passage chain reaches a SourceWork');
          }
        }

        if (refuted.length > 0 && !(Array.isArray(entity.counter_evidence_notes) && entity.counter_evidence_notes.length > 0)) {
          add('E_CLAIM_UNCERTAINTY_MISSING', 'counter_evidence_notes', 'counter_evidence_notes must be non-empty when claim_refuted_by relations exist');
        }

        const declaredAbout = Array.isArray(entity.about_ids) ? [...entity.about_ids].sort() : [];
        const relatedAbout = [...about].sort();
        if (declaredAbout.length !== relatedAbout.length || declaredAbout.some((id, i) => id !== relatedAbout[i])) {
          add('E_MIRROR_MISMATCH', 'about_ids', 'about_ids must equal the set of claim_about relation targets');
        }
      }

      if (entityType === 'ExpertReview') {
        const targets = reviewOf.get(entity.id) ?? [];
        if (targets.length < 1) {
          add('E_RELATION_SHAPE', 'subject_id', 'each ExpertReview requires at least 1 review_of relation');
        }
        if (targets.length >= 1 && typeof entity.subject_id === 'string' && !targets.includes(entity.subject_id)) {
          add('E_MIRROR_MISMATCH', 'subject_id', 'subject_id must be one of the review_of relation targets');
        }
      }

      if (entityType === 'Experiment') {
        const targets = experimentTests.get(entity.id) ?? [];
        if (targets.length < 1) {
          add('E_RELATION_SHAPE', 'restoration_version_id', 'each Experiment requires at least 1 experiment_tests relation');
        }
      }

      if (entityType === 'RestorationVersion') {
        const ofLinks = (relationsByType.get('restoration_version_of') ?? [])
          .filter((entry) => entry.relation.source === entity.id)
          .map((entry) => entry.relation.target);
        if (ofLinks.length !== 1) {
          add('E_RELATION_SHAPE', 'dish_id', `each RestorationVersion requires exactly 1 restoration_version_of relation, found ${ofLinks.length}`);
        } else if (typeof entity.dish_id === 'string' && entity.dish_id !== ofLinks[0]) {
          add('E_MIRROR_MISMATCH', 'dish_id', `dish_id "${entity.dish_id}" does not match restoration_version_of target "${ofLinks[0]}"`);
        }

        // RV3: a weak supporting claim blocks a sufficient version.
        if (entity.evidence_status === 'sufficient' && Array.isArray(entity.based_on_claim_ids)) {
          const weak = entity.based_on_claim_ids.find((claimId) => {
            const claim = entitiesById.get(claimId);
            return isPlainObject(claim) && claim.evidence_status !== 'sufficient';
          });
          if (weak) {
            add('E_TRACE_WEAKENS_CLAIM', 'evidence_status', `based_on_claim_ids includes "${weak}" whose evidence_status is not sufficient, so this version must not be sufficient`);
          }
        }
      }

      // R2 applied to every entity that carries a reviewed status is already
      // handled per-entity; external_reviewed needs supporting ExpertReview rows.
      if (entity.review_status === 'external_reviewed') {
        const supporting = (relationsByType.get('review_of') ?? []).filter((entry) => entry.relation.target === entity.id)
          .map((entry) => entitiesById.get(entry.relation.source))
          .some((review) => isPlainObject(review)
            && ['external_scholar', 'institution'].includes(review.reviewer_kind)
            && ['approved', 'approved_with_conditions'].includes(review.review_outcome));
        if (!supporting) {
          add('E_REVIEW_STATUS_UNSUPPORTED', 'review_status', 'review_status=external_reviewed requires an ExpertReview by an external_scholar or institution with an approving outcome');
        }
      }

      // ER1 already handled locally; ER3 is implied because internal_editor never
      // satisfies the external_reviewed check above.
      if (entityType === 'SafetyRule') {
        const applies = (relationsByType.get('safety_rule_applies_to') ?? [])
          .filter((entry) => entry.relation.source === entity.id)
          .map((entry) => entry.relation.target);
        const declared = Array.isArray(entity.applies_to_ids) ? [...entity.applies_to_ids].sort() : [];
        const related = [...applies].sort();
        if (related.length < 1) {
          add('E_RELATION_SHAPE', 'applies_to_ids', 'each SafetyRule requires at least 1 safety_rule_applies_to relation');
        }
        if (declared.length !== related.length || declared.some((id, i) => id !== related[i])) {
          add('E_MIRROR_MISMATCH', 'applies_to_ids', 'applies_to_ids must equal the set of safety_rule_applies_to relation targets');
        }
      }

      if (entityType === 'SourceEdition' && Array.isArray(entity.contains_work_ids)) {
        const declared = [...entity.contains_work_ids].sort();
        const related = ((relationsByType.get('edition_contains_work') ?? [])
          .filter((entry) => entry.relation.source === entity.id)
          .map((entry) => entry.relation.target)).sort();
        if (declared.length !== related.length || declared.some((id, i) => id !== related[i])) {
          add('E_MIRROR_MISMATCH', 'contains_work_ids', 'contains_work_ids must equal the set of edition_contains_work relation targets');
        }
      }
    }
  }

  // TR3: passage_in_edition targets must themselves reach a SourceWork.
  for (const entry of relationsByType.get('passage_in_edition') ?? []) {
    const editionId = entry.relation.target;
    const workLinks = editionOfWork.get(editionId) ?? [];
    if (workLinks.length !== 1) {
      errors.add({
        file: entry.file,
        entityOrRelationId: relationLabel(entry.relation),
        fieldPath: 'target',
        code: 'E_TRACE_BROKEN',
        message: `passage_in_edition target "${editionId}" does not itself resolve to exactly one SourceWork`,
      });
    }
  }

  // E_HERITAGE_UNSOURCED: a heritage designation needs a supporting claim chain.
  for (const doc of documents) {
    for (const entity of doc.entities) {
      if (!isPlainObject(entity) || entity.entity_type !== 'Technique') continue;
      const level = entity.heritage_designation?.level;
      if (!schema.heritage_sourcing_required_levels.includes(level)) continue;
      if (entity.provenance?.derivation === 'primary_source') continue;

      const claimsAboutTech = (relationsByType.get('claim_about') ?? [])
        .filter((entry) => entry.relation.target === entity.id)
        .map((entry) => entry.relation.source);
      const hasChain = claimsAboutTech.some((claimId) => (claimSupportedBy.get(claimId) ?? []).length > 0);

      if (!hasChain) {
        errors.add({
          file: doc.file,
          entityOrRelationId: entity.id,
          fieldPath: 'heritage_designation.level',
          code: 'E_HERITAGE_UNSOURCED',
          message: `heritage_designation.level="${level}" requires a claim_supported_by chain or provenance.derivation=primary_source`,
        });
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Document entry point
// ---------------------------------------------------------------------------

export function validateDocument({ schema, file, rawText }) {
  const errors = { add: () => {} };
  void errors;
  const collected = [];
  const collector = {
    add(record) { collected.push(record); },
  };

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    collector.add({ file, entityOrRelationId: '-', fieldPath: '-', code: 'E_FILE_PARSE', message: 'file is not valid JSON' });
    return { file, entities: [], relations: [], errors: collected, parsed: false };
  }

  if (!isPlainObject(parsed)) {
    collector.add({ file, entityOrRelationId: '-', fieldPath: '-', code: 'E_DOC_SHAPE', message: 'document root must be an object' });
    return { file, entities: [], relations: [], errors: collected, parsed: true };
  }

  const shapeErrors = [];
  if (!Object.prototype.hasOwnProperty.call(parsed, 'schema_version')) shapeErrors.push('schema_version');
  if (!Object.prototype.hasOwnProperty.call(parsed, 'entities')) shapeErrors.push('entities');
  if (!Object.prototype.hasOwnProperty.call(parsed, 'relations')) shapeErrors.push('relations');
  if (!Array.isArray(parsed.entities)) shapeErrors.push('entities(array)');
  if (!Array.isArray(parsed.relations)) shapeErrors.push('relations(array)');

  if (shapeErrors.length > 0) {
    collector.add({
      file,
      entityOrRelationId: '-',
      fieldPath: '-',
      code: 'E_DOC_SHAPE',
      message: `document is missing or has invalid required keys: ${shapeErrors.join(', ')}`,
    });
  }

  const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
  const relations = Array.isArray(parsed.relations) ? parsed.relations : [];

  const ctx = {
    schema,
    file,
    errors: collector,
    entityId: '-',
    deferredHeritage: [],
  };

  if (parsed.schema_version !== undefined && parsed.schema_version !== SCHEMA_VERSION) {
    collector.add({
      file,
      entityOrRelationId: '-',
      fieldPath: 'schema_version',
      code: 'E_SCHEMA_VERSION',
      message: `document schema_version must be "${SCHEMA_VERSION}"`,
    });
  }

  entities.forEach((entity, index) => checkEntity(ctx, entity, index));
  relations.forEach((relation, index) => checkRelation(ctx, relation, index));

  return { file, entities, relations, errors: collected, parsed: true };
}

export { DOC_EXTENSION };
