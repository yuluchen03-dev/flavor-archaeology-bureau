# 风味考古局 — 上线前安全审计（OWASP Top 10 + STRIDE）

- **审计模式**：Comprehensive（上线前全量）
- **日期**：2026-09-25
- **审计人**：gstack-security-officer
- **审计范围（"即将上线"的代码）**：`git status` 中 M/?? 变更集为焦点，但为判定真实可利用性，同时核对了未在变更集中、却构成信任边界的存量代码（app.js / middleware / routes / models / services / 部署配置）。
- **方法**：逐文件人工审阅 + `git` 取证 + `npm audit` 联网实测 + JWT 签名/校验主动复现。所有结论均附证据（路径:行号 / 命令输出摘要）。
- **确认约束**：未调用任何外部 LLM API；未使用 shell 通配符；未打印任何密钥明文；所有验证均为 PoC 级别，未触碰生产数据。

---

## 0. TL;DR（执行摘要）

本次变更集在**认证加固方向**上确实做了工作（helmet 接入、生产环境缺失即抛错的 JWT/CORS 配置、控制器统一通用错误、bcrypt 时序均衡、Python 调用全部走 `spawn`+数组参数无命令注入、前端无 `dangerouslySetInnerHTML`）。但在**密钥管理**上出现了两处需立即处置的问题：

- **🔴 P0-01：真实 Agnes API Key 以明文形式残留在工作区的计划文档中**（`docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:55`，命中 2 处、同一文件）。**经复核定性**：该文件**未被 git 跟踪、从未进入任何提交历史**（`git ls-files` 空、`git status` 为 `??`、`git grep` 跨历史无命中），风险性质是「**工作区明文残留 + 误提交前兆**」——`docs/**` **未被 `.gitignore` 覆盖**，一次 `git add -A` 即会把有效计费凭据写进仓库。**结论：不是"已泄漏进仓库历史"，而是"随时可能被误提交"**；因该 key 曾以明文落盘，仍须按已泄露处置（轮换）。
- **🔴 P0-02：含 `JWT_SECRET` 的 `backend/.env` 被 git 跟踪并已进入提交 `b48a6df`**（提交名恰为"security: set strong random JWT_SECRET"）。**已主动复现**：用该密钥可签发出通过 `jwt.verify` 的任意 `userId` 令牌 → 任何 clone/获得仓库副本者可完全伪造登录态。
- **🟠 P1-01：4 个高成本 AI 端点（analyze-stream / generate-image）无任何认证**，仅靠 120 req/min/IP 的全局限流，可被未登录脚本刷爆豆包 LLM 与 Agnes 生图账单。

上一轮 2 个 P0 中：**AGNES 密钥仅"部分修复"**（已从 `backend/.env` 移除，但残留于工作区 docs），**SQL LIKE 通配符注入"未修复"**（重估影响为 P2）。JWT localStorage / 无 CSRF / 弱密钥回退 / 堆栈泄露 4 项中，堆栈泄露"已修复"，弱密钥回退"已修复但被 P0-02 抵消"，另 2 项结合本项目设计重估。

### 0.1 正式发布物 vs 自托管部署路径（两条独立结论线）

对本次比赛**正式提交物**（`release/风味考古局-TRAE初赛.zip`，解包仅 2 个文件：`风味考古局-离线体验.html` 2,058,152 bytes + `使用说明.txt` 366 bytes）做了独立密钥扫描：

- `grep -nE "sk-[A-Za-z0-9]{10}|AGNES_API_KEY|JWT_SECRET|OPENAI_API_KEY|AI_API_KEY|Bearer …"` → **0 命中**（工作区与 zip 内容一致）。
- HTML 中出现的 `sk-*` **全部是 CSS 类名**（`sk-content`×10、`sk-list`×8、`sk-kicker`×6、`sk-feedback`×5、`sk-source`×3、`sk-actions`×2），**误报**。

因此必须区分两条结论线：
1. **离线单文件 HTML 提交物：风险 = 低** —— 不含任何密钥、不含 `.env`、不含 `backend/`，离线自包含，可正常提交。
2. **自托管部署路径（docker / 本地运行工作区）：风险 = 高** —— P0-01/P0-02 的密钥问题集中在这一侧；`release/` 干净不等于仓库工作区干净。

**总体评级：🔴 不通过（No-Go）** — P0-02 与 P1-01 必须在上线/push/自托管前处理；P0-01 须轮换密钥并加误提交防线。

---

## 1. 架构与信任边界（Phase 1–2）

```
[浏览器 React19] --Bearertoken--> [Nginx:80] --/api--> [Express:3001] --spawn(argv)--> [Python3 service/] --HTTPS--> [豆包LLM / Agnes 生图 / OpenAI Vision]
        |                                |                        |
   localStorage(token)            helmet + cors + rateLimit    SQLite (backend/data/*.db)
                                        |
                                   /health (公开就绪报告)
```

**信任边界**
- **TB1 公网 → Nginx**：唯一对公网暴露的端口是 `frontend:5173->80`（compose `ports`）。后端 `3001` 仅 `expose`（内部网络），无公网直达。
- **TB2 Nginx → Express**：`TRUST_PROXY_HOPS=1`（compose:14），Express `trust proxy=1`；Nginx 注入 `X-Real-IP`/`X-Forwarded-For`（nginx.conf:19-21）。后端仅信任 1 跳，规避了 XFF 伪造污染限流 key。
- **TB3 Express → Python 子进程**：`spawn(bin,[script,action,json])`，无 shell，输入以单个 JSON argv 传递；`action` 走白名单 `ACTIONS`（api_wrapper.py:534-542）。
- **TB4 进程 → 外部 AI 供应商**：出站 URL 全部来自环境变量（`OPENAI_BASE_URL`/`AGNES_BASE_URL`/`IMAGE_GEN_BASE_URL`），**无用户可控 URL**。
- **TB5 进程 → SQLite 文件**：`backend/data/flavor_archaeology.db`（compose 卷 `backend_data`）。

**攻击面清单（暴露级别）**

| 端点 | 方法 | 鉴权 | 级别 | 备注 |
|---|---|---|---|---|
| `/api/auth/register` `/login` | POST | 无 | 公网 | 全局限流 |
| `/api/auth/me` | GET | authenticate | 用户 | |
| `/api/analyze` `/restore` `/teach` `/evolution` | POST | optionalAuth | 公网 | 可选登录 |
| `/api/analyze/history` `/restore/history` `/teach/history` | GET | authenticate | 用户 | 仅取 `req.user.id` |
| **`/api/analyze-stream`** | GET/POST | **无** | **公网** | 触发 Python+LLM，**F-P1-01** |
| **`/api/generate-image`** | GET/POST | **无** | **公网** | 触发 Agnes 生图，**F-P1-01** |
| `/api/light/*` | GET/POST | optionalAuth | 公网 | 每日抽卡次数逻辑缺陷 **F-P2-02** |
| `/api/recipe/search` | GET | 无 | 公网 | LIKE 通配符 **F-P2-01** |
| `/api/recipe/:id` `/star-map/*` `/fragments/*` | GET | 无 | 公网 | 只读公共目录 |
| `/health` | GET | 无 | 公网 | 就绪信息暴露 **F-P2-08** |

---

## 2. 漏洞清单

> 严重度：🔴P0 上线阻塞 / 🟠P1 上线前必修 / 🟡P2 尽快修 / 🟢P3 加固项
> 每条含：位置 / 分类 / 原理 / 可利用性（真实场景）/ 修复 / 置信度

---

### 🔴 P0-01 真实 Agnes API Key 明文残留在工作区计划文档（误提交前兆，**未进入 git 历史**）

- **分类**：OWASP A02 Cryptographic Failures / A05 Security Misconfiguration（STRIDE: Information Disclosure）
- **风险性质（经复核修正）**：**工作区明文残留 + 误提交风险**。该文件**未被 git 跟踪、未进入任何提交历史、也未进入正式发布物**；但在 `.gitignore` 未覆盖 `docs/**` 的前提下，一次 `git add -A`/`git add .` 即会把有效计费凭据写入仓库。**不是"已泄漏进仓库历史"**。
- **位置**：`docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:55`
- **证据（复核命令与结果，值未打印）**：
  - `git ls-files "docs/superpowers/plans/2026-09-14-deploy-check-fixes.md"` → **空**（未跟踪）。
  - `git status --short` 该文件 → **`?? docs/superpowers/plans/2026-09-14-deploy-check-fixes.md`**（untracked）。
  - `git grep "sk-7Tkr" $(git rev-list --all | head -50)` → **无任何命中**（未进历史）。
  - 工作区 `grep -rc "sk-7Tkr" docs/` → 命中 **2 处，仅此一个文件**。
  - `git check-ignore -v <该文件>` → **无输出** ⇒ **不在 .gitignore 覆盖范围内**（这是"误提交前兆"的关键前提）。
  - 文件内容形如：`$envContent = $envContent -replace 'AGNES_API_KEY=sk-7Tkr…LXrt4e2', 'AGNES_API_KEY=${AGNES_API_KEY}'`（一枚真实 `sk-…` 密钥原文被当作"待替换字符串"抄进了这份修复说明）。
  - 运行期配置侧：`backend/.env` 中 `AGNES_API_KEY` 已为**空值**（工作区 `awk` 实测 EMPTY）⇒ 运行配置这一侧确已清空。
- **原理**：修脚本在为 `.env` 脱敏时，把"待脱敏的明文"原文留在了文档里，等于把密钥永久留在磁盘上；而该目录不受 `.gitignore` 保护，处于"随时可能被整体提交"的状态。
- **可利用性（真实场景，已下修）**：**提交物本身干净**（见 §0.1，release zip 仅 2 个文件、扫描 0 命中），故对"比赛评委/公开下载者"**不构成实际泄露**。风险集中在：(a) 该分支工作区被整包分享/打成 zip 给他人；(b) 开发者 `git add -A` 误提交并 push 到公开远程。命中任一即等同于公开一枚可计费的第三方 API 密钥。**注意**：上一轮处置是"从 `.env` 移除"，但"移除"时把原文写进了文档 → 本次是**残留点位移**而非消除。
- **修复**：
  1. **立即在 Agnes 平台吊销并轮换该 key**（不要假设它已失效；该 key 曾明文落盘并出现在本地 AI 会话/文档中，按已暴露处置）。
  2. 从该 md 中删除密钥原文，只保留 `${AGNES_API_KEY}` 占位（这正是脚本本意）。
  3. **增加误提交防线**：`.gitignore` 增加 `docs/**/*secret*` 或在 CI/pre-commit 接入 secret 扫描（gitleaks），拦截 `sk-[A-Za-z0-9]{16,}`、`AGNES_API_KEY=`、`JWT_SECRET=` 等模式；CI 增加 `git grep -nE 'sk-[A-Za-z0-9]{16,}' -- ':!*.min.*'` 门禁。
- **严重度说明**：维持 🔴P0 是因为"有效计费凭据 + 明文 + 无 gitignore 覆盖"三者同时成立、且修复成本极低；**若团队确认该 key 已在 Agnes 平台吊销/账户无余额，可下调为 🟡P2**。
- **置信度**：10（存在与位置）；误提交可利用性 8；对提交物泄露 0（已排除）

---

### 🔴 P0-02 含 JWT 签名密钥的 `backend/.env` 被 git 跟踪并进入提交（发布分支）

- **分类**：OWASP A02 Cryptographic Failures / A07 Auth Failures / A08 Integrity Failures（STRIDE: Spoofing + Elevation of Privilege）
- **位置**：`backend/.env`（**HEAD 中被跟踪**）；提交 `b48a6df`（"security: set strong random JWT_SECRET"，仅此文件 +20 行）
- **证据（复核命令与结果）**：
  - `git ls-files | grep -iE "(^|/)\.env$"` → 输出含 **`backend/.env`** ⇒ **已被 git 跟踪**（与 `.gitignore` 中 `backend/.env` 规则冲突，说明曾被 `git add -f` 强制加入；一旦被跟踪，gitignore 对该文件即失效）。
  - `git log --oneline --all -- backend/.env` → **仅一个提交**：`b48a6df security: set strong random JWT_SECRET` ⇒ **"加固提交"本身把 `.env` 提交了进去**。
  - `git show HEAD:backend/.env` 可读，含配置项名：`PORT / NODE_ENV / JWT_SECRET / JWT_EXPIRES_IN / DB_PATH / AI_SERVICE_URL / AI_API_KEY / AGNES_BASE_URL / AGNES_API_KEY / AGNES_IMAGE_MODEL / AGNES_IMAGE_SIZE`。**值未打印**；`JWT_SECRET` 值长度 **32 字符**。
  - 本机 `backend/.env` 敏感键取值状态（仅"有值/空值"，无明文）：`JWT_SECRET` = **有值(len=32)**；`AI_API_KEY` = **有值(len=12，前缀 `moc`，为 mock 占位)**；`AGNES_API_KEY` = **空值**。
  - `git branch --contains b48a6df` → 仅 `* feat/trae-offline-museum`（当前分支）；`origin/main` = `0b95b65 Initial commit`，**尚未 push 到远程**（远程：`github.com/yuluchen03-dev/flavor-archaeology-bureau`）。
  - 正式发布物 `release/...zip` **不含** `backend/.env`（见 §0.1）⇒ 该问题属**自托管/仓库路径**，非提交物。
- **主动复现（PoC，未打印密钥）**：
  ```
  [1] JWT_SECRET present in backend/.env : true len=32
  [2] alg=none rejected -> jwt signature is required     ← 好消息：none 不可用
  [3] token forged with the on-disk/committed secret VERIFIES ok -> userId=1
        => 任何人读到该 secret 即可伪造任意用户令牌
  [4] wrong secret rejected (expected): invalid signature
  [5] default algorithm of sign: HS256
  ```
  即：用磁盘/仓库里的密钥签发的 `{userId:1}` 令牌能通过 `middleware/auth.js:20 jwt.verify()`，`authenticate` 随后 `User.findById(1)` 命中即放行（auth.js:22-31）。**认证被完全绕过，可冒充任意 userId。**
- **原理**：JWT 是对称签名，验证方与签发方共享同一 `JWT_SECRET`；密钥一旦可读，签名不可信。`config/auth.js:2` 在非生产环境直接使用 `process.env.JWT_SECRET`（dotenv 从 `backend/.env` 加载），生产缺失才抛错（auth.js:4-6）——所以**任何直接加载 backend/.env 的运行方式（本地演示、评委机、把 `.env` 一并拷走的部署）都使用这枚已"公开"的密钥**。
- **可利用性（真实场景）**：`backend/.env` 在 **HEAD 中被跟踪且 `git show HEAD:backend/.env` 可读** ⇒ 一旦推送远端或仓库被 clone，即等同于**公开服务端签名密钥与文件内全部第三方 API Key**。当前未 push，属"潜伏型 P0"；但本次任务是"上线前发布分支"，CI 本身就是 `on: push main/develop`，合并即触发暴露。**按 secret 一旦入库即视为已泄露的惯例，必须轮换——清洗历史不能替代轮换。**
- **修复（含历史清洗，不能只删文件+改 gitignore）**：
  1. `git rm --cached backend/.env` → 提交（确认 `git status` 中不再出现该文件；磁盘文件保留供本地使用）。
  2. 用 `git filter-repo` 或 BFG **清洗 `b48a6df` 引入的 blob**（改写该提交，从全部历史中移除 `backend/.env`）→ 必要时 `push --force`（先与协作者协调）。
  3. **轮换该 .env 内所有第三方 Key 与 `JWT_SECRET`**（生产用 CI/平台 secret 注入；本地 `.env` 用一次性随机值）。**清洗历史 ≠ 密钥失效**，二者都要做。
  4. `.gitignore` 既有 `backend/.env` 规则保持，并验证 `git check-ignore -v backend/.env` 生效；CI 增加守卫 `git ls-files | grep -E '(^|/)\.env$'` 命中即失败；接入 gitleaks。
- **澄清（避免误伤正确设计）**：`docker-compose.yml:11` 的 `JWT_SECRET: ${JWT_SECRET:?...}` fail-fast 设计是**正确**的——问题只在"被仓库跟踪的 `backend/.env` 文件"，与 compose 的强制注入机制**无关**，两者不要混为一谈。修复不应改动 compose 的 fail-fast。
- **置信度**：10

---

### 🟠 P1-01 无认证的高成本 AI 端点（费用型滥用 / 账单 DoS）

- **分类**：OWASP A01 Broken Access Control / A04 Insecure Design（STRIDE: Denial of Service + Elevation）
- **位置**：`backend/src/routes/api.js:399`（GET `/analyze-stream`）、`:405`（POST `/analyze-stream`）、`:413`（GET `/generate-image`）、`:477`（POST `/generate-image`）；挂载点 `backend/src/routes/index.js:25 router.use('/', apiRoutes)`。
- **证据**：4 个 handler 均无 `authenticate`/`optionalAuth`；唯一防护是 `app.js:50 app.use('/api', createRateLimit(), apiRoutes)`，默认 120 请求/分钟/IP（rateLimit.js:2-3）。
- **原理/可利用性**：
  - `POST /api/analyze-stream` → `PythonBridge.analyze` → `llm_reasoner.analyze_text()`/`reason_restoration()` 在配置了 `OPENAI_API_KEY` 时向豆包发起**计费** LLM 调用（`service/llm_reasoner.py:33-54`）。
  - `GET/POST /api/generate-image` → `AgnesImageService.generate()`（`AgnesImageService.js:45-94`）向 Agnes 发起**按次计费**生图。
  - 未登录攻击者用 20 个 IP 即可达 2400 次/分钟，分钟级刷爆两家供应商账单；SSE 端点 `streamAnalysisSse`（api.js:369-396）**无服务端最长时长/并发上限**，单机可被大量挂起连接耗尽。
- **修复**：给 AI 端点加 `authenticate`；对生成类接口设"每用户每日配额"+ 独立低频限流（如 5/min/用户）；SSE 加 `setTimeout` 强制结束；生图结果按 `dishName+prompt` 缓存去重。
- **置信度**：8（缺鉴权为客观事实；实际刷取取决于供应商配额，判 8）

---

### 🟡 P2-01 `Dish.search()` LIKE 通配符未转义 + 无结果上限（上一轮 P0，**未修复**）

- **分类**：OWASP A03 Injection（LIKE 模式注入）（STRIDE: DoS）
- **位置**：`backend/src/models/Dish.js:37-41`；调用方 `backend/src/controllers/recipeController.js:42-51`（`keyword` 未清洗、keyword 分支不传 limit/offset）
- **证据**：代码原样保留
  ```js
  return db('dishes')
    .where('name', 'like', `%${keyword}%`)
    .orWhere('description', 'like', `%${keyword}%`);
  ```
  无 `%`/`_`/`[` 转义；`searchRecipes` 的 `keyword` 分支直接 `await Dish.search(keyword)`，无分页。
- **原理**：Knex 已参数化（**无 SQL 注入**），但 LIKE 的模式元字符未被转义，用户可用 `%`/`_` 控制匹配面。
- **可利用性**：`GET /api/recipe/search?keyword=%` 命中全表并一次性返回全部行。当前 dishes 表仅 ~10 行，危害低；数据增长后成为内存/带宽 DoS。
- **校准说明**：上一轮评 P0，本轮重估为 **P2**——无敏感数据外泄、当前数据规模影响有限，且非注入可执行代码类漏洞。但"未修复"事实成立。
- **修复**：`keyword.replace(/[\\%_]/g, m => '\\'+m)` 后再拼 `%…%`；对 keyword 加长度上限并对结果 `.limit(50)`。
- **置信度**：9

---

### 🟡 P2-02 `/api/light/daily` 每日抽卡次数可被客户端 `date` 参数绕过

- **分类**：OWASP A01 Broken Access Control（业务逻辑越权）（STRIDE: Tampering / Elevation）
- **位置**：`backend/src/controllers/lightModeController.js:25-46`（`date: req.query.date`、`seed: req.query.seed`）→ `LightModeService.getDailyRevival`（LightModeService.js:209-225）→ `CollectionService.recordDailyRevival`（CollectionService.js:38-89）
- **证据**：`date` 直接作为 `draw_date` 落库（CollectionService.js:51-53, 78-88），无服务端"今天"校验；`DAILY_LIMIT=3` 仅按 `(user_id, draw_date, draw_type)` 计数（migration 002:21 唯一约束）。
- **原理/可利用性**：登录用户传 `?date=2020-01-01&draw=1`、`2020-01-02`… 每个新日期即新桶，**无限刷抽卡与收藏**，绕过每日 3 次的设计意图；`seed` 亦用户可控 → 结果可预测/指定。
- **补充**：并发下 `recordDailyRevival` 无事务（CollectionService.js:51-89），靠唯一约束兜底：并发插入会抛唯一约束错（未捕获 → 500），并发更新会丢更新（计数少记）。属健壮性缺陷，非越权，但同源。
- **修复**：服务端强制 `draw_date = 服务器当天`（忽略客户端 date 或仅用于展示）；`draw` 消耗用事务 + `INSERT … ON CONFLICT DO UPDATE SET draw_count=draw_count+1` 原子化。
- **置信度**：9

---

### 🟡 P2-03 自研限流器内存桶无上限（长跑内存增长 / DoS）

- **分类**：OWASP A04 Insecure Design（STRIDE: DoS）
- **位置**：`backend/src/middleware/rateLimit.js:7`（`const buckets = new Map()`）、`:15-23`
- **证据**：`buckets.set(key,bucket)` 只写不清理；过期桶仅在"同一 key 再次访问"时被覆盖（`:18-20`）。key 为 `req.ip || x-forwarded-for || remoteAddress`。
- **原理/可利用性**：攻击者用大量不同源 IP（僵尸网络/代理池）每个 IP 只发一次请求，即可让 Map 无界增长 → 内存持续上涨，最终 OOM。项目以 `deploy.resources.limits.memory: 512M` 限制，OOM 更快触发。单 IP 刷不变内存，故需多 IP，判 P2。
- **修复**：定期清扫过期桶（`setInterval` 或惰性 + 计数阈值触发）、限制 Map 最大条目数（超过则淘汰最旧/直接降级为全局桶）、或改用 `express-rate-limit`+`rate-limit-redis`。
- **置信度**：8

---

### 🟡 P2-04 JWT 加固不足：未固定算法 / 无刷新与吊销 / 7 天超长有效期

- **分类**：OWASP A02 / A07（STRIDE: Spoofing）
- **位置**：`backend/src/middleware/auth.js:20`（`jwt.verify(token, jwtSecret)`，未传 `algorithms`）；`config/auth.js:11`（`jwtExpiresIn='7d'`）
- **证据**：`jwt.verify` 未固定 `algorithms:['HS256']`；无 refresh token、无吊销列表、无 `tokenVersion`。**主动验证**：`alg=none` 已被 jsonwebtoken v9 拒绝（auth 侧无此漏洞），故此项为**加固类**而非可利用漏洞。
- **可利用性**：`none` 不可用（已验）；但 7 天不可吊销的 Bearer token 一旦泄露（配合 P0-02 或未来任何 XSS）有效期过长，且无法服务端登出。
- **修复**：`jwt.verify(token, jwtSecret, { algorithms: ['HS256'] })`；缩短 access token 至 15-30 分钟 + refresh；为用户表加 `token_version`，改密/登出时自增使旧 token 失效。
- **置信度**：9（配置事实）

---

### 🟡 P2-05 SQLite 库与审计日志未纳入 `.gitignore`（含凭据哈希的库易被误提交）

- **分类**：OWASP A02 / A09（STRIDE: Information Disclosure）
- **位置**：`.gitignore`（缺 `backend/data/`、`*.db`、`*.jsonl` 规则）；磁盘文件 `backend/data/flavor_archaeology.db`、`backend/data/flavor_archaeology.db.qa-backup`、`backend/data/ai-runs.jsonl`
- **证据**：`git ls-files | grep -iE '\.(db|sqlite)$|^backend/data/'` 无命中 ⇒ 当前**未**被跟踪（好）；但 `.gitignore` 无对应忽略规则，`.dockerignore` 有 `backend/data/`（docker 侧安全）。库内含 `users.password_hash`（bcrypt）、用户收藏/抽卡记录（migration 001/002）。
- **可利用性**：当前为"未跟踪"状态，属**误提交风险**而非已泄露。若开发者执行 `git add .`（在含 `create_test.js`、`fix_*.js` 等一批未跟踪文件的仓库里极易发生），库与备份会被提交，泄露所有用户 bcrypt 哈希。
- **修复**：`.gitignore` 增加 `backend/data/`、`*.db`、`*.db.qa-backup`、`data/ai-runs.jsonl`；数据库文件系统权限收紧到 600。
- **置信度**：8

---

### 🟡 P2-06 未认证端点泄露内部错误信息 / `/health` 暴露内部配置

- **分类**：OWASP A05 / A09（STRIDE: Information Disclosure）
- **位置**：`backend/src/routes/api.js:391`（SSE `error.message` 直出）、`:473`、`:537`（`res.status(500).json({ error: error.message })`）；`backend/src/config/runtime.js:54-79` 经 `app.js:53-55` `/health` 公开
- **证据**：`errorHandler.js:5-9` 生产已改为通用消息（**上一轮 #7 已修复**），但 `routes/api.js` 内联 catch 与 SSE 仍原样返回 `error.message`（例如 `Failed to start Python process: spawn python ENOENT`、`Python stdout too large: …`），可推断后端运行环境。`/health` 返回 `corsOrigin`、各 AI provider 是否配置、模型名、限流参数。
- **可利用性**：低——泄露的是配置形态而非凭据，但为攻击者踩点提供便利（确认 Python 缺失、确认哪些供应商已配置）。
- **修复**：api.js 内联错误统一走 `errorHandler` 或返回通用消息，细节仅入日志；`/health` 拆分为公开的 `{status}` 与需鉴权的诊断端点。
- **置信度**：9

---

### 🟡 P2-07 未认证端点接受 10MB JSON body（内存/解析 DoS 面）

- **分类**：OWASP A04（STRIDE: DoS）
- **位置**：`backend/src/app.js:33`（`express.json({ limit:'10mb' })`）、`:34`（`urlencoded({extended:true})` 无 limit）
- **证据**：10MB 上限全局生效；未认证的 `/api/analyze`（`imageData` 可传 base64 图片）、`/api/analyze-stream` 都吃这个上限。
- **可利用性**：并发大 body + 每请求一次 JSON 解析 + 可能转存到 vision 链路，放大单机内存压力（容器限 512M）。
- **修复**：未认证/非图片端点降到 100–256KB；图片上传单独路由并限流+校验 content-type。
- **置信度**：7（影响依赖并发度）

---

### 🟡 P2-08 生产镜像使用 EOL 的 Node 18 基础镜像

- **分类**：OWASP A06 Vulnerable & Outdated Components
- **位置**：`backend/Dockerfile:1`（`FROM node:18-alpine`）、`:4`（alpine `python3`）
- **证据**：Node.js 18 已于 2025-04-30 EOL；前端构建阶段已用 node:22（frontend/Dockerfile:1）。`npm audit` 只覆盖 npm 依赖、不覆盖基础镜像 OS 包。
- **修复**：升级到 `node:22-alpine`（与前端构建阶段、CI matrix 对齐）。
- **置信度**：9

---

### 🟡 P2-09 新引入 `cookie-parser` 但代码中未使用（Cookie 迁移半成品，会**翻转** CSRF 结论）

- **分类**：OWASP A01/A05 + 设计隐患（STRIDE: Tampering/Spoofing——**条件性**）
- **位置**：`backend/package.json`（工作区已修改，`dependencies` 新增 `"cookie-parser": "^1.4.7"`，同时补 `db:migrate`/`db:seed-if-empty` 脚本）、`backend/package-lock.json`（同步）
- **证据**：
  - `git status --short backend/package.json backend/package-lock.json` → 两者均为 `M`（已修改，未提交）。
  - `git diff -- backend/package.json` → 新增 `cookie-parser@^1.4.7`。
  - `npm ls cookie-parser`（backend）→ `cookie-parser@1.4.7` 已安装；lockfile 条目含 `resolved`+`integrity`（sha512…）⇒ `npm ci` 可复现。
  - **但** `grep -rn "cookieParser|cookie-parser" backend/src` → **NONE**；且 `grep -rn "res.cookie|req.cookies|httpOnly|sameSite|clearCookie" backend/src` → **无命中**；前端 `grep -rn "withCredentials|credentials:|document.cookie" frontend/src` → **无命中**。
  - `npm audit --omit=dev`（含新依赖）→ **found 0 vulnerabilities**。
- **原理/影响**：
  1. **当前无行为变化**：cookie 认证尚未落地，认证仍是 `Authorization: Bearer` + localStorage ⇒ 本报告 §3#5「CSRF 非现实问题」**对当前代码仍成立**。
  2. **条件性风险（关键）**：`cookie-parser` 的存在表明有人正在推进 **JWT → HttpOnly Cookie**。**一旦 Cookie 认证真正落地**：浏览器会自动携带 Cookie ⇒ **CSRF 立刻变成真实缺口**，届时**必须**同时补齐：CORS `credentials:true` + 精确 `origin`（不可用 `*`）、前端 `credentials:'include'`、Cookie 属性 `HttpOnly+Secure+SameSite=Lax/Strict`、以及 CSRF token（双提交/同步器模式）。**任一项缺失都会引入新的高/中危漏洞。**
  3. 附带：该依赖当前为**未使用依赖**，轻微增加供应链面；两个包文件处于"半提交"状态（`M` 但未提交），**发布前须确认要么完整落地迁移、要么回退**，避免"依赖已加、代码没跟上"的不一致。
- **修复**：
  - 若本次上线**不**做 Cookie 迁移 → 从 `package.json`/lockfile 移除 `cookie-parser`（或明确保留并记录原因），保持现状的 Bearer 认证。
  - 若**要做** → 按上述清单一次性完整落地，并在发布前跑认证冒烟（注册/登录/`/api/auth/me`/SSE 鉴权）与 CSRF 用例；确认 `npm ci` 能复现依赖。
- **置信度**：9（依赖与未使用为客观事实）；迁移后 CSRF 缺口的严重度取决于届时实现，此处标注为条件性
- **备注**：此变更为**并发改动，非安全审计引入**；已与 QA 交叉确认。

---

### 🟡 P2-10 CI 安全门禁被排在会失败的测试步骤之后 ⇒ `npm audit` 实际从不执行

- **分类**：OWASP A08 Software & Data Integrity Failures / A09（安全控制未生效）
- **位置**：`.github/workflows/test.yml:31-39`（步骤顺序：`Install dependencies` → **`Run tests`（`npm test`）** → **`Run security audit`（`npm audit --audit-level=high`）**）；`backend/jest.config.cjs:5,13-20`
- **证据**：
  - `jest.config.cjs` 设 `collectCoverage: true` + `coverageThreshold.global = { branches:60, functions:70, lines:70, statements:70 }` ⇒ 覆盖率不达标时 `npm test` 以**非零退出**。
  - QA 实测当前覆盖率 **statements 67.99 / branches 56.03 / lines 69.03**（< 70/60/70）⇒ **`npm test` 失败退出 1**（QA 独立测量；配合上面的阈值配置可确认该步骤必然失败）。
  - GitHub Actions 步骤**顺序执行、前一步非零退出即中止作业**：`Run tests` 失败 → **`Run security audit` 步骤永远不会执行**，随后的 `Build Docker image`、`Run integration tests` 同样被跳过。
- **原理/影响**：项目**唯一**的依赖漏洞扫描（`npm audit --audit-level=high`）依赖测试步骤成功；而测试当前恒失败 ⇒ **安全扫描形同虚设**。若分支保护未强制 CI 绿，代码仍会合并；即便强制，红 CI 也只是"卡住"，安全审计从未真正跑过。
- **修复**：
  1. 把 `Run security audit` **移到 `Run tests` 之前**，或给它加 `if: always()`（推荐独立 job，`needs` 无关）。
  2. 修复覆盖率缺口（QA 负责）或调整阈值使 `npm test` 恢复绿色；coverage 门禁与安全门禁应解耦。
  3. 建议补充 `gitleaks` 步骤（对应 P0-01/P0-02 的密钥防线）与 `git ls-files | grep -E '(^|/)\.env$'` 守卫。
- **置信度**：9（工作流顺序与 jest 阈值均为静态可见；覆盖率数值来自 QA 实测，本项目下未复跑完整 jest）

---

### 🟢 P3-01 生产镜像混入开发残留脚本与 `app.js.bak`

- **分类**：A05 Security Misconfiguration（信息暴露/攻击面膨胀）
- **位置**：`backend/Dockerfile:16`（`COPY backend/src ./backend/src` 会连带 `backend/src/app.js.bak`、`fix_app.js`、`fix_evolution.js`、`fix_python.js`）
- **证据**：`fix_python.js` 是"用字符串 replace 打补丁"的一次性脚本；`app.js.bak:62` 甚至含被破坏的行 `// 错误处理中间件\`napp.use(errorHandler);`（语法损坏的备份）。这些均非运行所需。
- **可利用性**：低（不在路由中），但 `app.js.bak` 暴露历史实现、增大镜像、增加误用风险。
- **修复**：删除这些文件；`COPY` 改为精确清单或增加 `.dockerignore` 排除 `*.bak`、`fix_*.js`。
- **置信度**：9

---

### 🟢 P3-02 前端 CSP 含 `unsafe-inline` + `unsafe-eval`

- **分类**：OWASP A05
- **位置**：`frontend/nginx.conf:10`、`:46`（`script-src 'self' 'unsafe-inline' 'unsafe-eval'`；`connect-src` 含 `http://localhost:3001`）
- **证据**：CSP 存在（好），但 `unsafe-inline`/`unsafe-eval` 使脚本注入防护基本失效；`connect-src` 含 localhost 仅适配本地。
- **可利用性**：当前前端无 `dangerouslySetInnerHTML`、无用户 HTML 渲染（见 §4），故无可利用的注入点；属纵深防御缺口。
- **修复**：构建期用 nonce/hash 去掉 `unsafe-inline`；移除 `unsafe-eval`（React/Vite 生产构建通常不需要）。
- **置信度**：8

---

### 🟢 P3-03 用户输入直入 LLM 提示词（prompt injection，数据完整性）

- **分类**：OWASP A03 / AI 安全（STRIDE: Tampering）
- **位置**：`service/llm_reasoner.py:112-120/161-166/197-202/235`（`text`/`question`/`dish_info` 直接拼进 prompt）；`backend/src/services/vision/OpenAIVisionProvider.js:16-25`（`imageLabel`/`description` 拼进 prompt）
- **证据**：用户文本未做任何隔离/转义即进入 system/user 提示；LLM 返回再经 `formatRestoredDish`/`formatRestorationResult` 作为菜品内容展示。
- **可利用性**：用户可诱导模型输出偏离内容（伪造"古籍出处"、注入虚假文化断言），影响产品公信力与内容正确性；无 RCE、无越权（输出只作展示文本）。
- **修复**：对进入 prompt 的用户文本做长度/字符约束并置于明确分隔符内；对 LLM 输出做结构校验与白名单字段，不信任其"引用"。
- **置信度**：7

---

### 🟢 P3-04 其他低危/加固项（无独立可利用链）

| 编号 | 内容 | 位置 | 说明 |
|---|---|---|---|
| P3-04a | `AiRunAuditService.appendAuditRecord` 的 `filePath` 由调用方传入 | `services/AiRunAuditService.js:59-64` | 当前调用链（RestorationService.withAudit）未从 HTTP 透传 `auditOptions`，**不可利用**；但若将来把请求数据接入 `auditOptions` 即变任意文件追加。建议白名单化路径。 |
| P3-04b | `User.update(id, updates)` 接受任意字段批量赋值 | `models/User.js:54-60` | 当前无路由调用（grep 无 HTTP 触发点），**不可利用**；建议字段白名单。 |
| P3-04c | 真假非遗答题接口直接回传 `answerId`/`isReal` | `services/LightModeService.js:263-290` | 客户端可读答案 → 游戏可作弊；演示场景影响低。 |
| P3-04d | `star-map` 返回 `backgroundImage`(=manifest `imagePath`) | `services/StarMapService.js:55,124` | 泄露的是项目内静态资源相对路径，非服务器绝对路径；风险很低。 |
| P3-04e | 无登录失败锁定 / 无图形验证码 | `controllers/authController.js:91-142` | 有全局 120/min/IP 限流与 bcrypt 时序均衡，尚可；建议按账号维度限流。 |
| P3-04f | `judgeMode` 仅由 `?demo=judge` 触发 | `frontend/src/lib/judgeMode.js` | 纯前端 UI 开关，无服务端特权，**非越权**；上一轮 #49 可关闭。 |

---

## 3. 上一轮（2026-09-14）问题修复状态核对表

| 上轮# | 问题 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | AGNES API Key 明文硬编码在 `backend/.env` | **部分修复** | 运行配置侧已清空（`backend/.env` 的 `AGNES_API_KEY` 实测为空值）；**但**密钥原文残留于工作区文件 `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:55`（新 P0-01）。该文件**未被 git 跟踪、未进入提交历史、也不在正式发布物内**；因 `docs/**` 未被 `.gitignore` 覆盖，属"误提交前兆"。 |
| 2 | `Dish.search()` SQL LIKE 通配符注入 | **未修复** | `models/Dish.js:37-41` 仍为 `%${keyword}%`，无转义、无 limit（P2-01）。 |
| 4 | JWT 存 localStorage，XSS 可窃取 | **未修复（风险重估）** | `frontend/src/lib/authStore.js:1-42` 仍写 `localStorage`。但全量 grep **未发现** `dangerouslySetInnerHTML`/`eval`/用户 HTML 渲染等可利用 XSS sink（唯一的 `document.write` 在 `PlayExhibit.jsx:342`，其插值经 `offline/lib/certificate.js:3-10` XML 转义）→ 当前无现实窃取链，残余风险降低但架构未改。 |
| 5 | 无 CSRF 防护 | **复核后：当前非现实问题（条件性）** | 认证走 `Authorization: Bearer`（`apiClient.js:6-11`、`auth.js:10-19`），凭证**不随浏览器自动携带**，跨站请求无法附带 token ⇒ 当前设计上豁免 CSRF。**触发条件**：工作区已加入 `cookie-parser`（未使用，见 P2-09），若真正落地 **HttpOnly Cookie 认证**，CSRF 立即成为真实缺口，必须同步补 CSRF token + `credentials` 配置。 |
| 6 | 弱 JWT 密钥硬编码回退值 | **已修复（但被 P0-02 抵消）** | `config/auth.js:2-6`：生产缺失 `JWT_SECRET` 直接 `throw`；硬编码回退值改为非生产的 `'flavor-archaeology-local-demo-secret'`。**然而**真实的强随机密钥被提交进仓库（P0-02）。 |
| 7 | 开发模式泄露堆栈给客户端 | **已修复** | `middleware/errorHandler.js:4-10`：生产返回 `{message:'服务器内部错误'}`，`stack` 仅 `NODE_ENV==='development'` 时附带。 |
| 8 | 错误消息泄露内部信息 | **基本修复（有残留）** | 各 Controller 改为常量消息（如 `authController.js:7-8`、`analyzeController.js:35`）；**残留**在 `routes/api.js:391/473/537` 与 `/health`（P2-06）。 |
| 新 | helmet 安全头 | **已接入** | `app.js:25 app.use(helmet())`；默认含 X-Content-Type-Options/CSP/HSTS/X-Frame-Options 等。nginx 另配一组头（`frontend/nginx.conf:6-10`）。 |
| 新 | 强随机 JWT_SECRET | **做了，但方式错误** | 见 P0-02。 |

---

## 4. 分项核查结论（含"已核查无问题"）

### 4.1 注入（A03）
- **SQL 注入**：**无**。Knex 全参数化；未使用 `whereRaw`/`orderByRaw`/`raw`（grep 无命中）。唯一的模式类问题是 LIKE 通配符（P2-01），非注入可执行代码。
- **命令注入**：**无**。Node→Python 全部经 `child_process.spawn(bin,[script,action,json])`（`PythonBridge.js:28`）与 `execFile(PYTHON_BIN(),[script,'generate_image',inputJson],…)`（`routes/api.js:439/503`），**无 shell、无字符串拼接**；Python 侧 `action` 走白名单（`api_wrapper.py:534-542`）。用户数据仅作为单个 JSON argv。
- **路径遍历**：**无可利用点**。文件读写路径均为 `__dirname` 派生的固定路径（`FragmentService.js:3`、`StarMapService.js:5`、`AiRunAuditService.js:5`、`restoration_engine.py:208-209`）；无 `path.join(...,req.*)` 拼接（grep 无命中）。P3-04a 的 `filePath` 为潜在加固项但当前不可达。
- **LLM 提示注入**：见 P3-03。

### 4.2 认证与越权（A01/A07）
- **JWT 覆盖**：`/api/auth/me`、`/api/analyze/history`、`/api/restore/history`、`/api/teach/history` 均挂 `authenticate`（`routes/auth.js:13`、`analyze.js:10`、`restore.js:10`、`teach.js:10`）。**已核查无遗漏鉴权**——但高成本 AI 端点本应鉴权却未鉴权（P1-01）。
- **IDOR**：**无**。所有涉及用户数据的读取都用服务端 `req.user?.id`（`analyzeController.js:45`、`restoreController.js:45`、`teachController.js:44`、`lightModeController.js:8/32/73`），**不接受客户端传入 userId**（grep `userId = req.(body|query|params)` 无命中）。`/api/recipe/:id`、`/api/star-map/dish/:id`、`/api/fragments/:id` 访问的是公共目录数据。
- **密钥强度/算法**：HS256，`none` 已被拒（主动验证）；生产强制配置。问题在于**签名密钥已随 `backend/.env` 入库**（P0-02）与未固定算法/无吊销（P2-04）。
- **过期**：7 天、无刷新（P2-04）。
- **密码存储**：bcrypt 10 轮（`config/auth.js:12`、`models/User.js:10`）；登录做时序均衡占位哈希（`authController.js:12/105-108`）；返回不含 `password_hash`（`authController.js:125`）。**良好**。

### 4.3 XSS 与前端安全（A03/A07）
- **`dangerouslySetInnerHTML`/`innerHTML`/`eval`**：**未发现**（全量 grep）。唯一 `document.write`（`PlayExhibit.jsx:342`）写入的是经 XML 转义的 SVG（`certificate.js:3-10`），**不可注入** → 已核查无问题。
- **开放重定向 / `javascript:` URL**：**未发现**（`href`/`window.open`/`location` 均为固定值）。
- **Token 存储**：localStorage（`authStore.js`），架构风险仍在（上轮#4）。
- **CSRF**：当前设计上豁免（Bearer header），见上表#5——**但工作区已出现 `cookie-parser`（未使用），若 Cookie 迁移落地则须补 CSRF（P2-09）**。
- **CSP**：存在但含 `unsafe-inline/eval`（P3-02）。

### 4.4 敏感信息泄露（A02/A05/A09）
- **代码内硬编码密钥**：**无**。全仓库 secret 模式扫描仅命中占位符（`README.md` 的 `replace-with-a-long-random-secret`、`scripts/verify-all.ps1` 的 `verify-all-temporary-jwt-secret`、`deliverables/qa-test-cases.md` 的 `test-secret-key-32chars-minimum`）。
- **`backend/.env`**：**被 git 跟踪且在 HEAD 中可读**（P0-02，最严重；`git ls-files` 命中 + `git show HEAD:backend/.env` 可读）。
- **工作区计划文档**：**残留真实 Agnes key**（P0-01）；该文件未跟踪、未进历史、不在发布物内，属"误提交前兆"。
- **正式发布物**：`release/风味考古局-TRAE初赛.zip`（仅 2 文件）密钥扫描 **0 命中**（`sk-*` 均为 CSS 类名误报）⇒ **提交物本身干净**（详见 §0.1）。
- **git 历史**：`git grep "sk-7Tkr" $(git rev-list --all)` **无命中**（该 key 未入库）；但 `b48a6df` 把 `backend/.env` 整体入库（含 JWT_SECRET）。
- **`.env.example`**：根/后端/前端/服务四处**均为占位符**，无真实值。**良好**。
- **日志**：请求日志仅 method/url/status（`app.js:40-47`），不含 body/凭据。**良好**。`PythonBridge.js:82-83` 会把 python stderr 打到服务端日志（含脱敏函数 `sanitizeError` 仅用于回传，不脱敏日志本身）——服务端日志含内部细节，属可接受的运维日志。
- **Dockerfile/nginx**：`backend/Dockerfile` 只 `COPY backend/src`，`.dockerignore` 排除 `.env` ⇒ **真实密钥不会进镜像**（好）；nginx 无凭据。
- **错误响应**：生产通用，残留见 P2-06。

### 4.5 依赖风险（A06）
- 命令（联网实测，registry 可达 `npm ping` PONG 1199ms）：
  - 后端 `npm audit --omit=dev` → **found 0 vulnerabilities**
  - 后端 `npm audit`（含 dev） → **found 0 vulnerabilities**
  - 前端 `npm audit` → **found 0 vulnerabilities**
- 依赖版本较新（express 4.18.2、helmet 8.3.0、jsonwebtoken 9.0.2、knex 3.0.1、react 19.2.6、vite 8）。
- **残留风险**：基础镜像 `node:18-alpine` 已 EOL（P2-08）。CI 已含 `npm audit --audit-level=high`（`.github/workflows/test.yml`）。
- **变更后复测**：工作区新增 `cookie-parser@1.4.7`（P2-09）后**重跑** `npm audit --omit=dev` → **仍 0 漏洞**；lockfile 含 `resolved`+`integrity`，`npm ci` 可复现。

### 4.6 配置与部署安全
- **CORS**：生产必须配置 `CORS_ORIGIN` 否则抛错（`runtime.js:1-7`）；未使用 `*` + `credentials` 组合（`app.js:27-31` 未开 credentials）。**良好**。
- **安全响应头**：helmet 默认组 + nginx 组齐备；CSP 有 `unsafe-*` 缺口（P3-02）。
- **限流**：全局 120/min/IP；可被 `RATE_LIMIT_DISABLED=true` 关闭（运维开关，非漏洞）；Map 无界增长（P2-03）。
- **容器非 root**：`backend/Dockerfile:18-27` 创建 `nodejs` 用户并 `USER nodejs`。**良好**。前端 nginx 官方镜像默认 root master + worker（常规）。
- **端口暴露**：仅 `frontend:5173->80` 对外；后端 `expose` 内部。**良好**。
- **`TRUST_PROXY_HOPS`**：默认 0（不信任），compose 设 1 且 Nginx 注入 XFF ⇒ 配置正确，未见 XFF 伪造风险。
- **SQLite 权限/备份**：库文件位于 `backend/data`（docker 卷），未设 600；`.gitignore` 缺规则（P2-05）；`.github/workflows/backup.yml` 每日备份并上传 artifact（含用户哈希，retention 30 天）——建议确认 artifact 访问权限。
- **正式发布物隔离**：`release/风味考古局-TRAE初赛.zip` 仅含离线 HTML + 使用说明，**不含** `.env` / `backend/` / `docs/`；密钥扫描 0 命中 ⇒ **比赛提交物本身安全**（§0.1）。但仓库**工作区**不受此保护：`.gitignore` 未覆盖 `docs/**`（P0-01 的误提交面）与 `backend/data/**`（P2-05）。
- **CI 安全门禁有效性**：`.github/workflows/test.yml` 把 `npm audit` 排在会失败的 `npm test` 之后 ⇒ 审计步骤实际从不执行（P2-10）；且 CI 触发分支为 `main/develop`，当前发布分支 `feat/trae-offline-museum` **不在触发范围内**（另有绕过风险）。
- **部署完整性缺口（供团队参考，非安全阻塞）**：`backend/Dockerfile` 仅 `COPY backend/src`，**未复制 `service/`（Python 引擎）与仓库根 `data/`（知识图谱 JSON）**，而 `PythonBridge.js:19` 与 `service/*.py` 依赖这些路径 ⇒ 容器内 Python 链路可能整体不可用（影响 analyze/restore/star-map/teach/evolution 的可用性）。**建议与产品评审员/QA 交叉确认。**

### 4.7 SSRF / 外部调用（A10）— ✅ 通过
- `PythonBridge`、`AgnesImageService`、`OpenAIVisionProvider`、`llm_reasoner` 的出站 URL **全部来自环境变量或硬编码常量**，**无用户可控 host/URL**（grep `fetch(|urllib|requests` 无用户输入流入）。
- 有超时：`fetchWithTimeout.js`（AbortController + race，30s）、`urllib.request.urlopen(..., timeout=30/60)`、`PythonBridge` 30s 且 stdout/stderr 有 1MB 上限（`PythonBridge.js:5,56-76`）。**良好**。

### 4.8 STRIDE 威胁模型

核心资产：用户凭据（bcrypt 哈希 + JWT）、菜谱/收藏/抽卡数据、AI 推理接口、图片生成配额。

| STRIDE | 威胁场景（本项目） | 风险 | 现有缓解 | 建议 |
|---|---|---|---|---|
| **S**poofing | 用泄露的 JWT_SECRET 伪造任意 `userId` 令牌 | **高** | HS256、生产强制密钥、`none` 已拒 | **轮换密钥、清历史（P0-02）**；固定算法 + refresh + tokenVersion（P2-04） |
| **T**ampering | 篡改 `date`/`seed` 绕过每日抽卡；prompt 注入篡改 AI 输出 | 中 | 唯一约束兜底 | 服务端日期强制 + 原子计数（P2-02）；prompt 隔离与输出校验（P3-03） |
| **R**epudiation | AI 运行无强绑定用户的操作留痕；`RESTORATION` 审计仅存 hash | 中低 | `AiRunAuditService` jsonl 记录 inputHash/outputHash/provider/model/latency | 审计记录绑定 `userId`、落库（而非仅本地 jsonl）、防篡改存储 |
| **I**nformation Disclosure | 密钥落盘/入库；`/health` 与内联错误暴露内部配置；DB 误提交 | **高→中** | 生产通用错误、`.dockerignore` | 处置 P0-01/P0-02；精简 `/health`（P2-06）；补充 DB ignore（P2-05） |
| **D**enial of Service | 未认证 AI 端点刷账单；SSE 长连接；限流 Map 无界；10MB body；LIKE 全表 | 中高 | 120/min/IP 限流、输出 1MB 上限、Python 30s 超时 | AI 端点鉴权+配额（P1-01）、Map 清扫（P2-03）、body 降限（P2-07）、SSE 超时 |
| **E**levation of Privilege | 借助伪造 JWT 获得任意用户/管理员权限 | **高** | `authenticate` 校验用户存在 | 同 Spoofing 修复；确认无隐藏 admin 路由（当前无 RBAC，见下） |

**RBAC 说明**：项目目前**无角色体系**（`middleware/auth.js` 仅认证不授权，无 admin 路由），因此不存在"提权到 admin"的既有路径；E 类风险当前等价于"冒充任意普通用户"，但仍属高危（可读写该用户全部历史/收藏）。

---

## 5. OWASP Top 10 (2021) 检查表

| 编号 | 类别 | 判定 | 依据 |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ 部分 | IDOR 无（服务端取 `req.user.id`）；但**未认证的 AI 端点**（P1-01）与**抽卡 date 绕过**（P2-02）属访问控制缺陷 |
| A02 | Cryptographic Failures | ❌ 不通过 | 真实 Agnes key 落盘（P0-01）、含 JWT_SECRET 的 .env 入库（P0-02）；JWT 未固定算法/无吊销（P2-04）。正面：bcrypt、HS256、传输走 HTTPS 由前置层承担 |
| A03 | Injection | ⚠️ 部分 | SQLi/命令注入/路径遍历**均无**；LIKE 通配符未转义（P2-01）、prompt 注入（P3-03） |
| A04 | Insecure Design | ⚠️ 部分 | 缺 AI 端点配额、SSE 无超时、每日次数未服务端强约束、限流 Map 无界；正面：降级模式下有 placeholder 兜底设计 |
| A05 | Security Misconfiguration | ⚠️ 部分 | helmet/CORS 生产强制/非 root 容器**到位**；但 CSP `unsafe-*`（P3-02）、dev 产物入镜像（P3-01）、`/health` 暴露（P2-06）、10MB body（P2-07） |
| A06 | Vulnerable & Outdated Components | ⚠️ 部分 | `npm audit` 前后端 0 漏洞；基础镜像 `node:18-alpine` 已 EOL（P2-08） |
| A07 | Identification & Authentication Failures | ⚠️ 部分 | bcrypt 10 轮、时序均衡、通用错误、生产强制密钥**良好**；但签名密钥已泄露（P0-02）、7 天不可吊销、无登录锁定（P2-04/03-04e） |
| A08 | Software & Data Integrity Failures | ⚠️ 部分 | CI 有 `npm audit`、有 lockfile；但 secret 入库（P0-02）、无镜像签名、未启用依赖完整性校验 |
| A09 | Security Logging & Monitoring Failures | ⚠️ 部分 | 有请求日志与 AI run 审计；但无安全事件（认证失败/越权）专项日志与告警、审计文件未轮转/未绑定用户 |
| A10 | Server-Side Request Forgery | ✅ 通过 | 无用户可控出站 URL；上游 URL 源自 env；`fetchWithTimeout` + Python 输出/超时上限齐备 |

**通过率**：1 通过 / 7 部分 / 2 不通过（A02、A01/A07 的核心问题同源）。

---

## 6. 修复优先级路线图

**上线/push 前（阻断）**
1. 轮换 Agnes key，并删除 `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:55` 的密钥原文；补 `.gitignore`/CI secret 扫描防线（P0-01）。
2. `git rm --cached backend/.env` → 提交 → `git filter-repo`/BFG 清洗 `b48a6df` 的 blob → 强制推送 → **轮换 `JWT_SECRET` 及该文件内所有第三方 Key**（P0-02；保持 compose 的 fail-fast 不变）。
3. 给 `/api/analyze-stream`、`/api/generate-image` 加鉴权与配额（P1-01）。
4. 确认可发布的是 `release/…zip`（提交物已扫描干净，§0.1）；自托管路径在上述 1–3 完成前不得对外。
5. 处置 `cookie-parser` 半成品（P2-09）：要么**完整落地** Cookie 认证（同步补 CSRF token + CORS `credentials` + `SameSite/Secure/HttpOnly`）并回归认证冒烟，要么**回退**该依赖——不要"依赖已加、代码没跟上"地上线。

**上线当周**
4. LIKE 转义 + 结果分页（P2-01）；服务端强制抽卡日期 + 事务原子计数（P2-02）。
5. 限流 Map 清扫/上限（P2-03）；JWT 固定算法 + refresh/tokenVersion（P2-04）。
6. `.gitignore` 补 `backend/data/`、`*.db`、`*.jsonl`（P2-05）；精简 `/health` 与内联错误（P2-06）。
7. 与团队确认 Docker 镜像缺 `service/`、`data/` 的可用性影响（§4.6 尾部）。
8. 修复 CI 门禁：`npm audit` 前置/独立 job（P2-10）；CI 触发分支纳入发布分支；补 gitleaks 与 `.env` 守卫（P0-01/P0-02 防线）。

**迭代内**
8. 基础镜像升级 node:22（P2-08）；清理 dev 残留文件与 `.bak`（P3-01）；CSP 去 `unsafe-*`（P3-02）；prompt 隔离（P3-03）；清理 P3-04 加固项。

---

## 7. 证据索引（关键命令输出摘要）

- `git ls-files | grep -iE "(^|/)\.env$"` → 含 `backend/.env`（已跟踪）
- `git ls-files "docs/superpowers/plans/2026-09-14-deploy-check-fixes.md"` → **空**；`git status --short` → `??`（未跟踪）
- `git check-ignore -v docs/superpowers/plans/2026-09-14-deploy-check-fixes.md` → **无输出**（未被 .gitignore 覆盖）
- `grep -rc "sk-7Tkr" docs/` → `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:2`（唯一命中文件）
- `git grep "sk-7Tkr" $(git rev-list --all | head -50)` → **无命中**（未进 git 历史）
- `git log --all --oneline -- backend/.env` → 仅 `b48a6df security: set strong random JWT_SECRET`
- `git show HEAD:backend/.env`（值已脱敏）→ 键含 `JWT_SECRET(len=32)`、`AI_API_KEY(len=12,prefix=moc)`、`AGNES_API_KEY(空)`
- 本机 `backend/.env` 敏感键状态：`JWT_SECRET`=有值(32)、`AI_API_KEY`=有值(12,mock 占位)、`AGNES_API_KEY`=空值（无明文回传）
- `git branch --contains b48a6df` → `* feat/trae-offline-museum`；`origin/main`=Initial commit（未 push）
- JWT PoC：`alg=none` → rejected；以仓库内密钥签名 token → `verify ok, userId=1`；默认 alg=HS256
- 工作区 Grep `sk-[A-Za-z0-9]{8,}` → 命中 `docs/superpowers/plans/2026-09-14-deploy-check-fixes.md:55`
- 发布物 `release/风味考古局-TRAE初赛.zip` → 仅 2 文件（`使用说明.txt` 366B + `风味考古局-离线体验.html` 2058152B）；发布物 Grep `sk-[A-Za-z0-9]{10}|AGNES_API_KEY|JWT_SECRET|OPENAI_API_KEY|AI_API_KEY|Bearer …` → **0 命中**；`sk-*` 均为 CSS 类名（`sk-content/sk-list/sk-kicker/sk-feedback/sk-source/sk-actions`）
- Grep `dangerouslySetInnerHTML|innerHTML|eval(|new Function|document.write` → 仅 `PlayExhibit.jsx:342`（经转义，安全）
- Grep `whereRaw|orderByRaw|raw(|exec(|spawnSync` → 无（仅 `spawn` in PythonBridge）
- Grep `fetch(|axios|http(s).get` in backend/src → 仅测试文件
- `npm audit`（后端 omit=dev / 后端 全 / 前端）→ 均 `found 0 vulnerabilities`；`npm ping`→PONG
- `npm audit --omit=dev`（新增 cookie-parser 后复测）→ 仍 `found 0 vulnerabilities`
- `git status --short backend/package.json backend/package-lock.json` → 均为 `M`；`git diff` 新增 `cookie-parser@^1.4.7`
- `npm ls cookie-parser`（backend）→ `cookie-parser@1.4.7` 已装；lockfile 条目含 `resolved`+`integrity`
- `grep -rn "cookieParser|res.cookie|req.cookies|httpOnly|sameSite" backend/src` → **无命中**（依赖已加、代码未用，P2-09）
- `git ls-tree -r origin/main | grep -i env` → 仅 `*.env.example`（远程无 .env，与 QA 一致）
- `backend/jest.config.cjs:5,13-20` → `collectCoverage:true` + `coverageThreshold{statements:70,branches:60,functions:70,lines:70}`
- `.github/workflows/test.yml:31-39` → 步骤顺序 `npm test` **先于** `npm audit --audit-level=high`，前步失败即中止（P2-10）
- 绝对路径校验：`routes/api.js` 的 `PYTHON_SCRIPT` 实际解析为 `D:\systemDir\Desktop\service\api_wrapper.py`（**不存在**，应为 `风味考古局/service/...`）→ 本地生图兜底路径必然失败（功能性缺陷，P3 级，已告知团队）

---

> 本报告为上线前安全检查的原始产出，所有结论基于实际读到的代码与命令输出；不确定项已显式标注。密钥类内容一律仅记录位置、不记录明文。
