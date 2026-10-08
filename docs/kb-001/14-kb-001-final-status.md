# KB-001 FINAL STATUS — 正式关闭

**KB-001 STATUS = CLOSED**

| 项 | 值 |
|---|---|
| 关闭判定 | **Captain Release Gate PASS** |
| 关闭时间 | 2026-10-08（本地） |
| 分支 | `feat/trae-offline-museum` |
| 契约版本 | **2.0.3**（`01-schema-contract.md`，1121 行） |
| 团队 | `flavor-archaeology-kb001` |
| 变更集 | **33 项**（1 修改 + 32 新增） |

---

## 1. 正式闭环模型（Captain 政策更新）

依据用户明确指令，**项目自本文件起不再使用 Codex 作为独立验收方**。以下项目状态概念**已被废止**：

> ~~「Codex 独立验收未完成，因此项目不能 CLOSED。」~~

**新的正式闭环为：**

```
Implementation → QA → Security → DevOps → Reviewer PASS → Captain Release Gate → CLOSED
```

**保持不变的约束**：
- Reviewer **必须独立于实施者**（不得审查自己参与实现的代码）。
- **Captain 不得自行替代 Reviewer**：Reviewer Gate 必须由独立成员出具 PASS；Captain 只做证据核对与关闭判定。
- 本次 KB-001 的 Reviewer 独立性与 Security 独立性均已核实（见 §3 条件 7、8）。

---

## 2. CLOSED 条件逐项核验（Captain 亲自执行）

| # | 条件 | 证据 | 判定 |
|---|---|---|---|
| 1 | **K1 PASS** | 非法 `--out` → 退出 **2**；合法 `--out` → 退出 **0**；t12 实现 + t13 QA + t14 Security(PASS) + t15 Reviewer(PASS) | ✅ |
| 2 | **全量 KB 测试 PASS** | `node --test "scripts/kb/__tests__/*.test.mjs"` → 退出 **0**（tests **121** / pass **121** / fail 0 / skipped 0 / todo 0） | ✅ |
| 3 | **Schema validation PASS** | `node scripts/kb/validate-kb-schema.mjs` → 退出 **0**（3 files, 23 entities, 26 relations） | ✅ |
| 4 | **Adapter dry-run PASS** | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` → 退出 **0** | ✅ |
| 5 | **Graph schema PASS** | `node scripts/verify_graph_schema.mjs` → 退出 **0**（193 节点 / 49 关系，与基线一致） | ✅ |
| 6 | **Literature dataset PASS** | `node scripts/verify_literature_dataset.mjs` → 退出 **0**（106 / 103，与基线一致） | ✅ |
| 7 | **Security PASS** | t14 `12-k1-security-gate.md` → verdict **pass**（无 blocker、无 high） | ✅ |
| 8 | **Reviewer PASS** | t15 `13-k1-reviewer-gate.md` → verdict **pass**（7/7 审查重点通过） | ✅ |
| 9 | **V1 数据零意外修改** | `git status --porcelain -- data/knowledge_graph data/recipes data/fragments data/literature` → **0 条** | ✅ |
| 10 | **generated 输出继续保持 git ignore** | `git check-ignore -q data/kb/generated/` → 退出 **0**（命中 `.gitignore:27`） | ✅ |
| 11 | **Captain Release Gate PASS** | 本文件 | ✅ |

**11 / 11 全部满足 → KB-001 STATUS = CLOSED。**

---

## 3. 最终测试摘要

### 3.1 KB-001 新增能力

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** | 3 files / 23 entities / 26 relations |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | 1 file / 282 entities / 214 relations |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | **121** tests / 121 pass / 0 fail / **0 skipped** / 0 todo |
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | 零写盘 |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** | 282 entities / 214 relations |
| 非法 `--out`（越界） | **2** | 不写文件、不建目录、不 fallback |
| 合法 `--out` | **0** | 正常写入 |

**测试分布（逐文件）**：`validate-kb-schema` 45 + `independent-qa` 43 + `adapter-out-boundary` 16 + `k1-qa-boundary` 17 = **121**。
其中 `independent-qa` 43 与 `03-qa-verification.md` 记录的**改动前基线 43 完全一致**（t15 Reviewer 通过逐条比对 43 项书面用例清单确认顺序与语义一一对应）。

### 3.2 回归（与基线逐项一致）

| 套件 | 退出码 | 结果 |
|---|---|---|
| 后端 Jest | **0** | 43 套件 / 213 用例 |
| 前端 test | **0** | 153 通过 / 0 失败 |
| 前端 lint | **0** | 干净 |
| Python unittest | **0** | 9 通过 |
| `verify_knowledge_graph_coverage` | **0** | 40 菜品 |
| `scripts/verify-all.ps1` | **0** | 10 步骤全 OK |
| `docker compose config` | **0** | 可解析 |
| `scripts/__tests__` | **1** | 27 通过 / **7 失败 = 基线已存在**，非本轮引入，未修复未掩盖 |

**本轮引入的失败 = 0。**

### 3.3 K1 边界安全证据（三项独立验证）

| 验证方 | 手段 | 结果 |
|---|---|---|
| Captain | 12 类边界 + 越界目录存在性 | 合法 0 / 非法 2；越界目标**全部未创建** |
| security-k1（t14） | 17 类 + **Windows junction**（词法在仓库内、canonical 在仓库外） | junction → **2**，逃逸目标未创建 |
| reviewer-k1（t15） | 10 类非法 + 独立读码 | 非法 **10/10 → 2**；6 个越界目标 `Test-Path` 全 False |
| **Captain 复现 junction** | 自建 junction → `%TEMP%` | **exit 2**，`%TEMP%\escape-out` **未创建** ✅ |

**canonical 层（`fs.realpathSync`）经 junction 实测真实生效**，非纸面条款。

### 3.4 零伪造来源（KB-001 核心要求，仍成立）

| 核对项 | 结果 |
|---|---|
| 输出中 V1 不存在的 URL（= 伪造） | **0** |
| `review_status` 含 `verified` 字面量 | **0**（枚举刻意不含该值） |
| `HistoricalClaim` | 34/34 全部 `insufficient` |
| 零 fixture 泄漏（`fixture`/`minimal`/`not_historical_evidence`） | **0 / 0 / 0** |
| 适配产物哈希（确定性） | `31a94b69d25800ca…` / `0fb24805955278e2…`，与 K1 修复前**逐字节一致** |

---

## 4. 交付物（33 项变更）

| 类别 | 数量 | 路径 |
|---|---|---|
| V2 Schema | 1 | `data/kb/schema/kb-schema.v2.json` |
| 合法示例 | 3 | `data/kb/examples/valid/*.kb.json` |
| 非法负例 | 7 | `data/kb/examples/invalid/*.kb.json` |
| 校验器实现 | 4 | `scripts/kb/validate-kb-schema.mjs` + `lib/{errors,schema,validate}.mjs` |
| 适配器实现 | 2 | `scripts/kb/adapt-v1-to-v2.mjs` + `lib/adapt/mapping.mjs` |
| 测试 | 4 | `scripts/kb/__tests__/{validate-kb-schema,independent-qa,adapter-out-boundary,k1-qa-boundary}.test.mjs` |
| 文档 | 12 | `docs/kb-001/00`–`09`、`11`–`14` |
| 忽略规则 | 1 | `M .gitignore`（+1 行 `data/kb/generated/`） |

**契约版本 2.0.3**：`01-schema-contract.md` L3；§13.6 于 L936 新增 `--out` 边界 6 条规则；§20 含 2.0.3 变更行。

---

## 5. 已知非阻塞问题（全部如实记录，未修复不等于隐藏）

### 5.1 K1 已修复

| # | 原问题 | 状态 |
|---|---|---|
| **K1** | `adapt-v1-to-v2.mjs` 的 `--out` 缺仓库边界校验（medium） | ✅ **已修复**（t12 + 双重独立门禁）；契约 §13.6 同步补齐 |

### 5.2 基线已存在（非本轮引入，本轮不修复）

| # | 问题 |
|---|---|
| B1 | `scripts/__tests__` 7 个失败（引用不存在的 `python-quality-gate.ps1` / `python_bridge_smoke.cjs`） |
| B2 | `text_lit_076/084/097` 缺失（根因 `build_literature_dataset.mjs:237` 按 title 去重） |
| B3 | `先秦` 的 `start_year == end_year == -221` |
| B4 | `recorded_in` 的 `source_text` 与目标 `title` 冲突 5 条 |
| B5 | `deliverables/gstack/pre-launch-check-2026-09-25.md` 结论 🔴 No-Go（6 项 P0） |

### 5.3 本轮发现、未修复、移交 KB-002

| # | 问题 | 定级 |
|---|---|---|
| K2 | `backend/test_escape_8.js` 未跟踪遗留调试脚本（mtime 2026-09-25，非本轮） | low |
| K3 | 前端测试对源码文本强耦合（99 处 `readFileSync` + 正则断言） | — |
| K4 | `generatedDishImages.js` 被 gitignore，干净克隆需先跑 `build:offline:assets` | — |
| K5 | CI 未接入 KB Schema 校验（已给最小方案与前置条件） | — |
| K6 | `scripts/__tests__` 7 个基线失败：需决策「修复」或「显式豁免」后方可纳入 CI | — |

### 5.4 安全/审查门禁提出的非阻塞观察

| # | 来源 | 观察 |
|---|---|---|
| N1 | t15 | 边界守卫存在理论 TOCTOU 窗口（该 CLI 服务引用数 **0**，非当前可利用） |
| N2 | t14/t15 | UNC 仅词法拒绝，未探测网络可达性 |
| N3 | t14/t15 | 原验收措辞 `data2` 举例不准确 —— **已由 Captain `amend_task` 修正**（`<repo>/data2` 在边界内 exit 0 合法；须拒绝的是仓库根同级前缀兄弟目录） |
| N4 | t15 | 边界守卫内联未抽库 —— 符合最小改动要求，非缺陷 |
| N5 | t15 | 建议 CLOSED 后建 checkpoint，使后续轮次可做 diff 级审查（见 §6） |
| O3/O4 | t14 | TOCTOU 残余，不建议本轮扩大改动 |

### 5.5 未验证项（**不得当作通过**）

真实符号链接（需特权；已用 **junction 等价覆盖** canonical 层）、UNC 真实可达性、并发竞态、磁盘写满/权限拒绝、POSIX 盘符语义、`docker compose up --build` 端到端、`release/` 打包、GitHub Actions 实际运行、浏览器视觉回归、`backend/.env` 内容（按红线**有意未读**）。

---

## 6. GIT_STATUS 与 CHECKPOINT_STATUS

### 6.1 git 状态审计（Captain 执行）

`git status --untracked-files=all` 共 **497** 条目，精确构成：

| 类别 | 条目数 | 处置 |
|---|---|---|
| **KB-001 本轮变更** | **33** | 纳入 checkpoint |
| `.agent-teams/**`（团队运行时状态） | **8** | **排除**（非项目产物） |
| 既有基线改动（PNG→WebP 暂存重命名、20+ ` M`、frontend/backend 未跟踪文件） | **456** | **排除**（用户既有，不得提交） |
| `backend/coverage/**` | **0**（已忽略） | `backend/.gitignore:6: coverage/` |
| `tmp/**`（成员探针） | **0**（已忽略） | `.gitignore:14: tmp/` |

**mtime 交叉验证**：本轮起点 `2026-10-08 15:40` 之后被修改/创建的文件共 189 个 =
KB-001 范围 35（含 `generated/` 2 个派生文件）+ `backend/coverage/**` 143（已忽略）+ `.agent-teams/**` 8 + `tmp/**` 2（已忽略）。
→ **不存在任何 KB-001 范围外的产品文件被本轮修改。**

### 6.2 CHECKPOINT_STATUS

见本文件末尾的「Checkpoint 记录」小节（由 Captain 在执行后补录）。
约束：**不得 push、不得 deploy、不得 merge 到其他分支**；checkpoint 仅用于本地版本边界与回滚。

---

## 7. ARCHIVE_STATUS

见本文件末尾的「归档记录」小节（由 Captain 在执行后补录）。

---

## 8. KB-002_READINESS

### 8.1 硬前置状态

| # | 条件 | 状态 |
|---|---|---|
| 1 | KB-001 门禁 1–8 全部通过 | ✅ 满足 |
| 2 | Reviewer 返回 PASS | ✅ 满足（t15，独立成员） |
| 3 | **K1（medium）已修复** + 契约 §13.6 补齐 | ✅ **满足**（本文件 §2 条件 1、§5.1） |
| 4 | 契约版本冻结且与真实数据一致（2.0.3） | ✅ 满足 |

→ **KB-002 硬前置 4/4 全部满足**，可启动。

### 8.2 已就绪能力（KB-001 交付）

17 实体 + 24 关系版本化 Schema · 可执行校验器（35 错误码 + 退出码 0/1/2 可用于 CI）· 追踪链规则 TR1–TR8 ·
`unknown`/`insufficient` 显式表达 + No-Fabrication N1–N5 · **`review_status` 枚举不含 `verified`**（结构性阻止静默 verified）·
V1→V2 适配器（幂等、只读、可回滚、**已加输出边界守卫**）· **121 用例测试基础**。

### 8.3 KB-002 必须避免的陷阱（沿用 KB-001 教训）

1. 不得把 V2 数据写入 `data/knowledge_graph/`（`verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` 自动发现）
2. 不得通过放宽 TR4 让 Claim 变 `sufficient` 来「好看」
3. 不得为缺失出处编造卷/页/版本/年份
4. 不得把网络线索自动升级为权威证据
5. 多候选 Edition 时**不得**任选一个消歧
6. 统计中文文档行数须用 `node` 或 `Get-Content -Encoding utf8`（PowerShell 以 ANSI 误读 UTF-8）
7. 取退出码勿依赖 PowerShell 管道 `$LASTEXITCODE`（`Select-Object -First N` 后会误读为 -1）
8. 断言原生命令 stderr 稳定性勿用 PowerShell `2>&1`/`2> file`（会包装为 `NativeCommandError` 并附加上下文，破坏逐字节比对）—— 改用 `cmd /c` 重定向或 `spawnSync`

---

## 9. 边界与诚实声明

1. **未 push、未合并任何其他分支、未部署**；仅在有授权时建立本地 checkpoint。
2. 本文件的 CLOSED 判定**基于上述 11 项条件的实测证据**；所有退出码均为 Captain 亲自执行所得。
3. **未执行**的检查已全部列于 §5.5，**均未写成通过**。
4. **基线已存在的 7 个失败**已如实区分，未修复、未掩盖、未删除负例。
5. 早期报告（`06`/`07`/`08`/`09`）撰写于「须由 Codex 独立验收」要求仍然有效之时；该要求已按用户指令废止。为保持历史记录真实，**未改写这些报告正文**，而是在其开头插入带日期的 Captain 政策更新说明。

---

## Checkpoint 记录

（待 Captain 执行后补录）

## 归档记录

（待 Captain 执行后补录）
