# 风味考古局 — 上线前全检报告（2026-09-25）

**日期**：2026-09-25
**场景**：上线前检查（代码审查 + 安全审计 + QA 测试）
**参与成员**：产品评审员（代码审查） + 安全官（OWASP Top 10 + STRIDE 审计） + 质量门神（QA 测试与发布门禁）
**仓库**：`D:/systemDir/Desktop/风味考古局`｜分支 `feat/trae-offline-museum`｜HEAD `11e3654`
**审查对象**：`git status` 中全部已修改(M)与新增未跟踪(??)文件，即「即将上线」的代码

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🔴 **不通过（No-Go）** — 两条发布链路**同时**被阻塞。
- **阻塞项数量**：**6 项 P0**（3 项部署/架构 + 1 项密钥入库 + 2 项发布链路）。
- **本轮新引入的回归 2 个**：`backend/Dockerfile` 源码路径双写（容器必崩）、离线包丢失 40 张内嵌菜品图。
- **上一轮（2026-09-14）3 个 P0：0 项真正修复**；17 个 P1 中已修复 3 / 部分修复 4 / 未修复 10。
- **测试用例是绿的，但发布门禁是红的**：后端 168/168、前端 150/150、离线 61/61 全过，但 `npm test` 退出码 1（覆盖率不达标）、`npm run lint` 3 error、`verify:offline:bundle` FAIL。
- **下一步**：按第 4 节行动清单修复 P0 + 关键 P1，并在**真实部署环境**重跑 10 项冒烟清单后方可转 Go。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 **No-Go**（自托管部署链路 🔴 / 离线提交链路 🔴） |
| 严重度分布 | 🔴 **6** / 🟠 **14** / 🟡 **20+** / 🟢 若干 |
| 关键行动项 | 9 条（P0 6 条 + P1 3 条优先项） |
| 本轮新引入回归 | 2 项（Dockerfile 路径双写、离线包图片内嵌丢失） |
| 依赖漏洞 | ✅ 前后端 `npm audit` 均 **0 漏洞**（含新增依赖复测） |
| 密钥泄露范围 | 提交物 ✅ 干净；仓库工作区 🔴 有泄露（`backend/.env` 已入库） |
| 建议负责人 | 后端开发（Dockerfile/密钥）+ 安全负责人（轮换与历史清洗）+ 前端/构建负责人（离线包） |

---

## 0. 两条发布链路必须先分清（本报告的全部分级依据）

| 链路 | 产物 | 风险面 | 结论 |
|------|------|--------|------|
| **A. 离线体验包提交** | `release/风味考古局-TRAE初赛.zip` → 单文件 `风味考古局-离线体验.html` + `使用说明.txt` | 纯前端产物，**不含** `backend/`、`service/`、`data/` | 🔴 **当前代码无法产出合规提交包**（见 P0-04 / P0-05） |
| **B. 自托管 / docker compose** | `docker-compose.yml` → backend + frontend 两容器 | 全栈，含密钥、鉴权、AI 计费端点 | 🔴 **容器必然启动失败**（见 P0-01 / P0-02） |

> 说明：`release/` 内的现存 zip **内容干净**（仅 2 个文件、无密钥、无 `.env`、无 `docs/`），但它是 **2026-07-15 的陈旧构建**，不含此后所有改动。**`release/` 干净 ≠ 工作区干净。**

---

## 1. 各成员核心结论

### 🔍 产品评审员（代码审查）
- **核心判断**：本轮变更方向正确（部署加固 + 前端兜底），但 `backend/Dockerfile` 的加固改法**把原本可用的 `COPY backend/ .` 换成了路径错误的显式复制**，属本轮新引入的部署级回归；上一轮 3 个 P0（LIKE 注入、跨层重复实现、密钥）**无一被真正修复**。
- **关键建议**：CR-01a 修法为 `COPY backend/src /app/backend/src`（或 `./src`），并同步修正 `containerStartup.test.js:11-21` 中**把错误形态断言为契约**的假绿测试；抽出 `evidenceUtils.js` 消除证据评分三处重复。
- **取证亮点**：用 `git diff backend/Dockerfile` 证明旧版可用、新版回归；用 `path.join` 推演确认 `/app/backend/backend/src` 落点。

### 🛡️ 安全官（OWASP Top 10 + STRIDE 审计）
- **核心判断**：认证加固确有进展（helmet 接入、生产缺失 `JWT_SECRET`/`CORS_ORIGIN` 即抛错、控制器统一错误文案、bcrypt 时序均衡、Node→Python 全走 `spawn` + 数组 argv **无命令注入**、前端无 `dangerouslySetInnerHTML`/`eval`、无用户可控出站 URL **SSRF 通过**）；但出现**密钥管理回归**：`backend/.env` 被 git 跟踪，`JWT_SECRET` 已入库，**已实证可用泄露密钥签发令牌通过 `jwt.verify(HS256)`**（`alg=none` 已被库拒绝）。
- **关键建议**：`git rm --cached backend/.env` → 清洗 `b48a6df` 引入的 blob → **轮换 `JWT_SECRET` 及该文件内全部第三方 Key**（密钥入库即视为已泄漏，清洗历史不能替代轮换）；4 个付费 AI 端点补鉴权与配额。
- **评级口径**：🟡 有条件 Go → 🔴 No-Go。OWASP 2021：✅通过 1 项（A10）、⚠️部分 7 项、❌不通过 2 项（**A02 加密失败**、A01 访问控制）。

### ✅ 质量门神（QA 测试与发布）
- **核心判断**：**测试用例全绿但门禁全红**——上一轮"全绿 318/318"的说法不成立，因为它只统计了用例数，漏掉了退出码：`npm test` 退出 1（覆盖率 stmts 67.99 < 70 / branch 56.03 < 60 / lines 69.03 < 70）、`npm run lint` 退出 1、`verify:offline:bundle` FAIL。业务功能本身健康：认证、越权、token 篡改、SSE 流式、限流 429、超大 body 413、无 Key 时生图降级为 SVG 占位（200 degraded），**边界与异常处理表现符合预期**。
- **关键建议**：以 10 项冒烟清单作为发布门禁；修正被误断言的启动测试；大输入 `spawn ENAMETOOLONG`（50KB → 500）需改为 stdin 传参。
- **环境局限**：Docker daemon 未运行，容器构建/启动为**高置信静态判定**，未实证。

---

## 2. 综合审查发现（去重合并后按严重度排序）

### 🔴 P0 — 阻塞上线（6 项）

| # | 严重度 | 类别 | 精确位置 | 问题描述 | 修复建议 | 来源 |
|---|--------|------|---------|---------|---------|------|
| **P0-01** | 🔴 | 部署/架构 | `backend/Dockerfile:7,16,33`；`backend/package.json` | **源码路径双写 → 容器必然启动失败（本轮新引入回归）**。`WORKDIR /app/backend` 下 `COPY backend/src ./backend/src` 落点为 `/app/backend/backend/src`，而 `CMD` 第一步 `npm run db:migrate` 需 `src/scripts/migrate-db.js`、`npm start` 需 `src/app.js` → 均不存在，`&&` 链第一步即退出。`git diff` 证实**旧版 `COPY backend/ .` 落点正确、原本可用** | 改 `COPY backend/src /app/backend/src`（或 `./src`）；同步修正 `containerStartup.test.js:16` 的断言（增加 `not.toMatch(/COPY backend\/src \.\/backend\/src/)`）；部署环境补真实 `docker compose build && up` 验证 | 评审员 + QA（lead 用 `git diff` 复核） |
| **P0-02** | 🔴 | 部署/架构 | `backend/Dockerfile`（全文缺 `COPY service` / `COPY data`）；`services/PythonBridge.js:19`；`routes/api.js:11`；`LightModeService.js:3-5`；`docker-compose.yml:25` | 镜像内**缺 `/app/service`**（Node 经 `path.join(__dirname,'../../../service/api_wrapper.py')` 指向 `/app/service/api_wrapper.py`）→ Python 全链路（analyze/restore/teach/star-map/evolution/生图）失效；**缺根 `/app/data`**（`LightModeService` 等用 `require()` 硬加载仓库根 `data/*.json`）→ 启动阶段抛 `MODULE_NOT_FOUND`，早于 `app.listen`。注意 `data/`（上溯 3 级到仓库根）与 SQLite 所在的 `backend/data/`（已挂卷）**是两个目录** | 补 `COPY service /app/service`、`COPY data /app/data`（根 `data/` 不含 `.db`，与卷不冲突） | 评审员 + 安全官交叉确认 |
| **P0-03** | 🔴 | 安全 A02/A07/A08 | `backend/.env`（被 git 跟踪）；提交 `b48a6df` | **服务端签名密钥入库**。`git ls-files` 命中 `backend/.env`（与 `.gitignore` 规则冲突，说明曾被 `git add -f`），`git show HEAD:backend/.env` 可读，含 `JWT_SECRET`(len 32)、`AI_API_KEY`(len 12)、`AGNES_API_KEY`(空值) 等 11 项。安全官已实证用该密钥签发 `{userId:1}` 令牌可通过 `jwt.verify(HS256)` → **可伪造任意用户登录态**。**该提交目前仅在本地分支，`origin/main` 尚干净 → 修复窗口仍在** | ① `git rm --cached backend/.env` → 提交；② `git filter-repo`/BFG 清洗 `b48a6df` 引入的 blob → 强制推送（先协调协作者）；③ **轮换 `JWT_SECRET` 与文件内所有第三方 Key**；④ CI 接入 secret 扫描。注：`docker-compose.yml:11` 的 `${JWT_SECRET:?}` fail-fast 设计**正确**，修复勿改 compose | 安全官 + QA（lead 复核 `git ls-files` / `git log --all -- backend/.env`） |
| **P0-04** | 🔴 | 发布链路 | `scripts/package_trae_submission.ps1:30-36`；`scripts/verify_offline_bundle.mjs:4-11` | **官方打包脚本当前跑不通**。脚本开头 `$ErrorActionPreference='Stop'`，Step 2 执行 `verify_offline_bundle.mjs $BuiltHtml --enforce`，紧跟 `if ($LASTEXITCODE -ne 0) { throw }`；而 `REQUIRED_LABELS` 仍含已改名的旧文案 `探索馆藏`、`商业合作`（实测 `Status: FAIL`，缺这 2 个标签）→ **Step 2 抛错中断，无法产出新提交包** | 二选一：①同步校验器标签（UI 已改名 `风味馆藏库`/`合作展厅`，说明是校验器过期，推荐）；②恢复 UI 文案（需确认改名为产品决策）。同步更新 `verify_offline_ui.mjs` | lead 实测 + QA P1-3 |
| **P0-05** | 🔴 | 发布物正确性 | `frontend/src/offline/data/generatedDishImages.js`（1,078,221 B，40 张 webp data URI，**无任何引用者**）；`offlineMuseumData.js:124` | **当前构建的离线包丢失全部内嵌菜品图（本轮/近期回归）**。实测对比：当前构建 `dist-offline/offline.html` 980,389 B → `base64` **0** 处、`data:image/` **1** 处（仅一个 SVG）；线上提交包 2,058,152 B → `base64` **40** 处、`data:image/` **41** 处。`grep` 证实 `generatedDishImages` 除自身声明外**无任何引用者**（无静态/动态 import、无 `import.meta.glob`、无 `?url`/`?inline`）→ 被打包器 tree-shake。且图片解析恒为**根绝对路径** `offlineMuseumData.js:124` → `` `/dish-backgrounds/${dish.id}.png` ``，而 zip 内只有 2 个文件、以 `file://` 打开时该路径解析到文件系统根 → **菜品图必然破图**。`verify_offline_bundle.mjs` 只校验标签与 `script/link/img` 标签，**不会发现此问题**（假绿） | 重新接线图片内嵌（让离线入口 import `generatedDishImages`，或以 `?inline` 引入 40 张 webp），并把「内嵌图片数 > 0」写入 `verify_offline_bundle.mjs` 门禁；确认后重跑打包脚本 | **lead 独立调查（评审员 CR-13 已提示"webp 管线未接线"，本项给出后果实证）** |
| **P0-06** | 🔴 | 安全 A01/A04 | `routes/index.js:25`；`routes/api.js:399,405,413,477` | **4 个付费 AI 端点零鉴权**。`router.use('/', apiRoutes)` 把 `api.js` 挂在 `/api` 根，其中 `/analyze-stream`(GET/POST)、`/generate-image`(GET/POST) 均**未挂 `authenticate`**，仅靠 120 req/min/IP 全局限流 → 未登录脚本可刷爆豆包 LLM 与 Agnes 生图账单；SSE 无超时，可长期占用子进程 | 挂 `authenticate` + 每用户配额 + SSE 超时 + 结果缓存 | 安全官 P1-01（lead 复核路由注册与中间件） |

### 🟠 P1 — 上线前必须修复（14 项，节选高优先）

| # | 类别 | 位置 | 问题描述 | 修复建议 | 来源 |
|---|------|------|---------|---------|------|
| P1-01 | 密钥卫生 | `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md` | 真实 Agnes key 明文残留 **2 处**（`grep -rc "sk-7Tkr"` 命中）。**复核更正：该文件未被 git 跟踪（`git status` = `??`）、`git grep` 全历史零命中 → 未进入任何提交历史**，属「工作区残留 + 误提交前兆」而非已泄漏 | 轮换该 Key；`.gitignore` 覆盖 `docs/**` 计划文档；CI/pre-commit 接入 gitleaks 拦截 `sk-[A-Za-z0-9]{16,}` | 安全官 P0-01（lead 定性下修） |
| P1-02 | 测试门禁 | `backend/jest.config.cjs` | `npm test` 退出码 1：覆盖率 stmts 67.99 / branch 56.03 / lines 69.03，未达 70/60/70；6 个控制器、5 个路由、`Dish.js`、`errorHandler` 等 0% 覆盖 | 补核心链路测试，或拆分 `test` 与 `test:coverage` 使 CI 语义清晰 | QA P1-1 |
| P1-03 | 代码质量 | `frontend/src/pages/Evolution.jsx:167,188`、`LightMode.jsx:636` | `npm run lint` 退出 1：3 个 `no-unused-vars`（`caughtError` 定义未使用） | 改 `catch {}` 可选绑定 | QA P1-2（lead 实测复现） |
| P1-04 | 健壮性 | `services/PythonBridge.js`（argv 传参）、`routes/api.js` | 大输入 `spawn ENAMETOOLONG`：**实测 30KB → 200，50KB → 500**（body 上限 10MB） | 改 stdin 传参或落临时文件；错误归一 | QA P1-4 |
| P1-05 | 安全/代码 | `models/Dish.js:37-41` → `recipeController.js:46`（公开路由 `/api/recipe/search`） | LIKE 通配符未转义，**实测 `keyword=%` 返回全表**（上一轮 P0 未修复） | 转义 `%`/`_` 并加 `ESCAPE` | 评审员 CR-02 + QA P1-5 + 安全官 |
| P1-06 | 并发正确性 | `services/CollectionService.js:51-113` | 每日抽卡「读-改-写」无事务保护，可超发（上一轮 P1 未修复） | Knex 事务或原子 UPSERT + 唯一索引 | 评审员 CR-05 |
| P1-07 | 可观测性 | `service/api_wrapper.py:192,448`、`llm_reasoner.py:56`、`restoration_engine.py:53,421` | `except Exception: pass` 静默吞异常，`grep logging` = 0（上一轮 P1 未修复） | 引入 `logging`，至少 `logger.warning` | 评审员 CR-06 |
| P1-08 | 敏感信息 | `routes/api.js:391,473,537`；`/health` | 仍回传 `error.message`；`/health` 暴露内部配置（上一轮 P1 部分修复） | 统一通用文案；`/health` 只回 `status` | 评审员 CR-07 + 安全官 |
| P1-09 | 供应链 | `backend/src/app.js.bak`、`fix_app.js`、`fix_evolution.js`、`fix_python.js`、`create_test.js`；`.dockerignore` | 调试残留会被 `COPY backend/src` 打进镜像（`app.js.bak:62` 已损坏；`fix_*.js` 会改写源码）；`.dockerignore` 未排除 `*.bak`/`fix_*.js`/`artifacts/`/`deliverables/` | 删除残留文件 + `.dockerignore` 兜底 | 评审员 CR-14 + QA |
| P1-10 | 半成品改动 | `backend/package.json`、`package-lock.json`（16:00:41 写入） | 新增 `cookie-parser@^1.4.7`，但 `backend/src` **无任何** `cookieParser/res.cookie/req.cookies/httpOnly/sameSite` 引用，前端亦无 `credentials/document.cookie` → **依赖已加、代码未跟上**。两名成员均确认非其引入，**属来源不明的工作区并发变更** | 二选一：①完整落地 Cookie 认证（HttpOnly/Secure/SameSite + CORS `credentials` + 前端 `credentials:'include'` + CSRF 用例 + 认证冒烟）；②**回退该依赖**。切勿"依赖已加、代码没跟上"地上线。若落地 Cookie，则当前「CSRF 非现实问题」的结论立即失效，须一次性补齐 CSRF 防护 | 安全官 P2-09 + QA 交叉确认 |
| P1-11 | 性能/资源 | `services/StarMapService.js:7-18,33,89`；`models/Dish.js:66-87` | 星图背景每请求同步读文件；`findSimilar()` 全表加载 + 内存计算（上一轮 P1 未修复） | 模块级缓存；SQL 排序或预计算 | 评审员 CR-09/CR-10 |
| P1-12 | 前端健壮性 | `frontend/src/pages/Result.jsx:504-537` | 图片 `fetch` 未在卸载时取消，降级态触发重复 `generate-image`（上一轮 P1 只修了 SSE） | `AbortController` + 移出依赖数组 | 评审员 CR-11 |
| P1-13 | 资源/体积 | `frontend/src/lib/dishAssets.js:3-8`；`frontend/public`（约 228 MB PNG） | 约 230 MB PNG 进入上线路径，webp 管线未接线（与 **P0-05** 同源） | 接线 webp 或大幅减量；加入体积预算门禁 | 评审员 CR-13 |
| P1-14 | CI 门禁 | `.github/workflows/test.yml` | CI 必红：`npm test` 退出 1 / `docker compose build` 缺 `JWT_SECRET` / `curl localhost:3001`（端口未发布且容器起不来） | 修 P0-01 后注入 `JWT_SECRET`、改健康检查方式 | QA P1-1 |

### 🟡 P2 — 可延后（20+ 项，摘要）

- `backend/tests/routes` **死测试**：被 `jest roots` 排除（`No tests found`）；显式指定后 3 套件全失败因**缺 `supertest`**。
- `scripts/__tests__/verify_all_python_contract.test.mjs` **4/4 失败**，且无 runner 接入。
- `middleware/rateLimit.js` 内存 Map 无淘汰策略（长时间运行内存增长）。
- `routes/index.js` 的 `/api/recipe/:id` 语义不统一（整数 id vs `dish_xxx`，实测 `/api/recipe/dish_001` → 404）。
- 无 RBAC / 403 语义（越权与不存在资源未区分）。
- `LightModeService` 死代码 `fakeDishBank`；`buildCollection` 在 `LightModeService` 与 `CollectionService` 重复；`buildCertificateId` 重复。
- `evolutionController.js:20` 传了 `userId` 但 `EvolutionService.js:158` 解构丢弃（**假修复**）。
- 前端新增测试为**源码正则断言**（`layoutHeader.test.mjs` 等），不能替代行为测试；`Result.jsx` 仍 827 行。
- 基础镜像 `node:18-alpine` 已 EOL；CSP 含 `unsafe-inline`/`unsafe-eval`；限流与 `/health` 信息暴露。

---

## 3. 上一轮（2026-09-14）问题的修复状态核对

| 上一轮 P0 | 状态 | 证据 |
|-----------|------|------|
| P0#1 AGNES 密钥明文（`.env`） | 🟡 部分修复 | `.env` 内已清空，但原文抄入 `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md`（**未入 git 历史**，见 P1-01） |
| P0#2 `Dish.js` LIKE 通配符未转义 | ❌ **未修复** | `Dish.js:37-41` 原样；实测 `keyword=%` 返回全表（P1-05） |
| P0#3 证据评分/融合命名跨层重复 | ❌ **未修复** | `api.js:92-156` 与 `RestorationService.js:26-98` 逐字重复；融合命名表在 `EvolutionService.js:10-105` 与 `api_wrapper.py:21-120` 双维护；`evidenceUtils.js` 不存在 |

**上一轮 P1（17 项）**：✅ 已修复 **3**（堆栈泄露、`executePythonAction` 隐患、auth 双限流）/ 🟡 部分修复 **4**（弱 JWT 密钥上生产已 throw 但被 P0-03 抵消、错误泄露残留 `api.js`、fetch 取消只修 SSE、Result.jsx 863→827）/ ❌ **未修复 10**。

**新增于本轮**：P0-01（Dockerfile 路径双写回归）、P0-04（打包脚本卡死）、P0-05（离线包图片丢失）、P0-06（AI 端点无鉴权）、P1-10（`cookie-parser` 半成品）。

---

## ✅ 行动清单

### 第一批 — 阻塞项（P0，必须全部完成）

| # | 行动 | 负责方 | 紧急度 | 验收标准 |
|---|------|--------|--------|---------|
| 1 | 修 `backend/Dockerfile:16` 为 `COPY backend/src /app/backend/src`，补 `COPY service /app/service` 与 `COPY data /app/data`；同步修正 `containerStartup.test.js` 的错误断言 | 后端开发 | **P0** | `docker compose up` 后容器 healthcheck 通过，日志无 `MODULE_NOT_FOUND` |
| 2 | 移除 `backend/.env` 的 git 跟踪 + 清洗 `b48a6df` 历史 blob + **轮换 `JWT_SECRET` 及文件内全部 Key** | 安全负责人 | **P0（今日）** | `git ls-files \| grep backend/.env` 为空；旧密钥签发的令牌被拒 |
| 3 | 让离线包重新内嵌 40 张菜品图，并把「内嵌图片数 > 0」加入 `verify_offline_bundle.mjs` 门禁 | 前端/构建 | **P0** | 重新构建后 `grep -c base64` ≥ 40；离线 HTML 实际显示菜品图 |
| 4 | 同步 `REQUIRED_LABELS`（或恢复 UI 文案），让 `package_trae_submission.ps1` Step 2 通过 | 前端/构建 | **P0** | `package_trae_submission.ps1` 全程跑通并产出新 zip |
| 5 | 为 `/analyze-stream`（GET/POST）与 `/generate-image`（GET/POST）挂 `authenticate` + 配额 + SSE 超时 | 后端开发 | **P0** | 未带 token 请求返回 401；单用户配额生效 |

### 第二批 — 上线前必须（P1，优先 3 条）

| # | 行动 | 负责方 | 紧急度 |
|---|------|--------|--------|
| 6 | 修 `Dish.js:37-41` LIKE 转义（`\%_` + `ESCAPE`） | 后端开发 | P1 |
| 7 | 修 `frontend/src/pages/Evolution.jsx:167,188`、`LightMode.jsx:636` 使 `npm run lint` 退出 0 | 前端 | P1 |
| 8 | `PythonBridge` 改 stdin 传参，消除 50KB 输入 `spawn ENAMETOOLONG` → 500 | 后端开发 | P1 |
| 9 | 处置 `cookie-parser`（落地 Cookie 认证或回退依赖），并清理 `backend/src/{app.js.bak,fix_*.js}` 等调试残留 + 补 `.dockerignore` | 后端开发 | P1 |

---

## 🚦 发布门禁：Go / No-Go 决策

**结论：🔴 No-Go（两条链路均阻塞）**

**阻塞项清单（全部关闭方可转 Go）**
1. P0-01 容器路径双写 → `docker compose up` 起不来
2. P0-02 镜像缺 `service/` 与根 `data/` → 启动崩溃 + Python 全链路失效
3. P0-03 `JWT_SECRET` 入库 → 认证可被伪造
4. P0-04 打包脚本 Step 2 抛错 → 产不出提交包
5. P0-05 离线包 0 张内嵌图片 → 提交物破图，与「内容均已内置」承诺不符
6. P0-06 4 个付费 AI 端点无鉴权 → 账单可被刷爆

**冒烟测试清单（发布后 5 分钟内必须全绿）**
1. 容器启动日志无 `MODULE_NOT_FOUND`
2. `/health` 返回 200
3. 注册 201 → 重复注册 409 → 登录 200 → 错误密码 401
4. `/api/auth/me` 带 token 200 / 不带 401 / 篡改 token 401
5. `/api/analyze-stream` 返回含 `step` 与 `result` 的 SSE 事件
6. `/api/generate-image` 无 Key 时返回降级占位而非 500
7. 星图 / 演化 / 教学 接口 200
8. `/api/light/daily` + `authenticity` 200
9. 限流触发 429
10. 前端首页与离线 `offline.html` 可正常打开，**离线包图片正常显示**；`lint` 与 `verify:offline:bundle` 退出 0

**回滚判定条件（命中任一立即回滚）**
- 容器 5 分钟内重启 ≥ 3 次，或 healthcheck 连续 2 次失败
- 认证接口异常（登录/鉴权 5xx 或令牌校验异常）
- 出现 `MODULE_NOT_FOUND`、`ENAMETOOLONG` 或新增 5xx
- 前端白屏 / 离线包图片大面积破图

---

## ⚠️ 待完善 / 已知局限

1. **Docker 未实证**：本机 Docker daemon 未运行（`failed to connect to npipe`），P0-01/P0-02 为**高置信静态判定**（WORKDIR 语义 + `path.join` 推演 + `git diff` 佐证），**未执行真实 `docker compose build` / `up`**。部署环境务必复测。
2. **QA 用例全绿但门禁全红**：上一轮报告只统计用例数，是本次最重要的方法论修正——**发布门禁看退出码，不看用例数**。
3. **工作树仍在变动**：审查期间检测到来源不明的并发变更（`backend/package.json` 于 16:00:41 新增 `cookie-parser`，两名成员均否认）。**建议改动收敛后重跑一次 QA 命令总表**，结论以稳定快照为准。
4. **P0-05 根因未完全定位**：已确证"当前离线构建 0 张内嵌图片、线上包 40 张"，但**线上包当时经由哪条代码路径内嵌图片尚未查明**（`git log -S generatedDishImages` 全历史零命中，提示可能是未提交的工作树状态）。修复前需先确认原始内嵌机制，避免修错方向。
5. **P0-06 定级说明**：安全官原评为 🟠P1，本报告因「对外部署即构成真实计费滥用」维持为 🔴P0；若该系统仅内网/演示使用可下调为 P1。
6. **离线包"外部 PNG 引用"**：两版 HTML 均含 41 处 `/dish-backgrounds/*.png` 引用（根绝对路径）。QA 未能就该路径在 `file://` 下的运行时行为给出实证判决，本报告按静态证据判定为「必然破图」，**建议以浏览器实跑截图最终确认**。

---

## 📚 成员产出索引

| 成员 | 原始产出 |
|------|---------|
| 🔍 产品评审员（代码审查） | `deliverables/gstack/raw/raw-code-review-2026-09-25.md`（39.5 KB，28 条编号问题，含 CR-01a/b/c 与修复片段） |
| 🛡️ 安全官（OWASP + STRIDE） | `deliverables/gstack/raw/raw-security-audit-2026-09-25.md`（52.9 KB，含 OWASP Top 10 检查表、STRIDE 建模、P0/P1/P2 明细与修复路线图） |
| ✅ 质量门神（QA 与发布） | `deliverables/gstack/raw/raw-qa-2026-09-25.md`（30.1 KB，含全部命令真实输出、测试执行总表、冒烟清单与回滚条件） |
| 上一轮基线 | `deliverables/gstack/pre-launch-check-2026-09-14.md` |

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
