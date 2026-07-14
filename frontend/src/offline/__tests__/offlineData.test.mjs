import test from 'node:test';
import assert from 'node:assert/strict';
import {
  museumDishes,
  crabOrangeEvidence,
  mentorAnswers,
  quizData,
  museumOffer,
  evidenceKinds,
} from '../data/offlineMuseumData.js';

test('museum dishes contain exactly 40 entries', () => {
  assert.equal(museumDishes.length, 40);
});

test('museum dish ids follow dish_001..dish_040 zero-padded format', () => {
  assert.deepEqual(
    museumDishes.map((dish) => dish.id),
    Array.from({ length: 40 }, (_, index) => `dish_${String(index + 1).padStart(3, '0')}`),
  );
});

test('crab orange evidence exposes three fixed hotspots', () => {
  assert.equal(crabOrangeEvidence.hotspots.length, 3);
});

test('museum dishes only use the three approved archive states', () => {
  assert.deepEqual(
    new Set(museumDishes.map((dish) => dish.archiveState)),
    new Set(['证据完整', '推荐考据', '资料待补']),
  );
});

test('every museum dish carries image, name and dynasty', () => {
  assert.ok(museumDishes.every((dish) => dish.image && dish.name && dish.dynasty));
});

test('crab orange evidence hotspots carry full citation fields', () => {
  for (const hotspot of crabOrangeEvidence.hotspots) {
    assert.ok(hotspot.id, 'hotspot needs id');
    assert.ok(hotspot.label, 'hotspot needs label');
    assert.ok(hotspot.quote, 'hotspot needs quote');
    assert.ok(hotspot.source, 'hotspot needs source');
    assert.ok(hotspot.kind, 'hotspot needs kind');
    assert.ok(hotspot.confidence, 'hotspot needs confidence');
    assert.ok(hotspot.explanation, 'hotspot needs explanation');
  }
});

test('crab orange evidence covers shell, filling and steaming structure', () => {
  const quotes = crabOrangeEvidence.hotspots.map((h) => h.quote).join('\n');
  assert.ok(quotes.includes('以橙为器'), 'should cite the orange vessel line');
  assert.ok(quotes.includes('以蟹膏肉实其内'), 'should cite the crab filling line');
  assert.ok(
    quotes.includes('覆橙顶，入甑蒸熟') || quotes.includes('入甑蒸熟'),
    'should cite the steaming structure line',
  );
});

test('evidence kinds list the five canonical categories', () => {
  assert.deepEqual(evidenceKinds, [
    '文献明确记载',
    '跨资料推断',
    '现代转译',
    '证据不足',
    '待专家复核',
  ]);
});

test('museum offer describes interactive exhibit, timeline, devices, deliverables and metrics', () => {
  const offer = JSON.stringify(museumOffer);
  assert.ok(offer.includes('博物馆互动展项'), 'should name the interactive exhibit');
  assert.ok(offer.includes('2–4 周'), 'should state the 2-4 week timeline');
  assert.ok(offer.includes('触摸屏'), 'should list touchscreen device');
  assert.ok(offer.includes('大屏'), 'should list large screen device');
  assert.ok(offer.includes('展台'), 'should list exhibit podium device');
  assert.ok(offer.includes('交付内容'), 'should list deliverables');
  assert.ok(offer.includes('评估指标'), 'should list evaluation metrics');
  assert.ok(offer.includes('体验完成率'), 'should track experience completion rate');
  assert.ok(offer.includes('平均停留时间'), 'should track average dwell time');
  assert.ok(offer.includes('证据热点点击率'), 'should track evidence hotspot click rate');
  assert.ok(offer.includes('研学任务完成率'), 'should track study task completion rate');
});

test('quiz data exposes real and fake heritage dishes', () => {
  assert.ok(Array.isArray(quizData.real) && quizData.real.length > 0);
  assert.ok(Array.isArray(quizData.fake) && quizData.fake.length > 0);
});

test('mentor answers are available for offline guidance', () => {
  assert.ok(mentorAnswers && Object.keys(mentorAnswers).length > 0);
});
