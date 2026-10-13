function isProduction(env = process.env) {
  return env.NODE_ENV === 'production';
}

function resolveCorsOrigin(env = process.env) {
  if (env.CORS_ORIGIN) return env.CORS_ORIGIN;
  if (isProduction(env)) {
    throw new Error('CORS_ORIGIN must be configured in production');
  }
  // 开发环境使用明确的同源，避免通配符（credentials: true 要求显式 origin）
  return env.VITE_API_BASE || 'http://localhost:5173';
}

// 解析 Express trust proxy 配置：TRUST_PROXY_HOPS 表示信任链路上第 N 跳，
// 未配置或非法值时回退为 0（不信任任何代理头），避免伪造 X-Forwarded-*。
function resolveTrustProxy(env = process.env) {
  const raw = env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return 0;
  }
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0) {
    return 0;
  }
  return hops;
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
  isProduction,
  resolveCorsOrigin,
  resolveTrustProxy,
  buildAiProviderReadiness,
  buildReadinessReport,
};

