# KB-001D QA 独立验证报告

- 任务：t4 / KB-001D
- 执行者：qa（独立于 KB-001B / KB-001C 的实现者）
- 验证对象：`data/kb/schema/kb-schema.v2.json`、`scripts/kb/validate-kb-schema.mjs`、`scripts/kb/adapt-v1-to-v2.mjs`
- 环境：Node `v24.15.0`、Python `3.11.9`、分支 `feat/trae-offline-museum`
- 结论：**全部验收标准通过**；未发现实现缺陷；**本轮引入的回归 = 0**

> **独立性声明**：本报告中的测试套件由 QA 独立编写，**未阅读** KB-001B 的
> `scripts/kb/__tests__/validate-kb-schema.test.mjs`。所有夹具由 QA 从零构造到
> **操作系统临时目录**（`os.tmpdir()`），不写入仓库，因此不可能扰动
> KB-001B/KB-001C 的产物或 V1 数据。QA **未修改任何生产实现**（见第 6 节哈希证据）。
>
> **工具陷阱**：本仓库中文文档用 `pwsh Get-Content` 读取会以 ANSI 误读 UTF-8 而**误报行数**
> （同一契约文件：`Get-Content` 报 876 行 / `-Encoding utf8` 报 1082 行 / `node` 报 **1083** 行）。
> 本报告所有文本统计均用 `node` 读取。

---

## 1. 交付物

| 文件 | 说明 |
|---|---|
| `scripts/kb/__tests__/independent-qa.test.mjs` | QA 独立测试套件，**43 个用例**，仅使用 Node 内置模块 |
| `docs/kb-001/03-qa-verification.md` | 本报告 |

写入范围严格限定于上述两个文件（契约 §16 L1009）。

---

## 2. 测试套件执行结果

### 2.1 主命令

```
node --test scripts/kb/__tests__/independent-qa.test.mjs
```

| 指标 | 值 |
|---|---|
| 退出码 | **0** |
| tests | **43** |
| pass | **43** |
| fail | **0** |

### 2.2 合并执行（契约 t2 的 verify 命令）

```
node --test "scripts/kb/__tests__/*.test.mjs"
```

| 指标 | 值 |
|---|---|
| 退出码 | **0** |
| tests | **88**（KB-001B 的 45 + QA 的 43） |
| pass | **88** |
| fail | **0** |

> 说明：该 glob 现同时匹配 KB-001B 的 `validate-kb-schema.test.mjs` 与 QA 的
> `independent-qa.test.mjs`，两文件互不修改，合并执行全绿。

### 2.3 43 个用例清单（按功能分组）

**A. 合法数据通过（3）**
1. 合法最小文档退出码 0
2. `resolved` + `passage_in_edition` 正向路径被接受（退出 0）
3. 完整追踪链 `SourceWork←SourceEdition←SourcePassage←HistoricalClaim` 通过

**B. 必需负例类别（6）**
4. 缺必填字段 → `E_MISSING_FIELD`
5. 重复 ID → `E_DUPLICATE_ID`
6. 悬空引用 → `E_DANGLING_REFERENCE`
7. 非法关系端点类型 → `E_RELATION_ENDPOINT_TYPE`
8. 未知关系类型 → `E_UNKNOWN_RELATION_TYPE`
9. 无效实体类型 → `E_UNKNOWN_ENTITY_TYPE`

**C. 追踪链断裂（3）**
10. 断开 `Edition→Work` 被拒
11. `resolved` Passage 缺 `passage_in_edition` 被拒（`E_TRACE_MISSING`）
12. `passage_in_edition` 指向不存在的 Edition 被拒

**D. 禁止消歧（3）**
13. `passage_in_edition` 挂在 `ambiguous` Passage 上被拒
14. `passage_in_edition` 挂在 `unresolved` Passage 上被拒
15. 诚实标注 `ambiguous`（`edition_id=null`、0 条关系）被接受
16. `ambiguous` 却保留具体 `edition_id` 被拒

**E. insufficient 不得静默升级为 verified（5）**
17. `review_status="verified"` 被拒（`E_ENUM_INVALID`）
18. schema 的 `review_status` 枚举不含 `verified`（且恰为 5 值）
19. 显式 `insufficient` 记录通过结构校验且状态保持 `insufficient`
20. `insufficient` 缺 `uncertainty_notes` 被拒（契约 C2）
21. 无有效支持链的 `sufficient` Claim 被拒（`E_CLAIM_NO_EVIDENCE`）

**F. 枚举与时间区间（4）**
22. 越界枚举值 → `E_ENUM_INVALID`
23. `start_year > end_year` → `E_TIME_RANGE_INVALID`
24. 年份越界 → `E_TIME_RANGE_INVALID`
25. 字段类型错误 → `E_FIELD_TYPE`

**G. 五要素与退出码（5）**
26. 每条错误记录五字段（file/entityOrRelationId/fieldPath/code/message）齐全非空
27. 不存在的路径 → 退出码 2
28. 空目录不静默通过
29. 无参数默认运行校验内置合法集 → 退出 0
30. 校验器不修改任何输入文件（含仓库内夹具）

**H. 适配器（5）**
31. `--dry-run` 退出 0 且不写入任何文件
32. 非法 CLI 用法（`--out` 缺值）→ 退出码 2
33. 确定性 + 幂等 + V1 输入不变
34. 适配输出含 0 条 `passage_in_edition`，全部 Claim 为 `insufficient`
35. 适配器保留 V1 ID 且不为无出处节点编造 provenance

**I. 适配报告（1）**
36. 报告记录 unmapped/missing/conflict 等发现

**J. 旧数据与 Schema（7）**
37. 适配输出通过校验器（退出 0）
38. V1 图谱数据仍可解析且形状不变（40 菜 / 49 关系 / schema v1.0.0）
39. 无 V2 产物泄漏进 `data/knowledge_graph`
40. Schema 覆盖 17 个契约实体
41. 每条关系的 source/target 端点类型合法
42. 两条追踪链关系存在且端点正确
43. `content_class` 四值区分事实/推断/现代适配/用户实验

---

## 3. 负例证据（实际错误输出）

### 3.1 7 个 KB-001B 负例夹具，逐个独立执行

| 夹具 | 退出码 | 报出的错误码 |
|---|---|---|
| `bad-entity-and-relation-type.kb.json` | **1** | `E_UNKNOWN_ENTITY_TYPE`, `E_UNKNOWN_RELATION_TYPE` |
| `bad-fields-and-refs.kb.json` | **1** | `E_DANGLING_REFERENCE`, `E_DUPLICATE_ID`, `E_ENUM_INVALID`, `E_FIELD_TYPE`, `E_MISSING_FIELD`, `E_RELATION_ENDPOINT_TYPE`, `E_RELATION_SHAPE`, `E_TIME_RANGE_INVALID` |
| `bad-no-fabrication.kb.json` | **1** | `E_EVIDENCE_UNKNOWN_CONFLICT`, `E_HERITAGE_UNSOURCED`, `E_MEASUREMENT_FABRICATED`, `E_MEASUREMENT_INCOMPLETE`, `E_PROVENANCE_MISSING`, `E_REVIEW_STATUS_UNSUPPORTED`, `E_REVIEW_UNVERIFIABLE` |
| `bad-passage-in-edition-ambiguous.kb.json` | **1** | `E_TRACE_MISSING` |
| `bad-passage-in-edition-unresolved.kb.json` | **1** | `E_TRACE_MISSING` |
| `bad-review-status-verified.kb.json` | **1** | `E_ENUM_INVALID` |
| `bad-trace-chain.kb.json` | **1** | `E_CLAIM_NO_EVIDENCE`, `E_EVIDENCE_REVIEW_CONFLICT`, `E_EVIDENCE_UNKNOWN_CONFLICT`, `E_PROVENANCE_UNRESOLVED_CONFLICT`, `E_REVIEW_STATUS_UNSUPPORTED`, `E_TRACE_MISSING`, `E_UNKNOWN_UNDECLARED` |

### 3.2 五要素样例（逐字）

追踪链缺失：

```json
{"file":"data/kb/examples/invalid/bad-trace-chain.kb.json","entityOrRelationId":"edition_neg_1","fieldPath":"work_id","code":"E_TRACE_MISSING","message":"each SourceEdition requires exactly 1 edition_of_work relation, found 0"}
```

重复 ID（注意 `file` 是真实路径，**不是** `-`）：

```json
{"file":"data/kb/examples/invalid/bad-fields-and-refs.kb.json","entityOrRelationId":"dish_neg_2","fieldPath":"id","code":"E_DUPLICATE_ID","message":"id \"dish_neg_2\" is already defined in data/kb/examples/invalid/bad-fields-and-refs.kb.json; ids must be unique across the validated document set"}
```

> 该 `E_DUPLICATE_ID` 的 `file` 字段曾为 `'-'`，违反「每条错误输出包含文件位置」。
> 实现方已自行修复；本报告独立确认修复后输出真实仓库相对路径。

### 3.3 QA 自建负例的错误码（节选）

| QA 注入的缺陷 | 退出码 | 错误码 |
|---|---|---|
| 删除 `edition_of_work` | 1 | `E_TRACE_MISSING` / `E_CLAIM_NO_EVIDENCE` |
| 关系指向 `ing_does_not_exist_999` | 1 | `E_DANGLING_REFERENCE` |
| 关系类型改 `qa_not_a_real_relation` | 1 | `E_UNKNOWN_RELATION_TYPE` |
| 端点改成 Technique | 1 | `E_RELATION_ENDPOINT_TYPE` |
| 实体类型改 `QaNotARealEntity` | 1 | `E_UNKNOWN_ENTITY_TYPE` |
| `dish_kind` 越界 | 1 | `E_ENUM_INVALID` |
| `start_year=1500 > end_year=1200` | 1 | `E_TIME_RANGE_INVALID` |
| `review_status="verified"` | 1 | `E_ENUM_INVALID` |
| `insufficient` 无 `uncertainty_notes` | 1 | `E_CLAIM_UNCERTAINTY_MISSING` |
| `ambiguous` 却保留 `edition_id` | 1 | `E_TRACE_MISSING` |

---

## 4. 关键验收判定

### 4.1 「无 resolved Passage」是正确行为，**不是缺陷**（重要）

契约与 Captain 均明确：本轮 V1 的 SourcePassage **全部**为 `ambiguous` / `unresolved`，**无 `resolved`**。
因此适配输出：

- **不含任何** `passage_in_edition` 关系（`= 0`）
- 所有 `HistoricalClaim` 均为 `evidence_status="insufficient"`

**QA 判定：这是正确反映 V1 真实证据水平，不是缺陷。** QA **未**要求实现方放宽追踪链约束来「补齐」。

QA 独立复核的实测分布：

| 指标 | 实测值 |
|---|---|
| entities | 282 |
| relations | 214 |
| SourcePassage | 19 |
| └ `ambiguous` / `unresolved` / `resolved` | 16 / 3 / **0** |
| `passage_in_edition` 关系数 | **0** |
| 非 resolved Passage 的 `edition_id` | **全部为 null** |
| HistoricalClaim | 34，**全部** `insufficient` |
| `review_status="verified"` 出现次数 | **0** |
| 重复实体 ID | **0** |
| 重复关系三元组 | **0** |

`passage_in_edition` 的**正向（退出码 0）路径**由 `data/kb/examples/valid/fixture-all-entities.kb.json`
覆盖（内含 1 条 `edition_resolution="resolved"` + 配套 `passage_in_edition`），QA 已独立确认该夹具退出 0。

### 4.2 来源不足不会被静默标记为 verified

三重独立证据：

1. **结构上不可能**：`data/kb/schema/kb-schema.v2.json` 的 `review_status` 枚举恰为 5 值
   `unreviewed / internal_reviewed / pending_external_expert / external_reviewed / rejected`，**不含 `verified`**。
2. **拒绝被实测**：QA 构造 `review_status="verified"` → 退出 1，`E_ENUM_INVALID`，消息列出 5 个合法取值。
3. **适配输出无升级**：适配输出中 `review_status` 全部为 `unreviewed`，字面量 `"verified"` 出现 **0** 次。

此外契约 C2 要求 `insufficient` 的 Claim 必须显式声明 `uncertainty_notes`，
QA 实测缺该字段会被拒（`E_CLAIM_UNCERTAINTY_MISSING`）——即「不确定」必须**主动声明**，不能靠默认值蒙混。

### 4.3 不伪造来源

QA 独立核实：

- V1 的 5 个无出处古籍节点（`text_001`–`text_005`）在适配输出中映射为 `work_text_001`–`work_text_005`，
  `provenance.derivation = "unresolved"`，且**无** `source_locator`（未补造来源）。
- `id_mapping` 389 条，V1 ID 可追溯。
- SourceWork = **10**（5 内容著作 + 3 丛刊 + 2 未解析书名），其中 2 条未解析书名 `author = null`、
  `attribution_status = "unknown"`（未编造作者）。
- 106 条 SourceEdition 的 `edition_of_work` **全部**指向 `work_type = "collected_series"`，
  指向内容著作的 = **0** —— 即 `lit_ccs_006`（随园食单）/ `lit_ccs_014`（山家清供）/ `lit_ccs_027`（饮膳正要）
  未被按 title 相等当作内容著作版本建链。
- 适配器不生成 `publication_year`、`locator` 等编造值。

### 4.4 确定性与幂等

| 验证 | 结果 |
|---|---|
| 两次运行输出逐字节一致 | ✅ `kb-v2.kb.json` 与 `adaptation-report.json` SHA-256 均相同 |
| 同目录重复运行 | ✅ 实体数、关系数**不增长**，输出字节不变 |
| 重复实体 ID | ✅ 0 |
| 重复关系三元组 | ✅ 0 |
| `--dry-run` | ✅ 退出 0，目标目录**零写入** |

### 4.5 只读保证

| 对象 | 结果 |
|---|---|
| 14 个 V1 输入文件（运行适配器前后） | ✅ SHA-256 **全部不变** |
| 校验器对输入文件 | ✅ 不变（含仓库内 3 个夹具） |

---

## 5. 回归对照（与 `00-fact-audit.md` 第 4 节基线逐项比对）

| 套件 | 命令 | 实测退出码 | 实测结果 | 基线 | 判定 |
|---|---|---|---|---|---|
| 后端 Jest | `cd backend && npm test -- --runInBand` | **0** | 43 套件 / 213 用例全通过 | 43 / 213 | ✅ 一致 |
| 前端测试 | `cd frontend && npm test` | **0** | 153 通过 / 0 失败 | 153 / 0 | ✅ 一致 |
| 前端 lint | `cd frontend && npm run lint` | **0** | 无输出 | 退出 0 | ✅ 一致 |
| Python unittest | `python -m unittest discover -s service -p 'test*.py'` | **0** | Ran 9 tests, OK | 9 通过 | ✅ 一致 |
| 图谱门禁 | `node scripts/verify_graph_schema.mjs` | **0** | ok true, 193 节点 / 49 关系 | 同 | ✅ 一致 |
| 文献门禁 | `node scripts/verify_literature_dataset.mjs` | **0** | 106 / 103 | 同 | ✅ 一致 |
| 脚本层测试 | `node --test "scripts/__tests__/*.test.mjs"` | **1** | 34 tests / 27 pass / **7 fail** | 27 / 7 | ✅ 一致（**基线已存在**） |
| KB 校验器 | `node scripts/kb/validate-kb-schema.mjs` | **0** | 3 file(s), 23 entities, 26 relations | 新增 | ✅ |
| KB 校验器单测 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | 88 pass / 0 fail | 新增 | ✅ |

### 5.1 失败归因（明确区分）

**本轮引入的失败 = 0。**

**基线已存在的失败 = 7**，全部位于 `scripts/__tests__/*.test.mjs`，与 KB-001 无关：

| 文件 | 失败数 | 失败用例 |
|---|---|---|
| `verify_all_python_contract.test.mjs` | 4 | `verify-all delegates Python checks to one executable quality gate`；`Python discovery honors explicit configuration then probes portable candidates in order`；`the resolved Python runs unittest, data validation, and a real PythonBridge smoke`；`deployment source checks validate discovery and smoke wiring, not only the unittest word` |
| `verify_offline_bundle.test.mjs` | 2 | `requires key offline labels in built html`；`accepts html without any fetch() calls` |
| `verify_offline_ui.test.mjs` | 1 | 文件级失败 |

根因（事实审计 §4.2 已记录）：测试要求存在 `scripts/python-quality-gate.ps1` 与
`scripts/python_bridge_smoke.cjs`，这两个文件在仓库中**不存在**；且测试断言 `verify-all.ps1`
**不应**包含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含该命令。

**QA 未修复、未掩盖、未删除这些负例**（范围外）。数量与基线完全一致：27 pass / 7 fail。

---

## 6. 范围合规证明

### 6.1 QA 未修改任何生产实现（SHA-256 前后比对）

QA 任务开始时先记录实现文件哈希，任务结束时复算，**8 个文件全部 SAME**：

| 文件 | 前缀（前后一致） |
|---|---|
| `scripts/kb/validate-kb-schema.mjs` | `2829A86A27A96F24` |
| `scripts/kb/adapt-v1-to-v2.mjs` | `56547C7C7D5A054B` |
| `scripts/kb/lib/errors.mjs` | `26489FC481603615` |
| `scripts/kb/lib/schema.mjs` | `7D4BD3280F0741F8` |
| `scripts/kb/lib/validate.mjs` | `34C9DBBC2C3D88E1` |
| `scripts/kb/lib/adapt/mapping.mjs` | `68FA2DEF687F6CA6` |
| `scripts/kb/__tests__/validate-kb-schema.test.mjs`（KB-001B 交付物） | `FADC9E32A6377152` |
| `data/kb/schema/kb-schema.v2.json` | `4D6C2777168950E1` |

### 6.2 未删除负例、未降低门槛、未修改预期

- `data/kb/examples/invalid/` 仍为 **7** 个负例（与契约 L97 记载一致），未被删除或改写。
- `data/kb/examples/valid/` 仍为 **3** 个（与契约 L96 一致）。
- QA 的 43 个用例全部为**新增**断言；本轮 QA 自测中曾出现 5 个失败，经诊断**全部是 QA 自身夹具的缺陷**
  （未满足契约 C2 `uncertainty_notes`、`edition_candidates` 必须指向真实实体、schema 端点为数组、
  dry-run 文案在 stdout、V1 古籍节点映射为 `work_text_00N` 而非保留 `text_00N`），
  QA 修正的是**自己的夹具**，**未**修改任何生产实现，也**未**放宽断言。

### 6.3 V1 数据零改动

14 个 V1 输入文件（`data/knowledge_graph/*`、`data/recipes/*`、`data/fragments/*`、`data/literature/*`）
SHA-256 **全部不变**。

### 6.4 无 V2 产物泄漏

- `data/knowledge_graph/` 下**无** `.kb.json` 文件，**无** `nodes_kb.json`
  （避免被 `scripts/verify_graph_schema.mjs:297` 的 `/^nodes_.+\.json$/` 通配自动载入）。
- `service/knowledge_graph.py` 与 `backend/src/services/LightModeService.js` 均**不含** `data/kb` 引用，
  证明 V1 读取路径未被改写。

### 6.5 敏感信息

对本报告与测试文件做密钥模式检索（`JWT_SECRET` / `AGNES_API_KEY` / `API_KEY=` / `sk-` / `password`）：

- 匹配数 **1**，且该唯一匹配是**本小节自身列举的模式名**（`03-qa-verification.md:326`），
  **非**真实密钥或凭据值。
- 排除该自指行后，**真实密钥命中数 = 0**。

QA 未读取或输出任何 `.env` 取值。

---

## 7. 未执行项（**不得当作通过**）

| 项 | 状态 | 原因 |
|---|---|---|
| `docker compose up` 端到端 | **未执行** | 范围外；本轮仅核验 `docker compose config`（由 DevOps 负责） |
| `release/` 打包 | **未执行** | 禁止打包发布物 |
| GitHub Actions 实际运行 | **未执行** | 当前分支不在 CI 触发范围，且禁止 push |
| 浏览器/视觉回归 | **未执行** | 本轮无 UI 改动 |
| 前端 `npm run build` | **未执行** | 由 Frontend（t5）单独核验；本轮 QA 只跑 `npm test` 与 `lint` |

---

## 8. 结论

| 验收标准 | 判定 |
|---|---|
| QA 测试文件独立且可执行 | ✅ `scripts/kb/__tests__/independent-qa.test.mjs`，43 用例，退出 0 |
| 合法最小数据通过（含 `resolved` + `passage_in_edition` 正向路径） | ✅ |
| 缺字段/重复 ID/悬空引用/非法端点/未知关系类型均被拒 + 五要素齐全 | ✅ 六类各≥1 负例，错误码精确区分 |
| 来源追踪链可校验 | ✅ 正向通过；断链被拒 |
| 无 resolved 是正确预期，非缺陷；校验器拒绝非 resolved 挂链 | ✅ |
| 来源不足不被静默升级为 verified | ✅ 三重证据 |
| 非法枚举与非法时间区间被拒 | ✅ |
| 校验器不修改输入 | ✅ 哈希不变 |
| 旧数据仍可读取 | ✅ Python 9 通过；V1 形状不变；读取路径未改写 |
| 适配器稳定、幂等、不改输入 | ✅ |
| 适配器对 V1 真实缺陷处理正确 | ✅ 未补造来源、未按同名建链、SourceWork=10 |
| 无本轮引入的回归 | ✅ 全部与基线一致；7 个失败为基线已存在 |
| 未修改生产实现、未删负例、未降低门槛 | ✅ 哈希与夹具计数为证 |
| 报告不含密钥 | ✅ 0 命中 |

**QA 判定：KB-001 的 Schema、校验器与适配器通过独立验证，无阻塞项。**
最终验收由 Reviewer（t9 / KB-001E）独立完成；QA 不对 KB-001 给出最终 PASS。
