const express = require('express');
const router = express.Router();
const evolutionController = require('../controllers/evolutionController');
const { optionalAuth } = require('../middleware/auth');

// 风味进化 - 融合两个菜品（可选认证）
router.post('/', optionalAuth, evolutionController.evolve);

module.exports = router;
