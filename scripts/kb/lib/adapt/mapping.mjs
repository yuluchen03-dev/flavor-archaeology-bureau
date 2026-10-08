// KB-001C V1→V2 adapter: pure mapping helpers.
// Contract: docs/kb-001/01-schema-contract.md sections 13.3 / 13.4 / 13.5.
//
// These helpers contain no I/O so they stay easy to reason about and reuse.
// This module only ADDS to scripts/kb/lib/; it never rewrites the KB-001B modules.

// Chinese V1 category -> V2 enum (contract 13.4). Unlisted values must raise,
// never be guessed.
export const INGREDIENT_CATEGORY_MAP = {
  谷物: 'grain',
  蔬菜: 'vegetable',
  水果: 'fruit',
  果品: 'fruit',
  肉类: 'meat',
  水产: 'aquatic',
  调料: 'seasoning',
  菌菇: 'fungus',
  乳品: 'dairy',
  其他: 'other',
};

export const TECHNIQUE_CATEGORY_MAP = {
  刀工: 'knife',
  火候: 'heat',
  调味: 'seasoning',
  成型: 'shaping',
  发酵: 'fermentation',
  腌制: 'curing',
  其他: 'other',
};

export const WORK_TYPE_BY_TEXT = {
  山家清供: 'food_monograph',
  随园食单: 'food_monograph',
  饮膳正要: 'materia_medica',
  齐民要术: 'agricultural_treatise',
  东京梦华录: 'encyclopedic_reference',
};

// Whitespace-stripped comparison key used to merge duplicate passages (13.5).
export function passageKey(text) {
  return String(text ?? '').replace(/\s+/g, '');
}

// `included_texts` normalisation: drop everything from the first （ or ( ,
// then everything from the first ·, then trim (contract 9.2).
export function normalizeIncludedText(value) {
  return String(value ?? '')
    .split(/[（(]/)[0]
    .split('·')[0]
    .trim();
}

// ancient_recipes.source looks like 《山家清供》卷下 ; take the 《》 content and
// drop anything from the first · onwards (contract 13.5 item 3).
export function bookNameFromRecipeSource(source) {
  const raw = String(source ?? '');
  const match = raw.match(/《([^》]+)》/);
  const inner = match ? match[1] : raw;
  return inner.split('·')[0].trim();
}

// Quantity text -> (unit, normalization_status). Values are only ever taken from
// the V1 string; no numeric value is invented (contract 9.10 ME1/ME2).
export function measurementFromQuantityText(quantityText) {
  const text = String(quantityText ?? '').trim();
  if (text === '' || text === '适量' || text === '少许') {
    return { quantity_text: text === '' ? null : text, unit: 'to_taste', normalization_status: 'unnormalizable' };
  }
  if (text.endsWith('个')) return { quantity_text: text, unit: 'piece', normalization_status: 'as_recorded' };
  if (text.endsWith('块')) return { quantity_text: text, unit: 'piece', normalization_status: 'as_recorded' };
  if (text.endsWith('斤')) return { quantity_text: text, unit: 'jin', normalization_status: 'as_recorded' };
  if (text.endsWith('两')) return { quantity_text: text, unit: 'liang', normalization_status: 'as_recorded' };
  if (text.endsWith('升')) return { quantity_text: text, unit: 'sheng', normalization_status: 'as_recorded' };
  if (text.endsWith('斗')) return { quantity_text: text, unit: 'dou', normalization_status: 'as_recorded' };
  // Unrecognised wording: keep the raw text and admit the unit is unknown.
  return { quantity_text: text, unit: 'unknown', normalization_status: 'as_recorded' };
}

// `contains.properties.preparation` -> IngredientState.state_kind.
// Only the explicit verbs present in V1 are mapped; anything else stays `other`
// so no preparation semantics are invented.
export function stateKindFromPreparation(preparation) {
  const text = String(preparation ?? '');
  if (text.includes('切碎') || text.includes('切片') || text.includes('切')) return 'chopped';
  if (text.includes('去皮') || text.includes('去瓤')) return 'chopped';
  if (text.includes('打碎') || text.includes('磨')) return 'ground';
  if (text.includes('晾干') || text.includes('晒干')) return 'dried';
  if (text.includes('泡') || text.includes('浸')) return 'soaked';
  if (text.includes('蒸') || text.includes('煮') || text.includes('熟')) return 'cooked';
  if (text.includes('混合') || text.includes('搅拌')) return 'mixed';
  if (text.includes('取') || text.includes('留')) return 'raw';
  return 'other';
}

export function isLeadDish(dish) {
  return String(dish?.source_text ?? '').endsWith('线索');
}

// Deterministic lexicographic comparison by Unicode code point. JavaScript's
// default string comparison already compares UTF-16 code units, which for the
// CJK range used here matches code-point order.
export function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
