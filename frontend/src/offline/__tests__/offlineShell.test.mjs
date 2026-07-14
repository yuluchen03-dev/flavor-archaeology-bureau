import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolve to the frontend/ directory so the test reads files under frontend/
// (offline.html, vite.offline.config.js, src/offline/*).
const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('offline app has a dedicated non-router entry', () => {
  assert.ok(existsSync(resolve(root, 'offline.html')));
  const main = read('src/offline/main.jsx');
  assert.match(main, /OfflineApp/);
  assert.doesNotMatch(main, /BrowserRouter|createBrowserRouter/);
});

test('offline build uses the single-file plugin', () => {
  const config = read('vite.offline.config.js');
  assert.match(config, /viteSingleFile/);
  assert.match(config, /offline\.html/);
  assert.match(config, /dist-offline/);
});

test('offline build disables module preload polyfill to avoid fetch() calls', () => {
  const config = read('vite.offline.config.js');
  assert.match(config, /modulePreload:\s*false/);
});

test('offline shell exposes only three primary destinations', () => {
  const shell = read('src/offline/components/MuseumShell.jsx');
  for (const label of ['可信复原台', '风味馆藏库', '合作展厅']) {
    assert.match(shell, new RegExp(label));
  }
  assert.match(shell, /离线评审模式/);
});
