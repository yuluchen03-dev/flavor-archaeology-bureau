const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const User = require('../models/User');

/**
 * 从请求中提取 JWT 令牌：
 * 优先从 httpOnly cookie 读取（安全性更高），
 * 回退到 Authorization: Bearer header（兼容旧客户端与测试）。
 */
function extractToken(req) {
  const cookieName = 'flavor_token';

  // 优先读取 httpOnly cookie
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  // 回退到 Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * JWT认证中间件
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.userId);
      req.user = user;
    }
  } catch (error) {
    // 忽略认证错误，继续处理请求
  }
  next();
};

module.exports = { authenticate, optionalAuth };
