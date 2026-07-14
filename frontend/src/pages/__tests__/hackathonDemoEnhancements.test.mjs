import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputSource = readFileSync(resolve(__dirname, '../Input.jsx'), 'utf8');
const resultSource = readFileSync(resolve(__dirname, '../Result.jsx'), 'utf8');
const starMapSource = readFileSync(resolve(__dirname, '../StarMap.jsx'), 'utf8');
const lightModeSource = readFileSync(resolve(__dirname, '../LightMode.jsx'), 'utf8');
const evolutionSource = readFileSync(resolve(__dirname, '../Evolution.jsx'), 'utf8');
const teachingSource = readFileSync(resolve(__dirname, '../Teaching.jsx'), 'utf8');
const homeSource = readFileSync(resolve(__dirname, '../Home.jsx'), 'utf8');
const layoutSource = readFileSync(resolve(__dirname, '../../components/Layout.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('input page provides a one-click hackathon demo clue preset', () => {
  assert.match(inputSource, /demoClue/);
  assert.match(inputSource, /handleUseDemoClue/);
  assert.match(inputSource, /现场演示/);
  assert.match(inputSource, /使用蟹酿橙线索/);
  assert.match(inputSource, /setPeriod\('宋元'\)/);
  assert.match(inputSource, /setRegion\('江南'\)/);
});

test('result page renders a dramatic evidence timeline and graph panel', () => {
  assert.match(resultSource, /evidenceTimelineStages/);
  assert.match(resultSource, /EvidenceGraphPanel/);
  for (const label of ['古籍解码', '食材校验', '技法推演', '成品复原']) {
    assert.match(resultSource, new RegExp(label));
  }
  for (const relation of ['古籍', '菜品', '食材', '技法', '朝代\\/地域', '替代食材']) {
    assert.match(resultSource, new RegExp(relation));
  }
  assert.match(resultSource, /evidence-source-chip/);
});

test('star map defaults to a focused crab orange demo node with motion styling', () => {
  assert.match(starMapSource, /demoFocusDishId/);
  assert.match(starMapSource, /蟹酿橙/);
  assert.match(starMapSource, /is-demo-focus/);
  assert.match(starMapSource, /archive-drawer is-demo-open/);
  assert.match(stylesSource, /\.star-node\.is-demo-focus\b/);
  assert.match(stylesSource, /\.archive-drawer\.is-demo-open\b/);
});

test('evolution result has a reveal moment and lineage strip for the generated dish', () => {
  assert.match(evolutionSource, /evolution-reveal-stage/);
  assert.match(evolutionSource, /lineage-strip/);
  assert.match(evolutionSource, /lineage-node/);
  assert.match(evolutionSource, /lineage-result/);
  assert.match(stylesSource, /\.evolution-reveal-stage\b/);
  assert.match(stylesSource, /\.lineage-strip\b/);
});

test('judge mode gives evaluators a single guided entry path', () => {
  assert.match(layoutSource, /judge-demo-link/);
  assert.match(layoutSource, /现场演示/);
  assert.match(homeSource, /judge-demo-primary/);
  assert.match(homeSource, /90 秒评委路径/);
  assert.match(homeSource, /to="\/input\?demo=judge"/);
});

test('result page has cached demo fallback and visible ai status labels', () => {
  assert.match(resultSource, /cachedCrabOrangeDemo/);
  assert.match(resultSource, /loadCachedDemoResult/);
  assert.match(resultSource, /aiStatusLabel/);
  assert.match(resultSource, /缓存演示/);
  assert.match(resultSource, /降级/);
});

test('result page restores star map possible dishes instead of empty fallback clues', () => {
  assert.match(starMapSource, /possibleDishes:\s*\[\{\s*id:\s*activeDish\.id,\s*name:\s*activeDish\.name\s*\}\]/s);
  assert.match(resultSource, /analysisResult\?\.possibleDishes/);
  assert.match(resultSource, /loadFallback\(\{\s*possibleDishes\s*\}\)/s);
});

test('light mode offers a stable built-in sample without forcing default text', () => {
  assert.match(lightModeSource, /sampleAncestorDescription/);
  assert.match(lightModeSource, /handleUseSampleAncestor/);
  assert.doesNotMatch(lightModeSource, /value=\{effectiveDescription\}/);
  assert.match(lightModeSource, /内置样例/);
});

test('star map communicates archive scale with multiple revival states', () => {
  assert.match(starMapSource, /getDishArchiveState/);
  assert.match(starMapSource, /已复原/);
  assert.match(starMapSource, /推荐复原/);
  assert.match(starMapSource, /待考据/);
});

test('teaching page presents a stronger digital inheritor identity', () => {
  assert.match(teachingSource, /mentorIdentity/);
  assert.match(teachingSource, /宋代风味传承人/);
  assert.match(teachingSource, /评委可问/);
});
