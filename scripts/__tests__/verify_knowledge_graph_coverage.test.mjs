import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarkdown, buildSummary } from '../verify_knowledge_graph_coverage.mjs';

const dishes = [
  { id: 'dish_001', name: '蟹酿橙' },
  { id: 'dish_002', name: '槐叶冷淘' },
];

test('buildSummary counts core relation coverage per dish', () => {
  const summary = buildSummary(dishes, [
    { source: 'dish_001', target: 'text_001', type: 'recorded_in' },
    { source: 'dish_001', target: 'ing_001', type: 'contains' },
    { source: 'dish_001', target: 'tech_001', type: 'uses_technique' },
    { source: 'dish_001', target: 'dynasty_001', type: 'originated_in' },
    { source: 'dish_002', target: 'text_002', type: 'recorded_in' },
  ]);

  assert.equal(summary.totalDishes, 2);
  assert.equal(summary.coverageByRelation.recorded_in.coveredDishes, 2);
  assert.equal(summary.coverageByRelation.contains.coveredDishes, 1);
  assert.equal(summary.aggregate.dishesWithAllCoreRelations, 1);
  assert.equal(summary.aggregate.zeroCoreRelationDishes, 0);

  const secondDish = summary.dishCoverageRows.find((row) => row.dishId === 'dish_002');
  assert.deepEqual(secondDish.missingCoreRelations, ['contains', 'uses_technique', 'originated_in']);
});

test('buildSummary threshold reports dishes below minimum core relations', () => {
  const summary = buildSummary(dishes, [
    { source: 'dish_001', target: 'text_001', type: 'recorded_in' },
  ], { minCoreRelations: 1 });

  assert.equal(summary.threshold.failed, true);
  assert.deepEqual(summary.threshold.failedDishes.map((row) => row.dishId), ['dish_002']);
});

test('buildMarkdown includes coverage and priority sections', () => {
  const summary = buildSummary(dishes, [
    { source: 'dish_001', target: 'text_001', type: 'recorded_in' },
  ]);
  const markdown = buildMarkdown(summary);

  assert.match(markdown, /图谱覆盖率审计报告/);
  assert.match(markdown, /影响投资人信任的缺口/);
  assert.match(markdown, /48 小时补强目标/);
  assert.match(markdown, /dish_002/);
});
