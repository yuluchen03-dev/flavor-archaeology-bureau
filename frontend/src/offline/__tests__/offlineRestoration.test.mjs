import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

test('restoration journey contains five named stages', () => {
  const restorationSource = read('src/offline/exhibits/RestorationExhibit.jsx');
  const workflowSource = read('src/offline/components/WorkflowRail.jsx');
  const sessionSource = read('src/offline/state/museumSession.js');
  for (const label of ['装入历史线索', '古籍解码', '证据推演', '结构复原', '复原结论']) {
    assert.match(restorationSource + workflowSource + sessionSource, new RegExp(label));
  }
});

test('restoration journey shows evidence kinds and required labels', () => {
  const restorationSource = read('src/offline/exhibits/RestorationExhibit.jsx');
  const reportSource = read('src/offline/components/RestorationReport.jsx');
  const evidenceSource = read('src/offline/data/offlineMuseumData.js');
  for (const label of ['文献明确记载', '跨资料推断', '现代转译', '证据不足', '待专家复核']) {
    assert.match(evidenceSource + restorationSource, new RegExp(label));
  }
  assert.match(restorationSource + reportSource, /研究性复原/);
});

test('home presents a curation commission from restoration to new life', () => {
  const homeSource = read('src/offline/exhibits/HomeExhibit.jsx');
  for (const label of [
    '策展委托',
    '风味考古局',
    '从复原到新生',
    '接手这宗风味案',
    '古籍线索',
    '证据复原',
    '菜品融合',
    '数字展项',
  ]) {
    assert.match(homeSource, new RegExp(label));
  }
  assert.match(homeSource, /FeaturedFusion/);
  assert.match(homeSource, /type:\s*'openFusion'/);
  assert.match(homeSource, /variant="hero"/);
  assert.doesNotMatch(homeSource, /AI平台|智能助手|浏览风味馆藏/);
});

test('business exhibit contains museum pilot offer', () => {
  const businessSource = read('src/offline/exhibits/BusinessExhibit.jsx');
  const dataSource = read('src/offline/data/offlineMuseumData.js');
  assert.match(businessSource, /museumOffer/);
  assert.match(dataSource, /博物馆互动展项/);
  assert.match(businessSource, /合作展厅|展项规格/);
});

test('restoration is composed as a persistent workbench', () => {
  const source = read('src/offline/exhibits/RestorationExhibit.jsx');
  for (const component of ['WorkflowRail', 'CrabOrangeStage', 'EvidenceInspector', 'RestorationReport']) {
    assert.match(source, new RegExp(component));
  }
  assert.match(source, /restoration-workbench/);
  assert.match(source, /data-testid="restoration-next"/);
});

test('evidence inspector carries the complete trust record', () => {
  const source = read('src/offline/components/EvidenceInspector.jsx');
  for (const label of ['原文短摘', '出处', '证据类型', '可信度', '争议说明']) {
    assert.match(source, new RegExp(label));
  }
});

test('restoration report has four approved result sections', () => {
  const source = read('src/offline/components/RestorationReport.jsx');
  for (const label of ['历史复原结论', '现代厨房转译', '不可确认项', '证据覆盖率']) {
    assert.match(source, new RegExp(label));
  }
});

test('partnership exhibit uses a specification and implementation timeline', () => {
  const source = read('src/offline/exhibits/BusinessExhibit.jsx');
  for (const label of ['展项规格', '实施时间轴', '适用设备', '交付内容', '评估指标', '2–4 周']) {
    assert.match(source, new RegExp(label));
  }
  assert.doesNotMatch(source, /business-grid/);
});
