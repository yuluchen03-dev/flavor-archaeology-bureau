const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('production container startup contract', () => {
  test('copies backend source explicitly and excludes local secrets and runtime data', () => {
    const dockerfile = read('backend/Dockerfile');
    const dockerIgnore = read('.dockerignore');

    expect(dockerfile).not.toMatch(/COPY\s+backend\s+\.\/backend/);
    expect(dockerfile).toMatch(/COPY\s+backend\/src\s+/);
    expect(dockerIgnore).toMatch(/^\*\*\/\.env$/m);
    expect(dockerIgnore).toMatch(/^\*\*\/\.env\.\*$/m);
    expect(dockerIgnore).toMatch(/^!\*\*\/\.env\.example$/m);
    expect(dockerIgnore).toMatch(/^backend\/data\/$/m);
  });

  test('migrates, seeds only an empty database, then starts the API', () => {
    const dockerfile = read('backend/Dockerfile');
    const packageJson = JSON.parse(read('backend/package.json'));

    expect(packageJson.scripts['db:migrate']).toBe('node src/scripts/migrate-db.js');
    expect(packageJson.scripts['db:seed-if-empty']).toBe('node src/scripts/seed-if-empty.js');
    expect(dockerfile).toMatch(
      /npm run db:migrate && npm run db:seed-if-empty && npm start/
    );
    expect(dockerfile).not.toMatch(/npm run db:init/);
  });

  test('persists SQLite and keeps public origins configurable', () => {
    const compose = read('docker-compose.yml');

    expect(compose).toMatch(/backend_data:\/app\/backend\/data/);
    expect(compose).toMatch(/^volumes:\s*\r?\n\s+backend_data:/m);
    expect(compose).toContain('CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173}');
    expect(compose).toContain('VITE_API_BASE: ${VITE_API_BASE:-/api}');
  });

  test('trusts exactly one internal proxy without publishing the backend port', () => {
    const compose = read('docker-compose.yml');
    const appSource = read('backend/src/app.js');

    expect(compose).toMatch(/TRUST_PROXY_HOPS:\s*["']?1["']?/);
    expect(compose).not.toContain('"3001:3001"');
    expect(compose).toMatch(/expose:\s*\r?\n\s+- ["']?3001["']?/);
    expect(compose).toContain("fetch('http://127.0.0.1:3001/health')");
    expect(compose).toContain('condition: service_healthy');
    expect(appSource).toContain("app.set('trust proxy', resolveTrustProxy());");
  });

  test('frontend image build includes the runtime asset generator', () => {
    const dockerfile = read('frontend/Dockerfile');

    expect(dockerfile).toMatch(/WORKDIR \/app\/frontend/);
    expect(dockerfile).toMatch(/COPY scripts\/build_offline_assets\.mjs \/app\/scripts\/build_offline_assets\.mjs/);
    expect(dockerfile).toMatch(/COPY --from=build \/app\/frontend\/dist \/usr\/share\/nginx\/html/);
  });
});
