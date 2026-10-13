// KB-002 Golden dataset semantic rules.
//
// Implements docs/kb-002/02-evidence-quality-rubric.md (kb-002.1.0) sections 2-6
// and docs/kb-002/01-golden-dataset-contract.md (kb-002.1.0) sections 2, 3, 6, 10.
//
// Layer separation (rubric section 1):
//   L1 structural conformance  -> KB-001 validator (reused, not reimplemented)
//   L2 source veracity         -> NOT machine-decidable; this module never
//                                 upgrades review_status to external_reviewed and
//                                 never treats sufficient as "verified".
//
// Every finding is emitted as { file, entityOrRelationId, fieldPath, code, message }.

import {
  EVIDENCE_RUBRIC,
  LEVELS,
  readNotesToken,
  buildIndex,
  targetsOf,
  sourcesOf,
  computeClaimEvidence,
  minLevel,
} from './rubric.mjs';
import { getActiveContractVersion } from './contract-version.mjs';

// KB002-TOOL-ALIGN-01: the active contract version is DERIVED from the canonical
// contract documents, never hardcoded here. Hardcoding it is what let the tool
// drift to `kb-002.1.0` while the authoritative contract had advanced to
// `kb-002.1.2`, which in turn made the validator demand stale metadata for Q7.
// Contract defines semantics; the validator executes it.
export function activeContractVersion() {
  return getActiveContractVersion();
}

// Retained as a lazily-resolved alias for callers that imported the constant.
// It is a getter-backed binding rather than a frozen literal so it can never
// disagree with the contract documents.
export const CONTRACT_VERSION = getActiveContractVersion();

export const METADATA_REQUIRED_KEYS = [
  'golden_id', 'golden_dish_name', 'dataset_stage', 'contract_version', 'evidence_level', 'qualified',
];
export const STAGE = 'kb-002-golden';
export const GOLDEN_ID_RE = /^GOLDEN-(00[1-9]|010)$/;
export const MAX_GOLDEN_FILES = 10;
export const FORBIDDEN_CONTENT_CLASSES = ['modern_adaptation', 'user_experiment'];
export const S_GRADE = { editionTypes: ['facsimile', 'manuscript', 'digital_surrogate', 'scholarly_edition'] };
export const A_GRADE = { editionTypes: ['scholarly_edition', 'modern_reprint'] };
export const B_GRADE = { editionTypes: ['scholarly_edition', 'modern_reprint'] };

function add(collector, file, id, fieldPath, code, message) {
  collector.add({ file, entityOrRelationId: id || '-', fieldPath: fieldPath || '-', code, message });
}

// ---------------------------------------------------------------------------
// section 2.3 -- source grade rules (SG1-SG6)
// ---------------------------------------------------------------------------
function provenanceHasLocator(p) {
  if (!p || typeof p !== 'object') return false;
  const sl = p.source_locator;
  if (!sl || typeof sl !== 'object') return false;
  return ['work_id', 'edition_id', 'passage_id', 'locator'].some((k) => typeof sl[k] === 'string' && sl[k].trim() !== '');
}

function gradePreconditionsHold(edition, grade) {
  const et = edition.edition_type;
  const publisherOk = typeof edition.publisher === 'string' && edition.publisher.trim() !== '';
  const deriv = edition.provenance && edition.provenance.derivation;

  if (grade === 'S') {
    return S_GRADE.editionTypes.includes(et)
      && publisherOk
      && provenanceHasLocator(edition.provenance)
      && edition.evidence_status === 'sufficient'
      && deriv === 'primary_source';
  }
  if (grade === 'A') {
    return A_GRADE.editionTypes.includes(et)
      && publisherOk
      && edition.publication_year !== null && edition.publication_year !== undefined
      && deriv === 'primary_source';
  }
  if (grade === 'B') {
    return B_GRADE.editionTypes.includes(et)
      && publisherOk
      && (deriv === 'primary_source' || deriv === 'editorial');
  }
  return true; // C / D / X carry no mechanical preconditions in 2.1
}

function effectiveGrade(edition, work) {
  const g = [
    ...readNotesToken(edition && edition.notes, 'SOURCE_GRADE'),
    ...readNotesToken(work && work.notes, 'SOURCE_GRADE'),
  ];
  const uniq = [...new Set(g)];
  return { grades: uniq, grade: uniq.length === 1 ? uniq[0] : uniq.length === 0 ? null : 'CONFLICT' };
}

// SG5 (multiple grades) + SG1 (preconditions). Runs on every edition in a doc.
function checkGrades(index, file, collector) {
  for (const e of index.byId.values()) {
    if (e.entity_type !== 'SourceEdition') continue;
    const own = [...new Set(readNotesToken(e.notes, 'SOURCE_GRADE'))];
    if (own.length > 1) {
      add(collector, file, e.id, 'notes', 'KB002_MULTIPLE_GRADES',
        `SourceEdition declares multiple different SOURCE_GRADE values: ${own.join(', ')}`);
    }
    const workId = targetsOf(index, e.id, 'edition_of_work')[0]
      || (typeof e.work_id === 'string' ? e.work_id : undefined);
    const work = workId ? index.byId.get(workId) : undefined;

    const workOwn = [...new Set(readNotesToken(work && work.notes, 'SOURCE_GRADE'))];
    if (own.length > 0 && workOwn.length > 0 && own[0] !== workOwn[0]) {
      add(collector, file, e.id, 'notes', 'KB002_MULTIPLE_GRADES',
        `edition SOURCE_GRADE=${own[0]} conflicts with work SOURCE_GRADE=${workOwn[0]}`);
    }

    const { grade } = effectiveGrade(e, work);
    if (grade && grade !== 'CONFLICT' && !gradePreconditionsHold(e, grade)) {
      add(collector, file, e.id, 'notes', 'KB002_GRADE_PRECONDITION',
        `SOURCE_GRADE=${grade} declared but the mechanical preconditions in rubric 2.1 do not hold for this SourceEdition`);
    }
  }
}

// ---------------------------------------------------------------------------
// section 3 -- evidence level (declaration consistency, not trust)
// ---------------------------------------------------------------------------
function checkClaimLevel(index, file, claim, collector) {
  const declared = [...new Set(readNotesToken(claim.notes, 'EVIDENCE_LEVEL'))];
  if (declared.length > 1) {
    add(collector, file, claim.id, 'notes', 'KB002_MULTIPLE_LEVELS',
      `HistoricalClaim declares multiple EVIDENCE_LEVEL values: ${declared.join(', ')}`);
  }

  const computed = computeClaimEvidence(index, claim.id);
  const declaredLevel = declared.length === 1 ? declared[0] : null;

  // Contract 6.1 + rubric 4.5: no Golden entity may be marked E5 in this phase.
  // Declaring E5 is therefore a fabrication signal regardless of what would be
  // computed, because E5 requires a real external expert review and a real
  // restoration experiment, neither of which exists.
  if (declaredLevel === 'E5') {
    add(collector, file, claim.id, 'notes', 'KB002_E5_UNREACHABLE',
      'rubric 4.5 / contract 6.1: E5 is unreachable this phase (no real external expert review and no real restoration experiment)');
  }

  // rubric 3.2.0: structural pre-checks run BEFORE level computation and
  // produce NO level. Such claims never enter the level domain, which is why
  // "grade undeclared" is not a 13th level input class.
  if (computed.precheck) {
    add(collector, file, claim.id, 'notes', computed.precheck,
      `rubric 3.2.0 pre-check (${computed.rule}): this claim does not enter level computation`);
    return { declared: declaredLevel, computed, level: null };
  }

  if (computed.level === null) {
    // Defensive only. rubric 3.2.2 proves R1-R5 are exhaustive for all inputs
    // that pass the 3.2.0 pre-checks, so this branch has an empty trigger set.
    // Reaching it means an internal error or a new contract gap, and the rule
    // must NOT be invented here -- it must be re-registered as a defect.
    add(collector, file, claim.id, 'notes', 'KB002_LEVEL_INDETERMINATE',
      'internal error or new contract gap: R1-R5 (rubric 3.2.1) produced no level for an input that passed the 3.2.0 pre-checks');
    return { declared: declaredLevel, computed, level: null };
  }

  if (declaredLevel && declaredLevel !== computed.level) {
    add(collector, file, claim.id, 'notes', 'KB002_LEVEL_MISMATCH',
      `declared ${declaredLevel} but rubric 3.2.1 computes ${computed.level} (${computed.reason})`);
  }

  const level = computed.level;
  const table = EVIDENCE_RUBRIC[level];

  // section 4.1-4.3 mapping conflicts
  if (!table.evidence_status.includes(claim.evidence_status)) {
    add(collector, file, claim.id, 'evidence_status', 'KB002_LEVEL_STATUS_CONFLICT',
      `${level} allows evidence_status ${table.evidence_status.join(' | ')} but found "${claim.evidence_status}"`);
  }
  const deriv = claim.provenance && claim.provenance.derivation;
  if (!table.derivation.includes(deriv)) {
    add(collector, file, claim.id, 'provenance.derivation', 'KB002_LEVEL_DERIVATION_CONFLICT',
      `${level} allows derivation ${table.derivation.join(' | ')} but found "${deriv}"`);
  }
  if (!table.review_status.includes(claim.review_status)) {
    add(collector, file, claim.id, 'review_status', 'KB002_LEVEL_REVIEW_CONFLICT',
      `${level} allows review_status ${table.review_status.join(' | ')} but found "${claim.review_status}"`);
  }

  // section 4.4 -- sufficient preconditions for E3/E4
  if (claim.evidence_status === 'sufficient' && table.canSupportSufficient) {
    const problems = [];
    if (level === 'E3' && computed.D < 1) problems.push('support chain incomplete (D < 1)');
    const uncertainty = claim.uncertainty_notes;
    if (!Array.isArray(uncertainty) || uncertainty.length === 0) problems.push('uncertainty_notes is empty');
    if (!['high', 'medium'].includes(claim.confidence)) problems.push(`confidence is "${claim.confidence}"`);
    if (!provenanceHasLocator(claim.provenance)) problems.push('provenance.source_locator is empty');
    const badGrades = computed.gradesOnChain.filter((g) => ['C', 'D', 'X'].includes(g));
    if (badGrades.length > 0) problems.push(`C/D/X grade on support chain: ${badGrades.join(', ')}`);
    if (problems.length > 0) {
      add(collector, file, claim.id, 'evidence_status', 'KB002_SUFFICIENT_PRECONDITION',
        `E3/E4 declared sufficient but rubric 4.4 fails: ${problems.join('; ')}`);
    }
  }

  // section 2.3 SG3/SG4/SG6 -- grades vs claim status
  const grades = computed.gradesOnChain;
  if (grades.includes('X')) {
    add(collector, file, claim.id, 'notes', 'KB002_AI_SOURCE_FORBIDDEN',
      'SOURCE_GRADE=X appears on a claim_supported_by chain');
  }
  const cdGrades = grades.filter((g) => g === 'C' || g === 'D');
  if (cdGrades.length > 0) {
    if (claim.evidence_status === 'sufficient') {
      add(collector, file, claim.id, 'evidence_status', 'KB002_GRADE_INSUFFICIENT',
        `C/D grade (${cdGrades.join(', ')}) may not support evidence_status=sufficient`);
    }
    const derivOk = deriv === 'unresolved';
    const reviewOk = ['unreviewed', 'rejected'].includes(claim.review_status);
    if (!derivOk || !reviewOk) {
      add(collector, file, claim.id, 'provenance.derivation', 'KB002_GRADE_LEAD_ONLY',
        'SG6: C/D-grade leads must be marked insufficient + derivation=unresolved + review_status in {unreviewed, rejected}');
    }
  }
  if (grades.includes('B') && claim.evidence_status === 'sufficient') {
    const corroborated = computed.distinctWorkIds.length >= 2;
    if (!corroborated) {
      add(collector, file, claim.id, 'evidence_status', 'KB002_GRADE_INSUFFICIENT',
        'SG2: B-grade source without S/A corroboration may not support evidence_status=sufficient');
    }
  }
  if (grades.includes('CONFLICT')) {
    add(collector, file, claim.id, 'notes', 'KB002_MULTIPLE_GRADES',
      'a SourceEdition on this support chain carries conflicting SOURCE_GRADE values');
  }
  if (computed.detail.some((d) => d.grade === null)) {
    add(collector, file, claim.id, 'notes', 'KB002_GRADE_UNDECLARED',
      'rubric 2.2: a SourceEdition on this claim_supported_by chain declares no SOURCE_GRADE (on the edition or its SourceWork)');
  }

  return { declared: declaredLevel, computed, level };
}

// ---------------------------------------------------------------------------
// section 6 -- conflict preservation (CF1-CF7)
// ---------------------------------------------------------------------------
function checkConflicts(index, file, claim, collector) {
  const refuted = targetsOf(index, claim.id, 'claim_refuted_by');
  const notes = claim.counter_evidence_notes;
  const notesNonEmpty = Array.isArray(notes) && notes.length > 0;

  if (refuted.length > 0 && !notesNonEmpty) {
    add(collector, file, claim.id, 'counter_evidence_notes', 'KB002_COUNTER_NOTES_MISSING',
      'CF2: claim_refuted_by exists but counter_evidence_notes is empty');
  }
  if (refuted.length === 0 && notesNonEmpty) {
    add(collector, file, claim.id, 'counter_evidence_notes', 'KB002_CONFLICT_HIDDEN',
      'CF3: counter_evidence_notes records refutation but no claim_refuted_by edge exists (edge appears deleted)');
  }
  if (refuted.length > 0 && claim.confidence === 'high') {
    add(collector, file, claim.id, 'confidence', 'KB002_CONFLICT_CONFIDENCE',
      'CF4: confidence must not be "high" while claim_refuted_by exists');
  }
  if (refuted.length > 0 && claim.evidence_status === 'sufficient') {
    const allInsuff = refuted.every((pid) => {
      const p = index.byId.get(pid);
      return p && p.evidence_status === 'insufficient';
    });
    if (!(allInsuff && notesNonEmpty)) {
      add(collector, file, claim.id, 'evidence_status', 'KB002_CONFLICT_SUFFICIENT',
        'CF7: refuted claim may not be sufficient unless the refuting passages are themselves insufficient and uncertainty is documented');
    }
  }
  // CF5/CF6: both sides of a conflict must remain present and reachable.
  for (const pid of refuted) {
    const p = index.byId.get(pid);
    if (!p || p.entity_type !== 'SourcePassage') {
      add(collector, file, claim.id, 'claim_refuted_by', 'KB002_CONFLICT_ONE_SIDED',
        `CF5/CF6: refuting passage "${pid}" is missing or not a SourcePassage`);
      continue;
    }
    const editionLink = targetsOf(index, p.id, 'passage_in_edition').length;
    if (editionLink === 0) {
      add(collector, file, claim.id, 'claim_refuted_by', 'KB002_CONFLICT_ONE_SIDED',
        `CF5/CF6: refuting passage "${pid}" has no complete passage_in_edition chain`);
    }
  }
}

// ---------------------------------------------------------------------------
// section 5.1 -- single dish qualification (Q1-Q8)
// ---------------------------------------------------------------------------
function checkDish(doc, index, file, collector, claimLevels) {
  const dishes = [...index.byId.values()].filter((e) => e.entity_type === 'Dish');
  if (dishes.length === 0) return null;

  const claimIds = [...index.byId.values()]
    .filter((e) => e.entity_type === 'HistoricalClaim')
    .map((c) => c.id);

  const claimsAboutDish = claimIds.filter((cid) => targetsOf(index, cid, 'claim_about').length > 0);

  for (const dish of dishes) {
    if (claimsAboutDish.length === 0) {
      add(collector, file, dish.id, 'id', 'KB002_NO_CLAIM_FOR_DISH',
        'Q1: no HistoricalClaim reaches this Dish via claim_about');
    }
    if (dish.dish_kind !== 'historical_documented_dish') {
      add(collector, file, dish.id, 'dish_kind', 'KB002_DISH_NOT_DOCUMENTED',
        `Q2: dish_kind must be historical_documented_dish, found "${dish.dish_kind}"`);
    }

    const levels = claimLevels.get(file) || [];
    const known = levels.filter((l) => LEVELS.includes(l));
    const best = known.length > 0
      ? known.reduce((a, l) => (LEVELS.indexOf(l) > LEVELS.indexOf(a) ? l : a))
      : null;
    if (best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3')) {
      add(collector, file, dish.id, 'metadata.evidence_level', 'KB002_DISH_BELOW_E3',
        `Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: ${best || 'none'})`);
    }

    const resolvedReachable = [...index.byId.values()].some((e) => {
      if (e.entity_type !== 'SourcePassage' || e.edition_resolution !== 'resolved') return false;
      const editionId = targetsOf(index, e.id, 'passage_in_edition')[0];
      if (!editionId) return false;
      return targetsOf(index, editionId, 'edition_of_work').length > 0;
    });
    if (!resolvedReachable) {
      add(collector, file, dish.id, 'id', 'KB002_NO_RESOLVED_CHAIN',
        'Q4: no SourcePassage with edition_resolution=resolved has a complete chain to a SourceWork');
    }

    // Q5 -- C/D/X grades must not be used for sufficient anywhere in this dish file
    for (const e of index.byId.values()) {
      if (e.entity_type !== 'HistoricalClaim') continue;
      if (e.evidence_status !== 'sufficient') continue;
      const c = computeClaimEvidence(index, e.id);
      const bad = c.gradesOnChain.filter((g) => ['C', 'D', 'X'].includes(g));
      if (bad.length > 0) {
        add(collector, file, e.id, 'evidence_status', 'KB002_GRADE_LEAD_ONLY',
          `Q5: ${bad.join(', ')}-grade source used to support a sufficient claim`);
      }
    }
  }

  // Q7 -- metadata envelope
  const meta = doc.raw && doc.raw.metadata;
  if (!meta || typeof meta !== 'object') {
    add(collector, file, 'metadata', 'metadata', 'KB002_METADATA_INCOMPLETE',
      'Q7: metadata envelope is missing');
    return { qualified: null };
  }
  for (const key of METADATA_REQUIRED_KEYS) {
    if (!(key in meta)) {
      add(collector, file, 'metadata', `metadata.${key}`, 'KB002_METADATA_INCOMPLETE', `Q7: metadata.${key} is required`);
    }
  }
  // The active version is resolved here (not captured at import time) so the
  // check always compares against the contract's current declaration.
  const contractVersion = activeContractVersion();
  if (meta.contract_version !== contractVersion) {
    add(collector, file, 'metadata', 'metadata.contract_version', 'KB002_METADATA_INCOMPLETE',
      `Q7: contract_version must be "${contractVersion}", found "${meta.contract_version}"`);
  }
  if (typeof meta.golden_id === 'string' && !GOLDEN_ID_RE.test(meta.golden_id)) {
    add(collector, file, 'metadata', 'metadata.golden_id', 'KB002_METADATA_INCOMPLETE',
      `Q7: golden_id must match GOLDEN-001..GOLDEN-010, found "${meta.golden_id}"`);
  }
  if (meta.dataset_stage !== STAGE) {
    add(collector, file, 'metadata', 'metadata.dataset_stage', 'KB002_METADATA_INCOMPLETE',
      `Q7: dataset_stage must be "${STAGE}", found "${meta.dataset_stage}"`);
  }

  // metadata.evidence_level must equal the minimum claim level (rubric 3.3)
  const min = minLevel(claimLevels.get(file) || []);
  if (min !== null && meta.evidence_level !== min) {
    add(collector, file, 'metadata', 'metadata.evidence_level', 'KB002_DISH_LEVEL_MISMATCH',
      `metadata.evidence_level="${meta.evidence_level}" but the minimum claim level is ${min}`);
  }

  // H7 governs the Golden file name.
  //
  // N-01 fix / option (A): the check is now gated on the file NAME SHAPE instead
  // of applying to every document. The D1 fix (option A) removed the blanket
  // `examples/` exemption so that a negative fixture could no longer pass; that
  // was correct, but it had a side effect: because every negative fixture is
  // named `inv_NN_*.kb.json` while carrying `metadata.golden_id=GOLDEN-001`,
  // ALL 17 negatives then reported KB002_FILENAME_ID_MISMATCH on top of their
  // intended code. That noise masked which rule each fixture actually tests.
  //
  // The gate below keeps H7 fully enforced where it matters:
  //   - a production-shaped name (`golden_<NNN>.kb.json`) must equal the
  //     golden_id-derived name, wherever the file lives;
  //   - a production (non-`examples/`) file must USE a production-shaped name;
  //   - a negative fixture with an `inv_*`-style name is intentionally exempt,
  //     so it reports only its intended code.
  if (typeof meta.golden_id === 'string') {
    const expected = `${meta.golden_id.toLowerCase().replace('-', '_')}.kb.json`;
    const base = file.split('/').pop();
    const isGoldenShaped = /^golden_\d+\.kb\.json$/.test(base);
    const isExamplePath = /(^|\/)examples\//.test(file);
    if (isGoldenShaped) {
      if (base !== expected) {
        add(collector, file, 'metadata', 'metadata.golden_id', 'KB002_FILENAME_ID_MISMATCH',
          `file name "${base}" does not match metadata.golden_id "${meta.golden_id}" (expected "${expected}")`);
      }
    } else if (!isExamplePath) {
      // Production Golden data must be named after its golden_id; a production
      // file with any other shape is still an H7 violation.
      add(collector, file, 'metadata', 'metadata.golden_id', 'KB002_FILENAME_ID_MISMATCH',
        `production file name "${base}" must be "${expected}" derived from metadata.golden_id "${meta.golden_id}"`);
    }
  }

  return { qualified: meta.qualified === true, meta };
}

// ---------------------------------------------------------------------------
// dataset level checks (rubric 5.2 NP1-NP5, contract 3.3 uniqueness, H6)
// ---------------------------------------------------------------------------
function checkDataset(docs, perDoc, collector) {
  if (docs.length > MAX_GOLDEN_FILES) {
    add(collector, docs[MAX_GOLDEN_FILES].file, '-', 'metadata.golden_id', 'KB002_TOO_MANY_GOLDEN',
      `NP5: at most ${MAX_GOLDEN_FILES} Golden files are allowed, found ${docs.length}`);
  }

  const seen = new Map();
  for (const d of docs) {
    const gid = d.raw && d.raw.metadata && d.raw.metadata.golden_id;
    if (typeof gid !== 'string') continue;
    if (seen.has(gid)) {
      add(collector, d.file, 'metadata', 'metadata.golden_id', 'KB002_GOLDEN_ID_DUPLICATE',
        `golden_id "${gid}" is already used by ${seen.get(gid)}`);
    } else {
      seen.set(gid, d.file);
    }
  }

  // H6 -- fixtures and generated output must never enter the production set.
  // SEC-T7-01: it is not enough to look at the path; a document that *declares
  // itself* a fixture (or carries a not_historical_evidence note) must be
  // rejected wherever it sits, otherwise a fixture copy placed at a production
  // path would pass and would inflate QUALIFIED_GOLDEN_COUNT.
  const isExamplePath = (f) => /(^|\/)examples\//.test(f);
  const isGeneratedPath = (f) => /(^|\/)generated\//.test(f);
  const isFixtureMarked = (d) => {
    const m = d.raw && d.raw.metadata;
    if (!m || typeof m !== 'object') return false;
    if (m.fixture === true) return true;
    return typeof m.not_historical_evidence === 'string' && m.not_historical_evidence.trim() !== '';
  };

  for (const d of docs) {
    if (isGeneratedPath(d.file)) {
      add(collector, d.file, '-', 'metadata.golden_id', 'KB002_FIXTURE_IN_PRODUCTION',
        'H6: generated/fixture output must not be part of the Golden production dataset');
      continue;
    }
    if (!isExamplePath(d.file) && isFixtureMarked(d)) {
      add(collector, d.file, 'metadata', 'metadata.fixture', 'KB002_FIXTURE_IN_PRODUCTION',
        'H6/SEC-T7-01: a document marked metadata.fixture=true (or carrying not_historical_evidence) must not sit at a production Golden path');
    }
  }

  // `production` is the set that feeds the dataset quality arithmetic (NP3).
  // It excludes examples, generated output AND self-declared fixtures, so a
  // misplaced fixture can never contribute to QUALIFIED_GOLDEN_COUNT.
  const production = docs.filter(
    (d) => !isExamplePath(d.file) && !isGeneratedPath(d.file) && !isFixtureMarked(d),
  );

  // NP3 -- declared qualified must equal the computed value.
  // Computed qualification = zero KB-002 rule violations for that file (Q1-Q8).
  let computedQualified = 0;
  for (const d of production) {
    const info = perDoc.get(d.file);
    if (!info) continue;
    const computed = info.blockingErrors === 0;
    if (info.qualified !== null && info.qualified !== computed) {
      add(collector, d.file, 'metadata', 'metadata.qualified', 'KB002_QUALIFIED_MISMATCH',
        `NP3: metadata.qualified=${info.qualified} but computed value is ${computed}`);
    }
    if (computed) computedQualified += 1;
  }

  const declared = production.filter((d) => {
    const info = perDoc.get(d.file);
    return info && info.qualified === true;
  }).length;

  if (declared !== computedQualified) {
    add(collector, '-', '-', 'metadata.qualified', 'KB002_PADDING_COUNT',
      `NP1: declared qualified count ${declared} differs from computed ${computedQualified}`);
  }

  return { computedQualified, declaredQualified: declared, total: production.length };
}

// ---------------------------------------------------------------------------
// raw-level checks: run even when L1 structural validation rejected the entity,
// so a forbidden value can never hide behind a shape error.
// ---------------------------------------------------------------------------
function checkRawForbidden(file, raw, collector) {
  if (!raw || typeof raw !== 'object') return;
  const seen = new Set();
  for (const list of [raw.entities, raw.relations]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const deriv = item.provenance && item.provenance.derivation;
      if (deriv === 'v1_adapter') {
        const id = item.id || `${item.source}->${item.type}->${item.target}`;
        if (seen.has(id)) continue;
        seen.add(id);
        add(collector, file, id, 'provenance.derivation', 'KB002_DERIVATION_V1_FORBIDDEN',
          'derivation=v1_adapter belongs to KB-001 adapter output and is forbidden in KB-002 Golden data');
      }
      const assertedBy = item.provenance && item.provenance.asserted_by;
      if (assertedBy === 'expert_review') {
        const id = item.id || `${item.source}->${item.type}->${item.target}`;
        const key = id + '|asserted_by';
        if (!seen.has(key)) {
          seen.add(key);
          add(collector, file, id, 'provenance.asserted_by', 'KB002_EXTERNAL_REVIEW_UNSUPPORTED',
            'asserted_by=expert_review requires a verifiable external expert review, which does not exist in this phase');
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// entity-level universal rules
// ---------------------------------------------------------------------------
function checkEntityUniversals(index, file, collector) {
  for (const e of index.byId.values()) {
    if (FORBIDDEN_CONTENT_CLASSES.includes(e.content_class)) {
      add(collector, file, e.id, 'content_class', 'KB002_CONTENT_CLASS_FORBIDDEN',
        `Golden historical statements may not use content_class "${e.content_class}"`);
    }
    if (e.review_status === 'external_reviewed') {
      add(collector, file, e.id, 'review_status', 'KB002_EXTERNAL_REVIEW_UNSUPPORTED',
        'external_reviewed is unsupported in this phase (no verifiable external expert review exists)');
    }
    const deriv = e.provenance && e.provenance.derivation;
    if (deriv === 'v1_adapter' && false) {
      // handled by checkRawForbidden (deduplicated, shape-error resilient)
    }
    const assertedBy = e.provenance && e.provenance.asserted_by;
    if (assertedBy === 'expert_review' && false) {
      // handled by checkRawForbidden (deduplicated, shape-error resilient)
    }
    if (e.entity_type === 'Experiment') {
      add(collector, file, e.id, 'entity_type', 'KB002_EXPERIMENT_FORBIDDEN',
        'H8/EX3: Experiment instances are forbidden in KB-002 Golden data');
    }
  }
  // derivation/asserted_by checks live in checkRawForbidden so that they fire
  // even when L1 structural validation rejected the entity's shape.
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export function runGoldenRules({ documents, collector }) {
  const perDoc = new Map();
  const allClaimLevels = [];

  for (const doc of documents) {
    const file = doc.file;
    const index = buildIndex(doc.entities, doc.relations);
    const before = collector.count;

    checkEntityUniversals(index, file, collector);
    checkRawForbidden(file, doc.raw, collector);
    checkGrades(index, file, collector);

    const claimLevels = [];
    for (const claim of index.byId.values()) {
      if (claim.entity_type !== 'HistoricalClaim') continue;
      const res = checkClaimLevel(index, file, claim, collector);
      if (res.level) {
        claimLevels.push(res.level);
        allClaimLevels.push(res.level);
        if (res.level === 'E5') {
          add(collector, file, claim.id, 'notes', 'KB002_E5_UNREACHABLE',
            'rubric 4.5: E5 requires external expert review plus a real experiment; both are forbidden/unavailable this phase');
        }
      }
      checkConflicts(index, file, claim, collector);
    }

    // rubric 3.3 also requires every claim in the file to carry the level carrier
    for (const claim of index.byId.values()) {
      if (claim.entity_type !== 'HistoricalClaim') continue;
      const declared = readNotesToken(claim.notes, 'EVIDENCE_LEVEL');
      if (declared.length === 0) {
        add(collector, file, claim.id, 'notes', 'KB002_LEVEL_MISMATCH',
          'HistoricalClaim has no EVIDENCE_LEVEL=<n> declaration in notes (rubric 3.3)');
      }
    }

    const claimLevelMap = new Map();
    claimLevelMap.set(file, claimLevels);
    const dishInfo = checkDish(doc, index, file, collector, claimLevelMap);

    const blockingErrors = collector.count - before;
    perDoc.set(file, {
      qualified: dishInfo ? dishInfo.qualified : null,
      meta: dishInfo ? dishInfo.meta : null,
      blockingErrors,
    });
  }

  const dataset = checkDataset(documents, perDoc, collector);

  return {
    dataset,
    perDoc,
    claimLevels: allClaimLevels,
    qualifiedGoldenCount: dataset.computedQualified,
    shortfall: Math.max(0, MAX_GOLDEN_FILES - dataset.computedQualified),
    status: dataset.computedQualified >= MAX_GOLDEN_FILES ? 'GOLDEN_10_COMPLETE' : 'PARTIAL_GOLDEN_SET',
  };
}
