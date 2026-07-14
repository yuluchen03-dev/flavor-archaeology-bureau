# 风味考古局 - 后端API服务

## 项目简介

风味考古局是一个致力于复原古代美食的文化项目。本项目是其后端API服务，提供古籍分析、菜品复原、数字传承人教学等功能。

## 主要功能

### API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/analyze` | POST | 分析古籍/古画/口述线索 |
| `/api/restore` | POST | 复原古代菜品 |
| `/api/recipe/:id` | GET | 获取菜品详情 |
| `/api/recipe/search` | GET | 搜索菜品 |
| `/api/teach` | POST | 数字传承人对话教学 |
| `/api/star-map` | GET | 获取味觉星图数据 |
| `/api/star-map/dish/:id` | GET | 获取菜品星图位置 |

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: SQLite (via Knex.js)
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: bcryptjs

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 初始化数据库

```bash
npm run db:init
```

### 3. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 http://localhost:3001 启动

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.js  # 数据库配置
│   │   ├── auth.js      # 认证配置
│   │   └── ai.js        # AI服务配置
│   ├── controllers/     # 控制器
│   │   ├── authController.js
│   │   ├── analyzeController.js
│   │   ├── restoreController.js
│   │   ├── recipeController.js
│   │   ├── teachController.js
│   │   └── starMapController.js
│   ├── middleware/      # 中间件
│   │   └── auth.js      # JWT认证中间件
│   ├── models/          # 数据模型
│   │   ├── User.js
│   │   └── Dish.js
│   ├── routes/          # 路由定义
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── analyze.js
│   │   ├── restore.js
│   │   ├── recipe.js
│   │   ├── teach.js
│   │   └── starMap.js
│   ├── services/        # 业务逻辑服务
│   │   ├── AnalysisService.js
│   │   ├── RestorationService.js
│   │   ├── TeachingService.js
│   │   └── StarMapService.js
│   ├── scripts/         # 脚本工具
│   │   └── init-db.js   # 数据库初始化
│   ├── migrations/      # 数据库迁移
│   └── seeds/           # 种子数据
├── package.json
├── .env
└── README.md
```

## 环境变量

创建 `.env` 文件并配置以下变量：

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
OPENAI_API_KEY=
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MODEL_NAME=doubao-pro-32k
OPENAI_VISION_MODEL=gpt-4.1-mini
AGNES_API_KEY=
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_IMAGE_MODEL=agnes-image-2.0-flash
```

生产或 Docker 演示必须显式设置 `JWT_SECRET`。生产环境必须配置 `CORS_ORIGIN`，避免任意来源调用 API。当前 SQLite 路径由 `src/config/database.js` 统一管理，不读取 `DB_PATH`。

## 健康检查

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api
```

`/health` 会返回认证、CORS、限流和 AI provider readiness，用于 Docker healthcheck 和现场 smoke。未配置外部 AI key 时，服务仍可用，但返回的 AI 状态会标注为 `degraded` 或 `local`。

## 数据库

### 表结构

- **users**: 用户表
- **dishes**: 菜品表
- **analysis_records**: 分析记录表
- **restoration_records**: 复原记录表
- **teaching_records**: 教学记录表

### 示例数据

数据库初始化时会自动插入5个示例菜品：
1. 东坡肉 (宋朝)
2. 蟹酿橙 (宋朝)
3. 太白鸭 (唐朝)
4. 贵妃鸡 (唐朝)
5. 叫花鸡 (宋朝)

## 认证

使用JWT进行用户认证：

```javascript
// 请求头格式
Authorization: Bearer <token>
```

## 开发说明

### 添加新菜品

编辑 `src/seeds/001_sample_dishes.js` 文件，按照现有格式添加新菜品。

### AI 与降级模式

后端支持通过环境变量接入外部 LLM/VLM/图片生成服务；未配置 API Key 或外部服务失败时，会回退到本地知识图谱、规则推理和 placeholder 图片，并在响应里标注 `generated`、`local` 或 `degraded` 等状态，避免把降级结果伪装成真实模型输出。

## 许可证

MIT License
