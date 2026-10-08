# K1 Security Gate — `--out` 仓库边界校验独立安全复核

- 任务：t14 / K1-SECURITY-GATE（kind=review, round 1）
- 审查人：security-k1（**未参与 K1 实现**）
- 被审对象：t12 交付的 `scripts/kb/adapt-v1-to-v2.mjs` `--out` 边界守卫、`scripts/kb/__tests__/` K1 专项测试、`docs/kb-001/01-schema-contract.md` §13.6（2.0.3）
- 审查时点（UTC）：`2026-10-08T14:37:07Z`
- 结论：**PASS**

> 独立性声明：本报告所有结论均来自 Security 自行读取代码、自行构造并执行探针所得，**未转述** Backend / QA 的结论作为判定依据。t13 的 QA 报告仅作**交叉核对**（见第 9 节），不作为本 PASS 的证据来源。

---

## 1. 审查范围与只读合规

| 项 | 结果 |
|---|---|
| 本次唯一写入 | `docs/kb-001/12-k1-security-gate.md` |
| 是否修改被审查文件 | **否** —— 被审查文件 mtime 全部早于本次审查（见下表） |
| 是否读取 `backend/.env` 的值 | **否**，且未输出任何密钥 |
| 临时探针 | 全部建于 `tmp/`（已 gitignore），**用后已删除**（见第 10 节） |

被审查文件 mtime（UTC）与审查时点对比：

| 文件 | mtime (UTC) | 早于审查 |
|---|---|---|
| `scripts/kb/adapt-v1-to-v2.mjs` | `2026-10-08T14:19:57Z` | ✅ |
| `scripts/kb/__tests__/adapter-out-boundary.test.mjs` | `2026-10-08T14:20:55Z` | ✅ |
| `scripts/kb/__tests__/independent-qa.test.mjs` | `2026-10-08T14:22:00Z` | ✅ |
| `docs/kb-001/01-schema-contract.md` | `2026-10-08T14:23:43Z` | ✅ |

---

## 2. 代码级分析

### 2.1 `escapesRoot(candidate, root)` — 基于 resolved path，非字符串前缀

```js
function escapesRoot(candidate, root) {
  const rel = path.relative(root, candidate);
  return path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`);
}
```

**为什么这比 `candidate.startsWith(REPO_ROOT)` 安全**（实现内注释与我的分析一致）：

| 风险 | `startsWith(root)` | `path.relative` |
|---|---|---|
| 前缀相同但越界的兄弟目录 | **误判为合法**（`C:\repo\data` 匹配 `C:\repo\data2`） | 返回 `..\data2` → 正确拒绝 |
| 不同盘符 / UNC | 字符串比较结果不可靠 | **返回绝对路径** → `path.isAbsolute(rel)` 命中 |
| 分隔符混用 / Windows 大小写 | 不感知 | `path.relative` 按主机规则处理（Windows 下大小写不敏感） |
| 仓库根自身 | — | `rel === ''` → 不判越界（契约明确「仓库根自身合法」） |

`rel === '..'` 与 `rel.startsWith('..' + sep)` 覆盖了「父目录」与「多级父目录」两种形态，且不会误伤名为 `..foo` 的合法目录（因为要求紧跟分隔符）。

### 2.2 `deepestExistingAncestor()` — 终止性

```js
for (;;) {
  if (fs.existsSync(current)) return current;
  const parent = path.dirname(current);
  if (parent === current) return current;   // 到盘符根即终止
  current = parent;
}
```

以 `parent === current` 作为终止条件，**无无限循环风险**；目标不存在时回溯到最近的现存祖先。

### 2.3 `checkOutDir()` — 双层校验 + 调用位置

1. **词法层**：`path.resolve(REPO_ROOT, requested)` 后做 `escapesRoot` 判定 —— 覆盖 `../`、仓库外绝对路径、盘符、UNC。
2. **canonical 层**：`fs.realpathSync(REPO_ROOT)` 与 `fs.realpathSync(deepestExistingAncestor(candidate))` 比较 —— **覆盖符号链接/junction**（词法层看不见）。
3. `realpathSync` 抛异常时返回固定原因 `OUT_CANONICAL_REASON`，**不 fallback**。
4. **调用位置**：`checkOutDir` 在 `main()` 中位于 `snapshotReadonlyInputs()` 与 dry-run 分支**之前**（实现 L1331–1337）。因此非法 `--out` 既不建目录，也不会被 dry-run 静默忽略。

> 我对 4 做了独立实测：`--dry-run --out ../outside` → 退出码 **2**（若校验在 dry-run 之后，这里会变成 0）。

---

## 3. 独立实测：17 个边界用例（Security 自建探针）

探针自行构造用例并断言退出码；所有仓库外目标在运行前均确认**不存在**。

### 3.1 合法路径（必须退出 0）

| # | 用例 | 退出码 | 期望 |
|---|---|---|---|
| L1 | 默认（无 `--out`，默认 `data/kb/generated`） | **0** | 0 ✅ |
| L2 | 仓库内相对路径 `data/kb/generated` | **0** | 0 ✅ |
| L3 | 仓库内嵌套 `tmp/sec-k1-nested/out`（dry-run） | **0** | 0 ✅ |
| L4 | 大小写变体 `DATA/KB/GENERATED`（dry-run） | **0** | 0 ✅ |
| L5 | 分隔符混用 `data/kb\generated`（dry-run） | **0** | 0 ✅ |

### 3.2 非法路径（必须退出 2）

| # | 用例 | 退出码 | 期望 |
|---|---|---|---|
| I1 | `../outside` | **2** | 2 ✅ |
| I2 | 多级 `../../outside` | **2** | 2 ✅ |
| I3 | 仓库外绝对路径（`%TEMP%\sec-k1-probe-out`） | **2** | 2 ✅ |
| I4 | normalize 后逃逸 `data/kb/generated/../../../../outside` | **2** | 2 ✅ |
| I5 | Windows 盘符 `D:\sec-k1-probe` | **2** | 2 ✅ |
| I6 | Windows 盘符 `C:\Windows\Temp\sec-k1-probe` | **2** | 2 ✅ |
| I7 | UNC `\\server\share\sec-k1-probe` | **2** | 2 ✅ |
| I8 | **前缀相似兄弟目录** `<parent>/<repo>-SEC-EVIL` | **2** | 2 ✅ |
| I9 | 上述兄弟目录的**大写变体** | **2** | 2 ✅ |
| I10 | `--dry-run` + 非法 `--out` | **2** | 2 ✅ |
| I11 | `--out` 缺值 | **2** | 2 ✅ |
| I12 | 未知参数 `--bogus` | **2** | 2 ✅ |

**unexpected exit codes = 0**（17/17 与期望一致）。

### 3.3 越界目标是否被创建（越界必须零副作用）

| 越界目标 | 运行后 |
|---|---|
| `D:\systemDir\Desktop\outside` | **not created** ✅ |
| `D:\systemDir\outside` | **not created** ✅ |
| `%TEMP%\sec-k1-probe-out` | **not created** ✅ |
| `D:\sec-k1-probe` | **not created** ✅ |
| `C:\Windows\Temp\sec-k1-probe` | **not created** ✅ |
| `<parent>/<repo>-SEC-EVIL` | **not created** ✅ |

### 3.4 既有输出未被改动（SHA-256 运行前 vs 运行后）

```
before: adaptation-report.json:0fb24805955278e2…  kb-v2.kb.json:31a94b69d25800ca…
after : adaptation-report.json:0fb24805955278e2…  kb-v2.kb.json:31a94b69d25800ca…
identical: true
```

**结论：非法 `--out` 不修改现有输出。** 同时该哈希与修复前记录**完全一致**，佐证本次只新增 CLI 守卫、未改变适配产物。

### 3.5 补充边界语义（全部 `--dry-run`，不写盘）

| 用例 | 退出码 | 语义 |
|---|---|---|
| `--out .`（仓库根自身） | **0** | 契约明确「仓库根自身合法」✅ |
| `--out data2` | **0** | 解析后位于**仓库内** → 合法（见第 9 节 F1） |
| `--out data/kb/../kb/generated` | **0** | 内部 `..` 未逃逸 → 合法 ✅ |
| `--out data/kb/generated/` | **0** | 尾部分隔符 → 合法 ✅ |
| `--out ""` | **2** | 空值被拒 ✅ |
| `--out --foo` | **2** | 以 `--` 开头被拒 ✅ |
| `--out ../风味考古局-evil` | **2** | 兄弟前缀逃逸被拒 ✅ |

运行后断言：`data2`、`..\风味考古局-evil`、`..\outside` **均不存在** —— dry-run 与非法路径都**零写盘**。

---

## 4. 用户强制 Security 独立确认的五项 — 逐项结论

| # | 要求 | 结论 | 依据 |
|---|---|---|---|
| 1 | **repository boundary 已生效** | ✅ **PASS** | 12/12 非法用例退出 2；5/5 合法用例退出 0；越界目标 6/6 未创建 |
| 2 | **路径规范化正确** | ✅ **PASS** | 实现基于 `path.resolve` + `path.relative`；normalize 后逃逸（I4）被拒；内部 `..` 未逃逸被正确放行；无 `startsWith` 字符串前缀依赖 |
| 3 | **无明显 path traversal** | ✅ **PASS** | 覆盖 `..`、多级 `..`、绝对路径、normalize 逃逸、盘符、UNC、**junction/符号链接**（见第 5 节）；无未覆盖项（UNC 仅存在性探测未做，已在第 9 节标注） |
| 4 | **非法输出不会创建或写入文件** | ✅ **PASS** | 6 个越界目标运行后均不存在；`data/kb/generated/` 两个文件 SHA-256 前后一致；dry-run 与非法路径均零写盘 |
| 5 | **Windows 路径行为已考虑** | ✅ **PASS** | 盘符（`D:`、`C:`）被拒；UNC 被拒；分隔符混用（`data/kb\generated`）正确判为仓库内；大小写变体（`DATA/KB/GENERATED` 合法、`-SEC-EVIL` 大写仍被拒）行为正确；跨根时 `path.relative` 返回绝对路径由 `path.isAbsolute` 捕获 |

---

## 5. 符号链接 / junction 逃逸（Backend 标注为「未覆盖」，已由 Security 补测）

Backend 如实标注「未构造真实符号链接用例（Windows 需特权）」。我改用 **Windows junction**（无需特权）完成该项独立验证：

```
junction: <repo>\tmp\sec-k1-link  ->  C:\Users\<user>\AppData\Local\Temp
命令:     node scripts/kb/adapt-v1-to-v2.mjs --out tmp/sec-k1-link/sec-escape
退出码:   2   ✅（期望 2）
错误:     --out must stay inside the repository; refusing to write outside it
逃逸目标: 未创建 ✅
```

**这项是本 Gate 最具价值的独立发现**：该路径的**词法形态完全位于仓库内**（`tmp/sec-k1-link/...`），若仅做字符串或纯词法校验就会放行；实现因做了 `realpathSync` canonical 比对而正确拒绝。**canonical 层经实测有效，不是纸面条款。**

> 残余风险（非阻塞）：junction 在探测后被清理，清理成功。

---

## 6. 错误信息安全性

| 检查项 | 结果 |
|---|---|
| 错误信息内容 | `adapt-v1-to-v2: --out must stay inside the repository; refusing to write outside it`（+ Usage 行） |
| 两次运行是否逐字节相同 | ✅ **byte-identical**（可稳定测试） |
| 是否回显仓库绝对路径 | ❌ **否** |
| 是否回显请求的绝对路径 | ❌ **否** |
| 是否回显 `%TEMP%` / 用户名 | ❌ **否** |
| 是否含密钥/环境变量值 | ❌ **否**（`JWT_SECRET` / `API_KEY` / `sk-*` 均 0 命中） |
| 外部盘符越界（`Z:\nope\...`）信息 | 同样为固定串，未回显路径 |

**结论：新增错误输出不引入敏感信息泄露，且固定可测。**

---

## 7. 依赖与范围合规

| 检查项 | 结果 |
|---|---|
| `scripts/kb/adapt-v1-to-v2.mjs` 导入 | `node:fs`、`node:path`、`node:crypto`、`./lib/schema.mjs`、`./lib/adapt/mapping.mjs` —— **第三方 NONE** |
| `adapter-out-boundary.test.mjs` 导入 | 全部 `node:` 内置（含 `node:test`/`node:assert`/`node:child_process`/`node:crypto`/`node:fs`/`node:os`/`node:path`/`node:url`）—— **第三方 NONE** |
| `process.env` 引用 | **0** |
| `eval` / `new Function` / `shell: true` | **0**（适配器） |
| `child_process` / `spawnSync` | 仅出现在**测试文件**中，参数为数组、**无 shell 拼接** |
| `backend/package.json` | 有 ` M`，但经 Captain 与本任务确认属**基线既有**（mtime `2026-09-25`，diff 仅 `db:migrate`/`db:seed-if-empty`/`cookie-parser`，KB 关键词 0 命中），**非本轮引入** |
| `frontend/package.json`、`service/requirements.txt` | **git diff 为空**（未改动） |

---

## 8. 契约 verify 命令（真实退出码）

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** |
| 2 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** |
| 3 | `git status --porcelain` | **0** |

测试计数（实测）：**tests 121 / pass 121 / fail 0 / skipped 0 / todo 0**

| 测试文件 | tests | pass | skipped |
|---|---|---|---|
| `adapter-out-boundary.test.mjs`（K1 新增） | 16 | 16 | 0 |
| `independent-qa.test.mjs` | 43 | 43 | 0 |
| `k1-qa-boundary.test.mjs`（QA 新增） | 17 | 17 | 0 |
| `validate-kb-schema.test.mjs` | 45 | 45 | 0 |

**无跳过、无 todo，门槛未被降低。**

---

## 9. 非阻塞观察（不影响 PASS）

| # | 观察 | 级别 | 说明与建议 |
|---|---|---|---|
| **O1** | 验收标准中「实测 `data2` 这类前缀相似越界路径被拒绝」的**举例不准确** | 信息性 | 本实现的边界是**仓库根**，相对路径 `data2` 解析后位于**仓库内**，因此**合法（实测退出 0）**，并非越界。用户在指令中给出的 `C:\repo\data` vs `C:\repo\data2` 例子，对应的是「边界为子目录」的情形。本 Gate 已改用语义等价的**仓库根同级兄弟目录**（`<parent>/<repo>-evil`）验证，**被正确拒绝（退出 2，大小写变体同样被拒）**，故**不存在前缀校验漏洞**。QA 报告 F1 提出同一措辞问题，结论一致。建议后续把验收措辞改为「仓库根的同级前缀兄弟目录」。 |
| **O2** | UNC 用例**未做存在性探测** | 低 | 解析不存在的 UNC 共享是环境相关操作、可能阻塞；拒绝本身由词法判定（`path.relative` 返回绝对路径）保证确定。与 Backend 的标注一致。 |
| **O3** | check → mkdir 之间存在 TOCTOU 窗口 | 低（残余） | 校验后到 `mkdirSync` 之间，理论上攻击者可将路径替换为 junction。该 CLI 是**开发者手动工具**（`backend/src`、`service`、`frontend/src` 引用数 **0**），无并发对手方；且 canonical 层已覆盖静态符号链接。**不构成当前可利用漏洞**，不建议在本轮扩大改动。 |
| **O4** | `checkOutDir` 返回词法 `candidate`（非 canonical）用于实际写入 | 信息性 | 与 O3 同源。写入经词法路径，静态 symlink 已由 canonical 层拦截。 |
| **O5** | 测试文件使用 `node:child_process` 调用被测 CLI | 信息性 | 参数为数组、无 shell 拼接，非注入面；属测试基础设施的正常做法。 |

**未发现 blocker、未发现 high。** 无 REQUEST_CHANGES 依据。

---

## 10. 未覆盖项（如实标注，不得视为通过）

| 项 | 状态 | 原因 |
|---|---|---|
| UNC 目标的**存在性**探测 | **未执行** | 解析不存在的 UNC 共享环境相关、可能阻塞（与 O2 同因）；退出码与错误信息已实测 |
| 真实符号链接（`symlink`）逃逸 | **已用 junction 等价覆盖** | Windows 创建符号链接需特权（预期 EPERM）；改用无需特权的 junction 完成同等语义验证（第 5 节） |
| POSIX 平台下的盘符/UNC 语义 | **未执行** | 当前为 Windows 环境；`D:\x` 在 POSIX 下是合法相对名，盘符用例在 POSIX 不适用 |
| 并发竞态 / TOCTOU 利用 | **未构造** | 见 O3；该 CLI 无服务调用方，无并发对手方 |
| 磁盘写满 / 权限拒绝路径 | **未执行** | 环境相关，且与本次 `--out` 边界守卫无因果关系 |

---

## 11. 结论

# PASS

**K1（`--out` 仓库边界校验）通过 Security Gate 独立复核。**

**通过依据（均为 Security 亲自实测）**：

1. **repository boundary 已生效** —— 12/12 非法用例退出 **2**，5/5 合法用例退出 **0**，越界目标 6/6 未创建。
2. **路径规范化正确，无字符串前缀漏洞** —— 实现用 `path.relative` 而非 `startsWith`；仓库根**同级前缀兄弟目录**（含大写变体）被正确拒绝；normalize 后逃逸被拒；内部 `..` 未逃逸被正确放行。
3. **canonical（`realpathSync`）层经实测有效** —— 词法上位于仓库内、实际经 junction 指向仓库外的路径被**拒绝**（退出 2，零写盘）。该项 Backend 标注为未覆盖，由本 Gate 补测完成。
4. **非法输出零副作用** —— 未创建目录、未写入文件、未修改既有 `data/kb/generated/`（SHA-256 前后一致）、未 fallback、未静默忽略（dry-run 下同样退出 2）。
5. **Windows 路径行为已考虑并实测** —— 盘符、UNC、分隔符混用、大小写不敏感均行为正确。
6. **错误信息稳定且无信息泄露** —— 两次运行逐字节相同，不回显绝对路径/用户名/密钥。
7. **无新增依赖、无相关依赖文件改动**；**无 blocker、无 high**。
8. **测试门槛未降低** —— 121/121 通过，`skipped 0`、`todo 0`。

**非阻塞观察**：O1（验收措辞中 `data2` 举例不准确，语义等价的兄弟目录用例已通过）、O2（UNC 未做存在性探测）、O3/O4（TOCTOU 残余，该 CLI 无服务调用方）、O5（测试用 child_process，无 shell 拼接）。详见第 9 节。

**只读合规**：唯一写入 `docs/kb-001/12-k1-security-gate.md`；被审查文件 mtime 全部早于本次审查；临时探针全部位于 `tmp/`（gitignore）并已删除；未读取或输出 `backend/.env` 的任何值。

**边界**：本 PASS 是 Security Gate 的独立结论，**不宣布 KB-001 CLOSED**；KB-001 的关闭判定归 Captain Release Gate，最终仍须 Reviewer Gate（t15）与 Captain 复核。
