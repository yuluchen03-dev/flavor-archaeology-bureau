import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

test('scene uses WebGLRenderer and sphere geometry with orbit controls', () => {
  const sceneSource = read('src/offline/lib/createCrabOrangeScene.js');
  assert.match(sceneSource, /WebGLRenderer/);
  assert.match(sceneSource, /SphereGeometry/);
  assert.match(sceneSource, /OrbitControls/);
});

test('stage exposes reset, explode and historical or modern controls', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  assert.match(stageSource, /恢复视角/);
  assert.match(stageSource, /拆解结构/);
  assert.match(stageSource, /历史结构/);
  assert.match(stageSource, /现代成品/);
});

test('three hotspots are present with exact quotes', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  const fallbackSource = read('src/offline/components/CrabOrangeFallback.jsx');
  const dataSource = read('src/offline/data/offlineMuseumData.js');
  assert.match(stageSource, /crabOrangeEvidence\.hotspots\.map/);
  assert.match(fallbackSource, /crabOrangeEvidence\.hotspots\.map/);
  for (const label of ['以橙为器', '以蟹膏肉实其内', '覆橙顶，入甑蒸熟']) {
    assert.match(dataSource, new RegExp(label));
  }
});

test('stage falls back to CrabOrangeFallback when WebGL fails', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  const fallbackSource = read('src/offline/components/CrabOrangeFallback.jsx');
  const homeStyles = read('src/offline/styles/home.css');
  assert.match(stageSource, /CrabOrangeFallback/);
  assert.match(stageSource, /<CrabOrangeFallback[\s\S]*variant=\{variant\}/);
  assert.match(fallbackSource, /crab-orange-fallback-\$\{variant\}/);
  assert.match(homeStyles, /\.crab-orange-fallback-hero \.crab-orange-fallback-controls/);
  assert.match(homeStyles, /\.crab-orange-fallback-hero \.crab-orange-fallback-hotspots/);
});

test('scene exposes historical and modern modes with complete cleanup', () => {
  const source = read('src/offline/lib/createCrabOrangeScene.js');
  assert.match(source, /setMode/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /cancelAnimationFrame/);
  assert.match(source, /geometry\.dispose|geo\.dispose/);
  assert.match(source, /material\.dispose|mat\.dispose/);
  assert.match(source, /renderer\.dispose/);
});

test('stage uses numbered evidence annotations instead of corner quote buttons', () => {
  const source = read('src/offline/components/CrabOrangeStage.jsx');
  assert.match(source, /evidence-annotation-index/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /历史结构/);
  assert.match(source, /现代成品/);
});

test('fallback supports the same model modes and explode state', () => {
  const source = read('src/offline/components/CrabOrangeFallback.jsx');
  assert.match(source, /modelMode/);
  assert.match(source, /exploded/);
  assert.match(source, /selectedEvidenceId/);
});
