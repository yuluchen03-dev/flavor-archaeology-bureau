const express = require('express');

jest.mock('../../controllers/analyzeController', () => ({
  analyze: jest.fn((req, res) => res.json({ success: true, route: 'analyze' })),
  getHistory: jest.fn((req, res) => res.json({ success: true, route: 'analyze-history' })),
}));

jest.mock('../../controllers/restoreController', () => ({
  restore: jest.fn((req, res) => res.json({ success: true, route: 'restore' })),
  getHistory: jest.fn((req, res) => res.json({ success: true, route: 'restore-history' })),
}));

jest.mock('../../controllers/teachController', () => ({
  teach: jest.fn((req, res) => res.json({ success: true, route: 'teach' })),
  getHistory: jest.fn((req, res) => res.json({ success: true, route: 'teach-history' })),
}));

const analyzeRoutes = require('../analyze');
const restoreRoutes = require('../restore');
const teachRoutes = require('../teach');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/analyze', analyzeRoutes);
  app.use('/api/restore', restoreRoutes);
  app.use('/api/teach', teachRoutes);
  return app;
}

function createTestServer() {
  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('history route authentication', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    baseUrl = testServer.baseUrl;
  });

  afterAll((done) => {
    server.close(done);
  });

  test.each([
    '/api/analyze/history',
    '/api/restore/history',
    '/api/teach/history',
  ])('GET %s requires authentication', async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });

  test.each([
    '/api/analyze',
    '/api/restore',
    '/api/teach',
  ])('POST %s remains available for anonymous demo use', async (path) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'demo', dishId: 'dish_001', question: 'demo' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });
});
