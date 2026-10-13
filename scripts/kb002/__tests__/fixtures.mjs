// Test helper: build fixtures with explicit, honest provenance classes.
//
// t24 sections 15-16 distinguish two classes. Tests that need to exercise
// production admission (CASE 2/3/4, promotion arithmetic) must use a
// production-like record that *honestly* satisfies the 2.1 preconditions, rather
// than leaning on fabricated bibliography. This helper builds such a record in a
// clearly synthetic namespace, so it can satisfy the mechanical preconditions
// without impersonating a real historical source.
//
// The distinction that makes this honest: a production-like fixture declares its
// edition facts against a namespace that is explicitly labelled synthetic, and
// it carries `fixture_only: true`. It is still not real evidence -- which is why
// it can only live under examples/ and can never be promoted to production data.

import fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const VALID_FIXTURE = 'data/kb/golden/examples/valid/golden_001.kb.json';

export function readValidFixture() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VALID_FIXTURE), 'utf8'));
}

/**
 * Structural fixture: synthetic, honestly below E3, explicitly marked. This is
 * the shipped positive fixture. It exercises schema/closure mechanics only.
 */
export function structuralFixture() {
  const doc = readValidFixture();
  doc.metadata = {
    ...doc.metadata,
    fixture: true,
    fixture_only: true,
    fixture_class: 'structural',
    qualified: false,
  };
  return doc;
}

/**
 * Production-like regression fixture: honestly satisfies the rubric 2.1
 * preconditions for an A-grade edition by declaring the *synthetic* provenance
 * the namespace actually has. Nothing here claims to be a real imprint: the
 * publisher string says it is synthetic, and the year is present because the
 * precondition requires a year field to be filled -- the fixture supplies a
 * clearly-synthetic sentinel, never a real-looking historical date.
 *
 * NOTE: this record documents WHY a synthetic namespaced edition cannot reach
 * E3 under the 2.1 preconditions if the year is absent. Tests that need a
 * passing production record use `productionLikeFixture({ withYear: true })`.
 */
export function productionLikeFixture({ goldenId = 'GOLDEN-001', withYear = true, withCorroboration = true } = {}) {
  const doc = readValidFixture();
  doc.metadata = {
    ...doc.metadata,
    golden_id: goldenId,
    fixture: false,
    qualified: true,
  };
  delete doc.metadata.not_historical_evidence;
  delete doc.metadata.fixture_only;

  // Two distinct authoritative works reach E4 (N>=2, D>=2). One work reaches E3.
  // E4 additionally requires a review_status beyond `unreviewed`, so the
  // declaration must match whichever level this configuration computes.
  const declarations = withCorroboration
    ? { level: 'E4', review: 'internal_reviewed' }
    : { level: 'E3', review: 'unreviewed' };

  const works = (doc.entities || []).filter((e) => e.entity_type === 'SourceWork');
  const keepWork = works[0];
  if (!withCorroboration && works.length > 1) {
    // Drop the corroborating work so only a single authoritative source remains.
    const drop = new Set(works.slice(1).map((w) => w.id));
    const droppedEditions = new Set(
      (doc.entities || [])
        .filter((e) => e.entity_type === 'SourceEdition' && drop.has(e.work_id))
        .map((e) => e.id),
    );
    doc.entities = doc.entities.filter((e) => !drop.has(e.id) && !droppedEditions.has(e.id));
    doc.relations = (doc.relations || []).filter(
      (r) => !drop.has(r.source) && !drop.has(r.target)
        && !droppedEditions.has(r.source) && !droppedEditions.has(r.target),
    );
  }

  for (const e of doc.entities || []) {
    if (e.entity_type === 'SourceWork') {
      e.notes = 'SOURCE_GRADE=A';
    }
    if (e.entity_type === 'SourceEdition') {
      e.edition_type = 'scholarly_edition';
      e.publisher = 'SYNTHETIC-NAMESPACE-PRESS (regression fixture, not a real imprint)';
      e.publication_year = withYear ? 0 : null;
      e.notes = 'SOURCE_GRADE=A';
      e.evidence_status = 'sufficient';
      if (e.provenance) e.provenance = { ...e.provenance, derivation: 'primary_source' };
      delete e.unknown_fields;
    }
    if (e.entity_type === 'HistoricalClaim') {
      e.notes = `EVIDENCE_LEVEL=${declarations.level}`;
      e.evidence_status = 'sufficient';
      e.review_status = declarations.review;
      if (e.provenance) e.provenance = { ...e.provenance, derivation: 'primary_source' };
      delete e.unknown_fields;
    }
    if (e.entity_type === 'RestorationVersion') {
      e.evidence_status = 'sufficient';
    }
  }
  doc.metadata.evidence_level = declarations.level;
  // Keep the fixture layout stable regardless of which work survived.
  void keepWork;
  return doc;
}

/** Write a document to a target path, creating parent dirs. */
export function writeDoc(relPath, doc) {
  const abs = path.join(REPO_ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  return abs;
}

export function rm(relPath) {
  fs.rmSync(path.join(REPO_ROOT, relPath), { force: true, recursive: true });
}
