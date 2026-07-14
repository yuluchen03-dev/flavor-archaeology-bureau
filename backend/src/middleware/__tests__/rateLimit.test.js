const { createRateLimit } = require('../rateLimit');

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe('rateLimit middleware', () => {
  test('allows requests under the limit and rejects excess calls', () => {
    let time = 1000;
    const middleware = createRateLimit({
      windowMs: 1000,
      maxRequests: 2,
      now: () => time,
    });
    const req = { ip: '127.0.0.1', headers: {}, socket: {} };
    const first = createResponse();
    const second = createResponse();
    const third = createResponse();
    const next = jest.fn();

    middleware(req, first, next);
    middleware(req, second, next);
    middleware(req, third, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(third.statusCode).toBe(429);
    expect(third.payload).toMatchObject({ success: false });
    expect(third.headers['X-RateLimit-Remaining']).toBe('0');

    time = 2100;
    const afterReset = createResponse();
    middleware(req, afterReset, next);
    expect(afterReset.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
