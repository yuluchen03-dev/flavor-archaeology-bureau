// KB-002 test workspace isolation (KB002-TOOL-FIX-03).
//
// Why this exists: the KB-002 tests used to write fixtures into the REAL
// `data/kb/golden/**` tree -- staging candidates, production records, and even
// the production root `data/kb/golden/golden_001.kb.json`. Concurrent test
// instances therefore shared one candidate path. That is a test-infrastructure
// integrity defect independent of whether it happens to reproduce.
//
// This follows the pattern the KB-001 suites already use (`mkdtempSync` under
// the OS temp dir), so it introduces no new mechanism.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { goldenRoot } from '../validate-golden.mjs';

/**
 * Create an isolated dataset workspace.
 *
 * The returned object is the ONLY thing tests should use to place fixtures. It
 * gives a private temp root shaped like the repo's dataset tree, plus absolute
 * paths for each area, and an env overlay that points the CLI at it.
 *
 * Every call returns a distinct root, so two concurrent test files -- or two
 * cases in the same file -- can never share a candidate path.
 */
export function createWorkspace(prefix = 'kb002-ws-') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const golden = path.join(root, 'data', 'kb/golden');
  const dirs = {
    root,
    golden,
    production: golden,
    staging: path.join(golden, 'staging'),
    generated: path.join(root, 'data/kb/generated'),
    examplesValid: path.join(golden, 'examples/valid'),
    examplesInvalid: path.join(golden, 'examples/invalid'),
  };
  for (const d of [dirs.staging, dirs.generated, dirs.examplesValid, dirs.examplesInvalid]) {
    fs.mkdirSync(d, { recursive: true });
  }

  return {
    ...dirs,
    /** Env overlay that redirects the CLI's dataset resolution to this root. */
    env: { KB002_GOLDEN_ROOT: root },
    /** Resolve a repo-relative fixture path, refusing absolute/traversal paths. */
    resolve(relPath) {
      if (typeof relPath !== 'string' || relPath.length === 0) {
        throw new TypeError('workspace path must be a non-empty relative string');
      }
      if (path.isAbsolute(relPath) || path.win32.isAbsolute(relPath)) {
        throw new Error('workspace path must be relative');
      }
      const abs = path.resolve(root, relPath);
      const rel = path.relative(root, abs);
      if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        throw new Error('workspace path escapes owned root');
      }
      return abs;
    },
    /** Write a document inside this workspace (never the real tree). */
    write(relPath, doc) {
      const abs = this.resolve(relPath);
      // Re-check the target and every existing ancestor before any parent
      // directory creation. This rejects lexical traversal and a symlink inside
      // the workspace that redirects an otherwise in-root path outside it.
      const realRoot = fs.realpathSync(root);
      const assertInside = (target) => {
        const rel = path.relative(realRoot, target);
        if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
          throw new Error('workspace write target escapes owned root');
        }
      };
      assertInside(path.resolve(abs));
      let ancestor = path.dirname(abs);
      while (true) {
        if (fs.existsSync(ancestor)) {
          assertInside(fs.realpathSync(ancestor));
          break;
        }
        const parent = path.dirname(ancestor);
        if (parent === ancestor) throw new Error('workspace write target has no owned ancestor');
        ancestor = parent;
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
      return abs;
    },
    /** Remove ONLY this workspace. Never touches the repository. */
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

/**
 * Assert a path is inside a workspace root.
 * Used by tests to prove writes are isolated rather than merely asserting they
 * "did not fail".
 */
export function isInsideWorkspace(workspace, target) {
  const rel = path.relative(workspace.root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * The real repository dataset root -- i.e. what the CLI uses when
 * `KB002_GOLDEN_ROOT` is unset. Tests use this to prove the real tree is not
 * written to.
 */
export function realGoldenRoot() {
  return goldenRoot();
}
