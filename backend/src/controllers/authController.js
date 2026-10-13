const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { validateLoginInput, validateRegistrationInput } = require('../validation/authInput');
const { isProduction } = require('../config/runtime');

const CONFLICT_MESSAGE = '用户名或邮箱已被使用';
const GENERIC_ERROR_MESSAGE = '服务器内部错误';
const INVALID_CREDENTIALS_MESSAGE = '邮箱或密码错误';
const COOKIE_NAME = 'flavor_token';

// 时序均衡用占位哈希：用户不存在时仍执行一次同代价的密码比较，
// 避免通过响应时间探测邮箱是否已注册。格式须符合 /^\$2[aby]\$10\$/
const TIMING_SAFE_PLACEHOLDER_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const isUniqueConstraintError = (error) => {
  if (!error) return false;
  if (error.code === '23505') return true; // PostgreSQL unique_violation
  return /unique constraint/i.test(String(error.message || ''));
};

/**
 * 根据运行环境计算 cookie 安全参数：
 * - production：httpOnly + secure + SameSite=Lax
 * - 其他：httpOnly + SameSite=Lax（local dev / CI 中 secure=false，避免 https-only 限制）
 */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  };
}

/**
 * 在响应 body 附带 token 的同时，以 httpOnly cookie 下发同一令牌，
 * 使前端可统一走 cookie 路径，后续逐步移除 Authorization header。
 */
function attachAuthCookie(res, token) {
  if (token) {
    res.cookie(COOKIE_NAME, token, cookieOptions());
  }
}

/**
 * 用户注册
 */
const register = async (req, res) => {
  try {
    // 先做输入校验与规范化，任何无效输入都不触碰数据库
    const validation = validateRegistrationInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const { username, email, password } = validation.value;

    // 检查邮箱是否已存在
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: CONFLICT_MESSAGE
      });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: CONFLICT_MESSAGE
      });
    }

    // 创建用户
    const user = await User.create({ username, email, password });

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // 同时下发 httpOnly cookie，保留响应体 token 以兼容既有测试/客户端
    attachAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    // 并发注册触发的唯一约束冲突与预检查同等对待
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({
        success: false,
        message: CONFLICT_MESSAGE
      });
    }
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: GENERIC_ERROR_MESSAGE
    });
  }
};

/**
 * 用户登录
 */
const login = async (req, res) => {
  try {
    const validation = validateLoginInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const { email, password } = validation.value;

    // 查找用户；无论是否存在都执行一次密码比较，保证响应时间一致
    const user = await User.findByEmail(email);
    const isValidPassword = await User.verifyPassword(
      password,
      user?.password_hash || TIMING_SAFE_PLACEHOLDER_HASH
    );

    if (!user || !isValidPassword) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // 返回用户信息（不含密码哈希）
    const { password_hash, ...userInfo } = user;

    // 同时下发 httpOnly cookie，保留响应体 token 以兼容既有测试/客户端
    attachAuthCookie(res, token);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userInfo,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: GENERIC_ERROR_MESSAGE
    });
  }
};

/**
 * 登出：清除 httpOnly cookie 并清空响应体中的 token。
 * 该函数由登录注册控制器单独调用；前端无需调用登出 API，
 * 但暴露此函数供前端测试登出流程时使用。
 */
const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({
    success: true,
    message: '已退出登录',
  });
};

/**
 * 获取当前用户信息
 */
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: GENERIC_ERROR_MESSAGE
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
