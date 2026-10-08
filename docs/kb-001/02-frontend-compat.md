# KB-001D2 前端兼容影响分析与演示回归验证

- 任务：t5（KB-001D2）
- 执行角色：Frontend
- 执行方式：**只读**分析 + 实际执行回归命令
- 写入范围：仅本文件（`docs/kb-001/02-frontend-compat.md`）
- 结论：**KB-001 对前端无任何运行时影响；前端回归结果与基线完全一致，无本轮引入的回归**

---

## 0. 结论速览

| 问题 | 结论 | 关键证据 |
|---|---|---|
| KB-001 的 V2 Schema 与 `data/kb/` 新目录是否对前端产生运行时影响？ | **否，零影响** | 前端源码中不存在任何对 `data/kb`、`kb-schema`、`schema_version`、`validate-kb-schema`、`adapt-v1-to-v2` 的引用（全量检索 0 命中） |
| 前端是否读取仓库根 `data/`？ | 是，但**仅 1 个文件、8 条构建期 import**，全部指向 `data/knowledge_graph/`、`data/recipes/`、`data/fragments/`、`data/light_mode/`、`data/visual_assets/`，**均不在 KB-001 写入范围内** | `frontend/src/offline/data/offlineMuseumData.js:5-12` |
| 前端源码是否被本轮改动触碰？ | **否**，`frontend/src` 下无任何文件在 KB-001 期间被修改 | 修改时间核验（见 §3.1） |
| 前端回归是否通过？ | **是**，`npm test` 153/153、`npm run lint` 退出码 0、`npm run build` 退出码 0、`test:offline` 61/61、`verify:offline:bundle` 退出码 0 | 见 §4 |
| 是否存在本轮引入的失败？ | **无** | 见 §4.3 逐项比对 |
| 是否存在基线已存在的失败？ | **前端无**。基线已存在的 7 个失败位于 `scripts/__tests__/`（非前端套件），见 §4.4 | `docs/kb-001/00-fact-audit.md` §4.2 |

---

## 1. KB-001 对前端的运行时影响：零

### 1.1 全量检索：前端不存在任何 KB-001 产物引用

在 `frontend/src/**` 全量检索以下关键字：

`data/kb`、`kb-schema`、`kb_schema`、`validate-kb-schema`、`adapt-v1-to-v2`

**结果：0 命中。**

结论依据：KB-001 的全部产物落位于 `data/kb/`（V2 Schema、示例）、`scripts/kb/`（校验器、适配器、测试）与 `docs/kb-001/`（文档），这三处**均不在前端任何构建入口的依赖图内**。

### 1.2 前端的两条独立构建链路

前端有两条互不相交的构建入口：

| 链路 | 入口 | 产物 | 是否读取仓库根 `data/` |
|---|---|---|---|
| **A. 常规 Web 应用** | `frontend/index.html` → `frontend/src/main.jsx` | `frontend/dist/` | **否，零 import** |
| **B. 离线博物馆单文件** | `frontend/offline.html` → `frontend/src/offline/main.jsx` | `frontend/dist-offline/offline.html` | **是，8 条 import** |

**链路 A 证据**：`frontend/src/main.jsx:1-7` 只引入 React、Router、`index.css`、`App.jsx`、`ErrorBoundary.jsx`、`language.jsx`；`App.jsx` 只引入 11 个页面与 Layout。对 `frontend/src` 下**非 offline** 文件检索 `data/` 字符串 → **0 命中**。

链路 A 的实际构建产物交叉验证（构建后抽样检查 bundle）：

| 标记 | 是否出现 | 说明 |
|---|---|---|
| `kb-schema` | **否** | KB-001 产物未进入 |
| `schema_version` | **否** | KB-001 产物未进入 |
| `鸡头米`（仅存在于 `data/knowledge_graph/nodes_ingredient.json` 的 aliases） | **否** | 链路 A 未引入仓库根 `data/` |
| `烧尾宴食单`（仅存在于 `data/literature/`） | **否** | 同上 |
| `离线评审模式`（仅存在于离线链路 UI） | **否** | 两条链路确实隔离 |
| `flavor_profile` | 是 | **来源是 `frontend/src/pages/evolutionDishes.js:8,16` 的本地字面量**，不是仓库根数据文件（已用 `Select-String` 定位，`Evolution.jsx:22-23` 消费） |

### 1.3 链路 B 的数据依赖逐项核对（任务验收点 2）

`frontend/src/offline/data/offlineMuseumData.js` 是前端**唯一**读取仓库根 `data/` 的文件，共 8 条构建期 JSON import：

| 行 | import 目标 | 是否在 KB-001 写入范围内 |
|---|---|---|
| 5 | `../../../../data/recipes/ancient_recipes.json` | 否 |
| 6 | `../../../../data/fragments/ancient_fragments.json` | 否 |
| 7 | `../../../../data/knowledge_graph/evolution_rules.json` | 否 |
| 8 | `../../../../data/knowledge_graph/expert_review_manifest.json` | 否 |
| 9 | `../../../../data/knowledge_graph/nodes_dish.json` | 否 |
| 10 | `../../../../data/light_mode/fake_dishes.json` | 否 |
| 11 | `../../../../data/light_mode/quiz_real_dishes.json` | 否 |
| 12 | `../../../../data/visual_assets/dish_backgrounds.json` | 否 |

**路径解析实测**（`node -e` + `path.resolve`，基准目录 `frontend/src/offline/data`）：

```
../../../../data/recipes/ancient_recipes.json => D:\systemDir\Desktop\风味考古局\data\recipes\ancient_recipes.json
../../../../data/knowledge_graph/nodes_dish.json => D:\systemDir\Desktop\风味考古局\data\knowledge_graph\nodes_dish.json
```

即 4 级上溯精确落在**仓库根 `data/`**，与 KB-001 的 `data/kb/` 是**同级但不同的子目录**，无路径重叠。

**关键约束确认**：KB-001 契约的硬约束 H1 明确 V2 数据禁止写入 `data/knowledge_graph/`（理由：`scripts/verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` 自动发现节点类型）。因此链路 B 读取的 4 个 `data/knowledge_graph/*.json` 文件**不会被 KB-001 新增或改动**，链路 B 的输入保持字节级不变。

### 1.4 是否存在目录通配型回归风险（重点排查）

前端测试与构建中若存在对 `data/` 的**目录遍历/通配**，新增 `data/kb/` 才可能造成回归。实际排查结果：

| 检查项 | 结果 |
|---|---|
| 前端源码中 `import.meta.glob` | **0 命中** |
| 前端源码中 `require.context` | **0 命中** |
| 前端测试中遍历**仓库根 `data/`** | **无**。`frontend/src/lib/__tests__/apiClient.test.mjs:11-19` 有递归遍历，但根目录为 `resolve(__dirname, '../../')` = **`frontend/src`**，且只收集 `.js/.jsx/.mjs`，不触及仓库根 `data/` |
| `scripts/build_offline_assets.mjs` 是否遍历 `data/` | **否**。仅 `:12-13` 指向 `frontend/src/offline/data/generated` 与 `generatedDishImages.js` 两个固定输出路径 |
| `scripts/verify_offline_bundle.mjs` 是否遍历 `data/` | **否**。仅 `:165` 读取传入的 HTML 文件路径 |

**结论：前端不存在任何会因 `data/kb/` 新增目录而改变行为的通配逻辑。**

---

## 2. 前端测试的源码正则断言是否会被本轮改动打破（任务验收点 2 后半）

### 2.1 断言性质确认

前端 35 个测试文件全部为 `node:test`，其中**绝大多数是源码正则/子串断言**（`readFileSync` 读取 `.jsx`/`.css` 源码后 `assert.match`/`includes`）。已确认读取目标共 99 处 `readFileSync`/`resolve(` 调用点，**全部指向 `frontend/src/**` 内部文件或 `frontend/` 根配置文件**，无一指向仓库根 `data/` 或 `scripts/`。

### 2.2 本轮是否可能打破断言

**不会**，原因有二且均为事实级：

1. 这些断言断言的是**前端源码文本**（`Home.jsx`、`Result.jsx`、`index.css`、`vite.config.js`、`nginx.conf` 等）。KB-001 **未修改 `frontend/` 下任何文件**（见 §3.1），故被断言的文本逐字节不变。
2. KB-001 未改动任何 UI 文案与标签，故 `REQUIRED_LABELS` 门禁不受影响（见 §3.2）。

### 2.3 已识别的**既有**脆弱点（非本轮引入，仅记录）

前端测试对源码文本的强耦合是**已存在的工程风险**，与 KB-001 无关。典型：

- `frontend/src/pages/__tests__/` 下多个文件直接读取页面源码做字符串断言；改文案/标签会连带打破。
- `frontend/src/lib/__tests__/deploymentConfig.test.mjs:37-46` 断言 `docker-compose.yml`、`Dockerfile`、`.env.example` 的具体正则。

这些风险已在 `docs/kb-001/00-fact-audit.md` §3（R5）中登记，**不属于本轮处理范围**，本轮不修复。

---

## 3. 本轮改动未触碰 UI 文案与标签（任务验收点 3）

### 3.1 证明：`frontend/src` 无任何文件在本轮被修改

**方法**：以 KB-001 轮次起点文档 `docs/kb-001/00-fact-audit.md` 的修改时间为锚点，遍历 `frontend/`（排除 `node_modules`）查找更晚修改的文件。

**结果**：

```
=== frontend/src files modified AFTER the KB-001 anchor ===
(none - no frontend/src file was touched during KB-001)

=== newest mtime anywhere under frontend/src ===
2026-09-26T00:28:59  frontend\src\offline\data\generatedDishImages.js
2026-09-26T00:28:20  frontend\src\pages\__tests__\criticalFailureStates.test.mjs
2026-09-25T23:01:03  frontend\src\offline\data\offlineMuseumData.js
```

以更宽的 `2026-10-01` 为阈值二次核验，`frontend/` 下**唯一**更晚的文件是 `frontend/dist/**`（常规构建产物，已在 `.gitignore` 中，见 §4.2）。

**结论：`frontend/src` 下最新修改时间为 2026-09-26，早于 KB-001 轮次，未被本轮触碰。**

### 3.2 补充说明：`git status` 显示的 `frontend/src` 改动是**用户既有未提交改动**

`git status --porcelain -- frontend/` 会显示 16 个 `frontend/src/**` 文件为 ` M`（已修改）。**这些是 KB-001 之前就存在的用户未提交改动，不是本轮引入**：

- 其修改时间均早于 KB-001 轮次起点（§3.1 实测）。
- `docs/kb-001/00-fact-audit.md` §1.2 已把其中主要文件登记为「必须保护的未提交改动」。
- 本轮**未对这些文件做任何写入**（写入范围仅 `docs/kb-001/02-frontend-compat.md`）。

按任务要求，此处必须明确区分：**`git status` 中的 `frontend/src` 改动 = 基线已存在（用户既有改动）；KB-001 引入的前端改动 = 无。**

### 3.3 为何离线包 `REQUIRED_LABELS` 门禁不受影响

`scripts/verify_offline_bundle.mjs:4-11` 定义 6 个必需标签：

```
'离线评审模式', '接手这宗风味案', '查看融合推演', '风味馆藏库', '互动研究', '合作展厅'
```

该门禁在 `:108-111` 只对完整 HTML 文档生效，检查 `html.includes(label)`。

**不受影响的原因**：这些标签来自 `frontend/src/offline/**` 的 UI 源码，而 KB-001 未修改 `frontend/` 下任何文件（§3.1），故生成的 HTML 中标签文本不变。此外本轮的 `data/kb/` 新目录不被离线构建引用（§1.3），不会改变单文件包的字节内容。

**实测确认**（对既有产物执行只读校验，未重新构建）：

```
$ npm run verify:offline:bundle
File: dist-offline/offline.html
Size: 957.57 KB
Status: OK
EXITCODE = 0
```

---

## 4. 前端演示回归基线证据（任务验收点 4）

环境：Node `v24.15.0`，工作目录 `D:\systemDir\Desktop\风味考古局\frontend`。

### 4.1 逐项结果

| # | 命令 | 退出码 | 实际结果 | 基线（`00-fact-audit.md` §4.1） | 判定 |
|---|---|---|---|---|---|
| F1 | `npm test` | **0** | `tests 153` / `pass 153` / `fail 0` / `skipped 0` / `todo 0` | `tests 153` / `pass 153` / `fail 0`（B7） | ✅ 一致 |
| F2 | `npm run lint` | **0** | `eslint .` 无输出（干净） | 退出码 0，无输出（B6） | ✅ 一致 |
| F3 | `npm run build` | **0** | `✓ 47 modules transformed` / `✓ built in 1.13s`；`dist/assets/index-CqGeuD0p.js 371.14 kB` | 未单独记录（`verify-all.ps1` 步骤通过，B8） | ✅ 通过 |
| F4 | `npm run test:offline` | **0** | `tests 61` / `pass 61` / `fail 0` | 未单独记录 | ✅ 通过（补充证据） |
| F5 | `npm run verify:offline:bundle` | **0** | `Size: 957.57 KB` / `Status: OK` | 未单独记录 | ✅ 通过（补充证据） |

### 4.2 逐文件通过明细（F1 分解，35 个测试文件全部 exit=0）

| 测试文件 | pass | fail | | 测试文件 | pass | fail |
|---|---|---|---|---|---|---|
| `layoutHeader.test.mjs` | 2 | 0 | | `completionBlockingPolish.test.mjs` | 3 | 0 |
| `apiClient.test.mjs` | 2 | 0 | | `criticalFailureStates.test.mjs` | 7 | 0 |
| `authStore.test.mjs` | 5 | 0 | | `evolutionDishes.test.mjs` | 4 | 0 |
| `deploymentConfig.test.mjs` | 3 | 0 | | `evolutionImagePrompt.test.mjs` | 1 | 0 |
| `dishAssets.test.mjs` | 2 | 0 | | `evolutionSelectionLayout.test.mjs` | 3 | 0 |
| `language.test.mjs` | 2 | 0 | | `hackathonDemoEnhancements.test.mjs` | 10 | 0 |
| `speechNarration.test.mjs` | 7 | 0 | | `homeCenteredLayout.test.mjs` | 2 | 0 |
| `sseStream.test.mjs` | 5 | 0 | | `homeSignatureDishImage.test.mjs` | 1 | 0 |
| `museumSession.test.mjs` | 5 | 0 | | `investorReadiness.test.mjs` | 6 | 0 |
| `offlineData.test.mjs` | 11 | 0 | | `lightModeDailyCardUsability.test.mjs` | 3 | 0 |
| `offlineDesign.test.mjs` | 6 | 0 | | `lightModeFoundation.test.mjs` | 3 | 0 |
| `offlineFeatures.test.mjs` | 12 | 0 | | `lightModeLayout.test.mjs` | 2 | 0 |
| `offlineRestoration.test.mjs` | 8 | 0 | | `pageFullWidthLayout.test.mjs` | 3 | 0 |
| `offlineRules.test.mjs` | 8 | 0 | | `remainingPagesVisualRefresh.test.mjs` | 5 | 0 |
| `offlineShell.test.mjs` | 4 | 0 | | `resultImagePromptVisualFacts.test.mjs` | 1 | 0 |
| `offlineThree.test.mjs` | 7 | 0 | | `siteBilingual.test.mjs` | 2 | 0 |
| | | | | `starMapDishBackgrounds.test.mjs` | 1 | 0 |
| | | | | `starmapLightVisualRefresh.test.mjs` | 3 | 0 |
| | | | | `visualMuseumRefresh.test.mjs` | 4 | 0 |

合计 **153 通过 / 0 失败**，与基线数值完全一致。

### 4.3 回归判定

- **本轮引入的失败：0 个。**
- **前端套件中基线已存在的失败：0 个。**
- 与基线逐项比对：F1 的 `tests/pass/fail` 三项数值与 `00-fact-audit.md` §4.1 B7 完全一致；F2 退出码与 B6 一致。
- 因此前端**无任何回归**（既无本轮引入，也无基线遗留）。

### 4.4 关于基线已存在的 7 个失败（不属于前端，仅作边界澄清）

`docs/kb-001/00-fact-audit.md` §4.2 记录的 7 个失败位于 `scripts/__tests__/*.test.mjs`（脚本层测试），**不属于前端测试套件**，前端命令不执行它们。根因是这些测试引用了仓库中不存在的 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`。

本报告不重复其分析，仅确认：**它们既非前端套件，也非本轮引入**；前端回归结论不受其影响。该类失败应由脚本/DevOps 负责人在其范围内处置（本轮不修复，属范围外）。

### 4.5 `frontend/dist` 的变更性质说明

F3 重新生成了 `frontend/dist/**`（构建产物）。该目录被 `frontend/.gitignore:11` 忽略，`git status --porcelain -- frontend/dist` 输出为空，**不构成源码变更、不影响版本库状态**。

---

## 5. 未执行的前端相关检查（任务验收点 6）

以下检查**本轮未执行**，不得视为通过：

| 未执行项 | 原因 |
|---|---|
| `npm run build:offline`（重新构建离线单文件包） | 会重写 `frontend/dist-offline/` 与 `frontend/src/offline/data/generated/`、`generatedDishImages.js` 构建产物；本轮为只读兼容分析，无 UI 改动，重新构建不产生新信息。**已用只读方式替代**：对既有 `dist-offline/offline.html`（2026-09-26 产物）执行 `verify:offline:bundle`，结果 `Status: OK`（F5）。**注意：该替代验证的是既有产物，不是本轮重新构建的结果** |
| 离线 UI 浏览器截图 / 视觉回归 | 需启动浏览器与自动化环境；本轮禁止 UI 改版，无视觉变更需要验证；`artifacts/offline-ui/` 中的既有截图为历史产物，未重新采集 |
| `scripts/verify-demo-stack.ps1 -RequireRunning` | 需先启动常驻演示栈（前后端进程）；本轮不启动常驻服务 |
| `docker compose up --build` 端到端 | 会创建容器与卷；本轮禁止部署类操作。`docker compose config` 已由 `verify-all.ps1` 覆盖 |
| 实际后端 API 联调（`/api/*`） | 需运行后端服务；本轮前端侧为只读分析。后端回归由 QA 在其范围内以 Jest 覆盖 |
| `npm run dev` 手动交互验证 | 同上，需常驻进程 |

---

## 6. 交付结论

### 6.1 对 KB-001 的前端兼容判定

**KB-001 对前端零影响，无需任何前端改动。**

理由链（全部基于实际代码阅读与实测）：

1. 前端源码对 KB-001 产物（`data/kb/`、`scripts/kb/`、`kb-schema`、`schema_version`）的引用数 = **0**。
2. 前端读取仓库根 `data/` 的唯一位置是 `frontend/src/offline/data/offlineMuseumData.js:5-12` 的 8 条构建期 import，全部指向 `data/knowledge_graph/`、`data/recipes/`、`data/fragments/`、`data/light_mode/`、`data/visual_assets/`——KB-001 契约的硬约束 H1 明确禁止改动 `data/knowledge_graph/`，且这些路径均不在本轮写入范围内。
3. 前端不存在任何对 `data/` 的目录通配逻辑（`import.meta.glob` / `require.context` 均 0 命中），故新增 `data/kb/` 目录不会改变任何前端行为。
4. `frontend/` 下无文件在本轮被修改（修改时间核验），UI 文案与标签逐字节不变。
5. 前端回归 5 项命令全部退出码 0，与基线数值完全一致。

### 6.2 风险与建议（供 Captain 与后续 KB 阶段参考）

| # | 类型 | 内容 |
|---|---|---|
| N1 | 非阻塞观察 | 前端测试对源码文本的强耦合（99 处 `readFileSync` + 正则断言）是既有工程脆弱点。**KB-002～KB-008 若涉及 UI 改动，必须同步更新 `frontend/src/pages/__tests__/` 与 `frontend/src/offline/__tests__/` 的断言，以及 `scripts/verify_offline_bundle.mjs:4-11` 的 `REQUIRED_LABELS`。** |
| N2 | 非阻塞观察 | 若未来 KB-003（混合检索）需要前端消费 V2 数据，需**新增**前端侧读取路径；当前前端与 `data/kb/` 无任何连接。届时须注意离线单文件包不能引用 `public/` 资源或根绝对路径（`.workbuddy/memory/MEMORY.md` 已登记该约束）。 |
| N3 | 边界澄清 | `scripts/__tests__/` 的 7 个基线失败与前端无关，但会使 `node --test "scripts/__tests__/*.test.mjs"` 退出码为 1。若后续把它纳入 CI 门禁，需先修复或显式豁免，**不得误判为前端回归**。 |
| N4 | 非阻塞观察 | `frontend/src/offline/data/generatedDishImages.js` 与 `generated/` 目录被 `.gitignore` 忽略（`frontend/.gitignore:17-18`），属构建期生成物。干净克隆后必须先运行 `npm run build:offline:assets`，否则离线构建会因缺少该模块失败。 |

### 6.3 本任务的自证边界

- 本报告**未修改 `frontend/` 下任何文件**（写入范围仅本文件）。
- 本报告**未读取或输出任何 `.env` 的值**（仅在前文引用 `docs/kb-001/00-fact-audit.md` 已登记的键名，未涉及取值）。
- 本报告**未编造任何命令、退出码或测试结果**；§4 全部数值来自本轮实际执行。
- 本报告**未删除或修改任何负例、断言或预期**。
- 本报告**不给出 KB-001 的最终 PASS 判定**——最终验收由 Reviewer（KB-001E）独立完成。
