# KB-002 Security / Provenance Gate —— R2 最终独立审查（t40）

| 字段 | 值 |
|---|---|
| **Gate** | `t40` — KB002-SECURITY-R2（§18/§19/§30 步骤 7） |
| **审查人** | `security-wb`（**未参与** t23–t38 任何实现） |
| **基线** | t27 Reviewer Gate 之后的增量：`t29` / ALIGN-02 / `FIX-03(t37)` / `FIX-04(t38)` / `t26` append-only |
| **审查方式** | **只读**；自建探针独立执行；不采信实现报告与 Captain 机器验证结论 |
| **环境** | Node `v24.15.0` | HEAD `6a25f4f` | 分支 `feat/trae-offline-museum` |

## 结论

# PASS

- **§18 十一项确认清单全部通过**
- **22/22 自建探针断言通过**
- **无 blocker、无 high**
- 未发现 provenance 诚信违规、门槛削弱、旁路或测试污染

> 证据分级（用户 §26）：**［实测］** 我亲自执行/构造；**［审阅］** 读取源码；**［推断］** 未直接验证。

---

## 1. §18 十一项确认清单

### (1) test cleanup 无 broad-delete —— ✅ ［实测+审阅］

扫描 `scripts/kb002/**` 全部 `rmSync`/`rmdirSync`/`unlinkSync`/`recursive:true`：

| 位置 | 目标 | 判定 |
|---|---|---|
| `staging-integrity.mjs:397` | `fs.rmSync(tmp,{force:true})`（atomic write 的临时文件，**同目录**、非递归） | ✅ 安全 |
| `workspace.mjs:61` | `fs.rmSync(root,{recursive:true,force:true})`，root = `mkdtempSync` 生成的**唯一**临时目录 | ✅ 安全（只能删自己创建的） |
| `t24-...test.mjs:94` | `cleanup(...rels)` → `abs(r)`，`abs()` 已**工作区感知** | ✅ 安全 |
| `golden-validator.test.mjs:145/238` | 工作区内临时目录 | ✅ 安全 |

**未发现**任何作用于真实数据集、仓库根或未声明宽路径的递归删除。**未发现**通配符清理。

### (2) temp root ownership 安全 —— ✅ ［实测］

`workspace.mjs` 导出 `createWorkspace` / `isInsideWorkspace` / `realGoldenRoot`。实测 **50 次 `createWorkspace()`**：
- **50/50 root 互不相同**，全部位于 `C:\Users\...\AppData\Local\Temp\kb002-ws-*`
- **非 temp 下的 root 数 = 0** —— 不存在落到仓库内的 root
- 由此推导的 **50 个 production 路径也 50/50 互不相同**

归属明确：每个工作区由**创建它的测试实例**持有并清理，`cleanup` 只作用于自身 root。

### (3) test path 不逃逸 temp root —— ✅ ［实测+审阅］

- `goldenRoot()` 解析单一显式覆盖 `KB002_GOLDEN_ROOT`；`resolveDatasetPath()` 集中解析（`validate-golden.mjs:174/178/349` 均基于 `goldenRoot()`）。
- 实测：设绝对路径 → 输出指向该根（`0 file(s) present`）；**设相对路径 → 抛错 fail-loud**（exit 1，错误信息 `KB002_GOLDEN_ROOT must be an absolute path, got "relative/not/absolute"`）。
- 全文仅 **1 处** `path.resolve(REPO_ROOT, …)` 残留：`contract-version.mjs:43` —— 用于读取 **契约文档**（`docs/kb-002/12-/01-/02-`）。**这是正确且必要的**：契约文档是版本推导的唯一事实来源，必须从真实仓库读取，**不是写入逃逸路径**。

### (4) production/staging 不受测试副作用 —— ✅ ［实测］

跑完全部套件（golden-validator 76 用例 + t24 21 用例 + KB-001 121 用例）后实测：

| 项 | 结果 |
|---|---|
| `data/kb/golden/` 生产文件 | **[] （0 文件）** |
| `data/kb/golden/staging/` 内容 | **[] （空）** |
| `staging/manifest.json` | **不存在** |

实现报告所称「`golden-validator.test.mjs` L551+575 与 t24 CASE 1–7 曾写**真实生产根**」的路径**已迁移**，实测无残留。

### (5) manifest schema fail closed —— ✅ ［实测］

**我亲自构造 10 类非法 manifest**，全部 fail-closed：

| 非法形态 | exit | 报 `KB002_MANIFEST_SCHEMA_INVALID` |
|---|---|---|
| 错字段名 `entries` | **1** | ✅ |
| `assets` 缺失 | **1** | ✅ |
| `assets` 为 object | **1** | ✅ |
| `assets` 为 null | **1** | ✅ |
| `assets` 为 string | **1** | ✅ |
| root 为数组 | **1** | ✅ |
| root 为字符串 | **1** | ✅ |
| root 为数字 | **1** | ✅ |
| **非法 JSON** | **1** | ✅ |
| malformed entry（缺 `asset_logical_id`） | **1** | ✅ |

### (6) malformed manifest 不会隐藏 asset loss —— ✅ ［实测］

全部 10 类非法形态均 **exit ≠ 0**，即非法 manifest **更醒目地失败**，而非静默降级为空资产集。修复前该路径为 fail-open（静默 `[]` → exit 0），现已闭合。

### (7) INCIDENT-E 保护继续有效 —— ✅ ［实测］

用**正确 schema + 缺失资产**构造：

| 断言 | 实测 |
|---|---|
| 报 `STAGING_ASSET_MISSING` | ✅ |
| **不含** schema 码 | ✅ |
| exit ≠ 0 | **exit 1** ✅ |

正确 schema + 资产存在且哈希匹配 → **exit 0**（无误报）。正确 schema + 哈希/字节篡改 → `STAGING_ASSET_MODIFIED`。

### (8) fixture provenance 仍诚实 —— ✅ ［实测］

亲自遍历 `data/kb/golden/examples/**` **18 个 fixture**：

| 项 | 实测 |
|---|---|
| `publication_year` 非 null | **0** ✅ |
| `edition_type` 分布 | **`{"unknown": 36}`** ✅（无 `facsimile`） |
| `SOURCE_GRADE` 中 S/A | **0** ✅ |
| fixture 标记 | **18/18** ✅ |
| 真实古籍名（山家清供/随园食单/饮膳正要/东京梦华录/东坡志林/烧尾宴食单/齐民要术）用于 `SourceWork.name` | **0** ✅ |
| URL | **0** ✅ |
| 17 负例逐个退出码 | **17/17 exit 1** ✅ |
| `inv_12.metadata.contract_version` | **`undefined`（刻意缺失未被误修）** ✅ |
| `inv_12` 本意码 | 仍 exit 1 且发 `KB002_METADATA_INCOMPLETE` ✅ |

### (9) placeholder/synthetic 数据不会进入 production —— ✅ ［实测］

- 生产目录文件数 = **0**；`--dataset` 实算 `QUALIFIED_GOLDEN_COUNT = 0` / `SHORTFALL = 10` / `STATUS = EMPTY_GOLDEN_SET`
- 结构夹具单文件显式校验 → **exit 1**，且 `KB002_DISH_BELOW_E3` 阻断

### (10) Q3 不变 —— ✅ ［实测+审阅］

`golden-rules.mjs` **L319** 仍为无条件判定 `best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3')` → L320 `KB002_DISH_BELOW_E3`；无 fixture 白名单/豁免。
决定性实测：显式校验结构夹具 → **exit 1**、codes 含 `KB002_DISH_BELOW_E3`、**不含** `KB002_METADATA_INCOMPLETE`（证明失败原因是**缺 E3 证据**，不是版本缺陷）。

### (11) t26 append-only evidence 未篡改历史 —— ✅ ［实测］

`docs/kb-002/15-security-gate-contract-fix.md`（21,129 B / 362 行）：

| 检查 | 结果 |
|---|---|
| `security-hy` 原结论行 `# 结论：**PASS**` | **仍在** ✅ |
| 原 status / verdict / output | **未被修改**（仅追加） |
| 附录 A 存在 | ✅ |
| 附录是否**追认后续增量**（声称已覆盖 t37/t38 等） | **否** ✅ |

补证明确声明「本报告不追认已修复后的状态」，符合 append-only 语义。

---

## 2. 其余复核项

### 2.1 路径唯一性（机械证据，非「跑 N 次没失败」）—— ✅ ［实测］

- 50 次 `createWorkspace()` → **50/50 root 唯一**
- 50 个 production 路径 → **50/50 唯一**
- **0** 个 root 落在仓库内（全部在 OS Temp）
- 递归扫描 `scripts/**`：`test-concurrency` / `runInBand` 命中 **0 处** → **未使用串行化掩盖并发缺陷**

> 这与我在 t26 独立发现的根因（9 处共用同一固定路径 `staging/golden_001.kb.json`）一致：FIX-03 以**工作区隔离**而非串行化修复，方向正确。

### 2.2 §27 DEFERRED 未被顺手修 —— ✅ ［实测］

`KB002-DERIVE-STATUS-BOUNDS` **仍未被修复**：
- `validate-golden.mjs:99` `const MAX_TARGET = 10;`、`:406` `deriveDatasetStatus(golden.qualifiedGoldenCount, MAX_TARGET)`
- grep `Number.isInteger` / `> MAX_TARGET` 边界校验 → **未新增**
- 未发现任何非整数 / 超上界 TARGET 的防御性校验被顺手加入

### 2.3 套件稳定性（我于 t26 曾发现非确定性）—— ✅ 现已稳定 ［实测］

| 套件 | 3 次连跑退出码 | tests / pass / fail |
|---|---|---|
| `golden-validator.test.mjs` | `0,0,0` | **76 / 76 / 0** |
| `t24-admission-and-integrity.test.mjs` | `0,0,0` | **21 / 21 / 0** |

相比 t26 快照时 t24 的 **6 次中 1 次失败（pass 17 / fail 4）**，FIX-03 后**未再复现**。

### 2.4 KB-001 回归与门禁 —— ✅ ［实测］

| 命令 | exit |
|---|---|
| `validate-golden.mjs --integrity` | **0** |
| `validate-golden.mjs --dataset` | **0** |
| `validate-kb-schema.mjs` | **0** |
| `verify_graph_schema.mjs` | **0** |
| `verify_literature_dataset.mjs` | **0** |
| KB-001 四套件 | **0**（tests 121 / pass 121 / fail 0） |
| `git status`（V1 路径） | **0 条** |

`data/kb/generated/` 真实产物**未被触碰**：`kb-v2.kb.json` sha `31a94b69d258…`、`adaptation-report.json` sha `0fb248059552…`。

### 2.5 产物真实落盘（mtime 证据）—— ✅ ［实测］

| 文件 | 大小 | mtime (UTC) |
|---|---|---|
| `scripts/kb002/lib/staging-integrity.mjs` | 15,835 B | `2026-10-10T12:13:28Z` |
| `scripts/kb002/validate-golden.mjs` | 19,728 B | `2026-10-10T11:59:53Z` |
| `scripts/kb002/lib/golden-rules.mjs` | 29,776 B | `2026-10-10T09:02:57Z` |
| `scripts/kb002/lib/contract-version.mjs` | 3,685 B | `2026-10-10T08:57:06Z` |
| `scripts/kb002/__tests__/workspace.mjs` | 3,025 B | `2026-10-10T12:20:45Z` |

**全部真实存在于磁盘**，非「文档先行、实现未落盘」。

---

## 3. Findings

**无 blocker、无 high、无 medium。**

以下为**非阻断观察项**（记录，不需修复）：

| id | severity | 内容 |
|---|---|---|
| OBS-T40-01 | low | `contract-version.mjs:43` 的 `path.resolve(REPO_ROOT, …)` 是**契约文档**读取路径（唯一事实来源，必须读真实仓库），**非写入逃逸**。实现报告称「残留 0」在**写入/数据集解析**语境下正确；此处残留属**设计必要**，建议文档澄清措辞以免后续审查误判为逃逸。 |
| OBS-T40-02 | low | `KB002-DERIVE-STATUS-BOUNDS` 仍为 DEFERRED（符合 §27）。若未来 TARGET 变为可配置，非整数/超上界输入需边界校验。 |
| OBS-T40-03 | low | 我于 t26 快照发现的两项缺陷（`SEC-T26-01` 测试共用固定路径、`SEC-T26-02` manifest fail-open）均已由 `FIX-03`/`FIX-04` 修复，本次**独立复验通过**。 |

---

## 4. 未验证项（**不得当作通过**）

| 项 | 原因 |
|---|---|
| symlink / junction 绕过 | 未构造（Windows 需特权） |
| 并发竞态 | 未构造（本次以 3 次连跑间接观察，未做受控压力测试） |
| 磁盘写满 / 权限拒绝 | 未构造 |
| 超大输入 | 未构造 |
| 跨平台原子性（`fsync`/`rename` 语义） | 仅 Windows 验证 |
| L2 外部来源真实性 | `web_search` 无 API key |

**INCIDENT-E 正式根因仍为 `UNKNOWN`**（`CORRELATION_ONLY`，**不归责**任何成员）。
**test path isolation defect = CONFIRMED；nondeterministic failure causation = NOT PROVEN**。本次为**独立复验状态**，不声称已证明因果。

---

## 5. 范围合规自证

- 唯一写入：`docs/kb-002/21-security-r2.md`
- 未修改任何实现、测试、数据、配置或他人报告
- 探针置于 `tmp/` 并**在报告前清理**；实测 `tmp/t40-*` 残留 **0**、`staging` 为空、生产根 **0 文件**
- **未触碰** `data/kb/generated/` 真实产物（哈希前后一致）
- **未读取或输出**任何 `.env` 值
- 未提交、未推送、未合并

---

## 6. 对下游

- 本 PASS **不替代** Reviewer 独立裁决。
- **生产不变量**：`production file count = 0`、`QUALIFIED_GOLDEN_COUNT = 0`、`SHORTFALL = 10`、`STATUS = EMPTY_GOLDEN_SET`。本任务**无权 promotion**。
- §18 十一项确认清单与 fail-closed 行为均已由 Security **独立复现**，可作为 KB-002 收口证据。
