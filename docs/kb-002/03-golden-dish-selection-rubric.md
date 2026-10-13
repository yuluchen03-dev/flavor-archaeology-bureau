# KB-002C Golden Dish Selection Rubric（黄金菜遴选标准）

- 契约版本：`kb-002.1.0`（与 KB-002A / KB-002B 同版本线）
- 状态：**已冻结（frozen）**，KB-002D / KB-002E / QA / Security / Reviewer 均以本文件为准
- 上游依据：`docs/kb-002/01-golden-dataset-contract.md`（KB-002A）+ `docs/kb-002/02-evidence-quality-rubric.md`（KB-002B）+ `docs/kb-001/01-schema-contract.md`（KB-001 `2.0.3`）+ `data/kb/schema/kb-schema.v2.json`（`2.0.0`）
- 本文件**只定义遴选标准**，不含实现、不含数据、不含正式录入

> **本文件的存在理由（最高优先级边界）**
> 用户要求「每个维度给出可判定的取值与权重，并明确『来源不足者不得为凑满 10 道而入选』的淘汰规则」。
> 因此本文件必须回答一个问题：**在正式录入证据之前，凭什么把某道菜列为候选？**
> 答案必须是**可核验的来源事实**，而不是"这道菜有名""这个故事好听"。

---

## 0. 三条不可越界的边界

### 0.1 遴选 ≠ 资格（最重要）

| 概念 | 定义者 | 含义 |
|---|---|---|
| **遴选（Selection）** | **本文件（KB-002C）** | 在证据尚未录入时，判断某道菜**值不值得投入录入成本** |
| **资格（Qualified）** | **KB-002B §5.1（Q1–Q8）** | 证据录入后，由脚本从 `.kb.json` **计算**得出 `metadata.qualified` |

**强制边界**：

- **SEL0**：本文件的任何结论**不得**覆盖或替代 KB-002B 的 Q1–Q8。一道菜"被选为候选"**不等于**"合格"。
- **SEL1**：**禁止**用遴选结果倒逼降低 Q 门槛。例如"因为候选只有 7 道，所以把 Q3 的 `≥E3` 降为 `≥E2`"——这是**凑数的隐蔽形式**，属 `KB002_SEL_Q_OVERRIDE`。
- **SEL2**：候选清单（KB-002D）是**计划**，不是**数据**。未录入证据的候选不得计入 `QUALIFIED_GOLDEN_COUNT`。

### 0.2 判定类别（继承 KB-002B 第 0 节设计原则）

本文件每条规则标注为三态之一：

| 标记 | 含义 | 可否用于资格门 |
|---|---|---|
| **(A)** | 机械可判定：脚本读字段/读来源指针即可判真伪 | ✅ 可以 |
| **(B)** | 人工判定，但结论必须落成**枚举值**从而可被脚本复核 | ⚠️ **只能用于排序，不得用于资格门** |
| **(C)** | 不可判定（外部事实），诚实标注 | ❌ **绝不作为入选或淘汰依据** |

- **SEL3**：（B）/（C）类维度**只能影响排序分数**，**绝不能**影响资格门判定或入选/淘汰结论。违反 ⟹ `KB002_SEL_SUBJECTIVE_GATE`。
- **SEL4**：（B）/（C）类维度的权重之和**必须 ≤ 总权重的 15%**（见 §4.4），以确保它们无法翻转证据强弱排序。

### 0.3 遴选必须产出可核验的来源指针

- **SEL5**：任何被列入候选的菜，**必须**至少携带 **1 条可核验的来源指针**：
  完整的"书名 + 版本线索（或明确标注版本未定）+ 篇/卷/条目定位（或明确标注定位未定）"。
- 无来源指针的菜**不得**进入候选清单——即使它在文化上极有代表性。
- **指针 ≠ 已核实**：指针只表示"**有一个可以被去核实的位置**"；是否真的记载了所声称内容，属 KB-002B 的 L2（不可判定），**不在本文件范围内，也不得由本文件宣称**。

---

## 1. 两阶段遴选模型

```
候选池 P（由策展/文献调查产生）
   │
   ├─ Stage 1｜资格门 G1–G7（硬淘汰，全部 (A) 或可记录 (B)）
   │      └─ 未过门者 → ELIMINATED（不得因数量不足而放行）
   │
   ├─ Stage 2｜排序评分 S1–S14（含 (B) 咨询维度，权重受限）
   │      └─ 产出 Score（0–100）
   │
   └─ Stage 3｜确定性选取（§5 算法）
          ├─ SELECTED（≤ 10 道，含固定的 GOLDEN-001）
          ├─ WAITLIST（过门但排名在 10 名外）
          └─ ELIMINATED（未过门）
```

**输出**：候选清单（KB-002D 交付物），格式见 §9。

---

## 2. 资格门 G1–G7（硬淘汰）

**规则**：任一 G 不满足 ⟹ 该菜标记 `ELIMINATED`，**不得**进入 Stage 2，**不得**入选。
**不得**因"候选不足 10 道"而豁免任何 G（`KB002_SEL_GATE_WAIVED`）。

| # | 资格门 | 可判定取值（判定依据） | 类别 | 不满足错误码 |
|---|---|---|---|---|
| **G1** | 存在**可定位的前现代原典**出处 | 至少 1 个 `SourceWork` 候选，其 `work_type ∈ {classic_text, food_monograph, materia_medica, agricultural_treatise, encyclopedic_reference, anthology, collected_series}`（即 **≠ `other`**），且**可给出书名** | (A) | `KB002_SEL_NO_SOURCE_WORK` |
| **G2** | 存在**可定位的版本**或可诚实标注版本未定 | 至少 1 个 `SourceEdition` 候选，其 `edition_type ≠ unknown` **或** 明确记录"版本未定"并说明检索范围 | (A) | `KB002_SEL_NO_EDITION` |
| **G3** | 存在**可定位的篇/卷/条目** | 至少 1 个 `SourcePassage` 候选，其 `locator_scheme ∈ {page, entry, chapter, volume, shelfmark}`（**即 ≠ `none`**）。<br>**页码未知但篇/卷已知即满足**——不得因缺页码而淘汰 | (A) | `KB002_SEL_NO_LOCATOR` |
| **G4** | **来源等级下限**：至少 1 个候选来源等级 ∈ `{S, A, B}` | 依据 KB-002B §2.1 的机械前置条件给出候选等级；**全部候选等级 ∈ `{C, D, X}` ⟹ 淘汰**（只能作线索，KB-002B SG6） | (A) | `KB002_SEL_LEAD_ONLY` |
| **G5** | 归属可诚实表达 | `attribution_status ∈ {attributed, anonymous, disputed}`；`author` 未知时允许，但**必须**可列入 `unknown_fields`（不得留空不得编造） | (A) | `KB002_SEL_ATTRIBUTION_UNSTATED` |
| **G6** | 菜品身份可判定 | `dish_kind` 目标值 = `historical_documented_dish`；且菜名可在 G1 的原典中定位（**非现代创作菜**） | (A) | `KB002_SEL_DISH_NOT_DOCUMENTED` |
| **G7** | 存在**≥1 条可拆分的历史陈述雏形** | 能事先列出 ≥1 条 `claim_type ∈ {existence, provenance, attribution, technique, ingredient_use, geography, chronology, cultural_context}` 的陈述草稿（草稿本身不是数据，仅供成本评估） | (B) 可记录 | `KB002_SEL_NO_CLAIM_SKELETON` |

> **G4 是本文件对「来源不足者不得入选」最直接的落地条款**：
> 若一道菜目前**只能**找到 C 级（博客/公众号/小红书）或 D 级（UGC）资料，
> 它**可以**留在调查笔记里当线索，但**不得**进入 Golden 候选清单。

---

## 3. 排序维度 S1–S14（仅用于 Stage 2 排名）

### 3.1 取值统一为 0–3 整数

所有维度取值域统一为 `{0, 1, 2, 3}`，便于加权求和。

### 3.2 (A) 类维度（证据强度，决定主排序）

| # | 维度 | 取值细则（0/1/2/3） | 权重 |
|---|---|---|---|
| **S1** | 原典直接性 | 3 = 有 S/A 级来源的**直接**记载候选（`text_origin ∈ {verbatim_transcription, normalized_transcription}`）；2 = 权威版本转述；1 = 二手研究转述；0 = 仅线索 | **5** |
| **S2** | 来源等级（取最高候选） | 3 = `S`；2 = `A`；1 = `B`；0 = `C/D`（注：C/D 已在 G4 被淘汰，故实际为 0 不会出现） | **4** |
| **S3** | 多源互证潜力 | 独立 `SourceWork` 候选数：≥3 → 3；2 → 2；1 → 1；0 → 0 | **4** |
| **S4** | 版本可确认性（预期） | 3 = 预期可达成 `edition_resolution = resolved`；1 = 预期 `ambiguous`；0 = 预期 `unresolved` | **3** |
| **S5** | Passage 定位粒度 | 3 = `page`；2 = `entry`/`chapter`；1 = `volume`；0 = `shelfmark` 或仅有 `none`（注：`none` 已在 G3 被淘汰） | **3** |
| **S6** | 菜品身份明确度 | 3 = 菜名与原典条目可直接对应；2 = 需少量考证；1 = 名称存在异文但可辨；0 = 身份存疑 | **3** |
| **S7** | 关键食材可识别度 | 3 = `biological_identification_status = identified`；2 = `provisional`；1 = `disputed`；0 = `unknown` | **2** |
| **S8** | 技法可解释度 | 3 = 技法为已知 `category` 且可描述；2 = 需类比解释；1 = 仅存技法名；0 = 无法解释 | **2** |
| **S9** | 时间定位能力 | 3 = `certainty = exact`；2 = `approximate`；1 = `disputed`；0 = `unknown` | **3** |
| **S10** | 地域定位能力 | 3 = 可定到 `region_kind = modern_admin` 或 `historical_admin`；2 = `cultural_area`；1 = `physical_geography`；0 = `unknown` | **2** |
| **S11** | 可复原潜力（支撑 `RestorationVersion`） | 3 = 食材+技法+步骤三者皆可考；2 = 两者可考；1 = 其一可考；0 = 皆不可考 | **2** |

**（A）类权重合计 = 5+4+4+3+3+3+2+2+3+2+2 = 33**

### 3.3 (B) 类咨询维度（仅影响排序，权重受限）

| # | 维度 | 取值细则 | 权重 | 类别 |
|---|---|---|---|---|
| **S12** | 文化代表性 | 3 = 明确的饮食文化史节点；2 = 有文献记载的文化实践；1 = 一般代表性；0 = 无从判断 | **1** | (B) |
| **S13** | 现代制作可行性（有据） | 3 = 现代食材/厨具**有文献或权威资料支持**可替代；2 = 可合理替代但无记载；1 = 需较大改造；0 = 不可行 | **1** | (B) |
| **S14** | 故事性／传播价值 | 3 = 有具体人物/事件可考；2 = 有文化叙事；1 = 一般；0 = 无 | **1** | (B) |

**（B）类权重合计 = 3**

### 3.4 权重约束（可机械校验）

- 总权重 = **36**；（B）类占比 = 3 / 36 = **8.33% ≤ 15%** ✅（满足 SEL4）
- **SEL6**：若未来新增维度使（B）/（C）占比 > 15%，本文件**必须先经版本递增**方可使用（`KB002_SEL_WEIGHT_BUDGET`）。

### 3.5 计分公式（确定性）

```
Score_raw = Σ (weight_i × value_i)          # 取值 0..3，权重见上表
Score     = round( 100 × Score_raw / 108 )  # 108 = 36 × 3（理论满分）
```

- **SEL7**：`Score` 必须为**整数**；同一候选同一输入两次计算必须得到**同一分数**。
- **SEL8**：`Score` **不得**用于任何资格判定；`Score` 只决定排名。**低分但过门的候选，仍比高分但不过门的候选有资格**（后者根本不存在于排名中）。

---

## 4. Stage 3：确定性选取算法

### 4.1 算法（逐步，无歧义）

```
输入：候选池 P（每项含 G1–G7 判定 + S1–S14 取值 + 来源指针）
1. P_elig ← { p ∈ P | p 通过全部 G1–G7 }
2. 对每个 p ∈ P_elig 计算 Score(p)                # §3.5
3. 排序 P_elig：Score 降序
   并列时依次比较（必须全部为确定性判据）：
     T1. 独立 SourceWork 候选数（降序）
     T2. 最高来源等级（S > A > B，降序）
     T3. Passage 定位粒度（page > entry > chapter > volume，降序）
     T4. 菜名 Unicode 码点升序          ← 最终确定性决胜（防随机/防人为倾斜）
4. GOLDEN-001 ← 蟹酿橙（固定；见 §5）
5. SELECTED ← GOLDEN-001 占 1 位，其余按排序取前 9（合计 ≤ 10）
6. WAITLIST ← P_elig 中未入选者（过门但排名在外）
7. ELIMINATED ← P \ P_elig（未过门）
8. 输出计数与缺额（§6.2）
```

### 4.2 确定性要求

- **SEL9**：给定同一候选池，两次运行必须产出**完全相同的** SELECTED 列表与顺序（T1–T4 全为确定性判据，**不得**引入随机、时间戳、人工偏好）。
- **SEL10**：排序**不得**使用 (B)/(C) 类维度作为决胜依据（它们已计入 Score，但不得单独用于打破并列）。

---

## 5. `蟹酿橙 = GOLDEN-001` 的特殊规则

| 规则 | 内容 |
|---|---|
| **SEED1** | `GOLDEN-001` **固定**为蟹酿橙（用户指定，不可变更）；它**不参与编号竞争** |
| **SEED2** | 蟹酿橙**仍必须通过 G1–G7**。若未过门 ⟹ 输出 `SEED_GATE_FAILURE` 并**如实报告**，**不得**以"它是演示标杆"为由豁免 |
| **SEED3** | 蟹酿橙的每条 `HistoricalClaim` **仍必须**逐条经 `Source → Edition → Passage → Claim → Evidence` 验证（KB-002A §3.3） |
| **SEED4** | **不得**因蟹酿橙是现有演示标杆而降低其 S 评分标准或 Q1–Q8 门槛 |
| **SEED5** | 若蟹酿橙最终未达 Q1–Q8（`qualified = false`），必须如实输出该结论——**固定编号 ≠ 自动合格** |

> 这与 KB-002A §3.3 的警示一致：**固定 ID 只表示"编号已分配"，不表示任何历史描述自动成立。**

---

## 6. 「来源不足不得凑数」的可校验规则

### 6.1 遴选层规则 NS1–NS8

| # | 规则 | 错误码 |
|---|---|---|
| **NS1** | 候选数不足 10 时，**不得**把任何未过 G1–G7 的菜放入 SELECTED | `KB002_SEL_GATE_WAIVED` |
| **NS2** | **不得**降低 G4 的来源等级下限（`{S, A, B}`）来扩容候选 | `KB002_SEL_GRADE_FLOOR_LOWERED` |
| **NS3** | **不得**把 (B)/(C) 类维度写入资格门 | `KB002_SEL_SUBJECTIVE_GATE` |
| **NS4** | **不得**把 `C`/`D` 级资料标注为 `S`/`A`/`B`（继承 KB-002B SG3/SG6） | `KB002_SEL_GRADE_UPGRADED` |
| **NS5** | **不得**用同一 `SourceWork` 的不同副本冒充"多源互证"（S3 只计**独立** SourceWork） | `KB002_SEL_PSEUDO_CORROBORATION` |
| **NS6** | 遴选结论**不得**覆盖 KB-002B 的 Q1–Q8 | `KB002_SEL_Q_OVERRIDE` |
| **NS7** | 无来源指针（SEL5）的菜**不得**入选，无论其文化代表性多高 | `KB002_SEL_NO_PROVENANCE_POINTER` |
| **NS8** | 候选清单必须**如实**输出计数与缺额，**不得**以"近似达标""基本覆盖"等表述替代 | `KB002_SEL_SHORTFALL_MISREPORTED` |

### 6.2 强制输出字段（数据集级）

候选清单**必须**输出以下三个计数（与 KB-002A §10.2 / KB-002B §5.2 一致）：

```
QUALIFIED_GOLDEN_COUNT = <SELECTED 数量, ≤ 10>
SHORTFALL              = 10 − QUALIFIED_GOLDEN_COUNT
KNOWN_DATA_GAP         = <缺额的具体原因清单，须逐条可核验>
```

- 若 `SHORTFALL = 0` ⟹ `GOLDEN_10_COMPLETE`
- 若 `SHORTFALL > 0` ⟹ `PARTIAL_GOLDEN_SET` + `KNOWN_DATA_GAP`（**不得**伪装完成）
- **SEL11**：`QUALIFIED_GOLDEN_COUNT` 是**候选**计数（遴选层），**不是** KB-002B 的 `qualified` 计数（证据层）。
  两者**必须分别呈现**，且**证据层计数只能 ≤ 遴选层计数**；若出现反直觉结果（遴选多、证据少），须如实说明。

---

## 7. 与 KB-002B 的一致性约束（防"两套标准"）

| 约束 | 内容 | 错误码 |
|---|---|---|
| **X1** | 本文件**不得**重新定义 `metadata.qualified`；它由 KB-002B §5.1 Q1–Q8 计算 | `KB002_SEL_Q_OVERRIDE` |
| **X2** | 本文件的来源等级定义**必须**与 KB-002B §2.1 完全一致（S/A/B/C/D/X 六级的机械前置条件） | （不一致即为契约缺陷，须版本递增） |
| **X3** | 本文件的 `dish_kind` / `edition_type` / `locator_scheme` / `work_type` / `certainty` / `biological_identification_status` 取值**必须**取自 `data/kb/schema/kb-schema.v2.json` 实测枚举 | `KB002_SEL_ENUM_INVENTED` |
| **X4** | 本文件**不得**新增任何 Schema 字段 | — |
| **X5** | 本文件**不得**修改 KB-001 任何行为；KB-001 回归门禁须保持绿 | — |

### 7.1 实测枚举基线（供实现方直接引用，取自 `kb-schema.v2.json`）

| 枚举 | 实测取值 |
|---|---|
| `work_type` | `classic_text \| food_monograph \| materia_medica \| agricultural_treatise \| encyclopedic_reference \| anthology \| collected_series \| other` |
| `edition_type` | `modern_reprint \| scholarly_edition \| facsimile \| manuscript \| digital_surrogate \| unknown` |
| `locator_scheme` | `volume \| page \| chapter \| entry \| shelfmark \| none` |
| `dish_kind` | `historical_documented_dish \| heritage_practice_lead \| modern_adaptation` |
| `certainty` | `exact \| approximate \| disputed \| unknown` |
| `biological_identification_status` | `identified \| provisional \| disputed \| unknown` |
| `text_origin` | `verbatim_transcription \| normalized_transcription \| paraphrase \| unknown` |
| `edition_resolution` | `resolved \| ambiguous \| unresolved` |
| `attribution_status` | `attributed \| disputed \| anonymous \| unknown` |
| `claim_type` | `existence \| provenance \| attribution \| technique \| ingredient_use \| geography \| chronology \| cultural_context \| other` |

> 上述 10 组枚举均**实测自** `data/kb/schema/kb-schema.v2.json`（17 实体 / 24 关系），**未发明任何取值**。

---

## 8. 错误码清单（KB-002C 新增）

> 前缀 `KB002_SEL_`，与 KB-001 的 `E_*`（35 个）及 KB-002B 的 `KB002_*` 明确区隔。

| 码 | 触发条件 |
|---|---|
| `KB002_SEL_NO_SOURCE_WORK` | 不满足 G1（无 `work_type ≠ other` 的可定位原典） |
| `KB002_SEL_NO_EDITION` | 不满足 G2（无版本且未记录"版本未定"） |
| `KB002_SEL_NO_LOCATOR` | 不满足 G3（`locator_scheme = none`） |
| `KB002_SEL_LEAD_ONLY` | 不满足 G4（全部候选来源等级 ∈ {C, D, X}） |
| `KB002_SEL_ATTRIBUTION_UNSTATED` | 不满足 G5（归属未声明且未列入 `unknown_fields`） |
| `KB002_SEL_DISH_NOT_DOCUMENTED` | 不满足 G6（`dish_kind ≠ historical_documented_dish` 或菜名不可定位） |
| `KB002_SEL_NO_CLAIM_SKELETON` | 不满足 G7（无可拆分陈述雏形） |
| `KB002_SEL_GATE_WAIVED` | 未过门者被放入 SELECTED（NS1） |
| `KB002_SEL_GRADE_FLOOR_LOWERED` | 降低 G4 来源等级下限（NS2） |
| `KB002_SEL_SUBJECTIVE_GATE` | (B)/(C) 维度被用于资格门（NS3 / SEL3） |
| `KB002_SEL_GRADE_UPGRADED` | C/D 级被标为 S/A/B（NS4） |
| `KB002_SEL_PSEUDO_CORROBORATION` | 同一 SourceWork 副本冒充多源（NS5） |
| `KB002_SEL_Q_OVERRIDE` | 遴选覆盖 KB-002B 的 Q1–Q8（NS6 / X1） |
| `KB002_SEL_NO_PROVENANCE_POINTER` | 无来源指针却入选（NS7 / SEL5） |
| `KB002_SEL_SHORTFALL_MISREPORTED` | 缺额被掩饰或未如实输出（NS8） |
| `KB002_SEL_WEIGHT_BUDGET` | (B)/(C) 权重占比 > 15%（SEL6） |
| `KB002_SEL_ENUM_INVENTED` | 使用了 Schema 中不存在的枚举值（X3） |
| `SEED_GATE_FAILURE` | 蟹酿橙未通过 G1–G7（SEED2，须如实报告） |

---

## 9. 候选清单（KB-002D 交付物）机器可校验格式

候选清单**必须**为可解析结构（推荐的 Markdown 表格 + 机器可读副本），每道候选**至少**包含：

| 字段 | 必填 | 约束 |
|---|---|---|
| `candidate_seq` | ✅ | 序号（确定性，按 §4.1 排序结果） |
| `golden_id` | ✅ | `GOLDEN-001` … `GOLDEN-010`；蟹酿橙固定 `GOLDEN-001` |
| `dish_name` | ✅ | 菜品中文名 |
| `tier` | ✅ | `SELECTED` \| `WAITLIST` \| `ELIMINATED` |
| `gates` | ✅ | G1–G7 逐项 `pass` / `fail`（fail 须给错误码） |
| `score` | ✅ | §3.5 计算所得整数（WAITLIST 亦须给出） |
| `score_breakdown` | ✅ | S1–S14 逐项取值，可复核计分 |
| `source_pointers` | ✅ | ≥1 条：`work_name` + `edition_hint`(可标"未定") + `locator_hint`(可标"未定") |
| `source_grade_hint` | ✅ | 候选来源等级 `S/A/B/C/D/X`（依 KB-002B §2.1） |
| `known_gaps` | ✅ | 已知缺口（如"版本未定""页码未定位"），**不得留空**（无缺口写 `none`） |
| `reject_reason` | 条件 | `tier = ELIMINATED` 时必填 |

**SEL12**：清单中任何 `tier = SELECTED` 但缺 `source_pointers` 的条目 ⟹ `KB002_SEL_NO_PROVENANCE_POINTER`。
**SEL13**：清单**不得**包含任何"来源指针由推定生成"的条目（如"应是《XX》所载"而无任何版本/条目线索）。

---

## 10. 本文件自身的可验收性

KB-002C 交付**合格**当且仅当：

1. §2 的 G1–G7 全部**可判定**，且**不含**任何 (B)/(C) 类作为门禁（除 G7 明确标注为可记录 (B)）
2. §3 每个维度**都给出 0–3 取值细则与权重**；权重和与（B）类占比可复算
3. §4.1 算法**确定性**：并列决胜 T1–T4 全为确定性判据，无随机/时间因素
4. §5 明确 `GOLDEN-001 = 蟹酿橙` 固定，**且不豁免** G 门与 Q 门
5. §6 NS1–NS8 与 §6.2 三计数**明确禁止凑数**，并区分"遴选计数"与"证据计数"
6. §7 与 KB-002B **不冲突**（不重定义 `qualified`），枚举取自 Schema 实测
7. §8 错误码**无与 KB-001 / KB-002B 重名**（前缀隔离）
8. 全文**未新增 Schema 字段**、未修改 KB-001 行为

### 10.1 与上游契约的一致性自检（实测）

| 检查 | 结果 |
|---|---|
| 来源等级 S/A/B/C/D/X 与 KB-002B §2 | ✅ 六级一致，且 SG3/SG6 被 §2 G4 与 §6.1 NS4 继承 |
| `dish_kind` 目标值与 KB-002B Q2 | ✅ 同为 `historical_documented_dish` |
| 遴选层计数与 KB-002A §10.2 / KB-002B §5.2 | ✅ 同用 `QUALIFIED_GOLDEN_COUNT` / `SHORTFALL` / `KNOWN_DATA_GAP` |
| `edition_resolution` / `text_origin` / `certainty` 取值 | ✅ 实测自 `kb-schema.v2.json` |
| `GOLDEN-001` 固定与 KB-002A §3.3 | ✅ 固定编号 + 不豁免验证 |
| 未重定义 `metadata.qualified` | ✅ 明确交由 KB-002B §5.1 Q1–Q8 |

---

## 11. 冻结与变更流程

1. 本文件自 KB-002C 提交起**冻结**，随 `kb-002.1.0` 版本线。
2. 实现方若发现规则不可判定或与 KB-002B 冲突，**不得**自行偏离；须由 Architect 更新本文件并递增版本，再由 Captain 重新调度受影响任务。
3. 任何对 §2 资格门、§4 算法或 §6 计数规则的改动，**必须**同步评估 KB-002D（候选清单）与 KB-002E（工具实现），并经 Captain 重新调度。

---

## 12. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `kb-002.1.0` | KB-002C | 首次冻结：遴选 vs 资格边界（SEL0–SEL5）、两阶段模型、资格门 G1–G7（含 G4 来源等级下限即"来源不足不得入选"落地条款）、排序维度 S1–S14（(A) 权重 33 / (B) 权重 3，占比 8.33% ≤ 15%）、确定性选取算法（T1–T4 决胜）、`GOLDEN-001 = 蟹酿橙` 不豁免规则（SEED1–SEED5）、不凑数规则 NS1–NS8、与 KB-002B 一致性约束 X1–X5、候选清单机器可校验格式、**17 个 `KB002_SEL_*` 规则码 + 1 个 `SEED_GATE_FAILURE`** |

---

## 13. 交 Captain / 下游的明确提示

| # | 提示 | 对象 |
|---|---|---|
| 1 | **遴选 ≠ 资格**：本文件的候选计数**不得**当作 `metadata.qualified` 计数；两者必须分别呈现（§6.2 SEL11） | KB-002D / KB-002E / QA |
| 2 | G4（来源等级下限 `{S,A,B}`）是"来源不足不得凑数"在**录入前**的落地条款，**不得**为扩容而降低 | KB-002D / QA / Security |
| 3 | 蟹酿橙虽固定为 `GOLDEN-001`，**仍须**过 G1–G7，且每条 Claim 仍须完整验证；未过门须报 `SEED_GATE_FAILURE` | KB-002D / KB-002F+ / Reviewer |
| 4 | (B)/(C) 维度**只能排序**、不得决定入选；权重占比受 15% 上限约束 | KB-002E / Reviewer |
| 5 | 候选清单**必须**携带可核验来源指针；无指针者不得入选（SEL5 / NS7 / SEL12） | KB-002D |
| 6 | KB-002A §14 登记的 `data/kb-002/` 与 `data/kb/golden/` 路径不一致仍待 Captain `amend_task`（本文件未涉及该路径） | Captain |
