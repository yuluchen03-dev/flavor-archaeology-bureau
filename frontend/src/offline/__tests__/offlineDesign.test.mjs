import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('museum shell exposes the three approved destinations and offline status', () => {
  const source = read('src/offline/components/MuseumShell.jsx');
  for (const label of ['可信复原台', '风味馆藏库', '合作展厅', '离线评审模式']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /aria-current/);
  assert.match(source, /museum-mobile-nav/);
});

test('offline styles use museum tokens and zero letter spacing', () => {
  const tokens = read('src/offline/styles/tokens.css');
  assert.match(tokens, /--ink-950:\s*#0b0e0d/);
  assert.match(tokens, /--paper-100:\s*#f3efe5/);
  assert.match(tokens, /--cinnabar-500:\s*#c64a3b/);
  assert.match(tokens, /--bronze-500:\s*#52796f/);
  assert.match(tokens, /letter-spacing:\s*0/);
});

test('offline entry imports split style files', () => {
  const source = read('src/offline/main.jsx');
  for (const file of ['tokens.css', 'shell.css', 'responsive.css']) {
    assert.match(source, new RegExp(file.replace('.', '\\.')));
  }
});

test('offline entry is protected by a dedicated recoverable error boundary', () => {
  const main = read('src/offline/main.jsx');
  const boundary = read('src/offline/components/OfflineErrorBoundary.jsx');
  assert.match(main, /OfflineErrorBoundary/);
  assert.match(boundary, /恢复当前展厅/);
  assert.match(boundary, /返回首页/);
  assert.doesNotMatch(boundary, /window\.location\.href\s*=\s*['"]\//);
});

test('responsive styles cover reduced motion, mobile safe area, and print', () => {
  const source = read('src/offline/styles/responsive.css');
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /@media print/);
});
