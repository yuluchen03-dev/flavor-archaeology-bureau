# KB-001 完成门禁证据整合（Gate Evidence）

> ## ⚠ Captain 政策更新（2026-10-08）— 请先读本条
>
> 本文件撰写时适用的「**最终须由 Codex 独立验收**」要求，**已依据用户明确指令废止**。
> 项目自 `docs/kb-001/14-kb-001-final-status.md` 起采用新闭环：
> `Implementation → QA → Security → DevOps → Reviewer PASS → Captain Release Gate → CLOSED`。
>
> 因此，本文件正文中一切「不得据此宣布 CLOSED / 最终须由 Codex 独立验收」的表述**均已失效**。
> **KB-001 STATUS = CLOSED**（判定依据见 `14-kb-001-final-status.md` §2 的 11 项条件核验）。
> 本文件其余内容为**当时的历史记录，未改写**（保持证据真实性）。
> 另注：本文件记录的契约版本为撰写时的 `2.0.2`；K1 修复后契约已升至 **`2.0.3`**。

- 任务：t8 / KB-001D5
- 执行角色：Architect
- 写入范围：**仅本文件**（`docs/kb-001/06-kb-001-gate.md`）
- 仓库根：`D:\systemDir\Desktop\风味考古局`，分支 `feat/trae-offline-museum`
- 契约版本：`docs/kb-001/01-schema-contract.md` = **`2.0.2`**（L3）
- 环境：Node `v24.15.0`、npm `11.12.1`、Python `3.11.9`

> **本文件的定位**：这是**门禁证据整合**，不是最终审查。
> Reviewer（t9 / KB-001E）将独立审查最终变更并给出 `PASS` 或 `REQUEST_CHANGES`。
> 本文件不构成 KB-001 的最终验收结论，也不得据此宣布项目 CLOSED（最终须由 Codex 独立验收）。

> **证据纪律**：每条门禁结论都附**文件路径:行号**或**真实命令 + 退出码**。
> 标注为「**本次复核实测**」的，是我在本任务中亲自重新执行的；
> 标注为「**成员报告记录**」的，取自成员报告中的真实执行记录（未被我重新执行，已注明来源行号）。
> 未执行的检查一律标为「**未验证**」，不得当作通过。

---

## 0. 执行摘要

| # | 门禁 | 结论 |
|---|---|---|
| 1 | 所有约定实体均有 Schema | ✅ **通过** |
| 2 | 所有关系有合法端点约束 | ✅ **通过** |
| 3 | 来源与 Claim 追踪链可校验 | ✅ **通过** |
| 4 | 数据校验器及负例测试通过 | ✅ **通过** |
| 5 | V1 兼容路径可用 | ✅ **通过** |
| 6 | 原有关键演示没有本轮引入的回归 | ✅ **通过**（本轮引入失败 = **0**） |
| 7 | 没有伪造或静默补全来源 | ✅ **通过** |
| 8 | 文档命令已实际验证 | ✅ **通过**（6 条核心命令，本次复核实测全部退出 0） |

**基线已存在的失败（非本轮引入，未修复亦未掩盖）**：`scripts/__tests__/*.test.mjs` 的 **7 个失败**（34 tests / 27 pass / 7 fail，退出码 1）。

**门禁 8 项全部通过**，但存在 **1 项 medium 安全加固项（M1）** 与 **5 项移交 KB-002 的已知问题**（见第 5 节），均**不阻断**本轮交付。

---

## 1. 门禁逐项判定

### 门禁 1 — 所有约定实体均有 Schema ✅ 通过

**判定依据**：契约约定 17 个实体，Schema 实现 17 个，**无缺失、无多余**。

| 证据 | 内容 |
|---|---|
| 契约定义 | `docs/kb-001/01-schema-contract.md:250`（§9 实体定义，含 §9.1–§9.17 共 17 节） |
| Schema 实现 | `data/kb/schema/kb-schema.v2.json` |
| **本次复核实测** | `node -e "require('data/kb/schema/kb-schema.v2.json')"` → `entities: 17`，`schema_version: 2.0.0` |

**本次复核实测的 17 个实体名**（逐个列出，便于 Reviewer 比对）：

```
SourceWork, SourceEdition, SourcePassage, HistoricalClaim, Dish, Ingredient,
IngredientState, Technique, Utensil, Measurement, TimePeriod, Region,
Season, RestorationVersion, ExpertReview, SafetyRule, Experiment
```

与契约 §9.1–§9.17 的 17 个类型名**逐字一致**。

**实体级要素齐备性**（契约 §5 通用信封 + §9 特有字段）：

| 要素 | 契约位置 | 状态 |
|---|---|---|
| 稳定 ID 与 ID 前缀 | §5.2（`^[a-z][a-z0-9_]*$`，长度 3–96） | ✅ Schema `id_pattern` / `id_min_length` / `id_max_length` |
| 必填 / 可选字段 | §5.1、§9.1–§9.17 | ✅ Schema `common_fields` + 各实体 `fields` |
| 枚举 | §5.1、§7、§9.x | ✅ Schema `enums` / `reviewed_statuses` / `unreviewed_statuses` |
| provenance | §6 | ✅ Schema `provenance_fields` |
| review_status | §7 | ✅ Schema `review_status` 枚举（**5 值，不含 `verified`**） |
| unknown / insufficient 表达 | §8 | ✅ Schema `common_fields.unknown_fields` |
| schema_version | §4 | ✅ 值 `2.0.0`（`const`） |

**成员报告佐证**：`docs/kb-001/08-captain-verification.md:96`（Captain 实测「17/17，无缺失、无多余」）。

---

### 门禁 2 — 所有关系有合法端点约束 ✅ 通过

**判定依据**：契约约定 24 条关系类型，Schema 实现 24 条，**每条均有 source/target 端点类型约束**。

| 证据 | 内容 |
|---|---|
| 契约定义 | `docs/kb-001/01-schema-contract.md:615`（§10.2 关系类型清单「24 种」） |
| Schema 实现 | `data/kb/schema/kb-schema.v2.json` 的 `relations` |
| **本次复核实测** | `relations: 24`；每条含 `source` 与 `target` 数组 |
| 端点类型校验代码 | `scripts/kb/lib/validate.mjs`（错误码 `E_RELATION_ENDPOINT_TYPE`） |
| 成员报告佐证 | `docs/kb-001/08-captain-verification.md:97-98`（Captain 实测「24/24 均有」，无缺失） |

**本次复核实测的 24 条关系名**：

```
A 组（来源追踪链 5）：passage_in_edition, edition_of_work, edition_contains_work,
                      claim_supported_by, claim_refuted_by
B 组（Claim 关联 1）：claim_about
C 组（领域关系 13）：dish_contains_ingredient, dish_uses_technique, dish_originated_in,
                      dish_popular_in, dish_seasonal_for, dish_recorded_in,
                      ingredient_from_region, ingredient_season, technique_from_region,
                      ingredient_substitutes, dish_uses_utensil, ingredient_state_of,
                      measurement_of_ingredient
D 组（复原/评审/安全/实验 5）：restoration_version_of, restoration_based_on_claim,
                      review_of, safety_rule_applies_to, experiment_tests
```

与契约 §10.2 编号 1–24 **逐条一致**（A5 + B1 + C13 + D5 = 24）。

**端点约束的实证（不只是声明）**：`data/kb/examples/invalid/bad-entity-and-relation-type.kb.json` 使用非法端点类型，校验器报 `E_RELATION_ENDPOINT_TYPE` —— 见门禁 4。

**成员报告佐证**：`docs/kb-001/03-qa-verification.md:129`（负例证据章节）；`docs/kb-001/04-security-review.md:449`。

---

### 门禁 3 — 来源与 Claim 追踪链可校验 ✅ 通过

**判定依据**：两条追踪链在契约、Schema、校验器、正负例四个层面均成立。

**（a）契约层**

| 链 | 契约规则 | 位置 |
|---|---|---|
| `SourcePassage → SourceEdition → SourceWork` | TR1（Passage 归属基数）、TR2（Edition→Work 恰好 1 条）、TR3（链须抵达 Work）、TR5/TR6（镜像一致性） | `01-schema-contract.md:691`（§11.2 TR1）、`:694`（TR2/TR4） |
| `HistoricalClaim` 关联支持/反驳 | TR4（`sufficient` 的 Claim 必须有链完整的 `claim_supported_by`）；关系 `claim_supported_by` / `claim_refuted_by` 端点限定为 `HistoricalClaim → SourcePassage` | `01-schema-contract.md:694`、`:780`、`:922` |

**（b）正向路径（退出码 0）— 本次复核实测**

```
node scripts/kb/validate-kb-schema.mjs data/kb/examples/valid
→ EXIT=0
```

内置合法示例 `data/kb/examples/valid/fixture-all-entities.kb.json` 含：
- `SourcePassage` = 1 条，`edition_resolution = "resolved"`（**本次复核实测**）
- `passage_in_edition` 关系 = **1 条**（**本次复核实测**）
- 覆盖全部 17 实体与 24 关系

> **⚠ 关键说明（防止误判为缺陷）**：`passage_in_edition` 的**正向（退出码 0）路径由 `data/kb/examples/valid/` 内置合法示例覆盖**，而非由 V1 适配输出覆盖。因此门禁 3「追踪链可校验」**成立**。

**（c）反向路径 — 本次复核实测**

| 负例夹具 | EXIT | 错误码 |
|---|---|---|
| `bad-trace-chain.kb.json` | **1** | `E_TRACE_MISSING` ×2、`E_CLAIM_NO_EVIDENCE`、`E_EVIDENCE_REVIEW_CONFLICT` 等 |
| `bad-passage-in-edition-ambiguous.kb.json` | **1** | `E_TRACE_MISSING` |
| `bad-passage-in-edition-unresolved.kb.json` | **1** | `E_TRACE_MISSING` |

即：**非 `resolved` 的 Passage 若挂 `passage_in_edition` 会被拒绝**；断开 Edition→Work 链或 `resolved` 缺 `passage_in_edition` 同样被拒。

**（d）V1 适配输出的正确预期（非缺陷）**

**本次复核实测**（直接统计 `data/kb/generated/kb-v2.kb.json`）：

| 项 | 实测值 | 说明 |
|---|---|---|
| `SourcePassage` 总数 | **19** | 见下方⚠ 数字更正说明 |
| `edition_resolution` 分布 | `{"ambiguous":16,"unresolved":3}` | `resolved` = **0** |
| `unresolved` 的 3 条 | `passage_dish_005`、`passage_dish_006`、`passage_dish_010` | 书名在图中无节点 ⟹ `edition_candidates=[]` |
| `passage_in_edition` 关系 | **0** | 因无 `resolved` Passage |
| `SourcePassage.edition_id != null` | **0** | 禁止消歧已生效 |
| `HistoricalClaim` | **34** 条，**全部** `insufficient` | `sufficient` = 0 |

> **⚠ 数字更正说明（重要）**：本任务派发文本中写「本轮 16 条 SourcePassage 全部为 ambiguous(15)/unresolved(1)」，该表述来自契约 `2.0.1` 的**已被更正**的旧值。
> 契约 `2.0.2`（t11 修订）已按真实数据更正为 **19 条 = ambiguous 16 / unresolved 3 / resolved 0**（`01-schema-contract.md:912`、`:918`）。
> 我**本次复核实测**确认后者正确（19 / 16 / 3 / 0）。本文件一律采用更正后的数值。

**判定**：上述状态**正确反映 V1 真实证据水平**（V1 出处覆盖率极低），**不是**未达标。
`HistoricalClaim` 全部为 `insufficient` 是 TR4 的**正确结果**，**不得**通过放宽 TR4 来「修好」（契约 `01-schema-contract.md:322`、`:913` 明文禁止消歧）。

---

### 门禁 4 — 数据校验器及负例测试通过 ✅ 通过

**（a）校验器主命令 — 本次复核实测**

| 命令 | 退出码 | 输出 |
|---|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** | `KB schema validation PASSED: 3 file(s), 23 entities, 26 relations` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/examples/valid` | **0** | 同上 |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `KB schema validation PASSED: 1 file(s), 282 entities, 214 relations` |

**（b）测试套件 — 本次复核实测**

```
node --test "scripts/kb/__tests__/*.test.mjs"
→ tests 88 / pass 88 / fail 0 / EXIT=0
```

构成：KB-001B 自带单测 **45** + QA 独立测试 **43** = **88**（与 `03-qa-verification.md` 记录一致）。

**（c）7 个负例夹具逐个被拒 — 本次复核实测**

| 负例夹具 | EXIT | 实测错误码 |
|---|---|---|
| `bad-entity-and-relation-type.kb.json` | **1** | `E_UNKNOWN_ENTITY_TYPE`, `E_UNKNOWN_RELATION_TYPE` |
| `bad-fields-and-refs.kb.json` | **1** | `E_MISSING_FIELD`, `E_ENUM_INVALID`, `E_TIME_RANGE_INVALID`×2, `E_FIELD_TYPE`, `E_RELATION_SHAPE`, `E_DUPLICATE_ID`, `E_RELATION_ENDPOINT_TYPE`, `E_DANGLING_REFERENCE`×2 |
| `bad-no-fabrication.kb.json` | **1** | `E_MEASUREMENT_FABRICATED`, `E_MEASUREMENT_INCOMPLETE`, `E_REVIEW_UNVERIFIABLE`, `E_EVIDENCE_UNKNOWN_CONFLICT`, `E_PROVENANCE_MISSING`, `E_REVIEW_STATUS_UNSUPPORTED`, `E_HERITAGE_UNSOURCED` |
| `bad-passage-in-edition-ambiguous.kb.json` | **1** | `E_TRACE_MISSING` |
| `bad-passage-in-edition-unresolved.kb.json` | **1** | `E_TRACE_MISSING` |
| `bad-review-status-verified.kb.json` | **1** | `E_ENUM_INVALID` |
| `bad-trace-chain.kb.json` | **1** | `E_EVIDENCE_UNKNOWN_CONFLICT`×2, `E_UNKNOWN_UNDECLARED`, `E_EVIDENCE_REVIEW_CONFLICT`, `E_PROVENANCE_UNRESOLVED_CONFLICT`, `E_TRACE_MISSING`×2, `E_CLAIM_NO_EVIDENCE`, `E_REVIEW_STATUS_UNSUPPORTED` |

**覆盖的必查项**（对照用户要求逐条）：

| 用户要求的检查 | 实测覆盖 | 证据 |
|---|---|---|
| 无效实体类型 | ✅ | `E_UNKNOWN_ENTITY_TYPE` |
| 必填字段与字段类型错误 | ✅ | `E_MISSING_FIELD`, `E_FIELD_TYPE` |
| 重复 ID | ✅ | `E_DUPLICATE_ID` |
| 悬空引用 | ✅ | `E_DANGLING_REFERENCE` |
| 未知关系类型 | ✅ | `E_UNKNOWN_RELATION_TYPE` |
| 不合法的关系端点类型 | ✅ | `E_RELATION_ENDPOINT_TYPE` |
| 来源追踪链缺失 | ✅ | `E_TRACE_MISSING`, `E_TRACE_BROKEN`, `E_CLAIM_NO_EVIDENCE` |
| 非法枚举或时间区间 | ✅ | `E_ENUM_INVALID`, `E_TIME_RANGE_INVALID` |

**（d）输出五要素**：每条错误含 `file` / `entityOrRelationId` / `fieldPath` / `code` / `message`。
**成员报告记录**：7 个负例夹具共 31 条错误记录，五字段齐全且非空 **31/31**（`docs/kb-001/03-qa-verification.md:129` 起）。

**（e）校验器不修改输入**：成员报告记录「校验前后 11 个输入文件 SHA-256 全部不变（0/11）」（`03-qa-verification.md` §4）；Captain 复跑确认 `data/kb/generated` 校验后 V1 零改动（`08-captain-verification.md:372`）。
**本次复核实测**：`node --test` 中 `validator does not modify any input file` 用例通过（属 88 通过之一）。

**（f）退出码语义**：0 = 通过、1 = 校验失败、2 = 运行错误（契约 §12.2，`01-schema-contract.md:713`）。
**成员报告记录**：`--bogus-arg` → 2、`--out` 缺值 → 2、不存在路径 → 2（`docs/kb-001/05-devops-verification.md:45` 起）。

---

### 门禁 5 — V1 兼容路径可用 ✅ 通过

**判定依据**：V1 读取路径**零修改**、V1 数据**零改动**、V1 门禁**仍全绿**、适配器**只读输入**。

**（a）V1 读取路径冻结 — 本次复核实测**

| 检查 | 结果 |
|---|---|
| `git status --porcelain -- data/knowledge_graph` | **空**（零改动） |
| 契约冻结清单 | `01-schema-contract.md:974`（§14，含 `service/knowledge_graph.py:22-59`、`LightModeService.js:3-5`、`VisionService.js:3`、`VisionCandidateMapper.js:3`、`FragmentService.js:3`、`StarMapService.js:5` 等） |

**（b）适配器可运行 — 本次复核实测**

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | `entities: 282, relations: 214`；`v1_inputs_unchanged: true`；不写任何文件 |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** | 写出 `data/kb/generated/{kb-v2.kb.json, adaptation-report.json}` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | 1 file(s), 282 entities, 214 relations |

**本次复核实测的适配输出构成**（来自 `--dry-run`）：

```
entities_by_type: Dish 40, ExpertReview 4, HistoricalClaim 34, Ingredient 16,
  IngredientState 7, Measurement 10, Region 5, RestorationVersion 4, SafetyRule 1,
  Season 7, SourceEdition 106, SourcePassage 19, SourceWork 10, Technique 10,
  TimePeriod 7, Utensil 2            → 合计 282
relations_by_type: claim_about 34, dish_contains_ingredient 10, dish_originated_in 10,
  dish_popular_in 2, dish_recorded_in 10, dish_seasonal_for 2, dish_uses_technique 9,
  edition_contains_work 11, edition_of_work 106, ingredient_substitutes 3,
  restoration_based_on_claim 4, restoration_version_of 4, review_of 4,
  safety_rule_applies_to 1, technique_from_region 4   → 合计 214
passages_by_resolution: {ambiguous: 16, unresolved: 3}
historical_claims_by_evidence_status: {insufficient: 34}
passage_in_edition_relations: 0
v1_inputs_unchanged: true
```

**（c）V1 门禁仍全绿 — 本次复核实测**

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/verify_graph_schema.mjs` | **0** | `ok: true`，`nodeCount 193`，`relationshipCount 49` |
| `node scripts/verify_literature_dataset.mjs` | **0** | `Verified 106 authoritative literature entries.` / `Verified 103 authority-backed ancient_text nodes.` |

与 `00-fact-audit.md` §4.1 的基线 B1/B2 **逐项一致**。

**（d）兼容层可关闭/回滚**：见第 4 节（回滚方法）。

**（e）只读保证**：适配器运行前后 V1 输入文件 SHA-256 不变（`v1_inputs_unchanged: true`）；成员报告记录 16 个输入文件 changed = 0（t3）；Captain 复跑确认 changed = 0（`08-captain-verification.md:372`）。

> **说明**：t3 报告称 16 个输入文件、Captain 称 13 个 —— 差异源于统计口径（是否计入 `expert_review_manifest.json`、`ingredient_mapping.json`、`intangible_heritage.json`）。**两者均为 0 改动**，结论一致；此处如实记录口径差异，不掩盖。

---

### 门禁 6 — 原有关键演示没有本轮引入的回归 ✅ 通过

**判定依据**：5 个套件与基线逐项比对，**本轮引入的失败 = 0**。

**（a）本次复核实测（我亲自重跑）**

| 套件 | 命令 | 退出码 | 本次实测结果 | 基线（`00-fact-audit.md` §4.1/§4.2） | 判定 |
|---|---|---|---|---|---|
| 后端 Jest | `cd backend && npm test -- --runInBand` | **0** | Test Suites: **43 passed / 43**；Tests: **213 passed / 213** | 43 / 213 | ✅ 一致 |
| 前端 node:test | `cd frontend && npm test` | **0** | tests **153** / pass **153** / fail **0** | 153 / 0 | ✅ 一致 |
| 前端 lint | `cd frontend && npm run lint` | **0** | 无输出（干净） | 干净 | ✅ 一致 |
| Python unittest | `python -m unittest discover -s service -p 'test*.py'` | **0** | `Ran 9 tests` — `OK` | 9 / OK | ✅ 一致 |
| KB-001 测试 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | tests **88** / pass **88** / fail **0** | 本轮新增 | ✅ 全绿 |
| 图谱/文献门禁 | `verify_graph_schema.mjs` / `verify_literature_dataset.mjs` | **0** / **0** | 193 节点·49 关系 / 106·103 | 同 | ✅ 一致 |

**（b）基线已存在的失败（非本轮引入）— 本次复核实测**

| 套件 | 命令 | 退出码 | 本次实测 | 基线 | 判定 |
|---|---|---|---|---|---|
| 脚本层测试 | `node --test "scripts/__tests__/*.test.mjs"` | **1** | tests **34** / pass **27** / **fail 7** | 34 / 27 / 7 | ⚠ **基线已存在，逐项一致** |

**本次复核实测确认的 7 个失败**，全部位于 3 个文件（与 `00-fact-audit.md` §4.2 完全一致）：

| 文件 | 失败数 | 失败用例 |
|---|---|---|
| `scripts/__tests__/verify_all_python_contract.test.mjs` | 4 | `verify-all delegates Python checks to one executable quality gate`；`Python discovery honors explicit configuration then probes portable candidates in order`；`the resolved Python runs unittest, data validation, and a real PythonBridge smoke`；`deployment source checks validate discovery and smoke wiring, not only the unittest word` |
| `scripts/__tests__/verify_offline_bundle.test.mjs` | 2 | `requires key offline labels in built html`；`accepts html without any fetch() calls` |
| `scripts/__tests__/verify_offline_ui.test.mjs` | 1 | 文件级失败 |

**根因**（`00-fact-audit.md` §4.2，已核实）：测试要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`，**这两个文件在仓库中不存在**；且测试断言 `verify-all.ps1` **不应**包含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含。

**明确区分**：

| 类别 | 数量 | 处置 |
|---|---|---|
| **基线已存在**的失败 | **7** | 本轮**不修复**（范围外）、**未掩盖**、**未删除负例**、数量与基线一致 |
| **本轮引入**的失败 | **0** | — |

**（c）`verify-all.ps1` 全量质量门 — 成员报告记录**

| 项 | 结果 | 来源 |
|---|---|---|
| `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1` | 退出码 **0**，全部 10 个步骤 `OK` | `docs/kb-001/05-devops-verification.md:224-238` |

> **⚠ 重要澄清**：`verify-all.ps1` **不包含** `scripts/__tests__/*.test.mjs` 那套测试，因此它退出 0 **并不代表**那 7 个失败消失了（`05-devops-verification.md:240-253`）。两者必须分开陈述。

**（d）一处环境性偶发失败（如实记录，非本轮引入）**

`verify-all.ps1` **首次**执行时 `Backend tests` 崩溃（退出码 `-1073740791` = `0xC0000409` = STATUS_STACK_BUFFER_OVERRUN）。
排查：当时有 **12 个并发 `node` 进程**；**连续 4 次独立重跑全部退出 0**（43 套件 / 213 用例）；质量门重跑退出 0。
判定：**环境性资源竞争，非 KB-001 引入，非代码缺陷**（`05-devops-verification.md:257-294`）。
**本次复核实测**：我重跑后端 Jest 得 **43/213 全通过、退出 0**，与该判定一致。

**（e）前端零影响**：KB-001 对前端**零运行时影响**，无需任何前端改动（`02-frontend-compat.md`）。
关键证据：前端源码对 KB-001 产物引用数 = 0；前端读取根 `data/` 的唯一位置为 `frontend/src/offline/data/offlineMuseumData.js:5-12` 的 8 条构建期 import，**均不在本轮写入范围**；前端无目录通配逻辑（`import.meta.glob` / `require.context` 均 0 命中）；`frontend/src` 下本轮零修改。
**本次复核实测**：前端 `npm test` = 153/0、`npm run lint` = 退出 0。

---

### 门禁 7 — 没有伪造或静默补全来源 ✅ 通过

**判定依据**：以下 6 组抽查证据，**全部本次复核实测**（直接读取 `data/kb/generated/kb-v2.kb.json` 与契约/Schema）。

**（7.1）`text_001`–`text_005` 为 insufficient 且未补造来源**

| 实体 | name | evidence_status | derivation | review_status | source_locator |
|---|---|---|---|---|---|
| `work_text_001` | 山家清供 | `insufficient` | `unresolved` | `unreviewed` | **不存在**（`undefined`） |
| `work_text_002` | 随园食单 | `insufficient` | `unresolved` | `unreviewed` | **不存在** |
| `work_text_003` | 齐民要术 | `insufficient` | `unresolved` | `unreviewed` | **不存在** |
| `work_text_004` | 饮膳正要 | `insufficient` | `unresolved` | `unreviewed` | **不存在** |
| `work_text_005` | 东京梦华录 | `insufficient` | `unresolved` | `unreviewed` | **不存在** |

5 条**全部**为 `insufficient` + `derivation: unresolved` + `review_status: unreviewed`，**且无 `source_locator`** —— 未为缺失出处补造任何卷/页/版本信息。
（对应 V1 事实 F7：`text_001`–`text_005` 完全无出处字段；契约要求 `01-schema-contract.md:240` §8.3 N1–N5。）

**（7.2）`lit_ccs_006`/`014`/`027` 未被按 title 相等建链**

| 实体 | name（与内容著作**同名**） | `work_id` | `edition_of_work` target |
|---|---|---|---|
| `edition_lit_ccs_006` | 随园食单 | `work_src_chinese_cooking_classics_series` | `work_src_chinese_cooking_classics_series` |
| `edition_lit_ccs_014` | 山家清供 | `work_src_chinese_cooking_classics_series` | `work_src_chinese_cooking_classics_series` |
| `edition_lit_ccs_027` | 饮膳正要 | `work_src_chinese_cooking_classics_series` | `work_src_chinese_cooking_classics_series` |

**本次复核实测**：`edition_of_work` 共 **106** 条，其中指向内容著作（`work_text_*`）= **0**，指向丛刊（`work_src_*`）= **106**。
即三条**同名**条目**未**按 `title` 相等错误建链到内容著作（契约 `01-schema-contract.md:291` §9.2 明文禁止）。

**（7.3）`SourceWork` 为 10 条且含 2 个显式 unresolved 的未解析书名**

**本次复核实测** `SourceWork` = **10** 条：

| 分组 | 数量 | 实体 |
|---|---|---|
| 内容著作 | 5 | `work_text_001`–`005`（山家清供/随园食单/齐民要术/饮膳正要/东京梦华录） |
| 丛刊 | 3 | `work_src_ancient_food_literature_collection_2021`、`work_src_chinese_cooking_classics_series`、`work_src_china_food_culture_classics_2025` |
| **未解析书名** | **2** | `work_unresolved_001`（东坡志林）、`work_unresolved_002`（烧尾宴食单） |

2 个未解析书名的关键字段（**本次复核实测**）：

| 实体 | name | attribution_status | author | evidence_status | derivation |
|---|---|---|---|---|---|
| `work_unresolved_001` | 东坡志林 | `unknown` | **`null`** | `insufficient` | `unresolved` |
| `work_unresolved_002` | 烧尾宴食单 | `unknown` | **`null`** | `insufficient` | `unresolved` |

即：作者**显式 `null`**（未编造），`attribution_status: unknown`（未猜测），`derivation: unresolved`。

**（7.4）契约 R1 明确 `review_status` 枚举不含 `verified`**

| 证据 | 内容 |
|---|---|
| 契约 | `01-schema-contract.md:218`（§7 R1：「枚举中**刻意不存在** `verified` 取值——因此『被静默标记为 verified』在结构上不可能发生」） |
| 契约 §7 枚举 | `unreviewed` / `internal_reviewed` / `pending_external_expert` / `external_reviewed` / `rejected`（`01-schema-contract.md:206`） |
| Schema 实现 | `kb-schema.v2.json` 的 `review_status` 枚举（**本次复核实测**） |
| **本次复核实测** | 适配输出 `review_status` 分布 = **`{"unreviewed":282}`**（282/282） |
| **本次复核实测** | 全文档字面量 `"verified"` 出现次数 = **0** |

**（7.5）来源不足未被静默升级**

| 检查 | **本次复核实测** |
|---|---|
| `Dish` 总数 | 40（`historical_documented_dish` 10 + `heritage_practice_lead` 30） |
| `Dish` 中 `evidence_status = sufficient` | **0** |
| `HistoricalClaim` 总数 | 34，**全部** `insufficient`（`sufficient` = 0） |
| 契约 N4（30 条线索类不得升级） | `01-schema-contract.md:240` §8.3 N4 |
| 成员报告佐证 | `04-security-review.md:449`（30 条线索类全部 insufficient/unresolved/unreviewed；违反三项要求 = 0） |

**（7.6）无编造值（零伪造）**

| 检查 | **本次复核实测** | 说明 |
|---|---|---|
| `SourceEdition.publication_year != null` | **0 / 106** | 未编造出版年 |
| `SourcePassage.locator` 任一成员 `!= null` | **0** | 未编造卷/章/页/条目 |
| `Experiment` 实体数 | **0** | 未编造实验数据（契约 EX3） |
| `ExpertReview.reviewer_kind` | 仅 `["internal_editor"]` | 未伪造外部专家 |
| `ExpertReview.review_outcome` | 仅 `["pending"]` | 未伪造已签核 |
| 适配报告含免责声明 | **是**（逐字「适配成功只表示结构转换成功，不代表历史真实性已经核验。」） | 契约 §13.7 |

**成员报告佐证（双向交叉核对）**：`04-security-review.md:93` 起 —— V1 真实来源 6 个 URL，V2 输出 0 个 URL，**V2 中出现但 V1 不存在的 URL = 0（零伪造）**；伪造 `verification_note` = 0。

---

### 门禁 8 — 文档命令已实际验证 ✅ 通过

**判定依据**：6 条核心命令**本次复核实测全部退出 0**；退出码语义与文档一致。

**（a）本次复核实测的命令与退出码**

| # | 命令 | 退出码 | 实测输出摘要 |
|---|---|---|---|
| 1 | `node scripts/kb/validate-kb-schema.mjs` | **0** | `PASSED: 3 file(s), 23 entities, 26 relations` |
| 2 | `node scripts/kb/validate-kb-schema.mjs data/kb/examples/valid` | **0** | 通过 |
| 3 | `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |
| 4 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | tests 88 / pass 88 / fail 0 |
| 5 | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | entities 282 / relations 214 / `v1_inputs_unchanged: true` |
| 6 | `node scripts/kb/verify_graph_schema.mjs`（V1 回归） | **0** | 193 节点 / 49 关系 |
| 7 | `node scripts/kb/verify_literature_dataset.mjs`（V1 回归） | **0** | 106 / 103 |

**（b）契约中记载的 CLI 与退出码**

| 项 | 契约位置 | 实测一致性 |
|---|---|---|
| CLI 形式 `node scripts/kb/validate-kb-schema.mjs [<path>...]` | `01-schema-contract.md:713`（§12.2 上下文） | ✅ 一致 |
| 退出码 0 / 1 / 2 | `01-schema-contract.md:713` | ✅ 一致（成员报告 `05-devops-verification.md:45` 起验证 2 的分支） |
| 适配器 CLI `--dry-run` / `--out` | `01-schema-contract.md:963`（§13.9 上下文） | ✅ 一致 |

**（c）新增依赖**：**零新增第三方依赖**，仅用 Node 内置模块（`node:fs` / `node:path` / `node:url` / `node:test` / `node:assert`）。
**成员报告佐证**：`05-devops-verification.md:21`（「零新增第三方依赖，仅用 Node 内置模块」）。
**本次复核实测**：`node --test` 全部用例通过，说明脚本在 Node `v24.15.0` 下可运行。

**（d）CI 接入**：⚠ **本轮不接入**（已给出最小建议方案，见 `05-devops-verification.md:310-340`）。
理由：① 当前分支不在 CI 触发范围（无法被实际验证）；② CI 为 Node `18.x`/`20.x`，本环境验证于 `24.15.0`，兼容性**未验证**；③ 超出本轮范围（「不要无关改造流水线」）。
**此项如实标为「未接入」，不写成通过。**

---

## 2. 不适用的验证项与未验证项

### 2.1 不适用的验证项（说明理由）

| 项 | 不适用的理由 |
|---|---|
| UI 改版回归（视觉/交互） | 本轮**禁止** UI 改版；前端零改动，`frontend/src` mtime 全部早于本轮 |
| LLM Prompt / 复原算法 / `evidenceScore` 验证 | 本轮**禁止**修改；相关文件未被触碰 |
| 批量菜品扩充验证 | 本轮**禁止**扩菜品；`nodes_dish.json` 零改动 |
| 新基础设施（Neo4j/Milvus/ES/Kafka）验证 | 本轮**禁止**引入；零新增依赖 |
| 容器镜像构建与容器启动 | 本轮**不执行** `docker compose up --build`；仅验证 `docker compose config` 可解析 |
| 生产迁移 / 部署 | 明确**禁止** |

### 2.2 未验证项（**不得当作通过**）

| # | 未验证项 | 原因 | 来源 |
|---|---|---|---|
| 1 | `docker compose up --build` 端到端（镜像构建 + 容器启动） | 范围外；耗时且创建容器与卷。**`docker compose config` 通过 ≠ 镜像构建成功** | `05-devops-verification.md:360` |
| 2 | `scripts/package_trae_submission.ps1` / `release/` 产物校验 | 本轮禁止打包发布物 | `05-devops-verification.md:361,365` |
| 3 | `scripts/verify-demo-stack.ps1 -RequireRunning` | 需先启动常驻演示栈；本轮不启动常驻服务 | `05-devops-verification.md:362` |
| 4 | GitHub Actions 实际运行 | 当前分支不在 CI 触发范围，且本轮禁止 push；**CI 配置仅为静态阅读** | `05-devops-verification.md:363` |
| 5 | 浏览器 / 视觉回归 | 本轮无 UI 改动 | `03-qa-verification.md:343` |
| 6 | 后端 API 联调 / `npm run dev` 交互 | 未执行 | `02-frontend-compat.md:239-243` |
| 7 | 符号链接（symlink）输入处理 | Windows 下创建符号链接返回 `EPERM`，无法构造用例 | `04-security-review.md:437` |
| 8 | 适配器并发竞态行为 | 超出范围，且无并发调用方 | `04-security-review.md:438` |
| 9 | 磁盘写满 / 权限拒绝错误路径 | 未构造该故障场景 | `04-security-review.md:439` |
| 10 | 适配器超大输入资源消耗 | 本轮输入规模固定，无 DoS 评估需求 | `04-security-review.md:440` |
| 11 | `backend/.env` 实际内容 | **有意未读取**（红线：只核对键名） | `04-security-review.md:441` |
| 12 | 远端仓库 `chenfei462/flavor-archaeology-bureau-public` 与本地差异 | 未比对 | `00-fact-audit.md` §7 |
| 13 | KB-001 脚本在 CI 的 Node 18.x / 20.x 下可用性 | 本环境仅验证 `24.15.0` | `05-devops-verification.md:315` |
| 14 | Reviewer 最终审查（t9） | 依赖本文件，尚未执行 | `08-captain-verification.md:381` |
| 15 | Codex 最终独立验收 | 团队外流程 | 团队协议 |

---

## 3. 交付物清单

### 3.1 新增文件（26 个，全部为未跟踪 `??`）

**A. Schema 与数据（12 个）**

| 路径 | 字节 | 目的 | 兼容影响 |
|---|---|---|---|
| `data/kb/schema/kb-schema.v2.json` | 22,388 | **唯一事实来源**：17 实体 / 24 关系 / 枚举 / 端点约束 | 无（无既有代码引用） |
| `data/kb/examples/valid/minimal.kb.json` | 881 | 合法最小数据 | 无 |
| `data/kb/examples/valid/fixture-all-entities.kb.json` | 19,621 | 覆盖 17 实体 + 24 关系；含 1 条 `resolved` Passage + `passage_in_edition`（**门禁 3 正向路径**） | 无 |
| `data/kb/examples/valid/insufficient-declared.kb.json` | 3,056 | 显式 `insufficient` 合法样例 | 无 |
| `data/kb/examples/invalid/bad-entity-and-relation-type.kb.json` | 1,484 | 负例：无效实体/关系类型 | 无 |
| `data/kb/examples/invalid/bad-fields-and-refs.kb.json` | 4,008 | 负例：缺字段/枚举/时间区间/重复 ID/悬空引用/端点类型 | 无 |
| `data/kb/examples/invalid/bad-no-fabrication.kb.json` | 4,931 | 负例：编造用量/不可验证评审/证据冲突/非遗无出处 | 无 |
| `data/kb/examples/invalid/bad-passage-in-edition-ambiguous.kb.json` | 4,172 | 负例：`ambiguous` 却挂 `passage_in_edition` | 无 |
| `data/kb/examples/invalid/bad-passage-in-edition-unresolved.kb.json` | 3,252 | 负例：`unresolved` 却挂 `passage_in_edition` | 无 |
| `data/kb/examples/invalid/bad-review-status-verified.kb.json` | 979 | 负例：`review_status="verified"` | 无 |
| `data/kb/examples/invalid/bad-trace-chain.kb.json` | 5,290 | 负例：追踪链断开 | 无 |
| — | — | （`data/kb/generated/` 2 个文件为派生输出，**已 gitignore、不入版本库**，见 3.3） | — |

**B. 校验器与适配器（7 个）**

| 路径 | 字节 | 目的 | 兼容影响 |
|---|---|---|---|
| `scripts/kb/validate-kb-schema.mjs` | 5,179 | CLI 校验器入口（退出码 0/1/2） | 无（新文件，无既有引用） |
| `scripts/kb/lib/schema.mjs` | 4,080 | Schema 加载与索引 | 无 |
| `scripts/kb/lib/validate.mjs` | 43,938 | 校验规则（35 错误码） | 无 |
| `scripts/kb/lib/errors.mjs` | 1,565 | 错误记录构造 + 路径脱敏 | 无 |
| `scripts/kb/adapt-v1-to-v2.mjs` | 58,934 | V1→V2 兼容适配器（`--dry-run` / `--out`） | 无（只读 V1、只写 `data/kb/generated/`） |
| `scripts/kb/lib/adapt/mapping.mjs` | 4,467 | 纯映射函数 | 无 |

**C. 测试（2 个）**

| 路径 | 字节 | 目的 | 兼容影响 |
|---|---|---|---|
| `scripts/kb/__tests__/validate-kb-schema.test.mjs` | 24,833 | KB-001B 校验器自带单测（45 用例） | 无 |
| `scripts/kb/__tests__/independent-qa.test.mjs` | 43,980 | QA 独立测试（43 用例，夹具构造在 `os.tmpdir()`） | 无 |

**D. 文档（7 个）**

| 路径 | 字节 | 目的 |
|---|---|---|
| `docs/kb-001/00-fact-audit.md` | 27,194 | Repository Fact Audit（基线事实与命令记录） |
| `docs/kb-001/01-schema-contract.md` | 82,694 | KB-001A 契约（**已冻结，版本 `2.0.2`**） |
| `docs/kb-001/02-frontend-compat.md` | 18,753 | 前端兼容影响分析 + 演示回归（t5） |
| `docs/kb-001/03-qa-verification.md` | 18,016 | QA 独立测试与负例证据（t4） |
| `docs/kb-001/04-security-review.md` | 24,378 | 安全审查（t6） |
| `docs/kb-001/05-devops-verification.md` | 20,378 | 构建、回滚与文档命令验证（t7） |
| `docs/kb-001/06-kb-001-gate.md` | 本文件 | 门禁证据整合（t8） |
| `docs/kb-001/08-captain-verification.md` | 18,907 | Captain 独立核验（t8 之外，Captain 产出） |

### 3.2 修改文件（**1 个**）

| 路径 | 改动 | 目的 | 兼容影响 |
|---|---|---|---|
| `.gitignore` | **追加 1 行**：`data/kb/generated/` | 使派生输出不入版本库 | 无（纯追加，不影响既有条目） |

**本次复核实测**：
```
git diff -- .gitignore
@@ -24,3 +24,4 @@ yarn-error.log*
 __pycache__/
 **/__pycache__/
 *.py[cod]
+data/kb/generated/
```
```
git check-ignore -v data/kb/generated/kb-v2.kb.json
→ .gitignore:27:data/kb/generated/   （退出码 0）
```

> **说明**：Captain 在 `08-captain-verification.md:73-86` 记录该行曾被回退（当时 `git check-ignore` 退出码 1）。
> **本次复核实测该行现已存在且生效**：`git diff` 显示 `+data/kb/generated/`，`git check-ignore -v` 返回 **`.gitignore:27`**（退出码 0）。
> **⚠ 行号更正**：契约 `01-schema-contract.md:1029` 曾称该行位于 `.gitignore:16` —— 该行号在**回退后重新追加**时变为**第 27 行**（追加到文件末尾）。
> 本文件采用**实测行号 27**；判定依据是「该行存在且生效」，与具体行号无关。即 §2.4 的「待确认陈述」现已成立（内容成立，行号已变更）。

### 3.3 派生输出（不入版本库）

| 路径 | 字节 | 说明 |
|---|---|---|
| `data/kb/generated/kb-v2.kb.json` | 367,163 | 适配器输出（282 实体 / 214 关系）；已 gitignore；可确定性重建 |
| `data/kb/generated/adaptation-report.json` | 119,972 | 适配报告（11 个契约键）；已 gitignore |

### 3.4 未改动（本轮红线，本次复核实测）

| 范围 | 状态 |
|---|---|
| `data/knowledge_graph/**`（V1 图谱数据） | ✅ **零改动**（`git status` 为空） |
| `data/recipes/`、`data/fragments/`、`data/literature/`、`data/ingredients/`、`data/techniques/` | ✅ 零改动 |
| `backend/**`、`frontend/src/**`、`service/**` | ✅ 零改动（KB-001 未触碰） |
| `docker-compose.yml`、`*/Dockerfile`、`.dockerignore` | ✅ 零改动 |
| `.github/workflows/**` | ✅ 零改动（仅静态阅读） |

**兼容影响总结**：KB-001 **未修改任何 V1 读取路径**（契约 §14 冻结清单，`01-schema-contract.md:974`）。
所有新增文件位于 `data/kb/`、`scripts/kb/`、`docs/kb-001/`；V1 与 V2 **并行共存**，由适配器**单向派生**。对 V1 运行时行为**零影响**。
硬约束 H1（V2 数据禁止入 `data/knowledge_graph/`）已遵守：`data/kb/` 下无 `nodes_*.json`。

---

## 4. 回滚方法

**关键性质**：本轮**零改动** V1 读取路径与 V1 数据，因此回滚**不需要**触碰任何既有文件（`.gitignore` 除外，且为追加）。

| 层级 | 回滚动作 | 影响 | 实测依据 |
|---|---|---|---|
| 适配器输出 | `Remove-Item -Recurse -Force data/kb/generated` | 无（已 gitignore） | `05-devops-verification.md:142-187`：实测删除后 V1 完整可用、目录确认不存在（`Test-Path` = `False`）、可确定性重建（重建后 SHA-256 逐字节相同） |
| 适配器代码 | 删除 `scripts/kb/adapt-v1-to-v2.mjs` + `scripts/kb/lib/adapt/` | 无 | 无既有引用 |
| `.gitignore` | 撤销追加的 1 行 `data/kb/generated/` | 无 | 纯追加 |
| 校验器与 Schema | 删除 `scripts/kb/`、`data/kb/` | 无（无既有代码引用） | 契约 M21/M22：全仓库无 `data/kb` 引用；无脚本递归扫描 `data/` |
| 测试 | 删除 `scripts/kb/__tests__/` | 无 | — |
| 文档 | 删除 `docs/kb-001/` | 无 | — |

**回滚后验证**：`node scripts/verify_graph_schema.mjs`（退出 0）、`node scripts/verify_literature_dataset.mjs`（退出 0）、后端 Jest（43/213）、前端（153/0）应仍全绿。

**回滚禁止项**（契约 X11，`01-schema-contract.md`）：**不得**使用 `git reset --hard` / `git clean` / `git checkout --` 覆盖未提交代码。

**副作用说明（如实记录）**：DevOps 为验证回滚路径**实际删除过** `data/kb/generated/`，随后**已完整重建**并校验（重建后两文件 SHA-256 与删除前逐字节相同，`validate-kb-schema.mjs data/kb/generated` 退出 0），V1 原始数据 changed = 0（`05-devops-verification.md:384-388`）。

---

## 5. 尚存问题与 KB-002 启动条件

### 5.1 尚存问题

**（a）基线已存在的缺陷（非本轮引入，本轮不修复）**

| # | 问题 | 位置 | 影响 | 处置 |
|---|---|---|---|---|
| B1 | `scripts/__tests__` **7 个失败**：引用不存在的 `scripts/python-quality-gate.ps1`、`scripts/python_bridge_smoke.cjs`；且断言 `verify-all.ps1` 不应含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含 | `scripts/__tests__/verify_all_python_contract.test.mjs`（4）、`verify_offline_bundle.test.mjs`（2）、`verify_offline_ui.test.mjs`（1） | 脚本层测试套件红 | **范围外**，本轮不修复、未掩盖；数量与基线一致 |
| B2 | `text_lit_076`/`084`/`097` 缺失（根因 `scripts/build_literature_dataset.mjs:237` 按 `title` 去重丢弃 3 条） | `data/knowledge_graph/nodes_ancient_text.json` | 3 条权威条目出处不可达 | **范围外**；适配器记入报告 `preserved_v1_defects` |
| B3 | `先秦` 的 `start_year == end_year == -221` | `data/knowledge_graph/nodes_dynasty.json` | V1 数据缺陷 | **范围外**；原样保留并记入报告 |
| B4 | `recorded_in` 的 `source_text` 与目标节点 `title` **冲突 5 条**（`dish_005,007,008,009,010`） | `data/knowledge_graph/relationships.json` | V1 数据缺陷 | **范围外**；保留关系并标 `insufficient`，记入报告 `conflicts` |
| B5 | `deliverables/gstack/pre-launch-check-2026-09-25.md` 结论 🔴 No-Go（6 项 P0） | `deliverables/` | 发布前门禁 | **范围外** |

**（b）本轮发现但未修复（移交 KB-002）**

| # | 问题 | 位置 | 定级 | 建议 |
|---|---|---|---|---|
| K1 | `--out` 未做仓库边界校验，可写出仓库外 | `scripts/kb/adapt-v1-to-v2.mjs:1330` | **medium** | 增加包含性校验（`outDir` 须以 `REPO_ROOT + sep` 开头），违规退出 2；**并同步补齐契约 §13.6 的 `--out` 约束**（契约层根因）。**非本轮阻断**（该 CLI 为开发者手动工具，`backend/src`、`service` 引用数均为 0） |
| K2 | `backend/test_escape_8.js` 未跟踪遗留调试脚本 | `backend/` | low | mtime `2026-09-25`，早于本轮；被引用 0；密钥 0 命中。建议后续清理 |
| K3 | 前端测试对源码文本强耦合（99 处 `readFileSync` + 正则断言） | `frontend/src/**/__tests__/` | — | KB-002+ 若改 UI 须同步更新断言与 `verify_offline_bundle.mjs:4-11` 的 `REQUIRED_LABELS` |
| K4 | `frontend/src/offline/data/generatedDishImages.js` 被 gitignore | `frontend/` | — | 干净克隆后须先跑 `npm run build:offline:assets` |
| K5 | CI 未接入 KB Schema 校验 | `.github/workflows/test.yml` | — | 本轮不接入（见门禁 8(d)）；建议 KB-002 或后续按最小方案接入，**前置条件**：先验证 Node 18.x/20.x 兼容性或提升 `matrix.node-version` |

**（c）本轮未完成项**

| 项 | 状态 |
|---|---|
| CI 接入 Schema 校验 | ⚠ **本轮不接入**（给出建议方案，非通过） |
| `docker compose up --build` 端到端 | **未执行**（见 §2.2） |
| Reviewer 最终审查（t9 / KB-001E） | **未执行**（依赖本文件） |
| Codex 最终独立验收 | **未执行**（团队外流程） |

### 5.2 KB-002 启动条件

**（a）硬前置（必须满足）**

| # | 条件 | 依据 |
|---|---|---|
| 1 | KB-001 门禁 1–8 **全部通过** | 本文件 §0/§1 |
| 2 | Reviewer（t9 / KB-001E）对最终变更返回 **PASS** | 团队协议；本文件不是审查 |
| 3 | **K1（medium）已修复**：`adapt-v1-to-v2.mjs:1330` 增加 `--out` 包含性校验，并同步补齐契约 §13.6 的 `--out` 约束 | `04-security-review.md:459`「建议在 KB-002 启动前修复」 |
| 4 | 契约版本已冻结且与真实数据一致（现 `2.0.2`） | `01-schema-contract.md:3` |

**（b）软前置（建议满足，可并行）**

| # | 条件 | 依据 |
|---|---|---|
| 5 | 决策 K3（`scripts/__tests__` 7 个基线失败）：修复或显式豁免后再纳入 CI | `08-captain-verification.md:413` |
| 6 | 决定 CI 接入方案（含 Node 版本兼容性验证） | 门禁 8(d) |
| 7 | 明确 KB-002 的 Golden 10 来源标准与「来源不足不得凑数」的可校验判据 | 用户要求；KB-001 的 `insufficient` 机制已就绪 |
| 8 | 确认 KB-002 数据落位：沿用 `data/kb/`（**禁止** `data/knowledge_graph/`，H1） | 契约 H1，`01-schema-contract.md:1026`（§16） |

**（c）KB-001 为 KB-002 已就绪的能力**

| 能力 | 状态 | 对 KB-002 的价值 |
|---|---|---|
| 17 实体 + 24 关系版本化 Schema | ✅ 可用 | Golden 10 可直接以 `schema_version: 2.0.0` 落位 |
| 可执行校验器（35 错误码，退出码可用于 CI） | ✅ 可用 | 数据入库即校验 |
| 追踪链规则 TR1–TR8 | ✅ 可用 | 强制来源可追溯 |
| `unknown`/`insufficient` 显式表达 + No-Fabrication N1–N5 | ✅ 可用 | 结构性阻止凑数 |
| `review_status` 枚举不含 `verified`（R1） | ✅ 可用 | 结构性阻止「静默 verified」 |
| V1→V2 适配器（幂等、只读、可回滚） | ✅ 可用 | 既有 40 菜品可持续派生 |
| 测试基础（88 用例：45 自带 + 43 独立） | ✅ 可用 | 不等到 KB-007 才建测试 |

**（d）KB-002 必须避免的已知陷阱**

| # | 陷阱 | 依据 |
|---|---|---|
| 1 | 不得把 V2 数据写入 `data/knowledge_graph/` | `scripts/verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` 自动发现（契约 H1） |
| 2 | 不得通过放宽 TR4 让 Claim 变 `sufficient` 来「好看」 | 契约 `01-schema-contract.md:322`、`:913` 明文禁止 |
| 3 | 不得为缺失出处编造卷/页/版本/年份 | 契约 §8.3 N1–N5 |
| 4 | 不得把网络线索自动升级为权威证据 | 契约 N4 |
| 5 | 多候选 Edition 时**不得**任选一个消歧 | 契约「禁止消歧」，`01-schema-contract.md:913` |
| 6 | 统计中文文档行数须用 `node` 或 `Get-Content -Encoding utf8` | `pwsh Get-Content` 以 ANSI 误读 UTF-8 会误报行数（`05-devops-verification.md:405-418`；Architect 亦报告同一陷阱） |
| 7 | 取退出码不要依赖 PowerShell 管道 `$LASTEXITCODE` | `08-captain-verification.md:347` |

---

## 6. 范围合规自证

| 项 | 结果 |
|---|---|
| 本任务写入文件 | **仅** `docs/kb-001/06-kb-001-gate.md` |
| 是否修改实现（`scripts/kb/**`） | **否** |
| 是否修改数据（`data/kb/**`、`data/knowledge_graph/**`） | **否** |
| 是否修改 `backend/`、`frontend/`、`service/` | **否** |
| 是否修改他人文档 | **否** |
| 是否执行生产部署或迁移 | **否** |
| 是否 push / 合并 / 打包 | **否** |
| 本文件是否含密钥或 `.env` 取值 | **否**（仅出现环境变量**名称** `JWT_SECRET` 作为占位说明，无任何取值） |
| 临时脚本 | 在 `tmp/` 下创建 `architect-t8-gate7.mjs`、`architect-t8-anchors.mjs` 用于只读取证，**用后已删除** |

---

## 7. 验证方法说明（可复现）

本文件标注「**本次复核实测**」的结论，均由我实际执行以下之一取得：

- `node -e` / `node <script>` 读取 JSON 与文本（**避开 PowerShell 编码陷阱**）
- `node scripts/kb/validate-kb-schema.mjs [<path>...]`
- `node scripts/kb/adapt-v1-to-v2.mjs --dry-run`
- `node --test "scripts/kb/__tests__/*.test.mjs"`
- `node scripts/verify_graph_schema.mjs`、`node scripts/verify_literature_dataset.mjs`
- `cd backend && npm test -- --runInBand`、`cd frontend && npm test`、`cd frontend && npm run lint`
- `python -m unittest discover -s service -p 'test*.py'`
- 逐夹具调用校验器并解析 JSONL 错误码（7 个 invalid 夹具）
- `git status --porcelain --untracked-files=all`、`git diff`、`git check-ignore -v`
- 直接读取成员报告提取证据锚点（行号见各门禁引用）

标注「**成员报告记录**」的结论**未被我重新执行**，已注明来源文件与行号，供 Reviewer 独立复核。

---

## 8. 与上游报告的差异（如实记录，不掩盖）

| # | 差异 | 处置 |
|---|---|---|
| 1 | 本任务派发文本称「16 条 SourcePassage = ambiguous(15)/unresolved(1)」 | 该值来自契约 `2.0.1` 的**已更正旧值**；契约 `2.0.2` 已更正为 **19 = 16/3/0**。本文件采用更正后数值并已实测确认（见门禁 3(d)） |
| 2 | V1 输入文件计数口径不一：t3 称 16 个、Captain 称 13 个 | 差异源于是否计入 `expert_review_manifest.json`、`ingredient_mapping.json`、`intangible_heritage.json`；**两者均为 changed = 0**，结论一致 |
| 3 | `01-schema-contract.md:1029` 曾称 `.gitignore` 行「已实际落地（`.gitignore:16`）」，Captain 实测当时**不成立**（被回退） | **本次复核实测该行现已存在且生效**（`git diff` 有该行、`git check-ignore -v` 返回 **`.gitignore:27`**、退出码 0）。**内容陈述现成立；行号由 16 变更为 27**（回退后重新追加到文件末尾） |
| 4 | 契约 `2.0.0`/`2.0.1` 与真实数据的 4 处冲突（§13.5 数量、分布、饮膳正要结论、`asserted_at` 矛盾） | 已由 t11 修订为 `2.0.2`（`01-schema-contract.md:1107`），本文件采用更正后数值 |

---

## 9. 结论

**KB-001 完成门禁 1–8 全部通过**，每条附可核验证据（文件:行号 或 真实命令 + 退出码）。

- **本轮引入的失败 = 0**；基线已存在的 7 个失败已明确区分、未修复、未掩盖。
- **门禁 3「追踪链可校验」成立**：正向路径由 `data/kb/examples/valid/` 内置合法示例覆盖（退出 0）；V1 适配输出无 `resolved` Passage 是**正确反映 V1 真实证据水平**，**不是**未达标。
- **门禁 7 成立**：6 组抽查证据确认零伪造、零静默补全。
- **1 项 medium（K1）** 与 **5 项移交项（K2–K5）** 不阻断本轮交付，但 K1 须在 KB-002 启动前修复。

**本文件不构成最终验收**。Reviewer（t9 / KB-001E）须独立审查最终变更并给出 `PASS` 或 `REQUEST_CHANGES`；**最终由 Codex 独立验收**，团队不得自行宣布 KB-001 CLOSED。
