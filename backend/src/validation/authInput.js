const EMAIL_MAX_LENGTH = 254;
const USERNAME_PATTERN = /^[\p{Script=Han}A-Za-z0-9_-]{2,32}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const BCRYPT_MAX_BYTES = 72;

function failure(message) {
  return { ok: false, message };
}

function normalizeEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return failure('邮箱为必填项');
  }

  const value = email.trim().toLowerCase();
  if (value.length > EMAIL_MAX_LENGTH) {
    return failure(`邮箱长度不能超过${EMAIL_MAX_LENGTH}个字符`);
  }
  if (!EMAIL_PATTERN.test(value)) {
    return failure('邮箱格式不正确');
  }

  return { ok: true, value };
}

function validatePassword(password, { minimumCharacters }) {
  if (typeof password !== 'string' || password.length === 0) {
    return failure('密码为必填项');
  }
  if (minimumCharacters && Array.from(password).length < minimumCharacters) {
    return failure(`密码不能少于${minimumCharacters}个字符`);
  }
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    return failure(`密码的 UTF-8 编码不能超过 bcrypt 的 ${BCRYPT_MAX_BYTES} 字节限制`);
  }

  return { ok: true, value: password };
}

function validateRegistrationInput(input = {}) {
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  if (!USERNAME_PATTERN.test(username)) {
    return failure('用户名须为2-32个中英文字符、数字、下划线或连字符');
  }

  const email = normalizeEmail(input?.email);
  if (!email.ok) return email;

  const password = validatePassword(input?.password, { minimumCharacters: 8 });
  if (!password.ok) return password;

  return {
    ok: true,
    value: {
      username,
      email: email.value,
      password: password.value,
    },
  };
}

function validateLoginInput(input = {}) {
  const email = normalizeEmail(input?.email);
  if (!email.ok) return email;

  const password = validatePassword(input?.password, { minimumCharacters: 0 });
  if (!password.ok) return password;

  return {
    ok: true,
    value: {
      email: email.value,
      password: password.value,
    },
  };
}

module.exports = {
  validateLoginInput,
  validateRegistrationInput,
};
