function normalizeTimeoutMs(value, fallbackMs = 30_000) {
  const timeoutMs = Number(value);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : fallbackMs;
}

async function fetchWithTimeout({
  fetchImpl,
  url,
  options = {},
  timeoutMs,
  timeoutMessage,
}) {
  const controller = new AbortController();
  let timeoutId;
  let timedOut = false;
  const timeoutError = new Error(timeoutMessage);
  timeoutError.code = 'UPSTREAM_TIMEOUT';

  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetchImpl(url, { ...options, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (timedOut) throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { fetchWithTimeout, normalizeTimeoutMs };
