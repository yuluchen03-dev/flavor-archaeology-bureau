// KB002-TOOL-ALIGN-03 targeted tests.
//
// The question these lock down: is a low-evidence but *honest* candidate a
// valid, preservable staging record? The contract says yes (12- section 5 /
// 01- section 10.2): Q3 is a PRODUCTION admission gate, so an E0/E1/E2
// candidate may legitimately exist in staging.
//
// Lying about one's own state is a different matter and stays blocking
// everywhere (sections 7 and 8): a candidate may be weak, but it may not claim
// to be stronger than it is.
//
// Every scenario runs in a throwaway workspace (FIX-03) so nothing is ever
// written into the real data/kb/golden tree.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkspace, isInsideWorkspace } from './workspace.mjs';
import { productionLikeFixture } from './fixtures.mjs';

const CLI = path.resolve('scripts/kb002/validate-golden.mjs');
const SRC = 'data/kb/golden/examples/valid/golden_001.kb.json';

function runCli(args, env) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    status: r.status,
    combined: `${r.stdout || ''}${r.stderr || ''}`,
  };
}

/**
 * The structural fixture is already an honest E2 / qualified=false record, so it
 * is a faithful stand-in for a real low-evidence candidate once the fixture
 * marker is removed (a candidate is not a fixture).
 */
function candidate(overrides = {}) {
  const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  delete doc.metadata.fixture;
  delete doc.metadata.fixture_only;
  delete doc.metadata.not_historical_evidence;
  Object.assign(doc.metadata, overrides);
  // The shipped structural fixture links a sufficient RestorationVersion to an
  // insufficient claim. A staging candidate must be internally honest, so lower
  // that derived restoration declaration too; this changes no historical source
  // facts or provenance. S8 uses the separate production-like test fixture.
  for (const e of doc.entities) {
    if (e.entity_type === 'RestorationVersion') e.evidence_status = 'insufficient';
  }
  return doc;
}

const STAGING_REL = 'data/kb/golden/staging/golden_001.kb.json';
const PROD_REL = 'data/kb/golden/golden_001.kb.json';
const MANIFEST_REL = 'data/kb/golden/staging/manifest.json';

test('workspace rejects traversal and absolute targets before writing, and permits in-root writes', () => {
  const ws = createWorkspace('t57-path-guard-');
  const outside = path.resolve(ws.root, '..', `${path.basename(ws.root)}-escaped.json`);
  const absoluteOutside = path.resolve(ws.root, '..', `${path.basename(ws.root)}-absolute.json`);
  try {
    const safe = ws.write('data/kb/golden/staging/inside.json', { ok: true });
    assert.ok(isInsideWorkspace(ws, safe));
    assert.ok(fs.existsSync(safe), 'ordinary in-root writes still work');

    for (const bad of ['../escaped.json', '../../outside/file.json', outside, absoluteOutside, 'C:\\\\outside.json']) {
      assert.throws(() => ws.resolve(bad), /relative|escapes/);
      assert.throws(() => ws.write(bad, { unsafe: true }), /relative|escapes/);
    }
    assert.ok(!fs.existsSync(outside), 'traversal target was not created');
    assert.ok(!fs.existsSync(absoluteOutside), 'absolute target was not created');

    // Symlink creation can require elevated privileges on Windows. If the host
    // permits it, also prove the realpath guard blocks a symlink escape.
    const link = path.join(ws.root, 'escape-link');
    try {
      fs.symlinkSync(path.dirname(outside), link, 'dir');
      assert.throws(() => ws.write('escape-link/symlink-escaped.json', { unsafe: true }), /escapes/);
      assert.ok(!fs.existsSync(outside.replace('-escaped.json', '-symlink-escaped.json')),
        'symlink-resolved target was not created outside workspace');
    } catch (error) {
      if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
      // Lexical traversal/absolute rejection above remains mandatory and passed.
    }
  } finally {
    ws.cleanup();
  }
});

test('workspace cleanup is bounded to its own root', () => {
  const ws = createWorkspace('t57-cleanup-owner-');
  const sibling = `${ws.root}-sibling`;
  fs.mkdirSync(sibling, { recursive: true });
  const siblingFile = path.join(sibling, 'keep.json');
  fs.writeFileSync(siblingFile, 'keep');
  ws.cleanup();
  assert.equal(fs.existsSync(ws.root), false);
  assert.equal(fs.readFileSync(siblingFile, 'utf8'), 'keep');
  fs.rmSync(sibling, { recursive: true, force: true });
});

test('S1: an honest E2 candidate is staging-valid but not production-admissible', () => {
  const ws = createWorkspace('t45-s1-');
  try {
    const abs = ws.write(STAGING_REL, candidate());
    assert.ok(isInsideWorkspace(ws, abs), 'candidate must live in the temp workspace');
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.combined}`);
    assert.match(r.combined, /STAGING_VALID = true/);
    assert.match(r.combined, /PRODUCTION_ADMISSIBLE = false/);
    // Q3 must remain visible: silently dropping it is the forbidden implementation.
    assert.ok(r.combined.includes('KB002_DISH_BELOW_E3'), 'Q3 finding must still be reported');
  } finally {
    ws.cleanup();
  }
});

test('S2: the same E2 candidate fails in the production dataset with Q3', () => {
  const ws = createWorkspace('t45-s2-');
  try {
    ws.write(STAGING_REL, candidate());
    // "Promote" into the production root of the throwaway workspace.
    ws.write(PROD_REL, candidate());
    const r = runCli(['--dataset'], ws.env);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}`);
    assert.ok(r.combined.includes('KB002_DISH_BELOW_E3'), 'Q3 must block production admission');
    assert.match(r.combined, /QUALIFIED_GOLDEN_COUNT = 0/);
  } finally {
    ws.cleanup();
  }
});

test('S3: a calculated E0 candidate is preserved in staging', () => {
  const ws = createWorkspace('t45-s3-');
  try {
    // Keep the Dish and claim_about edge but remove all support edges. Per rubric
    // R1, S(claim)=empty computes E0; the claim is honestly insufficient,
    // unresolved, and unreviewed, with matching metadata.
    const doc = candidate();
    const claimIds = new Set(doc.entities.filter((e) => e.entity_type === 'HistoricalClaim').map((e) => e.id));
    doc.relations = doc.relations.filter((r) => !(r.type === 'claim_supported_by' && claimIds.has(r.source)));
    for (const e of doc.entities) {
      if (e.entity_type === 'HistoricalClaim') {
        e.evidence_status = 'insufficient';
        e.provenance.derivation = 'unresolved';
        e.review_status = 'unreviewed';
        e.notes = 'EVIDENCE_LEVEL=E0';
      }
      if (e.entity_type === 'RestorationVersion') e.evidence_status = 'insufficient';
    }
    doc.metadata.evidence_level = 'E0';
    doc.metadata.qualified = false;
    const abs = ws.write(STAGING_REL, doc);
    assert.ok(isInsideWorkspace(ws, abs));
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.combined}`);
    assert.match(r.combined, /STAGING_VALID = true/);
    assert.match(r.combined, /PRODUCTION_ADMISSIBLE = false/);
    assert.ok(r.combined.includes('KB002_DISH_BELOW_E3'));
    assert.ok(fs.existsSync(abs), 'candidate is preserved within its isolated workspace');
  } finally {
    ws.cleanup();
  }
});

test('S4: a declared Evidence Level above the computed one stays blocking in staging', () => {
  const ws = createWorkspace('t45-s4-');
  try {
    ws.write(STAGING_REL, candidate({ evidence_level: 'E3' }));
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 1, 'level dishonesty must not be excused by staging');
    assert.ok(r.combined.includes('KB002_DISH_LEVEL_MISMATCH'));
  } finally {
    ws.cleanup();
  }
});

test('S5: qualified=true while the computed value is false stays blocking in staging', () => {
  const ws = createWorkspace('t45-s5-');
  try {
    ws.write(STAGING_REL, candidate({ qualified: true }));
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 1, 'qualified dishonesty must not be excused by staging');
    assert.ok(r.combined.includes('KB002_QUALIFIED_MISMATCH'));
  } finally {
    ws.cleanup();
  }
});

test('S6: a manifest claiming a missing asset blocks staging (STAGING_ASSET_MISSING)', () => {
  // Candidate preservation requires every asset the manifest claims to exist.
  // A valid manifest that points to a missing file is therefore staging-blocking.
  const ws = createWorkspace('t45-s6-');
  try {
    ws.write(STAGING_REL, candidate());
    // Claim an asset that does not exist in the workspace.
    ws.write('data/kb/golden/staging/manifest.json', {
      manifest_version: 1,
      lifecycle_class: 'staging',
      note: 'synthetic manifest for ALIGN-03 S6',
      assets: [
        {
          asset_logical_id: 'golden-001',
          relative_path: 'data/kb/golden/staging/does-not-exist.kb.json',
          status: 'present',
          byte_size: 1234,
          sha256: 'deadbeef',
        },
      ],
    });
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 1, 'a missing manifest asset must fail staging validation');
    assert.ok(r.combined.includes('STAGING_ASSET_MISSING'), 'expected STAGING_ASSET_MISSING');
    assert.ok(!r.combined.includes('KB002_MANIFEST_SCHEMA_INVALID'), 'manifest must be well-formed for this case');
  } finally {
    ws.cleanup();
  }
});

test('S7: an invalid manifest schema fails closed under staging', () => {
  // Wrong field name: `entries` instead of `assets` (FIX-04 fail-closed).
  // Staging validation must enforce the same manifest schema boundary.
  const ws = createWorkspace('t45-s7-');
  try {
    ws.write(STAGING_REL, candidate());
    ws.write('data/kb/golden/staging/manifest.json', {
      manifest_version: 1,
      entries: [],
    });
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 1, 'an invalid manifest schema must fail staging closed');
    assert.ok(
      r.combined.includes('KB002_MANIFEST_SCHEMA_INVALID'),
      'expected KB002_MANIFEST_SCHEMA_INVALID',
    );
  } finally {
    ws.cleanup();
  }
});

test('manifest path containment rejects traversal and absolute paths before reading outside staging', async () => {
  const crypto = await import('node:crypto');
  const ws = createWorkspace('t66-manifest-escape-');
  const outsideWorkspace = createWorkspace('t66-manifest-outside-');
  const outsideAbs = path.join(outsideWorkspace.root, 'outside-sentinel.json');
  const outsideBytes = Buffer.from('outside sentinel for manifest containment');
  try {
    fs.writeFileSync(outsideAbs, outsideBytes);
    const entry = {
      asset_logical_id: 'escape-attempt',
      // Absolute reference to a sibling dataset root reproduces workspace escape
      // while keeping both trees disposable and independent.
      relative_path: path.join(outsideWorkspace.root, 'data/kb/golden/staging/outside-sentinel.json'),
      status: 'present',
      byte_size: outsideBytes.length,
      sha256: crypto.createHash('sha256').update(outsideBytes).digest('hex'),
    };
    ws.write(MANIFEST_REL, {
      manifest_version: 1,
      lifecycle_class: 'staging',
      note: 't66 traversal attempt',
      assets: [entry],
    });
    const r = runCli(['--integrity'], ws.env);
    assert.equal(r.status, 1);
    assert.ok(r.combined.includes('KB002_MANIFEST_ASSET_PATH_INVALID'));
    assert.ok(!r.combined.includes('STAGING_ASSET_MODIFIED'), 'must reject path before hashing outside sentinel');
  } finally {
    ws.cleanup();
    outsideWorkspace.cleanup();
  }
});

test('manifest path containment rejects existing symlink ancestors when supported', async () => {
  const crypto = await import('node:crypto');
  const ws = createWorkspace('t66-manifest-link-');
  const outside = createWorkspace('t66-manifest-link-target-');
  try {
    const outsideRel = 'data/kb/golden/outside-link-sentinel.json';
    const outsideAbs = outside.write(outsideRel, { sentinel: 'outside staging' });
    const link = path.join(ws.staging, 'linked');
    try {
      fs.symlinkSync(outside.root, link, 'junction');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return;
      throw error;
    }

    const bytes = fs.readFileSync(outsideAbs);
    ws.write(MANIFEST_REL, {
      manifest_version: 1,
      lifecycle_class: 'staging',
      note: 't66 symlink containment',
      assets: [{
        asset_logical_id: 'linked-outside',
        relative_path: `${STAGING_REL.slice(0, STAGING_REL.lastIndexOf('/'))}/linked/outside-link-sentinel.json`,
        status: 'present',
        byte_size: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      }],
    });
    const r = runCli(['--integrity'], ws.env);
    assert.equal(r.status, 1);
    assert.ok(r.combined.includes('KB002_MANIFEST_ASSET_PATH_INVALID'));
    assert.ok(!r.combined.includes('STAGING_ASSET_MODIFIED'));
  } finally {
    ws.cleanup();
    outside.cleanup();
  }
});

test('manifest path containment accepts a valid staging asset', async () => {
  const crypto = await import('node:crypto');
  const ws = createWorkspace('t66-manifest-valid-');
  try {
    const rel = STAGING_REL;
    const bytes = Buffer.from(JSON.stringify(candidate()));
    const abs = ws.write(rel, JSON.parse(bytes.toString('utf8')));
    const content = fs.readFileSync(abs);
    ws.write(MANIFEST_REL, {
      manifest_version: 1,
      lifecycle_class: 'staging',
      note: 't66 valid contained asset',
      assets: [{
        asset_logical_id: 'golden_001',
        relative_path: rel,
        status: 'present',
        byte_size: content.length,
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
      }],
    });
    const r = runCli(['--integrity'], ws.env);
    assert.equal(r.status, 0, r.combined);
    assert.ok(!r.combined.includes('KB002_MANIFEST_ASSET_PATH_INVALID'));
    assert.ok(!r.combined.includes('STAGING_ASSET_MODIFIED'));
  } finally {
    ws.cleanup();
  }
});

test('S8: a calculated E4 candidate is staging-valid and production-admissible', () => {
  const ws = createWorkspace('t45-s8-');
  try {
    // Use the existing synthetic production-like test fixture. It is explicitly
    // synthetic test data and computes E4 by rubric R3 without inventing a real
    // historical source. This is test-only data in an isolated workspace, never
    // a real candidate or a claim about history.
    const doc = productionLikeFixture({ goldenId: 'GOLDEN-001' });
    const abs = ws.write(STAGING_REL, doc);
    assert.ok(isInsideWorkspace(ws, abs));
    const r = runCli(['--staging', STAGING_REL], ws.env);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.combined}`);
    assert.match(r.combined, /STAGING_VALID = true/);
    assert.match(r.combined, /PRODUCTION_ADMISSIBLE = true/);
    assert.ok(!r.combined.includes('KB002_DISH_BELOW_E3'));
  } finally {
    ws.cleanup();
  }
});
