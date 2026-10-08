# KB-001 Knowledge Schema 2.0 —— 契约（唯一实现依据）

- 契约版本：`2.0.3`
- 状态：**已冻结（frozen）**，KB-001B / KB-001C / KB-001D / KB-001E 均以本文件为准
- 上游事实基线：`docs/kb-001/00-fact-audit.md`（Repository Fact Audit，已完成）
- 本文件为 KB-001A 产物，**只定义契约，不含实现**
- 修订记录见第 20 节（`2.0.1` 由 KB-001A2、`2.0.2` 由 KB-001A3、`2.0.3` 由 KB-001C/K1 修复补充）

> 本契约中的所有数字、路径、行号、字段名，均来自对当前工作树（分支 `feat/trae-offline-museum`）的**实际读取**，并已在第 2.2 节记录复现方式。
> 凡本契约未写明的内容，实现方**不得自行发明**；应先由 Architect 补充契约。

---

## 1. 目的与适用范围

### 1.1 目的

把"风味考古局"从"若干扁平 JSON 图谱"升级为**可追溯、可校验、可兼容**的知识层，使每一个历史判断都能说明：

1. **依据**（哪本书、哪个版本、哪一段原文）；
2. **确定程度**（`evidence_status` / `confidence` / `certainty`）；
3. **不确定项**（显式 `unknown_fields`，不得用编造值填充）；
4. **哪些属于现代烹饪适配**（`content_class`）。

### 1.2 范围

本契约覆盖 KB-001 的全部交付物：V2 Schema、数据校验器、V1→V2 兼容适配器、独立测试、文档与门禁。

### 1.3 明确不在本契约范围

- ❌ 不实施 KB-002～KB-008（Golden 10 证据数据、混合检索、时空校验、Claim-level Evidence、双版本复原、Benchmark、实验闭环）
- ❌ 不改 UI、不改 LLM Prompt、不改复原算法、不重做 `evidenceScore`
- ❌ 不批量扩充菜品、不引入新基础设施、不升级无关依赖、不做大范围重构
- ❌ 不修改任何 V1 读取路径的行为（见第 14 节冻结清单）

---

## 2. 事实基线

### 2.1 已核实的关键事实（决定本契约的设计）

| # | 事实 | 位置 | 对契约的影响 |
|---|---|---|---|
| F1 | `scripts/verify_graph_schema.mjs:297` 用 `readdirSync` + `/^nodes_.+\.json$/` **自动发现**节点类型 | `scripts/verify_graph_schema.mjs:295-305` | **V2 数据严禁放入 `data/knowledge_graph/`**（第 3 节） |
| F2 | 现有 `data/knowledge_graph/schema.json` **不是可执行 JSON Schema**：全文无 `"required"`，字段以中文散文描述 | `data/knowledge_graph/schema.json`（180 行） | V2 Schema 必须是**机器可执行**的（第 12.3 节） |
| F3 | Node 后端**只读** `data/knowledge_graph/nodes_dish.json`（外加 `light_mode/`、`fragments/`、`visual_assets/`） | `LightModeService.js:3-5`、`VisionService.js:3`、`vision/VisionCandidateMapper.js:3`、`FragmentService.js:3`、`StarMapService.js:5` | V1 读取路径冻结（第 14 节） |
| F4 | `service/knowledge_graph.py:27-35` 使用**硬编码 7 个文件名**，非 `os.listdir` 自动发现 | `service/knowledge_graph.py:22-59` | 新增文件不会改变 Python 侧加载行为 |
| F5 | 关系与出处数据**仅经 Python 侧可达**；`recorded_in` 指向 `ancient_text` 节点 | `data/knowledge_graph/relationships.json`（49 条） | 适配器必须把 `recorded_in` 改挂到 `SourcePassage`（第 13.5 节） |
| F6 | `text_lit_076`/`084`/`097` 缺失，根因 `scripts/build_literature_dataset.mjs:237` 按 `title` 去重丢弃 3 条 | `data/knowledge_graph/nodes_ancient_text.json`（108 条 = 5 + 103） | 适配器**不得**修复该缺陷；须报告（第 13.7 节） |
| F7 | 5 条旧古籍节点 `text_001`–`text_005` **完全没有出处字段** | `data/knowledge_graph/nodes_ancient_text.json` | 映射为 `provenance.derivation: unresolved` + `evidence_status: insufficient`，**禁止补全** |
| F8 | `expert_review_manifest.json` 覆盖率 4/193，`reviewer` 全为字符串 `"Internal research lead"`，文件自述非外部专家签核 | `data/knowledge_graph/expert_review_manifest.json` | `ExpertReview` 必须有 `reviewer_kind`，且**禁止**把 `internal_editor` 升级为 `external_reviewed`（第 9.15 节） |
| F9 | `scripts/__tests__` 基线已有 **7 个失败**（`tests 34 / pass 27 / fail 7`） | `docs/kb-001/00-fact-audit.md` §4.2 | 本轮只做基线对比，**不修复、不掩盖、不删负例** |
| F10 | 仓库根**无 `package.json`**；Node 脚本以 `node scripts/xxx.mjs` 从仓库根执行 | 仓库根 | 校验器/适配器为独立 `.mjs`，不新增 npm 入口 |
| F11 | 工具链实测：Node `v24.15.0`、npm `11.12.1`、Python `3.11.9` | 实测 | 使用 Node 内置 `node:test`（Node ≥ 18 可用） |

### 2.2 本契约补充实测的事实（`00-fact-audit.md` 未逐条记录）

以下均由本轮只读脚本对当前工作树实际统计得出，**可作为实现与 QA 的期望值**：

| # | 事实 | 值 |
|---|---|---|
| M1 | `data/knowledge_graph/nodes_dish.json` | 40 条；字段并集 = `id, name, dynasty, source_text, source_passage, description, difficulty, taste_profile, cooking_time, servings, flavor_profile`；`source_passage` 40/40 存在 |
| M2 | `dish.source_text` 为**书名**的菜品 | 10 条，分两类：**7 条**可解析到 5 个内容著作（`dish_001,002,003,004,007,008,009`）；**3 条**书名在图中无节点（`dish_005,006`=`烧尾宴食单`；`dish_010`=`东坡志林`） |
| M3 | `dish.source_text` 为**非遗线索**的菜品 | **30 条**（`…线索` 结尾）。10 + 30 = 40（M1） |
| M4 | `dish.dynasty` 取值 | `宋代 / 唐代 / 清代 / 地方传统`；其中 **`地方传统` 在 `nodes_dynasty.json` 中无对应节点** |
| M5 | `nodes_dynasty.json` | 7 条；`dynasty_001 先秦` 的 `start_year == end_year == -221`（V1 数据缺陷，**保留不修**） |
| M6 | `nodes_ingredient.json` | 16 条；`is_extinct` 全为 `false`；`nutrition` **0/16 存在**（schema 声明但全缺） |
| M7 | `nodes_technique.json` | 10 条；`is_intangible_heritage=true` 5 条 |
| M8 | `nodes_region.json` 5 条 / `nodes_season.json` 7 条 | `season_001..007` |
| M9 | `relationships.json` | 49 条 / 8 种类型：`contains=10, originated_in=10, uses_technique=9, recorded_in=9, technique_from=4, substitute_for=3, popular_in=2, seasonal_for=2`；无重复 `(source,type,target)` 三元组 |
| M10 | `recorded_in` 的 `source_text` 与目标节点 `title` **冲突 5 条** | `dish_005→text_002`、`dish_007→text_004`、`dish_008→text_001`、`dish_009→text_002`、`dish_010→text_001` |
| M11 | `contains` 边中 `properties.preparation` 非空 | 7/10 |
| M12 | `data/literature/authoritative_recipe_texts.json` | `items` 106（`lit_afl_*` 70 + `lit_ccs_*` 36）、`sources` 3；`total_recipes` **106/106 为 `null`** |
| M13 | literature `items[].title` → `nodes_ancient_text.json` 精确匹配 | 103/106 命中，**3 条无节点**：`lit_ccs_006 随园食单`、`lit_ccs_014 山家清供`、`lit_ccs_027 饮膳正要`；`title` 无重复 |
| M14 | `authority.source_id` 解析 | 106/106 可解析到 `sources[].id`（0 悬空） |
| M15 | 5 个内容著作在 literature 中的版本（`edition_contains_work` 规范化匹配，与 §9.2 一致） | `山家清供`→`lit_afl_013`+`lit_ccs_014`（2）；`随园食单`→`lit_afl_018`+`lit_ccs_006`（2）；`齐民要术`→`lit_afl_059`+`lit_ccs_011`（2）；`饮膳正要`→`lit_afl_001`+`lit_afl_002`+`lit_ccs_027`（**3**）；`东京梦华录`→`lit_ccs_001`+`lit_ccs_035`（2）。合计 **11** 条边 |
| M16 | `data/recipes/ancient_recipes.json` | 5 条 `recipe_001..005`；`source` 形如 `《山家清供》卷下` |
| M17 | `data/fragments/ancient_fragments.json` | 8 条；字段 `relatedDishId`（驼峰）；**8/8 的 `passage` 与对应 dish 的 `source_passage` 均不相等**（截断变体） |
| M18 | Passage 候选与合并（**2.0.2 更正**） | 候选来源：书名类菜品 **10** 条 + `ancient_recipes` **5** 条 + `fragments` **8** 条 = **23 个候选**；按去空白后逐字相等合并 **4 组**（`dish_001+recipe_001`、`002+002`、`003+003`、`004+004`）⟹ **19 条** `SourcePassage`。实测输出分布：`ambiguous` **16** / `unresolved` **3** / `resolved` **0** |
| M19 | `data/ingredients/ingredient_mapping.json` | `mappings` 8 条 + `extinct_techniques` 2 条；**含禁用物种 1 条（熊掌，"受保护动物，禁止食用"）** |
| M20 | `data/techniques/intangible_heritage.json` | `categories` 3 → `techniques` 8 条；`level`（如"国家级非遗"）为**无引证断言** |
| M21 | 全仓库**不存在**任何 `data/kb` 引用 | 已 grep `backend/src`、`service`、`scripts` |
| M22 | 全仓库**不存在**递归扫描 `data/` 的脚本 | `verify_asset_budget.mjs:16` 只扫 `frontend/public/dish-backgrounds`；`verify_graph_schema.mjs:297` 只扫 `data/knowledge_graph` |

> M22 是"V2 数据放 `data/kb/` 安全"的直接依据；F1 是"禁止放 `data/knowledge_graph/`"的直接依据。

---

## 3. 文件布局与硬约束

### 3.1 冻结的目录布局

| 用途 | 路径 | 说明 |
|---|---|---|
| V2 机器可读 Schema | `data/kb/schema/kb-schema.v2.json` | 校验器的**唯一**事实来源（第 12.3 节） |
| V2 合法示例集 | `data/kb/examples/valid/*.kb.json` | 无参数运行校验器时校验此集合（第 12.2 节）。**实测 3 个**：`minimal.kb.json`、`fixture-all-entities.kb.json`、`insufficient-declared.kb.json` |
| V2 非法负例集 | `data/kb/examples/invalid/*.kb.json` | 仅供测试以显式路径调用，**不参与**无参数默认运行。**实测 7 个**：`bad-entity-and-relation-type`、`bad-fields-and-refs`、`bad-no-fabrication`、`bad-passage-in-edition-ambiguous`、`bad-passage-in-edition-unresolved`、`bad-review-status-verified`、`bad-trace-chain`（均 `.kb.json`） |
| V2 适配器输出 | `data/kb/generated/*.kb.json` + `data/kb/generated/adaptation-report.json` | 派生数据，**不纳入版本控制**（第 13.6 节） |
| V2 校验器 | `scripts/kb/validate-kb-schema.mjs` | CLI 见第 12 节 |
| V2 校验器内部模块 | `scripts/kb/lib/**/*.mjs` | 纯函数，便于单测 |
| V1→V2 适配器 | `scripts/kb/adapt-v1-to-v2.mjs` | CLI 见第 13 节 |
| KB-001 测试 | `scripts/kb/__tests__/*.test.mjs` | `node --test` 运行 |

### 3.2 硬约束

- **H1**：V2 数据（Schema、示例、生成物）**一律不得**写入 `data/knowledge_graph/`。
  **理由**：`scripts/verify_graph_schema.mjs:297` 用 `readdirSync(graphDir).filter(/^nodes_.+\.json$/)` 自动发现节点类型；任何新增 `nodes_*.json` 会被当作新节点类型载入，从而改变 V1 门禁行为（F1）。
- **H2**：`data/kb/` 下**不得**出现名为 `nodes_*.json` 的文件（即使不在 `data/knowledge_graph/`），避免后续被误移动。
- **H3**：V1 输入文件（第 13.2 节清单）在本轮**只读**；适配器不得写回、不得原地修改、不得重命名。
- **H4**：V2 数据文件扩展名固定为 `.kb.json`（第 4 节）。
- **H5**：所有新增代码**不得**引入任何新依赖（第 15 节）。

---

## 4. KB 文档结构

一个 KB 文档 = 一个 `.kb.json` 文件。**根必须是对象**，包含：

| 键 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `schema_version` | string | ✅ | 必须等于 `"2.0.0"` |
| `entities` | array | ✅ | 可为空数组；元素为实体对象（第 9 节） |
| `relations` | array | ✅ | 可为空数组；元素为关系对象（第 10 节） |
| `metadata` | object | ❌ | 自由元数据；**不得**写入密钥、`.env` 取值、个人凭据 |

**路径解析规则（校验器）**

- 参数为**文件**：直接校验该文件。
- 参数为**目录**：递归收集其下所有 `*.kb.json`（按仓库相对 POSIX 路径的**字典序**升序），逐个校验。**不**收集其他扩展名。
- 无参数：等价于对目录 `data/kb/examples/valid` 执行目录扫描（第 12.2 节）。
- 目录扫描后**至少要有 1 个文件**，否则报 `E_DOC_SHAPE`（防止"空目录=通过"的假绿）。

---

## 5. 通用信封字段（17 个实体类型全部适用）

### 5.1 字段表

| 字段 | 类型 | 必填 | 可空 | 约束 |
|---|---|---|---|---|
| `id` | string | ✅ | ❌ | 匹配第 5.2 节 ID 规则 |
| `entity_type` | string | ✅ | ❌ | 枚举：第 9 节 17 个类型名之一 |
| `schema_version` | string | ✅ | ❌ | 必须等于 `"2.0.0"` |
| `content_class` | string | ✅ | ❌ | 枚举：`historical_fact` \| `historical_inference` \| `modern_adaptation` \| `user_experiment` |
| `evidence_status` | string | ✅ | ❌ | 枚举：`sufficient` \| `insufficient` \| `unknown` |
| `review_status` | string | ✅ | ❌ | 枚举：第 7 节 |
| `provenance` | object | ✅ | ❌ | 结构见第 6 节 |
| `name` | string | ✅ | ❌ | 非空字符串（trim 后长度 > 0） |
| `unknown_fields` | array&lt;string&gt; | ❌ | — | 默认 `[]`；元素为**点分字段路径**（第 8 节） |
| `notes` | string | ❌ | ✅ | 自由说明 |
| `aliases` | array&lt;string&gt; | ❌ | — | 别名；**不得**用别名替代 `id` |

> `name` 统一作为显示名。V1 的 `title`（`nodes_ancient_text.json`、`literature items[].title`）映射为 V2 的 `name`（第 13.4 节）。

### 5.2 稳定 ID 规则

- **格式**：`^[a-z][a-z0-9_]*$`，长度 3–96。
- **前缀**：必须以该实体类型的固定前缀开头（第 9 节每个类型给出）。
- **稳定性**：ID 一经发布**不可变更**；**不得**由可变显示名派生。
- **全局唯一**：ID 在整个被校验文档集内唯一（跨文件、跨类型），违反报 `E_DUPLICATE_ID`。
- **引用格式**：所有 `*_id` / `*_ids` 字段与关系的 `source`/`target` 一律为**目标实体的 `id` 字符串**。

---

## 6. `provenance` 结构（必填，所有实体与关系）

| 字段 | 类型 | 必填 | 可空 | 约束 |
|---|---|---|---|---|
| `derivation` | string | ✅ | ❌ | 枚举：`primary_source` \| `v1_adapter` \| `editorial` \| `unresolved` |
| `basis_ids` | array&lt;string&gt; | ✅ | — | 派生出本记录所依据的实体 ID 列表；`primary_source` 时**必须非空** |
| `asserted_by` | string | ✅ | ❌ | 枚举：`human_editor` \| `v1_import` \| `expert_review` \| `user_experiment` \| `unknown` |
| `asserted_at` | string | ❌ | ✅ | `YYYY-MM-DD`；未知时**按对象类型分别处理**，见下方 P5 |

**`asserted_at` 为未知时的处理（P5，**2.0.2 新增**）**

| 对象 | 未知时的写法 | 理由 |
|---|---|---|
| **实体** | `asserted_at: null` **且** 路径 `provenance.asserted_at` 列入该实体的 `unknown_fields` | 实体有 `unknown_fields` 字段（第 5.1 节），U1 可满足 |
| **关系** | **省略 `asserted_at` 键**（不得置 `null`） | 关系对象**没有** `unknown_fields` 字段（第 10.1 节字段仅为 `type`/`source`/`target`/`evidence_status`/`provenance`/`properties`），故 U1 在关系上**不可满足** |

- **P5 的强制性与理由**：若规定"关系上 `asserted_at` 未知时置 `null` 并列入 `unknown_fields`"，则 U1（`null` 须列入 `unknown_fields`）与第 10.1 节（关系无 `unknown_fields`）**不可同时满足**——该条款对**任何**适配器都不可实现（KB-001C 实测曾因此产生 496 条 `E_UNKNOWN_UNDECLARED`）。
- **已验证**：`data/kb/schema/kb-schema.v2.json` 的 `relations` 定义中**不含** `unknown_fields`（实测为 `false`），`common_fields.unknown_fields` 仅作用于实体。因此关系的 `asserted_at` **只能省略**。
- **校验器行为**：关系上**出现** `asserted_at: null` ⟹ 报 `E_NULL_NOT_ALLOWED`（因关系无 `unknown_fields` 可声明，无法满足 U1）。关系上**省略** `asserted_at` ⟹ **合法**，不报错。
- **P6**：`asserted_at` 非 `null` 时必须匹配 `^\d{4}-\d{2}-\d{2}$`（实体与关系一致）。
| `source_locator` | object | ❌ | ✅ | 结构见下；`derivation = primary_source` 时**必须非空** |
| `notes` | string | ❌ | ✅ | 自由说明 |

`source_locator` 子结构（成员均可空）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `work_id` | string \| null | → `SourceWork.id` |
| `edition_id` | string \| null | → `SourceEdition.id` |
| `passage_id` | string \| null | → `SourcePassage.id` |
| `locator` | string \| null | 卷/章/页/条目的原始表述 |

**强制规则**

- **P1**：`derivation = "primary_source"` ⟹ `basis_ids` 非空 **且** `source_locator` 非空，且其中至少一个成员非空。
- **P2**：`derivation = "unresolved"` ⟹ 实体必须 `unknown_fields` 非空；关系必须 `provenance.notes` 非空。
- **P3**：`derivation = "v1_adapter"` ⟹ `asserted_by` 必须为 `"v1_import"`。
- **P4**：**任何情况下不得**用编造的书名、年份、卷次、页码、版本信息填充 `source_locator`（第 8.3 节）。

---

## 7. `review_status` 枚举

| 取值 | 含义 |
|---|---|
| `unreviewed` | 未评审（默认值） |
| `internal_reviewed` | 内部评审（**非**外部专家） |
| `pending_external_expert` | 待外部专家评审 |
| `external_reviewed` | 外部专家已评审 |
| `rejected` | 评审否决 |

**强制规则**

- **R1**：枚举中**刻意不存在** `verified` 取值——因此"被静默标记为 verified"在结构上不可能发生。
- **R2**：`evidence_status ∈ {insufficient, unknown}` ⟹ `review_status` **必须** ∈ {`unreviewed`, `rejected`}；违反报 `E_EVIDENCE_REVIEW_CONFLICT`。
- **R3**：`provenance.derivation = "unresolved"` ⟹ `review_status` **必须** ∈ {`unreviewed`, `rejected}`；违反报 `E_PROVENANCE_UNRESOLVED_CONFLICT`。
- **R4**：V1 既有取值 `internal_reviewed`、`pending_external_expert`（`expert_review_manifest.json`）**必须原样保留**，不得改写成 `external_reviewed`（F8）。

---

## 8. `unknown` / `insufficient` 的显式表达

### 8.1 表达方式

1. **`unknown_fields`**：数组，元素为点分字段路径（如 `author`、`locator.page`、`start_year`）。表示"该字段确实未知，而不是被遗漏"。
2. **`null`**：字段值本身为 `null`。
3. **`evidence_status`**：`insufficient` / `unknown` 表示证据不足以支撑该记录的历史真实性。

### 8.2 强制规则

- **U1**：若某个**必填且可空**字段为 `null`，其路径**必须**出现在 `unknown_fields` 中；否则报 `E_UNKNOWN_UNDECLARED`。
- **U2**：若某个**必填且不可空**字段缺失或为 `null`，报 `E_MISSING_FIELD` / `E_NULL_NOT_ALLOWED`——**不得**通过补一个猜测值来通过校验。
- **U3**：`unknown_fields` 的每个元素必须是该实体**已声明字段**的合法路径（含嵌套路径）；否则报 `E_UNKNOWN_PATH_INVALID`。
- **U4**：`unknown_fields` 非空 ⟹ `evidence_status` **不得**为 `sufficient`；否则报 `E_EVIDENCE_UNKNOWN_CONFLICT`。

### 8.3 禁止编造（No-Fabrication）——本契约的核心红线

- **N1**：**不得**为了满足必填项而编造年份、地域、页码、版本、卷次、作者、机构。
- **N2**：未知信息**只能**用 `null` + `unknown_fields` 表达，或把记录标为 `evidence_status: insufficient` / `unknown`。
- **N3**：**不得**编造古籍原文、专家审核记录、实验数据或引用（含 `ExpertReview`、`Experiment`、`SourcePassage.text`）。
- **N4**：**不得**把普通网络线索（如 `source_text` 为"…线索"的 **30** 条菜品，M3）自动升级为权威历史证据；此类记录必须为 `evidence_status: insufficient`、`provenance.derivation: unresolved`、`review_status: unreviewed`。
- **N5**：**不得**为缺失的 `provenance` 做任何形式的"补全推断"。

---

## 9. 实体定义（17 个）

> 每节仅列出**该类型特有**字段；第 5 节通用信封字段同样必填。
> "可空"列 ✅ 表示允许 `null`（此时须列入 `unknown_fields`）；❌ 表示必须为非空值。

### 9.1 `SourceWork`（典籍/著作）

- **ID 前缀**：`work_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 书名 / 丛刊名 |
| `author` | string | ✅ | ✅ | 作者；未知时 `null` + `unknown_fields: ["author"]` |
| `attribution_status` | string | ✅ | ❌ | `attributed` \| `disputed` \| `anonymous` \| `unknown` |
| `work_type` | string | ✅ | ❌ | `classic_text` \| `food_monograph` \| `materia_medica` \| `agricultural_treatise` \| `encyclopedic_reference` \| `anthology` \| `collected_series` \| `other` |
| `compiled_period_id` | string | ✅ | ✅ | → `TimePeriod.id` |
| `aliases` | array&lt;string&gt; | ❌ | — | 异名 |

- **V1 对应（三来源，共 10 条）**
  - **内容著作（5 条）**：`nodes_ancient_text.json` 中 `id` 不以 `text_lit_` 开头的 `text_001`–`text_005`（山家清供 / 随园食单 / 齐民要术 / 饮膳正要 / 东京梦华录，F7）。`work_type` 依实际取 `food_monograph` / `agricultural_treatise` / `encyclopedic_reference`；**无出处字段**，故 `author` 按 V1 实际值或 `null`。
  - **丛刊著作（3 条）**：`data/literature/authoritative_recipe_texts.json` 的 `sources[]` 3 条（M12/M14）。`work_type: collected_series`；`author` 取 `sources[].institution`。
  - **未解析书名（2 条）**：`烧尾宴食单`、`东坡志林`（由 `dish_005,006,010` 的 `source_text` 引用，M2，图中无节点）。`work_type: other`、`attribution_status: unknown`、`author: null`、`unknown_fields: ["author"]`、`provenance.derivation: unresolved`、`evidence_status: insufficient`、`review_status: unreviewed`。
- **⚠ 关键**：`SourceWork` **不得**与 `SourceEdition` 混为一谈。文献 `items[]`（106 条）是**丛刊的册次**，即 `SourceEdition`；其所属丛刊才是 `SourceWork`。见第 9.2 节。

### 9.2 `SourceEdition`（版本/丛刊册次）

- **ID 前缀**：`edition_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 版本名 / 册次名 |
| `work_id` | string | ✅ | ✅ | → `SourceWork.id`；**去规范化镜像**，必须与 `edition_of_work` 关系一致 |
| `edition_type` | string | ✅ | ❌ | `modern_reprint` \| `scholarly_edition` \| `facsimile` \| `manuscript` \| `digital_surrogate` \| `unknown` |
| `publisher` | string | ✅ | ✅ | 出版/馆藏机构 |
| `publication_year` | integer | ✅ | ✅ | 年份；未知时 `null` |
| `locator_scheme` | string | ✅ | ❌ | `volume` \| `page` \| `chapter` \| `entry` \| `shelfmark` \| `none` |
| `contains_work_ids` | array&lt;string&gt; | ❌ | — | → `SourceWork.id` 列表；本册次**收录**的内容著作 |

- **V1 对应（106 条，全部必须是实体）**：`data/literature/authoritative_recipe_texts.json` 的 `items` 106 条（M12），包括图中无节点的 3 条（`lit_ccs_006/014/027`，M13）。
- **`work_id` 的取值（**唯一**、必须确定）**：`work_id` = 该条目 `authority.source_id` 对应的 `SourceWork`（丛刊）。
  - 依据：`authority.source_id` **106/106 可解析**到 `sources[].id`（M14），因此 `work_id` **不存在** `null` 情形，`edition_of_work` 基数恒为 1。
  - **⚠ 禁止**把 `work_id` 指向该册次**收录**的内容著作（如把 `lit_ccs_014` 的 `work_id` 指向 `山家清供`）。收录关系一律用 `contains_work_ids` / `edition_contains_work` 表达。
  - **理由**：`lit_ccs_006`/`lit_ccs_014`/`lit_ccs_027` 的 `title` 恰好等于内容著作名（`随园食单`/`山家清供`/`饮膳正要`），若按 `title` 建链会产生语义错误。
- **`contains_work_ids` 的取值**：对 `items[].included_texts[]` 每一项做**规范化**（去掉首个 `（`/`(` 之后的全部内容，再去掉首个 `·` 之后的全部内容，最后 trim），与 `SourceWork.name` 精确比较，命中则收录。实际得到 **11 条** `edition_contains_work` 边（覆盖 5 个内容著作）：
  - `山家清供` → `lit_afl_013`, `lit_ccs_014`
  - `随园食单` → `lit_afl_018`, `lit_ccs_006`
  - `齐民要术` → `lit_afl_059`, `lit_ccs_011`
  - `饮膳正要` → `lit_afl_001`, `lit_afl_002`, `lit_ccs_027`
  - `东京梦华录` → `lit_ccs_001`, `lit_ccs_035`
  - 未命中的 `included_texts` 条目（如 `本草纲目（一）` 等）**不得**被丢弃：记入报告 `unmapped_fields` 的 `literature.included_texts_unresolved`。

### 9.3 `SourcePassage`（原文段落）

- **ID 前缀**：`passage_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 引用标签（如 `山家清供·蟹酿橙`） |
| `text` | string | ✅ | ❌ | 原文；**必须**来自 V1 既有数据，禁止新写（N3） |
| `edition_id` | string | ✅ | ✅ | → `SourceEdition.id`；去规范化镜像，须与 `passage_in_edition` 一致 |
| `locator` | object | ✅ | ✅ | `{ volume, chapter, page, entry }`，四成员均 `string \| null` |
| `text_origin` | string | ✅ | ❌ | `verbatim_transcription` \| `normalized_transcription` \| `paraphrase` \| `unknown` |
| `language` | string | ✅ | ❌ | 如 `lzh`（文言）、`zh` |
| `edition_candidates` | array&lt;string&gt; | ✅ | — | → `SourceEdition.id` 候选集（可为空数组）。**不**代表已确定归属 |
| `edition_resolution` | string | ✅ | ❌ | `resolved` \| `ambiguous` \| `unresolved` |

- **追踪链（见第 11.2 节 TR1）**
  - `edition_resolution = "resolved"` ⟹ `edition_id` **必须**非 `null`，且**恰好 1 条** `passage_in_edition`。
  - `edition_resolution ∈ {ambiguous, unresolved}` ⟹ `edition_id` **必须**为 `null`（并列入 `unknown_fields`），**0 条** `passage_in_edition`，且 `evidence_status` **不得**为 `sufficient`。
- **⚠ 禁止消歧**：当 `edition_candidates` 有 >1 个候选时，**不得**任选一个作为 `edition_id`（那会伪造"该版本确含此段"的事实）。必须置 `edition_resolution: "ambiguous"`。
  **实际数据（2.0.2 更正）**：**19 条** Passage 中，**16 条**有 2–3 个候选 Edition ⟹ `ambiguous`；**3 条**（`passage_dish_005`/`006`/`010`，书名在图中无节点）候选为空 ⟹ `unresolved`；**0 条**唯一候选。即本轮**没有任何** Passage 可判为 `resolved`（见 13.5）。

### 9.4 `HistoricalClaim`（历史陈述）

- **ID 前缀**：`claim_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 陈述摘要 |
| `statement` | string | ✅ | ❌ | 被断言的内容 |
| `claim_type` | string | ✅ | ❌ | `existence` \| `provenance` \| `attribution` \| `technique` \| `ingredient_use` \| `geography` \| `chronology` \| `cultural_context` \| `other` |
| `about_ids` | array&lt;string&gt; | ✅ | — | **非空**；被陈述的实体 ID；须与 `claim_about` 关系镜像一致 |
| `confidence` | string | ✅ | ❌ | `high` \| `medium` \| `low` \| `unknown` |
| `uncertainty_notes` | array&lt;string&gt; | ❌ | — | 不确定项说明 |
| `counter_evidence_notes` | array&lt;string&gt; | ❌ | — | 反证说明 |

- **强制规则**
  - **C1**：`evidence_status = sufficient` ⟹ **必须**有 ≥1 条 `claim_supported_by` 关系；否则报 `E_CLAIM_NO_EVIDENCE`。
  - **C2**：`evidence_status ∈ {insufficient, unknown}` ⟹ `uncertainty_notes` **必须非空**；否则报 `E_CLAIM_UNCERTAINTY_MISSING`。
  - **C3**：`content_class` **必须** ∈ {`historical_fact`, `historical_inference`}；否则报 `E_CONTENT_CLASS_TYPE`。
  - **C4**：`claim_refuted_by` 关系存在时，`counter_evidence_notes` **必须非空**。

### 9.5 `Dish`（菜品）

- **ID 前缀**：`dish_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 菜名 |
| `dish_kind` | string | ✅ | ❌ | `historical_documented_dish` \| `heritage_practice_lead` \| `modern_adaptation` |
| `period_id` | string | ✅ | ✅ | → `TimePeriod.id` |
| `region_ids` | array&lt;string&gt; | ❌ | — | → `Region.id` |
| `season_ids` | array&lt;string&gt; | ❌ | — | → `Season.id` |
| `description` | string | ✅ | ✅ | 描述 |
| `aliases` | array&lt;string&gt; | ❌ | — | 别名 |

- **V1 对应**：`nodes_dish.json` 40 条（M1）。**10 条**有书名出处 → `historical_documented_dish`（M2）；**30 条** `…线索` → `heritage_practice_lead`（M3）。
- **强制规则**：`dish_kind = heritage_practice_lead` ⟹ `evidence_status` **不得**为 `sufficient`。

### 9.6 `Ingredient`（食材）

- **ID 前缀**：`ing_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 食材名 |
| `category` | string | ✅ | ❌ | `grain` \| `vegetable` \| `fruit` \| `meat` \| `aquatic` \| `seasoning` \| `fungus` \| `dairy` \| `other` |
| `biological_identification_status` | string | ✅ | ❌ | `identified` \| `provisional` \| `disputed` \| `unknown` |
| `availability_status` | string | ✅ | ❌ | `available` \| `rare` \| `protected` \| `extinct_in_wild` \| `historical_only` \| `unknown` |
| `aliases` | array&lt;string&gt; | ❌ | — | 别名 |

- **V1 对应**：`nodes_ingredient.json` 16 条（M6）；`data/ingredients/ingredient_mapping.json` 的 `mappings`（M19）。
- **强制规则**：V1 `is_extinct` **全部为 `false`**，因此**不得**据此断言任何食材已灭绝；`availability_status` 仅在有出处支撑时取 `rare` / `protected` / `extinct_in_wild`，否则取 `unknown` + `evidence_status: insufficient`。

### 9.7 `IngredientState`（食材处理态）

- **ID 前缀**：`istate_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 处理态名 |
| `ingredient_id` | string | ✅ | ❌ | → `Ingredient.id` |
| `preparation` | string | ✅ | ❌ | 预处理描述 |
| `state_kind` | string | ✅ | ❌ | `raw` \| `chopped` \| `ground` \| `soaked` \| `fermented` \| `dried` \| `cooked` \| `mixed` \| `other` |

- **V1 对应**：`contains` 关系的 `properties.preparation` 非空 7 条（M11）。

### 9.8 `Technique`（技法）

- **ID 前缀**：`tech_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 技法名 |
| `category` | string | ✅ | ❌ | `knife` \| `heat` \| `seasoning` \| `shaping` \| `fermentation` \| `curing` \| `other` |
| `description` | string | ✅ | ✅ | 描述 |
| `heritage_designation` | object | ✅ | ✅ | `{ level, list_name, designation_year }` |

`heritage_designation` 子结构：

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `level` | string | ✅ | ❌ | `national` \| `provincial` \| `municipal` \| `county` \| `none` \| `unknown` |
| `list_name` | string | ✅ | ✅ | 名录名称 |
| `designation_year` | integer | ✅ | ✅ | 入选年份 |

- **强制规则**：`heritage_designation.level ≠ "unknown"` ⟹ 该 `Technique` **必须**有 ≥1 条 `claim_supported_by` 链（经 `HistoricalClaim`）或 `provenance.derivation = primary_source`；否则报 `E_HERITAGE_UNSOURCED`。
  **依据**：`data/techniques/intangible_heritage.json` 的 `level` 目前为无引证断言（M20）。

### 9.9 `Utensil`（器具）

- **ID 前缀**：`utensil_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 器具名 |
| `utensil_kind` | string | ✅ | ❌ | `cooking_vessel` \| `steamer` \| `stove` \| `cutting_tool` \| `serving_vessel` \| `storage_vessel` \| `other` |
| `material` | string | ✅ | ✅ | 材质 |
| `modern_equivalent` | string | ✅ | ✅ | 现代替代；仅在 `content_class = modern_adaptation` 时可断言 |

- **V1 对应**：`ancient_recipes.json` 的 `modern_adaptation` 字段（如"可用砂锅或蒸锅替代小甑"）是**唯一**可用的器具线索来源；**不得**从描述文本中臆造器具。

### 9.10 `Measurement`（用量）

- **ID 前缀**：`measure_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 用量标签 |
| `quantity_text` | string | ✅ | ✅ | 原始表述（如"适量""二块"） |
| `quantity_value` | number | ✅ | ✅ | 归一化数值 |
| `unit` | string | ✅ | ❌ | `gram` \| `milliliter` \| `piece` \| `jin` \| `liang` \| `sheng` \| `dou` \| `spoon` \| `dash` \| `pinch` \| `to_taste` \| `unknown` |
| `of_ingredient_id` | string | ✅ | ✅ | → `Ingredient.id` |
| `used_by_dish_id` | string | ✅ | ✅ | → `Dish.id` |
| `normalization_status` | string | ✅ | ❌ | `as_recorded` \| `normalized` \| `unnormalizable` \| `unknown` |

- **强制规则（禁止臆造数值）**
  - **ME1**：`normalization_status ∈ {as_recorded, unnormalizable}` ⟹ `quantity_value` **必须**为 `null` 且 `quantity_text` **必须**非空；否则报 `E_MEASUREMENT_FABRICATED`。
  - **ME2**：`normalization_status = normalized` ⟹ `quantity_value` 非空、`unit ∉ {unknown, to_taste}`；否则报 `E_MEASUREMENT_INCOMPLETE`。
- **V1 对应**：`contains` 关系的 `properties.quantity` 10 条（M9/M11）。V1 的 `"适量"`、`"少许"` → `normalization_status: unnormalizable`，`unit: to_taste`，`quantity_value: null`。

### 9.11 `TimePeriod`（时间区间）

- **ID 前缀**：`period_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 时期名 |
| `start_year` | integer | ✅ | ✅ | 天文纪年（公元前为负数） |
| `end_year` | integer | ✅ | ✅ | 同上 |
| `calendar` | string | ✅ | ❌ | `gregorian_astronomical` \| `chinese_dynastic` \| `reign_era` \| `unknown` |
| `certainty` | string | ✅ | ❌ | `exact` \| `approximate` \| `disputed` \| `unknown` |
| `parent_period_id` | string | ❌ | ✅ | → `TimePeriod.id` |

- **强制规则（时间区间合法性）**
  - **T1**：`start_year` 与 `end_year` 均非 `null` 时，**必须** `start_year ≤ end_year`；否则报 `E_TIME_RANGE_INVALID`。
  - **T2**：任一为 `null` 时，其路径**必须**列入 `unknown_fields`（U1）。
  - **T3**：数值范围 **-3000 ≤ year ≤ 2200**；越界报 `E_TIME_RANGE_INVALID`。
  - **T4**：`certainty = exact` ⟹ 两者均非 `null`。
  - **T5**：**不得**为满足 T1/T4 而编造年份（N1）。
- **V1 对应**：`nodes_dynasty.json` 7 条（M5）。`dynasty_001 先秦` 的 `-221/-221` 为 V1 缺陷，**原样保留**（满足 T1，不触发报错），由适配器报告记录。

### 9.12 `Region`（地域）

- **ID 前缀**：`region_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 地域名 |
| `region_kind` | string | ✅ | ❌ | `modern_admin` \| `historical_admin` \| `cultural_area` \| `physical_geography` \| `unknown` |
| `parent_region_id` | string | ❌ | ✅ | → `Region.id` |
| `modern_admin_codes` | array&lt;string&gt; | ❌ | — | 现代行政区划代码 |

- **强制规则**：`region_kind = unknown` ⟹ `modern_admin_codes` **必须**为空数组。
- **V1 对应**：`nodes_region.json` 5 条（M8）。

### 9.13 `Season`（节令）

- **ID 前缀**：`season_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 节令名 |
| `season_kind` | string | ✅ | ❌ | `solar_term` \| `lunar_festival` \| `calendar_month` \| `growing_season` \| `unknown` |
| `lunar_month` | integer | ✅ | ✅ | 1–12 |
| `solar_term_name` | string | ✅ | ✅ | 节气名 |

- **强制规则**：`lunar_month` 非 `null` 时**必须** ∈ [1,12]；否则报 `E_FIELD_TYPE`。
- **V1 对应**：`nodes_season.json` 7 条（M8）。

### 9.14 `RestorationVersion`（复原版本）

- **ID 前缀**：`resto_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 版本名 |
| `dish_id` | string | ✅ | ❌ | → `Dish.id` |
| `version_kind` | string | ✅ | ❌ | `historical_faithful` \| `modern_kitchen` \| `experimental` |
| `based_on_claim_ids` | array&lt;string&gt; | ✅ | — | **非空**；→ `HistoricalClaim.id` |
| `steps` | array&lt;object&gt; | ✅ | — | **非空** |
| `adaptation_notes` | array&lt;string&gt; | ❌ | — | 现代适配说明 |

`steps[]` 元素：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `order` | integer | ✅ | ≥ 1，文档内唯一 |
| `text` | string | ✅ | 非空 |
| `technique_ids` | array&lt;string&gt; | ❌ | → `Technique.id` |
| `utensil_ids` | array&lt;string&gt; | ❌ | → `Utensil.id` |
| `ingredient_state_ids` | array&lt;string&gt; | ❌ | → `IngredientState.id` |

- **强制规则**
  - **RV1**：`version_kind = historical_faithful` ⟹ `content_class ∈ {historical_fact, historical_inference}`。
  - **RV2**：`version_kind ∈ {modern_kitchen, experimental}` ⟹ `content_class ∈ {modern_adaptation, user_experiment}` **且** `adaptation_notes` 非空。
  - **RV3**：`based_on_claim_ids` 中每个 Claim 的 `evidence_status` 若为 `insufficient`，则本版本 `evidence_status` **不得**为 `sufficient`。

### 9.15 `ExpertReview`（专家评审）

- **ID 前缀**：`review_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 评审标签 |
| `subject_id` | string | ✅ | ❌ | 被评审实体 ID |
| `reviewer_kind` | string | ✅ | ❌ | `internal_editor` \| `external_scholar` \| `institution` \| `anonymous` \| `unknown` |
| `reviewer_name` | string | ✅ | ✅ | 具名评审人 |
| `review_date` | string | ✅ | ✅ | `YYYY-MM-DD` |
| `review_outcome` | string | ✅ | ❌ | `approved` \| `approved_with_conditions` \| `pending` \| `rejected` \| `unknown` |
| `scope_notes` | string | ✅ | ✅ | 评审范围说明 |

- **强制规则（禁止伪造专家审核）**
  - **ER1**：`reviewer_kind ∈ {anonymous, unknown}` ⟹ `review_outcome` **不得**为 `approved`；否则报 `E_REVIEW_UNVERIFIABLE`。
  - **ER2**：只有存在 `reviewer_kind = external_scholar` 或 `institution` 的 `ExpertReview`，且 `review_outcome ∈ {approved, approved_with_conditions}` 时，被评审实体的 `review_status` 才**允许**为 `external_reviewed`；否则报 `E_REVIEW_STATUS_UNSUPPORTED`。
  - **ER3**：`reviewer_kind = internal_editor` **不得**支撑 `external_reviewed`（对应 F8：`expert_review_manifest.json` 的 `"Internal research lead"` 只能支撑 `internal_reviewed`）。
  - **ER4**：`review_date` 非空时**必须**匹配 `^\d{4}-\d{2}-\d{2}$`。

### 9.16 `SafetyRule`（安全规则）

- **ID 前缀**：`safety_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 规则名 |
| `rule_kind` | string | ✅ | ❌ | `prohibited_species` \| `allergen` \| `toxin` \| `hygiene` \| `legal_restriction` \| `other` |
| `applies_to_ids` | array&lt;string&gt; | ✅ | — | **非空**；→ 实体 ID |
| `severity` | string | ✅ | ❌ | `blocker` \| `high` \| `medium` \| `low` |
| `rule_text` | string | ✅ | ❌ | 规则内容 |
| `jurisdiction` | string | ✅ | ✅ | 适用法域 |

- **V1 对应**：`data/ingredients/ingredient_mapping.json` 中 `status` 含"禁止"的 1 条（熊掌，M19）→ `rule_kind: prohibited_species`、`severity: blocker`。
- **强制规则**：`severity = blocker` ⟹ 其 `applies_to_ids` 指向的实体**不得**出现在任何 `RestorationVersion.steps` 的推荐用料中（本轮仅做结构校验，不做语义阻断）。

### 9.17 `Experiment`（用户实验）

- **ID 前缀**：`exp_`
- **特有字段**

| 字段 | 类型 | 必填 | 可空 | 枚举 / 约束 |
|---|---|---|---|---|
| `name` | string | ✅ | ❌ | 实验名 |
| `restoration_version_id` | string | ✅ | ❌ | → `RestorationVersion.id` |
| `performed_at` | string | ✅ | ✅ | `YYYY-MM-DD` |
| `performed_by` | string | ✅ | ✅ | 执行者 |
| `protocol` | string | ✅ | ❌ | 实验步骤 |
| `observations` | array&lt;string&gt; | ✅ | — | 观察记录（可为空数组） |
| `outcome` | string | ✅ | ❌ | `success` \| `partial` \| `failure` \| `inconclusive` \| `unknown` |

- **强制规则**
  - **EX1**：`content_class` **必须**为 `user_experiment`；否则报 `E_CONTENT_CLASS_TYPE`。
  - **EX2**：`Experiment` **永远不构成历史证据**；不得作为任何 `HistoricalClaim` 的 `claim_supported_by` 目标（`claim_supported_by` 的 target 类型限定为 `SourcePassage`，第 10 节已结构性阻断）。
  - **EX3**：本轮**不得**创建任何 `Experiment` 实例数据（用户未提供真实实验记录）。

---

## 10. 关系类型与端点约束

### 10.1 关系对象结构

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `type` | string | ✅ | 必须为第 10.2 节枚举之一，否则 `E_UNKNOWN_RELATION_TYPE` |
| `source` | string | ✅ | 实体 ID；**类型必须**属于该关系类型的允许 source 集合，否则 `E_RELATION_ENDPOINT_TYPE` |
| `target` | string | ✅ | 同上（target 集合） |
| `evidence_status` | string | ✅ | `sufficient` \| `insufficient` \| `unknown` |
| `provenance` | object | ✅ | 第 6 节 |
| `properties` | object | ❌ | 关系类型特定字段（第 10.2 节） |

> `source`/`target` 指向不存在的 ID ⟹ `E_DANGLING_REFERENCE`。

**关系对象不支持 `unknown_fields`（**2.0.2 明确**）**

- 关系对象**没有** `unknown_fields` 字段——上表字段即为**完整**清单（6 个）。该字段仅存在于实体（第 5.1 节 `common_fields`）。
- 因此，**任何**"把 `null` 列入 `unknown_fields` 来声明未知"的规则（如 U1）**都不适用于关系**。
- 具体后果：`provenance.asserted_at` 在关系上未知时**必须省略该键**，**不得**置 `null`（见第 6 节 P5）。
- **理由**：否则 U1（`null` 须列入 `unknown_fields`）与本节的字段清单**不可同时满足**，该条款对任何适配器都不可实现（KB-001C 实测曾产生 496 条 `E_UNKNOWN_UNDECLARED`）。
- **实测**：`data/kb/schema/kb-schema.v2.json` 的 `relations` 定义不含 `unknown_fields`；`data/kb/generated/kb-v2.kb.json` 的 214 条关系中带 `asserted_at` 键的 = **0**，带 `unknown_fields` 键的 = **0**，且校验通过（0 错误）。

### 10.2 关系类型清单（24 种）

**A. 来源追踪链（必需）**

| # | `type` | 允许 source | 允许 target | 必需 properties | 基数 |
|---|---|---|---|---|---|
| 1 | `passage_in_edition` | `SourcePassage` | `SourceEdition` | — | `edition_resolution = resolved` ⟹ 恰好 1 条；否则 0 条 |
| 2 | `edition_of_work` | `SourceEdition` | `SourceWork` | — | 每个 Edition **恰好 1 条**（`work_id` 恒非 `null`，见 9.2） |
| 3 | `edition_contains_work` | `SourceEdition` | `SourceWork` | — | ≥0（镜像 `contains_work_ids`；V1 实际 11 条） |
| 4 | `claim_supported_by` | `HistoricalClaim` | `SourcePassage` | — | ≥0 |
| 5 | `claim_refuted_by` | `HistoricalClaim` | `SourcePassage` | — | ≥0 |

**B. Claim 关联**

| # | `type` | 允许 source | 允许 target | 必需 properties | 基数 |
|---|---|---|---|---|---|
| 6 | `claim_about` | `HistoricalClaim` | `Dish`, `Ingredient`, `IngredientState`, `Technique`, `Utensil`, `Measurement`, `TimePeriod`, `Region`, `Season`, `RestorationVersion` | — | ≥1（镜像 `about_ids`） |

**C. 领域关系（镜像 V1）**

| # | `type` | 允许 source | 允许 target | 必需 properties | V1 对应 |
|---|---|---|---|---|---|
| 7 | `dish_contains_ingredient` | `Dish` | `Ingredient` | — | `contains` |
| 8 | `dish_uses_technique` | `Dish` | `Technique` | — | `uses_technique` |
| 9 | `dish_originated_in` | `Dish` | `TimePeriod` | — | `originated_in` |
| 10 | `dish_popular_in` | `Dish` | `Region` | — | `popular_in` |
| 11 | `dish_seasonal_for` | `Dish` | `Season` | — | `seasonal_for` |
| 12 | `dish_recorded_in` | `Dish` | `SourcePassage` | — | `recorded_in`（**改挂 Passage**） |
| 13 | `ingredient_from_region` | `Ingredient` | `Region` | — | `ingredient_from`（V1 未使用） |
| 14 | `ingredient_season` | `Ingredient` | `Season` | — | `ingredient_season`（V1 未使用） |
| 15 | `technique_from_region` | `Technique` | `Region` | — | `technique_from` |
| 16 | `ingredient_substitutes` | `Ingredient` | `Ingredient` | — | `substitute_for` |
| 17 | `dish_uses_utensil` | `Dish` | `Utensil` | — | 无 |
| 18 | `ingredient_state_of` | `IngredientState` | `Ingredient` | — | 无（由 `contains.preparation` 派生） |
| 19 | `measurement_of_ingredient` | `Measurement` | `Ingredient` | — | 无（由 `contains.quantity` 派生） |

**D. 复原 / 评审 / 安全 / 实验**

| # | `type` | 允许 source | 允许 target | 必需 properties | 基数 |
|---|---|---|---|---|---|
| 20 | `restoration_version_of` | `RestorationVersion` | `Dish` | — | 每个 RV **恰好 1 条** |
| 21 | `restoration_based_on_claim` | `RestorationVersion` | `HistoricalClaim` | — | ≥1（镜像 `based_on_claim_ids`） |
| 22 | `review_of` | `ExpertReview` | 任意 17 类实体 | — | ≥1 |
| 23 | `safety_rule_applies_to` | `SafetyRule` | `Dish`, `Ingredient`, `IngredientState`, `Technique`, `Utensil`, `Measurement`, `RestorationVersion`, `Experiment` | — | ≥1（镜像 `applies_to_ids`） |
| 24 | `experiment_tests` | `Experiment` | `RestorationVersion` | — | ≥1 |

> 计数说明：上表共 **24** 条关系类型（A 组 5 + B 组 1 + C 组 13 + D 组 5），编号 1–24 连续无缺号。**权威清单以上表 `type` 名称为准**；校验器必须以上表为准（实现于 `data/kb/schema/kb-schema.v2.json`）。

### 10.3 关系属性（`properties`）

| `type` | 允许的 `properties` 键 | 说明 |
|---|---|---|
| `dish_contains_ingredient` | `quantity_text` (string\|null), `role` (string\|null) | 由 V1 `contains.properties.quantity` / `.role` 映射 |
| `dish_uses_technique` | `step_order` (integer\|null) | V1 的 `description` 字段**丢弃**并报告（见 13.7） |
| `dish_recorded_in` | `chapter` (string\|null), `locator_text` (string\|null) | V1 `chapter` / `page_reference` |
| `ingredient_substitutes` | `similarity` (number 0–1\|null), `notes` (string\|null) | V1 `substitute_for.properties` |
| `dish_popular_in` | `popularity` (string\|null) | V1 `popular_in.properties.popularity` |

未列出的 `properties` 键报 `E_RELATION_SHAPE`（防止适配器静默塞入未知字段）。

---

## 11. 追踪链约束（必须可校验）

### 11.1 完整链

```
SourceWork  ←──edition_of_work──  SourceEdition  ←──passage_in_edition──  SourcePassage
                                                                              ▲
                                                        claim_supported_by ───┘
                                                                              │
                                                                     HistoricalClaim
```

### 11.2 强制规则

- **TR1**：`SourcePassage.edition_resolution = "resolved"` ⟹ **必须**有且仅有 1 条 `passage_in_edition`，且 `edition_id` 非 `null` 并等于其 target；`edition_resolution ∈ {ambiguous, unresolved}` ⟹ **必须** 0 条 `passage_in_edition` 且 `edition_id` 为 `null`。违反报 `E_TRACE_MISSING`。
- **TR2**：每个 `SourceEdition` **必须**有且仅有 1 条 `edition_of_work`（`work_id` 非 `null` 且等于其 target）。违反报 `E_TRACE_MISSING`。
- **TR3**：`passage_in_edition` 的 target `SourceEdition` 必须自身有 `edition_of_work`，否则报 `E_TRACE_BROKEN`（链未抵达 `SourceWork`）。
- **TR4**：`HistoricalClaim.evidence_status = sufficient` ⟹ 必须存在 ≥1 条 `claim_supported_by`，且其 target `SourcePassage` 满足：`edition_resolution = "resolved"`、`evidence_status = "sufficient"`、且链完整（TR1+TR3 成立）；否则报 `E_CLAIM_NO_EVIDENCE`。
- **TR5**：`SourcePassage.edition_id` 若非 `null`，必须等于其 `passage_in_edition` 的 target（镜像一致性）；不一致报 `E_MIRROR_MISMATCH`。
- **TR6**：`SourceEdition.work_id` 若非 `null`，必须等于其 `edition_of_work` 的 target；不一致报 `E_MIRROR_MISMATCH`。
- **TR7**：`HistoricalClaim.about_ids` 集合必须等于其 `claim_about` 关系 target 集合；不一致报 `E_MIRROR_MISMATCH`。
- **TR8**：链上任一环节 `evidence_status ∈ {insufficient, unknown}` 时，下游 Claim **不得**为 `sufficient`；违反报 `E_TRACE_WEAKENS_CLAIM`。

---

## 12. 数据校验器契约

### 12.1 CLI

```
node scripts/kb/validate-kb-schema.mjs [<path>...]
```

- `<path>`：文件或目录；可传多个。相对路径以**仓库根**为基准。
- **无参数**：等价于 `node scripts/kb/validate-kb-schema.mjs data/kb/examples/valid`（第 4 节目录扫描规则）。

### 12.2 退出码（固定，可用于 CI）

| 退出码 | 含义 |
|---|---|
| `0` | 全部通过（0 个 error） |
| `1` | **校验失败**：至少 1 条 error 记录 |
| `2` | **运行错误**：CLI 用法错误、Schema 文件缺失/不可解析、目标路径不存在、内部异常 |

> 无参数默认运行**必须**以退出码 0 结束（内置示例集是合法数据）。

### 12.3 Schema 事实来源

- 校验器**必须**从 `data/kb/schema/kb-schema.v2.json` 读取实体类型、字段、枚举、关系端点约束。
- **禁止**在 `.mjs` 中另行硬编码实体/关系清单（避免双份事实漂移）。
- Schema 文件缺失或不可解析 ⟹ 退出码 **2**，错误码 `E_SCHEMA_UNREADABLE`。

### 12.4 输出格式（固定）

**stdout**：每行一个 JSON 对象（JSONL），**无其他内容**。字段固定为：

| 键 | 说明 |
|---|---|
| `file` | 仓库相对 POSIX 路径（如 `data/kb/examples/valid/minimal.kb.json`） |
| `entityOrRelationId` | 实体/关系 `id`；关系无 `id` 时用 `"<source>-><type>-><target>"`；文件级错误用 `"-"` |
| `fieldPath` | 点分字段路径（如 `provenance.derivation`）；不适用时 `"-"` |
| `code` | 错误代码（第 12.5 节） |
| `message` | 人类可读说明（不得包含密钥、绝对路径中的用户名） |

**stderr**：汇总行。

- 失败：`KB schema validation FAILED: <N> error(s) across <M> file(s)`
- 通过：`KB schema validation PASSED: <M> file(s), <E> entities, <R> relations`

**确定性**：同一输入两次运行，stdout 与 stderr **逐字节相同**；记录按 (`file`, 出现顺序) 稳定排序。

### 12.5 错误代码清单

**文档与结构**

| 代码 | 触发条件 |
|---|---|
| `E_FILE_PARSE` | 文件不是合法 JSON |
| `E_DOC_SHAPE` | 根不是对象；缺 `schema_version`/`entities`/`relations`；`entities`/`relations` 不是数组；目录扫描无文件 |
| `E_SCHEMA_VERSION` | 文档 `schema_version` ≠ `"2.0.0"` |
| `E_UNKNOWN_ENTITY_TYPE` | `entity_type` 不在 17 类中（或缺失） |
| `E_ID_FORMAT` | `id` 不匹配 `^[a-z][a-z0-9_]*$`、长度越界、或前缀与 `entity_type` 不符 |
| `E_DUPLICATE_ID` | 同一 `id` 在文档集内出现 ≥2 次 |
| `E_MISSING_FIELD` | 必填字段缺失 |
| `E_FIELD_TYPE` | 类型错误（含 `lunar_month` 越界、非整数年份、`review_date` 格式错误） |
| `E_NULL_NOT_ALLOWED` | 不可空字段为 `null` |
| `E_ENUM_INVALID` | 枚举值非法 |

**未知 / 证据 / 内容分类**

| 代码 | 触发条件 |
|---|---|
| `E_UNKNOWN_UNDECLARED` | 必填可空字段为 `null` 但未列入 `unknown_fields`（U1） |
| `E_UNKNOWN_PATH_INVALID` | `unknown_fields` 元素不是合法字段路径（U3） |
| `E_EVIDENCE_UNKNOWN_CONFLICT` | `unknown_fields` 非空但 `evidence_status = sufficient`（U4） |
| `E_EVIDENCE_REVIEW_CONFLICT` | `evidence_status ∈ {insufficient, unknown}` 但 `review_status` 为已评审态（R2） |
| `E_PROVENANCE_UNRESOLVED_CONFLICT` | `derivation = unresolved` 但 `review_status` 为已评审态（R3） |
| `E_PROVENANCE_MISSING` | `derivation = primary_source` 但 `basis_ids` 或 `source_locator` 为空（P1） |
| `E_PROVENANCE_SHAPE` | `provenance` 结构非法（缺字段/枚举非法） |
| `E_CONTENT_CLASS_TYPE` | `content_class` 与该 `entity_type` 不允许的组合（C3 / EX1 / RV1 / RV2） |
| `E_TIME_RANGE_INVALID` | `start_year > end_year`、越界、或 `certainty = exact` 但年份为空（T1/T3/T4） |
| `E_MEASUREMENT_FABRICATED` | `as_recorded`/`unnormalizable` 却给了 `quantity_value`（ME1） |
| `E_MEASUREMENT_INCOMPLETE` | `normalized` 但数值或单位缺失（ME2） |
| `E_CLAIM_NO_EVIDENCE` | `sufficient` 的 Claim 无 `claim_supported_by`（C1/TR4） |
| `E_CLAIM_UNCERTAINTY_MISSING` | `insufficient`/`unknown` 的 Claim 无 `uncertainty_notes`（C2） |
| `E_HERITAGE_UNSOURCED` | 非遗级别断言无出处（9.8） |
| `E_REVIEW_UNVERIFIABLE` | 匿名/未知评审人给出 `approved`（ER1） |
| `E_REVIEW_STATUS_UNSUPPORTED` | `external_reviewed` 无外部专家评审支撑（ER2/ER3） |

**关系与追踪链**

| 代码 | 触发条件 |
|---|---|
| `E_RELATION_SHAPE` | 关系缺 `type`/`source`/`target`，或 `properties` 含未允许键 |
| `E_UNKNOWN_RELATION_TYPE` | `type` 不在第 10.2 节清单 |
| `E_RELATION_ENDPOINT_TYPE` | source/target 实际类型不在该关系的允许集合 |
| `E_DANGLING_REFERENCE` | source/target（或 `*_id`/`*_ids` 字段）指向不存在的 ID |
| `E_TRACE_MISSING` | Passage 缺 `passage_in_edition`；Edition 缺 `edition_of_work`（TR1/TR2） |
| `E_TRACE_BROKEN` | 链未抵达 `SourceWork`（TR3） |
| `E_TRACE_WEAKENS_CLAIM` | 弱证据链支撑了 `sufficient` 的 Claim（TR8） |
| `E_MIRROR_MISMATCH` | 去规范化字段与关系不一致（TR5/TR6/TR7） |

### 12.6 强制行为

- **V1**：校验器**不得**修改任何输入文件；只读打开，只写 stdout/stderr。
- **V2**：**结构错误 → 退出码 1**；显式 `insufficient` 记录**保留且不报错**，但**不得**被视为已验证事实（R2 已结构性保证）。
- **V3**：单次运行**必须**报告**全部**错误，不得遇错即停（便于一次性修复）。
- **V4**：错误 `message` 不得回显整段原文、不得包含 `.env` 值或绝对路径中的用户名。

---

## 13. V1 → V2 兼容适配器契约

### 13.1 CLI

```
node scripts/kb/adapt-v1-to-v2.mjs [--dry-run] [--out <dir>]
```

- 默认 `--out data/kb/generated`。
- `--out` **必须**位于仓库允许的输出边界内（校验规则见 13.6）；越界为 CLI 用法错误，退出码 **2**。
- `--dry-run`：只计算并打印报告，**不写任何文件**。`--out` 的边界校验在 dry-run 之前执行，因此非法的 `--out` 在 dry-run 下同样退出 **2**，**不得**被静默忽略。

### 13.2 输入清单（只读，**不得修改**）

| 路径 | 读取内容 |
|---|---|
| `data/knowledge_graph/nodes_dish.json` | 40 条 Dish |
| `data/knowledge_graph/nodes_ingredient.json` | 16 条 Ingredient |
| `data/knowledge_graph/nodes_technique.json` | 10 条 Technique |
| `data/knowledge_graph/nodes_dynasty.json` | 7 条 TimePeriod |
| `data/knowledge_graph/nodes_region.json` | 5 条 Region |
| `data/knowledge_graph/nodes_season.json` | 7 条 Season |
| `data/knowledge_graph/nodes_ancient_text.json` | 5 条 SourceWork + 103 条 SourceEdition |
| `data/knowledge_graph/relationships.json` | 49 条关系 |
| `data/knowledge_graph/expert_review_manifest.json` | 6 条 ExpertReview |
| `data/literature/authoritative_recipe_texts.json` | 106 条 SourceEdition（权威版本信息） |
| `data/recipes/ancient_recipes.json` | 5 条 Passage 候选 + 复原步骤线索 |
| `data/fragments/ancient_fragments.json` | 8 条 Passage 候选 |
| `data/ingredients/ingredient_mapping.json` | 1 条 SafetyRule + Ingredient 别名线索 |
| `data/techniques/intangible_heritage.json` | Technique 非遗级别线索（**无引证**，须标 insufficient） |

### 13.3 ID 映射规则（尽量保留原 ID）

| V1 | V2 | 规则 |
|---|---|---|
| `dish_001` | `dish_001` | 原样保留 |
| `ing_001` | `ing_001` | 原样保留 |
| `tech_001` | `tech_001` | 原样保留 |
| `dynasty_001` | `period_dynasty_001` | 加类型前缀（`dynasty_` 不是合法 `period_` 前缀） |
| `region_001` | `region_001` | 原样保留 |
| `season_001` | `season_001` | 原样保留 |
| `text_001` | `work_text_001` | SourceWork（内容著作） |
| `text_lit_013` | `edition_text_lit_013` | SourceEdition（图中节点，`work_id` 指向其丛刊） |
| `lit_afl_013` | `edition_lit_afl_013` | SourceEdition（文献条目） |
| `src_ancient_food_literature_collection_2021` | `work_src_ancient_food_literature_collection_2021` | SourceWork（丛刊，来自 `literature.sources[]`） |
| `src_chinese_cooking_classics_series` | `work_src_chinese_cooking_classics_series` | SourceWork（丛刊） |
| `src_china_food_culture_classics_2025` | `work_src_china_food_culture_classics_2025` | SourceWork（丛刊；**无条目**，仍须建实体） |
| `recipe_001` | `passage_recipe_001` | SourcePassage 候选 |
| `fragment_*` | `passage_fragment_*` | SourcePassage 候选 |

> **同一册次的合并**：`text_lit_013` 与 `lit_afl_013` 描述**同一个** `SourceEdition`（`title` 精确相等，M13）。合并规则：以 **`edition_lit_afl_013` 形式的文献条目 ID 为准**（因其携带 `authority` 出处信息），并把 `text_lit_013` 作为该实体的 `aliases` 成员。**必须**产生 106 个 `SourceEdition`，而非 209 个。

- **未解析的 `source_text`**（`烧尾宴食单`、`东坡志林`）：按 Unicode 码点升序排序后依次分配 `work_unresolved_001`、`work_unresolved_002`。
  **已知限制**：该编号稳定于**相同输入**，但新增未解析书名后可能变化；变更必须记录在报告中。
- **ID 冲突**：若映射后产生重复 ID，**必须**报错退出（退出码 1），**不得**静默去重。

### 13.4 字段映射规则

| V1 | V2 | 规则 |
|---|---|---|
| `dish.source_text`（书名） | `Dish` + `SourceWork` + `dish_recorded_in` | 见 13.5 |
| `dish.source_text`（`…线索`） | `Dish.dish_kind = heritage_practice_lead` | **不**创建 SourceWork |
| `dish.source_passage`（书名类） | `SourcePassage.text` | 原文，逐字保留 |
| `dish.source_passage`（线索类） | `HistoricalClaim.statement` | `claim_type: cultural_context`，`evidence_status: insufficient`，`derivation: unresolved`，**无** `claim_supported_by` |
| `dish.dynasty` | `Dish.period_id` | 仅当与 `nodes_dynasty.json` 的 `name` 精确匹配时；`地方传统` **无匹配** → `period_id: null` + `unknown_fields: ["period_id"]`（M4） |
| `dish.flavor_profile` | — | **本轮不映射**，记入报告 `unmapped_fields` |
| `dish.difficulty` / `taste_profile` / `cooking_time` / `servings` | — | **本轮不映射**，记入报告 `unmapped_fields` |
| `ing.category`（中文） | `Ingredient.category`（英文枚举） | 固定表：`谷物→grain`、`蔬菜→vegetable`、`水果→fruit`、`果品→fruit`、`肉类→meat`、`水产→aquatic`、`调料→seasoning`、`菌菇→fungus`、`乳品→dairy`、`其他→other`。**未覆盖值报错**，不得猜测（M6 实际出现 `果品`） |
| `ing.is_extinct` | `Ingredient.availability_status` | V1 全 `false` ⟹ 一律 `unknown`（**不得**据此断言灭绝，9.6） |
| `ing.modern_substitute` | `Ingredient` 的现代替代线索 | 记入报告；**不**自动生成 `modern_adaptation` 实体 |
| `tech.category`（中文） | `Technique.category` | `刀工→knife`、`火候→heat`、`调味→seasoning`、`成型→shaping`、`发酵→fermentation`、`腌制→curing`、`其他→other` |
| `tech.is_intangible_heritage` | `Technique.heritage_designation.level` | `true` ⟹ `level: unknown` + `evidence_status: insufficient`（无引证，M20）；`false` ⟹ `level: none` |
| `nodes_dynasty` 年份 | `TimePeriod.start_year/end_year` | 逐字保留；**不得**修正 `先秦 -221/-221`（M5） |
| `relationships.json` | V2 关系 | 见 13.5 |
| `expert_review_manifest.flagship_*` | `ExpertReview` | `reviewer_kind: internal_editor`；`status: internal_reviewed` → 被评审实体 `review_status: internal_reviewed`；`status: pending_external_expert` → 被评审实体 `review_status: pending_external_expert`（**原样保留**，R4/ER3） |
| `literature.items[].authority.*` | `SourceEdition` | `publisher ← institution`、`publication_year ← null`、`locator_scheme ← "volume"`（`included_texts` 粒度为"册"，M12/M13） |
| `literature.items[].total_recipes` | — | 106/106 为 `null` ⟹ 不映射（M12） |

### 13.5 关系映射规则

| V1 `type` | V2 `type` | 端点换算 |
|---|---|---|
| `contains` | `dish_contains_ingredient` | `Dish → Ingredient`；`properties.quantity → quantity_text`，`properties.role → role` |
| `uses_technique` | `dish_uses_technique` | `Dish → Technique`；`properties.step_order` 保留，`properties.description` **丢弃并报告** |
| `originated_in` | `dish_originated_in` | `Dish → TimePeriod`（`dynasty_*` → `period_dynasty_*`） |
| `popular_in` | `dish_popular_in` | `Dish → Region` |
| `seasonal_for` | `dish_seasonal_for` | `Dish → Season` |
| `recorded_in` | `dish_recorded_in` | **端点改挂**：`Dish → SourcePassage`（见下） |
| `technique_from` | `technique_from_region` | `Technique → Region` |
| `substitute_for` | `ingredient_substitutes` | `Ingredient → Ingredient`；`properties.similarity`/`notes` 保留 |

**`recorded_in` 的处理（关键）**

1. 目标 Passage = 由 `dish.source_passage` 生成的 `SourcePassage`（第 13.4 节）。
2. `Dish.source_text` 与 V1 目标节点 `title` **一致**（4 条）⟹ 关系 `evidence_status: sufficient`。
3. **冲突 5 条**（`dish_005,007,008,009,010`，M10）⟹ 关系保留，但 `evidence_status: insufficient`、`provenance.derivation: unresolved`、`provenance.notes` 记录冲突明细，并写入报告 `conflicts`。**不得**静默改挂或删除。

**Passage → Edition 归属**

1. 候选 Passage 来源（**2.0.2 更正**）：书名类 `dish.source_passage` **10** 条 + `ancient_recipes.original_text` **5** 条 + `fragments.passage` **8** 条 = **23 个候选**（M18）。
   **⚠ 原稿错误**：`2.0.0`/`2.0.1` 曾写"7 条书名类…共 20"，漏算了 **3 个「书名在图中无节点」的菜品**（`dish_005`、`dish_006` 的 `烧尾宴食单`；`dish_010` 的 `东坡志林`）。书名类菜品实为 **10** 条（= 7 条可解析 + 3 条未解析，见 M2）。
2. 按"去除空白后逐字相等"合并 → **19 条** `SourcePassage`（**4 组**合并：`dish_001+recipe_001`、`002+002`、`003+003`、`004+004`；23 − 4 = 19）。合并锚点记入报告 `merged_passages`。
3. 每条 Passage 的 Work 由锚点记录确定：`dish.source_text`（书名类）或 `fragment.source`；`ancient_recipes` 的 `source` 形如 `《山家清供》卷下`，取 `《》` 内内容后去掉首个 `·` 起的部分，再与 `SourceWork.name` 精确比较。
   **⚠ 未解析书名**：`dish_005`/`dish_006`/`dish_010` 的 `source_text`（`烧尾宴食单`、`东坡志林`）在 `nodes_ancient_text.json` 中**无节点**，故其 Work 无法解析 ⟹ 候选集合必为空 ⟹ 必定 `unresolved`（见第 5 项）。
4. **候选 Edition 集合** = 所有 `edition_contains_work` 指向该 Work 的 Edition（第 9.2 节的规范化匹配），按 ID 字典序。
   **实测（2.0.2 更正）**：**16 条** Passage 有 2–3 个候选 ⟹ `ambiguous`；**3 条**候选为空 ⟹ `unresolved`；**0 条**唯一候选 ⟹ 无 `resolved`。
5. **归属判定（禁止消歧）**
   - 候选集合大小 **= 1** ⟹ `edition_resolution: "resolved"`，`edition_id` = 该唯一候选。
   - 候选集合大小 **> 1** ⟹ `edition_resolution: "ambiguous"`，`edition_id: null`，`unknown_fields: ["edition_id"]`，`evidence_status: insufficient`，`derivation: unresolved`，**0 条** `passage_in_edition`；记入报告 `ambiguous_edition`。
     **⚠ 不得**因"标题同名"就认定归属：`lit_ccs_006/014/027` 的 `title` 恰等于内容著作名，但它们只是**收录**该著作的册次，无法证明该段出自该册。
   - 候选集合大小 **= 0** ⟹ `edition_resolution: "unresolved"`，同上但记入报告 `unresolved_passages`。
6. **实测结论（2.0.2 更正）**：本轮 **19 条** Passage 中，`ambiguous` **16** 条、`unresolved` **3** 条、`resolved` **0** 条。因此 `data/kb/generated/kb-v2.kb.json` 中**不会**出现 `passage_in_edition` 关系（实测 0 条）。
   - **3 条 `unresolved` 是** `passage_dish_005`、`passage_dish_006`、`passage_dish_010`——其 `source_text` 书名在图中无节点，故 `edition_candidates` 为**空数组**、`unknown_fields: ["edition_id"]`。
   - **⚠ 原稿错误结论**：`2.0.0`/`2.0.1` 曾称"1 条（源自 `饮膳正要卷一`）无候选"，把《饮膳正要》当作唯一 `unresolved` 案例。**这是错的**：《饮膳正要》被 **3 个**册次收录（`lit_afl_001` 的 `included_texts` 含「饮膳正要（一）」、`lit_afl_002` 含「饮膳正要（二）」、`lit_ccs_027` 标题即「饮膳正要」，见 §9.2 与 M15），故 `passage_recipe_005` 与 `passage_fragment_yinshan_zhengyang` 都是 **`ambiguous`（3 个候选）**，而非 `unresolved`。
   - 这**不**代表契约失效：`passage_in_edition` 的校验逻辑由 KB-001B 的**内置合法示例**（`data/kb/examples/valid/`，含 1 条 `resolved` Passage）覆盖。
   - 由此产生的下游后果：所有 `HistoricalClaim` 因缺少"链完整"的 `claim_supported_by`（TR4）而**必须**为 `evidence_status: insufficient`。这与 V1 真实证据水平一致（F7/F8），是**正确**结果，**不得**通过放宽 TR4 来"修好"。
7. 上述 Passage **全部**写入 `data/kb/generated/kb-v2.kb.json`（`ambiguous`/`unresolved` 是**合法**状态，不触发 `E_TRACE_MISSING`）。仅当 Passage 完全无法确定 Work（既无锚点也无 `source`）时，才只写入报告而不入 KB 文档。

### 13.6 输出

| 路径 | 内容 |
|---|---|
| `data/kb/generated/kb-v2.kb.json` | 全部实体与关系（单个文档，实体按 `id` 字典序、关系按 (`type`,`source`,`target`) 字典序） |
| `data/kb/generated/adaptation-report.json` | 报告（见 13.7） |

- 输出**不得**包含 wall-clock 时间戳、随机值、绝对路径或环境变量内容。
- `.gitignore` **必须**追加一行 `data/kb/generated/`（追加式，不得删除或改动既有条目）。该改动由 KB-001C 负责。

**`--out` 输出边界（`2.0.3` 新增，修复 K1）**

`--out` **必须**位于仓库允许的输出边界内。校验规则：

1. **解析后再比较**：先 `path.resolve(REPO_ROOT, out)` 得到目标，再以 `path.relative(REPO_ROOT, target)` 判定——结果**不得**为绝对路径、**不得**等于 `..`、**不得**以 `..<分隔符>` 开头。
2. **禁止只用字符串前缀**：`candidate.startsWith(REPO_ROOT)` 是原始字符串测试，会把仅是名字前缀相同的**兄弟目录**误判为合法（边界 `C:\repo\data` 会错误匹配 `C:\repo\data2`），且不感知分隔符与宿主大小写规则。`path.relative()` 同时解决这三点：它感知分隔符、在 Windows 上感知大小写，并在两侧位于不同根（换盘符或 UNC）时返回**绝对路径**，因此 `..` 穿越、仓库外绝对路径、盘符逃逸、UNC 逃逸都会命中同一个判定。
3. **canonical 校验**：词法包含性看不到符号链接，因此还要对目标**现存的最深祖先**做 `fs.realpathSync`，其结果也必须位于 `fs.realpathSync(REPO_ROOT)` 之内。
4. **失败行为**：越界为 **CLI 用法错误，退出码 2**，并输出**固定**错误信息（不含绝对路径、时间戳或随机量，便于测试精确断言）：`--out must stay inside the repository; refusing to write outside it`。非法 `--out` **不得**写任何文件、**不得**创建目标目录、**不得**修改既有输出、**不得**回退到默认目录、**不得**静默忽略。
5. **仓库根自身**：`--out .` 解析后等于仓库根，位于边界之内，因此**合法**（本契约不对其额外设限）。
6. **回归测试**：`scripts/kb/__tests__/adapter-out-boundary.test.mjs` 覆盖 12 类场景（合法默认/相对/嵌套；`../`；多级 `../../`；仓库外绝对路径；normalize 后逃逸；前缀相似目录；Windows 盘符；非法退出码 2；非法不产生文件；dry-run 不回归）以及 UNC 与分隔符混用。

### 13.7 报告内容（`adaptation-report.json`）

必须包含以下键（均为数组，可为空）：

| 键 | 含义 |
|---|---|
| `unmapped_fields` | V1 字段未能映射到 V2 的清单（含 `dish.flavor_profile`、`literature.included_texts_unresolved` 等） |
| `missing_sources` | 无出处支撑的记录（**30** 条线索类 Dish/Claim；5 条旧内容著作 `text_001`–`text_005` 无出处字段，F7；2 个未解析书名 `烧尾宴食单`/`东坡志林`，M2） |
| `conflicts` | `recorded_in` 冲突 5 条（M10） |
| `merged_passages` | 因文本逐字相等而合并的 Passage 组（4 组，M18） |
| `ambiguous_edition` | Edition 归属不唯一的 Passage（实测 **16** 条，2.0.2 更正） |
| `unresolved_passages` | 无法归属 Edition 的 Passage（实测 **3** 条：`passage_dish_005`/`006`/`010`，书名在图中无节点；2.0.2 更正） |
| `preserved_v1_defects` | 原样保留的 V1 缺陷（`先秦 -221/-221`、`text_lit_076/084/097` 缺失） |
| `dropped_relations` | 被丢弃的关系（应为空数组） |
| `counts` | 各实体/关系类型的最终计数 |

**报告必须包含免责声明**（逐字）：

> 适配成功只表示结构转换成功，不代表历史真实性已经核验。

### 13.8 幂等性与确定性（强制）

- **A1**：相同输入两次运行 ⟹ `data/kb/generated/**` **逐字节相同**。
- **A2**：连续运行 ≥2 次 ⟹ 实体数、关系数**不增长**（无重复实体/关系）。
- **A3**：运行后，第 13.2 节所有输入文件的 SHA-256 **不变**。
- **A4**：退出码：`0` = 成功（允许有报告项）；`1` = 硬失败（输入缺失/不可解析、ID 冲突、输出不可写）；`2` = CLI 用法错误。
- **A5**：`--dry-run` 下**不得**创建或修改任何文件。

### 13.9 回滚

- 适配器**只读**输入、**只写** `data/kb/generated/`，因此回滚 = 删除该目录：
  ```powershell
  Remove-Item -Recurse -Force data/kb/generated
  ```
- `.gitignore` 已忽略该目录，回滚不产生任何工作树变更。
- **不得**用 `git reset --hard` / `git clean` / `git checkout --` 回滚（`00-fact-audit.md` §1.2 红线）。

---

## 14. V1 只读冻结清单（本轮**不得**修改）

| 文件:行 | 内容 |
|---|---|
| `service/knowledge_graph.py:16` | `data_dir` 默认值 |
| `service/knowledge_graph.py:22-59` | `_load_data`：硬编码 7 文件名（`:27-35`）、`open`+`json.load`（`:40-41`、`:49-50`、`:55-56`） |
| `service/restoration_engine.py:208` | `data_dir` 回退 |
| `backend/src/services/LightModeService.js:3-5` | `nodes_dish.json`、`fake_dishes.json`、`quiz_real_dishes.json` |
| `backend/src/services/VisionService.js:3` | `nodes_dish.json` |
| `backend/src/services/vision/VisionCandidateMapper.js:3` | `nodes_dish.json` |
| `backend/src/services/FragmentService.js:3` | `ancient_fragments.json` |
| `backend/src/services/StarMapService.js:5` | `dish_backgrounds.json` |
| `backend/src/config/database.js:8,21,34` | `backend/data/flavor_archaeology.db` |
| `backend/src/services/AiRunAuditService.js:5` | `backend/data/ai-runs.jsonl` |
| `data/knowledge_graph/**` | 全部 V1 数据（**不得**新增、修改、重命名） |
| `data/literature/**`、`data/recipes/**`、`data/fragments/**`、`data/ingredients/**`、`data/techniques/**` | 全部 V1 数据 |

**理由**：本轮目标是为 V2 建立契约与校验能力，**不**切换读取路径。V1 与 V2 在本轮**并行共存**，由适配器单向派生，不改动任何生产读取代码。

**兼容性结论**：本轮所有新增文件均位于 `data/kb/`、`scripts/kb/`、`docs/kb-001/`；对 V1 运行时行为**零影响**（M21/M22 已证明无既有代码引用这些路径）。

---

## 15. 依赖与禁止事项

### 15.1 依赖

- **允许**：Node 内置模块 `node:fs`、`node:path`、`node:url`、`node:test`、`node:assert`。
- **禁止**：任何第三方依赖；**不得**修改 `backend/package.json`、`frontend/package.json`、`service/requirements.txt`、任何 `package-lock.json`（`backend/package.json` 与 `package-lock.json` 有未提交改动，属高风险文件）。
- **禁止**：新增根 `package.json` 或 npm 脚本入口。

### 15.2 本轮禁止事项（逐条适用）

| # | 禁止 |
|---|---|
| X1 | UI 改版（前端本轮只做只读兼容分析） |
| X2 | 修改 LLM Prompt、复原算法（`service/llm_reasoner.py`、`service/restoration_engine.py`） |
| X3 | 重做 `evidenceScore`（`RestorationService.js`、`routes/api.js` 评分逻辑） |
| X4 | 批量扩充菜品（不修改 `nodes_dish.json`） |
| X5 | 引入 Neo4j / Milvus / Elasticsearch / Kafka 等新基础设施 |
| X6 | 无关依赖升级 |
| X7 | 大范围重构 |
| X8 | 静默修改现有 API |
| X9 | 编造古籍原文、专家审核、实验数据或引用 |
| X10 | 把普通网络线索自动升级为权威历史证据 |
| X11 | `git reset --hard`、`git clean`、`git checkout --` 覆盖未提交代码、删除旧数据、`push`、合并 `main`、部署 |
| X12 | 读取/输出/复制 `.env` 的值（只允许核对键名） |
| X13 | 在 `docs/**` 写入任何密钥（`.gitignore` 覆盖不到 `docs/**`） |
| X14 | 修改/删除/跳过既有测试以掩盖失败（含 `scripts/__tests__` 的 7 个基线失败） |

---

## 16. 任务文件写入范围（DAG 边界）

| 任务 | 允许写入 | 禁止写入 |
|---|---|---|
| **KB-001A**（本契约） | `docs/kb-001/01-schema-contract.md` | 其他全部 |
| **KB-001B**（Schema + 校验器） | `data/kb/schema/**`、`data/kb/examples/**`、`scripts/kb/validate-kb-schema.mjs`、`scripts/kb/lib/**`、**`scripts/kb/__tests__/validate-kb-schema.test.mjs`（校验器自带单测，仅此一个文件）** | `data/knowledge_graph/**`、`data/kb/generated/**`、`scripts/kb/adapt-*.mjs`、`scripts/kb/__tests__/independent-qa.test.mjs` |
| **KB-001C**（适配器） | `scripts/kb/adapt-v1-to-v2.mjs`、`scripts/kb/lib/adapt/**`、**`.gitignore`（仅追加 `data/kb/generated/` 一行）** | 全部 V1 输入文件、`data/kb/schema/**`、`data/kb/examples/**`、`scripts/kb/validate-*.mjs`、`scripts/kb/__tests__/**` |
| **KB-001D**（独立测试与回归） | **`scripts/kb/__tests__/independent-qa.test.mjs`（QA 独立测试，仅此一个文件）**、`docs/kb-001/03-test-report.md` | 全部生产实现文件（QA **不得**为通过测试而改实现）；`scripts/kb/__tests__/validate-kb-schema.test.mjs`（KB-001B 交付物） |
| **KB-001E**（文档、审查、门禁） | `docs/kb-001/02-*.md`、`docs/kb-001/04-*.md` | 全部实现文件 |

**并行约束**：KB-001B 与 KB-001C 写入范围不重叠，可在契约冻结后并行；两者均依赖本契约（KB-001A）。

**`scripts/kb/__tests__/` 的文件级归属（消除并发写冲突误判）**

该目录由两个任务共同使用，但**各自只写一个不同的文件**，因此**不构成并发写冲突**：

| 文件 | 归属任务 | 用途 |
|---|---|---|
| `scripts/kb/__tests__/validate-kb-schema.test.mjs` | **KB-001B** | 校验器自带单元测试（实现方自测） |
| `scripts/kb/__tests__/independent-qa.test.mjs` | **KB-001D** | QA 独立测试（负例、追踪链、回归） |

- 除上表两个文件外，`scripts/kb/__tests__/` 下**不得**新增其他文件。
- 任一任务**不得**修改、删除或跳过对方所属的测试文件（对应第 15.2 节 X14）。
- **说明**：`2.0.0` 曾把 `scripts/kb/__tests__/**` 整目录列为 KB-001B 的禁止写入，与 KB-001B 需交付校验器自带单测的验收标准直接冲突（已导致 t2 被拒）。`2.0.1` 按文件级拆分修正，与 Captain 修订后的 t2 inScope 一致。

**`.gitignore` 的改动归属**

- 第 13.6 节要求追加 `data/kb/generated/`。该行**已实际落地**（`.gitignore:16`，`git check-ignore -v data/kb/generated/x.kb.json` → `.gitignore:16:data/kb/generated/`，退出码 0）。
- 契约将该改动归属 **KB-001C**（适配器任务的输出目录约定）。实际由 KB-001B 先落地属**实施顺序差异，非范围冲突**：两者都只做"追加 1 行"，无并发覆盖风险。
- 若 KB-001C 执行时该行已存在，**跳过追加**即可（幂等），不得重复插入或改写其他行。

---

## 17. 回滚总方案

| 层级 | 回滚动作 | 影响 |
|---|---|---|
| 适配器输出 | `Remove-Item -Recurse -Force data/kb/generated` | 无（已 gitignore） |
| 适配器代码 | 删除 `scripts/kb/adapt-v1-to-v2.mjs` + `scripts/kb/lib/adapt/` | 无 |
| `.gitignore` | 撤销追加的 1 行 `data/kb/generated/` | 无 |
| 校验器与 Schema | 删除 `scripts/kb/`、`data/kb/` | 无（无既有代码引用，M21） |
| 测试 | 删除 `scripts/kb/__tests__/` | 无 |
| 文档 | 删除 `docs/kb-001/01-*.md` 等 | 无 |

**关键性质**：本轮**零改动** V1 读取路径与 V1 数据（第 14 节），因此回滚**不需要**触碰任何既有文件（`.gitignore` 除外，且为追加）。回滚**绝不**使用 `git reset --hard` / `git clean` / `git checkout --`（X11）。

---

## 18. 已知限制与范围外事项

| # | 事项 | 处置 |
|---|---|---|
| L1 | `text_lit_076/084/097` 缺失（根因 `build_literature_dataset.mjs:237`） | **范围外**，不修复；适配器记入 `preserved_v1_defects` |
| L2 | `先秦 start_year == end_year == -221`（M5） | **范围外**，原样保留；记入 `preserved_v1_defects` |
| L3 | `recorded_in` 冲突 5 条（M10） | **范围外**，不修正；保留关系并标 `insufficient`，记入 `conflicts` |
| L4 | `scripts/__tests__` 基线 7 个失败（F9） | **范围外**，不修复；仅做基线对比 |
| L5 | `deliverables/gstack/pre-launch-check-2026-09-25.md` 的 6 项 P0 | **范围外** |
| L6 | `data/literature` 的 `edition`/`passage`/`page` 粒度缺失（`included_texts` 只到"册"） | 本轮以 `locator_scheme: volume` + `SourcePassage.locator.*` 全 `null` + `unknown_fields` 表达，**不补全** |
| L7 | 未解析书名的 `work_unresolved_NNN` 编号在新增输入后可能变化（实测未解析书名：`烧尾宴食单`、`东坡志林`，M2） | 已知限制，记入报告 |
| L8 | 前端源码正则断言与离线包 `REQUIRED_LABELS` 门禁 | 本轮禁止 UI 改版（X1），由 Frontend 只读核验 |
| L9 | `.env` 值未读取（只核对键名） | 保持（X12） |
| L10 | 适配器输出的 **19** 条 Passage **全部**为 `ambiguous`（16）/`unresolved`（3），故无 `passage_in_edition` 关系，所有 Claim 均为 `insufficient` | **正确反映 V1 真实证据水平**；`passage_in_edition` 的正向校验由内置合法示例覆盖（13.5 第 6 项） |
| L11 | `SourceWork` 存在两类（5 条内容著作 + 3 条丛刊），`literature.items[]` 的 `title` 可能与内容著作同名（`lit_ccs_006/014/027`） | 已用 `work_id`（→丛刊）+ `contains_work_ids`（→内容著作）严格区分（9.2）；**禁止**按同名建 `edition_of_work` 链 |
| L12 | `chenfei462/flavor-archaeology-bureau-public` 与本地代码差异 | 未比对；本地 `origin` 为 `yuluchen03-dev/flavor-archaeology-bureau.git`（`00-fact-audit.md` §1.2） |

---

## 19. 契约冻结与变更流程

1. 本契约自 KB-001A 提交起**冻结**。
2. 实现方若发现契约不可实现或存在缺陷，**不得**自行偏离；须由 Architect 更新本文件并递增第 20 节变更记录，再由 Captain 重新调度受影响任务。
3. 任何对第 14 节冻结清单的改动，**必须**经 Captain 更新 Task Spec 后方可实施。

---

## 20. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `2.0.0` | KB-001A | 首次冻结：17 实体、**24 关系**、追踪链、校验器 CLI/退出码/错误码、适配器契约、V1 冻结清单、回滚方案 |
| `2.0.1` | KB-001A2 | **契约一致性修订（仅改本文件，未改任何实现或数据）**：①修正 §16 写入范围冲突 —— `2.0.0` 将 `scripts/kb/__tests__/**` 整目录列为 KB-001B 禁止写入，与"KB-001B 需交付校验器自带单测"的验收标准直接冲突（已导致 t2 被拒）；现按**文件级**拆分：KB-001B 允许 `scripts/kb/__tests__/validate-kb-schema.test.mjs`，KB-001D 允许 `scripts/kb/__tests__/independent-qa.test.mjs`，两者不重叠。②修正 §20 关系数量笔误 `23 → 24`，与 §10.2 标题及实测 `data/kb/schema/kb-schema.v2.json`（`relations` 24 项、`entities` 17 项）一致。③记录 KB-001C 的 `.gitignore` 追加（`data/kb/generated/`，已实际落地于 `.gitignore:16`）并说明其幂等处理。④补录实测示例集数量：`data/kb/examples/valid/` **3** 个、`data/kb/examples/invalid/` **7** 个。 |
| `2.0.2` | KB-001A3 | **契约与真实数据一致性修订（仅改本文件，未改任何实现或数据）**。依据：KB-001C 按真实 V1 数据执行时发现 §13.5 数量与结论不符，并撞上 §6/§10.1 的条款矛盾；KB-001C **未擅改契约、未为迁就契约数字调整数据**，而是按真实数据执行并把偏差写入 `adaptation-report.json` 的 `notes` 数组中 `key = "contract_13_5_count_delta"` 的条目（原文：*"Contract 13.5 states 20 passage candidates reducing to 16 (15 ambiguous, 1 unresolved). The real V1 files yield 23 candidates reducing to 19 (16 ambiguous, 3 unresolved)…"*）——此为正确处理方式，本次由 Architect 据实测更正契约。四处更正：<br>**①§13.5 候选数量算术错误**：`20 个候选 → 16 条 Passage` 更正为 **`23 个候选 → 19 条 Passage`**。根因：原候选清单漏算 **3 个「书名在图中无节点」的菜品**（`dish_005`、`dish_006` 的 `烧尾宴食单`；`dish_010` 的 `东坡志林`）；书名类菜品实为 **10** 条（非 7 条）。依据：实测 `nodes_dish.json` 线索类 30 + 书名类 10 = 40；`recipes` 5 + `fragments` 8；10+5+8 = **23**；合并组仍为 **4** 组，23 − 4 = **19**。<br>**②§13.5 `edition_resolution` 分布错误**：`15 ambiguous / 1 unresolved` 更正为 **`16 ambiguous / 3 unresolved / 0 resolved`**。依据：直接统计 `data/kb/generated/kb-v2.kb.json` 的 19 条 `SourcePassage` 得 `{"ambiguous":16,"unresolved":3}`。<br>**③§13.5「唯一 unresolved 是《饮膳正要》」结论错误**：真实 unresolved 为 **`passage_dish_005`/`006`/`010`**（`edition_candidates=[]`、`unknown_fields=["edition_id"]`）；《饮膳正要》被 **3 个**册次收录（`lit_afl_001` 含「饮膳正要（一）」、`lit_afl_002` 含「饮膳正要（二）」、`lit_ccs_027` 标题即「饮膳正要」），故 `passage_recipe_005` 与 `passage_fragment_yinshan_zhengyang` 均为 **`ambiguous`（3 候选）**。<br>**④§6 与 §10.1 的 `asserted_at` 条款矛盾（对任何适配器不可满足）**：`2.0.1` 规定"`asserted_at` 未知时为 `null` 且须列入 `unknown_fields`"，但 §10.1 的关系字段仅为 `type`/`source`/`target`/`evidence_status`/`provenance`/`properties`，**无 `unknown_fields`**，故 U1 在关系上永不可满足（KB-001C 实测曾产生 **496** 条 `E_UNKNOWN_UNDECLARED`）。现新增 §6 **P5**：**实体**未知时置 `null` 并列入 `unknown_fields`；**关系**未知时**省略该键**、不得置 `null`；并在 §10.1 明确"关系对象不支持 `unknown_fields`"。依据：实测 `kb-schema.v2.json` 的 `relations` 定义不含 `unknown_fields`（`false`），`common_fields.unknown_fields` 仅作用于实体；实测 `kb-v2.kb.json` 214 条关系中带 `asserted_at` 键的 = 0、带 `unknown_fields` 键的 = 0，校验通过（0 错误）。<br>**附带更正**：§2.2 表项 **M15** 原仅列出 5 个内容著作各自的 1–2 个版本，与 §9.2（实测 11 条 `edition_contains_work` 边）不一致；已更正为与 §9.2 及实测一致的完整映射（`齐民要术`→2 个、`饮膳正要`→3 个、`东京梦华录`→2 个，合计 11 条）。另修正 §18 中两行重号的 `L10` 标签（第二条改为 `L12`）。<br>**说明**：`2.0.0`/`2.0.1` 中与真实数据冲突的表述已在本表中作为历史说明保留并标注更正，正文（§2.2 M18、§9.3、§13.5、§13.7、§18 L10）已全部改为实测值。 |
| `2.0.3` | KB-001C（K1 修复） | **新增 `--out` 输出边界约束（安全加固，修复 t6/K1 medium）**。背景：Security 审查（`docs/kb-001/04-security-review.md`）实测 `--out ../../sec-real-escape-probe` **退出 0** 并在**仓库外**创建了 `kb-v2.kb.json` + `adaptation-report.json`；`scripts/kb/adapt-v1-to-v2.mjs` 原本仅有 `path.resolve(REPO_ROOT, args.out)` 而无任何包含性守卫。修订内容：**①§13.1** 明确 `--out` 必须位于仓库输出边界内、越界退出码 2，并说明边界校验在 dry-run 之前执行（非法 `--out` 在 dry-run 下同样退出 2，不得静默忽略）；**②§13.6** 新增「`--out` 输出边界」小节，规定以 `path.relative(REPO_ROOT, path.resolve(...))` 判定（不得为绝对路径、不得为 `..`、不得以 `..<sep>` 开头），**明文禁止只用 `candidate.startsWith(REPO_ROOT)`**（前缀相同的兄弟目录会被误判，且不感知分隔符与大小写；`path.relative` 在换盘符/UNC 时返回绝对路径，故四类逃逸命中同一判定），并规定对目标现存最深祖先做 `fs.realpathSync` 的 canonical 校验以覆盖符号链接；失败行为为退出码 2 + **固定**错误信息 `--out must stay inside the repository; refusing to write outside it`（不含绝对路径/时间戳/随机量），且不得写文件、不得建目录、不得改既有输出、不得回退默认目录；**③** 新增回归套件 `scripts/kb/__tests__/adapter-out-boundary.test.mjs`（12 类场景 + UNC + 分隔符混用）。**范围说明**：本次仅改 `scripts/kb/adapt-v1-to-v2.mjs`、新增该测试文件、并把 `independent-qa.test.mjs` 的**临时夹具根目录**从 `os.tmpdir()` 移入仓库 `tmp/`（因原夹具把 `--out` 指向仓库外，在新边界下被正确拒绝）——**未改动任何既有断言或预期**；V1 数据、backend/frontend/service 与其它 KB-001 已 PASS 行为均未触碰。 |
