// KB-001B validator tests.
// Contract: docs/kb-001/01-schema-contract.md sections 12.1-12.6.
//
// Two complementary layers are used:
//   1. In-process unit tests against the exported lib functions, which assert the
//      exact error codes for each negative case without spawning a process.
//   2. CLI integration tests that spawn `node scripts/kb/validate-kb-schema.mjs`
//      and assert the contract exit codes (0 / 1 / 2) and the five-field JSONL
//      output shape, because those are the CI-facing guarantees.
//
// Only Node built-ins are used: node:test, node:assert, node:child_process,
// node:crypto, node:fs, node:path, node:url.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSchema } from '../lib/schema.mjs';
import { validateDocument, validateDocuments } from '../lib/validate.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..', '..');
const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'kb', 'validate-kb-schema.mjs');
const VALID_DIR = path.join(REPO_ROOT, 'data', 'kb', 'examples', 'valid');
const INVALID_DIR = path.join(REPO_ROOT, 'data', 'kb', 'examples', 'invalid');
const SCHEMA_PATH = path.join(REPO_ROOT, 'data', 'kb', 'schema', 'kb-schema.v2.json');

const schema = loadSchema();

function runValidator(args) {
  const result = spawnSync(process.execPath, [VALIDATOR, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const records = (result.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', records };
}

function codes(records) {
  return records.map((record) => record.code);
}

function validateRaw(rawText, file = 'test.kb.json') {
  const result = validateDocument({ schema, file, rawText });
  const documents = [{ file, entities: result.entities, relations: result.relations }];
  const collected = [...result.errors];
  const collector = { add: (record) => collected.push(record) };
  validateDocuments({ schema, documents, errors: collector });
  return { records: collected, codes: collected.map((record) => record.code) };
}

function baseEntity(overrides = {}) {
  return {
    id: 'region_t_1',
    entity_type: 'Region',
    schema_version: '2.0.0',
    content_class: 'historical_inference',
    evidence_status: 'sufficient',
    review_status: 'unreviewed',
    provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' },
    name: '测试地域',
    region_kind: 'cultural_area',
    modern_admin_codes: [],
    ...overrides,
  };
}

function doc(entities, relations = []) {
  return JSON.stringify({ schema_version: '2.0.0', entities, relations }, null, 2);
}

// ---------------------------------------------------------------------------
// Schema contract
// ---------------------------------------------------------------------------

test('schema file is machine-readable and declares schema_version 2.0.0', () => {
  const parsed = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  assert.equal(parsed.schema_version, '2.0.0');
  assert.ok(parsed.entities, 'schema must declare entities');
  assert.ok(parsed.relations, 'schema must declare relations');
});

test('schema covers all 17 contract entity types', () => {
  const expected = [
    'SourceWork', 'SourceEdition', 'SourcePassage', 'HistoricalClaim', 'Dish',
    'Ingredient', 'IngredientState', 'Technique', 'Utensil', 'Measurement',
    'TimePeriod', 'Region', 'Season', 'RestorationVersion', 'ExpertReview',
    'SafetyRule', 'Experiment',
  ];
  assert.deepEqual(Object.keys(schema.entities).sort(), [...expected].sort());
  assert.equal(Object.keys(schema.entities).length, 17);
});

test('schema covers all 24 contract relation types with source and target endpoint constraints', () => {
  const expected = [
    'passage_in_edition', 'edition_of_work', 'edition_contains_work',
    'claim_supported_by', 'claim_refuted_by', 'claim_about',
    'dish_contains_ingredient', 'dish_uses_technique', 'dish_originated_in',
    'dish_popular_in', 'dish_seasonal_for', 'dish_recorded_in',
    'ingredient_from_region', 'ingredient_season', 'technique_from_region',
    'ingredient_substitutes', 'dish_uses_utensil', 'ingredient_state_of',
    'measurement_of_ingredient', 'restoration_version_of',
    'restoration_based_on_claim', 'review_of', 'safety_rule_applies_to',
    'experiment_tests',
  ];
  assert.deepEqual(Object.keys(schema.relations).sort(), [...expected].sort());
  assert.equal(Object.keys(schema.relations).length, 24);
  for (const [name, spec] of Object.entries(schema.relations)) {
    assert.ok(Array.isArray(spec.source) && spec.source.length > 0, `${name} needs a source endpoint list`);
    assert.ok(Array.isArray(spec.target) && spec.target.length > 0, `${name} needs a target endpoint list`);
  }
});

test('review_status enum has 5 values and deliberately excludes verified', () => {
  assert.deepEqual(
    schema.enums.review_status,
    ['unreviewed', 'internal_reviewed', 'pending_external_expert', 'external_reviewed', 'rejected'],
  );
  assert.ok(!schema.enums.review_status.includes('verified'));
});

// ---------------------------------------------------------------------------
// Positive path
// ---------------------------------------------------------------------------

test('valid example set passes with exit code 0', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'valid')]);
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  assert.match(result.stderr, /KB schema validation PASSED/);
  assert.equal(result.records.length, 0, 'a passing run must emit no error records');
});

test('no-argument run defaults to the built-in valid example set and exits 0', () => {
  const result = runValidator([]);
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  assert.match(result.stderr, /KB schema validation PASSED/);
});

test('a single valid file path also exits 0', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'valid', 'minimal.kb.json')]);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /1 file\(s\)/);
});

test('passage_in_edition positive path is covered by a resolved passage in the valid set', () => {
  // V1 data yields only ambiguous/unresolved passages, so this positive branch can
  // only come from the built-in fixture. Assert both the fixture and the CLI result.
  const fixture = JSON.parse(
    fs.readFileSync(path.join(VALID_DIR, 'fixture-all-entities.kb.json'), 'utf8'),
  );
  const resolved = fixture.entities.filter(
    (entity) => entity.entity_type === 'SourcePassage' && entity.edition_resolution === 'resolved',
  );
  assert.ok(resolved.length >= 1, 'valid set must contain at least one resolved SourcePassage');

  const link = fixture.relations.filter((relation) => relation.type === 'passage_in_edition');
  assert.ok(link.length >= 1, 'valid set must contain a passage_in_edition relation');
  assert.equal(link[0].source, resolved[0].id);
  assert.equal(link[0].target, resolved[0].edition_id);

  const result = runValidator([path.join('data', 'kb', 'examples', 'valid')]);
  assert.equal(result.status, 0);
  assert.ok(!codes(result.records).includes('E_TRACE_MISSING'));
});

test('explicitly insufficient records pass structural validation and stay unreviewed', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'valid', 'insufficient-declared.kb.json')]);
  assert.equal(result.status, 0, `insufficient-but-declared data must be retained, not failed: ${result.stderr}`);

  const parsed = JSON.parse(
    fs.readFileSync(path.join(VALID_DIR, 'insufficient-declared.kb.json'), 'utf8'),
  );
  for (const entity of parsed.entities) {
    assert.notEqual(entity.review_status, 'verified');
    assert.ok(['unreviewed', 'rejected'].includes(entity.review_status));
  }
});

// ---------------------------------------------------------------------------
// Negative path: required error classes
// ---------------------------------------------------------------------------

test('invalid entity type is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-entity-and-relation-type.kb.json')]);
  assert.equal(result.status, 1);
  assert.ok(codes(result.records).includes('E_UNKNOWN_ENTITY_TYPE'));
});

test('unknown relation type is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-entity-and-relation-type.kb.json')]);
  assert.equal(result.status, 1);
  assert.ok(codes(result.records).includes('E_UNKNOWN_RELATION_TYPE'));
});

test('missing required field is rejected', () => {
  const result = validateRaw(doc([baseEntity({ name: undefined })]));
  assert.ok(result.codes.includes('E_MISSING_FIELD'));
  assert.ok(result.records.some((record) => record.fieldPath === 'name'));
});

test('wrong field type is rejected', () => {
  const result = validateRaw(doc([baseEntity({ region_kind: 42 })]));
  assert.ok(result.codes.includes('E_FIELD_TYPE'));
});

test('duplicate id across the document set is rejected', () => {
  const result = validateRaw(doc([baseEntity(), baseEntity()]));
  assert.ok(result.codes.includes('E_DUPLICATE_ID'));
});

test('dangling reference from a relation endpoint is rejected', () => {
  const result = validateRaw(doc(
    [baseEntity({ id: 'dish_t_1', entity_type: 'Dish', dish_kind: 'historical_documented_dish', period_id: null, description: null, name: '测试菜品', unknown_fields: ['period_id', 'description'], region_kind: undefined, modern_admin_codes: undefined })],
    [{ type: 'dish_contains_ingredient', source: 'dish_t_1', target: 'ing_missing', evidence_status: 'sufficient', provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' } }],
  ));
  assert.ok(result.codes.includes('E_DANGLING_REFERENCE'));
});

test('dangling reference from an id-typed entity field is rejected', () => {
  const result = validateRaw(doc([
    baseEntity({ id: 'dish_t_2', entity_type: 'Dish', dish_kind: 'historical_documented_dish', period_id: 'period_missing', description: 'x', name: '测试菜品二', region_kind: undefined, modern_admin_codes: undefined }),
  ]));
  assert.ok(result.codes.includes('E_DANGLING_REFERENCE'));
  assert.ok(result.records.some((record) => record.fieldPath === 'period_id'));
});

test('illegal relation endpoint types are rejected', () => {
  const result = validateRaw(doc(
    [
      baseEntity({ id: 'dish_t_3', entity_type: 'Dish', dish_kind: 'historical_documented_dish', period_id: null, description: null, name: '测试菜品三', unknown_fields: ['period_id', 'description'], region_kind: undefined, modern_admin_codes: undefined }),
      baseEntity({ id: 'period_t_3', entity_type: 'TimePeriod', name: '测试时期', start_year: 1, end_year: 2, calendar: 'gregorian_astronomical', certainty: 'exact', region_kind: undefined, modern_admin_codes: undefined }),
    ],
    [{ type: 'dish_contains_ingredient', source: 'dish_t_3', target: 'period_t_3', evidence_status: 'sufficient', provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' } }],
  ));
  assert.ok(result.codes.includes('E_RELATION_ENDPOINT_TYPE'));
});

test('invalid enum value is rejected', () => {
  const result = validateRaw(doc([baseEntity({ region_kind: 'not_a_region_kind' })]));
  assert.ok(result.codes.includes('E_ENUM_INVALID'));
});

test('invalid time range (start_year > end_year) is rejected', () => {
  const result = validateRaw(doc([baseEntity({
    id: 'period_t_4', entity_type: 'TimePeriod', name: '倒置时期',
    start_year: 1500, end_year: 1000, calendar: 'gregorian_astronomical', certainty: 'exact',
    region_kind: undefined, modern_admin_codes: undefined,
  })]));
  assert.ok(result.codes.includes('E_TIME_RANGE_INVALID'));
});

test('out-of-range year is rejected as an invalid time range', () => {
  const result = validateRaw(doc([baseEntity({
    id: 'period_t_5', entity_type: 'TimePeriod', name: '越界时期',
    start_year: -4000, end_year: 99999, calendar: 'gregorian_astronomical', certainty: 'exact',
    region_kind: undefined, modern_admin_codes: undefined,
  })]));
  assert.ok(result.codes.includes('E_TIME_RANGE_INVALID'));
});

// ---------------------------------------------------------------------------
// Trace chain
// ---------------------------------------------------------------------------

test('missing trace chain link (resolved passage without passage_in_edition) is rejected', () => {
  const result = validateRaw(doc([
    baseEntity({
      id: 'passage_t_6', entity_type: 'SourcePassage', name: '测试段落',
      text: '测试文本。', edition_id: 'edition_t_6', text_origin: 'verbatim_transcription',
      language: 'zh', edition_candidates: ['edition_t_6'], edition_resolution: 'resolved',
      region_kind: undefined, modern_admin_codes: undefined,
    }),
    baseEntity({
      id: 'edition_t_6', entity_type: 'SourceEdition', name: '测试版本', work_id: null,
      edition_type: 'scholarly_edition', publisher: null, publication_year: null,
      locator_scheme: 'entry', unknown_fields: ['work_id', 'publisher', 'publication_year'],
      region_kind: undefined, modern_admin_codes: undefined,
    }),
  ]));
  assert.ok(result.codes.includes('E_TRACE_MISSING'));
});

test('SourceEdition without edition_of_work is rejected', () => {
  const result = validateRaw(doc([baseEntity({
    id: 'edition_t_7', entity_type: 'SourceEdition', name: '测试版本七', work_id: null,
    edition_type: 'scholarly_edition', publisher: null, publication_year: null,
    locator_scheme: 'entry', unknown_fields: ['work_id', 'publisher', 'publication_year'],
    region_kind: undefined, modern_admin_codes: undefined,
  })]));
  assert.ok(result.codes.includes('E_TRACE_MISSING'));
});

test('passage_in_edition on an ambiguous passage is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-passage-in-edition-ambiguous.kb.json')]);
  assert.equal(result.status, 1);
  assert.deepEqual(codes(result.records), ['E_TRACE_MISSING']);
  assert.match(result.records[0].message, /ambiguous/);
  assert.match(result.records[0].message, /0 passage_in_edition/);
});

test('passage_in_edition on an unresolved passage is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-passage-in-edition-unresolved.kb.json')]);
  assert.equal(result.status, 1);
  assert.deepEqual(codes(result.records), ['E_TRACE_MISSING']);
  assert.match(result.records[0].message, /unresolved/);
});

test('sufficient claim without a complete support chain is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-trace-chain.kb.json')]);
  assert.equal(result.status, 1);
  assert.ok(codes(result.records).includes('E_CLAIM_NO_EVIDENCE'));
});

// ---------------------------------------------------------------------------
// Evidence status vs review status
// ---------------------------------------------------------------------------

test('review_status "verified" is rejected with a clear error code', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-review-status-verified.kb.json')]);
  assert.equal(result.status, 1);
  assert.deepEqual(codes(result.records), ['E_ENUM_INVALID']);
  const record = result.records[0];
  assert.equal(record.fieldPath, 'review_status');
  assert.match(record.message, /review_status/);
});

test('insufficient evidence cannot carry a reviewed status', () => {
  const result = validateRaw(doc([baseEntity({
    evidence_status: 'insufficient',
    review_status: 'internal_reviewed',
    provenance: { derivation: 'unresolved', basis_ids: [], asserted_by: 'unknown', notes: '无出处' },
    unknown_fields: [],
  })]));
  assert.ok(result.codes.includes('E_EVIDENCE_REVIEW_CONFLICT'));
  assert.ok(result.codes.includes('E_PROVENANCE_UNRESOLVED_CONFLICT'));
});

test('external_reviewed without external expert backing is rejected', () => {
  const result = validateRaw(doc([baseEntity({ review_status: 'external_reviewed' })]));
  assert.ok(result.codes.includes('E_REVIEW_STATUS_UNSUPPORTED'));
});

test('unknown_fields non-empty cannot coexist with sufficient evidence', () => {
  const result = validateRaw(doc([baseEntity({ unknown_fields: ['name'] })]));
  assert.ok(result.codes.includes('E_EVIDENCE_UNKNOWN_CONFLICT'));
});

test('null on a required nullable field must be declared in unknown_fields', () => {
  // Contract U1 applies to fields that are both required and nullable. Region has
  // none, so use Dish.period_id, which is required and nullable.
  const result = validateRaw(doc([baseEntity({
    id: 'dish_t_8', entity_type: 'Dish', name: '测试菜品八',
    dish_kind: 'historical_documented_dish', period_id: null, description: '描述',
    region_kind: undefined, modern_admin_codes: undefined,
  })]));
  assert.ok(result.codes.includes('E_UNKNOWN_UNDECLARED'));
  assert.ok(result.records.some((record) => record.fieldPath === 'period_id'));
});

test('an optional nullable field may be null without an unknown_fields entry', () => {
  // parent_region_id is optional (required: false), so contract U1 does not apply.
  const result = validateRaw(doc([baseEntity({
    id: 'region_t_9', entity_type: 'Region', name: '测试地域九',
    region_kind: 'cultural_area', modern_admin_codes: [], parent_region_id: null,
  })]));
  assert.ok(!result.codes.includes('E_UNKNOWN_UNDECLARED'));
  assert.deepEqual(result.codes, []);
});

test('declaring an unknown field path that does not exist is rejected', () => {
  const result = validateRaw(doc([baseEntity({ unknown_fields: ['not_a_real_field'] })]));
  assert.ok(result.codes.includes('E_UNKNOWN_PATH_INVALID'));
});

// ---------------------------------------------------------------------------
// No-fabrication red lines
// ---------------------------------------------------------------------------

test('fabricated measurement value under as_recorded is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-no-fabrication.kb.json')]);
  assert.equal(result.status, 1);
  assert.ok(codes(result.records).includes('E_MEASUREMENT_FABRICATED'));
});

test('normalized measurement without a value is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-no-fabrication.kb.json')]);
  assert.ok(codes(result.records).includes('E_MEASUREMENT_INCOMPLETE'));
});

test('unsourced heritage designation is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-no-fabrication.kb.json')]);
  assert.ok(codes(result.records).includes('E_HERITAGE_UNSOURCED'));
});

test('anonymous reviewer cannot approve', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-no-fabrication.kb.json')]);
  assert.ok(codes(result.records).includes('E_REVIEW_UNVERIFIABLE'));
});

test('primary_source provenance without basis_ids and locator is rejected', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-no-fabrication.kb.json')]);
  assert.ok(codes(result.records).includes('E_PROVENANCE_MISSING'));
});

// ---------------------------------------------------------------------------
// Output shape and exit codes
// ---------------------------------------------------------------------------

test('every error record carries the five contract fields', () => {
  for (const name of fs.readdirSync(INVALID_DIR).filter((entry) => entry.endsWith('.kb.json'))) {
    const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', name)]);
    assert.equal(result.status, 1, `${name} should fail validation`);
    assert.ok(result.records.length > 0, `${name} should report at least one error`);
    for (const record of result.records) {
      for (const field of ['file', 'entityOrRelationId', 'fieldPath', 'code', 'message']) {
        assert.ok(Object.prototype.hasOwnProperty.call(record, field), `${name}: record missing "${field}"`);
        assert.equal(typeof record[field], 'string', `${name}: "${field}" must be a string`);
      }
      assert.notEqual(record.file, '');
      assert.notEqual(record.code, '');
      assert.notEqual(record.message, '');
      assert.ok(record.file.endsWith('.kb.json'), `${name}: file must be a repo-relative path`);
      assert.ok(!path.isAbsolute(record.file), `${name}: file must not be an absolute path`);
    }
  }
});

test('stdout is JSONL only, with no extra content', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'invalid', 'bad-fields-and-refs.kb.json')]);
  for (const line of result.stdout.split('\n').filter((entry) => entry.trim().length > 0)) {
    assert.doesNotThrow(() => JSON.parse(line), `stdout line is not JSON: ${line}`);
  }
});

test('exit code 2 for a nonexistent target path', () => {
  const result = runValidator([path.join('data', 'kb', 'examples', 'does-not-exist')]);
  assert.equal(result.status, 2, 'a missing target path is a runtime error, not a validation failure');
});

test('exit code 2 when the schema file cannot be read', () => {
  const result = spawnSync(process.execPath, ['-e', `
    import('${new URL('../lib/schema.mjs', import.meta.url).href}').then(({ loadSchema, SchemaUnreadableError }) => {
      try {
        loadSchema('data/kb/schema/does-not-exist.json');
        process.exit(0);
      } catch (error) {
        process.exit(error instanceof SchemaUnreadableError ? 7 : 8);
      }
    });
  `], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(result.status, 7, `expected SchemaUnreadableError, stderr: ${result.stderr}`);
});

test('a directory with no .kb.json documents does not pass silently', () => {
  const emptyDir = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb-empty-'));
  try {
    const result = runValidator([path.relative(REPO_ROOT, emptyDir).split(path.sep).join('/')]);
    assert.equal(result.status, 1, 'an empty scan must not be reported as success');
    assert.ok(codes(result.records).includes('E_DOC_SHAPE'));
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Read-only guarantee and determinism
// ---------------------------------------------------------------------------

function hashTree(dir) {
  const hashes = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        hashes.set(
          path.relative(REPO_ROOT, full).split(path.sep).join('/'),
          createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
        );
      }
    }
  };
  walk(dir);
  return hashes;
}

test('validator does not modify any input file', () => {
  const dirs = [VALID_DIR, INVALID_DIR, path.dirname(SCHEMA_PATH)];
  const before = dirs.map((dir) => hashTree(dir));

  const valid = runValidator([path.join('data', 'kb', 'examples', 'valid')]);
  assert.equal(valid.status, 0);
  for (const name of fs.readdirSync(INVALID_DIR).filter((entry) => entry.endsWith('.kb.json'))) {
    runValidator([path.join('data', 'kb', 'examples', 'invalid', name)]);
  }

  const after = dirs.map((dir) => hashTree(dir));
  for (let index = 0; index < dirs.length; index += 1) {
    assert.deepEqual(
      [...after[index].entries()].sort(),
      [...before[index].entries()].sort(),
      `files under ${path.relative(REPO_ROOT, dirs[index])} changed during validation`,
    );
  }
});

test('repeated runs produce byte-identical stdout and stderr', () => {
  const target = path.join('data', 'kb', 'examples', 'invalid', 'bad-fields-and-refs.kb.json');
  const first = runValidator([target]);
  const second = runValidator([target]);
  assert.equal(first.stdout, second.stdout);
  assert.equal(first.stderr, second.stderr);
});

test('a passing run is deterministic across repeated invocations', () => {
  const first = runValidator([]);
  const second = runValidator([]);
  assert.equal(first.status, 0);
  assert.equal(first.stderr, second.stderr);
  assert.equal(first.stdout, second.stdout);
});
