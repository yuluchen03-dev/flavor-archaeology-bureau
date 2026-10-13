jest.mock('../../models/User', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { login, register } = require('../authController');

function createResponse() {
  const cookies = {};
  return {
    statusCode: 200,
    payload: null,
    _cookies: cookies,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    cookie(name, value, options) {
      this._cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      delete this._cookies[name];
      return this;
    },
  };
}

describe('authController', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByEmail.mockResolvedValue(null);
    User.findByUsername.mockResolvedValue(null);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('rejects invalid registration input before database work', async () => {
    const response = createResponse();

    await register({ body: { username: 'a', email: 'invalid', password: 'short' } }, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({ success: false });
    expect(User.findByEmail).not.toHaveBeenCalled();
    expect(User.findByUsername).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test('registers with normalized input', async () => {
    const user = { id: 7, username: '风味官_01', email: 'chef@example.com' };
    User.create.mockResolvedValue(user);
    const response = createResponse();

    await register({
      body: {
        username: '  风味官_01  ',
        email: ' Chef@Example.COM ',
        password: 'recipe-2026',
      },
    }, response);

    expect(User.findByEmail).toHaveBeenCalledWith('chef@example.com');
    expect(User.findByUsername).toHaveBeenCalledWith('风味官_01');
    expect(User.create).toHaveBeenCalledWith({
      username: '风味官_01',
      email: 'chef@example.com',
      password: 'recipe-2026',
    });
    expect(response.statusCode).toBe(201);
    expect(response.payload).toMatchObject({
      success: true,
      data: { user, token: 'signed-token' },
    });
  });

  test.each([
    ['email', { id: 1 }, null],
    ['username', null, { id: 2 }],
  ])('uses one conflict response for an existing %s', async (field, emailUser, usernameUser) => {
    User.findByEmail.mockResolvedValue(emailUser);
    User.findByUsername.mockResolvedValue(usernameUser);
    const response = createResponse();

    await register({
      body: {
        username: 'valid-name',
        email: 'chef@example.com',
        password: 'recipe-2026',
      },
    }, response);

    expect(response.statusCode).toBe(409);
    expect(response.payload).toEqual({
      success: false,
      message: '用户名或邮箱已被使用',
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  test.each([
    [Object.assign(new Error('UNIQUE constraint failed: users.email'), { code: 'SQLITE_CONSTRAINT' })],
    [Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' })],
  ])('maps a unique-constraint registration race to the conflict response', async (error) => {
    User.create.mockRejectedValue(error);
    const response = createResponse();

    await register({
      body: {
        username: 'valid-name',
        email: 'chef@example.com',
        password: 'recipe-2026',
      },
    }, response);

    expect(response.statusCode).toBe(409);
    expect(response.payload).toEqual({
      success: false,
      message: '用户名或邮箱已被使用',
    });
  });

  test('keeps unexpected registration failures generic', async () => {
    User.create.mockRejectedValue(new Error('database unavailable'));
    const response = createResponse();

    await register({
      body: {
        username: 'valid-name',
        email: 'chef@example.com',
        password: 'recipe-2026',
      },
    }, response);

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ success: false, message: '服务器内部错误' });
  });

  test('rejects invalid login input before database work', async () => {
    const response = createResponse();

    await login({ body: { email: 'not-an-email', password: '' } }, response);

    expect(response.statusCode).toBe(400);
    expect(User.findByEmail).not.toHaveBeenCalled();
    expect(User.verifyPassword).not.toHaveBeenCalled();
  });

  test('performs a password comparison and returns the generic response for a missing user', async () => {
    User.verifyPassword.mockResolvedValue(false);
    const response = createResponse();

    await login({ body: { email: ' Missing@Example.COM ', password: 'legacy' } }, response);

    expect(User.findByEmail).toHaveBeenCalledWith('missing@example.com');
    expect(User.verifyPassword).toHaveBeenCalledTimes(1);
    expect(User.verifyPassword).toHaveBeenCalledWith(
      'legacy',
      expect.stringMatching(/^\$2[aby]\$10\$/)
    );
    expect(response.statusCode).toBe(401);
    expect(response.payload).toEqual({ success: false, message: '邮箱或密码错误' });
  });

  test('does not reveal whether the user exists when the password is wrong', async () => {
    const user = {
      id: 8,
      username: 'legacy-user',
      email: 'legacy@example.com',
      password_hash: '$2a$10$user-hash',
    };
    User.findByEmail.mockResolvedValue(user);
    User.verifyPassword.mockResolvedValue(false);
    const response = createResponse();

    await login({ body: { email: 'legacy@example.com', password: 'legacy' } }, response);

    expect(User.verifyPassword).toHaveBeenCalledWith('legacy', user.password_hash);
    expect(response.statusCode).toBe(401);
    expect(response.payload).toEqual({ success: false, message: '邮箱或密码错误' });
  });

  test('logs in a legacy short-password account with normalized email', async () => {
    const user = {
      id: 9,
      username: 'legacy-user',
      email: 'legacy@example.com',
      password_hash: '$2a$10$user-hash',
    };
    User.findByEmail.mockResolvedValue(user);
    User.verifyPassword.mockResolvedValue(true);
    const response = createResponse();

    await login({ body: { email: ' Legacy@Example.COM ', password: 'x' } }, response);

    expect(User.findByEmail).toHaveBeenCalledWith('legacy@example.com');
    expect(User.verifyPassword).toHaveBeenCalledWith('x', user.password_hash);
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: 9, username: 'legacy-user' },
      expect.any(String),
      expect.objectContaining({ expiresIn: expect.any(String) })
    );
    expect(response.statusCode).toBe(200);
    expect(response.payload.data.user).toEqual({
      id: 9,
      username: 'legacy-user',
      email: 'legacy@example.com',
    });
  });
});
