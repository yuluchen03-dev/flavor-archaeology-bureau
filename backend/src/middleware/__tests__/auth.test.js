const jwt = require('jsonwebtoken');
const { authenticate, optionalAuth } = require('../auth');
const User = require('../../models/User');

// Mock依赖
jest.mock('jsonwebtoken');
jest.mock('../../models/User');

describe('JWT Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    test('应该返回401如果没有提供authorization头', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '未提供认证令牌'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该返回401如果authorization头格式错误', async () => {
      req.headers.authorization = 'InvalidFormat';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '未提供认证令牌'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该返回401如果token已过期', async () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '认证令牌已过期'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该返回401如果token无效', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '无效的认证令牌'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该返回401如果用户不存在', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '用户不存在'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该成功认证并设置req.user', async () => {
      const mockUser = { id: 'user123', username: 'testuser' };
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    test('应该继续处理如果没有authorization头', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('应该继续处理如果token无效', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('应该成功认证如果token有效', async () => {
      const mockUser = { id: 'user123', username: 'testuser' };
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });
});
