// KB-002 active contract version -- single authoritative source.
//
// GOVERNANCE (docs/kb-002/12-contract-admission-semantics.md):
//   The contract defines the semantics; the validator *executes* the contract.
//   A validator must never redefine the authoritative contract version, so this
//   module does NOT hardcode one. It derives the active version from the
//   canonical contract documents, which are the authority.
//
// Why derive instead of hardcode: the previous implementation pinned
// `kb-002.1.0` in code while the repository's authoritative contract had already
// advanced to `kb-002.1.2`. That skew made the validator demand *stale* metadata
// to satisfy Q7 -- the tool silently redefining the contract. Deriving removes
// the second place where the version can drift.
//
// Failure mode is deliberate: if the version cannot be read, this module throws
// rather than falling back to a guess. A validator that cannot determine the
// authoritative version must not pretend it knows one.

import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from '../../../scripts/kb/lib/schema.mjs';

// The authoritative declaration lives in the contract documents. `12-` is the
// frozen authority for admission semantics and states the version line that
// `01-` and `02-` share, so it is read first; the others act as corroboration.
export const CONTRACT_VERSION_SOURCES = [
  'docs/kb-002/12-contract-admission-semantics.md',
  'docs/kb-002/01-golden-dataset-contract.md',
  'docs/kb-002/02-evidence-quality-rubric.md',
];

// Accept both spellings the frozen documents use:
//   - 文档版本：`kb-002.1.2`
//   - 契约版本：`kb-002.1.2`
const DECLARATION_RE = /-\s*(?:文档版本|契约版本)：\s*`(kb-002\.\d+\.\d+)`/;

/**
 * Read the version a single declaration line asserts.
 * Returns null when the file exists but carries no parseable declaration.
 */
export function readDeclaredVersion(relPath) {
  const absolute = path.resolve(REPO_ROOT, relPath);
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch {
    return { relPath, version: null, reason: 'unreadable' };
  }
  const m = text.match(DECLARATION_RE);
  if (!m) return { relPath, version: null, reason: 'no-version-declaration' };
  return { relPath, version: m[1], reason: null };
}

let cached = null;

/**
 * Resolve the canonical active contract version.
 *
 * Reads every declaration source. They must agree: divergent declarations mean
 * the contract itself is ambiguous, which must surface as an error rather than
 * be silently resolved by picking one.
 *
 * @returns {string} e.g. 'kb-002.1.2'
 * @throws  {Error} when the version cannot be determined or the sources disagree
 */
export function getActiveContractVersion() {
  if (cached !== null) return cached;

  const results = CONTRACT_VERSION_SOURCES.map(readDeclaredVersion);
  const readable = results.filter((r) => r.version !== null);

  if (readable.length === 0) {
    const detail = results.map((r) => `${r.relPath} (${r.reason})`).join('; ');
    throw new Error(
      `KB-002 active contract version could not be determined from the contract documents: ${detail}`,
    );
  }

  const distinct = [...new Set(readable.map((r) => r.version))];
  if (distinct.length > 1) {
    const detail = readable.map((r) => `${r.relPath}=${r.version}`).join('; ');
    throw new Error(
      `KB-002 contract documents disagree on the active version; refusing to pick one: ${detail}`,
    );
  }

  cached = distinct[0];
  return cached;
}

/** Test seam: drop the memoised value (used by drift-guard tests). */
export function resetActiveContractVersionCache() {
  cached = null;
}
