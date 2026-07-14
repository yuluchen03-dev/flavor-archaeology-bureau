import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGraphData } from '../verify_graph_schema.mjs';

const schema = {
  node_types: {
    dish: {},
    ingredient: {},
    ancient_text: {},
  },
  relationship_types: {
    contains: { source: 'dish', target: 'ingredient' },
    recorded_in: { source: 'dish', target: 'ancient_text' },
  },
};

const nodesByType = {
  dish: [
    {
      id: 'dish_001',
      source_text: 'Demo text',
      source_passage: 'Demo passage',
    },
  ],
  ingredient: [{ id: 'ing_001' }],
  ancient_text: [
    {
      id: 'text_001',
      source_url: 'https://example.test/source',
      authority_institution: 'Demo archive',
      verification_note: 'Catalog checked',
    },
  ],
};

const relationships = [
  { source: 'dish_001', target: 'ing_001', type: 'contains' },
  {
    source: 'dish_001',
    target: 'text_001',
    type: 'recorded_in',
    properties: { chapter: '卷一' },
  },
];

const manifest = {
  version: '1.0.0',
  review_status_values: ['internal_reviewed', 'pending_external_expert'],
  flagship_nodes: [
    {
      node_id: 'dish_001',
      node_type: 'dish',
      reviewer: 'Internal research lead',
      status: 'internal_reviewed',
      review_date: '2026-07-06',
      notes: 'Source passage present; awaiting external expert review.',
      citation_ids: ['citation_001'],
    },
  ],
  flagship_citations: [
    {
      citation_id: 'citation_001',
      ancient_text_id: 'text_001',
      reviewer: 'Internal research lead',
      status: 'pending_external_expert',
      review_date: '2026-07-06',
      notes: 'Archive metadata present; needs outside scholar sign-off.',
    },
  ],
};

function validFixture(overrides = {}) {
  return {
    schema,
    nodesByType,
    relationships,
    manifest,
    ...overrides,
  };
}

test('validateGraphData accepts a graph with valid endpoints, source metadata, and expert manifest', () => {
  const result = validateGraphData(validFixture());

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.summary.nodeCount, 3);
  assert.equal(result.summary.relationshipCount, 2);
});

test('validateGraphData fails when a relationship endpoint does not exist', () => {
  const result = validateGraphData(validFixture({
    relationships: [
      { source: 'dish_001', target: 'missing_ing', type: 'contains' },
    ],
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /missing target node "missing_ing"/);
});

test('validateGraphData fails when required source metadata is missing', () => {
  const result = validateGraphData(validFixture({
    nodesByType: {
      ...nodesByType,
      dish: [{ id: 'dish_001', source_text: 'Demo text' }],
    },
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /dish_001.*source metadata/);
});

test('validateGraphData fails when expert manifest is missing', () => {
  const result = validateGraphData(validFixture({ manifest: null }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /expert review manifest is required/);
});

test('validateGraphData fails when expert manifest references unknown objects', () => {
  const result = validateGraphData(validFixture({
    manifest: {
      ...manifest,
      flagship_nodes: [
        {
          ...manifest.flagship_nodes[0],
          node_id: 'dish_missing',
        },
      ],
      flagship_citations: [
        {
          ...manifest.flagship_citations[0],
          ancient_text_id: 'text_missing',
        },
      ],
    },
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /unknown node "dish_missing"/);
  assert.match(result.errors.join('\n'), /unknown ancient_text "text_missing"/);
});

test('validateGraphData fails when expert manifest status is not allowlisted', () => {
  const result = validateGraphData(validFixture({
    manifest: {
      ...manifest,
      flagship_nodes: [
        {
          ...manifest.flagship_nodes[0],
          status: 'TYPO_STATUS',
        },
      ],
    },
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /flagship_nodes\[0\].*invalid status "TYPO_STATUS"/);
});

test('validateGraphData fails when manifest node_type disagrees with the real node type', () => {
  const result = validateGraphData(validFixture({
    manifest: {
      ...manifest,
      flagship_nodes: [
        {
          ...manifest.flagship_nodes[0],
          node_type: 'ingredient',
        },
      ],
    },
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /flagship_nodes\[0\].*node_type "ingredient".*actual type is "dish"/);
});

test('validateGraphData reports a structured error when a node collection is not an array', () => {
  const result = validateGraphData(validFixture({
    nodesByType: {
      ...nodesByType,
      ingredient: { id: 'ing_001' },
    },
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /nodesByType\.ingredient must be an array/);
});
