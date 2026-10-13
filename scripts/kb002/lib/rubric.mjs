// KB-002 evidence rubric constants and deterministic level computation.
//
// Contract sources (frozen):
//   docs/kb-002/01-golden-dataset-contract.md  (kb-002.1.x)  sections 3, 6
//   docs/kb-002/02-evidence-quality-rubric.md  (kb-002.1.1)  sections 2, 3, 7
//
// Level computation follows rubric 3.2.0 (structural pre-checks) then 3.2.1
// (R1-R5), which the architect proved exhaustive and mutually exclusive in
// rubric 3.2.2:
//   R1  S(claim) = empty                  -> E0
//   R2  no resolved passage               -> E1
//   R3  N >= 2 and D >= 2                 -> E4
//   R4  N == 1 and D >= 1                 -> E3
//   R5  catch-all (complement of R1-R4)   -> E2
// E5 is NOT decided here: rubric 4.5 makes it unreachable this phase.

// --- section 7: level -> state mapping table (encoded verbatim) ---------------
export const EVIDENCE_RUBRIC = {
  E0: {
    evidence_status: ['insufficient', 'unknown'],
    derivation: ['unresolved'],
    review_status: ['unreviewed', 'rejected'],
    canSupportSufficient: false,
  },
  E1: {
    evidence_status: ['insufficient', 'unknown'],
    derivation: ['unresolved'],
    review_status: ['unreviewed', 'rejected'],
    canSupportSufficient: false,
  },
  E2: {
    evidence_status: ['insufficient', 'unknown'],
    derivation: ['primary_source', 'editorial', 'unresolved'],
    review_status: ['unreviewed', 'pending_external_expert', 'internal_reviewed'],
    canSupportSufficient: false,
  },
  E3: {
    evidence_status: ['sufficient', 'insufficient'],
    derivation: ['primary_source', 'editorial'],
    review_status: ['unreviewed', 'pending_external_expert', 'internal_reviewed'],
    canSupportSufficient: true,
  },
  E4: {
    evidence_status: ['sufficient'],
    derivation: ['primary_source'],
    review_status: ['internal_reviewed', 'pending_external_expert', 'external_reviewed'],
    canSupportSufficient: true,
  },
  E5: {
    evidence_status: ['sufficient'],
    derivation: ['primary_source'],
    review_status: ['external_reviewed'],
    canSupportSufficient: true,
  },
};

export const LEVELS = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'];
export const SOURCE_GRADES = ['S', 'A', 'B', 'C', 'D', 'X'];
export const AUTHORITATIVE_GRADES = ['S', 'A'];
// Direct evidence per rubric 3.1.
export const DIRECT_TEXT_ORIGINS = ['verbatim_transcription', 'normalized_transcription'];
// rubric 3.2.0: these are structural errors and produce NO level.
export const PRECHECK = {
  MULTIPLE: 'KB002_MULTIPLE_GRADES',
  AI_SOURCE: 'KB002_AI_SOURCE_FORBIDDEN',
  UNDECLARED: 'KB002_GRADE_UNDECLARED',
};

// --- notes-prefix carriers (contract 6.5) ------------------------------------
const SOURCE_GRADE_RE = /(?:^|[^A-Z0-9_])SOURCE_GRADE=(S|A|B|C|D|X)(?![A-Z0-9_])/g;
const EVIDENCE_LEVEL_RE = /(?:^|[^A-Z0-9_])EVIDENCE_LEVEL=E([0-5])(?![0-9])/g;

export function readNotesToken(notes, kind) {
  if (typeof notes !== 'string' || notes.length === 0) return [];
  const re = kind === 'SOURCE_GRADE' ? SOURCE_GRADE_RE : EVIDENCE_LEVEL_RE;
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(notes)) !== null) {
    out.push(kind === 'SOURCE_GRADE' ? m[1] : `E${m[1]}`);
  }
  return out;
}

// --- graph helpers -----------------------------------------------------------
export function buildIndex(entities, relations) {
  const byId = new Map();
  for (const e of entities) if (e && typeof e.id === 'string') byId.set(e.id, e);
  const out = new Map();
  for (const r of relations) {
    const key = `${r.source}\u0000${r.type}`;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(r);
  }
  return { byId, out, relations };
}

export function targetsOf(index, sourceId, type) {
  return (index.out.get(`${sourceId}\u0000${type}`) || []).map((r) => r.target);
}

export function sourcesOf(index, targetId, type) {
  return index.relations
    .filter((r) => r.type === type && r.target === targetId)
    .map((r) => r.source);
}

// --- evidence level computation (rubric 3.2.0 then 3.2.1, literal) -----------
export function computeClaimEvidence(index, claimId) {
  const supportPassageIds = targetsOf(index, claimId, 'claim_supported_by');
  const supportPassages = supportPassageIds
    .map((id) => index.byId.get(id))
    .filter((p) => p && p.entity_type === 'SourcePassage');

  const detail = supportPassages.map((p) => {
    const editionId = targetsOf(index, p.id, 'passage_in_edition')[0]
      || (typeof p.edition_id === 'string' ? p.edition_id : undefined);
    const edition = editionId ? index.byId.get(editionId) : undefined;
    const workId = edition
      ? (targetsOf(index, edition.id, 'edition_of_work')[0]
         || (typeof edition.work_id === 'string' ? edition.work_id : undefined))
      : undefined;
    const work = workId ? index.byId.get(workId) : undefined;

    const editionGrades = readNotesToken(edition && edition.notes, 'SOURCE_GRADE');
    const workGrades = readNotesToken(work && work.notes, 'SOURCE_GRADE');
    const grades = [...new Set([...editionGrades, ...workGrades])];
    const grade = grades.length === 1 ? grades[0] : grades.length === 0 ? null : 'CONFLICT';

    const resolved = p.edition_resolution === 'resolved';
    const direct = DIRECT_TEXT_ORIGINS.includes(p.text_origin);

    return {
      passageId: p.id,
      editionId: edition ? edition.id : null,
      workId: work ? work.id : null,
      edition,
      work,
      grade,
      editionGrades,
      workGrades,
      resolved,
      direct,
      // rubric 3.2.1: D(claim) = resolved AND direct AND authoritative (S/A).
      // Folding the grade into the direct test is what keeps C/D from ever
      // raising a level (strengthens SG6).
      authoritativeDirect: resolved && direct && AUTHORITATIVE_GRADES.includes(grade),
    };
  });

  const resolvedPassages = detail.filter((d) => d.resolved);
  const authoritativeResolved = detail.filter((d) => d.resolved && AUTHORITATIVE_GRADES.includes(d.grade));
  const distinctWorks = new Set(authoritativeResolved.map((d) => d.workId).filter(Boolean));
  const N = distinctWorks.size;
  const D = detail.filter((d) => d.authoritativeDirect).length;

  const gradesOnChain = [...new Set(detail.map((d) => d.grade).filter(Boolean))];
  const undeclared = detail.some((d) => d.grade === null);
  const multipleGrades = gradesOnChain.includes('CONFLICT');
  const xOnChain = gradesOnChain.includes('X');

  const base = {
    supportPassageIds,
    detail,
    N,
    D,
    resolvedCount: resolvedPassages.length,
    directCount: detail.filter((d) => d.direct).length,
    gradesOnChain,
    distinctWorkIds: [...distinctWorks],
    undeclared,
    multipleGrades,
    xOnChain,
  };

  // --- rubric 3.2.0: pre-checks run FIRST and produce no level ---------------
  if (multipleGrades) return { ...base, level: null, precheck: PRECHECK.MULTIPLE, rule: 'PRECHECK-MULTIPLE' };
  if (xOnChain) return { ...base, level: null, precheck: PRECHECK.AI_SOURCE, rule: 'PRECHECK-X' };
  if (undeclared) return { ...base, level: null, precheck: PRECHECK.UNDECLARED, rule: 'PRECHECK-UNDECLARED' };

  // --- rubric 3.2.1: R1-R5, top-down, first match ----------------------------
  if (supportPassages.length === 0) {
    return { ...base, level: 'E0', rule: 'R1', reason: 'R1: S(claim) is empty' };
  }
  if (resolvedPassages.length === 0) {
    return { ...base, level: 'E1', rule: 'R2', reason: 'R2: supported but no resolved passage' };
  }
  if (N >= 2 && D >= 2) {
    return { ...base, level: 'E4', rule: 'R3', reason: `R3: N=${N} >= 2 and D=${D} >= 2` };
  }
  if (N === 1 && D >= 1) {
    return { ...base, level: 'E3', rule: 'R4', reason: `R4: N=1 and D=${D} >= 1` };
  }
  // R5 is the complement of R1-R4 by construction (rubric 3.2.2).
  return { ...base, level: 'E2', rule: 'R5', reason: `R5 catch-all: N=${N}, D=${D}` };
}

// rubric 4.5: E5 is decided outside R1-R5 and is unreachable this phase.
export function detectsE5(index, claimId) {
  return hasExternalApprovedReview(index, claimId) && hasExperimentForClaim(index, claimId);
}

function hasExternalApprovedReview(index, claimId) {
  const reviewIds = sourcesOf(index, claimId, 'review_of');
  return reviewIds.some((rid) => {
    const r = index.byId.get(rid);
    if (!r || r.entity_type !== 'ExpertReview') return false;
    return ['external_scholar', 'institution'].includes(r.reviewer_kind)
      && ['approved', 'approved_with_conditions'].includes(r.review_outcome);
  });
}

function hasExperimentForClaim(index, claimId) {
  const restoIds = sourcesOf(index, claimId, 'restoration_based_on_claim');
  return restoIds.some((rid) => sourcesOf(index, rid, 'experiment_tests').length > 0);
}

// --- dish-level minimum (rubric 3.3) ----------------------------------------
export function minLevel(levels) {
  const known = levels.filter((l) => LEVELS.includes(l));
  if (known.length === 0) return null;
  return known.reduce((acc, l) => (LEVELS.indexOf(l) < LEVELS.indexOf(acc) ? l : acc));
}
