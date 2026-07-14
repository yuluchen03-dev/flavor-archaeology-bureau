import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const readSource = (relativePath) => readFileSync(resolve(__dirname, relativePath), 'utf8');
const optionalSource = (relativePath) => {
  const filePath = resolve(__dirname, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
};

const appSource = readSource('../../App.jsx');
const layoutSource = readSource('../../components/Layout.jsx');
const inputSource = readSource('../Input.jsx');
const resultSource = readSource('../Result.jsx');
const starMapSource = readSource('../StarMap.jsx');
const lightModeSource = readSource('../LightMode.jsx');
const stylesSource = readSource('../../index.css');
const businessValueSource = optionalSource('../BusinessValue.jsx');
const judgeModeSource = optionalSource('../../lib/judgeMode.js');

test('judge mode has a persistent five-step evaluator rail and suppresses auth noise', () => {
  assert.match(judgeModeSource, /judgeSteps/);
  for (const label of ['线索输入', '可信复原', '味觉星图', '轻量玩法', '商业价值']) {
    assert.match(layoutSource + judgeModeSource, new RegExp(label));
  }
  assert.match(judgeModeSource, /demo['"]\)\s*===\s*['"]judge/);
  assert.match(judgeModeSource, /state['"]\)\s*===\s*['"]judge/);
  assert.match(judgeModeSource, /has\(['"]judge['"]\)/);
  assert.match(layoutSource, /judge-mode-rail/);
  assert.match(layoutSource, /下一步/);
  assert.match(layoutSource, /\{!isJudgeMode && <AuthPanel \/>}/);
  assert.match(layoutSource, /LanguageToggle/);
  assert.match(layoutSource, /judge-demo-link/);
});

test('judge mode route flow reaches business value from the four core pages', () => {
  assert.match(appSource, /BusinessValue/);
  assert.match(appSource, /path="business-value"/);
  assert.match(inputSource, /\/result\?demo=judge/);
  assert.match(inputSource, /下一步：可信复原/);
  assert.match(resultSource, /\/starmap\?demo=judge/);
  assert.match(resultSource, /下一步：味觉星图/);
  assert.match(starMapSource, /\/light\?demo=judge/);
  assert.match(starMapSource, /下一步：轻量玩法/);
  assert.match(lightModeSource, /\/business-value\?demo=judge/);
  assert.match(lightModeSource, /下一步：商业价值/);
});

test('business value page presents three b2b scenarios with investor-ready fields', () => {
  assert.ok(businessValueSource, 'BusinessValue.jsx should exist');
  for (const scenario of ['博物馆互动展项', '研学课程包', '餐饮文化新菜研发']) {
    assert.match(businessValueSource, new RegExp(scenario));
  }
  for (const field of ['客户痛点', '产品模块', '可交付资产', 'KPI', '试点价格区间']) {
    assert.match(businessValueSource, new RegExp(field));
  }
  assert.match(businessValueSource, /business-value-page/);
  assert.match(businessValueSource, /enterprise-solution-card/);
  assert.match(stylesSource, /\.business-value-page\b/);
});

test('result page exposes citations in an evidence drawer without long-form quoting', () => {
  assert.match(resultSource, /EvidenceDrawer/);
  assert.match(resultSource, /citations/);
  assert.match(resultSource, /source_url/);
  assert.match(resultSource, /verification_note/);
  assert.match(resultSource, /expertReviewed/);
  assert.match(resultSource, /license/);
  assert.match(resultSource, /copyright/);
  assert.match(resultSource, /aiMode/);
  assert.match(resultSource, /证据抽屉/);
  assert.match(resultSource, /短摘/);
});

test('judge result page can demonstrate low-evidence refusal without switching to cached demo', () => {
  assert.match(resultSource, /handleWeakClueTest/);
  assert.match(resultSource, /evidenceStatus:\s*'insufficient'/);
  assert.match(resultSource, /needsMoreClues:\s*true/);
  assert.match(resultSource, /fallbackReason/);
  assert.match(resultSource, /弱线索测试/);
  assert.doesNotMatch(resultSource, /handleWeakClueTest[\s\S]*loadCachedDemoResult/);
});

test('star map and light mode provide visible local demo fallback when backend is unavailable', () => {
  assert.match(starMapSource, /localStarMapDemo/);
  assert.match(starMapSource, /本地演示数据/);
  assert.match(starMapSource, /setDataMode\('local-demo'\)/);
  assert.match(lightModeSource, /localLightModeDemo/);
  assert.match(lightModeSource, /本地演示数据/);
  assert.match(lightModeSource, /setDataMode\('local-demo'\)/);
});
