# KB-002B Evidence Quality Rubric（证据质量评分标准）

- 契约版本：`kb-002.1.2`（与 KB-002A 同版本线；本文件为 KB-002A §6 的可判定化展开）
- 状态：**已冻结（frozen）**，KB-002C / KB-002D / KB-002E / QA / Security / Reviewer 均以本文件为准
- 上游依据：`docs/kb-002/01-golden-dataset-contract.md`（KB-002A）+ `docs/kb-001/01-schema-contract.md`（KB-001，`2.0.3`）+ `data/kb/schema/kb-schema.v2.json`（`2.0.0`）
- 本文件**只定义评定标准与可判定规则**，不含实现、不含数据
- **`kb-002.1.1` 修订说明**：修复 §3.2 非穷尽缺陷（契约缺陷修复，非实现缺陷）——详 §3.4。**不影响**任何原有结论与门槛。
- **`kb-002.1.2` 修订说明（t23）**：修订 §5.1/§5.2 的**入库语义** —— `qualified` = **production admission result**；`E3` = **最低 production admission threshold（非自动 qualified）**；`E0/E1/E2` = **not production-admissible**（可作 candidate/staging）；数据集状态改为 `EMPTY`/`PARTIAL`/`COMPLETE_GOLDEN_SET`（`PARTIAL` = **promotion 进度**，staging **不计入**）。权威定义见 `12-contract-admission-semantics.md`。**未修改任何实现、Validator、fixture 或 test。**

> **设计原则（本文件的存在理由）**
> 用户明确要求「标准必须可被校验器或脚本实际判定，不得只写主观描述」。
> 因此本文件的每一条都是**三态之一**：
> **(A) 机械可判定**：由脚本读取 `.kb.json` 字段即可判定真/假；
> **(B) 人工判定但结果可记录为字段**：判定动作由人做，但结论必须落成枚举值，从而可被脚本复核实现一致性；
> **(C) 不可判定（诚实标注）**：脚本无法验证的外部事实。
> **凡标 (C) 的，一律不得作为 `sufficient` / `external_reviewed` 的依据**——这是本 rubric 最重要的诚实边界。

---

## 1. 两层证据判定模型（必须先分清）

| 层 | 名称 | 内容 | 谁来做 | 能否机械判定 |
|---|---|---|---|---|
| **L1** | 结构合规（Structural Conformance） | 字段齐备、枚举合法、引用不悬空、链完整、等级与状态**自洽**、冲突被保留、无凑数 | **脚本 / 校验器** | ✅ **(A)** 可判定 |
| **L2** | 事实真伪（Source Veracity） | 该来源**确实存在**、且**确实记载了**所声称的内容；版本/卷/页/专家审核属实 | **人（Curator）+ 外部核实** | ❌ **(C)** 不可判定 |

**核心结论（本 rubric 的立足点）**：

> **L1 通过 ≠ 历史为真。**
> 脚本可以保证「数据没有自相矛盾、没有越级声明、没有编造的结构痕迹」，
> **但脚本无法保证「出处是真的」**。因此：
> - L2 未完成时，`review_status` **必须**停留在 `unreviewed` 或 `pending_external_expert`；
> - **任何**情况下都不得由脚本或模型自动置为 `external_reviewed`（KB-002A §6.4 R4）；
> - `evidence_status: sufficient` **只表示 L1 通过且等级达到 E3/E4**，**不表示 L2 已核实**。

这与 KB-001 契约 R1（枚举刻意不含 `verified`）是同一设计取向：**在结构上让"假装已核实"不可能发生**。

---

## 2. 来源等级 `S / A / B / C / D / X`：评定标准

### 2.1 等级定义与**机械前置条件**

等级是**人工判定**的（(B) 类），但每个等级都有**脚本可检查的前置条件**。
前置条件不满足 ⟹ 该等级**不成立**，脚本报错（第 2.3 节）。

| 等级 | 含义 | 机械前置条件（脚本可检查） |
|---|---|---|
| `S` | 国家图书馆 / 官方数字古籍 / 博物馆 / 中国非遗官方资源 / 原始古籍影印、可靠馆藏 | 对应 `SourceEdition` **必须**同时具备：① `edition_type ∈ {facsimile, manuscript, digital_surrogate, scholarly_edition}`；② `publisher` 非空；③ `provenance.source_locator` 非空且含 `locator`（馆藏号/条目定位）；④ `evidence_status = sufficient` 且 `provenance.derivation = primary_source` |
| `A` | 权威学术论文、学术专著、高校数字人文数据库、权威整理本、可核实非遗传承资料 | ① `edition_type ∈ {scholarly_edition, modern_reprint}`；② `publisher` 非空；③ `publication_year` 非 null；④ `provenance.derivation = primary_source` |
| `B` | 专业饮食史研究、专业历史复原、专业厨师实验、可靠二手研究 | ① `edition_type ∈ {scholarly_edition, modern_reprint}`；② `publisher` 非空；③ `provenance.derivation ∈ {primary_source, editorial}` |
| `C` | 专业博客、B站、微信公众号、小红书、一般互联网文章 | ① 允许 `edition_type = unknown`；② 允许 `publisher = null`（须列入 `unknown_fields`） |
| `D` | 普通 UGC | 同上；且 `provenance.asserted_by ∈ {human_editor, unknown}` |
| `X` | **AI 无来源生成** | 无任何来源实体支撑；**不得**出现在任何 `claim_supported_by` 链上 |

### 2.2 等级记录位置（继承 KB-002A §6.5）

- **来源等级**写入 `SourceEdition.notes`，前缀固定 `SOURCE_GRADE=<S|A|B|C|D|X>`；
  若等级为整部 `SourceWork` 的属性，写入 `SourceWork.notes`，同前缀。
- **正则**：`^SOURCE_GRADE=(S|A|B|C|D|X)\b`（可出现在 `notes` 任意位置，但**必须**至多一次）
- 同一 `SourceEdition` 上出现**多个不同** `SOURCE_GRADE` ⟹ 报 `KB002_MULTIPLE_GRADES`
- `SourceEdition` 在 `claim_supported_by` 链上**却无** `SOURCE_GRADE` ⟹ 报 `KB002_GRADE_UNDECLARED`

### 2.3 等级相关强制规则（全部 (A) 可判定）

| 编号 | 规则 | 违反错误码 |
|---|---|---|
| **SG1** | `SOURCE_GRADE=S\|A` ⟹ 机械前置条件（2.1 表）全部满足 | `KB002_GRADE_PRECONDITION` |
| **SG2** | `SOURCE_GRADE=B` ⟹ 若独立佐证不足（见 LG4），该 Claim **不得**为 `sufficient` | `KB002_GRADE_INSUFFICIENT` |
| **SG3** | `SOURCE_GRADE=C\|D` ⟹ 该 Claim **`evidence_status` 不得为 `sufficient`**，且 `review_status ∈ {unreviewed, rejected}` | `KB002_GRADE_INSUFFICIENT` |
| **SG4** | `SOURCE_GRADE=X` ⟹ **禁止**出现在支撑链上；同时该 Claim 的 `metadata.evidence_level` 不得 ≥ E2 | `KB002_AI_SOURCE_FORBIDDEN` |
| **SG5** | `SOURCE_GRADE` 只允许一个值 | `KB002_MULTIPLE_GRADES` |
| **SG6** | `C`/`D` 级来源**允许且只允许**用于发现线索：其承载的 Claim **必须**同时满足 `evidence_status=insufficient`、`provenance.derivation=unresolved`、`review_status=unreviewed` | `KB002_GRADE_LEAD_ONLY` |

> **SG6 是「不得把网络资料自动升级为高等级史料」的落地条款**：C/D 级内容不是被禁止，
> 而是被**强制降级为线索**——它可以在数据里，但不能支撑任何确定性历史结论。

---

## 3. Evidence Level `E0–E5`：**确定性计算规则**

### 3.1 输入（全部来自文档自身字段，脚本可读）

对某个 `HistoricalClaim` 的**支撑集**定义：

```
S(claim) = { passage | (claim, claim_supported_by, passage) ∈ relations }
```

对每个 `passage ∈ S(claim)` 计算其**来源锚点**：

```
work(passage) = edition_of_work( passage_in_edition(passage) )      # 经两次关系跳转
grade(passage) = SOURCE_GRADE of that edition (或其所隶属 work)
resolved(passage) = ( passage.edition_resolution == "resolved" )
direct(passage)   = ( passage.text_origin ∈ {verbatim_transcription, normalized_transcription} )
```

**独立来源计数**（多源互证的判定基础）：

```
W(claim) = { work(passage) | passage ∈ S(claim),
                            resolved(passage) = true,
                            grade(passage) ∈ {S, A} }              # 去重后的 SourceWork 集合
N(claim) = |W(claim)|
```

**权威直接段计数**（**2.0.1 新增**，用于 E3/E4 判定）：

```
authoritativeDirect(passage) = resolved(passage) = true
                              ∧ direct(passage) = true
                              ∧ grade(passage) ∈ {S, A}

D(claim) = { passage ∈ S(claim) | authoritativeDirect(passage) = true }
```

> **为何 D 必须以等级为条件**：若 `direct` 不区分等级，则 C/D 级网络转述一旦 `resolved` 就能把等级抬到 E3/E4，
> 直接违反 SG3/SG6（「C/D 级只能作线索」）。把等级并入 `direct` 的判定，使**低级来源在结构上无法抬高等级**。

### 3.2 等级计算（**穷尽 · 有序 · 互斥**）

> **2.0.1 修订**：冻结版 `kb-002.1.0` 的判定表**不穷尽**（见 §3.4 缺陷登记与解法选择）。
> 本节给出**完备**判定程序：对全部**通过 §3.2.0 前置检查**的合法输入，**必有且仅有**一个结论。

#### 3.2.0 前置检查（结构性错误——**不产出等级**）

以下情形属**结构性错误**，必须先报错并终止该 Claim 的等级计算（**不是**等级输入类）：

| 情形 | 错误码 |
|---|---|
| 支撑链上的 `SourceEdition`/`SourceWork` **无** `SOURCE_GRADE` | `KB002_GRADE_UNDECLARED` |
| `SOURCE_GRADE = X` 出现在支撑链上 | `KB002_AI_SOURCE_FORBIDDEN` |
| 同一实体出现多个不同 `SOURCE_GRADE` | `KB002_MULTIPLE_GRADES` |
| 悬空引用 / 未知关系端点（KB-001 层） | KB-001 既有错误码 |

**这解释了「等级未声明」为何不构成第 7 个输入类**：它在**结构层**即被拒绝（§5.2 U2 同理），
从未进入等级计算域。因此等级计算的定义域是**已声明合法等级**的输入，该定义域**已被 R1–R5 完全覆盖**（§3.2.2 机械证明）。

#### 3.2.1 判定顺序（**自上而下，取第一个命中**；R3 与 R4 互斥）

| 序 | 等级 | 判定条件（全部为 (A) 可判定） |
|---|---|---|
| **R1** | `E0` | `S(claim) = ∅`（无任何支撑 passage） |
| **R2** | `E1` | `S(claim) ≠ ∅` **且** **不存在**任何 `resolved(passage) = true` 的支撑 passage |
| **R3** | `E4` | `N(claim) ≥ 2` **且** `D(claim) ≥ 2` |
| **R4** | `E3` | `N(claim) = 1` **且** `D(claim) ≥ 1` |
| **R5** | `E2` | **以上皆不命中**（即 `S(claim) ≠ ∅` 且存在 `resolved` passage，但不满足 R3/R4）——**兜底分支** |
| — | `E5` | **不在此层判定**：需 `ExpertReview{external_scholar\|institution, approved}` **且** 真实 `Experiment`，见 §4.5（本阶段**不可达**，触发即 `KB002_E5_UNREACHABLE`） |

#### 3.2.2 穷尽性与互斥性（**机械证明**）

**互斥性**：R3 要求 `N ≥ 2`，R4 要求 `N = 1` → 二者**不可能同时命中**。
R1 与 R2 互斥（`S = ∅` vs `S ≠ ∅`）；R1/R2 与 R3/R4 互斥（后二者要求存在 `resolved`）。
**R5 是 R1–R4 的补集，按构造必然独占地承接所有剩余输入。**

**穷尽性（实测枚举）**：对 `supportCount / resolvedSA / resolvedNonSA / directSA / directNonSA ∈ [0,3]` 全组合
共 **1024** 种输入：

| 指标 | 冻结版 `kb-002.1.0` | 修订版 `kb-002.1.1` |
|---|---|---|
| 无结论（未定义）组合数 | **3 类可达输入类**（见 §3.4） | **0** ✅ |
| R3/R4 同时命中 | — | **0** ✅ |

#### 3.2.3 可达输入类覆盖表（每类给出落点）

| # | 输入类 | 落点 | 说明 |
|---|---|---|---|
| 1 | 无支撑集 | `E0` | R1 |
| 2 | 有支撑但无 `resolved` | `E1` | R2（例：全部 `ambiguous`/`unresolved`） |
| 3 | 全部 `paraphrase`（等级 S/A 且 `resolved`） | `E2` | R5（无 `authoritativeDirect`） |
| 4 | 单一 `resolved+direct` 且等级 **S/A** | `E3` | R4（`N=1 ∧ D≥1`） |
| 5 | **单一 `resolved+direct` 且等级 B（本缺陷）** | **`E2`** | **R5** ← 本次修复的关键落点 |
| 6 | 单一 `resolved+direct` 且等级 **C/D** | `E2` | R5（且受 SG3/SG6 约束，`sufficient` 被禁） |
| 7 | 多源 `resolved+direct` 且 **≥2 为 S/A** | `E4` | R3 |
| 8 | 多源但**仅 1 个 S/A**（其余 B） | `E3` | R4（`N=1`）——单一权威来源，故不得声称多源互证 |
| 9 | 同一 S/A `SourceWork` 的两段 | `E3` | R4：`D=2` 但 `N=1`；与 KB-002C **NS5**（禁止用同一 work 副本冒充多源）一致 |
| 10 | 含 C/D 上链且无 S/A `direct` | `E2` | R5（且 `sufficient` 被 SG3 禁止） |
| 11 | 等级**未声明** | **不产出等级** | §3.2.0 前置检查 → `KB002_GRADE_UNDECLARED` |
| 12 | `SOURCE_GRADE = X` 上链 | **不产出等级** | §3.2.0 前置检查 → `KB002_AI_SOURCE_FORBIDDEN` |

**计算确定性**：给定同一文档，R1–R5 产出**唯一**等级（互斥 + 穷尽）。
同一输入两次运行必须得到同一结果。

> **为何取最小值而非平均值或最大值**：一道菜的可信度由**最弱环节**决定。用最大值会掩盖缺口，属"看起来完整"的伪黄金数据。

### 3.3 等级记录位置与一致性

- 写入 `HistoricalClaim.notes`，前缀固定 `EVIDENCE_LEVEL=E<n>`；正则 `^EVIDENCE_LEVEL=E[0-5]\b`
- 同一 Claim 出现多个 ⟹ `KB002_MULTIPLE_LEVELS`
- **声明的等级必须等于 §3.2 计算所得**；不等 ⟹ `KB002_LEVEL_MISMATCH`（**这是防"自封高等级"的核心条款**）
- 该 Claim 所属 Golden 文件的 `metadata.evidence_level` **必须等于**该菜所有 Claim 等级的**最小值**（最保守值）；不等 ⟹ `KB002_DISH_LEVEL_MISMATCH`

> **为何取最小值而非平均值或最大值**：一道菜的可信度由**最弱环节**决定。用最大值会掩盖缺口，属"看起来完整"的伪黄金数据。

### 3.4 缺陷登记与解法选择（**2.0.1 契约缺陷修复**）

#### 3.4.1 缺陷描述（**契约缺陷，非实现缺陷**）

冻结版 `kb-002.1.0` §3.2 的判定表**不穷尽**。存在可机械构造的合法输入类：
`S(claim) ≠ ∅`、存在 `resolved ∧ direct` 的支撑 passage，但其**唯一可达 `SourceWork` 的来源等级为 B（或 C/D）**。
此时冻结版六条分支**全部不命中**：

| 分支 | 为何不命中 |
|---|---|
| `E3` | 要求 `N = 1`，而 `N` **只计 S/A 级** `SourceWork` → 此处 `N = 0` |
| `E2` | 要求**所有** `resolved` passage 均 `direct = false`，而此处 `direct = true` |
| `E1` | 要求**不存在** `resolved` passage |
| `E0` | 要求 `S(claim) = ∅` |

**实测**：枚举 1024 种组合，冻结版有 **3 类可达输入类**无结论（B 级 / C/D 级 / 含 C/D 上链且无 S/A direct）。
即 **`kb-002.1.0` 的等级函数对部分合法输入未定义**。

#### 3.4.2 发现者与处置（**沿用 backend-wb 的定性，本文件确认其正确**）

backend-wb 在实现 KB-002E 工具时发现该缺陷，并作出**正确**处置：

1. **不分配等级**；
2. 报出诊断码 `KB002_LEVEL_INDETERMINATE`；
3. 在 `docs/kb-002/05-ingestion-tooling.md` §7 登记为 **contract-defect 报告**，而**不是**发明一条新语义规则；
4. **拒绝该数据**，而非猜测等级。

**证据**：`data/kb/golden/examples/invalid/inv_01_missing_source_work.kb.json` 可确定性触发该路径。

> **定性（供 QA / Reviewer 采信）**：`KB002_LEVEL_INDETERMINATE` 是**契约缺陷的外显信号**，
> **不得**记为实现 bug。QA / Reviewer 已被告知此定性。

#### 3.4.3 解法选择：**择 (b) —— 修订 E2 覆盖「单一 direct 但来源等级不足」**

| 方案 | 内容 | 判定 |
|---|---|---|
| **(a)** | 扩展 `N` 使其**包含 B 级** `SourceWork`，使该情形落入 `E3` | ❌ **否决** |
| **(b)** | 修订 `E2` 措辞，使其覆盖「单一 `direct` 但来源等级不足」 | ✅ **采纳** |

**采纳 (b) 的理由（三条）**

1. **方案 (a) 会实质降低门槛 —— 这是决定性理由。**
   若 `N` 纳入 B 级，则**两个独立的 B 级来源**将使 `N ≥ 2` → 落入 **`E4`**，
   而 `E4` 在 §4.1 中**允许 `sufficient`**、并被定义为「可作为高可信历史复原基础」。
   即：未取得 S/A 级权威依据的二手材料将可升到最高可信档。
   这直接违反本次 FIX_SPEC 的红线（「不得为了让 B 级数据通过而降低任何既有门槛」），
   也与 §2.3 **SG2**（B 级须有独立佐证方可支撑 `sufficient`）及 KB-002C **G4**（来源等级下限 ≥ B 仅为**入选下限**，非 `sufficient` 依据）相冲突。

2. **方案 (b) 严格保守，不改变任何已有结论。**
   实测：1024 种组合中，**所有在原规则下有结论的输入，等级保持不变**；
   仅 3 类原本**无结论**的缺陷输入新增结论，且**全部落在 `E2`**——而 `E2` 在 §4.1 中
   **禁止 `sufficient`**。即本次修复把「未定义」变为「保守且有结论」，**没有任何输入被放宽**。

3. **语义契合。** `E2` = 「间接证据，允许形成假说，但必须明确是推测」（KB-002A §6.1）。
   单一 B 级（专业二手研究）对一项**历史事实**而言，正是"间接证据"，而非"直接史料"（`E3`）。
   把 B 级单源归入 `E2` 比归入 `E3` 更符合两者定义，也保住 `E3` 的「单一**直接史料**」语义纯度。

**方案 (a) 的额外代价**：若只为 `E3` 扩展 `N` 而不为 `E4` 扩展，`N` 将出现**两种含义**，
为 KB-002E 实现与 QA 判定引入歧义（同一符号两个口径），显著提高实现出错风险。

#### 3.4.4 修订的**影响面**（明确边界）

| 项 | 是否变化 |
|---|---|
| `N` 的定义（只计 S/A） | **不变** ✅ |
| `E3` / `E4` 的判定条件 | **不变** ✅（`E4` 的"≥2 direct"改写为等价的 `|D| ≥ 2`，并显式加入等级条件以堵住 C/D 抬级路径） |
| `E0` / `E1` | **不变** ✅ |
| `E2` | **措辞扩展**为兜底分支 R5，覆盖原本无结论的输入 |
| SG1–SG6 | **不变** ✅（SG2、SG3、SG6 全部保留，且 `D` 的等级条件使 SG6 更**难以**被绕过） |
| Q1–Q8 / NP1–NP5 / CF1–CF7 | **不变** ✅ |
| `E5` / `external_reviewed` 不可达 | **不变** ✅ |
| Schema / 字段 | **未新增任何字段** ✅ |

#### 3.4.5 `KB002_LEVEL_INDETERMINATE` 的**去留**

修订后 §3.2 已**穷尽**（1024 组合实测 0 未定义），因此：

| 项 | 结论 |
|---|---|
| **保留**该诊断码？ | ✅ **保留为防御性兜底**（避免删除后掩盖未来契约缺口） |
| **触发条件** | **空集** —— 对任何**通过 §3.2.0 前置检查**的合法输入，`KB002_LEVEL_INDETERMINATE` **不得触发** |
| 若仍触发 | 视为**内部错误信号**：或为 KB-002E 实现偏离本契约，或为**新的**契约缺口（须重新登记 defect，不得就地发明规则） |
| 对 QA / Reviewer 的要求 | 合法数据上出现该码 ⟹ 判为**缺陷**；缺陷数据上出现该码 ⟹ 应已有确定结论（`E2`），故出现该码即为**实现错误** |
| 下一版处置 | 若无新缺口，计划在 `kb-002.2.0` 移除该码，或将其降级为内部断言（不进入对外错误码表） |


---

## 4. 等级 → 状态强制映射

### 4.1 `evidence_status` 映射

| 等级 | 允许的 `evidence_status` | 说明 |
|---|---|---|
| `E0` | `insufficient` \| `unknown` | **禁止** `sufficient` |
| `E1` | `insufficient` \| `unknown` | 只有线索，**禁止** `sufficient` |
| `E2` | `insufficient` \| `unknown` | 间接证据须标为推测 |
| `E3` | `sufficient` \| `insufficient` | 可谨慎使用；若用 `sufficient` 则必须满足 §4.4 |
| `E4` | `sufficient` | 可作为高可信复原基础 |
| `E5` | `sufficient` | 标杆级（**本阶段不可达**，见 §4.5） |

**错误码**：`KB002_LEVEL_STATUS_CONFLICT`

### 4.2 `provenance.derivation` 映射

| 等级 | 允许的 `derivation` |
|---|---|
| `E0` | `unresolved` |
| `E1` | `unresolved` |
| `E2` | `primary_source` \| `editorial` \| `unresolved` |
| `E3` | `primary_source` \| `editorial` |
| `E4` | `primary_source` |
| `E5` | `primary_source` |

**错误码**：`KB002_LEVEL_DERIVATION_CONFLICT`
（注意：`v1_adapter` 只属于 KB-001 适配产物；**KB-002 Golden 数据不得**使用 `v1_adapter` ⟹ `KB002_DERIVATION_V1_FORBIDDEN`）

### 4.3 `review_status` 映射

| 等级 | 允许的 `review_status` |
|---|---|
| `E0` | `unreviewed` \| `rejected` |
| `E1` | `unreviewed` \| `rejected` |
| `E2` | `unreviewed` \| `pending_external_expert` \| `internal_reviewed` |
| `E3` | `unreviewed` \| `pending_external_expert` \| `internal_reviewed` |
| `E4` | `internal_reviewed` \| `pending_external_expert` \| `external_reviewed` |
| `E5` | `external_reviewed` |

**错误码**：`KB002_LEVEL_REVIEW_CONFLICT`

### 4.4 `E3/E4` 使用 `sufficient` 的**附加前提**（全部 (A) 可判定）

`E3` 或 `E4` 且 `evidence_status = sufficient` ⟹ 必须**同时**满足：

1. 链完整：每个支撑 `passage` 满足 KB-001 契约 TR1/TR3（可抵达 `SourceWork`）
2. `uncertainty_notes` **非空**（E3 强制；E4 亦强制，因 L2 未核实）
3. 该 Claim 的 `confidence ∈ {high, medium}`（**`confidence = low` 或 `unknown` 时不得声明 `sufficient`**）
4. `provenance.source_locator` 非空
5. **无** `SOURCE_GRADE ∈ {C, D, X}` 出现在其支撑链上

违反 ⟹ `KB002_SUFFICIENT_PRECONDITION`

### 4.5 `E5` 与 `external_reviewed` 的**阶段不可达性**（诚实约束）

**本阶段不存在**真实外部专家评审与真实复原实验记录。因此：

- 计算得 `E5` ⟹ 说明数据中**存在** `ExpertReview{external_scholar|institution, approved}` 或 `Experiment` 实例；
  在无真实依据的情况下这**必然是伪造** ⟹ 报 `KB002_E5_UNREACHABLE`（**硬性负例**）
- 任何实体 `review_status = external_reviewed` ⟹ 报 `KB002_EXTERNAL_REVIEW_UNSUPPORTED`
  （KB-001 契约 ER2/ER3 的 KB-002 强化；`internal_editor` **不得**支撑 `external_reviewed`）
- `Experiment` 出现在 Golden 数据中 ⟹ 报 `KB002_EXPERIMENT_FORBIDDEN`（KB-002A §2.2 H8 / KB-001 契约 EX3）

---

## 5. 「来源不足不得凑数」的**可校验判据**

### 5.1 单菜合格判据（`qualified` = **production admission result**）

> **`kb-002.1.2` 语义澄清**：下表是 **production admission** 判据，**不是**「研究价值」判据，也**不是**「能否存在于 staging」判据。
> **Candidate / Staging 记录允许不满足任一 Q，且 `qualified=false` 是其诚实结果**（见 `12-contract-admission-semantics.md` §2、§3、§6）。

一道 production Golden Dish 的 `metadata.qualified` **当且仅当**以下**全部**成立时为 `true`
（**全部 (A) 可判定**）：

| # | 判据 | 错误码（不满足时） | 层 |
|---|---|---|---|
| Q1 | 存在 ≥1 条 `HistoricalClaim` 经 `claim_about` 指向该 `Dish` | `KB002_NO_CLAIM_FOR_DISH` | production |
| Q2 | `Dish.dish_kind = historical_documented_dish` | `KB002_DISH_NOT_DOCUMENTED` | production |
| Q3 | 存在 ≥1 条 Claim 满足 **计算等级 ≥ E3** | `KB002_DISH_BELOW_E3` | **production admission threshold** |
| Q4 | 存在 ≥1 条 `SourcePassage` 满足 `edition_resolution = resolved`，且其链完整抵达 `SourceWork` | `KB002_NO_RESOLVED_CHAIN` | production |
| Q5 | 该菜的证据链上**无** `SOURCE_GRADE ∈ {C, D, X}` 被用于 `sufficient` | `KB002_GRADE_LEAD_ONLY` | production |
| Q6 | 该菜**无**任何伪造特征（§6 全部规则通过） | `KB002_FABRICATION_DETECTED` | **两层均适用** |
| Q7 | `metadata` 六键齐备且 `contract_version = "kb-002.1.2"` | `KB002_METADATA_INCOMPLETE` | production |
| Q8 | 文件通过 KB-002 校验器（退出码 0） | （校验器退出码） | production |

> **Q3 的准确含义（§4.1–§4.2 已详述）**：
> **`E3` 是最低 production admission threshold，不是「自动 qualified」。**
> `E0`/`E1`/`E2` 可作为 **research candidate / staging record**，但其 **production admission = FAIL**；
> 达到 `E3` 后仍**必须**满足 **Q1、Q2、Q4–Q8** 及 §4.4 五项附加前提。
> **Q6 在两层均适用**：candidate **允许**证据不足，**不允许**伪造 —— 真实是 candidate 的准入底线。

### 5.2 数据集级判据（**不凑数**）

> **⚠ `kb-002.1.2` 修订（`12-contract-admission-semantics.md`）**：本节原文的 `K < 10 ⟹ PARTIAL_GOLDEN_SET`
> 隐含「`qualified=false` 的记录可存在于集合内并被汇总」，与冻结 Validator 的 **Q3（`≥ E3`）blocking 入库门槛**
> （`golden-rules.mjs:305-308`；`validate-golden.mjs:242-243` 任何 error 即 `return 1`）**不可同时成立**。
> **现修订为两层语义如下。**

**（a）判定对象限定为 production golden dataset**

```
count = |{ d ∈ production golden dataset : d.qualified = true }|      # 只统计 production
```

- **Candidate / Staging**（`staging/`）**允许** `qualified=false`、**允许** Evidence Level `< E3`；
  但**必须数据真实、不伪造 provenance/年份/出版信息/馆藏/expert review，并明确标记当前不足**。
- **staging candidate 一律不计入 `count`**（DS1）。
- **Production** **只允许** `qualified=true`，且必须满足 **Q3（`≥ E3`）** 与全部 production gates。

**（b）三种数据集状态（target = 10）**

| 状态 | 判定 | 必须输出 |
|---|---|---|
| `EMPTY_GOLDEN_SET` | `count = 0` | `QUALIFIED_GOLDEN_COUNT = 0`、`SHORTFALL = 10` |
| `PARTIAL_GOLDEN_SET` | `0 < count < 10` | `QUALIFIED_GOLDEN_COUNT = count`、`SHORTFALL = 10 − count`、`KNOWN_DATA_GAP` |
| `COMPLETE_GOLDEN_SET` | `count = 10` | `QUALIFIED_GOLDEN_COUNT = 10`、`SHORTFALL = 0` |

> **`PARTIAL_GOLDEN_SET` 的新语义**：描述的是 **promotion 进度**（目标 10 道，当前只有部分候选达 admission threshold
> 并**成功 promotion**），**不是**「production 里可以混入 `qualified=false` 的菜」。
> **0 道合格 ⟹ `EMPTY_GOLDEN_SET`，不是 `PARTIAL_GOLDEN_SET`。**

**（c）两层必须分开计算**

```
① 逐 candidate 计算 Q1–Q8 与 Evidence Level → 得 qualified
② 对通过者执行 promotion → 进入 production
③ 对 production 计数 → 得 EMPTY / PARTIAL / COMPLETE
```

**禁止**把 ① 与 ③ 混为一步 —— 那正是本次冲突的成因。

> **【已取代】** 本节 `kb-002.1.1` 原文如下（保留以备独立核对，**不再生效**）：
> ~~「数据集 `D = {golden_001…golden_N}`（`N ≤ 10`），令 `K = |{d ∈ D : d.qualified = true}|`：| 情形 | 必须输出的结论 | |---|---| | `K = 10` | `GOLDEN_10_COMPLETE` | | `K < 10` | `PARTIAL_GOLDEN_SET`，且**必须**同时输出 `QUALIFIED_GOLDEN_COUNT = K`、`SHORTFALL = 10 - K`、并把缺额登记为 `KNOWN_DATA_GAP` |」~~
> 取代原因：未区分 candidate 与 production 两层；`K` 的定义域未限定为 production，隐含允许 `qualified=false` 记录入库。
> 另：`GOLDEN_10_COMPLETE` 更名为 **`COMPLETE_GOLDEN_SET`**，以与 `EMPTY`/`PARTIAL` 命名一致。
> 权威定义见 `docs/kb-002/12-contract-admission-semantics.md` §5。

**强制规则**

| 编号 | 规则 | 错误码 |
|---|---|---|
| **NP1** | `K < 10` 时**不得**把任何 `qualified=false` 的菜计入 `QUALIFIED_GOLDEN_COUNT` | `KB002_PADDING_COUNT` |
| **NP2** | **禁止**为达到 10 道而修改任何已判定字段的取值（如把 `insufficient` 改 `sufficient`）；判定器必须**重算**而非信任声明值 | `KB002_PADDING_DECLARED` |
| **NP3** | `metadata.qualified` 必须等于 §5.1 的**计算值** | `KB002_QUALIFIED_MISMATCH` |
| **NP4** | `SHORTFALL` 必须如实输出；**不得**以"近似达标"表述替代 | `KB002_SHORTFALL_MISREPORTED` |
| **NP5** | Golden 文件数 `N` 超过 10 ⟹ 报错（本阶段上限 10） | `KB002_TOO_MANY_GOLDEN` |

> **NP2 的关键性**：判定器必须从原始字段**重新计算**等级与合格性，
> **不得**读取 `notes` 里的 `EVIDENCE_LEVEL=` 声明值直接采信——
> 否则"改一个字符串就能把不合格变成合格"。**声明值只用于一致性核对（§3.3）。**

### 5.3 禁止凑数的行为清单（对应 KB-002A §11 红线）

以下行为**一经发现即判不合格**：

1. 把模型常识/现代菜谱/相似菜推断作为 `claim_supported_by` 的目标
2. 编造书名、作者、版本、馆藏、卷号、页码、章节、URL
3. 把 `C`/`D` 级网络资料标为 `S`/`A`
4. 自封 `external_reviewed`，或凭空写 `ExpertReview`
5. 虚标 `E5`，或声明等级高于 §3.2 计算值
6. 为补齐 10 道而降低 `Q3`（≥E3）门槛
7. 删除反证关系以制造单一"漂亮答案"（见 §6.2）
8. 无证据时用"合理推测"填满必填字段（应使用 `null` + `unknown_fields` 或 `insufficient`）

---

## 6. 冲突来源的保留与呈现规则

### 6.1 结构性支持（已由 KB-001 Schema 保证）

`claim_supported_by` 与 `claim_refuted_by` 是**两个独立**关系类型
（`data/kb/schema/kb-schema.v2.json` 的 `relations` 中编号 #4 / #5，端点均为
`HistoricalClaim → SourcePassage`），因此**天然允许共存**，无需新增字段。

### 6.2 强制规则（全部 (A) 可判定）

| 编号 | 规则 | 错误码 |
|---|---|---|
| **CF1** | 同一 `HistoricalClaim` **允许并鼓励**同时存在 `claim_supported_by` 与 `claim_refuted_by`；**不得**因存在反证而删除支持边，反之亦然 | （无错误码；删除行为由 CF2 检出） |
| **CF2** | 存在 `claim_refuted_by` ⟹ `counter_evidence_notes` **必须非空**（KB-001 契约 C4） | `KB002_COUNTER_NOTES_MISSING` |
| **CF3** | **禁止**为使 Claim 变为 `sufficient` 而删除 `claim_refuted_by`：即"曾存在反证"的痕迹不得被抹除。判定方式：若 `counter_evidence_notes` 非空**但**无任何 `claim_refuted_by`，报错 | `KB002_CONFLICT_HIDDEN` |
| **CF4** | 存在 `claim_refuted_by` ⟹ 该 Claim `confidence` **不得**为 `high` | `KB002_CONFLICT_CONFIDENCE` |
| **CF5** | 冲突**必须保留双方**：两个来源指向同一 Claim 且结论相反时，两侧 `SourcePassage` 均须存在且各自链完整 | `KB002_CONFLICT_ONE_SIDED` |
| **CF6** | 若两个来源冲突（同一 `SourceWork` 的不同 `SourceEdition` 对同一史实记载不同），**不得**择一删除；须各建 `SourceEdition` 与 `SourcePassage`，并各自建 `claim_supported_by` / `claim_refuted_by` | `KB002_CONFLICT_ONE_SIDED` |
| **CF7** | 存在 `claim_refuted_by` ⟹ 该 Claim `evidence_status` **不得**为 `sufficient`，除非反证自身也被标 `insufficient` 且有 `uncertainty_notes` 说明 | `KB002_CONFLICT_SUFFICIENT` |

> **CF3 的判定逻辑**：`counter_evidence_notes` 非空表示"记录过反证"。
> 若无对应关系边，说明边被删除 ⟹ 检出"隐藏冲突"。这是**唯一**能机械发现"为漂亮答案抹除反证"的方式。

### 6.3 呈现规则（Golden 数据内的一致性）

- 冲突**必须在数据中可见**：`claim_supported_by` 与 `claim_refuted_by` 均须存在
- `counter_evidence_notes` 必须说明反证内容（**不得**只写"存在争议"这类空话）
- 该菜 `metadata.evidence_level` 因取最小值机制，会自然反映冲突带来的降级（§3.3）
- **禁止**在 `notes` 中把存在冲突的 Claim 描述为"已确证"

---

## 7. 等级—状态一致性总表（供实现直接编码）

> 实现方可直接把本表编码为 `EVIDENCE_RUBRIC` 常量；**不得**在代码中另行发明取值。

| Level | evidence_status | derivation | review_status | 可支撑 `sufficient` |
|---|---|---|---|---|
| `E0` | `insufficient` \| `unknown` | `unresolved` | `unreviewed` \| `rejected` | ❌ |
| `E1` | `insufficient` \| `unknown` | `unresolved` | `unreviewed` \| `rejected` | ❌ |
| `E2` | `insufficient` \| `unknown` | `primary_source` \| `editorial` \| `unresolved` | `unreviewed` \| `pending_external_expert` \| `internal_reviewed` | ❌ |
| `E3` | `sufficient` \| `insufficient` | `primary_source` \| `editorial` | `unreviewed` \| `pending_external_expert` \| `internal_reviewed` | ✅（须满足 §4.4） |
| `E4` | `sufficient` | `primary_source` | `internal_reviewed` \| `pending_external_expert` \| `external_reviewed` | ✅（须满足 §4.4） |
| `E5` | `sufficient` | `primary_source` | `external_reviewed` | ⚠️ **本阶段不可达**（§4.5） |

---

## 8. 错误码清单（KB-002 新增；沿用 KB-001 的 `RULE_ID` 风格）

> KB-001 Schema 已有 **35 个 `E_*` 错误码**（实测）与 **9 个 `rule_codes`**。KB-002 新增以下**规则码**，
> 前缀 `KB002_` 以与 KB-001 明确区分；实现方须在 KB-002 校验器中输出这些码。
>
> **§4.1–§4.3 涉及的全部 Schema 枚举值**（实测自 `data/kb/schema/kb-schema.v2.json`）：
> `evidence_status` = `sufficient | insufficient | unknown`；
> `derivation` = `primary_source | v1_adapter | editorial | unresolved`；
> `review_status` = `unreviewed | internal_reviewed | pending_external_expert | external_reviewed | rejected`（**无 `verified`**）；
> `edition_resolution` = `resolved | ambiguous | unresolved`；
> `text_origin` = `verbatim_transcription | normalized_transcription | paraphrase | unknown`；
> `content_class` = `historical_fact | historical_inference | modern_adaptation | user_experiment`；
> `confidence` = `high | medium | low | unknown`。
>
> KB-002 Golden 数据的 `content_class` **只允许** `historical_fact` 或 `historical_inference`
> （`historical_documented_dish` 菜品的历史陈述不得标为 `modern_adaptation` / `user_experiment`；
> 违反报 `KB002_CONTENT_CLASS_FORBIDDEN`）。

| 码 | 触发条件 |
|---|---|
| `KB002_GRADE_PRECONDITION` | S/A/B 级来源未满足 2.1 机械前置条件 |
| `KB002_GRADE_UNDECLARED` | 支撑链上的 `SourceEdition` 无 `SOURCE_GRADE` |
| `KB002_MULTIPLE_GRADES` | 同一 `SourceEdition` 出现多个不同 `SOURCE_GRADE` |
| `KB002_GRADE_INSUFFICIENT` | B 级缺互证 / C、D 级被用于 `sufficient` |
| `KB002_GRADE_LEAD_ONLY` | C/D 级未按 §2.3 SG6 降级为线索 |
| `KB002_AI_SOURCE_FORBIDDEN` | `SOURCE_GRADE=X` 出现在支撑链 |
| `KB002_MULTIPLE_LEVELS` | 同一 Claim 出现多个 `EVIDENCE_LEVEL` |
| `KB002_LEVEL_MISMATCH` | 声明等级 ≠ §3.2 计算等级 |
| `KB002_LEVEL_INDETERMINATE` | **防御性兜底**：§3.2 已穷尽，故对通过 §3.2.0 前置检查的合法输入**触发条件为空集**。若触发，视为内部错误或新契约缺口（§3.4.5），**不得**据此发明规则 |
| `KB002_DISH_LEVEL_MISMATCH` | `metadata.evidence_level` ≠ 该菜 Claim 等级最小值 |
| `KB002_LEVEL_STATUS_CONFLICT` | 等级与 `evidence_status` 不符（§4.1） |
| `KB002_LEVEL_DERIVATION_CONFLICT` | 等级与 `derivation` 不符（§4.2） |
| `KB002_LEVEL_REVIEW_CONFLICT` | 等级与 `review_status` 不符（§4.3） |
| `KB002_DERIVATION_V1_FORBIDDEN` | Golden 数据出现 `derivation = v1_adapter` |
| `KB002_SUFFICIENT_PRECONDITION` | E3/E4 声明 `sufficient` 但未满足 §4.4 五项 |
| `KB002_E5_UNREACHABLE` | 计算得 E5（本阶段必然为伪造） |
| `KB002_EXTERNAL_REVIEW_UNSUPPORTED` | `external_reviewed` 无可验证依据 |
| `KB002_EXPERIMENT_FORBIDDEN` | Golden 数据出现 `Experiment` |
| `KB002_NO_CLAIM_FOR_DISH` / `KB002_DISH_NOT_DOCUMENTED` / `KB002_DISH_BELOW_E3` / `KB002_NO_RESOLVED_CHAIN` | 单菜合格判据 Q1–Q4 不满足 |
| `KB002_METADATA_INCOMPLETE` | `metadata` 六键缺失或 `contract_version` 不符 |
| `KB002_FABRICATION_DETECTED` | 触发 §5.3 任一禁列行为 |
| `KB002_QUALIFIED_MISMATCH` / `KB002_PADDING_COUNT` / `KB002_PADDING_DECLARED` / `KB002_SHORTFALL_MISREPORTED` / `KB002_TOO_MANY_GOLDEN` | 数据集级凑数相关（§5.2） |
| `KB002_COUNTER_NOTES_MISSING` / `KB002_CONFLICT_HIDDEN` / `KB002_CONFLICT_CONFIDENCE` / `KB002_CONFLICT_ONE_SIDED` / `KB002_CONFLICT_SUFFICIENT` | 冲突保留相关（§6.2） |
| `KB002_CONTENT_CLASS_FORBIDDEN` | Golden 历史陈述的 `content_class` 为 `modern_adaptation` / `user_experiment`（§8 注） |

---

## 9. 验收规则（本 rubric 自身的可验收性）

KB-002B 交付**合格**当且仅当：

1. 本文档每条规则**可被归入 (A)/(B)/(C) 之一**，且 (C) 类不得作为 `sufficient`/`external_reviewed` 依据
2. §3.2 等级计算**确定性**：同一文档两次计算得同一等级（无并列分支）
3. §7 总表与 KB-001 Schema 的枚举**逐值一致**（实测：`evidence_status` 3 值、`derivation` 4 值、`review_status` 5 值）
4. §5.1 的 Q1–Q8 **全部可由脚本从 `.kb.json` 字段判定**，无需人工主观输入
5. §5.2 的 NP1–NP5 **明确禁止凑数**，且 NP2 要求判定器**重算而非采信声明值**
6. §6 的 CF1–CF7 可机械检出**删除反证**这一隐蔽行为（CF3）
7. §8 错误码清单**无与 KB-001 既有 35 个 `E_*` 码重名**（前缀 `KB002_` 已隔离）
8. 本文档**未新增任何 Schema 字段**，未修改 KB-001 任何行为

### 9.1 与 KB-002A 的一致性自检（实测）

| 检查 | 结果 |
|---|---|
| 等级枚举 `E0–E5` 与 KB-002A §6.1 一致 | ✅ 6 级，命名与语义一致 |
| 来源等级 `S/A/B/C/D/X` 与 KB-002A §6.2 一致 | ✅ 6 级，语义一致 |
| 记录位置约定与 KB-002A §6.5 一致 | ✅ `notes` 前缀 `EVIDENCE_LEVEL=` / `SOURCE_GRADE=` |
| `review_status` 取值与 Schema 实测一致 | ✅ `unreviewed / internal_reviewed / pending_external_expert / external_reviewed / rejected`，**不含 `verified`** |
| 冲突保留与 KB-002A §6.3 一致 | ✅ 两类关系共存 + C4 强制 `counter_evidence_notes` |
| 不凑数判据与 KB-002A §10.2 一致 | ✅ `QUALIFIED_GOLDEN_COUNT` / `SHORTFALL` / `KNOWN_DATA_GAP` / `PARTIAL_GOLDEN_SET` |

---

## 10. 冻结与变更流程

1. 本文件自 KB-002B 提交起**冻结**，随 `kb-002.1.0` 版本线。
2. 实现方若发现规则不可判定或存在缺陷，**不得**自行偏离；须由 Architect 更新本文件并递增版本，再由 Captain 重新调度受影响任务。
3. 任何对 §7 总表或 §5 判据的改动，**必须**同步更新 KB-002C（遴选标准）与 KB-002E（工具实现），并经 Captain 重新调度。

---

## 11. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `kb-002.1.2` | t23 | **契约缺陷修复（由真实数据暴露）**。修订 **§5.1**（明确 `qualified` = **production admission result**；Q3 = **最低 production admission threshold，非自动 qualified**；`E0/E1/E2` = **not production-admissible**，可作 candidate/staging；Q6 在两层均适用）与 **§5.2**（数据集判据改为两段式；`count` 限定为 **production**；三态 `EMPTY`/`PARTIAL`/`COMPLETE_GOLDEN_SET`；`PARTIAL_GOLDEN_SET` 重定义为 **promotion 进度**；staging **不计入** `QUALIFIED_GOLDEN_COUNT`；`GOLDEN_10_COMPLETE` → `COMPLETE_GOLDEN_SET`）。**原因**：原文隐含「`qualified=false` 可入库并被汇总为 `PARTIAL_GOLDEN_SET`」，与冻结 Validator 的 **Q3 ≥E3 blocking** 行为不可同时成立（`golden-rules.mjs:305-308`；`validate-golden.mjs:242-243`）。**已取代**标注保留原文。**影响面**：`03`–`11` 中引用 `PARTIAL_GOLDEN_SET` / `QUALIFIED_GOLDEN_COUNT` 者以 `12-contract-admission-semantics.md` 为准。**未修改**实现 / Validator / fixture / test；`SG1–SG6`、`NP1–NP5`、`CF1–CF7`、`E5` 不可达性**全部不变**。 |
| `kb-002.1.1` | KB-002B / FIX_SPEC-KB002-1（t9） | **契约缺陷修复（非实现缺陷）**。① **§3.2 由「不穷尽」改为「穷尽·有序·互斥」**：新增前置检查 §3.2.0、判定程序 R1–R5、互斥性与穷尽性**机械证明**（1024 组合枚举：未定义 0、R3/R4 冲突 0）、12 类可达输入类覆盖表。② **解法择 (b)**：修订 `E2` 为兜底分支以覆盖「单一 `direct` 但来源等级不足」（B/C/D）——**否决 (a)**，因把 B 计入 `N` 将使两个 B 级来源落入 `E4`（允许 `sufficient`），实质降低门槛。③ 新增 `D(claim)`（权威直接段）使 `direct` 含等级条件，堵住 C/D 级抬级路径（强化 SG6）。④ 新增 §3.4 缺陷登记（引用 backend-wb 证据 `data/kb/golden/examples/invalid/inv_01_missing_source_work.kb.json` 与 `05-ingestion-tooling.md` §7）。⑤ 明确 `KB002_LEVEL_INDETERMINATE` **保留为防御性兜底、触发条件为空集**。⑥ **影响面**：`N`/`E0`/`E1`/`E3`/`E4` 判定、SG1–SG6、Q1–Q8、NP1–NP5、CF1–CF7、`E5` 不可达性、Schema 字段**全部不变**；1024 组合中所有原有结论保持不变。 |
| `kb-002.1.0` | KB-002B | 首次冻结：两层证据模型（L1 机械可判定 / L2 不可判定且不得冒充已核实）、来源等级 `S/A/B/C/D/X` 评定与机械前置条件、Evidence Level `E0–E5` 确定性计算规则、等级→状态强制映射、`E3/E4` 使用 `sufficient` 的附加前提、`E5`/`external_reviewed` 阶段不可达约束、单菜合格判据 Q1–Q8、数据集级「不凑数」判据 NP1–NP5、冲突保留 CF1–CF7（含可检出「隐藏反证」的 CF3）、等级—状态总表、`KB002_*` 规则码、本 rubric 自身的验收规则 |

---

## 12. 交 Captain / 下游的明确提示

| # | 提示 | 对象 |
|---|---|---|
| 1 | 本 rubric **未新增 Schema 字段**；等级与来源等级仍以 `notes` 前缀承载（KB-002A §6.5 约定） | KB-002E 实现方 |
| 2 | 判定器**必须重算**等级（§3.2），**不得**采信 `notes` 中的声明值（NP2）——这是防凑数的关键 | KB-002E / QA |
| 3 | `E5` 与 `external_reviewed` 在本阶段**不可达**，须作为**硬性负例**测试 | KB-002E / QA / Security |
| 4 | CF3 是唯一能机械发现「为漂亮答案删除反证」的规则，**必须**有对应负例测试 | KB-002E / QA |
| 5 | `data/kb-002/` 与 `data/kb/golden/` 的路径不一致仍待 Captain `amend_task`（KB-002A §14 已登记） | Captain |
