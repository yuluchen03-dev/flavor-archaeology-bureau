import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as offlineUi from '../verify_offline_ui.mjs';

const root = resolve(import.meta.dirname, '../..');
const { findOverlaps, hasPixelVariance } = offlineUi;

test('findOverlaps reports intersecting visible controls', () => {
  const controls = [
    { name: 'a', left: 0, top: 0, right: 40, bottom: 40, visible: true },
    { name: 'b', left: 20, top: 20, right: 60, bottom: 60, visible: true },
  ];
  assert.deepEqual(findOverlaps(controls), [['a', 'b']]);
});

test('hasPixelVariance rejects blank canvas samples', () => {
  assert.equal(hasPixelVariance({ channels: [{ stdev: 0 }, { stdev: 0 }, { stdev: 0 }] }), false);
  assert.equal(hasPixelVariance({ channels: [{ stdev: 12 }, { stdev: 7 }, { stdev: 3 }] }), true);
});

test('changedPixelRatio measures visibly changed RGBA pixels', () => {
  assert.equal(typeof offlineUi.changedPixelRatio, 'function');
  const before = Uint8Array.from([0, 0, 0, 255, 10, 10, 10, 255]);
  const after = Uint8Array.from([40, 0, 0, 255, 10, 10, 10, 255]);
  assert.equal(offlineUi.changedPixelRatio(before, after), 0.5);
});

test('browser verifier exercises the featured fusion shortcut and resets the archive tab', () => {
  const source = readFileSync(resolve(root, 'scripts/verify_offline_ui.mjs'), 'utf8');
  for (const label of ['接手这宗风味案', '查看融合推演', '蟹粉橙香米羹', '馆藏档案', '考据问答']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /inspectFeaturedFusion/);
});
