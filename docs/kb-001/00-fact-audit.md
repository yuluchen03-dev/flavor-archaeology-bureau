# KB-001 前置仓库事实审计（FACT_AUDIT）

- 审计对象：`D:\systemDir\Desktop\风味考古局`
- 审计方式：只读检查 + 实际执行基线命令（命令与退出码见第 4 节）
- 审计时点：KB-001 任何改动之前
- 审计结论：**未修改任何仓库文件**；本文件是审计期间新增的唯一文档

> 本文件只记录**已实际核实**的事实。未核实的项目在第 7 节明确标出，不作为结论使用。
> 此前会话中提到的菜品数量、关系数量、文件规模、依赖版本，凡与本文件不一致的，以本文件为准。

---

## 1. 已确认事实及对应文件位置

### 1.1 项目规则文件

| 项 | 结论 | 位置 |
|---|---|---|
| `AGENTS.md` | **不存在**（全仓库递归搜索，含未跟踪文件，排除 `node_modules`） | — |
| `CLAUDE.md` / `GEMINI.md` / `.cursorrules` | **不存在** | — |
| 项目长期记忆与规范 | 存在 | `.workbuddy/memory/MEMORY.md`、`.workbuddy/memory/2026-09-14.md`、`.workbuddy/memory/2026-09-25.md` |
| 历史计划/设计文档 | 存在（15 个 plan + 5 个 spec） | `docs/superpowers/plans/`、`docs/superpowers/specs/` |
| 既有交付报告 | 存在 | `deliverables/`（`qa-test-cases.md`、`test-report-2026-09-25.md`、`gstack/`、`engineering-assurance/`） |

`.workbuddy/memory/MEMORY.md` 中的关键约束（对本轮有直接影响）：

1. **发布门禁看退出码，不看用例数** —— 历史上出现过"全绿但退出码 1"。
2. 前端测试多为**源码正则断言**；改文案/标签会连带打破断言。
3. `verify_offline_bundle.mjs` 的 `REQUIRED_LABELS` 会因 UI 改名而失效。
4. **密钥类内容勿写入 `docs/`**（`.gitignore` 覆盖不到 `docs/**`）。
5. **多会话并发操作同一工作树会导致审计快照漂移**。

### 1.2 Git 状态

| 项 | 值 |
|---|---|
| 当前分支 | `feat/trae-offline-museum` |
| 本地分支 | `codex/product-hardening`、`feat/offline-museum-optimization`、`feat/trae-offline-museum`(*)、`feature/offline-trae-museum`、`main` |
| 远端 | `origin` = `https://github.com/yuluchen03-dev/flavor-archaeology-bureau.git`（**注意：与用户提供的参考仓库 `chenfei462/flavor-archaeology-bureau-public` 不是同一地址**） |
| 最近提交 | `11e3654 test: add integration tests for core routes` |
| 工作区 | **存在大量未提交改动**：约 20 个已修改文件 + 大量 PNG→WebP 重命名（已暂存 `D`/`A`）+ 38 个未跟踪条目 |
| stash | 空 |

**未提交改动的关键文件（必须保护，不得覆盖/回退）**：

- `backend/src/app.js`、`backend/src/routes/api.js`、`backend/src/models/Dish.js`、`backend/src/services/*`（`CollectionService.js`、`PythonBridge.js`、`StarMapService.js`）
- `backend/src/config/runtime.js`、`backend/src/middleware/auth.js`、`backend/src/controllers/authController.js`
- `backend/package.json`、`backend/package-lock.json`、`backend/Dockerfile`、`backend/.env`
- `.github/workflows/test.yml`、`.dockerignore`、`.env.example`
- `data/visual_assets/dish_backgrounds.json`
- `frontend/Dockerfile`、`frontend/.env.example`、`frontend/public/dish-backgrounds/*.png→*.webp`

**本轮保护红线**：不执行 `git reset --hard`、不清理未跟踪文件、不 `git checkout --` 覆盖、不删除旧数据、不 push、不合并 `main`、不部署。

### 1.3 目录结构与技术栈

| 层 | 技术 | 入口 |
|---|---|---|
| 前端 | React 19 + Vite + Tailwind（`frontend/package.json`） | `frontend/src/main.jsx`、`frontend/src/App.jsx` |
| 后端 | Node.js + Express 4 + Knex 3 + SQLite3 + JWT + helmet（端口 3001） | `backend/src/app.js` |
| Python 服务 | 标准库实现（`service/requirements.txt` 仅注释，无第三方依赖） | `service/api_wrapper.py` |
| 数据 | 仓库根 `data/**/*.json` | 见 1.5 |

**根目录不存在 `package.json`**。所有 Node 脚本以 `node scripts/xxx.mjs` 从仓库根执行。

工具链实测版本：Node `v24.15.0`、npm `11.12.1`、Python `3.11.9`、Docker `29.5.2`、Docker Compose `v5.1.4`。

### 1.4 前端 / Express / Python 之间的实际调用关系

```
React 前端 ──HTTP──> Express API (backend/src/routes/*)
                          │
                          ├── services/*.js ──require()──> data/knowledge_graph/nodes_dish.json 等
                          │
                          └── PythonBridge.js ──spawn(argv 数组)──> service/api_wrapper.py
                                                                        │
                                                                        └── service/knowledge_graph.py ──> data/**
```

已确认事实：

- `backend/src/services/PythonBridge.js` 以 `spawn` + 数组 argv 调用 Python，**不经 shell**。
- **Node 后端只读取 `data/knowledge_graph/nodes_dish.json` 一个图谱节点文件**。已 grep 确认 `backend/src` 中不存在对 `relationships.json`、`schema.json`、`nodes_ingredient.json`、`nodes_technique.json`、`nodes_dynasty.json`、`nodes_region.json`、`nodes_season.json`、`nodes_ancient_text.json`、`expert_review_manifest.json`、`data/recipes/`、`data/literature/` 的任何引用。
- 图谱关系与全部出处数据**只经 Python 侧**（`PythonBridge` → `api_wrapper.py` → `knowledge_graph.py`）可达。
- 生产代码中的数据读取点：

| 文件:行 | 读取目标 | 错误处理 |
|---|---|---|
| `backend/src/services/LightModeService.js:3` | `data/knowledge_graph/nodes_dish.json` | 无（模块顶层 `require`） |
| `backend/src/services/LightModeService.js:4-5` | `data/light_mode/fake_dishes.json`、`quiz_real_dishes.json` | 无 |
| `backend/src/services/VisionService.js:3` | `data/knowledge_graph/nodes_dish.json` | 无 |
| `backend/src/services/vision/VisionCandidateMapper.js:3` | `data/knowledge_graph/nodes_dish.json` | 无 |
| `backend/src/services/FragmentService.js:3` | `data/fragments/ancient_fragments.json` | 无 |
| `backend/src/services/StarMapService.js:5,11-35` | `data/visual_assets/dish_backgrounds.json` | **有** `try/catch` → 降级空 `Map`，按 mtime 缓存 |

- **两个不同的 `data` 目录必须区分**：
  - 仓库根 `data/` —— 知识图谱与内容 JSON（上述服务读取）
  - `backend/data/` —— 运行时数据：SQLite（`backend/src/config/database.js`）、`ai-runs.jsonl`（`backend/src/services/AiRunAuditService.js:5`）
- `service/knowledge_graph.py:27-35` 使用**硬编码的 7 个文件名映射**，未使用 `os.listdir` 自动发现。
- `service/knowledge_graph.py` **没有 `json.load` 的异常隔离**，仅用 `os.path.exists` 守卫；文件存在但损坏会直接抛异常。

### 1.5 当前知识库节点、关系、来源字段与引用格式

**`data/knowledge_graph/schema.json`（180 行，v1）**

- 顶层键：`version`（`"1.0.0"`）、`description`、`node_types`、`relationship_types`
- 7 种节点类型：`ingredient`、`dish`、`technique`、`dynasty`、`region`、`season`、`ancient_text`
- 10 种关系类型：`contains`、`uses_technique`、`originated_in`、`popular_in`、`recorded_in`、`seasonal_for`、`ingredient_from`、`ingredient_season`、`technique_from`、`substitute_for`
- **关键：这不是可执行的 JSON Schema。** 全文**不含 `"required"` 关键字**，字段以中文字符串散文形式列在 `properties` 下（如 `"id": "string - 唯一标识"`）。必填性只硬编码在 `scripts/verify_graph_schema.mjs` 里。
- **schema 与实际数据已漂移（2 处）**：`ingredient.nutrition` 已声明但 16/16 记录全部缺失；`dish.flavor_profile` 40/40 记录均存在但 schema 未声明。

**节点数据（全部为顶层数组）**

| 文件 | 条数 | 出处字段 |
|---|---|---|
| `nodes_dish.json` | 40 | ✅ `source_text` + `source_passage`（40/40） |
| `nodes_ancient_text.json` | 108 | ⚠️ **两种字段集**：旧 5 条（`text_001`–`text_005`）**完全没有出处字段**；新 103 条（`text_lit_*`）含 `source_url`/`catalog_url`/`authority_institution`/`verification_note` |
| `nodes_ingredient.json` | 16 | ❌ 无 |
| `nodes_technique.json` | 10 | ❌ 无 |
| `nodes_dynasty.json` | 7 | ❌ 无 |
| `nodes_region.json` | 5 | ❌ 无 |
| `nodes_season.json` | 7 | ❌ 无 |

节点合计 **193**，关系 **49**（`relationships.json` 为数组）。

**`relationships.json` 实际使用的类型分布（共 8 种，49 条）**：
`contains` 10、`originated_in` 10、`uses_technique` 9、`recorded_in` 9、`technique_from` 4、`substitute_for` 3、`popular_in` 2、`seasonal_for` 2。
schema 声明但**从未使用**：`ingredient_from`、`ingredient_season`。
关系仅覆盖 `dish_001`–`dish_010`（共 40 个菜品）。

**ID 命名约定**：`dish_NNN`、`ing_NNN`、`tech_NNN`、`dynasty_NNN`、`region_NNN`、`season_NNN`、`text_NNN`（旧）/ `text_lit_NNN`（新）。

**其他数据文件**

| 文件 | 形状 | 数量 | 出处字段 |
|---|---|---|---|
| `data/recipes/ancient_recipes.json` | 数组 | 5 | ✅ `source` + `original_text` |
| `data/fragments/ancient_fragments.json` | 数组 | 8 | ⚠️ 仅 `source`（书名，无卷/页）；字段名用**驼峰** `relatedDishId` |
| `data/ingredients/ingredient_mapping.json` | 对象 | `mappings` 8 + `extinct_techniques` 2 | ❌ 无 |
| `data/techniques/intangible_heritage.json` | 对象 | `categories` 3 → `techniques` 共 8 | ❌ 无（`level`「国家级非遗」为无引证断言） |
| `data/literature/authoritative_recipe_texts.json` | 对象 | `items` 106 + `sources` 3 | ✅ `authority.*`（106/106） |

`authoritative_recipe_texts.json` 逐项核对：book ✅ 有；**edition ❌ 不存在**；**passage ❌ 不存在**（`included_texts` 粒度是「册/种」）；**page ❌ 不存在**；`total_recipes` **106/106 全为 `null`**。

**review_status / confidence 现状**

- **7 个节点文件全部没有 `review_status`、`confidence`、`verification` 字段**；全 `data/**/*.json` 键名枚举显示**不存在 `confidence` 键**。
- 唯一评审元数据载体：`data/knowledge_graph/expert_review_manifest.json`（`review_status_values: ["internal_reviewed","pending_external_expert"]`，`flagship_nodes` 4 条 + `flagship_citations` 2 条）。
- 覆盖率 **4/193 = 2.1%**；`reviewer` 全部是字符串 `"Internal research lead"`（非具名专家）；2 条 citation 全部 `pending_external_expert`；文件自述 *"This is not a claim of completed external expert sign-off."*

### 1.6 数据加载、检索、复原、拒答、评分与 citation 实现

| 能力 | 实现位置 | 已确认事实 |
|---|---|---|
| 图谱加载 | `service/knowledge_graph.py:22-59` | 硬编码 7 个节点文件 + `relationships.json` + `recipes/ancient_recipes.json`；单例 `get_knowledge_graph()`（:209） |
| 检索 | `service/knowledge_graph.py:105-113` | `search_by_name` 为**纯子串匹配**（`name`/`dish_name`/`title` + `aliases`）；**无向量、无索引** |
| 复原 | `service/restoration_engine.py` | 依赖 `self.kg`（:20） |
| 拒答 | `backend/src/routes/api.js:281-343`、`backend/src/services/RestorationService.js:8-38` | `buildInsufficientDish` / `buildInsufficientEvidenceResult`；返回 `evidenceStatus: 'insufficient'`、`evidenceScore: 0`、`needsMoreClues: true` |
| 评分 | `backend/src/services/RestorationService.js:53-98`、`backend/src/routes/api.js:93-141` | `calculateEvidenceScore` 由 `clueMatch`/`sourceMatch`/`ingredientMatch`/`techniqueMatch` 加权；`clampEvidenceScore` 限幅 |
| citation | `backend/src/services/RestorationService.js:100-102` | `extractCitationIds(citations)`；`service/restoration_engine.py:258` 生成 `internal:data/knowledge_graph/nodes_ancient_text.json#<id>` 形式的内部引用 |

### 1.7 已有 Schema、校验器、兼容层、测试与未完成工作

**已有校验器（全部在 `scripts/`，均为 `.mjs`，均从仓库根执行）**

| 脚本 | 职责 | 退出码 |
|---|---|---|
| `scripts/verify_graph_schema.mjs` | 图谱结构校验（端点存在性、关系类型合法性、端点类型匹配、`recorded_in` 出处元数据、dish 出处、manifest 评审字段） | 0 通过 / 1 校验失败 / 2 未捕获异常 |
| `scripts/verify_literature_dataset.mjs` | 文献数据集校验（≥100 条、id/title 唯一、authority 字段齐全） | 0 / 抛异常 |
| `scripts/verify_knowledge_graph_coverage.mjs` | 4 类核心关系覆盖率报告 | 0 |
| `scripts/verify_asset_budget.mjs` | 前端背景图体积预算 | 0 |
| `scripts/verify_offline_bundle.mjs` | 离线单文件包校验 | 0 / 非 0 |
| `scripts/verify_offline_ui.mjs` | 离线 UI 校验 | 0 / 非 0 |
| `scripts/verify_trae_submission.mjs` | 提交物校验 | 0 / 非 0 |

**已确认的校验器覆盖盲区（对本轮设计有直接约束）**

1. `verify_graph_schema.mjs:297` 用 `readdirSync(graphDir)` + 正则 `/^nodes_.+\.json$/` **自动发现**节点类型。→ **任何新增的 V2 节点文件若放入 `data/knowledge_graph/` 并命名为 `nodes_*.json`，会被当作新节点类型载入，可能导致 V1 门禁行为改变。**
2. `verify_graph_schema.mjs:262-266` 的出处强制**只对 `type === 'dish'` 生效**；5 个无出处的旧古籍节点 `text_001`–`text_005` 能通过校验。
3. `verify_literature_dataset.mjs` 的「≥100」阈值**掩盖了 3 条权威条目的出处丢失**（见 1.7 末）。
4. **无兼容层**：不存在任何 V1→V2 适配、版本协商或双读路径代码。

**测试资产**

| 套件 | 位置 | 基线结果 |
|---|---|---|
| 后端 Jest | `backend/src/**/__tests__/*.test.js`（43 套件） | 213 通过 / 0 失败 |
| 前端 node:test | `frontend/src/**/*.test.mjs`（含 `pages/__tests__`、`offline/__tests__`） | 153 通过 / 0 失败 |
| Python unittest | `service/test_*.py`（3 个文件） | 9 通过 / 0 失败 |
| 脚本 node:test | `scripts/__tests__/*.test.mjs`（7 个文件） | **27 通过 / 7 失败（基线已存在）** |

**未完成工作（已确认存在的既有缺陷）**

- `text_lit_001`–`text_lit_106` **缺 `text_lit_076`、`text_lit_084`、`text_lit_097`**。根因已定位：`scripts/build_literature_dataset.mjs:237` 按 `title` 去重，丢弃了 `lit_ccs_006 随园食单`、`lit_ccs_014 山家清供`、`lit_ccs_027 饮膳正要`，这 3 条权威条目的出处元数据在图中不可达（仅由无出处的旧节点代表）。

  > **勘误（KB-001A 阶段核实后修正）**：本条初稿把第 3 条误写为 `齐民要术`。经复核 `nodes_ancient_text.json` 的旧节点标题（`text_001` 山家清供、`text_002` 随园食单、`text_003` 齐民要术、`text_004` 饮膳正要、`text_005` 东京梦华录）与 `lit.items` 的 title 交集，实际被同名去重丢弃的是 **`lit_ccs_027 饮膳正要`**（对应 `text_lit_097`）。`齐民要术` 在 `lit.items` 中的条目标题是 `齐民要术·饮食部分`（`lit_ccs_011`），与旧节点标题 `齐民要术` 不完全相等，故未被去重丢弃。同时核实：`lit.items` 的 `authority.source_id` 只引用了 `sources[]` 中的 **2** 个（`src_ancient_food_literature_collection_2021`、`src_chinese_cooking_classics_series`），第 3 个 `src_china_food_culture_classics_2025` 未被任何条目引用。
- `deliverables/gstack/pre-launch-check-2026-09-25.md` 结论为 🔴 No-Go（6 项 P0）——**本轮不处理**，属范围外。

### 1.8 原有演示路径与可运行基线

| 演示入口 | 命令 |
|---|---|
| 一键启动 | `powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1` |
| 停止 | `powershell -ExecutionPolicy Bypass -File scripts/stop-demo.ps1` |
| 演示栈检查 | `powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1` |
| 全量质量门 | `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1` |
| Docker | `docker compose up --build`（前端 5173 / 后端 3001） |
| 离线单文件产物 | `scripts/package_trae_submission.ps1` → `release/风味考古局-TRAE初赛/风味考古局-离线体验.html` |

`scripts/verify-all.ps1` 串联步骤（:50-165）：后端 Jest → 前端 lint → 前端 test（有则跑）→ 前端 build → Python unittest → 文献数据集校验 → 图谱 schema 校验 → 图谱覆盖率报告 → 资产预算 → `docker compose config`。

**CI**：`.github/workflows/test.yml`，仅 `push` 到 `main`/`develop` 与 `PR` 到 `main` 时触发；只跑 `backend` 的 `npm test` + `npm audit` + `docker compose build` + 健康检查集成测试。**当前分支 `feat/trae-offline-museum` 不在触发范围内**；CI 中**没有**任何图谱/文献 Schema 校验步骤。

---

## 2. 与此前方案不一致的地方

| 此前说法 | 实际核实结果 |
|---|---|
| 存在 `AGENTS.md` 项目规则文件 | **不存在**。规则实际在 `.workbuddy/memory/MEMORY.md` |
| 参考仓库 `chenfei462/flavor-archaeology-bureau-public` | 本地 `origin` 指向 **`yuluchen03-dev/flavor-archaeology-bureau.git`**，地址不同 |
| 项目为单一 `data/knowledge_graph` 数据层 | 存在**两个不同的 `data` 目录**：仓库根 `data/`（内容 JSON）与 `backend/data/`（SQLite 运行时） |
| 已有「Schema」可直接扩展 | 现有 `schema.json` **不是可执行 JSON Schema**，无 `required`，必填性硬编码在 JS 校验器里，且已与数据漂移 |
| 图谱数据被后端与 Python 共同消费 | **Node 后端只读 `nodes_dish.json`**；关系与出处数据仅经 Python 侧可达 |
| 古籍节点均有权威出处 | 108 个古籍节点中 **5 个（`text_001`–`text_005`）完全没有出处字段** |
| 评审元数据已覆盖知识库 | 覆盖率仅 **4/193 = 2.1%**，且外部专家签核明确标注为未完成 |
| 新增 `data/knowledge_graph/nodes_*.json` 是安全的扩展方式 | **不安全**：`verify_graph_schema.mjs:297` 会自动把 `nodes_*.json` 当作新节点类型载入 |

---

## 3. 当前阻塞与风险

| # | 风险/阻塞 | 级别 | 说明与缓解 |
|---|---|---|---|
| R1 | `scripts/__tests__` 基线已有 **7 个失败** | 高 | 与 KB-001 无关（详见 4.2）。**不得修复、不得掩盖、不得删除负例**；本轮只做基线对比，区分"基线已存在"与"本轮引入" |
| R2 | 工作区有大量未提交改动（含 `.github/workflows/test.yml`、`backend/package.json`） | 高 | 严格限定各任务写入范围；禁止 `reset --hard`/`checkout --`/清理未跟踪文件 |
| R3 | `verify_graph_schema.mjs` 自动发现 `data/knowledge_graph/nodes_*.json` | 高 | KB-001 的 V2 数据**不得**写入 `data/knowledge_graph/`，必须使用独立目录 |
| R4 | 后端 `require()` 在模块顶层加载数据文件，无错误处理 | 中 | 本轮**不修改**既有读取路径；新增校验器独立运行 |
| R5 | 前端测试是源码正则断言，且离线包有 `REQUIRED_LABELS` 门禁 | 中 | 本轮**禁止 UI 改版**，前端只做只读分析 |
| R6 | `.gitignore` 覆盖不到 `docs/**`；历史上曾把真实 Key 写进 docs | 中 | 本轮所有新增文档**禁止写入任何密钥或 `.env` 值** |
| R7 | `backend/.env` 存在于工作区（含 `JWT_SECRET`、`AGNES_API_KEY` 等键名） | 中 | 任何成员**不得读取/输出/复制 `.env` 的值**；只允许核对键名 |
| R8 | 无根 `package.json`，Node 脚本无统一 npm 入口 | 低 | 校验器以 `node scripts/kb/*.mjs` 从仓库根执行；如需接入 CI，只做最小追加 |
| R9 | 多成员共享同一工作目录，角色名不是文件锁 | 中 | 每个任务显式声明 `inScope`/`outOfScope`；同一文件不得由两个成员同时修改 |

---

## 4. 基线命令、退出码与结果

### 4.1 通过的基线（本轮改动前实测）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| B1 | `node scripts/verify_graph_schema.mjs` | **0** | `ok: true`，`nodeCount 193`，`relationshipCount 49`，`validRelationshipTypes 10`，`flagshipNodeCount 4`，`flagshipCitationCount 2` |
| B2 | `node scripts/verify_literature_dataset.mjs` | **0** | `Verified 106 authoritative literature entries.` / `Verified 103 authority-backed ancient_text nodes.` |
| B3 | `node scripts/verify_knowledge_graph_coverage.mjs` | **0** | 40 个菜品，10 个至少 1 类核心关系（25%），30 个无核心关系，平均 0.8 类/菜 |
| B4 | `python -m unittest discover -s service -p 'test*.py'` | **0** | `Ran 9 tests` — `OK` |
| B5 | `cd backend && npm test -- --runInBand` | **0** | `Test Suites: 43 passed, 43 total` / `Tests: 213 passed, 213 total` |
| B6 | `cd frontend && npm run lint` | **0** | 无输出（干净） |
| B7 | `cd frontend && npm test` | **0** | `tests 153` / `pass 153` / `fail 0` |
| B8 | `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1` | **0** | 全部步骤 `OK`，含 `Docker compose config` |

### 4.2 **基线已存在**的失败（非本轮引入）

命令：`node --test "scripts/__tests__/*.test.mjs"`
退出码：**1**；`tests 34` / `pass 27` / `fail 7`

| 文件 | 失败数 | 失败用例 |
|---|---|---|
| `scripts/__tests__/verify_all_python_contract.test.mjs` | 4 | `verify-all delegates Python checks to one executable quality gate`；`Python discovery honors explicit configuration then probes portable candidates in order`；`the resolved Python runs unittest, data validation, and a real PythonBridge smoke`；`deployment source checks validate discovery and smoke wiring, not only the unittest word` |
| `scripts/__tests__/verify_offline_bundle.test.mjs` | 2 | `requires key offline labels in built html`；`accepts html without any fetch() calls` |
| `scripts/__tests__/verify_offline_ui.test.mjs` | 1 | 文件级失败（`node --test` 单文件运行同样失败） |

根因（已核实）：这 4 个 Python 契约用例要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`——**这两个文件在仓库中不存在**（测试用 `readOptional` 读成空串后断言失败）；同时用例断言 `verify-all.ps1` **不应**包含 `python -m unittest`，但 `scripts/verify-all.ps1:100` 实际包含该命令。

**判定：这 7 个失败在 KB-001 任何改动之前就已存在，属"基线已存在"，不是本轮引入。** 本轮不做修复（范围外），只要求"不新增失败"。

### 4.3 未执行的基线（本轮不适用/不可执行）

| 项 | 原因 |
|---|---|
| `scripts/verify-demo-stack.ps1 -RequireRunning` | 需要先启动演示栈；本轮不启动常驻服务。**标记为未执行** |
| `scripts/package_trae_submission.ps1` | 会重写 `release/` 产物；本轮禁止部署/打包发布物。**标记为未执行** |
| `docker compose up --build` 端到端 | 耗时且会创建容器/卷；`verify-all.ps1` 已覆盖 `docker compose config`。**标记为未执行** |
| GitHub Actions 实际运行 | 当前分支不在 CI 触发范围内，且本轮禁止 push。**标记为未执行** |

---

## 5. 推荐的最小增量实施路径（KB-001）

基于上述事实，KB-001 的最小增量边界：

1. **V2 数据与 Schema 必须放在独立目录**（建议 `data/kb/`），**不得**放入 `data/knowledge_graph/`——因为 `verify_graph_schema.mjs:297` 会按 `nodes_*.json` 通配自动载入（风险 R3）。
2. **不改动 V1 读取路径**：`service/knowledge_graph.py`、`backend/src/services/*.js` 的既有 `require`/`open` 全部保持原样；兼容性以"新增独立适配器 + 不修改输入"的方式实现。
3. **不引入新依赖**：校验器与适配器使用 Node 内置能力（`node:fs`、`node:path`、`node:test`、`node:assert`），符合 `service/requirements.txt` 的零依赖现状，且无需改动 `backend/package.json`（该文件有未提交改动，属高风险文件）。
4. **Schema 契约先行**：先产出可被程序消费的 V2 Schema（显式 `required`、枚举、关系端点约束、`schema_version`、`provenance`、`review_status`、`unknown`/`insufficient` 表达），再由校验器与适配器依赖它。
5. **校验器退出码可用于 CI**：0 = 通过，非 0 = 失败；且**不得修改输入数据**。
6. **适配器输出到独立目录**（建议 `data/kb/generated/`）并加入 `.gitignore`，保证"不批量覆盖原始数据"、可重复运行、幂等。
7. **测试证据从本阶段建立**：QA 独立负例测试与现有 4 套测试基线（后端 Jest / 前端 node:test / Python unittest / scripts node:test）并行比对，明确区分基线失败与本轮新增失败。
8. **范围外但需记录**：`text_lit_076/084/097` 的出处丢失（既有缺陷）、`scripts/__tests__` 的 7 个基线失败、`pre-launch-check` 的 6 项 P0——均**不在本轮修复范围**，作为遗留项交付。

---

## 6. 本轮禁止事项（源自用户要求，逐条确认适用）

- ❌ UI 改版 → 前端本轮只读分析
- ❌ 修改 LLM Prompt 与复原算法 → 不触碰 `service/llm_reasoner.py`、`service/restoration_engine.py`
- ❌ 重做 `evidenceScore` → 不触碰 `RestorationService.js`、`routes/api.js` 的评分逻辑
- ❌ 批量扩充菜品 → 不修改 `nodes_dish.json`
- ❌ 引入 Neo4j / Milvus / Elasticsearch / Kafka 等新基础设施
- ❌ 无关依赖升级 → 不修改 `backend/package.json`、`frontend/package.json`、`service/requirements.txt`
- ❌ 大范围重构
- ❌ 静默修改现有 API
- ❌ 编造古籍原文、专家审核、实验数据或引用
- ❌ 把普通网络线索自动升级为权威历史证据
- ❌ `git reset --hard` / 清理未跟踪文件 / 覆盖未提交代码 / 删除旧数据 / push / 合并 `main` / 部署

---

## 7. 未核实项（明确标记，不作为结论）

以下内容本轮**未实际执行或未逐条读取**，不得在交付中被写成"已通过"：

1. `scripts/verify-demo-stack.ps1`、`scripts/package_trae_submission.ps1` 未执行（见 4.3）。
2. `docker compose up --build` 端到端未执行。
3. `data/visual_assets/dish_backgrounds.json`、`data/light_mode/fake_dishes.json`、`data/light_mode/quiz_real_dishes.json` 仅做键名枚举，未逐条读取内容。
4. `service/api_wrapper.py`、`service/restoration_engine.py`、`service/llm_reasoner.py` 的完整逻辑未逐行审阅（仅审阅了 `service/knowledge_graph.py` 全文）。
5. 前端 `frontend/src/**` 的业务逻辑未审阅（本轮由 Frontend 成员在 KB-001 中补充只读分析）。
6. `.env` 文件只核对了**键名**，未读取任何值。
7. 远端仓库 `chenfei462/flavor-archaeology-bureau-public` 与本地代码的差异**未做比对**。

---

## 8. 审计方法说明（可复现）

本审计中所有"已确认事实"均通过以下方式之一取得：

- `git status --short --branch`、`git branch -a`、`git log --oneline`、`git stash list`、`git remote -v`
- `Get-ChildItem -Recurse`（排除 `node_modules`）枚举文件
- `ConvertFrom-Json` 解析并统计各数据文件的实际形状、记录数与字段名
- `Select-String` 定位实现位置（含行号）
- 实际执行第 4 节列出的全部基线命令并记录退出码

审计期间**未修改仓库任何文件**；本文件（`docs/kb-001/00-fact-audit.md`）是审计产物本身。
