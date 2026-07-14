# 风味考古局 - 非遗美食复原AI应用

> 让灭绝的中国味道，重新复生

## 项目简介

风味考古局是一款AI应用，用户化身「首席风味考古官」，给定一片残缺的历史线索（古籍片段、古画、口述），核心引擎「饕餮」便会像侦探一样，把一道灭绝了数百年、今天已无人尝过的中国菜，完整复活到眼前，并给出今晚就能做的现代版本。

## 核心功能

### 1. 古籍复原
从《山家清供》《随园食单》《齐民要术》等古籍中，推理还原失传的菜品。

### 2. 数字传承人
复活的菜召出数字传承人，对话式、边做边学地传授技艺。

### 3. 味觉星图
把复活与创造做成跨时空的收藏与探索。

### 4. 饕餮复原引擎
- **推理而非检索**：从碎片推理出整道灭绝的菜
- **古今食材替换**：把灭绝古菜还原成今天可做的版本
- **可信复原**：RAG + 图谱接地，降低幻觉

## 技术栈

### 前端
- React 19
- Vite
- Tailwind CSS
- React Router

### 后端
- Node.js
- Express
- SQLite (Knex.js)
- JWT认证

### 数据层
- 知识图谱 (JSON)
- Python复原引擎
- 古籍食方数据库

## 项目结构

```
风味考古局/
├── frontend/          # React前端应用
│   ├── src/
│   │   ├── components/  # 通用组件
│   │   ├── pages/       # 页面组件
│   │   └── ...
│   └── package.json
├── backend/           # Express后端API
│   ├── src/
│   │   ├── config/      # 配置文件
│   │   ├── controllers/ # 控制器
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # API路由
│   │   └── ...
│   └── package.json
├── data/              # 知识图谱数据
│   ├── knowledge_graph/ # 知识图谱节点和关系
│   ├── ingredients/     # 食材数据
│   ├── recipes/         # 菜品数据
│   └── techniques/      # 技法数据
├── service/           # Python数据服务
│   ├── knowledge_graph.py
│   └── restoration_engine.py
└── README.md
```

## 快速开始

### 评委现场一键启动

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1
```

默认启动：
- 后端 API：http://localhost:3001
- 前端页面：http://localhost:5173
- 前端 API 地址：`http://localhost:3001/api`

停止演示栈：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop-demo.ps1
```

另开一个终端可运行演示栈检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1
```

如果演示栈已经启动，并且需要把后端与前端 HTTP smoke 作为硬门禁：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1 -RequireRunning
```

如果没有配置外部 AI Key，系统会进入诚实降级模式：复原链路使用本地知识图谱与规则，图片生成失败时返回 `degraded` placeholder，评委模式会展示已审核缓存样例并明确标注。

> **局域网/隧道演示注意**：浏览器里的 `localhost` 指观众自己的机器。若使用手机、投屏、局域网 IP、Trae 预览域名或隧道域名访问，需要同步设置 `VITE_API_BASE` 为观众浏览器可访问的 API 地址，并设置后端 `CORS_ORIGIN` 为实际前端地址。

### Docker 演示启动

```bash
export JWT_SECRET="replace-with-a-long-random-secret"
docker compose up --build
```

Windows PowerShell:

```powershell
$env:JWT_SECRET="replace-with-a-long-random-secret"
docker compose up --build
```

默认映射：
- 前端：http://localhost:5173
- 后端：http://localhost:3001

公开部署或 Docker 演示前必须设置 `JWT_SECRET`，并按需配置 `OPENAI_API_KEY` 与 `AGNES_API_KEY`。

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

> **API 地址配置**：前端读取 `frontend/.env` 中的 `VITE_API_BASE`（已默认配置为 `http://localhost:3001/api`）。部署时修改此变量即可，无需改代码。

### 后端开发

```bash
cd backend
npm install
npm run dev
```

API服务运行在 http://localhost:3001

### Python服务

```bash
cd service
pip install -r requirements.txt
python ../service/api_wrapper.py list_dishes "{}"
```

当前 Python 服务主要通过 Node 后端的 `PythonBridge` 调用，不需要单独常驻进程。

## 黑客松评审材料

- 评审材料索引：`docs/hackathon/README.md`
- 一等奖评审一页纸：`docs/hackathon/judge-one-pager.md`
- 90 秒与 3 分钟路演脚本：`docs/hackathon/judge-demo-script.md`
- 蟹酿橙标杆证据包：`docs/hackathon/crab-orange-evidence-pack.md`
- 技术架构：`docs/hackathon/technical-architecture.md`
- 可信边界与安全说明：`docs/hackathon/trust-and-safety.md`
- 数据来源与扩展计划：`docs/hackathon/data-sources.md`

## API接口

### 分析古籍线索
```
POST /api/analyze
Body: { "clue": "《山家清供》中记载：橙用黄熟大者..." }
```

### 复原菜品
```
POST /api/restore
Body: { "dishId": "dish_001" }
```

### 获取菜品详情
```
GET /api/recipe/:id
```

### 数字传承人教学
```
POST /api/teach
Body: { "dishId": "dish_001", "question": "如何选择橙子？" }
```

### 味觉星图
```
GET /api/star-map
```

## 竞赛契合

本项目主攻「非遗创新创意产品开发」赛道，同时覆盖：
- **古籍活化工具**：饕餮复原引擎
- **学习工作**：数字传承人对话式教学
- **社会服务**：非遗保护与普及
- **生活娱乐**：味觉星图游戏化探索

## 设计哲学

> 文化即规则，而非装饰

技艺、节令、礼俗、地域的逻辑，是产品的核心机制，而不是界面上的纹样。

## 团队

风味考古局团队

## 许可证

MIT License

## 运行与验证速查

### 演示校验

用于评委现场或演示前的轻量检查。它会检查 Python 桥接、可选的本地后端 HTTP 接口，以及前端生产构建。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1
```

如果后端服务尚未启动，HTTP 检查会提示跳过；启动演示栈后可再次运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1
```

### 全量质量门

用于开发者提交前或交付前的完整检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
```

该脚本串联后端 Jest、前端 lint、前端 test（如果 `frontend/package.json` 暂无 `test` 脚本会明确跳过）、前端 build、Python unittest、文献数据校验，以及 `docker compose config`。如果当前 shell 没有设置 `JWT_SECRET`，脚本会使用临时值运行 compose 配置校验，不会污染外部环境。

### Docker 演示

```powershell
$env:JWT_SECRET="replace-with-a-long-random-secret"
docker compose up --build
```

Docker 后端容器启动时会先执行 `npm run db:init`，完成 SQLite 迁移和种子数据后再启动 API，避免容器已启动但业务表缺失。前端容器使用 Nginx SPA 回退配置，支持 BrowserRouter 深层路由刷新。
Compose 已配置后端 `/health` healthcheck，前端会等待后端健康后再启动，降低“页面已打开但 API 未 ready”的现场风险。
