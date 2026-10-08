# KB-001E 独立审查与最终验收门禁（Reviewer）

> ## ⚠ Captain 政策更新（2026-10-08）— 请先读本条
>
> 本报告结论「**PASS**」**有效且仍为 KB-001 的 Reviewer Gate 依据**。
> 但报告末尾「最终必须由 Codex 独立验收」的声明**已依据用户明确指令废止**；
> 新闭环为 `Implementation → QA → Security → DevOps → Reviewer PASS → Captain Release Gate → CLOSED`。
> **KB-001 STATUS = CLOSED**（见 `14-kb-001-final-status.md`）。
> 本报告其余内容为**当时的历史记录，未改写**。
>
> **补充**：本报告审查的是 K1 修复**之前**的变更集。K1（`--out` 仓库边界校验）随后由
> t12 实现、t13 QA 验证、t14 Security Gate 与 t15 Reviewer Gate 双重独立门禁通过，
> 详见 `12-k1-security-gate.md`、`13-k1-reviewer-gate.md`、`14-kb-001-final-status.md`。

- 审查人：Reviewer（独立只读审查，**未参与 KB-001 任何业务实现**）
- 审查对象：KB-001 本轮全部实际变更
- 审查方式：**独立复跑命令 + 直接读取实际文件 + 独立构造核对**，不转述成员报告结论
- 结论：**PASS**

> 本审查中所有数字均来自 Reviewer 亲自执行的命令或亲自读取的文件。
> 成员报告仅作为「待验证的声明」，凡未被我复现的，不写入本报告。
> 未执行的检查在第 8 节明确标为未验证。

---

## 1. BLOCKERS

**无 blocker。**

| 检查项 | Reviewer 独立结果 |
|---|---|
| 是否存在 blocker 级缺陷 | **无** |
| 是否存在伪造来源 / 静默补全 | **无**（第 6.2 节 6 组独立核对） |
| 是否存在本轮引入的测试失败 | **无**（第 7 节） |
| 是否存在范围越界写入 | **无**（第 5.3 节） |
| 是否存在未修复的 high 安全问题 | **无**（唯一 medium 为 K1，见第 2 节） |

依据：用户「KB-001 完成门禁」8 项**全部通过**（第 3 节逐项列出，每项附我的实测证据）。

---

## 2. NON_BLOCKERS

| ID | 级别 | 问题 | 建议 |
|---|---|---|---|
| K1 | **medium** | `scripts/kb/adapt-v1-to-v2.mjs:1330` 的 `const outDir = path.resolve(REPO_ROOT, args.out);` **未做仓库边界校验**，`--out` 可写出仓库外。**我已独立确认**：L1330 确为该写法；全文件检索 `outDir` 的 `startsWith`/`relative` 守卫 → **0 命中**。 | **不阻断本轮**：该 CLI 是开发者手动工具，检索 `backend/src`、`service`、`frontend/src` 对 `adapt-v1-to-v2` 的引用 → **0**，无服务调用方；契约 §13.6 只约束输出内容，未要求该约束。属纵深防御缺失。**建议 KB-002 前修复**：在 L1330 后拒绝不以 `REPO_ROOT + path.sep` 开头的 `outDir`，以退出码 2 报错，并同步补契约。 |
| K2 | low | `backend/test_escape_8.js` 为未跟踪遗留文件。**我已确认** mtime `2026-09-25 22:05`，**早于本轮**（KB-001 产物为 `2026-10-08`）→ 非本轮引入。 | 后续清理，不属 KB-001 范围 |
| K3 | low | `scripts/__tests__` 有 **7 个失败**（`node --test "scripts/__tests__/*.test.mjs"` → 退出 **1**，34 tests / 27 pass / 7 fail）。根因：测试要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`，二者在仓库中不存在；且断言 `verify-all.ps1` 不应含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含。**经我核对为基线已存在**（详见第 7 节）。 | 需 KB-002+ 决策：修复或显式豁免后再纳入 CI |
| K4 | low | 前端测试对源码文本强耦合（99 处 `readFileSync` + 正则断言）；离线包有 `REQUIRED_LABELS` 门禁。 | 后续 UI 改动须同步 `pages/__tests__`、`offline/__tests__` 与 `verify_offline_bundle.mjs:4-11` |
| K5 | low | `frontend/src/offline/data/generatedDishImages.js` 被 gitignore，干净克隆需先跑 `npm run build:offline:assets`。 | 环境前置，写入后续文档 |
| K6 | low | 契约 §16 与安全报告曾引用 `.gitignore:16`，实际该行回退后重新追加时位于 **第 27 行**。 | t8 门禁文档已按实测行号 27 记录并显式说明行号变更，**处理正确**，无需动作 |

**无 high、无 blocker 安全问题**，与 Security 审查结论一致（且其 M1 经我独立复现）。

---

## 3. 完成门禁逐项复核（用户 8 项要求）

### 门禁 1：所有约定实体均有 Schema ✅ PASS

**Reviewer 实测**：直接解析 `data/kb/schema/kb-schema.v2.json` → `entities` 键数 = **17**。
逐个比对用户要求的 17 实体（`SourceWork`、`SourceEdition`、`SourcePassage`、`HistoricalClaim`、`Dish`、`Ingredient`、`IngredientState`、`Technique`、`Utensil`、`Measurement`、`TimePeriod`、`Region`、`Season`、`RestorationVersion`、`ExpertReview`、`SafetyRule`、`Experiment`）→ **全部存在，无缺无多**。
`schema_version` = **`2.0.0`**。

### 门禁 2：所有关系有合法端点约束 ✅ PASS

**Reviewer 实测**：`relations` 键数 = **24**。
逐条检查 `source` / `target` 端点约束 → **缺少端点的关系 = 0**。
`content_class` 枚举 4 值齐全：`historical_fact` / `historical_inference` / `modern_adaptation` / `user_experiment`。
`review_status` 枚举 **5 值且刻意不含 `verified`**。

### 门禁 3：来源与 Claim 追踪链可校验 ✅ PASS

**Reviewer 实测**（直接读 schema 的 4 条追踪链关系定义）：

| 关系 | source → target | 结果 |
|---|---|---|
| `passage_in_edition` | `SourcePassage` → `SourceEdition` | ✅ |
| `edition_of_work` | `SourceEdition` → `SourceWork` | ✅ |
| `claim_supported_by` | `HistoricalClaim` → `SourcePassage` | ✅ |
| `claim_refuted_by` | `HistoricalClaim` → `SourcePassage` | ✅ |

**正向证据**：我确认 `data/kb/examples/valid/fixture-all-entities.kb.json` 中确实包含 `"type": "passage_in_edition"` 与 `edition_resolution: "resolved"`，且该夹具 `node scripts/kb/validate-kb-schema.mjs <file>` → **退出 0**。
→ 即「追踪链可校验」的**退出码 0 正向路径**已被真实覆盖。

**反向证据**：7 个负例逐个被我调用，全部退出 **1**（详见第 5 节）。
### 门禁 4：数据校验器及负例测试通过 ✅ PASS

**Reviewer 实测命令与退出码**：

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node scripts/kb/validate-kb-schema.mjs` | **0** | `PASSED: 3 file(s), 23 entities, 26 relations` |
| `node --test scripts/kb/__tests__/independent-qa.test.mjs` | **0** | `tests 43 / pass 43 / fail 0` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |

**负例有效性抽查（我逐个调用 7 个 invalid 夹具）**：

| 夹具 | 退出码 | 错误数 | 错误码 |
|---|---|---|---|
| `bad-entity-and-relation-type` | 1 | 2 | `E_UNKNOWN_ENTITY_TYPE`, `E_UNKNOWN_RELATION_TYPE` |
| `bad-fields-and-refs` | 1 | 10 | `E_MISSING_FIELD`, `E_FIELD_TYPE`, `E_DUPLICATE_ID`, `E_DANGLING_REFERENCE`, `E_ENUM_INVALID`, `E_TIME_RANGE_INVALID`, `E_RELATION_ENDPOINT_TYPE`, `E_RELATION_SHAPE` |
| `bad-no-fabrication` | 1 | 7 | `E_MEASUREMENT_FABRICATED`, `E_MEASUREMENT_INCOMPLETE`, `E_REVIEW_UNVERIFIABLE`, `E_EVIDENCE_UNKNOWN_CONFLICT`, `E_PROVENANCE_MISSING`, `E_REVIEW_STATUS_UNSUPPORTED`, `E_HERITAGE_UNSOURCED` |
| `bad-passage-in-edition-ambiguous` | 1 | 1 | `E_TRACE_MISSING` |
| `bad-passage-in-edition-unresolved` | 1 | 1 | `E_TRACE_MISSING` |
| `bad-review-status-verified` | 1 | 1 | `E_ENUM_INVALID` |
| `bad-trace-chain` | 1 | 9 | `E_TRACE_MISSING`, `E_CLAIM_NO_EVIDENCE`, `E_EVIDENCE_REVIEW_CONFLICT`, `E_PROVENANCE_UNRESOLVED_CONFLICT`, `E_EVIDENCE_UNKNOWN_CONFLICT`, `E_REVIEW_STATUS_UNSUPPORTED`, `E_UNKNOWN_UNDECLARED` |

**负例未被删除或降门槛**：`data/kb/examples/invalid/` 仍为 **7** 个、`valid/` 仍为 **3** 个 —— 与契约 §3.1 记录的实测数量一致。
**断言有效**：每个负例均退出 1 且报出**语义精确**的错误码（非笼统失败）。

### 门禁 5：V1 兼容路径可用 ✅ PASS

**Reviewer 实测**：

| 检查 | 结果 |
|---|---|
| `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | 退出 **0**，且报告 `v1_inputs_unchanged: true`、`passage_in_edition_relations: 0` |
| V1 数据文件本轮改动 | **无** —— `git status` 对 `data/knowledge_graph`、`data/recipes`、`data/fragments`、`data/literature` 输出为**空** |
| `node scripts/verify_graph_schema.mjs` | 退出 **0**（193 节点 / 49 关系，与基线一致） |
| `node scripts/verify_literature_dataset.mjs` | 退出 **0**（106 条文献 / 103 条权威背书节点） |
| V1 读取路径是否被改 | **未改** —— `service/knowledge_graph.py`、`LightModeService.js`、`VisionService.js`、`VisionCandidateMapper.js`、`FragmentService.js` 的 mtime 均为 `2026-09-25`（早于本轮 `2026-10-08`） |

### 门禁 6：原有关键演示没有本轮引入的回归 ✅ PASS

详见第 7 节。**本轮引入的失败 = 0。**

### 门禁 7：没有伪造或静默补全来源 ✅ PASS

详见第 6.2 节 6 组独立核对，**全部通过**。

### 门禁 8：文档命令已实际验证 ✅ PASS

**Reviewer 亲自执行**了 t9 契约要求的 5 条 verify 命令（第 5.1 节），全部退出 0；
另独立执行后端 Jest、前端 test、Python unittest、脚本层测试、`verify_graph_schema`、`verify_literature_dataset`、`validate-kb-schema`（默认 + generated）、`adapt --dry-run`、`node --test`（QA 套件）—— 退出码全部记录于第 5 节与第 7 节。

---

## 4. ARCHITECTURE_COMPLIANCE

### 4.1 契约符合性

| 契约要求 | Reviewer 实测 | 判定 |
|---|---|---|
| V2 数据落位 `data/kb/` 之下 | 全部 V2 产物位于 `data/kb/schema/`、`data/kb/examples/`、`data/kb/generated/` | ✅ 符合 |
| **禁止**写入 `data/knowledge_graph/` | `git status` 对该路径输出为空；且 `data/kb/` 下**无 `nodes_*.json`**（避免触发 `verify_graph_schema.mjs:297` 的 `nodes_*.json` 通配自动载入） | ✅ 符合 |
| 不修改 V1 读取路径 | `service/knowledge_graph.py` 与 5 个 `backend/src/services/*.js` 的 mtime 均为 `2026-09-25`，早于本轮 `2026-10-08` | ✅ 符合 |
| **零新增第三方依赖** | 实现文件 import 仅 `node:` 内置模块与相对路径；`frontend/package.json`、`service/requirements.txt` 未改；`backend/package.json` 的改动经 mtime 与 diff 内容核定为**基线既有** | ✅ 符合 |
| 适配器输出为派生数据、不纳入版本控制 | `.gitignore` 单行追加 `data/kb/generated/`；`git check-ignore -v` 命中 `.gitignore:27`，退出 0 | ✅ 符合 |
| 契约版本化 | `01-schema-contract.md` 版本 `2.0.2`，§20 含 `2.0.0`/`2.0.1`/`2.0.2` 三条变更记录 | ✅ 符合 |
| 文件写入范围（§16） | 27 项变更全部落在各任务声明范围内；未发现越界写入 | ✅ 符合 |
| **禁止**改 UI / Prompt / 复原算法 / evidenceScore | `service/llm_reasoner.py`、`service/restoration_engine.py`、`RestorationService.js`、`routes/api.js` 均无本轮改动；`frontend/src` 最新 mtime `2026-09-25 23:01` | ✅ 符合 |
| 不引入新基础设施 | 无 Neo4j / Milvus / Elasticsearch / Kafka 等依赖或配置改动 | ✅ 符合 |

### 4.2 架构分层合理性

| 检查 | 结论 |
|---|---|
| Schema 作为唯一事实来源 | ✅ `data/kb/schema/kb-schema.v2.json` 被校验器读取；适配器输出经该校验器验证通过（退出 0） |
| 校验器与适配器职责分离 | ✅ 校验器只读（输入哈希不变）；适配器只写独立输出目录，不触碰输入 |
| 共享库复用而非复制 | ✅ `scripts/kb/lib/{errors,schema,validate}.mjs` 被两个入口复用；适配器仅新增 `lib/adapt/mapping.mjs`，未重写他人文件 |
| 幂等与可回滚 | ✅ 回滚 = 删除 `data/kb/generated/`，V1 数据从未被修改（13 个输入文件哈希 changed=0） |
| 退出码语义可用于 CI | ✅ 0=通过 / 1=校验失败 / 2=运行错误，三条路径均被我实测确认 |

### 4.3 与既有工程约定的兼容性

| 检查 | 结论 |
|---|---|
| 是否引入根 `package.json` 或改动构建入口 | ✅ 未引入；Node 脚本以 `node scripts/kb/*.mjs` 从仓库根执行，与既有 `scripts/*.mjs` 约定一致 |
| 是否影响 Docker / compose | ✅ 未修改 `docker-compose.yml`、`backend/Dockerfile`、`frontend/Dockerfile`、`.dockerignore` |
| 是否影响 CI 流水线 | ✅ 未修改 `.github/workflows/**`（其 `M` 状态为基线既有，mtime `2026-09-26 00:19`） |
| 是否影响前端离线打包 | ✅ 前端对 KB-001 产物引用数 = 0；无目录通配逻辑；`fixture` 等夹具词未进入输出 |

---

## 5. TEST_EVIDENCE

### 5.1 t9 契约规定的 verify 命令（Reviewer 亲自执行）

| # | 命令 | 退出码 | 观察到的输出 |
|---|---|---|---|
| 1 | `node scripts/kb/validate-kb-schema.mjs` | **0** | `KB schema validation PASSED: 3 file(s), 23 entities, 26 relations` |
| 2 | `node scripts/kb/adapt-v1-to-v2.mjs --dry-run` | **0** | `passage_in_edition_relations: 0`、`v1_inputs_unchanged: true`、`insufficient: 34` |
| 3 | `node --test scripts/kb/__tests__/independent-qa.test.mjs` | **0** | `tests 43 / pass 43 / fail 0` |
| 4 | `node scripts/verify_graph_schema.mjs` | **0** | `ok: true`、`nodeCount 193`、`relationshipCount 49`、`flagshipCitationCount 2` |
| 5 | `git status --porcelain` | 0 | 见 4.3 范围核对 |

### 5.2 附加独立复跑

| 命令 | 退出码 | 结果 |
|---|---|---|
| `cd backend && npm test -- --runInBand` | **0** | `Test Suites: 43 passed, 43 total` / `Tests: 213 passed, 213 total` |
| `cd frontend && npm test` | **0** | `tests 153 / pass 153 / fail 0` |
| `python -m unittest discover -s service -p 'test*.py'` | **0** | `Ran 9 tests` — `OK` |
| `node --test "scripts/__tests__/*.test.mjs"` | **1** | `tests 34 / pass 27 / fail 7` —— **基线已存在** |
| `node scripts/verify_literature_dataset.mjs` | **0** | `Verified 106 authoritative literature entries.` / `103 authority-backed ancient_text nodes.` |
| `node scripts/kb/validate-kb-schema.mjs data/kb/generated` | **0** | `PASSED: 1 file(s), 282 entities, 214 relations` |

### 5.3 范围核对（`git status` + mtime 交叉验证）

**Reviewer 实测**：KB-001 本轮新增/修改共 **27 项** = `M .gitignore` + **26 个新增未跟踪文件**。

| 类别 | 数量 | 路径 |
|---|---|---|
| Schema | 1 | `data/kb/schema/kb-schema.v2.json` |
| 示例 | 10 | `data/kb/examples/valid/`（3）+ `invalid/`（7） |
| 校验器 | 4 | `scripts/kb/validate-kb-schema.mjs` + `lib/{errors,schema,validate}.mjs` |
| 适配器 | 2 | `scripts/kb/adapt-v1-to-v2.mjs` + `lib/adapt/mapping.mjs` |
| 测试 | 2 | `__tests__/validate-kb-schema.test.mjs`、`__tests__/independent-qa.test.mjs` |
| 文档 | 8 | `docs/kb-001/00..06`、`08-captain-verification.md` |
| 忽略规则 | 1 | `.gitignore`（仅 +1 行） |

**`.gitignore` 差异**（我实测 `git diff`）：**仅单行追加** `+data/kb/generated/`，无其他改动，无 BOM/CRLF 污染。
`git check-ignore -v data/kb/generated/kb-v2.kb.json` → 命中 `.gitignore:27`，退出 **0**。

**范围越界核对**：`git status` 中存在大量 `M backend/...`、`M frontend/...`、`M service/api_wrapper.py`、`M .github/workflows/test.yml`、大量 PNG→WebP 重命名等条目。**我用 mtime 逐项排除**：

| 文件 | mtime | 判定 |
|---|---|---|
| `backend/src/app.js` | 2026-09-25 16:37 | 基线既有 |
| `backend/src/routes/api.js` | 2026-09-25 22:43 | 基线既有 |
| `backend/package.json` | 2026-09-25 18:09 | 基线既有 |
| `backend/Dockerfile` | 2026-09-25 20:41 | 基线既有 |
| `backend/.env` | 2026-09-25 20:40 | 基线既有 |
| `frontend/src/pages/Home.jsx` | 2026-09-25 12:34 | 基线既有 |
| `frontend/vite.config.js` | 2026-09-25 12:34 | 基线既有 |
| `service/api_wrapper.py` | 2026-09-25 21:34 | 基线既有 |
| `.github/workflows/test.yml` | 2026-09-26 00:19 | 基线既有 |
| `backend/src/services/StarMapService.js` | 2026-09-25 22:33 | 基线既有 |
| `backend/test_escape_8.js` | 2026-09-25 22:05 | 基线既有 |
| **KB-001 产物** | **2026-10-08 15:48–19:19** | **本轮** |

→ **全部越界嫌疑文件均为本轮开始前的既有未提交改动，KB-001 未触碰任何范围外文件。**

**重要澄清**：`backend/package.json` 虽显示为已修改，但其 diff 内容为新增 `db:migrate`/`db:seed-if-empty` 脚本与 `cookie-parser` 依赖，mtime `2026-09-25 18:09` —— **非本轮引入，未升级无关依赖**。

---

## 6. DATA_TRUST_COMPLIANCE

### 6.1 【防误判】V1 真实证据水平的正确解读

契约验收标准明确要求 Reviewer 不得把以下状态误判为缺陷。**我确认这些状态成立，并判定为「正确反映 V1 真实证据水平」**：

| 状态 | Reviewer 实测 |
|---|---|
| `SourcePassage` = 19，分布 `{ambiguous: 16, unresolved: 3}` | ✅ 实测一致 |
| `resolved` = **0** | ✅ 实测一致 |
| `passage_in_edition` 关系数 = **0** | ✅ 实测一致 |
| 19 条 Passage 的 `edition_id` 全为 `null` | ✅ 实测 `non-null = 0` |
| `HistoricalClaim` = 34，**全部** `insufficient` | ✅ 实测 `{insufficient: 34}` |
| 字面量 `"verified"` 出现次数 | ✅ 实测 **0** |

**判定**：本轮 V1 出处覆盖率极低，因此**没有任何 Passage 可判为 `resolved`**，适配器**正确地**未产出 `passage_in_edition`，所有 Claim 均为 `insufficient`。**这是诚实反映证据水平，不是缺陷。** 我**不**要求实现方放宽追踪链约束来补齐，也**不**据此给出 REQUEST_CHANGES。

> 注：t9 契约验收标准中沿用了早期数字「16 条 / ambiguous 15 / unresolved 1」。**实测为 19 条 / 16 / 3**。该差异源于契约 §13.5 的早期算术错误，已由 KB-001A3 修订契约至 `2.0.2` 更正；适配器**按真实数据执行、未迁就文档数字**，处理正确。

### 6.2 门禁 7 六组独立核对（用户核心要求：没有伪造或静默补全来源）

**核对 1：`text_001`–`text_005`（5 个完全无出处的古籍节点）**

| 节点 | evidence_status | derivation | source_locator | source_url/catalog_url |
|---|---|---|---|---|
| `work_text_001` | `insufficient` | `unresolved` | `null` | **absent** |
| `work_text_002` | `insufficient` | `unresolved` | `null` | **absent** |
| `work_text_003` | `insufficient` | `unresolved` | `null` | **absent** |
| `work_text_004` | `insufficient` | `unresolved` | `null` | **absent** |
| `work_text_005` | `insufficient` | `unresolved` | `null` | **absent** |

→ ✅ **未补造任何 source_url / edition / page / locator**。

**核对 2：`lit_ccs_006` / `lit_ccs_014` / `lit_ccs_027` 未被按 title 相等当作内容著作版本建链**

| 册次 | `edition_of_work` 指向 | 目标类型 |
|---|---|---|
| `lit_ccs_006`（随园食单） | `work_src_chinese_cooking_classics_series` | `collected_series` |
| `lit_ccs_014`（山家清供） | `work_src_chinese_cooking_classics_series` | `collected_series` |
| `lit_ccs_027`（饮膳正要） | `work_src_chinese_cooking_classics_series` | `collected_series` |

`edition_of_work` 共 **106** 条 → 指向丛刊 **106** 条、指向内容著作 **0** 条。
→ ✅ **未按同名错误建链**（这正是 Architect 在 KB-001A 中主动修正的语义陷阱）。

**核对 3：`SourceWork` = 10 条且含 2 个显式 unresolved 的未解析书名**

实测 `SourceWork` = **10**：3 丛刊（`collected_series`）+ 5 内容著作（`food_monograph` 等）+ 2 未解析：

| 节点 | name | attribution_status | author | evidence_status |
|---|---|---|---|---|
| `work_unresolved_001` | 东坡志林 | `unknown` | `null` | `insufficient` |
| `work_unresolved_002` | 烧尾宴食单 | `unknown` | `null` | `insufficient` |

→ ✅ 未解析书名**以显式 unresolved 状态保留**，未被丢弃、未被编造版本信息补齐。

**核对 4：零伪造 URL（双向对账）**

我遍历 V1 全部来源文件（`data/knowledge_graph/**`、`recipes`、`fragments`、`literature`）提取 URL 集合并与适配输出对账：

| 指标 | 结果 |
|---|---|
| V1 不同 URL 总数 | 6 |
| 输出中 URL 数 | 3（均为 V1 已有） |
| **输出中出现但 V1 不存在的 URL** | ✅ **0** |

→ ✅ **零伪造来源链接**。

**核对 5：无编造的结构化值**

| 指标 | 实测 | 判定 |
|---|---|---|
| `publication_year` 非 null | **0** | ✅ 未编造出版年 |
| 实体含 `source_url`/`catalog_url` 字段 | **0** | ✅ 未补造出处字段 |
| `Experiment` 实体数 | **0** | ✅ 未编造实验数据 |
| `ExpertReview` | 全 `pending` + `internal_editor` | ✅ 未伪造专家审核 |
| Passage `locator` 任一成员非 null | **0** | ✅ 未编造页码/卷次 |

**核对 6：零 fixture 泄漏（防止示例数据污染真实输出）**

| 关键词 | 在 `kb-v2.kb.json` 中出现次数 |
|---|---|
| `fixture` | **0** |
| `minimal` | **0** |
| `not_historical_evidence` | **0** |

→ ✅ `data/kb/examples/**` 的夹具数据**未混入**真实适配输出。

### 6.3 「来源不足不会被静默标记为 verified」的三重证据

| 证据 | Reviewer 实测 |
|---|---|
| ① 结构上不可能 | `review_status` 枚举恰 5 值（`unreviewed` / `internal_reviewed` / `pending_external_expert` / `external_reviewed` / `rejected`），**刻意不含 `verified`** |
| ② 运行时被拒 | `bad-review-status-verified.kb.json` 我亲自调用 → 退出 **1**，`E_ENUM_INVALID` |
| ③ 适配输出实证 | 全文件字面量 `"verified"` = **0**；`review_status` 分布 `{unreviewed: 282}` |

### 6.4 适配报告如实记录缺失项

`adaptation-report.json` 含 11 个契约键：`unmapped_fields` 181、`missing_sources` 53、`conflicts` 5、`merged_passages` 4、`ambiguous_edition` 16、`unresolved_passages` 3、`preserved_v1_defects` 3、`dropped_relations` 0、`counts`、`id_mapping` 389、`notes`。
→ ✅ **来源缺失与无法映射项全部被记录，未被静默丢弃**。

### 6.5 敏感信息（Reviewer 独立扫描）

我对 `scripts/kb/**`、`data/kb/**`、`docs/kb-001/**` 共 **29 个文件**做严格密钥模式扫描（`sk-*` 长串、AWS `AKIA*`、GitHub `ghp_*`、PEM 私钥头）：

| 指标 | 结果 |
|---|---|
| **真实密钥命中** | **0** |
| 宽松模式命中 | 4 处，**逐行核实均为「列举模式名」的自指行**（`03-qa-verification.md:326`、`08-captain-verification.md:302`），非真实凭据 |
| 报告是否含 `.env` 取值 | **无**；KB-001 代码 `process.env` 引用 = 0 |

→ ✅ **无密钥或个人配置泄露**。Reviewer 本人**未读取 `backend/.env` 的任何取值**。

---

## 7. REGRESSION_STATUS

### 7.1 回归对照（Reviewer 亲自复跑，与 `00-fact-audit.md` 基线逐项比对）

| 套件 | 基线 | Reviewer 实测 | 判定 |
|---|---|---|---|
| 后端 Jest | 43 套件 / 213 用例，退出 0 | **43 套件 / 213 用例，退出 0** | ✅ 一致 |
| 前端 test | 153 通过 / 0 失败，退出 0 | **153 通过 / 0 失败，退出 0** | ✅ 一致 |
| Python unittest | 9 通过，退出 0 | **9 通过，退出 0** | ✅ 一致 |
| `verify_graph_schema` | 193 / 49，退出 0 | **193 / 49，退出 0** | ✅ 一致 |
| `verify_literature_dataset` | 106 / 103，退出 0 | **106 / 103，退出 0** | ✅ 一致 |
| `scripts/__tests__` | 34 tests / 27 pass / **7 fail**，退出 1 | **34 tests / 27 pass / 7 fail，退出 1** | ✅ 一致（基线已存在） |

### 7.2 本轮引入的失败 = **0**

### 7.3 「基线已存在」失败的界定（重要，防误判）

`scripts/__tests__/*.test.mjs` 的 **7 个失败**在 KB-001 任何改动之前就已存在：

- **根因（我已核对）**：测试要求存在 `scripts/python-quality-gate.ps1` 与 `scripts/python_bridge_smoke.cjs`，**这两个文件在仓库中不存在**（测试用 `readOptional` 读成空串后断言失败）；且断言 `verify-all.ps1` **不应**包含 `python -m unittest`，而 `scripts/verify-all.ps1:100` 实际包含该命令。
- **判定**：属「**基线已存在**」，**非本轮引入**。本轮**未修复、未掩盖、未删除负例**，失败数与基线**完全一致**。
- **重要澄清**：`scripts/verify-all.ps1` **不覆盖**该套件，故其退出 0 **不代表**这 7 个失败消失。

### 7.4 前端回归

**Reviewer 实测** `cd frontend && npm test` → 退出 **0**，153 通过 / 0 失败，与基线一致。
**前端零写入已由我独立确认**：`frontend/src` 下文件的 mtime 最新为 `2026-09-25 23:01`，**早于本轮**（`2026-10-08`）。

---

## 8. 未验证项（**不得当作通过**）

| 项 | 状态 | 原因 |
|---|---|---|
| `docker compose up --build` 端到端 | **未执行** | 范围外；本轮仅核验 `docker compose config`（DevOps t7 报告记录为退出 0） |
| `release/` 打包（`package_trae_submission.ps1`） | **未执行** | 禁止打包发布物 |
| `verify-demo-stack.ps1 -RequireRunning` | **未执行** | 需常驻演示栈 |
| GitHub Actions 实际运行 | **未执行** | 当前分支 `feat/trae-offline-museum` 不在 CI 触发范围，且本轮禁止 push |
| 浏览器视觉回归 | **未执行** | 无 UI 改动，范围外 |
| 符号链接输入处理 | **未验证** | Windows 创建符号链接返回 `EPERM`，无法构造（Security 报告已标注） |
| 并发运行竞态 / 磁盘写满 / 超大输入 | **未验证** | Security 报告已标注 |
| `backend/.env` 实际内容 | **未读取** | 按红线有意未读，仅核对键名 |

**不适用的验证项说明**：本轮禁止 UI 改版，故「视觉回归」不适用；本轮禁止 push，故「CI 实际运行」不适用。

---

## 9. 审查过程独立性与合规声明

### 8.1 实施成员未给自己最终 PASS ✅

| 检查 | Reviewer 结果 |
|---|---|
| Backend 是否对自身实现给出 PASS | **否** —— t2/t3 为 `implementation` 类任务，其完成状态为 `completed`（提交验收证据），未使用 `verdict=pass`（该字段仅用于 requirements/review 类） |
| 是否由独立成员做最终验收 | **是** —— 本报告由 Reviewer 出具，Reviewer **未参与 KB-001 任何业务实现** |
| QA 是否修改生产实现 | **否**（见 8.2） |

### 8.2 QA 未修改生产实现 ✅

**Reviewer 实测**：我计算了 3 个关键实现文件的 SHA-256，与 QA 报告中声明的「任务前后全部 SAME」值**逐字节吻合**：

| 文件 | Reviewer 实测 SHA-256（前 16 位） | QA 声明 | 判定 |
|---|---|---|---|
| `scripts/kb/validate-kb-schema.mjs` | `2829a86a27a96f24` | `2829A86A…` | ✅ 吻合 |
| `scripts/kb/adapt-v1-to-v2.mjs` | `56547c7c7d5a054b` | `56547C7C…` | ✅ 吻合 |
| `data/kb/schema/kb-schema.v2.json` | `4d6c2777168950e1` | `4D6C2777…` | ✅ 吻合 |

→ 即：**QA 验证的实现版本与我审查的版本是同一份字节**，QA 未改动生产实现。

### 8.3 Reviewer 未修改任何实现文件 ✅

| 检查 | Reviewer 结果 |
|---|---|
| Reviewer 写入范围 | 仅 `docs/kb-001/07-final-review.md` |
| 实现文件 mtime | 全部 ≤ `2026-10-08 19:17:30`（QA 交付时刻），**早于** Reviewer 审查开始（`19:37`） |
| Reviewer 是否修改 `scripts/kb/**`、`data/kb/**` | **否** |
| 临时探针 | 我创建的 `tmp/reviewer-trust-check.mjs` **已删除**（`Test-Path` = False） |

### 8.4 未删除负例、未降低门槛、未修改预期 ✅

| 检查 | Reviewer 结果 |
|---|---|
| `invalid/` 负例数量 | **7**（未被删减） |
| `valid/` 示例数量 | **3** |
| 负例断言有效性 | 7/7 均退出 1 且报精确错误码（第 3 节门禁 4 表） |
| 是否有 `it.skip`/`todo`/空断言等掩盖手法 | 未见；`node --test` 报告 `skipped 0`、`todo 0` |
| 是否有测试期望被改窄以适配缺陷 | 未见 —— 负例覆盖用户要求的全部检查类别 |

### 8.5 文档一致性（Reviewer 独立核对）

- 契约 `01-schema-contract.md` 版本 **`2.0.2`**（1108 行 / 82,694 字节）；「23 关系」笔误已更正为 **24**；§13.5 的「20 候选 / 16 Passage / 15 ambiguous」已更正为 **23 / 19 / 16 ambiguous + 3 unresolved**，残留旧数字**仅出现在已标注的更正与历史记录行**（L920、L1107）。
- 示例集数量记录（§3.1 L96/L97：valid 3 / invalid 7）与磁盘实测**一致**。
- `06-kb-001-gate.md`（t8 交付，745 行 / 48,502 字节）存在；其 §gitignore 行号采用实测 **27** 并显式说明行号变更 —— 处理正确。

### 8.6 工具陷阱（供后续复核者）

`pwsh Get-Content` 读本仓库中文文档会以 ANSI 误读 UTF-8 而**误报行数**：同一契约文件 `Get-Content` 报 728 行、`node` 报 **1108** 行。
→ 本报告所有文本断言与行数统计**均使用 `node` 读取**。
另：`pwsh` 管道的 `$LASTEXITCODE` 在部分写法下会被误读为 -1；**本报告退出码均取自直接执行**（必要时用 Node `spawnSync`）。

---

## 10. 结论

# PASS

KB-001（Knowledge Schema 2.0）本轮变更**通过独立审查**。

**通过依据（全部为 Reviewer 亲自实测）**：

1. 用户「KB-001 完成门禁」**8 项全部通过**，每项附实测证据（第 3 节）。
2. t9 契约要求的 **5 条 verify 命令全部退出 0**（第 5.1 节）。
3. **本轮引入的回归 = 0**；5 套回归与基线逐项一致；`scripts/__tests__` 的 7 个失败经核定为**基线已存在**（第 7 节）。
4. **零伪造来源**：6 组独立核对全部通过（第 6.2 节），含双向 URL 对账（输出中 V1 不存在的 URL = **0**）。
5. **来源不足无法被静默升级为 verified**：结构 + 运行时 + 输出实证三重证据（第 6.3 节）。
6. **范围零越界**：27 项 KB-001 变更全部在范围内；所有疑似越界文件经 mtime 排除为本轮开始前的既有改动（第 5.3 节）。
7. **独立性成立**：实施方未自评 PASS；QA 未改生产实现（哈希吻合）；Reviewer 未参与实现、未改实现文件（第 9 节）。

**唯一 medium（K1）**：`adapt-v1-to-v2.mjs:1330` 的 `--out` 缺少仓库边界校验。经核实该 CLI **无服务调用方**（引用数 0），属纵深防御缺失而非当前可利用漏洞，**不阻断 KB-001 交付**；**建议 KB-002 前修复**。

**声明**：本 PASS 为 **DSH 团队内部审查结论**，不代表项目整体 CLOSED。按团队协议，**最终必须由 Codex 独立验收**；同时「是否 push / 合并 / 部署」不在本轮范围，需用户明确指示。

---

## 11. 审查方法（可复现）

本报告所有结论由 Reviewer 通过以下方式取得：

- 直接执行各测试与校验命令并记录**真实退出码**（必要时用 Node `spawnSync` 取值，避开 PowerShell 管道陷阱）
- 用 `node` 读取并解析 JSON/Markdown（**避开 PowerShell ANSI 编码误读**）
- `git status --porcelain --untracked-files=all`、`git diff`、`git check-ignore -v`
- 用 `Get-Item .LastWriteTime` 做 **mtime 交叉验证**以区分「本轮引入」与「基线既有」
- `node:crypto` 计算 SHA-256 做**版本同一性核对**与只读性核对
- 独立构造负例探针（用后即删，`tmp/reviewer-trust-check.mjs` 已确认删除）

Reviewer 未修改任何实现文件、数据文件或他人文档；本报告（`docs/kb-001/07-final-review.md`）是 Reviewer 唯一新增产物。
