# KB-001D4 DevOps 构建、回滚与文档命令验证

- 任务：t7 / KB-001D4
- 执行角色：DevOps
- 验证对象：KB-001 交付物（V2 Schema、数据校验器、V1→V2 适配器、兼容层回滚路径）
- 写入范围：**仅本文件**（`docs/kb-001/05-devops-verification.md`）
- 环境：Node `v24.15.0`、npm `11.12.1`、Python `3.11.9`、Docker `29.5.2`、Docker Compose `v5.1.4`
- 仓库根：`D:\systemDir\Desktop\风味考古局`，分支 `feat/trae-offline-museum`
- 根目录**不存在** `package.json`；所有 Node 脚本以 `node scripts/xxx.mjs` 从仓库根执行

> 本报告只记录**实际执行并观察到**的命令与退出码。
> 未执行的检查在第 9 节明确标为「未执行」，**不得**当作通过。

---

## 1. 结论摘要

| # | 验证项 | 结论 |
|---|---|---|
| 1 | KB-001 文档中的校验/适配命令可执行 | ✅ **通过**（5 条命令全部退出 0） |
| 2 | 所需新增依赖确有必要 | ✅ **通过**（零新增第三方依赖，仅用 Node 内置模块） |
| 3 | 兼容层可关闭或回滚 | ✅ **通过**（删除输出目录即回滚，V1 完整可用） |
| 4 | 全量质量门无本轮引入回归 | ✅ **通过**（`verify-all.ps1` 退出 0，与基线一致） |
| 5 | CI 接入 Schema 校验 | ⚠ **本轮不接入**，已给出最小建议方案（见第 7 节） |
| 6 | 构建/启动路径未受影响 | ✅ **通过**（`docker compose config` 退出 0） |
| 7 | 敏感信息 | ✅ 本报告不含任何密钥或 `.env` 取值 |

**未执行项**（第 9 节）：`docker compose up --build` 端到端、`package_trae_submission.ps1`、`verify-demo-stack.ps1 -RequireRunning`、GitHub Actions 实际运行。
**一处环境性偶发失败**已在第 6 节完整记录（非 KB-001 引入，已复现为环境因素）。

---

## 2. 文档命令可执行性验证

### 2.1 KB-001 校验与适配命令（全部实测）

| # | 命令 | 退出码 | 观察到的输出 |
|---|---|---|---|
| 1 | `node scripts/kb/validate-kb-schema.mjs` | **0** | `KB schema validation PASSED: 3 file(s), 23 entities, 26 relations` |
| 2 | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | 输出报告摘要；`passage_in_edition_relations: 0`、`v1_inputs_unchanged: true`；**不创建输出目录** |
| 3 | `node scripts/kb/adapt-v1-to-v2.mjs` | **0** | `adapt-v1-to-v2: wrote 282 entities and 214 relations to data/kb/generated` |
| 4 | `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `KB schema validation PASSED: 1 file(s), 282 entities, 214 relations` |
| 5 | `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | 校验器自带单测全部通过（45 用例） |

### 2.2 退出码语义验证（CI 可用性）

| 命令 | 退出码 | 预期 | 结论 |
|---|---|---|---|
| `node scripts/kb/adapt-v1-to-v2.mjs --bogus-arg` | **2** | 2（运行错误） | ✅ |
| `node scripts/kb/adapt-v1-to-v2.mjs --out`（缺值） | **2** | 2 | ✅ |
| `node scripts/kb/validate-kb-schema.mjs tmp/does-not-exist.json` | **2** | 2 | ✅ |

退出码语义正确：**0 = 通过、1 = 校验失败、2 = 运行错误**，满足「失败返回非零退出码，可用于 CI」的要求。

### 2.3 版本前提

| 前提 | 实测值 | 是否满足 |
|---|---|---|
| Node.js | `v24.15.0` | ✅ 满足（脚本使用 `node:` 前缀内置模块与 ESM） |
| Python | `3.11.9` | ✅ 满足（既有 Python 服务测试通过） |
| npm | `11.12.1` | ✅ 满足 |
| Docker / Compose | `29.5.2` / `v5.1.4` | ✅ 满足（`docker compose config` 退出 0） |

**无法执行的命令：无。** KB-001 文档中记录的每条命令在当前环境均实际可执行。

### 2.4 一处**未执行**的验收项（如实标注）

我的验收标准中包含：
`node --test scripts/kb/__tests__/independent-qa.test.mjs`

**该文件当前不存在**（属 t4 / KB-001D 的交付物，QA 尚未产出）。因此**此项无法执行**，本报告不将其记为通过。
已实际执行的是**存在且属 KB-001B 的**校验器自带单测 `scripts/kb/__tests__/validate-kb-schema.test.mjs`（见 2.1 第 5 行，退出 0）。

---

## 3. 依赖必要性验证

### 3.1 第三方依赖：零新增

| 清单文件 | `git diff` 结果 | 判定 |
|---|---|---|
| `frontend/package.json` | **无输出**（未修改） | ✅ 无新增依赖 |
| `service/requirements.txt` | **无输出**（未修改） | ✅ 无新增依赖 |
| `backend/package.json` | 有 diff（见 3.2） | ⚠ **非本轮引入**，已排除 |

### 3.2 `backend/package.json` 的 diff 归因（**非 KB-001 引入**）

该文件显示为已修改，我做了三项独立核验以排除本轮责任：

**证据 A — diff 内容与 KB-001 无关**：

```
-    "db:init": "node src/scripts/init-db.js"
+    "db:init": "node src/scripts/init-db.js",
+    "db:migrate": "node src/scripts/migrate-db.js",
+    "db:seed-if-empty": "node src/scripts/seed-if-empty.js"
   "dependencies": {
     "bcryptjs": "^2.4.3",
+    "cookie-parser": "^1.4.7",
```

**证据 B — 关键词扫描**：对该 diff 全文检索 `kb` / `adapt` / `validate-kb` / `schema` → **各 0 次命中**。

**证据 C — 时间戳**：

| 项 | 时间 |
|---|---|
| `backend/package.json` mtime | **2026/9/25 18:09:58** |
| KB-001 最新产物 mtime | **2026/10/8 18:46:07** |
| 该文件最后一次提交 | `2b05b83`（2026-09-15） |

**结论**：新增的是 `db:migrate` / `db:seed-if-empty` 脚本与 `cookie-parser` 依赖，属**团队开始前的既有未提交改动**，非 KB-001 引入。事实审计 §1.2 已记录该文件在基线即为 ` M` 状态。

### 3.3 KB-001 实现的导入审计（实测）

对 6 个 KB-001 实现文件（`scripts/kb/validate-kb-schema.mjs`、`lib/{errors,schema,validate}.mjs`、`lib/adapt/mapping.mjs`、`adapt-v1-to-v2.mjs`）做静态审计：

**全部 import 说明符**（去重）：

```
./lib/adapt/mapping.mjs
./lib/errors.mjs
./lib/schema.mjs
./lib/validate.mjs
./schema.mjs
node:crypto
node:fs
node:path
node:url
```

| 审计项 | 结果 |
|---|---|
| 第三方 / 非内置导入 | **NONE**（全部为 `node:` 内置或相对路径） |
| `execSync` / `exec` / `spawnSync` / `spawn` / `shell:` | **NONE**（不调用 shell） |
| `eval(` / `new Function(` | **NONE**（无动态代码执行） |

**结论**：**所需新增依赖为零**，实现只使用 Node 内置模块。这与 `service/requirements.txt` 的既有零依赖现状一致，且无需改动 `backend/package.json`（该文件带未提交改动，属高风险文件）。

---

## 4. 回滚路径验证（实测）

### 4.1 回滚设计

- **回滚动作**：删除 `data/kb/generated/` 整个目录
- **原始数据**：**从未被修改**（适配器只读 V1 输入）
- **重建**：重跑 `node scripts/kb/adapt-v1-to-v2.mjs` 即可完整重建

### 4.2 回滚实测步骤与结果

**步骤 1 — 回滚前快照**（对 V1 全部输入 + 输出计算 SHA-256）：

```
generated files: 2
v1 files:        14
```

**步骤 2 — 执行回滚**：删除 `data/kb/generated/` → 目录确认不存在（`Test-Path` = `False`）。

**步骤 3 — 回滚后 V1 完整性**：

| 项 | 结果 |
|---|---|
| V1 文件总数 | 14 |
| V1 被修改 | **0** |
| V1 缺失 | **0** |
| **V1 完整** | ✅ **true** |

**步骤 4 — 回滚后既有 V1 读取路径仍可用**：

| 命令 | 退出码 | 输出 |
|---|---|---|
| `node scripts/verify_graph_schema.mjs` | **0** | `ok: true`，`nodeCount 193`，`relationshipCount 49`（与基线一致） |
| `node scripts/verify_literature_dataset.mjs` | **0** | `Verified 106 authoritative literature entries.` / `Verified 103 authority-backed ancient_text nodes.` |
| `python -m unittest discover -s service -p 'test*.py'` | **0** | `Ran 9 tests` — `OK` |

**步骤 5 — 重建**：`node scripts/kb/adapt-v1-to-v2.mjs` → 退出 **0**，输出目录完整重建。

**步骤 6 — 重建后一致性**：

| 项 | 结果 |
|---|---|
| 快照中的 2 个输出文件 | 全部**逐字节相同**（identical: 2 / changed: 0） |
| 重新校验 | `node scripts/kb/validate-kb-schema.mjs data/kb/generated` → 退出 **0** |

**结论**：✅ **兼容层可安全关闭或回滚。** 删除输出目录即回滚，V1 原始数据与全部既有读取路径完整可用；回滚后可确定性重建。

### 4.3 只读保证（适配器不修改输入）

| 项 | 结果 |
|---|---|
| V1 输入文件运行前后 SHA-256 | **changed = 0 / 14** |
| 适配器内置自检 | `v1_inputs_unchanged: true`（若输入被改动则退出 1） |

### 4.4 幂等与确定性（实测）

**确定性** — 连续两次运行，输出文件 SHA-256：

| 文件 | 两次运行是否逐字节相同 | SHA-256 前缀 |
|---|---|---|
| `kb-v2.kb.json` | ✅ **相同** | `31A94B69D25800CA…` |
| `adaptation-report.json` | ✅ **相同** | `0FB24805955278E2…` |

**幂等** — 重复运行后：实体数 / 关系数**不增长**（282 entities / 214 relations 恒定），输出文件内容不变。

### 4.5 `.gitignore` 与未跟踪状态验证

| 验证项 | 命令 | 结果 |
|---|---|---|
| `.gitignore` 含该条目 | node 读取第 27 行 | `L27: [data/kb/generated/]` |
| 实际生效 | `git check-ignore -v data/kb/generated/kb-v2.kb.json` | 命中 `.gitignore:27`，退出 **0** |
| 目录内容不被列为未跟踪 | `git status --porcelain --untracked-files=all \| Select-String generated` | 匹配行数 **0** ✅ |
| 改动方式 | `git diff -- .gitignore` | 仅 **+1 行** `data/kb/generated/`，纯 append，无其他行改动 ✅ |

**结论**：派生输出**不进入版本库**，符合「不批量覆盖原始数据 + 输出可回滚」的可核验性要求。

---

## 5. 全量质量门验证

### 5.1 `verify-all.ps1` 结果（与基线比对）

命令：`powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1`
**退出码：0** —— 与改动前基线（退出码 0）**一致**。

| 步骤 | 结果 |
|---|---|
| Backend tests | **OK** |
| Frontend lint | **OK** |
| Frontend tests | **OK** |
| Frontend build | **OK** |
| Python unittest | **OK** |
| Literature dataset validation | **OK**（106 / 103） |
| Knowledge graph schema validation | **OK** |
| Knowledge graph coverage report | **OK** |
| Asset budget report | **OK** |
| Docker compose config | **OK** |

### 5.2 ⚠ 重要澄清：`verify-all.ps1` 不覆盖 `scripts/__tests__`

`verify-all.ps1` **不包含** `scripts/__tests__/*.test.mjs` 那套测试，因此它退出 0 **并不代表**那 7 个失败消失了。

| 套件 | 命令 | 退出码 | 与基线 |
|---|---|---|---|
| 后端 Jest | `cd backend && npm test -- --runInBand` | **0** | ✅ 一致（43 套件 / 213 用例） |
| 前端测试 | `cd frontend && npm test` | **0** | ✅ 一致（153 通过 / 0 失败） |
| Python unittest | `python -m unittest discover -s service -p 'test*.py'` | **0** | ✅ 一致（9 通过） |
| **脚本层测试** | `node --test "scripts/__tests__/*.test.mjs"` | **1** | ⚠ **基线已存在**（27 通过 / 7 失败） |

**7 个失败为「基线已存在」，非本轮引入**。根因已核实：测试要求存在 `scripts/python-quality-gate.ps1` 与
`scripts/python_bridge_smoke.cjs`，**这两个文件在仓库中不存在**；且测试断言 `verify-all.ps1` **不应**包含
`python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含该命令。**本轮不修复（范围外），亦未掩盖。**

---

## 6. 一处环境性偶发失败（完整记录，非 KB-001 引入）

### 6.1 现象

`verify-all.ps1` **首次**执行时，`Backend tests` 步骤失败：

```
== Backend tests ==
FAIL: Backend tests
Reason: Command exited with code -1073740791
Quality gate failed.
EXITCODE[verify_all]=1
```

`-1073740791` = `0xC0000409` = **STATUS_STACK_BUFFER_OVERRUN**（Node 进程被操作系统终止）。

### 6.2 排查与结论

| 排查步骤 | 结果 |
|---|---|
| 直接重跑 `npm test -- --runInBand`（第 1 次） | 同样崩溃（`-1073740791`），输出显示部分套件已 `PASS` |
| 检查并发进程 | **12 个 `node` 进程**同时在运行（多个启动于 `18:12`–`19:15`，来自并行的团队会话） |
| 独立重跑（第 2 次） | **退出 0**，`Test Suites: 43 passed, 43 total` / `Tests: 213 passed, 213 total` |
| **连续 4 次独立重跑** | **4/4 全部退出 0**，43 套件 / 213 用例全通过 |
| `verify-all.ps1` 重跑 | **退出 0**，全部 10 个步骤 `OK` |

### 6.3 判定

| 判定项 | 结论 |
|---|---|
| 是否可复现 | **否** —— 4/4 独立重跑与质量门重跑均通过 |
| 是否 KB-001 引入 | **否** —— KB-001 未修改 `backend/` 任何源码或依赖；崩溃发生在 Jest 运行中，与 `scripts/kb/**` 无关联 |
| 是否测试断言失败 | **否** —— 是 Node **进程级崩溃**（0xC0000409），不是断言失败；崩溃前套件显示 `PASS` |
| 最可能原因 | **资源竞争** —— 12 个并发 `node` 进程（多会话共享同一工作目录）导致进程被 OS 终止 |

**判定：环境性偶发（resource contention），非 KB-001 引入，非代码缺陷。** 已通过多次独立重跑与质量门重跑确认稳定通过。

> 依据团队规则「成员共享工作目录，角色名不是文件锁或权限隔离」——本现象正是共享工作目录下并发执行的已知风险，如实记录以供后续复核。

---

## 7. CI 接入建议（本轮不接入）

### 7.1 现状（实测）

| 项 | 实测结果 |
|---|---|
| CI 文件 | `.github/workflows/test.yml` |
| 触发条件 | `push` 到 `main`/`develop`；`pull_request` 到 `main` |
| 当前分支 | `feat/trae-offline-museum` —— **不在触发范围内** |
| CI 中的 Schema 校验 | **无** —— 检索 `verify_graph_schema`、`verify_literature`、`validate-kb-schema`、`adapt-v1-to-v2`、`verify_knowledge_graph_coverage`、`scripts/kb` 全部 **0 命中** |
| CI Node 版本 | `18.x` / `20.x` |

### 7.2 本轮建议：**不接入**

理由（三点）：

1. **触发条件不匹配** —— 当前分支不在 CI 触发范围内，本轮接入无法被实际验证，只会产生「看似已接入但从未运行」的假证据。
2. **Node 版本不兼容风险** —— CI 使用 `18.x`/`20.x`，而本环境验证于 `24.15.0`。KB-001 实现使用 `node:` 前缀与 ESM（`import.meta.dirname` 等），**是否在 18.x 下可用未经验证**，直接接入可能引入未验证的红灯。
3. **超出本轮范围** —— 任务明确「如仓库已有 CI，接入适当的 Schema 校验；**不要无关改造流水线**」，且写入范围限定为本报告文件。

### 7.3 建议的最小接入方案（供 KB-002 或后续迭代执行）

若后续决定接入，**最小改动**为在 `.github/workflows/test.yml` 的 `test` job 中追加**一个 step**（不改动既有 step、不改触发条件）：

```yaml
    - name: Validate KB schema and V1→V2 adapter
      run: |
        node scripts/kb/validate-kb-schema.mjs
        node --test "scripts/kb/__tests__/*.test.mjs"
        node scripts/kb/adapt-v1-to-v2.mjs --dry-run
      env:
        NODE_ENV: test
```

**接入前必须先解决的前置条件**：

| # | 前置条件 | 说明 |
|---|---|---|
| P1 | 确认 Node 版本兼容 | CI 为 18.x/20.x；需先在对应版本验证 KB-001 脚本可运行，或将 `matrix.node-version` 提升到含 24.x（属流水线改造，需另行批准） |
| P2 | 确认触发分支覆盖 | 若希望 PR 阶段即拦截，需把 `feat/*` 纳入 `pull_request.branches`，属触发条件变更 |
| P3 | 决定是否同时纳入既有门禁 | 可一并加入 `verify_graph_schema.mjs` / `verify_literature_dataset.mjs`（当前 CI 完全没有它们），但这会扩大改动面，建议单独评估 |

**不建议**在本轮顺带改动：既有 `test` step、`npm audit` step、`docker compose build` step、`integration tests` step，以及 `matrix.node-version`。

---

## 8. 构建与启动路径影响

| 项 | 命令 | 退出码 | 结论 |
|---|---|---|---|
| Compose 配置可解析 | `docker compose config`（带临时 `JWT_SECRET`） | **0** | ✅ 未受影响 |

**本轮是否影响容器构建或启动路径**：**不影响**。KB-001 只新增了 `scripts/kb/**`（构建期不参与）、`data/kb/**`（数据）与 `.gitignore` 一行；**未修改** `docker-compose.yml`、`backend/Dockerfile`、`frontend/Dockerfile`、`.dockerignore` 或任何容器启动脚本。

**注意**：`docker compose config` 仅验证配置可解析，**不等价于**镜像构建或容器启动成功（见第 9 节未执行项）。

---

## 9. 未执行项（**不得当作通过**）

| # | 未执行项 | 原因 |
|---|---|---|
| 1 | `docker compose up --build` 端到端 | 任务明确本轮不执行；耗时且会创建容器与卷。**未验证镜像构建与容器启动** |
| 2 | `scripts/package_trae_submission.ps1` | 会重写 `release/` 发布产物；本轮禁止打包发布物 |
| 3 | `scripts/verify-demo-stack.ps1 -RequireRunning` | 需要先启动常驻演示栈；本轮不启动常驻服务 |
| 4 | GitHub Actions 实际运行 | 当前分支不在触发范围，且本轮禁止 push。**CI 配置仅为静态阅读** |
| 5 | `node --test scripts/kb/__tests__/independent-qa.test.mjs` | **该文件尚不存在**（属 t4 / KB-001D 交付物，QA 未产出）。已改用存在的 `validate-kb-schema.test.mjs`（退出 0） |
| 6 | `release/` 产物校验 | 本轮禁止打包发布物 |
| 7 | 生产部署 / 数据迁移 | 明确禁止 |

---

## 10. 范围合规自证

| 项 | 结果 |
|---|---|
| 本任务写入文件 | **仅** `docs/kb-001/05-devops-verification.md` |
| 是否修改 `.github/workflows/` | **否**（仅静态阅读） |
| 是否修改 `scripts/kb/**`、`data/kb/**` | **否** |
| 是否修改 `backend/`、`frontend/`、`service/` | **否** |
| 是否修改 `data/knowledge_graph/` | **否** |
| 是否执行生产部署或迁移 | **否** |
| 是否 push / 合并 / 打包 | **否** |
| 报告是否含密钥或 `.env` 取值 | **否**（仅出现环境变量**名称** `JWT_SECRET` 作为临时占位说明，无任何取值） |
| 临时脚本 | 在 `tmp/` 下创建 `devops-dep-check.mjs`、`devops-rollback-check.mjs`、`devops-snapshot.json` 用于审计，**已删除** |

### 回滚测试的副作用说明

为验证回滚路径，我**实际删除过** `data/kb/generated/`，随后**已完整重建**并校验：
重建后两个输出文件与删除前快照 **SHA-256 逐字节相同**，`validate-kb-schema.mjs data/kb/generated` 退出 **0**。
该目录为**派生输出、已 gitignore、可确定性重建**，删除与重建均不影响 V1 原始数据（changed = 0/14）。

---

## 11. 验证方法说明（可复现）

本报告所有结论均由实际执行以下命令取得：

- `node scripts/kb/validate-kb-schema.mjs [<path>]`、`node scripts/kb/adapt-v1-to-v2.mjs [--dry-run|--out]`
- `node --test "scripts/kb/__tests__/*.test.mjs"`
- `node scripts/verify_graph_schema.mjs`、`node scripts/verify_literature_dataset.mjs`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1`
- `cd backend && npm test -- --runInBand`（共 6 次）、`cd frontend && npm test`、`python -m unittest discover -s service -p 'test*.py'`
- `docker compose config`
- `git status --porcelain --untracked-files=all`、`git diff`、`git check-ignore -v`、`Get-FileHash -Algorithm SHA256`
- 自建审计脚本：`tmp/devops-dep-check.mjs`（导入/shell/eval 审计）、`tmp/devops-rollback-check.mjs`（V1 与输出哈希快照比对）

### ⚠ 工具陷阱提醒（影响行数统计）

`pwsh Get-Content` 读本仓库中文文档会以 ANSI 误读 UTF-8 而**误报行数**。
对同一文件 `docs/kb-001/01-schema-contract.md` 的两种读法差异显著：

| 读取方式 | 契约 `2.0.1` 时 | 契约 `2.0.2` 时 |
|---|---|---|
| `pwsh Get-Content` | 876 行 | **728 行** |
| `node` 读取（权威） | 1083 行 | **1108 行** |

（两次测量分别对应契约 `2.0.1` 与 `2.0.2` 版本；行数随契约修订变化，上表用于说明**两种读法本身存在系统性偏差**，
而非固定数值。注意 `Get-Content` 的读数在文件**增长**时反而**下降**，证明其为编码误读而非真实行数。）

**本报告所有文件内容断言均使用 `node` 读取**，未使用 `Get-Content` 做文本判定。
