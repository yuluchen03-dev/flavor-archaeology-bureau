const express = require('express');
const router = express.Router();
const restoreController = require('../controllers/restoreController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 复原菜品（可选认证）
router.post('/', optionalAuth, restoreController.restore);

// 获取复原历史（需要认证）
router.get('/history', authenticate, restoreController.getHistory);

module.exports = router;
