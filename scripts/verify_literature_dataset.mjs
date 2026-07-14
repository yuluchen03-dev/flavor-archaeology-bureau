import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const literatureDataset = readJson('data/literature/authoritative_recipe_texts.json');
const ancientTextNodes = readJson('data/knowledge_graph/nodes_ancient_text.json');

assert(
  literatureDataset && Array.isArray(literatureDataset.items),
  'authoritative_recipe_texts.json must contain an items array',
);
assert(
  Array.isArray(literatureDataset.sources) && literatureDataset.sources.length > 0,
  'authoritative_recipe_texts.json must contain source metadata',
);

const literature = literatureDataset.items;
assert(literature.length >= 100, `expected at least 100 authoritative literature entries, got ${literature.length}`);
assert(
  literatureDataset.total === literature.length,
  `dataset total ${literatureDataset.total} does not match item count ${literature.length}`,
);

const ids = new Set();
const titles = new Set();

for (const [index, entry] of literature.entries()) {
  const label = entry.title || `entry at index ${index}`;

  assert(entry.id, `${label} is missing id`);
  assert(!ids.has(entry.id), `${label} has duplicate id ${entry.id}`);
  ids.add(entry.id);

  assert(entry.title, `${label} is missing title`);
  assert(!titles.has(entry.title), `${label} has duplicate title`);
  titles.add(entry.title);

  assert(entry.dynasty, `${label} is missing dynasty`);
  assert(entry.category, `${label} is missing category`);
  assert(entry.description, `${label} is missing description`);

  assert(entry.authority, `${label} is missing authority metadata`);
  assert(entry.authority.source_url, `${label} is missing authority.source_url`);
  assert(entry.authority.institution, `${label} is missing authority.institution`);
  assert(entry.authority.verification_note, `${label} is missing authority.verification_note`);
}

assert(Array.isArray(ancientTextNodes), 'nodes_ancient_text.json must be an array');

const authorityBackedNodes = ancientTextNodes.filter((node) =>
  node.source_url && node.authority_institution && node.verification_note
);

assert(
  authorityBackedNodes.length >= 100,
  `expected at least 100 authority-backed ancient_text nodes, got ${authorityBackedNodes.length}`,
);

console.log(`Verified ${literature.length} authoritative literature entries.`);
console.log(`Verified ${authorityBackedNodes.length} authority-backed ancient_text nodes.`);
