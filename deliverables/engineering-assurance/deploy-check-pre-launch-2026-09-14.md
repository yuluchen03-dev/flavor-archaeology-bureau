# 风味考古局 — 上线前全检报告（代码审查 + 安全审计 + QA测试）

**日期**：2026-09-14
**工作流**：工作流 4 — 部署前检查（Go/No-Go）
**参与成员**：Cody（代码审查师）、Rex（SRE工程师）、Tessa（测试专家）

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🔶 **有条件通过（Conditionally Go）** — 核心功能完整，关键安全措施已到位，但存在 1 个严重安全问题（API 密钥泄露）和多个高优先级项需部署前修复
- **严重度分布**：🔴严重 3 项 / 🟠高 10 项 / 🟡中 8 项 / 🟢低 6 项
- **阻塞项**：3 个（密钥轮换、依赖漏洞修复、JWT 中间件测试）
- **非阻塞但强烈建议**：安全响应头、错误处理统一、覆盖率工具配置

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| 整体评级 | 🟡 有条件通过 |
| 阻塞项数量 | 3 |
| 关键行动项 | 12 条 |
| 测试覆盖率 | ~292+ 用例，99.7% 通过率，评分 B- (70/100) |
| 代码健康度 | 良好（架构清晰，安全意识到位，细节需打磨） |
| 可运维性 | 2-3/5（基础到位，可观测性和高可用待补） |
| 建议下一步 | 修复 P0 阻塞项 → 补充 JWT 测试 → 部署 |

---

## 🔍 代码审查发现（按严重度排序）

| # | 严重度 | 类别 | 文件:行 | 问题描述 | 建议修复 | 来源 |
|---|--------|------|---------|---------|---------|------|
| 1 | 🔴严重 | 安全 | backend/.env:18 | AGNES API 密钥明文 `sk-7Tkr...4e2` 写入 .env 文件，可能泄露 | **立即轮换密钥**，确认未提交 git 历史，今后仅通过 CI/CD secret 注入 | Cody |
| 2 | 🔴严重 | 安全 | frontend/src/lib/authStore.js | JWT 存储在 localStorage，XSS 可窃取 token | 迁移至 HttpOnly + Secure + SameSite Cookie | Cody |
| 3 | 🔴严重 | 测试 | middleware/auth.js | **JWT 认证中间件零测试** — 整个应用的安全大门无任何测试覆盖 | 补充 9 个测试用例（过期/篡改/无效/缺失/可选认证路径） | Tessa |
| 4 | 🟠高 | 安全 | backend/package.json | 后端依赖 16 个漏洞（1 critical, 8 high）：body-parser DoS、tar 路径遍历 | 运行 `npm audit fix`，升级受影响依赖 | Cody |
| 5 | 🟠高 | 安全 | frontend/package.json | 前端依赖 9 个漏洞（8 high）：react-router CSRF 绕过、sharp libheif 漏洞 | 运行 `npm audit fix`，升级 react-router 至 >=7.18.2 | Cody |
| 6 | 🟠高 | 安全 | backend/src/app.js:69 | 错误堆栈泄露：NODE_ENV 误配置将暴露完整调用栈 | 移除条件性 stack 泄露，严格限制为非生产环境 | Cody |
| 7 | 🟠高 | 安全 | backend/src/app.js | 缺少安全响应头（X-Content-Type-Options, X-Frame-Options, HSTS, CSP） | 添加 `helmet` 中间件 | Cody/Rex |
| 8 | 🟠高 | 安全 | nginx.conf | Nginx 缺少安全响应头，监听 80 端口无 TLS | 添加安全头，部署时需外部 LB 终止 TLS | Rex |
| 9 | 🟠高 | 运维 | Dockerfile (backend) | 容器以 root 用户运行，存在权限提升风险 | 添加 `USER node` 或创建非特权用户 | Rex |
| 10 | 🟠高 | 运维 | docker-compose.yml | 无 `restart` 策略、无资源限制（memory/cpu） | 添加 `restart: unless-stopped` 和 `deploy.resources.limits` | Rex |
| 11 | 🟠高 | 测试 | CI/CD | **无 CI/CD pipeline** — 测试仅手动执行，部署全靠人工 | 添加 `.github/workflows/test.yml` | Tessa |
| 12 | 🟠高 | 测试 | 6 个核心路由 | analyze/restore/teach/evolution/starMap/recipe 路由无集成测试 | 补充路由集成测试（至少覆盖 200/400/401/404） | Tessa |
| 13 | 🟠高 | 测试 | 8 个 controller | 除 authController 外，其余 8 个 controller 均无测试 | 补充 controller 单元测试 | Tessa |
| 14 | 🟡中 | 安全 | config/auth.js:2 | JWT 密钥硬编码回退值 `flavor-archaeology-local-demo-secret` | 生产环境强制检查，开发环境使用随机值 | Cody |
| 15 | 🟡中 | 安全 | app.js:31 | JSON body limit 10MB 过大 | 降至 1MB，图片上传走独立端点 | Cody |
| 16 | 🟡中 | 安全 | config/auth.js:11 | JWT 过期时间 7 天过长 | 缩短至 2-4 小时，引入 Refresh Token | Cody |
| 17 | 🟡中 | 安全 | controllers/evolutionController.js:33 | error.message 直接返回客户端，暴露内部细节 | 使用统一的用户友好错误消息 | Cody |
| 18 | 🟡中 | 安全 | services/PythonBridge.js:75 | Python stderr 包含文件路径和堆栈信息 | 返回客户端前脱敏 | Cody |
| 19 | 🟡中 | 运维 | 全项目 | 仅 console.log，无结构化 JSON 日志 | 引入 winston/pino 结构化日志 | Rex/Cody |
| 20 | 🟡中 | 运维 | SQLite | 无备份策略，无 WAL 模式确认 | 建立定时备份 cron，确认 WAL 模式 | Rex |
| 21 | 🟡中 | 测试 | Jest 配置 | 覆盖率工具未配置，无法量化行覆盖率 | jest.config.cjs 添加 collectCoverage 配置 | Tessa |
| 22 | 🟢低 | 安全 | models/Dish.js:37-40 | LIKE 查询通配符注入（%和_未转义） | 添加 escapeLikePattern 转义 | Cody |
| 23 | 🟢低 | 安全 | controllers/analyzeController.js:46 | page/limit 参数未验证，limit=999999 可导致大查询 | 添加类型/范围校验 | Cody |
| 24 | 🟢低 | 安全 | controllers/recipeController.js:42 | 搜索参数 keyword/dynasty 未验证 | 添加输入验证 | Cody |
| 25 | 🟢低 | 运维 | docker-compose.yml | frontend 无 healthcheck | 添加 curl 健康检查 | Rex |
| 26 | 🟢低 | 运维 | 全项目 | 无 Prometheus metrics、无 APM 集成 | 后续迭代添加 | Rex |
| 27 | 🟢低 | 测试 | DishBackgroundAssets.test.js | 测试失败：预期的背景图片文件缺失 | 修复资源部署/构建流程 | Tessa |

---

## 🏗️ 可运维性评估

### 架构总览
```
Client → Nginx(frontend:80) → Proxy → Backend(Node.js:3001)
                                          ├── SQLite (volume: backend_data)
                                          └── Python Service (子进程, 内嵌)
```

### 评分

| 维度 | 分数 | 说明 |
|------|------|------|
| 可观测性 | 2/5 | 仅 console.log，无结构化日志、无 metrics、无 tracing |
| 安全性 | 3/5 | CORS/JWT/rate limit 已实现，缺安全头、TLS、非 root 用户 |
| 数据持久性 | 3/5 | volume 挂载正确，SQLite 单文件无备份 |
| 可用性 | 2/5 | 单实例、无集群、无 restart 策略、无 graceful shutdown |
| 可恢复性 | 2/5 | 无备份策略、无回滚脚本 |
| 自动化 | 3/5 | Docker Compose 一键启动、自动迁移，缺 CI/CD |

---

## 🧪 测试覆盖评估

### 测试执行总览

| 层级 | 框架 | 测试套件数 | 测试用例数 | 通过 | 失败 | 通过率 |
|------|------|-----------|-----------|------|------|--------|
| 后端 (Node.js) | Jest | 31 | 181 | 180 | 1 | 99.4% |
| Python 服务 | unittest | 3 | 11 | 11 | 0 | 100% |
| 前端 | node:test | ~35 | ~100+ | 全通过 | 0 | 100% |
| **合计** | — | **~69** | **~292+** | **291+** | **1** | **~99.7%** |

### 覆盖率矩阵

| 模块 | 已覆盖/总数 | 覆盖率 | 关键缺口 |
|------|------------|--------|---------|
| 后端 Services | 14/18 | 78% | AnalysisService, TeachingService, StarMapService, fetchWithTimeout |
| 后端 Routes | 5/11 | 45% | analyze, restore, teach, evolution, starMap, recipe |
| 后端 Controllers | 1/9 | 11% | 除 authController 外全部缺失 |
| 安全中间件 | 1/2 | 50% | **JWT middleware 零测试** |
| Models | 0/2 | 0% | User.js, Dish.js |
| Python 服务 | 2.5/4 | 63% | llm_reasoner, image_generator, knowledge_graph |
| 前端 | 静态分析为主 | — | 无组件渲染测试，无 E2E 测试 |

### 做得好的测试

1. **authController 测试**：覆盖输入校验、冲突检测、SQLITE 竞态、时序攻击防护 — 教科书级安全测试
2. **rateLimit 中间件**：真实 HTTP 集成测试，有 injectable `now()` 时钟
3. **PythonBridge 弹性测试**：子进程超时 kill、stdout/stderr 大小限制
4. **前端 apiClient**：全面的错误路径测试（HTTP 错误、HTML 响应、malformed JSON、超时、AbortSignal）
5. **restoration_engine**：覆盖真实复原逻辑、引用来源验证、弱线索防幻觉

---

## ✅ 行动清单（按优先级排序）

| # | 行动 | 负责角色 | 紧急度 | 预期完成 |
|---|------|---------|--------|---------|
| 1 | **轮换 AGNES_API_KEY**，确认未提交 git 历史，今后仅通过 secret 注入 | DevOps | P0 | 立即 |
| 2 | **运行 `npm audit fix`** 修复后端 16 个 + 前端 9 个依赖漏洞 | 开发 | P0 | 部署前 |
| 3 | **补充 JWT middleware 测试**（9 个用例：过期/篡改/无效/缺失/可选认证） | 开发 | P0 | 部署前 |
| 4 | **Docker 添加 `restart: unless-stopped`** 和资源限制 | DevOps | P0 | 部署前 |
| 5 | **Nginx 添加安全响应头**（X-Content-Type-Options, X-Frame-Options, HSTS） | DevOps | P0 | 部署前 |
| 6 | **设置强随机 JWT_SECRET**（≥32 字符）+ 配置正确的 CORS_ORIGIN | DevOps | P0 | 部署前 |
| 7 | 添加 `helmet` 中间件到 Express | 开发 | P1 | 部署后 1 周 |
| 8 | 统一错误响应，移除客户端可见的 stack/error.message | 开发 | P1 | 部署后 1 周 |
| 9 | Backend Dockerfile 添加非 root 用户 | DevOps | P1 | 部署后 1 周 |
| 10 | 建立 SQLite 定时备份 cron | DevOps | P1 | 部署后 1 周 |
| 11 | 配置 Jest 覆盖率工具 + 补充核心路由集成测试 | 开发 | P1 | 部署后 2 周 |
| 12 | 添加 CI/CD pipeline（GitHub Actions） | DevOps | P1 | 部署后 2 周 |

---

## ⚠️ 待完善 / 已知局限

- **SQLite 并发限制**：写入时锁定整个数据库文件，高并发场景可能出现 SQLITE_BUSY，中期需迁移至 PostgreSQL
- **内存级 Rate Limiter**：重启后计数器丢失，多实例部署时不共享状态（当前单实例可接受）
- **Python 子进程**：无超时控制、无错误隔离，异常 Python 代码可能导致 Node.js 进程崩溃
- **JWT 存储方案**：当前使用 localStorage，存在 XSS 窃取风险，建议迁移至 HttpOnly Cookie
- **前端测试**：主要是静态源码分析（readFileSync + 正则匹配），非真正的组件渲染测试
- **E2E 测试**：Playwright 已在 devDependencies 但无任何 E2E 测试文件
- **可观测性**：无结构化日志、无 metrics、无 tracing，生产问题排查困难

---

## 📚 数据来源 & 成员产出索引

- **Cody（代码审查师）**：完整代码审查与安全审计报告，覆盖后端/前端/Python 服务/Docker 配置，发现 1 个严重 + 5 个高 + 4 个中 + 若干低优先级问题
- **Rex（SRE 工程师）**：部署检查清单（27 项逐项评估）、可运维性评分、Go/No-Go 决策、回滚方案、生产环境 docker-compose 建议
- **Tessa（测试专家）**：测试执行总览（292+ 用例）、覆盖率矩阵（6 层逐模块分析）、测试质量分析、缺口分析、QA 上线前必测清单（16 项）

---

## 🔄 回滚方案

### 策略：Docker 镜像版本回滚

```bash
# 1. 停止当前服务（保留 volume）
docker compose down

# 2. 指定上一版本镜像 tag
export BACKEND_IMAGE=flavor-archaeology-backend:v0.9.0

# 3. 重启服务
docker compose up -d

# 4. 验证健康
curl -f http://localhost:3001/health
curl -f http://localhost:5173/
```

**注意**：SQLite 数据在 volume 中，镜像回滚不影响数据。如需数据回滚，需手动恢复备份文件。

---

> 本报告由工程保障团队 AI 协作生成，关键决策请由人类工程负责人复核。
