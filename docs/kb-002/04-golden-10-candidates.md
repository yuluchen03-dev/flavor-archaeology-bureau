# KB-002D Golden 10 Candidate List（黄金 10 候选清单）

- 契约版本：`kb-002.1.0`
- 上游依据：KB-002A（`01-golden-dataset-contract.md`）· KB-002B（`02-evidence-quality-rubric.md`）· KB-002C（`03-golden-dish-selection-rubric.md`）
- 本文件性质：**候选清单（计划），不是数据**（KB-002C SEL2）
- 判定方法：严格按 KB-002C 的资格门 G1–G7 + 排序 S1–S14

> ## ⚠️ 结论摘要（先说最要紧的）
>
> | 项 | 值 |
> |---|---|
> | 候选池（已评估） | **41** 条（40 个 V1 菜品节点 + 1 个仅存在于 recipe 的菜品） |
> | **SELECTED** | **5** |
> | WAITLIST | 3 |
> | ELIMINATED | 33（其中 30 条在 G1 即淘汰、3 条在 G4 淘汰） |
> | `QUALIFIED_GOLDEN_COUNT` | **5** |
> | `SHORTFALL` | **5** |
> | `SEED_GATE_FAILURE` | **无**（蟹酿橙通过全部 G1–G7） |
>
> **本清单未凑满 10 道。** 这是按 KB-002C NS1/NS2 的**强制要求**得出的诚实结果：
> 仓库内**不存在**第 6–10 道具备可定位原典 + 可定位版本/条目 + 来源等级 ≥ B 的候选。
> 详情见 §7 `KNOWN_DATA_GAP`。

---

## 0. 方法与证据边界（必读）

### 0.1 本次判定只使用仓库内可追溯证据

| 证据来源 | 用途 |
|---|---|
| `data/knowledge_graph/nodes_dish.json`（40 条） | 菜品名、朝代、`source_text`、`source_passage` |
| `data/knowledge_graph/nodes_ancient_text.json`（108 条） | 书目节点及其权威字段 |
| `data/knowledge_graph/relationships.json`（49 条） | `recorded_in` 的 `chapter` / `page_reference` |
| `data/recipes/ancient_recipes.json`（5 条） | 卷/篇级定位（`source` 字段） |
| `data/literature/authoritative_recipe_texts.json`（106 条） | **权威出版与馆藏指针**（`authority.institution` / `catalog_url`） |

### 0.2 诚实限制（必须声明）

1. **`web_search` 在本环境不可用**（无 API key）。因此本清单**未做任何外部网络核实**。
2. 所有来源指针**均为仓库内部可追溯**，人工可在仓库中逐条复核；**本清单不声称任何来源已被外部核实**（KB-002B L2 属不可判定层，不在本文件范围）。
3. **未使用模型记忆补充任何书目、版本、馆藏、卷号、页码**（KB-002A §11 红线）。

### 0.3 来源等级判定依据（KB-002B §2.1）

仓库内唯一的权威出版指针来自 `data/literature/authoritative_recipe_texts.json`，其权威字段形如：

- `authority.institution = "中国商业出版社；馆藏目录见 CiNii Books，书目转录见豆瓣书目笔记"`
- `authority.catalog_url` 指向 CiNii Books 馆藏目录 / 豆瓣书目笔记转录

**保守判定为 `B` 级**（专业整理本 / 可靠二手著录）。**不判 A**：A 级要求 `publication_year` 非 null，而 literature 数据集**没有出版年字段**（实测）；**不判 S**：S 级要求影印/馆藏定位，仓库内无此证据。

> 这一保守判定是**故意**的：宁可按 B 级入选后由人工升级，也不在无证据时标 A/S（KB-002B SG1）。

---

## 1. 候选池与 G1 初筛（最大的一次淘汰）

V1 的 40 个菜品节点按 `source_text` 分两类（实测）：

| 类别 | 数量 | `source_text` 形态 | G1 判定 |
|---|---|---|---|
| **书名类** | **10** | 具体古籍名（如 `山家清供`、`随园食单`） | 进入逐条评估 |
| **线索类** | **30** | `国家级非遗传统面食技艺线索`、`地方非遗传统卤制技艺线索` 等 | **❌ G1 失败（ELIMINATED）** |

**线索类为何在 G1 即淘汰（`KB002_SEL_NO_SOURCE_WORK`）**：
这 30 条的 `source_text` 是**证据类型标签**（"…线索"），不是可定位的前现代原典（`work_type` 只能落 `other`）。
按 KB-002C G1，它们**不构成可定位来源**；按 G4，它们没有任何 `{S,A,B}` 级来源指针。
**它们是有价值的调查线索，但不是 Golden 候选。** 30 条名单见 §6.2。

**另新增 1 条候选**：`炙羊肉`（仅存在于 `data/recipes/ancient_recipes.json:recipe_005`，**不在** `nodes_dish.json` 内），
其 `source = 《饮膳正要》卷一` 具备卷级定位 + 3 条权威版本指针，质量高于部分菜品节点，故纳入评估。

**⇒ 实际逐条评估的候选 = 11 条（10 书名类菜品 + 炙羊肉）**

---

## 2. 🔴 关键既有数据缺陷（本文件最重要的发现）

### 2.1 `recorded_in` 关系与菜品自身 `source_text` **互相矛盾**（5 条）

实测 9 条 `recorded_in`，其中 **5 条**的 `target` 书与源菜品声明的 `source_text` **不是同一部书**：

| 关系 | 菜品声明的 `source_text` | `recorded_in` 指向 | `chapter` / `page_reference` | 判定 |
|---|---|---|---|---|
| `dish_005` 驼蹄羹 | `烧尾宴食单` | `text_002`（**随园食单**） | 小菜单 / 杂素菜单 | ❌ **矛盾** |
| `dish_007` 荷包鱼 | `随园食单` | `text_004`（**饮膳正要**） | 聚珍异馔 / 卷一 | ❌ **矛盾** |
| `dish_008` 荔枝腰子 | `东京梦华录` | `text_001`（**山家清供**） | 翠缕面 / 卷下 | ❌ **矛盾** |
| `dish_009` 莲房鱼包 | `山家清供` | `text_002`（**随园食单**） | 水族有鳞单 / null | ❌ **矛盾** |
| `dish_010` 东坡肉 | `东坡志林` | `text_001`（**山家清供**） | 蜜渍梅花 / 卷下 | ❌ **矛盾** |

**一致的仅 4 条**：`dish_001`/`dish_002`/`dish_003` → `text_001`（山家清供）✅、`dish_004` → `text_002`（随园食单）✅。

### 2.2 这与 KB-001 事实审计的登记一致

`docs/kb-001/00-fact-audit.md` 已登记 **B4**：「`recorded_in` 的 `source_text` 与目标节点 `title` **冲突 5 条**（`dish_005,007,008,009,010`）」。
**本文件独立复现了该缺陷**（未采信任一方的结论）。

### 2.3 本文件的处置（遵守"冲突必须保留、不得自动择一"）

- **不得**自动采信 `source_text`，也**不得**自动采信 `recorded_in` 的 `target`（KB-002B CF1/CF5/CF6）。
- 因此对这 5 道菜，其 `recorded_in` 提供的 `chapter`/`page_reference` **不能**作为 G3 定位证据使用——因为它指向的书与菜品自身声明冲突，**定位归属未定**。
- 该冲突**已保留并如实登记**（见 §5 WAITLIST 与 §7 `KNOWN_DATA_GAP`），**未被删除、未被择一掩盖**。

> 这也解释了为何"看起来有 10 道候选、结果只有 5 道入选"：**5 道候选的定位证据被自身的矛盾关系污染了。**

---

## 3. SELECTED（`QUALIFIED_GOLDEN_COUNT = 5`）

排序依据：KB-002C §4.1（Score 降序；`GOLDEN-001` 固定占首位）。

### GOLDEN-001 — 蟹酿橙

| 字段 | 值 |
|---|---|
| `candidate_seq` | 1 |
| `golden_id` | **`GOLDEN-001`**（固定，SEED1） |
| `dish_name` | 蟹酿橙 |
| `tier` | `SELECTED` |
| `gates` | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ G7 ✅（**无 `SEED_GATE_FAILURE`**） |
| `score` | **67** |
| `score_breakdown` | S1=3 S2=1 S3=1 S4=1 S5=1 S6=3 S7=3 S8=3 S9=2 S10=1 S11=3 ／ S12=3 S13=3 S14=2 |
| `source_pointers` | ① work=`山家清供`（宋·林洪）；edition_hint=`中国烹饪古籍丛刊`（中国商业出版社，`lit_ccs_014`）+ `古代饮食文献集成·第十三册`（北京燕山出版社，`lit_afl_013`）；locator_hint=**卷下**（`recipes:recipe_001.source = 《山家清供》卷下`；且 `recorded_in` chapter=`蟹酿橙` 与菜品一致 ✅） |
| `source_grade_hint` | **B** |
| `known_gaps` | ① 无 `publication_year`（无法升级为 A 级）；② 两版本并存 → `edition_resolution` 预期 `ambiguous`（**禁止消歧**，KB-001 契约）；③ 朝代"宋代"为 `approximate`；④ 地域未定 |

**候选理由**：唯一一个"菜品声明书 = `recorded_in` 目标书 = recipe 卷次定位"三者**完全一致**的候选；有直接原文段落；食材（橙、蟹）与技法（蒸）可识别；可支撑 `RestorationVersion`。

> ⚠️ **固定编号 ≠ 历史为真**（KB-002A §3.3 / KB-002C SEED3–SEED5）：`GOLDEN-001` 的编号固定**不**表示其任何历史描述已被核实；
> 每条 `HistoricalClaim` 仍须在 KB-002F+ 逐条经 `Source → Edition → Passage → Claim → Evidence` 验证，且**不得**因它是演示标杆而放宽标准。

---

### GOLDEN-002 — 王太守八宝豆腐

| 字段 | 值 |
|---|---|
| `golden_id` | `GOLDEN-002` |
| `tier` | `SELECTED` |
| `gates` | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ G7 ✅ |
| `score` | **69**（本清单最高分） |
| `score_breakdown` | S1=3 S2=1 S3=1 S4=1 S5=2 S6=3 S7=3 S8=2 S9=2 S10=2 S11=3 ／ S12=3 S13=3 S14=2 |
| `source_pointers` | work=`随园食单`（清·袁枚）；edition_hint=`中国烹饪古籍丛刊`（中国商业出版社，`lit_ccs_006`）+ `随园食单补证`（`lit_ccs_036`）+ `古代饮食文献集成·第十八册`（北京燕山出版社，`lit_afl_018`）；locator_hint=**杂素菜单 / 小菜单**（`recipe_004.source = 《随园食单》杂素菜单`；`recorded_in` chapter=`小菜单` page=`杂素菜单` 与菜品一致 ✅） |
| `source_grade_hint` | **B** |
| `known_gaps` | ① 无 `publication_year`；② 3 个版本候选 → `ambiguous`；③ 朝代"清代"为 `approximate`；④ "王太守"具体人物未定位 |

**候选理由**：证据链最完整（书 + 版本 + 篇级定位 + 原文段落 + 一致性关系），且 `chapter` 与 `page_reference` **双定位**可用。

---

### GOLDEN-003 — 玉糁羹

| 字段 | 值 |
|---|---|
| `golden_id` | `GOLDEN-003` |
| `tier` | `SELECTED` |
| `gates` | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ G7 ✅ |
| `score` | **64** |
| `score_breakdown` | S1=3 S2=1 S3=1 S4=1 S5=1 S6=3 S7=3 S8=2 S9=2 S10=1 S11=3 ／ S12=2 S13=3 S14=2 |
| `source_pointers` | work=`山家清供`（宋·林洪）；edition_hint=同 GOLDEN-001（`lit_ccs_014` + `lit_afl_013`）；locator_hint=**卷上**（`recipe_003.source = 《山家清供》卷上`；`recorded_in` chapter=`玉糁羹` page=`卷上` 一致 ✅） |
| `source_grade_hint` | **B** |
| `known_gaps` | ① 无 `publication_year`；② 版本 `ambiguous`；③ 原文含"东坡一夕与子由饮"叙事，涉及人物传闻，**须在 Claim 层区分史实与轶事**；④ 地域未定 |

---

### GOLDEN-004 — 炙羊肉

| 字段 | 值 |
|---|---|
| `golden_id` | `GOLDEN-004` |
| `tier` | `SELECTED` |
| `gates` | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ G7 ✅ |
| `score` | **63** |
| `score_breakdown` | S1=3 S2=1 S3=1 S4=1 S5=1 S6=2 S7=3 S8=3 S9=2 S10=1 S11=3 ／ S12=2 S13=3 S14=2 |
| `source_pointers` | work=`饮膳正要`（元·忽思慧）；edition_hint=**3 条权威指针**：`lit_ccs_027`（中国商业出版社）+ `lit_afl_001`（含「饮膳正要（一）」）+ `lit_afl_002`（含「饮膳正要（二）」）；locator_hint=**卷一**（`recipe_005.source = 《饮膳正要》卷一`） |
| `source_grade_hint` | **B** |
| `known_gaps` | ① 无 `publication_year`；② **3 个册次/版本候选 → `ambiguous`（禁止消歧）**；③ 该菜品**不在 `nodes_dish.json` 内**，只有 recipe 记录 → 需在 KB-002F+ 新建 `Dish` 实体；④ 菜名"炙羊肉"较泛，身份明确度仅 S6=2；⑤ 地域未定 |

**候选理由**：`饮膳正要` 是本清单中**版本指针最多（3 条）**的书，多源互证潜力最好；且有卷级定位。

---

### GOLDEN-005 — 槐叶冷淘

| 字段 | 值 |
|---|---|
| `golden_id` | `GOLDEN-005` |
| `tier` | `SELECTED` |
| `gates` | G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅ G6 ✅ G7 ✅ |
| `score` | **59** |
| `score_breakdown` | S1=3 S2=1 S3=1 S4=1 S5=1 S6=3 S7=2 S8=2 S9=1 S10=1 S11=3 ／ S12=2 S13=3 S14=2 |
| `source_pointers` | work=`山家清供`（宋·林洪）；edition_hint=同 GOLDEN-001；locator_hint=**卷上**（`recipe_002.source = 《山家清供》卷上`；`recorded_in` chapter=`槐叶冷淘` page=`卷上` 一致 ✅） |
| `source_grade_hint` | **B** |
| `known_gaps` | ① 无 `publication_year`；② 版本 `ambiguous`；③ **朝代存在内部矛盾**：`nodes_dish.dish_002.dynasty = 唐代`，而载录它的 `山家清供` 是**宋**代著作 → 须在 Claim 层显式保留该冲突（`certainty=disputed`），**不得**自动择一；④ 槐叶（`biological_identification_status`）为 provisional |

---

## 4. 排序与分数明细（可复算）

| 排名 | `golden_id` | 菜品 | (A) raw | (B) raw | raw 合计 | **Score** | tier |
|---|---|---|---|---|---|---|---|
| — | `GOLDEN-001` | 蟹酿橙 | 64 | 8 | 72 | **67** | SELECTED（固定首位） |
| 1 | `GOLDEN-002` | 王太守八宝豆腐 | 67 | 8 | 75 | **69** | SELECTED |
| 2 | `GOLDEN-003` | 玉糁羹 | 62 | 7 | 69 | **64** | SELECTED |
| 3 | `GOLDEN-004` | 炙羊肉 | 61 | 7 | 68 | **63** | SELECTED |
| 4 | `GOLDEN-005` | 槐叶冷淘 | 57 | 7 | 64 | **59** | SELECTED |
| 5 | — | 莲房鱼包 | 56 | 7 | 63 | **58** | WAITLIST |
| 6 | — | 荷包鱼 | 51 | 7 | 58 | **54** | WAITLIST |
| 7 | — | 荔枝腰子 | 51 | 6 | 57 | **53** | WAITLIST |
| — | — | 驼蹄羹 / 浑羊殁忽 / 东坡肉 | — | — | — | — | ELIMINATED |

计分公式（KB-002C §3.5）：`Score = round(100 × raw / 108)`，满分 108 = 36 × 3。

> **注意莲房鱼包（58）分数高于槐叶冷淘（59 之下仅差 1 分）**：它因**资格门**（G3 定位被矛盾关系污染）进入 WAITLIST，而非因分数低。
> 这正是 KB-002C SEL7/SEL8 的设计意图：**分数不得翻转资格门**。

---

## 5. WAITLIST（3 条 — 过部分门，但定位证据被冲突污染）

以下 3 道**有书目与版本指针**（随园食单 / 东京梦华录 / 山家清供，均 `B` 级可及），
但其**唯一定位证据来自与自身矛盾的 `recorded_in`**（§2.1），故：G1 ✅ G2 ✅ G4 ✅，但 **G3 归属未定** → **不得进入 SELECTED**。

| 菜品 | 声称原典 | 矛盾关系指向 | 保留的冲突 | 待补才能入选 |
|---|---|---|---|---|
| **莲房鱼包** | 山家清供 | `text_002` 随园食单，chapter=`水族有鳞单`，page=**null** | ✅ 已保留 | 需人工确认 山家清供 中该条的**真实卷次**；页码亦缺 |
| **荷包鱼** | 随园食单 | `text_004` 饮膳正要，chapter=`聚珍异馔`，page=`卷一` | ✅ 已保留 | 需人工确认 随园食单 中的**真实篇名**（`聚珍异馔` 是饮膳正要的篇名） |
| **荔枝腰子** | 东京梦华录 | `text_001` 山家清供，chapter=`翠缕面`，page=`卷下` | ✅ 已保留 | 需人工确认 东京梦华录 中是否**确有**此条及其实在卷次 |

**处置**：三者**不得**被计入 `QUALIFIED_GOLDEN_COUNT`（KB-002C NS1），且**不得**通过删除任一方关系来"修好"（KB-002B CF1/CF3）。

---

## 6. ELIMINATED

### 6.1 书名类但无权威指针（3 条 — `KB002_SEL_LEAD_ONLY`）

| 菜品 | 声称原典 | 实测 | 淘汰门 |
|---|---|---|---|
| **驼蹄羹** | `烧尾宴食单` | literature 数据集检索 `烧尾宴` = **0 命中**；ancient_text 节点**无**该书 | **G4**（无任何 {S,A,B} 级指针）＋ G2（无版本） |
| **浑羊殁忽** | `烧尾宴食单` | 同上；且**无任何** `recorded_in` 关系 | **G4** ＋ G3（无定位） |
| **东坡肉** | `东坡志林` | literature 数据集检索 `东坡志林` = **0 命中**；无 ancient_text 节点 | **G4** ＋ G2 |

> **不假设**《烧尾宴食单》或《东坡志林》是否真实存在或是否载有该菜——**仓库内无证据即不入选**。
> 若后续人工补入权威版本指针，可重新评估（届时须走 KB-002C §11 变更流程）。

### 6.2 线索类（30 条 — `KB002_SEL_NO_SOURCE_WORK`）

`dish_011`–`dish_040`，`source_text` 均为「国家级非遗…线索」或「地方非遗…线索」形态，G1 即淘汰：

柳州螺蛳粉 · 沙县小吃 · 缙云烧饼 · 苗家酸汤鱼 · 新疆馕 · 兰州牛肉面 · 桂林米粉 · 过桥米线 · 镇江锅盖面 · 武汉热干面 ·
驴肉火烧 · 周村烧饼 · 黄桥烧饼 · 狗不理包子 · 德州扒鸡 · 道口烧鸡 · 沟帮子熏鸡 · 金华火腿 · 宣威火腿 · 郫县豆瓣 ·
镇江香醋 · 山西老陈醋 · 绍兴黄酒 · 北京烤鸭 · 豆汁 · 洛阳水席 · 羊肉泡馍 · 潮州卤鹅 · 佛山盲公饼 · 李连贵熏肉大饼

> 这 30 条是**有价值的线索池**（可能支撑 KB-003+ 的非遗检索），但**不是** Golden 候选。**不得**为凑数把它们升格。

---

## 7. 计数与缺额（KB-002C §6.2 强制输出）

```
QUALIFIED_GOLDEN_COUNT = 5
SHORTFALL              = 5
DATASET_STAGE          = PARTIAL_GOLDEN_SET
```

### 7.1 `KNOWN_DATA_GAP`（逐条可核验）

| # | 缺口 | 具体原因 | 可核验位置 |
|---|---|---|---|
| 1 | 缺额 5 道 | 仓库内**没有**第 6–10 道同时满足"可定位原典 + 可定位版本/条目 + 来源等级 ≥ B"的菜品 | 本文件 §1/§6 |
| 2 | `烧尾宴食单` 无任何权威指针 | literature 数据集 0 命中；无 ancient_text 节点 | §6.1 |
| 3 | `东坡志林` 无任何权威指针 | 同上 | §6.1 |
| 4 | **5 条 `recorded_in` 与 `source_text` 矛盾** | 使 3 道菜（莲房鱼包/荷包鱼/荔枝腰子）的定位证据不可用；另 2 道（驼蹄羹/东坡肉）本就无指针 | §2.1 |
| 5 | 全部候选缺 `publication_year` | literature 数据集无出版年字段 → 无法判定 A 级 | §0.3 |
| 6 | `text_001`–`text_005` 五个旧书目节点**无权威字段** | `source_url`/`authority_institution`/`verification_note` 均缺（实测 `hasAuthority=false`） | §0.1 |
| 7 | 30 条线索类菜品无可定位原典 | `source_text` 是证据类型标签而非书目 | §6.2 |
| 8 | 未做外部核实 | `web_search` 在本环境不可用（无 API key） | §0.2 |

### 7.2 明确未做的"凑数"行为（自证）

- ❌ 未把 30 条线索类菜品升格为候选（NS1）
- ❌ 未降低 G4 来源等级下限 `{S,A,B}`（NS2）
- ❌ 未把 (B)/(C) 维度用于任何资格门（NS3/SEL3）
- ❌ 未把任何 C/D 级资料标为 S/A/B（NS4）
- ❌ 未用同一 SourceWork 的不同版本冒充"多源互证"（NS5）
- ❌ 未覆盖 KB-002B 的 Q1–Q8（NS6）
- ❌ 未收录任何无来源指针的候选（NS7）
- ❌ 未以"近似达标"掩饰缺额（NS8）
- ❌ 未删除 §2.1 的矛盾关系以制造单一答案（KB-002B CF1/CF3）

---

## 8. 候选清单机器可校验字段（KB-002C §9）

SELECTED 5 条的必填字段汇总（`source_pointers` 均已给出书 + 版本线索 + 定位线索）：

| `golden_id` | 菜品 | `tier` | `score` | `source_grade_hint` | `source_pointers` 条数 | `known_gaps` |
|---|---|---|---|---|---|---|
| `GOLDEN-001` | 蟹酿橙 | SELECTED | 67 | B | 2 版本 + 卷下 | 4 项 |
| `GOLDEN-002` | 王太守八宝豆腐 | SELECTED | 69 | B | 3 版本 + 杂素菜单/小菜单 | 4 项 |
| `GOLDEN-003` | 玉糁羹 | SELECTED | 64 | B | 2 版本 + 卷上 | 4 项 |
| `GOLDEN-004` | 炙羊肉 | SELECTED | 63 | B | 3 版本 + 卷一 | 5 项 |
| `GOLDEN-005` | 槐叶冷淘 | SELECTED | 59 | B | 2 版本 + 卷上 | 4 项 |

- **SEL12 自检**：5 条 SELECTED **全部**携带 ≥1 条 `source_pointers` ✅
- **SEL13 自检**：**无**任何"推定生成"的来源指针 ✅（每条均可追到 `literature` 条目的 `authority` 字段或 `recipes` 的 `source` 字段）

---

## 9. 本文件自身的验收自检

| # | 检查 | 结果 |
|---|---|---|
| 1 | 是否按 KB-002C 的 G1–G7 逐条判定 | ✅ 11 条候选逐条给出门结果 |
| 2 | 是否给出 ≥10 道 | ❌ **刻意未给足**——按 NS1/NS2 如实输出 `SHORTFALL = 5` |
| 3 | 蟹酿橙是否 `GOLDEN-001` | ✅ 固定，且**通过全部 G1–G7**（无 `SEED_GATE_FAILURE`） |
| 4 | 是否对蟹酿橙豁免标准 | ✅ **未豁免**（SEED2/SEED4 已遵守） |
| 5 | 是否保留冲突而非择一 | ✅ §2.1 五条矛盾关系**全部保留并登记** |
| 6 | 是否编造来源 | ✅ 无反例——所有指针均可追到仓库文件 |
| 7 | 是否做外部核实 | ⚠️ **未做**（工具不可用，已声明于 §0.2） |
| 8 | 是否把候选计入 `QUALIFIED_GOLDEN_COUNT`（SEL2） | ✅ 已区分：本文件的 5 是**遴选层**计数；**证据层** `qualified` 须待 KB-002F+ 录入后由 KB-002B Q1–Q8 计算 |
| 9 | 是否新增 Schema 字段 / 改动 KB-001 | ✅ 均无 |
| 10 | 是否有与上游契约冲突 | ✅ 无（`qualified` 定义权仍在 KB-002B） |

### 9.1 对 Captain 转发的初步线索的独立核实结论

Captain 转发的 `architect-wb` 初判（我已独立复核，不采信）：

| 转发的初判 | 我的独立结论 | 依据 |
|---|---|---|
| 书名类共 10 条 | ✅ **成立** | `nodes_dish` 中 `source_text` 非"…线索"者 = 10 |
| 驼蹄羹 → 烧尾宴食单：仓库内无节点/无 literature 条目 → G1 失败 | ✅ **成立**（我判定为 **G4 失败**，因 G1 的"书名可给出"其实满足；真正的硬失败点是**无任何 {S,A,B} 级指针**） | literature 检索 `烧尾宴` = 0 命中 |
| 蟹酿橙可核实（`text_001` + `lit_ccs_014` + `recipe_001` 卷下） | ⚠️ **部分修正**：`text_001` **无权威字段**（`hasAuthority=false`），**不能**作为权威指针；权威指针应为 `lit_ccs_014` + `lit_afl_013`，定位证据为 `recipe_001` 卷下 **与** 一致的 `recorded_in` | 实测 §0.1 |
| 王太守八宝豆腐可核实（`text_002` + `lit_ccs_006` + `recipe_004`） | ⚠️ **同上修正**：`text_002` 亦无权威字段；指针应为 `lit_ccs_006`/`lit_ccs_036`/`lit_afl_018` | 实测 §0.1 |

> **一处实质修正**：转发称驼蹄羹是「G1 失败」；我判定其 **G1 实际可通过**（`烧尾宴食单` 是可给出的书名），
> **真正的失败门是 G4**（无任何 `{S,A,B}` 级来源指针）。这一区分很重要，因为它决定了修复路径：
> 补入该书的权威版本指针即可重新过门，而不是"这本书不存在"。

---

## 10. 交 Captain / 下游的明确提示

| # | 提示 | 对象 |
|---|---|---|
| 1 | **本标准清单只有 5 道 SELECTED，`SHORTFALL = 5`**。严禁通过降低 G4 或豁免 G3 来凑满 10 道（NS1/NS2） | Captain / KB-002E / QA / Reviewer |
| 2 | §2.1 的 **5 条矛盾 `recorded_in`** 是既存数据缺陷（KB-001 审计 B4），**必须在 KB-002F+ 逐条人工裁定并保留冲突**，不得自动择一 | KB-002F+ / QA / Security |
| 3 | `text_001`–`text_005` **无权威字段**，不得当作权威指针使用 | KB-002F+ |
| 4 | 全部指针为 **B 级**（保守）；升级 A 级需补 `publication_year`，届时须走契约变更流程 | KB-002F+ |
| 5 | `GOLDEN-004 炙羊肉` **不在 `nodes_dish.json`**，KB-002F+ 须新建 `Dish` 实体 | KB-002F+ |
| 6 | 本文件**未做外部核实**（`web_search` 不可用）。若需提升到 A/S 级证据，须由人工或在可用网络环境下补核 | Captain |
| 7 | KB-002A §14 第 1 项的 t5 路径修订，Captain 已告知**已完成**（`amend_task` 已执行） | — |

---

## 11. 冻结与变更流程

1. 本文件为**候选清单（计划）**，随 `kb-002.1.0` 版本线。
2. 若后续补入新证据（例如补齐 `烧尾宴食单`/`东坡志林` 的权威版本指针，或裁定 §2.1 的矛盾），
   **不得**由实施方自行改判；须由 Architect 更新 KB-002C 或本文件并递增版本，再由 Captain 重新调度。
3. 本文件**不构成**任何历史事实的确认，也不构成 `metadata.qualified` 的判定（后者归 KB-002B Q1–Q8）。

---

## 12. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| `kb-002.1.0` | KB-002D | 首次产出：候选池 41 条评估；书名类 10 + 新增 1（炙羊肉）；SELECTED 5 / WAITLIST 3 / ELIMINATED 33；`QUALIFIED_GOLDEN_COUNT = 5`、`SHORTFALL = 5`、`PARTIAL_GOLDEN_SET`；独立复现 5 条 `recorded_in` 与 `source_text` 矛盾（KB-001 审计 B4）并全部保留；8 条 `KNOWN_DATA_GAP`；对 Captain 转发的初步线索给出 2 处实质修正（G1/G4 归属、`text_001`/`text_002` 无权威字段） |
