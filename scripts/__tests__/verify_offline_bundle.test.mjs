import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectOfflineHtml } from '../verify_offline_bundle.mjs';

test('rejects external script src', () => {
  const result = inspectOfflineHtml('<script src="./app.js"></script>');
  assert.equal(result.ok, false);
  assert.ok(result.violations.includes('external-script'));
});

test('rejects remote https image', () => {
  const result = inspectOfflineHtml('<img src="https://example.com/a.png">');
  assert.equal(result.ok, false);
});

test('accepts fully inlined html', () => {
  const result = inspectOfflineHtml('<script>window.APP=true</script><style>body{}</style>');
  assert.equal(result.ok, true);
});

test('rejects file-relative stylesheet', () => {
  const result = inspectOfflineHtml('<link rel="stylesheet" href="./style.css">');
  assert.equal(result.ok, false);
});

test('requires key offline labels in built html', () => {
  const html = '<html><body>开始 90 秒可信复原 数字传承人 味觉星图 风味进化 商业合作 离线评审模式</body></html>';
  const result = inspectOfflineHtml(html);
  assert.equal(result.ok, true);
});

test('fails when key labels missing', () => {
  const html = '<html><body>some content</body></html>';
  const result = inspectOfflineHtml(html);
  assert.equal(result.ok, false);
  assert.ok(result.missingLabels.length > 0);
});

test('rejects fetch() calls in script content', () => {
  const html = '<html><body>开始 90 秒可信复原 数字传承人 味觉星图 风味进化 商业合作 离线评审模式<script>fetch("/api/data")</script></body></html>';
  const result = inspectOfflineHtml(html);
  assert.equal(result.ok, false);
  assert.ok(result.violations.includes('network-fetch'));
});

test('accepts html without any fetch() calls', () => {
  const html = '<html><body>开始 90 秒可信复原 数字传承人 味觉星图 风味进化 商业合作 离线评审模式<script>window.APP=true</script></body></html>';
  const result = inspectOfflineHtml(html);
  assert.equal(result.ok, true);
  assert.ok(!result.violations.includes('network-fetch'));
});
