function readLatency({ startedAt, endedAt, latencyMs } = {}) {
  if (Number.isFinite(latencyMs)) return latencyMs;
  if (Number.isFinite(startedAt) && Number.isFinite(endedAt)) {
    return Math.max(0, Math.round(endedAt - startedAt));
  }
  if (Number.isFinite(startedAt)) {
    return Math.max(0, Date.now() - startedAt);
  }
  return 0;
}

function build({
  provider = 'local',
  model = 'rules',
  mode = 'local',
  fallbackReason = null,
  configured = true,
  startedAt,
  endedAt,
  latencyMs,
} = {}) {
  return {
    provider,
    model,
    latencyMs: readLatency({ startedAt, endedAt, latencyMs }),
    mode,
    fallbackReason: fallbackReason || null,
    configured: Boolean(configured),
  };
}

module.exports = {
  build,
  generated: (options = {}) => build({ ...options, mode: 'generated', configured: options.configured ?? true, fallbackReason: null }),
  degraded: (options = {}) => build({ ...options, mode: 'degraded', configured: options.configured ?? false }),
  local: (options = {}) => build({ ...options, mode: 'local', configured: options.configured ?? true, fallbackReason: null }),
  fallback: (options = {}) => build({ ...options, mode: 'fallback', configured: options.configured ?? true }),
};
