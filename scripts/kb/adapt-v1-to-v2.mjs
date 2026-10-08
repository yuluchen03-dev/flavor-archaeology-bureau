// KB-001C V1→V2 compatibility adapter.
// Contract: docs/kb-001/01-schema-contract.md sections 13.1-13.9.
//
// Usage:
//   node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]
//
// Guarantees:
//   - V1 inputs are opened read-only and never rewritten (A3).
//   - Output is deterministic (A1) and idempotent (A2).
//   - Unknown information is expressed as null + unknown_fields or
//     evidence_status insufficient; nothing is fabricated (N1-N5).
//
// Exit codes: 0 = success, 1 = hard failure, 2 = CLI usage error (A4).

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { REPO_ROOT, loadSchema } from './lib/schema.mjs';
import {
  INGREDIENT_CATEGORY_MAP,
  TECHNIQUE_CATEGORY_MAP,
  WORK_TYPE_BY_TEXT,
  bookNameFromRecipeSource,
  byCodePoint,
  isLeadDish,
  measurementFromQuantityText,
  normalizeIncludedText,
  passageKey,
  stateKindFromPreparation,
} from './lib/adapt/mapping.mjs';

const SCHEMA_VERSION = '2.0.0';
const DEFAULT_OUT = 'data/kb/generated';
const TODAY_FOR_FIXTURES = null; // asserted_at stays null: V1 carries no assertion dates.

const V1_INPUTS = [
  'data/knowledge_graph/nodes_dish.json',
  'data/knowledge_graph/nodes_ingredient.json',
  'data/knowledge_graph/nodes_technique.json',
  'data/knowledge_graph/nodes_dynasty.json',
  'data/knowledge_graph/nodes_region.json',
  'data/knowledge_graph/nodes_season.json',
  'data/knowledge_graph/nodes_ancient_text.json',
  'data/knowledge_graph/relationships.json',
  'data/knowledge_graph/expert_review_manifest.json',
  'data/literature/authoritative_recipe_texts.json',
  'data/recipes/ancient_recipes.json',
  'data/fragments/ancient_fragments.json',
  'data/ingredients/ingredient_mapping.json',
  'data/techniques/intangible_heritage.json',
];

const READONLY_DIRS = [
  'data/knowledge_graph',
  'data/recipes',
  'data/fragments',
  'data/literature',
  'data/ingredients',
  'data/techniques',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function hashTree(relativeDir) {
  const root = path.join(REPO_ROOT, relativeDir);
  const out = new Map();
  if (!fs.existsSync(root)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.set(path.relative(REPO_ROOT, full).split(path.sep).join('/'), createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
    }
  };
  walk(root);
  return out;
}

function snapshotReadonlyInputs() {
  const snapshot = new Map();
  for (const dir of READONLY_DIRS) {
    for (const [file, hash] of hashTree(dir)) snapshot.set(file, hash);
  }
  return snapshot;
}

// Provenance for records derived from V1.
//
// `asserted_at` is deliberately OMITTED rather than set to null. Contract section 6
// marks it optional + nullable, but also requires a null value to be listed in
// `unknown_fields`. Contract section 10.1 gives relation objects no `unknown_fields`
// field at all, so "asserted_at: null" is undeclarable on any relation and the
// KB-001B validator would reject every relation. V1 carries no assertion dates, so
// the field is simply not asserted; the adapter records this in the report.
function v1Provenance({ basisIds = [], unresolved = false, notes = null, locator = null }) {
  const provenance = {
    derivation: unresolved ? 'unresolved' : 'v1_adapter',
    basis_ids: basisIds,
    asserted_by: 'v1_import',
  };
  if (locator) provenance.source_locator = locator;
  if (notes) provenance.notes = notes;
  return provenance;
}

// Mirrors the KB-001B validator's requiredNullablePaths() exactly: the top-level
// fields that are both required and nullable. Any such field that is null must be
// named in unknown_fields (contract U1), so it is declared automatically instead of
// being hand-audited per entity type.
function autoDeclareRequiredNulls(schema, entity) {
  const declared = new Set(Array.isArray(entity.unknown_fields) ? entity.unknown_fields : []);
  const consider = (fieldPath, value, spec) => {
    if (value === null && spec?.required === true && spec.nullable === true) declared.add(fieldPath);
  };

  for (const [field, spec] of Object.entries(schema.common_fields)) {
    if (Object.prototype.hasOwnProperty.call(entity, field)) consider(field, entity[field], spec);
  }
  for (const [field, spec] of Object.entries(schema.provenance_fields)) {
    if (entity.provenance && Object.prototype.hasOwnProperty.call(entity.provenance, field)) {
      consider(`provenance.${field}`, entity.provenance[field], spec);
    }
  }
  for (const [field, spec] of Object.entries(schema.entities?.[entity.entity_type]?.fields ?? {})) {
    if (Object.prototype.hasOwnProperty.call(entity, field)) consider(field, entity[field], spec);
  }

  return [...declared].sort(byCodePoint);
}

function buildV2() {
  const schema = loadSchema();
  const dishes = readJson('data/knowledge_graph/nodes_dish.json');
  const ingredients = readJson('data/knowledge_graph/nodes_ingredient.json');
  const techniques = readJson('data/knowledge_graph/nodes_technique.json');
  const dynasties = readJson('data/knowledge_graph/nodes_dynasty.json');
  const regions = readJson('data/knowledge_graph/nodes_region.json');
  const seasons = readJson('data/knowledge_graph/nodes_season.json');
  const ancientTexts = readJson('data/knowledge_graph/nodes_ancient_text.json');
  const relationships = readJson('data/knowledge_graph/relationships.json');
  const manifest = readJson('data/knowledge_graph/expert_review_manifest.json');
  const literature = readJson('data/literature/authoritative_recipe_texts.json');
  const recipes = readJson('data/recipes/ancient_recipes.json');
  const fragments = readJson('data/fragments/ancient_fragments.json');
  const ingredientMapping = readJson('data/ingredients/ingredient_mapping.json');
  const intangible = readJson('data/techniques/intangible_heritage.json');

  const entities = [];
  const relations = [];
  const report = {
    unmapped_fields: [],
    missing_sources: [],
    conflicts: [],
    merged_passages: [],
    ambiguous_edition: [],
    unresolved_passages: [],
    preserved_v1_defects: [],
    dropped_relations: [],
    counts: {},
    id_mapping: [],
    notes: [],
  };

  const idMap = new Map(); // V1 id -> V2 id
  const recordIdMap = (v1Id, v2Id, note) => {
    idMap.set(v1Id, v2Id);
    report.id_mapping.push({ v1_id: v1Id, v2_id: v2Id, note: note ?? null });
  };

  // ---------------------------------------------------------------------
  // SourceWork: 5 content works + 3 collected series + 2 unresolved titles
  // ---------------------------------------------------------------------
  const contentWorks = ancientTexts.filter((t) => !t.id.startsWith('text_lit_'));
  const seriesWorks = literature.sources;
  const seriesIds = new Set(seriesWorks.map((s) => s.id));
  const seriesWorkIdBySourceId = new Map();
  for (const source of seriesWorks) {
    seriesWorkIdBySourceId.set(source.id, `work_${source.id}`);
  }

  const workIdByName = new Map();
  for (const work of contentWorks) {
    workIdByName.set(work.title, `work_${work.id}`);
  }
  // Collected series are also SourceWorks; index them by their series name so
  // edition_contains_work can target content works only (never series).
  const seriesNameToId = new Map(seriesWorks.map((s) => [s.name, `work_${s.id}`]));

  for (const work of contentWorks) {
    const v2Id = `work_${work.id}`;
    recordIdMap(work.id, v2Id, 'SourceWork from nodes_ancient_text.json content work');
    const authorKnown = typeof work.author === 'string' && work.author.trim().length > 0;
    entities.push({
      id: v2Id,
      entity_type: 'SourceWork',
      schema_version: SCHEMA_VERSION,
      // V1 text_001-text_005 carry no source_url/catalog_url/verification_note at
      // all (fact-audit F7), so the record is insufficient and must stay unreviewed.
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        unresolved: true,
        notes: 'V1 content work node carries no source_url/catalog_url/verification_note; provenance left unresolved rather than filled in.',
      }),
      name: work.title,
      author: authorKnown ? work.author : null,
      attribution_status: authorKnown ? 'attributed' : 'unknown',
      work_type: WORK_TYPE_BY_TEXT[work.title] ?? 'other',
      compiled_period_id: null,
      ...(authorKnown ? {} : { unknown_fields: ['author'] }),
      ...(authorKnown ? { unknown_fields: [] } : {}),
    });
    if (!authorKnown) {
      report.missing_sources.push({ entity: v2Id, v1_id: work.id, reason: 'no author field in V1 node' });
    }
    report.missing_sources.push({
      entity: v2Id,
      v1_id: work.id,
      reason: 'V1 content work node has no source_url / catalog_url / authority_institution / verification_note (fact-audit F7)',
    });
  }

  for (const source of seriesWorks) {
    const v2Id = `work_${source.id}`;
    recordIdMap(source.id, v2Id, 'SourceWork from literature.sources[] collected series');
    entities.push({
      id: v2Id,
      entity_type: 'SourceWork',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'sufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        basisIds: [],
        locator: { work_id: null, edition_id: null, passage_id: null, locator: source.url ?? null },
        notes: 'Series-level bibliographic metadata copied verbatim from literature.sources[].',
      }),
      name: source.name,
      author: source.institution ?? null,
      attribution_status: 'attributed',
      work_type: 'collected_series',
      compiled_period_id: null,
      ...(source.institution ? { unknown_fields: [] } : { unknown_fields: ['author'] }),
    });
  }

  // Unresolved book titles referenced by dish.source_text but absent from the
  // graph (fact-audit M2). Kept explicitly unresolved; no edition is invented.
  const unresolvedTitles = [...new Set(
    dishes
      .filter((d) => !isLeadDish(d))
      .map((d) => d.source_text)
      .filter((title) => !workIdByName.has(title)),
  )].sort(byCodePoint);

  const unresolvedWorkIdByName = new Map();
  unresolvedTitles.forEach((title, index) => {
    const v2Id = `work_unresolved_${String(index + 1).padStart(3, '0')}`;
    unresolvedWorkIdByName.set(title, v2Id);
    recordIdMap(`dish.source_text:${title}`, v2Id, 'SourceWork synthesised for a book name with no V1 node');
    entities.push({
      id: v2Id,
      entity_type: 'SourceWork',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        unresolved: true,
        notes: `Referenced by dish.source_text "${title}" but no node exists in V1; title kept unresolved, no edition or year invented.`,
      }),
      name: title,
      author: null,
      attribution_status: 'unknown',
      work_type: 'other',
      compiled_period_id: null,
      unknown_fields: ['author'],
    });
    report.missing_sources.push({
      entity: v2Id,
      v1_id: null,
      reason: `book name "${title}" has no node in data/knowledge_graph; kept as unresolved SourceWork`,
    });
  });

  // ---------------------------------------------------------------------
  // SourceEdition: 106 literature items; text_lit_* merge into them by title
  // ---------------------------------------------------------------------
  const litByTitle = new Map(literature.items.map((item) => [item.title, item]));
  const textLitMerged = [];
  for (const text of ancientTexts.filter((t) => t.id.startsWith('text_lit_'))) {
    const item = litByTitle.get(text.title);
    if (item) {
      textLitMerged.push({ textId: text.id, litId: item.id });
      recordIdMap(text.id, `edition_${item.id}`, 'merged into the literature edition with the same title (contract 13.3)');
    } else {
      report.unmapped_fields.push({
        field: `nodes_ancient_text.json:${text.id}`,
        reason: `text_lit_* node title "${text.title}" matches no literature item; no edition created`,
      });
    }
  }

  // edition_contains_work: normalised included_texts match against content works
  const containsWorkIdsByEdition = new Map();
  for (const item of literature.items) {
    const v2Id = `edition_${item.id}`;
    const matched = [];
    for (const raw of item.included_texts ?? []) {
      const normalized = normalizeIncludedText(raw);
      const workId = workIdByName.get(normalized);
      if (workId) matched.push(workId);
      else {
        report.unmapped_fields.push({
          field: `literature.items[${item.id}].included_texts`,
          value: raw,
          reason: 'normalised entry matches no content SourceWork; retained in the report, not dropped silently',
        });
      }
    }
    const unique = [...new Set(matched)].sort(byCodePoint);
    containsWorkIdsByEdition.set(v2Id, unique);

    const seriesWorkId = seriesWorkIdBySourceId.get(item.authority?.source_id);
    if (!seriesWorkId) {
      throw new Error(`literature item ${item.id} authority.source_id does not resolve to a literature.sources[] entry`);
    }
    recordIdMap(item.id, v2Id, 'SourceEdition from literature item (collected series volume)');

    entities.push({
      id: v2Id,
      entity_type: 'SourceEdition',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'sufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        locator: { work_id: seriesWorkId, edition_id: null, passage_id: null, locator: item.collection ?? null },
        notes: 'Bibliographic metadata copied verbatim from literature.items[].authority.',
      }),
      name: item.title,
      work_id: seriesWorkId,
      edition_type: 'modern_reprint',
      publisher: item.authority?.institution ?? null,
      publication_year: null,
      locator_scheme: 'volume',
      contains_work_ids: unique,
      unknown_fields: ['publication_year'],
      aliases: textLitMerged.filter((m) => m.litId === item.id).map((m) => m.textId),
    });
  }

  // V1 literature has no edition/passage/page fields (fact-audit 1.5, L6).
  report.unmapped_fields.push({
    field: 'data/literature/authoritative_recipe_texts.json',
    reason: 'dataset has no edition / passage / page fields; locator_scheme set to "volume" and publication_year left null',
  });
  const nullTotalRecipes = literature.items.filter((i) => i.total_recipes === null).length;
  report.unmapped_fields.push({
    field: 'literature.items[].total_recipes',
    reason: `${nullTotalRecipes}/${literature.items.length} entries are null; field not mapped`,
  });
  report.unmapped_fields.push({
    field: 'dish.flavor_profile / difficulty / taste_profile / cooking_time / servings',
    reason: 'not mapped in KB-001 (contract 13.4)',
  });
  report.unmapped_fields.push({
    field: 'relationships.json declared-but-unused types',
    reason: 'ingredient_from and ingredient_season are declared in V1 schema.json but never used by relationships.json (fact-audit 1.5)',
  });

  // ---------------------------------------------------------------------
  // SourcePassage: merge duplicates, resolve editions without disambiguating
  // ---------------------------------------------------------------------
  const passageCandidates = [];
  for (const dish of dishes.filter((d) => !isLeadDish(d))) {
    passageCandidates.push({ origin: 'dish', v1Id: dish.id, workName: dish.source_text, text: dish.source_passage });
  }
  for (const recipe of recipes) {
    passageCandidates.push({ origin: 'recipe', v1Id: recipe.id, workName: bookNameFromRecipeSource(recipe.source), text: recipe.original_text });
  }
  for (const fragment of fragments) {
    passageCandidates.push({ origin: 'fragment', v1Id: fragment.id, workName: fragment.source, text: fragment.passage });
  }

  const passageGroups = new Map();
  for (const candidate of passageCandidates) {
    const key = passageKey(candidate.text);
    if (!passageGroups.has(key)) passageGroups.set(key, { text: candidate.text, members: [] });
    passageGroups.get(key).members.push(candidate);
  }

  const passageIdByV1Id = new Map();
  const editionIdByWorkName = new Map(); // content work name -> [edition ids]
  for (const work of contentWorks) {
    const ids = [];
    for (const [editionId, workIds] of containsWorkIdsByEdition) {
      if (workIds.includes(`work_${work.id}`)) ids.push(editionId);
    }
    editionIdByWorkName.set(work.title, ids.sort(byCodePoint));
  }

  const sortedGroups = [...passageGroups.values()].sort((a, b) => byCodePoint(a.members[0].v1Id, b.members[0].v1Id));
  for (const group of sortedGroups) {
    const anchor = group.members[0];
    const v2Id = `passage_${anchor.v1Id}`;
    for (const member of group.members) {
      passageIdByV1Id.set(member.v1Id, v2Id);
      recordIdMap(member.v1Id, v2Id, member === anchor ? 'SourcePassage anchor' : `merged into ${v2Id} (identical text)`);
    }
    if (group.members.length > 1) {
      report.merged_passages.push({
        passage: v2Id,
        merged_from: group.members.map((m) => m.v1Id),
        reason: 'whitespace-stripped text is byte-identical',
      });
    }

    const workId = workIdByName.get(anchor.workName) ?? unresolvedWorkIdByName.get(anchor.workName) ?? null;
    if (!workId) {
      report.unresolved_passages.push({ passage: v2Id, work_name: anchor.workName, reason: 'anchor work name resolves to no SourceWork; passage kept without work link' });
    }

    // Candidate editions = editions whose contains_work_ids include this work.
    const candidates = workId ? [...containsWorkIdsByEdition.entries()]
      .filter(([, workIds]) => workIds.includes(workId))
      .map(([editionId]) => editionId)
      .sort(byCodePoint) : [];

    let resolution;
    if (candidates.length === 1) resolution = 'resolved';
    else if (candidates.length > 1) resolution = 'ambiguous';
    else resolution = 'unresolved';

    // No disambiguation: never pick one candidate to satisfy a cardinality rule.
    const editionId = resolution === 'resolved' ? candidates[0] : null;

    entities.push({
      id: v2Id,
      entity_type: 'SourcePassage',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: resolution === 'resolved' ? 'sufficient' : 'insufficient',
      review_status: 'unreviewed',
      provenance: resolution === 'resolved'
        ? v1Provenance({
          locator: { work_id: workId, edition_id: editionId, passage_id: null, locator: null },
          notes: 'Text copied verbatim from V1; edition attribution is unique among candidate volumes.',
        })
        : v1Provenance({
          unresolved: true,
          notes: resolution === 'ambiguous'
            ? `Text copied verbatim from V1, but ${candidates.length} candidate editions contain the work; attribution deliberately left undecided (no disambiguation).`
            : 'Text copied verbatim from V1, but no candidate edition contains the work; attribution left unresolved.',
        }),
      name: anchor.workName ? `${anchor.workName}·${anchor.v1Id}` : anchor.v1Id,
      text: group.text,
      edition_id: editionId,
      locator: { volume: null, chapter: null, page: null, entry: null },
      text_origin: 'verbatim_transcription',
      language: 'lzh',
      edition_candidates: candidates,
      edition_resolution: resolution,
      // The resolved branch declares nothing: the KB-001B validator does not require
      // nested members of a required-nullable object, and declaring them would make
      // unknown_fields non-empty and trip U4 against a legitimately sufficient record.
      unknown_fields: resolution === 'resolved' ? [] : ['edition_id'],
    });

    if (resolution === 'ambiguous') {
      report.ambiguous_edition.push({ passage: v2Id, candidates, reason: `${candidates.length} candidate editions; not disambiguated` });
    } else if (resolution === 'unresolved') {
      report.unresolved_passages.push({ passage: v2Id, work_name: anchor.workName, candidates: [], reason: 'no candidate edition contains the work' });
    }
  }

  // ---------------------------------------------------------------------
  // Core domain entities
  // ---------------------------------------------------------------------
  const dynastyNameToPeriodId = new Map();
  for (const dynasty of dynasties) {
    const v2Id = `period_${dynasty.id}`;
    dynastyNameToPeriodId.set(dynasty.name, v2Id);
    recordIdMap(dynasty.id, v2Id, 'TimePeriod (dynasty_ is not a legal period_ prefix)');
    const start = dynasty.start_year ?? null;
    const end = dynasty.end_year ?? null;
    const unknown = [];
    if (start === null) unknown.push('start_year');
    if (end === null) unknown.push('end_year');
    entities.push({
      id: v2Id,
      entity_type: 'TimePeriod',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ notes: 'Year values copied verbatim from V1 nodes_dynasty.json; V1 defect 先秦 -221/-221 preserved as-is.' }),
      name: dynasty.name,
      start_year: start,
      end_year: end,
      calendar: 'chinese_dynastic',
      certainty: 'approximate',
      ...(unknown.length ? { unknown_fields: unknown } : { unknown_fields: [] }),
    });
    if (dynasty.id === 'dynasty_001') {
      report.preserved_v1_defects.push({
        entity: v2Id,
        defect: 'start_year === end_year === -221 in V1 (nodes_dynasty.json dynasty_001 先秦); preserved unchanged, not corrected',
      });
    }
  }

  for (const region of regions) {
    const v2Id = region.id;
    recordIdMap(region.id, v2Id, 'Region id preserved verbatim');
    entities.push({
      id: v2Id,
      entity_type: 'Region',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ unresolved: true, notes: 'V1 region node carries no source locator; provenance left unresolved.' }),
      name: region.name,
      region_kind: 'cultural_area',
      modern_admin_codes: [],
    });
  }

  for (const season of seasons) {
    const v2Id = season.id;
    recordIdMap(season.id, v2Id, 'Season id preserved verbatim');
    const lunar = Number.isInteger(season.lunar_month) ? season.lunar_month : null;
    entities.push({
      id: v2Id,
      entity_type: 'Season',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ unresolved: true, notes: 'V1 season node carries no source locator; provenance left unresolved.' }),
      name: season.name,
      season_kind: season.solar_term ? 'solar_term' : 'lunar_festival',
      lunar_month: lunar,
      solar_term_name: season.solar_term ?? null,
      ...(lunar === null ? { unknown_fields: ['lunar_month'] } : { unknown_fields: [] }),
    });
  }

  for (const ingredient of ingredients) {
    const v2Id = ingredient.id;
    recordIdMap(ingredient.id, v2Id, 'Ingredient id preserved verbatim');
    const category = INGREDIENT_CATEGORY_MAP[ingredient.category];
    if (!category) {
      throw new Error(`ingredient ${ingredient.id} has unmapped category "${ingredient.category}" (contract 13.4 forbids guessing)`);
    }
    // V1 is_extinct is false for every node, so no extinction claim is made.
    report.missing_sources.push({
      entity: v2Id,
      v1_id: ingredient.id,
      reason: 'V1 is_extinct=false for all nodes; availability_status set to unknown rather than asserting extinction status',
    });
    entities.push({
      id: v2Id,
      entity_type: 'Ingredient',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ unresolved: true, notes: 'V1 ingredient node carries no source locator; provenance left unresolved.' }),
      name: ingredient.name,
      category,
      biological_identification_status: 'provisional',
      availability_status: 'unknown',
      aliases: Array.isArray(ingredient.aliases) ? ingredient.aliases : [],
    });
  }

  for (const technique of techniques) {
    const v2Id = technique.id;
    recordIdMap(technique.id, v2Id, 'Technique id preserved verbatim');
    const category = TECHNIQUE_CATEGORY_MAP[technique.category];
    if (!category) {
      throw new Error(`technique ${technique.id} has unmapped category "${technique.category}" (contract 13.4 forbids guessing)`);
    }
    const isHeritage = technique.is_intangible_heritage === true;
    entities.push({
      id: v2Id,
      entity_type: 'Technique',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ unresolved: true, notes: 'V1 technique node carries no source locator; heritage designation is uncited (fact-audit M20).' }),
      name: technique.name,
      category,
      description: technique.description ?? null,
      // Uncited heritage designation must not be upgraded to a level claim.
      heritage_designation: { level: isHeritage ? 'unknown' : 'none', list_name: null, designation_year: null },
      ...(isHeritage ? { unknown_fields: ['heritage_designation.level', 'heritage_designation.list_name', 'heritage_designation.designation_year'] } : { unknown_fields: [] }),
    });
  }

  // ---------------------------------------------------------------------
  // Dish (40) and the claim that carries the lead text
  // ---------------------------------------------------------------------
  const dishIdByV1 = new Map();
  for (const dish of dishes) {
    const v2Id = dish.id;
    dishIdByV1.set(dish.id, v2Id);
    recordIdMap(dish.id, v2Id, 'Dish id preserved verbatim');
    const lead = isLeadDish(dish);
    const periodId = lead ? null : (dynastyNameToPeriodId.get(dish.dynasty) ?? null);
    const unknown = [];
    if (periodId === null) unknown.push('period_id');

    entities.push({
      id: v2Id,
      entity_type: 'Dish',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        unresolved: true,
        notes: lead
          ? `V1 source_text "${dish.source_text}" is a heritage-practice lead, not a bibliographic source; it is not upgraded to authoritative evidence.`
          : `V1 dish node records source_text "${dish.source_text}" but carries no page-level locator; provenance left unresolved.`,
      }),
      name: dish.name,
      dish_kind: lead ? 'heritage_practice_lead' : 'historical_documented_dish',
      period_id: periodId,
      region_ids: [],
      season_ids: [],
      description: dish.description ?? null,
      ...(unknown.length ? { unknown_fields: unknown } : { unknown_fields: [] }),
    });
  }

  // Lead-text claims: cultural_context, insufficient, no supporting passage.
  const leadClaims = dishes.filter(isLeadDish).sort((a, b) => byCodePoint(a.id, b.id));
  for (const dish of leadClaims) {
    const v2Id = `claim_${dish.id}_lead`;
    recordIdMap(`${dish.id}.source_passage`, v2Id, 'HistoricalClaim carrying the heritage-practice lead text');
    entities.push({
      id: v2Id,
      entity_type: 'HistoricalClaim',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        unresolved: true,
        notes: 'V1 source_text is a heritage-practice lead, not a cited source; claim deliberately has no claim_supported_by.',
      }),
      name: `${dish.name}（线索）`,
      statement: dish.source_passage,
      claim_type: 'cultural_context',
      about_ids: [dish.id],
      confidence: 'unknown',
      uncertainty_notes: [
        `V1 source_text "${dish.source_text}" is a practice lead rather than a traceable bibliographic source.`,
        'No edition-level or page-level locator is available in V1.',
      ],
    });
    report.missing_sources.push({
      entity: v2Id,
      v1_id: dish.id,
      reason: 'heritage-practice lead has no traceable source passage; kept insufficient (contract N4)',
    });
  }

  // ---------------------------------------------------------------------
  // IngredientState and Measurement derived from contains edges
  // ---------------------------------------------------------------------
  const containsEdges = relationships.filter((r) => r.type === 'contains').sort((a, b) => {
    const ka = `${a.source}|${a.target}`;
    const kb = `${b.source}|${b.target}`;
    return byCodePoint(ka, kb);
  });

  containsEdges.forEach((edge, index) => {
    const props = edge.properties ?? {};
    if (props.preparation) {
      const stateId = `istate_${edge.source}_${edge.target}`;
      recordIdMap(`contains:${edge.source}->${edge.target}.preparation`, stateId, 'IngredientState derived from contains.properties.preparation');
      entities.push({
        id: stateId,
        entity_type: 'IngredientState',
        schema_version: SCHEMA_VERSION,
        content_class: 'historical_inference',
        evidence_status: 'insufficient',
        review_status: 'unreviewed',
        provenance: v1Provenance({ notes: 'Preparation text copied verbatim from V1 contains.properties.preparation.' }),
        name: `${edge.source}·${edge.target} 处理态`,
        ingredient_id: edge.target,
        preparation: props.preparation,
        state_kind: stateKindFromPreparation(props.preparation),
      });
    }
    if (props.quantity) {
      const measurementId = `measure_${edge.source}_${edge.target}`;
      recordIdMap(`contains:${edge.source}->${edge.target}.quantity`, measurementId, 'Measurement derived from contains.properties.quantity');
      const mapped = measurementFromQuantityText(props.quantity);
      const unknown = [];
      if (mapped.quantity_value === undefined || mapped.normalization_status !== 'normalized') unknown.push('quantity_value');
      entities.push({
        id: measurementId,
        entity_type: 'Measurement',
        schema_version: SCHEMA_VERSION,
        content_class: 'historical_inference',
        evidence_status: 'insufficient',
        review_status: 'unreviewed',
        provenance: v1Provenance({ notes: 'Quantity wording copied verbatim from V1; no numeric normalisation was performed.' }),
        name: `${edge.source}·${edge.target} 用量`,
        quantity_text: mapped.quantity_text,
        quantity_value: null,
        unit: mapped.unit,
        of_ingredient_id: edge.target,
        used_by_dish_id: edge.source,
        normalization_status: mapped.normalization_status,
        unknown_fields: [...new Set([...unknown, 'quantity_value'])].sort(byCodePoint),
      });
    }
  });

  // ---------------------------------------------------------------------
  // Utensils: only from ancient_recipes.modern_adaptation (contract 9.9)
  // ---------------------------------------------------------------------
  const utensilClues = [
    { v1Id: 'recipe_001', name: '甑', kind: 'steamer', modern: '砂锅或蒸锅', source: '可用砂锅或蒸锅替代小甑' },
    { v1Id: 'recipe_005', name: '炙具', kind: 'stove', modern: '烤箱或平底锅', source: '可用烤箱200度烤制，或用平底锅煎制' },
  ];
  utensilClues.forEach((clue, index) => {
    const v2Id = `utensil_${String(index + 1).padStart(3, '0')}`;
    recordIdMap(`ancient_recipes.${clue.v1Id}.modern_adaptation`, v2Id, 'Utensil derived from modern_adaptation wording');
    entities.push({
      id: v2Id,
      entity_type: 'Utensil',
      schema_version: SCHEMA_VERSION,
      content_class: 'modern_adaptation',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        notes: `Modern-equivalent wording copied from ${clue.v1Id}.modern_adaptation ("${clue.source}"); this is a modern adaptation note, not a historical utensil record.`,
      }),
      name: clue.name,
      utensil_kind: clue.kind,
      material: null,
      modern_equivalent: clue.modern,
      unknown_fields: ['material'],
    });
  });

  // ---------------------------------------------------------------------
  // RestorationVersion from ancient_recipes steps (modern adaptation content)
  // ---------------------------------------------------------------------
  const dishNameToId = new Map(dishes.map((d) => [d.name, d.id]));
  for (const recipe of recipes) {
    const dishId = dishNameToId.get(recipe.dish_name);
    if (!dishId) {
      report.unmapped_fields.push({
        field: `ancient_recipes.${recipe.id}`,
        reason: `dish_name "${recipe.dish_name}" matches no Dish node; RestorationVersion not created`,
      });
      continue;
    }
    const claimId = `claim_${dishId}_adaptation`;
    recordIdMap(`${recipe.id}.steps`, claimId, 'HistoricalClaim recording that this is a modern adaptation');
    entities.push({
      id: claimId,
      entity_type: 'HistoricalClaim',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        unresolved: true,
        notes: 'Adaptation steps in V1 are modern cooking guidance, not historical evidence; no claim_supported_by.',
      }),
      name: `${recipe.dish_name}（现代适配说明）`,
      statement: `V1 提供的是现代厨房适配步骤，不构成历史证据：${String(recipe.modern_adaptation ?? '').slice(0, 120)}`,
      claim_type: 'other',
      about_ids: [dishId],
      confidence: 'unknown',
      uncertainty_notes: ['V1 steps are modern adaptation guidance; no historical source supports them as history.'],
    });

    const versionId = `resto_${recipe.id}`;
    recordIdMap(recipe.id, versionId, 'RestorationVersion from ancient_recipes');
    entities.push({
      id: versionId,
      entity_type: 'RestorationVersion',
      schema_version: SCHEMA_VERSION,
      content_class: 'modern_adaptation',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        notes: 'Steps copied verbatim from V1 ancient_recipes.steps; declared as modern_adaptation, not historical_faithful.',
      }),
      name: `${recipe.dish_name}·现代适配版`,
      dish_id: dishId,
      version_kind: 'modern_kitchen',
      based_on_claim_ids: [claimId],
      steps: recipe.steps.map((text, index) => ({ order: index + 1, text })),
      adaptation_notes: [String(recipe.modern_adaptation ?? '')],
    });
  }

  // ---------------------------------------------------------------------
  // SafetyRule from ingredient_mapping entries whose status forbids use
  // ---------------------------------------------------------------------
  const prohibited = (ingredientMapping.mappings ?? []).filter((m) => String(m.status ?? '').includes('禁止'));
  for (const entry of prohibited) {
    const target = ingredients.find((i) => i.name === entry.ancient_name);
    if (!target) {
      report.unmapped_fields.push({
        field: 'data/ingredients/ingredient_mapping.json',
        reason: `prohibited entry "${entry.ancient_name}" has no Ingredient node; SafetyRule not created`,
      });
      continue;
    }
    const v2Id = `safety_${target.id}`;
    recordIdMap(`ingredient_mapping:${entry.ancient_name}`, v2Id, 'SafetyRule from ingredient_mapping status');
    entities.push({
      id: v2Id,
      entity_type: 'SafetyRule',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'sufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({
        notes: `Rule text copied verbatim from ingredient_mapping.status ("${entry.status}").`,
      }),
      name: `${entry.ancient_name} 禁食规则`,
      rule_kind: 'prohibited_species',
      applies_to_ids: [target.id],
      severity: 'blocker',
      rule_text: entry.status,
      jurisdiction: 'CN',
    });
  }
  report.unmapped_fields.push({
    field: 'ingredient_mapping.mappings[] (non-prohibited entries)',
    reason: `${(ingredientMapping.mappings ?? []).length - prohibited.length} modern-substitute entries recorded as alias clues only; no modern_adaptation entity is auto-generated (contract 13.4)`,
  });

  // ---------------------------------------------------------------------
  // ExpertReview from the V1 manifest (statuses preserved verbatim)
  // ---------------------------------------------------------------------
  const reviewStatusByNode = new Map();
  const reviewTargetById = new Map();
  for (const node of manifest.flagship_nodes ?? []) {
    reviewTargetById.set(node.node_id, node);
    reviewStatusByNode.set(node.node_id, node.status);
  }
  for (const [nodeId, node] of [...reviewTargetById].sort((a, b) => byCodePoint(a[0], b[0]))) {
    const v2Id = `review_${nodeId}`;
    recordIdMap(`expert_review_manifest:${nodeId}`, v2Id, 'ExpertReview from manifest flagship_nodes');
    // Manifest reviewer is the string "Internal research lead" (fact-audit F8):
    // internal_editor only, never promoted to external_scholar.
    entities.push({
      id: v2Id,
      entity_type: 'ExpertReview',
      schema_version: SCHEMA_VERSION,
      content_class: 'historical_inference',
      evidence_status: 'insufficient',
      review_status: 'unreviewed',
      provenance: v1Provenance({ notes: 'Review record copied from expert_review_manifest.json; reviewer kind is internal only.' }),
      name: `${nodeId} 内部评审`,
      subject_id: idMap.get(nodeId) ?? nodeId,
      reviewer_kind: 'internal_editor',
      reviewer_name: node.reviewer ?? null,
      review_date: node.review_date ?? null,
      review_outcome: node.status === 'internal_reviewed' ? 'pending' : 'pending',
      scope_notes: node.notes ?? null,
      unknown_fields: node.reviewer ? [] : ['reviewer_name'],
    });
  }

  // ---------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------
  const relationKey = (r) => `${r.type}|${r.source}|${r.target}`;
  const seenRelations = new Set();
  const pushRelation = (relation) => {
    const key = relationKey(relation);
    if (seenRelations.has(key)) return false;
    seenRelations.add(key);
    relations.push(relation);
    return true;
  };

  const contentWorkTitles = new Set(contentWorks.map((w) => w.title));
  const recordedInByDish = new Map(relationships.filter((r) => r.type === 'recorded_in').map((r) => [r.source, r]));

  for (const edge of relationships) {
    const props = edge.properties ?? {};
    switch (edge.type) {
      case 'contains': {
        const mapped = measurementFromQuantityText(props.quantity);
        pushRelation({
          type: 'dish_contains_ingredient',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 contains edge.' }),
          properties: { quantity_text: props.quantity ?? null, role: props.role ?? null },
        });
        void mapped;
        break;
      }
      case 'uses_technique':
        pushRelation({
          type: 'dish_uses_technique',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 uses_technique edge; V1 properties.description dropped and reported.' }),
          properties: { step_order: Number.isInteger(props.step_order) ? props.step_order : null },
        });
        if (props.description) {
          report.unmapped_fields.push({
            field: `relationships.json uses_technique ${edge.source}->${edge.target}.properties.description`,
            value: props.description,
            reason: 'dropped: not representable in the V2 dish_uses_technique property set (contract 13.5)',
          });
        }
        break;
      case 'originated_in':
        pushRelation({
          type: 'dish_originated_in',
          source: edge.source,
          target: idMap.get(edge.target) ?? edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 originated_in edge.' }),
        });
        break;
      case 'popular_in':
        pushRelation({
          type: 'dish_popular_in',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 popular_in edge.' }),
          properties: { popularity: props.popularity ?? null },
        });
        break;
      case 'seasonal_for':
        pushRelation({
          type: 'dish_seasonal_for',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 seasonal_for edge.' }),
        });
        break;
      case 'technique_from':
        pushRelation({
          type: 'technique_from_region',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 technique_from edge.' }),
        });
        break;
      case 'substitute_for':
        pushRelation({
          type: 'ingredient_substitutes',
          source: edge.source,
          target: edge.target,
          evidence_status: 'insufficient',
          provenance: v1Provenance({ notes: 'Relation copied from V1 substitute_for edge.' }),
          properties: {
            similarity: typeof props.similarity === 'number' ? props.similarity : null,
            notes: props.notes ?? null,
          },
        });
        break;
      case 'recorded_in': {
        // Re-target onto the SourcePassage derived from dish.source_passage.
        const passageId = passageIdByV1Id.get(edge.source);
        if (!passageId) {
          report.dropped_relations.push({ relation: `${edge.source}->${edge.target}`, type: edge.type, reason: 'no SourcePassage derived for this dish' });
          break;
        }
        const dish = dishes.find((d) => d.id === edge.source);
        const targetNode = ancientTexts.find((t) => t.id === edge.target);
        const agrees = dish && targetNode && dish.source_text === targetNode.title;
        if (!agrees) {
          report.conflicts.push({
            dish: edge.source,
            v1_target: edge.target,
            v1_target_title: targetNode?.title ?? null,
            dish_source_text: dish?.source_text ?? null,
            resolution: 'relation kept, marked insufficient; no silent re-pointing or deletion (contract 13.5)',
          });
        }
        pushRelation({
          type: 'dish_recorded_in',
          source: edge.source,
          target: passageId,
          evidence_status: agrees ? 'sufficient' : 'insufficient',
          provenance: agrees
            ? v1Provenance({ notes: 'V1 recorded_in target title matches dish.source_text.' })
            : v1Provenance({
              unresolved: true,
              notes: `V1 recorded_in pointed at ${edge.target} ("${targetNode?.title ?? 'unknown'}") while dish.source_text is "${dish?.source_text ?? 'unknown'}"; conflict preserved, not silently re-pointed.`,
            }),
          properties: { chapter: props.chapter ?? null, locator_text: props.page_reference ?? null },
        });
        break;
      }
      case 'ingredient_from':
      case 'ingredient_season':
        report.dropped_relations.push({ relation: `${edge.source}->${edge.target}`, type: edge.type, reason: 'declared in V1 schema but unused; no V2 edge emitted' });
        break;
      default:
        report.dropped_relations.push({ relation: `${edge.source}->${edge.target}`, type: edge.type, reason: 'no V2 relation mapping defined' });
        break;
    }
  }

  // edition_of_work for every edition (exactly 1 each) and edition_contains_work.
  for (const [editionId, workIds] of [...containsWorkIdsByEdition].sort((a, b) => byCodePoint(a[0], b[0]))) {
    const edition = entities.find((e) => e.id === editionId);
    if (!edition) continue;
    pushRelation({
      type: 'edition_of_work',
      source: editionId,
      target: edition.work_id,
      evidence_status: 'sufficient',
      provenance: v1Provenance({ notes: 'Derived from literature.items[].authority.source_id (collected series).' }),
    });
    for (const workId of workIds) {
      pushRelation({
        type: 'edition_contains_work',
        source: editionId,
        target: workId,
        evidence_status: 'insufficient',
        provenance: v1Provenance({ notes: 'Derived from normalised literature.items[].included_texts match.' }),
      });
    }
  }

  // Claim links for the 30 lead claims.
  for (const dish of leadClaims) {
    pushRelation({
      type: 'claim_about',
      source: `claim_${dish.id}_lead`,
      target: dish.id,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ notes: 'Claim about the dish derived from its lead text.' }),
    });
  }

  // Claim links for adaptation claims.
  for (const recipe of recipes) {
    const dishId = dishNameToId.get(recipe.dish_name);
    if (!dishId) continue;
    pushRelation({
      type: 'claim_about',
      source: `claim_${dishId}_adaptation`,
      target: dishId,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ notes: 'Adaptation claim about the dish.' }),
    });
    pushRelation({
      type: 'restoration_version_of',
      source: `resto_${recipe.id}`,
      target: dishId,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ notes: 'Restoration version belongs to the dish.' }),
    });
    pushRelation({
      type: 'restoration_based_on_claim',
      source: `resto_${recipe.id}`,
      target: `claim_${dishId}_adaptation`,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ notes: 'Restoration version is based on the adaptation claim.' }),
    });
  }

  // SafetyRule links.
  for (const entity of entities.filter((e) => e.entity_type === 'SafetyRule')) {
    for (const target of entity.applies_to_ids) {
      pushRelation({
        type: 'safety_rule_applies_to',
        source: entity.id,
        target,
        evidence_status: 'sufficient',
        provenance: v1Provenance({ notes: 'Rule applies to the ingredient named in ingredient_mapping.' }),
      });
    }
  }

  // ExpertReview links.
  for (const entity of entities.filter((e) => e.entity_type === 'ExpertReview')) {
    pushRelation({
      type: 'review_of',
      source: entity.id,
      target: entity.subject_id,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ notes: 'Review subject from manifest flagship_nodes[].node_id.' }),
    });
  }

  // Dish <-> passage links derived from dish.source_passage for every book dish.
  for (const dish of dishes.filter((d) => !isLeadDish(d))) {
    const passageId = passageIdByV1Id.get(dish.id);
    if (!passageId) continue;
    if (recordedInByDish.has(dish.id)) continue; // already emitted from the V1 edge
    pushRelation({
      type: 'dish_recorded_in',
      source: dish.id,
      target: passageId,
      evidence_status: 'insufficient',
      provenance: v1Provenance({ unresolved: true, notes: 'Dish has source_passage but no V1 recorded_in edge; link emitted from source_text only.' }),
    });
  }

  // ---------------------------------------------------------------------
  // Deterministic ordering
  // ---------------------------------------------------------------------
  // Contract U1: every required-and-nullable field that is null must be named in
  // unknown_fields. Applied mechanically from the schema so no entity type is missed.
  // Contract U4 then forbids evidence_status="sufficient" whenever unknown_fields is
  // non-empty, so that is applied in the same pass rather than guessed per record.
  for (const entity of entities) {
    entity.unknown_fields = autoDeclareRequiredNulls(schema, entity);
    if (entity.unknown_fields.length > 0 && entity.evidence_status === 'sufficient') {
      entity.evidence_status = 'insufficient';
      if (entity.provenance && entity.provenance.derivation !== 'unresolved') {
        entity.provenance.notes = [
          entity.provenance.notes,
          'Downgraded from sufficient to insufficient because unknown_fields is non-empty (contract U4).',
        ].filter(Boolean).join(' ');
      }
    }
  }

  entities.sort((a, b) => byCodePoint(a.id, b.id));
  relations.sort((a, b) => {
    const ka = `${a.type}|${a.source}|${a.target}`;
    const kb = `${b.type}|${b.source}|${b.target}`;
    return byCodePoint(ka, kb);
  });
  report.id_mapping.sort((a, b) => byCodePoint(a.v1_id, b.v2_id));

  // ---------------------------------------------------------------------
  // Counts, preserved defects, guarantees
  // ---------------------------------------------------------------------
  const countBy = (list, key) => list.reduce((acc, item) => {
    const k = item[key];
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  report.counts = {
    entities_total: entities.length,
    entities_by_type: Object.fromEntries(Object.entries(countBy(entities, 'entity_type')).sort((a, b) => byCodePoint(a[0], b[0]))),
    relations_total: relations.length,
    relations_by_type: Object.fromEntries(Object.entries(countBy(relations, 'type')).sort((a, b) => byCodePoint(a[0], b[0]))),
    passages_by_resolution: Object.fromEntries(Object.entries(countBy(entities.filter((e) => e.entity_type === 'SourcePassage'), 'edition_resolution')).sort((a, b) => byCodePoint(a[0], b[0]))),
    historical_claims_by_evidence_status: Object.fromEntries(Object.entries(countBy(entities.filter((e) => e.entity_type === 'HistoricalClaim'), 'evidence_status')).sort((a, b) => byCodePoint(a[0], b[0]))),
  };

  report.preserved_v1_defects.push({
    entity: 'data/knowledge_graph/nodes_ancient_text.json',
    defect: 'text_lit_076 / text_lit_084 / text_lit_097 are absent; root cause scripts/build_literature_dataset.mjs:237 dedupes by title. Not repaired by this adapter.',
  });
  report.preserved_v1_defects.push({
    entity: 'data/literature/authoritative_recipe_texts.json',
    defect: 'no edition / passage / page fields; total_recipes is null for all 106 entries. Expressed as locator_scheme=volume + null + unknown_fields, not filled in.',
  });

  const passageCount = entities.filter((e) => e.entity_type === 'SourcePassage').length;
  const passageInEditionCount = relations.filter((r) => r.type === 'passage_in_edition').length;

  report.notes.push({
    key: 'no_disambiguation',
    text: `All ${passageCount} SourcePassage records were derived from V1 text. ${report.ambiguous_edition.length} have multiple candidate editions and ${report.unresolved_passages.length} have none, so none could be attributed to a single edition. The adapter does not pick a candidate to satisfy a cardinality rule, so this document contains ${passageInEditionCount} passage_in_edition relations.`,
  });
  report.notes.push({
    key: 'claims_all_insufficient',
    text: `All ${report.counts.entities_by_type.HistoricalClaim ?? 0} HistoricalClaim records are evidence_status="insufficient" because no passage chain reaches a resolved edition. This reflects the true evidence level of V1 and was not relaxed to make the output look better.`,
  });
  report.notes.push({
    key: 'no_verified_status',
    text: 'No record uses review_status="verified"; that value does not exist in the KB-001 enum, so a silently-verified record is structurally impossible.',
  });
  report.notes.push({
    key: 'adaptation_disclaimer',
    text: '适配成功只表示结构转换成功，不代表历史真实性已经核验。',
  });
  report.notes.push({
    key: 'v1_defects_preserved',
    text: 'V1 data defects (先秦 -221/-221, text_lit_076/084/097 gaps, recorded_in title conflicts) are preserved and reported, never silently corrected.',
  });

  // Contract 13.5 item 6 asserts 16 passages (15 ambiguous / 1 unresolved). The
  // adapter measured a different truth from the real files and reports the delta
  // rather than tuning the data to match the contract text.
  report.notes.push({
    key: 'contract_13_5_count_delta',
    text: `Contract 13.5 states 20 passage candidates reducing to 16 (15 ambiguous, 1 unresolved). The real V1 files yield ${passageCandidates.length} candidates reducing to ${passageCount} (${report.ambiguous_edition.length} ambiguous, ${report.unresolved_passages.length} unresolved). Two contract arithmetic errors were found: (a) the candidate list omits the 3 book-sourced dishes whose book name has no node (dish_005, dish_006, dish_010), which are 10 book dishes rather than 7; (b) recipe_005's work 饮膳正要 is contained by 3 literature editions, so it is ambiguous rather than the stated single unresolved case. The adapter follows the real data and the contract's own no-disambiguation rule; it does not adjust the data to match the contract count.`,
  });

  return { entities, relations, report, v1Inputs: V1_INPUTS };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const OUT_GITIGNORE_ENTRY = 'data/kb/generated/';

// The generated output must never enter version control (contract 13.6). The entry
// is appended once and skipped if already present, so repeated runs stay idempotent.
function ensureGitignoreEntry() {
  const gitignorePath = path.join(REPO_ROOT, '.gitignore');
  let current = '';
  try {
    current = fs.readFileSync(gitignorePath, 'utf8');
  } catch {
    return { changed: false, reason: '.gitignore not found' };
  }
  const lines = current.split(/\r?\n/);
  if (lines.some((line) => line.trim() === OUT_GITIGNORE_ENTRY)) {
    return { changed: false, reason: 'entry already present' };
  }
  const suffix = current.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(gitignorePath, `${current}${suffix}${OUT_GITIGNORE_ENTRY}\n`, 'utf8');
  return { changed: true, reason: 'appended' };
}

function parseArgs(argv) {
  const args = { dryRun: false, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) return { error: '--out requires a directory argument' };
      args.out = value;
      i += 1;
    } else if (token === '--help' || token === '-h') args.help = true;
    else return { error: `unknown argument "${token}"` };
  }
  return args;
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// --- Output boundary guard (K1) --------------------------------------------
// `--out` must resolve inside the repository. Anything else is a CLI usage
// error (exit 2) and must not touch the filesystem at all.
//
// Why a *resolved-path* comparison instead of `candidate.startsWith(REPO_ROOT)`:
// startsWith() is a raw string test, so a sibling whose name merely begins with
// the boundary is accepted — a boundary of `C:\repo\data` wrongly matches
// `C:\repo\data2`. A string test is also blind to path separators and to the
// host's case rules. path.relative() closes all three gaps: it is
// separator-aware, case-aware on Windows, and returns an *absolute* path when
// the two sides sit on different roots (another drive or a UNC share). So
// `..` traversal, foreign absolute paths, drive escapes and UNC escapes all fail
// the same predicate.
function escapesRoot(candidate, root) {
  const rel = path.relative(root, candidate);
  return path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`);
}

// Deepest ancestor of `target` that currently exists (target itself when it does).
function deepestExistingAncestor(target) {
  let current = target;
  for (;;) {
    if (fs.existsSync(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
}

// Lexical containment cannot see a symlink, so the deepest existing ancestor is
// additionally canonicalised with realpathSync and must stay inside the
// canonical repository root.
//
// The failure reasons are fixed strings (no absolute paths, no timestamps) so a
// test can assert on them exactly.
const OUT_ESCAPE_REASON = '--out must stay inside the repository; refusing to write outside it';
const OUT_CANONICAL_REASON = '--out could not be canonicalised';

function checkOutDir(requested) {
  const candidate = path.resolve(REPO_ROOT, requested);
  if (escapesRoot(candidate, REPO_ROOT)) {
    return { ok: false, reason: OUT_ESCAPE_REASON };
  }

  let realRoot;
  let realAncestor;
  try {
    realRoot = fs.realpathSync(REPO_ROOT);
    realAncestor = fs.realpathSync(deepestExistingAncestor(candidate));
  } catch {
    return { ok: false, reason: OUT_CANONICAL_REASON };
  }
  if (escapesRoot(realAncestor, realRoot)) {
    return { ok: false, reason: OUT_ESCAPE_REASON };
  }

  return { ok: true, dir: candidate };
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error) {
    process.stderr.write(`adapt-v1-to-v2: ${args.error}\nUsage: node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write('Usage: node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]\n');
    return 0;
  }

  // Validate --out before any filesystem work and before the dry-run branch, so
  // an illegal path can neither create a directory nor be silently ignored.
  const outCheck = checkOutDir(args.out);
  if (!outCheck.ok) {
    process.stderr.write(`adapt-v1-to-v2: ${outCheck.reason}\nUsage: node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]\n`);
    return 2;
  }

  const before = snapshotReadonlyInputs();

  let built;
  try {
    built = buildV2();
  } catch (error) {
    process.stderr.write(`adapt-v1-to-v2: hard failure: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const document = {
    schema_version: SCHEMA_VERSION,
    metadata: {
      generated_by: 'scripts/kb/adapt-v1-to-v2.mjs',
      contract: 'docs/kb-001/01-schema-contract.md',
      source: 'V1 data under data/knowledge_graph, data/literature, data/recipes, data/fragments',
      disclaimer: '适配成功只表示结构转换成功，不代表历史真实性已经核验。',
    },
    entities: built.entities,
    relations: built.relations,
  };

  const after = snapshotReadonlyInputs();
  const changed = [];
  for (const [file, hash] of before) {
    if (after.get(file) !== hash) changed.push(file);
  }
  for (const [file] of after) {
    if (!before.has(file)) changed.push(file);
  }
  if (changed.length > 0) {
    process.stderr.write(`adapt-v1-to-v2: hard failure: V1 input files changed during the run: ${changed.join(', ')}\n`);
    return 1;
  }
  built.report.notes.push({
    key: 'readonly_guarantee',
    text: `All ${before.size} files under ${READONLY_DIRS.join(', ')} were hashed before and after the run; ${changed.length} changed.`,
  });

  const docText = stableStringify(document);
  const reportText = stableStringify(built.report);

  if (args.dryRun) {
    process.stdout.write(`adapt-v1-to-v2: dry run\n${JSON.stringify({
      out: args.out,
      would_write: [`${args.out}/kb-v2.kb.json`, `${args.out}/adaptation-report.json`],
      entities: document.entities.length,
      relations: document.relations.length,
      entities_by_type: built.report.counts.entities_by_type,
      relations_by_type: built.report.counts.relations_by_type,
      passages_by_resolution: built.report.counts.passages_by_resolution,
      historical_claims_by_evidence_status: built.report.counts.historical_claims_by_evidence_status,
      passage_in_edition_relations: document.relations.filter((r) => r.type === 'passage_in_edition').length,
      v1_inputs_unchanged: changed.length === 0,
    }, null, 2)}\n`);
    return 0;
  }

  const outDir = outCheck.dir;
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'kb-v2.kb.json'), docText, 'utf8');
    fs.writeFileSync(path.join(outDir, 'adaptation-report.json'), reportText, 'utf8');
  } catch (error) {
    process.stderr.write(`adapt-v1-to-v2: hard failure: cannot write output: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const gitignore = ensureGitignoreEntry();
  process.stderr.write(`adapt-v1-to-v2: wrote ${document.entities.length} entities and ${document.relations.length} relations to ${args.out}\n`);
  process.stderr.write(`adapt-v1-to-v2: .gitignore ${OUT_GITIGNORE_ENTRY} -> ${gitignore.reason}\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
