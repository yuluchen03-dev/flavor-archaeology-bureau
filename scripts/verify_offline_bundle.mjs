import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const REQUIRED_LABELS = [
  '离线评审模式',
  '开始 90 秒可信复原',
  '数字传承人',
  '味觉星图',
  '风味进化',
  '商业合作',
];

function isAllowedReference(value) {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.startsWith('data:')) return true;
  if (trimmed.startsWith('#')) return true;
  return false;
}

function violationCodeForTag(tagName) {
  switch (tagName) {
    case 'script':
      return 'external-script';
    case 'link':
      return 'external-stylesheet';
    case 'img':
      return 'external-image';
    case 'audio':
    case 'video':
    case 'source':
      return 'external-media';
    default:
      return 'external-resource';
  }
}

function extractAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = attrs.match(re);
  return m ? (m[1] ?? m[2] ?? '') : null;
}

export function inspectOfflineHtml(html) {
  const violations = [];
  const bytes = Buffer.byteLength(html, 'utf8');

  // 1. Check <script> opening tags for src (before removing script content)
  const scriptOpenRegex = /<script\b([^>]*)>/gi;
  let match;
  while ((match = scriptOpenRegex.exec(html)) !== null) {
    const value = extractAttr(match[1], 'src');
    if (value !== null && !isAllowedReference(value)) {
      violations.push('external-script');
    }
  }

  // 2. Remove script blocks to avoid false positives in JS string literals
  const htmlWithoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // 3. Check other opening tags for src/href
  const tagRegex = /<(\w+)([^>]*)>/gi;
  while ((match = tagRegex.exec(htmlWithoutScripts)) !== null) {
    const tagName = match[1].toLowerCase();
    if (tagName === 'script') continue;

    const attrs = match[2];
    const srcValue = extractAttr(attrs, 'src');
    if (srcValue !== null && !isAllowedReference(srcValue)) {
      violations.push(violationCodeForTag(tagName));
    }

    const hrefValue = extractAttr(attrs, 'href');
    if (hrefValue !== null && !isAllowedReference(hrefValue)) {
      violations.push(violationCodeForTag(tagName));
    }
  }

  // 4. Check CSS url() inside <style> blocks and inline style attributes
  const cssTexts = [];
  const styleBlockRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleBlockRegex.exec(htmlWithoutScripts)) !== null) {
    cssTexts.push(styleMatch[1]);
  }
  const styleAttrRegex = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  while ((styleMatch = styleAttrRegex.exec(htmlWithoutScripts)) !== null) {
    cssTexts.push(styleMatch[1] ?? styleMatch[2] ?? '');
  }

  const urlRegex = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  for (const cssText of cssTexts) {
    const localRegex = new RegExp(urlRegex.source, urlRegex.flags);
    let urlMatch;
    while ((urlMatch = localRegex.exec(cssText)) !== null) {
      const value = (urlMatch[1] ?? urlMatch[2] ?? urlMatch[3] ?? '').trim();
      if (!isAllowedReference(value)) {
        violations.push('external-css-url');
      }
    }
  }

  // 5. Check required labels only for full HTML documents
  const isFullDocument = /<html\b/i.test(html);
  const missingLabels = isFullDocument
    ? REQUIRED_LABELS.filter((label) => !html.includes(label))
    : [];

  // 6. Check for fetch() calls in the raw HTML (network dependency).
  //    A fully offline single-file bundle must not issue network requests.
  if (/\bfetch\s*\(/.test(html)) {
    violations.push('network-fetch');
  }

  const ok = violations.length === 0 && missingLabels.length === 0;

  return { ok, violations, missingLabels, bytes };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function printReport(result, htmlPath) {
  console.log(`File: ${htmlPath}`);
  console.log(`Size: ${formatBytes(result.bytes)}`);
  console.log(`Status: ${result.ok ? 'OK' : 'FAIL'}`);
  if (result.violations.length > 0) {
    console.log('');
    console.log(`Violations (${result.violations.length}):`);
    for (const v of result.violations) {
      console.log(`- ${v}`);
    }
  }
  if (result.missingLabels.length > 0) {
    console.log('');
    console.log(`Missing labels (${result.missingLabels.length}):`);
    for (const label of result.missingLabels) {
      console.log(`- ${label}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const enforce = args.includes('--enforce');
  const htmlPath = args.find((a) => !a.startsWith('--'));

  if (!htmlPath) {
    console.error('Usage: node scripts/verify_offline_bundle.mjs <html-path> [--enforce]');
    process.exit(2);
  }

  let html;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch {
    console.error(`Cannot read file: ${htmlPath}`);
    process.exit(2);
  }

  const result = inspectOfflineHtml(html);
  printReport(result, htmlPath);

  if (enforce && !result.ok) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFile === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  main();
}
