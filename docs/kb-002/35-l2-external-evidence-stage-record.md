# KB-002-L2 — GOLDEN-001 External Evidence Acquisition（阶段记录）

**Status: `L2_PARTIAL — VERIFIED_SINGLE_DIGITAL_WITNESS`**
**Agnes route: `BLOCKED_AGNES_AUTH`（无凭据）**
**Execution: `EXTERNAL_RESEARCH_HANDOFF`**（DSH 无独立 web search capability）

> 本文件为 **append-only 阶段记录**。未修改任何既有报告、契约、candidate、validator 或 production 数据。
> 详细来源记录见 `docs/kb-002/11-golden-001-evidence-matrix.md` **§9**（同批追加）。

---

## 1. 阶段背景

| 项 | 值 |
|---|---|
| 目标菜品 | `GOLDEN-001 = 蟹酿橙` |
| 起始状态 | `F01R2 = STAGING_ACCEPTED_NOT_PROMOTED` |
| 起始等级 | best claim = **E2**，`metadata.evidence_level = E0`，`qualified = false` |
| 起点 production | **0** |
| 策略 | `EXTERNAL_RESEARCH_HANDOFF` —— 外部来源先由独立渠道发现，DSH 负责结构化 / claim alignment / provenance / 版本比对 / 分级 / 冲突保留 |

**硬规则遵守**：LLM **不得**凭记忆补齐书目；模型声称的「某书记载」**不算 evidence**。

---

## 2. 已完成：真实外部核验

### 2.1 `SRC-L2-001` — Wikisource《山家清供》

| 字段 | 值 |
|---|---|
| URL | `https://zh.wikisource.org/zh-hant/山家清供` |
| HTTP | **200** |
| bytes | **155,324**（raw） / 16,124（plain text） |
| 条目定位 | 目录 **1.44 `蟹釀橙`**（卷之上） |
| 核验方式 | Node `fetch` 真实请求，非搜索摘要 |
| `verification status` | **`VERIFIED`** |
| `source type` | `DIGITAL_TEXT_WITNESS` / `SECONDARY_DIGITAL_TRANSCRIPTION` |
| `edition status` | **`NOT VERIFIED`** |
| `source tier` | **未定级**（不预设 S/A） |

**核验到的 passage（逐字）**

```
蟹釀橙
橙用黃熟大者截頂，剜去穰，留少液，以蟹膏肉實其內，仍以帶枝頂覆之，
入小甑，用酒、醋、水蒸熟，用醋鹽供食，香而鮮，使人有新酒菊花、
香橙螃蟹之興。因記危巽齋〈稹〉贊蟹云：「黃中通理，美在其中，
暢於四肢，美之至也。」此本諸《易》，而於蟹得之矣，今於橙蟹又得之矣。
```

抓取产物留存备查：`tmp/l2-evidence/wikisource-shanjiaqinggong.{txt,html}`（临时核验材料，非交付数据）。

### 2.2 逐 Claim 支持判定（C1–C9）

**全部 `DIRECT`**，每条均指认**该 Claim 的原文依据片段**：

| Claim | 依据片段 | 支持 |
|---|---|---|
| C1 存在「蟹釀橙」条目 | 条目标题 `蟹釀橙`（目录 1.44） | DIRECT |
| C2 核心容器为橙 | `橙用黃熟大者截頂` | DIRECT |
| C3 核心馅料为蟹膏/蟹肉 | `以蟹膏肉實其內` | DIRECT |
| C4 截顶/去穰/填入/覆顶 | `截頂，剜去穰，留少液` + `實其內` + `仍以帶枝頂覆之` | DIRECT |
| C5 使用甑蒸 | `入小甑` … `蒸熟` | DIRECT |
| C6 蒸制介质含酒、醋、水 | `用酒、醋、水蒸熟` | DIRECT |
| C7 食用涉及醋/盐 | `用醋鹽供食` | DIRECT |
| C8 新酒/菊花/香橙/螃蟹意象 | `使人有新酒菊花、香橙螃蟹之興` | DIRECT |
| C9 引危巽斋赞蟹语 | `因記危巽齋〈稹〉贊蟹云：「黃中通理…」` | DIRECT |

**重要限定**：C1–C9 **全部落在同一份 passage** 上 —— 这是**同一来源对九条不同命题的逐条支持**，**不是**九源互证，**不得**据此加分。

---

## 3. 未能验证的来源（保留 `NOT_VERIFIED`）

| 来源 | 实测 |
|---|---|
| Chinese Text Project 具体条目页 | 首页 200；搜索页 200 但**不含「蟹」**；候选条目页 `ECONNRESET` |
| 识典古籍《蟹釀橙》页 | 站根 200（38,538 B）但**不含「蟹釀橙」**；`/book` `ECONNRESET` |
| 识典其他版本页 | 未取得 |
| 《古今图书集成》转引页 | Wikisource 该页 200（82,737 B）但**不含「蟹釀橙」** |

状态：**`DISCOVERED / NOT_VERIFIED`**。**不因先前指令提过而自动升级。**

---

## 4. 三层状态汇总

| 状态 | 数量 |
|---|---:|
| `DISCOVERED` | **4**（bundle 所列，未取得页面） |
| `VERIFIED` | **1** |
| `ACCEPTED_EVIDENCE` | **0**（尚未经 QA/Security/Reviewer） |

**`DISCOVERED → ACCEPTED_EVIDENCE` 的直通被禁止。**

---

## 5. 未完成项（诚实声明）

| 项 | 状态 | 原因 |
|---|---|---|
| `VERSION_COMPARISON` | **`NOT_PERFORMED_NO_SECOND_VERIFIED_WITNESS`** | 仅 1 个可核验版本 |
| 影印本 / 馆藏 catalog | **`PRIMARY_EDITION_NOT_YET_VERIFIED`** | 无检索工具、无 URL |
| 权威整理本 metadata | 未取得 | 同上 |
| edition-specific 学术引用 | 未取得 | 同上 |
| Agnes 检索 | **`BLOCKED_AGNES_AUTH`** | `AGNES_API_KEY_PRESENT = false` |

**不得补造**：`publication_year` / `publisher` / `holding institution` / `page number` / `shelfmark` 一律 **`unknown`**。

---

## 6. Evidence Level 重算结果

以**正式 validator** 计算（非人工指定）：

| 项 | 结果 |
|---|---|
| `--staging` | exit **0** · `STAGING_VALID=true` · `PRODUCTION_ADMISSIBLE=false` |
| Q3 | **`KB002_DISH_BELOW_E3`**（best: E2）**仍可见、未削弱** |
| Claim 分布 | 5 × E2（C1–C5） · 2 × E0（C6–C7） |
| `metadata.evidence_level` | **E0**（最低） |
| `metadata.qualified` | **`false`** |
| `--dataset` | exit 0 · `QUALIFIED=0` · `SHORTFALL=10` · `STATUS=EMPTY_GOLDEN_SET` |
| production 文件 | **0** |

**Candidate 未被改动**：SHA-256 仍为 `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`（27,036 B）。

### 结论：**新增 Wikisource 证据未使等级从 E2 上升**

**这是正确结果，不是失败**（§29/§36）。理由：

1. Wikisource 是**数字转录**，`edition status = NOT VERIFIED` —— 底本、影印来源、馆藏、出版信息**全部未知**。
2. 按 rubic 的机械前置条件，**无法**据此达到 S/A/B 的更高档位。
3. **不得**为达 E3 而修改 Rubric；**不得**以「多个站点都出现蟹酿橙」充当独立证据。

---

## 7. 冲 E3 的真实缺口

按指令 §14–§17 的优先级，**尚缺**：

| 优先级 | 需要的证据 | 当前 |
|---|---|---|
| **A** | 可核验影印扫描 / 四库本 / 图书馆数字馆藏页 | ❌ 未取得 |
| **B** | 馆藏 catalog record（国图 / 大学 / 权威平台） | ❌ 未取得 |
| **C** | 权威整理本 metadata（中华书局 / 上古社等） | ❌ 未取得 |
| **D** | 可定位 edition 的学术引用（CNKI / DOI / 机构库） | ❌ 未取得 |

**在这些之一被真实核验前，`E2 → E3` 不可达成。**

---

## 8. 下一步所需（二择一）

**路径 1 —— 提供具体 URL（最快，无需 key）**
任何以下之一，Captain 将用 Node `fetch` **立即实测** HTTP / 页面 title / 正文 metadata：
- 影印页或数字馆藏页
- 国图 / 大学图书馆 catalog record
- 中华书局 / 上海古籍出版社等条目页
- CNKI / DOI / 机构库页面

**路径 2 —— 配置 `AGNES_API_KEY`**
在本地 / DSH 凭据存储 / 环境变量中配置（**勿贴对话**）。配置后 Captain 将：
1. 仅报告 `AGNES_API_KEY_PRESENT=true/false`
2. 做**最小 smoke**：auth → 模型响应 → **工具可用性** → 无 fallback
3. 若 smoke PASS → 建立**专用成员** `l2-researcher-agnes`（**仅此成员**绑定 Agnes；**其他成员路由一律不动**）
4. 若**无检索工具** → `BLOCKED_EXTERNAL_RESEARCH_TOOLING`，**不让其靠记忆硬搜**

---

## 9. Scope guard 遵守声明

本阶段**未修改**：`agent-default-model` · software-factory 默认模型 · architect/backend/QA/security/reviewer 模型 · 其他 active team · 其他 project profile · DeepSeek 全局配置 · hy4 配置 · workbuddy 配置 · `memberProvider` · `memberMaxDepth` · `maxMembers`。

**未执行**任何全局模型迁移。无 `SCOPE_VIOLATION_GLOBAL_MODEL_MIGRATION`。

---

## 10. 状态汇总

```text
KB-002-L2 = L2_PARTIAL
  SRC-L2-001 (Wikisource)  = VERIFIED, tier UNDETERMINED
  DISCOVERED               = 4 (unverified)
  VERIFIED                 = 1
  ACCEPTED_EVIDENCE        = 0
  VERSION_COMPARISON       = NOT_PERFORMED (no second verified witness)
  PRIMARY_EDITION          = NOT_YET_VERIFIED
  AGNES                    = BLOCKED_AGNES_AUTH

GOLDEN-001 = STAGING_ACCEPTED_NOT_PROMOTED
  qualified                = false
  best_evidence_level      = E2
  metadata.evidence_level  = E0
  promoted                 = false

production               = 0
QUALIFIED_GOLDEN_COUNT   = 0
SHORTFALL                = 10
STATUS                   = EMPTY_GOLDEN_SET
HEAD                     = 6a25f4f
user staged              = 300
```

**未 promotion。未写 production。未修改 candidate / manifest / validator / Contract / Rubric。**

---

## 11. 诚实边界

- **L2 外部来源真实性未完成**：仅 1 个数字转录 `VERIFIED`，`ACCEPTED_EVIDENCE = 0`。
- **Wikisource 不是影印本、不是馆藏原件、不是 S/A 级**。
- **`L2_RESULT` 尚未判定为最终**：若在预算内取得更高阶来源，可继续；否则将收敛为 `VERIFIED_BUT_INSUFFICIENT_FOR_E3`。
- **真实 S8（E3+）仍 deferred** —— 与 `ALIGN-03` 中的 S8 延期决定一致，合成 E4 仅为机械测试数据。
