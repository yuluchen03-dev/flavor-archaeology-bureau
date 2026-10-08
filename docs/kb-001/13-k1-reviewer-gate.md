# K1 Reviewer Gate — 独立复审结论

- 任务：t15 / K1-REVIEWER-GATE
- 审查对象：t12（FIX-KB-001-K1）、t13（K1-QA）、t14（K1-Security-Gate）
- 审查人：reviewer-k1（未参与 K1 实现）
- 审查方式：**自行读码 + 自建实测**，不转述上游结论
- 唯一写入：本文件

---

## 1. 结论

# PASS

K1（medium）**已真正修复**。仓库边界校验基于 canonical resolved path，非字符串前缀；越界退出码 2、零文件系统副作用；无无关重构；V1 数据零改动；Adapter 原行为未破坏；失败路径测试有效且门槛未降低；KB-001 原门禁全绿。

**无 blocker、无 high。** 5 项非阻塞观察（第 9 节）。

> **边界声明**：本 PASS 仅为 DSH 团队内部审查结论。**KB-001 是否 CLOSED 由 Captain Release Gate 判定，本报告不宣布 CLOSED。**
> 就 K1 项而言：**本 PASS 满足用户列出的 KB-001 CLOSED 条件中的「K1 PASS」一项**（第 11 节）。

---

## 2. 审查方法与独立性声明

| 项 | 事实 |
|---|---|
| Reviewer 是否参与实现 | **否**（t12 由 backend-k1 实施） |
| 是否仅转述上游报告 | **否** —— 全部结论来自自行读码与自建实测；上游报告仅用于交叉核对 |
| 允许写入 | 仅本文件（`git status` 与实现文件 mtime 见第 3.2 节） |
| 临时产物 | 仅使用 `cmd 2>` 重定向到 `tmp/`（gitignored）并在用后删除；未新增任何仓库文件 |

**我实际执行的检查**：读 `scripts/kb/adapt-v1-to-v2.mjs` 边界守卫源码；直接运行适配器 14 次覆盖合法/非法 `--out`；用 `cmd /c` 重定向捕获**程序原始 stderr**（避免 PowerShell `NativeCommandError` 修饰污染）；复跑 5 条 KB-001 原门禁；逐测试文件统计用例数；对 `independent-qa.test.mjs` 做断言计数、负例关键字检索、`os.` 残留检查、以及抽取 43 个用例名与 QA 报告基线清单逐一比对；用 `Get-FileHash` 验证确定性与 13 个 V1 输入只读性。

**一处工具陷阱（影响结论可信度，特此记录）**：PowerShell 的 `2>&1` 与 `2> file` 会把原生命令的 stderr 包装成 `NativeCommandError` 记录，并**附加包含行号与命令文本的上下文**，导致两次相同运行的输出**不逐字节相等**。首次比对得出「不相同」的假象。改用 `cmd /c "... 2> file"` 捕获**原始 stderr** 后，确认逐字节相同（第 4.2 节）。任何在此仓库断言 stderr 稳定性的成员都必须避开该陷阱。

---

## 3. 用户强制 7 项重点逐项判定

### 3.1 K1 是否真正修复 —— ✅ 通过

| 证据 | 位置 / 命令 |
|---|---|
| 边界判定基于 `path.relative`，**非** `startsWith` | `scripts/kb/adapt-v1-to-v2.mjs:1274-1277` |
| 代码注释显式写明为何不用 `startsWith`（兄弟目录误判 / 不感知分隔符 / 不感知 Windows 大小写 / 换根时返回绝对路径） | `:1265-1273` |
| canonical 层：对现存最深祖先做 `realpathSync` 并与 `realpathSync(REPO_ROOT)` 比较 | `:1280-1288`（`deepestExistingAncestor`）、`:1299-1318`（`checkOutDir` 双层） |
| 校验调用位于 `snapshotReadonlyInputs()` 与 dry-run 分支**之前** | `:1333`（校验）→ `:1339`（snapshot） |
| 失败信息为固定串，无绝对路径/时间戳/随机量 | `:1296` `OUT_ESCAPE_REASON`、`:1297` `OUT_CANONICAL_REASON` |
| 实现无 `startsWith` 边界判定 | 全文件检索确认边界判定仅走 `path.relative` |

`deepestExistingAncestor` 以 `parent === current` 终止，无死循环（`:1284-1285`）。

### 3.2 是否出现无关重构 —— ✅ 未出现

| 证据 | 结果 |
|---|---|
| 未被授权的实现文件 mtime | `validate-kb-schema.mjs` 15:49:26 ／ `lib/validate.mjs` 18:05:58 ／ `lib/schema.mjs` 15:48:42 ／ `lib/errors.mjs` 15:48:42 ／ `lib/adapt/mapping.mjs` 18:33:00 ／ `data/kb/schema/kb-schema.v2.json` 15:48:13 —— **全部早于** K1 修复（约 23:19+） |
| K1 变更集（`git status` 核对） | 仅 `scripts/kb/adapt-v1-to-v2.mjs`、`scripts/kb/__tests__/{adapter-out-boundary,k1-qa-boundary,independent-qa}.test.mjs`、`docs/kb-001/01-schema-contract.md`、`docs/kb-001/{11,12}-*.md` |
| 越界目标残留 | `../outside`、`../../outside`、`D:\kb-rk1-outside`、`C:\Windows\Temp\kb-rk1`、`<parent>\风味考古局-RK1-EVIL` —— **全部不存在** |

### 3.3 是否改变 V1 数据 —— ✅ 未改变

| 证据 | 结果 |
|---|---|
| `git status --untracked-files=all -- data/knowledge_graph data/recipes data/fragments data/literature` | **条目数 = 0** |
| 一次真实适配运行前后 13 个 V1 输入文件 SHA-256 | **changed = 0 / 13** |

### 3.4 是否破坏 Adapter 原行为 —— ✅ 未破坏

| 行为 | 我的实测 |
|---|---|
| 确定性：重跑后哈希 | `kb-v2.kb.json` = `31A94B69D25800CA…`、`adaptation-report.json` = `0FB24805955278E2…`，**与修复前记录完全一致** → 本次只增加 CLI 守卫，未改变产物 |
| 幂等 | entities=282、**dupIds=0**；relations=214、**dupTriples=0** |
| 只读 | 见 3.3，changed = 0/13 |
| `--out` 缺值 | 退出 **2** |
| 未知参数 | 退出 **2** |
| `--dry-run` | 退出 **0**，不创建目录、不写文件 |
| 适配不变量 | `SourcePassage` 分布 `{ambiguous:16, unresolved:3}`（**resolved 0**）；`passage_in_edition` = **0**；字面量 `"verified"` = **0** |

### 3.5 是否存在字符串前缀校验漏洞 —— ✅ 不存在

**实现层**：`escapesRoot` 用 `path.relative(root, candidate)`，`path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)`（`:1274-1277`）。
该判定同时覆盖：`..` 穿越、仓库外绝对路径、换盘符、UNC（后两者使 `path.relative` 返回绝对路径）。`path.relative` 在 Windows 上感知大小写与分隔符。

**实测层（严格区分两类路径）**：

| 类别 | 用例 | 边界位置 | 期望 | 实测 |
|---|---|---|---|---|
| (a) 前缀相同的**同级兄弟目录** | `../风味考古局-RK1-EVIL` | 边界**外** | 拒绝 2 | **2** ✅ 且未创建 |
| (b) 边界**内**合法子目录 | `data2` | 边界**内** | 接受 0 | **0** ✅ |

**明确记录**：(b) 返回 0 是**正确行为**，**不是缺陷**。`data2` 仅用于说明「为何不能只用不带分隔符的 `startsWith(root)`」——若 root 为 `…/data`，则 `…/data2` 会被字符串前缀测试误判为落在 root 内。真正的逃逸用例由 (a) 证伪。此点与 t13 QA 的 F1 观察一致。

### 3.6 测试是否覆盖失败路径 —— ✅ 覆盖且断言有效

| 核查 | 结果 |
|---|---|
| 总量 | **121 tests / 121 pass / 0 fail / 0 skipped / 0 todo** |
| 逐文件 | `validate-kb-schema` **45** ／ `independent-qa` **43** ／ `adapter-out-boundary` **16** ／ `k1-qa-boundary` **17** |
| 既有基线未减少 | 88（45+43）**全部保留并通过**；K1 新增 33；合计 121 > 88 |
| 失败路径用例实质存在 | 我自行运行 10 类非法 `--out`，**全部退出 2**（第 4 节）；并非只看用例数量 |
| 未用 skip 掩盖 | `skipped = 0`、`todo = 0` |

### 3.7 所有 KB-001 原门禁是否保持绿色 —— ✅ 保持绿色

见第 6 节，5 条门禁全部退出 0。

---

## 4. 边界场景实测矩阵（reviewer-k1 自建）

### 4.1 合法（期望 0）—— 4/4 通过

| 用例 | 退出码 |
|---|---|
| `--dry-run` | **0** |
| 默认输出（无 `--out`） | **0** |
| 仓库内相对路径 `--out tmp/reviewer-k1-probe` | **0** |
| 仓库内 `--out data2`（边界内） | **0** |

（`tmp/reviewer-k1-probe` 与 `data2` 均由我在验证后立即删除，`Test-Path` 确认不存在。）

### 4.2 非法（期望 2）—— 10/10 通过

| 用例 | 退出码 | 目标是否被创建 |
|---|---|---|
| `../outside` | **2** | 否 |
| `../../outside` | **2** | 否 |
| normalize 逃逸 `data/kb/generated/../../../../outside` | **2** | — |
| 异盘 `D:\kb-rk1-outside` | **2** | 否 |
| `C:\Windows\Temp\kb-rk1` | **2** | 否 |
| UNC `\\server\share\kb-rk1` | **2** | — |
| 前缀相同兄弟目录 `../风味考古局-RK1-EVIL` | **2** | 否 |
| `--dry-run` + 非法 `--out` | **2**（未被静默忽略） | — |
| `--out` 缺值 | **2** | — |
| 未知参数 | **2** | — |

**零副作用**：6 个越界目标运行后 `Test-Path` 全部为 `False`。

**错误信息稳定性（原始 stderr，`cmd /c` 捕获）**：

```
adapt-v1-to-v2: --out must stay inside the repository; refusing to write outside it
Usage: node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]
```

| 属性 | 实测 |
|---|---|
| 两次运行逐字节相同 | **True**（SHA-256 `4EC900DAEF273E0E…`） |
| 字节数 | 152 |
| 含盘符 / `Users` / `TEMP` / 仓库绝对路径 | **False / False / False / False** |
| 含密钥模式（`sk-`/`JWT_SECRET`/`API_KEY`/`password`） | **False** |

---

## 5. Captain 裁决项：`independent-qa.test.mjs` 改动的独立判定

实施方把该文件的临时夹具根由 `os.tmpdir()`（仓库外）迁至仓库内 `tmp/`，并删除随之不再使用的 `import os`。**我独立判定如下。**

### (a) 是否必要且最小 —— ✅ 必要且最小

**必要性**：契约（2.0.3）要求「仓库外绝对路径必须被拒」，而原夹具把 `--out` 指向 `os.tmpdir()`（仓库外）并期望退出 0 —— 两条要求**逻辑上不可同时成立**。该文件的用例 #31、#33（`--out` 相关）必然失败。因此迁移是**必需**的；若改为放宽边界以迁就旧夹具，则违背用户明文要求并使新增用例 (6)/(11) 失效。

**最小性（我的实测证据）**：

| 核查 | 实测 |
|---|---|
| 夹具根现状 | `L48: const TMP_ROOT = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb001-qa-'));` —— 位于仓库内，`tmp/` 已被 `.gitignore:14` 忽略 |
| `os.tmpdir()` 残留 | **0** |
| `node:os` import 残留 | **0** |
| `os.` 任何残留使用 | **0** ⇒ 删除 import 与代码现状**完全一致**（若仍有 `os.` 使用，运行时会抛错；而 43 个用例全通过） |
| `mkdtempSync` 调用数 | **1**（单一夹具根） |

### (b) 是否落在用户授权范围 —— ✅ 是

用户第三节（允许修改范围）明确列出「相关测试文件：`scripts/kb/__tests__/...`」。该改动落在授权范围内。

### (c) 用例数 / 门槛 / 负例完整性 —— ✅ 通过

| 核查 | 基线 | 实测 | 判定 |
|---|---|---|---|
| 顶层 `test(` 数 | **43**（`03-qa-verification.md:24/42/43`） | **43** | ✅ 一致 |
| `assert.` 计数 | —（Backend 声明 108） | **108**，与声明一致 | ✅ |
| `skipped` / `todo` | 0 / 0 | **0 / 0** | ✅ |
| 9 类负例关键字 | 需完整 | `E_MISSING_FIELD`、`E_DUPLICATE_ID`、`E_DANGLING_REFERENCE`、`E_RELATION_ENDPOINT_TYPE`、`E_UNKNOWN_RELATION_TYPE`、`E_UNKNOWN_ENTITY_TYPE`、`E_ENUM_INVALID`、`E_TRACE_MISSING`、`E_TIME_RANGE_INVALID` —— **9/9 存在**，且为**带断言的用例**（如 `:312 assert.ok(hit, 'E_MISSING_FIELD expected')`、`:330` 断言 `E_DUPLICATE_ID` 必须带真实文件位置、`:501` 断言 `E_ENUM_INVALID`） | ✅ |

### (d) 是否存在「为让测试通过而放宽门槛」的迹象 —— ✅ 未发现

**我采用的最强可用手段：用例名基线逐条比对。**
`03-qa-verification.md` §2.3 在**本次改动之前**记录了 43 个用例的功能清单（编号 1–43）。我抽取该文件当前的 43 个顶层用例名，逐条对照：

| 比对结果 | 事实 |
|---|---|
| 数量 | 43 = 43 |
| 顺序与语义 | **逐条一一对应**（1–43 全部匹配：合法最小文档、resolved 正向、完整追踪链、6 类必需负例、追踪链断裂、禁止消歧、insufficient 不得升级、枚举与时间区间、五要素与退出码、适配器 5 项、适配报告、旧数据与 Schema 7 项） |
| 受夹具迁移影响的用例 | 恰为 #31（`adapter --dry-run exits 0 and writes nothing`）与 #33（`adapter output is deterministic and idempotent, and V1 inputs are untouched`）—— **与实施方自述一致，无其他用例受影响** |

由于用例**身份与用途**在改动前已有书面基线且全部保持不变，**「删掉一条断言再补一条等强度断言」会改变用例语义或数量，从而在此比对中暴露**。因此该残余风险已被实质性排除。

### 残余不确定性（如实记录，不掩盖）

该文件在本轮为**未跟踪文件**（`git status` 为 `??`），**不存在 git 基线可供逐行 diff**。上述结论由四项独立手段组合支撑（用例名基线逐条比对 + `os.` 残留为 0 的连贯性 + 断言计数 108 + 9/9 负例关键字带断言），**在证据强度上不等价于逐行 diff**。

**我的判定：无需向实施方索取改动前副本。** 理由：用例名与书面基线逐条吻合、`os.` 残留为 0 使 import 删除可证连贯、断言与负例计数均与声明一致——在此证据组合下，隐蔽削弱门槛的可能性极低。（若 Captain 认为仍需绝对确定性，索取副本是唯一可完全消除该不确定性的手段，但会引入对已删除旧状态的依赖。）

---

## 6. KB-001 原门禁复跑（reviewer-k1 亲自执行）

| 门禁 | 退出码 |
|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** |
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** |
| `node scripts/verify_graph_schema.mjs` | **0**（193 / 49） |
| `node scripts/verify_literature_dataset.mjs` | **0**（106 / 103） |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0**（121 / 121） |

---

## 7. 契约同步核查

| 项 | 实测 |
|---|---|
| 契约版本 | **`2.0.3`**（`01-schema-contract.md:3`），**1121** 行 |
| §13.6 新增边界条款 | `:936` 标题；`:938-945` **6 条规则**：解析后比较 / 禁止只用字符串前缀（含理由）/ canonical 校验 / 失败行为与固定错误信息 / 仓库根自身合法 / 回归测试指向 |
| §20 变更记录 | 含 `2.0.3` 行 ✅ |

契约描述与我在源码中读到的实现**一致**（`path.resolve` → `path.relative` 判定 → `realpathSync` canonical → 退出码 2 + 固定信息 → 校验先于 dry-run）。**未见「纸面条款与实现不符」的情形。**

---

## 8. 未验证项（**不得当作通过**）

| 项 | 状态 | 说明 |
|---|---|---|
| 真实符号链接逃逸 | **本人未构造** | Windows 创建符号链接需开发者模式/提权（预期 EPERM）。canonical 层由 `realpathSync` 实现（`:1308-1309`），并由 t14 Security **用 Windows junction（无需特权）实测**：词法位于仓库内但 canonical 指向仓库外 → 退出 2、目标未创建。我接受该证据覆盖 canonical 层，但**我本人未复现 junction 用例**。 |
| UNC 真实可达性 | **未验证** | 仅断言词法拒绝（退出码 2 + 固定信息）；未做网络存在性探测（环境相关且可能阻塞）。 |
| TOCTOU / 并发竞态 | **未验证** | 校验与 `mkdirSync` 之间存在理论窗口（见 9.1）。 |
| 磁盘写满 / 权限拒绝路径 | **未验证** | 范围外。 |
| `backend/.env` 内容 | **有意未读** | 按安全红线只核对键名，未读取任何值。 |
| 该 QA 文件的逐行 diff | **手段受限** | 未跟踪文件无基线（见 5 节残余不确定性）。 |

---

## 9. 非阻塞观察

| # | 级别 | 观察 | 建议 |
|---|---|---|---|
| N1 | low | **理论 TOCTOU 窗口**：`checkOutDir`（`:1333`）与 `mkdirSync`/`writeFileSync` 之间，若攻击者能在同机把已存在目录替换为指向仓库外的符号链接，理论上可绕过 canonical 检查。 | 该 CLI 为开发者手动工具，`backend/src`、`service`、`frontend/src` 引用数 **0**，无服务调用方，且需同机并发写入权限 → **不阻断本轮**。若未来被服务调用，应改为「先以 `fs.mkdir` 打开并 `realpath` 校验后写入同一句柄」或改用 `O_NOFOLLOW` 语义。 |
| N2 | low | UNC 用例仅做词法拒绝断言，未探测共享是否存在。 | 记录在案；词法拒绝本身是确定性的，不影响安全结论。 |
| N3 | info | 验收措辞中 `data2` 举例曾把「边界内合法子目录」与「边界外同级兄弟目录」并列（t13 QA 的 F1）。 | **Captain 已用 `amend_task` 修正**，本报告第 3.5 节按修正后语义判定。**非实现缺陷。** |
| N4 | low | 实现文件的边界守卫被内联在 `adapt-v1-to-v2.mjs` 中（约 58 行），未抽为主题库。 | 本轮范围要求「最小改动」，内联**符合**要求；仅在适配器需要复用该守卫时才有抽取价值。**不作为缺陷。** |
| N5 | info（流程） | 测试文件为未跟踪状态，导致本轮无法对 `independent-qa.test.mjs` 做逐行 diff（第 5 节残余不确定性）。 | 建议 KB-001 CLOSED 后建立 checkpoint（用户步骤 12），使后续轮次的测试改动可被 diff 级审查。 |

**无 blocker、无 high。** 以上均无 REQUEST_CHANGES 依据。

---

## 10. 审查过程合规

| 要求 | 事实 |
|---|---|
| 未审查自己参与实现的代码 | ✅ t12 由 backend-k1 实施，reviewer-k1 未参与 |
| 只读 | ✅ 唯一写入本文件；未修改任何实现、测试、契约或他人报告 |
| 未把上游报告当作结论 | ✅ 全部结论来自自建实测；上游报告仅作交叉核对（如 QA F1 与我的 3.5 节结论一致） |
| 报告不含密钥 | ✅ 无 `.env` 取值、无 token、无凭据；未读取 `backend/.env` |
| 临时产物 | ✅ `tmp/` 下临时文件与 `data2`、`tmp/reviewer-k1-probe` 均已删除，`Test-Path` 确认不存在 |
| 未宣布 KB-001 CLOSED | ✅ 见第 1、11 节的边界声明 |

---

## 11. 对 KB-001 CLOSED 条件的意见（不代替 Captain 判定）

用户列出的 KB-001 CLOSED 条件中，**与本次 K1 修复直接相关的项**：

| CLOSED 条件 | 本报告可提供的证据 | 我的意见 |
|---|---|---|
| **K1 PASS** | 本报告结论 PASS（第 1 节）；t14 Security Gate 亦 PASS | ✅ **满足** |
| 全量 KB 测试 PASS | 121 / 121，skipped 0 | ✅ 满足 |
| Schema validation PASS | 退出 0 | ✅ 满足 |
| Adapter dry-run PASS | 退出 0 | ✅ 满足 |
| Graph schema PASS | 退出 0（193/49） | ✅ 满足 |
| Literature dataset PASS | 退出 0（106/103） | ✅ 满足 |
| V1 数据零意外修改 | git status 0 条 + changed 0/13 | ✅ 满足 |
| generated 输出继续保持 git ignore | `.gitignore:27` 命中 | ✅ 满足 |
| Security PASS | t14 结论 PASS（我未复算其探针，仅据其报告 + 我自建的等价用例） | ⚠️ 见下 |
| Reviewer PASS | **本报告** | ✅ 满足 |
| Captain Release Gate PASS | — | ⬜ **归 Captain** |

**一处诚实限定**：t14 Security 的 PASS 我**未逐条复算其全部探针**（尤其 junction 用例）。我独立复现的是与其重叠的边界矩阵（10 类非法 + 4 类合法）与 canonical 层的代码审查。若 Captain 要求 Security 结论也达到与 Reviewer 同等的独立复算强度，需另行安排；**就 K1 的缺陷是否已修复而言，我的独立证据已足以支撑 PASS。**

**结论**：**K1 项通过。** 是否宣布 `KB-001 STATUS = CLOSED` 由 **Captain Release Gate** 判定；本报告不代行该判定，也不宣布项目整体 CLOSED。
