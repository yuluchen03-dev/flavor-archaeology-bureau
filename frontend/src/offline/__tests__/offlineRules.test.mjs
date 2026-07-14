import test from 'node:test';
import assert from 'node:assert/strict';
import { matchClue } from '../lib/clueMatcher.js';
import { fuseDishes } from '../lib/fusionEngine.js';
import { getDailyRevival } from '../lib/dailyRevival.js';
import { matchAncestor } from '../lib/ancestorMatcher.js';
import { createCertificateSvg } from '../lib/certificate.js';
import { saveProgress, loadProgress, clearProgress } from '../lib/progressStore.js';

test('matchClue returns matched for the canonical crab-orange passage', () => {
  assert.equal(matchClue('黄熟大橙，蟹膏肉实其内').status, 'matched');
});

test('matchClue returns insufficient for weak clues', () => {
  assert.equal(matchClue('今天有点饿').status, 'insufficient');
});

test('insufficient clue results list at least three needed clues', () => {
  assert.ok(matchClue('今天有点饿').neededClues.length >= 3);
});

test('getDailyRevival returns the same dish for the same date', () => {
  assert.equal(
    getDailyRevival(new Date('2026-07-14')).id,
    getDailyRevival(new Date('2026-07-14')).id,
  );
});

test('fuseDishes reports offline rule-based inference mode', () => {
  assert.equal(fuseDishes('dish_001', 'dish_002').mode, '离线规则推演');
});

test('matchAncestor labels every result as offline inference', () => {
  assert.equal(matchAncestor({ description: '橙香蟹粉面' }).status, '离线推测');
});

test('createCertificateSvg returns an SVG document', () => {
  assert.match(createCertificateSvg({ title: '蟹酿橙复原官' }), /<svg/);
});

test('progress store persists and clears offline progress', () => {
  clearProgress();
  assert.equal(saveProgress({ revivedDishes: ['dish_001'] }), 'memory');
  assert.deepEqual(loadProgress().revivedDishes, ['dish_001']);
  clearProgress();
  assert.deepEqual(loadProgress(), {});
});
