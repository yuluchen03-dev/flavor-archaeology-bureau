// K1 QA independent boundary verification (task t13)
//
// Written by qa-k1. This suite is INDEPENDENT of the implementer's suite
// (scripts/kb/__tests__/adapter-out-boundary.test.mjs). It constructs and runs
// every scenario itself rather than restating the implementer's claims.
//
// Only Node built-ins are used. Fixtures live under the gitignored repo tmp/
// and under os.tmpdir(); nothing outside inScope is written.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const ADAPTER = path.join('scripts', 'kb', 'adapt-v1-to-v2.mjs');
const GENERATED = path.join('data', 'kb', 'generated');

const TMP_ROOT = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb001-k1qa-'));
const FIXTURES = [];
let counter = 0;

after(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

// Fresh, non-existent in-repo scratch path per case.
function scratch(label) {
  counter += 1;
  const dir = path.join(TMP_ROOT, `${String(counter).padStart(3, '0')}-${label}`);
  FIXTURES.push(dir);
  return dir;
}

function runAdapter(args) {
  const r = spawnSync(process.execPath, [ADAPTER, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function generatedSnapshot() {
  const map = new Map();
  const abs = path.join(REPO_ROOT, GENERATED);
  if (!fs.existsSync(abs)) return map;
  for (const name of fs.readdirSync(abs).sort()) {
    const p = path.join(abs, name);
    if (fs.statSync(p).isFile()) map.set(name, sha256File(p));
  }
  return map;
}

const ESCAPE_REASON = '--out must stay inside the repository; refusing to write outside it';

// ---------------------------------------------------------------------------
// 1. Legal default output
// ---------------------------------------------------------------------------
test('S1 legal default output exits 0 and leaves output byte-identical', () => {
  const before = generatedSnapshot();
  const r = runAdapter([]);
  assert.equal(r.code, 0, `default run must exit 0; stderr=${r.stderr}`);
  const afterSnap = generatedSnapshot();
  assert.deepEqual([...afterSnap.keys()].sort(), [...before.keys()].sort(), 'generated file set changed');
  for (const [name, hash] of before) {
    assert.equal(afterSnap.get(name), hash, `generated/${name} changed - adapter output must be deterministic`);
  }
});

// ---------------------------------------------------------------------------
// 2. Legal in-repo relative path
// ---------------------------------------------------------------------------
test('S2 legal in-repo relative path exits 0 and creates the directory', () => {
  const rel = path.relative(REPO_ROOT, scratch('rel'));
  const r = runAdapter(['--out', rel]);
  assert.equal(r.code, 0, `expected exit 0 for in-repo path; stderr=${r.stderr}`);
  assert.ok(fs.existsSync(path.join(REPO_ROOT, rel, 'kb-v2.kb.json')), 'in-repo output not written');
});

// ---------------------------------------------------------------------------
// 3. Legal in-repo nested path
// ---------------------------------------------------------------------------
test('S3 legal in-repo nested path exits 0 and creates nested directories', () => {
  const rel = path.relative(REPO_ROOT, path.join(scratch('nested'), 'a', 'b', 'c'));
  const r = runAdapter(['--out', rel]);
  assert.equal(r.code, 0, `expected exit 0 for nested in-repo path; stderr=${r.stderr}`);
  assert.ok(fs.existsSync(path.join(REPO_ROOT, rel, 'adaptation-report.json')), 'nested output not written');
});

// ---------------------------------------------------------------------------
// 4-5. Traversal escapes
// ---------------------------------------------------------------------------
test('S4 ../ outside exits 2 and is not created', () => {
  const outside = path.join(path.dirname(REPO_ROOT), 'kb001-k1qa-escape-one');
  fs.rmSync(outside, { recursive: true, force: true });
  const r = runAdapter(['--out', '../kb001-k1qa-escape-one']);
  assert.equal(r.code, 2, `expected exit 2; got ${r.code}`);
  assert.ok(r.stderr.includes(ESCAPE_REASON), 'fixed escape reason not reported');
  assert.ok(!fs.existsSync(outside), 'escaped directory must not be created');
});

test('S5 multi-level ../../ outside exits 2 and is not created', () => {
  const outside = path.join(path.dirname(path.dirname(REPO_ROOT)), 'kb001-k1qa-escape-two');
  fs.rmSync(outside, { recursive: true, force: true });
  const r = runAdapter(['--out', '../../kb001-k1qa-escape-two']);
  assert.equal(r.code, 2, `expected exit 2; got ${r.code}`);
  assert.ok(!fs.existsSync(outside), 'escaped directory must not be created');
});

// ---------------------------------------------------------------------------
// 6. Absolute path outside the repository (target inside os.tmpdir())
// ---------------------------------------------------------------------------
test('S6 absolute path under os.tmpdir() exits 2 and target does not exist', () => {
  const target = path.join(os.tmpdir(), `kb001-k1qa-abs-${process.pid}-${Date.now()}`);
  fs.rmSync(target, { recursive: true, force: true });
  assert.ok(!fs.existsSync(target), 'precondition: tmp target must not exist');
  const r = runAdapter(['--out', target]);
  assert.equal(r.code, 2, `expected exit 2; got ${r.code}`);
  assert.ok(r.stderr.includes(ESCAPE_REASON), 'fixed escape reason not reported');
  assert.ok(!fs.existsSync(target), 'os.tmpdir() target must NOT be created');
});

// ---------------------------------------------------------------------------
// 7. Normalisation escape (lexically collapses back outside the repo)
// ---------------------------------------------------------------------------
test('S7 normalize-collapsed escape exits 2 and is not created', () => {
  const outside = path.join(path.dirname(REPO_ROOT), 'kb001-k1qa-norm');
  fs.rmSync(outside, { recursive: true, force: true });
  const sneaky = 'data/kb/generated/../../../../kb001-k1qa-norm';
  const r = runAdapter(['--out', sneaky]);
  assert.equal(r.code, 2, `expected exit 2 after normalisation; got ${r.code}`);
  assert.ok(!fs.existsSync(outside), 'normalised escape must not be created');
});

// ---------------------------------------------------------------------------
// 8. Prefix-similar sibling — the actual startsWith() vulnerability
//    A boundary check using `candidate.startsWith(REPO_ROOT)` would ACCEPT
//    `<repo>-evil` because the string begins with the repo path. The correct
//    path.relative() check must REJECT it.
// ---------------------------------------------------------------------------
test('S8 prefix-similar sibling <repo>-evil exits 2 (startsWith would wrongly accept)', () => {
  const sibling = path.join(path.dirname(REPO_ROOT), `${path.basename(REPO_ROOT)}-evil`);
  const existedBefore = fs.existsSync(sibling);
  const r = runAdapter(['--out', path.relative(REPO_ROOT, sibling)]);
  assert.equal(r.code, 2, `prefix-similar sibling must be rejected; got exit ${r.code}`);
  assert.ok(r.stderr.includes(ESCAPE_REASON), 'fixed escape reason not reported');
  if (!existedBefore) {
    assert.ok(!fs.existsSync(sibling), 'prefix-similar sibling must not be created');
  }
});

// ---------------------------------------------------------------------------
// 8b. Honest finding: `<repo>/data2` is INSIDE the boundary.
//     The acceptance wording ("data2 must be rejected") assumes the allowed
//     boundary is `data/`. The implemented boundary is the repository root, so
//     `data2` is legitimately inside and MUST be accepted. The real guard
//     against the prefix bug is S8 above.
// ---------------------------------------------------------------------------
test('S8b sibling-of-boundary data2 is inside the repo and is correctly accepted', () => {
  const rel = path.relative(REPO_ROOT, scratch('data2'));
  const r = runAdapter(['--out', rel]);
  assert.equal(r.code, 0, `in-repo sibling dir must be accepted; got ${r.code}; stderr=${r.stderr}`);
  assert.ok(fs.existsSync(path.join(REPO_ROOT, rel, 'kb-v2.kb.json')), 'in-repo sibling output not written');
});

// ---------------------------------------------------------------------------
// 9. Windows drive and UNC escapes
// ---------------------------------------------------------------------------
test('S9a foreign drive absolute path exits 2 (win32)', { skip: process.platform !== 'win32' }, () => {
  const target = 'C:\\kb001-k1qa-drive-escape';
  const r = runAdapter(['--out', target]);
  assert.equal(r.code, 2, `drive escape must be rejected; got ${r.code}`);
  assert.ok(!fs.existsSync(target), 'foreign drive target must not be created');
});

test('S9b UNC path exits 2 (win32)', { skip: process.platform !== 'win32' }, () => {
  // No existence probe: resolving a non-existent UNC share is an environment
  // dependent, potentially blocking operation. Rejection is a lexical decision.
  const r = runAdapter(['--out', '\\\\kb001-k1qa-nonexistent-share\\out']);
  assert.equal(r.code, 2, `UNC escape must be rejected; got ${r.code}`);
});

// ---------------------------------------------------------------------------
// 10-12. Exit code, no filesystem effects, fixed message, dry-run precedence
// ---------------------------------------------------------------------------
test('S10 illegal --out always exits 2 across a range of illegal forms', () => {
  const illegal = [
    '../kb001-k1qa-x',
    '../../kb001-k1qa-x',
    'data/kb/generated/../../../../kb001-k1qa-x',
    path.join(os.tmpdir(), 'kb001-k1qa-x'),
  ];
  if (process.platform === 'win32') illegal.push('C:\\kb001-k1qa-x');
  for (const arg of illegal) {
    const r = runAdapter(['--out', arg]);
    assert.equal(r.code, 2, `expected exit 2 for --out ${arg}; got ${r.code}`);
  }
});

test('S11 illegal --out creates nothing and leaves generated/ untouched', () => {
  const before = generatedSnapshot();
  const beforeEntries = fs.existsSync(TMP_ROOT) ? fs.readdirSync(TMP_ROOT).sort() : [];
  const r = runAdapter(['--out', '../kb001-k1qa-noop']);
  assert.equal(r.code, 2);
  assert.deepEqual(generatedSnapshot(), before, 'generated/ must be untouched by an illegal run');
  const afterEntries = fs.existsSync(TMP_ROOT) ? fs.readdirSync(TMP_ROOT).sort() : [];
  assert.deepEqual(afterEntries, beforeEntries, 'illegal run must not write into the fixture root');
});

test('S12 --dry-run exits 0 and creates nothing (no regression)', () => {
  const target = scratch('dryrun');
  const rel = path.relative(REPO_ROOT, target);
  const r = runAdapter(['--out', rel, '--dry-run']);
  assert.equal(r.code, 0, `dry-run must exit 0; stderr=${r.stderr}`);
  assert.ok(!fs.existsSync(target), 'dry-run must not create the output directory');
});

test('S13 --dry-run with an ILLEGAL --out still exits 2 (not silently ignored)', () => {
  const r = runAdapter(['--out', '../kb001-k1qa-dryrun-escape', '--dry-run']);
  assert.equal(r.code, 2, `illegal --out must fail even under --dry-run; got ${r.code}`);
  assert.ok(!fs.existsSync(path.join(path.dirname(REPO_ROOT), 'kb001-k1qa-dryrun-escape')), 'must not be created');
});

test('S14 escape message is a fixed, absolute-path-free string', () => {
  const r = runAdapter(['--out', '../kb001-k1qa-msg']);
  assert.equal(r.code, 2);
  assert.ok(r.stderr.includes(ESCAPE_REASON), 'fixed reason missing');
  assert.ok(!r.stderr.includes(REPO_ROOT), 'error message must not leak the absolute repository path');
  const second = runAdapter(['--out', '../kb001-k1qa-msg']);
  assert.equal(second.stderr, r.stderr, 'error output must be stable across runs');
});

test('S15 --out with a missing value still exits 2 (pre-existing behaviour intact)', () => {
  const r = runAdapter(['--out']);
  assert.equal(r.code, 2, `missing --out value must exit 2; got ${r.code}`);
});
