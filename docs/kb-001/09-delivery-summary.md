# KB-001 Knowledge Schema 2.0 — 本轮交付总结

> ## ⚠ Captain 政策更新（2026-10-08）— 请先读本条
>
> 本文件撰写于「须由 Codex 独立验收」要求仍然有效之时；该要求**已依据用户明确指令废止**。
> 新闭环：`Implementation → QA → Security → DevOps → Reviewer PASS → Captain Release Gate → CLOSED`。
> **KB-001 STATUS = CLOSED**，权威判定见 **`14-kb-001-final-status.md`**（含 33 项变更、121 用例、
> K1 修复与双重独立门禁、git 审计、checkpoint 与归档记录）。
> 本文件正文中所有「最终须由 Codex 独立验收」「本轮未完成项含 Codex 最终验收」等表述**均已失效**；
> 其余内容为**当时的历史记录，未改写**（K1 修复前，契约版本为 2.0.2）。

- 交付范围：**Repository Fact Audit + KB-001 Knowledge Schema 2.0**
- 执行方式：DSH AgentTeams `software-factory` profile（7 成员 + Captain），11 个任务
- 分支：`feat/trae-offline-museum`（**未 push、未合并、未部署**）
- 团队内部验收：**Reviewer t9 返回 PASS**（`07-final-review.md`）
- **边界声明**：该 PASS 仅为 DSH 团队内部结论，**不代表项目整体 CLOSED**；最终须由 Codex 独立验收。

---

## 1. 仓库事实审计结论（摘要）

完整审计见 `00-fact-audit.md`。关键事实（均经实测，非引用文档）：

| 项 | 实测结论 |
|---|---|
| `AGENTS.md` | **不存在**（全仓库递归搜索）；项目规则实际在 `.workbuddy/memory/MEMORY.md` |
| 远端仓库 | `origin` = `yuluchen03-dev/flavor-archaeology-bureau.git`（与参考仓库 `chenfei462/...-public` **不是同一地址**） |
| 工作区 | 分支 `feat/trae-offline-museum`，**大量未提交改动**（既有，非本轮引入） |
| 现有 Schema | `data/knowledge_graph/schema.json` **不是可执行 JSON Schema**（无 `required`），且与数据漂移 |
| Node 后端 | **只读 `nodes_dish.json`** 一个图谱文件；关系与出处数据仅经 Python 侧可达 |
| 古籍节点出处 | 108 条中 **5 条（`text_001`–`text_005`）完全没有出处字段** |
| 评审元数据 | 覆盖率仅 **4/193 = 2.1%**；文件自述「不是外部专家签核」 |
| 图谱规模 | 节点 193（dish 40 / ancient_text 108 / ingredient 16 / technique 10 / dynasty 7 / region 5 / season 7）、关系 49（8 种类型） |
| 文献数据集 | `items` 106、`sources` 3；**无 edition / passage / page 字段**；`total_recipes` 106/106 全为 `null` |
| **关键陷阱** | `scripts/verify_graph_schema.mjs:297` 按 `/^nodes_.+\.json$/` **自动发现**节点类型 → 新增 `data/knowledge_graph/nodes_*.json` 会改变 V1 门禁行为 |

### 1.1 基线命令与退出码（本轮改动前实测）

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/verify_graph_schema.mjs` | 0 | 193 节点 / 49 关系 |
| `node scripts/verify_literature_dataset.mjs` | 0 | 106 / 103 |
| `node scripts/verify_knowledge_graph_coverage.mjs` | 0 | 40 菜品，25% 覆盖 |
| `python -m unittest discover -s service -p 'test*.py'` | 0 | 9 通过 |
| `cd backend && npm test -- --runInBand` | 0 | 43 套件 / 213 用例 |
| `cd frontend && npm test` | 0 | 153 通过 / 0 失败 |
| `cd frontend && npm run lint` | 0 | 干净 |
| `scripts/verify-all.ps1` | 0 | 10 步骤全 OK |

### 1.2 **基线已存在**的失败（非本轮引入）

`node --test "scripts/__tests__/*.test.mjs"` → 退出码 **1**，34 tests / 27 pass / **7 fail**。

根因（已核实）：测试要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`，**这两个文件在仓库中不存在**；且断言 `verify-all.ps1` 不应含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含。

**判定：基线已存在，非本轮引入。本轮不修复（范围外）、未掩盖、未删除负例，数量与基线完全一致。**

---

## 2. Task DAG 与成员实际工作结果

```
t1  KB-001A  Schema 契约 (architect, requirements)          ✅ PASS
 ├─ t2  KB-001B 校验器+Schema (backend, implementation)     ✅ 45 用例
 │   └─ t3  KB-001C 适配器 (backend, implementation)        ✅ 282 实体/214 关系
 ├─ t5  KB-001D2 前端兼容 (frontend, work, 只读)             ✅ 零影响
 ├─ t4  KB-001D  QA 独立验证 (qa, verification)             ✅ 43 用例
 ├─ t6  KB-001D3 Security (security, work, 只读)            ✅ 无 blocker/high
 ├─ t7  KB-001D4 DevOps (devops, work)                      ✅ 回滚已验证
 ├─ t10 KB-001A2 契约修订 → 2.0.1 (architect)               ✅
 ├─ t11 KB-001A3 契约修订 → 2.0.2 (architect)               ✅
 └─ t8  KB-001D5 门禁整合 (architect, work)                  ✅ 8/8
      └─ t9  KB-001E 独立审查 (reviewer, review)             ✅ PASS
```

**11 个任务全部 terminal。** DAG 构建期间调度器拦下 2 处真实冲突并已修正：`scripts/kb/lib/` 写入范围重叠（t2/t3 串行化）、契约未固定适配器 CLI（补 `--out`/`--dry-run` 与退出码语义）。

### 2.1 Captain 修正的 3 处合同缺陷（记录在案）

| # | 缺陷 | 处理 |
|---|---|---|
| 1 | t2 验收要求交付 `scripts/kb/__tests__/`，但契约 §16 把该目录整目录列为 KB-001B **禁止**写入 → 三者不可同时成立，t2 被正确拒绝 | `amend_task` 将 t2 `inScope` 精确加入**单文件** `validate-kb-schema.test.mjs`（与 t4 的 `independent-qa.test.mjs` 文件级不重叠）；契约同步修订（t10 → 2.0.1） |
| 2 | 我在 t2/t3/t4/t9 合同中的「16 条 Passage = ambiguous(15)/unresolved(1)」是**错误旧值** | 实测为 **19 = 16/3/0**；已建 t11 修订契约（2.0.2），并在 t4/t9 验收标准中明确「该状态是**正确反映 V1 真实证据水平**，非缺陷，不得据此要求放宽 TR4」 |
| 3 | 契约 §6 要求关系上 `asserted_at` 为 null 时列入 `unknown_fields`，但 §10.1 关系对象**没有**该字段 → 对任何适配器不可满足（实测曾产生 496 条错误） | t11 新增 P5 条款：关系**省略**该键、不得置 null；§10.1 明确关系字段为完整 6 项 |

### 2.2 成员发现并修正的真实缺陷

| 发现者 | 缺陷 | 处理 |
|---|---|---|
| Architect (t1) | 原 TR1/TR2 要求「每个 Passage 恰好 1 条 `passage_in_edition`」，而 15/16 条有多候选 → 照做等于**伪造**「该版本确含此段」 | 改为 `edition_resolution ∈ {resolved, ambiguous, unresolved}` 三态 + 明文「禁止消歧」 |
| Architect (t1) | literature items 是**丛刊册次**而非内容著作版本；`lit_ccs_006/014/027` 的 title 恰等于内容著作名，按同名建链会语义错误 | 新增 `collected_series` + `edition_contains_work` |
| Backend (t2) | `E_DUPLICATE_ID` 原先 `file='-'`，违反「每条错误须含文件位置」 | 改为归属真实仓库相对路径 |
| Backend (t3) | 契约 §13.5 数量错误（20→23 候选、16→19 Passage）、《饮膳正要》结论错误 | 按真实数据执行、**未迁就文档改数字**，偏差写入 `adaptation-report.json`；t11 修订契约 |
| Architect (t11) | M15 版本映射错误（实测 2/2/2/**3**/2 合计 11 条边）、§18 标签重号 | 一并更正 |
| Security (t6) | **M1 medium**：`adapt-v1-to-v2.mjs:1330` 的 `--out` 无仓库边界校验 | 未自行修改（只读范围），上报并列入 KB-002 前修复项 |

---

## 3. 修改文件、目的和兼容影响

**本轮共 30 项变更** = `M .gitignore`（+1 行）+ **29 个新增文件**。

> 计数说明：本文件初稿写「27 项」，是**早期快照**（当时 `06-kb-001-gate.md`、`07-final-review.md`、`09-delivery-summary.md` 尚未产出）。终态以 Captain 实测的 `git status --porcelain --untracked-files=all` 为准：**30 项**（1 修改 + 29 新增）。`data/kb/generated/` 的 2 个派生文件已被 `.gitignore` 正确忽略，不计入。

| 类别 | 文件 | 目的 | 兼容影响 |
|---|---|---|---|
| Schema | `data/kb/schema/kb-schema.v2.json` | 17 实体 / 24 关系的唯一事实来源 | **无** —— 新目录，无既有读取方 |
| 示例 | `data/kb/examples/valid/`（3）、`invalid/`（7） | 校验器内置合法集与负例集 | **无** |
| 校验器 | `scripts/kb/validate-kb-schema.mjs` + `lib/{errors,schema,validate}.mjs` | 可执行校验器，退出码 0/1/2 可用于 CI | **无** —— 新脚本，不接入既有流程 |
| 适配器 | `scripts/kb/adapt-v1-to-v2.mjs` + `lib/adapt/mapping.mjs` | V1→V2 结构转换 | **无** —— 只读 V1、输出到 `data/kb/generated/` |
| 测试 | `scripts/kb/__tests__/validate-kb-schema.test.mjs`（45）、`independent-qa.test.mjs`（43） | 实现方自测 + QA 独立验证 | **无** |
| 文档 | `docs/kb-001/00`–`09`（**10 份**） | 审计、契约、验证、审查、交付记录 | **无** |
| 忽略 | `.gitignore` +1 行 `data/kb/generated/` | 派生输出不纳入版本控制 | **无** |

### 3.1 兼容性结论

| 项 | 结论 |
|---|---|
| V1 数据 | **零改动**（`data/knowledge_graph/**`、`recipes`、`fragments`、`literature` 全部未变，13/13 输入文件 SHA-256 运行前后不变） |
| V1 读取路径 | **零改动**（`service/knowledge_graph.py`、`LightModeService.js`、`VisionService.js`、`VisionCandidateMapper.js`、`FragmentService.js` 的 `git diff` 全 clean） |
| 前端 | **零运行时影响**（对 KB-001 产物引用数 0；无 `import.meta.glob`/`require.context`；`frontend/src` 无本轮写入） |
| 现有 API | **未修改** |
| 依赖 | **零新增第三方依赖**（`frontend/package.json`、`service/requirements.txt` 未改） |
| 既有门禁 | 全部保持退出 0（图谱 193/49、文献 106/103、Jest 43/213、前端 153/0、Python 9） |

---

## 4. 实际执行的测试命令、退出码和结果

### 4.1 本轮新增能力

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** | `PASSED: 3 file(s), 23 entities, 26 relations` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | **0** | tests 88 / pass 88 / fail 0（45 自带 + 43 独立） |
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | 不写任何文件、不建目录 |
| `node scripts/kb/adapt-v1-to-v2.mjs` | **0** | 282 entities / 214 relations |

### 4.2 回归（与基线逐项一致）

| 命令 | 退出码 | 与基线 |
|---|---|---|
| `node scripts/verify_graph_schema.mjs` | **0** | 一致（193 / 49） |
| `node scripts/verify_literature_dataset.mjs` | **0** | 一致（106 / 103） |
| `node scripts/verify_knowledge_graph_coverage.mjs` | **0** | 一致 |
| `cd backend && npm test -- --runInBand` | **0** | 一致（43 / 213） |
| `cd frontend && npm test` | **0** | 一致（153 / 0） |
| `cd frontend && npm run lint` | **0** | 一致 |
| `python -m unittest discover -s service -p 'test*.py'` | **0** | 一致（9） |
| `powershell -File scripts/verify-all.ps1` | **0** | 一致（10 步骤全 OK） |
| `docker compose config` | **0** | 一致 |
| `node --test "scripts/__tests__/*.test.mjs"` | **1** | **基线已存在**（27/7），非本轮引入 |

**本轮引入的失败 = 0。**

### 4.3 Captain 独立构造的负例（非复用成员测试）

用 Node 生成夹具（规避 PowerShell 编码陷阱），用后即删：

| 注入的缺陷 | 退出码 | 错误码 |
|---|---|---|
| 删除 `edition_of_work`（断链） | **1** | `E_TRACE_BROKEN` + `E_TRACE_MISSING` + `E_CLAIM_NO_EVIDENCE` |
| 关系指向不存在的节点 | **1** | `E_DANGLING_REFERENCE` |
| 未知关系类型 | **1** | `E_UNKNOWN_RELATION_TYPE` |
| 端点类型错误 | **1** | `E_RELATION_ENDPOINT_TYPE` |
| `review_status="verified"` | **1** | `E_ENUM_INVALID`（枚举不含 verified） |
| `passage_in_edition` 挂到非 resolved Passage | **1** | `E_TRACE_MISSING` + `E_TRACE_WEAKENS_CLAIM` |
| 不存在的输入路径 | **2** | `E_DOC_SHAPE` |

这七项恰好覆盖用户要求的全部检查类别，且错误码**精确区分**。

### 4.4 零伪造来源核对（用户核心要求）

| 核对项 | 实测 |
|---|---|
| V1 不同 URL 数 vs 输出 URL 数 | 6 → 3 |
| **输出中 V1 不存在的 URL（= 伪造）** | **0** |
| 输出中带 `source_url`/`catalog_url` 的实体 | **0** |
| `publication_year` 非 null | **0** |
| Passage `locator` 非 null | **0** |
| 零 fixture 泄漏（`fixture`/`minimal`/`not_historical_evidence`） | **0 / 0 / 0** |
| `text_001`–`text_005` | 全部 `insufficient` + `derivation=unresolved` + `source_locator=null`，**未补造** |
| `lit_ccs_006/014/027` | 106 条 `edition_of_work` **全部**指向丛刊；指向内容著作 = **0** |
| `review_status` 分布 | `{unreviewed: 282}`；字面量 `"verified"` = **0** |
| `HistoricalClaim` | 34/34 **全部** `insufficient` |

### 4.5 确定性与幂等

| 核验项 | 实测 |
|---|---|
| 连续两次运行输出 | **逐字节相同**（`31a94b69d25800ca…` / `0fb24805955278e2…`） |
| 重复运行 | 实体/关系数**不增长**；重复 id = 0、重复三元组 = 0 |
| V1 输入 | 13/13 **SHA-256 不变** |

---

## 5. Reviewer 的独立验收结论

**`docs/kb-001/07-final-review.md`（477 行 / 30,548 字节）→ `# PASS`**

| 项 | 内容 |
|---|---|
| **BLOCKERS** | **无** |
| **NON_BLOCKERS** | K1 **medium**（`--out` 无仓库边界校验，无服务调用方，不阻断）+ K2–K6 low |
| **TEST_EVIDENCE** | 5 条 verify 命令全退出 0；88 用例全绿；7 负例逐个退出 1 |
| **ARCHITECTURE_COMPLIANCE** | 17 实体齐全；24 关系端点缺失 = 0；4 条追踪链端点正确 |
| **DATA_TRUST_COMPLIANCE** | 6 组零伪造核对全部通过；`verified` 结构性不可达（三重证据） |
| **REGRESSION_STATUS** | **本轮引入失败 = 0**；`scripts/__tests__` 7 个失败为基线已存在 |

**门禁 8/8 全部 PASS**（`06-kb-001-gate.md`）。

**Reviewer 独立性**：实施方未自评 PASS；QA 未改生产实现（Reviewer 独立计算 SHA-256 与 QA 声明逐字节吻合）；Reviewer 未参与实现、未改任何实现文件；未删负例（invalid 7 / valid 3 不变）；未降门槛（`skipped 0` / `todo 0`）。

**Reviewer 声明的边界**：PASS 仅为 DSH 团队内部结论，**不代表项目整体 CLOSED**；最终须由 Codex 独立验收。

---

## 6. 回滚方法

### 6.1 完全回滚（撤销本轮全部变更）

```powershell
# 1) 删除新增实现与文档（均为未跟踪文件，安全）
Remove-Item -Recurse -Force scripts\kb
Remove-Item -Recurse -Force data\kb
Remove-Item -Recurse -Force docs\kb-001

# 2) 撤销 .gitignore 的 1 行追加
git checkout -- .gitignore
```

**影响**：V1 数据、V1 读取路径、既有 API、前端**从未被修改**，因此无需回滚；既有门禁保持退出 0。

### 6.2 仅回滚适配输出（保留 Schema 与校验器）

```powershell
Remove-Item -Recurse -Force data\kb\generated
```

**影响**：`data/kb/generated/` 为派生数据、已 gitignore、可确定性重建。重建：`node scripts/kb/adapt-v1-to-v2.mjs`。

**DevOps 已实际执行过该回滚并重建**：删除后 V1 changed=0/14、`verify_graph_schema` 与 Python unittest 均退出 0；重建后两个输出文件与删除前快照 SHA-256 **逐字节相同**。

### 6.3 单项回滚

| 想撤销 | 操作 |
|---|---|
| 只撤销校验器 | 删除 `scripts/kb/validate-kb-schema.mjs` + `scripts/kb/lib/{errors,schema,validate}.mjs` |
| 只撤销适配器 | 删除 `scripts/kb/adapt-v1-to-v2.mjs` + `scripts/kb/lib/adapt/`，并 `git checkout -- .gitignore` |
| 只撤销文档 | 删除 `docs/kb-001/` |

**注意**：本轮**未** commit，所有新增文件均为未跟踪状态，因此回滚**不会**影响任何已跟踪文件的历史。

---

## 7. 尚存问题及 KB-002 启动条件

### 7.1 尚存问题

**（a）基线已存在（非本轮引入，本轮不修复）**

| # | 问题 |
|---|---|
| B1 | `scripts/__tests__` 7 个失败（引用不存在的 `python-quality-gate.ps1` / `python_bridge_smoke.cjs`） |
| B2 | `text_lit_076/084/097` 缺失（根因 `build_literature_dataset.mjs:237` 按 title 去重） |
| B3 | `先秦` 的 `start_year == end_year == -221`（V1 数据缺陷） |
| B4 | `recorded_in` 的 `source_text` 与目标 `title` 冲突 5 条（`dish_005,007,008,009,010`） |
| B5 | `deliverables/gstack/pre-launch-check-2026-09-25.md` 结论 🔴 No-Go（6 项 P0） |

**（b）本轮发现但未修复（移交 KB-002）**

| # | 问题 | 定级 |
|---|---|---|
| **K1** | `adapt-v1-to-v2.mjs:1330` 的 `--out` 无仓库边界校验，可写出仓库外 | **medium** |
| K2 | `backend/test_escape_8.js` 未跟踪遗留调试脚本（mtime `2026-09-25`，非本轮） | low |
| K3 | 前端测试对源码文本强耦合（99 处 `readFileSync` + 正则断言） | — |
| K4 | `generatedDishImages.js` 被 gitignore，干净克隆需先跑 `build:offline:assets` | — |
| K5 | CI 未接入 KB Schema 校验 | — |

**（c）本轮未完成项**：CI 未接入（给出最小方案）、`docker compose up` 未执行、**Codex 最终验收未执行**。

### 7.2 KB-002 启动条件

**硬前置（必须满足）**

| # | 条件 |
|---|---|
| 1 | KB-001 门禁 1–8 全部通过 ✅（已满足） |
| 2 | Reviewer 返回 PASS ✅（已满足，但**仅为团队内部结论**） |
| 3 | **K1（medium）已修复**：`adapt-v1-to-v2.mjs:1330` 增加 `--out` 包含性校验（拒绝不以 `REPO_ROOT + path.sep` 开头的 `outDir`，退出码 2），**并同步补齐契约 §13.6 的 `--out` 约束**（契约层根因） |
| 4 | 契约版本冻结且与真实数据一致（现 `2.0.2`） |

**软前置（建议满足）**：决策 K3（7 个基线失败修复或豁免后再纳入 CI）；确定 CI 接入方案（含 Node 版本兼容性验证）；明确 KB-002 Golden 10 的来源标准与「来源不足不得凑数」的可校验判据；确认 KB-002 数据落位沿用 `data/kb/`。

**KB-001 为 KB-002 已就绪的能力**：17 实体 + 24 关系版本化 Schema；可执行校验器（35 错误码，退出码可用于 CI）；追踪链规则 TR1–TR8；`unknown`/`insufficient` 显式表达 + No-Fabrication N1–N5；`review_status` 枚举不含 `verified`（结构性阻止静默 verified）；V1→V2 适配器（幂等、只读、可回滚）；测试基础 88 用例（不等到 KB-007 才建测试）。

**KB-002 必须避免的 7 个陷阱**

| # | 陷阱 |
|---|---|
| 1 | 不得把 V2 数据写入 `data/knowledge_graph/`（`verify_graph_schema.mjs:297` 会自动发现 `nodes_*.json`） |
| 2 | 不得通过放宽 TR4 让 Claim 变 `sufficient` 来「好看」 |
| 3 | 不得为缺失出处编造卷/页/版本/年份 |
| 4 | 不得把网络线索自动升级为权威证据 |
| 5 | 多候选 Edition 时**不得**任选一个消歧 |
| 6 | 统计中文文档行数须用 `node` 或 `Get-Content -Encoding utf8`（PowerShell 以 ANSI 误读 UTF-8 会误报行数） |
| 7 | 取退出码不要依赖 PowerShell 管道 `$LASTEXITCODE`（会让 `Select-Object -First N` 后的值误读为 -1） |

### 7.3 后续路线（仅规划，本轮未实施）

KB-002 Golden 10 证据数据（蟹酿橙优先候选，来源不足不得凑数）→ KB-003 词法 + 向量 + 图谱混合检索 → KB-004 确定性时间与地域校验 → KB-005 Claim-level Evidence 与引用支持检查 → KB-006 历史忠实版 + 现代厨房版 → KB-007 独立 Benchmark 与质量门禁 → KB-008 真实复原实验记录与反馈闭环。

**最终质量目标（后续整体验收，本轮未实现，不得填报为已达标）**：Retrieval Recall@5 ≥ 90%、Citation Precision ≥ 95%、Claim Support Rate ≥ 92%、Temporal Accuracy ≥ 98%、Ingredient-step Consistency ≥ 95%、Abstention Accuracy ≥ 90%、Critical Temporal Error = 0、Critical Safety Error = 0。

---

## 8. 交付物清单

| 路径 | 行数 / 大小 | 内容 |
|---|---|---|
| `docs/kb-001/00-fact-audit.md` | 344 行 / 27,194 B | 仓库事实审计（含勘误） |
| `docs/kb-001/01-schema-contract.md` | 1108 行 / 82,694 B | Schema 契约 **2.0.2**（唯一实现依据） |
| `docs/kb-001/02-frontend-compat.md` | 284 行 / 18,753 B | 前端兼容影响（零运行时影响） |
| `docs/kb-001/03-qa-verification.md` | 369 行 / 18,016 B | QA 独立验证 |
| `docs/kb-001/04-security-review.md` | 495 行 / 24,378 B | Security 审查（无 blocker/high） |
| `docs/kb-001/05-devops-verification.md` | 419 行 / 20,378 B | DevOps 验证（回滚实测） |
| `docs/kb-001/06-kb-001-gate.md` | 745 行 / 48,502 B | 门禁证据整合（8/8） |
| `docs/kb-001/07-final-review.md` | 477 行 / 30,548 B | **Reviewer 最终审查 → PASS** |
| `docs/kb-001/08-captain-verification.md` | 516 行 / 33,187 B | Captain 独立核验记录 |
| `docs/kb-001/09-delivery-summary.md` | 336 行 / 21,119 B | 本交付总结 |
| `data/kb/schema/kb-schema.v2.json` | 22,388 B | V2 Schema（17 实体 / 24 关系） |
| `scripts/kb/validate-kb-schema.mjs` + `lib/` | 4 文件 | 可执行校验器 |
| `scripts/kb/adapt-v1-to-v2.mjs` + `lib/adapt/` | 2 文件 | V1→V2 适配器 |
| `scripts/kb/__tests__/` | 2 文件 / 68,813 B | 45 + 43 = 88 用例 |
| `data/kb/examples/` | 10 文件 | 3 合法 + 7 负例 |

### 8.1 密钥扫描终态（Captain 独立执行）

对 `docs/kb-001/**`、`scripts/kb/**`、`data/kb/{schema,examples}/**` 扫描 6 类密钥模式，共 5 处命中，**全部经 Captain 逐一核实为误报**：

| 命中位置 | 性质 |
|---|---|
| `scripts/kb/lib/errors.mjs:7`（注释）、`:12`（正则） | **脱敏器自身的模式定义** —— 即 `sanitizeMessage` 用来识别并替换绝对路径的规则。Security 报告独立得出同一结论（其 L1 项） |
| `docs/kb-001/08-captain-verification.md`（3 处） | Captain **自己列举的被扫描模式名**（自指行） |
| `docs/kb-001/04-security-review.md`（1 处） | 报告中的**占位符示例**，非真实路径 |

**功能性证明脱敏器有效**：`sanitizeMessage('C:\Users\someone\secret.txt')` → **`"<path>"`**。
**真实凭据命中 = 0。** 未读取或输出任何 `.env` 取值。

---

## 9. 诚实声明

1. **未 push、未合并、未部署**；本轮所有新增文件均为**未跟踪**状态，未 commit。
2. **未编造**任何古籍原文、专家审核、实验数据或引用。适配输出中**零伪造 URL**、零补造出处字段、零 fixture 泄漏。
3. **未执行**的检查已在各报告与本文件第 4 节明确标注（`docker compose up` 端到端、`release/` 打包、GitHub Actions 实际运行、浏览器视觉回归、符号链接/并发竞态/磁盘写满/超大输入、`backend/.env` 内容），**均未写成通过**。
4. **基线已存在的 7 个失败**已如实区分，未修复、未掩盖、未删除负例。
5. **限流中断**（两轮 workbuddy 429）导致 t2 与 t4/t6/t7/t11 被标记 failed；Captain 核实无损坏后重派完成。这是执行环境问题，**非实现缺陷**。
6. DSH Reviewer 的 **PASS 仅为团队内部结论**，**不代表项目整体 CLOSED**；最终须由 **Codex 独立验收**。
