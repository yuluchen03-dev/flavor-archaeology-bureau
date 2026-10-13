// KB-002 staging asset integrity protection.
//
// Incident: INCIDENT-E -- STAGING_ASSET_LOSS (see docs/kb-002/13-*). A staging
// candidate carrying real research value was removed silently, and no recovery
// path existed because the asset was never under any protection: it was not
// tracked by git and no manifest recorded that it had existed.
//
// This module implements the minimum corrective scope: it makes the three path
// classes explicit, records a lightweight manifest of staging assets so a loss
// becomes detectable, and provides a non-destructive integrity check.
//
// It deliberately does NOT try to be an artifact database, and it never deletes
// or mutates staging assets. C-4 explicitly forbids over-engineering here.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { REPO_ROOT } from '../../../scripts/kb/lib/schema.mjs';

// ---------------------------------------------------------------------------
// Dataset root for filesystem resolution (KB002-TOOL-FIX-03)
// ---------------------------------------------------------------------------
// The constants below stay REPO-RELATIVE: they are the vocabulary that path
// classification (C-3) is defined against, and tests assert on them directly.
// Only *filesystem resolution* is redirectable, via `KB002_GOLDEN_ROOT`, so a
// test can point the whole dataset at a temp workspace.
//
// Keeping one resolver here (rather than resolving at each call site) is what
// makes the relocation safe: every read/write goes through it.
function goldenRoot() {
  const override = process.env.KB002_GOLDEN_ROOT;
  if (!override) return REPO_ROOT;
  if (!path.isAbsolute(override)) {
    throw new Error(`KB002_GOLDEN_ROOT must be an absolute path, got "${override}"`);
  }
  return override;
}

/** Resolve a repo-relative dataset path against the active dataset root. */
export function resolveDatasetPath(relPath) {
  return path.resolve(goldenRoot(), relPath);
}

/**
 * Resolve a manifest asset only when it is a normalized repo-relative path
 * strictly beneath staging/. This check runs before exists/read/hash/stat. The
 * canonical nearest existing ancestor is also checked to reject symlink escapes.
 */
export function resolveStagingAssetPath(relPath) {
  if (typeof relPath !== 'string' || relPath.length === 0) {
    return { ok: false, problem: 'relative_path must be a non-empty string' };
  }
  if (path.isAbsolute(relPath) || path.win32.isAbsolute(relPath)) {
    return { ok: false, problem: 'absolute paths are not allowed' };
  }
  if (/[A-Za-z]:/.test(relPath) || relPath.startsWith('//') || relPath.startsWith('\\\\')) {
    return { ok: false, problem: 'drive-rooted or UNC paths are not allowed' };
  }
  const normalizedSeparators = relPath.split(String.fromCharCode(92)).join('/');
  // Node's path.isAbsolute follows the host platform. Also recognize POSIX,
  // drive-rooted, and UNC absolute forms so a manifest stays non-absolute when
  // moved between Windows and POSIX hosts.
  const driveRooted = normalizedSeparators.length >= 3
    && /[A-Za-z]/.test(normalizedSeparators[0])
    && normalizedSeparators[1] === ':'
    && normalizedSeparators[2] === '/';
  if (normalizedSeparators.startsWith('/') || driveRooted || normalizedSeparators.startsWith('//')) {
    return { ok: false, problem: 'absolute paths are not allowed' };
  }
  const segments = normalizedSeparators.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    return { ok: false, problem: 'dot-segments are not allowed in staging asset paths' };
  }
  if (path.posix.normalize(normalizedSeparators) !== normalizedSeparators) {
    return { ok: false, problem: 'asset path must be normalized' };
  }
  const prefix = `${STAGING_DIR}/`;
  if (!normalizedSeparators.startsWith(prefix)) {
    return { ok: false, problem: `asset path must be beneath ${STAGING_DIR}/` };
  }
  const root = path.resolve(goldenRoot());
  const stagingRoot = path.resolve(root, STAGING_DIR);
  const absolute = path.resolve(root, ...segments);
  const relToStaging = path.relative(stagingRoot, absolute);
  if (!relToStaging || relToStaging === '..' || relToStaging.startsWith(`..${path.sep}`) || path.isAbsolute(relToStaging)) {
    return { ok: false, problem: 'asset path does not resolve strictly beneath staging root' };
  }

  // Resolve the deepest existing ancestor without probing the target file. This
  // catches a symlinked parent that would redirect access outside staging.
  let ancestor = path.dirname(absolute);
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) return { ok: false, problem: 'asset path has no existing ancestor' };
    ancestor = parent;
  }
  let canonicalAncestor;
  try {
    canonicalAncestor = fs.realpathSync(ancestor);
  } catch {
    return { ok: false, problem: 'asset path ancestor cannot be resolved safely' };
  }
  const canonicalRel = path.relative(stagingRoot, canonicalAncestor);
  if (canonicalRel === '..' || canonicalRel.startsWith(`..${path.sep}`) || path.isAbsolute(canonicalRel)) {
    return { ok: false, problem: 'asset path traverses a symlink outside staging root' };
  }
  return { ok: true, absolute };
}

// ---------------------------------------------------------------------------
// C-3 -- path ownership: three explicit classes
// ---------------------------------------------------------------------------

export const PATH_CLASS = {
  // Machine-derivable. A generator may freely rewrite or clean these.
  GENERATED: 'generated',
  // Research value, not yet production-admitted. Generated tooling must never
  // clean these, and neither may any broad cleanup.
  STAGING: 'staging',
  // The admitted Golden dataset. Only a promotion workflow may mutate these.
  PRODUCTION: 'production',
};

export const GENERATED_DIR = 'data/kb/generated';
export const STAGING_DIR = 'data/kb/golden/staging';
export const PRODUCTION_DIR = 'data/kb/golden';

// Paths that generated-lifecycle tooling is allowed to clean. Anything not
// listed here is out of bounds for a cleanup, which is what C-2 requires.
export const GENERATED_OWNED_DIRS = [GENERATED_DIR];

/**
 * Classify a repo-relative path into one of the three ownership classes.
 * Directory-segment matching (never `startsWith`) so sibling names such as
 * `generated-backup/` cannot be mistaken for `generated/`.
 */
export function classifyPath(relPath) {
  const p = String(relPath).split(path.sep).join('/');
  const inDir = (dir) => p === dir || p.startsWith(`${dir}/`);
  if (inDir(GENERATED_DIR)) return PATH_CLASS.GENERATED;
  if (inDir(STAGING_DIR)) return PATH_CLASS.STAGING;
  if (inDir(PRODUCTION_DIR)) {
    // Anything under data/kb/golden that is not staging/generated/examples is
    // production-shaped (the validator excludes examples/ and generated/ too).
    if (p.includes('/examples/') || p.startsWith(`${PRODUCTION_DIR}/examples/`)) return PATH_CLASS.STAGING;
    return PATH_CLASS.PRODUCTION;
  }
  return null;
}

/**
 * C-2 -- guard for any cleanup. Throws unless every target sits inside a
 * directory the caller demonstrably owns. Broad/over-loose targets are refused
 * before any filesystem operation happens.
 */
export function assertCleanupAllowed(targetRelPath, ownedDirs = GENERATED_OWNED_DIRS) {
  const p = String(targetRelPath).split(path.sep).join('/').replace(/\/+$/, '');
  if (!p) throw new Error('refusing cleanup of an empty path');
  if (p === '.' || p === './' || p === '/') throw new Error(`refusing cleanup of repo root: ${p}`);
  // A wildcard or a bare parent directory is exactly the broad-cleanup shape
  // that C-2 forbids.
  if (/[*?[\]]/.test(p)) throw new Error(`refusing cleanup with wildcard: ${p}`);
  const owned = ownedDirs.some((d) => p === d || p.startsWith(`${d}/`));
  if (!owned) {
    throw new Error(
      `refusing cleanup outside tool-owned directories: ${p} (owned: ${ownedDirs.join(', ')})`,
    );
  }
  return true;
}

// ---------------------------------------------------------------------------
// C-4 -- lightweight staging asset manifest
// ---------------------------------------------------------------------------

export const MANIFEST_REL_PATH = `${STAGING_DIR}/manifest.json`;

// ---------------------------------------------------------------------------
// Manifest schema validation -- FAIL CLOSED (KB002-TOOL-FIX-04)
// ---------------------------------------------------------------------------
// The previous implementation read `manifest.assets` defensively:
//
//     const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
//
// That silently turned ANY malformed manifest into an empty asset set, so a
// manifest written with the wrong field name (e.g. `entries`) reported zero
// assets and NO findings -- `--integrity` exited 0 and the INCIDENT-E protection
// was silently disabled. A protection that fails open is not a protection.
//
// The rule is now explicit: an empty manifest is legal, but ONLY with the
// correct shape. `{"assets": []}` passes; `{"entries": []}` fails.
export const MANIFEST_SCHEMA_INVALID = 'KB002_MANIFEST_SCHEMA_INVALID';
export const MANIFEST_ASSET_PATH_INVALID = 'KB002_MANIFEST_ASSET_PATH_INVALID';

// Fields every asset entry must carry to be usable by the integrity check.
const REQUIRED_ASSET_FIELDS = ['asset_logical_id', 'relative_path', 'status'];

/**
 * Validate a manifest against the formal schema.
 * Returns { ok: true } or { ok: false, problems: [...] }. Never throws, never
 * degrades to an empty asset set -- the caller decides the exit code.
 */
export function validateManifestSchema(manifest) {
  const problems = [];

  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      ok: false,
      problems: [`manifest root must be a JSON object, found ${Array.isArray(manifest) ? 'array' : typeof manifest}`],
    };
  }

  // Unknown top-level shapes must not be silently accepted: without `assets`
  // there is no way to know whether the manifest is empty or simply wrong.
  if (!Object.prototype.hasOwnProperty.call(manifest, 'assets')) {
    const present = Object.keys(manifest);
    return {
      ok: false,
      problems: [
        `manifest is missing the required "assets" key (found top-level keys: ${present.join(', ') || 'none'})`,
      ],
    };
  }

  if (!Array.isArray(manifest.assets)) {
    const kind = manifest.assets === null ? 'null' : typeof manifest.assets;
    return { ok: false, problems: [`manifest.assets must be an array, found ${kind}`] };
  }

  manifest.assets.forEach((asset, i) => {
    if (asset === null || typeof asset !== 'object' || Array.isArray(asset)) {
      problems.push(`assets[${i}] must be an object, found ${Array.isArray(asset) ? 'array' : typeof asset}`);
      return;
    }
    for (const field of REQUIRED_ASSET_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(asset, field)) {
        problems.push(`assets[${i}] is missing the required field "${field}"`);
      }
    }
    if (typeof asset.relative_path !== 'string' || asset.relative_path.length === 0) {
      problems.push(`assets[${i}].relative_path must be a non-empty string`);
    }
  });

  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}

export function sha256OfFile(absolutePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

/**
 * Build one manifest entry for a staging asset. `generatedAt` is injected rather
 * than read from the clock so callers stay deterministic in tests.
 */
export function buildManifestEntry(relPath, { sourceTask = null, generatedAt = null, promotionStatus = 'not_promoted' } = {}) {
  const normalized = String(relPath).split(path.sep).join('/');
  const absolute = resolveDatasetPath(normalized);
  const exists = fs.existsSync(absolute);
  const entry = {
    asset_logical_id: path.basename(normalized, '.kb.json'),
    relative_path: normalized,
    status: exists ? 'present' : 'missing',
    byte_size: null,
    sha256: null,
    generated_or_reconstructed_at: generatedAt,
    source_task: sourceTask,
    lifecycle_class: PATH_CLASS.STAGING,
    promotion_status: promotionStatus,
  };
  if (exists) {
    entry.byte_size = fs.statSync(absolute).size;
    entry.sha256 = sha256OfFile(absolute);
  }
  return entry;
}

export function writeManifest(entries) {
  const absolute = resolveDatasetPath(MANIFEST_REL_PATH);
  const payload = {
    manifest_version: 1,
    lifecycle_class: PATH_CLASS.STAGING,
    note: 'Lightweight staging asset manifest (INCIDENT-E / C-4). Not an artifact database.',
    assets: entries,
  };
  atomicWriteJson(absolute, payload);
  return payload;
}

export function readManifest() {
  const absolute = resolveDatasetPath(MANIFEST_REL_PATH);
  if (!fs.existsSync(absolute)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read the manifest together with its raw text and its schema verdict.
 * Unparseable JSON is reported as a schema problem rather than silently null,
 * so a corrupt manifest cannot pass as "no manifest".
 */
export function readManifestChecked() {
  const absolute = resolveDatasetPath(MANIFEST_REL_PATH);
  if (!fs.existsSync(absolute)) {
    return { present: false, raw: null, manifest: null, schema: { ok: true, problems: [] } };
  }
  let raw;
  try {
    raw = fs.readFileSync(absolute, 'utf8');
  } catch {
    return {
      present: true,
      raw: null,
      manifest: null,
      schema: { ok: false, problems: ['manifest exists but could not be read'] },
    };
  }
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return {
      present: true,
      raw,
      manifest: null,
      schema: { ok: false, problems: ['manifest is not valid JSON'] },
    };
  }
  return { present: true, raw, manifest, schema: validateManifestSchema(manifest) };
}

// ---------------------------------------------------------------------------
// C-5 -- integrity check; a manifest must never be able to assert existence
// ---------------------------------------------------------------------------

/**
 * Compare a manifest against the filesystem.
 * Returns findings; an entry claiming presence whose file is gone is reported as
 * STAGING_ASSET_MISSING -- the manifest alone never proves a candidate is whole.
 */
export function checkStagingIntegrity(manifest = readManifest()) {
  const findings = [];
  if (!manifest) {
    return { findings, assetCount: 0, manifestPresent: false };
  }

  // FAIL CLOSED: a malformed manifest is an explicit finding, not an empty asset
  // set. Falling back to [] here is what let a wrong field name silently disable
  // the INCIDENT-E protection.
  const schema = validateManifestSchema(manifest);
  if (!schema.ok) {
    return {
      findings: [{
        code: MANIFEST_SCHEMA_INVALID,
        relative_path: MANIFEST_REL_PATH,
        message: `staging manifest does not satisfy the required schema: ${schema.problems.join('; ')}`,
      }],
      assetCount: 0,
      manifestPresent: true,
      schemaOk: false,
      schemaProblems: schema.problems,
    };
  }

  const assets = manifest.assets;
  for (const asset of assets) {
    const safePath = resolveStagingAssetPath(asset.relative_path);
    if (!safePath.ok) {
      findings.push({
        code: MANIFEST_ASSET_PATH_INVALID,
        relative_path: asset.relative_path,
        message: `manifest staging asset path is unsafe: ${safePath.problem}`,
      });
      continue;
    }
    const absolute = safePath.absolute;
    const exists = fs.existsSync(absolute);
    if (!exists) {
      findings.push({
        code: 'STAGING_ASSET_MISSING',
        relative_path: asset.relative_path,
        message: `manifest records this staging asset as "${asset.status}" but no file exists at ${asset.relative_path}`,
      });
      continue;
    }
    const actual = sha256OfFile(absolute);
    if (asset.sha256 && actual !== asset.sha256) {
      findings.push({
        code: 'STAGING_ASSET_MODIFIED',
        relative_path: asset.relative_path,
        message: `sha256 mismatch: manifest ${asset.sha256} != actual ${actual}`,
      });
    }
    const size = fs.statSync(absolute).size;
    if (typeof asset.byte_size === 'number' && asset.byte_size !== size) {
      findings.push({
        code: 'STAGING_ASSET_MODIFIED',
        relative_path: asset.relative_path,
        message: `byte size mismatch: manifest ${asset.byte_size} != actual ${size}`,
      });
    }
  }
  return { findings, assetCount: assets.length, manifestPresent: true, schemaOk: true, schemaProblems: [] };
}

/**
 * C-11 -- asset-presence integrity is a different question from schema/quality
 * validation. A validator exit code of 0 over an empty staging directory says
 * nothing about whether a candidate is healthy, and callers must not conflate
 * the two.
 */
export function stagingPresenceSummary() {
  const dir = resolveDatasetPath(STAGING_DIR);
  const candidates = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => n.endsWith('.kb.json'))
    : [];
  // Use the checked reader so unreadable / unparseable manifests surface as
  // schema findings instead of collapsing to "no manifest" (also fail-open).
  const checked = readManifestChecked();
  const integrity = checked.present && !checked.schema.ok
    ? {
      findings: [{
        code: MANIFEST_SCHEMA_INVALID,
        relative_path: MANIFEST_REL_PATH,
        message: `staging manifest does not satisfy the required schema: ${checked.schema.problems.join('; ')}`,
      }],
      assetCount: 0,
      manifestPresent: true,
    }
    : checkStagingIntegrity(checked.manifest);
  return {
    candidateCount: candidates.length,
    candidates,
    manifestPresent: integrity.manifestPresent,
    manifestAssetCount: integrity.assetCount,
    integrityFindings: integrity.findings,
    // Explicit: an empty staging area is NOT evidence that a candidate exists
    // or is healthy.
    assetPresenceStatus: candidates.length === 0 ? 'NO_CANDIDATE_PRESENT' : 'CANDIDATE_PRESENT',
  };
}

// ---------------------------------------------------------------------------
// C-6 -- atomic write for staging candidates
// ---------------------------------------------------------------------------

/**
 * Write bytes to `absolutePath` atomically: temp file in the same directory,
 * flush, then rename over the target. Same-directory temp keeps the rename on
 * one volume, and rename is the atomic step. Platform durability guarantees
 * beyond that are intentionally out of scope (C-6).
 */
export function atomicWriteFile(absolutePath, contents) {
  const dir = path.dirname(absolutePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(absolutePath)}.tmp-${process.pid}-${Date.now()}`);
  let fd;
  try {
    fd = fs.openSync(tmp, 'w');
    fs.writeFileSync(fd, contents);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tmp, absolutePath);
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* already closed */ }
    }
    try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ }
    throw error;
  }
  return absolutePath;
}

export function atomicWriteJson(absolutePath, value) {
  return atomicWriteFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}
