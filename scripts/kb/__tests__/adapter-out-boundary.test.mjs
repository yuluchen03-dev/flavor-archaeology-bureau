// K1 regression suite: the adapter's `--out` must stay inside the repository.
// Contract: docs/kb-001/01-schema-contract.md section 13.6 (contract 2.0.3).
//
// Security finding K1 (t6) proved that `--out ../../sec-real-escape-probe`
// exited 0 and created output files OUTSIDE the repository. This suite pins the
// fixed behaviour: an out-of-repository `--out` is a CLI usage error (exit 2),
// must emit a fixed message, and must not touch the filesystem.
//
// Categories covered (one or more cases each):
//   1  legal default output (no --out)
//   2  legal in-repo relative path
//   3  legal in-repo nested directory
//   4  ../outside
//   5  multi-level ../../outside
//   6  absolute path outside the repository
//   7  path that only escapes after normalisation
//   8  look-alike prefixes (repo-root sibling; generated-evil distinctness)
//   9  Windows drive-rooted path
//  10  illegal path exits 2
//  11  illegal path creates nothing and does not rewrite the default output
//  12  --dry-run does not regress
// plus UNC paths and mixed separators.
//
// Only Node built-ins and no relative imports are used.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const ADAPTER = path.join(REPO_ROOT, 'scripts', 'kb', 'adapt-v1-to-v2.mjs');
const DEFAULT_OUT = path.join(REPO_ROOT, 'data', 'kb', 'generated');
const DEFAULT_DOC = path.join(DEFAULT_OUT, 'kb-v2.kb.json');

const ESCAPE_MESSAGE = '--out must stay inside the repository; refusing to write outside it';

// Scratch space must live INSIDE the repository now that --out is restricted;
// `tmp/` is gitignored.
const SCRATCH = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb001-k1-'));
process.on('exit', () => {
  try {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

function runAdapter(args) {
  return spawnSync(process.execPath, [ADAPTER, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Repository-relative, forward-slash form (what a user would type).
function toRepoRelative(absolute) {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
}

function defaultOutputHash() {
  return fs.existsSync(DEFAULT_DOC) ? sha256File(DEFAULT_DOC) : null;
}

// ---------------------------------------------------------------------------
// 1-3: legal targets
// ---------------------------------------------------------------------------

test('K1(1): default output (no --out) still succeeds', () => {
  const run = runAdapter([]);
  assert.equal(run.status, 0, `expected exit 0; stderr: ${run.stderr.trim()}`);
  assert.ok(fs.existsSync(DEFAULT_DOC), 'default run should produce kb-v2.kb.json');
  assert.ok(
    fs.existsSync(path.join(DEFAULT_OUT, 'adaptation-report.json')),
    'default run should produce adaptation-report.json',
  );
});

test('K1(2): in-repo relative --out is accepted and written', () => {
  const target = path.join(SCRATCH, 'rel');
  const run = runAdapter(['--out', toRepoRelative(target)]);
  assert.equal(run.status, 0, `expected exit 0; stderr: ${run.stderr.trim()}`);
  assert.ok(fs.existsSync(path.join(target, 'kb-v2.kb.json')));
  assert.ok(fs.existsSync(path.join(target, 'adaptation-report.json')));
});

test('K1(3): in-repo nested --out is created recursively', () => {
  const target = path.join(SCRATCH, 'a', 'b', 'c');
  const run = runAdapter(['--out', toRepoRelative(target)]);
  assert.equal(run.status, 0, `expected exit 0; stderr: ${run.stderr.trim()}`);
  assert.ok(fs.existsSync(path.join(target, 'kb-v2.kb.json')));
});

// ---------------------------------------------------------------------------
// 4-9: illegal targets, table-driven
// ---------------------------------------------------------------------------

const SIBLING_EVIL = `${REPO_ROOT}-out-boundary-evil`;
const SIBLING_DIGIT = `${REPO_ROOT}2`;

const ILLEGAL_CASES = [
  ['K1(4): ../outside', '../kb001-k1-escape-probe'],
  ['K1(5): multi-level ../../outside', '../../kb001-k1-escape-probe'],
  [
    'K1(6): absolute path outside the repository',
    path.join(os.tmpdir(), 'kb001-k1-abs-probe'),
  ],
  [
    'K1(7): escapes only after normalisation',
    'data/kb/generated/../../../../kb001-k1-normalize-probe',
  ],
  [
    'K1(8a): repo-root sibling sharing the string prefix (startsWith pitfall)',
    path.relative(REPO_ROOT, SIBLING_EVIL).split(path.sep).join('/'),
  ],
  [
    'K1(8b): repo-root sibling with a digit suffix (the "data2" shape)',
    path.relative(REPO_ROOT, SIBLING_DIGIT).split(path.sep).join('/'),
  ],
];

for (const [label, value] of ILLEGAL_CASES) {
  test(`${label} is rejected`, () => {
    const resolved = path.resolve(REPO_ROOT, value);

    // Guard: the case must genuinely point outside the repository, otherwise the
    // assertion below would be vacuous.
    const relFromRoot = path.relative(REPO_ROOT, resolved);
    assert.ok(
      path.isAbsolute(relFromRoot) || relFromRoot === '..' || relFromRoot.startsWith(`..${path.sep}`),
      `${label}: fixture "${value}" resolves to "${resolved}", which is inside the repository`,
    );

    const run = runAdapter(['--out', value]);
    assert.equal(run.status, 2, `${label}: expected exit 2, got ${run.status}`);
    assert.match(run.stderr, new RegExp(ESCAPE_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(!fs.existsSync(resolved), `${label}: nothing may be created at ${resolved}`);
  });
}

test('K1(8c): a look-alike in-repo directory is its own target, not a prefix match', () => {
  // `generated-evil` shares a string prefix with `generated`. It is inside the
  // repository, so it is legal — but it must be treated as a distinct directory
  // and must never be conflated with its prefix.
  const real = path.join(SCRATCH, 'generated');
  const lookalike = path.join(SCRATCH, 'generated-evil');

  const runReal = runAdapter(['--out', toRepoRelative(real)]);
  assert.equal(runReal.status, 0, `real target failed: ${runReal.stderr.trim()}`);
  const realDocBefore = sha256File(path.join(real, 'kb-v2.kb.json'));

  const runLookalike = runAdapter(['--out', toRepoRelative(lookalike)]);
  assert.equal(runLookalike.status, 0, `look-alike failed: ${runLookalike.stderr.trim()}`);

  assert.ok(fs.existsSync(path.join(lookalike, 'kb-v2.kb.json')), 'look-alike is its own directory');
  assert.equal(
    sha256File(path.join(real, 'kb-v2.kb.json')),
    realDocBefore,
    'writing the look-alike must not touch the prefix directory',
  );
});

test('K1(9): Windows drive-rooted --out is rejected', () => {
  if (process.platform !== 'win32') {
    // Not applicable on POSIX: a value such as "D:\kb001" is an ordinary legal
    // relative name there and resolves inside the repository. Recorded, not
    // silently skipped.
    assert.ok(true, 'POSIX: drive-rooted paths do not exist, case is not applicable');
    return;
  }

  const sameDrive = 'D:\\kb001-k1-samedrive-probe';
  const otherDrive = 'C:\\Windows\\Temp\\kb001-k1-otherdrive-probe';

  for (const value of [sameDrive, otherDrive]) {
    const run = runAdapter(['--out', value]);
    assert.equal(run.status, 2, `"${value}" should be rejected with exit 2, got ${run.status}`);
    assert.match(run.stderr, new RegExp(ESCAPE_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const resolved = path.resolve(REPO_ROOT, value);
    assert.ok(!fs.existsSync(resolved), `nothing may be created at ${resolved}`);
  }
});

test('K1(extra): UNC --out is rejected', () => {
  const unc = '\\\\server\\share\\kb001-k1-unc-probe';
  const run = runAdapter(['--out', unc]);
  assert.equal(run.status, 2, `UNC path should be rejected with exit 2, got ${run.status}`);
  assert.match(run.stderr, new RegExp(ESCAPE_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  // No existence probe is performed: resolving a non-existent UNC share is
  // environment dependent and may block. The rejection itself is lexical and
  // therefore deterministic.
});

test('K1(extra): mixed path separators inside the repository are accepted', () => {
  const target = path.join(SCRATCH, 'mixed', 'sep');
  const mixed = toRepoRelative(target).replace(/\//g, (m, i, s) => (/[\\/]/.test(s[i - 1] || '') ? '/' : '\\'));
  const run = runAdapter(['--out', mixed]);
  assert.equal(run.status, 0, `mixed separators should be accepted; got ${run.status}: ${run.stderr.trim()}`);
  assert.ok(fs.existsSync(path.join(target, 'kb-v2.kb.json')));
});

// ---------------------------------------------------------------------------
// 10-11: failure semantics
// ---------------------------------------------------------------------------

test('K1(10): every illegal --out exits 2 with a stable message', () => {
  const values = [...ILLEGAL_CASES.map(([, v]) => v), '..', '../'];
  for (const value of values) {
    const first = runAdapter(['--out', value]);
    const second = runAdapter(['--out', value]);
    assert.equal(first.status, 2, `"${value}": expected exit 2, got ${first.status}`);
    assert.equal(second.status, 2, `"${value}": expected exit 2 on repeat, got ${second.status}`);
    assert.equal(first.stderr, second.stderr, `"${value}": stderr must be stable across runs`);
    assert.ok(!/undefined|NaN|\[object/.test(first.stderr), `"${value}": stderr must not leak internals`);
  }
});

test('K1(11): an illegal --out writes nothing and never rewrites the default output', () => {
  const before = defaultOutputHash();
  assert.ok(before, 'precondition: the default output must exist for this comparison');

  for (const [, value] of ILLEGAL_CASES) {
    const resolved = path.resolve(REPO_ROOT, value);
    const run = runAdapter(['--out', value]);
    assert.equal(run.status, 2);
    assert.ok(!fs.existsSync(resolved), `illegal run created ${resolved}`);
    assert.equal(
      defaultOutputHash(),
      before,
      `illegal --out "${value}" must not rewrite the default output (no silent fallback)`,
    );
  }

  // A missing value is also a usage error, not a fallback.
  const missing = runAdapter(['--out']);
  assert.equal(missing.status, 2, '`--out` without a value must exit 2');
  assert.equal(defaultOutputHash(), before, '`--out` without a value must not rewrite the default output');
});

// ---------------------------------------------------------------------------
// 12: dry-run non-regression
// ---------------------------------------------------------------------------

test('K1(12): --dry-run still exits 0 and creates nothing', () => {
  const before = defaultOutputHash();

  const target = path.join(SCRATCH, 'dry-run-target');
  const run = runAdapter(['--dry-run', '--out', toRepoRelative(target)]);
  assert.equal(run.status, 0, `dry-run should exit 0; got ${run.status}: ${run.stderr.trim()}`);
  assert.ok(!fs.existsSync(target), 'a dry run must not create the target directory');
  assert.ok(/dry run/i.test(run.stdout + run.stderr), 'a dry run must announce itself');

  const bare = runAdapter(['--dry-run']);
  assert.equal(bare.status, 0, `bare dry-run should exit 0; got ${bare.status}`);
  assert.ok(fs.existsSync(DEFAULT_DOC), 'dry-run must not delete the existing default output');
  assert.equal(defaultOutputHash(), before, 'dry-run must not rewrite the default output');
});
