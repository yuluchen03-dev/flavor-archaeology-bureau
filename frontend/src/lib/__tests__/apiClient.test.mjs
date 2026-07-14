import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiClientSource = readFileSync(resolve(__dirname, '../apiClient.js'), 'utf8');
const srcRoot = resolve(__dirname, '../../');

function readSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return readSourceFiles(fullPath);
    if (!/\.(js|jsx|mjs)$/.test(entry)) return [];
    return [{ fullPath, source: readFileSync(fullPath, 'utf8') }];
  });
}

test('shared api client defaults to the project backend port', () => {
  assert.match(apiClientSource, /http:\/\/localhost:3001\/api/);
  assert.doesNotMatch(apiClientSource, new RegExp(`http://localhost:${3002}/api`));
});

test('frontend source does not keep stale backend port fallbacks', () => {
  const stalePort = `localhost:${3002}`;
  const staleFiles = readSourceFiles(srcRoot)
    .filter(({ source }) => source.includes(stalePort))
    .map(({ fullPath }) => fullPath);

  assert.deepEqual(staleFiles, []);
});
