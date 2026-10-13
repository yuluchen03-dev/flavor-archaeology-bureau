# KB-002 QA Gate（t6）— 独立验证报告（复验版）

- 执行角色：**qa-wb**（独立于 Architect / Curator / Backend）
- 任务：t6 / KB-002 QA Gate
- 本次为 **attempt 3（F-01 修复后的复验）**
- **结论：PASS**
- 依据：全部 **18 项**验收标准通过；前次失败项 #5 的根因缺陷 **F-01 已修复并经独立复验确认**
- 报告纪律：以下区分「**实测**」（我亲自执行的命令与观察）与「**审阅证据**」（阅读上游产物/代码得出的判断）

---

## 0. 结论摘要

| # | 验收标准 | 判定 |
|---|---|---|
| 1 | KB-001 Schema 2.0 无回归 | ✅ passed |
| 2 | KB-001 既有用例不回归（121/0/0/0，数量不减） | ✅ passed |
| 3 | 新增 Golden validator 测试全部通过 | ✅ passed |
| 4 | 合法 Golden fixture（positive）应 PASS | ✅ passed |
| 5 | **非法 fixture 应 FAIL** | ✅ **passed（前次失败，现已修复）** |
| 6 | 缺失 SourcePassage 按契约失败或降级 | ✅ passed |
| 7 | unsupported Claim 不得伪装 supported | ✅ passed |
| 8 | insufficient 可保存且不被升级 | ✅ passed |
| 9 | contradictory evidence 可共存保存 | ✅ passed |
| 10–12 | duplicate ID / dangling ref / Golden ID 唯一 | ✅ passed |
| 13–14 | SourceWork→Edition→Passage 链、Claim→Evidence 引用可验证 | ✅ passed |
| 15 | validator 输出 deterministic | ✅ passed |
| 16 | 正式数据与 fixtures 不串库 | ✅ passed |
| 17 | V1 原始数据不被修改 | ✅ passed |
| 18 | 无 KB-003+ 功能泄漏 | ✅ passed |

**18/18 通过 → 本 Gate PASS。**

---

## 1. F-01 修复确认（前次 blocker 已消解）

### 1.1 前次缺陷回顾

`inv_13_filename_id_mismatch.kb.json` 在 attempt 2 实测 **exit=0**（应当失败）。根因：`golden-rules.mjs` 的 filename↔golden_id 一致性检查被 `!isExample` 门控，而该 fixture 位于 `examples/invalid/`，检查被整体跳过。

### 1.2 本次复验结果（实测）

| 核验项 | attempt 2（修复前） | attempt 3（修复后） |
|---|---|---|
| `inv_13` 退出码 | **0** ❌ | **1** ✅ |
| `inv_13` 错误码 | （无） | `KB002_FILENAME_ID_MISMATCH` ✅ |
| 未失败的负例数 | 1 | **0** ✅ |
| Golden 测试用例数 | 44 | **50**（+6） |
| 是否补「遍历负例断言 exit=1」的测试 | ❌ 无 | ✅ 有（测试文件 L114：`assert.equal(r.status, 1, ...)`） |

**修复后实现变化（实测 + 审阅）**：`golden-rules.mjs`（mtime 14:01:05）把 `isExample` 重构为 `isExamplePath` 辅助函数，并在生产过滤器中引入 `isFixtureMarked` / `isGeneratedPath` 判定；filename↔golden_id 检查不再被 `examples/` 整体豁免。

**结论：F-01 已真实修复，且我此前要求的补测已落实。**

---

## 2. 实测命令与退出码

### 2.1 契约 verify 6 条（`commandsRun`）

| 命令 | 退出码 | 观察结果 |
|---|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** | `PASSED: 3 file(s), 23 entities, 26 relations` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | tests **121** / pass 121 / fail 0 / skipped 0 / todo 0 |
| `node scripts/verify_graph_schema.mjs` | **0** | 193 节点 / 49 关系（= KB-001 基线） |
| `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103（= 基线） |
| `git status --porcelain` | **0** | V1 四路径 **0 条**；KB-002 新增见 §7 |

### 2.2 KB-002 能力

| 命令 | 退出码 | 观察结果 |
|---|---|---|
| `node scripts/kb002/validate-golden.mjs`（默认=examples/valid） | **0** | `PASSED: 1 file(s), 14 entities, 15 relations` |
| `node scripts/kb002/validate-golden.mjs --summary` | **0** | 汇总输出 |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** | 数据集级（QUALIFIED_GOLDEN_COUNT / SHORTFALL / STATUS） |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** | tests **50** / pass 50 / fail 0 / **skipped 0** / todo 0 |

### 2.3 逐条非法 fixture（criterion 5，全部 exit=1）

**17 / 17 全部 exit=1；未失败数 = 0；非 0/1 异常退出码 = 0。**

| fixture | exit | 触发的错误码 |
|---|---|---|
| inv_01_missing_source_work | 1 | `E_CLAIM_NO_EVIDENCE`, `E_DANGLING_REFERENCE`, `KB002_DISH_BELOW_E3`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH`, `KB002_LEVEL_MISMATCH`, `KB002_LEVEL_STATUS_CONFLICT` |
| inv_02_dangling_passage | 1 | `E_DANGLING_REFERENCE`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH`, `KB002_LEVEL_MISMATCH` |
| inv_03_duplicate_claim_id | 1 | `E_DUPLICATE_ID`, `KB002_FILENAME_ID_MISMATCH` |
| inv_04_level_mismatch | 1 | `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH`, `KB002_LEVEL_MISMATCH` |
| inv_05_self_declared_e5 | 1 | `KB002_DISH_LEVEL_MISMATCH`, `KB002_E5_UNREACHABLE`, `KB002_FILENAME_ID_MISMATCH`, `KB002_LEVEL_MISMATCH` |
| inv_06_e5_unreachable | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_E5_UNREACHABLE`, `KB002_EXPERIMENT_FORBIDDEN`, `KB002_FILENAME_ID_MISMATCH` … |
| inv_07_grade_x_on_chain | 1 | `KB002_AI_SOURCE_FORBIDDEN`, `KB002_DISH_BELOW_E3`, `KB002_GRADE_LEAD_ONLY` … |
| inv_08_grade_c_sufficient | 1 | `KB002_GRADE_INSUFFICIENT`, `KB002_GRADE_LEAD_ONLY`, `KB002_SUFFICIENT_PRECONDITION` … |
| inv_09_grade_undeclared | 1 | `KB002_GRADE_UNDECLARED`, `KB002_DISH_BELOW_E3` … |
| inv_10_conflict_hidden | 1 | `KB002_CONFLICT_HIDDEN`, `KB002_FILENAME_ID_MISMATCH` |
| inv_11_grade_lead_only | 1 | `E_EVIDENCE_REVIEW_CONFLICT`, `E_TRACE_WEAKENS_CLAIM`, `KB002_GRADE_LEAD_ONLY` … |
| inv_12_metadata_incomplete | 1 | `KB002_METADATA_INCOMPLETE`, `KB002_FILENAME_ID_MISMATCH` |
| **inv_13_filename_id_mismatch** | **1** ✅ | `KB002_FILENAME_ID_MISMATCH` |
| inv_14_v1_adapter | 1 | `KB002_DERIVATION_V1_FORBIDDEN` |
| inv_15_content_class | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_CONTENT_CLASS_FORBIDDEN` |
| inv_16_external_reviewed | 1 | `E_REVIEW_STATUS_UNSUPPORTED`, `KB002_EXTERNAL_REVIEW_UNSUPPORTED` |
| inv_17_dish_not_documented | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_DISH_NOT_DOCUMENTED` |

---

## 3. 关键判定的独立证据

### 3.1 criterion 15 — determinism（实测）

`--dataset` 连续两次运行：**stdout 逐字节相同 = true**、**stderr 逐字节相同 = true**、exit 0/0。默认目标 stdout 逐字节相同 = true。

### 3.2 criterion 16 — fixtures / 正式数据隔离（实测，**正向与反向都验证**）

- `data/kb-002` **不存在**（t5 的 inScope 修订已被遵守，落位统一为 `data/kb/golden/`）。
- **反向验证**：把合法 fixture（带 `metadata.fixture=true` + `not_historical_evidence`）复制到**生产式路径** `data/kb/golden/__qa_prod_sim/golden_001.kb.json` → **exit=1**，报 `KB002_FIXTURE_IN_PRODUCTION`（`H6/SEC-T7-01: a document marked metadata.fixture=true (or carrying not_historical_evidence) must not sit at a production Golden path`）。**这是正确行为**，证明隔离规则真实生效。
- **正向验证**：去除 fixture 标记 + 生产式命名 `golden_001.kb.json`（`golden_id=GOLDEN-001`）→ **exit=0**，且**无** `KB002_FILENAME_ID_MISMATCH` 误报。→ 生产命名与该规则自洽。

### 3.3 criterion 3 — 测试套件（实测）

`node --test scripts/kb002/__tests__/golden-validator.test.mjs` → **50 pass / 0 fail / skipped 0 / todo 0**。
其中 **L114** 逐一遍历 `examples/invalid/` 并断言 `r.status === 1` —— 即前次要求的补测，使「空转负例」未来无法再逃过检测。

### 3.4 只读保证（实测）

`validate-golden` 运行前后 `golden_001.kb.json` 的 SHA-256 **不变**。

### 3.5 criterion 18 — 无 KB-003+ 泄漏（实测）

对 `scripts/kb002/*.mjs` 与 `scripts/kb002/lib/*.mjs` 检索
`embedding|vector|faiss|milvus|elasticsearch|bm25|neo4j|graphrag|temporal.?validator|openai|llm`
→ **命中 0**。

### 3.6 诚实披露：criterion 9 的覆盖方式

「contradictory evidence 可共存」由**单元测试**证明（`:147` CF2「存在 `claim_refuted_by` 时被接受」、`:131` CF3「反驳边被删 → `KB002_CONFLICT_HIDDEN`」，后者由 inv_10 实测 exit=1 佐证）。
**合法 positive fixture 本身不含反驳边**（实测 `claim_supported_by=2` / `claim_refuted_by=0`）。我按 acceptance 措辞「可被保存」判定 **passed**，并如实标注该覆盖方式。

> ⚠️ **本节第 2 段已被更正（Captain 复核 + QA 重新实测）**：`claim_refuted_by=0` 系**修复前（attempt 2）的过时观测**，当前实测为 **1**。详见文末「§9 更正记录」。**本报告的 verdict（PASS）不受影响** —— 更正后该项证据**更强**（由单证据变为双重证据）。

---

## 4. NON-BLOCKING 观察（不影响 PASS，建议后续处理）

### O-01（low）— 负例噪声：所有 17 个负例都附带 `KB002_FILENAME_ID_MISMATCH`

**实测**：`inv_01`…`inv_17` 的输出中**全部**出现 `KB002_FILENAME_ID_MISMATCH`。
**原因（实测确认）**：全部 invalid fixture 的 `metadata.golden_id` 均为 `GOLDEN-001`，而文件名为 `inv_NN_...`，按契约 H7（文件名须为 `golden_<NNN>.kb.json`）必然不一致。F-01 修复后该检查不再对 `examples/` 整体豁免，故对全部负例生效。
**为何不阻塞**：这是**更严格**而非降低门槛；每个负例仍因**其目标缺陷**失败（目标错误码均存在），exit 码正确；生产路径无此噪声（§3.2 已正向验证）。
**建议**：若要恢复「负例隔离性」（每个 fixture 只暴露其目标缺陷），可将 filename 一致性检查限定为「仅当文件名形如 `golden_*.kb.json` 时才校验」，或给非 inv_13 的 fixture 使用与 golden_id 一致的文件名。**属改进项，不属缺陷。**

### O-02（low）— `t5` 的任务输出记录缺口

依赖摘要中 t5 显示 `(no output recorded)`，但**交付物实际完整**（见 §5）。属 AgentTeams 记录缺口，非工作缺失。建议 Captain 按 append-only 在 t5 上补 `acceptanceResults`/`evidence_note`。

---

## 5. 交付物清单（本次实测确认存在）

| 路径 | 大小 | 说明 |
|---|---|---|
| `docs/kb-002/05-ingestion-tooling.md` | 12,991 B | t5 文档 |
| `scripts/kb002/validate-golden.mjs` | 7,652 B | CLI（退出码 0/1/2；stdout JSONL；不改输入） |
| `scripts/kb002/lib/golden-rules.mjs` | 25,569 B | KB-002 L2 规则 |
| `scripts/kb002/lib/rubric.mjs` | 8,357 B | E 级/来源级计算 |
| `scripts/kb002/__tests__/golden-validator.test.mjs` | 9,027 B | **50 用例** |
| `data/kb/golden/examples/valid/` | 1 文件 | 合法 fixture |
| `data/kb/golden/examples/invalid/` | **17 文件** | 非法 fixture（全部 exit=1） |
| `.gitignore` | +1 行 | `data/kb/golden/` 派生输出条目 |

---

## 6. 未由本 Gate 覆盖（不得当作通过）

| 项 | 状态 | 原因 |
|---|---|---|
| Golden 正式数据录入（F+） | **未进行** | 本阶段禁止；`data/kb/golden/` 顶层无正式数据 |
| **L2 事实真伪**（来源是否真实存在、是否确实如此记载） | **不可判定** | 与 KB-002B 两层模型一致；`web_search` 在本环境**不可用（无 API key）**，本轮**未做任何外部核实** |
| t4 候选清单的**内容**正确性 | **仅证据审阅** | 本 Gate 验证工具链与 fixture 行为；内容正确性由 t7（Security/Provenance）与 t8（Reviewer）复核 |
| 符号链接 / 并发 / 磁盘写满 / 超大输入 | **未测** | 非本契约要求 |

---

## 7. 工作区归因

| 类别 | 内容 | 计入 KB-002？ |
|---|---|---|
| KB-002 新增（本轮） | `docs/kb-002/00`–`06`；`scripts/kb002/**`；`data/kb/golden/examples/**`；`.gitignore` +1 行 | ✅ |
| KB-001 既有（已 CLOSED） | `scripts/kb/*`、`data/kb/{schema,examples,generated}`、`docs/kb-001/*` | 只读保护，实测未变 |
| AgentTeams metadata | `.agent-teams/**` | ❌ 不提交 |
| 用户既有改动 | `frontend` 暂存 ~300 条 等 | ❌ 未吞入 |
| ignored/generated | `backend/coverage/**`、`tmp/**` | 已忽略 |

**QA 只读合规**：本 Gate 唯一写入 `docs/kb-002/06-qa-gate.md`。未修改任何生产实现、测试或数据；两次定位探针（`data/kb/golden/__qa_probe/`、`__qa_prod_sim/`、`__qa_prod_sim2/`）**均已删除并确认不存在**。

---

## 8. 结论

# PASS

**18 / 18 验收标准全部通过。**

- 前次唯一失败项（#5）的根因缺陷 **F-01 已修复**：`inv_13` 现正确 exit=1，**17/17 负例全部失败**，并已补上「遍历负例断言 exit=1」的测试（L114）。
- KB-001 门禁全绿（121 用例数量未减）、V1 数据零修改、无 KB-003+ 泄漏、输出 deterministic、fixture 与正式数据隔离经**正反双向**验证。
- 2 项 **low** 非阻塞观察（O-01 负例噪声、O-02 t5 记录缺口），**不构成缺陷、不降低任何门槛**。

**限制声明**：本 PASS 仅覆盖 **L1 结构合规**与工具链行为。**L2 事实真伪在本阶段不可判定**（`web_search` 不可用，未做外部核实）；正式 Golden 数据尚未录入（F+）。二者均不得被视为已通过。

---

## 9. 更正记录（append-only）

### C-01 — §3.6「criterion 9 覆盖方式」的观测值已过时（Captain 复核后由 QA 重新实测）

**性质**：**更正过时陈述，不改动原报告主体与结论。** 本报告 verdict 仍为 **PASS**。

**(a) 原陈述与其时点**
§3.6 原写：合法 positive fixture「实测 `claim_supported_by=2` / `claim_refuted_by=0`，本身不含反驳边」。
该观测取自 **attempt 2（F-01 修复前）** 的时点。在 attempt 3 复验时，我**重跑了全部 18 项验收与命令行证据，却把这条 disclosure 直接沿用了 attempt 2 的读数而未重新测量** —— 这是**流程失误**，且我当时为它标注了「实测」字样，属于把**过时观测**呈现为**当前实测**。§26 要求严格区分实测/转述/推断，这条披露在这一点上不达标。**由 Captain 复核发现并由我重新实测确认。**

**(b) 修复后重新实测（QA 亲自执行，当前状态）**
对 `data/kb/golden/examples/valid/golden_001.kb.json` 直接读取：

| 核验项 | 实测值 |
|---|---|
| `relations` 总数 | **15** |
| `claim_supported_by` | **2** |
| **`claim_refuted_by`** | **1** ✅（原报告写 0） |
| 反证边明细 | `claim_g001_steaming_closure -> passage_g001_method_refuting` |
| 该 Claim 的 `counter_evidence_notes` | **len = 1**，内容为「Fixture placeholder: a conflicting record exists and is preserved; it is not removed to make a single tidy answer.」 |
| 该 Claim 状态 | `evidence_status=sufficient`、`confidence=medium`、`uncertainty_notes` len=1 |
| `metadata.evidence_level` / `qualified` | `E4` / `true` |
| **夹具是否仍通过校验** | **exit=0** —— `KB-002 Golden validation PASSED: 1 file(s), 14 entities, 15 relations` |

→ **更正后的正确陈述**：「contradictory evidence 可共存」现在**同时具备两类证据**：
1. **单元测试证据**：`:147` CF2（存在 `claim_refuted_by` 时被接受）、`:131` CF3（反驳边被删 → `KB002_CONFLICT_HIDDEN`，inv_10 实测 exit=1 佐证）；
2. **正向夹具证据**：`golden_001.kb.json` **实际含 1 条反证边**（`claim_refuted_by=1`）且 `counter_evidence_notes` 非空，**冲突被保留而非删除**，且该夹具**仍 exit=0**。

**(c) 对验收判定的影响**
**无不利影响，反而更强。** 原判定为 passed（依 acceptance 措辞「可被保存」）；更正后 #9 **由「仅单元测试覆盖」升级为「单元测试 + 正向夹具双重覆盖」**。因此：

- 本报告 **verdict 不变（PASS）**；
- §0 结论摘要中 #9 的判定 **不变（passed）**；
- §4 的 O-01 / O-02 两项非阻塞观察 **不变**；
- 唯一变化是 §3.6 第 2 段的**观测值**与其**证据强度描述**，已在原处以就地指针标注，并在此完整更正。

**感谢 Captain 的复核。** 本例说明：跨 attempt 复验时，**所有带「实测」字样的数值都必须在本 attempt 内重新测量**，不得沿用上一 attempt 的读数。我会在后续任务中遵循该纪律。

