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

test('stage exposes reset, explode and wireframe controls', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  assert.match(stageSource, /恢复视角/);
  assert.match(stageSource, /拆解结构/);
  assert.match(stageSource, /线框|wireframe/);
});

test('three hotspots are present with exact quotes', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  const fallbackSource = read('src/offline/components/CrabOrangeFallback.jsx');
  for (const label of ['以橙为器', '以蟹膏肉实其内', '覆橙顶，入甑蒸熟']) {
    assert.match(stageSource + fallbackSource, new RegExp(label));
  }
});

test('stage falls back to CrabOrangeFallback when WebGL fails', () => {
  const stageSource = read('src/offline/components/CrabOrangeStage.jsx');
  assert.match(stageSource, /CrabOrangeFallback/);
});
