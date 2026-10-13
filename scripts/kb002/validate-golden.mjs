#!/usr/bin/env node
// KB-002 Golden dataset validator CLI.
//
// Contract sources (frozen):
//   docs/kb-002/01-golden-dataset-contract.md  (kb-002.1.0) sections 2, 3, 9, 10
//   docs/kb-002/02-evidence-quality-rubric.md  (kb-002.1.0) sections 1-8
//
// Usage:
//   node scripts/kb002/validate-golden.mjs [<path>...]
//   node scripts/kb002/validate-golden.mjs --dataset [<dir>]
//   node scripts/kb002/validate-golden.mjs --staging [<path> | <dir>]
//   node scripts/kb002/validate-golden.mjs --fixture [<path> | <dir>]
//   node scripts/kb002/validate-golden.mjs --integrity
//   node scripts/kb002/validate-golden.mjs --summary
//
// Fixture classes (FIX_SPEC-KB002-4 / t24 sections 15-16):
//   A "valid fixture" no longer means "fabricated enough fields to reach E3".
//   It means "valid within the contract scope it tests". Two classes exist:
//     * structural fixture  -- exercises schema/validator mechanics. It is
//       synthetic and therefore may NOT satisfy production admission. Q3
//       (dish < E3) is expected for it and is NOT a defect.
//     * production-like fixture -- exercises real admission semantics and must
//       satisfy them honestly, with no fabricated imprint data.
//   --fixture applies the structural-fixture expectation set: findings that are
//   the *consequence of honest synthetic data* (Q3 and the level/status
//   declarations that follow from it) are reported but do not fail the run.
//   Q3 itself is never disabled: it still fires, and it still blocks
//   --dataset / production admission unconditionally.
//
// Exit codes (same semantics as KB-001 section 12):
//   0 = pass, 1 = validation failure, 2 = runtime error.
// stdout carries JSONL findings only; stderr carries the human summary.
// This tool never modifies its inputs.
//
// Layer separation (rubric section 1):
//   L1 structural conformance -> KB-001 validator, reused via scripts/kb/lib.
//   L2 KB-002 evidence rules  -> scripts/kb002/lib/golden-rules.mjs.
// L2 is never treated as proof of source veracity.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ErrorCollector } from '../../scripts/kb/lib/errors.mjs';
import { DOC_EXTENSION, REPO_ROOT, SchemaUnreadableError, loadSchema } from '../../scripts/kb/lib/schema.mjs';
import { validateDocument, validateDocuments } from '../../scripts/kb/lib/validate.mjs';
import { runGoldenRules } from './lib/golden-rules.mjs';
import { stagingPresenceSummary } from './lib/staging-integrity.mjs';

// ---------------------------------------------------------------------------
// Dataset root injection (KB002-TOOL-FIX-03)
// ---------------------------------------------------------------------------
// Tests must be able to validate a throwaway dataset in a temp workspace instead
// of writing into the real `data/kb/golden/**` tree. The paths below are
// repo-relative, so changing the working directory cannot isolate them.
//
// `KB002_GOLDEN_ROOT` is therefore the single, explicit override: an ABSOLUTE
// path to a directory that plays the role of the repo root for Dataset purposes.
// Everything else (schema, KB-001 lib) keeps resolving against the real repo.
//
// Default behaviour is unchanged: unset -> the real repo root is used.
export function goldenRoot() {
  const override = process.env.KB002_GOLDEN_ROOT;
  if (!override) return REPO_ROOT;
  if (!path.isAbsolute(override)) {
    throw new Error(`KB002_GOLDEN_ROOT must be an absolute path, got "${override}"`);
  }
  return override;
}

// Repo-relative constants (unchanged defaults, resolved against goldenRoot()).
const DEFAULT_TARGET = 'data/kb/golden/examples/valid';
const DATASET_TARGET = 'data/kb/golden';
const STAGING_TARGET = 'data/kb/golden/staging';
// Only the *structural* fixture set. examples/invalid is a negative corpus whose
// whole purpose is to fail, so it must never be swept into a passing run.
const FIXTURE_TARGET = 'data/kb/golden/examples/valid';

// ---------------------------------------------------------------------------
// Dataset status -- SINGLE AUTHORITATIVE MAPPING (KB002-TOOL-ALIGN-02)
// ---------------------------------------------------------------------------
// Contract: docs/kb-002/12-contract-admission-semantics.md section 5.
//   EMPTY_GOLDEN_SET     count = 0
//   PARTIAL_GOLDEN_SET   0 < count < target
//   COMPLETE_GOLDEN_SET  count = target
// and section 5.1: "0 道合格 ⟹ EMPTY_GOLDEN_SET，不是 PARTIAL_GOLDEN_SET".
//
// Every code path that reports a status MUST go through this function. Keeping
// the mapping in one place is the point: the previous implementation hardcoded
// PARTIAL_GOLDEN_SET on the empty-set path and used the retired name
// GOLDEN_10_COMPLETE elsewhere, so the two paths could drift apart.
export const GOLDEN_SET_STATUS = {
  EMPTY: 'EMPTY_GOLDEN_SET',
  PARTIAL: 'PARTIAL_GOLDEN_SET',
  COMPLETE: 'COMPLETE_GOLDEN_SET',
};

// Contract target: the Golden dataset aims for 10 dishes (12- section 5).
const MAX_TARGET = 10;

// Historical name retired by the kb-002.1.2 contract revision. Accepted only so
// a stale caller cannot silently reintroduce it.
const RETIRED_STATUS_NAMES = new Set(['GOLDEN_10_COMPLETE']);

/**
 * Derive the dataset status from a REAL qualified count.
 * The label is never a literal passed in by a caller -- that is what let the
 * empty-set path drift.
 *
 * @param {number} qualifiedCount production qualified record count
 * @param {number} target          dataset target (default 10)
 * @returns {{status: string, qualifiedCount: number, shortfall: number, knownDataGap: number}}
 */
export function deriveDatasetStatus(qualifiedCount, target = 10) {
  if (!Number.isFinite(qualifiedCount) || qualifiedCount < 0) {
    throw new Error(`deriveDatasetStatus requires a non-negative real count, got ${qualifiedCount}`);
  }
  const count = qualifiedCount;
  let status;
  if (count === 0) status = GOLDEN_SET_STATUS.EMPTY;
  else if (count < target) status = GOLDEN_SET_STATUS.PARTIAL;
  else status = GOLDEN_SET_STATUS.COMPLETE;

  if (RETIRED_STATUS_NAMES.has(status)) {
    throw new Error(`deriveDatasetStatus produced a retired status name: ${status}`);
  }

  const shortfall = Math.max(0, target - count);
  return {
    status,
    qualifiedCount: count,
    shortfall,
    // DS5: any shortfall must be registered as KNOWN_DATA_GAP.
    knownDataGap: shortfall,
  };
}

/** Human/机器 readback of the numeric block, derived from one source. */
export function formatDatasetStatusLines({ qualifiedCount, shortfall, status, knownDataGap }) {
  return [
    `QUALIFIED_GOLDEN_COUNT = ${qualifiedCount}`,
    `SHORTFALL = ${shortfall}`,
    `STATUS = ${status}`,
    ...(status !== GOLDEN_SET_STATUS.COMPLETE ? [`KNOWN_DATA_GAP = ${knownDataGap}`] : []),
  ].join('\n');
}

// Findings a *structural* fixture may legitimately carry. These are the direct
// consequences of a synthetic source honestly declaring that it has no
// authority and no verifiable publication data. Everything else still fails.
//
// Q3 (KB002_DISH_BELOW_E3) is deliberately in this set: a synthetic fixture
// cannot reach E3 without fabricating an authoritative source, which is exactly
// what this repair removed. Q3 keeps firing for production admission because
// --fixture is never combined with --dataset.
export const STRUCTURAL_FIXTURE_EXPECTED_CODES = new Set([
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

// ---------------------------------------------------------------------------
// Finding classification: candidate validity vs production admissibility
// (KB002-TOOL-ALIGN-03)
// ---------------------------------------------------------------------------
// Two distinct questions must never share one blocking verdict:
//
//   1. Is this a VALID CANDIDATE?             -> staging validity
//   2. May this enter the production dataset? -> production admissibility
//
// The contract (12- section 5 / 01- section 10.2) allows a staging candidate to
// carry qualified=false and Evidence Level E0/E1/E2. Q3 (>=E3) is a PRODUCTION
// ADMISSION GATE, so an honest low-evidence candidate is a legitimate staging
// record: its Q3 finding is real and is reported, but it must not prevent the
// candidate from being preserved.
//
// Lying about one's own state is different. A file declaring qualified=true when
// the computation says false, or a dish level above the computed level, is not
// merely inadmissible -- it is structurally dishonest, and stays blocking even
// in staging (contract sections 7 and 8).
export const PRODUCTION_ADMISSION_CODES = new Set([
  'KB002_DISH_BELOW_E3',
]);

// Display paths are reported relative to the dataset root in effect, so a temp
// workspace shows temp-relative paths rather than leaking the real repo layout.
function toRepoRelative(absolutePath) {
  return path.relative(goldenRoot(), absolutePath).split(path.sep).join('/');
}

function collectDocuments(target) {
  const absolute = path.resolve(goldenRoot(), target);
  let stats;
  try {
    stats = fs.statSync(absolute);
  } catch {
    return { error: `target path does not exist: ${toRepoRelative(absolute)}`, files: [] };
  }
  if (stats.isFile()) return { files: [absolute], error: null };
  if (!stats.isDirectory()) {
    return { error: `target path is neither a file nor a directory: ${toRepoRelative(absolute)}`, files: [] };
  }
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(DOC_EXTENSION)) found.push(full);
    }
  };
  walk(absolute);
  found.sort((a, b) => (toRepoRelative(a) < toRepoRelative(b) ? -1 : toRepoRelative(a) > toRepoRelative(b) ? 1 : 0));
  return { files: found, error: null };
}

function parseArgs(argv) {
  const targets = [];
  let datasetMode = false;
  let stagingMode = false;
  let integrityMode = false;
  let fixtureMode = false;
  let summary = false;
  let datasetTarget = DATASET_TARGET;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dataset') {
      datasetMode = true;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        datasetTarget = next;
        i += 1;
      }
    } else if (token === '--staging') {
      stagingMode = true;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        targets.push(next);
        i += 1;
      }
    } else if (token === '--fixture') {
      fixtureMode = true;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        targets.push(next);
        i += 1;
      }
    } else if (token === '--summary') {
      summary = true;
    } else if (token === '--integrity') {
      integrityMode = true;
    } else {
      targets.push(token);
    }
  }
  return { targets, datasetMode, stagingMode, fixtureMode, integrityMode, summary, datasetTarget };
}

function main(argv) {
  const { targets, datasetMode, stagingMode, fixtureMode, integrityMode, summary, datasetTarget } = parseArgs(argv);
  if (datasetMode && stagingMode) {
    process.stderr.write('KB-002 Golden validation FAILED: --dataset and --staging are mutually exclusive\n');
    return 2;
  }
  // Manifest/asset integrity is part of candidate validity, not merely an
  // optional report. Enforce it for both --integrity and --staging; the former
  // exits after reporting, while staging proceeds to document validation only
  // when all declared assets are present and unmodified.
  if (integrityMode || stagingMode) {
    const summaryInfo = stagingPresenceSummary();
    process.stderr.write(`KB-002 staging asset presence: ${summaryInfo.assetPresenceStatus}\n`);
    process.stderr.write(`STAGING_CANDIDATE_COUNT = ${summaryInfo.candidateCount}\n`);
    process.stderr.write(`STAGING_MANIFEST_PRESENT = ${summaryInfo.manifestPresent}\n`);
    process.stderr.write(`STAGING_MANIFEST_ASSET_COUNT = ${summaryInfo.manifestAssetCount}\n`);
    if (summaryInfo.integrityFindings.length > 0) {
      for (const f of summaryInfo.integrityFindings) {
        process.stdout.write(`${JSON.stringify({ file: f.relative_path, entityOrRelationId: '-', fieldPath: '-', code: f.code, message: f.message })}\n`);
      }
      process.stderr.write(`KB-002 staging integrity FAILED: ${summaryInfo.integrityFindings.length} finding(s)\n`);
      return 1;
    }
    if (integrityMode) return 0;
  }
  // --staging validates candidate artefacts in place. It is deliberately a
  // single-file/single-dir view: staging files are never part of the production
  // dataset set, so they must be named explicitly rather than discovered.
  const requested = targets.length > 0
    ? targets
    : [datasetMode ? datasetTarget
      : stagingMode ? STAGING_TARGET
        : fixtureMode ? FIXTURE_TARGET
          : DEFAULT_TARGET];
  // The default target IS the structural fixture corpus. Its findings are
  // therefore judged by the structural-fixture expectation set, otherwise
  // `node validate-golden.mjs` would demand that a synthetic fixture fabricate
  // an authoritative source -- exactly the defect this repair removed.
  // An explicit path or --dataset still gets the strict treatment.
  const structuralFixtureScope = (fixtureMode || targets.length === 0) && !datasetMode && !stagingMode;

  let schema;
  try {
    schema = loadSchema();
  } catch (error) {
    if (error instanceof SchemaUnreadableError) {
      const collector = new ErrorCollector();
      collector.add({ file: '-', entityOrRelationId: '-', fieldPath: '-', code: 'E_SCHEMA_UNREADABLE', message: error.message });
      process.stdout.write(`${collector.toJSONL()}\n`);
      process.stderr.write(`KB-002 Golden validation FAILED: ${error.message}\n`);
      return 2;
    }
    throw error;
  }

  const files = [];
  for (const target of requested) {
    const result = collectDocuments(target);
    if (result.error) {
      const collector = new ErrorCollector();
      collector.add({ file: '-', entityOrRelationId: '-', fieldPath: '-', code: 'E_DOC_SHAPE', message: result.error });
      process.stdout.write(`${collector.toJSONL()}\n`);
      process.stderr.write(`KB-002 Golden validation FAILED: ${result.error}\n`);
      return 2;
    }
    files.push(...result.files);
  }

  // Production dataset mode must ignore anything that is not production Golden
  // data. Three path classes are excluded (contract H6 + section 8 Rule E):
  //   examples/   - fixtures and negative fixtures
  //   staging/    - candidate artefacts awaiting a validator PASS before promotion
  //   generated/  - derived tool output
  // Only top-level golden_NNN.kb.json files count toward the dataset arithmetic.
  // FIX_SPEC-KB002-4 (A): staging/ was previously NOT excluded, so a staged
  // candidate was counted as production data and made --dataset fail.
  const NON_PRODUCTION_SEGMENT = /(^|[\\/])(examples|staging|generated)([\\/]|$)/;
  const effectiveFiles = datasetMode
    ? files.filter((f) => !NON_PRODUCTION_SEGMENT.test(toRepoRelative(f)))
    : files;

  const collector = new ErrorCollector();

  if (effectiveFiles.length === 0) {
    // An empty *production* dataset is legitimate before KB-002F+ exists, and an
    // empty *staging* area simply means no candidate is awaiting promotion.
    // An empty explicitly-requested path is not allowed to pass silently.
    if (datasetMode) {
      process.stderr.write('KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).\n');
      // Status is DERIVED from the real qualified count (here: no records means
      // count 0). The contract maps that to EMPTY_GOLDEN_SET, not
      // PARTIAL_GOLDEN_SET -- section 5.1 is explicit about it.
      process.stderr.write(`${formatDatasetStatusLines(deriveDatasetStatus(0))}\n`);
      return 0;
    }
    if (stagingMode) {
      process.stderr.write('KB-002 Golden staging: 0 candidate file(s) awaiting promotion.\n');
      return 0;
    }
    collector.add({
      file: toRepoRelative(path.resolve(goldenRoot(), requested[0])),
      entityOrRelationId: '-',
      fieldPath: '-',
      code: 'E_DOC_SHAPE',
      message: `no ${DOC_EXTENSION} documents found under the requested path`,
    });
    process.stdout.write(`${collector.toJSONL()}\n`);
    process.stderr.write('KB-002 Golden validation FAILED: 1 error(s) across 1 file(s)\n');
    return 1;
  }

  const documents = [];
  let entityCount = 0;
  let relationCount = 0;

  for (const absolute of effectiveFiles) {
    const relative = toRepoRelative(absolute);
    let rawText;
    try {
      rawText = fs.readFileSync(absolute, 'utf8');
    } catch {
      collector.add({ file: relative, entityOrRelationId: '-', fieldPath: '-', code: 'E_FILE_PARSE', message: 'file could not be read' });
      continue;
    }

    // L1 -- KB-001 structural validation (reused, never reimplemented)
    const result = validateDocument({ schema, file: relative, rawText });
    for (const record of result.errors) collector.add(record);
    entityCount += result.entities.length;
    relationCount += result.relations.length;

    let raw = null;
    try {
      raw = JSON.parse(rawText);
    } catch {
      raw = null; // malformed JSON is already reported by L1
    }

    documents.push({ file: relative, entities: result.entities, relations: result.relations, raw });
  }

  // L1 cross-document checks (duplicate ids, dangling refs, ...)
  validateDocuments({ schema, documents: documents.map(({ file, entities, relations }) => ({ file, entities, relations })), errors: collector });

  // L2 -- KB-002 evidence rules
  const golden = runGoldenRules({ documents, collector });

  const jsonl = collector.toJSONL();
  if (jsonl.length > 0) process.stdout.write(`${jsonl}\n`);

  const fileCount = new Set(documents.map((d) => d.file)).size;

  if (datasetMode || summary) {
    // Route through the SAME authoritative mapping as the empty-set path, using
    // the real computed qualified count. `golden.status` from the rules module
    // still carries the retired name, so it is deliberately not used as the
    // label source -- the count is.
    const derived = deriveDatasetStatus(golden.qualifiedGoldenCount, MAX_TARGET);
    if (derived.qualifiedCount !== golden.qualifiedGoldenCount) {
      throw new Error('dataset status derivation disagrees with the computed qualified count');
    }
    process.stderr.write(`${formatDatasetStatusLines(derived)}\n`);
  }

  // A clean candidate is also explicitly classified; otherwise machine callers
  // could not distinguish a staging PASS from a production-admission PASS.
  if (stagingMode && collector.ok) {
    process.stderr.write('STAGING_VALID = true\n');
    process.stderr.write('PRODUCTION_ADMISSIBLE = true\n');
    process.stderr.write(`KB-002 staging candidate PASSED: ${fileCount} file(s), ${entityCount} entities, ${relationCount} relations\n`);
    return 0;
  }

  if (!collector.ok) {
    // In structural-fixture mode, the findings that are the *honest consequence*
    // of a synthetic source (no authority, no verifiable imprint) are expected:
    // the fixture is below E3 by design and Q3 says so. They are still reported
    // above, but they do not fail the structural-fixture scope. Any finding
    // outside that set -- a schema break, a dangling reference, a non-Q3 rule --
    // still fails. Q3 is not suppressed: it remains in the output and it still
    // blocks --dataset / production admission.
    if (structuralFixtureScope) {
      const unexpected = collector.records.filter((r) => !STRUCTURAL_FIXTURE_EXPECTED_CODES.has(r.code));
      if (unexpected.length === 0) {
        process.stderr.write(`KB-002 structural fixtures PASSED (${collector.count} expected below-threshold finding(s) across ${fileCount} file(s)): ${[...new Set(collector.records.map((r) => r.code))].sort().join(', ')}\n`);
        return 0;
      }
      process.stderr.write(`KB-002 structural fixtures FAILED: ${unexpected.length} unexpected finding(s) across ${fileCount} file(s)\n`);
      return 1;
    }
    // Staging mode asks "is this a valid, honest candidate?" -- NOT "may this
    // enter production?". A candidate whose only findings are production-
    // admission findings (Q3 and friends) is a legitimate, preservable research
    // record; its findings are still printed above and it is still reported as
    // not production-admissible. Dishonesty findings (declared-vs-computed
    // mismatches) and every structural finding remain blocking here too.
    if (stagingMode) {
      const blocking = collector.records.filter(
        (r) => !PRODUCTION_ADMISSION_CODES.has(r.code),
      );
      const admissionFindings = collector.records.filter(
        (r) => PRODUCTION_ADMISSION_CODES.has(r.code),
      );
      if (blocking.length === 0) {
        const admission = admissionFindings.length === 0;
        process.stderr.write(`STAGING_VALID = true\n`);
        process.stderr.write(`PRODUCTION_ADMISSIBLE = ${admission}\n`);
        if (!admission) {
          process.stderr.write(
            `KB-002 staging candidate PASSED (not production-admissible): ${admissionFindings.length} production-admission finding(s) reported above\n`,
          );
        } else {
          process.stderr.write(
            `KB-002 staging candidate PASSED: ${fileCount} file(s), ${entityCount} entities, ${relationCount} relations\n`,
          );
        }
        return 0;
      }
      process.stderr.write(`KB-002 staging candidate FAILED: ${blocking.length} blocking finding(s) across ${fileCount} file(s)\n`);
      return 1;
    }
    process.stderr.write(`KB-002 Golden validation FAILED: ${collector.count} error(s) across ${fileCount} file(s)\n`);
    return 1;
  }

  process.stderr.write(`KB-002 Golden validation PASSED: ${fileCount} file(s), ${entityCount} entities, ${relationCount} relations\n`);
  return 0;
}

// Run the CLI only when executed directly. Importing this module (which tests do,
// to exercise deriveDatasetStatus) must not execute a validation run as a side
// effect. Comparability note: Node compares the resolved module path, and on
// Windows the entry path uses backslashes, so both forms are normalised.
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  const normalize = (p) => path.resolve(p).split(path.sep).join('/');
  return normalize(entry) === normalize(fileURLToPath(import.meta.url));
})();

if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
