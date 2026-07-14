const express = require('express');
const router = express.Router();
const teachController = require('../controllers/teachController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 数字传承人对话式教学（可选认证）
router.post('/', optionalAuth, teachController.teach);

// 获取教学历史（需要认证）
router.get('/history', authenticate, teachController.getHistory);

module.exports = router;
