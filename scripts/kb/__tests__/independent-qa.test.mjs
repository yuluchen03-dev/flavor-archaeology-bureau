#!/usr/bin/env node
// KB-001D — QA independent verification suite.
//
// Owner: qa (KB-001D). Scope: this file only (contract section 16, L1009).
//
// Independence statement
// ----------------------
// This suite was written by QA *without* reading KB-001B's
// `scripts/kb/__tests__/validate-kb-schema.test.mjs`. It drives the validator
// and adapter only through their documented CLI surface plus their public
// library entry points, and it builds every fixture from scratch into an OS
// temporary directory (never into the repository), so it cannot disturb
// KB-001B/KB-001C artifacts or V1 data.
//
// Contract expectations encoded here (docs/kb-001/01-schema-contract.md):
//   * exit codes 0 / 1 / 2 for the validator, 0 / 1 / 2 for the adapter
//   * every error record carries file / entityOrRelationId / fieldPath / code / message
//   * `review_status` deliberately excludes `verified`
//   * `edition_resolution` is tri-state; disambiguation is forbidden
//   * V1 has NO resolved passage, so the adapter output must contain zero
//     `passage_in_edition` relations and every HistoricalClaim must be
//     `insufficient`. That is correct fidelity to V1 evidence, NOT a defect.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');

const VALIDATOR = 'scripts/kb/validate-kb-schema.mjs';
const ADAPTER = 'scripts/kb/adapt-v1-to-v2.mjs';
const SCHEMA_PATH = 'data/kb/schema/kb-schema.v2.json';
const GENERATED_DIR = 'data/kb/generated';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Scratch space lives INSIDE the repository. The adapter's `--out` is now
// restricted to the repository boundary (K1, contract 2.0.3), so an
// out-of-repository probe target is correctly rejected — the fixture, not the
// expectation, has to move. `tmp/` is gitignored. No assertion changed.
const TMP_ROOT = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb001-qa-'));

process.on('exit', () => {
  try {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

let caseCounter = 0;
function newCaseDir(label) {
  caseCounter += 1;
  const dir = path.join(TMP_ROOT, `${String(caseCounter).padStart(3, '0')}-${label}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runNode(scriptRelPath, args = [], opts = {}) {
  const result = spawnSync(process.execPath, [scriptRelPath, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** Runs the validator against a path and returns {status, records}. */
function validate(targetPath) {
  const run = runNode(VALIDATOR, [targetPath]);
  const records = run.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { __unparsed: line };
      }
    });
  return { ...run, records };
}

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function writeDoc(dir, name, doc) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(doc, null, 2), 'utf8');
  return p;
}

const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, SCHEMA_PATH), 'utf8'));

/** Common envelope every entity must carry (schema.common_fields). */
function envelope(entityType, id, overrides = {}) {
  return {
    id,
    entity_type: entityType,
    schema_version: '2.0.0',
    content_class: 'historical_inference',
    evidence_status: 'sufficient',
    review_status: 'unreviewed',
    provenance: {
      derivation: 'editorial',
      basis_ids: [],
      asserted_by: 'human_editor',
      notes: 'QA fixture. Structural only; not historical evidence.',
    },
    name: `QA fixture ${id}`,
    ...overrides,
  };
}

/**
 * A minimal, self-consistent, fully legal KB document.
 *
 * Trace chain: SourceWork <- SourceEdition <- SourcePassage <- HistoricalClaim
 * The passage is `resolved`, so it carries exactly one `passage_in_edition`.
 * This is the positive branch V1 data cannot produce.
 */
function legalDoc({ withPassageInEdition = true, withEditionOfWork = true } = {}) {
  const entities = [
    envelope('SourceWork', 'work_qa_1', {
      author: 'QA Author',
      attribution_status: 'attributed',
      work_type: 'food_monograph',
      compiled_period_id: 'period_qa_1',
    }),
    envelope('TimePeriod', 'period_qa_1', {
      start_year: 1000,
      end_year: 1100,
      calendar: 'gregorian_astronomical',
      certainty: 'exact',
    }),
    envelope('SourceEdition', 'edition_qa_1', {
      work_id: 'work_qa_1',
      edition_type: 'scholarly_edition',
      publisher: 'QA Press',
      publication_year: 2024,
      locator_scheme: 'entry',
    }),
    envelope('SourcePassage', 'passage_qa_1', {
      text: 'QA fixture passage text. Not ancient source material.',
      edition_id: 'edition_qa_1',
      locator: { volume: null, chapter: null, page: null, entry: 'qa-entry-1' },
      text_origin: 'verbatim_transcription',
      language: 'zh',
      edition_candidates: ['edition_qa_1'],
      edition_resolution: 'resolved',
    }),
    envelope('HistoricalClaim', 'claim_qa_1', {
      statement: 'QA fixture claim. Not a historical assertion.',
      claim_type: 'existence',
      about_ids: ['dish_qa_1'],
      confidence: 'medium',
    }),
    envelope('Dish', 'dish_qa_1', {
      dish_kind: 'historical_documented_dish',
      period_id: 'period_qa_1',
      description: 'QA fixture dish.',
    }),
    envelope('Ingredient', 'ing_qa_1', {
      category: 'grain',
      biological_identification_status: 'identified',
      availability_status: 'available',
    }),
    envelope('Technique', 'tech_qa_1', {
      category: 'heat',
      description: 'QA fixture technique.',
      heritage_designation: { level: 'none', list_name: null, designation_year: null },
    }),
    envelope('Region', 'region_qa_1', { region_kind: 'cultural_area' }),
    envelope('Season', 'season_qa_1', {
      season_kind: 'solar_term',
      lunar_month: 3,
      solar_term_name: 'QA term',
    }),
  ];

  const relations = [
    { type: 'claim_about', source: 'claim_qa_1', target: 'dish_qa_1' },
    { type: 'dish_contains_ingredient', source: 'dish_qa_1', target: 'ing_qa_1' },
    { type: 'dish_uses_technique', source: 'dish_qa_1', target: 'tech_qa_1' },
    { type: 'dish_originated_in', source: 'dish_qa_1', target: 'period_qa_1' },
    { type: 'dish_popular_in', source: 'dish_qa_1', target: 'region_qa_1' },
    { type: 'dish_seasonal_for', source: 'dish_qa_1', target: 'season_qa_1' },
    { type: 'claim_supported_by', source: 'claim_qa_1', target: 'passage_qa_1' },
    { type: 'ingredient_from_region', source: 'ing_qa_1', target: 'region_qa_1' },
    { type: 'ingredient_season', source: 'ing_qa_1', target: 'season_qa_1' },
    { type: 'technique_from_region', source: 'tech_qa_1', target: 'region_qa_1' },
  ];

  if (withEditionOfWork) {
    relations.push({ type: 'edition_of_work', source: 'edition_qa_1', target: 'work_qa_1' });
  }
  if (withPassageInEdition) {
    relations.push({ type: 'passage_in_edition', source: 'passage_qa_1', target: 'edition_qa_1' });
  }

  return {
    schema_version: '2.0.0',
    metadata: {
      purpose: 'QA independent fixture. Structural only.',
      fixture: true,
      not_historical_evidence:
        'Every record is a labelled structural fixture. Not ancient source text, expert review, or experiment data.',
    },
    entities,
    relations: relations.map((r) => ({
      ...r,
      evidence_status: 'sufficient',
      provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' },
    })),
  };
}

/** Deep clone helper so each negative case mutates an independent copy. */
const clone = (v) => JSON.parse(JSON.stringify(v));

function expectRejected(doc, label, codeMatcher) {
  const dir = newCaseDir(label);
  const p = writeDoc(dir, 'case.kb.json', doc);
  const { status, records, stderr } = validate(p);
  assert.notEqual(
    status,
    0,
    `${label}: expected non-zero exit, got 0 (stderr: ${stderr.trim()})`,
  );
  assert.equal(status, 1, `${label}: expected exit 1 (validation failure), got ${status}`);
  const codes = records.map((r) => r.code);
  if (codeMatcher) {
    assert.ok(
      codes.some((c) => codeMatcher.test(String(c))),
      `${label}: expected an error code matching ${codeMatcher}, got ${JSON.stringify(codes)}`,
    );
  }
  return { status, records };
}

// ---------------------------------------------------------------------------
// 1. Legal data passes
// ---------------------------------------------------------------------------

test('QA: a legal minimal document passes with exit code 0', () => {
  const dir = newCaseDir('legal-min');
  const p = writeDoc(dir, 'legal.kb.json', legalDoc());
  const { status, stderr } = validate(p);
  assert.equal(status, 0, `expected exit 0, got ${status}; stderr: ${stderr.trim()}`);
});

test('QA: the resolved + passage_in_edition positive path is accepted (exit 0)', () => {
  const dir = newCaseDir('legal-resolved');
  const doc = legalDoc({ withPassageInEdition: true });
  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  assert.equal(passage.edition_resolution, 'resolved');
  assert.equal(passage.edition_id, 'edition_qa_1');
  assert.ok(
    doc.relations.some((r) => r.type === 'passage_in_edition'),
    'fixture must contain the passage_in_edition relation',
  );
  const p = writeDoc(dir, 'resolved.kb.json', doc);
  const { status, stderr } = validate(p);
  assert.equal(status, 0, `expected exit 0, got ${status}; stderr: ${stderr.trim()}`);
});

test('QA: full trace chain SourceWork<-SourceEdition<-SourcePassage<-HistoricalClaim validates', () => {
  const dir = newCaseDir('legal-chain');
  const p = writeDoc(dir, 'chain.kb.json', legalDoc());
  const { status } = validate(p);
  assert.equal(status, 0);

  // Independently confirm the chain is actually present in the fixture.
  const doc = legalDoc();
  const byId = new Map(doc.entities.map((e) => [e.id, e]));
  const passage = byId.get('passage_qa_1');
  const edition = byId.get(passage.edition_id);
  const workRel = doc.relations.find(
    (r) => r.type === 'edition_of_work' && r.source === edition.id,
  );
  assert.ok(workRel, 'edition_of_work must exist');
  assert.equal(byId.get(workRel.target).entity_type, 'SourceWork');
  assert.ok(
    doc.relations.some((r) => r.type === 'claim_supported_by' && r.target === passage.id),
    'claim_supported_by must point at the passage',
  );
});

// ---------------------------------------------------------------------------
// 2. Negative cases — each required class
// ---------------------------------------------------------------------------

test('QA: missing required field is rejected (E_MISSING_FIELD)', () => {
  const doc = legalDoc();
  delete doc.entities.find((e) => e.entity_type === 'Dish').description;
  const { records } = expectRejected(doc, 'missing-field', /MISSING_FIELD/);
  const hit = records.find((r) => String(r.code).includes('MISSING_FIELD'));
  assert.ok(hit, 'E_MISSING_FIELD expected');
  // Five-field contract: every error must locate itself.
  for (const field of ['file', 'entityOrRelationId', 'fieldPath', 'code', 'message']) {
    assert.ok(hit[field], `error must carry non-empty "${field}": ${JSON.stringify(hit)}`);
  }
  assert.notEqual(hit.file, '-', 'error file must be a real location, not a placeholder');
  assert.equal(hit.entityOrRelationId, 'dish_qa_1');
  assert.equal(hit.fieldPath, 'description');
});

test('QA: duplicate id is rejected (E_DUPLICATE_ID)', () => {
  const doc = legalDoc();
  doc.entities.push(clone(doc.entities.find((e) => e.entity_type === 'Region')));
  const { records } = expectRejected(doc, 'duplicate-id', /DUPLICATE_ID/);
  const hit = records.find((r) => r.code === 'E_DUPLICATE_ID');
  assert.ok(hit, 'E_DUPLICATE_ID expected');
  assert.ok(
    hit.file && hit.file !== '-',
    `E_DUPLICATE_ID must carry a real file location, got ${JSON.stringify(hit.file)}`,
  );
});

test('QA: dangling reference is rejected (E_DANGLING_REFERENCE)', () => {
  const doc = legalDoc();
  const rel = doc.relations.find((r) => r.type === 'dish_contains_ingredient');
  rel.target = 'ing_does_not_exist_999';
  const { records } = expectRejected(doc, 'dangling-ref', /DANGLING_REFERENCE/);
  const hit = records.find((r) => r.code === 'E_DANGLING_REFERENCE');
  assert.ok(hit, 'E_DANGLING_REFERENCE expected');
  for (const field of ['file', 'entityOrRelationId', 'fieldPath', 'code', 'message']) {
    assert.ok(hit[field], `error record must carry non-empty "${field}"`);
  }
});

test('QA: illegal relation endpoint type is rejected (E_RELATION_ENDPOINT_TYPE)', () => {
  const doc = legalDoc();
  // dish_contains_ingredient requires Dish -> Ingredient; point it at a Technique.
  doc.relations.find((r) => r.type === 'dish_contains_ingredient').target = 'tech_qa_1';
  expectRejected(doc, 'bad-endpoint-type', /ENDPOINT_TYPE/);
});

test('QA: unknown relation type is rejected (E_UNKNOWN_RELATION_TYPE)', () => {
  const doc = legalDoc();
  doc.relations[0].type = 'qa_not_a_real_relation';
  expectRejected(doc, 'unknown-relation', /UNKNOWN_RELATION_TYPE/);
});

test('QA: invalid entity type is rejected (E_UNKNOWN_ENTITY_TYPE)', () => {
  const doc = legalDoc();
  doc.entities[0].entity_type = 'QaNotARealEntity';
  expectRejected(doc, 'unknown-entity', /UNKNOWN_ENTITY_TYPE/);
});

// ---------------------------------------------------------------------------
// 3. Trace-chain breakage
// ---------------------------------------------------------------------------

test('QA: breaking the Edition->Work link is rejected', () => {
  const doc = legalDoc({ withEditionOfWork: false });
  expectRejected(doc, 'break-edition-of-work', /TRACE|MISSING/);
});

test('QA: resolved passage without passage_in_edition is rejected', () => {
  const doc = legalDoc({ withPassageInEdition: false });
  const { records } = expectRejected(doc, 'break-passage-in-edition', /TRACE/);
  assert.ok(
    records.some((r) => r.code === 'E_TRACE_MISSING'),
    'E_TRACE_MISSING expected when a resolved passage lacks passage_in_edition',
  );
});

test('QA: passage_in_edition pointing at a nonexistent edition is rejected', () => {
  const doc = legalDoc();
  doc.relations.find((r) => r.type === 'passage_in_edition').target = 'edition_ghost_404';
  expectRejected(doc, 'passage-in-edition-ghost', /DANGLING_REFERENCE|TRACE/);
});

// ---------------------------------------------------------------------------
// 4. No-disambiguation rule (the contract's core anti-fabrication guard)
// ---------------------------------------------------------------------------

test('QA: passage_in_edition on an ambiguous passage is rejected', () => {
  const doc = legalDoc();
  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  passage.edition_resolution = 'ambiguous';
  passage.edition_candidates = ['edition_qa_1', 'edition_qa_2'];
  // Deliberately keep edition_id + the relation to emulate "silent disambiguation".
  const { records } = expectRejected(doc, 'ambiguous-with-link', /TRACE/);
  assert.ok(
    records.some((r) => String(r.message).includes('no disambiguation') || r.code === 'E_TRACE_MISSING'),
    'must reject a passage_in_edition hanging off a non-resolved passage',
  );
});

test('QA: passage_in_edition on an unresolved passage is rejected', () => {
  const doc = legalDoc();
  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  passage.edition_resolution = 'unresolved';
  passage.edition_candidates = [];
  expectRejected(doc, 'unresolved-with-link', /TRACE/);
});

test('QA: ambiguous passage with null edition_id and no link is accepted', () => {
  // Contract 9.4 L316/L322: `edition_candidates` must resolve to real
  // SourceEdition entities, and >1 candidate must stay `ambiguous` with
  // `edition_id: null` and zero `passage_in_edition` relations.
  const doc = legalDoc({ withPassageInEdition: false });
  // A second real edition, so the candidate set is genuinely ambiguous.
  doc.entities.push(
    envelope('SourceEdition', 'edition_qa_2', {
      work_id: 'work_qa_1',
      edition_type: 'facsimile',
      publisher: 'QA Press B',
      publication_year: 1999,
      locator_scheme: 'page',
    }),
  );
  doc.relations.push({
    type: 'edition_of_work',
    source: 'edition_qa_2',
    target: 'work_qa_1',
    evidence_status: 'sufficient',
    provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' },
  });

  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  passage.edition_resolution = 'ambiguous';
  passage.edition_id = null;
  passage.edition_candidates = ['edition_qa_1', 'edition_qa_2'];
  passage.evidence_status = 'insufficient';
  passage.review_status = 'unreviewed';
  passage.unknown_fields = ['edition_id'];

  // Contract C2 (L342): an insufficient claim MUST carry uncertainty_notes.
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  claim.evidence_status = 'insufficient';
  claim.uncertainty_notes = ['QA fixture: edition attribution is ambiguous and was not disambiguated.'];

  const dir = newCaseDir('ambiguous-clean');
  const p = writeDoc(dir, 'ambiguous.kb.json', doc);
  const { status, records, stderr } = validate(p);
  assert.equal(
    status,
    0,
    `honest "ambiguous, not disambiguated" must pass; got ${status}: ${JSON.stringify(records)} ${stderr.trim()}`,
  );
});

test('QA: an ambiguous passage must NOT keep a resolved-looking edition_id', () => {
  // Same fixture, but the passage is left claiming a concrete edition while
  // also being ambiguous — that is exactly the "silent disambiguation" the
  // contract forbids, so it must be rejected.
  const doc = legalDoc({ withPassageInEdition: false });
  doc.entities.push(
    envelope('SourceEdition', 'edition_qa_2', {
      work_id: 'work_qa_1',
      edition_type: 'facsimile',
      publisher: 'QA Press B',
      publication_year: 1999,
      locator_scheme: 'page',
    }),
  );
  doc.relations.push({
    type: 'edition_of_work',
    source: 'edition_qa_2',
    target: 'work_qa_1',
    evidence_status: 'sufficient',
    provenance: { derivation: 'editorial', basis_ids: [], asserted_by: 'human_editor' },
  });
  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  passage.edition_resolution = 'ambiguous';
  passage.edition_candidates = ['edition_qa_1', 'edition_qa_2'];
  // edition_id deliberately left as 'edition_qa_1' (the forbidden choice).
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  claim.evidence_status = 'insufficient';
  claim.uncertainty_notes = ['QA fixture uncertainty.'];

  expectRejected(doc, 'ambiguous-but-picked', /TRACE|MISSING/);
});

// ---------------------------------------------------------------------------
// 5. insufficient must never be silently promoted to verified
// ---------------------------------------------------------------------------

test('QA: review_status "verified" is rejected (enum deliberately excludes it)', () => {
  const doc = legalDoc();
  doc.entities.find((e) => e.entity_type === 'Dish').review_status = 'verified';
  const { records } = expectRejected(doc, 'review-status-verified', /ENUM_INVALID|REVIEW/);
  const hit = records.find((r) => r.code === 'E_ENUM_INVALID');
  assert.ok(hit, 'E_ENUM_INVALID expected for review_status=verified');
  assert.ok(
    /unreviewed/.test(hit.message),
    `message should list the legal review_status values, got: ${hit.message}`,
  );
});

test('QA: the schema review_status enum does not contain "verified"', () => {
  const values = SCHEMA.enums.review_status;
  assert.ok(Array.isArray(values));
  assert.ok(
    !values.includes('verified'),
    `review_status must never include "verified"; got ${JSON.stringify(values)}`,
  );
  assert.equal(values.length, 5);
});

test('QA: an insufficient record passes structurally but keeps its insufficient status', () => {
  // Contract C2 (L342): insufficient/unknown claims must declare
  // `uncertainty_notes`. Declaring the uncertainty is what makes the record
  // legally "insufficient" rather than silently unverified.
  const doc = legalDoc();
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  claim.evidence_status = 'insufficient';
  claim.review_status = 'unreviewed';
  claim.uncertainty_notes = ['QA fixture: this claim is explicitly uncertain.'];

  const dir = newCaseDir('insufficient-stays');
  const p = writeDoc(dir, 'insufficient.kb.json', doc);
  const { status, records, stderr } = validate(p);
  assert.equal(
    status,
    0,
    `an explicitly insufficient record must pass structural validation; got ${status}: ${JSON.stringify(records)} ${stderr.trim()}`,
  );

  // The document on disk must still say insufficient — nothing may rewrite it.
  const after = JSON.parse(fs.readFileSync(p, 'utf8'));
  const afterClaim = after.entities.find((e) => e.id === 'claim_qa_1');
  assert.equal(afterClaim.evidence_status, 'insufficient');
  assert.notEqual(afterClaim.review_status, 'verified');
  assert.ok(
    Array.isArray(afterClaim.uncertainty_notes) && afterClaim.uncertainty_notes.length > 0,
    'the declared uncertainty must survive the run',
  );
});

test('QA: an insufficient claim without uncertainty_notes is rejected (C2)', () => {
  const doc = legalDoc();
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  claim.evidence_status = 'insufficient';
  // uncertainty_notes deliberately omitted.
  const { records } = expectRejected(doc, 'insufficient-no-notes', /UNCERTAINTY|CLAIM/);
  assert.ok(
    records.some((r) => r.code === 'E_CLAIM_UNCERTAINTY_MISSING'),
    'contract C2 requires uncertainty_notes on insufficient claims',
  );
});

test('QA: sufficient claim with no supporting chain is rejected (E_CLAIM_NO_EVIDENCE)', () => {
  const doc = legalDoc({ withPassageInEdition: false });
  const passage = doc.entities.find((e) => e.entity_type === 'SourcePassage');
  passage.edition_resolution = 'unresolved';
  passage.edition_id = null;
  passage.edition_candidates = [];
  passage.unknown_fields = ['edition_id'];
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  claim.evidence_status = 'sufficient';
  const { records } = expectRejected(doc, 'claim-no-evidence', /CLAIM_NO_EVIDENCE|TRACE/);
  assert.ok(
    records.some((r) => r.code === 'E_CLAIM_NO_EVIDENCE'),
    'E_CLAIM_NO_EVIDENCE expected when a sufficient claim has no valid support chain',
  );
});

// ---------------------------------------------------------------------------
// 6. Enum and time-range violations
// ---------------------------------------------------------------------------

test('QA: an out-of-enum value is rejected (E_ENUM_INVALID)', () => {
  const doc = legalDoc();
  doc.entities.find((e) => e.entity_type === 'Dish').dish_kind = 'qa_not_a_kind';
  expectRejected(doc, 'enum-invalid', /ENUM_INVALID/);
});

test('QA: start_year > end_year is rejected (E_TIME_RANGE_INVALID)', () => {
  const doc = legalDoc();
  const period = doc.entities.find((e) => e.entity_type === 'TimePeriod');
  period.start_year = 1500;
  period.end_year = 1200;
  expectRejected(doc, 'time-range-inverted', /TIME_RANGE/);
});

test('QA: an out-of-range year is rejected (E_TIME_RANGE_INVALID)', () => {
  const doc = legalDoc();
  const period = doc.entities.find((e) => e.entity_type === 'TimePeriod');
  period.start_year = 999999;
  period.end_year = 999999;
  expectRejected(doc, 'time-range-out-of-bounds', /TIME_RANGE/);
});

test('QA: a wrong field type is rejected (E_FIELD_TYPE)', () => {
  const doc = legalDoc();
  doc.entities.find((e) => e.entity_type === 'TimePeriod').start_year = '1000';
  expectRejected(doc, 'wrong-field-type', /FIELD_TYPE|TIME_RANGE/);
});

// ---------------------------------------------------------------------------
// 7. Five-field error contract
// ---------------------------------------------------------------------------

test('QA: every error record carries all five contract fields, non-empty', () => {
  const doc = legalDoc();
  doc.entities.find((e) => e.entity_type === 'Dish').dish_kind = 'nope';
  doc.entities.find((e) => e.entity_type === 'TimePeriod').start_year = 9000;
  doc.entities.find((e) => e.entity_type === 'TimePeriod').end_year = 10;
  doc.relations.find((r) => r.type === 'dish_contains_ingredient').target = 'ing_missing_xyz';

  const dir = newCaseDir('five-fields');
  const p = writeDoc(dir, 'five.kb.json', doc);
  const { status, records } = validate(p);
  assert.equal(status, 1);
  assert.ok(records.length > 0, 'expected at least one error record');

  for (const rec of records) {
    assert.ok(!rec.__unparsed, `stdout must be pure JSONL, got: ${rec.__unparsed}`);
    for (const field of ['file', 'entityOrRelationId', 'fieldPath', 'code', 'message']) {
      assert.ok(
        typeof rec[field] === 'string' && rec[field].length > 0,
        `record must carry non-empty "${field}": ${JSON.stringify(rec)}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 8. Validator exit-code semantics
// ---------------------------------------------------------------------------

test('QA: exit code 2 for a nonexistent target path', () => {
  const run = runNode(VALIDATOR, ['data/kb/qa-does-not-exist-xyz']);
  assert.equal(run.status, 2, `expected exit 2, got ${run.status}`);
});

test('QA: an empty directory does not pass silently', () => {
  const dir = newCaseDir('empty-dir');
  const run = runNode(VALIDATOR, [dir]);
  assert.equal(run.status, 1, `expected exit 1 for an empty directory, got ${run.status}`);
  assert.ok(
    /no .*documents found|DOC_SHAPE/i.test(run.stdout + run.stderr),
    'an empty directory scan must not silently pass',
  );
});

test('QA: validator default run (no args) validates the built-in valid set and exits 0', () => {
  const run = runNode(VALIDATOR, []);
  assert.equal(run.status, 0, `expected exit 0, got ${run.status}; stderr: ${run.stderr.trim()}`);
});

// ---------------------------------------------------------------------------
// 9. Validator must not modify its inputs
// ---------------------------------------------------------------------------

test('QA: validator does not modify any input file', () => {
  const doc = legalDoc();
  doc.entities.find((e) => e.entity_type === 'Dish').dish_kind = 'nope';
  const dir = newCaseDir('readonly');
  const bad = writeDoc(dir, 'bad.kb.json', doc);
  const good = writeDoc(dir, 'good.kb.json', legalDoc());

  const beforeBad = sha256File(bad);
  const beforeGood = sha256File(good);
  validate(bad);
  validate(good);
  assert.equal(sha256File(bad), beforeBad, 'validator mutated the failing input');
  assert.equal(sha256File(good), beforeGood, 'validator mutated the passing input');

  // Also cover the repository's own example sets.
  const repoFiles = [
    'data/kb/examples/valid/minimal.kb.json',
    'data/kb/examples/valid/fixture-all-entities.kb.json',
    'data/kb/examples/invalid/bad-trace-chain.kb.json',
  ].map((rel) => path.join(REPO_ROOT, rel));
  const before = repoFiles.map(sha256File);
  validate(path.join(REPO_ROOT, 'data/kb/examples/valid'));
  validate(path.join(REPO_ROOT, 'data/kb/examples/invalid'));
  repoFiles.forEach((f, i) => {
    assert.equal(sha256File(f), before[i], `validator mutated ${path.basename(f)}`);
  });
});

// ---------------------------------------------------------------------------
// 10. Adapter: determinism, idempotence, read-only, no fabrication
// ---------------------------------------------------------------------------

test('QA: adapter --dry-run exits 0 and writes nothing', () => {
  const probeDir = newCaseDir('dry-run-target');
  const before = fs.readdirSync(probeDir);
  const run = runNode(ADAPTER, ['--dry-run', '--out', probeDir]);
  assert.equal(run.status, 0, `expected exit 0, got ${run.status}; stderr: ${run.stderr.trim()}`);
  // The adapter announces dry-run on stdout (stderr carries the normal summary).
  assert.ok(
    /dry run/i.test(run.stdout + run.stderr),
    `dry-run should announce itself; stdout=${run.stdout.slice(0, 200)}`,
  );
  assert.deepEqual(
    fs.readdirSync(probeDir),
    before,
    'a dry run must not write any file into the target directory',
  );
});

test('QA: adapter rejects a bad CLI usage with exit code 2', () => {
  const run = runNode(ADAPTER, ['--out']);
  assert.equal(run.status, 2, `expected exit 2 for "--out" without a value, got ${run.status}`);
});

test('QA: adapter output is deterministic and idempotent, and V1 inputs are untouched', () => {
  const v1Files = [
    'data/knowledge_graph/nodes_dish.json',
    'data/knowledge_graph/nodes_ancient_text.json',
    'data/knowledge_graph/nodes_ingredient.json',
    'data/knowledge_graph/nodes_technique.json',
    'data/knowledge_graph/nodes_dynasty.json',
    'data/knowledge_graph/nodes_region.json',
    'data/knowledge_graph/nodes_season.json',
    'data/knowledge_graph/relationships.json',
    'data/knowledge_graph/schema.json',
    'data/knowledge_graph/expert_review_manifest.json',
    'data/recipes/ancient_recipes.json',
    'data/fragments/ancient_fragments.json',
    'data/literature/authoritative_recipe_texts.json',
  ].map((rel) => path.join(REPO_ROOT, rel));

  const before = new Map(v1Files.map((f) => [f, sha256File(f)]));

  const outA = newCaseDir('adapter-run-a');
  const outB = newCaseDir('adapter-run-b');

  const runA = runNode(ADAPTER, ['--out', outA]);
  assert.equal(runA.status, 0, `run A failed: ${runA.stderr.trim()}`);
  const runB = runNode(ADAPTER, ['--out', outB]);
  assert.equal(runB.status, 0, `run B failed: ${runB.stderr.trim()}`);

  const aDoc = sha256File(path.join(outA, 'kb-v2.kb.json'));
  const bDoc = sha256File(path.join(outB, 'kb-v2.kb.json'));
  const aRep = sha256File(path.join(outA, 'adaptation-report.json'));
  const bRep = sha256File(path.join(outB, 'adaptation-report.json'));
  assert.equal(aDoc, bDoc, 'two runs produced different kb-v2.kb.json bytes');
  assert.equal(aRep, bRep, 'two runs produced different adaptation-report.json bytes');

  // Re-run into the same directory: must not grow or duplicate.
  const countEntities = (p) => JSON.parse(fs.readFileSync(p, 'utf8')).entities.length;
  const countRelations = (p) => JSON.parse(fs.readFileSync(p, 'utf8')).relations.length;
  const beforeE = countEntities(path.join(outA, 'kb-v2.kb.json'));
  const beforeR = countRelations(path.join(outA, 'kb-v2.kb.json'));
  const rerun = runNode(ADAPTER, ['--out', outA]);
  assert.equal(rerun.status, 0, `rerun failed: ${rerun.stderr.trim()}`);
  assert.equal(countEntities(path.join(outA, 'kb-v2.kb.json')), beforeE, 'entities grew on rerun');
  assert.equal(countRelations(path.join(outA, 'kb-v2.kb.json')), beforeR, 'relations grew on rerun');
  assert.equal(sha256File(path.join(outA, 'kb-v2.kb.json')), aDoc, 'rerun changed output bytes');

  // No duplicate ids / relation triples.
  const doc = JSON.parse(fs.readFileSync(path.join(outA, 'kb-v2.kb.json'), 'utf8'));
  const ids = doc.entities.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'adapter output contains duplicate entity ids');
  const triples = doc.relations.map((r) => `${r.type}|${r.source}|${r.target}`);
  assert.equal(new Set(triples).size, triples.length, 'adapter output contains duplicate relations');

  // V1 inputs must be byte-identical after all of this.
  for (const f of v1Files) {
    assert.equal(sha256File(f), before.get(f), `adapter modified V1 input ${path.relative(REPO_ROOT, f)}`);
  }
});

// ---------------------------------------------------------------------------
// 11. Adapter output fidelity to V1's real (low) evidence level
// ---------------------------------------------------------------------------

test('QA: adapter output contains zero passage_in_edition and all claims insufficient', () => {
  const docPath = path.join(REPO_ROOT, GENERATED_DIR, 'kb-v2.kb.json');
  assert.ok(fs.existsSync(docPath), `expected adapter output at ${GENERATED_DIR}/kb-v2.kb.json`);
  const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));

  const passages = doc.entities.filter((e) => e.entity_type === 'SourcePassage');
  assert.ok(passages.length > 0, 'expected SourcePassage entities');

  const byResolution = {};
  for (const p of passages) byResolution[p.edition_resolution] = (byResolution[p.edition_resolution] ?? 0) + 1;
  assert.equal(
    byResolution.resolved ?? 0,
    0,
    `V1 has no resolved passage; expected 0, got ${byResolution.resolved}`,
  );

  const pie = doc.relations.filter((r) => r.type === 'passage_in_edition');
  assert.equal(
    pie.length,
    0,
    'no passage_in_edition may be emitted when no passage is resolved (disambiguation is forbidden)',
  );

  // Every passage must keep edition_id null when not resolved.
  for (const p of passages) {
    if (p.edition_resolution !== 'resolved') {
      assert.equal(p.edition_id, null, `${p.id}: edition_id must be null when not resolved`);
    }
  }

  const claims = doc.entities.filter((e) => e.entity_type === 'HistoricalClaim');
  assert.ok(claims.length > 0, 'expected HistoricalClaim entities');
  const notInsufficient = claims.filter((c) => c.evidence_status !== 'insufficient');
  assert.equal(
    notInsufficient.length,
    0,
    `all claims must be insufficient given V1 evidence; offenders: ${notInsufficient.map((c) => c.id).join(', ')}`,
  );

  // No silent promotion anywhere in the document.
  const verified = doc.entities.filter((e) => e.review_status === 'verified');
  assert.equal(verified.length, 0, 'no entity may carry review_status "verified"');
  assert.ok(
    !JSON.stringify(doc).includes('"verified"'),
    'the literal "verified" must not appear as a status in adapter output',
  );
});

test('QA: adapter preserves V1 ids and does not fabricate provenance for unsourced nodes', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, GENERATED_DIR, 'kb-v2.kb.json'), 'utf8'));
  const report = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, GENERATED_DIR, 'adaptation-report.json'), 'utf8'),
  );
  const byId = new Map(doc.entities.map((e) => [e.id, e]));

  // SourceWork count: 5 content works + 3 collected series + 2 unresolved titles.
  const works = doc.entities.filter((e) => e.entity_type === 'SourceWork');
  assert.equal(works.length, 10, `expected 10 SourceWork, got ${works.length}`);
  const unresolvedWorks = works.filter((w) => w.attribution_status === 'unknown');
  assert.equal(unresolvedWorks.length, 2, 'expected exactly 2 unresolved book titles');
  for (const w of unresolvedWorks) {
    assert.equal(w.author, null, `${w.id}: an unresolved title must not invent an author`);
    assert.equal(w.provenance.derivation, 'unresolved');
  }

  // V1 ids must remain traceable through the adapter's id_mapping.
  const mapping = Array.isArray(report.id_mapping)
    ? report.id_mapping
    : Object.entries(report.id_mapping).map(([v1_id, v2_id]) => ({ v1_id, v2_id }));
  const mapByV1 = new Map(mapping.map((m) => [m.v1_id, m.v2_id]));
  for (const v1Id of ['text_001', 'text_002', 'text_003', 'text_004', 'text_005']) {
    const v2Id = mapByV1.get(v1Id);
    assert.ok(v2Id, `V1 id ${v1Id} must appear in the adapter id_mapping (id traceability)`);
    assert.ok(byId.has(v2Id), `mapped id ${v2Id} must exist in the generated document`);
  }

  // The 5 V1 ancient_text nodes carried NO provenance fields at all. The adapter
  // must surface that honestly rather than backfill a source.
  const legacy = ['text_001', 'text_002', 'text_003', 'text_004', 'text_005'];
  for (const v1Id of legacy) {
    const node = byId.get(mapByV1.get(v1Id));
    assert.ok(node, `legacy node ${v1Id} must be preserved (id traceability)`);
    assert.equal(
      node.provenance.derivation,
      'unresolved',
      `${v1Id}: an unsourced node must be derivation=unresolved`,
    );
    assert.ok(
      !node.provenance.source_locator,
      `${v1Id} has no V1 provenance; the adapter must not fabricate a source_locator`,
    );
  }

  // lit_ccs_006/014/027 are series volumes whose titles collide with content works.
  // Their editions must hang off the collected series, never off a content work.
  const editions = doc.entities.filter((e) => e.entity_type === 'SourceEdition');
  const workTypeById = new Map(works.map((w) => [w.id, w.work_type]));
  const editionOfWork = doc.relations.filter((r) => r.type === 'edition_of_work');
  assert.equal(
    editionOfWork.length,
    editions.length,
    'each edition needs exactly one edition_of_work',
  );
  const pointingAtContentWork = editionOfWork.filter(
    (r) => workTypeById.get(r.target) !== 'collected_series',
  );
  assert.equal(
    pointingAtContentWork.length,
    0,
    `editions must hang off the collected series, not content works; offenders: ${pointingAtContentWork
      .slice(0, 5)
      .map((r) => r.source)
      .join(', ')}`,
  );

  // No fabricated bibliographic values.
  for (const ed of editions) {
    if (ed.publication_year !== null) {
      assert.ok(
        Number.isInteger(ed.publication_year),
        `${ed.id}: publication_year must be an integer or null`,
      );
    }
    assert.ok(ed.provenance && ed.provenance.derivation, `${ed.id}: provenance is mandatory`);
  }
});

test('QA: adaptation report records the unmapped/missing/conflict findings', () => {
  const reportPath = path.join(REPO_ROOT, GENERATED_DIR, 'adaptation-report.json');
  assert.ok(fs.existsSync(reportPath), 'adaptation-report.json must exist');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  for (const key of [
    'unmapped_fields',
    'missing_sources',
    'conflicts',
    'ambiguous_edition',
    'unresolved_passages',
    'counts',
    'id_mapping',
    'notes',
  ]) {
    assert.ok(key in report, `adaptation report must contain "${key}"`);
  }

  // The known V1 defects must be surfaced rather than silently dropped.
  assert.ok(Array.isArray(report.ambiguous_edition) && report.ambiguous_edition.length > 0,
    'ambiguous edition candidates must be reported');
  assert.ok(Array.isArray(report.unresolved_passages) && report.unresolved_passages.length > 0,
    'unresolved passages must be reported');

  // The report must state that a successful adaptation is not historical verification.
  const noteText = JSON.stringify(report.notes);
  assert.ok(
    /not.*(historical|verif)|结构|不代表|真实性/i.test(noteText),
    'the report must state that structural success is not historical verification',
  );
});

test('QA: adapter output passes the validator (exit 0)', () => {
  const run = runNode(VALIDATOR, [GENERATED_DIR]);
  assert.equal(run.status, 0, `generated output must validate; stderr: ${run.stderr.trim()}`);
});

// ---------------------------------------------------------------------------
// 12. Old (V1) data is still readable by the existing loaders
// ---------------------------------------------------------------------------

test('QA: V1 knowledge-graph data still parses and keeps its shape', () => {
  const kg = path.join(REPO_ROOT, 'data/knowledge_graph');
  const dishes = JSON.parse(fs.readFileSync(path.join(kg, 'nodes_dish.json'), 'utf8'));
  const relationships = JSON.parse(fs.readFileSync(path.join(kg, 'relationships.json'), 'utf8'));
  const schema = JSON.parse(fs.readFileSync(path.join(kg, 'schema.json'), 'utf8'));

  assert.ok(Array.isArray(dishes), 'nodes_dish.json must remain an array');
  assert.equal(dishes.length, 40, 'V1 dish count must be unchanged');
  assert.ok(Array.isArray(relationships), 'relationships.json must remain an array');
  assert.equal(relationships.length, 49, 'V1 relationship count must be unchanged');
  assert.equal(schema.version, '1.0.0', 'V1 schema.json must remain untouched at version 1.0.0');

  // The V1 read path must not have been rewired to V2.
  const kgPy = fs.readFileSync(path.join(REPO_ROOT, 'service/knowledge_graph.py'), 'utf8');
  assert.ok(
    !kgPy.includes('data/kb'),
    'service/knowledge_graph.py must not read V2 data (V1 read path must stay frozen)',
  );
  const lightMode = fs.readFileSync(
    path.join(REPO_ROOT, 'backend/src/services/LightModeService.js'),
    'utf8',
  );
  assert.ok(
    !lightMode.includes('data/kb'),
    'LightModeService.js must not read V2 data (V1 read path must stay frozen)',
  );
});

test('QA: no V2 artifact leaked into data/knowledge_graph', () => {
  const kgDir = path.join(REPO_ROOT, 'data/knowledge_graph');
  const offenders = fs
    .readdirSync(kgDir)
    .filter((n) => n.endsWith('.kb.json'));
  assert.deepEqual(offenders, [], `no .kb.json may exist under data/knowledge_graph: ${offenders}`);
  assert.ok(
    !fs.existsSync(path.join(kgDir, 'nodes_kb.json')),
    'V2 must not add nodes_*.json under data/knowledge_graph (would be auto-loaded by verify_graph_schema.mjs:297)',
  );
});

// ---------------------------------------------------------------------------
// 13. Schema shape assertions (independent of KB-001B's own tests)
// ---------------------------------------------------------------------------

test('QA: schema covers the 17 contracted entity types', () => {
  const required = [
    'SourceWork', 'SourceEdition', 'SourcePassage', 'HistoricalClaim', 'Dish',
    'Ingredient', 'IngredientState', 'Technique', 'Utensil', 'Measurement',
    'TimePeriod', 'Region', 'Season', 'RestorationVersion', 'ExpertReview',
    'SafetyRule', 'Experiment',
  ];
  const present = Object.keys(SCHEMA.entities);
  assert.equal(present.length, 17);
  for (const name of required) {
    assert.ok(present.includes(name), `schema is missing entity ${name}`);
  }
  assert.equal(SCHEMA.schema_version, '2.0.0');
});

test('QA: every relation declares legal source and target endpoint types', () => {
  const entityTypes = new Set(Object.keys(SCHEMA.entities));
  const asList = (v) => (Array.isArray(v) ? v : String(v).split(',').map((s) => s.trim()));
  for (const [name, rel] of Object.entries(SCHEMA.relations)) {
    const srcs = asList(rel.source);
    const tgts = asList(rel.target);
    assert.ok(srcs.length > 0 && srcs[0] !== '', `relation ${name} is missing a source endpoint constraint`);
    assert.ok(tgts.length > 0 && tgts[0] !== '', `relation ${name} is missing a target endpoint constraint`);
    for (const t of [...srcs, ...tgts]) {
      if (t === '*') continue;
      assert.ok(entityTypes.has(t), `relation ${name} names unknown entity type "${t}"`);
    }
  }
});

test('QA: the two contracted trace chains exist in the schema', () => {
  const asList = (v) => (Array.isArray(v) ? v : [v]);
  const chains = {
    passage_in_edition: ['SourcePassage', 'SourceEdition'],
    edition_of_work: ['SourceEdition', 'SourceWork'],
    claim_supported_by: ['HistoricalClaim', 'SourcePassage'],
    claim_refuted_by: ['HistoricalClaim', 'SourcePassage'],
  };
  for (const [rel, [src, tgt]] of Object.entries(chains)) {
    const def = SCHEMA.relations[rel];
    assert.ok(def, `schema must declare relation ${rel}`);
    assert.deepEqual(asList(def.source), [src], `${rel} source must be ${src}`);
    assert.deepEqual(asList(def.target), [tgt], `${rel} target must be ${tgt}`);
  }
});

test('QA: content_class distinguishes fact / inference / modern adaptation / user experiment', () => {
  assert.deepEqual(
    [...SCHEMA.enums.content_class].sort(),
    ['historical_fact', 'historical_inference', 'modern_adaptation', 'user_experiment'].sort(),
  );
});
