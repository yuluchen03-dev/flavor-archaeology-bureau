import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizeAssets, formatBytes, evaluateBudget } from '../verify_asset_budget.mjs';

test('summarizeAssets reports total bytes and largest files', () => {
  const root = mkdtempSync(join(tmpdir(), 'asset-budget-'));
  try {
    const assetDir = join(root, 'frontend', 'public', 'dish-backgrounds');
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(assetDir, 'small.png'), Buffer.alloc(10));
    writeFileSync(join(assetDir, 'large.png'), Buffer.alloc(50));

    const summary = summarizeAssets({ root, limit: 1 });

    assert.equal(summary.fileCount, 2);
    assert.equal(summary.totalBytes, 60);
    assert.deepEqual(summary.largestFiles, [
      { path: 'frontend/public/dish-backgrounds/large.png', bytes: 50 },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('evaluateBudget marks oversized assets as failing', () => {
  const result = evaluateBudget({ totalBytes: 60 }, 50);
  assert.equal(result.ok, false);
  assert.equal(result.overByBytes, 10);
});

test('formatBytes uses human-readable binary units', () => {
  assert.equal(formatBytes(1024), '1.00 MB'.replace('MB', 'KB'));
  assert.equal(formatBytes(1024 * 1024), '1.00 MB');
});
