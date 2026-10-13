const { validateLoginInput, validateRegistrationInput } = require('../authInput');

describe('authentication input validation', () => {
  test('normalizes valid registration input', () => {
    const result = validateRegistrationInput({
      username: '  风味官_01  ',
      email: '  Chef@Example.COM ',
      password: 'recipe-2026',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        username: '风味官_01',
        email: 'chef@example.com',
        password: 'recipe-2026',
      },
    });
  });

  test.each([
    [{ username: '', email: 'chef@example.com', password: 'recipe-2026' }, '用户名'],
    [{ username: 'a', email: 'chef@example.com', password: 'recipe-2026' }, '用户名'],
    [{ username: 'bad name', email: 'chef@example.com', password: 'recipe-2026' }, '用户名'],
    [{ username: 'a'.repeat(33), email: 'chef@example.com', password: 'recipe-2026' }, '用户名'],
    [{ username: 'valid-name', email: 'not-an-email', password: 'recipe-2026' }, '邮箱'],
    [{ username: 'valid-name', email: `${'a'.repeat(243)}@example.com`, password: 'recipe-2026' }, '254'],
    [{ username: 'valid-name', email: 'chef@example.com', password: 'short' }, '密码'],
    [{ username: 'valid-name', email: 'chef@example.com', password: '菜'.repeat(25) }, '72'],
    [{ username: { nested: true }, email: 'chef@example.com', password: 'recipe-2026' }, '用户名'],
  ])('rejects invalid registration input %#', (input, messagePart) => {
    const result = validateRegistrationInput(input);

    expect(result.ok).toBe(false);
    expect(result.message).toContain(messagePart);
  });

  test('accepts exact username and bcrypt password boundaries', () => {
    expect(validateRegistrationInput({
      username: '风味_01',
      email: 'chef@example.com',
      password: 'a'.repeat(72),
    }).ok).toBe(true);

    expect(validateRegistrationInput({
      username: 'a'.repeat(32),
      email: 'chef@example.com',
      password: '菜'.repeat(24),
    }).ok).toBe(true);
  });

  test('normalizes login email and rejects invalid credentials before database work', () => {
    expect(validateLoginInput({
      email: ' Chef@Example.COM ',
      password: 'recipe-2026',
    })).toEqual({
      ok: true,
      value: { email: 'chef@example.com', password: 'recipe-2026' },
    });

    expect(validateLoginInput({ email: [], password: 'recipe-2026' }).ok).toBe(false);
    expect(validateLoginInput({ email: 'chef@example.com', password: '' }).ok).toBe(false);
  });

  test('allows legacy short login passwords but enforces bcrypt byte limit', () => {
    expect(validateLoginInput({ email: 'chef@example.com', password: 'x' })).toEqual({
      ok: true,
      value: { email: 'chef@example.com', password: 'x' },
    });
    expect(validateLoginInput({ email: 'chef@example.com', password: '菜'.repeat(24) }).ok).toBe(true);
    expect(validateLoginInput({ email: 'chef@example.com', password: '菜'.repeat(25) })).toEqual({
      ok: false,
      message: expect.stringContaining('72'),
    });
  });
});
