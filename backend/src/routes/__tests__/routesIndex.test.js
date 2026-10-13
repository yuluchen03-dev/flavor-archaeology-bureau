jest.mock('../api', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/analyze-stream', (req, res) => res.json({ success: true, route: 'analyze-stream' }));
  return router;
});
jest.mock('../auth', () => {
  const express = require('express');
  const router = express.Router();
  router.post('/register', (req, res) => res.json({ success: true, route: 'auth-register' }));
  return router;
});
jest.mock('../analyze', () => {
  const express = require('express');
  const router = express.Router();
  router.post('/', (req, res) => res.json({ success: true, route: 'analyze' }));
  return router;
});
jest.mock('../restore', () => {
  const express = require('express');
  const router = express.Router();
  router.post('/', (req, res) => res.json({ success: true, route: 'restore' }));
  return router;
});
jest.mock('../recipe', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ success: true, route: 'recipe-list' }));
  return router;
});
jest.mock('../teach', () => {
  const express = require('express');
  const router = express.Router();
  router.post('/', (req, res) => res.json({ success: true, route: 'teach' }));
  return router;
});
jest.mock('../starMap', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ success: true, route: 'star-map' }));
  return router;
});
jest.mock('../evolution', () => {
  const express = require('express');
  const router = express.Router();
  router.post('/', (req, res) => res.json({ success: true, route: 'evolution' }));
  return router;
});
jest.mock('../light', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ success: true, route: 'light' }));
  return router;
});
jest.mock('../fragments', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ success: true, route: 'fragments' }));
  return router;
});

const express = require('express');
const apiRoutes = require('../api');
const authRoutes = require('../auth');
const analyzeRoutes = require('../analyze');
const restoreRoutes = require('../restore');
const recipeRoutes = require('../recipe');
const teachRoutes = require('../teach');
const starMapRoutes = require('../starMap');
const evolutionRoutes = require('../evolution');
const lightRoutes = require('../light');
const fragmentRoutes = require('../fragments');
const indexRoutes = require('../index');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', indexRoutes);
  return app;
}

function createTestServer() {
  return new Promise((resolve) => {
    const app = createApp();
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('API routes index', () => {
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

  test('GET /api/ returns API info', async () => {
    const response = await fetch(`${baseUrl}/api/`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.name).toBe('风味考古局 API');
    expect(payload.endpoints.auth).toBe('/api/auth');
    expect(payload.endpoints.analyzeStream).toBe('/api/analyze-stream');
  });
});
