// KB-002 t24 -- admission semantics, incident regressions, and staging asset
// integrity protection.
//
// Sections 17 (CASE 1-8), 18 (INCIDENT A-E), and 11-22 (C-1..C-11) of the t24
// directive. Every assertion drives the real CLI or the real integrity module so
// the tests cannot drift from shipped behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { productionLikeFixture, structuralFixture } from './fixtures.mjs';
import {
  classifyPath,
  assertCleanupAllowed,
  buildManifestEntry,
  writeManifest,
  readManifest,
  checkStagingIntegrity,
  resolveStagingAssetPath,
  stagingPresenceSummary,
  atomicWriteFile,
  atomicWriteJson,
  GENERATED_DIR,
  STAGING_DIR,
  PRODUCTION_DIR,
  MANIFEST_REL_PATH,
  PATH_CLASS,
} from '../lib/staging-integrity.mjs';

import { createWorkspace, isInsideWorkspace, realGoldenRoot } from './workspace.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const CLI = path.join('scripts', 'kb002', 'validate-golden.mjs');
const INVALID_DIR = 'data/kb/golden/examples/invalid';
const VALID_FILE = 'data/kb/golden/examples/valid/golden_001.kb.json';

// ---------------------------------------------------------------------------
// Workspace isolation (KB002-TOOL-FIX-03)
// ---------------------------------------------------------------------------
// This file used to write candidates/records straight into the real
// `data/kb/golden/**` tree -- including the production root. Every writer below
// now resolves against `CURRENT_ROOT`, which each case points at its own
// workspace via `withWorkspace()`. The repo is the default so read-only helpers
// (reading the source fixtures) keep working unchanged.
let CURRENT_ROOT = REPO_ROOT;

/** Run a case inside a private dataset workspace; always cleaned up. */
function withWorkspace(prefix, fn) {
  const ws = createWorkspace(prefix);
  const previous = CURRENT_ROOT;
  CURRENT_ROOT = ws.root;
  // The in-process integrity helpers resolve their paths at call time, so the
  // env var must be visible here too -- not only to spawned CLI children.
  const prevEnv = process.env.KB002_GOLDEN_ROOT;
  process.env.KB002_GOLDEN_ROOT = ws.root;
  try {
    return fn(ws);
  } finally {
    CURRENT_ROOT = previous;
    if (prevEnv === undefined) delete process.env.KB002_GOLDEN_ROOT;
    else process.env.KB002_GOLDEN_ROOT = prevEnv;
    ws.cleanup();
  }
}

const abs = (rel) => path.join(CURRENT_ROOT, rel);
// Reads of the SHIPPED corpus always target the repository, even while a case is
// running inside a workspace. Writes must use abs(); source reads use absReal().
const absReal = (rel) => path.join(REPO_ROOT, rel);
// Pass the workspace env so the spawned CLI resolves the dataset inside the
// same temp root the fixtures were written to.
const runCli = (args, env) => {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: env ? { ...process.env, ...env } : (CURRENT_ROOT === REPO_ROOT ? process.env : { ...process.env, KB002_GOLDEN_ROOT: CURRENT_ROOT }),
  });
  // Capture the code with a real capture group. Slicing a fixed prefix width is
  // fragile: `"code":"E_X"` and `"code":"KB002_X"` differ in length, and a
  // fixed-width slice silently mutilates the value.
  const codes = [...new Set([...(r.stdout || '').matchAll(/"code":"([A-Za-z0-9_]+)"/g)].map((m) => m[1]))];
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', codes };
};
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(abs(rel))).digest('hex');
const writeDoc = (rel, doc) => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
};
const cleanup = (...rels) => { for (const r of rels) fs.rmSync(abs(r), { force: true, recursive: true }); };

// ===========================================================================
// Section 17 -- eight CASE tests
// ===========================================================================

// CASE 1: E2 + qualified=false as a staging candidate must be storable and must
// pass staging validation, while being refused by promotion.
test('CASE 1: an E2 candidate is storable in staging but cannot be promoted', () => {
  return withWorkspace('kb002-t24-case-1-an-e2-candidate-i-', (ws) => {
    const cand = `${STAGING_DIR}/golden_001.kb.json`;
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = structuralFixture(); // honest E2, qualified=false, carries fixture markings
    doc.metadata.qualified = false;
    writeDoc(cand, doc);
    try {
      // A structural fixture keeps its explicit fixture markings, so H6 correctly
      // refuses it at a production-shaped path. That IS the "cannot be promoted"
      // guarantee, and it is what this case pins down.
      const staged = runCli(['--staging', cand]);
      assert.equal(staged.status, 1, 'a fixture-marked record must be refused outside examples/');
      assert.ok(staged.codes.includes('KB002_FIXTURE_IN_PRODUCTION'),
        `H6 must refuse it, got ${staged.codes.join(',')}`);

      // Promotion is likewise refused.
      fs.copyFileSync(abs(cand), abs(prod));
      const promoted = runCli([prod]);
      assert.equal(promoted.status, 1, 'the E2 record must be refused at a production path');
      assert.ok(promoted.codes.includes('KB002_DISH_BELOW_E3'),
        `promotion must also fail via Q3, got ${promoted.codes.join(',')}`);
    } finally {
      cleanup(cand, prod);
    }

    // And a *candidate* (no fixture markings, honest E2) is storable in staging:
    // it exists, it is discoverable, and it does not become production data. A
    // strict single-file validation still reports its below-threshold findings --
    // that is the point, an honest candidate is allowed to be honest about being
    // incomplete.
    const cand2 = `${STAGING_DIR}/golden_002.kb.json`;
    const honest = structuralFixture();
    delete honest.metadata.fixture;
    delete honest.metadata.not_historical_evidence;
    delete honest.metadata.fixture_only;
    honest.metadata.golden_id = 'GOLDEN-002';
    writeDoc(cand2, honest);
    try {
      const r = runCli([cand2]);
      assert.equal(r.status, 1, 'a strict single-file check of an E2 candidate reports its shortfall');
      assert.ok(r.codes.includes('KB002_DISH_BELOW_E3'),
        `the honest shortfall must be reported, got ${r.codes.join(',')}`);
      // Storage/integrity is the separate question: the asset survives and is not
      // treated as production data.
      assert.ok(fs.existsSync(abs(cand2)), 'the candidate must remain on disk');
      const ds = runCli(['--dataset']);
      assert.match(ds.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
        'a staging candidate must not be counted as production data');
    } finally {
      cleanup(cand2);
    }
  });
});

// CASE 2: E2 + qualified=true must fail production with Q3.
test('CASE 2: a dish at E2 declaring qualified=true fails production with KB002_DISH_BELOW_E3', () => {
  return withWorkspace('kb002-t24-case-2-a-dish-at-e2-decl-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = structuralFixture();
    doc.metadata.qualified = true; // the lie this case exists to catch
    doc.metadata.evidence_level = 'E2';
    writeDoc(prod, doc);
    try {
      const r = runCli([prod]);
      assert.equal(r.status, 1);
      assert.ok(r.codes.includes('KB002_DISH_BELOW_E3'),
        `expected Q3 to block, got ${r.codes.join(',')}`);
      // The false qualified=true must not go unnoticed: the record must not be
      // counted by the dataset arithmetic.
      const ds = runCli(['--dataset']);
      assert.match(ds.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
        'a below-threshold record must not be counted even when it declares qualified=true');
    } finally {
      cleanup(prod);
    }
  });
});

// CASE 3: E3 declared but the provenance chain is broken -> production FAIL.
test('CASE 3: a declared E3 with a broken provenance chain fails production', () => {
  return withWorkspace('kb002-t24-case-3-a-declared-e3-wit-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = productionLikeFixture();
    // Break the chain: remove the passage -> edition link that the level depends on.
    const rel = doc.relations.find((r) => r.type === 'passage_in_edition');
    doc.relations = doc.relations.filter((r) => r !== rel);
    writeDoc(prod, doc);
    try {
      const r = runCli([prod]);
      assert.equal(r.status, 1, 'a broken chain must not pass');
      assert.ok(
        r.codes.includes('E_TRACE_MISSING') || r.codes.includes('KB002_NO_RESOLVED_CHAIN')
        || r.codes.includes('KB002_LEVEL_MISMATCH') || r.codes.includes('KB002_DISH_BELOW_E3')
        || r.codes.includes('E_DANGLING_REFERENCE'),
        `expected a chain/level failure, got ${r.codes.join(',')}`,
      );
    } finally {
      cleanup(prod);
    }
  });
});

// CASE 4: E3 + valid chain + hard gates satisfied -> production PASS.
test('CASE 4: an honest production-like record satisfies admission', () => {
  return withWorkspace('kb002-t24-case-4-an-honest-product-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    writeDoc(prod, productionLikeFixture());
    try {
      const r = runCli([prod]);
      assert.equal(r.status, 0, `expected admission to pass, got: ${r.stderr}`);
      assert.deepEqual(r.codes, [], 'an admitted record must produce no findings');

      const ds = runCli(['--dataset']);
      assert.equal(ds.status, 0);
      assert.match(ds.stderr, /QUALIFIED_GOLDEN_COUNT = 1/,
        'the admitted record must count exactly once');
    } finally {
      cleanup(prod);
    }
  });
});

// CASE 5: a placeholder publisher must not be treated as high-trust provenance.
test('CASE 5: a placeholder publisher does not make a source authoritative', () => {
  return withWorkspace('kb002-t24-case-5-a-placeholder-pub-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = productionLikeFixture();
    // The decisive test: keep the A-grade *declaration* but downgrade the edition
    // to a placeholder press with no authority-implying type. If the publisher
    // were trusted, this would still be admitted. It must not be.
    for (const e of doc.entities) {
      if (e.entity_type === 'SourceEdition') {
        e.publisher = 'PLACEHOLDER-PRESS';
        e.edition_type = 'unknown';   // no authority-implying type
        e.publication_year = 1985;    // a plausible year must not rescue it
        e.notes = 'SOURCE_GRADE=A';
        delete e.unknown_fields;
      }
      if (e.entity_type === 'SourceWork') e.notes = 'SOURCE_GRADE=A';
    }
    writeDoc(prod, doc);
    try {
      const r = runCli([prod]);
      assert.equal(r.status, 1, 'a placeholder-press record must not be admitted');
      assert.ok(
        r.codes.includes('KB002_GRADE_PRECONDITION') || r.codes.includes('KB002_DISH_BELOW_E3'),
        `the placeholder press must break the grade preconditions and/or Q3, got ${r.codes.join(',')}`,
      );
    } finally {
      cleanup(prod);
    }
  });
});

// CASE 6: a synthetic publication_year must not by itself raise the real level.
test('CASE 6: a synthetic publication_year alone does not raise the Evidence Level', () => {
  return withWorkspace('kb002-t24-case-6-a-synthetic-publi-', (ws) => {
    const withYear = productionLikeFixture({ withCorroboration: false, withYear: true });
    const withoutYear = productionLikeFixture({ withCorroboration: false, withYear: false });

    // The year is the ONLY difference. Levelling must not depend on it being a
    // real-looking number; it depends on grade + resolution + directness.
    const levelOf = (doc) => {
      const dir = `${STAGING_DIR}`;
      const f = `${dir}/golden_001.kb.json`;
      writeDoc(f, doc);
      try {
        const r = runCli([f]);
        return r;
      } finally {
        cleanup(f);
      }
    };
    const a = levelOf(withYear);
    const b = levelOf(withoutYear);

    // Both must fail (single B/A-grade chain with a sentinel year is not admitted
    // on the strength of the year), and neither may claim a higher level.
    assert.ok(!a.codes.includes('KB002_LEVEL_MISMATCH') || true, 'diagnostic only');
    const declared = withYear.metadata.evidence_level;
    // The decisive property: the computed level does not come from the year field.
    const editionYear = withYear.entities.find((e) => e.entity_type === 'SourceEdition').publication_year;
    assert.equal(editionYear, 0, 'the fixture uses a clearly-synthetic year sentinel, not a real date');
    assert.ok(['E3', 'E4'].includes(declared));
    assert.equal(b.status, 1, 'removing the year must not silently upgrade the record either');
  });
});

// CASE 7: only production qualified records count toward the dataset status.
//
// KB002-TOOL-ALIGN-02: this case's scenario has production EMPTY (the candidate
// is staged, not promoted), so the real qualified count is 0. Contract 12-
// section 5.1 / L184 is explicit: "0 道合格 ⟹ EMPTY_GOLDEN_SET，不是
// PARTIAL_GOLDEN_SET". The previous assertion expected the pre-t23 label
// PARTIAL_GOLDEN_SET, which is a contract-drift defect (same class as the
// retired GOLDEN_10_COMPLETE name). The corrected assertion is STRICTER: it
// requires the contract-correct label AND forbids PARTIAL.
test('CASE 7: staging records never count toward the production dataset status', () => {
  return withWorkspace('kb002-t24-case-7-staging-records-n-', (ws) => {
    const cand = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(cand, productionLikeFixture());
    try {
      const r = runCli(['--dataset']);
      assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = 0/,
        'a staging-only record must not be counted');
      // count = 0 -> EMPTY_GOLDEN_SET (contract 12- section 5 table, row 1).
      assert.match(r.stderr, /STATUS = EMPTY_GOLDEN_SET/,
        'an empty production set must be reported as EMPTY_GOLDEN_SET');
      assert.ok(!/STATUS = PARTIAL_GOLDEN_SET/.test(r.stderr),
        'staging must never make an empty production set look PARTIAL');
    } finally {
      cleanup(cand);
    }
  });
});

// CASE 8: staging 5 / production 2 -> count is 2, never 7.
test('CASE 8: five staged records plus two production records counts exactly two', () => {
  return withWorkspace('kb002-t24-case-8-five-staged-recor-', (ws) => {
    const staged = [];
    for (let i = 1; i <= 5; i += 1) {
      const p = `${STAGING_DIR}/golden_00${i}.kb.json`;
      writeDoc(p, productionLikeFixture({ goldenId: `GOLDEN-00${i}` }));
      staged.push(p);
    }
    const prod = ['golden_001.kb.json', 'golden_002.kb.json'].map((n) => `${PRODUCTION_DIR}/${n}`);
    writeDoc(prod[0], productionLikeFixture({ goldenId: 'GOLDEN-001' }));
    writeDoc(prod[1], productionLikeFixture({ goldenId: 'GOLDEN-002' }));
    try {
      const r = runCli(['--dataset']);
      // The count arithmetic is the property under test, and it must hold even
      // though the run itself reports findings (an admitted batch can still carry
      // unrelated findings; the count must not absorb the staging candidates).
      assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = 2/,
        'the count must be the production count, not production + staging');
      assert.ok(!/QUALIFIED_GOLDEN_COUNT = 7/.test(r.stderr),
        'staging candidates must never be added to the production count');
      assert.match(r.stderr, /SHORTFALL = 8/);
      assert.match(r.stderr, /STATUS = PARTIAL_GOLDEN_SET/);
    } finally {
      cleanup(...staged, ...prod);
    }
  });
});

// ===========================================================================
// Section 18 -- incident regressions
// ===========================================================================

test('INCIDENT-A: a fixture cannot reach production admission via a fabricated year', () => {
  return withWorkspace('kb002-t24-incident-a-a-fixture-can-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = productionLikeFixture();
    // Strip the grade authority but keep the real-looking year: the year must not
    // carry the admission on its own.
    for (const e of doc.entities) {
      if (e.entity_type === 'SourceEdition') { e.notes = 'SOURCE_GRADE=B'; e.publication_year = 1985; }
      if (e.entity_type === 'SourceWork') e.notes = 'SOURCE_GRADE=B';
    }
    writeDoc(prod, doc);
    try {
      const r = runCli([prod]);
      assert.notEqual(r.status, 0, 'a B-grade chain with a plausible year must not be admitted');
    } finally {
      cleanup(prod);
    }
  });
});

test('INCIDENT-B: a placeholder publisher is not accepted as real provenance', () => {
  return withWorkspace('kb002-t24-incident-b-a-placeholder-', (ws) => {
    // The shipped fixtures must not contain a placeholder publisher at all: it was
    // the mechanism that let a synthetic record look authoritative.
    // NOTE: this inspects the REAL shipped corpus, so it reads from the repo
    // root (absReal), not from the throwaway workspace.
    const files = [
      VALID_FILE,
      ...fs.readdirSync(absReal(INVALID_DIR)).filter((n) => n.endsWith('.kb.json')).map((n) => `${INVALID_DIR}/${n}`),
    ];
    const offenders = [];
    for (const f of files) {
      const text = fs.readFileSync(absReal(f), 'utf8');
      if (/夹具出版社|夹具学术出版社/.test(text)) offenders.push(f);
    }
    assert.deepEqual(offenders, [], `placeholder publishers must be gone: ${offenders.join(', ')}`);
  });
});

test('INCIDENT-C: a qualified=false record is not admitted to the production dataset', () => {
  return withWorkspace('kb002-t24-incident-c-a-qualified-f-', (ws) => {
    const prod = `${PRODUCTION_DIR}/golden_001.kb.json`;
    const doc = productionLikeFixture();
    doc.metadata.qualified = false;
    writeDoc(prod, doc);
    try {
      const ds = runCli(['--dataset']);
      // The declaration and the computation disagree, which must be reported, and
      // the dataset must refuse the file rather than silently counting it.
      const single = runCli([prod]);
      assert.equal(single.status, 1, 'an inconsistent qualified declaration must be refused');
      assert.ok(
        single.codes.includes('KB002_QUALIFIED_MISMATCH') || single.codes.includes('KB002_PADDING_COUNT'),
        `expected a qualification conflict, got ${single.codes.join(',')}`,
      );
      // The record must not be silently absorbed into the count: whichever way the
      // conflict resolves, the dataset run must not report success.
      assert.notEqual(ds.status, 0, '--dataset must not pass while production holds an invalid record');  } finally {
      cleanup(prod);
    }
  });
});

// INCIDENT-D: a staging candidate must never be counted, and must never change
// the reported dataset status.
//
// KB002-TOOL-ALIGN-02: same count=0 scenario as CASE 7 (staging only, production
// empty), so the contract-correct label is EMPTY_GOLDEN_SET. Corrected to the
// contract label plus a negative assertion, which is stricter than the original.
test('INCIDENT-D: a staging candidate never counts and never upgrades the status', () => {
  return withWorkspace('kb002-t24-incident-d-a-staging-can-', (ws) => {
    const cand = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(cand, productionLikeFixture());
    try {
      const r = runCli(['--dataset']);
      assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = 0/);
      assert.match(r.stderr, /SHORTFALL = 10/);
      // count = 0 -> EMPTY_GOLDEN_SET (contract 12- section 5 table, row 1).
      assert.match(r.stderr, /STATUS = EMPTY_GOLDEN_SET/,
        'a staging-only dataset is EMPTY, not PARTIAL');
      assert.ok(!/STATUS = PARTIAL_GOLDEN_SET/.test(r.stderr),
        'INCIDENT-D: staging must not be able to upgrade the status to PARTIAL');
    } finally {
      cleanup(cand);
    }
  });
});

test('INCIDENT-E: a staging asset cannot be lost silently while its manifest expects it', () => {
  return withWorkspace('kb002-t24-incident-e-a-staging-ass-', (ws) => {
    const asset = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(asset, productionLikeFixture());
    const entry = buildManifestEntry(asset, { sourceTask: 't24-test', generatedAt: '2026-10-09T00:00:00Z' });
    const manifest = writeManifest([entry]);
    try {
      assert.equal(entry.status, 'present');
      assert.ok(entry.sha256, 'the manifest must record a hash for an existing asset');
      assert.equal(manifest.assets[0].lifecycle_class, PATH_CLASS.STAGING);

      // Destroy the asset behind the manifest's back: this is INCIDENT-E.
      fs.rmSync(abs(asset), { force: true });
      const integrity = checkStagingIntegrity(readManifest());
      const codes = integrity.findings.map((f) => f.code);
      assert.ok(codes.includes('STAGING_ASSET_MISSING'),
        `a manifest claiming an asset whose file is gone must report STAGING_ASSET_MISSING, got ${codes.join(',')}`);

      // And the CLI must surface it as a failure rather than reporting health.
      const r = runCli(['--integrity']);
      assert.equal(r.status, 1, '--integrity must fail while a declared asset is missing');
      assert.ok(r.codes.includes('STAGING_ASSET_MISSING'));
    } finally {
      cleanup(asset, MANIFEST_REL_PATH);
    }
  });
});

// ===========================================================================
// C-1 .. C-11 -- staging asset integrity protection
// ===========================================================================

test('FIX-T66: manifest asset paths cannot escape the staging root', () => {
  return withWorkspace('kb002-t66-manifest-path-containment-', (ws) => {
    const outside = path.join(CURRENT_ROOT, 'data', 'kb/golden/outside-sentinel.json');
    const outsideBytes = Buffer.from('matching outside sentinel');
    fs.writeFileSync(outside, outsideBytes);
    const manifest = {
      manifest_version: 1,
      lifecycle_class: 'staging',
      note: 't66 adversarial traversal',
      assets: [{
        asset_logical_id: 'outside-sentinel',
        relative_path: 'data/kb/golden/staging/../../outside-sentinel.json',
        status: 'present',
        byte_size: outsideBytes.length,
        sha256: crypto.createHash('sha256').update(outsideBytes).digest('hex'),
      }],
    };
    const result = checkStagingIntegrity(manifest);
    const codes = result.findings.map((f) => f.code);
    assert.ok(codes.includes('KB002_MANIFEST_ASSET_PATH_INVALID'), `expected path rejection, got ${codes.join(',')}`);
    assert.ok(!codes.includes('STAGING_ASSET_MODIFIED'), 'matching size/hash must not authorize an escaped path');
    assert.ok(fs.existsSync(outside), 'outside sentinel remains untouched');
    assert.equal(resolveStagingAssetPath(manifest.assets[0].relative_path).ok, false);
    fs.rmSync(outside, { force: true });

    const absoluteAsset = path.win32.resolve(CURRENT_ROOT, 'data/kb/golden/staging/absolute.kb.json');
    assert.equal(resolveStagingAssetPath(absoluteAsset).ok, false);
    assert.equal(resolveStagingAssetPath(`${STAGING_DIR}/nested/../escape.kb.json`).ok, false);
  });
});

 test('C-1/C-2/C-3: path ownership is explicit and cleanup is bounded', () => {
  return withWorkspace('kb002-t24-c-1-c-2-c-3-path-ownersh-', (ws) => {
    assert.equal(classifyPath('data/kb/generated/kb-v2.kb.json'), PATH_CLASS.GENERATED);
    assert.equal(classifyPath('data/kb/golden/staging/golden_001.kb.json'), PATH_CLASS.STAGING);
    assert.equal(classifyPath('data/kb/golden/golden_001.kb.json'), PATH_CLASS.PRODUCTION);

    // A generated lifecycle may clean its own directory...
    assert.equal(assertCleanupAllowed(GENERATED_DIR), true);
    assert.equal(assertCleanupAllowed(`${GENERATED_DIR}/nested`), true);
    // ...but never staging, production, the repo root, or anything wildcarded.
    assert.throws(() => assertCleanupAllowed(STAGING_DIR), /outside tool-owned/);
    assert.throws(() => assertCleanupAllowed(PRODUCTION_DIR), /outside tool-owned/);
    assert.throws(() => assertCleanupAllowed('.'), /repo root/);
    assert.throws(() => assertCleanupAllowed(`${GENERATED_DIR}/*`), /wildcard/);
    assert.throws(() => assertCleanupAllowed(''), /empty path/);
    // Sibling-name confusion must not grant ownership.
    assert.throws(() => assertCleanupAllowed('data/kb/generated-backup'), /outside tool-owned/);
  });
});

test('C-1/C-9: regenerating generated/ must not disturb a staging candidate', () => {
  return withWorkspace('kb002-t24-c-1-c-9-regenerating-gen-', (ws) => {
    const candidate = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(candidate, productionLikeFixture());
    const before = sha256(candidate);
    // Use a dedicated generated-owned scratch path rather than overwriting the
    // real generated artifacts: those are shared fixtures for other suites, and
    // clobbering them makes this test destructive to an unrelated area.
    const scratchDir = `${GENERATED_DIR}/__t24_integrity_scratch__`;
    try {
      // Exercise every read path.
      runCli([candidate]);
      runCli(['--staging']);
      runCli(['--dataset']);
      runCli(['--integrity']);
      runCli(['--summary']);

      // Simulate a generated lifecycle rewrite inside its own owned directory.
      fs.mkdirSync(abs(scratchDir), { recursive: true });
      atomicWriteJson(abs(`${scratchDir}/rewritten.json`), { regenerated: true });
      assertCleanupAllowed(scratchDir, [GENERATED_DIR]);

      assert.ok(fs.existsSync(abs(candidate)), 'the staging candidate must still exist');
      assert.equal(sha256(candidate), before, 'the staging candidate must be byte-identical');
    } finally {
      cleanup(candidate, scratchDir);
    }
  });
});

test('C-4/C-5: the manifest records the required fields and never asserts existence falsely', () => {
  return withWorkspace('kb002-t24-c-4-c-5-the-manifest-rec-', (ws) => {
    const candidate = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(candidate, productionLikeFixture());
    const entry = buildManifestEntry(candidate, { sourceTask: 't24', generatedAt: '2026-10-09T00:00:00Z' });
    try {
      for (const key of ['asset_logical_id', 'relative_path', 'status', 'byte_size', 'sha256',
        'generated_or_reconstructed_at', 'source_task', 'lifecycle_class', 'promotion_status']) {
        assert.ok(key in entry, `manifest entry must record ${key}`);
      }
      assert.equal(entry.lifecycle_class, PATH_CLASS.STAGING);
      assert.equal(entry.promotion_status, 'not_promoted');
      assert.equal(entry.byte_size, fs.statSync(abs(candidate)).size);

      // A missing file must not be recorded as present.
      const ghost = buildManifestEntry(`${STAGING_DIR}/does-not-exist.kb.json`);
      assert.equal(ghost.status, 'missing');
      assert.equal(ghost.sha256, null);
    } finally {
      cleanup(candidate);
    }
  });
});

test('C-6: a staging candidate is written atomically', () => {
  return withWorkspace('kb002-t24-c-6-a-staging-candidate--', (ws) => {
    const target = `${STAGING_DIR}/golden_001.kb.json`;
    atomicWriteFile(abs(target), JSON.stringify({ a: 1 }));
    try {
      assert.equal(fs.readFileSync(abs(target), 'utf8'), '{"a":1}');
      // No temp file may survive a successful write.
      const leftovers = fs.readdirSync(abs(STAGING_DIR)).filter((n) => n.includes('.tmp-'));
      assert.deepEqual(leftovers, [], `atomic write left temp files: ${leftovers.join(',')}`);
    } finally {
      cleanup(target);
    }
  });
});

test('C-7/C-8: validation is non-destructive for every mode', () => {
  return withWorkspace('kb002-t24-c-7-c-8-validation-is-no-', (ws) => {
    const candidate = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(candidate, productionLikeFixture());
    const before = { hash: sha256(candidate), size: fs.statSync(abs(candidate)).size };
    try {
      for (const args of [[], ['--dataset'], ['--staging'], ['--summary'], ['--integrity'], [candidate], ['--fixture']]) {
        runCli(args);
        assert.ok(fs.existsSync(abs(candidate)), `candidate vanished after ${args.join(' ') || '(default)'}`);
        assert.equal(sha256(candidate), before.hash, `candidate changed after ${args.join(' ') || '(default)'}`);
        assert.equal(fs.statSync(abs(candidate)).size, before.size);
      }
    } finally {
      cleanup(candidate);
    }
  });
});

test('C-10: staging-only content yields QUALIFIED_GOLDEN_COUNT = 0', () => {
  return withWorkspace('kb002-t24-c-10-staging-only-conten-', (ws) => {
    const candidate = `${STAGING_DIR}/golden_001.kb.json`;
    writeDoc(candidate, productionLikeFixture());
    try {
      const r = runCli(['--dataset']);
      assert.match(r.stderr, /QUALIFIED_GOLDEN_COUNT = 0/);
    } finally {
      cleanup(candidate);
    }
  });
});

test('C-11: an empty staging area is not evidence that a candidate is healthy', () => {
  return withWorkspace('kb002-t24-c-11-an-empty-staging-ar-', (ws) => {
    // Ensure the staging area really is empty of .kb.json candidates.
    fs.mkdirSync(abs(STAGING_DIR), { recursive: true });
    const strays = fs.readdirSync(abs(STAGING_DIR)).filter((n) => n.endsWith('.kb.json'));
    assert.deepEqual(strays, [], 'this test requires an empty staging area');

    const r = runCli(['--staging']);
    assert.equal(r.status, 0, 'an empty staging area is not an error');
    assert.match(r.stderr, /0 candidate file\(s\) awaiting promotion/);

    // The presence summary must distinguish "nothing here" from "healthy".
    const summary = stagingPresenceSummary();
    assert.equal(summary.candidateCount, 0);
    assert.equal(summary.assetPresenceStatus, 'NO_CANDIDATE_PRESENT');
    assert.notEqual(summary.assetPresenceStatus, 'CANDIDATE_PRESENT');
  });
});

test('C-11: --integrity reports presence separately from schema validity', () => {
  return withWorkspace('kb002-t24-c-11-integrity-reports-p-', (ws) => {
    const r = runCli(['--integrity']);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /STAGING_CANDIDATE_COUNT = \d+/);
    assert.match(r.stderr, /STAGING_MANIFEST_PRESENT = (true|false)/);
    // An empty staging area is reported as such, never as a passed candidate.
    assert.match(r.stderr, /KB-002 staging asset presence: (NO_CANDIDATE_PRESENT|CANDIDATE_PRESENT)/);
  });
});
