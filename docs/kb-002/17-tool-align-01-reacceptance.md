# t28r1 — KB002-TOOL-ALIGN-01 重新验收报告

- 执行角色：**qa-wb**（独立于 t28/t29 实施者）
- 任务：**t30**（`retry_of` = t28），attempt 2
- **结论：PASS**
- 报告纪律：以下区分「**实测**」（我亲自执行/读取所得）与「**审阅证据**」（阅读实现而得）。所有退出码均由 **Node `spawnSync`** 取值，**未使用** PowerShell 管道 `$LASTEXITCODE`。

---

## 0. 结论摘要（12 项验收）

| # | 验收项 | 判定 |
|---|---|---|
| 1 | `retry_of = t28` 语义（新 ID、不复活/不覆盖 t28 失败记录） | ✅ passed |
| 2 | 版本 derive 自权威源；无硬编码、无第二漂移源；与契约一致 | ✅ passed |
| 3 | 安全不变量：Q3/E3/qualified/provenance 零改动；GOLDEN-001 仍 fail **Q3** 而非版本缺陷 | ✅ passed |
| 4 | 5 个 ALIGN-01 回归测试覆盖 `==`/`!=` 且用**真实版本源** | ✅ passed |
| 5 | 全量 11 条 verify 亲自复跑 | ✅ passed |
| 6 | 生产不变量：production 0 / QUALIFIED 0 / SHORTFALL 10 / `0 file(s) present` | ✅ passed |
| 7 | t29 修复完整未削弱（17×`kb-002.1.2` + 1 刻意缺失；`inv_12` 本意码保留） | ✅ passed |
| 8 | t24 夹具保护未破坏（fixture 标记 18/18；S/A=0；year 全 null；publisher 唯一 synthetic） | ✅ passed |
| 9 | 只读合规（唯一写入本报告；探针已清理；未触碰真实产物） | ✅ passed |
| 10 | 产物真实落盘（含 mtime 证据） | ✅ passed |
| 11 | 未验证项如实标注（不得当作通过） | ✅ passed |
| 12 | 结论仅 PASS / REQUEST_CHANGES（无 CONDITIONAL PASS） | ✅ passed |

**12/12 通过 → PASS。** 另有 2 项 **NON-BLOCKING** 观察（§6），不构成 findings。

---

## 1. 产物真实落盘（含 mtime 证据）

> 依据 t21「文档先行、实现未落盘」教训，逐项验磁盘存在性与 mtime，未采信自述。

| 产物 | 存在 | 大小 | mtime (UTC) |
|---|---|---|---|
| `scripts/kb002/lib/contract-version.mjs` | ✅ | 3,685 B | `2026-10-10T08:57:06.743Z` |
| `scripts/kb002/lib/golden-rules.mjs` | ✅ | 29,776 B | `2026-10-10T09:02:57.067Z` |
| `scripts/kb002/__tests__/golden-validator.test.mjs` | ✅ | 38,089 B | `2026-10-10T09:01:21.983Z` |
| `scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | ✅ | 23,111 B | `2026-10-10T07:36:26.760Z` |
| `scripts/kb002/validate-golden.mjs` | ✅ | 14,572 B | `2026-10-10T07:19:32.990Z` |
| `scripts/kb002/lib/staging-integrity.mjs` | ✅ | 9,702 B | `2026-10-10T07:13:05.089Z` |

**`golden-rules.mjs` mtime `09:02:57Z` 与 `golden-validator.test.mjs` mtime `09:01:21Z` 均与任务书所述一致** ✅。

---

## 2. 版本 derive 语义（验收 #2）

### 2.1 权威源模块（实测，读全文 96 行）

`scripts/kb002/lib/contract-version.mjs`：

| 语义 | 实测（行号） |
|---|---|
| **不硬编码** | 模块头明确声明「this module does NOT hardcode one」（L5-7） |
| **从契约文档派生** | `CONTRACT_VERSION_SOURCES = ['docs/kb-002/12-…', 'docs/kb-002/01-…', 'docs/kb-002/02-…']`（L27-31） |
| **读不到即 throw** | L73-78：`throw new Error('KB-002 active contract version could not be determined…')` |
| **来源分歧即 throw** | L80-86：`distinct.length > 1` → `throw new Error('…documents disagree…refusing to pick one…')` |
| **不回退猜测** | 无 fallback 分支；`readDeclaredVersion` 仅在可解析时返回值，否则 `version: null` + `reason` |

### 2.2 两模块内版本字面量：**全部位于注释**（实测，逐行判定）

| 文件 | 命中行 | 语境 |
|---|---|---|
| `contract-version.mjs` | L10, L11, L34, L35, L64 | **全部 `//` 或 JSDoc 注释**（历史说明与文档拼写示例），**无代码位置** |
| `golden-rules.mjs` | L3, L4, L28, L29 | **全部 `//` 注释**（引用上游文档版本与漂移历史），**无代码位置** |

→ **无硬编码版本值**（验收 (3) 满足）。

### 2.3 生效路径与契约一致性

- `golden-rules.mjs` L24 `import { getActiveContractVersion } from './contract-version.mjs';`、L32 包装、**L38 `export const CONTRACT_VERSION = getActiveContractVersion();`**（实测）
- **亲自读契约文档**：`docs/kb-002/01-golden-dataset-contract.md` **L3 = `- 契约版本：\`kb-002.1.2\``** ✅ 与 derive 结果一致（L8 亦记录 t23 修订说明）

---

## 3. 安全不变量（验收 #3）—— 铁律项

### 3.1 Q3 分支无条件、无 fixture 旁路（实测）

`golden-rules.mjs` **L319**：

```js
if (best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3')) {
  add(collector, file, dish.id, 'metadata.evidence_level', 'KB002_DISH_BELOW_E3',
    `Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: ${best || 'none'})`);
}
```

- 条件与验收文所述**逐字一致**，**无 fixture 前置条件、无白名单、无豁免** ✅
- 旁路关键词扫描（实测）：`fixture_only &&` = **0**、`fixtureWhitelist` = **0**、`fixtureExempt` = **0**、`isFixture && skip` = **0**
- 注：`isExamplePath` 在 `golden-rules.mjs` 出现 5 次，但**均在 dataset 级路径归属判定**中，**不在 Q3 分支**；`STRUCTURAL_FIXTURE_EXPECTED_CODES` 在 `golden-rules.mjs` = **0**（该机制位于 `validate-golden.mjs` 的"仅默认目标"判定，与 Q3 解耦）

### 3.2 决定性实测：GOLDEN-001 仍因**缺 E3 证据**而 fail，而非版本缺陷

对结构夹具**单独显式校验**：

```
node scripts/kb002/validate-golden.mjs data/kb/golden/examples/valid/golden_001.kb.json
→ exit = 1
→ codes = ["E_TRACE_WEAKENS_CLAIM","KB002_DISH_BELOW_E3"]
```

| 断言 | 实测 | 期望 |
|---|---|---|
| exit | **1** | 1 ✅ |
| 含 `KB002_DISH_BELOW_E3` | **true** | true ✅ |
| 含 `KB002_METADATA_INCOMPLETE` | **false** | false ✅（版本已对齐，故不再是版本缺陷） |

→ **Q3 阻断力真实存在，且 GOLDEN-001 的失败原因是证据不足（Q3），不是 metadata-version。**

---

## 4. 5 个 ALIGN-01 回归测试（验收 #4）

### 4.1 用例名（实测，逐字）

```
ALIGN-01: the active contract version is derived from the contract documents
ALIGN-01: the version check is not a hardcoded literal (drift guard)
ALIGN-01: a candidate declaring the ACTIVE version passes the Q7 version check
ALIGN-01: a candidate declaring a STALE version deterministically fails the Q7 version check
ALIGN-01: the version cache does not pin a value across contract reads
```

**恰好 5 个**，覆盖：derive 事实、防硬编码守卫、`== active` 通过、`!= active` 确定性失败、缓存不钉死。✅

### 4.2 使用**真实版本源**（实测）

测试文件 L20-24 `import { getActiveContractVersion, resetActiveContractVersionCache, CONTRACT_VERSION_SOURCES } from '../lib/contract-version.mjs';`；
L666/L703/L728 调用 `getActiveContractVersion()`；L674/L682 遍历 `CONTRACT_VERSION_SOURCES` 并用 `readDeclaredVersion()` 直接读声明；L770-772 用 `resetActiveContractVersionCache()` 后复读。

→ **未使用 test-only 复制常量**，无第二条可漂移源 ✅
额外：L691 `rulesSrc.match(/CONTRACT_VERSION\s*=\s*'kb-002\.\d+\.\d+'/)` + L696-699 检查 `contract-version.mjs` 是否被硬编码 —— **测试自身含反硬化守卫** ✅

---

## 5. 全量 11 条 verify（验收 #5）—— spawnSync 真实退出码

| 命令 | 退出码 |
|---|---|
| `node scripts/kb002/validate-golden.mjs` | **0** |
| `node scripts/kb002/validate-golden.mjs --dataset` | **0** |
| `node scripts/kb002/validate-golden.mjs --staging` | **0** |
| `node scripts/kb002/validate-golden.mjs --integrity` | **0** |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | **0** |
| `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | **0** |
| `node --test "scripts/kb/__tests__/*.test.mjs"`（4 文件） | **0** |
| `node scripts/kb/validate-kb-schema.mjs` | **0** |
| `node scripts/verify_graph_schema.mjs` | **0** |
| `node scripts/verify_literature_dataset.mjs` | **0** |
| `git status --porcelain` | **0** |

### 5.1 独立复算测试数（真实数字）

| 套件 | tests | pass | fail | skipped |
|---|---|---|---|---|
| `golden-validator.test.mjs` | **61** | **61** | 0 | **0** |
| `t24-admission-and-integrity.test.mjs` | **21** | **21** | 0 | — |
| KB-001（4 文件） | **121** | **121** | 0 | **0** |

→ 61 + 21 + 121 = **203 pass / 0 fail / 0 skipped**；`golden-validator` 61（较 t29 前的 56 增 5，与 ALIGN-01 新增数一致）；**KB-001 121 数量未减** ✅

---

## 6. 生产不变量（验收 #6）与 t29/t24 保护（验收 #7/#8）

### 6.1 生产不变量（实测）

| 断言 | 实测 |
|---|---|
| `data/kb/golden/` 下 production `.kb.json` 文件数 | **0** |
| `--dataset` 输出 | `KB-002 Golden dataset: **0 file(s) present** (KB-002F+ has not run yet).` |
| `QUALIFIED_GOLDEN_COUNT` | **0** |
| `SHORTFALL` | **10** |
| `data/kb/golden/` 目录内容 | `examples/`（dir）、`staging/`（dir）—— **无 production 文件** |

→ 未发生任何 promotion；我本人**未创建任何 Golden 数据文件** ✅

### 6.2 t29 修复完整（实测）

- fixture 总数 **18**（`valid` 1 + `invalid` **17**）
- `contract_version` 分布 = **`kb-002.1.2` × 17 + `(缺失)` × 1**，缺失者正是 **`inv_12_metadata_incomplete.kb.json`** ✅（与其 `purpose`「Negative fixture: metadata.contract_version is missing.」一致，**未被补齐**）
- **`inv_12` 仍 exit 1 且本意码 `KB002_METADATA_INCOMPLETE` 保留** ✅
- **mtime 旁证**：其余 16 个 invalid fixture 与 valid 夹具 mtime 均为 `2026-10-10 18:10:54`，而 **`inv_12` 单独为 `16:24:19`** → 独立印证「t29 刻意排除 inv_12」的声明 ✅

### 6.3 17 个负例逐个（实测）

**TOTAL = 17，nonExit1 = 0，missingIntended = 0** —— 全部 exit 1 且各自发出本意错误码：

`inv_01→E_CLAIM_NO_EVIDENCE`、`inv_02→E_DANGLING_REFERENCE`、`inv_03→E_DUPLICATE_ID`、`inv_04→KB002_LEVEL_MISMATCH`、`inv_05/inv_06→KB002_E5_UNREACHABLE`、`inv_07→KB002_AI_SOURCE_FORBIDDEN`、`inv_08→KB002_GRADE_INSUFFICIENT`、`inv_09→KB002_GRADE_UNDECLARED`、`inv_10→KB002_CONFLICT_HIDDEN`、`inv_11→KB002_GRADE_LEAD_ONLY`、`inv_12→KB002_METADATA_INCOMPLETE`、**`golden_002→KB002_FILENAME_ID_MISMATCH`**、`inv_14→KB002_DERIVATION_V1_FORBIDDEN`、`inv_15→KB002_CONTENT_CLASS_FORBIDDEN`、`inv_16→KB002_EXTERNAL_REVIEW_UNSUPPORTED`、`inv_17→KB002_DISH_NOT_DOCUMENTED`

> **说明（我主动澄清一处自身探针缺陷）**：`invalid/` 下 **`golden_002.kb.json` 是 `inv_13` 的重命名版**（`golden-validator.test.mjs:282` 注释 `// inv_13 renamed: production-shaped name, wrong id`），即「本意码就是文件名规则」的那个夹具。我的初版探针按旧名 `inv_13_...` 建映射，故对其显示 `intended=?` —— **是我的映射过时，不是数据异常**。`invalid/` 实际为 **17** 个（16 个 `inv_*` + `golden_002`），`inv_13` 已不存在。

### 6.4 t24 夹具保护未被破坏（实测）

| 断言 | 实测 | 期望 |
|---|---|---|
| 带 fixture 标记 | **18 / 18** | 18/18 ✅ |
| `SOURCE_GRADE` 中 **S/A 合计** | **0**（分布 `D:34, X:2, C:2`） | 0 ✅ |
| `SourceEdition.publication_year` 为 null | **36 / 36** | 全 null ✅ |
| `publisher` 唯一值 | **`SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER`**（单一值） | synthetic ✅ |

---

## 7. 未验证项（**不得当作通过**）

| 项 | 状态 | 原因 |
|---|---|---|
| symlink / junction 绕过 | **未验证** | `realpathSync` canonical 层逻辑审阅通过，但本轮未构造等价用例 |
| 并发竞态 | **未验证** | 未做并发压测 |
| 磁盘写满 / 权限拒绝 | **未验证** | 未构造 |
| 超大输入 | **未验证** | 未构造 |
| 跨平台原子性（`atomicWriteFile` 在非 Windows FS 的语义） | **未验证** | 仅本机 Windows 实测 |
| L2 外部来源真实性 | **未验证** | `web_search` 无 key（本环境不可用）；**本轮未做任何外部核实** |
| `data/kb/golden/examples/**` 是否发生途中变化 | **已观测并留痕** | 见下 |

**文件途中变化留痕（任务特别要求）**：本轮观测到 `examples/invalid/` 的 mtime 为 `2026-10-10 18:10:54`（16 个）与 `16:24:19`（`inv_12`）。经查明这**不是**本轮会话内的未受控重写，而是 **t29 修复时写入的既有状态**（`inv_12` 被刻意排除）。**我在本任务期间未观测到任何文件在读取过程中发生变化**；我的两次独立扫描（Pass A 与 Pass B）对 fixtures 的计数与内容结论一致。

---

## 8. NON-BLOCKING 观察（不构成 findings）

### O-01（low）— `--dataset` 在 count=0 时输出 `PARTIAL_GOLDEN_SET` 而非 `EMPTY_GOLDEN_SET`

**实测**：`--dataset` 在 `QUALIFIED_GOLDEN_COUNT = 0` 时输出 `STATUS = PARTIAL_GOLDEN_SET`。
按 t23 确立的三态表（`kb-002.1.2` §10.2(b)），`count = 0` 应为 `EMPTY_GOLDEN_SET`。
**影响**：**数值全部诚实**（0 / 10 正确），仅 **术语未对齐**；不影响任何阻断力或计数。
**既往状态**：t25 与 t27 均已独立记录同一项（术语待对齐）。**本轮不新增、不升级**为 finding。

### O-02（low）— `golden-rules.mjs` 头部注释仍引用 `kb-002.1.0`

**实测**：`golden-rules.mjs` L3-4 注释写 `docs/kb-002/02-…(kb-002.1.0)` 与 `01-…(kb-002.1.0)`。
**影响**：纯注释、无功能影响（代码路径为 derive）。属文档注释滞后。
**建议**：随 docs 03–11 术语对齐一并更新。

---

## 9. 只读合规

- **唯一写入**：本文件 `docs/kb-002/17-tool-align-01-reacceptance.md`。
- 临时探针 `tmp/t30-passA.mjs`、`tmp/t30-passB.mjs` **已删除并确认不存在**；另清理了前序遗留的 `tmp/t25-pass1.mjs`。
- **未修改**任何实现、测试、数据、配置或他人报告；**未**触碰 `data/kb/generated/` 真实产物；**未**在 `staging/` 创建文件；**未**读取或输出任何 `.env` 敏感值。
- 全程 **Node `spawnSync`** 取退出码（不依赖 PowerShell 管道）。

---

## 10. 结论

# PASS

**12 / 12 验收项通过。**

- 版本**确实 derive** 自契约文档（读不到即 throw、来源分歧即 throw），两模块内**无代码级版本字面量**，生效值与契约 `01-` L3 声明的 `kb-002.1.2` **一致**。
- **Q3 未被削弱**：分支无条件、无 fixture 白名单；**GOLDEN-001 仍因缺 E3 证据 fail `KB002_DISH_BELOW_E3`，且不含 `KB002_METADATA_INCOMPLETE`** —— 证明其失败属证据不足而非版本缺陷。
- 5 个 ALIGN-01 测试覆盖 `==`/`!=` 两情形且用**真实版本源**，并自带反硬编码守卫。
- 全量 11 条 verify **退出码全 0**；`61/61` + `21/21` + `121/121` = **203 pass / 0 fail / 0 skipped**。
- 生产不变量保持：**production 0 文件**、`QUALIFIED_GOLDEN_COUNT = 0`、`SHORTFALL = 10`、`0 file(s) present`。
- t29 修复完整（`kb-002.1.2` ×17 + `inv_12` 刻意缺失且本意码保留）、t24 保护未破坏（18/18 标记、S/A=0、year 全 null、publisher 唯一 synthetic）。

**限制声明**：本 PASS 仅覆盖上述 12 项。§7 所列**未验证项不得视为通过**；`L2 事实真伪`与外部来源核实本轮**未做**。
