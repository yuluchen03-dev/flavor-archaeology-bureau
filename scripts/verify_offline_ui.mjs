import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = import.meta.dirname;
const repoRoot = path.resolve(scriptDir, '..');
const frontendDir = path.join(repoRoot, 'frontend');
const requireFromFrontend = createRequire(path.join(frontendDir, 'package.json'));
const { chromium } = requireFromFrontend('playwright');
const sharp = requireFromFrontend('sharp');

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
];

export function findOverlaps(items) {
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const a = items[leftIndex];
      const b = items[rightIndex];
      if (!a.visible || !b.visible) continue;
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (width * height > 4) overlaps.push([a.name, b.name]);
    }
  }
  return overlaps;
}

export function hasPixelVariance(stats) {
  return stats.channels.slice(0, 3).some((channel) => channel.stdev > 2);
}

export function changedPixelRatio(before, after, threshold = 24) {
  assert.equal(before.length, after.length, 'pixel buffers must have equal lengths');
  assert.equal(before.length % 4, 0, 'pixel buffers must contain RGBA data');
  let changed = 0;
  for (let index = 0; index < before.length; index += 4) {
    const delta = Math.abs(before[index] - after[index])
      + Math.abs(before[index + 1] - after[index + 1])
      + Math.abs(before[index + 2] - after[index + 2]);
    if (delta > threshold) changed += 1;
  }
  return changed / (before.length / 4);
}

function visibleButton(page, label) {
  return page.locator('button:visible').filter({ hasText: label }).first();
}

function createWatchers(page, { allowForcedWebglError = false } = {}) {
  const consoleErrors = [];
  const pageErrors = [];
  const networkRequests = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (allowForcedWebglError && text.includes('Error creating WebGL context')) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const protocol = new URL(request.url()).protocol;
    if (!['file:', 'data:'].includes(protocol)) networkRequests.push(request.url());
  });

  return { consoleErrors, pageErrors, networkRequests };
}

async function assertNoRuntimeErrors(watchers, label) {
  assert.deepEqual(watchers.consoleErrors, [], `${label}: console errors`);
  assert.deepEqual(watchers.pageErrors, [], `${label}: page errors`);
  assert.deepEqual(watchers.networkRequests, [], `${label}: external requests`);
}

async function assertLayout(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await page.evaluate(() => {
    const selectors = 'button, input, select, textarea, [role="button"]';
    const controls = Array.from(document.querySelectorAll(selectors)).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
      const text = element.getAttribute('aria-label') || element.textContent || element.getAttribute('name') || '';
      return {
        name: `${index}:${text.trim().replace(/\s+/g, ' ').slice(0, 36) || element.tagName.toLowerCase()}`,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        visible,
      };
    });
    return {
      controls,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${label}: horizontal overflow ${layout.scrollWidth}/${layout.clientWidth}`);
  assert.deepEqual(findOverlaps(layout.controls), [], `${label}: overlapping controls`);
}

async function assertCanvas(page, outputPath, label) {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const box = await canvas.boundingBox();
  assert.ok(box && box.width > 80 && box.height > 80, `${label}: canvas has no usable rectangle`);
  const buffer = await canvas.screenshot({ path: outputPath });
  const stats = await sharp(buffer).stats();
  assert.equal(hasPixelVariance(stats), true, `${label}: canvas pixels are blank`);
}

async function readCanvasPixels(canvas) {
  const buffer = await canvas.screenshot();
  return sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function assertCanvasChanged(page, action, label) {
  const canvas = page.locator('.crab-orange-canvas').first();
  const before = await readCanvasPixels(canvas);
  await action(canvas);
  await page.waitForTimeout(120);
  const after = await readCanvasPixels(canvas);
  assert.equal(after.info.width, before.info.width, `${label}: canvas width changed`);
  assert.equal(after.info.height, before.info.height, `${label}: canvas height changed`);
  const ratio = changedPixelRatio(before.data, after.data);
  assert.ok(ratio > 0.002, `${label}: only ${(ratio * 100).toFixed(3)}% of canvas pixels changed`);
}

async function inspectCanvasInteractions(page, label) {
  const canvas = page.locator('.crab-orange-canvas').first();
  const box = await canvas.boundingBox();
  assert.ok(box, `${label}: canvas bounding box unavailable`);
  const point = {
    x: box.x + box.width * 0.68,
    y: box.y + box.height * 0.56,
  };

  await assertCanvasChanged(page, async () => {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x - Math.min(90, box.width * 0.2), point.y - 24, { steps: 8 });
    await page.mouse.up();
  }, `${label}: pointer rotation`);

  await assertCanvasChanged(page, async () => {
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, -700);
  }, `${label}: wheel zoom`);

  await assertCanvasChanged(page, async () => {
    await visibleButton(page, '恢复视角').click();
  }, `${label}: reset view`);

  await assertCanvasChanged(page, async () => {
    await visibleButton(page, '拆解结构').click();
  }, `${label}: exploded mode`);
  await visibleButton(page, '拆解结构').click();
  await page.waitForTimeout(120);

  await assertCanvasChanged(page, async () => {
    await visibleButton(page, '现代成品').click();
  }, `${label}: modern mode`);
  await visibleButton(page, '历史结构').click();
  await page.waitForTimeout(120);
}

async function completeRestoration(page) {
  await visibleButton(page, '接手这宗风味案').click();
  await visibleButton(page, '装入预置线索').click();
  const next = page.locator('[data-testid="restoration-next"]');
  for (let stage = 0; stage < 4; stage += 1) {
    await next.waitFor({ state: 'visible' });
    assert.equal(await next.isDisabled(), false, `stage ${stage}: next button disabled`);
    await next.click();
  }
  await page.locator('.restoration-report').waitFor({ state: 'visible' });
}

async function inspectFeaturedFusion(page) {
  await visibleButton(page, '查看融合推演').click();
  await page.locator('.evolution-parent-fixed').waitFor({ state: 'visible' });
  assert.match(await page.locator('.evolution-parent-fixed').innerText(), /蟹酿橙/);
  assert.equal(await page.locator('.evolution-selector select').inputValue(), 'dish_003');
  await visibleButton(page, '推演融合').click();
  await page.getByRole('heading', { name: '蟹粉橙香米羹' }).waitFor();
}

async function inspectEvidenceAndModes(page) {
  const annotations = page.locator('.workbench-artifact .evidence-annotation:visible');
  assert.equal(await annotations.count(), 3, 'workbench must expose three evidence annotations');
  const quotes = [];
  for (let index = 0; index < 3; index += 1) {
    await annotations.nth(index).click();
    const quote = page.locator('.evidence-record blockquote');
    await quote.waitFor({ state: 'visible' });
    quotes.push((await quote.textContent())?.trim());
  }
  assert.equal(new Set(quotes).size, 3, 'evidence inspector quote did not change');
  await visibleButton(page, '拆解结构').click();
  await visibleButton(page, '历史结构').click();
  await visibleButton(page, '现代成品').click();
}

async function inspectArchiveResearch(page) {
  await visibleButton(page, '探索馆藏').click();
  await visibleButton(page, '馆藏档案').click();
  const row = page.locator('[data-dish-id="dish_012"]');
  await row.waitFor({ state: 'visible' });
  await row.click();
  const selectedName = (await page.locator('.archive-detail h2').textContent())?.trim();
  assert.ok(selectedName, 'dish_012 detail name missing');
  await visibleButton(page, '互动研究').click();
  await visibleButton(page, '考据问答').click();
  await page.locator('.mentor-intro').waitFor({ state: 'visible' });
  assert.match(await page.locator('.mentor-intro').innerText(), new RegExp(selectedName));

  await visibleButton(page, '风味进化').click();
  assert.match(await page.locator('.evolution-parent-fixed').innerText(), new RegExp(selectedName));

  await visibleButton(page, '互动任务').click();
  assert.match(await page.locator('.play-selected-dish').innerText(), new RegExp(selectedName));
  await visibleButton(page, '分享证书').click();
  assert.equal(await page.locator('.play-certificate input').first().inputValue(), selectedName);
}

async function inspectPartnership(page) {
  await visibleButton(page, '商业合作').click();
  await page.getByRole('heading', { name: '把这套复原体验带进博物馆' }).waitFor();
  await page.getByText('2–4 周', { exact: true }).waitFor();
}

async function verifyViewport(browser, channel, viewport, htmlUrl, artifactsDir) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const watchers = createWatchers(page);
  const viewportLabel = `${viewport.width}x${viewport.height}`;
  const label = `${channel}-${viewportLabel}`;
  try {
    await page.goto(htmlUrl, { waitUntil: 'load' });
    await page.getByRole('heading', { name: '风味考古局' }).waitFor();
    await visibleButton(page, '接手这宗风味案').waitFor();
    await page.screenshot({
      path: path.join(artifactsDir, `${label}-home.png`),
      fullPage: true,
    });
    await assertCanvas(page, path.join(artifactsDir, `${label}-canvas.png`), label);
    await inspectCanvasInteractions(page, label);
    await assertLayout(page, `${label}-home`);
    await inspectFeaturedFusion(page);
    await assertLayout(page, `${label}-fusion`);
    await page.getByRole('button', { name: /风味考古局/ }).click();
    await page.getByRole('heading', { name: '风味考古局' }).waitFor();
    await completeRestoration(page);
    await inspectEvidenceAndModes(page);
    await assertLayout(page, `${label}-restore`);
    await inspectArchiveResearch(page);
    await assertLayout(page, `${label}-research`);
    await inspectPartnership(page);
    await assertLayout(page, `${label}-partnership`);
    await assertNoRuntimeErrors(watchers, label);
    console.log(`[ok] ${label}`);
  } finally {
    await context.close();
  }
}

async function verifyFallback(browser, channel, viewport, htmlUrl, artifactsDir) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(type, options) {
      if (String(type).startsWith('webgl')) return null;
      return original.call(this, type, options);
    };
  });
  const page = await context.newPage();
  const watchers = createWatchers(page, { allowForcedWebglError: true });
  const viewportLabel = `${viewport.width}x${viewport.height}`;
  const label = `${channel}-fallback-${viewportLabel}`;
  try {
    await page.goto(htmlUrl, { waitUntil: 'load' });
    await page.locator('.crab-orange-fallback').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.crab-orange-fallback .evidence-annotation').count(), 3);
    await page.screenshot({
      path: path.join(artifactsDir, `${label}-home.png`),
      fullPage: true,
    });
    await assertLayout(page, `${label}-home`);
    await visibleButton(page, '接手这宗风味案').waitFor();
    await visibleButton(page, '查看融合推演').waitFor();
    await visibleButton(page, '拆解结构').click();
    await visibleButton(page, '现代成品').click();
    await completeRestoration(page);
    await page.locator('.workbench-artifact .crab-orange-fallback').waitFor({ state: 'visible' });
    await inspectEvidenceAndModes(page);
    await page.locator('.restoration-report').waitFor({ state: 'visible' });
    await assertLayout(page, `${label}-restore`);
    await assertNoRuntimeErrors(watchers, label);
    console.log(`[ok] ${label}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const htmlPath = path.resolve(process.env.OFFLINE_HTML_PATH || path.join(frontendDir, 'dist-offline', 'offline.html'));
  assert.equal(fs.existsSync(htmlPath), true, `offline HTML not found: ${htmlPath}`);
  const htmlUrl = pathToFileURL(htmlPath).href;
  const artifactsDir = path.join(repoRoot, 'artifacts', 'offline-ui');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const channels = (process.env.OFFLINE_BROWSER_CHANNELS || 'msedge,chrome')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const channel of channels) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      console.log(`[browser] ${channel} ${browser.version()}`);
      for (const viewport of VIEWPORTS) {
        await verifyViewport(browser, channel, viewport, htmlUrl, artifactsDir);
      }
      for (const viewport of VIEWPORTS) {
        await verifyFallback(browser, channel, viewport, htmlUrl, artifactsDir);
      }
    } finally {
      await browser.close();
    }
  }
  console.log(`[done] verified ${channels.length} browser channel(s)`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
