# L2-REPAIR-01 — OCLC 标识符更正记录（F-1）

**Task**: `t7` / `L2-REPAIR-01`
**Attempt id**: `38ecc18f-38ce-4301-9b85-1eeb6c2cc9c2`
**sourceFindingId**: **`F-1`**（Security(t4) 独立审计发现）
**Date**: 2026-10-12
**Status**: `OCLC_REPAIR_COMPLETE`（**待 Security(t4) 重跑 Gate 复核**）

> ⚠️ **本记录不自行宣告 Security PASS**。按 §48 角色隔离，
> 修复完成后由 Captain 另建任务交 **Security(t4) 重跑本 Gate**。

---

> # ⚠️ 本记录的前提已被推翻 —— 见文末 §9 更正（append-only）
>
> **§1–§8 为历史记录，原样保留**，但其中「0 命中 / 单行截断 / 该字段从未进入落盘证据」
> 等前提**经 round-2 fresh-context Reviewer（`46-l2-review-r2.md`, **`RV2-01` blocker**）
> 独立复核后确认是错的**，Captain 已亲自字节级复现。
> **两个 OCLC 值其实一直在落盘 Princeton 捕获中**（有来源、非虚构）。
> **权威更正**：`11-golden-001-evidence-matrix.md` **§9.14.28**（值已恢复）。
> 下方 §9 记录本次错误的完整更正。

---

## 1. Finding 事实与独立复核

> **历史文本（前提有误，见 §9）**

### 1.1 F-1 内容

Security(t4) 独立审计发现：`OCLC 51793193` 与 `OCLC 27170244`
在**整个落盘证据库** `tmp/l2-evidence/` 中 **0 命中**。

### 1.2 Curator 独立复核（本任务，不依赖 Captain 结论）

| 复核项 | 方法 | 结果 |
|---|---|---|
| 两个 OCLC 值是否存在于落盘证据库 | 对 `tmp/l2-evidence/` 全文检索 `51793193` / `27170244` | **0 命中** ✅ 复现 F-1 |
| 对应 Princeton JSON 是否截断 | 读取 `out-p3g/princeton-A-9943038583506421.{txt,bin}`、`out-p3g/princeton-C-9945512533506421.{txt,bin}` | **单行 JSON，`(line truncated)`，在 OCLC 字段前中断**（byte_length 约 3326 / 2603）✅ 复现 |
| 该记录**其它**字段是否可核 | 在落盘字节中检索 title / 周履靖 / 陳繼儒 / 藝文印書館 / 民國55 [1966] / 夷門廣牘;第3函 / call_number | **均可核到** ✅ 记录真实 |
| 值是否出现在「不含该值」的输出中 | 检索命中的 4 处均为 Princeton 输出的**同一条截断行**，其中**并无** `51793193`/`27170244` 字面量 | 确认**无来源** ✅ |

**复核结论**：**F-1 成立**。该 Princeton 记录**本身真实**
（**不**判为 `fabricated_catalog` 整体），**唯 OCLC 值无来源支撑**。

### 1.3 为何原记录会出现该值（不臆测，仅陈述可核事实）

落盘响应体在 OCLC 字段**之前**即被截断，故该字段**从未进入落盘证据**。
至于该值当初如何写入，**无可核证据**，本记录**不推测原因**（§41 禁止臆造）。

---

## 2. 修复方式（Security 建议的首选方式 A）

采用「**改为 unknown**」——**未**补录任何新值（补录需可用网络，本轮不可行）：

```text
OCLC 51793193  →  OCLC unknown（未取得可核验来源）
OCLC 27170244  →  OCLC unknown（未取得可核验来源）
```

并在相关条目 `limitations` 注明：

```text
本记录的 OCLC 值未能在落盘响应体中核到（Princeton JSON 在 OCLC 字段前截断）
```

### 2.1 明确**未**做的事（§41 无虚构）

- **未**伪造任何新的 OCLC 值；
- **未**伪造任何新的来源；
- **未**删除该 Princeton 记录（记录真实）；
- **未**因该值不可核而改动 `call_number`（该值**可在落盘响应体中核到**，故保留）；
- **未**改变任何 claim 的 `support_type`。

---

## 3. 涉及文件与逐条更正对照

### 3.1 `docs/kb-002/11-golden-001-evidence-matrix.md`

| # | 位置 | 原文 | 更正后 | 原因 | 时点 |
|---|---|---|---|---|---|
| 1 | line 804（§9.14.1 索引表） | `Princeton catalog 记录（含 call_number / OCLC）` | `Princeton catalog 记录（含 call_number；OCLC 值 F-1 更正为 unknown）` | F-1 | 2026-10-12 |
| 2 | line 1140（§9.14.10 小节标题） | `…（含 call_number / OCLC）` | `…（含 call_number；OCLC 见 §9.14.27 F-1 更正）` | F-1 | 2026-10-12 |
| 3 | line 1157（`identifier`） | `9943038583506421 ; OCLC 51793193` | `9943038583506421 ; OCLC unknown（未取得可核验来源 — 见 §9.14.27 F-1）` | F-1 | 2026-10-12 |
| 4 | line 1168（`limitations`） | （无 OCLC 说明） | 追加「② 本记录的 OCLC 值未能在落盘响应体中核到（Princeton JSON 在 OCLC 字段前截断）」 | F-1 | 2026-10-12 |
| 5 | line 1304（§9.14.14 对照表 `L2R2-SRC-011`） | `OCLC 51793193 · 9100/1035.13 vol.32` | `OCLC unknown（未取得可核验来源，见 §9.14.27）· 9100/1035.13 vol.32` | F-1 | 2026-10-12 |
| 6 | line 1306（§9.14.14 对照表 `L2R2-SRC-011b`） | `OCLC 27170244 · 9100/3525 v.456` | `OCLC unknown（未取得可核验来源，见 §9.14.27）· 9100/3525 v.456` | F-1 | 2026-10-12 |
| 7 | line 1459（§9.14.19.1 叙述句） | `…series / call_number / OCLC / NCID 等` | 移除 OCLC，并注明「OCLC 值经 F-1 更正为 unknown，不计入可核验字段」 | F-1 | 2026-10-12 |

**新增可追溯说明**：**§9.14.27「可追溯更正说明（F-1：无来源支撑的 OCLC 标识符）」**
（追加于 §9.14.26 之后；含「原文 → 更正后 → 原因 → 时点」逐条对照表）。

### 3.2 `docs/kb-002/37a-l2-research-findings.md`

| # | 位置 | 原文 | 更正后 | 原因 | 时点 |
|---|---|---|---|---|---|
| 1 | line 41（§1 P3 行） | `Princeton（含 call_number/OCLC）` | `Princeton（含 call_number；OCLC 经 F-1 更正为 unknown）` | F-1 | 2026-10-12 |
| 2 | line 366（§5.1 `OCLC`） | `51793193` | `unknown（未取得可核验来源 — F-1 更正，见文末 §14）` | F-1 | 2026-10-12 |
| 3 | §5.1 `limitations` | 仅「仅证明 edition / 馆藏 / 书志…」 | 追加 OCLC 不可核说明 | F-1 | 2026-10-12 |
| 4 | line 408（§5.3 `OCLC`） | `27170244` | `unknown（未取得可核验来源 — F-1 更正，见文末 §14）` | F-1 | 2026-10-12 |
| 5 | §5.3 | （无 `limitations` 行） | 新增 `limitations` 行（OCLC 不可核说明） | F-1 | 2026-10-12 |
| 6 | line 539（§6 P4 表 `SRC-L2-014`） | `OCLC \`51793193\` · call_number …` | `OCLC unknown（未取得可核验来源，F-1）· call_number …` | F-1 | 2026-10-12 |
| 7 | line 540（§6 P4 表 `SRC-L2-016`） | `OCLC \`27170244\` · call_number …` | `OCLC unknown（未取得可核验来源，F-1）· call_number …` | F-1 | 2026-10-12 |
| 8 | line 564（§6 §26 遵守声明） | `…/ NCID / OCLC / call_number 全部来自实际打开的页面` | 移除 OCLC，并新增 F-1 更正注记（OCLC **不属于**已核验字段） | F-1 | 2026-10-12 |

**新增可追溯说明**：**§14「可追溯更正说明（F-1：无来源支撑的 OCLC 标识符）」**（文末追加）。

### 3.3 `docs/kb-002/38-l2-evidence-curation.md`

| # | 位置 | 原文 | 更正后 | 原因 | 时点 |
|---|---|---|---|---|---|
| 1 | line 62（§2 来源清单表） | `Princeton catalog（含 call_number / OCLC）` | `Princeton catalog（含 call_number；OCLC 值 F-1 更正为 unknown）` | F-1 | 2026-10-12 |
| 2 | line 140（§4.1 V2 理由） | `…series / call_number / OCLC / NCID…` | 移除 OCLC，并注明「OCLC 值经 F-1 更正为 unknown，**不计入**可核验字段」 | F-1 | 2026-10-12 |

**新增可追溯说明**：**§8「可追溯更正说明（F-1：无来源支撑的 OCLC 标识符）」**（文末追加）。

### 3.4 `docs/kb-002/41-l2-final-report.md`（Captain 文件）

| # | 位置 | 状态 | 说明 |
|---|---|---|---|
| 1 | line 119（CATALOG 索引表） | **无需更正** | 该行**未含** OCLC 值（仅「Princeton catalog（含 call_number）」） |
| 2 | line 173（CATALOG 段 `OCLC:` 字段） | **Captain 已于本任务前自行更正** | 现为 `OCLC: unknown —— 两个此前记录的值（51793193 / 27170244）经 Security(t4) F-1 审计判定**无落盘来源支撑**（Princeton JSON 在 OCLC 字段前截断），已按 §41 无虚构原则更正为 unknown` |

> **诚实声明**：`41` 的 line 173 **不是**由本任务修改（Captain 已先行更正）；
> 本任务**仅核验**其已不含以确定语气陈述的 OCLC 值。line 119 经核验本就无需改动。

---

## 4. append-only 处理方式（§37/§38 遵守）

§37/§38 禁止**静默改写**旧记录。本次更正的处理方式：

| 要求 | 本次做法 |
|---|---|
| **不触碰** `11` 的 line 1–772（§0–§9.13） | ✅ 经核验 line 46 / 689 / 760 锚点行号**未变**，line 772 逐字**未变** |
| §9.14 内错误值**可**直接更正 | ✅ 已更正值本身 |
| **必须**留下**可追溯更正说明** | ✅ `11` §9.14.27、`37a` §14、`38` §8 三段，均含「原文 → 更正后 → 原因（F-1）→ 时点」 |
| 不得删除任何来源条目 | ✅ 17 条 `L2R2-SRC-*` **全部保留**；Princeton 记录**未删除** |
| 不得改变任何 claim 的 `support_type` | ✅ `L2R2-SRC-011` / `011b` 仍为 `INSUFFICIENT`；C1–C9 **未改** |
| `37a` / `38` 同样「更正 + 注明原因」 | ✅ 均已文末追加更正说明 |

**结论**：本次为**显式更正 + 可追溯说明**，**非**静默改写。

---

## 5. 复核方式（供 Security(t4) 重跑 Gate）

建议 Security(t4) 按下列步骤独立复核：

1. **关键字检索**：确认 `docs/kb-002/` 下 `11` / `37a` / `38` / `41` 中
   `OCLC 51793193` / `OCLC 27170244` **不再以确定语气陈述**——
   仅在「更正说明 / finding 记录 / 历史对照」语境中出现（如引述原文时）。
2. **字段核验**：确认 `11` §9.14.10 `identifier` 为 `OCLC unknown（…）`；
   `37a` §5.1 / §5.3 的 `OCLC` 行为 `unknown（…）`。
3. **limitations 核验**：确认 `11` §9.14.10 与 `37a` §5.1 / §5.3 的 `limitations`
   含「本记录的 OCLC 值未能在落盘响应体中核到（Princeton JSON 在 OCLC 字段前截断）」。
4. **append-only 核验**：确认 `11` line 1–772 逐字未变（line 46 / 689 / 760 / 772 锚点）。
5. **未扩大范围核验**：确认除 OCLC 相关表述外，**无**其它证据内容被改动；
   无来源条目被删除；无 `support_type` 变更。
6. **§41 核验**：确认**未**出现任何**新的** OCLC 值或来源。

---

## 6. 影响范围声明

| 项 | 是否受影响 |
|---|---|
| 该 Princeton 记录的**真实性** | ❌ 不受影响（记录真实，仅 OCLC 值不可核） |
| `call_number`（`9100/1035.13 vol.32` / `9100/3525 v.456`） | ❌ 不受影响（可在落盘字节中核到，保留） |
| C1–C9 的 `support_type` | ❌ 不受影响 |
| `SCAN_PAGE_VERIFIED = false` 结论 | ❌ 不受影响 |
| V1–V4 版本声明 | ❌ 不受影响 |
| Evidence Level 判定 | ❌ 不受影响（且本轮 validator 仍为 `NOT_RUN — SHELL_UNAVAILABLE`） |
| `fabricated_catalog` 计数 | ✅ 该 finding 项**已消解**（**真实理由**：两个值均可追溯至 `out-p3g` 捕获；**不是**「值已被移除」，见 §9） |

---

## 9. ⚠️ 更正：F-1 前提错误，两个 OCLC 值已恢复（append-only）

> **§1–§8 原样保留**（不删不改），供审计追溯。
> 本段记录该错误及其更正。

**发现**：round-2 fresh-context Reviewer（`docs/kb-002/46-l2-review-r2.md`）
finding **`RV2-01`（blocker）** 指出：F-1 的核心前提是错的。
**Captain 已亲自字节级独立复现**：

```text
out-p3g/princeton-A-9943038583506421.txt  3326 B  末字符 '}'  含 "value":["51793193"],"label":"OCLC"
out-p3g/princeton-C-9945512533506421.txt  2603 B  末字符 '}'  含 "value":["27170244"],"label":"OCLC"
```

**两份 JSON 都是完整文件**（以 `}}}}` 结束），**并未截断**；两个 OCLC 值
**一直在落盘证据中**，且**仅**出现在各自记录里 → **有来源、非虚构**。

**错误成因**：文件读取工具对**单行超长文件**会在 **2000 字符**处标注 `(line truncated)`。
Security(t4) 与 Reviewer(t5) 看到的是**该显示层截断**，误判为**文件本身被截断**，
进而得出「OCLC 字段从未进入落盘证据」。**落盘文件本身完整**
（`index.json` 的 `byte_length` = 3326/2603 与实测一致，`error` 为 `null`）。

**更正动作**：

| # | 项 | 原（错误） | 现 |
|---|---|---|---|
| 1 | §2「改为 unknown」 | 两值 → `unknown` | **恢复**为 `OCLC 51793193` / `OCLC 27170244`（`11` §9.14.28） |
| 2 | §1.3 截断理由 | 「该字段从未进入落盘证据」 | **推翻**：值一直在落盘中 |
| 3 | `fabricated_catalog = 0` 的理由 | 「值已被移除」 | **修正**为「两值均可追溯至 `out-p3g` 捕获」 |

**责任归属（不推诿）**：Captain 在 §9.14.27 中**采纳并扩写**了该错误前提，
未做字节级独立核验即写入更正台账，并将错误传播至
`37a` / `38` / `40` / `41`。**Captain 对本错误负责。**

**§41 遵守确认**：两个 OCLC 值**从未是虚构值** —— 它们有真实落盘来源。
所以「恢复」是**回归正确状态**，而非放宽标准。

**不影响**：C1–C9 `support_type` · V1–V4 · Evidence Level（仍 **E2**）· promotion（**NO**）。

---

## 7. Scope guard 遵守声明

**本任务仅修改**（均限于 OCLC 相关表述）：

```text
docs/kb-002/11-golden-001-evidence-matrix.md   （值更正 + 新增 §9.14.27 更正说明）
docs/kb-002/37a-l2-research-findings.md         （值更正 + 新增 §14 更正说明）
docs/kb-002/38-l2-evidence-curation.md          （值更正 + 新增 §8 更正说明）
```

并**新建**本文件 `docs/kb-002/42-l2-oclc-repair-record.md`。

**未修改**：`41-l2-final-report.md`（Captain 已自行更正；本次仅只读核验）·
`39-l2-qa.md` · `40-l2-security.md` · `41-l2-review.md` · candidate · manifest ·
Contract · Rubric · Q3 · validator · schema · ALIGN-03 · staging semantics ·
status semantics · production · 任何 business source。

**未执行**：任何扩大范围的改动 · 任何来源删除 · 任何 `support_type` 变更 ·
任何新的 OCLC 值或来源的伪造 · 任何全局模型迁移。

**未自行宣告 PASS**：本记录仅报告修复完成，**Gate 复核权在 Security(t4)**（§48）。
