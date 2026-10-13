# t35 — KB002-QA-INCREMENTAL-01R1 增量独立复核报告

- 执行角色：**qa-wb**（独立于 t29/t31/t32 实施者）
- 任务：**t35**（`retry_of` = t33），attempt 2
- **结论：REQUEST_CHANGES**
- 报告纪律：区分「**实测**」（我亲自执行/读取）与「**审阅证据**」；全部退出码由 **Node `spawnSync`** 取得，**未使用** PowerShell 管道 `$LASTEXITCODE`。

---

## 0. 结论摘要

| # | 验收项 | 判定 |
|---|---|---|
| 1 | 增量复核定位（非重审 t23/t24；retry_of t33 不改旧记录） | ✅ passed |
| 2 | **增量 A（t29）夹具契约合规** | ✅ passed |
| 3 | **增量 B（t31）状态命名修复（单一权威映射）** | ✅ passed（三重态正确；非法输入部分未覆盖 → 见 F-02） |
| 4 | **增量 C（t32）测试断言契约化「更严非更松」** | ✅ passed（L286 保留 PARTIAL 经我独立实测确认**正确**） |
| 5 | 增量未削弱 Q3 | ✅ passed |
| 6 | 计数语义零改动 | ✅ passed |
| 7 | 增量未引入空洞测试 | ✅ passed |
| 8 | **全量回归全绿且数量不减** | ❌ **FAILED**（`t24-integrity` **非确定性**，见 **F-01**） |
| 9 | 生产不变量 + 未受控写入 | ✅ passed（无残留；目录干净） |
| 10 | 只读合规 | ✅ passed |
| 11 | 产物真实落盘 | ✅ passed |
| 12 | 未验证项如实标注 | ✅ passed |
| 13 | 结论仅 PASS / REQUEST_CHANGES | ✅ passed |

**1 项失败（#8）→ 本 Gate 不得 PASS。**

---

## 1. FINDINGS（结构化）

### F-01 🔴 blocker / **medium** — `t24-admission-and-integrity.test.mjs` **非确定性**（同一干净状态、同一命令，结果不稳定）

| 字段 | 内容 |
|---|---|
| **id** | F-01 |
| **severity** | **medium** |
| **文件** | `scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs`（mtime `2026-10-10T10:36:38.020Z`） |
| **问题** | 同一命令在同一「干净」仓库状态下连续运行，**结果不一致**：失败集合与失败数量每次不同。违反验收 #8「`t24-admission-and-integrity.test.mjs`（应为 **21**）全绿」。 |
| **实测证据（我亲自执行）** | ① 对套件**连续 5 次**独立 `spawnSync` 顺序运行，**fail 序列 = `[0, 0, 0, 0, 4]`** → **全绿仅 4/5**，`非确定性 = true`。<br>② 另两次运行分别得到 **1 fail**（`INCIDENT-D`）与 **4 fail**（`INCIDENT-D`、`C-1/C-9`、`C-7/C-8`、`C-10`）。<br>③ 第 5 轮 4 fail 的集合是 `CASE 8`、`INCIDENT-C`、`C-1/C-9`、`C-7/C-8` —— **与前述失败集合不同**。<br>④ **每轮结束后残留均为 `staging=[]`、`prodFiles=[]`** → **不是**简单文件残留污染。<br>⑤ 合计 **8 次运行中 2 次失败（≈25%）**；失败用例**每次不同** → 指向**共享环境/时序**而非单一逻辑缺陷。 |
| **根因（实测定位）** | 该套件**写入真实共享路径**而非隔离的临时目录：<br>· 我在一次运行过程中**当场观测到 `data/kb/golden/`（生产根）出现 `golden_001.kb.json`（production `.kb.json` 数 = 1）**，运行结束后被 `cleanup()` 清除；<br>· 当前工作区**有 28 个 node 进程**并发（多批：`20:29:45`、`20:00:23` 等），即**其他团队成员同时在运行**同一套件；<br>· 当两次运行写入同一条真实路径（`data/kb/golden/`、`data/kb/golden/staging/`）时互相踩踏 → 随机子集的 staging/CASE 用例失败。 |
| **为何未造成数据损坏** | 每轮结束残留为 0；`--dataset` 始终 `0 file(s) present` / `QUALIFIED_GOLDEN_COUNT = 0` / `STATUS = EMPTY_GOLDEN_SET`。**未发生 promotion，未污染生产数据。** |
| **影响** | ① 本 Gate 无法满足「全绿」；② 该门禁在**共享工作区**模式下不可信，可能**伪失败**（浪费修复轮次）或**掩盖真实失败**；③ 既有 t27 报告曾将同类现象判为「不可复现、非测试缺陷」——**本轮实测表明它可复现（≈25%）**，该结论需更正。 |
| **requiredFix（择一或并用）** | (a) **隔离测试 I/O**：把 t24 的所有写入改到专属临时根（如 `tmp/` 下的 scratch 目录或 `os.tmpdir()`），**不得**再写入真实 `data/kb/golden/` 与 `data/kb/golden/staging/`；通过 `--file`/自定义数据根驱动被测逻辑；(b) 若必须使用真实根，则**加互斥锁**（独占锁文件）+ 运行时**强制串行**，并在测试内断言锁获取成功；(c) 修好后**连续 ≥5 次运行必须 5/5 全绿**并附证据。 |
| **status** | open |

### F-02 🟡 low — `deriveDatasetStatus` 未对「超 target / 非整数」计数做边界校验

| 字段 | 内容 |
|---|---|
| **id** | F-02 |
| **severity** | **low** |
| **文件** | `scripts/kb002/validate-golden.mjs` L92-95 |
| **问题** | 验收 #3(d) 明列「非法输入（`-1`/`NaN`/`undefined`/非数字/**超 target**）**必须 throw**」。实测**超 target 不 throw**： |
| **实测证据** | `deriveDatasetStatus(-1,10)` / `(NaN,10)` / `(undefined,10)` / `('x',10)` → **全部 THREW ✅**；<br>`deriveDatasetStatus(11,10)` → `{"status":"COMPLETE_GOLDEN_SET","qualifiedCount":11,"shortfall":0,"knownDataGap":0}` **未 throw** ❌；<br>`deriveDatasetStatus(10.5,10)` → `COMPLETE_GOLDEN_SET`，`shortfall:0`、`knownDataGap:0` **未 throw** ❌（非整数计数被静默接受）。<br>守卫仅 `!Number.isFinite(qualifiedCount) \|\| qualifiedCount < 0`（L93）。全文件**无** `> MAX_TARGET`（0 次）、`Number.isInteger`（0 次）守卫。 |
| **当前可达性** | **不可达**：上游 `golden-rules.mjs` L45 `MAX_GOLDEN_FILES = 10` 且 `validate-golden.mjs` L77 `MAX_TARGET = 10`，生产计数被限制在 ≤10；调用点 L382 传入的是已封顶的计数。故**当前无实际危害**。 |
| **影响** | 低。但若上游客量被放宽或被绕过，`count > target` 会被报成 `COMPLETE_GOLDEN_SET` 且 `SHORTFALL = 0`，**静默掩盖异常**；非整数计数同理。 |
| **requiredFix** | 在 L93 守卫后追加边界与非整数校验（如 `qualifiedCount > target` 或 `!Number.isInteger(qualifiedCount)` → throw）；**或**由 Captain 正式修订该验收条款（若认定「超 target 视为 COMPLETE」是契约意图）。**不得**在未修订条款的情况下忽略。 |
| **status** | open |

---

## 2. 增量 A（t29）—— ✅ 全部通过（实测）

### 2.1 `contract_version` 分布

| 断言 | 实测 |
|---|---|
| fixture 总数 | **18**（`examples/valid` 1 + `examples/invalid` 17） |
| `contract_version` 分布 | **`kb-002.1.2` × 17 + `(缺失)` × 1** |
| 缺失者 | **`inv_12_metadata_incomplete.kb.json`** ✅ |
| inv_12 是否**刻意**缺失 | ✅ 其 `metadata.purpose` 明写「Negative fixture: metadata.contract_version is missing.」——该键缺失**正是其测试对象** |
| inv_12 本意码是否保留 | ✅ 实测 `exit=1` 且 codes 含 **`KB002_METADATA_INCOMPLETE`** |

### 2.2 结构夹具 Claim 自洽 + purpose

`examples/valid/golden_001.kb.json` 实测：

| 字段 | 实测值 |
|---|---|
| `metadata.evidence_level` | **E2** |
| `metadata.qualified` | **false** |
| `metadata.fixture_only` | **true** |
| `metadata.purpose` | 「Positive fixture: complete closure at computed Evidence Level **E2**, with a coexisting `claim_refuted_by` edge…」 |
| `purpose` 是否仍写 E4 | **false** ✅（已与计算等级一致） |
| `claim_g001_steaming_closure` | `evidence_status=insufficient`、`derivation=unresolved`、`review_status=unreviewed`、`unknown_fields=["statement"]` ✅ **完全自洽** |

### 2.3 t24 夹具保护未破坏（实测）

| 断言 | 实测 |
|---|---|
| 带 fixture 标记 | **18 / 18** ✅ |
| `SOURCE_GRADE` 分布 | `{D:34, X:2, C:2}` → **S/A 合计 = 0** ✅ |
| `SourceEdition.publication_year` null | **36 / 36** ✅ |
| `publisher` 唯一值 | **`SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER`**（单值）✅ |

### 2.4 17 个负例**逐例**验证

**TOTAL = 17，nonExit1 = 0** —— 全部 `exit=1`，且各自发出本意码（含 `golden_002.kb.json` → `KB002_FILENAME_ID_MISMATCH`，即 `inv_13` 的重命名版；`inv_12` → `KB002_METADATA_INCOMPLETE`）。✅

---

## 3. 增量 B（t31）—— ✅ 通过（含 F-02 部分未覆盖）

### 3.1 单一权威映射（实测）

| 断言 | 实测（行号） |
|---|---|
| `deriveDatasetStatus` 定义 | **L92**（`export function deriveDatasetStatus(qualifiedCount, target = 10)`） |
| `formatDatasetStatusLines` 定义 | **L117** |
| **空集路径与正常报告路径共用同一函数** | ✅ **L317** `${formatDatasetStatusLines(deriveDatasetStatus(0))}`；**L382-386** `const derived = deriveDatasetStatus(golden.qualifiedGoldenCount, MAX_TARGET); … formatDatasetStatusLines(derived)`。**两条路径均走同一对函数** |
| 是否存在第二处可独立漂移的状态定义 | ✅ **无** —— 全文件 `STATUS =` 赋值点仅 2 处，且均来自 `formatDatasetStatusLines` 的模板（L121） |

### 3.2 旧名收敛

| 断言 | 实测 |
|---|---|
| `GOLDEN_10_COMPLETE` 出现 | 2 次：**L69 = `//` 注释**（说明退役原因）、**L81 = `RETIRED_STATUS_NAMES` 守卫**（`new Set(['GOLDEN_10_COMPLETE'])`）|
| 是否出现在功能性代码路径 | ✅ **否**（L102 仅用于「若派生结果命中退役名则 throw」） |

### 3.3 三态语义（实测，动态调用权威函数）

```
derive(0,10)  → {"status":"EMPTY_GOLDEN_SET",   "shortfall":10, "knownDataGap":10}
derive(5,10)  → {"status":"PARTIAL_GOLDEN_SET", "shortfall":5,  "knownDataGap":5}
derive(10,10) → {"status":"COMPLETE_GOLDEN_SET","shortfall":0,  "knownDataGap":0}
```

- **三态标签互不相同**（distinct = **3**）✅ —— 反证「标签常量塌缩」类空洞测试
- 非法输入：`-1` / `NaN` / `undefined` / `'x'` → **全部 throw** ✅
- 超 target / 非整数 → **未 throw** ❌（**F-02**）

> **我主动更正一处自己的探针缺陷**：首版探针把返回**对象**整体 `String()` 化后比较，得到 `distinct=1` 的**假警报**。修正为比较 `.status` 后为 **3**。**F-02 与 `-1/NaN/…` 的抛错判定经修正后复测，结论不变。**

---

## 4. 增量 C（t32）—— ✅ 通过，且我**独立判定 L286 保留 PARTIAL 正确**

### 4.1 两处契约化「更严而非更松」（实测，读源码）

| 位置 | 实测内容 |
|---|---|
| **L247 区块（CASE 7）** | 注释说明「scenario has production **EMPTY** … real qualified count is **0** … Contract 12- §5.1 is explicit: 0 道合格 ⟹ EMPTY_GOLDEN_SET … **The corrected assertion is STRICTER**」 |
| **断言（L253-259）** | ① `QUALIFIED_GOLDEN_COUNT = 0`；② `STATUS = EMPTY_GOLDEN_SET`；③ **新增否定断言** `assert.ok(!/STATUS = PARTIAL_GOLDEN_SET/.test(r.stderr), 'staging must never make an empty production set look PARTIAL')` ✅ |
| 全文件否定断言计数 | **3** 处 `/STATUS = PARTIAL_GOLDEN_SET/`（否定式） |
| `.skip` / `.todo` | **0 / 0** ✅（无跳过、无待办） |

→ 结论：**不仅替换字符串，而是同时锁死正确标签 + 禁止旧标签复现** = **更严** ✅

### 4.2 **L286（CASE 8）保留 `PARTIAL_GOLDEN_SET` —— 我独立实测判定：正确**

**我的独立复算（不采信上游结论）**：CASE 8 场景为 staging **5** 条 + production **2** 条（L266-275）。按契约 `12-` §5 三态表，`target = 10`：

- 该场景 **production 合格数 = 2** → 落在 **`0 < count < target`** 区间
- 该区间按三态表 **必须**输出 **`PARTIAL_GOLDEN_SET`**
- 我实测权威函数的区间判定：`derive(2,10)` 属 PARTIAL 区间（与 `derive(5,10)` 同分支）
- 测试断言（L281-286）：`QUALIFIED_GOLDEN_COUNT = 2`、`!== 7`、`SHORTFALL = 8`、**`STATUS = PARTIAL_GOLDEN_SET`** 全部与该区间一致

→ **保留 `PARTIAL_GOLDEN_SET` 是契约正确期望，不是漏改** ✅ —— 上游「拒绝机械替换」的判断**正确**。

> 说明：CASE 8 自身（含 count 算术）在本轮 8 次运行中**出现过 1 次失败**（见 F-01），但该失败与断言内容无关，属并发冲突（同一场景在隔离/无冲突的运行中通过）。

---

## 5. 增量未削弱 Q3（实测）

| 断言 | 实测 |
|---|---|
| Q3 分支仍**无条件** | ✅ `golden-rules.mjs` **L319**：`if (best === null \|\| LEVELS.indexOf(best) < LEVELS.indexOf('E3')) {` → L320 `KB002_DISH_BELOW_E3` |
| 结构夹具**显式单文件**校验 | **exit=1**，codes = `["E_TRACE_WEAKENS_CLAIM","KB002_DISH_BELOW_E3"]` |
| 含 `KB002_DISH_BELOW_E3` | **true** ✅ |
| 含 `KB002_METADATA_INCOMPLETE` | **false** ✅（版本已对齐 → 失败因**缺 E3 证据**，非版本缺陷） |

---

## 6. 计数语义零改动（实测）

`--dataset` 输出：

```
KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = EMPTY_GOLDEN_SET
KNOWN_DATA_GAP = 10
```

- `QUALIFIED_GOLDEN_COUNT = 0` 与 `SHORTFALL = 10` **与 t25 快照一致** ✅
- **仅** `STATUS` 由 `PARTIAL_GOLDEN_SET` 变为 **`EMPTY_GOLDEN_SET`** ✅（即本次修复的目标）

---

## 7. 全量回归（实测，spawnSync；**含 F-01 失败**）

| 命令 | 退出码 | 计数 |
|---|---|---|
| `validate-golden` | **0** | — |
| `validate-golden --dataset` | **0** | 0 file(s) present |
| `validate-golden --staging` | **0** | — |
| `validate-golden --integrity` | **0** | — |
| `golden-validator.test.mjs` | **0** | tests **67** / pass 67 / fail 0 / **skipped 0** / todo 0 |
| **`t24-admission-and-integrity.test.mjs`** | **1 ⚠ / 0** | tests 21 / pass **17-21（不稳定）** → **F-01** |
| `kb/__tests__`（4 文件） | **0** | tests **121** / pass 121 / fail 0（**数量未减**） |
| `validate-kb-schema` | **0** | — |
| `verify_graph_schema` | **0** | 193 / 49 |
| `verify_literature_dataset` | **0** | 106 / 103 |
| `git status --porcelain` | **0** | 367 条目（KB-002 新增 + 既有基线；V1 四路径 0） |

**determinism**：`--dataset` 两次运行 **stdout 与 stderr 逐字节相同 = true**；`default` stdout 逐字节相同 = true ✅

---

## 8. 生产不变量 + 未受控写入（实测）

| 断言 | 实测 |
|---|---|
| `data/kb/golden/` 内容 | `examples`、`staging`（**无 production 文件**） |
| production `.kb.json` 数（稳定态） | **0** |
| `staging` 文件数 | **0** |
| `QUALIFIED_GOLDEN_COUNT = 0` / `SHORTFALL = 10` | ✅ |
| 是否观测到途中变化 | ⚠️ **是**：一次运行中曾观测到 `data/kb/golden/golden_001.kb.json` **瞬态出现**（production 计数 = 1），运行结束被 `cleanup()` 清除。**已如实记录**（该现象即 F-01 的机理证据）。 |
| **两次独立扫描比对** | ✅ `total 18/18 一致`、`verDist 一致`、`marked 一致`、**hash 列表逐字节一致** |

---

## 9. 产物真实落盘（mtime 证据）

| 产物 | 存在 | 大小 | mtime (UTC) |
|---|---|---|---|
| `scripts/kb002/validate-golden.mjs` | ✅ | 18,463 B | `2026-10-10T10:24:18.106Z` |
| `scripts/kb002/lib/contract-version.mjs` | ✅ | 3,685 B | `2026-10-10T08:57:06.743Z` |
| `scripts/kb002/lib/golden-rules.mjs` | ✅ | 29,776 B | `2026-10-10T09:02:57.067Z` |
| `scripts/kb002/__tests__/golden-validator.test.mjs` | ✅ | 42,604 B | `2026-10-10T10:26:41.534Z` |
| `scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | ✅ | 24,615 B | `2026-10-10T10:36:38.020Z` |

全部与任务书所述 mtime 一致 ✅。

---

## 10. 未验证项（**不得当作通过**）

| 项 | 状态 |
|---|---|
| symlink / junction 绕过 | **未验证** |
| 并发竞态 | **已观测到现象并定位机理（F-01），但未做受控并发压测** → 视为**未完全验证** |
| 磁盘写满 / 权限拒绝 | **未验证** |
| 超大输入 | **未验证** |
| 跨平台原子性（`atomicWriteFile` 于非 Windows FS） | **未验证** |
| L2 外部来源真实性 | **未验证**（`web_search` 无 key，本轮未做任何外部核实） |

---

## 11. 只读合规

- **唯一写入**：本文件 `docs/kb-002/18-qa-incremental-review.md`。
- 临时探针 `tmp/t35-pass1.mjs`、`tmp/t35-pass2.mjs`、`tmp/t35-flaky.mjs` **已全部删除并确认不存在**（`tmp/` 下无 `t35-*` 残留）。
- **未修改**任何实现、测试、数据、配置或他人报告；**未**触碰 `data/kb/generated/` 真实产物；**未**创建任何 Golden 数据文件；**未**读取或输出任何 `.env` 敏感值。
- 清理后 `data/kb/golden/` = `examples`、`staging`；`staging` 文件数 0。

---

## 12. 结论

# REQUEST_CHANGES

**增量 A / B（含三态）/ C 三项变更本身经我独立复核：正确、完整、未削弱 Q3 与计数语义**；L286 保留 `PARTIAL_GOLDEN_SET` 经我独立实测**判定为契约正确**（`count=2` ∈ `0<count<10`）。

**但不能判 PASS，因为验收 #8（回归全绿且数量不减）未达成：**

- **F-01（medium / blocker）**：`t24-admission-and-integrity.test.mjs` **非确定性** —— 同一干净状态连续 5 次运行 **fail 序列 `[0,0,0,0,4]`**（8 次运行中 2 次失败）；根因是该套件**写入真实共享路径** `data/kb/golden/` 与 `data/kb/golden/staging/`，在工作区**有 28 个 node 进程并发**时互相踩踏。无残留、无数据损坏，但**门禁不可信**。
- **F-02（low）**：`deriveDatasetStatus` 未对 **超 target / 非整数**计数抛错（验收 #3(d) 明列「超 target 必须 throw」）；当前因上游 `MAX_GOLDEN_FILES = 10` **不可达**，但应按条款修复或由 Captain 正式修订条款。

**修复后须重跑本 Gate 并再次确认 `t24` 至少连续 5 次 5/5 全绿。**

**同时提示**：既有 t27 报告曾把同类现象判为「不可复现、非测试缺陷」；本轮实测表明其**可复现（≈25%）**，建议一并更正该结论。
