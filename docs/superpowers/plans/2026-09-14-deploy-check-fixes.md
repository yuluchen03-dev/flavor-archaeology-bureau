# 风味考古局上线前全检报告修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 修复上线前全检报告中发现的所有问题，确保项目达到生产部署标准

**Architecture:** 按优先级分阶段修复，P0阻塞项必须在部署前完成，P1项在部署后1周内完成

**Tech Stack:** Node.js, Express, SQLite, Docker, Nginx, Jest, React

---

## 文件结构

### 后端安全配置
- Modify: ackend/.env - 移除明文API密钥
- Modify: ackend/src/config/auth.js - 更新JWT配置
- Modify: ackend/src/app.js - 添加安全中间件
- Create: ackend/src/middleware/security.js - 安全响应头中间件

### 依赖漏洞修复
- Modify: ackend/package.json - 更新依赖版本
- Modify: rontend/package.json - 更新依赖版本

### Docker配置
- Modify: docker-compose.yml - 添加restart策略和资源限制
- Modify: ackend/Dockerfile - 添加非root用户

### Nginx配置
- Modify: rontend/nginx.conf - 添加安全响应头

### 测试补充
- Create: ackend/tests/middleware/auth.test.js - JWT中间件测试
- Modify: ackend/jest.config.cjs - 配置覆盖率工具

### CI/CD配置
- Create: .github/workflows/test.yml - GitHub Actions工作流

---

## Task 1: 轮换AGNES API密钥 (P0)

**Files:**
- Modify: ackend/.env
- Modify: ackend/.env.example

- [ ] **Step 1: 从后端.env文件中移除明文API密钥**

`powershell
# 备份原始文件
Copy-Item -Path "backend/.env" -Destination "backend/.env.backup"

# 更新.env文件，移除明文密钥
$envContent = Get-Content -Path "backend/.env" -Encoding UTF8
$envContent = $envContent -replace 'AGNES_API_KEY=${AGNES_API_KEY}', 'AGNES_API_KEY=${AGNES_API_KEY}'
Set-Content -Path "backend/.env" -Encoding UTF8 -Value $envContent
`

- [ ] **Step 2: 更新.env.example文件**

`powershell
$exampleContent = Get-Content -Path "backend/.env.example" -Encoding UTF8
$exampleContent = $exampleContent -replace 'AGNES_API_KEY=.*', 'AGNES_API_KEY=your-api-key-here'
Set-Content -Path "backend/.env.example" -Encoding UTF8 -Value $exampleContent
`

- [ ] **Step 3: 验证密钥已移除**

`powershell
# 检查.env文件中是否还有明文密钥
Get-Content -Path "backend/.env" -Encoding UTF8 | Select-String -Pattern "sk-" -NotMatch
`

- [ ] **Step 4: 提交更改**

`ash
git add backend/.env backend/.env.example
git commit -m "security: remove hardcoded AGNES API key from .env"
`

---

## Task 2: 修复依赖漏洞 (P0)

**Files:**
- Modify: ackend/package.json
- Modify: rontend/package.json

- [ ] **Step 1: 修复后端依赖漏洞**

`powershell
cd backend
npm audit fix
npm audit
`

- [ ] **Step 2: 修复前端依赖漏洞**

`powershell
cd ../frontend
npm audit fix
npm audit
`

- [ ] **Step 3: 验证漏洞修复**

`powershell
# 检查后端漏洞
cd ../backend
npm audit --audit-level=high

# 检查前端漏洞
cd ../frontend
npm audit --audit-level=high
`

- [ ] **Step 4: 提交更改**

`ash
git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "security: fix dependency vulnerabilities via npm audit fix"
`

---

## Task 3: 补充JWT中间件测试 (P0)

**Files:**
- Create: ackend/tests/middleware/auth.test.js

- [ ] **Step 1: 创建JWT中间件测试文件**

`javascript
// backend/tests/middleware/auth.test.js
const jwt = require('jsonwebtoken');
const { authenticate, optionalAuth } = require('../../src/middleware/auth');
const User = require('../../src/models/User');

// Mock依赖
jest.mock('jsonwebtoken');
jest.mock('../../src/models/User');

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
`

- [ ] **Step 2: 运行测试验证**

`powershell
cd backend
npm test -- tests/middleware/auth.test.js
`

- [ ] **Step 3: 提交更改**

`ash
git add backend/tests/middleware/auth.test.js
git commit -m "test: add comprehensive JWT middleware tests"
`

---

## Task 4: Docker配置优化 (P0)

**Files:**
- Modify: docker-compose.yml
- Modify: ackend/Dockerfile

- [ ] **Step 1: 更新docker-compose.yml添加restart策略和资源限制**

`yaml
name: flavor-archaeology

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3001
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET before running docker compose up}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173}
      TRUST_PROXY_HOPS: "1"
      PYTHONIOENCODING: utf-8
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      OPENAI_BASE_URL: ${OPENAI_BASE_URL:-https://ark.cn-beijing.volces.com/api/v3}
      MODEL_NAME: ${MODEL_NAME:-doubao-pro-32k}
      AGNES_API_KEY: ${AGNES_API_KEY:-}
      AGNES_BASE_URL: ${AGNES_BASE_URL:-https://apihub.agnes-ai.com/v1}
      AGNES_IMAGE_MODEL: ${AGNES_IMAGE_MODEL:-agnes-image-2.0-flash}
    expose:
      - "3001"
    volumes:
      - backend_data:/app/backend/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 20s

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_API_BASE: ${VITE_API_BASE:-/api}
    ports:
      - "5173:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
        reservations:
          memory: 128M
          cpus: '0.1'

volumes:
  backend_data:
`

- [ ] **Step 2: 更新backend/Dockerfile添加非root用户**

`dockerfile
FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app/backend

# 复制package文件
COPY backend/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY backend/ .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app/backend

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "src/app.js"]
`

- [ ] **Step 3: 验证Docker配置**

`powershell
# 验证docker-compose语法
docker compose config

# 构建镜像测试
docker compose build
`

- [ ] **Step 4: 提交更改**

`ash
git add docker-compose.yml backend/Dockerfile
git commit -m "ops: add restart policy, resource limits, and non-root user to Docker"
`

---

## Task 5: Nginx安全响应头 (P0)

**Files:**
- Modify: rontend/nginx.conf

- [ ] **Step 1: 更新nginx.conf添加安全响应头**

`
ginx
server {
  listen 80;
  server_name _;

  # 安全响应头
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:3001 https://apihub.agnes-ai.com;" always;

  root /usr/share/nginx/html;
  index index.html;

  location = /api {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ^~ /api/ {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
`

- [ ] **Step 2: 验证Nginx配置**

`powershell
# 测试Nginx配置语法
docker run --rm -v "${PWD}/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
`

- [ ] **Step 3: 提交更改**

`ash
git add frontend/nginx.conf
git commit -m "security: add security headers to Nginx configuration"
`

---

## Task 6: 设置强随机JWT_SECRET (P0)

**Files:**
- Modify: ackend/.env
- Modify: docker-compose.yml

- [ ] **Step 1: 生成强随机JWT_SECRET**

`powershell
# 生成32字节的随机字符串
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "Generated JWT_SECRET: $jwtSecret"

# 更新.env文件
$envContent = Get-Content -Path "backend/.env" -Encoding UTF8
$envContent = $envContent -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret"
Set-Content -Path "backend/.env" -Encoding UTF8 -Value $envContent
`

- [ ] **Step 2: 更新docker-compose.yml使用环境变量**

`yaml
# 在docker-compose.yml中确保JWT_SECRET从环境变量读取
# 已经在Task 4中配置了JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET before running docker compose up}
`

- [ ] **Step 3: 验证JWT_SECRET已更新**

`powershell
# 检查.env文件中的JWT_SECRET
Get-Content -Path "backend/.env" -Encoding UTF8 | Select-String -Pattern "JWT_SECRET"
`

- [ ] **Step 4: 提交更改**

`ash
git add backend/.env
git commit -m "security: set strong random JWT_SECRET"
`

---

## Task 7: 添加Helmet中间件 (P1)

**Files:**
- Modify: ackend/package.json
- Modify: ackend/src/app.js

- [ ] **Step 1: 安装Helmet依赖**

`powershell
cd backend
npm install helmet
`

- [ ] **Step 2: 在Express应用中添加Helmet中间件**

`javascript
// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // 添加这一行
const rateLimit = require('./middleware/rateLimit');
const { authenticate, optionalAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');
const restoreRoutes = require('./routes/restore');
const teachRoutes = require('./routes/teach');
const evolutionRoutes = require('./routes/evolution');
const starMapRoutes = require('./routes/starMap');
const recipeRoutes = require('./routes/recipe');
const healthRoutes = require('./routes/health');

const app = express();

// 安全中间件
app.use(helmet()); // 添加这一行

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 限流中间件
app.use(rateLimit);

// 解析JSON请求体
app.use(express.json({ limit: '1mb' })); // 降低限制从10mb到1mb

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/analyze', authenticate, analyzeRoutes);
app.use('/api/restore', authenticate, restoreRoutes);
app.use('/api/teach', authenticate, teachRoutes);
app.use('/api/evolution', authenticate, evolutionRoutes);
app.use('/api/starMap', authenticate, starMapRoutes);
app.use('/api/recipe', authenticate, recipeRoutes);
app.use('/api/health', healthRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // 生产环境不暴露错误堆栈
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  } else {
    res.status(500).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = app;
`

- [ ] **Step 3: 运行测试验证**

`powershell
cd backend
npm test
`

- [ ] **Step 4: 提交更改**

`ash
git add backend/package.json backend/package-lock.json backend/src/app.js
git commit -m "security: add Helmet middleware for security headers"
`

---

## Task 8: 统一错误响应 (P1)

**Files:**
- Modify: ackend/src/app.js
- Modify: ackend/src/controllers/evolutionController.js
- Modify: ackend/src/services/PythonBridge.js

- [ ] **Step 1: 创建统一错误处理中间件**

`javascript
// backend/src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // 生产环境不暴露错误细节
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
  
  // 开发环境返回错误详情
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
`

- [ ] **Step 2: 更新app.js使用统一错误处理**

`javascript
// backend/src/app.js
const errorHandler = require('./middleware/errorHandler');

// ... 其他代码 ...

// 错误处理中间件
app.use(errorHandler);
`

- [ ] **Step 3: 更新evolutionController.js统一错误消息**

`javascript
// backend/src/controllers/evolutionController.js
// 在错误处理中使用统一消息
try {
  // 业务逻辑
} catch (error) {
  console.error('Evolution error:', error);
  res.status(500).json({
    success: false,
    message: '进化分析失败，请稍后重试' // 统一错误消息
  });
}
`

- [ ] **Step 4: 更新PythonBridge.js脱敏错误信息**

`javascript
// backend/src/services/PythonBridge.js
// 在返回错误前脱敏
if (stderr) {
  // 移除文件路径和堆栈信息
  const sanitizedError = stderr
    .replace(/\/[^\/\s]+\.(js|py|ts):\d+:\d+/g, '[file]')
    .replace(/at\s+.*\(.*\)/g, '[stack]')
    .replace(/Error:.*$/gm, 'Error: [sanitized]');
  
  return { success: false, error: sanitizedError };
}
`

- [ ] **Step 5: 运行测试验证**

`powershell
cd backend
npm test
`

- [ ] **Step 6: 提交更改**

`ash
git add backend/src/middleware/errorHandler.js backend/src/app.js backend/src/controllers/evolutionController.js backend/src/services/PythonBridge.js
git commit -m "security: unify error responses and sanitize error messages"
`

---

## Task 9: 配置Jest覆盖率工具 (P1)

**Files:**
- Modify: ackend/jest.config.cjs

- [ ] **Step 1: 更新jest.config.cjs添加覆盖率配置**

`javascript
// backend/jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/app.js'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
`

- [ ] **Step 2: 运行测试生成覆盖率报告**

`powershell
cd backend
npm test -- --coverage
`

- [ ] **Step 3: 提交更改**

`ash
git add backend/jest.config.cjs
git commit -m "test: configure Jest coverage reporting"
`

---

## Task 10: 添加CI/CD Pipeline (P1)

**Files:**
- Create: .github/workflows/test.yml

- [ ] **Step 1: 创建GitHub Actions工作流文件**

`yaml
# .github/workflows/test.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Run security audit
      run: |
        cd backend
        npm audit --audit-level=high
    
    - name: Build Docker image
      run: docker compose build
    
    - name: Run integration tests
      run: |
        docker compose up -d
        sleep 10
        curl -f http://localhost:3001/health || exit 1
        docker compose down
`

- [ ] **Step 2: 提交更改**

`ash
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions workflow for testing and security audit"
`

---

## Task 11: 补充SQLite备份策略 (P1)

**Files:**
- Create: scripts/backup-db.sh
- Create: .github/workflows/backup.yml

- [ ] **Step 1: 创建数据库备份脚本**

`ash
#!/bin/bash
# scripts/backup-db.sh

# 配置
BACKUP_DIR="./backups"
DB_PATH="./backend/data/flavor_archaeology.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 保留最近30天的备份
find $BACKUP_DIR -name "backup_*.db.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
`

- [ ] **Step 2: 创建GitHub Actions备份工作流**

`yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点执行
  workflow_dispatch:  # 允许手动触发

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run backup
      run: |
        chmod +x scripts/backup-db.sh
        ./scripts/backup-db.sh
    
    - name: Upload backup artifact
      uses: actions/upload-artifact@v3
      with:
        name: database-backup-${{ github.run_number }}
        path: backups/
        retention-days: 30
`

- [ ] **Step 3: 提交更改**

`ash
git add scripts/backup-db.sh .github/workflows/backup.yml
git commit -m "ops: add SQLite backup strategy with GitHub Actions"
`

---

## Task 12: 补充核心路由集成测试 (P1)

**Files:**
- Create: ackend/tests/routes/analyze.test.js
- Create: ackend/tests/routes/restore.test.js
- Create: ackend/tests/routes/teach.test.js

- [ ] **Step 1: 创建analyze路由集成测试**

`javascript
// backend/tests/routes/analyze.test.js
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Analyze Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // 生成认证token
    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // 清理测试数据
    await User.delete(testUser.id);
  });

  describe('POST /api/analyze', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ dish: '红烧肉' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少dish参数', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Authorization', Bearer ${authToken})
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功分析菜品', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Authorization', Bearer ${authToken})
        .send({ dish: '红烧肉' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
`

- [ ] **Step 2: 创建restore路由集成测试**

`javascript
// backend/tests/routes/restore.test.js
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Restore Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });

    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.delete(testUser.id);
  });

  describe('POST /api/restore', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/restore')
        .send({ recipe: '古法红烧肉' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少recipe参数', async () => {
      const response = await request(app)
        .post('/api/restore')
        .set('Authorization', Bearer ${authToken})
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功复原古菜', async () => {
      const response = await request(app)
        .post('/api/restore')
        .set('Authorization', Bearer ${authToken})
        .send({ recipe: '古法红烧肉' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
`

- [ ] **Step 3: 创建teach路由集成测试**

`javascript
// backend/tests/routes/teach.test.js
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Teach Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'password123'
    });

    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.delete(testUser.id);
  });

  describe('POST /api/teach', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/teach')
        .send({ dish: '宫保鸡丁' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少dish参数', async () => {
      const response = await request(app)
        .post('/api/teach')
        .set('Authorization', Bearer ${authToken})
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功生成教学内容', async () => {
      const response = await request(app)
        .post('/api/teach')
        .set('Authorization', Bearer ${authToken})
        .send({ dish: '宫保鸡丁' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
`

- [ ] **Step 4: 运行集成测试**

`powershell
cd backend
npm test -- tests/routes/
`

- [ ] **Step 5: 提交更改**

`ash
git add backend/tests/routes/
git commit -m "test: add integration tests for core routes"
`

---

## 验证清单

完成所有任务后，运行以下验证：

- [ ] **安全验证**
  `powershell
  # 检查.env文件中没有明文密钥
  Get-Content -Path "backend/.env" -Encoding UTF8 | Select-String -Pattern "sk-"
  
  # 运行安全审计
  cd backend && npm audit --audit-level=high
  cd ../frontend && npm audit --audit-level=high
  `

- [ ] **测试验证**
  `powershell
  cd backend && npm test -- --coverage
  `

- [ ] **Docker验证**
  `powershell
  docker compose config
  docker compose build
  `

- [ ] **集成测试**
  `powershell
  cd backend && npm test -- tests/routes/
  `

---

## 执行建议

**推荐执行顺序：**
1. Task 1-6 (P0阻塞项) - 必须在部署前完成
2. Task 7-12 (P1项) - 部署后1周内完成

**执行方式选择：**
1. **Subagent-Driven (推荐)** - 每个任务分发给独立子代理，任务间审查
2. **Inline Execution** - 在当前会话中批量执行，设置检查点

**选择哪种执行方式？**
