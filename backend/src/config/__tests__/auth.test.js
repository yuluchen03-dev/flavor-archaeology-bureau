describe('auth config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('allows a local demo secret outside production', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    jest.resetModules();

    const config = require('../auth');

    expect(config.jwtSecret).toBeTruthy();
    expect(config.jwtSecretSource).toBe('development-default');
  });

  test('requires JWT_SECRET in production', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    expect(() => require('../auth')).toThrow('JWT_SECRET must be configured in production');
  });
});
