const express = require('express');
const lightRoutes = require('../light');

function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/light', lightRoutes);

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('light mode routes', () => {
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

  test('POST /api/light/ancestor returns ancestor mapping and share certificate', async () => {
    const response = await fetch(`${baseUrl}/api/light/ancestor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '拍到一碗蟹粉面和甜橙饮料' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.mode).toBe('ancestor');
    expect(payload.data.ancestor.name).toBe('蟹酿橙');
    expect(payload.data.shareCard.certificateId).toMatch(/^FAB-/);
  });

  test('GET /api/light/authenticity returns one real and one generated option', async () => {
    const response = await fetch(`${baseUrl}/api/light/authenticity?seed=42`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.options).toHaveLength(2);
    expect(payload.data.options.filter((option) => option.isReal)).toHaveLength(1);
  });

  test('POST /api/light/share-card creates a certificate for one-click sharing', async () => {
    const response = await fetch(`${baseUrl}/api/light/share-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishId: 'dish_001', type: 'revival', signature: '测试考古官' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.type).toBe('revival');
    expect(payload.data.signature).toBe('测试考古官');
    expect(payload.data.certificateId).toMatch(/^FAB-/);
  });
});
