# L2-SECURITY-02/03 — Fresh Independent Security Re-gate (after F-1 & RV-01 repairs)

**Task**: `t13` / `L2-SECURITY-03`
**Attempt id**: `c10e8f55-668a-441e-adb3-99f35372b485`
**Member**: `security-white` · route `white/deepseek-v4.1-flash`
**Date**: 2026-10-12
**Supersedes**: `t11`（同一 re-gate，因 provider rate limit 未产出）

> 本文件为**独立 Security 复核**。**未修改**任何被审计产物。
> 仅写入本文件（`docs/kb-002/44-l2-security-r2.md`）。

---

## 0. VERDICT

```text
L2-SECURITY-03 VERDICT = PASS
（就 §46 九项 fabrications 计数与两项 scoped 修复而言）
```

**限定（必须与 verdict 同时阅读）**：

- 本轮 **validator / 机器门禁未运行**（`NOT_RUN — SHELL_UNAVAILABLE`），
  故 **PASS 不覆盖机器门禁**，不得据此声称 `validate-golden` 通过。
- **本轮未发起任何新的 HTTP 请求**；网络出口被策略阻断（见 §2）。
  本 PASS 建立于**落盘原始字节**的独立复核之上，**不是**基于当轮重新 `fetch`。
- `promotion = NO`；`Evidence = E2`（未上调）；`production = 0`。**无 E3 声明。**
- 不得据此启动 F02（§56）。

---

## 1. 复核条件（诚实前置声明）

| 能力 | 状态 | 实测证据 |
|---|---|---|
| `pwsh` / `node` | **不可用** | 每次调用（含最简 `Write-Output`）返回 `Error: spawn EPERM` |
| `web_fetch` | **被策略阻断** | 返回 `resolves to a non-public IP address` |
| 文件读取（read/grep/glob） | **可用** | 本报告全部证据来源 |

**因此本轮采用「落盘原始抓取字节 + 当前产物文本」复核路径。**
该路径强度**低于**当轮重新请求，此限制在 §5 明确标注，**不**将其表述为等价强度。

---

## 2. Acceptance 逐项

### AC-1 — `fixture_leakage = 0` 由 §5 动作 1–3 支撑，且未依赖 validator

**判定：✅ PASS**

**我独立复现的三项动作**：

| # | 复核目标 | 我的实测命令 | 结果 |
|---|---|---|---|
| 1 | `38-l2-evidence-curation.md` 是否混入合成 fixture 关键词 | grep `examples/invalid\|golden_002\|inv_0\|synthetic\|E5\|mock` | **0 命中** ✅ |
| 2 | `11-golden-001-evidence-matrix.md` 同组关键词 | 同上 | 仅命中既有原文（append-only 边界之前，讨论 `metadata.fixture` 不得携带），**非本轮新增** ✅ |
| 3 | candidate 是否被本轮外部证据渗入 | grep candidate `L2R2-SRC\|s0840015\|ctext\.org\|lib83896\|識典\|shidianguji\|Princeton\|夷門廣牘\|夷门广牍\|fixture` | **0 命中** ✅ |

**结论一致性**：

- `40-l2-security.md:176–183`（t10 修复后）明确写：
  「本条判定的依据是上列动作 1–3 … **而非 validator 输出**。validator **本轮未能运行**…
  故本轮**不存在**任何 `validate-golden` 的退出码或 stdout 可供引用。」
- 该表述**与 §8/§10 一致**，**不再**依赖 validator 输出。
- `fixture_leakage = 0`（line 185）与 §46 表第 9 行（line 154）**均保留**。

**判定**：`fixture_leakage = 0` 的**结论**与**论证方式**现在都成立，且**未**挂靠未运行的 validator。

---

### AC-2 — 九项 §46 计数均有方法 + 证据；F-1 OCLC 已改为 unknown 且可追溯

**判定：✅ PASS（F-1 修复后；`fabricated_catalog` 采用**严格 `0`**口径见下）**

**我独立复核的九项**（`40-l2-security.md:144–154` 表逐行核对）：

| # | 计数项 | 文件所记 | 我的独立复核 | 判定 |
|---|---|---:|---|---|
| 1 | `fabricated_url` | 0 | 17 条 URL 均可在落盘 `out-*/index.json` 的 `url`/`final_url` 核到；域名皆真实机构 | ✅ 成立 |
| 2 | `fabricated_edition` | 0 | 「景明刻本 夷門廣牘 十五」在 `out-a1` viewer 与 OCR `inlinecomment` 实测可核；Princeton/CiNii 落盘均有 edition 字段 | ✅ 成立 |
| 3 | `fabricated_year` | 0 | 1966/民國55（Princeton ×2、CiNii）、1990（CiNii）、2013（豆瓣）均可核；原刊年记 `unknown` | ✅ 成立 |
| 4 | `fabricated_publisher` | 0 | 藝文印書館 / 臺灣商務 / 書目文獻 / 中华书局 均可核；豆瓣已主动降级为商业聚合源 | ✅ 成立 |
| 5 | `fabricated_catalog` | **1 类（2 值）** → **修复后已消除** | 见下 | ✅ **已闭合** |
| 6 | `fabricated_page` | 0 | 页/叶断言可核；目标页 page=47 **未**断言内容 | ✅ 成立 |
| 7 | `fabricated_expert_review` | 0 | 全库无专家评审类断言 | ✅ 成立 |
| 8 | `AI_only_primary_evidence` | 0 | 17 条均指向外部机构 URL | ✅ 成立 |
| 9 | `fixture_leakage` | 0 | 见 AC-1 | ✅ 成立 |

**F-1 / RV-02 的独立复核与闭合判定**：

我的独立检索（`tmp/l2-evidence/`）确认：`51793193` 与 `27170244` 两个数值
**仅出现在两份 Princeton JSON 落盘文件的同一条长行内**，而这两份文件：

```text
princeton-A-9943038583506421  byte_length 3326  plain_length 3118  sha256 2ecfd7cc…
princeton-C-9945512533506421  byte_length 2603  plain_length 2498  sha256 6be09dba…
```

均以 `(line truncated)` 结束于 **`series_display` / `holdings_1display` 附近**，
**可读部分不含任何 `oclc` 键** → **该两值在落盘证据中无来源支撑**。

> ⚠️ **我同时如实标注一处核验限制**：读取工具在单行文件上会于 **2000 字符**处标注
> `(line truncated)`，而实际 `byte_length` 为 3326 / 2603。
> **故我不能断言「该 HTTP 响应体全文不含 OCLC」**，只能断言：
> **「可读范围内不存在 OCLC 字段，且全部落盘证据中不存在这两个数值作为 OCLC 值。」**
> 问题性质是**「不可核验却以断言呈现」**，**不是**「已证明该值为假」。

**修复后的闭合核对**（当前产物）：

| 位置 | 现状 | 判定 |
|---|---|---|
| `11:1157` `identifier` | `9943038583506421 ; OCLC unknown（未取得可核验来源 — 见 §9.14.27 F-1）` | ✅ 已改 |
| `11:1305` 对照表 `L2R2-SRC-011` | `OCLC unknown（…）· 9100/1035.13 vol.32` | ✅ 已改 |
| `11:1307` 对照表 `L2R2-SRC-011b` | `OCLC unknown（…）· 9100/3525 v.456` | ✅ 已改 |
| `11:1169` `limitations` | 注明「OCLC 值未能在落盘响应体中核到（Princeton JSON 在 OCLC 字段前截断）」 | ✅ 已加 |
| `11:1649–1696` §9.14.27 | **可追溯更正台账**（原文 → 更正后 → 原因 → 时点，7 行） | ✅ 存在 |
| `37a:366 / 541 / 542` | 均已改 `unknown` + limitations | ✅ 已改 |
| `38:62 / 142 / 339–360` | 已改 + 独立更正说明 §8 | ✅ 已改 |
| `42-l2-oclc-repair-record.md` | 修复记录存在（187 行） | ✅ 存在 |

**关键保全项（未因修复而受损）**：

- **Princeton 记录本身未被删除**，且**其可核字段全部保留**：
  `title` / `author（林洪）` / `related_name（周履靖・陳繼儒）` / `pub_created（藝文印書館 1966）` /
  `series（夷門廣牘 ; 第3函 ; 百部叢書集成 ; 13）` / `call_number 9100/1035.13 vol.32`
  —— 我在落盘字节中**逐项核到**。**修复仅针对 OCLC 值本身。**
- `L2R2-SRC-011 / 011b` 的 `support_type = INSUFFICIENT` **未改变**（§34 仍成立）。
- 其余 catalog 标识符（`NCID BA55608705` / `BN07716458` / `R100000151-…` / `bibid=1000767294`）
  **未受影响**。

**关于 `fabricated_catalog` 的最终计数口径（须准确表述）**：

- `40-l2-security.md` 是**修复前的审计快照**，其表格仍记 `1 类`（该记录**如实反映修复前状态**，
  **不是**当前缺陷）。
- **以当前产物计**：两个 OCLC 值**已不再以确定语气陈述** →
  **`fabricated_catalog` 的可支持计数为 `0`**。
- 因此**九项在当前产物下均为 0** → 满足 §46 的放行条件。

---

### AC-3 — RV-01 措辞内部一致；无伪造的本轮退出码/输出

**判定：✅ PASS**

**我独立复核的两处（当前 `40-l2-security.md`）**：

**处 1 — §5（line 176–183）**：

```text
> 附带确认：candidate 内 C1–C5 标注的 `calculated E2` 是真实的机械计算结果
> （`KB002_DISH_BELOW_E3`），不是 fixture。
>
> ⚠️ 本条判定的依据是上列动作 1–3（落盘内容检索与 candidate 文本检索），
> 而非 validator 输出。validator 本轮未能运行 ——
> `pwsh`/`node` 在本次会话中返回 `Error: spawn EPERM`（详见 §8），
> 故本轮不存在任何 `validate-golden` 的退出码或 stdout 可供引用。
```

→ **不再声称已运行**；**明确**改挂 §5 动作 1–3；**明确**声明不存在本轮退出码。 ✅

**处 2 — §7（line 215–231）**：

```text
**本轮机器门禁状态（须先明确）**：
validate-golden.mjs --staging   →  NOT_RUN — SHELL_UNAVAILABLE
validate-golden.mjs --dataset   →  NOT_RUN — SHELL_UNAVAILABLE

`pwsh`/`node` … 命令从未启动，故不存在本轮退出码或输出。
本审计未、也不能以机器门禁结果支撑任何结论。

**基线对照（`outage` 之前，由 Captain 侧记录，非本轮结果）**：
- … exit 0 … · STAGING_VALID=true · PRODUCTION_ADMISSIBLE=false · Q3 KB002_DISH_BELOW_E3 (best: E2)
- … exit 0 · QUALIFIED_GOLDEN_COUNT=0 · SHORTFALL=10 · STATUS=EMPTY_GOLDEN_SET

> 限定：以上两行仅供对照，系 outage 之前取得，不构成本轮的机器门禁结论，
> 也不代表审计员在本轮复跑过这些命令。
```

→ `NOT_RUN — SHELL_UNAVAILABLE` 显式给出；基线**保留但明确降级为对照**；
**明确否定**「本轮已复跑」。 ✅

**我独立执行的防伪检索**：

```text
grep -E '已在本次会话中独立运行|独立运行过|已在本次会话中独立运行过'  40-l2-security.md  → 0 命中
grep -E 'NOT_RUN — SHELL_UNAVAILABLE'                                 40-l2-security.md  → line 218/219 命中
```

**未发现**任何新生或补录的退出码 / stdout / validator 输出。
本轮的 `spawn EPERM` 与出口阻断**均由我本人独立复现**（§1）。

---

### AC-4 — CText 影像访问为部分取得；page=47 登录受限；`SCAN_PAGE_VERIFIED=false`；无绕过

**判定：✅ PASS**

我独立复核的结论与证据：

| 项 | 当前产物值 | 我的独立复核 |
|---|---|---|
| `SCAN_IMAGE_ACCESS` | `PARTIALLY_OBTAINED` | ✅ 一致：`s0840015_0001/0002/0003.png` 实测 HTTP 200（108712 / 19432 / 20158 B），落盘 `index.json` 可核 |
| `SCAN_PAGE_VERIFIED` | **`false`** | ✅ 一致（§32 条件 5 未满足） |
| 目标页 `page=47` | `ACCESS_RESTRICTED` | ✅ 一致：落盘 `out-p1c/ctext-viewer-83896-p47.txt:80` 逐字为<br>`<p>請<a href="account.pl?if=gb">登入帳戶</a>以顯示這一頁。</p>` |
| 绕过访问控制 | **无** | ✅ 一致：`11:1524–1537` 显式记录「**未**绕过验证码 / 登录 / 付费墙 / anti-bot」 |

**关键区分（产物表述正确，须保持）**：`SCAN_PAGE_VERIFIED=false` 的理由**不是**
「图像不可取得」，**而是**「目标条目所在页处于**登录门之后，未取得、未绕过**」——
同一 edition 的**前 3 帧图像确已取得并目视核验**（封面「景明刻本 夷門廣牘 十五」、目录叶「山家清供目錄/上卷」）。

`OCR ≠ SCAN`（§33）**未被违反**：产物**未**以 OCR 锚点映射推断目标页正文内容。

---

### AC-5 — 最终建议明确：无 promotion、无 E3 声明；状态保持 staging/blocked；未启动 F02

**判定：✅ PASS**

| 项 | 当前值 | 判定 |
|---|---|---|
| `promotion` | `NO`（未执行） | ✅ |
| `qualified` | `false` | ✅ |
| `production` | `0` | ✅ |
| Evidence Level | `best = E2`（`metadata.evidence_level = E0`），**未上调** | ✅ |
| 手工升级等级（§42） | **未发现** | ✅ |
| `EVIDENCE_LEVEL_RECOMPUTE` | `NOT_RUN — SHELL_UNAVAILABLE`（如实标注） | ✅ |
| F02 | **未启动** | ✅ |

---

## 3. 完整性核验（我独立复算）

| 项 | 期望 | 我的实测 | 判定 |
|---|---|---|---|
| candidate `sha256` | `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964` | manifest 自声明一致；`byte_size 27036` 一致 | ✅ |
| manifest | 598 B；`assets[0].sha256` = candidate | 实测一致（18 行 JSON） | ✅ |
| `promotion_status` | `not_promoted` | **`not_promoted`** | ✅ |
| `source_task` | `t63` | `t63`（与既有记录一致） | ✅ |
| production 文件 | 0 | `data/kb/golden/` 下无 production 文件 | ✅ |
| append-only 边界 | §0–§9.13（line 1–772）逐字未变 | line 772 = 既有末行；line 778 = §9.14 起始 | ✅ |

> **诚实限定**：由于 `pwsh` 不可用，我**未能**用独立工具对 candidate 做字节级
> SHA-256 复算；采用「manifest 自声明 + 文件系统核验 + 既有记录互证」路径。
> 该路径强度**低于**独立复算，此限制如实标注。

---

## 4. 我未能独立取得证据的项（不默认通过）

| 项 | 限制 | 影响 |
|---|---|---|
| 当轮重新发起 HTTP 请求 | `web_fetch` 出口策略阻断；`pwsh` EPERM | 改以落盘字节复核（强度较低，已标注）；**不**表述为等价 |
| 重跑 `validate-golden --staging/--integrity/--dataset` | 同上 | **真实缺口**：candidate 的**本轮**机械等级重算**未**由本审计确认 → 已如实标记 `NOT_RUN — SHELL_UNAVAILABLE` |
| 独立复算 candidate/manifest SHA-256 | 同上 | 仅结构核验 + 自声明互证（见 §3 限定） |
| 目视 page=47 影印图像 | 目标页在登录门后，**未绕过** | 无法核验目标页正文；产物已正确置 `SCAN_PAGE_VERIFIED=false` |

**本审计未伪造任何退出码 / HTTP 状态 / hash / validator 输出。**

---

## 5. 遗留事项（不阻断本 PASS，但须在最终报告中保留）

1. **机器门禁未运行** —— 解除条件为 `pwsh` 恢复；届时须以**新 ID** 任务复跑并取真实退出码。
   在此之前**任何成员不得声称本轮机器门禁 PASS**。
2. **目标影印页 page=47 未取得**（登录门，未绕过）→ `SCAN_PAGE_VERIFIED = false`；
   影印原件**正文**未核验。
3. **`40-l2-security.md` 表格仍记 `fabricated_catalog = 1 类`** —— 该值为**修复前快照**，
   属正确记录；**当前产物**下该计数已闭合为 `0`。最终报告须**以当前产物**表述，避免读者混淆。
4. **OCLC 原值来源不明** —— 落盘响应体在 OCLC 字段前截断，**无可核证据**说明其当初如何写入；
   产物**未推测原因**（§41 正确遵守）。

---

## 6. 最终结论

```text
L2-SECURITY-03 = PASS

§46 fabrications（以当前产物计）：
  fabricated_url              = 0
  fabricated_edition          = 0
  fabricated_year             = 0
  fabricated_publisher        = 0
  fabricated_catalog          = 0   ← F-1 修复后闭合
  fabricated_page             = 0
  fabricated_expert_review    = 0
  AI_only_primary_evidence    = 0
  fixture_leakage             = 0

两项 scoped 修复（t7 / t10）经独立复核均已闭合且可追溯。
本轮机器门禁 = NOT_RUN — SHELL_UNAVAILABLE（不构成本 PASS 的覆盖范围）。

Evidence Level = E2（未上调）· qualified = false · production = 0
promotion = NO · F02 = 未启动 · ACCEPTED_EVIDENCE = 0（认定权仍属独立 Gate 链）
```

---

## 7. Scope guard 声明

**仅写入** `docs/kb-002/44-l2-security-r2.md`。

**未修改**：`40-l2-security.md` · `42-l2-oclc-repair-record.md` · `43-l2-rv01-repair-record.md` ·
`11-golden-001-evidence-matrix.md` · `37a` · `38` · `39-l2-qa.md` · `41-l2-review.md` ·
candidate · manifest · Contract · Rubric · Q3 · validator · schema · ALIGN-03 ·
staging semantics · status semantics · production · business source。

**未执行**：promotion · 访问控制绕过 · 全局模型迁移 · 任何 commit / push。
**未伪造**：退出码 · validator 输出 · HTTP 状态 · hash · 任何 §46 计数。
