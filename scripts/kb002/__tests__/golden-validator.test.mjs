// KB-002E validator tests.
//
// Contract sources (frozen):
//   docs/kb-002/01-golden-dataset-contract.md  section 10.3 (test strategy)
//   docs/kb-002/02-evidence-quality-rubric.md  sections 1-8
//
// Every assertion below runs the real CLI as a child process and reads its real
// exit code, so the test cannot drift from the shipped behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { productionLikeFixture, structuralFixture } from './fixtures.mjs';
import { createWorkspace, isInsideWorkspace, realGoldenRoot } from './workspace.mjs';
import {
  MANIFEST_REL_PATH,
  MANIFEST_SCHEMA_INVALID,
  validateManifestSchema,
  buildManifestEntry,
  writeManifest,
  checkStagingIntegrity,
} from '../lib/staging-integrity.mjs';
import {
  getActiveContractVersion,
  readDeclaredVersion,
  resetActiveContractVersionCache,
  CONTRACT_VERSION_SOURCES,
} from '../lib/contract-version.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const CLI = path.join('scripts', 'kb002', 'validate-golden.mjs');
const VALID_DIR = 'data/kb/golden/examples/valid';
const INVALID_DIR = 'data/kb/golden/examples/invalid';
const STAGING_DIR = 'data/kb/golden/staging';
const VALID_FILE = path.join(VALID_DIR, 'golden_001.kb.json');

// Findings a structural fixture may legitimately carry. See the tool's
// STRUCTURAL_FIXTURE_EXPECTED_CODES for the rationale; this mirror keeps the
// test's expectation explicit and lets a divergence fail loudly.
const STRUCTURAL_EXPECTED = new Set([
  'KB002_DISH_BELOW_E3',
  'KB002_LEVEL_MISMATCH',
  'KB002_DISH_LEVEL_MISMATCH',
  'KB002_LEVEL_STATUS_CONFLICT',
  'KB002_LEVEL_REVIEW_CONFLICT',
  'KB002_LEVEL_DERIVATION_CONFLICT',
  'KB002_QUALIFIED_MISMATCH',
  'KB002_SUFFICIENT_PRECONDITION',
  'KB002_GRADE_INSUFFICIENT',
  'KB002_GRADE_LEAD_ONLY',
  'KB002_NO_RESOLVED_CHAIN',
  'E_TRACE_WEAKENS_CLAIM',
]);

function runCli(args, env) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    // An isolated workspace passes KB002_GOLDEN_ROOT so the CLI resolves the
    // dataset inside the temp root instead of the real data/kb/golden tree.
    env: env ? { ...process.env, ...env } : process.env,
  });
  const codes = [...(r.stdout || '').matchAll(/"code":"([A-Z0-9_]+)"/g)].map((m) => m[1]);
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', codes };
}

function goldenIdOf(relPath) {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
  return doc.metadata.golden_id;
}

// ---------------------------------------------------------------------------
// positive -- the structural fixture
// ---------------------------------------------------------------------------
// t24 sections 15-16: a "valid fixture" is no longer one that fabricates enough
// bibliography to reach E3. The structural fixture is synthetic, so it honestly
// sits below the production admission threshold, and Q3 says so. Its structural
// validity is what must hold: no schema break, no dangling reference, and no
// finding outside the documented below-threshold set.
test('the structural fixture passes: only documented below-threshold findings', () => {
  const r = runCli([]);
  assert.equal(r.status, 0, `expected 0, got ${r.status}: ${r.stderr}`);
  assert.match(r.stderr, /KB-002 structural fixtures PASSED/);
  const unexpected = r.codes.filter((c) => !STRUCTURAL_EXPECTED.has(c));
  assert.deepEqual(unexpected, [], `unexpected structural findings: ${unexpected.join(', ')}`);
  // Q3 must still be the reason, i.e. the fixture really is below E3 rather than
  // silently exempted from the threshold.
  assert.ok(r.codes.includes('KB002_DISH_BELOW_E3'),
    'the structural fixture must still be reported as below E3 (Q3 not suppressed)');
});

test('stdout is JSONL only (findings only; summaries go to stderr)', () => {
  const r = runCli([]);
  for (const line of r.stdout.split('\n').filter(Boolean)) {
    assert.doesNotThrow(() => JSON.parse(line), `stdout line is not JSON: ${line}`);
  }
  // The human summary must never leak into stdout.
  assert.ok(!r.stdout.includes('QUALIFIED_GOLDEN_COUNT'));

  // A run over a genuinely clean document still writes nothing to stdout.
  const clean = runCli([path.join(REPO_ROOT, VALID_FILE)]);
  assert.ok(clean.status === 0 || clean.status === 1);
  for (const line of clean.stdout.split('\n').filter(Boolean)) {
    assert.doesNotThrow(() => JSON.parse(line));
  }
});

test('the validator is deterministic across repeated runs', () => {
  const a = runCli([VALID_FILE]);
  const b = runCli([VALID_FILE]);
  assert.equal(a.status, b.status);
  assert.equal(a.stdout, b.stdout);
  assert.equal(a.stderr, b.stderr);
});

test('the validator does not modify its input', () => {
  const before = fs.readFileSync(path.join(REPO_ROOT, VALID_FILE));
  runCli([]);
  const after = fs.readFileSync(path.join(REPO_ROOT, VALID_FILE));
  assert.deepEqual(after, before);
});

// ---------------------------------------------------------------------------
// runtime error semantics (exit 2)
// ---------------------------------------------------------------------------
test('a non-existent target path exits 2', () => {
  const r = runCli(['data/kb/golden/does-not-exist']);
  assert.equal(r.status, 2);
  assert.ok(r.codes.includes('E_DOC_SHAPE'));
});

test('an empty explicitly requested directory does not pass silently', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb002-empty-'));
  try {
    const r = runCli([emptyDir]);
    assert.equal(r.status, 1);
    assert.ok(r.codes.includes('E_DOC_SHAPE'));
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// per-fixture negative cases -- each must fail with its intended KB-002 code
// ---------------------------------------------------------------------------
const EXPECTED = [
  ['inv_01_missing_source_work.kb.json', 'E_DANGLING_REFERENCE'],
  ['inv_02_dangling_passage.kb.json', 'KB002_LEVEL_MISMATCH'],
  ['inv_03_duplicate_claim_id.kb.json', 'E_DUPLICATE_ID'],
  ['inv_04_level_mismatch.kb.json', 'KB002_LEVEL_MISMATCH'],
  ['inv_05_self_declared_e5.kb.json', 'KB002_E5_UNREACHABLE'],
  ['inv_06_e5_unreachable.kb.json', 'KB002_EXPERIMENT_FORBIDDEN'],
  ['inv_07_grade_x_on_chain.kb.json', 'KB002_AI_SOURCE_FORBIDDEN'],
  ['inv_08_grade_c_sufficient.kb.json', 'KB002_GRADE_INSUFFICIENT'],
  ['inv_09_grade_undeclared.kb.json', 'KB002_GRADE_UNDECLARED'],
  ['inv_10_conflict_hidden.kb.json', 'KB002_CONFLICT_HIDDEN'],
  ['inv_11_grade_lead_only.kb.json', 'KB002_GRADE_LEAD_ONLY'],
  ['inv_12_metadata_incomplete.kb.json', 'KB002_METADATA_INCOMPLETE'],
  ['inv_14_v1_adapter.kb.json', 'KB002_DERIVATION_V1_FORBIDDEN'],
  ['inv_15_content_class.kb.json', 'KB002_CONTENT_CLASS_FORBIDDEN'],
  ['inv_16_external_reviewed.kb.json', 'KB002_EXTERNAL_REVIEW_UNSUPPORTED'],
  ['inv_17_dish_not_documented.kb.json', 'KB002_DISH_NOT_DOCUMENTED'],
];

for (const [name, code] of EXPECTED) {
  test(`negative fixture ${name} fails and reports ${code}`, () => {
    const r = runCli([path.join(INVALID_DIR, name)]);
    assert.equal(r.status, 1, `${name} should exit 1, got ${r.status}`);
    assert.ok(r.codes.includes(code), `${name} should report ${code}, got ${r.codes.join(',') || '(none)'}`);
  });
}

for (const [name] of EXPECTED) {
  test(`negative fixture ${name} emits no duplicate findings`, () => {
    const r = runCli([path.join(INVALID_DIR, name)]);
    const lines = r.stdout.split('\n').filter(Boolean);
    const uniq = new Set(lines);
    assert.equal(uniq.size, lines.length, `${name} emitted duplicate finding records`);
  });
}

// ---------------------------------------------------------------------------
// failure-path behaviour that needs a synthetic document
// ---------------------------------------------------------------------------
test('CF3 detects a deleted refutation edge (conflict hidden)', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FILE), 'utf8'));
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  // Keep the recorded refutation in notes but strip every refuting edge: exactly
  // the "conflict hidden to get one tidy answer" pattern CF3 must catch.
  claim.counter_evidence_notes = ['synthetic: a refutation was recorded but its edge is gone'];
  doc.relations = doc.relations.filter((r) => r.type !== 'claim_refuted_by');
  const tmp = path.join(REPO_ROOT, 'tmp', 'kb002-cf3.kb.json');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2), 'utf8');
  try {
    const r = runCli([tmp]);
    assert.equal(r.status, 1);
    assert.ok(r.codes.includes('KB002_CONFLICT_HIDDEN'), `got ${r.codes.join(',')}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test('CF2 requires counter_evidence_notes when a refutation edge exists', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FILE), 'utf8'));
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  // The positive fixture already carries a refuting edge, so drop the notes to
  // isolate CF2 (a refutation edge with no recorded counter-evidence note).
  delete claim.counter_evidence_notes;
  const tmp = path.join(REPO_ROOT, 'tmp', 'kb002-cf2.kb.json');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2), 'utf8');
  try {
    const r = runCli([tmp]);
    assert.equal(r.status, 1);
    assert.ok(r.codes.includes('KB002_COUNTER_NOTES_MISSING'), `got ${r.codes.join(',')}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test('a production file whose name disagrees with metadata.golden_id is rejected', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FILE), 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb002-name-'));
  const file = path.join(dir, 'golden_002.kb.json');
  fs.writeFileSync(file, JSON.stringify(doc, null, 2), 'utf8');
  try {
    const r = runCli([file]);
    assert.equal(r.status, 1);
    assert.ok(r.codes.includes('KB002_FILENAME_ID_MISMATCH'), `got ${r.codes.join(',')}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the production dataset reports an honest qualified count and shortfall', () => {
  const r = runCli(['--dataset']);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = \d+/);
  assert.match(r.stderr, /SHORTFALL = \d+/);
  assert.match(r.stderr, /STATUS = (EMPTY|PARTIAL|COMPLETE)_GOLDEN_SET/);
});

test('fixtures and production data are physically separated (H6)', () => {
  for (const name of fs.readdirSync(path.join(REPO_ROOT, INVALID_DIR))) {
    assert.match(name, /\.kb\.json$/);
  }
  const prod = fs.existsSync('data/kb/golden')
    ? fs.readdirSync(path.join(REPO_ROOT, 'data/kb/golden'), { withFileTypes: true })
    : [];
  for (const entry of prod) {
    if (entry.isFile()) assert.match(entry.name, /^golden_\d{3}\.kb\.json$/);
  }
});

test('every invalid fixture is labelled as a negative fixture', () => {
  for (const name of fs.readdirSync(path.join(REPO_ROOT, INVALID_DIR))) {
    const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, INVALID_DIR, name), 'utf8'));
    assert.equal(doc.metadata.fixture, true, `${name} must be marked as a fixture`);
    assert.match(String(doc.metadata.purpose), /Negative fixture:/);
    assert.ok(goldenIdOf(path.join(INVALID_DIR, name)));
  }
});

// ---------------------------------------------------------------------------
// KB-002 t10 repair additions
// ---------------------------------------------------------------------------

// QA secondary defect: the previous suite only checked fixture *labels*, so a
// negative fixture that actually passed was never detected. This walks the whole
// negative set and requires each one to genuinely fail.
test('every negative fixture in examples/invalid actually exits 1 with at least one finding', () => {
  const dir = path.join(REPO_ROOT, INVALID_DIR);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json')).sort();
  assert.ok(names.length >= 17, `expected at least 17 negative fixtures, found ${names.length}`);
  const bad = [];
  for (const name of names) {
    const r = runCli([path.join(INVALID_DIR, name)]);
    if (r.status !== 1) bad.push(`${name} exit=${r.status}`);
    else if (r.codes.length === 0) bad.push(`${name} exit=1 but produced no error code`);
  }
  assert.deepEqual(bad, [], `negative fixtures that do not actually fail: ${bad.join('; ')}`);
});

// N-01: asserting only "exit 1 and >= 1 code" was NOT enough. After the D1 fix
// every negative fixture also carried KB002_FILENAME_ID_MISMATCH, so a fixture
// whose INTENDED rule regressed would still exit 1 (via the filename rule) and
// the suite would stay green — a silent loss of coverage. Each negative must now
// emit its own intended code, so a regression in that rule fails the suite.
const INTENDED_CODE = {
  'golden_002.kb.json': 'KB002_FILENAME_ID_MISMATCH', // inv_13 renamed: production-shaped name, wrong id
  'inv_01_missing_source_work.kb.json': 'E_DANGLING_REFERENCE',
  'inv_02_dangling_passage.kb.json': 'E_DANGLING_REFERENCE',
  'inv_03_duplicate_claim_id.kb.json': 'E_DUPLICATE_ID',
  'inv_04_level_mismatch.kb.json': 'KB002_LEVEL_MISMATCH',
  'inv_05_self_declared_e5.kb.json': 'KB002_E5_UNREACHABLE',
  'inv_06_e5_unreachable.kb.json': 'KB002_EXPERIMENT_FORBIDDEN',
  'inv_07_grade_x_on_chain.kb.json': 'KB002_AI_SOURCE_FORBIDDEN',
  'inv_08_grade_c_sufficient.kb.json': 'KB002_GRADE_INSUFFICIENT',
  'inv_09_grade_undeclared.kb.json': 'KB002_GRADE_UNDECLARED',
  'inv_10_conflict_hidden.kb.json': 'KB002_CONFLICT_HIDDEN',
  'inv_11_grade_lead_only.kb.json': 'KB002_GRADE_LEAD_ONLY',
  'inv_12_metadata_incomplete.kb.json': 'KB002_METADATA_INCOMPLETE',
  'inv_14_v1_adapter.kb.json': 'KB002_DERIVATION_V1_FORBIDDEN',
  'inv_15_content_class.kb.json': 'KB002_CONTENT_CLASS_FORBIDDEN',
  'inv_16_external_reviewed.kb.json': 'KB002_EXTERNAL_REVIEW_UNSUPPORTED',
  'inv_17_dish_not_documented.kb.json': 'KB002_DISH_NOT_DOCUMENTED',
};

test('N-01: every negative fixture emits its own intended error code', () => {
  const dir = path.join(REPO_ROOT, INVALID_DIR);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json')).sort();
  const missing = [];
  const unmapped = [];
  for (const name of names) {
    const want = INTENDED_CODE[name];
    if (!want) { unmapped.push(name); continue; }
    const r = runCli([path.join(INVALID_DIR, name)]);
    if (r.status !== 1) missing.push(`${name} exit=${r.status}`);
    else if (!r.codes.includes(want)) missing.push(`${name} missing intended ${want} (got ${r.codes.join(',') || '(none)'})`);
  }
  assert.deepEqual(unmapped, [], `negative fixtures with no intended-code mapping: ${unmapped.join('; ')}`);
  assert.deepEqual(missing, [], `negative fixtures lacking their intended code: ${missing.join('; ')}`);
});

test('N-01: the negative set is no longer polluted by KB002_FILENAME_ID_MISMATCH noise', () => {
  const dir = path.join(REPO_ROOT, INVALID_DIR);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json')).sort();
  const allowed = 'golden_002.kb.json'; // the one fixture whose intended code IS the filename rule
  const polluted = [];
  for (const name of names) {
    if (name === allowed) continue;
    const r = runCli([path.join(INVALID_DIR, name)]);
    if (r.codes.includes('KB002_FILENAME_ID_MISMATCH')) {
      polluted.push(`${name} unexpectedly carries KB002_FILENAME_ID_MISMATCH`);
    }
  }
  assert.deepEqual(polluted, [], `filename-rule noise on unrelated negatives: ${polluted.join('; ')}`);
});

test('D1: the filename/golden_id mismatch negative fixture really fails', () => {
  const r = runCli([path.join(INVALID_DIR, 'golden_002.kb.json')]);
  assert.equal(r.status, 1, 'the renamed inv_13 must not pass');
  assert.ok(r.codes.includes('KB002_FILENAME_ID_MISMATCH'), `got ${r.codes.join(',') || '(none)'}`);
});

test('N-01: production data must still use a golden_id-derived file name (H7 not weakened)', () => {
  // A production-shaped file whose name disagrees with its golden_id is still an
  // H7 violation, and an oddly-named file OUTSIDE examples/ is also still caught.
  //
  // KB002-TOOL-FIX-03: this used to write into the real data/kb/golden tree
  // (`__n01_probe__`). The assertion is unchanged; only the write location moved
  // into an isolated workspace.
  const ws = createWorkspace('kb002-n01-');
  try {
    const src = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FILE), 'utf8'));
    src.metadata = { ...src.metadata, fixture: false, not_historical_evidence: undefined, golden_id: 'GOLDEN-001' };

    const probeDir = ws.resolve('data/kb/golden/__n01_probe__');
    fs.mkdirSync(probeDir, { recursive: true });
    assert.ok(isInsideWorkspace(ws, probeDir), 'the probe dir must live inside the workspace');

    const odd = path.join(probeDir, 'random_name.kb.json');
    fs.writeFileSync(odd, JSON.stringify(src, null, 2));
    const r = runCli([odd], ws.env);
    assert.equal(r.status, 1, 'a production file with a non-golden-shaped name must fail');
    assert.ok(r.codes.includes('KB002_FILENAME_ID_MISMATCH'), `got ${r.codes.join(',') || '(none)'}`);

    const good = path.join(probeDir, 'golden_001.kb.json');
    fs.writeFileSync(good, JSON.stringify(src, null, 2));
    const g = runCli([good], ws.env);
    assert.ok(!g.codes.includes('KB002_FILENAME_ID_MISMATCH'), `correctly named file must not be flagged: ${g.codes.join(',')}`);
  } finally {
    ws.cleanup();
  }
});

// SEC-T7-01: a self-declared fixture must be rejected wherever it sits, and must
// never contribute to the dataset quality arithmetic.
test('SEC-T7-01: a fixture-marked document at a production path is rejected and not counted', () => {
  // KB002-TOOL-FIX-03: the misplaced fixture is created inside an isolated
  // workspace. The point of the case -- a fixture sitting at a *production*
  // path is rejected and never counted -- is preserved, because the workspace's
  // data/kb/golden IS the production root for the injected CLI.
  const ws = createWorkspace('kb002-t7-');
  try {
    const probeDir = ws.resolve('data/kb/golden/__t7_probe__');
    const probeFile = path.join(probeDir, 'golden_001.kb.json');
    fs.mkdirSync(probeDir, { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, VALID_FILE), probeFile);
    assert.ok(isInsideWorkspace(ws, probeFile), 'the misplaced fixture must live inside the workspace');

    const single = runCli([probeFile], ws.env);
    assert.equal(single.status, 1, 'fixture at a production path must fail single-file validation');
    assert.ok(single.codes.includes('KB002_FIXTURE_IN_PRODUCTION'), `got ${single.codes.join(',')}`);

    const dataset = runCli(['--dataset'], ws.env);
    assert.match(dataset.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
      'a misplaced fixture must not inflate QUALIFIED_GOLDEN_COUNT');
    assert.match(dataset.stderr, /SHORTFALL = 10/);
    // count is 0 here, so the contract's three-state table gives EMPTY.
    assert.match(dataset.stderr, /STATUS = EMPTY_GOLDEN_SET/);
  } finally {
    ws.cleanup();
  }
});

// CF1/CF2 positive proof: the valid fixture carries both edge types at once.
test('the positive fixture preserves supporting and refuting evidence together', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FILE), 'utf8'));
  const claim = doc.entities.find((e) => e.entity_type === 'HistoricalClaim');
  const supports = doc.relations.filter((r) => r.type === 'claim_supported_by' && r.source === claim.id);
  const refutes = doc.relations.filter((r) => r.type === 'claim_refuted_by' && r.source === claim.id);
  assert.ok(supports.length >= 1, 'positive fixture must keep at least one supporting edge');
  assert.ok(refutes.length >= 1, 'positive fixture must also keep a refuting edge (CF1)');
  assert.ok(Array.isArray(claim.counter_evidence_notes) && claim.counter_evidence_notes.length > 0,
    'CF2 requires counter_evidence_notes when a refutation edge exists');
  assert.equal(runCli([]).status, 0, 'the conflict-bearing positive fixture must still validate');
});

// rubric 3.2.0/3.2.1 -- deterministic level computation, including the class
// that the previous contract could not decide.
test('rubric 3.2.1 R1-R5 produces a definite level for every reachable input', async () => {
  const { computeClaimEvidence, buildIndex } = await import('../lib/rubric.mjs');

  const mkPassage = (id, opts = {}) => ({
    id, entity_type: 'SourcePassage', text_origin: opts.origin || 'verbatim_transcription',
    edition_resolution: opts.resolution || 'resolved',
  });
  const mkEdition = (id, grade) => ({
    id, entity_type: 'SourceEdition', notes: `SOURCE_GRADE=${grade}`,
  });
  const mkWork = (id) => ({ id, entity_type: 'SourceWork' });

  const scenario = (passages) => {
    // passages: [{passage, edition, work}]
    const entities = [];
    const relations = [];
    const claim = { id: 'claim_probe', entity_type: 'HistoricalClaim' };
    entities.push(claim);
    passages.forEach((entry, i) => {
      entities.push(entry.passage, entry.edition, entry.work);
      relations.push({ type: 'passage_in_edition', source: entry.passage.id, target: entry.edition.id });
      relations.push({ type: 'edition_of_work', source: entry.edition.id, target: entry.work.id });
      relations.push({ type: 'claim_supported_by', source: claim.id, target: entry.passage.id });
    });
    return computeClaimEvidence(buildIndex(entities, relations), claim.id);
  };

  // R1
  assert.equal(scenario([]).level, 'E0');
  assert.equal(scenario([]).rule, 'R1');

  // R2 -- supported but nothing resolved
  const r2 = scenario([{ passage: mkPassage('p1', { resolution: 'ambiguous' }), edition: mkEdition('e1', 'S'), work: mkWork('w1') }]);
  assert.equal(r2.level, 'E1');
  assert.equal(r2.rule, 'R2');

  // R3 -- two distinct S/A works, both direct
  const r3 = scenario([
    { passage: mkPassage('p1'), edition: mkEdition('e1', 'S'), work: mkWork('w1') },
    { passage: mkPassage('p2', { origin: 'normalized_transcription' }), edition: mkEdition('e2', 'A'), work: mkWork('w2') },
  ]);
  assert.equal(r3.level, 'E4');
  assert.equal(r3.rule, 'R3');

  // R4 -- single S/A work with direct evidence
  const r4 = scenario([{ passage: mkPassage('p1'), edition: mkEdition('e1', 'S'), work: mkWork('w1') }]);
  assert.equal(r4.level, 'E3');
  assert.equal(r4.rule, 'R4');

  // R4 with two passages from the SAME work must stay E3, not E4
  const sameWork = scenario([
    { passage: mkPassage('p1'), edition: mkEdition('e1', 'S'), work: mkWork('w1') },
    { passage: mkPassage('p2'), edition: mkEdition('e1b', 'S'), work: mkWork('w1') },
  ]);
  assert.equal(sameWork.level, 'E3', 'two passages of one work must not be read as multi-source corroboration');
  assert.equal(sameWork.N, 1);

  // R5 -- the class the old rubric could not decide: single resolved+direct, grade B
  const bOnly = scenario([{ passage: mkPassage('p1'), edition: mkEdition('e1', 'B'), work: mkWork('w1') }]);
  assert.equal(bOnly.level, 'E2', 'single B-grade direct evidence must converge to E2');
  assert.equal(bOnly.rule, 'R5');
  assert.equal(bOnly.D, 0, 'B is not authoritative, so D must be 0');

  // R5 -- single resolved+direct with grade C
  const cOnly = scenario([{ passage: mkPassage('p1'), edition: mkEdition('e1', 'C'), work: mkWork('w1') }]);
  assert.equal(cOnly.level, 'E2');
  assert.equal(cOnly.D, 0);

  // 3.2.0 pre-check: SOURCE_GRADE=X produces no level
  const xOnly = scenario([{ passage: mkPassage('p1'), edition: mkEdition('e1', 'X'), work: mkWork('w1') }]);
  assert.equal(xOnly.level, null);
  assert.equal(xOnly.precheck, 'KB002_AI_SOURCE_FORBIDDEN');

  // 3.2.0 pre-check: undeclared grade produces no level
  const undeclared = scenario([{ passage: mkPassage('p1'), edition: mkEdition('e1', 'S'), work: mkWork('w1') }]);
  undeclared.detail[0].edition.notes = '';
  const recomputed = computeClaimEvidence(
    buildIndex(
      [
        { id: 'claim_probe', entity_type: 'HistoricalClaim' },
        mkPassage('p1'), { id: 'e1', entity_type: 'SourceEdition', notes: '' }, mkWork('w1'),
      ],
      [
        { type: 'passage_in_edition', source: 'p1', target: 'e1' },
        { type: 'edition_of_work', source: 'e1', target: 'w1' },
        { type: 'claim_supported_by', source: 'claim_probe', target: 'p1' },
      ],
    ),
    'claim_probe',
  );
  assert.equal(recomputed.level, null);
  assert.equal(recomputed.precheck, 'KB002_GRADE_UNDECLARED');
  assert.ok(Number.isFinite(undeclared.N));
});

test('KB002_LEVEL_INDETERMINATE is unreachable for legal input (defensive only)', () => {
  const dir = path.join(REPO_ROOT, INVALID_DIR);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json'));
  for (const name of names) {
    const r = runCli([path.join(INVALID_DIR, name)]);
    const usesIndeterminate = r.codes.includes('KB002_LEVEL_INDETERMINATE');
    // Only inv_01 (a structurally broken closure) may surface it, and even that
    // is an internal-error path rather than a level-domain gap.
    if (usesIndeterminate) {
      assert.equal(name, 'inv_01_missing_source_work.kb.json',
        `${name} unexpectedly hit the defensive INDETERMINATE path`);
    }
  }
  const valid = runCli([]);
  assert.ok(!valid.codes.includes('KB002_LEVEL_INDETERMINATE'),
    'the valid fixture must never hit the defensive INDETERMINATE path');
});

// ---------------------------------------------------------------------------
// FIX_SPEC-KB002-4 additions
// ---------------------------------------------------------------------------

// (A/C) staging/ must be excluded from the production dataset set. Before this
// fix the dataset filter only excluded examples/, so a staged candidate was
// counted as production data and made --dataset fail outright.
test('FIX-KB002-4(A): a staged candidate is excluded from the production dataset', () => {
  // KB002-TOOL-FIX-03: this case previously wrote a candidate into the real
  // staging/ area AND copied it onto the real production root
  // (data/kb/golden/golden_001.kb.json) to prove promotion raises the count.
  // That is the highest-risk write in the suite: a crashed run would leave a
  // real production record behind. Both writes now happen inside a workspace
  // whose data/kb/golden IS the production root for the injected CLI, so the
  // promotion discriminator is preserved exactly.
  const ws = createWorkspace('kb002-4a-');
  try {
    const stagingDir = ws.resolve(STAGING_DIR);

    // Build a genuine candidate that honestly satisfies admission. It must come
    // from the production-like helper, NOT the structural fixture: since t24 the
    // structural fixture is synthetic and legitimately below E3, so it could never
    // be promoted. Using it here would assert the wrong thing.
    const candidateDoc = productionLikeFixture();
    const candidate = path.join(stagingDir, 'golden_001.kb.json');
    const production = ws.resolve('data/kb/golden/golden_001.kb.json');
    assert.ok(isInsideWorkspace(ws, candidate), 'candidate must be inside the workspace');
    assert.ok(isInsideWorkspace(ws, production), 'production target must be inside the workspace');
    fs.writeFileSync(candidate, JSON.stringify(candidateDoc, null, 2));

    const before = runCli(['--dataset'], ws.env);
    assert.match(before.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
      'baseline dataset must be empty');
    assert.equal(before.status, 0);

    // The candidate sits in staging/: the dataset must still report zero.
    assert.equal(runCli([candidate], ws.env).status, 0, 'the candidate itself must be valid');
    const withStaging = runCli(['--dataset'], ws.env);
    assert.equal(withStaging.status, 0,
      'a staged candidate must not make --dataset fail');
    assert.match(withStaging.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
      'a staged candidate must NOT count toward QUALIFIED_GOLDEN_COUNT');
    assert.match(withStaging.stderr, /SHORTFALL = 10/);
    // Production is still empty (the candidate is staged, not promoted), so the
    // contract's three-state table gives EMPTY -- not PARTIAL.
    assert.match(withStaging.stderr, /STATUS = EMPTY_GOLDEN_SET/);

    // Promotion is what makes it count. This is the discriminator that stops the
    // assertion from passing vacuously: if the filter were removed, the staging
    // copy alone would already raise the count and this equality would break.
    fs.copyFileSync(candidate, production);
    const promoted = runCli(['--dataset'], ws.env);
    assert.equal(promoted.status, 0);
    assert.match(promoted.stderr, /QUALIFIED_GOLDEN_COUNT = 1/,
      'the promoted file must be counted');

    // And the real dataset root is untouched by all of the above.
    const realProduction = path.join(realGoldenRoot(), 'data/kb/golden/golden_001.kb.json');
    assert.ok(!fs.existsSync(realProduction),
      'the real production root must never be written by this test');
  } finally {
    ws.cleanup();
  }
});

// (B/C) Rule E needs a real way to validate a staged artefact in place. The old
// `.kb.json.staging` suffix hid the file from collection entirely, so a staged
// candidate could never be validated at all.
test('FIX-KB002-4(B): a staged candidate can be validated in place', () => {
  // KB002-TOOL-FIX-03: the staged candidate now lives in an isolated workspace
  // instead of the real staging area.
  const ws = createWorkspace('kb002-4b-');
  try {
    const stagingDir = ws.resolve(STAGING_DIR);
    fs.mkdirSync(stagingDir, { recursive: true });
    const candidate = path.join(stagingDir, 'golden_009.kb.json');
    assert.ok(isInsideWorkspace(ws, candidate), 'the candidate must be inside the workspace');

    const doc = productionLikeFixture({ goldenId: 'GOLDEN-009' });
    fs.writeFileSync(candidate, JSON.stringify(doc, null, 2));

    const explicit = runCli([candidate], ws.env);
    assert.equal(explicit.status, 0, 'an explicit staging path must be validated');
    const viaFlag = runCli(['--staging', candidate], ws.env);
    assert.equal(viaFlag.status, 0, '--staging <file> must validate the candidate');
    // A broken candidate must fail: proves the flag is not a no-op.
    fs.writeFileSync(candidate, JSON.stringify({ entities: [], relations: [] }));
    const broken = runCli(['--staging', candidate], ws.env);
    assert.equal(broken.status, 1, '--staging must actually validate, not short-circuit');
  } finally {
    ws.cleanup();
  }

  // --dataset and --staging are different views; combining them is an error.
  assert.equal(runCli(['--dataset', '--staging']).status, 2,
    '--dataset and --staging must be mutually exclusive');
});

// (D proof) The intended-code mapping must be able to FAIL. Without this proof
// the per-fixture assertion could be vacuous (e.g. if INTENDED_CODE only listed
// codes that every fixture emits anyway, a lost rule would go unnoticed).
//
// t24 changed what "discriminating" can mean. Every fixture is now honestly
// synthetic, so they all share a baseline of below-threshold findings
// (KB002_GRADE_LEAD_ONLY, KB002_DISH_BELOW_E3). The intended code is therefore
// not defined by being unique across the corpus; it is defined by being a code
// the fixture emits *in addition to* that shared baseline, i.e. the specific
// rule the fixture was built to exercise.
test('FIX-KB002-4(D): the intended-code assertion actually detects a regression', () => {
  const dir = path.join(REPO_ROOT, INVALID_DIR);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json')).sort();
  assert.ok(names.length > 0);

  const codesByFixture = new Map();
  for (const name of names) {
    const want = INTENDED_CODE[name];
    assert.ok(want, `${name} has no intended-code mapping`);
    const r = runCli([path.join(INVALID_DIR, name)]);
    assert.equal(r.status, 1, `${name} must exit 1`);
    assert.ok(r.codes.includes(want), `${name} must emit ${want}, got ${r.codes.join(',')}`);
    codesByFixture.set(name, new Set(r.codes));
  }

  // Frequency across the corpus identifies what is shared.
  const frequency = new Map();
  for (const codes of codesByFixture.values()) {
    for (const c of codes) frequency.set(c, (frequency.get(c) || 0) + 1);
  }
  // The baseline is the set of codes that NO fixture claims as its intended code,
  // yet many fixtures emit. Those are the honest consequences of a synthetic
  // record (below E3, lead-only grade, level/status realignment). Codes that ARE
  // some fixture's intended code are excluded even when several fixtures share
  // them (inv_01 and inv_02 both legitimately test a dangling reference).
  const intendedCodes = new Set(Object.values(INTENDED_CODE));
  const baseline = [...frequency.entries()]
    .filter(([c, n]) => n > 1 && !intendedCodes.has(c))
    .map(([c]) => c);

  // A code is non-vacuous evidence for a fixture when it is either the fixture's
  // own intended code, or at least one code the fixture emits beyond the shared
  // baseline. What must not happen is a fixture whose ENTIRE output is baseline:
  // then a lost rule would be invisible, because it would still exit 1 anyway.
  const vacuous = [];
  for (const name of names) {
    const emitted = [...codesByFixture.get(name)];
    const distinctive = emitted.filter((c) => !baseline.includes(c));
    if (distinctive.length === 0) {
      vacuous.push(`${name} (only baseline codes: ${emitted.join(',')})`);
    }
  }
  assert.deepEqual(vacuous, [],
    `negative fixtures pinned only to shared baseline codes (a lost rule would be invisible): ${vacuous.join('; ')}`);

  // The baseline really is shared -- if this drops, the corpus changed shape and
  // the reasoning above must be revisited rather than silently kept.
  assert.ok(baseline.length > 0, 'expected a shared below-threshold baseline across the synthetic corpus');
  assert.ok(baseline.includes('KB002_DISH_BELOW_E3'),
    'every synthetic fixture is expected to be below E3; the baseline is missing');
});

// ---------------------------------------------------------------------------
// KB002-TOOL-ALIGN-01 -- active contract version must be DERIVED, never pinned
// ---------------------------------------------------------------------------
// The defect this guards: the validator hardcoded `kb-002.1.0` while the
// authoritative contract had advanced to `kb-002.1.2`, so the tool demanded
// stale metadata to satisfy Q7 -- the validator silently redefining the
// contract. Contract defines semantics; the validator executes it.

test('ALIGN-01: the active contract version is derived from the contract documents', () => {
  const active = getActiveContractVersion();

  // It must look like a KB-002 version and must not be the stale pin.
  assert.match(active, /^kb-002\.\d+\.\d+$/,
    `active contract version should be a kb-002.x.y string, got "${active}"`);

  // It must equal what the contract documents themselves declare -- read from
  // the documents at test time, never from a copied literal.
  for (const src of CONTRACT_VERSION_SOURCES) {
    const { version, reason } = readDeclaredVersion(src);
    if (version === null) continue; // a missing source is not a failure by itself
    assert.equal(version, active,
      `${src} declares "${version}" but the tool resolved "${active}" (${reason || 'ok'})`);
  }

  // Every declared source must actually be readable; the authority must exist.
  const declarations = CONTRACT_VERSION_SOURCES.map((s) => readDeclaredVersion(s));
  assert.ok(declarations.some((d) => d.version !== null),
    `no contract document yielded a version declaration: ${JSON.stringify(declarations)}`);
});

test('ALIGN-01: the version check is not a hardcoded literal (drift guard)', () => {
  // The resolved value must come from the documents. Prove it by reading the
  // module source and asserting no literal version is pinned there.
  const rulesSrc = fs.readFileSync(path.join(HERE, '..', 'lib', 'golden-rules.mjs'), 'utf8');
  const pinned = rulesSrc.match(/CONTRACT_VERSION\s*=\s*'kb-002\.\d+\.\d+'/);
  assert.equal(pinned, null,
    `golden-rules.mjs must not pin a contract version literal; found ${pinned && pinned[0]}`);

  // And the derivation module must not carry its own literal either.
  const verSrc = fs.readFileSync(path.join(HERE, '..', 'lib', 'contract-version.mjs'), 'utf8');
  const verPinned = verSrc.match(/=\s*'(kb-002\.\d+\.\d+)'/);
  assert.equal(verPinned, null,
    `contract-version.mjs must not hardcode a version; found ${verPinned && verPinned[0]}`);
});

test('ALIGN-01: a candidate declaring the ACTIVE version passes the Q7 version check', () => {
  const active = getActiveContractVersion();
  const ws = createWorkspace('kb002-align-a-');
  try {
    const dir = ws.resolve(STAGING_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const candidate = path.join(dir, 'golden_003.kb.json');

    const doc = productionLikeFixture({ goldenId: 'GOLDEN-003' });
    doc.metadata.contract_version = active; // the correct, current declaration
    fs.writeFileSync(candidate, JSON.stringify(doc, null, 2));
    assert.ok(isInsideWorkspace(ws, candidate), 'candidate must be inside the workspace');

    const r = runCli([candidate], ws.env);
    const versionFindings = r.codes.filter((c) => c === 'KB002_METADATA_INCOMPLETE');
    // The candidate may still carry unrelated findings, but the VERSION check
    // must not be among them.
    const out = r.stdout + r.stderr;
    assert.ok(!/contract_version must be/.test(out),
      `a candidate declaring the active version must pass the Q7 version check: ${out.slice(0, 300)}`);
    assert.equal(versionFindings.length, 0,
      'no metadata-incomplete finding may be raised for a correctly versioned candidate');
  } finally {
    ws.cleanup();
  }
});

test('ALIGN-01: a candidate declaring a STALE version deterministically fails the Q7 version check', () => {
  const active = getActiveContractVersion();
  const ws = createWorkspace('kb002-align-b-');
  try {
    const dir = ws.resolve(STAGING_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const candidate = path.join(dir, 'golden_004.kb.json');

    // Pick a version that is definitively not active.
    const stale = active === 'kb-002.1.0' ? 'kb-002.0.9' : 'kb-002.1.0';
    const doc = productionLikeFixture({ goldenId: 'GOLDEN-004' });
    doc.metadata.contract_version = stale;
    fs.writeFileSync(candidate, JSON.stringify(doc, null, 2));
    assert.ok(isInsideWorkspace(ws, candidate), 'candidate must be inside the workspace');

    const a = runCli([candidate], ws.env);
    const b = runCli([candidate], ws.env);

    assert.equal(a.status, 1, 'a stale contract_version must fail');
    assert.ok(a.stdout.includes('KB002_METADATA_INCOMPLETE'),
      `expected KB002_METADATA_INCOMPLETE, got ${a.codes.join(',')}`);
    // The message is emitted as JSONL, so quotes inside it are escaped. Assert
    // on the version strings themselves rather than on a quoted form.
    assert.ok(a.stdout.includes(active),
      'the finding must name the active version so the fix is unambiguous');
    assert.ok(a.stdout.includes(stale),
      'the finding must name the offending value');
    // And it must be the *version* finding, not some other metadata complaint.
    const versionFinding = a.stdout.split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l))
      .find((rec) => rec.code === 'KB002_METADATA_INCOMPLETE' && rec.fieldPath === 'metadata.contract_version');
    assert.ok(versionFinding, 'a metadata.contract_version finding must be present');

    // Deterministic: identical bytes and identical exit code across runs.
    assert.equal(b.status, a.status);
    assert.equal(b.stdout, a.stdout, 'the version failure must be deterministic');
  } finally {
    ws.cleanup();
  }
});

test('ALIGN-01: the version cache does not pin a value across contract reads', () => {
  // A memoised value is fine, but it must be the derived one. Reset and re-read
  // must agree, which is what makes the memo safe.
  resetActiveContractVersionCache();
  const again = getActiveContractVersion();
  const declared = readDeclaredVersion(CONTRACT_VERSION_SOURCES[0]).version;
  assert.equal(again, declared,
    'after a cache reset the resolved version must still equal the contract declaration');
});

// ---------------------------------------------------------------------------
// KB002-TOOL-ALIGN-02 -- the dataset status label must be DERIVED from the real
// qualified count, per the contract's three-state table (12- section 5).
// ---------------------------------------------------------------------------
// The defect this guards: the empty-set path hardcoded PARTIAL_GOLDEN_SET while
// 12- section 5.1 says count = 0 means EMPTY_GOLDEN_SET, and the other path
// still used the retired name GOLDEN_10_COMPLETE.

test('ALIGN-02: the three dataset states map from REAL counts per the contract table', async () => {
  const { deriveDatasetStatus, GOLDEN_SET_STATUS } = await import('../validate-golden.mjs');

  // (a) count = 0 -> EMPTY_GOLDEN_SET  (12- section 5.1: "0 道合格 ⟹ EMPTY")
  assert.equal(deriveDatasetStatus(0).status, GOLDEN_SET_STATUS.EMPTY);
  assert.equal(deriveDatasetStatus(0).shortfall, 10);

  // (b) 0 < count < target -> PARTIAL_GOLDEN_SET, shortfall = 10 - count
  for (const c of [1, 4, 9]) {
    const d = deriveDatasetStatus(c);
    assert.equal(d.status, GOLDEN_SET_STATUS.PARTIAL, `count=${c} must be PARTIAL`);
    assert.equal(d.shortfall, 10 - c, `count=${c} shortfall must be ${10 - c}`);
  }

  // (c) count = target -> COMPLETE_GOLDEN_SET, shortfall 0
  assert.equal(deriveDatasetStatus(10).status, GOLDEN_SET_STATUS.COMPLETE);
  assert.equal(deriveDatasetStatus(10).shortfall, 0);
});

test('ALIGN-02: the status label is derived, not a constant', async () => {
  const { deriveDatasetStatus } = await import('../validate-golden.mjs');
  // Three different counts must yield three different labels. If the label were a
  // literal (which is exactly what the defect was), this set would collapse to 1.
  const labels = new Set([0, 5, 10].map((n) => deriveDatasetStatus(n).status));
  assert.equal(labels.size, 3,
    `status must vary with the count; got ${JSON.stringify([...labels])}`);
  assert.ok(labels.has('EMPTY_GOLDEN_SET'));
  assert.ok(labels.has('PARTIAL_GOLDEN_SET'));
  assert.ok(labels.has('COMPLETE_GOLDEN_SET'));
});

test('ALIGN-02: a retired status name is never produced', async () => {
  const { deriveDatasetStatus, GOLDEN_SET_STATUS } = await import('../validate-golden.mjs');
  for (const s of [0, 1, 10].map((n) => deriveDatasetStatus(n).status)) {
    assert.notEqual(s, 'GOLDEN_10_COMPLETE',
      'the retired name must not be produced; kb-002.1.2 renamed it COMPLETE_GOLDEN_SET');
  }
  assert.equal(GOLDEN_SET_STATUS.COMPLETE, 'COMPLETE_GOLDEN_SET');
});

test('ALIGN-02: an invalid count throws instead of silently labelling', async () => {
  const { deriveDatasetStatus } = await import('../validate-golden.mjs');
  for (const bad of [-1, NaN, undefined, 'x']) {
    assert.throws(() => deriveDatasetStatus(bad),
      `count ${String(bad)} must be rejected rather than given a label`);
  }
});

test('ALIGN-02: the empty production set reports EMPTY_GOLDEN_SET with unchanged counts', () => {
  const r = runCli(['--dataset']);
  assert.equal(r.status, 0, r.stderr);
  // Counts must be exactly as before the label fix -- only STATUS changes.
  assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = 0/);
  assert.match(r.stderr, /SHORTFALL = 10/);
  assert.match(r.stderr, /KNOWN_DATA_GAP = 10/);
  assert.match(r.stderr, /STATUS = EMPTY_GOLDEN_SET/);
  assert.ok(!/STATUS = PARTIAL_GOLDEN_SET/.test(r.stderr),
    'an empty production set must not be reported as PARTIAL');
  assert.ok(!/GOLDEN_10_COMPLETE/.test(r.stderr),
    'the retired status name must not appear in output');
});

test('ALIGN-02: every status the tool prints comes from the one mapping', () => {
  const src = fs.readFileSync(path.join(HERE, '..', 'validate-golden.mjs'), 'utf8');
  // No call site may write a literal status string into the report.
  const hardcoded = src.match(/STATUS = ['"]?(?:EMPTY|PARTIAL|COMPLETE)_GOLDEN_SET/g);
  assert.equal(hardcoded, null,
    `the status label must not be hardcoded at a call site; found ${hardcoded && hardcoded[0]}`);
  // The retired name may only survive as the guard set + its explanatory comment.
  const retired = [...src.matchAll(/GOLDEN_10_COMPLETE/g)];
  assert.ok(retired.length <= 2,
    `GOLDEN_10_COMPLETE should only remain as the retired-name guard/comment; found ${retired.length}`);
});

// ---------------------------------------------------------------------------
// KB002-TOOL-FIX-04 -- manifest schema must FAIL CLOSED
// ---------------------------------------------------------------------------
// The defect this guards: checkStagingIntegrity read
//   `Array.isArray(manifest.assets) ? manifest.assets : []`
// so ANY malformed manifest silently became an empty asset set -> zero findings
// -> `--integrity` exit 0. A manifest written with the wrong field name disabled
// the INCIDENT-E protection without a word.

const CANDIDATE_REL = 'data/kb/golden/staging/golden_001.kb.json';

/** Build a workspace holding `manifestRaw` (a string) plus an optional candidate. */
function manifestWorkspace(prefix, manifestRaw, { withCandidate = false } = {}) {
  const ws = createWorkspace(prefix);
  if (withCandidate) {
    ws.write(CANDIDATE_REL, productionLikeFixture());
  }
  fs.mkdirSync(ws.resolve('data/kb/golden/staging'), { recursive: true });
  fs.writeFileSync(ws.resolve(MANIFEST_REL_PATH), manifestRaw, 'utf8');
  return ws;
}

/**
 * Run `fn` with the dataset root pointed at `ws` FOR THE CURRENT PROCESS.
 *
 * buildManifestEntry / writeManifest / checkStagingIntegrity resolve paths when
 * they are *called*, so they need the env var visible in-process -- passing an
 * env to runCli only covers spawned children. Restores the previous value even
 * if `fn` throws.
 */
function inWorkspace(ws, fn) {
  const previous = process.env.KB002_GOLDEN_ROOT;
  process.env.KB002_GOLDEN_ROOT = ws.root;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.KB002_GOLDEN_ROOT;
    else process.env.KB002_GOLDEN_ROOT = previous;
  }
}

/** Run --integrity inside a workspace and report exit code + emitted codes. */
function integrityOf(ws) {
  const r = runCli(['--integrity'], ws.env);
  return { status: r.status, codes: r.codes, stdout: r.stdout, stderr: r.stderr };
}

// VALID-1: {"assets": []} is a legal empty manifest and must PASS.
test('FIX-04 VALID-1: a correctly shaped empty manifest passes', () => {
  const ws = manifestWorkspace('kb002-f04-valid1-', JSON.stringify({
    manifest_version: 1, lifecycle_class: 'staging', note: 'empty', assets: [],
  }));
  try {
    const r = integrityOf(ws);
    assert.equal(r.status, 0, `a legal empty manifest must pass: ${r.codes.join(',')}`);
    assert.match(r.stderr, /STAGING_MANIFEST_ASSET_COUNT = 0/);
    assert.ok(!r.codes.includes(MANIFEST_SCHEMA_INVALID));
  } finally { ws.cleanup(); }
});

// VALID-2: a real staging asset entry must PASS.
test('FIX-04 VALID-2: a well-formed manifest with one real asset passes', () => {
  const ws = createWorkspace('kb002-f04-valid2-');
  try {
    ws.write(CANDIDATE_REL, productionLikeFixture());
    // buildManifestEntry/writeManifest are in-process helpers, so they need the
    // dataset root pointed at the workspace while they run.
    inWorkspace(ws, () => {
      const entry = buildManifestEntry(CANDIDATE_REL, { sourceTask: 'fix04', generatedAt: '2026-10-10T00:00:00Z' });
      assert.equal(entry.status, 'present');
      assert.ok(entry.sha256, 'the entry must carry a hash for an existing asset');
      writeManifest([entry]);
    });

    const r = integrityOf(ws);
    assert.equal(r.status, 0, `a valid manifest must pass: ${r.codes.join(',')}`);
    assert.match(r.stderr, /STAGING_MANIFEST_ASSET_COUNT = 1/);
  } finally { ws.cleanup(); }
});

// INVALID-1: wrong field name. This is the exact control experiment from the
// directive: before the fix it exited 0 (silent), now it must fail.
test('FIX-04 INVALID-1: a manifest using "entries" instead of "assets" fails closed', () => {
  const ws = manifestWorkspace('kb002-f04-invalid1-', JSON.stringify({ version: 1, entries: [] }));
  try {
    const r = integrityOf(ws);
    assert.equal(r.status, 1, 'a wrong-field-name manifest must not pass silently');
    assert.ok(r.codes.includes(MANIFEST_SCHEMA_INVALID), `expected ${MANIFEST_SCHEMA_INVALID}, got ${r.codes.join(',')}`);
  } finally { ws.cleanup(); }
});

// INVALID-2: assets key absent entirely.
test('FIX-04 INVALID-2: a manifest missing "assets" fails closed', () => {
  const ws = manifestWorkspace('kb002-f04-invalid2-', JSON.stringify({ manifest_version: 1, note: 'no assets key' }));
  try {
    const r = integrityOf(ws);
    assert.equal(r.status, 1, 'a missing assets key must not be treated as empty');
    assert.ok(r.codes.includes(MANIFEST_SCHEMA_INVALID));
  } finally { ws.cleanup(); }
});

// INVALID-3/4: assets present but the wrong type.
test('FIX-04 INVALID-3/4: a non-array "assets" fails closed', () => {
  for (const [label, value] of [['object', {}], ['null', null], ['string', 'x']]) {
    const ws = manifestWorkspace(`kb002-f04-invalid34-${label}-`, JSON.stringify({ manifest_version: 1, assets: value }));
    try {
      const r = integrityOf(ws);
      assert.equal(r.status, 1, `assets as ${label} must fail closed`);
      assert.ok(r.codes.includes(MANIFEST_SCHEMA_INVALID), `assets as ${label}: got ${r.codes.join(',')}`);
    } finally { ws.cleanup(); }
  }
});

// INVALID: manifest root is not an object at all.
test('FIX-04 INVALID-ROOT: a non-object manifest root fails closed', () => {
  for (const [label, raw] of [['array', '[]'], ['string', '"x"'], ['number', '7'], ['invalid JSON', '{not json']]) {
    const ws = manifestWorkspace(`kb002-f04-root-${label.replace(/\s/g, '-')}-`, raw);
    try {
      const r = integrityOf(ws);
      assert.equal(r.status, 1, `a ${label} manifest root must fail closed`);
      assert.ok(r.codes.includes(MANIFEST_SCHEMA_INVALID), `${label}: got ${r.codes.join(',')}`);
    } finally { ws.cleanup(); }
  }
});

// INVALID-5: an entry inside assets is malformed.
test('FIX-04 INVALID-5: a malformed asset entry fails closed', () => {
  for (const [label, entry] of [
    ['missing relative_path', { asset_logical_id: 'a', status: 'present' }],
    ['relative_path not a string', { asset_logical_id: 'a', relative_path: 7, status: 'present' }],
    ['empty relative_path', { asset_logical_id: 'a', relative_path: '', status: 'present' }],
    ['entry not an object', 'not-an-object'],
    ['entry null', null],
    ['missing status', { asset_logical_id: 'a', relative_path: CANDIDATE_REL }],
  ]) {
    const ws = manifestWorkspace(`kb002-f04-inv5-${label.replace(/[^a-z0-9]+/gi, '-')}-`, JSON.stringify({ manifest_version: 1, assets: [entry] }));
    try {
      const r = integrityOf(ws);
      assert.equal(r.status, 1, `entry with ${label} must fail closed`);
      assert.ok(r.codes.includes(MANIFEST_SCHEMA_INVALID), `${label}: got ${r.codes.join(',')}`);
    } finally { ws.cleanup(); }
  }
});

// INCIDENT-E (§12): a WELL-FORMED manifest referencing a MISSING file must still
// raise STAGING_ASSET_MISSING. Fixing the schema must not blunt this protection.
test('FIX-04 INCIDENT-E: a valid manifest referencing a missing asset still reports STAGING_ASSET_MISSING', () => {
  const ws = createWorkspace('kb002-f04-incident-e-');
  try {
    // Build a valid entry for a file that DOES exist, then remove the file
    // behind the manifest's back -- exactly the INCIDENT-E shape.
    const asset = ws.resolve(CANDIDATE_REL);
    ws.write(CANDIDATE_REL, productionLikeFixture());
    inWorkspace(ws, () => {
      const entry = buildManifestEntry(CANDIDATE_REL, { sourceTask: 'fix04-e', generatedAt: '2026-10-10T00:00:00Z' });
      assert.equal(entry.status, 'present');
      writeManifest([entry]);
    });

    // Schema is valid, so this must be a STAGING_ASSET_MISSING finding, not a
    // schema finding.
    const before = inWorkspace(ws, () => checkStagingIntegrity());
    assert.equal(before.schemaOk, true, 'the manifest under test must be schema-valid');

    fs.rmSync(asset, { force: true });
    const after = inWorkspace(ws, () => checkStagingIntegrity());
    const codes = after.findings.map((f) => f.code);
    assert.ok(codes.includes('STAGING_ASSET_MISSING'),
      `a schema-valid manifest pointing at a deleted asset must report STAGING_ASSET_MISSING, got ${codes.join(',')}`);
    assert.ok(!codes.includes(MANIFEST_SCHEMA_INVALID),
      'INCIDENT-E must not be misreported as a schema problem');

    const r = integrityOf(ws);
    assert.equal(r.status, 1, '--integrity must fail while a declared asset is missing');
    assert.ok(r.codes.includes('STAGING_ASSET_MISSING'));
  } finally { ws.cleanup(); }
});

// Guard: the schema validator itself must not accept the wrong shapes. This is
// the unit-level mirror of the CLI assertions above and fails red if the old
// "coerce to []" behaviour returns.
test('FIX-04: validateManifestSchema rejects the malformed shapes and accepts the valid ones', () => {
  assert.equal(validateManifestSchema({ manifest_version: 1, assets: [] }).ok, true);
  assert.equal(validateManifestSchema({ manifest_version: 1, entries: [] }).ok, false);
  assert.equal(validateManifestSchema({ manifest_version: 1 }).ok, false);
  assert.equal(validateManifestSchema({ manifest_version: 1, assets: {} }).ok, false);
  assert.equal(validateManifestSchema({ manifest_version: 1, assets: null }).ok, false);
  assert.equal(validateManifestSchema([]).ok, false);
  assert.equal(validateManifestSchema('x').ok, false);
  assert.equal(validateManifestSchema(null).ok, false);
  assert.equal(validateManifestSchema(undefined).ok, false);
  // A malformed entry makes the whole manifest invalid, not silently skipped.
  assert.equal(validateManifestSchema({ manifest_version: 1, assets: [{}] }).ok, false);
  assert.equal(
    validateManifestSchema({ manifest_version: 1, assets: [{ asset_logical_id: 'a', relative_path: 'p', status: 'present' }] }).ok,
    true,
  );
});
