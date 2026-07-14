const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const analyzeRoutes = require('./analyze');
const restoreRoutes = require('./restore');
const recipeRoutes = require('./recipe');
const teachRoutes = require('./teach');
const starMapRoutes = require('./starMap');
const evolutionRoutes = require('./evolution');
const lightRoutes = require('./light');
const fragmentRoutes = require('./fragments');
const apiRoutes = require('./api'); // 流式考据链 + 文生图等通用端点

// API路由注册
router.use('/auth', authRoutes);
router.use('/analyze', analyzeRoutes);
router.use('/restore', restoreRoutes);
router.use('/recipe', recipeRoutes);
router.use('/teach', teachRoutes);
router.use('/star-map', starMapRoutes);
router.use('/evolution', evolutionRoutes);
router.use('/light', lightRoutes);
router.use('/fragments', fragmentRoutes);
router.use('/', apiRoutes); // 挂载通用端点（ /api/analyze-stream, /api/generate-image 等）

// API根路径信息
router.get('/', (req, res) => {
  res.json({
    name: '风味考古局 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      analyze: '/api/analyze',
      restore: '/api/restore',
      recipe: '/api/recipe',
      teach: '/api/teach',
      starMap: '/api/star-map',
      evolution: '/api/evolution',
      light: '/api/light',
      fragments: '/api/fragments',
      analyzeStream: '/api/analyze-stream',
      generateImage: '/api/generate-image'
    }
  });
});

module.exports = router;
