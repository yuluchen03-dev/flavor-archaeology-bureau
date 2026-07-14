const express = require('express');
const fragmentRoutes = require('../fragments');

function createServer() {
  const app = express();
  app.use('/api/fragments', fragmentRoutes);
  return app.listen(0);
}

describe('fragment routes', () => {
  let server;
  let baseUrl;

  beforeAll(() => {
    server = createServer();
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll((done) => {
    server.close(done);
  });

  test('GET /api/fragments filters fragment library', async () => {
    const response = await fetch(`${baseUrl}/api/fragments?q=${encodeURIComponent('蟹')}&tag=${encodeURIComponent('橙')}`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data[0].id).toBe('fragment_shanjiaqinggong_xieniangcheng');
  });

  test('GET /api/fragments/:id returns detail', async () => {
    const response = await fetch(`${baseUrl}/api/fragments/fragment_shanjiaqinggong_xieniangcheng`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.relatedDishId).toBe('dish_001');
  });
});
