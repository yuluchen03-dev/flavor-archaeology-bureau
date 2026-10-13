# 风味考古局 — 上线前代码审查原始产出（产品评审员）

**日期**：2026-09-25
**审查范围**：「即将上线」= `git status` 中所有已修改(M) + 新增未跟踪(??)文件，结合全量源码判断影响面
**审查维度**：代码质量 / 潜在 bug / 性能瓶颈 / 架构合理性
**审查方法**：`git status --short` + `git diff --stat` 锁定变更面 → 逐文件读取实际代码行 → 交叉核对上一轮 P0/P1 清单
**结论可信度**：高（所有结论均落到文件:行号；不确定项显式标注「待确认」）

---

## 0. TL;DR（执行摘要）

- **整体判断**：🔴 **不建议直接 Go**。本轮变更以「部署加固 + 前端健壮性兜底」为主，方向正确，但 **上一轮 3 个 P0 无一被真正修复**，且本轮 Dockerfile 改造引入了 **1 个新的部署级回归**（镜像缺少 `service/` 与仓库根 `data/`）。
- **本轮新增/新发现阻塞项**：1 组 3 条（CR-01a/b/c，均为 Dockerfile 构建/启动缺陷；**若走 docker compose 部署则 🔴P0 阻塞，若仅提交离线单文件 HTML 则 🟠P1** —— 离线 HTML 为正式发布物，Docker 为次要路径）
- **历史 P0 复核**：3 项 → **0 已修复**（1 项仍完全未修、1 项仍完全未修、1 项仍完全未修）
- **历史 P1 复核**：17 项 → 修复 3 项、部分修复 4 项、未修复 10 项
- **变更本身的质量**：前端兜底/错误可见性做得不错（SSE 有界化、失败态可恢复）；但**后端重复逻辑与竞态这两个老根因被完整保留**，属于「擦了玻璃没修漏水的管子」。
- **一句话建议**：先修 CR-02/CR-03（老 P0）+ CR-01（如走 Docker），再谈上线；CR-05/CR-06/CR-11 属上线前必修。

---

## 1. 变更范围确认（基于 git）

`git diff --stat`：22 个已跟踪文件改动（+384 / -157）。新增未跟踪文件集中在：
- 后端：`validation/authInput.js`、`services/fetchWithTimeout.js`、`scripts/migrate-db.js`、`scripts/seed-if-empty.js`、多个 `__tests__`
- 前端：`components/Eyebrow.jsx`、`lib/sseStream.js`、`lib/dishAssets.js`、`pages/__tests__/criticalFailureStates.test.mjs`、`public-runtime/`
- 残留：`create_test.js`、`backend/src/{app.js.bak,fix_app.js,fix_evolution.js,fix_python.js}`

**变更性质小结**：部署配置加固（Docker/compose/nginx/env）、认证输入校验与时序均衡、统一错误中间件、SSE 有界流客户端、页面兜底态、Eyebrow 组件统一、测试补齐。**核心业务逻辑（证据评分/融合命名/每日抽卡）未纳入本轮修复**。

---

## 2. 问题清单

> 图例：🔴 P0 阻塞 / 🟠 P1 上线前必修 / 🟡 P2 可延后 / 🟢 P3 建议

### 🔴 P0

#### CR-01 Docker 后端镜像构建/启动缺陷（本轮回归）
> **定级（分支表述）**：**若走 `docker compose` 部署 → 🔴 P0 阻塞**；**若仅提交离线单文件 HTML（正式发布物）→ 🟠 P1**（但 `docker-compose.yml` 仍在仓库内且被文档化，仍须修）。
> **验证方式**：**静态推演确定**（`WORKDIR` 语义 + `path.join` 路径推演 + `git diff` 佐证）。**Docker daemon 未运行（`failed to connect to npipe`），未做实时 `docker compose build`/`up` 验证。**
> **发布路径核实**：正式发布物为离线单文件 HTML —— `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`（约 2.0MB）+ `使用说明.txt`（"双击即可打开，无需联网"），由 `scripts/package_trae_submission.ps1` 经 `npm run build:offline` 产出；docker compose 为次要/自托管路径，非比赛提交物。
>
> 本问题由**三条独立缺陷**构成，按触发先后排列：CR-01a（最先触发，阻断一切）→ CR-01b → CR-01c。

##### CR-01a 🔴 源码路径双写：`COPY` 目标相对 `WORKDIR`，源码落到 `/app/backend/backend/src`，`node src/app.js` 不存在 → 容器在 CMD 第一步即失败
- **类别**：部署 / 构建（本轮变更引入的**回归**）
- **精确位置**：
  - `backend/Dockerfile:7`：`WORKDIR /app/backend`
  - `backend/Dockerfile:16`：`COPY backend/src ./backend/src` —— **dest 为相对路径，以 `WORKDIR` 为基准**
  - `backend/Dockerfile:33`：`CMD ["sh","-c","npm run db:migrate && npm run db:seed-if-empty && npm start"]`
  - `backend/package.json`：`db:migrate = node src/scripts/migrate-db.js`、`start = node src/app.js`
- **问题描述**：Docker 的 `COPY` 相对目标以 `WORKDIR` 为基准。`WORKDIR=/app/backend` + dest `./backend/src` ⇒ 实际落点 `/app/backend/backend/src`（`backend` 被写了两遍）。而 `CMD` 执行 `npm run db:migrate`（= `node src/scripts/migrate-db.js`）时，Node 从 `WORKDIR` 解析为 `/app/backend/src/scripts/migrate-db.js` —— **该路径不存在**（真实文件在 `/app/backend/backend/src/...`）。`&&` 链在**第一步**即非零退出，容器直接退出；`npm start` 期望的 `/app/backend/src/app.js` 同样不存在。
- **回归证据**：`git diff backend/Dockerfile` 显示旧版为 `COPY backend/ .`（dest `.` → `WORKDIR` = `/app/backend`，即把 `backend/` 内容铺进 `/app/backend`，落点 `/app/backend/src/app.js` **正确**）。本轮为「避免把本地密钥与运行时数据带进镜像」改为显式 `COPY backend/src ./backend/src` 时，未同步调整相对层级，引入双写。**这是本次变更新引入的缺陷，且比 CR-01b/c 更早、更根本。**
- **影响**：任何走 `docker compose up` 的部署 100% 起不来（容器在迁移命令处即退），且 `frontend` 的 `depends_on: service_healthy` 连带失败。
- **修复建议（Dockerfile 片段）**：
  ```dockerfile
  WORKDIR /app/backend

  COPY backend/package*.json ./
  RUN npm ci --only=production

  # 源码：dest 相对 WORKDIR，必须落到 /app/backend/src
  #   ✅ 正确（相对写法）  COPY backend/src ./src
  #   ✅ 正确（绝对写法）  COPY backend/src /app/backend/src
  #   ❌ 错误（会被双写）  COPY backend/src ./backend/src
  COPY backend/src /app/backend/src
  ```

##### CR-01b 🟠 缺 `COPY service`：PythonBridge / api.js 期望 `/app/service/api_wrapper.py`，镜像内不存在 → Python 全链路失效
- **类别**：部署 / 架构
- **精确位置**：
  - `backend/src/services/PythonBridge.js:19`（`path.join(__dirname,'../../../service/api_wrapper.py')` → `/app/service/api_wrapper.py`；`:29` cwd `../../..` → `/app`）
  - `backend/src/routes/api.js:11`（`path.join(__dirname,'../../../../service/api_wrapper.py')` → 同一落点 `/app/service/api_wrapper.py`）
  - `backend/Dockerfile` 全文无 `COPY ... service ...`
- **问题描述**：`backend/Dockerfile` 从未复制 `service/`（Python 引擎目录），容器内不存在 `/app/service/api_wrapper.py`。即便 CR-01a 修好、容器能启动，`analyze-stream / restore / teach / star-map / evolution / generate-image(本地管线)` 全部因找不到脚本而失败。
- **影响**：Python 支撑的所有核心考据功能在 Docker 部署下不可用（降级/报错）。
- **修复建议（Dockerfile 片段）**：
  ```dockerfile
  # Python 引擎：PythonBridge 期望 /app/service/api_wrapper.py（进程 cwd=/app）
  COPY service /app/service
  ```

##### CR-01c 🟠 缺根 `data/`：服务层与 Python 按 `/app/data/...` 解析 JSON，镜像内不存在 → 要么启动崩溃、要么数据为空
- **类别**：部署 / 数据依赖
- **精确位置**：
  - `backend/src/services/LightModeService.js:3-5`（`require(path.join(__dirname,'../../../data/knowledge_graph/nodes_dish.json'))`、`data/light_mode/fake_dishes.json`、`data/light_mode/quiz_real_dishes.json`）
  - `backend/src/services/VisionService.js:3`、`backend/src/services/FragmentService.js:3`、`backend/src/services/vision/VisionCandidateMapper.js:3`（同为 `require(<root>/data/...json)`）
  - `backend/src/services/StarMapService.js:5`（`data/visual_assets/dish_backgrounds.json`，用 `fs.existsSync` 容错）
  - `service/knowledge_graph.py:16`（`data_dir = <repoRoot>/data`）
  - `backend/Dockerfile` 全文无 `COPY ... data ...`；`docker-compose.yml:25` 仅挂载 `/app/backend/data`（SQLite 库目录，**不含**根 `data/` 的 JSON 素材）
- **问题描述**：上述路径均上溯 3 级到**仓库根 `data/`**（`/app/data`），与本项目 SQLite 库所在的 `/app/backend/data`（2 级上溯，与卷挂载一致）**是两个不同目录**。镜像内既无 `COPY data`，卷也只覆盖 `/app/backend/data`，故 `/app/data` 缺失：
  - `LightModeService.js:3-5` 用 `require()`（非 `fs.existsSync`）→ 缺失即抛 `MODULE_NOT_FOUND`。该模块经 `routes/index.js:11 → light.js → lightModeController → LightModeService` 在 `app.js:7 require('./routes')` 阶段被加载 → **进程在 `app.listen` 前崩溃**，容器永不 healthy。
  - 其余用 `fs.existsSync` 的路径（如 `StarMapService`）则静默降级为空数据（背景图/知识图谱为空）。
- **影响**：Docker 部署下启动崩溃或功能数据缺失；离线 HTML 路径不受影响。
- **修复建议（Dockerfile 片段）**：
  ```dockerfile
  # 知识与素材数据：服务层按 __dirname/../../../data 解析，期望 /app/data
  # 注意：SQLite 库走卷 /app/backend/data，与此不冲突（根 data/ 不含 .db）
  COPY data /app/data
  ```

##### CR-01 合并修复片段（完整可用）
```dockerfile
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src /app/backend/src   # CR-01a：绝对路径，避免 WORKDIR 双写
COPY service /app/service           # CR-01b：Python 引擎
COPY data /app/data                 # CR-01c：知识图谱/素材 JSON（不含 SQLite 库）
```

##### CR-01 关联：`containerStartup.test.js` 需同步修正（避免把缺陷断言为正确）
- **位置**：`backend/src/scripts/__tests__/containerStartup.test.js:11-21`
- **现状**：该测试仅断言「Dockerfile **不**含 `COPY backend ./backend`」且「**含** `COPY backend/src ./backend/src`」，并断言排除 `.env`/`backend/data` —— 即它把 CR-01a 的错误写法（`./backend/src`）**当作正确行为断言**，且未覆盖 `service/`、`data/` 的复制。
- **要求**：修正断言，使其校验**落点**而非字面串，例如：
  ```js
  // 源码落点必须是 /app/backend/src（相对 ./src 或绝对 /app/backend/src 均可）
  expect(dockerfile).toMatch(/COPY\s+backend\/src\s+(\.\/src|\/app\/backend\/src)/);
  expect(dockerfile).not.toMatch(/COPY\s+backend\/src\s+\.\/backend\/src/); // 双写即失败
  expect(dockerfile).toMatch(/COPY\s+service\s+\/app\/service/);
  expect(dockerfile).toMatch(/COPY\s+data\s+\/app\/data/);
  ```
- **补充缓解（若不修 Docker）**：把 `LightModeService.js:3-5` 等 3 处 `require(<root>/data/*.json)` 改为 `fs.readFileSync + try/catch + 默认值`，可在数据缺失时降级而非崩溃。

#### CR-02 🔴 `Dish.search()` LIKE 通配符未转义（上一轮 P0 #2，未修复，且线上可达）
- **类别**：代码 / 安全（重叠）
- **精确位置**：`backend/src/models/Dish.js:37-41`；调用方 `backend/src/controllers/recipeController.js:46`；路由 `backend/src/routes/recipe.js:6`（`GET /api/recipe/search`，公开、无限流加固）
- **问题描述**：`where('name','like',\`%${keyword}%\`)` 直接把用户输入拼进 LIKE，`%`/`_` 未转义。例如 `keyword="_"` 会匹配任意单字符，`keyword="%"` 退化为全表匹配；数据量增长后构成**全表扫描 DoS**面。
- **影响**：搜索语义被绕过 + 性能退化；数据量小当前不致命，但属上线前必修。
- **修复建议**：
  ```js
  static async search(keyword) {
    const escaped = String(keyword ?? '').replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    return db('dishes')
      .where('name', 'like', pattern)
      .orWhere('description', 'like', pattern);
  }
  ```
  （SQLite 需确认 `ESCAPE '\'`；或改用 `.whereRaw("name LIKE ? ESCAPE '\\'", [pattern])`。）

#### CR-03 🔴 证据评分 / 融合菜名逻辑三处重复（上一轮 P0 #3，未修复）
- **类别**：代码 / 架构（DRY 违反，维护定时炸弹）
- **精确位置**：
  - **证据评分重复**：`backend/src/routes/api.js:92-156`（`clampEvidenceScore`/`calculateEvidenceScore`/`normalizeEvidenceBreakdown`/`buildEvidencePayload`/`buildInsufficientEvidencePayload`）**与** `backend/src/services/RestorationService.js:26-98`（`clampScore`/`calculateEvidenceScore`/`normalizeEvidenceBreakdown`/`buildEvidencePayload`/`buildInsufficientEvidenceBreakdown`）**逐字重复同一套权重公式**（0.3/0.3/0.2/0.2）。
  - **融合命名重复**：`backend/src/services/EvolutionService.js:10-105`（`CURATED_FUSION_NAMES` 44 条对、`DISH_NAME_ANCHORS`、`fallbackAnchor`、`isMechanicalFusionName`、`buildFusionDishName`）**与** `service/api_wrapper.py:21-120`（同名常量 `CURATED_FUSION_NAMES`、`DISH_NAME_ANCHORS`、`_fallback_anchor`、`_is_mechanical_fusion_name`、`build_fusion_name`）**双维护**。
  - 上一轮建议的 `services/evidenceUtils.js` **不存在**（`backend/src/services/` 无此文件）。
- **影响**：修改权重/命名规则必须同时改 Node 与 Python（及 Node 内两处），漏改即出现「同一输入、不同链路、不同结果」的不一致 bug；评委若走两条路径对比会发现结果错位。
- **修复建议**：Node 侧抽 `services/evidenceUtils.js` 统一导出，`api.js` 与 `RestorationService.js` 改为引入；融合命名与锚点表抽成单一数据源（`data/fusion_naming.json`）由 Node 与 Python 共同读取，Python 侧保留常量但加「与 JS 同源」注释与同步测试。

### 🟠 P1

#### CR-04 🟠 `generate-image` GET / POST 处理器整段复制
- **类别**：代码
- **位置**：`backend/src/routes/api.js:413-475`（GET）与 `backend/src/routes/api.js:477-539`（POST），各 ~63 行几乎逐字重复。
- **问题**：改一处漏一处（例如 CR-07 的错误信息泄露在两处都存在）。
- **修复**：抽 `async function handleGenerateImage({ dishName, prompt, dishId, startedAt }, res)`，两个路由仅取参后调用。

#### CR-05 🟠 `CollectionService.recordDailyRevival()` 读-改-写竞态（上一轮 P1 #10，未修复）
- **类别**：代码 / 数据一致性
- **位置**：`backend/src/services/CollectionService.js:51-113`
- **问题**：先 `select`（:51-54）判断 `currentUsed`，再 `insert/update`（:77-89），中间无事务、无原子 UPDATE。并发两次「抽卡」会读到相同 `currentUsed` → **超发每日抽卡**（>3 次），`user_collections` 可能重复插入。
- **修复**：用 Knex 事务包裹，或用原子 UPSERT：
  ```js
  await db.transaction(async (trx) => {
    const updated = await trx('daily_draws')
      .where({ user_id: userId, draw_date: date, draw_type: 'daily' })
      .andWhere('draw_count', '<', DAILY_LIMIT)
      .increment('draw_count', 1);
    // insert-on-conflict + 唯一索引 (user_id, draw_date, draw_type)
  });
  ```
  并给 `daily_draws(user_id, draw_date, draw_type)` 建唯一索引。

#### CR-06 🟠 Python 异常被 `except Exception: pass` 静默吞没（上一轮 P1 #11，未修复）
- **类别**：代码 / 可观测性
- **位置**：
  - `service/api_wrapper.py:192-193`（`pass`，无日志）
  - `service/api_wrapper.py:448-449`（`pass`，无日志）
  - `service/llm_reasoner.py:56-57`（`return None`，无日志）
  - `service/restoration_engine.py:53-54`（`= None`，无日志）、`:421-423`（设置了 `llm_fallback_reason`，但仍无日志）
  - `grep -rn "import logging|logger\." service/*.py` = **0 结果** —— 整个 service 层没有任何日志设施。
- **影响**：线上 LLM/外部调用失败时完全静默，仅靠返回值兜底，无法定位「为什么走了降级」。
- **修复**：`service/` 引入 `logging`，至少在每处 except 加 `logger.warning("...: %s", exc)`；`api_wrapper.py` 的 `pass` 改为「记录 + 落 stderr」。

#### CR-07 🟠 错误信息仍向客户端泄露内部细节
- **类别**：代码 / 安全（重叠）
- **位置**：`backend/src/routes/api.js:473` 与 `:537`（`res.status(500).json({ success:false, error: error.message })`）；`:430`、`:494`（`fallbackReason = \`Agnes image generation failed: ${error.message}\``，随响应回传给前端）。
- **问题**：上一轮 P1 #8「错误消息泄露」只修了 auth/evolution 控制器，`api.js` 这两处遗漏；`error.message` 可能含上游 URL、密钥指纹、内部路径。
- **修复**：对外统一通用文案（沿用 `GENERIC_ERROR_MESSAGE` 思路），详细原因只写 `console.error`。

#### CR-08 🟠 `userId` 未真正透传到 EvolutionService（上一轮 P1 #16，仅部分修复）
- **类别**：代码
- **位置**：`backend/src/controllers/evolutionController.js:17-21`（已改好，传了 `userId: req.user?.id`）**但** `backend/src/services/EvolutionService.js:158`（`static async evolve({ dishId1, dishId2 })`）**解构时丢弃了 userId**。
- **影响**：控制器「看起来」修好了，实际用户使用记录依旧无法追踪 —— 典型「改在上游、漏在下游」。
- **修复**：`static async evolve({ dishId1, dishId2, userId })` 并接入审计/记录。

#### CR-09 🟠 `StarMapService.loadDishBackgrounds()` 每次请求同步读文件（上一轮 P1 #17，未修复）
- **类别**：性能
- **位置**：`backend/src/services/StarMapService.js:7-18`（定义），调用点 `:33`、`:89`（`getStarMapData` 与 `getDishPosition` 各调一次）。
- **问题**：每个星图请求都 `fs.readFileSync` + `JSON.parse` 清单文件，阻塞事件循环。
- **修复**：模块加载或首次调用时缓存（带 mtime 失效），
  ```js
  let cache = null; let cacheMtime = 0;
  function loadDishBackgrounds() { /* statSync 比对 mtime 再决定是否重读 */ }
  ```

#### CR-10 🟠 `Dish.findSimilar()` 全表加载 + 内存计算（上一轮 P1 #9，未修复）
- **类别**：性能
- **位置**：`backend/src/models/Dish.js:66-87`（`db('dishes').whereNot({id})` 拉全表，再 `map` 算欧氏距离排序）。
- **问题**：随菜品表增长呈 O(N) 内存 + CPU；当前数据量小可接受，属中期瓶颈。
- **修复**：SQL 表达式排序（`orderByRaw`）或预计算相似度矩阵；短期至少加 `limit` 兜底。

#### CR-11 🟠 Result.jsx 图片请求未取消 + 降级态触发重复生成
- **类别**：性能 / 潜在 bug
- **位置**：`frontend/src/pages/Result.jsx:504-537`
  - 图片 `fetch(.../generate-image)` **无 `signal`**，组件卸载/重渲染时不会中断（上一轮 P1 #12 只修了 SSE 流，图片与 `loadFallback` 的 `/restore` 请求仍未取消）。
  - 依赖数组 `[aiStatus.text, restoredDish]`：首次 `aiStatus.text='真实 AI'` → 请求；若响应 `status:'degraded'` → `setAiStatus('降级')`（:525）→ **text 变化触发 effect 重跑 → 第二次 generate-image**（一次复原最多 2 次图片生成，且在降级时几乎必然发生）。
- **影响**：多余的上游调用（Agnes/Python 成本、页面延迟翻倍）；卸载后 setState 警告。
- **修复**：给图片请求加 `AbortController` 并在 cleanup abort；把降级态判断移出 effect 依赖（用 `useRef` 记录已加载的 dish id，或仅在 `restoredDish?.id` 变化时请求）。

#### CR-12 🟠 SSE `/analyze-stream` 缺客户端断连处理 / res 错误保护
- **类别**：性能 / 健壮性
- **位置**：`backend/src/routes/api.js:369-411`（`streamAnalysisSse`）
- **问题**：`res.writeHead(200,...)` 后进入异步 `buildAnalysisStreamResult`（内部 `PythonBridge.analyze/restore`，超时 30s，`PythonBridge.js:20/56-58`）。**未监听 `req.on('close')`/`res.on('error')`**；客户端提前断开后仍会对已销毁的 socket 调用 `res.write / res.end`，并继续占用 Python 子进程至超时。`proxy_buffering off`（nginx.conf）放大了长连接占用。
- **修复**：加 `req.on('close', () => { cancelled = true; res.writableEnded || res.end(); })`，写前判断 `res.writableEnded`；Python 侧支持取消（kill 子进程）。

#### CR-13 🟠 230MB PNG 随镜像发布，webp 优化链路存在但未接线
- **类别**：性能 / 部署 / 死代码
- **位置**：
  - `frontend/public/dish-backgrounds/`：150 个 PNG，`du` = **228MB**；`frontend/dist` = **230MB**（`vite` 默认 `publicDir=public`）。
  - `frontend/src/lib/dishAssets.js:3-8` 定义 `toRuntimeDishBackground()`（PNG→webp 映射），**全仓无任何调用点**（`grep` 仅命中定义与 `__tests__`）。
  - `frontend/public-runtime/dish-backgrounds/*.webp`（40 个 webp）**全仓无任何引用**（`grep public-runtime` = 0），属孤立目录。
  - `StarMap.jsx:35/173-178/343` 直接使用后端返回的 `backgroundImage`（PNG 路径），未走 webp 映射。
- **影响**：nginx 镜像体积达数百 MB；首屏/切换背景图按 ~1.4MB/张 传输；已有的 webp 管线完全空转。
- **修复**：二选一 —— (a) 让构建产出 `dist/dish-backgrounds/*.webp` 并在 `StarMap.jsx` 使用 `toRuntimeDishBackground(imagePath)`；(b) 明确 `data/visual_assets/dish_backgrounds.json` 的 `imagePath` 指向 webp 并删除 PNG 源（保留少量旗舰图）。当前状态属「优化代码写了但没接」。

#### CR-14 🟠 调试残留会随后端镜像发布，且含可写源码的脚本
- **类别**：代码 / 供应链
- **位置与判定**：
  | 文件 | 内容 | 是否随 `backend/Dockerfile` 上线 | 风险 |
  |---|---|---|---|
  | `backend/src/app.js.bak` | 旧版 app.js 备份，**第 62 行已损坏**：`// 错误处理中间件`\`napp.use(errorHandler);`（反引号+n 字面量，语法错误） | **是**（`COPY backend/src`） | 不被 require，不执行；属死重 + 误导 |
  | `backend/src/fix_app.js` | 会 `fs.writeFileSync('backend/src/app.js', ...)` 就地改写源码 | **是** | 不自动执行；但若被误跑会破坏 app.js |
  | `backend/src/fix_evolution.js` | 就地改写 `evolutionController.js` | **是** | 同上 |
  | `backend/src/fix_python.js` | 就地改写 `PythonBridge.js` | **是** | 同上 |
  | `create_test.js`（仓库根） | 仅 `const fs = require('fs');`（残缺） | 否（根文件不在任何 COPY 范围） | 无 |
- **说明**：`.dockerignore` **未**排除 `*.bak` / `fix_*.js`（已核验），所以前三者确实进入镜像。它们不被 `require`，故**不会自动执行**，定性为「危险残留而非活动后门」。
- **修复**：删除 `backend/src/{app.js.bak,fix_app.js,fix_evolution.js,fix_python.js}` 与根 `create_test.js`；`.dockerignore` 增补 `**/*.bak`、`**/fix_*.js`；`.gitignore` 增补同类规则防复发。

### 🟡 P2 / 🟢 P3

#### CR-15 🟡 `LightModeService.fakeDishBank` 死代码（上一轮 P1 #14，未修复）
- 位置：`backend/src/services/LightModeService.js:52-67`；实际使用的是 `expandedFakeDishBank`（:4 引入，:254/258 使用）。删除该常量。

#### CR-16 🟡 `buildCollection()` 双份定义（上一轮 P1 #15，未修复）
- `backend/src/services/LightModeService.js:109-116` 与 `backend/src/services/CollectionService.js:5-12` 同实现。统一到 `CollectionService` 导出。

#### CR-17 🟡 `buildCertificateId()` 双份定义（上一轮 P2 #39）
- `backend/src/services/LightModeService.js:98-102`（`FAB-<prefix>-…`）与 `backend/src/services/EvolutionService.js:4-8`（`FAB-EVO-…`）重复。抽公共工具。

#### CR-18 🟡 `normalizeRestoration` 可能产出缺 `modern` 的 ingredients → 渲染崩溃
- 位置：`frontend/src/pages/Result.jsx:113-119`（对象分支直接 `return restoration.ingredients || {original:[],modern:[]}`，若后端给了 `{original:[...]}` 而无 `modern`，则 :763 `restoredDish.ingredients.modern.map` 抛错）。当前后端两处格式化都返回双字段，故低概率；建议补默认值归一。

#### CR-19 🟡 Result.jsx 闭包引用后置声明变量（TDZ 脆弱）
- 位置：`frontend/src/pages/Result.jsx:388-473`：`startStream` 内使用 `inputText`，而 `const inputText = location.state?.inputText` 在 :468 才声明。因实际调用发生在 `setTimeout`（异步、晚于 :468）故当前**不报错**，但属高危脆弱写法，重构易引入 TDZ 崩溃。建议把 `inputText` 提到 effect 顶部。

#### CR-20 🟡 `api.js` 路由文件承载业务逻辑，绕过 Controller→Service 分层
- 位置：`backend/src/routes/api.js:92-238`（证据评分/格式化/推理步骤直接在 route 文件实现），而 `analyze`/`restore` 等模块走的是 `routes→controllers→services` 正轨（如 `analyzeController.js:19`）。
- 影响：两套风格并存，CR-03 重复的根因即在此。建议把 `api.js` 的业务逻辑下沉到 service。

#### CR-21 🟡 `/health` 在 production 且未配 `CORS_ORIGIN` 时抛错
- 位置：`backend/src/config/runtime.js:59`（`buildReadinessReport` 调用 `resolveCorsOrigin`，后者在 production 无 `CORS_ORIGIN` 时 `throw`）+ `backend/src/app.js:53-55`。compose 有默认值故当前不触发；但健康检查不应因缺失配置抛异常。建议在 readiness 中 `try/catch` 并返回 `corsOrigin:'missing'`。

#### CR-22 🟡 审计日志文件无轮转
- 位置：`backend/src/services/AiRunAuditService.js:59-64`（`appendFile` 到 `backend/data/ai-runs.jsonl`，无大小/数量上限）。Docker 卷持久化后会无限增长。建议加轮转或上限。

#### CR-23 🟡 前端新增测试为「源码正则断言」而非行为测试
- 位置：如 `frontend/src/pages/__tests__/criticalFailureStates.test.mjs:16-112`（读取 `.jsx` 源码 `assert.match` 关键字符串）、`frontend/src/lib/__tests__/deploymentConfig.test.mjs`、`scripts/__tests__/verify_all_python_contract.test.mjs`。
- 说明：比「无测试」进步，但**不渲染组件、不验证运行时行为**，且极易因格式变化误报/漏报（例如注释掉逻辑但保留字符串仍会通过）。上一轮「前端无独立测试」的实质空缺仍在。建议引入 `@testing-library/react` + `jsdom` 做真实交互测试。

#### CR-24 🟡 `Result.jsx` 仍 827 行（上一轮 P1 #13，部分修复）
- 已内联抽出 `ShareCertificate`/`EvidenceTimeline`/`EvidenceGraphPanel`/`EvidenceDrawer`，但都仍在同一文件；未拆到 `components/`。建议继续外移。

#### CR-25 🟡 `rateLimit` 桶 Map 无淘汰，长期内存增长
- 位置：`backend/src/middleware/rateLimit.js:7,23`（`buckets` Map 只增不减；每个不同 IP 一条永久驻留）。低流量可忽略，建议加定期清理或改用带 TTL 的存储。

#### CR-26 🟡 `VisionService` 的 `normalize`/`unique` 工具函数疑似未被类使用（上一轮 P2 #34）
- 位置：`backend/src/services/VisionService.js:46-52`。**待确认**：需进一步核对文件后半段是否有引用；若无则删除。

#### CR-27 🟡 磁盘残留 `backend/.env.backup`
- 位置：`backend/.env.backup`（520B，Sep 15）。`.gitignore` 已忽略（`backend/.env.*`），`.dockerignore` 的 `**/.env.*` 也不会进镜像，故**不会发布**；但磁盘存在旧配置快照，**待安全官确认是否含历史密钥**，建议清理。

#### CR-28 🟢 `service/` 测试文件与源码同目录（上一轮 P2 #47）
- `service/test_api_wrapper.py`、`service/test_evolution_naming.py`、`service/test_restoration_engine.py` 与源码平铺。建议归入 `service/tests/`。

---

## 3. 上一轮 P0/P1 修复状态核对表

### P0（3 项）

| # | 上一轮问题 | 位置 | 判定 | 证据 |
|---|---|---|---|---|
| 1 | AGNES API 密钥明文硬编码 | `backend/.env` | **待安全官确认**（非代码域） | 仓库 `.env.example` 已不含密钥；磁盘 `backend/.env` 仍存在且含 `AGNES_API_KEY=` 一行（已脱敏核验）。是否已轮换、是否仍被使用需安全官/运维确认 |
| 2 | `Dish.search()` LIKE 未转义 | `Dish.js:37-41` | **未修复** | 代码逐字未变，无转义；仍经 `recipeController.js:46` → `/api/recipe/search` 可达 |
| 3 | 证据评分/融合命名跨层重复 | `api.js`+`RestorationService.js`+`api_wrapper.py` | **未修复** | `evidenceUtils.js` 不存在；`api.js:92-156` 与 `RestorationService.js:26-98` 权重公式重复；`EvolutionService.js:10-105` 与 `api_wrapper.py:21-120` 命名表双份 |

### P1（17 项）

| # | 上一轮问题 | 判定 | 证据 / 说明 |
|---|---|---|---|
| 4 | JWT 存 localStorage | **未修复** | `frontend/src/lib/authStore.js:1-42` 仍用 `localStorage`（安全域，列出供核对） |
| 5 | 无 CSRF 防护 | **未修复** | `app.js:25-34` 中间件无 csrf |
| 6 | 弱 JWT 密钥硬编码回退 | **部分修复** | `config/auth.js:1-6` 已移除 `flavor-archaeology-secret-key-2024`，production 缺 `JWT_SECRET` 直接 `throw`；但 dev 仍有 `flavor-archaeology-local-demo-secret` 回退（dev-only 可接受） |
| 7 | 开发模式泄露堆栈（注释指 `app.js:69`） | **已修复** | `app.js` 内联错误处理已被移除，改用 `middleware/errorHandler.js:1-18`：production 返回通用文案，仅 development 返回 `err.stack` |
| 8 | 错误消息泄露内部信息 | **部分修复** | auth/evolution 控制器已改通用文案（`authController.js:7`、`evolutionController.js:32`）；但 `api.js:473,537` 仍 `error.message`（见 CR-07） |
| 9 | `findSimilar` 全表加载 | **未修复** | `Dish.js:66-87` 未变 |
| 10 | `recordDailyRevival` 竞态 | **未修复** | `CollectionService.js:51-113` 无事务/无原子更新 |
| 11 | Python `except: pass` 静默 | **未修复** | `api_wrapper.py:192-193,448-449`（pass）；全 service 无 logging |
| 12 | Result.jsx fetch 未取消 | **部分修复** | SSE 流已加 `AbortController`（`Result.jsx:393/407/478`）；但图片 `fetch`（:516）与 `/restore`（:365）仍无 signal |
| 13 | Result.jsx 863 行臃肿 | **部分修复** | 由 863→827 行，内联抽出 4 个子组件，未外置到 `components/` |
| 14 | `fakeDishBank` 死代码 | **未修复** | `LightModeService.js:52-67` 仍在 |
| 15 | `buildCollection` 重复 | **未修复** | `LightModeService.js:109` 与 `CollectionService.js:5` |
| 16 | evolutionController 缺 userId | **部分修复** | 控制器已传（`evolutionController.js:20`），但 service 丢弃（`EvolutionService.js:158`）——见 CR-08 |
| 17 | `loadDishBackgrounds()` 每请求读文件 | **未修复** | `StarMapService.js:7-18`，调用点 :33、:89 无缓存 |
| 18 | `executePythonAction` 回调可多次调用 | **已消除/修复** | `api.js` 已不再含该函数；`generate-image` 改 `execFile` 单次回调，`analyze-stream` 走 `PythonBridge`（`settled` 标志位 `PythonBridge.js:37-54` 防重复 settle） |
| 19 | auth 路由双重 rateLimit | **已修复** | `routes/auth.js` 无独立限流；仅 `app.js:50` 全局单实例 |
| 20 | generate-image GET/POST 复制 | **未修复** | `api.js:413-475` vs `477-539` 仍重复（见 CR-04） |

**统计**：已修复 3 / 部分修复 4 / 未修复 10。**上一轮 3 个 P0 全部未真正修复。**

---

## 4. 架构合理性总评

**分层**：`route → controller → service → PythonBridge → Python engine` 的主干设计是清晰的，且本轮在 **认证**（`authController` + `validation/authInput.js`）、**错误处理**（`middleware/errorHandler.js`）上做了正确的统一。但存在两处系统性偏离：
1. **`routes/api.js` 承载业务逻辑**（CR-20）：`analyze-stream`/`generate-image` 的证据评分、菜品格式化、推理步骤生成直接在路由文件实现，绕过了 controller/service 层，也是 CR-03 重复的直接来源。
2. **Node ↔ Python 双实现**（CR-03）：权重公式与融合命名在两侧各自维护，缺少「单一数据源 + 契约测试」约束。

**耦合与可维护性**：
- 路径耦合脆弱：服务层用 `../../../data/...`（3 级上溯到仓库根），DB 用 `../../data/...`（2 级上溯到 `backend/data`），**同一仓库两套数据根约定**，正是 CR-01 在容器内爆掉的根因。建议统一数据根（环境变量 `DATA_DIR` 注入）。
- 大量 `require(<JSON>)` 硬加载（`LightModeService.js:3-5`、`VisionService.js:3`、`FragmentService.js:3`、`VisionCandidateMapper.js:3`）：缺文件即**抛异常崩溃**，而非降级。建议改为 `fs.readFileSync + try/catch + 默认值`。

**重复代码清单**：证据评分（2 处 Node + 1 处 Python）、融合命名（Node + Python）、`buildCollection`（2 处）、`buildCertificateId`（2 处）、`generate-image` 处理器（2 段）。

**测试覆盖**：
- 后端：jest 用例较全（新增 `authController.test.js`、`authInput.test.js`、`seedIfEmpty.test.js`、`containerStartup.test.js`），质量尚可，但 `containerStartup.test.js` 恰好把 CR-01 缺陷断言为「正确」。
- 前端：新增测试均为「读源码做正则断言」，无组件渲染/交互测试（CR-23），实质覆盖仍薄弱。
- Python：3 个 unittest，未见覆盖 `except` 分支的日志行为。

**结论**：架构「骨架合理、纪律松弛」。在演示规模下能跑通，但**重复实现 + 路径硬编码 + 静默异常**三项叠加，一旦进入真实运营或换部署环境就会集中爆发（CR-01 已是预告）。

### 4.1 两条风险线对照（比赛提交物 vs 自托管 / Docker 部署路径）

> **定级权重说明**：正式比赛提交物是**纯前端离线单文件产物**（`frontend/dist-offline/offline.html` → 打包为 `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`），**不含 `backend/`、`service/`、`data/`**。因此 CR-01 对「比赛提交物」的权重下调至不影响提交；其真实影响落在自托管/Docker 部署路径。最终报告应按下列两栏分列。

**A. 比赛提交物（离线单文件 HTML）风险面 —— 仅前端产物**
- **不适用**（后端/构建类，提交物内不存在对应代码）：CR-01a/b/c（Dockerfile 路径双写 / 缺 service / 缺根 data）、CR-02（`Dish.search()` LIKE 注入）、CR-03（Node↔Python 跨层重复）、CR-05（每日抽卡竞态）、CR-07（后端 error.message 泄露）、CR-09/CR-10（`StarMapService` 每请求读文件 / `findSimilar` 全表加载）、CR-12（SSE 断连未释放）。
- **需关注（前端类，直接作用于提交物）**：
  - CR-11 🟠 `Result.jsx:504-537` 图片 fetch 未取消 + 降级态触发重复 `generate-image`（离线包内图片走本地 data URI，重复请求影响体验）
  - CR-13 🟠 产物体积 / webp 管线未接线（230MB PNG 与未使用的 `toRuntimeDishBackground`；离线包已改用内联 webp，但主站构建仍重）
  - CR-23 🟡 前端测试为「源码正则断言」，无组件级行为测试
  - CR-24 🟡 `Result.jsx` 仍 827 行臃肿
  - CR-18/CR-19 🟡 `normalizeRestoration` 缺字段归一、闭包后置声明的脆弱写法

**B. 自托管 / Docker 部署路径风险面**
- **🔴 阻塞**：CR-01a（源码路径双写，容器 CMD 第一步即失败）、CR-01b（缺 `COPY service`，Python 全链路失效）、CR-01c（缺根 `data/`，启动崩溃或数据为空）
- **🟠 上线前必修**：CR-02（LIKE 注入）、CR-03（跨层重复）、CR-05（抽卡竞态）、CR-07（错误信息泄露）、CR-09（星图每请求读文件）、CR-10（`findSimilar` 全表加载）、CR-12（SSE 断连未释放）

**处置口径（供最终报告引用）**：CR-01a 的正确修法是 `COPY backend/src /app/backend/src`（或 `COPY backend/src ./src`），并同步修正 `containerStartup.test.js:11-21` 的反向断言（新增 `expect(dockerfile).not.toMatch(/COPY\s+backend\/src\s+\.\/backend\/src/)`），**不得保留被误断言为正确的 `./backend/src` 写法**。

---

## 5. 性能瓶颈清单（按优化优先级）

| 优先级 | 瓶颈 | 位置 | 类型 | 预期收益 | 成本 |
|---|---|---|---|---|---|
| P0 | 230MB PNG 随镜像/首屏 | `frontend/public/dish-backgrounds/`、`dishAssets.js`(未接线) | 传输/镜像体积 | 镜像 ↓~90%，图上 ↓~80% | 中（接线 webp 或减量） |
| P1 | 每请求同步读背景清单 | `StarMapService.js:7-18,33,89` | CPU/IO 阻塞 | 消除每请求磁盘 IO | 低（加缓存） |
| P1 | 降级态重复 `generate-image` | `Result.jsx:504-537` | 上游调用翻倍 | ↓50% 图片生成 | 低（修依赖/加 ref） |
| P1 | SSE 长连接占用 + 断连不释放 | `api.js:369-411`、`PythonBridge.js:56-58` | 资源占用 | 断连即时释放子进程 | 中 |
| P2 | `findSimilar` 全表 O(N) | `Dish.js:66-87` | CPU/内存 | 大表下显著 | 中（SQL 排序/预算矩阵） |
| P2 | LIKE 全表扫描（含 CR-02） | `Dish.js:37-41` | DB 扫描 | 阻断恶意/退化查询 | 低 |
| P3 | 审计日志无轮转 | `AiRunAuditService.js:59-64` | 磁盘增长 | 防磁盘打满 | 低 |
| P3 | rateLimit Map 无淘汰 | `rateLimit.js:7,23` | 内存增长 | 长跑稳定 | 低 |
| P3 | 图片 fetch 未取消 | `Result.jsx:516` | 无效请求 | 轻微 | 低 |

---

## 6. 必须基于实际代码行的关键引用索引

- 证据评分重复：`backend/src/routes/api.js:98-105` ↔ `backend/src/services/RestorationService.js:53-60`
- 融合命名重复：`backend/src/services/EvolutionService.js:10-105` ↔ `service/api_wrapper.py:21-120`
- LIKE 未转义：`backend/src/models/Dish.js:39-40`
- 抽卡竞态：`backend/src/services/CollectionService.js:51-89`
- Python 静默异常：`service/api_wrapper.py:192,448`、`service/llm_reasoner.py:56`、`service/restoration_engine.py:53,421`
- 容器路径缺陷（CR-01a/b/c）：`backend/Dockerfile:7,16,33`（WORKDIR 双写）+ `backend/src/services/PythonBridge.js:19`（缺 service/）+ `backend/src/services/LightModeService.js:3-5`、`service/knowledge_graph.py:16`（缺根 data/）
- 调用点缺失：`toRuntimeDishBackground` 仅 `frontend/src/lib/dishAssets.js:3`（无调用方）

---

## 7. 明确假设与待确认项

- **假设**：`.env` 未被提交到 git 历史（未执行 `git log --all -p -- .env`，属安全官范围）。
- **待确认 1（已核实）**：**正式发布物为离线单文件 HTML**（`release/风味考古局-TRAE初赛/风味考古局-离线体验.html` + `使用说明.txt`，由 `scripts/package_trae_submission.ps1` 打包），docker compose 为次要/自托管路径。据此 CR-01 采用分支定级：**走 docker compose → 🔴P0；仅提交离线 HTML → 🟠P1**（`docker-compose.yml` 在仓库内且被文档化，仍须修）。CR-01a/b/c 的验证方式为**静态推演**（Docker daemon 未运行，未做实时 `docker compose build`）。
- **待确认 2**：AGNES_API_KEY 是否已在平台侧轮换（CR 复核表 P0 #1）。
- **待确认 3**：`VisionService.normalize/unique` 是否真未使用（CR-26，仅扫了前 60 行）。
- **未覆盖**：`service/restoration_engine.py`、`service/image_generator.py`、`backend/src/DishVisualPromptService.js` 等非变更大文件未逐行通读，仅按调用关系与关键词核查；如需可追加深读。

---

*本产出由产品评审员（gstack-product-reviewer）独立完成，所有结论均可回溯到文件与行号；不确定项已显式标注。*
