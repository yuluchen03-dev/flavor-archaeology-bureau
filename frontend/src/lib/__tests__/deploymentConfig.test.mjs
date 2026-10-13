import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '../../..');
const repoRoot = resolve(frontendRoot, '..');

const readFrontendFile = (path) => readFileSync(resolve(frontendRoot, path), 'utf8');
const readRepoFile = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

test('Vite dev server proxies same-origin /api requests to the local backend', () => {
  const viteConfig = readFrontendFile('vite.config.js');

  assert.match(
    viteConfig,
    /server:\s*\{[\s\S]*?proxy:\s*\{[\s\S]*?['"]\/api['"]:\s*\{[\s\S]*?target:\s*['"]http:\/\/localhost:3001['"]/,
  );
});

test('production Nginx proxies /api to the Compose backend service', () => {
  const nginxConfig = readFrontendFile('nginx.conf');

  assert.match(
    nginxConfig,
    /location\s+=\s+\/api\s*\{[\s\S]*?proxy_pass\s+http:\/\/backend:3001;/,
  );
  assert.match(
    nginxConfig,
    /location\s+\^~\s+\/api\/\s*\{[\s\S]*?proxy_pass\s+http:\/\/backend:3001;[\s\S]*?proxy_buffering\s+off;/,
  );
  assert.doesNotMatch(nginxConfig, /proxy_pass\s+http:\/\/localhost/);
});

test('container and environment defaults build the frontend with same-origin /api', () => {
  const compose = readRepoFile('docker-compose.yml');
  const dockerfile = readFrontendFile('Dockerfile');
  const rootEnvExample = readRepoFile('.env.example');
  const frontendEnvExample = readFrontendFile('.env.example');

  assert.match(compose, /VITE_API_BASE:\s+\$\{VITE_API_BASE:-\/api\}/);
  assert.match(dockerfile, /ARG\s+VITE_API_BASE=\/api/);
  assert.match(rootEnvExample, /^VITE_API_BASE=\/api$/m);
  assert.match(frontendEnvExample, /^VITE_API_BASE=\/api$/m);
});
