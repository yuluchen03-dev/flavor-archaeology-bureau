const express = require('express');
const apiRoutes = require('../api');

jest.setTimeout(15000);

function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function readSse(url) {
  const response = await fetch(url);
  const body = await response.text();
  const events = body
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, '').trim()));

  return { response, events };
}

describe('analyze-stream route', () => {
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

  test('streams reasoning built from real analyze/restore data instead of a fixed dish', async () => {
    const clue = '东坡肉慢火炖煮，肥而不腻，出自东坡志林。';
    const { response, events } = await readSse(`${baseUrl}/api/analyze-stream?clue=${encodeURIComponent(clue)}`);

    expect(response.status).toBe(200);
    expect(events.filter((event) => event.type === 'step').length).toBeGreaterThanOrEqual(4);

    const result = events.find((event) => event.type === 'result');
    expect(result).toBeTruthy();
    expect(result.dish.name).toBe('东坡肉');
    expect(result.dish.name).not.toBe('蟹酿橙');
    expect(result.dish.reasoningSteps.map((step) => step.title)).toEqual(
      expect.arrayContaining(['解析线索', '食材考证', '技法推演', '整菜重建'])
    );
    expect(result.dish.evidenceScore).toEqual(expect.any(Number));
    expect(result.dish.evidenceScore).toBeGreaterThan(0);
    expect(result.dish.evidenceBreakdown).toMatchObject({
      clueMatch: expect.any(Number),
      sourceMatch: expect.any(Number),
      ingredientMatch: expect.any(Number),
      techniqueMatch: expect.any(Number),
      overallReason: expect.any(String),
    });
    expect(result.dish.shareCard.certificateId).toMatch(/^FAB-/);
  });

  test('streams an uncertain result for weak clues instead of defaulting to the first dish', async () => {
    const clue = '今天想吃一个完全没有历史线索的东西';
    const { response, events } = await readSse(`${baseUrl}/api/analyze-stream?clue=${encodeURIComponent(clue)}`);

    expect(response.status).toBe(200);

    const result = events.find((event) => event.type === 'result');
    expect(result).toBeTruthy();
    expect(result.dish).toMatchObject({
      name: '证据不足',
      evidenceStatus: 'insufficient',
      needsMoreClues: true,
    });
    expect(result.dish.evidenceScore).toBe(0);
    expect(result.dish.evidenceBreakdown).toMatchObject({
      clueMatch: 0,
      sourceMatch: 0,
      ingredientMatch: 0,
      techniqueMatch: 0,
      overallReason: expect.any(String),
    });
    expect(result.dish.name).not.toBe('蟹酿橙');
  });
});
