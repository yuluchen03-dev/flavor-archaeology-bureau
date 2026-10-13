const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 登出：清除 httpOnly cookie
router.post('/logout', authController.logout);

// 获取当前用户信息（需要认证）
router.get('/me', authenticate, authController.getMe);

module.exports = router;
