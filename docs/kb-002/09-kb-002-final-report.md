# KB-002 最终报告（Captain Release Gate）

- 判定人：Captain
- 范围：**KB-002 第一阶段** = A(契约) → B(证据质量) → C(遴选) → D(候选清单) → E(工具链) → QA/Security/Reviewer 门禁
- 团队：`flavor-archaeology-kb002`（6 名，全部 `workbuddy-ai / deepseek-v4.1-flash`）
- 契约版本：`kb-002.1.1`（KB-002A `kb-002.1.0`；KB-002B 因 §3.2 缺陷修复升至 `kb-002.1.1`）

---

## ① KB-002_FINAL_STATUS

# `KB-002_PHASE1 = CLOSED`

**但必须同时记录两项不可省略的限定：**

| 项 | 状态 |
|---|---|
| **GOLDEN_DATASET_STATUS** | **`CONTRACT_AND_TOOLING_READY / DATA_PENDING_F+`** —— `data/kb/golden` 根下 **0 个证据文件** |
| **「Golden 10」是否达成** | **否** —— 遴选层合格候选 **5** 道；证据层 `qualified` 须待 F+ 录入后由 KB-002B Q1–Q8 计算（SEL2/SEL11 已明确区分遴选与资格） |
| 蟹酿橙逐条 Claim 验证 | **规则与工具就位**，**本轮未执行**（属 F+） |

> 依据 t8 Reviewer 的独立限定：本阶段**未创建任何 Golden 证据数据**；t4 的 `QUALIFIED_GOLDEN_COUNT=5` 是**遴选层计划计数**，不是证据层已核验计数。

**判定是否 CLOSED 的依据**：你 §33 允许 `PARTIAL_GOLDEN_SET`；是否允许 CLOSED 由 **Reviewer + Captain 依正式 Contract** 判定。Reviewer 已明示「就 Reviewer 项而言本 PASS 满足关闭条件」，Captain 据此确认第一阶段（A–E + 三门禁）关闭；**数据集本体未关闭**，F+ 需另一次授权。

---

## ② CONTRACT_RESULT（t1）✅

`docs/kb-002/01-golden-dataset-contract.md`（518 行 / 31,752 B），`kb-002.1.0` 冻结：
17 实体闭环 · 24 关系（含端点）· `GOLDEN-<NNN>` 与 `蟹酿橙=GOLDEN-001` · 落位 `data/kb/golden/` · **H1 严禁写 `data/knowledge_graph/`**（理由 `verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` 自动发现）· provenance/unknown/insufficient · E0–E5 + S/A/B/C/D/X。

**Captain 复核**：`data/kb-002/` 实测**不存在**（t5 inScope 修订被遵守）；路径统一为 `data/kb/golden/`。

## ③ EVIDENCE_RUBRIC_RESULT（t2 → kb-002.1.1）✅

`docs/kb-002/02-evidence-quality-rubric.md`（396 行 / 36,323 B）。**两层证据模型**：L1 结构合规（脚本可判定）/ L2 事实真伪（脚本不可判定）→ **L1 通过 ≠ 历史为真**。

**契约缺陷修复（t9）**：冻结版 §3.2 对 **3 类可达输入无结论**。经 **1024 组合枚举**确认；采方案 **(b)**（修订 E2 为兜底 R5），否决 (a) 的决定性理由是：**(a) 会使两个 B 级来源达 N≥2 → 落 E4 → 而 E4 允许 `sufficient`** = 实质降门槛。修复后 1024 组合实测**原有结论全部不变**，仅 3 类新增结论且**全落 E2（禁 sufficient）** → 纯收紧。新增 `D(claim)=resolved∧direct∧grade∈{S,A}` 使 **C/D 结构上无法抬级**。

## ④ SELECTION_RUBRIC_RESULT（t3）✅

`docs/kb-002/03-golden-dish-selection-rubric.md`（350 行 / 22,900 B）。**遴选 ≠ 资格**（SEL0–SEL2），`KB002_SEL_*` 17 码，主观维度权重 8.33% ≤ 15% 且**不设门**。

## ⑤ GOLDEN_CANDIDATES（t4）✅ 诚实结果

| 项 | 值 |
|---|---|
| **QUALIFIED_GOLDEN_COUNT** | **5** |
| **SHORTFALL** | **5** |
| Rejected / Eliminated | 3（书名类 G4 失败）+ 30（线索类 G1 失败） |
| WAITLIST | 3（莲房鱼包 58 · 荷包鱼 54 · 荔枝腰子 53） |
| GOLDEN-001 | **蟹酿橙**（且 `SEED_GATE_FAILURE` 明确「固定编号 ≠ 自动合格」） |

**SELECTED 5**：GOLDEN-001 蟹酿橙(67) · GOLDEN-002 王太守八宝豆腐(69) · GOLDEN-003 玉糁羹(64) · GOLDEN-004 炙羊肉(63) · GOLDEN-005 槐叶冷淘(59)

**未凑数核验（t8 + Captain 各自独立）**：V1 书名类仅 **10** 条、线索类 30 条在 G1 淘汰 → **合格上限就是 10**，故 5 道属诚实筛选而非偷懒。

**🔴 关键发现（t4，Captain 已复算）**：**9 条 `recorded_in` 中 5 条与菜品自身 `source_text` 矛盾**（dish_005/007/008/009/010）。Captain 逐条复算确认，且 `relationships.json` 仍为 **49** 条（KB-001 基线）、5 条边**全部保留** → **冲突未被抹除**。这是「看似 10 道、实入 5 道」的直接原因。

## ⑥ TOOLING_RESULT（t5 + t10）✅

`scripts/kb002/{validate-golden.mjs, lib/rubric.mjs, lib/golden-rules.mjs, __tests__/golden-validator.test.mjs}`。
**复用 KB-001** `scripts/kb/lib/{schema,validate,errors}.mjs`（未修改、未重写）—— QA 与 Security 双方独立确认。

| 指标 | 值 |
|---|---|
| 测试 | **50 / 50 pass**，skipped 0 / todo 0（原 44 保留 + 新增 6） |
| 退出码 | 合法 0 · 结构错误 1 · 运行错误 2 |
| 负例 | **17 / 17 全部 exit 1**，且各自发出**本意错误码** |
| determinism | `--dataset` 与 default **两模式逐字节相同** |
| 只读性 | 校验前后输入 SHA-256 不变 |

## ⑦ QA_RESULT（t6）✅ PASS 18/18（经一轮 REQUEST_CHANGES 后复验）

- 首轮失败项：**F-01** `inv_13` 负例结构上无法失败（根因 `isExample` 整体豁免）+ **次生缺陷**（测试 `:202` 未断言每个负例真的 exit 1）
- 修复后：inv_13 **exit 1 + `KB002_FILENAME_ID_MISMATCH`**；新增遍历 `examples/invalid/` 的断言；测试 44→50
- **criterion 16 正反双向验证**：反向（fixture 放生产路径 → 被拒）/ 正向（去除标记+生产命名 → exit 0 无误报）

## ⑧ SECURITY_PROVENANCE_RESULT（t7）✅ PASS 20/20（经一轮 REQUEST_CHANGES 后复验）

- 首轮 **high**：**SEC-T7-01** H6 夹具隔离未强制 → fixture 可污染 `QUALIFIED_GOLDEN_COUNT`（Captain 完整复现 0→1 / 10→9）
- 修复后（Captain + Security + Reviewer 三方独立复现）：fixture 放生产路径 → **exit 1 + `KB002_FIXTURE_IN_PRODUCTION`**，指标保持 **0 / 10**
- **零伪造 URL**（V1 6 个 → KB-002 中 0 个；V1 不存在者 0）· 无伪造 E5/expert-reviewed · 5 条矛盾关系保留未择一 · secret 命中 0

## ⑨ REVIEWER_RESULT（t8）✅ PASS

七维度（Contract/Rubric/Candidate/Tooling/QA/Security/Scope）全通过；6 条契约 verify 命令亲自执行全 0。
**独立复核「是否凑数」**（书名类上限 10 → 5 道诚实）；**独立复现** SEC-T7-01 修复；确认 **17/17 负例 exit 1**、只读性、determinism、零 KB-003 泄漏。
**明示不宣布 KB-002 CLOSED**，归 Captain Release Gate —— 符合治理。

## ⑩ GOLDEN_DATASET_STATUS

**0 个证据文件已录入**（`data/kb/golden` 根下 0 文件）。`--dataset` 诚实输出：
```
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = PARTIAL_GOLDEN_SET
KNOWN_DATA_GAP = 10
```
正式逐菜录入属 **KB-002F+**，本阶段禁止；需另一次授权后按「每菜独立 Task」创建。

## ⑪ REGRESSION_RESULT

| 门禁 | 退出码 |
|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0**（121 用例，数量未减） |
| `node scripts/verify_graph_schema.mjs` | **0**（193/49） |
| `node scripts/verify_literature_dataset.mjs` | **0**（106/103） |
| `node scripts/kb002/validate-golden.mjs` | **0** |
| `node --test scripts/kb002/__tests__/...` | **0**（50 用例） |

**KB-001 与 V1 路径 `git status` = 0 条目**。**新增失败 = 0**；已知历史基线失败未错误归因给 KB-002。

## ⑫ FILES_CHANGED

`.gitignore`(+1 行，**纯追加**) + 31 个新增 = **32 条目**：
- `docs/kb-002/00`–`09`（9 份报告）
- `scripts/kb002/`（4 个：CLI + 2 lib + 1 测试）
- `data/kb/golden/examples/`（1 正向 + 17 负向）

**未提交**：HEAD 仍为 `6a25f4f`（KB-001 checkpoint）。

## ⑬ GIT_STATUS（归因）

| 类别 | 条目 |
|---|---|
| 本轮 KB-002 变更 | **32** |
| KB-001 / V1 / `scripts/kb` / `data/kb/schema` / `data/kb/examples` / `docs/kb-001` | **0** |
| `.agent-teams` metadata | 未提交（默认不进产品提交） |
| 用户既有 frontend staged | **300 条，完整保留、未被吞入** |

## ⑭ KNOWN_NON_BLOCKERS

| # | 内容 | 级别 |
|---|---|---|
| **N-01** | 17 个负例现均额外携带 `KB002_FILENAME_ID_MISMATCH`；新增遍历测试只断言「≥1 码」→ **若未来某本意规则回归，覆盖损失不可察觉**（当前本意码均仍在，属**回归防护不足**）。建议 F+ 前改为断言**每个负例的具体本意码**，或让负例文件名与其 `golden_id` 一致 | low |
| **N-02** | backend-wb 自述 38 个 `KB002_*` 码，Reviewer 实测唯一码 **35** | low |
| N-03 | 无「虚构书名」检测（当前生产数据为空，空集成立）→ 建议 F+ 加**非阻断**告警 | low |
| N-04 | t5 依赖摘要 `(no output recorded)` 属渲染缺口，交付物完整（Captain 已 append-only 补证据） | low |
| N-05 | 未验证项：真 symlink/junction 绕过、并发竞态、磁盘写满、超大输入、**L2 外部来源真实性（`web_search` 本环境无 API key）** | 未验证 |

## ⑮ DEFERRED_KB_003_PLUS

本轮**未实现**任何 KB-003+ 功能（关键词命中 **0**）。遗留登记：
- `KB-002F+`：逐菜证据录入与审核（GOLDEN-001 起，每菜独立 Task）
- `DEFERRED_DSH_CONFIG_FIX`：`wudian-kb-v1` profile 仍引用失效路由 → `DSH-GOV-001`
- `DEFERRED_DSH_GOVERNANCE_FIX`：`software-factory` protocol 仍含 Codex 治理残留 → `DSH-GOV-001`

## ⑯ CAPTAIN_RELEASE_GATE

| 条件 | 结果 |
|---|---|
| t1–t5 completed | ✅ |
| t6 PASS / t7 PASS / t8 PASS | ✅ |
| 无 Critical blocker | ✅ |
| 无范围外修改 | ✅ |
| 无 V1 数据污染 | ✅（0 条目） |
| KB-001 回归保持绿色 | ✅ |
| Golden 候选计数真实、无凑数 | ✅（5/10，诚实） |
| 无伪造来源 | ✅（零伪造 URL / 无伪造 E5 / 无自封 expert） |
| staged/approval 协议遵守 | ✅（未自行 approve） |
| 未进入 KB-003+ | ✅ |
| Git 状态可解释 | ✅ |
| 新增文件均属授权 scope | ✅ |

# → `KB-002_PHASE1 = CLOSED`
# → `GOLDEN_DATASET_STATUS = DATA_PENDING_F+`（数据集本体未关闭）

---

## 补充记录：F+ 逐菜录入已建链，但被 provider 速率限制阻断

Captain 已按 §35（t1–t5 完成后才创建 F+）创建 **5 道菜各自的独立任务**（每菜独立可验证、可 Review、可回滚）：

| 任务 | 菜品 | 产出 |
|---|---|---|
| t11 (F01) | GOLDEN-001 蟹酿橙 | `data/kb/golden/golden_001.kb.json` |
| t12 (F02) | GOLDEN-002 王太守八宝豆腐 | `golden_002.kb.json` |
| t13 (F03) | GOLDEN-003 玉糁羹 | `golden_003.kb.json` |
| t14 (F04) | GOLDEN-004 炙羊肉（证据基础弱，须诚实 insufficient） | `golden_004.kb.json` |
| t15 (F05) | GOLDEN-005 槐叶冷淘 | `golden_005.kb.json` |

**每个任务的硬约束**（已写入合同）：只用仓库内可核验指针（`text_001`/`text_002` 实测 `hasAuthority=false`，**不可**作 S/A 权威指针；权威指针须用 `lit_ccs_014`/`lit_ccs_006` 等 literature 条目）；严禁编造书目/馆藏/卷号/页码/URL/专家审核；无法核实的字段写 `insufficient` 而非补全；`review_status` 只能 `unreviewed`/`pending_external_expert`（**L2 外部核实本环境不可完成，`web_search` 无 API key**）；`evidence_level` 不得标 E5；冲突必须保留。

**🔴 阻断状态**：t11–t15 **全部失败**，错误为 provider 侧 **429 `workbuddy upstream soft_rate`**（账号级配额，非任务缺陷）：

```
usage exceeds frequency limit ... reset at 2026-10-09 18:10:43 UTC+8
alternatively, you can switch to the other models to continue using it.
```

- Captain 实测：当前 UTC `06:39`，恢复点 UTC `10:10:43` → **还需约 212 分钟**
- **已停止重试**：该错误为确定性配额错误，此刻重试只会白耗任务尝试
- 另建 **t16（FIX_SPEC-KB002-3）** 修复 N-01 回归防护缺口（遍历测试改为断言**每个负例的具体本意码**），已排队待配额恢复

**待配额恢复后继续**：t16 → 重试 t11–t15 → 每菜 QA 抽样 / Security provenance / Reviewer 独立审查 → 数据集级收口。

**注**：F+ 的门控任务（QA 抽样 / Security / Reviewer）尚未创建，将在各菜产出真实产物后再定义，避免空转。
