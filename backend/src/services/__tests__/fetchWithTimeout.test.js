const { fetchWithTimeout, normalizeTimeoutMs } = require('../fetchWithTimeout');

describe('fetchWithTimeout', () => {
  test('uses fetchImpl and returns its result', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });

    const result = await fetchWithTimeout({
      fetchImpl,
      url: 'https://api.test/data',
      options: { method: 'GET' },
      timeoutMs: 5000,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/data',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual({ ok: true });
  });

  test('rejects with timeout error when fetch takes too long', async () => {
    jest.useFakeTimers();

    let rejectTimeout;
    const fetchImpl = jest.fn(() => new Promise((resolve, reject) => {
      rejectTimeout = reject;
    }));

    const promise = fetchWithTimeout({
      fetchImpl,
      url: 'https://api.test/slow',
      timeoutMs: 1000,
      timeoutMessage: 'Upstream timed out',
    });

    jest.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow('Upstream timed out');
    expect(promise).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });

    jest.useRealTimers();
  });

  test('clears timeout in finally block even on success', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });

    await fetchWithTimeout({
      fetchImpl,
      url: 'https://api.test/fast',
      timeoutMs: 5000,
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

describe('normalizeTimeoutMs', () => {
  test('returns fallback when value is not a number', () => {
    expect(normalizeTimeoutMs('not-a-number')).toBe(30000);
    expect(normalizeTimeoutMs(null)).toBe(30000);
    expect(normalizeTimeoutMs(undefined)).toBe(30000);
  });

  test('returns fallback for non-positive values', () => {
    expect(normalizeTimeoutMs(0)).toBe(30000);
    expect(normalizeTimeoutMs(-100)).toBe(30000);
    expect(normalizeTimeoutMs(NaN)).toBe(30000);
  });

  test('returns the value when it is a positive finite number', () => {
    expect(normalizeTimeoutMs(5000)).toBe(5000);
    expect(normalizeTimeoutMs(1000)).toBe(1000);
  });
});
