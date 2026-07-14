function resolveCorsOrigin(env = process.env) {
  if (env.CORS_ORIGIN) return env.CORS_ORIGIN;
  if (env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be configured in production');
  }
  return '*';
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function buildAiProviderReadiness(env = process.env) {
  const reasoningConfigured = Boolean(env.OPENAI_API_KEY);
  const imageConfigured = Boolean(env.AGNES_API_KEY);

  return {
    reasoning: {
      provider: 'openai-compatible',
      configured: reasoningConfigured,
      mode: reasoningConfigured ? 'generated' : 'degraded',
      model: env.MODEL_NAME || 'doubao-pro-32k',
    },
    vision: {
      provider: 'openai-compatible',
      configured: reasoningConfigured,
      mode: reasoningConfigured ? 'generated' : 'degraded',
      model: env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
    },
    image: {
      provider: 'agnes',
      configured: imageConfigured,
      mode: imageConfigured ? 'generated' : 'degraded',
      model: env.AGNES_IMAGE_MODEL || 'agnes-image-2.0-flash',
    },
  };
}

function buildReadinessReport({
  env = process.env,
  uptime = process.uptime(),
  timestamp = new Date().toISOString(),
} = {}) {
  const corsOrigin = resolveCorsOrigin(env);
  const jwtConfigured = Boolean(env.JWT_SECRET) || env.NODE_ENV !== 'production';
  const rateLimitDisabled = readBoolean(env.RATE_LIMIT_DISABLED, false);

  return {
    status: 'ok',
    timestamp,
    uptime,
    readiness: {
      api: 'ready',
      auth: jwtConfigured ? 'configured' : 'missing',
      corsOrigin,
      rateLimit: {
        enabled: !rateLimitDisabled,
        windowMs: Number(env.RATE_LIMIT_WINDOW_MS || 60_000),
        max: Number(env.RATE_LIMIT_MAX || 120),
      },
      ai: buildAiProviderReadiness(env),
    },
  };
}

module.exports = {
  resolveCorsOrigin,
  buildAiProviderReadiness,
  buildReadinessReport,
};

