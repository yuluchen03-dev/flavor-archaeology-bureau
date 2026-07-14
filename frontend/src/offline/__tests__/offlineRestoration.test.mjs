import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

test('restoration journey contains five named stages', () => {
  const restorationSource = read('src/offline/exhibits/RestorationExhibit.jsx');
  for (const label of ['装入历史线索', '古籍解码', '证据推演', '3D 复原', '双版本结果']) {
    assert.match(restorationSource, new RegExp(label));
  }
});

test('restoration journey shows evidence kinds and required labels', () => {
  const restorationSource = read('src/offline/exhibits/RestorationExhibit.jsx');
  const evidenceSource = read('src/offline/data/offlineMuseumData.js');
  for (const label of ['文献明确记载', '跨资料推断', '现代转译', '证据不足', '待专家复核']) {
    assert.match(evidenceSource + restorationSource, new RegExp(label));
  }
  assert.match(restorationSource, /跳过动效/);
  assert.match(restorationSource, /历史复原档案/);
  assert.match(restorationSource, /现代厨房转译/);
  assert.match(restorationSource, /研究性复原，不替代学术定论/);
});

test('home presents one primary action, archive access, and first-view evidence signals', () => {
  const homeSource = read('src/offline/exhibits/HomeExhibit.jsx');
  assert.match(homeSource, /以文献为证，复原失传中国味道/);
  assert.match(homeSource, /开始可信复原/);
  assert.match(homeSource, /浏览风味馆藏/);
  assert.match(homeSource, /40 道馆藏/);
  assert.match(homeSource, /《山家清供》/);
  assert.match(homeSource, /variant="hero"/);
  assert.doesNotMatch(homeSource, /home-route-primary.*home-route-secondary/s);
});

test('business exhibit contains museum pilot offer', () => {
  const businessSource = read('src/offline/exhibits/BusinessExhibit.jsx');
  assert.match(businessSource, /博物馆互动展项/);
  assert.match(businessSource, /商业合作/);
});
