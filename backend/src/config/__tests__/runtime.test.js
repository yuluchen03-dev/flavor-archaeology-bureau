const {
  buildReadinessReport,
  resolveCorsOrigin,
} = require('../runtime');

describe('runtime config', () => {
  test('uses explicit origin for local development fallback (no wildcard for cookie support)', () => {
    expect(resolveCorsOrigin({ NODE_ENV: 'development' })).toBe('http://localhost:5173');
    expect(resolveCorsOrigin({ NODE_ENV: 'test' })).toBe('http://localhost:5173');
    expect(resolveCorsOrigin({
      NODE_ENV: 'test',
      VITE_API_BASE: 'http://custom:8080',
    })).toBe('http://custom:8080');
  });

  test('requires explicit CORS_ORIGIN in production', () => {
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production' })).toThrow(
      'CORS_ORIGIN must be configured in production'
    );
    expect(resolveCorsOrigin({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://demo.example',
    })).toBe('https://demo.example');
  });

  test('health readiness reports configured and degraded providers', () => {
    const report = buildReadinessReport({
      env: {
        NODE_ENV: 'development',
        CORS_ORIGIN: 'http://localhost:5173',
        JWT_SECRET: 'local-secret',
        OPENAI_API_KEY: '',
        AGNES_API_KEY: 'agnes-key',
        RATE_LIMIT_MAX: '60',
      },
      uptime: 12,
      timestamp: '2026-07-06T00:00:00.000Z',
    });

    expect(report).toMatchObject({
      status: 'ok',
      uptime: 12,
      readiness: {
        api: 'ready',
        auth: 'configured',
        corsOrigin: 'http://localhost:5173',
        rateLimit: {
          enabled: true,
          max: 60,
        },
        ai: {
          reasoning: { mode: 'degraded', configured: false },
          vision: { mode: 'degraded', configured: false },
          image: { mode: 'generated', configured: true },
        },
      },
    });
  });
});
