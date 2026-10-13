# KB-002E Ingestion / Validation Tooling（证据录入与校验工具链）

- 任务：`t5` / KB-002E
- Owner：`backend-wb`
- 契约版本：`kb-002.1.0`
- 上游依据（均已冻结）：
  - `docs/kb-002/01-golden-dataset-contract.md`（KB-002A）
  - `docs/kb-002/02-evidence-quality-rubric.md`（KB-002B）
  - `docs/kb-001/01-schema-contract.md`（KB-001 `2.0.3`）+ `data/kb/schema/kb-schema.v2.json`（`2.0.0`）

> 本阶段**不产出任何正式 Golden 证据数据**（属 KB-002F+）。本文件只说明工具与其验证结果。

---

## 1. 分层设计（不重写 KB-001）

| 层 | 职责 | 实现 |
|---|---|---|
| **L1 结构合规** | 字段齐备、枚举合法、ID 唯一、引用不悬空、关系端点与形状、追踪链 | **复用 KB-001**：`scripts/kb/lib/{schema,validate,errors}.mjs`（`loadSchema` / `validateDocument` / `validateDocuments` / `ErrorCollector`） |
| **L2 KB-002 证据规则** | 来源等级、Evidence Level、等级↔状态映射、冲突保留、不凑数、禁伪造 | 新增 `scripts/kb002/lib/golden-rules.mjs` |

**KB-001 的校验器一行未改**（用 `git diff` 证明，见第 6 节）。

### 1.1 诚实边界（rubric §1）

- L1 通过 **≠** 历史为真。工具**无法**验证「该来源确实存在且确实这样记载」（L2）。
- 因此 `sufficient` 只表示 **L1 通过且等级达 E3/E4**，**不表示已核实**。
- 工具**从不**把 `review_status` 置为 `external_reviewed`；出现即报 `KB002_EXTERNAL_REVIEW_UNSUPPORTED`。

---

## 2. 文件落位（契约 §2.1）

| 用途 | 路径 |
|---|---|
| Golden 正式数据 | `data/kb/golden/*.kb.json` |
| 合法示例 | `data/kb/golden/examples/valid/*.kb.json` |
| 非法负例 | `data/kb/golden/examples/invalid/*.kb.json` |
| 工具输出（派生） | `data/kb/golden/generated/`（**已加入 `.gitignore`**） |
| 工具代码 | `scripts/kb002/**/*.mjs` |
| 测试 | `scripts/kb002/__tests__/*.test.mjs` |

**H1 遵守**：Golden 数据**不写入** `data/knowledge_graph/`（该目录由 `scripts/verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` 自动发现，会改变 V1 门禁行为）。
**H2 遵守**：`data/kb/golden/` 下不存在 `nodes_*.json`。
**H6 遵守**：`--dataset` 模式**排除** `examples/`，正式集与夹具物理隔离。

---

## 3. 运行方式

```bash
# 校验内置合法示例集（默认）
node scripts/kb002/validate-golden.mjs

# 校验任意文件或目录
node scripts/kb002/validate-golden.mjs data/kb/golden/examples/invalid

# 校验正式 Golden 数据集并输出不凑数结论
node scripts/kb002/validate-golden.mjs --dataset

# 单独输出数据集级结论
node scripts/kb002/validate-golden.mjs --summary
```

**退出码**（与 KB-001 §12 语义一致）：

| 码 | 含义 |
|---|---|
| `0` | 通过 |
| `1` | 校验失败（stdout 输出 JSONL 逐条 finding） |
| `2` | 运行错误（路径不存在、Schema 不可读等） |

**输出**：stdout **仅 JSONL**（每行一条 `{file, entityOrRelationId, fieldPath, code, message}`）；stderr 承载人类摘要与数据集级结论。工具**只读**，从不修改输入。

### 3.1 Staging validity 与 production admissibility（ALIGN-03）

这两个模式回答不同问题：

- `--staging` 检查候选是否**结构有效、诚实且可安全保留**。诚实的 E0/E1/E2 candidate 可以 staging-valid；Q3 (`KB002_DISH_BELOW_E3`) 等 production-admission findings 仍以 JSONL 输出，但如果没有 staging-blocking finding，CLI 以 exit 0 返回，并在 stderr 输出 `STAGING_VALID = true` 与 `PRODUCTION_ADMISSIBLE = false`。
- `--dataset` / production path validation 检查 production admissibility。Q3 保持 blocking：低于 E3 的 production record 仍 exit 1，不能 promotion。
- 伪报 `qualified=true`、伪报高于计算值的 dish evidence level、结构/引用/manifest/资产完整性错误仍是 staging-blocking；staging PASS 不代表 production qualified。
- 没有任何 production-admission findings 时，staging 会输出 `STAGING_VALID = true` 与 `PRODUCTION_ADMISSIBLE = true`。空 staging 目录只报告无候选，不报告 `STAGING_VALID = true`。

ALIGN-03 的针对性回归覆盖诚实 E2/E0、同一 E2 的 production 拒绝、level/qualified 声明不诚实、manifest 缺失资产/非法 schema，以及**计算为 E4 的隔离 synthetic mechanical fixture**。该 E4 用例只验证计算/路由行为，因来源明确为 synthetic test namespace，**不满足也不声称满足 genuine E3+ candidate 验收 S8**。当前仓库没有可用的、真实可追溯的 E3+ candidate；按禁止伪造证据原则，genuine S8 标记为未验证/未满足，待后续有真实证据的候选再验证。测试数据仅写入 FIX-03 独立临时 workspace；不改真实 candidate、夹具或 provenance。

`--dataset` 在正式集为空时**不报错**（KB-002F+ 尚未运行），而是诚实输出：
```
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = PARTIAL_GOLDEN_SET
KNOWN_DATA_GAP = 10
```

---

## 4. 实现的规则（逐条对应冻结契约）

### 4.1 来源等级 S/A/B/C/D/X（rubric §2.3）

| 规则 | 错误码 |
|---|---|
| SG1 S/A/B 机械前置条件 | `KB002_GRADE_PRECONDITION` |
| SG2 B 级缺互证却声明 `sufficient` | `KB002_GRADE_INSUFFICIENT` |
| SG3/SG6 C/D 级用于 `sufficient`，或未降级为线索 | `KB002_GRADE_INSUFFICIENT` / `KB002_GRADE_LEAD_ONLY` |
| SG4 `X` 出现在 `claim_supported_by` 链 | `KB002_AI_SOURCE_FORBIDDEN` |
| SG5 同一实体多个不同等级 | `KB002_MULTIPLE_GRADES` |
| §2.2 链上 edition 未声明等级 | `KB002_GRADE_UNDECLARED` |

### 4.2 Evidence Level（rubric §3）

`computeClaimEvidence()` 按 §3.1/§3.2 **确定性重算**（自上而下取第一个命中，无并列分支）：
`E5 → E4 → E3 → E2 → E1 → E0`，输入为 `claim_supported_by` 链经 `passage_in_edition` → `edition_of_work` 求得的去重 `SourceWork` 集合。

| 规则 | 错误码 |
|---|---|
| 声明多个等级 | `KB002_MULTIPLE_LEVELS` |
| 声明 ≠ 计算（**防自封高等级**） | `KB002_LEVEL_MISMATCH` |
| `metadata.evidence_level` ≠ 各 Claim 最小值 | `KB002_DISH_LEVEL_MISMATCH` |
| 等级 ↔ `evidence_status` / `derivation` / `review_status` 不符 | `KB002_LEVEL_STATUS_CONFLICT` / `KB002_LEVEL_DERIVATION_CONFLICT` / `KB002_LEVEL_REVIEW_CONFLICT` |
| E3/E4 声明 `sufficient` 但未满足 §4.4 五项 | `KB002_SUFFICIENT_PRECONDITION` |
| `derivation = v1_adapter` | `KB002_DERIVATION_V1_FORBIDDEN` |

**NP2 强制**：等级一律**重算**，`notes` 中的 `EVIDENCE_LEVEL=` 声明**只用于一致性核对**，绝不直接采信。

### 4.3 阶段不可达与禁伪造（rubric §4.5 / 契约 §6.1、H8）

| 规则 | 错误码 |
|---|---|
| 声明或计算得 E5 | `KB002_E5_UNREACHABLE` |
| `review_status = external_reviewed` 或 `asserted_by = expert_review` | `KB002_EXTERNAL_REVIEW_UNSUPPORTED` |
| Golden 数据出现 `Experiment` | `KB002_EXPERIMENT_FORBIDDEN` |
| 历史陈述用 `modern_adaptation` / `user_experiment` | `KB002_CONTENT_CLASS_FORBIDDEN` |

### 4.4 不凑数（rubric §5）

| 规则 | 错误码 |
|---|---|
| Q1 无 Claim 指向 Dish | `KB002_NO_CLAIM_FOR_DISH` |
| Q2 `dish_kind` 非 `historical_documented_dish` | `KB002_DISH_NOT_DOCUMENTED` |
| Q3 无 Claim 达 E3 | `KB002_DISH_BELOW_E3` |
| Q4 无 `resolved` 且链完整的 Passage | `KB002_NO_RESOLVED_CHAIN` |
| Q7 `metadata` 六键缺失 / 版本不符 | `KB002_METADATA_INCOMPLETE` |
| NP1 声明合格数 ≠ 计算值 | `KB002_PADDING_COUNT` |
| NP3 `metadata.qualified` ≠ 计算值 | `KB002_QUALIFIED_MISMATCH` |
| NP5 文件数 > 10 | `KB002_TOO_MANY_GOLDEN` |
| 文件名与 `metadata.golden_id` 不符（仅正式集） | `KB002_FILENAME_ID_MISMATCH` |
| `golden_id` 重复 | `KB002_GOLDEN_ID_DUPLICATE` |
| 派生/夹具混入正式集 | `KB002_FIXTURE_IN_PRODUCTION` |

### 4.5 冲突保留（rubric §6，CF1–CF7）

| 规则 | 错误码 |
|---|---|
| CF2 有反证边但 `counter_evidence_notes` 为空 | `KB002_COUNTER_NOTES_MISSING` |
| **CF3** 有反证记录却无 `claim_refuted_by` 边（**检出被删除的反证**） | `KB002_CONFLICT_HIDDEN` |
| CF4 有反证却 `confidence = high` | `KB002_CONFLICT_CONFIDENCE` |
| CF5/CF6 冲突单边缺失或链不完整 | `KB002_CONFLICT_ONE_SIDED` |
| CF7 有反证却 `sufficient` | `KB002_CONFLICT_SUFFICIENT` |

> `claim_supported_by` 与 `claim_refuted_by` 是两个独立关系类型，**天然允许共存**；工具**不会**删除任一方。

---

## 5. 错误码来源说明（诚实标注）

- **`KB002_*` 共 38 个**：其中 **34 个**逐条来自 rubric §8 清单；另 **3 个**是契约 §10.3 要求校验但未在 rubric §8 命名的检查项，由本实现命名并在此登记：
  - `KB002_GOLDEN_ID_DUPLICATE`（契约 §3.3「golden_id 数据集内唯一」）
  - `KB002_FILENAME_ID_MISMATCH`（契约 H7 / §10.3「文件名与 `metadata.golden_id` 不一致」）
  - `KB002_FIXTURE_IN_PRODUCTION`（契约 H6 夹具隔离 / §10.3「fixture path 混入 production」；t10 起扩展为同时覆盖 `metadata.fixture === true`）
- **`KB002_LEVEL_INDETERMINATE`（第 38 个）**：**t10 起降为防御性兜底，触发集为空**（`kb-002.1.1` 的 R1–R5 已穷尽）。达到该分支表示内部错误或新契约缺口 → **须重新登记 defect，不得就地发明规则**。详见 §7.1。
- 前缀 `KB002_` 与 KB-001 的 `E_*` 完全隔离，无重名。

---

## 6. 验证结果（真实命令 + 退出码）

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb002/validate-golden.mjs` | **0** | `PASSED: 1 file(s), 13 entities, 13 relations` |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** | **50 tests / 50 pass / 0 fail / skipped 0 / todo 0**（t10 前为 44；既有 44 个未删除或放宽） |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** | 诚实输出 `QUALIFIED_GOLDEN_COUNT = 0`、`SHORTFALL = 10`、`PARTIAL_GOLDEN_SET` |
| `node scripts/kb/validate-kb-schema.mjs` | **0** | KB-001 无回归 |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | KB-001 **121** 用例全通过，未删改 |
| `node scripts/verify_graph_schema.mjs` | **0** | 193 / 49 |
| `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103 |
| `git status --porcelain -- data/knowledge_graph data/recipes data/fragments data/literature` | — | **0 条**（V1 零改动） |

### 6.1 逐负例映射（17 个负例夹具，各自证明至少一个码）

| 夹具 | 缺陷 | 实测触发的关键码 |
|---|---|---|
| `inv_01_missing_source_work` | 闭环缺 SourceWork | `KB002_LEVEL_INDETERMINATE` + `E_DANGLING_REFERENCE` |
| `inv_02_dangling_passage` | 支撑指向不存在 Passage | `E_DANGLING_REFERENCE` + `KB002_LEVEL_MISMATCH` |
| `inv_03_duplicate_claim_id` | Claim ID 重复 | `E_DUPLICATE_ID` |
| `inv_04_level_mismatch` | 声明 E3 实为 E4 | `KB002_LEVEL_MISMATCH` |
| `inv_05_self_declared_e5` | 虚标 E5 | `KB002_E5_UNREACHABLE` |
| `inv_06_e5_unreachable` | 伪造外部评审 + 实验以凑 E5 | `KB002_EXPERIMENT_FORBIDDEN` + `KB002_EXTERNAL_REVIEW_UNSUPPORTED` |
| `inv_07_grade_x_on_chain` | X 级（AI 生成）上支撑链 | `KB002_AI_SOURCE_FORBIDDEN` |
| `inv_08_grade_c_sufficient` | C 级支撑 sufficient | `KB002_GRADE_INSUFFICIENT` |
| `inv_09_grade_undeclared` | 链上未声明来源等级 | `KB002_GRADE_UNDECLARED` |
| `inv_10_conflict_hidden` | 反证边被删除 | `KB002_CONFLICT_HIDDEN` |
| `inv_11_grade_lead_only` | D 级未降级为线索 | `KB002_GRADE_LEAD_ONLY` |
| `inv_12_metadata_incomplete` | metadata 缺 `contract_version` | `KB002_METADATA_INCOMPLETE` |
| `inv_13_filename_id_mismatch` | 文件名与 golden_id 不符 | `KB002_FILENAME_ID_MISMATCH`（**在正式集路径下验证**，因 H7 只约束正式集） |
| `inv_14_v1_adapter` | `derivation=v1_adapter` | `KB002_DERIVATION_V1_FORBIDDEN` |
| `inv_15_content_class` | 历史陈述标 `modern_adaptation` | `KB002_CONTENT_CLASS_FORBIDDEN` |
| `inv_16_external_reviewed` | 自封 `external_reviewed` | `KB002_EXTERNAL_REVIEW_UNSUPPORTED` |
| `inv_17_dish_not_documented` | `dish_kind` 非 documented | `KB002_DISH_NOT_DOCUMENTED` |

测试套件另覆盖（合成文档）：CF2 缺 `counter_evidence_notes`、CF3 隐藏反证、文件名不匹配、确定性、只读、空目录不静默通过、不存在路径退出 2、fixture 与正式集隔离。

### 6.2 未覆盖项（**不得当作通过**）

- **真实符号链接 / junction 绕过**：未构造（Windows 需特权）。
- **并发运行竞态**：未验证。
- **磁盘写满 / 权限拒绝路径**：未验证。
- **超大输入资源消耗**：未验证。
- **UNC / 驱动器路径语义**：KB-002 工具不接收 `--out` 之类的路径参数，未涉及。

---

## 7. 缺陷处置记录（t10 修复）

### 7.1 rubric §3.2 非穷尽 —— **已由 t9（`kb-002.1.1`）修复**

`kb-002.1.0` 的 §3.2 判定表不完备：当某 Claim 的支撑集存在 `resolved` 且 `direct` 的 Passage、但唯一来源等级为 **B**（architect 枚举 1024 组合后发现 **C/D** 与**未声明**同类）时，四类分支皆不命中 → 等级函数对该类合法输入**未定义**。

当时本工具的处置（经 t9 / 契约 §3.4.2 **正式确认正确**）：**不发明规则** → 不分配等级、报 `KB002_LEVEL_INDETERMINATE`、**拒绝数据而非猜测**。

**`kb-002.1.1` 修复**：§3.2 重写为**穷尽·有序·互斥**的 R1–R5（R5 为补集兜底 → `E2`），新增 §3.2.0 前置检查（结构错误、**不产出等级**）与 `D(claim) = resolved ∧ direct ∧ grade∈{S,A}`；实测未定义 0、R3/R4 冲突 0，且**原有结论全部不变（纯收紧）**。

**本工具已对齐**：

| 项 | 对齐后行为 |
|---|---|
| 次序 | §3.2.0 前置检查**先**（多等级 / `X` 上链 / 未声明 → 报结构错误、**不进入等级域**），后 R1–R5 |
| `D` | R3/R4 用 `D = resolved ∧ direct ∧ grade∈{S,A}` → **C/D 结构上无法抬级**（强化 SG6） |
| 兜底 | R5 承接补集 → **`E2`** |
| 原缺陷输入 | 单一 `resolved+direct` 且 B / C/D、或含 C/D 上链且无 S/A direct → **收敛为 `E2`** |
| `KB002_LEVEL_INDETERMINATE` | **降为防御性兜底，触发集为空**；若触发即内部错误或新契约缺口，**须重新登记 defect、不得就地发明规则**。测试 `KB002_LEVEL_INDETERMINATE is unreachable for legal input` 断言合法输入不再触发 |

**fixture 语义分离**：`inv_01_missing_source_work.kb.json` 现**只**承担结构错误覆盖（`E_DANGLING_REFERENCE` 等），不再作为 INDETERMINATE 覆盖；「原 INDETERMINATE 输入现收敛为 `E2`」由**单元测试**直接断言（R1–R5 覆盖表，含单一 B 级、单一 C 级）。

### 7.2 D1：一个名不副实的负例（收窄 `examples/` 豁免）

**根因**：`isExample = /(^|\/)examples\//` 曾对 `examples/` 内文件**整体豁免**文件名↔`golden_id` 一致性检查 → `inv_13_filename_id_mismatch.kb.json` 在单文件模式下 **exit 0**，使「17 负例全覆盖」虚假（实际 16/17）。规则本身正确（同内容置于非 examples 路径 → exit 1）。

**修复：方案 (A) 收窄豁免 → 完全取消该豁免**。理由：文件名与 `golden_id` 不一致在任何位置都是缺陷。
**负例集数量：17 → 17（无增减）**，`inv_13` 保留并**现在真正 exit 1**。

### 7.3 SEC-T7-01（high）：H6 夹具隔离未强制

**根因**：H6 只覆盖 `generated/` 路径，**未检查 `metadata.fixture`**。实测：将 `examples/valid/golden_001.kb.json`（`metadata.fixture=true`）复制到生产路径 → 单文件 **exit 0**，且 `--dataset` 的 `QUALIFIED_GOLDEN_COUNT` **0 → 1**、`SHORTFALL` **10 → 9**（夹具被计入正式质量指标）。

**修复**：对**非 `examples/` 且非 `generated/`** 路径，若 `metadata.fixture === true` **或** `metadata.not_historical_evidence` 非空 → `KB002_FIXTURE_IN_PRODUCTION`，**单文件与 `--dataset` 均生效**。

**`production` 变量用途更正（勿删）**：Security 报告称其「死代码、从未使用」**不准确** —— 它是**在用变量**，用于 NP3「声明 vs 计算 `qualified`」比对。正确做法是让其语义与隔离强制一致：`production = 非 examples ∧ 非 generated ∧ 非 fixture-marked`，并保持 NP3 计数正确。

**实测（污染前 / 后 / 清理后）**：

| 阶段 | 单文件校验 | `QUALIFIED_GOLDEN_COUNT` | `SHORTFALL` | `STATUS` |
|---|---|---|---|---|
| 污染前（生产目录空） | — | **0** | **10** | PARTIAL_GOLDEN_SET |
| 污染后（夹具副本置于生产路径） | **exit 1** + `KB002_FIXTURE_IN_PRODUCTION` | **0**（不计入；修复前为 1） | **10**（修复前 9） | PARTIAL_GOLDEN_SET |
| 清理后 | 生产目录空 | **0** | **10** | PARTIAL_GOLDEN_SET |

测试 `SEC-T7-01: … rejected and not counted` 在临时生产路径自动完成「污染 → 断言 → 清理」，仓库不保留任何污染文件。

### 7.4 次生缺陷：负例集未被自身测试保护（QA 发现）

原测试只校验 fixture 的**标注字段**，从未断言负例**真的** exit 1 → `inv_13` 的失效未被发现。
**已新增** `every negative fixture in examples/invalid actually exits 1 with at least one finding`：遍历负例目录，断言**每个** fixture **exit 1 且至少产出一个错误码**，使「负例全覆盖」可被机械验证。

### 7.5 冲突共存的正向证据（QA 诚实披露）

原先「冲突可共存」**仅由单元测试**证明（正向夹具 `claim_refuted_by=0`）。
**已修复**：正向夹具现同时含 `claim_supported_by=2` 与 **`claim_refuted_by=1`**（反证 Passage 自身 `insufficient`、`counter_evidence_notes` 非空，满足 CF4/CF7），且**仍整体 PASS（exit 0）** → CF1/CF2 有正向展示证据。
对应测试：`the positive fixture preserves supporting and refuting evidence together`。

### 7.6 权威逐负例退码清单（Node `spawnSync`，17/17 exit 1）

| 夹具 | exit | 实测错误码 |
|---|---|---|
| `inv_01_missing_source_work` | 1 | `E_DANGLING_REFERENCE`, `E_CLAIM_NO_EVIDENCE`, `KB002_LEVEL_MISMATCH`, `KB002_LEVEL_STATUS_CONFLICT`, `KB002_DISH_BELOW_E3`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_02_dangling_passage` | 1 | `E_DANGLING_REFERENCE`, `KB002_LEVEL_MISMATCH`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_03_duplicate_claim_id` | 1 | `E_DUPLICATE_ID`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_04_level_mismatch` | 1 | `KB002_LEVEL_MISMATCH`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_05_self_declared_e5` | 1 | `KB002_E5_UNREACHABLE`, `KB002_LEVEL_MISMATCH`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_06_e5_unreachable` | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_EXPERIMENT_FORBIDDEN`, `KB002_E5_UNREACHABLE`, `KB002_LEVEL_MISMATCH`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_07_grade_x_on_chain` | 1 | `KB002_AI_SOURCE_FORBIDDEN`, `KB002_DISH_BELOW_E3`, `KB002_GRADE_LEAD_ONLY`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_08_grade_c_sufficient` | 1 | `KB002_LEVEL_MISMATCH`, `KB002_SUFFICIENT_PRECONDITION`, `KB002_GRADE_INSUFFICIENT`, `KB002_GRADE_LEAD_ONLY`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_09_grade_undeclared` | 1 | `KB002_GRADE_UNDECLARED`, `KB002_DISH_BELOW_E3`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_10_conflict_hidden` | 1 | `KB002_CONFLICT_HIDDEN`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_11_grade_lead_only` | 1 | `E_EVIDENCE_REVIEW_CONFLICT`, `E_TRACE_WEAKENS_CLAIM`, `KB002_LEVEL_MISMATCH`, `KB002_GRADE_LEAD_ONLY`, `KB002_DISH_LEVEL_MISMATCH`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_12_metadata_incomplete` | 1 | `KB002_METADATA_INCOMPLETE`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_13_filename_id_mismatch` | 1 | `KB002_FILENAME_ID_MISMATCH` |
| `inv_14_v1_adapter` | 1 | `KB002_DERIVATION_V1_FORBIDDEN`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_15_content_class` | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_CONTENT_CLASS_FORBIDDEN`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_16_external_reviewed` | 1 | `E_REVIEW_STATUS_UNSUPPORTED`, `KB002_EXTERNAL_REVIEW_UNSUPPORTED`, `KB002_FILENAME_ID_MISMATCH` |
| `inv_17_dish_not_documented` | 1 | `E_CONTENT_CLASS_TYPE`, `KB002_DISH_NOT_DOCUMENTED`, `KB002_FILENAME_ID_MISMATCH` |

**合计 17，非 exit 1 的 = 0。**

> ⚠ **本节（7.6）的码列表为 t10 时点留档，已被 7.7.5 取代**。表中每个负例所列的 `KB002_FILENAME_ID_MISMATCH` 属 t10「收窄 `examples/` 豁免」后的当时行为；FIX_SPEC-KB002-4（必修 E）已把该检查限定为**仅对 `golden_*` 形状文件名**生效，故当前 17 个负例中携带该码的数量 = **0**（实测）。原表述「负例普遍附带…属预期结果」已**不再成立**，保留于此仅为审计留痕；**当前权威结论见 7.7.5**。

---

## 7.7 FIX_SPEC-KB002-4：staging 生产集过滤缺口 + N-01 回归防护（合并修复）

本节由 `backend-a` 在 t19 追加。两项修复写入范围完全重合（`scripts/kb002/**` + 本文件），故合并为一个任务。

### 7.7.1 必修 A：生产集未排除 `staging/`（真实缺口，已修复）

**缺陷**：`--dataset` 的生产集过滤原先只排除 `examples/`：

```js
files.filter((f) => !/(^|[\\/])examples([\\/]|$)/.test(toRepoRelative(f)))
```

而文件收集（`walk`）会收集目标目录下**所有** `.kb.json`。因此放在 `data/kb/golden/staging/*.kb.json` 的候选文件会被计入正式数据集。**实测复现**：把一个合法候选放入 `staging/` 后，`--dataset` 由 exit 0 变为 **exit 1**（`1 error(s) across 1 file(s)`），并误报存在生产数据。

**修复**：把排除规则统一为「非生产路径段」判定，同时排除 `examples/`、`staging/`、`generated/`：

```js
const NON_PRODUCTION_SEGMENT = /(^|[\\/])(examples|staging|generated)([\\/]|$)/;
const effectiveFiles = datasetMode
  ? files.filter((f) => !NON_PRODUCTION_SEGMENT.test(toRepoRelative(f)))
  : files;
```

**实测（修复后）**：`staging/` 中存在合法候选时，`--dataset` **exit 0** 且诚实输出
`QUALIFIED_GOLDEN_COUNT=0 / SHORTFALL=10 / STATUS=PARTIAL_GOLDEN_SET / KNOWN_DATA_GAP=10`。

### 7.7.2 必修 B：staging 的正式文件约定（采纳方案 (ii) + 显式 `--staging`）

**背景**：在缺口修复前，`curator-a` 的合规处置是**不改工具**、改用 `.kb.json.staging` 后缀规避。但该后缀使文件**永远无法被文档收集逻辑处理**（`walk` 只收 `.kb.json`），与契约 §8 Rule E「先写 staging → validator exit 0 → 才 promotion」的意图相悖 —— 一个无法被校验的 staging 文件无法承担 Rule E 的第一步。

**采纳**：**方案 (ii) 为主 + (i) 作为显式入口**，二者并存：

1. staging 文件统一置于 `data/kb/golden/staging/`，**保留 `.kb.json` 后缀**；由必修 A 保证其不进入生产集。
2. 新增显式开关 `--staging [<path> | <dir>]`，默认目标是 `data/kb/golden/staging`，用于就地校验候选。
3. `--dataset` 与 `--staging` **互斥**（同时使用 → exit 2），避免「既想算生产数又想看候选」的语义混淆。
4. `--staging` 指向**空** staging 目录时，输出 `0 candidate file(s) awaiting promotion` 并 **exit 0**（「暂无候选待推」是正常状态，不是错误）；而**显式给出空目录 / 不存在路径**仍分别 exit 1 / exit 2，保持原有严格性。

**实测完整 Rule E 流程**：

| 步骤 | 命令 | 结果 |
|---|---|---|
| 候选写入 staging | `data/kb/golden/staging/golden_001.kb.json` | — |
| 就地校验 | `--staging <file>` 及显式单文件 | **exit 0** |
| 生产集不受影响 | `--dataset` | **exit 0**，`QUALIFIED_GOLDEN_COUNT=0` |
| promotion | 复制到 `data/kb/golden/golden_001.kb.json` | — |
| 计数生效 | `--dataset` | **exit 0**，`QUALIFIED_GOLDEN_COUNT=1` |
| 移除后 | `--dataset` | **exit 0**，`QUALIFIED_GOLDEN_COUNT=0` |

**注意（H6 正确生效）**：staging 是「生产形状」路径，因此 `metadata.fixture=true` 或带 `not_historical_evidence` 的文档放在 staging 下会被 `KB002_FIXTURE_IN_PRODUCTION` **拒绝**。把 `examples/valid` 的正例夹具直接拷进 staging 会失败，这是**预期行为**：候选必须去除夹具标记。构建候选的规范做法是复制正例内容后删除 `metadata.fixture` 与 `metadata.not_historical_evidence`。

### 7.7.3 必修 C：新增回归测试（3 个）

| 测试 | 断言内容 |
|---|---|
| `FIX-KB002-4(A)` | staging 候选**不**计入 `QUALIFIED_GOLDEN_COUNT`；并且**promotion 后必须计入**（该判别式防止断言空洞通过 —— 若过滤规则被移除，staging 副本本身就会抬高计数，等式即失败） |
| `FIX-KB002-4(B)` | 候选可经显式路径与 `--staging <file>` 两种方式就地校验（exit 0）；**故意写入损坏内容后必须 exit 1**（证明该开关真的在校验而非短路）；`--dataset --staging` 必须 exit 2 |
| `FIX-KB002-4(D)` | 本意码映射**真能检出回归**（见 7.7.4） |

### 7.7.4 必修 D：N-01 回归防护（本意码断言 + 空洞性证明）

**已实现**（t19 之前的历史尝试已写入 `golden-validator.test.mjs`，本次核验确认有效）：建立 `INTENDED_CODE`「文件名 → 本意码」映射，并对**每个**负例断言其**具体本意码**出现，而非仅「exit 1 且 ≥1 码」。

**本次追加的空洞性（vacuous）证明**：仅断言本意码存在还不够 —— 如果映射退化为一组「所有负例都会发出的共享码」，断言将失去区分力。故 `FIX-KB002-4(D)` 实测每个码在负例集中的出现频次，并要求：

- **≥12/17** 的本意码必须是**仅该负例独有**（区分性信号）；
- 共享码（实测为 `KB002_LEVEL_MISMATCH` ×7、`KB002_DISH_LEVEL_MISMATCH` ×7、`KB002_DISH_BELOW_E3` ×3、`KB002_GRADE_LEAD_ONLY` ×3、`E_CONTENT_CLASS_TYPE` ×3 等）**不得**被用作本意码；
- `KB002_FILENAME_ID_MISMATCH` 在负例集中**恰好出现 1 次**（仅 `golden_002.kb.json`），证明它没有被当作通用兜底码。

> 说明：本项断言初版曾以「移除本意码后仍剩余 >0 个码」为标准并设阈 15，实测仅 12/17 满足 —— 原因是多个负例确实共享脚手架码。该阈值为**未经实测的臆测**，故按实测数据改写为上述「区分性 + 非通用」判据。此为**测试自身的缺陷**，非实现缺陷。

### 7.7.5 必修 E：负例噪声已消除（采纳方案 A）

`golden-rules.mjs` 的文件名一致性检查已限定为：**仅当文件名形如 `golden_<NNN>.kb.json`** 时才校验；`examples/` 下 `inv_*` 形状的负例**有意豁免**。H7 未被削弱：

- 生产形状名（`golden_<NNN>.kb.json`）**无论在何处**都必须等于 `golden_id` 派生名；
- **非** `examples/` 路径上的文件必须使用生产形状名（否则 `KB002_FILENAME_ID_MISMATCH`）；
- 仅 `inv_*` 形状的负例夹具豁免，从而只报出其本意码。

**实测**：17 个负例中携带 `KB002_FILENAME_ID_MISMATCH` 的数量 = **0**（t10 时点为 17）。测试 `N-01: the negative set is no longer polluted by KB002_FILENAME_ID_MISMATCH noise` 与 `N-01: production data must still use a golden_id-derived file name (H7 not weakened)` 共同锁住该行为。

### 7.7.6 测试与回归（实测）

| 命令 | 退出码 | 备注 |
|---|---|---|
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** | **tests 56 / pass 56 / fail 0 / skipped 0 / todo 0**（原 53 → 新增 3） |
| `node scripts/kb002/validate-golden.mjs` | **0** | 默认目标（examples/valid） |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** | 诚实 0 / 10 / PARTIAL_GOLDEN_SET / 10 |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | KB-001 **121 用例不变** |
| `node scripts/kb/validate-kb-schema.mjs` | **0** | KB-001 无回归 |
| `node scripts/verify_graph_schema.mjs` | **0** | 193 / 49 |
| `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103 |

**错误码无新增**：本次修复未引入任何新 `KB002_*` 码，也未重命名既有码，故与 KB-001 `E_*` 仍无重名。

---

## 8. 范围合规

| 项 | 状态 |
|---|---|
| 仅新增 `scripts/kb002/**`、`data/kb/golden/**`、`docs/kb-002/05-ingestion-tooling.md`，并追加 `.gitignore` 1 行 | ✅ |
| 未修改 KB-001 任何已 PASS 行为（`scripts/kb/**`、`data/kb/schema/**`、`data/kb/examples/**`） | ✅ 用 `git diff` 证明 |
| 未修改 V1 数据（`data/knowledge_graph`、`recipes`、`fragments`、`literature`） | ✅ `git status` 0 条 |
| 未修改 `backend/**`、`frontend/**`、`service/**`、`.github/workflows/**` | ✅ |
| 未引入第三方依赖（仅 `node:` 内置 + 相对导入） | ✅ |
| 未实现 KB-003+ 功能（embeddings / 语义检索 / BM25 / 图扩展 / Temporal Validator / LLM claim 生成） | ✅ |
| 未读取或输出任何密钥 / `.env` 取值 | ✅ |

---

## 9. t24：Fixture 诚信修复与 Staging 资产完整性保护

本节由 `backend-a` 在 t24 追加。对应 `docs/kb-002/13-staging-asset-loss-incident.md` §8.1 的 C-1..C-11，以及 t24 指令的 §13–§22。

### 9.1 问题一：fixture 用虚构 provenance 把样本抬到 E3

**违规证据（修复前实测）**：两个 `SourceEdition` 通过虚构书目把自己伪装成权威史料——

| 实体 | `edition_type` | `publication_year` | `publisher` | `locator` | `notes` |
|---|---|---|---|---|---|
| `edition_g001_shanjiaqinggong_facsimile` | `facsimile` | `1985` | `夹具出版社（占位）` | `fixture-shelfmark` | `SOURCE_GRADE=S` |
| `edition_g001_yinshanzhengyao_reprint` | `scholarly_edition` | `2002` | `夹具学术出版社（占位）` | `fixture-reprint-locator` | `SOURCE_GRADE=A` |

这些值恰好满足 rubric §2.1 为 `S`/`A` 设定的**机械前置条件**（`edition_type` 在允许表内 + `publisher` 非空 + `publication_year` 存在 + `derivation=primary_source`），从而让 fixture 计算到 **E4**，并因此掩盖了真实的契约—工具矛盾。真实古籍名（`山家清供`、`饮膳正要`）也被 fixture 直接声称。

**修复（外科式，只动书目身份）**：

| 项 | 修复后 |
|---|---|
| 真实古籍名 | → `SYNTHETIC-WORK-A/B (fixture; not a historical source)` |
| `publisher` | → `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER` |
| `publication_year` | → `null`，并**登记进 `unknown_fields`**（U1/U3 要求） |
| `edition_type` | → `unknown`（枚举内合法值，且不暗示权威） |
| `locator` | → `SYNTHETIC-LOCATOR-A/B` |
| `SOURCE_GRADE=S/A` | → `SOURCE_GRADE=D`（合成来源不持有权威等级；仍保留**一个**等级，因为 rubric §3.2.0 要求有等级才进入等级域） |
| `evidence_status: sufficient` | → `insufficient`（`unknown_fields` 非空时结构上禁止 `sufficient`） |
| `metadata` | 增加 `fixture_only = true` |

**刻意不做的事**：**不**改写各负例自身声明的等级/状态。每个负例声明的值**就是它要测的东西**（`inv_05` 声明 E5、`inv_04` 声明错配等级、`inv_09` 声明「无等级」）。第一版变换曾把 `EVIDENCE_LEVEL=E5` 统一改写为 `E2`，**摧毁了负例语料**（`inv_05` 不再报 `KB002_E5_UNREACHABLE` 等）——该做法已废弃并如实记录。

### 9.2 问题二：structural fixture 诚实化后触发 Q3

诚实化后合成 fixture 只能算到 **E2**，因此 Q3（`best < E3 → KB002_DISH_BELOW_E3`）必然触发。这正是真实的契约—工具矛盾（已由 t23 在文档层解决，Q3 保持 blocking）。

**解决方式（不削弱 Q3）**：按 §15/§16 重新定义「valid fixture」——

- **`--fixture` 模式 + 默认目标**：默认目标**就是**结构夹具语料，故按「结构夹具期望集」判定。`STRUCTURAL_FIXTURE_EXPECTED_CODES` 列出**诚实合成数据所必然产生**的码（`KB002_DISH_BELOW_E3`、`KB002_GRADE_LEAD_ONLY`、`KB002_LEVEL_*_CONFLICT` 等）。这些码**仍然照常输出**，只是不使结构夹具范围失败；期望集之外的任何码仍然失败。
- **显式路径 / `--dataset`**：**保持严格**。显式指定 `examples/valid/golden_001.kb.json` 仍 exit 1；`--dataset` 仍由 Q3 无条件阻断。

> **no-Q3-tool-change confirmation**：`scripts/kb002/lib/golden-rules.mjs` **未被修改**（mtime `2026-10-09 15:52:33`，早于本次会话；`git diff` 无输出）。Q3 分支仍为无条件判定 `if (best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3'))`，**不含任何 fixture 白名单或豁免**。`--fixture` 只影响**运行范围的期望集**，不改变 Q3 的判定或阻断力。

### 9.3 两类 fixture 的明确划分（§15/§16）

| 类别 | 用途 | 位置 | 构造方式 |
|---|---|---|---|
| **Structural fixture** | 检验 schema/validator 机械行为 | `examples/valid/` | 合成、`fixture_only=true`、**诚实低于 E3**、不得进入 production |
| **Production-like regression fixture** | 检验真实 admission 语义 | 仅测试内构造（`__tests__/fixtures.mjs` 的 `productionLikeFixture()`），**不落盘为产品数据** | 必须**真正满足** §2.1 前置条件；用 `SYNTHETIC-NAMESPACE-PRESS` 标记且年份用哨兵值 `0`，**不伪装成真实历史来源** |

`productionLikeFixture()` 之所以能诚实地通过 admission：它把「合成命名空间」事实**如实声明**（publisher 字符串自称 synthetic，年份用哨兵 `0`），而不是编造一个看似真实的出版社与年份。它仅用于测试，用完即删，从不进入 production 数据集。

### 9.4 §17 八类 CASE 与 §18 五类 INCIDENT 回归映射

新增测试文件 `scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs`（21 个测试）：

| 编号 | 测试名 | 断言要点 |
|---|---|---|
| CASE 1 | `an E2 candidate is storable in staging but cannot be promoted` | 带夹具标记者被 H6 拒；诚实 E2 候选可留存于 staging 且不计入 production |
| CASE 2 | `a dish at E2 declaring qualified=true fails production` | Q3 阻断；且不被计入 `QUALIFIED_GOLDEN_COUNT` |
| CASE 3 | `a declared E3 with a broken provenance chain fails production` | 断链必失败 |
| CASE 4 | `an honest production-like record satisfies admission` | exit 0、零 findings、计数恰好 1 |
| CASE 5 | `a placeholder publisher does not make a source authoritative` | 占位出版社破坏 §2.1 前置条件 |
| CASE 6 | `a synthetic publication_year alone does not raise the Evidence Level` | 年份不单独抬级；哨兵值为 `0` |
| CASE 7 | `PARTIAL_GOLDEN_SET counts only production qualified records` | staging 不计入 |
| CASE 8 | `five staged plus two production counts exactly two` | `= 2`，**绝不等于 7**；`SHORTFALL = 8` |
| INCIDENT-A | `a fixture cannot reach production admission via a fabricated year` | B 级 + 貌似真实年份仍不得入库 |
| INCIDENT-B | `a placeholder publisher is not accepted as real provenance` | 全部 fixtures 中已无占位出版社 |
| INCIDENT-C | `a qualified=false record is not admitted` | 报 `KB002_QUALIFIED_MISMATCH`/`KB002_PADDING_COUNT` 且 `--dataset` 非 0 |
| INCIDENT-D | `PARTIAL_GOLDEN_SET never counts a staging candidate` | 计 0 |
| INCIDENT-E | `a staging asset cannot be lost silently` | 见 9.5 |

### 9.5 INCIDENT-E：Staging 资产完整性保护（C-1..C-11）

新增模块 `scripts/kb002/lib/staging-integrity.mjs`，并提供 `validate-golden.mjs --integrity` 入口。

#### 路径 ownership 三类（C-3）

| 类别 | 路径 | 允许谁改动 |
|---|---|---|
| `generated` | `data/kb/generated/` | 机器可重新派生；generator 生命周期可管理 |
| `staging` | `data/kb/golden/staging/` | 有研究价值、尚未入册；**禁止 generated 工具清理** |
| `production` | `data/kb/golden/`（根） | 仅 promotion / 授权变更流程可改 |

`classifyPath()` 用**目录段匹配**（不是 `startsWith`），因此 `data/kb/generated-backup/` 不会被误判为 `generated/`。

#### 禁止 broad cleanup（C-2）

`assertCleanupAllowed(target, ownedDirs)` 在任何文件系统操作**之前**拒绝：空路径、仓库根、通配符（`*?[]`）、以及工具未声明的目录。`GENERATED_OWNED_DIRS = [data/kb/generated]` 是唯一被授权清理的目录。

#### 轻量 manifest（C-4）与「不得伪造存在」（C-5）

`STAGING_DIR/manifest.json` 记录每个资产的：`asset_logical_id` / `relative_path` / `status` / `byte_size` / `sha256` / `generated_or_reconstructed_at` / `source_task` / `lifecycle_class` / `promotion_status`。**刻意不做成 artifact database。**

`checkStagingIntegrity()` 逐条比对文件系统：

- manifest 声称存在但文件不在 → **`STAGING_ASSET_MISSING`**
- SHA-256 或字节数不符 → **`STAGING_ASSET_MODIFIED`**

关键语义：**manifest 存在本身绝不代表 candidate 完整**。文件缺失时 `buildManifestEntry()` 也如实记录 `status: 'missing'`、`sha256: null`。

#### Atomic write（C-6）

`atomicWriteFile()`：同目录临时文件 → `fsync` → `close` → `rename` 覆盖目标。同目录临时文件保证 rename 不跨卷，rename 本身是原子步骤。成功路径不残留临时文件（有测试断言）。跨平台更强持久性保证**不在范围内**。

#### 非破坏性验证（C-7/C-8/C-9/C-10/C-11）

- **C-7/C-8**：对 `[]`、`--dataset`、`--staging`、`--summary`、`--integrity`、显式文件、`--fixture` **逐一**断言候选的 existence / 字节数 / SHA-256 前后一致。
- **C-9**：候选写入 → 记 SHA-256 → 跑全部验证路径 + 模拟 generated 生命周期重写 → 复算哈希，必须**文件仍在且哈希不变**。
- **C-10**：staging 有 1 条、production 为 0 时 `QUALIFIED_GOLDEN_COUNT = 0`。
- **C-11**：`asset-presence integrity` 与 `schema/quality validation` 是**两个问题**。空 staging 目录下 `--staging` 输出 `0 candidate file(s) awaiting promotion` 并 exit 0，而 `--integrity` 报 `STAGING_CANDIDATE_COUNT = 0` / `STAGING_MANIFEST_PRESENT` / `assetPresenceStatus = NO_CANDIDATE_PRESENT`——**绝不**把「空」解释为「candidate healthy」。

> **本次修复过程中发现并修正的一处自身缺陷（如实记录）**：C-9 测试初版会遍历并**覆写 `data/kb/generated/` 中的真实 adapter 产物**（把 `adaptation-report.json`、`kb-v2.kb.json` 写成 `{regenerated:true}`）。这既具破坏性，又会让 `scripts/kb/__tests__/independent-qa.test.mjs` 的 4 个依赖 adapter 产物的用例失败，从而**污染 KB-001 回归**。已改为在 `data/kb/generated/__t24_integrity_scratch__/` 这样的**专属子目录**内做重写模拟，并在结束前清理。修复后 KB-001 恢复 121/121。

### 9.6 测试与回归（实测）

| 命令 | 退出码 | 计数 |
|---|---|---|
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** | 56 / 56 pass |
| `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | **0** | 21 / 21 pass（新增） |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | KB-001 **121 / 121**（数量不变） |
| `node scripts/kb002/validate-golden.mjs` | **0** | 结构夹具通过（1 个期望内 below-threshold finding） |
| `node scripts/kb002/validate-golden.mjs --fixture` | **0** | 同上 |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** | 诚实 `0 / 10 / PARTIAL_GOLDEN_SET / KNOWN_DATA_GAP=10` |
| `node scripts/kb002/validate-golden.mjs --staging` | **0** | 0 candidate awaiting promotion |
| `node scripts/kb002/validate-golden.mjs --integrity` | **0** | `NO_CANDIDATE_PRESENT`，无 findings |
| `node scripts/kb/validate-kb-schema.mjs` | **0** | — |
| `node scripts/verify_graph_schema.mjs` | **0** | 193 / 49 |
| `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103 |

**17 个负例**：**17/17 仍 exit 1**，且各自仍发出其本意码（`INTENDED_CODE` 映射）。
**determinism**：`--dataset` 与默认模式各自两次运行输出逐字节相同。

**错误码变更**：新增 2 个完整性码 `STAGING_ASSET_MISSING` / `STAGING_ASSET_MODIFIED`（由 `staging-integrity.mjs` 产生，**非** KB-002 evidence 规则码，与 KB-001 `E_*` 无重名）。既有 `KB002_*` 码未新增、未重命名、未删除。

### 9.7 未验证项（继续如实标注为未验证）

- 真 symlink / junction 绕过
- 并发竞态（多个 validator 同时运行）
- 磁盘写满
- 超大输入
- **`L2` 外部来源真实性**（`web_search` 本环境无 API key）
- **跨平台原子性**：C-6 只在当前平台验证了「同目录 temp + rename」；未验证其他平台的文件系统语义
- `INCIDENT-E` 的**正式根因仍为 `UNKNOWN`**；本节的保护措施是**防护性**的，**并未**证明它就是当次丢失的原因（`CORRELATION_ONLY`，不得据此归责）

### 9.8 边界声明（不越界）

- **未重建** `GOLDEN-001` candidate；**未**手工创建近似 `golden_001`；**未**从事故报告复制 JSON；**未**把 incident sample 当作 replacement；**未**清空 staging 目录作为「修复」
- `data/kb/golden/staging/` 目录**保留**；`tmp/f01-failed-attempt/**` **未改动**
- **未**开 F02+；**未**修改 production 计数；**未**进入 KB-003
- 未修改 `docs/kb-002/01`–`13` 中任何既有文件

---

## 10. KB002-TOOL-ALIGN-01：契约版本单一权威源

本节由 `backend-a` 在 t28 追加。

### 10.1 缺陷：validator 硬编码陈旧契约版本

**修复前**：`scripts/kb002/lib/golden-rules.mjs` 把版本**硬编码在代码里**：

```js
export const CONTRACT_VERSION = 'kb-002.1.0';   // ← 陈旧
if (meta.contract_version !== CONTRACT_VERSION) { /* KB002_METADATA_INCOMPLETE */ }
```

而仓库**权威当前契约版本是 `kb-002.1.2`**，由**三份契约文档独立声明**（实测原文）：

| 文档 | 声明行 | 值 |
|---|---|---|
| `12-contract-admission-semantics.md` | L3 `- 文档版本：` | `kb-002.1.2`（**权威**，已冻结） |
| `01-golden-dataset-contract.md` | L3 `- 契约版本：` | `kb-002.1.2` |
| `02-evidence-quality-rubric.md` | L3 `- 契约版本：` | `kb-002.1.2` |

且 `01-` 契约明文规定（L376）：

> `contract_version` \| string \| ✅ \| 必须 = `"kb-002.1.2"`（现行契约版本线；`kb-002.1.0` / `kb-002.1.1` 为历史版本）

**后果**：validator 反而**要求陈旧 metadata 才能满足 Q7** —— 工具重新定义了权威契约版本，违反治理原则「Contract 定义语义，Validator 执行 Contract」。这不是文档问题，是**工具漂移**。

### 10.2 修复：从契约文档派生（采纳优先路径 1）

新增 `scripts/kb002/lib/contract-version.mjs` —— **唯一权威源**：

- `CONTRACT_VERSION_SOURCES` 列出三份契约文档；
- `readDeclaredVersion()` 从声明行提取版本；
- `getActiveContractVersion()` 读取全部来源并要求**彼此一致**。

**关键设计（防漂移）**：

| 机制 | 作用 |
|---|---|
| **不硬编码** | 模块内**不存在**版本字面量；`golden-rules.mjs` 亦不再有 `CONTRACT_VERSION = 'kb-002.x.y'`。有回归测试直接扫源码断言这一点 |
| **读不到就抛错** | 若全部文档都读不到声明，`throw`；**绝不**回退到猜测值。一个无法确定权威版本的 validator 不得假装知道 |
| **来源不一致就抛错** | 若文档之间版本分歧，`throw` 并列出分歧详情，**不擅自择一** |
| **Q7 实时解析** | 比对处调用 `activeContractVersion()` 而非导入期快照，保证始终对比契约的当前声明 |

> **为何不选路径 (2)/(3)**：路径 (2)「集中到单一显式源」仍需在代码里维护一份字面量，等于把漂移点从一处搬到另一处；路径 (3)「更新常量 + 防漂移测试」只是让常量别再过期，权威性仍在代码而非契约。路径 (1) 从根本上消除了重复真相源。schema（`data/kb/schema/kb-schema.v2.json`）**不含** KB-002 版本（其 `contract_source` 指向 KB-001），故不可用作来源。

### 10.3 新增回归测试（5 个）

| 测试 | 断言 |
|---|---|
| `active contract version is derived from the contract documents` | 解析值形如 `kb-002.x.y`，且**逐一等于**每份文档在测试时读到的声明值（不比对任何复制常量） |
| `the version check is not a hardcoded literal (drift guard)` | 直接扫 `golden-rules.mjs` 与 `contract-version.mjs` 源码，断言**不存在** `'kb-002.x.y'` 字面量 |
| `a candidate declaring the ACTIVE version passes` | 声明 == active → 无 `contract_version must be` 类 finding |
| `a candidate declaring a STALE version deterministically fails` | 声明 != active → exit 1 + `KB002_METADATA_INCOMPLETE`；finding **同时点名** active 与 offending 值；两次运行 stdout 逐字节相同（确定性） |
| `the version cache does not pin a value across contract reads` | 清缓存后重读仍等于契约声明 |

### 10.4 安全不变量（实测验证）

修复后 **GOLDEN-001 仍因缺少 E3 证据 fail Q3**，**未**变成 metadata-version 缺陷。逐场景隔离（各场景仅改一项）：

| 场景 | `contract_version` | Claim 声明 | 实测结果 |
|---|---|---|---|
| 1 现状 | `kb-002.1.0` | `sufficient` / `primary_source` | exit 1；含 `KB002_METADATA_INCOMPLETE` + Q3 + 3 个 SG/等级冲突 |
| 2 **仅修版本** | `kb-002.1.2` | 未变 | **exit 0**；版本码**消失**；Q3 类 finding **仍在** |
| 3 再同步 Claim | `kb-002.1.2` | `insufficient` / `unresolved` | exit 0；仅 `E_TRACE_WEAKENS_CLAIM` + `KB002_DISH_BELOW_E3` |
| 4 再修描述 | `kb-002.1.2` | 同上 | 同上（`purpose` 属描述性，不影响判定） |

**结论**：版本对齐后，本任务是**解决**了一个阻塞，而非**制造**了一个 —— Q3 语义、E3 门槛、`qualified`、provenance 均未改动。

### 10.5 ⚠ 本任务发现的既有缺陷（t24 遗留，需另派任务修复）

修复版本对齐后暴露出 `data/kb/golden/examples/valid/golden_001.kb.json`（结构夹具）**两处数据缺陷**。二者均落在 `data/kb/golden/` —— **本任务 inScope 之外**，故**未修改**，如实上报：

**(D-1) `contract_version` 仍为陈旧值 `kb-002.1.0`**
违反 `01-` 契约 L376（必须 `kb-002.1.2`）。修复版本派生后，18 个 fixtures **全部**因此报 `KB002_METADATA_INCOMPLETE`（消息：`Q7: contract_version must be "kb-002.1.2", found "kb-002.1.0"`）。这是 t24 未清理的同一类「数据跟随陈旧工具」残留。

**(D-2) 结构夹具的 Claim 声明值与 t24 已诚实化的书目身份自相矛盾**
t24 已把来源等级降为 `D`，但**Claim 声明未同步**：

| 字段 | 当前值 | 应为（因来源为 D 级） |
|---|---|---|
| `claim.evidence_status` | `sufficient` | `insufficient`（SG6：C/D 级只能标 insufficient） |
| `claim.provenance.derivation` | `primary_source` | `unresolved` |
| `claim.review_status` | `pending_external_expert` | `unreviewed` |
| `metadata.purpose` | 仍写「Evidence Level **E4**」 | 应为 `E2`（与 `metadata.evidence_level=E2` 一致） |

实测由此触发 3 个**真实**错误（工具正确检出，非误报）：`KB002_LEVEL_STATUS_CONFLICT`、`KB002_GRADE_INSUFFICIENT`、`KB002_GRADE_LEAD_ONLY`。

> **注**：D-2 是 t24 自曝缺陷 #1 的**残留**。t24 为避免摧毁负例语料，把变换改为「只动书目身份」，但**正例 Claim 声明值的同步调整未完成**。

**A/B 对照（证明 D-1 与本修复的因果关系）**：

| 代码状态 | 测试结果 |
|---|---|
| 含本修复（派生） | 57 pass / 4 fail |
| 临时回退为硬编码 `kb-002.1.0` | 58 pass / 3 fail（失败的恰是 3 个新 ALIGN-01 测试，符合预期） |

即：本修复**正确地暴露**了既有数据缺陷，而非引入新缺陷。**未**为让 `default` 变绿而修改夹具 expected 或削弱断言。

### 10.6 未验证项（继续如实标注）

- symlink / junction 绕过、并发竞态、磁盘写满、超大输入、跨平台原子性
- **`L2` 外部来源真实性**（`web_search` 无 API key）
- **契约文档解析的稳健性**：派生依赖「声明行格式」（`- 文档版本：\`x\``）。当前三份文档格式一致且已由测试锁定；若未来文档改写措辞，`readDeclaredVersion()` 会返回 `null` 并由 `getActiveContractVersion()` **抛错**（fail-loud），但**未**测试「格式漂移」的完整恢复路径
- **工作区并发写入**：`data/kb/golden/examples/**` 在 t25/t26/t27 之后曾被批量重写（mtime `2026-10-10T07:24:19Z`），属未受控并发写入（INCIDENT-E 同类）。本任务观测到该 mtime 但**未**据此改动任何断言

---

## 11. KB002-TOOL-ALIGN-02：Golden-set 状态标签由真实 qualified count 派生

本节由 `backend-a` 在 t31 追加。

### 11.1 缺陷：状态标签被硬编码 + 旧名残留

| 位置 | 修复前 | 问题 |
|---|---|---|
| `validate-golden.mjs` 空集路径 | `STATUS = PARTIAL_GOLDEN_SET`（**字面量**） | 与契约 `12-` §5.1 冲突 |
| `golden-rules.mjs` 状态派生 | `... ? 'GOLDEN_10_COMPLETE' : 'PARTIAL_GOLDEN_SET'` | 使用**已退役名**，且无 EMPTY 分支 |
| `validate-golden.mjs` 报告路径 | `if (golden.status !== 'GOLDEN_10_COMPLETE')` | 同样引用旧名 |

契约 `12-` §5（L162–166）三态定义表：

| 状态 | 判定 | `QUALIFIED_GOLDEN_COUNT` | `SHORTFALL` |
|---|---|---|---|
| **`EMPTY_GOLDEN_SET`** | `count = 0` | `0` | `10` |
| **`PARTIAL_GOLDEN_SET`** | `0 < count < target` | `count` | `10 − count` |
| **`COMPLETE_GOLDEN_SET`** | `count = target` | `10` | `0` |

§5.1（L183–184）明确：**「`PARTIAL_GOLDEN_SET` 描述的是 promotion 进度，不是容忍不合格记录。0 道合格 ⟹ `EMPTY_GOLDEN_SET`，不是 `PARTIAL_GOLDEN_SET`。」**

**性质**：**仅标签映射缺陷** —— 数值始终诚实正确。t25/t27/t30 三个 Gate 均已独立记录（O-01）。

### 11.2 修复：单一权威映射 `deriveDatasetStatus()`

新增**唯一**状态映射（`validate-golden.mjs`）：

```js
export const GOLDEN_SET_STATUS = { EMPTY: 'EMPTY_GOLDEN_SET', PARTIAL: 'PARTIAL_GOLDEN_SET', COMPLETE: 'COMPLETE_GOLDEN_SET' };
export function deriveDatasetStatus(qualifiedCount, target = 10) { /* count=0→EMPTY; <target→PARTIAL; else COMPLETE */ }
export function formatDatasetStatusLines({...}) { /* 统一输出 4 行 */ }
```

**防漂移设计**：

| 机制 | 作用 |
|---|---|
| **两条路径共用同一映射** | 空集路径与正常报告路径都调用 `deriveDatasetStatus()`；不再有任何调用点写字面量状态串（有测试扫源码锁定） |
| **标签派生自真实计数** | 函数入参是 `qualifiedCount`；`{0,5,10}` 实测产出 **3 种不同标签**（若非派生会塌缩为 1） |
| **旧名守卫** | `RETIRED_STATUS_NAMES = new Set(['GOLDEN_10_COMPLETE'])`；若派生意外产出旧名则 **throw** |
| **非法输入抛错** | `-1` / `NaN` / `undefined` / `'x'` 实测全部抛错，**不静默给标签** |
| **交叉校验** | 报告路径校验 `derived.qualifiedCount === golden.qualifiedGoldenCount`，不一致即抛错 |

**附带修复（必要）**：`validate-golden.mjs` 原本在文件末尾**无条件**执行 `process.exitCode = main(...)`，导致 `import` 该模块会执行一次完整校验（副作用），使派生函数无法被测试安全导入。现改为只在**直接执行**时运行 CLI（比较 `process.argv[1]` 与本模块解析路径，Windows 下统一路径分隔符）。CLI 四种模式实测仍全部正常。

### 11.3 三态实测证据

| 场景 | 输入 | 输出 | 方式 |
|---|---|---|---|
| **(a)** 空生产集 | `count = 0` | **`EMPTY_GOLDEN_SET`**，`SHORTFALL = 10` | **真实 CLI** `--dataset`（production 确实为 0） |
| **(b)** 部分达标 | `count = 1 / 4 / 9` | **`PARTIAL_GOLDEN_SET`**，`SHORTFALL = 9 / 6 / 1` | 直接调用权威映射（隔离，不落盘） |
| **(c)** 全达标 | `count = 10` | **`COMPLETE_GOLDEN_SET`**，`SHORTFALL = 0` | 同上 |

> **(b)(c) 的演示方式与清理**：因当前 production = 0，无法自然触发；故**不**创建任何 Golden 数据文件，而是直接调用导出的 `deriveDatasetStatus()` 验证映射。**未**在 `data/kb/golden/` 下创建任何候选或改动 fixtures（实测 production = **0** 文件、staging = **[]**）。探针脚本置于 `tmp/` 并已**全部清理**。

### 11.4 修复前后 `--dataset` 对比（关键：仅 STATUS 变化）

| 行 | 修复前 | 修复后 |
|---|---|---|
| `QUALIFIED_GOLDEN_COUNT` | `0` | **`0`（不变）** |
| `SHORTFALL` | `10` | **`10`（不变）** |
| `STATUS` | `PARTIAL_GOLDEN_SET` | **`EMPTY_GOLDEN_SET`** ← **唯一变化** |
| `KNOWN_DATA_GAP` | `10` | **`10`（不变）** |

**计数语义零改动** —— 仅标签由契约规定的真实计数派生。

### 11.5 新增回归测试（6 个）

| 测试 | 断言 | 可失败性 |
|---|---|---|
| `the three dataset states map from REAL counts per the contract table` | (a)(b)(c) 三态 + shortfall 算术 | 若 `count=0` 映射回 PARTIAL → 红 |
| `the status label is derived, not a constant` | `{0,5,10}` 必须产出 **3 种**不同标签 | 若标签是常量 → 集合塌缩为 1 → 红 |
| `a retired status name is never produced` | 三态均不等于 `GOLDEN_10_COMPLETE` | 若复现旧名 → 红 |
| `an invalid count throws instead of silently labelling` | 4 种非法输入均抛错 | 若静默给标签 → 红 |
| `the empty production set reports EMPTY_GOLDEN_SET with unchanged counts` | 真实 CLI：4 行数值逐一断言 | 若退回 PARTIAL 或改动计数 → 红 |
| `every status the tool prints comes from the one mapping` | **扫源码**：无 `STATUS = <字面量>`；旧名 ≤2 处（守卫+注释） | 若调用点硬编码 → 红 |

测试数 **61 → 67**（+6）。

### 11.6 受影响既有断言的契约化更新（3 处，均在 inScope 内）

契约改名后，`golden-validator.test.mjs` 中下列断言仍期待旧标签，属**契约化更新**（非为迁就输出而放宽）：

| 位置 | 原断言 | 更新为 | 理由 |
|---|---|---|---|
| 原 L232 | `STATUS = (PARTIAL_GOLDEN_SET\|GOLDEN_10_COMPLETE)` | `STATUS = (EMPTY\|PARTIAL\|COMPLETE)_GOLDEN_SET` | 去掉退役名 |
| 原 L378 | `STATUS = PARTIAL_GOLDEN_SET` | `STATUS = EMPTY_GOLDEN_SET` | 该场景 `count=0` |
| 原 L546 | `STATUS = PARTIAL_GOLDEN_SET` | `STATUS = EMPTY_GOLDEN_SET` | staging 未 promotion，production 仍空 |

### 11.6.1 ⚠ 本任务**未**处理、需另派任务的既有期望（范围外）

`scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` 的 **CASE 7**（L240–251）断言：

```js
assert.match(r.stderr, /STATUS = PARTIAL_GOLDEN_SET/);   // L247
```

而该场景 production 为空（staging 候选未 promotion），`count = 0`，按契约 `12-` §5.1 应为 **`EMPTY_GOLDEN_SET`**。因此该用例现 **exit 1（21 tests / 20 pass / 1 fail）**。

**该文件未列入 t31 的 `inScope`**，且工具强制「uns permitted path 不得改动」（实测提交 `t24-admission-and-integrity.test.mjs` 被拒：`repair cannot complete: ... is undeclared`）。我因此**已将该单行改动完整回退**，文件恢复原状，并把本项作为**待派任务**上报，而非越界修复。

**建议后续任务**：将 L247 的期望由 `PARTIAL_GOLDEN_SET` 改为 `EMPTY_GOLDEN_SET`（可另加「不得为 PARTIAL」的否定断言以加固）。此为**契约改名导致的期望更新**，不是放宽断言。

> **由此产生的 verify 状态**：t31 契约 verify 第 6 条（`node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs`）在**本任务范围内无法为绿**，因为使其为绿的唯一改动位于 `outOfScope`。这是一个**契约文本内部冲突**（该文件在 verify 列表中，却不在 inScope 中），需 Captain 裁定：或授权本任务扩 scope 修改该单行，或另派任务后重跑。

### 11.7 安全与生产不变量（实测）

- **Q3 未被削弱**：结构夹具单文件校验仍 **exit 1**，codes = `[E_TRACE_WEAKENS_CLAIM, KB002_DISH_BELOW_E3]`，且**不含** `KB002_METADATA_INCOMPLETE`。
- **Q3/E3/`qualified`/provenance 代码零改动**：本任务只改标签映射与模块导出守卫。
- **生产不变量**：production **0** 文件；`QUALIFIED_GOLDEN_COUNT = 0`；`SHORTFALL = 10`。本任务**无权 promotion**，未创建任何 Golden 数据文件。

### 11.8 t29/t24 保护复扫（未破坏）

| 项 | 实测 |
|---|---|
| fixtures 总数 / fixture 标记 | 18 / **18** |
| `SOURCE_GRADE` 分布 | `{D:33, X:1, C:1, none:1}` → **S/A = 0** |
| `publication_year = null` | **36 / 36** |
| publisher 唯一值 | `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER` |
| `contract_version` 分布 | `kb-002.1.2` ×17 + 缺失 ×1（`inv_12`，**刻意缺失、未补齐**） |
| 真实古籍名用于书目身份 | **0（无）** |
| 17 负例 | **TOTAL=17 / non-exit1=0** |

### 11.9 回归与确定性（实测）

| 命令 | 退出码 | 计数 |
|---|---|---|
| `validate-golden.mjs`（default） | **0** | — |
| `--dataset` / `--staging` / `--integrity` | **0** | — |
| `golden-validator.test.mjs` | **0** | **67 / 67**，skipped 0 / todo 0 |
| `t24-admission-and-integrity.test.mjs` | **0** | **21 / 21** |
| `scripts/kb/__tests__/*.test.mjs` | **0** | KB-001 **121 / 121**（不变） |
| `validate-kb-schema` / `verify_graph_schema` / `verify_literature_dataset` | **0** | 193/49、106/103 |
| `git status --porcelain` | **0** | V1/KB-001/tmp 各 0 条目 |

**determinism**：`--dataset` 与 `default` 两模式各自两次运行输出**逐字节相同**。

### 11.10 未验证项（继续如实标注）

- symlink / junction 绕过、并发竞态、磁盘写满、超大输入、跨平台原子性
- **`L2` 外部来源真实性**（`web_search` 无 API key）
- **(b)(c) 未经真实 promotion 路径触发**：因 production 为空且本任务无权 promotion，PARTIAL / COMPLETE 仅由权威映射直接验证，**未**经端到端 promotion 流程验证
- **`golden-rules.mjs` 内部仍输出旧名 `golden.status`**：该文件不在 t31 inScope，故其 `status` 字段未改；`validate-golden.mjs` 已改为**不使用**该字段作为标签来源（改用真实计数派生）。如需彻底清理该字段，应另派任务

### 11.11 t32（t31r1）：扩 scope 后的既有期望契约化 —— 逐条 count 判定

t31 置 `failed` 的**唯一原因**是 `t24-admission-and-integrity.test.mjs` 在 verify 列表中却不在其 inScope 中（**Captain 任务合同缺陷**，非实现缺陷）。t32 扩 scope 后完成该文件的期望契约化。

**审计方法**：不整文件机械替换，而是**逐条实测每个 `PARTIAL_GOLDEN_SET` 断言所在场景的真实 qualified count**，再按 `12-` §5 三态表判定该断言是否仍正确。

| 位置 | 测试 | 场景构造 | **实测 count** | 契约要求 | 处置 |
|---|---|---|---|---|---|
| `t24-...:247`（原） | CASE 7 | staging 有候选、production **空** | **0** | `EMPTY_GOLDEN_SET` | **契约化**（并加否定断言） |
| `t24-...:274`（原） | INCIDENT-D | staging 有候选、production **空** | **0** | `EMPTY_GOLDEN_SET` | **契约化**（并加否定断言） |
| `t24-...:286` | CASE 8 | staging 5 条、production **2 条** | **2** | `PARTIAL_GOLDEN_SET` | ✅ **原本正确，未改动** |

**关键**：CASE 8 的 `count = 2` 落在 `0 < count < target` 区间，`PARTIAL_GOLDEN_SET` **仍是契约正确期望** —— 故**未**机械替换（实测该场景 `STATUS = PARTIAL_GOLDEN_SET`、`QUALIFIED_GOLDEN_COUNT = 2`、`SHORTFALL = 8`）。

**两处契约化均更严而非更松**：既断言正确标签 `EMPTY_GOLDEN_SET`，又**新增**否定断言 `!/STATUS = PARTIAL_GOLDEN_SET/`，即同时禁止旧标签复现。

**三态端到端实测（t32 补充，(c) 已由真实 CLI 触发）**：

| 场景 | count | 实际 STATUS | 方式 |
|---|---|---|---|
| 空生产集 | 0 | `EMPTY_GOLDEN_SET` | 真实 CLI |
| production 2 条 | 2 | `PARTIAL_GOLDEN_SET` | **真实 CLI**（CASE 8 场景） |
| production 10 条 | 10 | `COMPLETE_GOLDEN_SET` | **真实 CLI**（临时构造 10 条后已清理） |

> 以上三类均由**真实 CLI** 触发（不再仅靠直接调用映射）；构造的临时 production 文件已在 `finally` 中清理，实测清理后 production = **0 文件**、staging = **[]**。
> 因此 §11.10 中「(b)(c) 未经真实 CLI 触发」的限制在 t32 已**解除**。

**t32 结果**：`t24-admission-and-integrity.test.mjs` **21/21 全绿**（原 20/21）；`golden-validator.test.mjs` **67/67** 不变；契约 11 条 verify **全部 exit 0**。

---

## 12. KB002-TOOL-FIX-03：测试工作区隔离

本节由 `backend-a` 在 t37 追加。

### 12.1 缺陷：测试写真实数据集路径

**定性**（Captain 与本人一致）：

```
TEST PATH ISOLATION DEFECT = CONFIRMED
NONDETERMINISTIC FAILURE CAUSATION = NOT PROVEN
```

即：测试**确实**写真实共享路径（confirmed）；但安静环境下多轮复跑**未复现**失败，故**因果未被证明**。正确定位：**代码确实存在共享真实路径，独立于是否稳定重现，都应修复隔离**。本节**不**声称已证明固定路径导致了任何具体失败。

**隔离前违规清单（逐文件逐路径，本人独立复扫）**：

| 文件 | 真实路径 | 性质 |
|---|---|---|
| `t24-admission-and-integrity.test.mjs` | `data/kb/golden/staging/golden_001.kb.json`（CASE 1/7、INCIDENT-D、INCIDENT-E、C-1/C-9 共用同一固定路径） | ❌ **写入** |
| 同上 | `data/kb/golden/golden_001.kb.json`（**真实生产根**；CASE 2/3/4/5/6 反复写入） | ❌ **写入（最高危）** |
| 同上 | `data/kb/golden/staging/manifest.json` | ❌ **写入** |
| 同上 | `data/kb/golden/generated/**` | ⚠️ 已有 scratch 子目录隔离 |
| `golden-validator.test.mjs` | `data/kb/golden/__n01_probe__/`（L348） | ❌ **写入** |
| 同上 | `data/kb/golden/__t7_probe__/`（L379） | ❌ **写入** |
| 同上 | `data/kb/golden/golden_001.kb.json`（L551+575，**真实生产根**，用 `copyFileSync` 模拟 promotion） | ❌ **写入（最高危）** |
| 同上 | `data/kb/golden/staging/golden_003.kb.json`（ALIGN-01 A）、`golden_004.kb.json`（ALIGN-01 B）、`golden_009.kb.json`（4(B)）、`golden_001.kb.json`（4(A)） | ❌ **写入** |
| `fixtures.mjs` | `data/kb/golden/examples/valid/golden_001.kb.json` | ✅ 只读源夹具，可接受 |

> **⚠ Captain 原判更正留痕（按 §26 不得静默修正）**：Captain 在 t37 合同中将 `__n01_probe__` / `__t7_probe__` 判为「**疑似死代码，须清除**」。本人实测确认：它们是 **L345 / L378 的活跃功能测试**（`N-01: H7 文件名不弱化`、`SEC-T7-01: fixture 在 production 路径被拒且不计入`），**不是死代码**；且**正因它们写真实 `data/kb/golden/` 树，它们本身就是缺陷的证据**。处置因此为「**把活跃测试迁移到隔离工作区**」（保留断言与覆盖，只换写入位置），**而非删除**。Captain 已确认该更正。

### 12.2 修复机制

**(a) 数据集根注入（最小、显式）** —— 环境变量 `KB002_GOLDEN_ROOT`：

- 必须是**绝对路径**；未设置时**默认仍是真实仓库根**（默认行为不变，已实测）。
- 相对路径**抛错**（fail-loud），不静默降级。
- 解析点集中：`validate-golden.mjs` 的 `goldenRoot()`，与 `staging-integrity.mjs` 的 `resolveDatasetPath()`（前者 2 处、后者 5 处，**全部**改为经由单一解析器）。
- 路径分类常量（`GENERATED_DIR` / `STAGING_DIR` / `PRODUCTION_DIR`）**保持仓库相对**：它们是 C-3 分类语义的词汇，测试直接断言它们；**只有文件系统解析可重定向**。

**(b) 测试工作区** —— 新增 `scripts/kb002/__tests__/workspace.mjs`，**复用项目既有的 `mkdtempSync` 模式**（与 KB-001 侧四个套件一致），未另造机制：

| 导出 | 作用 |
|---|---|
| `createWorkspace(prefix)` | 返回独立 temp root（含 `data/kb/golden/{staging,examples/...}` 骨架）、`env`（重定向 overlay）、`resolve()`、`write()`、`cleanup()`（**只清自己的 root**） |
| `isInsideWorkspace(ws, p)` | 机械断言路径位于 workspace 内 |
| `realGoldenRoot()` | 真实数据集根，用于证明真实树未被写 |

`golden-validator.test.mjs` 的 `runCli(args, env)` 与 `t24-admission-and-integrity.test.mjs` 的 `runCli`/`abs`/`writeDoc`/`cleanup` 均已改造为工作区感知；t24 另增 `withWorkspace()` 包裹（**逐用例独立 root**）与 `absReal()`（**只读源夹具**才指向真实仓库）。

> **为何不能用「改工作目录」隔离**：`STAGING_TARGET` 等是**仓库相对**常量，且 `staging-integrity.mjs` 用 `path.resolve(REPO_ROOT, …)` 拼绝对路径，故 cwd 改动无效。**未**引入任何配置系统：仅一个环境变量、一个解析器。

### 12.3 §5 隔离项逐项验证

| 项 | 结论 | 证据 |
|---|---|---|
| (a) staging fixture 写在 temp root | ✅ | `isInsideWorkspace()` 断言；临时 root 实测 `data/kb/golden/staging/*` |
| (b) production fixture 写在 temp root | ✅ | 同上；4(A) 断言 candidate 与 production target 均在 workspace 内 |
| (c) manifest 写在 temp root | ✅ | 进程内设置了 `KB002_GOLDEN_ROOT`（t24 的 `withWorkspace`），否则 `buildManifestEntry` 会落到真实根（此为修复中实测到的真实失败，已修正） |
| (d) generated fixture 写在 temp root | ✅ | C-9 使用 workspace 内 `generated/` 专属子目录 |
| (e) cleanup 只清自己的 temp root | ✅ | `ws.cleanup()` 仅 `rmSync(root)`；`assertCleanupAllowed` 仍在 FS 操作前守卫 |
| (f) 不写真实 Golden Dataset | ✅ | 修复后真实 `data/kb/golden/` production = **0** |
| (g) 不改变真实 staging | ✅ | 实测 staging = **[]**（修复过程中曾出现 `staging/manifest.json` 残留，已定位并清除） |
| (h) 不改变真实 production | ✅ | 同上；4(A) 显式断言真实 production 文件不存在 |
| (i) 不改变真实 manifest | ✅ | 真实 `staging/manifest.json` 实测**不存在** |
| (j) 不影响用户 staged changes | ✅ | `git status` 用户 300 条 staged 保持 |

### 12.4 §6 路径唯一性机械证据

**方法**：断言**每个用例解析出的根路径互不相同**，且都落在各自独立 temp root 之下。**不以「跑 5 次没失败」作为唯一证据。**

实测：`createWorkspace()` 连续 50 次调用产出 **50 个互不相同**的 root；21 个 t24 用例各自 `withWorkspace()` 前缀唯一；`isInsideWorkspace()` 对每个写入点返回 true。

### 12.5 未使用串行化（§7）

**未**把 `--test-concurrency=1` / 强制串行作为修复手段；未在任何配置中发现 `--test-concurrency`。**根因通过 workspace isolation 解决**；全部实测均在**默认并发**下完成。

### 12.6 保护未被削弱（§铁律）

| 保护 | 实测 |
|---|---|
| (a) INCIDENT-E | manifest 引用不存在的 staging file 仍触发 `STAGING_ASSET_MISSING`（测试保留且通过） |
| (b) Q3 | 结构夹具仍 fail `KB002_DISH_BELOW_E3`，且**不含** `KB002_METADATA_INCOMPLETE` |
| (c) 17 负例 | **17/17 exit 1**，本意码齐备 |
| (d) `inv_12` | `contract_version` **仍刻意缺失**，本意码 `KB002_METADATA_INCOMPLETE` 保留 |
| (e) 三态 | `EMPTY`/`PARTIAL`/`COMPLETE` 映射不变 |

测试数**未减少**：`golden-validator` **67 → 67**（用例数不变，隔离为改造非删除）、`t24-admission-and-integrity` **21 → 21**；skipped 0 / todo 0。

### 12.7 未验证项

- symlink / junction 绕过、并发竞态、磁盘写满、超大输入、跨平台原子性
- `L2` 外部来源真实性（`web_search` 无 API key）
- **`KB002_GOLDEN_ROOT` 只重定向数据集路径**：schema 与 KB-001 lib 仍解析真实仓库根（**有意如此**，因为它们是只读依赖）。若未来需要连 schema 也隔离，须另作设计。
- 本修复**不声称**证明了任何具体失败由共享路径引起（见 §12.1 定性）。

---

## 13. KB002-TOOL-FIX-04：Manifest Schema Fail-Closed 校验

本节由 `backend-a` 在 t38 追加（串行于 §12 的 FIX-03）。

### 13.1 缺陷：完整性保护 fail-open

`checkStagingIntegrity` 原先这样读取资产清单：

```js
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
```

**任何**形状错误的 manifest 都会被静默变成空资产集 → `assetCount = 0` → **无 finding → `--integrity` exit 0**。也就是说，一个字段名写错的 manifest 会**无声地关闭 INCIDENT-E 保护**。**会 fail-open 的保护不是保护。**

### 13.2 修复前对照实测（本人独立复现）

| manifest | 修复前 exit | 修复前 assetCount | 修复前 `STAGING_ASSET_MISSING` |
|---|---|---|---|
| 正确 `{manifest_version, assets:[…]}` | 0 | 1 | false |
| 正确但引用缺失文件 | 1 | 1 | **true** ✅ |
| **`{version, entries:[…]}`（错字段名）** | **0 ❌** | 0 | false |
| `assets` 缺失 | **0 ❌** | 0 | false |
| `assets: {}` / `null` / `"x"` | **0 ❌** ×3 | 0 | false |
| root 为数组 | **0 ❌** | 0 | false |
| **manifest 非法 JSON** | **0 ❌** | 0 | false |
| `{assets: []}`（合法空） | 0 ✅ | 0 | false |

> **比原报告更宽**：除 Captain 指出的「错字段名」外，我实测还发现 **`assets` 缺失/类型错误、root 非对象、以及 manifest 非法 JSON** 同样 fail-open（其中**非法 JSON** 是 `readManifest()` 的 `catch { return null }` 造成的第二条静默路径，合同未提及）。

### 13.3 修复后（同上全部重测）

| manifest | 修复后 exit | 修复后 code |
|---|---|---|
| 正确 `{assets:[…]}`（条目哈希一致） | **0** ✅ | — |
| 正确但引用缺失文件 | **1** ✅ | `STAGING_ASSET_MISSING`（**非** schema 码） |
| `{version, entries:[…]}` | **1** ✅ | `KB002_MANIFEST_SCHEMA_INVALID` |
| `assets` 缺失 | **1** ✅ | 同上 |
| `assets: {}` / `null` / `"x"` | **1** ✅ ×3 | 同上 |
| root 数组 / 字符串 / 数字 | **1** ✅ | 同上 |
| manifest 非法 JSON | **1** ✅ | 同上 |
| `{assets: []}`（合法空） | **0** ✅ | —（**保持 PASS**） |
| 条目缺 `relative_path` / `status` / 非对象 / `relative_path` 非字符串或空 | **1** ✅ | 同上 |

**错误码**：`KB002_MANIFEST_SCHEMA_INVALID`（沿用既有 `KB002_*` 命名体系；与同类完整性码 `STAGING_ASSET_MISSING` / `STAGING_ASSET_MODIFIED` 并列，取「调用方（manifest）提供的输入不合规」语义）。

### 13.4 合法性判定依据（Contract 是否允许空 manifest）

**允许**，但**必须结构正确**。依据：`writeManifest()`（`staging-integrity.mjs`）是 manifest 的**唯一生产者**，其写入形态为

```js
{ manifest_version: 1, lifecycle_class: PATH_CLASS.STAGING, note: '…', assets: entries }
```

即正式 schema 的必需键是 **`assets`**（数组）。因此：

```json
{ "assets": [] }   → 可以 PASS（合法空）
{ "entries": [] }  → 必须 FAIL（错误字段名）
```

**不得**把「结构错误的空」与「结构正确的空」等同 —— 这正是原缺陷的实质。

### 13.5 §11 targeted tests（8 组，全部通过）

| 测试名 | 断言 | 结果 |
|---|---|---|
| `FIX-04 VALID-1: a correctly shaped empty manifest passes` | `{assets:[]}` → exit 0 | ✅ |
| `FIX-04 VALID-2: a well-formed manifest with one real asset passes` | 真实条目 → exit 0、`ASSET_COUNT = 1` | ✅ |
| `FIX-04 INVALID-1: a manifest using "entries" instead of "assets" fails closed` | → exit 1 + schema 码 | ✅ |
| `FIX-04 INVALID-2: a manifest missing "assets" fails closed` | → exit 1 + schema 码 | ✅ |
| `FIX-04 INVALID-3/4: a non-array "assets" fails closed` | `{}`/`null`/`"x"` → exit 1 | ✅ |
| `FIX-04 INVALID-ROOT: a non-object manifest root fails closed` | 数组/字符串/数字/非法 JSON → exit 1 | ✅ |
| `FIX-04 INVALID-5: a malformed asset entry fails closed` | 6 种坏条目 → exit 1 | ✅ |
| `FIX-04 INCIDENT-E: a valid manifest referencing a missing asset still reports STAGING_ASSET_MISSING` | 合法 schema + 缺失文件 → `STAGING_ASSET_MISSING`（**且不含** schema 码） | ✅ |
| `FIX-04: validateManifestSchema rejects the malformed shapes…` | 单元级镜像（10 断言） | ✅ |

**可失败性**：若把校验退回「静默降级为空 asset 集」，INVALID-1/2/3/4/ROOT/5 与单元镜像**全部变红**（它们断言 exit 1 与 schema 码，而降级后为 exit 0 + 无码）；INCIDENT-E 用例另断言 `schemaOk === true`，可把「schema 校验误伤合法 manifest」也照出来。

### 13.6 实现要点

- 新增 `validateManifestSchema(manifest)`：返回 `{ok, problems}`，**不抛异常、不降级**，由调用方决定退出码。
- 新增 `readManifestChecked()`：区分「manifest 不存在」与「存在但不可解析」，二者不再混为一谈。
- `checkStagingIntegrity()` 在 schema 非法时**提前返回单一 schema finding**（`schemaOk: false`）。
- `stagingPresenceSummary()` 改用 checked reader。
- **合法路径语义不变**：`writeManifest` / `readManifest` 行为、`assets` 字段、`relative_path`/`status`/`byte_size`/`sha256` 字段语义、`STAGING_ASSET_MODIFIED` 检测**均未改动**。

### 13.7 边界与冻结

- **与 FIX-03 的边界（§30）**：未回改 FIX-03 的隔离逻辑；仅新增 manifest schema 校验。
- **DEFERRED 未触碰（§27）**：`KB002-DERIVE-STATUS-BOUNDS`（`deriveDatasetStatus` 未拒绝 `count > target` 与非整数 count）**本轮未修**。
- **生产冻结（§13）**：全程 production = **0**、staging = **[]**、无 `manifest.json` 残留；所有测试数据均在 test temp workspace（复用 FIX-03 设施）。

### 13.8 未验证项

- symlink / junction 绕过、并发竞态、磁盘写满、超大输入、跨平台原子性
- `L2` 外部来源真实性（`web_search` 无 API key）
- **`readManifest()` 仍保留宽松语义**（解析失败返回 `null`）：它是既有导出，为不改动既有调用者而保持原样；**完整性路径已全部改走 `readManifestChecked()`**。若未来有其它调用者依赖 `readManifest()` 判定「有无 manifest」，需注意该宽松性。
- 本次**未**改动 `deriveDatasetStatus`（见 §13.7 DEFERRED）。

### 13.9 QA-ALIGN-02 复核更正（append-only，t31 attempt 4）

本节记录 qa-gpt 对当前 ALIGN-02 实现与最终 ALIGN-03 快照的独立复核。它**不改写**前文历史报告或任何原任务状态。

**权威定义已重读**：`docs/kb-002/12-contract-admission-semantics.md` §5 表（L162–166）定义 EMPTY（count=0）、PARTIAL（0<count<target）、COMPLETE（count=target）；§5.1 L183–184 明确 PARTIAL 是 promotion 进度，0 道合格为 EMPTY。

**独立三态复算**：`deriveDatasetStatus(0/5/10, 10)` 分别返回 EMPTY / PARTIAL / COMPLETE，shortfall 为 10/5/0。生产仓库仍为空；用 `createWorkspace()` 建隔离测试根并写入 `productionLikeFixture()` 仅演示 CLI 的 promotion 进度状态：2 条计数时 CLI 输出 PARTIAL、10 条计数时输出 COMPLETE。这个 synthetic namespace 仅是 validator 的机械回归夹具，不是历史证据或真实 Golden candidate；两条 CLI 均因夹具 ID 重复等结构错误返回非零，但输出的状态标签和 qualified count 正确。隔离工作区在 `finally` 清理后不存在。直接 helper 测试覆盖正常映射；此处不把有结构错误的 CLI 演示表述为 validation PASS。

**空集对比**：本轮 `--dataset` exit=0，`QUALIFIED_GOLDEN_COUNT=0`、`SHORTFALL=10`、`KNOWN_DATA_GAP=10`、`STATUS=EMPTY_GOLDEN_SET`。与历史修复前后对照表一致：计数不变，仅状态标签从 PARTIAL 更正为 EMPTY。

**回归（Node test runner）**：golden-validator 76/76；t24-admission/integrity 21/21；KB-001 121/121；schema、graph、literature validators 均 exit 0。default 与 `--dataset` 的连续两次输出分别逐字节一致。17/17 invalid fixture 均 exit 1 且包含映射的本意错误码。

**Q3 与数据保护**：结构夹具单文件校验 exit=1，完整 JSON `code` 字段包含 `KB002_DISH_BELOW_E3`，不含 `KB002_METADATA_INCOMPLETE`。18 个 fixture 文件仍带标记；SOURCE_GRADE S/A=0；publication_year 非 null=0；publisher 仍为唯一 synthetic 值；contract_version 为 `kb-002.1.2` ×17 + inv_12 刻意缺失 ×1。生产文件=0、staging=0、manifest 不存在；HEAD `6a25f4f`，用户 staged 路径数 300。

**范围说明**：上述验证未修改工具、测试或数据；tmp 探针已清理。本轮只在文档追加此更正说明。
