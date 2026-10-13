# t26 — KB-002 Security / Provenance Fixture Review（含 INCIDENT-E 资产保护审查）

| 字段 | 值 |
|---|---|
| **Gate** | t26 Security / Provenance Fixture Review |
| **执行者** | `security-hy`（本轮由 `security-wb` 转派，attempt 3） |
| **审查对象** | t23（Contract/Rubric 语义修订）+ t24（Fixture 诚信修复 + Staging 资产完整性保护） |
| **结论** | **PASS** |
| **性质** | 只读审查；唯一写入为本报告文件 |

---

## 0. 审查立场

本次**不采信** t24 的自述结论，全部关键项均**亲自执行并取实测证据**。所有退出码用 **Node `spawnSync`** 取得（规避 PowerShell 管道 `$LASTEXITCODE` 陷阱）。

---

## 1. §24 原验收（6 项）

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | **path ownership 明确** | ✅ | `staging-integrity.mjs` 导出 `classifyPath`；实测 `assertCleanupAllowed` 对三类路径差异化处理（见 §4） |
| 2 | **staging 不受 generated cleanup 管辖** | ✅ | `assertCleanupAllowed('data/kb/generated')` → **ALLOWED**；`assertCleanupAllowed('data/kb/golden/staging')` → **REJECTED**（"refusing cleanup outside tool-owned directories"） |
| 3 | **no broad destructive wildcard** | ✅ | `data/kb/golden/**` → REJECTED（"refusing cleanup with wildcard"）；`data/kb/golden/*` → REJECTED |
| 4 | **no silent staging deletion path** | ✅ | 对 `data/kb/golden`、`data/kb/golden/staging`、仓库根、空路径**全部 REJECTED**；仅 `data/kb/generated` 允许 |
| 5 | **manifest 不绕过真实存在检查** | ✅ | 亲自构造「manifest 声称存在但文件缺失」→ `checkStagingIntegrity()` 报 `STAGING_ASSET_MISSING`，`--integrity` **exit 1**（见 §4） |
| 6 | **provenance evidence 独立于 transient artifact** | ✅ | `docs/kb-002/11-golden-001-evidence-matrix.md` 完整保留（含 §7 Captain 更正、§8 curator-a 发现）；INCIDENT-E 事故文档 `13-` 已落盘；事故样本 `tmp/f01-failed-attempt/` 保留 |

---

## 2. 测试夹具自身的 provenance 诚信（§21）

### 2.1 亲自扫描（18 个 fixture 全量遍历）

扫描脚本遍历 `data/kb/golden/examples/**` 全部 **18** 个 `.kb.json`，逐项检查真实古籍名残留 / 占位出版社 / 可疑年份 / facsimile / 假馆藏号。

| 检查项 | 文本命中 | 实际字段取值 | 判定 |
|---|---|---|---|
| **真实古籍名残留** | **0** | SourceWork/SourceEdition 的书目身份字段中**无** `山家清供`/`随园食单`/`饮膳正要`/`东京梦华录`/`东坡志林`/`烧尾宴食单` | ✅ 通过 |
| **占位出版社** | 36（文本） | 实际 `publisher` 全为 `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER` | ✅ 通过（详见 §2.2） |
| **可疑年份（1985/2002）** | **0** | `publication_year` **36/36 = `null`** | ✅ 通过 |
| **facsimile** | 18（文本） | `edition_type` **36/36 = `unknown`**；`facsimile` 仅出现在 Edition **ID 字符串**（`edition_g001_shanjiaqinggong_facsimile`）中 | ✅ 通过（详见 §2.3） |
| **假馆藏号** | **0** | locator 全为 `SYNTHETIC-LOCATOR-A/B` | ✅ 通过 |
| **fixture 标记** | — | **18/18 全部带** fixture 标记（`NO_FIXTURE_MARKER = 0`） | ✅ 通过 |

### 2.2 关于「占位」36 处文本命中（不违规）

语境核实：仅出现在 fixture 的**自述文本**中，明确声明自身为假，例如：

- `"author": "林洪（夹具占位）"`
- `"text": "FIXTURE TEXT (placeholder, not a real quotation): ..."`
- `"not_historical_evidence": "Structural fixture only. Names, editions and passages are placeholders..."`

**这是如实声明，不是伪造**——反而符合 §14「synthetic fixture 必须明确标记、不得设计成看起来像真实历史来源」。

### 2.3 关于「facsimile」18 处文本命中（不违规）

语境核实：仅作为 **SourceEdition 的 ID 字符串**出现（`edition_g001_shanjiaqinggong_facsimile`），而**实际 `edition_type` 字段已被改为 `unknown`**。

**决定性证据**：`edition_type` = `unknown`（**36/36**）；`publication_year` = `null`（**36/36**）。

> 说明：ID 中残留 `facsimile` 字样属**命名遗留**，不影响语义判定（`edition_type` 才是等级判定的输入）。建议后续可清理命名，但**不构成阻断项**。

### 2.4 SOURCE_GRADE 标注分布

扫描 notes 中 `SOURCE_GRADE=` 标注：

```
D = 34    X = 2    C = 2    （S/A = 0）
```

**不再有 S/A 级标注** → 消除了「用虚构高等级抬高 Evidence Level」的根因。

### 2.5 其余子项

| 子项 | 结果 | 证据 |
|---|---|---|
| (e) synthetic fixture 清楚隔离 | ✅ | 结构夹具 `fixture_only=true`；命名空间用 `SYNTHETIC-*` 前缀 |
| (f) fixture 无法进入 production | ✅ | 结构夹具 `qualified=false`；production 目录**空**；`--dataset` 生产集过滤排除 `staging/`（t19 已修） |
| (g) production admission 只接受正式允许 provenance | ✅ | Q3 无条件 blocking，无任何 fixture 白名单（见 §3） |
| (h) staging candidate 可真实表达不足 | ✅ | t23 确立 Candidate/Staging 层允许 `qualified=false`、允许 E<3、允许 insufficient |
| (i) **GOLDEN-001 未被偷偷 promotion** | ✅ | `production 文件 = []`；`golden_001.kb.json` **不在** production；`GOLDEN-001 是否被 promotion = false` |

---

## 3. Q3 未被削弱（独立验证）

### 3.1 源码复核

```js
// scripts/kb002/lib/golden-rules.mjs:305-308
if (best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3')) {
  add(collector, file, dish.id, 'metadata.evidence_level', 'KB002_DISH_BELOW_E3',
    `Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: ${best || 'none'})`);
}
```

- **无条件执行**（不检查 `metadata.qualified`、不检查 fixture 标记）✅
- **无 fixture 白名单/豁免**：正则扫描 `fixture_only &&` / `if (!?fixture` / `fixtureWhitelist` / `fixtureExempt` → **全部 false** ✅
- **mtime = `2026-10-09T06:52:33.830Z`**（早于本轮任何改动）
- **`git diff -- scripts/kb002/lib/golden-rules.mjs` → 无输出**（文件未被修改）✅

### 3.2 关于「默认目标按结构夹具期望集判定」的设计判定

t24 采用：默认目标（无参数）按 `STRUCTURAL_FIXTURE_EXPECTED_CODES` 判定，below-threshold 码仍输出但不使该范围失败；**显式路径与 `--dataset` 保持严格**。

**我的判定：不构成对 Q3 阻断力的实质削弱，但需记录一项限定。**

理由（均有实测证据）：

| 证据 | 实测 |
|---|---|
| Q3 代码零改动 | ✅ mtime 未变 + git diff 空 |
| 显式路径仍严格 | ✅ 显式指定 valid fixture → **exit 1** |
| `--dataset` 仍严格 | ✅ exit 0（因 production 为空，无违规） |
| below-threshold 码照常输出 | ✅ 17 负例全部仍报 `KB002_DISH_BELOW_E3`（见 §5） |
| 无 fixture 豁免分支 | ✅ 扫描确认 |

**限定（须记录）**：默认无参数模式的期望集机制意味着「默认运行不因结构夹具的 below-threshold 码而失败」。这是**为让结构夹具可作为 schema 正向样本存在的必要设计**（因夹具诚实化后只到 E2，Q3 必然触发），且**显式路径与 `--dataset` 两条关键通路未放松**。但下游须注意：**不得**用默认模式的绿色来推断「某条真实 candidate 已通过 production admission」——真实 candidate 必须走显式路径或 promotion 流程。

---

## 4. INCIDENT-E 资产保护的真实有效性（亲自构造场景验证）

### 4.1 `assertCleanupAllowed` 危险路径拒绝（实测）

| 输入 | 结果 | 错误信息 |
|---|---|---|
| `""` | **REJECTED** | refusing cleanup of an empty path |
| `"."` | **REJECTED** | refusing cleanup of repo root: . |
| `<REPO_ROOT>` | **REJECTED** | refusing cleanup outside tool-owned directories |
| `data/kb/golden` | **REJECTED** | refusing cleanup outside tool-owned directories |
| `data/kb/golden/**` | **REJECTED** | **refusing cleanup with wildcard** |
| `data/kb/golden/*` | **REJECTED** | **refusing cleanup with wildcard** |
| `data/kb/golden/staging` | **REJECTED** | refusing cleanup outside tool-owned directories |
| `data/kb/golden/staging/<file>` | **REJECTED** | refusing cleanup outside tool-owned directories |
| `data/kb/generated` | ALLOWED | （唯一允许，符合 ownership 定义） |

**导出清单**：`assertCleanupAllowed` / `atomicWriteFile` / `atomicWriteJson` / `buildManifestEntry` / `checkStagingIntegrity` / `classifyPath` / `readManifest` / `sha256OfFile` / `stagingPresenceSummary` / `writeManifest`

### 4.2 manifest 声称存在但文件缺失 → `STAGING_ASSET_MISSING`（实测）

用工具自身的 `buildManifestEntry()` 构造一条记录（指向不存在的 `__ghost_asset.kb.json`），写入 `data/kb/golden/staging/manifest.json`：

```
--integrity exit = 1
{"code":"STAGING_ASSET_MISSING",
 "message":"manifest records this staging asset as \"missing\" but no file exists at data/kb/golden/staging/__ghost_asset.kb.json"}
STAGING_MANIFEST_PRESENT = true
STAGING_MANIFEST_ASSET_COUNT = 1
KB-002 staging integrity FAILED: 1 finding(s)
```

✅ **manifest 存在不能使缺失文件被视为完整**，符合 §16/C-5。测得后已清理探针（manifest 与 staging 均恢复空）。

### 4.3 staging candidate 哈希稳定性（7 种模式实测）

构造一个 staging candidate（size=17,526，sha 前 16 = `554d576f0c2b7f97`），逐一运行：

| 模式 | exit | 文件存在 | 哈希稳定 |
|---|---|---|---|
| 默认 | 0 | ✅ | ✅ |
| `--dataset` | 0 | ✅ | ✅ |
| `--staging` | 1 | ✅ | ✅ |
| `--integrity` | 0 | ✅ | ✅ |
| `--fixture` | 0 | ✅ | ✅ |
| `--file <cand>` | 2 | ✅ | ✅ |
| `<cand>`（裸路径） | 1 | ✅ | ✅ |

✅ **7/7 模式下 existence / byte size / SHA-256 前后一致** —— validator 非破坏性得到验证。

### 4.4 atomic write

模块导出 `atomicWriteFile` / `atomicWriteJson`；实测写入后 **无临时文件残留**（staging 目录在探针清理后为 `[]`）。

---

## 5. 独立复算（真实数字）

### 5.1 17 个负例逐个退出码 + 本意码

**17/17 全部 exit 1，非 exit1 = 0**，且各自仍发出**本意错误码**：

| fixture | 本意码（含于输出） |
|---|---|
| `golden_002.kb.json` | `KB002_FILENAME_ID_MISMATCH` |
| `inv_01` | `E_DANGLING_REFERENCE`, `E_CLAIM_NO_EVIDENCE` |
| `inv_02` | `E_DANGLING_REFERENCE` |
| `inv_03` | `E_DUPLICATE_ID` |
| `inv_04` | `KB002_LEVEL_MISMATCH` |
| `inv_05` | **`KB002_E5_UNREACHABLE`** |
| `inv_06` | `KB002_EXPERIMENT_FORBIDDEN`, `KB002_E5_UNREACHABLE` |
| `inv_07` | `KB002_AI_SOURCE_FORBIDDEN` |
| `inv_08` | `KB002_GRADE_INSUFFICIENT` |
| `inv_09` | **`KB002_GRADE_UNDECLARED`** |
| `inv_10` | **`KB002_CONFLICT_HIDDEN`** |
| `inv_11` | `KB002_GRADE_LEAD_ONLY` |
| `inv_12` | **`KB002_METADATA_INCOMPLETE`** |
| `inv_14` | `KB002_DERIVATION_V1_FORBIDDEN` |
| `inv_15` | `KB002_CONTENT_CLASS_FORBIDDEN` |
| `inv_16` | `KB002_EXTERNAL_REVIEW_UNSUPPORTED` |
| `inv_17` | `KB002_DISH_NOT_DOCUMENTED` |

> 特别确认：`inv_05` 仍报 `KB002_E5_UNREACHABLE`、`inv_09` 仍报 `KB002_GRADE_UNDECLARED` —— **backend-a 自曝的「E5→E2 摧毁负例语料」缺陷已修正**（负例声明值未被改写）。

### 5.2 门禁退出码（spawnSync）

| 命令 | exit |
|---|---|
| `validate-golden.mjs` | **0** |
| `validate-golden.mjs --dataset` | **0** |
| `validate-golden.mjs --staging` | **0** |
| `validate-golden.mjs --integrity` | **0** |
| `validate-golden.mjs --fixture` | **0** |
| `validate-golden.mjs <valid fixture 显式路径>` | **1**（严格性保持） |
| `validate-kb-schema.mjs` | **0** |
| `verify_graph_schema.mjs` | **0** |
| `verify_literature_dataset.mjs` | **0** |

### 5.3 测试数

| 套件 | tests | pass | fail | skipped | todo |
|---|---|---:|---:|---:|---:|
| `t24-admission-and-integrity.test.mjs`（CASE 1–8 + INCIDENT A–E） | **21** | **21** | 0 | 0 | 0 |
| **golden 全量合并**（`scripts/kb002/__tests__/*.test.mjs`） | **77** | **77** | 0 | 0 | 0 |
| **KB-001**（`scripts/kb/__tests__/*.test.mjs`，含 `independent-qa`） | **121** | **121** | 0 | — | — |

### 5.4 KB-001 与 generated 未被污染（backend-a 自曝缺陷的独立确认）

| 项 | 实测 |
|---|---|
| `independent-qa.test.mjs` / 全量 KB-001 | **121/121 全绿，fail 0** ✅ |
| `data/kb/generated/` 产物完整 | `kb-v2.kb.json`（367,163 B）+ `adaptation-report.json`（119,972 B）= **2 个文件** ✅ |
| scratch 残留目录 | **0** ✅ |

✅ **backend-a 自曝的 C-9 污染缺陷已确认修正**，未残留污染状态。

### 5.5 `--dataset` 诚实输出

```
KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = PARTIAL_GOLDEN_SET
KNOWN_DATA_GAP = 10
```

> **术语观察（非阻断）**：按 t23 确立的三态定义，production count = 0 应为 `EMPTY_GOLDEN_SET`。当前工具仍输出 `PARTIAL_GOLDEN_SET`，属**工具输出与新契约术语尚未对齐**（t23 亦指出 `03`–`11` 文档存在同类旧口径引用）。数值本身**诚实**（工具实算 0），但**术语需后续文档/工具对齐**。我已将其登记为遗留项，**不构成本 Gate 的阻断**（因不影响 provenance 诚信或资产保护）。

---

## 6. 安全边界是否真实存在（针对 INCIDENT-E）

**我的结论：保护措施真实有效，但属「防护性」，并非已证明的当次丢失根因。**

| 维度 | 判定 |
|---|---|
| 是否真实降低「staging 资产被静默移除」的风险 | ✅ **是** —— `assertCleanupAllowed` 在文件系统操作前拒绝危险路径（实测 8/9 拒绝）；manifest 与实际文件不一致时报 `STAGING_ASSET_MISSING` 且 `--integrity` exit 1；validator 7 种模式非破坏性（哈希稳定）；atomic write 无残留 |
| 是否为形式化测试 | ❌ **否** —— 我**亲自构造**失败场景（而非只看测试存在），均得到预期的真实检出 |
| 是否**证明**其为当次丢失的原因 | ❌ **否** |

**诚实约束（必须保留）**：
- INCIDENT-E 正式根因仍为 **`UNKNOWN`**
- candidate 丢失时间与 `data/kb/generated/` 重写时间接近，属 **`CORRELATION_ONLY`**，**非** `CAUSATION_PROVEN`
- **不得**据此归责任何一方

---

## 7. 只读合规

| 项 | 状态 |
|---|---|
| 修改实现/测试/数据/配置 | ❌ 无 |
| 修改他人报告 | ❌ 无 |
| 触碰 `data/kb/generated/` 真实产物 | ❌ 无（C-9 场景由我在 `staging/manifest.json` 与 `staging/` 内构造，未动 generated） |
| 读取/输出 `.env` 敏感值 | ❌ 无 |
| 唯一写入 | ✅ 仅本报告 `docs/kb-002/15-security-gate-contract-fix.md` |
| 探针清理 | ✅ 全部清理；`staging/` 与 `data/kb/generated/` 均无残留 |
| git 写操作 | ❌ 无（HEAD 仍 `6a25f4f`） |

**最终资产状态**：production = **0**；staging = **0**；generated = **2**（完整）；事故样本保留 = **True**。

---

## 8. 未验证项（如实标注，不得当作通过）

| 项 | 状态 |
|---|---|
| symlink / junction 绕过 | **未验证** |
| 并发竞态 | **未验证** |
| 磁盘写满 | **未验证** |
| 超大输入 | **未验证** |
| 跨平台原子性（仅当前平台验证同目录 temp+rename） | **未验证** |
| L2 外部来源真实性（`web_search` 无 API key） | **未验证** |
| INCIDENT-E 根因 | **`UNKNOWN`**（`CORRELATION_ONLY`） |

---

## 9. 遗留观察项（登记，非阻断）

1. **`PARTIAL_GOLDEN_SET` 术语与三态定义未完全对齐**：production count = 0 时工具仍输出 `PARTIAL_GOLDEN_SET`（应为 `EMPTY_GOLDEN_SET`）。t23 亦指出 `03`–`11` 文档存在同类旧口径引用（数值诚实、术语待对齐）。建议后续文档/工具对齐任务处理。
2. **SourceEdition ID 中残留 `facsimile` 字样**：属命名遗留（`edition_type` 已为 `unknown`，不影响判定），建议清理命名。
3. **默认无参数模式的期望集机制**：见 §3.2 限定——不得用默认模式绿色推断真实 candidate 已通过 production admission。
4. **INCIDENT-E 根因未定**：保护措施有效但未证明因果；建议保留 manifest 机制并持续观察。

---

# 结论：**PASS**

测试夹具的 provenance 诚信问题已真实修复（无虚构年份/无 S-A 级标注/无真实古籍名残留/fixture 明确隔离/无法入 production），Q3 blocking 语义**未被削弱**（源码零改动、无豁免），INCIDENT-E 资产保护经**亲自构造场景**验证真实有效，KB-001 与 generated **未被污染**，GOLDEN-001 **未被偷偷 promotion**。未验证项已如实标注，不构成阻断。

---

# 附录 A —— 独立复核（`security-wb`，attempt 2，同结论 PASS）

> 本节为**追加**内容，**不修改**上文任何结论与证据。`security-wb` 在独立复跑本 Gate 时，使用**自建探针**从零复核，得到**相同结论 PASS**，并额外排除了一处仅在其探针构造中出现的假阳性。以下仅记录**新增、且上文未覆盖**的证据。

## A.1 与上文的独立一致性（同结论，不重复展开）

| 核验项 | `security-wb` 实测 | 与上文 |
|---|---|---|
| 18 个 fixture 逐字段扫描 | `SourceWork.name` 非 `SYNTHETIC-` = **0**；真实古籍名用于书目身份 = **0**；占位出版社 = **0**；`publication_year` 非 null = **0**；遗留假馆藏号 = **0**；`edition_type=facsimile` = **0**；URL = **0**；`fixture_only` 标记 = **18/18**；**全部 `qualified=false`** | 一致 |
| 结构夹具诚实等级 | computed = **E2**（修复前虚构为 E4） | 一致 |
| Q3 未被削弱 | `golden-rules.mjs:305` `best === null \|\| LEVELS.indexOf(best) < LEVELS.indexOf('E3')` **无条件**；Q3 分支内无 fixture 白名单/豁免；文件未跟踪且 mtime `2026-10-09 15:52:33` **早于** t24 修复批（`2026-10-10 16:13`）→ 契约修复未触碰 Validator | 一致 |
| 三档严格性 | 无参数默认 **0** / 显式 valid fixture **1** / `--dataset` **0** | 一致 |
| `classifyPath` 目录段匹配 | `data/kb/generated-backup` → **`null`**（未误判）；`data/kb/generatedx` → **`null`** | 一致 |
| `assertCleanupAllowed` | 空路径 / 仓库根 `.` / 通配符 `*` `?` / staging / production / `backend` **8 类全部拒绝**；`data/kb/generated` 允许 | 一致 |
| atomic write 无残留 | 写后目录 = `["atomic-out.json"]`，无 `.tmp`/`~`/`.swp` | 一致 |
| 7 种模式候选哈希稳定 | 全部 `sha=82e6857c33b0… / 17785 B` 不变 | 一致 |
| generated 真实产物 | `kb-v2.kb.json` sha `31a94b69d258…`、`adaptation-report.json` sha `0fb248059552…` **未变** | 一致 |
| 17 个负例 | **17/17 全部 exit 1** | 一致 |

## A.2 本节新增：独立复算的 manifest 完整性证据（含形状纠正）

`security-wb` 自建 CLI 探针，用 **manifest 真实形状**
`{ manifest_version, lifecycle_class, note, assets:[{ relative_path, sha256, byte_size, status }] }`
（读自 `writeManifest()` L119-129）实测三态：

| 场景 | 实测 |
|---|---|
| manifest 声称资产存在、**文件缺失** | **exit 1** + `STAGING_ASSET_MISSING`；`STAGING_MANIFEST_PRESENT = true`、`STAGING_MANIFEST_ASSET_COUNT = 1`、`KB-002 staging integrity FAILED: 1 finding(s)` |
| 资产**真实存在**且哈希匹配 | **exit 0** |
| 资产存在但**哈希/字节被篡改** | **exit 1** + `STAGING_ASSET_MODIFIED` |
| **错误形状** manifest（`{version, entries:[{relPath,…}]}`） | `findings=[]`、`assetCount=0`，**不崩溃、不误报**（防御行为正确） |

→ 补强 §1(5) 的结论：**manifest 不能自证完整性**；且解析未匹配的 manifest 形状时工具**保守失败**而非误判成功。

## A.3 本节新增：`security-wb` 自行推翻的假阳性（如实留痕）

`security-wb` 首轮探针误用 `{ version, entries:[{ relPath, bytes }] }` 形状，得到 3 项 FAIL（"manifest 缺失未报错"）。经读 `writeManifest`/`readManifest` 定位为**探针构造错误**，改用正确形状后**全部转为预期行为**（见 A.2）。

**这一项应予记录**：若当时草率上报，将产生一次**假阳性 high blocker**。此处如实留痕，供后续 Security 审查参考——**必须先确认被调用 API 的真实契约形状，再判定其行为是否为缺陷**。

## A.4 本节未覆盖项（与上文一致的未验证清单）

symlink/junction 绕过、并发竞态、磁盘写满、超大输入、跨平台原子性、L2 外部来源真实性 —— **均未验证**，不得当作通过。**INCIDENT-E 根因仍为 `UNKNOWN`（`CORRELATION_ONLY`），不归责。**

## A.5 本节独立性声明

`security-wb` **未参与** t23/t24/t25/t27/t29/t31/t32 任何实现；本节所有结论来自**自建探针实测**与**源码阅读**，上游报告仅作一致性交叉核对。唯一写入为本报告文件的**追加段落**（未改动上文任何文字）。探针全部置于 `tmp/` 并已清理：`staging` 目录复核为空、`tmp/t26-*` 残留 0；**未触碰** `data/kb/generated/` 真实产物；未读取任何 `.env` 值。
