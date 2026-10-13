const errorHandler = require('../errorHandler');

function createMocks() {
  const res = {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
  };
  return { res };
}

describe('errorHandler', () => {
  let consoleError;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    consoleError.mockRestore();
  });

  test('returns generic production message', () => {
    process.env.NODE_ENV = 'production';
    const { res } = createMocks();
    const err = new Error('boom');
    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res._json).toEqual({ success: false, message: '服务器内部错误' });
  });

  test('includes stack in development', () => {
    process.env.NODE_ENV = 'development';
    const { res } = createMocks();
    const err = new Error('fail');
    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res._json.message).toBe('fail');
    expect(res._json.stack).toBeDefined();
  });

  test('omits stack in production even if err has a stack', () => {
    process.env.NODE_ENV = 'production';
    const { res } = createMocks();
    const err = new Error('fail');
    err.stack = 'stack-line';
    errorHandler(err, {}, res, () => {});

    expect(res._json.stack).toBeUndefined();
  });

  test('uses error status when provided', () => {
    process.env.NODE_ENV = 'development';
    const { res } = createMocks();
    const err = Object.assign(new Error('bad request'), { status: 400 });
    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res._json.message).toBe('bad request');
  });
});
