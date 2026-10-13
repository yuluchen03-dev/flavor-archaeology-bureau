# 风味考古局 — 上线前全检报告

**日期**：2026-09-14
**场景**：上线前检查（代码审查 + 安全审计 + QA测试分析）
**参与成员**：产品评审员（代码审查） + 安全官（OWASP+STRIDE 审计） + 质量门神（QA测试）

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🟡 有条件上线（条件 Go）
- **阻塞项数量**：4（2项代码 + 2项安全，其中 SQL LIKE 注入重叠）
- **P0 问题**：3 项独立阻塞项（去重后）
- **P1 问题**：17 项（上线前必须修复）
- **P2 问题**：29 项（可后续优化）
- **测试覆盖**：117+ 用例已规划，前端缺少独立单元测试
- **下一步**：修复 3 个 P0 + 关键 P1 后可有条件上线

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go |
| 严重度分布 | 🔴 3 / 🟠 17 / 🟡 29 |
| 关键行动项 | 8 条 |
| 建议负责人 | 后端开发 + 安全负责人 |

---

## 1. 各成员核心结论

### 🔍 产品评审员（代码审查）

- **核心判断**：代码结构清晰，分层合理（Controller → Service → PythonBridge → Python Engine）。最紧迫问题是 **P0 级别的代码重复**——证据评分和融合菜名逻辑在 Node 路由层、Node Service 层、Python 引擎层各维护一份副本，是维护定时炸弹。P1 级别的竞态条件（每日抽卡超发）和 Python 异常静默吞没需上线前修复。
- **关键建议**：抽取共享工具函数消除 DRY 违反；为 CollectionService 添加事务保护；所有 Python `except` 块添加日志记录。

### 🛡️ 安全官（OWASP+STRIDE 审计）

- **核心判断**：发现 2 个 P0 漏洞——AGNES API 密钥明文硬编码在 `.env` 文件中（已确认存在于磁盘），以及 SQL LIKE 通配符注入。JWT 存储在 localStorage（XSS 可窃取）、无 CSRF 防护、弱 JWT 密钥等 5 个 P1 问题需本次迭代修复。
- **关键建议**：立即轮换 AGNES_API_KEY 并检查 git 历史；修复 LIKE 通配符转义；JWT 迁移至 HttpOnly Cookie；添加 `helmet` 安全头。

### ✅ 质量门神（QA测试与发布）

- **核心判断**：规划了 117+ 测试用例覆盖 12 个后端 API 模块 + 6 个前端交互模块 + 4 类非功能测试，其中 42 个 P0 用例。项目已有 20+ 后端测试文件，但**前端无独立测试**。降级模式（无 API Key → SVG placeholder）和评委模式是关键测试重点。
- **关键建议**：执行冒烟测试（8 项核心回归，5 分钟）作为发布门禁；补充前端核心组件测试；重点关注认证安全、SSE 流式推理链、降级模式三个高风险区域。

---

## 2. 综合审查发现（去重合并后按严重度排序）

### 🔴 P0 — 阻塞上线（3 项）

| # | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|------|------|---------|------|------|
| 1 | 安全 | `backend/.env:18` | AGNES API 密钥 `sk-7Tkr...LXrt4e2` 明文硬编码，已存在于磁盘 | **立即轮换密钥**；检查 git 历史；通过 CI/CD secret 注入 | 安全官 |
| 2 | 安全+代码 | `backend/src/models/Dish.js:37-41` | `Dish.search()` SQL LIKE 查询未转义 `%`、`_` 通配符，可导致全表扫描或绕过搜索意图 | 转义 keyword 中的 LIKE 特殊字符 | 安全官 + 评审员 |
| 3 | 代码 | `backend/src/routes/api.js` + `services/RestorationService.js` + `service/restoration_engine.py` + `service/api_wrapper.py` | 证据评分（权重公式）、食材归一化、融合菜名生成逻辑在 Node 路由层、Node Service 层、Python 引擎层各维护一份副本 | Node 侧抽到 `services/evidenceUtils.js`；融合菜名放入 JSON 文件；Python 侧权重常量加注释标注同步关系 | 评审员 |

### 🟠 P1 — 上线前必须修复（17 项）

| # | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|------|------|---------|------|------|
| 4 | 安全 | `frontend/src/lib/authStore.js:55` | JWT token 存储在 localStorage，XSS 可窃取 | 迁移至 HttpOnly + Secure + SameSite Cookie | 安全官 |
| 5 | 安全 | `backend/src/app.js`（全局） | 无 CSRF 防护机制 | 引入 csrf-csrf 中间件 | 安全官 |
| 6 | 安全 | `backend/.env:7` + `backend/src/config/auth.js:2` | 弱 JWT 密钥硬编码回退值 `flavor-archaeology-secret-key-2024` | 使用 `openssl rand -base64 64` 生成强随机密钥；移除硬编码回退 | 安全官 |
| 7 | 安全 | `backend/src/app.js:69` | 开发模式泄露错误堆栈给客户端 | 堆栈仅写入日志，不返回客户端 | 安全官 |
| 8 | 安全 | 多个 Controller | 错误消息泄露内部信息（`error.message` 直接返回） | 生产环境统一返回通用错误消息 | 安全官 |
| 9 | 代码 | `backend/src/models/Dish.js:66-87` | `findSimilar()` 全表加载 + 内存计算相似度，数据量增长后成瓶颈 | 短期可接受；中期预计算相似度矩阵 | 评审员 |
| 10 | 代码 | `backend/src/services/CollectionService.js:51-89` | `recordDailyRevival()` 竞态条件，可超发每日抽卡次数 | 使用 Knex 事务或 SQLite 原子 UPDATE | 评审员 |
| 11 | 代码 | `service/api_wrapper.py:193,449` + `llm_reasoner.py:56` + `restoration_engine.py:422` | 多处 Python 异常被 `except Exception: pass` 静默吞没，无日志记录 | 每个 except 块添加 `logger.warning()` | 评审员 |
| 12 | 代码 | `frontend/src/pages/Result.jsx:531-560` | fetch 请求未在组件卸载时取消（无 AbortController） | 添加 AbortController，在 cleanup 中 abort | 评审员 |
| 13 | 代码 | `frontend/src/pages/Result.jsx` | 组件 863 行过度臃肿，包含可复用组件和与后端重复的逻辑 | 拆分子组件到 `components/evidence/`；共享逻辑移到 `lib/` | 评审员 |
| 14 | 代码 | `backend/src/services/LightModeService.js:52-67` | `fakeDishBank` 硬编码数组是死代码，实际使用 `expandedFakeDishBank` | 删除死代码 | 评审员 |
| 15 | 代码 | `LightModeService.js` + `CollectionService.js` | `buildCollection` 函数在两个文件中重复 | 统一到 CollectionService 导出 | 评审员 |
| 16 | 代码 | `backend/src/controllers/evolutionController.js:17-21` | 未传 userId 到 EvolutionService，无法追踪用户使用记录 | 添加 `userId: req.user?.id` | 评审员 |
| 17 | 代码 | `backend/src/services/StarMapService.js:6-18` | `loadDishBackgrounds()` 每次请求同步读文件 | 模块加载时缓存结果 | 评审员 |
| 18 | 代码 | `backend/src/routes/api.js:19-36` | `executePythonAction` 回调可能被多次调用 | 使用 PythonBridge.call() 统一管理 | 评审员 |
| 19 | 代码 | `backend/src/routes/auth.js` + `app.js` | auth 路由注册了两个独立的 rateLimit 实例，不共享状态 | 确认是否需要双层限流，添加注释或移除冗余 | 评审员 |
| 20 | 代码 | `backend/src/routes/api.js:501-637` | `generate-image` GET/POST 处理器完整复制（~65行） | 抽取共享逻辑为 `handleGenerateImage()` | 评审员 |

### 🟡 P2 — 可后续优化（29 项）

<details>
<summary>点击展开完整 P2 清单</summary>

**安全类（11项）**：

| # | 位置 | 问题 | 来源 |
|---|------|------|------|
| 21 | `backend/src/app.js` 全局 | 缺少 CSP、HSTS、X-Content-Type-Options 等安全头 | 安全官 |
| 22 | `backend/src/config/runtime.js:6` | CORS 开发环境允许所有来源 `*` | 安全官 |
| 23 | 多个端点 | Fragment、StarMap、Light Mode 缺少输入验证 | 安全官 |
| 24 | `backend/src/middleware/auth.js` | 仅认证无授权，缺少 RBAC 角色控制 | 安全官 |
| 25 | `backend/.env:8` | JWT 过期 7 天且无 Refresh Token | 安全官 |
| 26 | `backend/src/middleware/rateLimit.js:5` | 限流可通过环境变量禁用 | 安全官 |
| 27 | `backend/src/app.js:51-53` | `/health` 端点泄露内部就绪状态 | 安全官 |
| 28 | `backend/src/models/User.js:54-59` | `User.update()` 接受任意字段，批量赋值风险 | 安全官 |
| 29 | `backend/src/services/PythonBridge.js:73-74` | Python stderr 日志未脱敏 | 安全官 |
| 30 | `frontend/.env:1` | 硬编码后端地址 `localhost:3001` | 安全官 |
| 31 | `backend/src/controllers/authController.js:11` | 密码哈希 Dummy 值硬编码（低风险，正面实践） | 安全官 |

**代码类（18项）**：

| # | 位置 | 问题 | 来源 |
|---|------|------|------|
| 32 | 多个 Service | `getUserHistory`/`getHistory` 返回空数组（stub） | 评审员 |
| 33 | `frontend/src/pages/evolutionDishes.js` | 可能是死文件，未在路由中引用 | 评审员 |
| 34 | `backend/src/services/VisionService.js:46-52` | `normalize`/`unique` 工具函数未被类直接使用 | 评审员 |
| 35 | `service/api_wrapper.py:163-327` | `teach()` fallback 逻辑过长（~120行 if/elif） | 评审员 |
| 36 | `service/llm_reasoner.py:129-131` | JSON 解析的 markdown 代码块剥离过于简单 | 评审员 |
| 37 | `service/knowledge_graph.py:37-50` | JSON 文件加载无错误隔离 | 评审员 |
| 38 | 跨文件 Node ↔ Python | 命名风格不一致（camelCase vs snake_case） | 评审员 |
| 39 | `LightModeService.js` + `EvolutionService.js` | `buildCertificateId` 函数重复 | 评审员 |
| 40 | `backend/src/routes/api.js:507,576` | AgnesImageService 每次请求 new 一个实例 | 评审员 |
| 41 | `backend/src/models/User.js:65-72` | `findAll()` 缺少总数返回，分页不完整 | 评审员 |
| 42 | `backend/src/models/Dish.js:46-49` | `findAll()` 同样缺少总数返回 | 评审员 |
| 43 | `backend/src/app.js:64-71` | production 模式仍暴露 `err.message` | 评审员 |
| 44 | `backend/src/services/vision/OpenAIVisionProvider.js:100` | 过长链式 optional chaining | 评审员 |
| 45 | `frontend/src/offline/` | 离线模式有独立状态管理，与主 App 完全独立 | 评审员 |
| 46 | `backend/src/config/ai.js` | 未被主要路由引用，可能为死配置 | 评审员 |
| 47 | `service/` 目录 | 测试文件与源码在同一目录 | 评审员 |
| 48 | `frontend/src/pages/Result.jsx:327,525,585` | `requestAttempt` 依赖可能导致非预期重复请求 | 评审员 |
| 49 | `frontend/src/lib/judgeMode.js` | 评委模式无鉴权保护，URL 参数即可进入 | 评审员 |

</details>

---

## 3. QA 测试覆盖摘要

详见 `deliverables/qa-test-cases.md`（117+ 用例完整清单）。

### 核心测试矩阵

| 模块 | 用例数 | P0 用例 | 关键场景 |
|------|--------|---------|---------|
| 用户认证 | 34 | 10 | 注册/登录流程、JWT 验证、注入防护 |
| 古籍分析 | 17 | 4 | SSE 流式推理 4 步→结果事件、弱线索拒绝 |
| 菜品复原 | 7 | 3 | 复原全流程、降级模式 |
| 轻量模式 | 16 | 5 | 拍照认祖、每日复活、真假非遗答题 |
| 前端路由 | 10 | 4 | 8 页面路由完整性、ErrorBoundary |
| 非功能测试 | 33 | 8 | 性能、安全、兼容性、无障碍 |

### 现有测试覆盖

- **后端**：20+ 测试文件，覆盖认证、限流、SSE、图片生成等
- **前端**：❌ 无独立测试，建议补充 Input/Result/Evolution/LightMode/AuthPanel 组件测试
- **Python**：3 个测试文件（test_api_wrapper、test_evolution_naming、test_restoration_engine）

### 推荐发布门禁（冒烟测试，5 分钟）

1. 后端 `npm test` 全部通过
2. 前端 `npm run build` 成功
3. Python `python -m pytest service/` 通过
4. `docker compose config` 校验通过
5. 健康检查 `GET /health` 返回 200
6. 认证流程：注册 → 登录 → 获取用户信息
7. 分析流程：POST /api/analyze-stream 返回 SSE 事件
8. 降级模式：无 API Key 时返回 SVG placeholder

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | **轮换 AGNES_API_KEY**：在 Agnes 平台撤销旧密钥生成新密钥；`git log --all -p -- backend/.env` 检查是否曾提交到 git 历史 | 安全负责人 | P0 | 立即 |
| 2 | **修复 SQL LIKE 通配符注入**：在 `Dish.search()` 入口转义 keyword 中的 `%`、`_`、`[` | 后端开发 | P0 | 立即 |
| 3 | **消除跨层代码重复**：证据评分逻辑抽到 `services/evidenceUtils.js`；融合菜名放入 JSON 文件；Python 权重常量加同步注释 | 后端开发 | P0 | 上线前 |
| 4 | **修复 CollectionService 竞态条件**：`recordDailyRevival()` 使用 Knex 事务包裹读取+更新 | 后端开发 | P1 | 上线前 |
| 5 | **Python 异常添加日志**：所有 `except Exception: pass` 块添加 `logger.warning()` | 后端开发 | P1 | 上线前 |
| 6 | **生成强随机 JWT_SECRET**：`openssl rand -base64 64`；移除 `config/auth.js` 中硬编码回退值 | 运维/后端 | P1 | 上线前 |
| 7 | **移除堆栈跟踪暴露**：`app.js:69` 改为仅写入日志；生产环境统一通用错误消息 | 后端开发 | P1 | 上线前 |
| 8 | **执行冒烟测试**：按上述 8 项门禁清单逐一验证 | QA | P0 | 发布前 |

---

## ⚠️ 待完善 / 已知局限

- **无法验证的部分**：
  - git 历史中是否曾提交过 `.env` 文件（需运行 `git log` 确认）
  - AGNES_API_KEY 是否仍在有效期内、是否已被使用（需登录 Agnes 平台确认）
  - 生产环境的实际 NODE_ENV 配置（假设为 `production`）
  - SQLite 数据库的实际数据量和性能表现（假设当前数据量较小）
  - Python LLM 服务（豆包 API）的实际可用性和响应时间

- **明确假设**：
  - 假设 `.env` 文件未被提交到 git 历史（`.gitignore` 已配置，但需验证）
  - 假设 Docker Compose 部署时 `JWT_SECRET` 通过环境变量注入（`docker-compose.yml` 已强制检查）
  - 假设前端通过 Nginx 代理访问后端（`/api` 路径），无跨域问题
  - 假设评委模式仅在演示场景使用，不暴露给公网用户

---

## 📚 成员产出索引

- gstack-product-reviewer（产品评审员）原始产出：32 项代码问题（2 P0 / 12 P1 / 18 P2），完整审查了 backend/src/、frontend/src/、service/ 核心源码
- gstack-security-officer（安全官）原始产出：18 项安全发现（2 P0 / 5 P1 / 11 P2），含 STRIDE 威胁建模 + OWASP Top 10 检查
- gstack-qa-lead（质量门神）原始产出：117+ 测试用例完整清单，详见 `deliverables/qa-test-cases.md`
- gstack-designer（设计师）：未参与
- gstack-investigator（排障手）：未参与

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
