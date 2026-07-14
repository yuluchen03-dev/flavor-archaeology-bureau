import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 占位符标记：空值或包含这些片段的文本都视为无效证据
const PLACEHOLDER_TOKENS = ['待补', 'todo', 'tbd', 'placeholder', 'session_id'];

const REGISTRATION_URL_PATTERN = /^https:\/\/forum\.trae\.cn\/t\/topic\/\d+$/;

function isPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (text === '') return true;
  const lower = text.toLowerCase();
  return PLACEHOLDER_TOKENS.some((token) => lower.includes(token));
}

function fileExists(filePath, baseDir, existsFn) {
  if (!filePath) return false;
  return existsFn(path.resolve(baseDir, filePath));
}

/**
 * 评估 TRAE 初赛提交清单是否就绪。
 *
 * 门禁：
 *   1. demoHtml 文件存在
 *   2. demoZip 文件存在
 *   3. postDraft 文件存在
 *   4. registrationUrl 非空、匹配 https://forum.trae.cn/t/topic/<数字>、不含占位符
 *   5. 三个 traeTasks 各有非空且非占位符的 sessionId
 *   6. 三个 traeTasks 各有至少一个 screenshots 路径且文件存在
 *   7. 三个 sessionId 互不相同
 *
 * @param {object} manifest 提交证据清单
 * @param {{ baseDir?: string, exists?: (p: string) => boolean }} [options]
 * @returns {{ ready: boolean, missing: string[], details: object }}
 */
export function evaluateSubmission(manifest, options = {}) {
  const baseDir = options.baseDir || process.cwd();
  const existsFn = options.exists || ((p) => fs.existsSync(p));

  const missing = [];
  const details = {};

  // 1. 离线 HTML
  const demoHtmlOk = fileExists(manifest.demoHtml, baseDir, existsFn);
  details.demoHtml = { path: manifest.demoHtml || '', ok: demoHtmlOk };
  if (!demoHtmlOk) missing.push('离线 HTML 文件');

  // 2. 离线 ZIP
  const demoZipOk = fileExists(manifest.demoZip, baseDir, existsFn);
  details.demoZip = { path: manifest.demoZip || '', ok: demoZipOk };
  if (!demoZipOk) missing.push('离线 ZIP 包');

  // 3. 参赛帖草稿
  const postDraftOk = fileExists(manifest.postDraft, baseDir, existsFn);
  details.postDraft = { path: manifest.postDraft || '', ok: postDraftOk };
  if (!postDraftOk) missing.push('参赛帖草稿');

  // 4. 报名帖链接
  const url = manifest.registrationUrl || '';
  const urlOk =
    !isPlaceholder(url) && REGISTRATION_URL_PATTERN.test(String(url).trim());
  details.registrationUrl = { url, ok: urlOk };
  if (!urlOk) missing.push('报名帖链接');

  // 5 & 6. 每个 TRAE 任务的 Session ID 与截图
  const tasks = Array.isArray(manifest.traeTasks) ? manifest.traeTasks : [];
  const validSessionIds = [];
  details.traeTasks = [];
  for (const task of tasks) {
    const taskDetail = { key: task.key, screenshots: [] };

    const sessionIdOk = !isPlaceholder(task.sessionId);
    taskDetail.sessionId = task.sessionId || '';
    taskDetail.sessionIdOk = sessionIdOk;
    if (!sessionIdOk) {
      missing.push(`${task.key} Session ID`);
    } else {
      validSessionIds.push(String(task.sessionId).trim());
    }

    const screenshots = Array.isArray(task.screenshots) ? task.screenshots : [];
    let screenshotsOk = screenshots.length > 0;
    for (const shot of screenshots) {
      const shotOk = fileExists(shot, baseDir, existsFn);
      taskDetail.screenshots.push({ path: shot, ok: shotOk });
      if (!shotOk) screenshotsOk = false;
    }
    taskDetail.screenshotsOk = screenshotsOk;
    if (!screenshotsOk) missing.push(`${task.key} 开发截图`);

    details.traeTasks.push(taskDetail);
  }

  // 7. Session ID 互不相同
  const duplicates = validSessionIds.filter(
    (id, idx) => validSessionIds.indexOf(id) !== idx,
  );
  const uniqueOk = duplicates.length === 0;
  details.sessionIdUnique = { ok: uniqueOk, duplicates };
  if (!uniqueOk) missing.push('Session ID 互不相同');

  return {
    ready: missing.length === 0,
    missing,
    details,
  };
}

function loadManifest(manifestPath) {
  const fullPath = path.resolve(process.cwd(), manifestPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function printReport(result) {
  if (result.ready) {
    console.log('READY');
    console.log('所有提交门禁已通过。');
    return;
  }
  console.log('NOT READY');
  console.log('');
  console.log(`缺失项 (${result.missing.length}):`);
  for (const item of result.missing) {
    console.log(`- ${item}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const enforce = args.includes('--enforce');
  const manifestPath = 'docs/competition/trae-evidence-manifest.json';

  let manifest;
  try {
    manifest = loadManifest(manifestPath);
  } catch (err) {
    console.error(`无法读取提交清单: ${manifestPath}`);
    console.error(err.message);
    process.exit(2);
  }

  const result = evaluateSubmission(manifest);
  printReport(result);

  if (enforce && !result.ready) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFile === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  main();
}
