require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes');
const { createRateLimit } = require('./middleware/rateLimit');
const { buildReadinessReport, resolveCorsOrigin } = require('./config/runtime');

const app = express();
const PORT = process.env.PORT || 3001;

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 中间件配置
app.use(cors({
  origin: resolveCorsOrigin(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// API路由
app.use('/api', createRateLimit(), apiRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json(buildReadinessReport());
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`风味考古局后端服务已启动`);
  console.log(`地址: http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
