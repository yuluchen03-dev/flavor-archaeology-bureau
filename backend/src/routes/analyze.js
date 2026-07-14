const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 分析古籍/古画/口述线索（可选认证）
router.post('/', optionalAuth, analyzeController.analyze);

// 获取分析历史记录（需要认证）
router.get('/history', authenticate, analyzeController.getHistory);

module.exports = router;
