function createRateLimit({
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  maxRequests = Number(process.env.RATE_LIMIT_MAX || 120),
  disabled = process.env.RATE_LIMIT_DISABLED === 'true',
  now = () => Date.now(),
} = {}) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    if (disabled) {
      next();
      return;
    }

    const key = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
    const currentTime = now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
      });
      return;
    }

    next();
  };
}

module.exports = { createRateLimit };

