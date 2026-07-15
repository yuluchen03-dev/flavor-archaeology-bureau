import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  for (const label of ['数字传承人', '风味馆藏库', '互动研究', '风味进化', '拍照认祖', '每日复活', '真假非遗', '分享证书']) {
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

test('archive provides collection and research tabs with a shared selected dish', () => {
  const archive = read('src/offline/exhibits/ArchiveExhibit.jsx');
  assert.match(archive, /馆藏档案/);
  assert.match(archive, /互动研究/);
  assert.match(archive, /selectedDishId/);
  assert.match(archive, /ResearchLab/);
});

test('research tools inherit the selected dish', () => {
  const mentor = read('src/offline/exhibits/MentorExhibit.jsx');
  const evolution = read('src/offline/exhibits/EvolutionExhibit.jsx');
  const play = read('src/offline/exhibits/PlayExhibit.jsx');
  assert.match(mentor, /selectedDishId/);
  assert.match(evolution, /selectedDishId/);
  assert.match(play, /selectedDishId/);
});

test('archive images remain lazy and only render in visible list or selected detail', () => {
  const archive = read('src/offline/exhibits/ArchiveExhibit.jsx');
  assert.match(archive, /loading="lazy"/);
  assert.doesNotMatch(archive, /museumDishes\.map[\s\S]*<img[\s\S]*museumDishes\.map/);
});

test('evolution keeps the second parent in the shared museum session', () => {
  const evolution = read('src/offline/exhibits/EvolutionExhibit.jsx');
  assert.match(evolution, /useMuseumSession/);
  assert.match(evolution, /state\.secondaryDishId/);
  assert.match(evolution, /type:\s*'selectSecondaryDish'/);
  assert.doesNotMatch(evolution, /useState\(''\)/);
});

test('featured fusion derives its proposal from local dishes and the fusion engine', () => {
  const featuredPath = resolve(root, 'src/offline/components/FeaturedFusion.jsx');
  assert.equal(existsSync(featuredPath), true, 'FeaturedFusion component must exist');
  const featured = read('src/offline/components/FeaturedFusion.jsx');
  for (const contract of [
    /museumDishes/,
    /fuseDishes\('dish_001',\s*'dish_003'\)/,
    /查看融合推演/,
    /待专家复核/,
    /featured-fusion-parent/,
  ]) {
    assert.match(featured, contract);
  }
  assert.doesNotMatch(featured, /fetch\(|axios|apiRequest/);
});

test('evolution renders structured fusion flavor metrics as text', () => {
  const evolution = read('src/offline/exhibits/EvolutionExhibit.jsx');
  assert.match(evolution, /Object\.entries\(result\?\.flavor/);
  assert.match(evolution, /flavorText/);
  assert.doesNotMatch(evolution, /新风味：\{result\.flavor\}/);
});
