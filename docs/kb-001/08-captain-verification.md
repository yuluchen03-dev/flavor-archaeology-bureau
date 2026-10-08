# KB-001 Captain 独立核验记录

> ## ⚠ Captain 政策更新（2026-10-08）— 请先读本条
>
> 本文件中「最终须由 Codex 独立验收」的表述**已依据用户明确指令废止**。
> 新闭环：`Implementation → QA → Security → DevOps → Reviewer PASS → Captain Release Gate → CLOSED`。
> **KB-001 STATUS = CLOSED**（见 `14-kb-001-final-status.md` §2 的 11 项条件核验）。
> 本文件第 7 节记录 t4/t6/t7/t8/t9/t11 的核验；K1 修复后的 t12–t15 核验见
> `11-k1-qa-verification.md`、`12-k1-security-gate.md`、`13-k1-reviewer-gate.md` 与本文件后续补录。
> 本文件其余内容为**当时的历史记录，未改写**。

- 核验人：Captain（DSH Software Development Captain）
- 核验方式：**独立于成员自述**，直接读取文件、直接执行命令、直接构造负例
- 核验范围：t1（契约）、t2（Schema + 校验器）、t3（适配器）、t5（前端兼容）、t10/t11（契约修订）
- 状态：**已完成**（全部 11 个任务 terminal；Reviewer t9 返回 PASS，见第 7.9 节）

> 本文件只记录 Captain **亲自执行并观察到的结果**。成员报告中的数字若未被我复现，一律不写入本文件。
> 未执行的检查在第 6 节明确标为「未核验」，不得当作通过。

---

## 1. 环境与工具链（实测）

| 项 | 值 |
|---|---|
| 工作目录 | `D:\systemDir\Desktop\风味考古局` |
| Git 分支 | `feat/trae-offline-museum` |
| Node | `v24.15.0` |
| npm | `11.12.1` |
| Python | `3.11.9` |
| Docker / Compose | `29.5.2` / `v5.1.4` |

### ⚠ 工具陷阱（Architect 报告 + Captain 复现确认）

**`pwsh Get-Content` 读取本仓库中文文档会误报行数**，根因是 PowerShell 以 ANSI 误读 UTF-8。
同一文件 `docs/kb-001/01-schema-contract.md`：

| 读取方式 | 行数 |
|---|---|
| `Get-Content` | 876（**错误**） |
| `Get-Content -Encoding utf8` | 1082（少 1） |
| `node` 读取 | **1083（正确）** |

Captain 复现确认。**结论：本仓库任何中文文件的文本断言、行数统计必须用 `node` 或 `Get-Content -Encoding utf8`**，否则会把完好的中文文件误判为「内容缺失」。

同类陷阱：Captain 曾用 `ConvertFrom-Json` 读取 `data/kb/examples/valid/fixture-all-entities.kb.json` 时抛出
「传入的对象无效」，看似文件损坏；改用 `node` 读取后确认文件完好、可正常解析。**这是控制台编码假象，不是文件缺陷。**

---

## 2. t1 / t10 契约核验

### 2.1 契约版本与规模（node 读取）

| 项 | 实测值 |
|---|---|
| 契约版本 | `2.0.1`（L3） |
| 总行数 | **1083** |
| 字节数 | **74,649** |
| 修订记录 | §20，含 `2.0.0` 与 `2.0.1` 两行 |

### 2.2 我独立验证的契约关键设计

| 核验项 | 我的实测结果 |
|---|---|
| 17 实体定义 | ✅ 齐全（§9.1–9.17） |
| 关系类型数 | ✅ **24**，与 §10.2 标题「关系类型清单（24 种）」一致 |
| 「23 关系」笔误 | ✅ 已消除：全文 `23 关系` 出现 **0** 次，`24 关系` 出现 1 次 |
| `review_status` 枚举 | ✅ 5 值 `unreviewed / internal_reviewed / pending_external_expert / external_reviewed / rejected`，**刻意不含 `verified`**（§7 R1） |
| `edition_resolution` 三态 | ✅ `resolved / ambiguous / unresolved`，含明文「**禁止消歧**」（§9.5） |
| §16 写入范围冲突 | ✅ 已按文件级拆分修正（L1007/L1009），并新增 L1014–L1025 说明「不构成并发写冲突」 |
| 示例集数量补录 | ✅ L96 记 valid **3** 个、L97 记 invalid **7** 个，与磁盘实测一致 |

### 2.3 Captain 修正的合同缺陷（记录在案）

我（Captain）在 t2 的验收标准中要求交付 `scripts/kb/__tests__/`，但契约 §16 原版（2.0.0）把该目录整目录列为 KB-001B **禁止**写入 —— 二者不可同时成立，导致 t2 被调度器正确拒绝（`undeclared`）。

**处理**：按方案 A 修正 —— `agent_teams_amend_task` 将 t2 的 `inScope` 精确加入**单文件** `scripts/kb/__tests__/validate-kb-schema.test.mjs`（与 t4 的 `independent-qa.test.mjs` 文件级不重叠）；契约同步修订交 t10 完成。

**评价**：Backend 拒绝越界、上报冲突、未静默丢弃文件或谎报范围，行为正确。

### 2.4 契约中一处待确认的陈述

契约 L1029 陈述 `.gitignore` 的 `data/kb/generated/` 行「**已实际落地**（`.gitignore:16`）」。
**实测该陈述当前不成立**：Backend 在 t2 收尾时按范围纪律**回退**了该行（因其属 t3 的 inScope）。

| 我的实测 | 结果 |
|---|---|
| `git diff -- .gitignore` | 空（与 HEAD 一致） |
| `git diff --cached -- .gitignore` | 空 |
| `git status --porcelain -- .gitignore` | 空 |
| `git check-ignore -v data/kb/generated/adaptation-report.json` | 退出码 **1**（**未被忽略**） |
| HEAD 版 `.gitignore` 是否含 `kb` | 否 |

**结论**：该行需由 t3 在其 inScope 下重新追加（契约要求「仅追加 1 行」且幂等）。追加后 L1029 的陈述将重新成立。已就此向 Backend 下达 t3 派发指引。

---

## 3. t2 Schema 与校验器核验

### 3.1 Schema 完整性（Captain 直接读取 `data/kb/schema/kb-schema.v2.json`）

| 门禁 | 我的实测结果 |
|---|---|
| 契约 17 实体是否齐全 | ✅ **17/17**，无缺失、无多余 |
| 关系类型数 | ✅ **24** |
| 每条关系是否有 source/target 端点约束 | ✅ **24/24 均有**，无缺失 |
| `schema_version` | ✅ `2.0.0` |
| `content_class` 四值 | ✅ `historical_fact` / `historical_inference` / `modern_adaptation` / `user_experiment` |
| `evidence_status` | ✅ `sufficient` / `insufficient` / `unknown` |
| `derivation` | ✅ `primary_source` / `v1_adapter` / `editorial` / `unresolved` |
| `provenance` 字段 | ✅ `derivation` / `basis_ids` / `asserted_by` / `asserted_at` / `source_locator` / `notes` |

### 3.2 追踪链关系（用户核心要求：来源追踪链可校验）

| 关系 | source → target | 实测 |
|---|---|---|
| `passage_in_edition` | SourcePassage → SourceEdition | ✅ 存在 |
| `edition_of_work` | SourceEdition → SourceWork | ✅ 存在 |
| `claim_supported_by` | HistoricalClaim → SourcePassage | ✅ 存在 |
| `claim_refuted_by` | HistoricalClaim → SourcePassage | ✅ 存在 |

`provenance.source_locator` 成员为 `work_id` / `edition_id` / `passage_id` / `locator` —— 支持逐级回溯。

### 3.3 Captain 亲自构造的负例（**不是**复用成员的测试）

我用 `node` 生成夹具（避免 PowerShell 编码陷阱），对 4 类缺陷独立验证：

| 我注入的缺陷 | 校验器退出码 | 报出的错误码 |
|---|---|---|
| 删除 `edition_of_work`（断链） | **1** | `E_TRACE_BROKEN`, `E_TRACE_MISSING`, `E_CLAIM_NO_EVIDENCE` |
| 关系指向不存在的 `ing_does_not_exist_999` | **1** | `E_DANGLING_REFERENCE` |
| 关系类型改为 `not_a_real_relation` | **1** | `E_UNKNOWN_RELATION_TYPE` |
| `dish_contains_ingredient` 端点改成 Technique 节点 | **1** | `E_RELATION_ENDPOINT_TYPE` |

**这四项恰好对应用户明确要求的**：悬空引用 / 未知关系类型 / 不合法关系端点类型 / 来源追踪链缺失。
错误码**精确区分**，说明校验器不是笼统报错。

### 3.4 Captain 亲自验证的其余行为

| 核验项 | 我的实测结果 |
|---|---|
| `validate-kb-schema.mjs data/kb/examples/valid` | 退出 **0**（`3 file(s), 23 entities, 26 relations`） |
| 4 个 invalid 夹具逐个 | 各退出 **1**，错误含 `file`/`entityOrRelationId`/`fieldPath`/`code`/`message` 五要素 |
| 不存在的输入路径 | 退出 **2** |
| `review_status="verified"`（我构造） | **被拒**，`E_ENUM_INVALID`，消息列出 5 个合法取值 |
| `passage_in_edition` 挂到 `ambiguous` Passage（我构造） | **被拒**，`E_TRACE_MISSING`（`requires 0 passage_in_edition relations, found 1`）+ `E_TRACE_WEAKENS_CLAIM` |
| 校验器是否修改输入 | **否** —— 校验前后 `fixture-all-entities.kb.json` SHA-256 均为 `362C55AC...E90A6FAE`，**不变** |

后两项正是我在 t2 合同中新增的验收要求，**已由我独立复现**。

### 3.5 t2 测试文件质量抽查（Captain 读取源码）

`scripts/kb/__tests__/validate-kb-schema.test.mjs`：**45 个用例**。

导入依赖仅：`node:test`、`node:assert/strict`、`node:child_process`、`node:crypto`、`node:fs`、`node:path`、`node:url`，
以及相对路径 `../lib/schema.mjs`、`../lib/validate.mjs`。
**非内置、非相对导入：0 个** → 符合「不得引入新依赖」。

用例覆盖（Captain 抽查确认存在）：17 实体 / 24 关系 / 5 值 review_status 且排除 verified / 合法集退出 0 /
`passage_in_edition` 正向 resolved 路径 / insufficient 保持 unreviewed / 12 类负例 / 追踪链缺失 /
`passage_in_edition` 挂 ambiguous 与 unresolved 各一例 / `review_status=verified` 被拒 /
五要素齐全 / stdout 纯 JSONL / 退出码 2 两种情形 / 空目录不静默通过 / **校验器不修改输入** /
**重复运行输出逐字节相同** / **通过运行确定性**。

---

## 4. t3 适配器核验（Captain 独立复现）

### 4.1 verify 命令（Captain 亲自执行）

| 命令 | 退出码 |
|---|---|
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0**（`1 file(s), 282 entities, 214 relations`） |
| `node scripts/verify_graph_schema.mjs` | **0**（193 / 49，与基线一致） |

### 4.2 Captain 直接统计适配输出（`data/kb/generated/kb-v2.kb.json`）

| 核验项（我在 t3 合同中新增的要求） | Captain 实测结果 |
|---|---|
| **禁止消歧**：`passage_in_edition` 关系数 | ✅ **0** |
| SourcePassage 的 `edition_resolution` 分布 | ✅ **ambiguous 16 / unresolved 3 / resolved 0** |
| 所有 Passage 的 `edition_id` 是否为 null | ✅ **19/19 全为 null** |
| **所有 HistoricalClaim 为 insufficient** | ✅ **34/34 全部 `insufficient`** |
| **不得出现 `review_status="verified"`** | ✅ 全文件 `"verified"` 出现 **0** 次 |
| `review_status` 实际分布 | ✅ `{"unreviewed": 282}` |
| **SourceWork = 10** | ✅ **10**：3 丛刊 + 5 内容著作 + 2 未解析（`work_unresolved_001/002`，`author=null`、`attribution_status=unknown`、`type=other`） |
| **禁止按 title 相等给 `lit_ccs_006/014/027` 建链** | ✅ `edition_of_work`=106 条**全部**指向丛刊；指向内容著作的 = **0** |
| `edition_contains_work` 目标为内容著作 | ✅ 11 条，目标 `work_type` ∈ {food_monograph, agricultural_treatise, materia_medica, encyclopedic_reference} |
| **`text_001`–`text_005` 显式 insufficient 且未补造来源** | ✅ 5 条均为 `SourceWork`、`evidence_status=insufficient`、`provenance.derivation=unresolved`、`source_locator=null` |
| 适配报告免责声明 | ✅ 逐字包含「适配成功只表示结构转换成功，不代表历史真实性已经核验。」 |

**实体/关系总数**：entities=282、relations=214。
**实体类型分布**：`HistoricalClaim 34, Dish 40, SourceEdition 106, Ingredient 16, IngredientState 7, Measurement 10, SourcePassage 19, TimePeriod 7, Region 5, RestorationVersion 4, ExpertReview 4, SafetyRule 1, Season 7, Technique 10, Utensil 2, SourceWork 10` —— 覆盖契约全部 17 实体类型。

### 4.3 确定性 / 幂等 / 只读（Captain 亲自复跑）

| 核验项 | Captain 实测结果 |
|---|---|
| 连续两次运行输出是否逐字节相同 | ✅ **相同** —— `kb-v2.kb.json` SHA-256 前缀 `31a94b69d25800ca`；`adaptation-report.json` 前缀 `0fb24805955278e2` |
| 重复运行是否产生重复实体/关系 | ✅ **无** —— dupIds=**0**、dupTriples=**0**（282 唯一 id / 214 唯一三元组） |
| V1 输入是否被修改 | ✅ **未修改** —— 13 个 V1 输入文件运行前后 SHA-256 **changed = 0 / 13** |
| `--dry-run` 是否创建/删除文件 | ✅ **不创建也不删除** —— 实测 dry-run 后 `data/kb/generated/` 仍存在、文件大小不变 |

### 4.4 `.gitignore`（Captain 实测）

| 项 | 结果 |
|---|---|
| 追加方式 | ✅ **单行 append**（`git diff` 仅 `+data/kb/generated/` 一行） |
| `git check-ignore -v data/kb/generated/kb-v2.kb.json` | ✅ 命中 `.gitignore:27`，退出 **0** |
| 行数变化 | 26 → 27（无 BOM、无 CRLF 污染） |

### 4.5 Captain 独立确认的**契约缺陷**（Backend 上报，我逐条复现）

Backend 未擅改契约、未为迁就契约数字调整数据，而是按真实数据执行并把偏差写入 `report.notes.contract_13_5_count_delta` —— **处理方式正确**。我独立复现如下：

| 契约陈述 | Captain 实测 | 判定 |
|---|---|---|
| §13.5：20 个候选 → 16 条 Passage | clue-class 30 + book-class **10** + recipes 5 + fragments 8 = **23** 候选 → **19** 条 Passage | ❌ **契约算术错误**（漏算 3 个书名无节点的菜品） |
| §13.5：15 ambiguous / 1 unresolved | 实测 **16 ambiguous / 3 unresolved** | ❌ **契约数字错误** |
| §13.5：《饮膳正要》是唯一 unresolved | 《饮膳正要》被 **3 个**册次收录（`lit_afl_001`/`lit_afl_002`/`lit_ccs_027`）故为 **ambiguous**；真正 unresolved 是 `passage_dish_005/006/010`（`edition_candidates=[]`） | ❌ **契约结论错误** |
| §6 要求关系上 `asserted_at` 为 null 时列入 `unknown_fields` | `schema.relations` 定义中**不含** `unknown_fields` → 该条款不可满足（Backend 实测曾报 496 条错误） | ❌ **契约条款矛盾** |

**已建 t11 交 Architect 修订契约（版本 → 2.0.2）。**

---

## 5. 前端兼容核验

Frontend 结论为「KB-001 对前端零运行时影响」。我独立复核其关键证据链：

| Frontend 声明 | Captain 独立实测 | 结论 |
|---|---|---|
| 前端源码对 KB-001 产物引用数 = 0 | 检索 `data/kb`/`kb-schema`/`schema_version`/`validate-kb-schema`/`adapt-v1-to-v2` → **0 命中** | ✅ 一致 |
| 前端无目录通配逻辑 | 检索 `import.meta.glob`/`require.context` → **0 命中** | ✅ 一致 |
| `frontend/src` 本轮零修改 | 最新 mtime `2026-09-26 00:28`，**早于**本轮起点（`docs/kb-001/` 为 `2026-10-08 15:47`） | ✅ 一致 |
| 修改文件数 16 | `git status -- frontend/src` 分组：` M` = **16**、`??` = 7（共 23） | ✅ **Frontend 的 16 正确**；我先前数到的 23 误含了 7 个既存未跟踪文件 |

**关于「新增 `data/kb/` 是否可能引发前端回归」**：这是本任务最关键的排查项。
由于前端既无 `data/kb` 引用、又无目录通配逻辑，新增目录不会改变任何前端行为 —— 该推理成立。

---

## 6. 回归核验（Captain 亲自复跑，全量）

| 套件 | 命令 | 退出码 | 与基线比对 |
|---|---|---|---|
| 后端 Jest | `cd backend && npm test -- --runInBand` | **0** | ✅ 一致（43 套件 / 213 用例） |
| 前端测试 | `cd frontend && npm test` | **0** | ✅ 一致（153 通过 / 0 失败） |
| Python unittest | `python -m unittest discover -s service -p 'test*.py'` | **0** | ✅ 一致（9 通过） |
| 脚本层测试 | `node --test "scripts/__tests__/*.test.mjs"` | **1** | ✅ 一致 —— **基线已存在**的 7 个失败，**非本轮引入** |
| 图谱门禁 | `node scripts/verify_graph_schema.mjs` | **0** | ✅ 一致（193 节点 / 49 关系） |
| 文献门禁 | `node scripts/verify_literature_dataset.mjs` | **0** | ✅ 一致（106 / 103） |
| KB 校验器 | `node scripts/kb/validate-kb-schema.mjs` | **0** | 新增能力 |
| KB 校验器单测 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | 45 通过 / 0 失败 |

**本轮引入的失败：0。**

### 6.1 「基线已存在」失败的界定（重要）

`scripts/__tests__/*.test.mjs` 的 **7 个失败**在 KB-001 任何改动之前就已存在，根因已核实：
测试要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`，**这两个文件在仓库中不存在**；
且测试断言 `verify-all.ps1` **不应**包含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含该命令。

**判定：属「基线已存在」，非本轮引入。本轮不修复（范围外），只保证不新增失败。**

### 6.2 范围红线核验（Captain 实测）

| 红线 | 我的实测结果 |
|---|---|
| `data/knowledge_graph/` 零改动 | ✅ `git status` 无该路径条目 |
| `data/recipes`、`data/fragments`、`data/literature` 零改动 | ✅ 无条目 |
| `data/kb/` 下无 `nodes_*.json` | ✅ 确认（避免触发 `verify_graph_schema.mjs:297` 通配载入） |
| `service/knowledge_graph.py` 零改动 | ✅ `git diff` clean |
| 5 个 backend service 读取路径零改动 | ✅ `LightModeService.js`、`VisionService.js`、`VisionCandidateMapper.js`、`FragmentService.js` 均 clean |
| 未引入第三方依赖 | ✅ `frontend/package.json`、`service/requirements.txt` 未改 |
| 未改 LLM Prompt / 复原算法 / evidenceScore | ✅ 未触碰 `service/llm_reasoner.py`、`service/restoration_engine.py`、`RestorationService.js`、`routes/api.js` |
| 未 push / 合并 / 部署 | ✅ 未执行 |

**关于 `backend/package.json` 与 `service/api_wrapper.py` 显示为已修改**：经 Captain 核验属**团队开始前的既有改动**，
非本轮引入：
- `service/api_wrapper.py` mtime `2026-09-25 21:34`，早于本轮 `2026-10-08`；diff 内容为给 `except Exception` 加日志
- `backend/package.json` diff 内容为新增 `db:migrate`/`db:seed-if-empty` 脚本与 `cookie-parser` 依赖
- `backend/src/services/StarMapService.js` 的 ` M` 同为基线既有（事实审计 §1.2 已记录）

---

## 7. 独立验证与审查结论核验（t4 / t6 / t7 / t8 / t9 / t11）

四个下游任务的产物均由 Captain 直接读取与复跑，非转述。

### 7.1 t4 QA 独立验证（`03-qa-verification.md`，369 行 / 18,016 B）

| Captain 核验项 | 实测结果 |
|---|---|
| QA 独立测试文件存在 | ✅ `scripts/kb/__tests__/independent-qa.test.mjs`（43,980 B） |
| 我亲自复跑该测试 | ✅ 退出 **0**，`tests 43 / pass 43 / fail 0` |
| 两个测试文件合计 | ✅ KB-001B 45 + QA 43 = **88 通过 / 0 失败** |
| QA 是否修改生产实现 | ✅ **未修改** —— 生产文件均为 `??`（未跟踪，即本轮新增未提交），无被 QA 改写的迹象 |
| 未删负例 | ✅ invalid 仍 **7** 个、valid 仍 **3** 个，与契约 L96/L97 一致 |

QA 的诚实披露（Captain 认可）：其自测初期出现 5 个失败，经诊断为**QA 自己夹具的缺陷**（未满足契约 C2 `uncertainty_notes`、`edition_candidates` 须指向真实实体等），**只修夹具、未改实现、未放宽断言**。

### 7.2 t6 Security 审查（`04-security-review.md`，495 行 / 24,378 B）

| Captain 核验项 | 实测结果 |
|---|---|
| 报告存在且结构完整 | ✅ 12 个章节 |
| 报告是否泄露密钥 | ✅ 5 类模式（`sk-*`、`JWT_SECRET=`、`API_KEY=`、`password=`、`C:\Users\`）**全部 0 命中** |
| 结论 | **无 blocker、无 high**；1 项 medium（M1）+ 4 项 low |

**Captain 独立复现 M1（medium）**：

| 核验项 | 实测结果 |
|---|---|
| `scripts/kb/adapt-v1-to-v2.mjs:1330` 是否做包含性校验 | ❌ **未做** —— 代码为 `const outDir = path.resolve(REPO_ROOT, args.out);`，其后直接 `mkdirSync`/`writeFileSync`，无 `startsWith`/`relative` 守卫 |
| 适配器是否被服务/路由调用 | ✅ **引用数 = 0**（检索 `backend/src`、`service`、`frontend/src`） |
| Security 的越界探针是否残留 | ✅ **已删除**（仓外 `D:\systemDir\sec-real-escape-probe` 与 `tmp/sec-probe` 均不存在） |
| Security 报告的 L2（`backend/test_escape_8.js`） | ✅ 存在，mtime `2026-09-25 22:05`，**早于本轮**（`2026-10-08`）→ 非本轮引入 |

**Captain 判定**：M1 定级 **medium 合理** —— 该 CLI 为开发者手动工具、无服务调用方，属纵深防御缺失而非当前可利用漏洞，**不阻断 KB-001 交付**。**已列入 KB-002 前修复项**（见第 8 节）。

### 7.3 t7 DevOps 验证（`05-devops-verification.md`，419 行 / 20,378 B）

| Captain 核验项 | 实测结果 |
|---|---|
| 报告存在且结构完整 | ✅ 11 个章节 |
| 回滚路径是否真实验证 | ✅ 报告记录「实际删除 `data/kb/generated/` 后 V1 changed=0/14、三条既有读取路径退出 0；重建后输出与快照 SHA-256 逐字节相同」——与 Captain 实测一致 |
| DevOps 标注的**未执行项** | ✅ 已在报告 §9 明确标为未执行（`docker compose up` 端到端、`package_trae_submission.ps1`、`verify-demo-stack.ps1 -RequireRunning`、GitHub Actions、`release/` 产物） |

**DevOps 的两点诚实标注（Captain 认可并转述）**：
1. **一项验收无法执行**：验收标准要求 `node --test scripts/kb/__tests__/independent-qa.test.mjs`，但该文件属 t4 交付物，DevOps 执行时**尚不存在**。DevOps **未记为通过**，改以 `validate-kb-schema.test.mjs`（45 用例）覆盖，并建议 Captain 在 t4 完成后补核验。
   → **Captain 已补核验**：t4 完成后我亲自复跑 `independent-qa.test.mjs` → 退出 **0**（43/43）。该缺口已闭合。
2. **一处环境性偶发失败**：`verify-all.ps1` 首次执行时 Backend tests 崩溃，退出码 `-1073740791`（`0xC0000409` STATUS_STACK_BUFFER_OVERRUN）。排查发现当时有 **12 个并发 node 进程**（多会话共享工作目录）；随后 **4/4 连续独立重跑全部退出 0**（43 套件/213 用例）。
   → **Captain 判定**：**资源竞争导致的偶发，非 KB-001 引入，非代码缺陷**。Captain 后续独立复跑后端 Jest 亦为退出 0（43/213），与基线一致。

### 7.4 t11 契约修订（2.0.2）

| Captain 核验项 | 实测结果 |
|---|---|
| 契约版本 | ✅ `2.0.2`（L3），**1108 行 / 82,694 字节** |
| §20 是否含 2.0.2 变更行 | ✅ 存在 |
| 正文是否已无过时数字 | ✅ 「20 个候选」「16 条 Passage」「15 ambiguous」「1 条（源自」**仅出现在已标注的更正/历史行**（L920、L1107），正文其余处已全部更正 |
| 更正后数值 | ✅ 「23 个候选」×3、「19 条」×6、「16 ambiguous」×2、「3 unresolved」×2、「0 resolved」×1 |
| §18 标签重号是否修复 | ✅ `| L10 |` 1 行、`| L12 |` 1 行 |
| **是否为了对齐文档而改动生成数据** | ✅ **未改动** —— `kb-v2.kb.json` 仍为 19 passages / `{ambiguous:16, unresolved:3}` / `passage_in_edition=0` / 214 条关系中 `asserted_at` 键 = 0，与 t3 原产出一致 |

**Architect 额外发现并修正的契约错误**（不在 Captain 的四项清单内，Captain 认可其同标准处理）：
- **M15**：原仅列 5 个内容著作各 1–2 个版本，与实测不符；实测为 2/2/2/**3**/2 合计 **11** 条边。
- **§18 标签重号**：原有两个 `L10`，第二条改为 `L12`。

### 7.5 全量门禁复跑（Captain，Node 驱动的 harness）

> 说明：Captain 首次用 PowerShell 包装函数取退出码时全部读到空值（`pwsh` 在该子 shell 不可用），随后改用 **Node `spawnSync`** 重跑，结果如下。这也是 QA 提醒的同一类陷阱：**不要依赖 PowerShell 管道的 `$LASTEXITCODE`**。

| 门禁 | 退出码 |
|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** |
| `node --test scripts/kb/__tests__/{validate-kb-schema,independent-qa}.test.mjs` | **0** |
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** |
| `node scripts/verify_graph_schema.mjs` | **0** |
| `node scripts/verify_literature_dataset.mjs` | **0** |
| `node scripts/verify_knowledge_graph_coverage.mjs` | **0** |
| `cd backend && npm test -- --runInBand` | **0**（43 套件 / 213 用例） |
| `cd frontend && npm test` | **0**（153 通过 / 0 失败） |
| `cd frontend && npm run lint` | **0** |
| `python -m unittest discover -s service -p 'test*.py'` | **0**（9 通过） |
| `node --test "scripts/__tests__/*.test.mjs"` | **1** —— **基线已存在**的 7 个失败，非本轮引入 |

**本轮引入的失败：0。**

### 7.6 确定性与 V1 完整性（Captain 复跑）

| 核验项 | 实测结果 |
|---|---|
| 重跑适配器后生成物是否逐字节相同 | ✅ **是** |
| 13 个 V1 输入文件是否被修改 | ✅ **changed = 0 / 13** |

### 7.7 零伪造交叉核对（Captain 独立构造，用户核心要求）

用户核心要求是「**没有伪造或静默补全来源**」。Captain 用**双向 URL 对账**独立验证（非复用成员结论）：

| 核验项 | Captain 实测结果 |
|---|---|
| V1 全部来源文件中出现的**不同 URL 总数** | **6** |
| 适配输出 `kb-v2.kb.json` 中出现的 URL 数 | **3**（全部为 V1 已有） |
| **输出中出现但 V1 中不存在的 URL（= 伪造）** | ✅ **0** |
| 输出中带 `source_url`/`catalog_url` 字段的实体 | ✅ **0** |
| 输出中 `publication_year` 非 null 的实体 | ✅ **0** |
| 输出中 `locator` 任一成员非 null 的 Passage | ✅ **0**（19 条 Passage 的 locator 全 null） |
| 输出中携带 V1 式考证散文（Google Books / CiNii / 豆瓣 / 馆藏）的 `provenance.notes` | ✅ **0** |

**零 fixture 泄漏核对**（防止示例数据污染真实适配输出）：

| 核验项 | 实测结果 |
|---|---|
| 输出中出现 `fixture` | ✅ **0** |
| 输出中出现 `minimal` | ✅ **0** |
| 输出中出现 `not_historical_evidence` | ✅ **0** |

即：`data/kb/examples/**` 的夹具数据**没有**混入 `data/kb/generated/kb-v2.kb.json`。

**适配报告如实记录缺失项**（`adaptation-report.json`）：`unmapped_fields` 181、`missing_sources` 53、`conflicts` 5、`ambiguous_edition` 16、`unresolved_passages` 3、`id_mapping` 389 —— 来源缺失与无法映射项**全部被记录**，未被静默丢弃。

### 7.8 本轮变更文件清单（Captain 用 `git status --untracked-files=all` 核对）

KB-001 相关条目共 **27** 项：`M .gitignore`（+1 行）+ **26 个新增未跟踪文件**：

| 类别 | 文件 |
|---|---|
| Schema（1） | `data/kb/schema/kb-schema.v2.json` |
| 示例（3 合法 + 7 负例） | `data/kb/examples/valid/*.kb.json`、`data/kb/examples/invalid/*.kb.json` |
| 校验器（1 + 3 lib） | `scripts/kb/validate-kb-schema.mjs`、`scripts/kb/lib/{errors,schema,validate}.mjs` |
| 适配器（1 + 1 lib） | `scripts/kb/adapt-v1-to-v2.mjs`、`scripts/kb/lib/adapt/mapping.mjs` |
| 测试（2） | `scripts/kb/__tests__/validate-kb-schema.test.mjs`（KB-001B 45 用例）、`scripts/kb/__tests__/independent-qa.test.mjs`（KB-001D 43 用例） |
| 文档（7） | `docs/kb-001/00-fact-audit.md`、`01-schema-contract.md`、`02-frontend-compat.md`、`03-qa-verification.md`、`04-security-review.md`、`05-devops-verification.md`、`08-captain-verification.md` |

**未出现在清单中即表示未被本轮修改**：`data/knowledge_graph/**`、`data/recipes/**`、`data/fragments/**`、`data/literature/**`、`backend/**`、`frontend/**`、`service/**`、`.github/workflows/**` 均无本轮改动。
`data/kb/generated/**` 不在清单中，因其已被 `.gitignore` 正确忽略（派生数据，不纳入版本控制）。

### 7.9 t9 Reviewer 独立审查（`07-final-review.md`，477 行 / 30,548 B）— **PASS**

| Captain 核验项 | 实测结果 |
|---|---|
| 报告存在且含全部 6 项要求章节 | ✅ `BLOCKERS`(§1)、`NON_BLOCKERS`(§2)、`ARCHITECTURE_COMPLIANCE`(§4)、`TEST_EVIDENCE`(§5)、`DATA_TRUST_COMPLIANCE`(§6)、`REGRESSION_STATUS`(§7) 全部存在 |
| **最终结论** | ✅ **`# PASS`**（L445） |
| 是否出现 `REQUEST_CHANGES` 作为结论 | ✅ **否** —— 全文仅 L242 出现一次，语义是 Reviewer **明确拒绝**据此给出 REQUEST_CHANGES（「我**不**要求实现方放宽追踪链约束来补齐，也**不**据此给出 REQUEST_CHANGES」） |
| BLOCKERS | ✅ **无** |
| 报告是否含密钥 | ✅ 无 |

**Reviewer 的独立性（Captain 认可）**：
- 实施方（t2/t3 为 implementation 类）**未**自评 PASS
- QA **未**修改生产实现（Reviewer 独立计算 SHA-256 与 QA 声明逐字节吻合：`validate-kb-schema` `2829a86a…`、`adapt` `56547c7c…`、`schema` `4d6c2777…`）
- Reviewer **未**参与实现、**未**修改任何实现文件（实现文件 mtime ≤ 19:17:30，早于其 19:37 开始审查）
- 未删负例（invalid 仍 7、valid 仍 3）；未降门槛（`skipped 0` / `todo 0`）
- Reviewer 唯一写入 `docs/kb-001/07-final-review.md`，临时探针已删除

**Reviewer 声明的边界（Captain 转述，不得越界解读）**：该 PASS 仅为 **DSH 团队内部审查结论**，**不代表项目整体 CLOSED**；最终须由 Codex 独立验收；push / 合并 / 部署不在本轮范围。

### 7.10 全部门禁终态复跑（Captain，Node 驱动）

| 门禁 | 退出码 |
|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** |
| `node --test scripts/kb/__tests__/{validate-kb-schema,independent-qa}.test.mjs` | **0**（88 用例） |
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** |
| `node scripts/verify_graph_schema.mjs` | **0**（193 / 49） |
| `node scripts/verify_literature_dataset.mjs` | **0**（106 / 103） |
| `node scripts/verify_knowledge_graph_coverage.mjs` | **0** |

**unexpected non-zero = 0。**

### 7.11 交付物终态

| 类别 | 数量 | 说明 |
|---|---|---|
| `docs/kb-001/` 文档 | **9** | 00 事实审计、01 契约(2.0.2)、02 前端兼容、03 QA、04 Security、05 DevOps、06 门禁、07 Reviewer、08 Captain 核验 |
| `scripts/kb/` 实现 | **8** | 校验器 1 + 适配器 1 + lib 4 + 测试 2 |
| `data/kb/` 数据 | **13** | schema 1 + valid 3 + invalid 7 + generated 2（已 gitignore） |

---

## 8. 未核验项（**不得当作通过**）

| 项 | 状态 | 原因 |
|---|---|---|
| `docker compose up` 端到端 | **未执行** | 范围外；本轮仅核验 `docker compose config`（退出 0） |
| `release/` 打包 | **未执行** | 禁止打包发布物 |
| GitHub Actions 实际运行 | **未执行** | 当前分支不在 CI 触发范围，且禁止 push |
| `verify-demo-stack.ps1 -RequireRunning` | **未执行** | 需启动常驻服务 |
| 浏览器视觉回归 | **未执行** | 本轮禁止 UI 改版，无 UI 变更可回归 |
| 符号链接输入 / 并发竞态 / 磁盘写满 / 超大输入 | **未验证** | Security 报告已如实标注（Windows 创建符号链接返回 EPERM，无法构造） |
| `backend/.env` 实际内容 | **有意未读** | 按红线只核对键名，未读取任何值 |
| **Codex 最终独立验收** | **未执行** | 团队外流程；DSH Reviewer 的 PASS 只是团队内部结论，**不代表项目整体 CLOSED** |

### 8.1 限流中断说明（诚实记录）

KB-001 执行期间发生**两轮** workbuddy 上游 429 限流，导致成员任务被标记 failed：

| 轮次 | 受影响任务 | 处理 |
|---|---|---|
| 第 1 轮 | t2（KB-001B） | Captain 独立核实已落盘成果质量良好后重派 → attempt 4 完成 |
| 第 2 轮 | t4、t6、t7、t11 **同时**中断 | Captain 先复核**无损坏**（`data/kb/generated/` 完好、V1 数据零改动、核心门禁仍全绿），再逐个重派为 attempt 2 |

**第 2 轮中断时的关键复核**（Captain 实测）：

| 复核项 | 结果 |
|---|---|
| `data/kb/generated/` 是否被 DevOps 的回滚测试破坏 | ✅ **完好**（`kb-v2.kb.json` 367,163 B、`adaptation-report.json` 119,972 B） |
| `validate-kb-schema.mjs data/kb/generated` | ✅ 退出 0 |
| `--dry-run` 是否会删除输出 | ✅ **不会**（实测 dry-run 后目录仍存在） |
| V1 数据（`data/knowledge_graph`、`recipes`、`fragments`、`literature`） | ✅ 零改动 |
| 重跑适配器输出是否仍确定 | ✅ SHA-256 与中断前**逐字节相同** |

**限流是执行环境问题，不是实现缺陷。** 上述中断未造成任何数据损坏或范围越界。

### 8.2 移交 KB-002 前的已知问题

| # | 问题 | 来源 | 定级 |
|---|---|---|---|
| K1 | `adapt-v1-to-v2.mjs:1330` 的 `--out` 无包含性校验，可写出仓库外 | t6 Security M1 | medium（非本轮阻断） |
| K2 | `backend/test_escape_8.js` 为未跟踪遗留文件（mtime `2026-09-25`，非本轮引入） | t6 Security L2 | low |
| K3 | `scripts/__tests__` 7 个失败（引用不存在的 `python-quality-gate.ps1` / `python_bridge_smoke.cjs`） | 基线既有 | 需 KB-002+ 决策：修复或显式豁免后再纳入 CI |
| K4 | 前端测试对源码文本强耦合（99 处 `readFileSync` + 正则断言） | t5 Frontend N1 | 后续 UI 改动需同步断言与 `REQUIRED_LABELS` |
| K5 | `frontend/src/offline/data/generatedDishImages.js` 被 gitignore，干净克隆需先跑 `build:offline:assets` | t5 Frontend N4 | 环境前置 |

---

## 9. 核验方法说明（可复现）

本文件所有「实测」结论均由 Captain 亲自执行以下之一取得：

- `node -e` / `node <script>` 读取文件（**避开 PowerShell 编码陷阱**）
- `git status`、`git diff`、`git diff --cached`、`git show HEAD:<path>`、`git check-ignore -v`
- 直接执行各测试与校验命令并记录退出码（**用 Node `spawnSync` 取退出码，不用 PowerShell 管道 `$LASTEXITCODE`**）
- 用 `node` 构造负例夹具后调用校验器，观察退出码与错误码，**用后即删**

Captain 未修改任何实现文件、数据文件或他人文档；本文件是 Captain 唯一新增的核验产物。
