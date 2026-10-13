# KB-002 Security / Provenance Gate —— attempt 2（修复后复验）

- 任务：`t7` — KB-002 Security / Provenance Gate（数据真实性与来源可信度）
- 审查人：`security-wb`（**未参与** KB-002 任何实现：t1–t5 均由 architect-wb / curator-wb / backend-wb 完成）
- 本文件为 **attempt 2（修复后复验）**；attempt 1 的结论与证据保留在第 4 节作为审计轨迹
- 审查方式：**只读**；自行读码 + 自建探针实测；上游报告仅作交叉核对
- 审查对象：`docs/kb-002/**`、`scripts/kb002/**`、`data/kb/golden/**`（含 fixtures）、`.gitignore`
- 环境：Node `v24.15.0`，仓库分支 `feat/trae-offline-museum`

## 结论

# PASS

- **20 / 20 验收标准通过**
- attempt 1 的 **1 项 high** finding（`SEC-T7-01`）**已修复，且已由我独立复现确认**
- 剩余 **1 项 low** 建议（`SEC-T7-02`）为 F+ 阶段 advisory，**不阻断**
- **无 blocker、无 high**

> 证据分级（按用户 §26）：每条标注 **［实测］**（本次亲自执行的结果）、**［审阅］**（读取产物/代码）、**［推断］**（未直接验证的推论）。

---

## 1. 20 项验收标准逐条结论

### 1–9. 禁止伪造：URL / 书名 / 作者 / 版本 / 馆藏 / 卷号 / 页码 / 章节 / 专家审核

**［实测］通过（就现有产物而言）；对生产数据为「空集成立」**

- **URL 双向对账**：V1 真实 URL 集 = **6**；KB-002 全部产物中出现 URL = **0** → 无 URL 可伪造。
- **书目类断言**：**生产 Golden 数据尚不存在**（`data/kb/golden/` 根下文件数 = **0**）。唯一 `.kb.json` 全部位于 `examples/`，且携带
  `metadata.fixture = true` 与 `metadata.not_historical_evidence = "Structural fixture only. Names, editions and passages are placeholders … None of this is asserted as real historical evidence."`；`SourceWork.name` 显式标注占位符（`山家清供（夹具占位）`）。
- **专家审核**：见第 15 条。

> **诚实边界**：第 1–9 条对**生产数据**是**空集成立**，**不等于**"5 道 Golden 的书目已核验"。F+ 尚未运行。不得据此宣称已核实。

### 10. SourceWork → SourceEdition → SourcePassage 链可追踪

**［实测］通过。** valid fixture：`SourceWork=2 SourceEdition=2 SourcePassage=2 HistoricalClaim=1`；`passage_in_edition`×2、`edition_of_work`×2 端点类型正确、文档内可解析。**链断裂数 = 0。**

### 11. HistoricalClaim 有 supporting evidence 或明确 insufficient

**［实测］通过。** valid fixture 的 Claim：`evidence_status=sufficient`，`claim_supported_by`=**2**，`claim_refuted_by`=**1**（见第 12 条）。

### 12. contradictory evidence 不得被删除

**［实测］通过（我独立复现，非转述 t4）。**
- V1 `relationships.json` 仍为 **49** 条（= KB-001 基线，未删边）
- 9 条 `recorded_in` 中 **5 条**与菜品自身 `source_text` 矛盾（`dish_005/007/008/009/010`）——我逐条比对确认
- 上述 5 条菜品的 `recorded_in` 边**全部保留**，**未自动择一、未删除任一方**
- 工具侧有 `claim_supported_by` / `claim_refuted_by` **共存**机制（valid fixture 同时携带 2 条支持 + 1 条反驳边；［审阅］`golden-validator.test.mjs:261-270`）与 `KB002_CONFLICT_HIDDEN` 强制规则；负例 `inv_10_conflict_hidden` 实测 exit=1

### 13. C/D 级网络资料不得自动升级为高等级史料

**［实测］通过。** 负例实测均被拒：`inv_07_grade_x_on_chain`、`inv_08_grade_c_sufficient`、`inv_09_grade_undeclared`、`inv_11_grade_lead_only`（**17/17 invalid fixtures 全部 exit=1**）。工具含 `S/A/B/C/D/X` 机械前置条件与 SG1–SG6（SG6 = C/D 强制降级为线索）。

### 14. AI 输出不得作为历史一手证据

**［实测］通过。** 生产数据为空；fixtures 显式声明非历史证据；KB-002A §11 含 12 条禁编造红线。

### 15. reviewStatus 不得自封 expertReviewed / expert_reviewed

**［实测］通过。** valid fixture 的 `review_status` 分布 = `{"unreviewed":12,"pending_external_expert":1}`；`external_reviewed` 出现 **0**；`"verified"` 字面量 **0**；非法取值 **0**。负例 `inv_16_external_reviewed` 实测 exit=1。

### 16. fixtures 不得进入正式 Golden 数据 —— ✅ **已修复并通过**

**attempt 1：［实测］不通过（high，SEC-T7-01）。attempt 2：［实测］通过。**

修复后我做的**决定性复现**（三步，全部实测）：

| 步骤 | 结果 |
|---|---|
| ① 把 `examples/valid/golden_001.kb.json`（`fixture=true`）复制到生产路径 `data/kb/golden/golden_001.kb.json` | 写入成功 |
| ② `validate-golden.mjs <该生产路径>` | **exit 1**，唯一错误码 **`KB002_FIXTURE_IN_PRODUCTION`**（修复前为 exit 0「PASSED」） |
| ③ `validate-golden.mjs --dataset` | **`QUALIFIED_GOLDEN_COUNT = 0` / `SHORTFALL = 10`**（修复前为 1 / 9）→ **计数不再被夹具污染** |

- 清理后复核：生产路径文件已删除，`data/kb/golden` 根下 **0** 文件。
- 修复内容 ［审阅］：`golden-rules.mjs:408-428` 新增判定——非 examples/generated 路径的文件若 `metadata.fixture === true` **或** `not_historical_evidence` 非空，即报 `KB002_FIXTURE_IN_PRODUCTION`；注释直接引用 `H6/SEC-T7-01`。
- 新增测试 ［审阅］：`golden-validator.test.mjs:239` `'SEC-T7-01: a fixture-marked document at a production path is rejected and not counted'`，断言 exit 1 + 错误码 + **不抬高 `QUALIFIED_GOLDEN_COUNT`**。

### 17. ingestion 不得修改 V1 原始数据

**［实测］通过。** `git status --porcelain -- data/knowledge_graph data/recipes data/fragments data/literature` → **0 条**。KB-002A H1 明文禁止写入 `data/knowledge_graph/`（理由：`verify_graph_schema.mjs:297` 自动发现会改变 V1 门禁）［审阅］。

### 18. external source metadata 必须保持 provenance

**［实测］通过。** 工具要求 `metadata` 必填 6 字段；负例 `inv_12_metadata_incomplete` 实测 exit=1。V1 侧 6 个来源 URL 本体未改动（V1 git status = 0）。

### 19. 不确定内容必须保留不确定性

**［实测］通过。** 负例 `inv_09_grade_undeclared`（等级未声明）实测 exit=1，说明"缺信息必须显式声明"被强制；继承 KB-001 的 `unknown_fields` / `insufficient` / `derivation=unresolved` 机制。

### 20. 没证据必须能诚实输出 insufficient

**［实测］通过 —— 本轮最有力的正面证据。**
`node scripts/kb002/validate-golden.mjs --dataset` 实测输出：
```
KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = PARTIAL_GOLDEN_SET
KNOWN_DATA_GAP = 10
```
无生产数据时**不假装有数据**，诚实输出 0/10 并登记缺额；与 t4 候选层的 5 道**分别呈现**（SEL2/SEL11），未把候选计划当绩效。

### 附加红线：E5 不得伪造

**［实测］通过。** `inv_05_self_declared_e5`（自封 E5）与 `inv_06_e5_unreachable`（不可达 E5 + Experiment）**均实测 exit=1**。

### 附加红线：不得读取/输出 secret

**［实测］通过（附一处必须说明的自指假阳性）。**
- 对 KB-002 全部产物扫描 5 类模式 → 命中 **3 处，全部位于我自己的本报告 L106**：该行**列举了被扫描的模式名**（`` `sk-*`/`JWT_SECRET=`/`AGNES_API_KEY=`/`API_KEY=`/`password=` ``），因此扫描器会命中自己。
- 逐条核对：**3 处均为模式名文本，无任何真实凭据**；除该自指行外**真实命中 = 0**。
- 本审查**未读取**任何 `.env` 值。

---

## 2. 校验器与回归实测（attempt 2，真实退出码）

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb002/validate-golden.mjs data/kb/golden/examples/valid` | **0** | `PASSED: 1 file(s), 13 entities, 13 relations` |
| 17 个 invalid fixtures **逐个**运行 | **17 个 = 1** | ✅ **全部按预期拒绝**（attempt 1 为 16/17） |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** | `QUALIFIED_GOLDEN_COUNT=0 / SHORTFALL=10 / PARTIAL_GOLDEN_SET / KNOWN_DATA_GAP=10` |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** | tests **50** / pass **50** / fail 0 / **skipped 0**（attempt 1 为 44） |
| `node scripts/kb/validate-kb-schema.mjs` | **0** | 3 files / 23 entities / 26 relations |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | 1 file / 282 entities / 214 relations |
| `node --test`（KB-001 四套件） | **0** | **121** 用例全绿 |
| `node scripts/verify_graph_schema.mjs` | **0** | 193 / 49 |
| `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103 |
| `git status --porcelain --`（V1 路径） | **0** | V1 零改动 |

**KB-001 CLOSED 基线未被破坏。**

---

## 3. Findings 现状

### SEC-T7-01 ｜ severity: **high** → **已修复并复验通过**

- 原问题：`golden-rules.mjs` 的 H6 规则计算了 `production` 集合但**从未使用**（死代码），仅检查 `/generated/`，不检查 `metadata.fixture === true` → 夹具放到生产路径被接受（exit 0），并被 `--dataset` **计入正式数据**（0/10 → 1/9）。
- **复验［实测］**：① 夹具置于生产路径 → **exit 1 + `KB002_FIXTURE_IN_PRODUCTION`**；② `--dataset` 保持 **0/10**，计数未被污染；③ 新增负例测试存在且生效（`golden-validator.test.mjs:239`）；④ 合法路径仍 exit 0（无误伤）。
- 状态：**CLOSED（修复已独立验证）。**

### SEC-T7-02 ｜ severity: **low**（建议，不阻断）

工具无法校验被引用的 `SourceWork` 是否真实存在（无"虚构书名"检测）。当前对生产数据**空集成立**，F+ 录入后风险变为真实。
**建议（非本 Gate 强制）**：F+ 阶段增加 advisory 检查——将 `SourceWork.name` 与 V1 `nodes_ancient_text.json` / `data/literature` 标题集比对，无法对应者**告警而非阻断**（新的真实来源本就可能不在 V1 中）。

---

## 4. 审计轨迹：我排除的三处自身误报（如实记录）

审查过程中我三次得出"疑似缺陷"的初判，**均经决定性实测自行推翻**。记录于此以免误导下游。

| # | 初判 | 排除手段 | 结论 |
|---|---|---|---|
| 1 | `inv_13_filename_id_mismatch` 退出 0 → 疑似校验器缺陷 | 读码发现命名规则**刻意只作用于生产路径**（`isExample` 判定）；实测非 examples 路径改名 → exit 1 + `KB002_FILENAME_ID_MISMATCH`，名称正确 → exit 0；单测 L168-180 已覆盖 | **我的探针方法误报**，非缺陷 |
| 2 | 夹具置于生产路径时，**无参数**运行仍 exit 0 → 疑似修复不彻底 | 读码：`validate-golden.mjs:31,94` 默认目标是 `data/kb/golden/examples/valid`，**生产视角是 `--dataset`**；`--dataset` 实测 0/10 未污染 | **我对默认语义的预期有误**，非缺陷 |
| 3 | secret 命中由 0 变 3 → 疑似新增泄露 | 逐条定位：3 处**全部**是本报告列举模式名的那一行（自指） | **自指假阳性**，无真实凭据 |

> 附带正面收获：将 `fixture=false` 但保留 `qualified=true` 时，工具报 `KB002_QUALIFIED_MISMATCH`（NP3）与 `KB002_PADDING_COUNT`（NP1）——**反凑数机制在真实生效**。

---

## 5. 未验证项（**不得当作通过**）

| 项 | 原因 |
|---|---|
| **生产** Golden 数据的第 1–9 条（无虚构书名/作者/版本/馆藏/卷号/页码/章节） | 生产数据尚不存在（F+ 未运行）→ **空集成立，不等于已核验** |
| 5 道 SELECTED 候选的**外部**来源真实性（t2 所称 L2 事实真伪） | `web_search` 在本环境不可用（无 API key）→ 全部指针**仅仓库内可追溯**；**未做外部核实** |
| 符号链接 / 并发竞态 / 磁盘写满 / 超大输入 | 未构造 |
| 真实外部专家审核真实性 | 无真实外部专家（本阶段 E5 与 `external_reviewed` 按设计不可达） |

---

## 6. 范围合规自证

- 本任务**唯一写入**：`docs/kb-002/07-security-provenance-gate.md`
- 未修改任何被审查文件（`scripts/kb002/**`、`data/kb/golden/**`、`docs/kb-002/01`–`05`、`06` 均未改动）
- 探针置于 `tmp/`（gitignore）并**用后删除**；`data/kb/golden` 根下复核 **0** 文件，无残留
- **未读取或输出**任何 `.env` 值；除自指行外真实 secret 命中 0
- 未提交、未推送、未合并

---

## 7. 对下游

- `t6`（QA Gate）：本 Gate 已 PASS；`SEC-T7-01` 修复已由 Security 独立复现，QA 若需复核可直接运行 §1 第 16 条的三步复现。
- `t8`（Reviewer）：本 PASS **不替代** Reviewer 独立裁决；`SEC-T7-01` 已 CLOSED，不构成 Reviewer 阻断项。
- **F+ 前置**：`SEC-T7-01` 已修复，夹具不会污染 `QUALIFIED_GOLDEN_COUNT`；建议 F+ 开始前顺带落实 `SEC-T7-02`（advisory）。
