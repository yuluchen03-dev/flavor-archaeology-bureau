# KB-002A Golden Dataset Contract（黄金数据集契约）

- 契约版本：`kb-002.1.2`
- 状态：**已冻结（frozen）**，KB-002B / KB-002C / KB-002D / KB-002E / QA / Security / Reviewer 均以本文件为准
- 上游依据：`docs/kb-001/01-schema-contract.md`（KB-001 契约，版本 `2.0.3`）+ `data/kb/schema/kb-schema.v2.json`（`schema_version: "2.0.0"`）
- 本文件为 KB-002A 产物，**只定义契约，不含实现、不含数据**
- 适用对象：本阶段 `t1–t5`、以及**尚未创建**的逐菜任务 `KB-002F+`
- **`kb-002.1.2` 修订（t23）**：修订 §7 `qualified` 字段语义与 §10.2 数据集级验收，消除与冻结 Validator 的 **Q3 blocking** 行为之间的语义冲突。权威定义见 `docs/kb-002/12-contract-admission-semantics.md`。**未修改任何实现、数据或 Validator。**

> **事实纪律**：本契约中所有字段名、枚举值、ID 前缀、关系端点，均**逐条来自** KB-001 契约第 5–11 节的**实际读取**。
> 凡 KB-001 契约未写明的字段，本契约**不发明**；确需新增（如 Golden 专用标注），一律以**本契约明确定义的新键**方式引入，并标注为 KB-002 扩展。
> 凡本契约未写明的内容，实现方**不得自行发明**；应先由 Architect 补充本契约。

---

## 1. 目的与范围

### 1.1 目的

建立 **最多 10 道**高可信 Golden Dish 的**可追踪证据闭环**，使每一道菜都能回答：

1. **依据**：哪部 `SourceWork` → 哪个 `SourceEdition` → 哪段 `SourcePassage`；
2. **陈述**：由 `HistoricalClaim` 显式表达，并可被 `claim_supported_by` 支撑或被 `claim_refuted_by` 反驳；
3. **确定程度**：`evidence_status` + `confidence` + `certainty` + `Evidence Level`（第 6 节）；
4. **不确定项**：显式 `unknown_fields`，**不得**用编造值填充；
5. **现代适配边界**：`content_class` 区分 `historical_fact` / `historical_inference` / `modern_adaptation` / `user_experiment`。

### 1.2 必须形成的闭环（每道 Golden Dish）

```
SourceWork
  └─edition_of_work─← SourceEdition
                        └─passage_in_edition─← SourcePassage
                                                 ▲
                                    claim_supported_by / claim_refuted_by
                                                 │
                                          HistoricalClaim
                                                 │ claim_about
                                                 ▼
                                    Dish ─┬─ dish_contains_ingredient → Ingredient → IngredientState
                                          ├─ dish_uses_technique      → Technique
                                          ├─ dish_uses_utensil        → Utensil
                                          ├─ dish_originated_in       → TimePeriod
                                          ├─ dish_popular_in          → Region
                                          ├─ dish_seasonal_for        → Season
                                          └─ dish_recorded_in         → SourcePassage
                                                 │
                                          Measurement（用量，可选但推荐）
                                                 │
                                          RestorationVersion
                                            └─restoration_version_of→ Dish
                                            └─restoration_based_on_claim→ HistoricalClaim
```

**最低闭环要求（本契约强制）**：对每道 Golden Dish，必须同时存在
`SourceWork` + `SourceEdition` + `SourcePassage` + `HistoricalClaim` + `Dish`，
且 `SourcePassage → SourceEdition → SourceWork` 链**完整**（满足 KB-001 契约 TR1–TR3），
且至少 1 条 `HistoricalClaim` 通过 `claim_about` 指向该 `Dish`。

`Ingredient` / `Technique` / `TimePeriod` / `Region` / `RestorationVersion` 为**推荐**但非全部强制——
**缺失必须以 `unknown_fields` 或 `insufficient` 显式表达，不得省略**（第 5 节）。

### 1.3 明确不在本契约范围

- ❌ Hybrid Retrieval、Vector Search、GraphRAG、Temporal Validator 完整引擎、Claim-level LLM generation、Dual Restoration UI、Experiment Flywheel、大规模 UI 改版、Neo4j / Elasticsearch / Milvus / Kafka、大规模 V1 迁移
- ❌ 不修改 KB-001 已 PASS 的任何行为（第 9 节）
- ❌ 不在 `t1–t5` 阶段正式大规模写入 Golden 数据（正式逐菜录入属 `KB-002F+`）

发现上述需求一律登记 `DEFERRED_KB_003_PLUS`（见 `docs/kb-002/00-deferred-register.md`），**不得顺手实现**。

---

## 2. 文件落位与硬约束

### 2.1 目录布局（KB-002 专属）

| 用途 | 路径 | 是否纳入版本控制 |
|---|---|---|
| KB-002 Golden 正式数据 | `data/kb/golden/*.kb.json` | ✅ **是** |
| KB-002 合法示例 | `data/kb/golden/examples/valid/*.kb.json` | ✅ 是 |
| KB-002 非法负例 | `data/kb/golden/examples/invalid/*.kb.json` | ✅ 是（仅供测试显式调用） |
| KB-002 工具输出（报告等） | `data/kb/golden/generated/` | ❌ 否（须加入 `.gitignore`） |
| KB-002 工具代码 | `scripts/kb002/**/*.mjs` | ✅ 是 |
| KB-002 测试 | `scripts/kb002/__tests__/*.test.mjs` | ✅ 是 |

**与 KB-002E 派发合同的路径差异（需 Captain 确认）**：KB-002E 任务合同当前给出的建议 inScope 为
`scripts/kb002/`、`data/kb-002/`、`docs/kb-002/05-ingestion-tooling.md`。
本契约（KB-002A）**统一为** `scripts/kb002/` + `data/kb/golden/`（**取消 `data/kb-002/`**），理由：
① 与 KB-001 的 `data/kb/` 形成单一根，便于 `.gitignore` 与校验器统一处理；
② 避免仓库根出现 `data/kb` 与 `data/kb-002` 两套并行命名。
**动作**：请 Captain 以 `amend_task` 将 t5 的 inScope 中 `data/kb-002/` 改为 `data/kb/golden/`。在修订前，**以本契约为准**。

### 2.2 硬约束（继承 KB-001 H1–H5 并追加）

- **H1（继承，最高优先级）**：Golden 数据**一律不得**写入 `data/knowledge_graph/`。
  **理由**：`scripts/verify_graph_schema.mjs:297` 用 `readdirSync(graphDir).filter(/^nodes_.+\.json$/)` **自动发现**节点类型；任何新增 `nodes_*.json` 会被当作新节点类型载入，改变 V1 门禁行为（KB-001 契约 F1）。
- **H2（继承）**：`data/kb/` 及 `data/kb/golden/` 下**不得**出现名为 `nodes_*.json` 的文件。
- **H3（继承）**：V1 输入文件（`data/knowledge_graph/**`、`data/recipes/**`、`data/fragments/**`、`data/literature/**`、`data/ingredients/**`、`data/techniques/**`）**只读**。
- **H4（继承）**：KB-002 数据文件扩展名固定为 `.kb.json`。
- **H5（继承）**：**不得**引入任何新第三方依赖（仅 Node 内置模块 + 相对导入）。
- **H6（新增）**：Golden 正式数据与示例/负例**必须物理隔离**（`golden/` 与 `golden/examples/` 不得混放）。
- **H7（新增）**：Golden 文件名必须为 `<golden_id>.kb.json`（如 `GOLDEN-001.kb.json` 的规范化为 `golden_001.kb.json`，见 3.3）。
- **H8（新增）**：**不得**把 `Experiment` 实例写入 Golden 数据（KB-001 契约 EX3；用户未提供真实实验记录）。

---

## 3. ID 规范

### 3.1 通用 ID（继承 KB-001 契约 5.2）

- 格式：`^[a-z][a-z0-9_]*$`，长度 3–96
- 必须以该实体类型的固定前缀开头
- **全局唯一**（跨文件、跨类型）；违反报 `E_DUPLICATE_ID`
- ID 一经发布**不可变更**；**不得**由可变显示名派生
- 所有 `*_id` / `*_ids` 与关系 `source`/`target` 一律为**目标实体的 `id` 字符串**

### 3.2 实体 ID 前缀（来自 KB-001 契约 9.1–9.17，**权威**）

| 实体 | 前缀 | 实体 | 前缀 |
|---|---|---|---|
| `SourceWork` | `work_` | `Measurement` | `measure_` |
| `SourceEdition` | `edition_` | `TimePeriod` | `period_` |
| `SourcePassage` | `passage_` | `Region` | `region_` |
| `HistoricalClaim` | `claim_` | `Season` | `season_` |
| `Dish` | `dish_` | `RestorationVersion` | `resto_` |
| `Ingredient` | `ing_` | `ExpertReview` | `review_` |
| `IngredientState` | `istate_` | `SafetyRule` | `safety_` |
| `Technique` | `tech_` | `Experiment` | `exp_` |
| `Utensil` | `utensil_` | | |

### 3.3 Golden ID（KB-002 新增层）

- **Golden 编号**：`GOLDEN-001` … `GOLDEN-010`（**人类可读标签**，不代表实体 ID）
- **`GOLDEN-001` 固定 = 蟹酿橙**（用户指定，不可变更）
- **实体 ID 命名规则**：`<前缀>g<NNN>_<slug>`，其中 `NNN` 为 3 位 Golden 编号，`slug` 为小写 ASCII 短名
  - 例：`dish_g001_xieniangcheng`、`claim_g001_steaming_method`、`work_g001_shanjiaqinggong`
- **同一道菜的所有实体必须共享 `g<NNN>` 段**，使跨实体归属可被机械判定
- **Golden 数据文件名**：`golden_<NNN>.kb.json`（如 `golden_001.kb.json`），文件内 `metadata.golden_id` **必须**等于 `GOLDEN-<NNN>`
- **Golden ID 唯一性**：`metadata.golden_id` 在整个 Golden 数据集中**不得重复**；QA 必须验证

> ⚠️ **固定 ID ≠ 历史描述为真**：`GOLDEN-001` 的固定仅表示"编号已分配"，**不**表示其任何历史描述自动成立。
> 每条 `HistoricalClaim` **仍必须**逐条经过 `Source → Edition → Passage → Claim → Evidence` 验证，**不得**因它是演示标杆而放宽标准。

---

## 4. 实体：KB-002 必填字段（按 KB-001 Schema 2.0.0）

> 下列**必填**指 KB-001 契约中"必填 ✅"的字段。KB-002 数据**必须**全部满足，否则校验器报错。
> "可空 ✅" 的字段若取 `null`，**必须**把其路径列入该实体的 `unknown_fields`（KB-001 契约 U1）。

### 4.1 通用信封（17 类实体全部适用，KB-001 契约 5.1）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 第 3 节规则 |
| `entity_type` | string | ✅ | 17 类之一 |
| `schema_version` | string | ✅ | 必须 = `"2.0.0"` |
| `content_class` | string | ✅ | `historical_fact` \| `historical_inference` \| `modern_adaptation` \| `user_experiment` |
| `evidence_status` | string | ✅ | `sufficient` \| `insufficient` \| `unknown` |
| `review_status` | string | ✅ | 第 6.4 节 |
| `provenance` | object | ✅ | 第 5 节 |
| `name` | string | ✅ | 非空（trim 后长度 > 0） |
| `unknown_fields` | array&lt;string&gt; | ❌ | 默认 `[]` |
| `notes` | string | ❌ | 自由说明 |
| `aliases` | array&lt;string&gt; | ❌ | 不得用别名替代 `id` |

### 4.2 各实体特有必填字段（逐条来自 KB-001 契约 9.1–9.17）

| 实体 | 特有必填字段 | 关键枚举（节选，完整枚举以 KB-001 契约与 Schema 文件为准） |
|---|---|---|
| `SourceWork` | `author`(可空), `attribution_status`, `work_type`, `compiled_period_id`(可空) | `work_type`: `classic_text\|food_monograph\|materia_medica\|agricultural_treatise\|encyclopedic_reference\|anthology\|collected_series\|other` |
| `SourceEdition` | `work_id`(可空), `edition_type`, `publisher`(可空), `publication_year`(可空), `locator_scheme` | `locator_scheme`: `volume\|page\|chapter\|entry\|shelfmark\|none` |
| `SourcePassage` | `text`, `edition_id`(可空), `locator`(可空), `text_origin`, `language`, `edition_candidates`, `edition_resolution` | `edition_resolution`: `resolved\|ambiguous\|unresolved` |
| `HistoricalClaim` | `statement`, `claim_type`, `about_ids`(**非空**), `confidence` | `claim_type`: `existence\|provenance\|attribution\|technique\|ingredient_use\|geography\|chronology\|cultural_context\|other`；`confidence`: `high\|medium\|low\|unknown` |
| `Dish` | `dish_kind`, `period_id`(可空), `description`(可空) | `dish_kind`: `historical_documented_dish\|heritage_practice_lead\|modern_adaptation` |
| `Ingredient` | `category`, `biological_identification_status`, `availability_status` | `availability_status`: `available\|rare\|protected\|extinct_in_wild\|historical_only\|unknown` |
| `IngredientState` | `ingredient_id`, `preparation`, `state_kind` | `state_kind`: `raw\|chopped\|ground\|soaked\|fermented\|dried\|cooked\|mixed\|other` |
| `Technique` | `category`, `description`(可空), `heritage_designation`(可空) | `category`: `knife\|heat\|seasoning\|shaping\|fermentation\|curing\|other` |
| `Utensil` | `utensil_kind`, `material`(可空), `modern_equivalent`(可空) | `utensil_kind`: `cooking_vessel\|steamer\|stove\|cutting_tool\|serving_vessel\|storage_vessel\|other` |
| `Measurement` | `quantity_text`(可空), `quantity_value`(可空), `unit`, `of_ingredient_id`(可空), `used_by_dish_id`(可空), `normalization_status` | `normalization_status`: `as_recorded\|normalized\|unnormalizable\|unknown` |
| `TimePeriod` | `start_year`(可空), `end_year`(可空), `calendar`, `certainty` | `certainty`: `exact\|approximate\|disputed\|unknown` |
| `Region` | `region_kind` | `region_kind`: `modern_admin\|historical_admin\|cultural_area\|physical_geography\|unknown` |
| `Season` | `season_kind`, `lunar_month`(可空), `solar_term_name`(可空) | `season_kind`: `solar_term\|lunar_festival\|calendar_month\|growing_season\|unknown` |
| `RestorationVersion` | `dish_id`, `version_kind`, `based_on_claim_ids`(**非空**), `steps`(**非空**) | `version_kind`: `historical_faithful\|modern_kitchen\|experimental` |
| `ExpertReview` | `subject_id`, `reviewer_kind`, `reviewer_name`(可空), `review_date`(可空), `review_outcome`, `scope_notes`(可空) | `reviewer_kind`: `internal_editor\|external_scholar\|institution\|anonymous\|unknown` |
| `SafetyRule` | `rule_kind`, `applies_to_ids`(**非空**), `severity`, `rule_text`, `jurisdiction`(可空) | `severity`: `blocker\|high\|medium\|low` |
| `Experiment` | `restoration_version_id`, `performed_at`(可空), `performed_by`(可空), `protocol`, `observations`, `outcome` | **H8：Golden 数据中禁止出现** |

### 4.3 关系对象（KB-001 契约 10.1，24 种类型见 10.2）

| 字段 | 必填 | 说明 |
|---|---|---|
| `type` | ✅ | 24 种之一，否则 `E_UNKNOWN_RELATION_TYPE` |
| `source` / `target` | ✅ | 实体 ID；类型必须在允许端点集合内，否则 `E_RELATION_ENDPOINT_TYPE` |
| `evidence_status` | ✅ | `sufficient` \| `insufficient` \| `unknown` |
| `provenance` | ✅ | 第 5 节 |
| `properties` | ❌ | 仅允许 KB-001 契约 10.3 列出的键，否则 `E_RELATION_SHAPE` |

**关系对象没有 `unknown_fields`**（KB-001 契约 10.1）：`provenance.asserted_at` 未知时**必须省略该键**，**不得**置 `null`。

- 关系无 `id` 字段；引用时用 `"<source>-><type>-><target>"` 标识。

#### 4.3.1 24 种关系类型完整清单（权威，来自 `data/kb/schema/kb-schema.v2.json`）

Golden 闭环**必须用到**的（第 1.2 节）：

| # | `type` | source → target |
|---|---|---|
| 1 | `passage_in_edition` | `SourcePassage` → `SourceEdition` |
| 2 | `edition_of_work` | `SourceEdition` → `SourceWork` |
| 4 | `claim_supported_by` | `HistoricalClaim` → `SourcePassage` |
| 5 | `claim_refuted_by` | `HistoricalClaim` → `SourcePassage` |
| 6 | `claim_about` | `HistoricalClaim` → Dish/Ingredient/IngredientState/Technique/Utensil/Measurement/TimePeriod/Region/Season/RestorationVersion |
| 7 | `dish_contains_ingredient` | `Dish` → `Ingredient` |
| 8 | `dish_uses_technique` | `Dish` → `Technique` |
| 9 | `dish_originated_in` | `Dish` → `TimePeriod` |
| 10 | `dish_popular_in` | `Dish` → `Region` |
| 11 | `dish_seasonal_for` | `Dish` → `Season` |
| 12 | `dish_recorded_in` | `Dish` → `SourcePassage` |
| 17 | `dish_uses_utensil` | `Dish` → `Utensil` |
| 18 | `ingredient_state_of` | `IngredientState` → `Ingredient` |
| 19 | `measurement_of_ingredient` | `Measurement` → `Ingredient` |
| 20 | `restoration_version_of` | `RestorationVersion` → `Dish` |
| 21 | `restoration_based_on_claim` | `RestorationVersion` → `HistoricalClaim` |

其余**允许但非闭环必需**（Golden 数据可按实际使用）：

| # | `type` | source → target |
|---|---|---|
| 3 | `edition_contains_work` | `SourceEdition` → `SourceWork` |
| 13 | `ingredient_from_region` | `Ingredient` → `Region` |
| 14 | `ingredient_season` | `Ingredient` → `Season` |
| 15 | `technique_from_region` | `Technique` → `Region` |
| 16 | `ingredient_substitutes` | `Ingredient` → `Ingredient` |
| 22 | `review_of` | `ExpertReview` → 任意 17 类实体 |
| 23 | `safety_rule_applies_to` | `SafetyRule` → Dish/Ingredient/IngredientState/Technique/Utensil/Measurement/RestorationVersion/Experiment |
| 24 | `experiment_tests` | `Experiment` → `RestorationVersion` |

> 计数：**共 24 条**，编号 1–24 连续无缺号，与 KB-001 契约 10.2 及 `kb-schema.v2.json` 的 `relations` **逐条一致**（本项目实测：schema `relations` 键数 = 24）。
> **权威清单以 Schema 文件为准**；校验器从 `data/kb/schema/kb-schema.v2.json` 读取，**不得**在代码中另行硬编码（KB-001 契约 12.3）。

---

## 5. `provenance` 与 `unknown` / `insufficient` 表达

### 5.1 `provenance`（KB-001 契约 6，所有实体与关系必填）

| 字段 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|
| `derivation` | ✅ | ❌ | `primary_source` \| `v1_adapter` \| `editorial` \| `unresolved` |
| `basis_ids` | ✅ | — | `primary_source` 时**必须非空** |
| `asserted_by` | ✅ | ❌ | `human_editor` \| `v1_import` \| `expert_review` \| `user_experiment` \| `unknown` |
| `asserted_at` | ❌ | ✅ | `YYYY-MM-DD`；**实体**未知 → `null` + `unknown_fields`；**关系**未知 → **省略键** |
| `source_locator` | ❌ | ✅ | `{ work_id, edition_id, passage_id, locator }`；`primary_source` 时**必须非空** |
| `notes` | ❌ | ✅ | 自由说明 |

**KB-002 取值要求**：Golden 正式数据的 `asserted_by` **应为** `human_editor`（由 Curator 人工录入）；
**禁止**使用 `expert_review`，除非确有可验证的外部专家评审事实（第 6.4 节）。

### 5.2 `unknown` / `insufficient` 的表达（KB-001 契约 8）

三种、且**仅此三种**：

1. **`unknown_fields`**：点分字段路径数组（如 `author`、`locator.page`、`start_year`）——表示"确实未知，而非遗漏"
2. **`null`**：字段值为 `null`（**必须**同时列入 `unknown_fields`）
3. **`evidence_status`**：`insufficient` / `unknown`

**强制规则（继承）**：

- **U1**：必填且可空字段为 `null` ⟹ 其路径**必须**在 `unknown_fields` 中
- **U2**：必填且不可空字段缺失/`null` ⟹ `E_MISSING_FIELD` / `E_NULL_NOT_ALLOWED`；**不得**补猜测值
- **U3**：`unknown_fields` 元素必须为该实体**已声明字段**的合法路径
- **U4**：`unknown_fields` 非空 ⟹ `evidence_status` **不得**为 `sufficient`

### 5.3 缺证据时（KB-002 硬规则）

**没有足够来源时，唯一允许的做法是标 `insufficient`。禁止**：

- 根据模型常识补全
- 根据现代菜谱倒推古代事实
- 根据相似菜自动推断相同做法
- 编造合理出处 / 页码 / 专家 / 文献 URL

---

## 6. Evidence 模型（KB-002 核心）

### 6.1 Evidence Level `E0–E5`（用户指定，本契约强制）

| 等级 | 含义 | 行为约束 |
|---|---|---|
| `E0` | 无证据 | **不得**生成确定性历史结论；`evidence_status` ∈ {`insufficient`, `unknown`} |
| `E1` | 只有线索 | **只能作为候选**；不得作为复原依据 |
| `E2` | 间接证据 | 允许形成假说，**必须**明确标记为推测（`content_class: historical_inference`） |
| `E3` | 单一直接史料 | 可谨慎使用，**必须**保留单一来源限制（`uncertainty_notes` 非空） |
| `E4` | 多源互证 | 可作为高可信历史复原基础 |
| `E5` | 史料 + 专家 + 真实复原实验 | 标杆级证据 |

> **⚠ 关联条款同步（KB-002B `kb-002.1.1`）**：上表的**可判定判定程序**位于
> `docs/kb-002/02-evidence-quality-rubric.md` §3.2（已修订为**穷尽·有序·互斥**，R1–R5 + §3.2.0 前置检查）。
> 该次修订为**契约缺陷修复**：冻结版 `kb-002.1.0` §3.2 对「单一 `direct` 但来源等级为 B/C/D」的合法输入**无结论**；
> 现由兜底分支 `E2` 承接（`E2` 禁止 `sufficient`）。**本次同步不改变本文件的任何规则**，
> 仅指明判定程序的权威位置；KB-002A 独立文档版本号 `kb-002.1.0` 保持不变。

**KB-002 不得伪造 `E5`**：本阶段**不存在**真实外部专家评审与真实复原实验记录，因此
**任何 Golden 实体的 Evidence Level 不得标为 `E5`**，除非存在可验证的外部评审与实验事实（当前无）。
**`E5` 由 QA/Security 作为硬性负例检查项。**

### 6.2 来源等级 `S / A / B / C / D / X`（用户指定，本契约强制）

| 等级 | 含义（示例） | 可否单独支撑高可信历史事实 |
|---|---|---|
| `S` | 国家图书馆、官方数字古籍、博物馆、中国非遗官方资源、原始古籍影印/可靠馆藏 | ✅ 可以 |
| `A` | 权威学术论文、学术专著、高校数字人文数据库、权威整理本、可核实非遗传承资料 | ✅ 可以 |
| `B` | 专业饮食史研究、专业历史复原、专业厨师实验、可靠二手研究 | ⚠️ 需与 S/A 互证 |
| `C` | 专业博客、B站、微信公众号、小红书、一般互联网文章 | ❌ **默认不得**单独升级为高可信历史事实；**用途仅为发现线索** |
| `D` | 普通 UGC | ❌ 用途仅为**待验证线索** |
| `X` | AI 无来源生成 | ❌ **不得作为历史证据** |

**强制规则**：

- **SL1**：`C`/`D` 级来源**不得**单独支撑 `evidence_status: sufficient`
- **SL2**：`X` 级**不得**出现在任何 `HistoricalClaim` 的 `claim_supported_by` 链上
- **SL3**：来源等级必须记录在 `SourceEdition.notes` 或 `SourceWork.notes`（本项目**不新增**实体字段，避免与 KB-001 Schema 冲突；等级以 `S|A|B|C|D|X` 前缀写入 `notes`，格式见 6.5）

### 6.3 Claim 支持程度与冲突保留

- **支持**：`claim_supported_by`（target 必须是 `SourcePassage`）
- **反驳**：`claim_refuted_by`（target 必须是 `SourcePassage`）
- **冲突必须保留**：同一 `HistoricalClaim` **允许且鼓励**同时存在 `claim_supported_by` 与 `claim_refuted_by`
  - **禁止**为得到单一"漂亮答案"删除其中一方
  - `claim_refuted_by` 存在时，`counter_evidence_notes` **必须非空**（KB-001 契约 C4）
- **数据层已结构性支持**：`claim_supported_by` 与 `claim_refuted_by` 是两个独立关系类型（KB-001 契约 10.2 A 组 #4/#5）

### 6.4 `review_status` 枚举（KB-001 契约 7，**刻意不含 `verified`**）

| 取值 | 含义 |
|---|---|
| `unreviewed` | 未评审（默认） |
| `internal_reviewed` | 内部评审（**非**外部专家） |
| `pending_external_expert` | 待外部专家评审 |
| `external_reviewed` | 外部专家已评审 |
| `rejected` | 评审否决 |

**强制规则**：

- **R1**：**不存在** `verified` 取值——"被静默标记为 verified"在结构上不可能发生
- **R2**：`evidence_status ∈ {insufficient, unknown}` ⟹ `review_status` **必须** ∈ {`unreviewed`, `rejected`}
- **R3**：`provenance.derivation = "unresolved"` ⟹ `review_status` **必须** ∈ {`unreviewed`, `rejected`}
- **R4（KB-002 强化）**：**当前无真实外部专家**，因此 Golden 数据的 `review_status`
  **应为** `unreviewed` 或 `pending_external_expert`；
  **禁止**由模型/工具自行声明 `external_reviewed`（KB-001 契约 ER2/ER3）

### 6.5 Evidence Level 与来源等级的记录位置（KB-002 约定）

KB-001 Schema **没有** Evidence Level 字段。为避免与已冻结 Schema 冲突，KB-002 约定：

- **Evidence Level**：写入 `HistoricalClaim.notes`，前缀固定为 `EVIDENCE_LEVEL=E<n>`（如 `EVIDENCE_LEVEL=E3`）
- **来源等级**：写入 `SourceEdition.notes` / `SourceWork.notes`，前缀固定为 `SOURCE_GRADE=<S|A|B|C|D|X>`
- **可被机械判定**：QA/Security 以**前缀正则**检查，`E5` 与 `X` 为硬性负例

> 若后续需要结构化字段，属 **Schema 变更**，须由 Architect 开新契约版本并同步 `kb-schema.v2.json` ——**本轮不做**。

---

## 7. KB-002 专用文档信封（`metadata`）

KB-001 契约第 4 节规定 KB 文档根对象含 `schema_version` / `entities` / `relations` / `metadata`（可选）。
KB-002 **要求** `metadata` 含以下键（用于 Golden 档案与机械校验）：

| 键 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `golden_id` | string | ✅ | `GOLDEN-001` … `GOLDEN-010`；数据集内唯一 |
| `golden_dish_name` | string | ✅ | 菜品名（中文） |
| `dataset_stage` | string | ✅ | 固定 `"kb-002-golden"` |
| `contract_version` | string | ✅ | 必须 = `"kb-002.1.2"`（现行契约版本线；`kb-002.1.0` / `kb-002.1.1` 为历史版本） |
| `evidence_level` | string | ✅ | `E0`…`E5`（该菜整体证据等级，取各 Claim 的最低值） |
| `qualified` | boolean | ✅ | **production admission result**（由 KB-002B §5.1 Q1–Q8 计算，见 `12-` §3）。**不是**「有研究价值」，**也不是**「可以存在于 staging」。candidate 可为 `false`；**production 中不得存在 `false`** |

`metadata` **不得**写入密钥、`.env` 取值、个人凭据（KB-001 契约第 4 节）。

---

## 8. `schema_version` 与契约版本策略

### 8.1 实体级 `schema_version`

- 所有实体的 `schema_version` **必须**恒为 `"2.0.0"`（等于 `data/kb/schema/kb-schema.v2.json` 的 `schema_version`）
- KB-002 **不修改** KB-001 的 Schema 或 `schema_version`
- 若未来必须新增字段 ⟹ 属 **Schema 变更**，须走 KB-001 契约第 19 节冻结流程，**本轮禁止**

### 8.2 契约版本

| 层 | 版本 | 说明 |
|---|---|---|
| KB-001 Schema | `2.0.0` | 实体/关系结构（`data/kb/schema/kb-schema.v2.json`） |
| KB-001 契约 | `2.0.3` | `docs/kb-001/01-schema-contract.md` |
| **KB-002 契约** | **`kb-002.1.2`** | 本文件（`01-`）；版本线同行文档：`02-`（Rubric）、`12-`（入库语义，**权威**） |
| KB-002 数据信封 | `metadata.contract_version = "kb-002.1.2"` | 每个 candidate / production Golden 文件 |

**变更流程**：本契约自 KB-002A 提交起冻结。实现方若发现契约不可实现或存在缺陷，
**不得**自行偏离；须由 Architect 更新本文件并递增版本（`kb-002.1.x`），再由 Captain 重新调度受影响任务。

---

## 9. KB-002 与 KB-001 的边界（不得越界）

### 9.1 只读清单（KB-002 全程不得修改）

| 路径 | 原因 |
|---|---|
| `data/knowledge_graph/**` | V1 原始数据；H1/H3 |
| `data/recipes/**`、`data/fragments/**`、`data/literature/**`、`data/ingredients/**`、`data/techniques/**` | V1 原始数据；H3 |
| `data/kb/schema/kb-schema.v2.json` | KB-001 Schema 唯一事实来源 |
| `data/kb/examples/**` | KB-001 示例集与负例集 |
| `scripts/kb/validate-kb-schema.mjs`、`scripts/kb/lib/**` | KB-001 已 PASS 的校验器 |
| `scripts/kb/__tests__/**` | KB-001 的 121 个既有用例（KB-002 不得删改） |
| `backend/**`、`frontend/**`、`service/**`、`.github/workflows/**` | 范围外产品代码 |

### 9.2 KB-002 允许写入

| 路径 | 说明 |
|---|---|
| `data/kb/golden/**` | Golden 数据、示例、负例、工具输出 |
| `scripts/kb002/**` | KB-002 工具与测试 |
| `docs/kb-002/**` | KB-002 文档 |

### 9.3 KB-001 回归保护（KB-002 全程必须保持绿）

| 门禁 | 基线 | 命令 |
|---|---|---|
| KB Schema 校验 | 退出 0 | `node scripts/kb/validate-kb-schema.mjs` |
| KB 全量测试 | **121 / 121 PASS**，skipped 0 | `node --test "scripts/kb/__tests__/*.test.mjs"` |
| 图谱门禁 | 退出 0（193 / 49） | `node scripts/verify_graph_schema.mjs` |
| 文献门禁 | 退出 0（106 / 103） | `node scripts/verify_literature_dataset.mjs` |
| V1 意外修改 | **0** | `git status --porcelain -- data/knowledge_graph data/recipes data/fragments data/literature` |

**新增失败必须为 0**；已知历史基线失败（`scripts/__tests__` 的 7 个）**不得**错误归因给 KB-002。

---

## 10. 验收规则

### 10.1 单道 Golden Dish 验收（供未来 KB-002F+ 使用）

一道菜**通过**当且仅当同时满足：

1. 存在 `SourceWork` + `SourceEdition` + `SourcePassage` + `HistoricalClaim` + `Dish`，且 `Dish.dish_kind = historical_documented_dish`
2. `SourcePassage → SourceEdition → SourceWork` 链完整（TR1–TR3 通过）
3. 至少 1 条 `HistoricalClaim` 经 `claim_about` 指向该 `Dish`
4. 每条 `HistoricalClaim` 满足 KB-001 契约 C1–C4
5. `metadata.golden_id` / `contract_version` / `evidence_level` 齐备且合法
6. 该文件通过 KB-002 校验器（退出码 0）
7. 无伪造来源、无伪造专家审核、无 `E5` 虚标（Security Gate）
8. QA 独立验证通过

### 10.2 数据集级验收

> **⚠ `kb-002.1.2` 修订（`12-contract-admission-semantics.md`）**：本节原文存在**契约—工具语义冲突**——
> 它隐含「`qualified=false` 的记录可存在于数据集中并被汇总为 `PARTIAL_GOLDEN_SET`」，
> 而冻结的 Validator 把 **Q3（`≥ E3`）作为 blocking 入库门槛**（`golden-rules.mjs:305-308` 无条件执行；
> `validate-golden.mjs:242-243` 任何 error 即 `return 1`）。两者**不可同时成立**。
> **现按 `12-contract-admission-semantics.md` 修订如下。**

**（a）判定对象限定为 production golden dataset**

本节全部判据只作用于 **production golden dataset**（`data/kb/golden/*.kb.json`，**不含 `staging/`**）：

- **Candidate / Staging**（`data/kb/golden/staging/*.kb.json`）**允许** `qualified=false`、**允许** Evidence Level `< E3`；
  但**必须数据真实、不伪造 provenance/年份/出版信息/馆藏/expert review，并明确标记当前不足**。
- **Production Golden Dataset** **只允许** `qualified=true`，且必须满足**单菜 admission threshold ≥ E3**（Q3）与**全部** production hard gates。
- **staging candidate 一律不计入 `QUALIFIED_GOLDEN_COUNT`。**

**（b）数据集状态与计数（target = 10）**

`count` = production 中 `qualified=true` 的记录数（**只统计 production**）：

| 状态 | 判定 | `QUALIFIED_GOLDEN_COUNT` | `SHORTFALL` |
|---|---|---|---|
| `EMPTY_GOLDEN_SET` | `count = 0` | `0` | `10` |
| `PARTIAL_GOLDEN_SET` | `0 < count < 10` | `count` | `10 − count` |
| `COMPLETE_GOLDEN_SET` | `count = 10` | `10` | `0` |

- **`PARTIAL_GOLDEN_SET` 的语义是「promotion 进度」**（目标 10 道，当前部分候选达 admission threshold 并成功 promotion），
  **不是**「production 里可混入 `qualified=false` 的菜」。
- 缺额**必须**登记为 `KNOWN_DATA_GAP`。
- **不要求凑满 10 道**；**禁止**为凑数降低 Evidence 标准、创造来源、或把网络文章（`C`/`D`）自动升级为权威史料。
- 是否允许以 `PARTIAL_GOLDEN_SET` 关闭，由 Reviewer + Captain 依本契约判断。

**（c）两层必须分开计算**

```
① 逐 candidate 计算 admission（Evidence Level + 全部 gates）→ 得 qualified
② 对通过者执行 promotion → 进入 production
③ 对 production 计数 → 得 EMPTY / PARTIAL / COMPLETE
```

**禁止**把 ① 与 ③ 混为一步 —— 那正是本次冲突的成因。

> **【已取代】** 本节 `kb-002.1.0` 原文如下（保留以备独立核对，**不再生效**）：
> ~~「- **不要求凑满 10 道**。若合格数 < 10，**必须**如实输出 `QUALIFIED_GOLDEN_COUNT = <n>`、`SHORTFALL = <10-n>`，并将缺额登记为 `KNOWN_DATA_GAP`；- **禁止**为凑数降低 Evidence 标准、创造来源、或把网络文章（`C`/`D`）自动升级为权威史料；- 是否允许以 `PARTIAL_GOLDEN_SET` 关闭，由 Reviewer + Captain 依本契约判断」~~
> 取代原因：未区分 candidate 与 production 两层，默认了「`qualified=false` 的记录可入库并被汇总」，与 Q3 blocking 行为直接矛盾。
> 权威定义见 `docs/kb-002/12-contract-admission-semantics.md`。

### 10.3 测试策略（供 KB-002E 实现、QA 验证）

**Positive**：完整合法 Golden record → PASS

**Negative（至少，用户指定清单）**：
缺 `SourceWork` · 缺 `SourceEdition` · 缺 `SourcePassage` · dangling `SourcePassage` ID ·
dangling Claim evidence ID · duplicate Claim ID · duplicate Dish ID · invalid Evidence Level ·
invalid `review_status` · unsupported Claim 标为 fully-supported · `insufficient` Claim 却标 `E4`/`E5` ·
contradictory evidence 被非法覆盖 · fixture path 混入 production · invalid source URL schema ·
V1 mutation attempt · malformed JSON · unexpected relation target

**追加（本契约新增）**：`E5` 虚标 · `SOURCE_GRADE=X` 出现在支撑链 · `review_status` 自封 `external_reviewed` ·
`metadata.golden_id` 重复 · Golden 文件名与 `metadata.golden_id` 不一致

---

## 11. 不可变红线（No-Fabrication，KB-002 强化版）

**严禁**：

1. AI 编 URL
2. AI 编古籍名
3. AI 编作者
4. AI 编版本
5. AI 编馆藏
6. AI 编卷号
7. AI 编页码
8. AI 编章节
9. AI 编专家审核
10. AI 输出自身作为历史证据
11. 把 `C`/`D` 级网络资料自动升级为高等级史料
12. 虚标 `E5`

**无法验证 ⟹ 标 `insufficient`，不是补全。**

---

## 12. 冻结与变更流程

1. 本契约自 KB-002A 提交起**冻结**。
2. 实现方若发现契约不可实现或存在缺陷，**不得**自行偏离；须由 Architect 更新本文件并递增版本，再由 Captain 重新调度受影响任务。
3. 任何对第 2.2 节硬约束（H1–H8）或第 9.1 节只读清单的改动，**必须**经 Captain 更新 Task Spec 后方可实施。

---

## 13. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `kb-002.1.2` | t23 | **契约缺陷修复（由真实数据暴露）**。修订 **§7 `qualified` 字段语义**（→ **production admission result**；candidate 可为 `false`、production 不得为 `false`）与 **§10.2 数据集级验收**（引入 candidate/staging/production 三层语义；`PARTIAL_GOLDEN_SET` 重定义为 **promotion 进度**；新增 `EMPTY_GOLDEN_SET` / `COMPLETE_GOLDEN_SET` 与计数口径；staging **不计入** `QUALIFIED_GOLDEN_COUNT`；两层须分开计算）。**原因**：原文隐含「`qualified=false` 可入库并汇总为 `PARTIAL_GOLDEN_SET`」，与冻结 Validator 的 **Q3 ≥E3 blocking 行为**（`golden-rules.mjs:305-308`、`validate-golden.mjs:242-243`）**不可同时成立**。**已取代**标注保留原文。**影响面**：`03`–`11` 各文档中引用 `PARTIAL_GOLDEN_SET` / `QUALIFIED_GOLDEN_COUNT` 的表述以 `12-contract-admission-semantics.md` 为准；`06`–`08` 门禁结论不受影响（其读数为**诚实计算的 0/10**）。**未修改**任何实现、数据、Validator、fixture 或 test。 |
| `kb-002.1.0` | KB-002A | 首次冻结：Golden 闭环定义、文件落位（`data/kb/golden/`）、ID 规范（含 `GOLDEN-<NNN>`）、17 实体必填字段（逐条引用 KB-001 Schema 2.0.0）、`provenance`/`unknown`/`insufficient` 规则、Evidence Level `E0–E5`、来源等级 `S/A/B/C/D/X`、冲突保留、`review_status` 不含 `verified`、KB-002 文档信封、版本策略、KB-001 边界与回归保护、单菜与数据集验收规则、测试策略、不可变红线 |

---

## 14. 待 Captain 处理的契约外事项

| # | 事项 | 建议动作 |
|---|---|---|
| 1 | KB-002E（t5）inScope 中的 `data/kb-002/` 与本契约的 `data/kb/golden/` 不一致 | `amend_task` 将 t5 inScope 的 `data/kb-002/` 改为 `data/kb/golden/` |
| 2 | KB-001 Schema **无** Evidence Level / 来源等级字段；本契约以 `notes` 前缀承载（6.5 节） | 本轮接受该约定；若需结构化字段属 Schema 变更，须新开契约版本（本轮禁止） |
| 3 | `Experiment` 在 Golden 数据中禁止出现（H8，KB-001 契约 EX3） | 已写入；QA 须作为负例检查 |
| 4 | 当前**无**真实外部专家与真实复原实验 | 因此 `E5` 与 `external_reviewed` 在本阶段**均不可达**；须由 Security 作为硬性负例验证 |
