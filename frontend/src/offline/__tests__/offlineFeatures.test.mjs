import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const allOfflineExhibitSources = [
  read('src/offline/exhibits/ArchiveExhibit.jsx'),
  read('src/offline/exhibits/MentorExhibit.jsx'),
  read('src/offline/exhibits/EvolutionExhibit.jsx'),
  read('src/offline/exhibits/PlayExhibit.jsx'),
].join('\n');

test('all original capabilities are present in offline exhibits', () => {
  for (const label of ['数字传承人', '味觉星图', '风味进化', '拍照认祖', '每日复活', '真假非遗', '分享证书']) {
    assert.match(allOfflineExhibitSources, new RegExp(label));
  }
});

test('archive exhibit uses local dish data and archive states', () => {
  const archiveSource = read('src/offline/exhibits/ArchiveExhibit.jsx');
  assert.match(archiveSource, /museumDishes/);
  assert.match(archiveSource, /证据完整|推荐考据|资料待补/);
});

test('mentor exhibit labels offline answers', () => {
  const mentorSource = read('src/offline/exhibits/MentorExhibit.jsx');
  assert.match(mentorSource, /离线问答/);
});

test('evolution exhibit uses local fusion engine', () => {
  const evolutionSource = read('src/offline/exhibits/EvolutionExhibit.jsx');
  assert.match(evolutionSource, /fuseDishes/);
});

test('play exhibit uses local ancestor matcher, daily revival and certificate', () => {
  const playSource = read('src/offline/exhibits/PlayExhibit.jsx');
  assert.match(playSource, /matchAncestor|getDailyRevival|createCertificateSvg/);
});

test('offline exhibits never call network APIs', () => {
  assert.doesNotMatch(allOfflineExhibitSources, /fetch\(|apiRequest|axios/);
});
