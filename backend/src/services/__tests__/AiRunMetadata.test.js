const AiRunMetadata = require('../AiRunMetadata');

describe('AiRunMetadata', () => {
  test('builds generated metadata with provider, model, latency, mode, fallback reason, and configured state', () => {
    const metadata = AiRunMetadata.generated({
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      startedAt: 1000,
      endedAt: 1242,
    });

    expect(metadata).toEqual({
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      latencyMs: 242,
      mode: 'generated',
      fallbackReason: null,
      configured: true,
    });
  });

  test('builds degraded metadata for unconfigured provider fallbacks', () => {
    const metadata = AiRunMetadata.degraded({
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      latencyMs: 12,
      fallbackReason: 'AGNES_API_KEY is not configured',
      configured: false,
    });

    expect(metadata).toEqual({
      provider: 'agnes',
      model: 'agnes-image-2.0-flash',
      latencyMs: 12,
      mode: 'degraded',
      fallbackReason: 'AGNES_API_KEY is not configured',
      configured: false,
    });
  });

  test('builds local and fallback metadata aliases with honest modes', () => {
    expect(AiRunMetadata.local({ provider: 'local', model: 'rules', latencyMs: 0 })).toEqual({
      provider: 'local',
      model: 'rules',
      latencyMs: 0,
      mode: 'local',
      fallbackReason: null,
      configured: true,
    });

    expect(AiRunMetadata.fallback({
      provider: 'openai',
      model: 'gpt-4o-mini',
      fallbackReason: 'timeout',
    })).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
      mode: 'fallback',
      fallbackReason: 'timeout',
      configured: true,
    });
  });

  test('ai config is environment driven and does not invent a mock API key in production', () => {
    const originalEnv = { ...process.env };
    jest.resetModules();
    delete process.env.AI_API_KEY;
    process.env.NODE_ENV = 'production';

    const config = require('../../config/ai');

    expect(config.apiKey).toBe('');
    expect(config.configured).toBe(false);
    expect(config.mockMode).toBe(false);
    expect(config.mode).toBe('degraded');

    process.env = originalEnv;
    jest.resetModules();
  });
});
