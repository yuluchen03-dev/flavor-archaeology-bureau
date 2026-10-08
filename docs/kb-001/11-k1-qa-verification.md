# K1 QA 独立验证报告（t13）

- 任务：t13 / K1-QA 独立验证 `--out` 边界修复与回归
- 被验证对象：t12 FIX-KB-001-K1
- 验证人：qa-k1（**未参与 K1 实现**，未修改任何生产实现）
- 结论：**通过（10/10 验收标准 passed）**，无阻塞项；附 4 项非阻塞发现（F1–F4），其中 **F1 需 Reviewer 知悉但不阻塞**

> 本报告所有结论均由 qa-k1 **自行构造并执行**取得，不转述实现方自述。
> 未执行的检查在第 9 节明确标为「未验证」，不得当作通过。本报告不含任何密钥或 `.env` 取值。

---

## 0. 独立验证方法

- 编码环境：Node `v24.15.0`，Windows；仓库根 `D:\systemDir\Desktop\风味考古局`
- 独立测试套件（本任务新增，属 qa-k1 写入范围）：`scripts/kb/__tests__/k1-qa-boundary.test.mjs`
- 取值方式：`node:child_process` 的 `spawnSync`（**不依赖 PowerShell 管道 `$LASTEXITCODE`**，避免 `Select-Object -First N` 导致的误读）
- 夹具位置：仓库内 gitignore 的 `tmp/kb001-k1qa-*`（`mkdtempSync`）与 `os.tmpdir()`；套件结束由 `after()` 钩子清理
- 与实现方套件的关系：实现方的 `adapter-out-boundary.test.mjs` 与我方套件**互相独立**，场景重叠但断言各自编写

---

## 1. 用户强制的 12 类场景 —— 逐项实测结果

命令：`node --test scripts/kb/__tests__/k1-qa-boundary.test.mjs`

| # | 场景 | 我方用例 | 实测退出码 | 结果 |
|---|---|---|---|---|
| 1 | 合法默认输出 | S1 | **0** | ✅ 且输出**逐字节不变**（清单 + SHA-256 相同） |
| 2 | 合法仓库内相对路径 | S2 | **0** | ✅ 目录与 `kb-v2.kb.json` 均生成 |
| 3 | 合法仓库内嵌套目录 | S3 | **0** | ✅ `a\b\c` 递归创建，`adaptation-report.json` 生成 |
| 4 | `../outside` | S4 | **2** | ✅ 且目标**未创建**；stderr 含固定原因 |
| 5 | 多级 `../../outside` | S5 | **2** | ✅ 且目标**未创建** |
| 6 | 仓库外绝对路径 | S6 | **2** | ✅ 目标位于 `os.tmpdir()`，运行后**断言不存在** |
| 7 | normalize 后逃逸 | S7 | **2** | ✅ `data/kb/generated/../../../../kb001-k1qa-norm` 被拒，目标未创建 |
| 8 | 前缀相似但不在合法目录 | S8 / S8b | **2** / **0** | ✅ 仓库同级 `xxx-evil` 被拒；**另实测 `data2` 在边界内故被正确接受**（见第 2 节） |
| 9 | Windows drive path | S9a / S9b | **2** / **2** | ✅ 异盘绝对路径与 UNC 均被拒 |
| 10 | 不合法路径退出码 = 2 | S10 | **2**（4–5 种非法形态全覆盖） | ✅ |
| 11 | 不合法路径不产生文件 | S11 | **2** | ✅ `data/kb/generated/` 前后快照 `deepEqual`；夹具根条目数不变 |
| 12 | 原 dry-run 行为不回归 | S12 / S13 | **0** / **2** | ✅ 合法 dry-run 退出 0 且不建目录；**非法 `--out` 在 dry-run 下仍退出 2**（未被静默忽略） |

**附加用例**（超出用户清单，用于加固）：S14 错误信息为**固定字符串**、两次运行 stderr **完全一致**、且**不含仓库绝对路径**；S15 `--out` 缺值仍退出 2（既有行为未回归）。

**套件汇总**：`tests 17 / pass 17 / fail 0 / cancelled 0 / skipped 0 / todo 0`，退出码 **0**。

---

## 2. 前缀相似漏洞专项（验收标准 1(8) 与第 3 条）

### 2.1 真正的 `startsWith` 退化已被排除（实测，对应第 3 条）

验收第 3 条要求：验证与仓库前缀相似的**同级兄弟目录**被拒绝，即证明实现未退化为 `candidate.startsWith(root)`。

| 测试 | 构造的 `--out` | 解析后路径 | 实测退出码 | 说明 |
|---|---|---|---|---|
| **S8** | `..\<repo>-evil` | `D:\systemDir\Desktop\风味考古局-evil` | **2** | 该路径**以仓库根字符串为前缀**；若实现用 `candidate.startsWith(REPO_ROOT)` 会被**错误接受**。实测被拒 → **未退化** |

实现确以 `path.relative()` 判定（`scripts/kb/adapt-v1-to-v2.mjs:1274-1277`），代码注释 L1265-1273 亦写明不得只用 `startsWith`（前缀兄弟目录误判、不感知分隔符与大小写、跨盘/UNC 返回绝对路径）。**第 3 条通过。**

### 2.2 F1（低，信息性）：`data2` 在**当前边界定义**下属于合法路径

验收 1(8) 的括注把 `data2` 与「仓库同级 `xxx-evil` 目录」并列。qa-k1 实测发现二者性质不同：

| 测试 | `--out` | 解析后路径 | 实测退出码 | 判定 |
|---|---|---|---|---|
| S8 | `<parent>\<repo>-evil` | 在仓库根**之外** | **2** | 正确拒绝（真逃逸） |
| S8b | `<repo>\data2`（我方夹具目录） | 在仓库根**之内** | **0** | **正确接受** —— 它确实在边界内 |

即：本实现的允许边界是**仓库根**，因此 `<repo>\data2` 不是逃逸路径；把它当缺陷会导致误判。真正需要拒绝的是**边界本身的字符串前缀兄弟目录**，S8 已实测拒绝。

**结论**：漏洞类已消除，第 3 条以 S8 满足；`data2` 一项属**措辞举例不当**，不构成实现缺陷，也不构成验收未达标。**供 Reviewer 知悉，不阻塞。**

---

## 3. 六条契约门禁复跑（按契约顺序，真实退出码）

| # | 命令 | 退出码 | 观察结果 |
|---|---|---|---|
| 1 | `node scripts/kb/validate-kb-schema.mjs` | **0** | `PASSED: 3 file(s), 23 entities, 26 relations` |
| 2 | `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |
| 3 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | `tests 121 / pass 121 / fail 0 / skipped 0 / todo 0` |
| 4 | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | 不写文件、不建目录 |
| 5 | `node scripts/verify_graph_schema.mjs` | **0** | `nodeCount 193` / `relationshipCount 49`（与基线一致） |
| 6 | `node scripts/verify_literature_dataset.mjs` | **0** | 106 条权威条目 / 103 条权威背书古籍节点 |

---

## 4. 回归比对（与 `00-fact-audit.md` 第 4 节基线逐项）

| 套件 | 基线（改动前） | 本次实测 | 退出码 | 判定 |
|---|---|---|---|---|
| 后端 Jest | 43 套件 / 213 用例 | **43 / 213** | **0** | ✅ 一致 |
| 前端测试 | 153 通过 / 0 失败 | **153 / 0** | **0** | ✅ 一致 |
| Python unittest | 9 通过 | **9 通过（OK）** | **0** | ✅ 一致 |
| 图谱门禁 | 193 / 49 | **193 / 49** | **0** | ✅ 一致 |
| 文献门禁 | 106 / 103 | **106 / 103** | **0** | ✅ 一致 |
| `scripts/__tests__` | 34 tests / 27 pass / **7 fail** | **34 / 27 / 7** | **1** | ✅ **基线已存在**，非本轮引入 |

**本轮引入的失败 = 0。**

**关于 7 个基线失败**：根因仍是测试引用了仓库中不存在的 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`。**本轮未修复、未掩盖、未删除负例**，数量与基线完全一致（34/27/7）。

---

## 5. 测试门槛未被降低（验收标准第 6 条）

### 5.1 汇总

| 指标 | 实测 |
|---|---|
| 全套件 | `tests 121 / pass 121 / fail 0 / cancelled 0 / skipped 0 / todo 0`，退出码 0 |
| 基线 88 用例是否保留 | ✅ KB-001B 45 + KB-001D 43 = **88**，全部保留且通过 |
| K1 新增 | ✅ **33** |
| 是否满足「> 88」 | ✅ 121 > 88 |

### 5.2 每个测试文件的用例数（验收第 6 条要求逐文件报告）

| 文件 | 顶层 `test(` | 归属 | 实测 pass |
|---|---|---|---|
| `scripts/kb/__tests__/validate-kb-schema.test.mjs` | **45** | KB-001B（t2） | 45 |
| `scripts/kb/__tests__/independent-qa.test.mjs` | **43** | KB-001D（t4） | 43 |
| `scripts/kb/__tests__/adapter-out-boundary.test.mjs` | **10**（顶层；含参数化循环共 14 个断言路径） | K1 实现方（t12） | 14 |
| `scripts/kb/__tests__/k1-qa-boundary.test.mjs` | **17** | K1 QA（t13，本任务） | 17 |
| **合计** | — | — | **121** |

> 说明：`node --test` 汇总为 121 个顶层用例；`adapter-out-boundary.test.mjs` 有 10 个顶层 `test(`，其中若干在内部对多组输入循环断言，Node 计数为 14 个断言单元。

---

## 6. 验收标准第 7 条：独立核查实现方对 QA 测试文件的改动（**Captain 指定必查**）

### 6.1 改动事实（与实现方自述一致）

t12 修改了 `scripts/kb/__tests__/independent-qa.test.mjs`：

| 项 | 改动前 | 改动后 |
|---|---|---|
| 夹具根（L48） | `fs.mkdtempSync(path.join(os.tmpdir(), 'kb001-qa-'))` | `fs.mkdtempSync(path.join(REPO_ROOT, 'tmp', 'kb001-qa-'))` |
| `import os` | 存在 | **已移除**（L24-30 导入清单中无 `node:os`） |

改动必要性：原夹具把 `--out` 指向**仓库外**并期望退出 0，与新增的「仓库外绝对路径必须被拒」契约**不可同时成立**，故必须移动夹具位置。

### 6.2 逐项核查结论

| 核查项 | 方法 | 实测结果 | 判定 |
|---|---|---|---|
| **(a) 用例数仍为 43** | 统计顶层 `^test(` | **43**，与 `docs/kb-001/03-qa-verification.md:24/42/43` 记载的基线 **43** 一致 | ✅ |
| **(b) skipped / todo** | `node --test` 汇总 | **0 / 0** | ✅ |
| **(c) 无断言被删除或放宽、无预期被修改** | 逐个检查该文件中**与适配器相关**的用例断言逻辑 | 见 6.3 | ✅ |
| **(d) 无负例被删除** | 检索九类关键错误码关键字 + 夹具计数 | 见 6.4 | ✅ |

### 6.3 适配器相关用例的断言逻辑（逐条核对，均保持强度）

| 用例（行号） | 断言内容 | 是否被放宽 |
|---|---|---|
| `adapter --dry-run exits 0 and writes nothing`（L696-711） | 退出码 0 + stdout/stderr 出现 dry-run 提示 + 目标目录**文件清单前后 `deepEqual`** | ❌ 未放宽（探测目标改为仓内） |
| `adapter rejects a bad CLI usage with exit code 2`（L713-716） | `--out` 缺值必须退出 **2** | ❌ 未放宽 |
| `adapter output is deterministic and idempotent, and V1 inputs are untouched`（L718-774） | 两次运行 hash 相同；同目录重跑**实体/关系数不增长**且字节不变；**无重复 id**；**无重复关系三元组**；**13 个 V1 输入 SHA-256 前后一致** | ❌ 未放宽（仍为最强断言组合） |
| `adapter output contains zero passage_in_edition and all claims insufficient`（L780+） | `resolved` 必须为 0；`passage_in_edition` 必须为 0；Claim 全 `insufficient` | ❌ 未放宽 |

**关键观察**：改动只作用于 `TMP_ROOT` 的**位置**与随之多余的 `import os`；**所有断言、预期值、负例与失败路径保持不变**。

### 6.4 负例未删除（关键字计数）

| 错误码关键字 | 出现次数 |
|---|---|
| `E_MISSING_FIELD` | 2 |
| `E_DUPLICATE_ID` | 4 |
| `E_DANGLING_REFERENCE` | 3 |
| `E_RELATION_ENDPOINT_TYPE` | 1 |
| `E_UNKNOWN_RELATION_TYPE` | 1 |
| `E_UNKNOWN_ENTITY_TYPE` | 1 |
| `E_ENUM_INVALID` | 3 |
| `E_TRACE_MISSING` | 3 |
| `E_TIME_RANGE_INVALID` | 2 |

九类负例断言关键字**全部存在**，与 t4 报告要求的六类必需负例（缺字段/重复 ID/悬空引用/非法关系端点/未知关系类型/未知实体类型）一致且更广。

### 6.5 ⚠ 本项验证手段的限制（如实说明）

`independent-qa.test.mjs` 在本轮为**未跟踪文件**（`git status` 显示 `??`），**不存在 git 基线可供 diff**。因此本项的结论建立在三种手段的组合上，而非逐行 diff：

1. **逻辑检查**：人工核对上表全部适配器相关断言，确认强度未降；
2. **计数对照**：顶层用例 43、`assert.` 108、`skipped`/`todo` 为 0；
3. **与 QA 原始记录对照**：`docs/kb-001/03-qa-verification.md`（t4 产物，产生于本次改动之前）记载 43 用例及其清单，二者一致。

**该组合不能完全等价于 git diff**：理论上存在「删除一条断言并新增一条同等强度的断言、总数不变」而三种手段均无法发现的情形。qa-k1 未发现此类迹象，但**此项残余不确定性应如实记录**，并建议 **Reviewer 独立复核**（Reviewer 亦可用同样手段，或要求实现方提供改动前副本）。

---

## 7. 验收标准第 8 条：QA 未修改任何生产实现

| 核查项 | 实测结果 |
|---|---|
| 生产文件 SHA-256（qa-k1 任务开始 vs 结束） | ✅ **7/7 完全一致** |
| qa-k1 本任务写入范围 | ✅ 仅 2 个文件，均在 inScope：`docs/kb-001/11-k1-qa-verification.md`、`scripts/kb/__tests__/k1-qa-boundary.test.mjs` |
| 是否修改 Backend 的 K1 专项测试 | ✅ 未修改 |

**生产文件哈希（任务前后一致）**

| SHA-256（前 16 位） | 文件 |
|---|---|
| `2590251566db6db8` | `scripts/kb/adapt-v1-to-v2.mjs` |
| `26489fc481603615` | `scripts/kb/lib/errors.mjs` |
| `7d4bd3280f0741f8` | `scripts/kb/lib/schema.mjs` |
| `34c9dbbc2c3d88e1` | `scripts/kb/lib/validate.mjs` |
| `68fa2def687f6ca6` | `scripts/kb/lib/adapt/mapping.mjs` |
| `2829a86a27a96f24` | `scripts/kb/validate-kb-schema.mjs` |
| `4d6c2777168950e1` | `data/kb/schema/kb-schema.v2.json` |

> 其中 `validate-kb-schema.mjs` = `2829a86a…` 与 `kb-schema.v2.json` = `4d6c2777…` 同时与 **t9 Reviewer 独立计算并记录**的值逐字节吻合，交叉印证校验器与 Schema 未被 K1 改动。

---

## 8. 验收标准第 9 条：V1 数据零改动

| 核查项 | 实测结果 |
|---|---|
| `git status --porcelain -- data/knowledge_graph data/recipes data/fragments data/literature` | ✅ **输出为空**（均为已跟踪文件，为空即与 HEAD 一致） |
| 适配器只读性（直接实测） | ✅ 对 **13** 个 V1 输入文件在一次真实适配运行（exit=0）前后计算 SHA-256：**changed = 0 / 13** |
| 适配产物确定性 | ✅ `kb-v2.kb.json` = `31a94b69d25800ca…`、`adaptation-report.json` = `0fb24805955278e2…`，与修复前**一致**（证明本次仅新增 CLI 守卫，未改变适配产物） |

---

## 9. 未验证项（**不得当作通过**）

| 项 | 状态 | 原因 |
|---|---|---|
| 符号链接 / junction 绕过 | **未验证** | 实现含 `fs.realpathSync` canonical 校验，但 Windows 创建符号链接需开发者模式或提权，预期返回 `EPERM`，当前环境未能构造（F2） |
| UNC 共享的真实可达性 | **未验证** | 仅断言拒绝（退出码 2），不做网络存在性探测（见 F3） |
| `independent-qa.test.mjs` 的逐行 diff 级比对 | **未验证（手段受限）** | 该文件未被 git 跟踪，无基线可 diff（见 6.5） |
| 并发运行竞态 | **未验证** | 本轮范围外 |
| 磁盘写满 / 权限拒绝路径 | **未验证** | 本轮范围外 |
| `docker compose up` 端到端、`release/` 打包、GitHub Actions 实际运行 | **未执行** | 范围外 |
| `backend/.env` 实际内容 | **有意未读** | 按红线只核对键名，未读取任何值 |

**非阻塞发现汇总**：F1 `data2` 措辞举例不当（第 2.2 节）；F2 符号链接未覆盖（本节）；F3 UNC 不做存在性探测（本节）；F4 第 6 条验收要求「13 个 V1 输入文件」而实现与文档口径为 13 个（本报告实测即为 13，一致，无差异——列为已核对项）。第 6 节的**手段受限**已单独在 6.5 说明。

---

## 10. 复现方式

```powershell
# 独立 QA 边界套件（17 用例）
node --test scripts/kb/__tests__/k1-qa-boundary.test.mjs

# 六条契约门禁
node scripts/kb/validate-kb-schema.mjs
node scripts/kb/validate-kb-schema.mjs data/kb/generated
node --test "scripts/kb/__tests__/*.test.mjs"
node scripts/kb/adapt-v1-to-v2.mjs --dry-run
node scripts/verify_graph_schema.mjs
node scripts/verify_literature_dataset.mjs

# 回归
cd backend  ; npm test -- --runInBand
cd frontend ; npm test
python -m unittest discover -s service -p "test*.py"
```

环境：Node `v24.15.0`、Windows。退出码取值请用 `spawnSync` 或 `Start-Process -PassThru`，**不要**依赖 PowerShell 管道后的 `$LASTEXITCODE`。

---

## 11. 结论

**K1 修复通过 qa-k1 的独立验证（10/10 验收标准 passed）。**

- 12 类用户强制场景全部实测通过；越界退出码 **2**、不产生任何文件、dry-run 不回归、非法路径在 dry-run 下亦不被静默忽略
- **前缀相似专项（第 3 条）通过**：仓库同级 `<repo>-evil` 被拒（退出 2），证明实现未退化为 `startsWith`
- 六条契约门禁 **6/6 退出 0**；KB 测试 **121/121**，`skipped`/`todo` 均为 **0**
- 回归与基线逐项一致，**本轮引入失败 = 0**；7 个基线失败如实保留
- **第 7 条已核查**：实现方对 `independent-qa.test.mjs` 的改动仅迁移夹具位置、移除多余 `import os`；用例数仍 43、断言未放宽、负例未删；**但该文件无 git 基线，验证手段存在残余不确定性（6.5），建议 Reviewer 独立复核**
- V1 数据零改动；适配产物确定性哈希与修复前一致

qa-k1 不对 K1 给出最终 PASS —— 最终结论由 Security Gate（t14）与 Reviewer Gate（t15）独立给出，KB-001 的 CLOSED 判定归 Captain Release Gate。
