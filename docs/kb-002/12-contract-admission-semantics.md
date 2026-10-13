# KB-002 Contract / Rubric Admission Semantics（入库语义）

- 文档版本：`kb-002.1.2`（与 KB-002A `01-`、KB-002B `02-` 同版本线）
- 状态：**已冻结（frozen）**
- 上游依据：`docs/kb-002/01-golden-dataset-contract.md`（KB-002A）、`docs/kb-002/02-evidence-quality-rubric.md`（KB-002B `kb-002.1.1`）
- 修订触发：**真实数据暴露的契约—工具语义冲突**（见 §1）
- 本文件是 **Candidate / Staging / Production 三层入库语义的唯一权威表述**；与本文档冲突的既有表述**以本文档为准**

> **术语纪律**：本文件一律使用 `candidate` / `staging` / `production` 三个精确术语。
> **禁止**再单独使用有歧义的「dataset / Golden Dataset」——必须带上限定词（`candidate dataset` / `production golden dataset`）。

---

## 1. 修订原因：真实数据暴露的冲突

### 1.1 事实经过

`curator-a` 在 **F01R1** 中用**真实仓库数据**建出候选 `data/kb/golden/staging/golden_001.kb.json`
（30,484 B；17 实体 / 25 关系；7 条 `HistoricalClaim` = 5×`E2` + 2×`E0`；全部 `insufficient` + `unreviewed`；
**无任何伪造字段**），但 `--staging` 报 exit 1：

```
KB002_DISH_BELOW_E3: Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: E2)
```

### 1.2 冲突的机械证据（Captain 已独立复核源码）

| 位置 | 行为 |
|---|---|
| `scripts/kb002/lib/golden-rules.mjs:305-308` | `best < E3 → KB002_DISH_BELOW_E3` **无条件执行**，**不检查** `metadata.qualified` |
| `scripts/kb002/validate-golden.mjs:242-243` | 任何 error 均 `return 1` |

⟹ **任何 best Claim < E3 的文件都不可能通过 validator**，与 `metadata.qualified` 写 `true` 还是 `false` **无关**。

### 1.3 与冻结契约表述的矛盾

| 既有表述 | 与之矛盾之处 |
|---|---|
| KB-002A `01-` §10.2：**「是否允许以 `PARTIAL_GOLDEN_SET` 关闭，由 Reviewer + Captain 依本契约判断」** | 若 Q3 是**入库门槛**，则 `qualified=false` 的文件根本无法入库，**单文件层面不可能**达成 `PARTIAL_GOLDEN_SET` |
| KB-002B `02-` §5.2：`K < 10 ⟹ PARTIAL_GOLDEN_SET`（`K` 计 `qualified=true` 者） | 同上：该表述隐含「`qualified=false` 的记录可以存在于集合内并被汇总」 |

**二者不可同时成立。**

### 1.4 人工裁决（最终，**不得推翻**）

> **Q3 = PRODUCTION ADMISSION GATE，保持 blocking error。**
> 不得降级为 warning、不得改为 non-blocking quality issue、不得删除。

**本次修订的对象是 Contract / Rubric / Documentation / Staging-Production semantics，不是 Validator。**
Validator 语义**保持冻结**（`scripts/kb002/**` 本次**不得**修改）。

### 1.5 附加事实：fixtures 曾掩盖该矛盾

既有 valid fixtures 通过**虚构**出版信息把样本硬抬到 `E3`，**掩盖了**上述矛盾：

| 实体 | 虚构字段 |
|---|---|
| `edition_g001_shanjiaqinggong_facsimile` | `edition_type=facsimile`、`publication_year=1985`、`publisher=夹具出版社（占位）` |
| `edition_g001_yinshanzhengyao_reprint` | `edition_type=scholarly_edition`、`publication_year=2002`、`publisher=夹具学术出版社（占位）` |

**fixture 修正属 t24**，不在本任务范围；此处仅作为冲突成因记录。

---

## 2. 三层语义模型（权威定义）

### 2.1 Candidate（研究候选）

| 项 | 定义 |
|---|---|
| 载体 | `data/kb/golden/staging/*.kb.json` |
| **允许** | `qualified=false`；Evidence Level **< E3**；`provenance` 尚未闭合；含 `insufficient` Claim |
| **必须** | 数据**真实**；**不伪造** provenance / 年份 / 出版信息 / 馆藏 / expert review；**明确标记**当前不足（`unknown_fields` / `uncertainty_notes` / `insufficient`） |
| **性质** | **研究候选数据**，**不是** production golden data |
| 唯一性要求 | `metadata.golden_id` 在同一 candidate 层内不重复 |

> **Candidate 的诚实标准**：`qualified=false` **不是缺陷**，而是**对证据水平的如实陈述**。
> 真实但未 qualified 的记录，**优于**伪造的 qualified。

### 2.2 Production Golden Dataset（正式黄金数据集）

| 项 | 定义 |
|---|---|
| 载体 | `data/kb/golden/*.kb.json`（**不含** `staging/`） |
| **只允许** | `qualified=true` |
| **准入条件** | 单菜 **admission threshold ≥ E3** + **全部** production hard gates（§3） |
| **禁止** | 任何 `qualified=false` 的记录进入 |

### 2.3 两者的逻辑分离（**必须**）

| 维度 | Candidate / Staging | Production |
|---|---|---|
| 路径 | `data/kb/golden/staging/` | `data/kb/golden/` |
| `qualified` | 允许 `false` | **必须** `true` |
| Evidence Level | 允许 `< E3` | **必须** `≥ E3` |
| 计入 `QUALIFIED_GOLDEN_COUNT` | ❌ **否** | ✅ 是 |
| 计入 dataset status | ❌ 否 | ✅ 是 |

**路径已分离**（`data/kb/golden/` = production、`data/kb/golden/staging/` = candidate）；
工具侧生产的集合已排除 `staging/`（t19），并提供 `--staging` 入口。
**本文件只做文档对齐，不扩展为 workflow engine。**

---

## 3. 字段语义：`qualified`

> **`qualified` = production admission result。**

**它明确地不是**：

- ❌ **不是**「有研究价值」
- ❌ **不是**「可以存在于 staging」
- ❌ **不是**「编号已分配」（`GOLDEN-001` 的编号固定**不蕴含** `qualified=true`）

**推论（强制）**：

| # | 规则 |
|---|---|
| QF1 | candidate 记录**可以** `qualified=false` |
| QF2 | production golden dataset 中**不得存在** `qualified=false` |
| QF3 | `metadata.qualified` 必须是**计算值**（KB-002B §5.1 Q1–Q8），不得主观声明；声明值与计算值不一致 ⟹ `KB002_QUALIFIED_MISMATCH`（NP3） |

---

## 4. Evidence Level 与 production admission

### 4.1 E3 是最低 production admission threshold

| 等级 | candidate / staging | production admission |
|---|---|---|
| `E0` | ✅ 可作 research candidate / staging record | ❌ **FAIL** |
| `E1` | ✅ 可作 research candidate / staging record | ❌ **FAIL** |
| `E2` | ✅ 可作 research candidate / staging record | ❌ **FAIL** |
| `E3` | ✅ | ✅ **有资格**继续通过其他 production gates |
| `E4` | ✅ | ✅ 有资格（须满足 §4.2） |
| `E5` | ✅ | ⚠️ 本阶段**不可达**（无真实外部专家/实验） |

**表述纪律**：`E0/E1/E2` 的含义是 **not production-admissible**，
**不是**「可进 golden dataset 但算 partial」。

### 4.2 E3 是**门槛**，不是**自动 qualified**

**E3 只是最低准入线**。达到 `E3` 仍**必须**满足**其它全部** production gate，包括但不限于：

- provenance 完整（KB-002A §5；`primary_source` 须 `basis_ids` + `source_locator` 非空）
- 追踪链完整（KB-001 契约 TR1–TR3；KB-002B §4.4 五项附加前提）
- 来源质量（KB-002B §2 `S/A/B/C/D/X`；SG1–SG6）
- 一致性（`N/D` 计算、镜像一致性、`metadata.evidence_level` 取最小值）
- `review_status` 合法且**不得**自封 `external_reviewed`
- 冲突保留（CF1–CF7）
- Q1–Q8 全部成立
- 校验器退出码 0

> **反例警示**：把某菜标为 `E3` 而 provenance 未闭合 ⟹ **仍不得**进入 production。

---

## 5. Dataset Status 定义与计数口径

设 **目标 `target = 10`**；**`count` = production golden dataset 中 `qualified=true` 的记录数**（**只统计 production**）：

| 状态 | 判定 | `QUALIFIED_GOLDEN_COUNT` | `SHORTFALL` |
|---|---|---|---|
| **`EMPTY_GOLDEN_SET`** | `count = 0` | `0` | `10` |
| **`PARTIAL_GOLDEN_SET`** | `0 < count < target` | `count` | `10 − count` |
| **`COMPLETE_GOLDEN_SET`** | `count = target` | `10` | `0` |

**强制规则**

| # | 规则 | 错误码 |
|---|---|---|
| DS1 | **staging candidate 一律不计入** `QUALIFIED_GOLDEN_COUNT` | `KB002_PADDING_COUNT` |
| DS2 | `count` 必须是**计算值**，不得采用声明值 | `KB002_PADDING_DECLARED` / `KB002_QUALIFIED_MISMATCH` |
| DS3 | `SHORTFALL` 必须如实输出，不得以「近似达标」替代 | `KB002_SHORTFALL_MISREPORTED` |
| DS4 | `count > target` ⟹ 报错 | `KB002_TOO_MANY_GOLDEN` |
| DS5 | 缺额必须登记为 `KNOWN_DATA_GAP` | — |

### 5.1 `PARTIAL_GOLDEN_SET` 的**新定义**

> **不是**「production 里可以混入 `qualified=false` 的菜」，
> **而是**「目标 10 道，当前**只有部分**候选达到 admission threshold 并**成功 promotion**」。

即：`PARTIAL_GOLDEN_SET` 描述的是 **promotion 进度**，不是「容忍不合格记录」。
**0 道合格 ⟹ `EMPTY_GOLDEN_SET`，不是 `PARTIAL_GOLDEN_SET`。**

### 5.2 状态判定必须是**两段式**

```
① 按 §4 计算每道 candidate 的 admission 结果（E-level + gates）
② 对通过者执行 promotion → 进入 production
③ 对 production 计数 → 得 EMPTY / PARTIAL / COMPLETE
```

**禁止**把 ① 与 ③ 混为一步（那正是本次冲突的成因）。

---

## 6. Promotion Model（candidate → production）

| 阶段 | 动作 | 前置 | 结果 |
|---|---|---|---|
| **P0 研究** | Curator 用**真实**来源建 candidate | 无 | `staging/*.kb.json`，`qualified` 由工具计算 |
| **P1 自检** | `validate-golden.mjs --staging` | P0 | 结构性错误必须清零；`Q3` 等 admission gate **允许**失败（即为 `qualified=false` 的真实理由） |
| **P2 补证** | Curator 补充**真实**来源（版本/馆藏/多源互证） | P1 | Evidence Level 提升路径：`E2 → E3/E4`（**必须**靠真实证据，**不得**伪造） |
| **P3 准入判定** | 工具重算 `Q1–Q8` 与 Evidence Level | P2 | 达 `E3`+ 且全部 gate 通过 ⟹ `qualified=true` |
| **P4 Promotion** | 将记录从 `staging/` **移动**至 production 路径 | P3 通过 | 计入 `QUALIFIED_GOLDEN_COUNT` |
| **P5 汇总** | `validate-golden.mjs --dataset` | P4 | 输出 `EMPTY/PARTIAL/COMPLETE` + `SHORTFALL` + `KNOWN_DATA_GAP` |

**禁止**：

- **P2 阶段伪造**任何年份 / 出版 / 馆藏 / 页码 / 专家审核
- **跳过 P3** 直接 promotion
- 在 P1 阶段为「让 `--staging` 变绿」而修改 candidate 数据（**不得治掉 Q3**）
- 把 promotion 实现为复杂 workflow engine（本阶段仅需**路径 + 计数**语义）

---

## 7. `GOLDEN-001`（蟹酿橙）的当前真实状态

| 项 | 值 |
|---|---|
| Golden 编号 | `GOLDEN-001`（**保留**） |
| 当前层 | **Candidate / Staging** |
| `qualified` | **`false`** |
| Evidence Level | **未达 admission threshold**（best = `E2`） |
| 可否进入 production | ❌ **不得进入** |
| 唯一阻塞原因 | `KB002_DISH_BELOW_E3`（Q3）——**这是正确结果** |

**强制**：

- **`GOLDEN-001` 的编号固定 ≠ `qualified=true`**（KB-002C SEED5）
- **不得**为了让 `GOLDEN-001` 成为第一条 Golden Record 而降低任何门槛
- **不得**为其补造 `publication_year` / `publisher` / `facsimile` / 馆藏 / 页码 / expert review
- 该 Q3 错误**须保留**，作为**真实 Contract 行为**的证据

---

## 8. 与既有文档的关系（append-only 留痕）

| 文档 | 受影响条款 | 处置 |
|---|---|---|
| `01-golden-dataset-contract.md` | §10.2 数据集级验收 | **已修订**（见该文件 §10.2 及变更记录）；旧表述以「已取代」标注 |
| `02-evidence-quality-rubric.md` | §5.1 Q7 版本号、§5.2 数据集级判据 | **已修订**（见该文件 §5.2）；旧表述以「已取代」标注 |
| `03`–`11` 各门禁/报告文档 | 引用 `PARTIAL_GOLDEN_SET` / `QUALIFIED_GOLDEN_COUNT` | **不在本任务范围**（out of scope）；其计数口径**以本文件为准**，如有冲突由 Captain 另派任务对齐 |

> **append-only 原则**：既有条款的删除**必须**以明确的「**已取代**」标注说明，
> **不得**静默抹除历史表述（保留修订痕迹以便 QA / Security / Reviewer 独立核对）。

---

## 9. 不可动摇的红线（本次修订**未**触碰）

| # | 红线 |
|---|---|
| R1 | **Q3 保持 blocking error**，`KB002_DISH_BELOW_E3` 语义不变 |
| R2 | **E3 门槛不降低** |
| R3 | **不得**为任何菜补造 provenance / 年份 / 出版 / 馆藏 / 页码 / expert review |
| R4 | **不得**修改 Validator（`scripts/kb002/**`）以让当前 candidate 通过 production |
| R5 | **不得**修改 expected 只为让测试变绿 |
| R6 | **不得**删除事故证据或 `curator-a` 的发现记录 |
| R7 | KB-002B 既有防线全部保持：`SG1–SG6` / `Q1–Q8` / `NP1–NP5` / `CF1–CF7` / `E5` 与 `external_reviewed` 不可达 |
| R8 | 不进入 KB-003+；不开始 F02+；不并发其他 Golden Dish |

---

## 10. 最终原则（本次修订的立足点）

> **不要让测试 fixture 定义产品真相。**
>
> **Contract 定义语义；Validator 执行 Contract；Fixture 只能验证 Contract。**
>
> 如果真实数据与 fixture 冲突，**优先检查 Contract 和 fixture 是否诚实** ——
> **不得为了保持测试绿色而让真实数据说谎。**

本次冲突的成因正是：fixture 通过虚构出版信息把自己抬到 `E3`，从而**掩盖**了
「`E3` 是入库门槛」这一真实语义，使契约文本得以维持一个**不可成立**的表述。
真实数据（`curator-a` 的 `GOLDEN-001` staging candidate）暴露了它。

---

## 11. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `kb-002.1.2` | t23 | **首次冻结**：明确三层语义（candidate / staging / **production golden dataset**）；确定 `qualified` = **production admission result**；确立 **E3 = 最低 production admission threshold（非自动 qualified）**；定义 `EMPTY_GOLDEN_SET` / `PARTIAL_GOLDEN_SET`（**新定义：promotion 进度，非容忍不合格**）/ `COMPLETE_GOLDEN_SET` 与计数口径（staging **不计入**）；确立 promotion model P0–P5；记录 `GOLDEN-001` 当前为 candidate、`qualified=false`、不得进入 production；登记本次为**契约缺陷修复**（由真实数据暴露），并同步修订 `01-` §10.2 与 `02-` §5.2（append-only，旧表述标注「已取代」） |
