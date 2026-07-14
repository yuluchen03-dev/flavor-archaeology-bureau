import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ASSET_DIR = join('frontend', 'public', 'dish-backgrounds');
const DEFAULT_LIMIT = 15;
const DEFAULT_MAX_MB = 50;

function toDisplayPath(path) {
  return path.replaceAll('\\', '/');
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!entry.isFile()) return [];
    return [fullPath];
  });
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function summarizeAssets({
  root = process.cwd(),
  assetDir = DEFAULT_ASSET_DIR,
  limit = DEFAULT_LIMIT,
} = {}) {
  const absoluteAssetDir = join(root, assetDir);
  const files = walkFiles(absoluteAssetDir)
    .map((filePath) => ({
      path: toDisplayPath(relative(root, filePath)),
      bytes: statSync(filePath).size,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  return {
    assetDir: toDisplayPath(assetDir),
    fileCount: files.length,
    totalBytes,
    totalHuman: formatBytes(totalBytes),
    largestFiles: files.slice(0, limit),
  };
}

export function evaluateBudget(summary, maxBytes) {
  const overByBytes = Math.max(0, summary.totalBytes - maxBytes);
  return {
    ok: overByBytes === 0,
    maxBytes,
    maxHuman: formatBytes(maxBytes),
    overByBytes,
    overByHuman: formatBytes(overByBytes),
  };
}

function readArgs(argv) {
  const args = {
    root: process.cwd(),
    assetDir: DEFAULT_ASSET_DIR,
    limit: DEFAULT_LIMIT,
    maxBytes: DEFAULT_MAX_MB * 1024 * 1024,
    json: false,
    enforce: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') args.root = argv[++index];
    else if (arg === '--asset-dir') args.assetDir = argv[++index];
    else if (arg === '--limit') args.limit = Number(argv[++index]);
    else if (arg === '--max-mb') args.maxBytes = Number(argv[++index]) * 1024 * 1024;
    else if (arg === '--json') args.json = true;
    else if (arg === '--enforce') args.enforce = true;
  }

  return args;
}

function printTextReport(summary, budget) {
  console.log(`Asset directory: ${summary.assetDir}`);
  console.log(`Files: ${summary.fileCount}`);
  console.log(`Total size: ${summary.totalHuman}`);
  console.log(`Budget: ${budget.maxHuman}`);
  console.log(`Status: ${budget.ok ? 'OK' : `OVER by ${budget.overByHuman}`}`);
  console.log('');
  console.log('Largest files:');
  for (const file of summary.largestFiles) {
    console.log(`- ${file.path}: ${formatBytes(file.bytes)}`);
  }
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const summary = summarizeAssets(args);
  const budget = evaluateBudget(summary, args.maxBytes);

  if (args.json) {
    console.log(JSON.stringify({ ...summary, budget }, null, 2));
  } else {
    printTextReport(summary, budget);
  }

  if (args.enforce && !budget.ok) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFile === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  main();
}

