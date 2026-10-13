# KB-002-L2 — GOLDEN-001 证据结构化记录（L2-CURATION-01）

**Task**: `t2` / `L2-CURATION-01`
**Attempt id**: `dce49733-506b-4162-88b9-9805dad6143f`
**Date**: 2026-10-12
**Status**: `L2_CURATION_COMPLETE`

> **append-only**。本文件为新建；Evidence Matrix 仅**追加** §9.14 小节。
> **未修改** candidate / manifest / Contract / Rubric / Q3 / validator / schema / ALIGN-03 /
> staging semantics / status semantics / production / 任何 business source / §0–§9.13 既有文字（§38 / §43）。

---

## 0. 上游输入（dependency results）

| 输入 | 角色 | 本批次的处理 |
|---|---|---|
| `docs/kb-002/37a-l2-research-findings.md`（830 行） | researcher `t1` | 结构化收录；采纳其两项**实质更正** |
| `docs/kb-002/37-captain-recon-p1-p2-p3.md` | Captain 侦察 | 结构化收录；**按 researcher 实测更正**其影印图像结论 |

**采纳的两项实质更正**（researcher 实测，本记录采纳）：

1. **影印图像并非「不可取得」**。CText viewer 前若干帧在无登录状态下即把图像 URL
   内联于 HTML（`https://library.ctext.org/s0840015/s0840015_NNNN.png`），可实际取得。
   已成功取得并**目视核验 3 帧**。
   → `SCAN_IMAGE_ACCESS` 更正为 `PARTIALLY_OBTAINED`。
   但**目标页 `page=47` 仍为登录门**，故 `SCAN_PAGE_VERIFIED` 仍为 `false`，
   **理由**须表述为「**目标页在登录门后，未绕过**」，而非「图像不可取得」。
2. **`ctext:6845436` 与目标内容无关**：其 `meta ctp-urn` 实测为 `ctp:ws6845436`，
   且页面含「該資料已刪除」；目标全文在 `chapter=917283`。

---

## 1. 交付物

| 交付物 | 动作 |
|---|---|
| `docs/kb-002/11-golden-001-evidence-matrix.md` | **追加 §9.14**（append-only；§0–§9.13 未改） |
| `docs/kb-002/38-l2-evidence-curation.md` | **新建**（本文件） |

**Evidence Matrix 追加规模**：既有 772 行（§0–§9.13）→ 追加后 1627 行。
**既有内容完整性**：line 1–772 逐字未变（见 §5 验证）。

---

## 2. 结构化收录的来源（17 条 `L2R2-SRC-*`）

每条均按 §39 填写**全部**必需字段；未知一律写 `unknown`。

| source_id | 内容 | HTTP | status | support_type |
|---|---|---:|---|---|
| `L2R2-SRC-001` | CText Library 记录页（res=78790） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-002` | 《夷門廣牘》系列 record（collection=56） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-003` | 影印翻页 record（file=83896，/94 页） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-004` | CText OCR 全文（chapter=917283，含锚点） | 200 | VERIFIED | **DIRECT**（C1–C9） |
| `L2R2-SRC-005` | CText 官方 OCR↔影印机制文档 | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-006` | 影印帧 1（封面／书名叶） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-007` | 影印帧 2（木刻目录叶） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-008` | 影印帧 3（木刻正文叶） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-009` | 目标影印页 page=47 | 200 | **ACCESS_RESTRICTED** | INSUFFICIENT |
| `L2R2-SRC-010` | 历史标识 chapter=6845436（已删除页） | 200 | VERIFIED（否定证据） | **CONTRADICTS** |
| `L2R2-SRC-011` | Princeton catalog（含 call_number / OCLC） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-011b` | Princeton 记录 C（臺灣商務印書館本） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-012` | 九州大学附属図書館 OPAC | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-013` | CiNii Books（BA55608705 / BN07716458） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-014` | 国立国会図書館 NDL Search | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-015` | 中華書局 2013 整理本（ISBN 9787101096132） | 200 | VERIFIED | INSUFFICIENT |
| `L2R2-SRC-016` | 万方同行评审论文（摘要层） | 200 | VERIFIED | **INDIRECT** |
| `L2R2-SRC-017` | 識典古籍（第三数字见证） | 200 | VERIFIED | **DIRECT**（附异文） |

### 2.1 字段齐备性（§39）自检

对每条 VERIFIED 条目逐项核对下述字段**均已填写**（未知写 `unknown`）：

```text
source_id ✅  URL ✅  status ✅  HTTP status ✅  retrieved_at ✅  byte_length ✅
SHA256 ✅  title ✅  institution ✅  work ✅  author ✅  edition ✅  date ✅
identifier ✅  page/folio ✅  passage ✅  source_type ✅  claim_links ✅
support_type ✅  independence_status ✅  limitations ✅
```

**说明**：`L2R2-SRC-011` 的 `SHA256` 记 `unknown`（该次实测未记录响应体 hash），
按 §39「未知写 unknown」处理，**未补造**。`L2R2-SRC-014` 的 `author` / `edition` / `date`
因页面为 Vue.js 渲染未逐字段提取，**记 `unknown`**，**未推测**。

---

## 3. 逐 Claim 支持判定（C1–C9，§40）

| Claim | 依据片段（CText `L2R2-SRC-004`） | support_type |
|---|---|---|
| **C1** 存在「蟹釀橙」条目 | 条目标题 `蟹釀橙`（`id=p97`） | **DIRECT** |
| **C2** 核心容器为橙 | `橙大者截頂` | **DIRECT** |
| **C3** 馅料为蟹膏/蟹肉 | `以蟹膏肉實其內` | **DIRECT** |
| **C4** 截顶/去穰/填入/覆顶 | `截頂，剜去穰，留少液` + `實其內` + `仍以蒂枝頂覆之` | **DIRECT** |
| **C5** 使用甑蒸 | `入小甑` … `蒸熟` | **DIRECT** |
| **C6** 蒸制介质含酒、醋、水 | `用酒、醋、水蒸熟` | **DIRECT** |
| **C7** 食用涉及醋/盐 | `加苦酒入鹽供` | **DIRECT**（措辞冲突保留） |
| **C8** 新酒/菊花/香橙/螃蟹意象 | `使人有新酒菊花、香橙螃蟹之興` | **DIRECT** |
| **C9** 引危巽斋赞蟹语 | `因記危異齋稹贊蟹云：「黃中通理…」` | **DIRECT** |

**每条均给出原文依据片段**，无一条仅凭条目存在性推断。

### 3.1 非正文类来源的 support_type（§33/§34/§40 严格限定）

| 来源类别 | support_type | 理由 |
|---|---|---|
| 机构馆藏 catalog（Princeton / 九州大 / CiNii / NDL） | **INSUFFICIENT** | §34 CATALOG ≠ PASSAGE |
| 影印容器 / 封面 / 目录帧 | **INSUFFICIENT** | 非目标条目页；不得推断（§33） |
| 学术文献（万方摘要） | **INDIRECT** | 讨论 work 整体，**不逐字给出「蟹釀橙」正文** |
| CText 机制文档 | **INSUFFICIENT** | 证明机制存在，不证明正文 |
| 历史标识 chapter=6845436 | **CONTRADICTS** | 否证「6845436 → 蟹釀橙」映射 |

> **未**将任何 catalog / 影印容器 / 学术文献标为 `DIRECT`。

### 3.2 保留的异文（不得平滑）

| Claim | Wikisource | CText | 識典 | 处理 |
|---|---|---|---|---|
| **C4** 覆顶 | 仍以**帶**枝頂覆之 | 仍以**蒂**枝頂覆之 | 仍以**帶**枝頂覆之 | 记 DIRECT，异文保留 |
| **C7** 调味 | **用醋鹽供食** | **加苦酒入鹽供** | **如苦酒，入鹽供** | 记 DIRECT，措辞冲突保留 |
| **C9** 人名 | 危**巽**齋 | 危**異**齋 | （未见） | 记 DIRECT，异文保留 |

**C7 说明**：CText 与 識典**同向**（「苦酒 + 鹽」），Wikisource **异**（「醋鹽」）。
「苦酒」古即指醋，**语义可能等价**，但**字面不同** → 记 `DIRECT` 但**保留冲突**，**不判定**何者为是。

---

## 4. 版本声明状态（V1–V4，§31）—— 未凭推测升级

| 声明 | 本轮后状态 | 是否升级 | 依据 |
|---|---|---|---|
| **V1** CText 标注《夷門廣牘》本 | **VERIFIED** | 维持 | `L2R2-SRC-001` 实测「詳細說明：《夷门广牍》本。」 |
| **V2** 《夷門廣牘》edition metadata | **PARTIAL** | **未升级** | 见 §4.1 |
| **V3** OCR 是否与扫描页建立可核验联系 | **PARTIALLY_VERIFIED** | **未升级为 VERIFIED** | 见 §4.2 |
| **V4** Wikisource 与 CText 是否同源 | **EVIDENCE_FOUND，未判定** | **未升级为结论** | 见 §4.3 |

### 4.1 V2 维持 PARTIAL 的理由

本轮取得多项机构书目元数据（edition / editor / publisher / series / call_number / OCLC / NCID），
较既有记录有实质进展，但**仍不升级**
（注：OCLC 值（`51793193` / `27170244`）**可在落盘 `out-p3g` Princeton 捕获中核到**，属可核验字段；§8 的「不可核」前提已由 §9 更正）：

1. 《夷門廣牘》**原刊年**在各来源中**未取得**统一可核验的具体年值
   （CText 作「明萬歷中刊本」；Princeton 作「明萬曆周履靖輯刊本」影印，**均无具体年**）；
2. 已取得的 1966 / 1990 / 2013 属**后世影印本 / 整理本**，**非**原刊年；
3. 按 §41 不补造 → **刊年记 `unknown`**；
4. 机械上调须由 **validator / 独立 Gate** 判定，**Curator 不得手工升级**（§42）。

### 4.2 V3 的严格两层措辞（关键区分）

| 层次 | 结论 |
|---|---|
| **连结层**：OCR 文字 ↔ 影印页锚点映射 | **已确证**（`lib83896.47/48/49` DOM 实测；条目行 href 直指 `page=47`；官方 `<scanbegin file= page= />` 机制） |
| **图像层**：该影印页图像本身 | **未取得**（`page=47` 登录门） |

```text
OCR_SCAN_LINKAGE_VERIFIED           = true
SCAN_IMAGE_OF_TARGET_PAGE_OBTAINED  = false
V3                                  = PARTIALLY_VERIFIED   （不升级为 VERIFIED）
```

> **不得**因「连结已确证」而表述为「扫描页已核验」。

### 4.3 V4：仅陈述事实，不下结论

**实测事实**：Wikisource 与 CText 存在 **3 处实质异文**（C4 覆顶 / C7 调味 / C9 人名），
且 CText 侧**有明确可核验的底本声明与影印支撑**，Wikisource 侧**无底本声明**。
此**倾向**说明二者并非同一转录链。

**保留**：本记录**不作** independence 升级判定 —— 该判定属 **QA / Security / Reviewer** 职权。
**不因「多站出现蟹酿橙」加分**：識典与 Wikisource 在「帶枝」「酒醋水」处**同向**，
**可能**共享电子底本，**不得**计为独立来源（§30）。

---

## 5. 影印核验判定（§32）与 append-only 验证

### 5.1 影印核验

| 条件 | 满足 | 依据 |
|---|---|---|
| 1. 属于目标 work | ✅ | viewer title「15山家清供」；帧 2「山家清供目錄」 |
| 2. edition provenance 可确认 | ✅ | 帧 1「景明刻本 夷門廣牘 十五」+ collection=56 |
| 3. 页面实际存在 | ✅ | `file=83896` `/94` 页；`page=47` HTTP 200 |
| 4. 能定位蟹釀橙 | ✅ | 锚点 `lib83896.47/48` → `page=47` |
| 5. **核心正文可核验（须见影印图像）** | ❌ | `page=47` 登录门，未取得 |

```text
SCAN_PAGE_VERIFIED = false      （理由：目标页在登录门后，未绕过）
SCAN_IMAGE_ACCESS  = PARTIALLY_OBTAINED   （同书前 3 帧已取得并目视核验）
```

### 5.2 append-only 验证（§37/§38）

| 项 | 值 |
|---|---|
| 追加前 | 772 行（§0–§9.13） |
| 追加后 | 1627 行 |
| 既有内容（line 1–772） | **逐字未变** |
| 新增内容 | §9.14（line 778 起），**纯追加** |
| 旧记录（INCIDENT-E / t82 FAILED / STAGING_WRITE_ORIGIN_UNKNOWN / Wikisource / CText） | **未删除、未改写** |

**验证方法**：写入后重新读取 line 1–772，与写入前读取内容逐字比对一致；
`§9.13.6` 末行（原 line 772）仍为原文，其下接空行与 `---` 分隔后为新增 §9.14。
（`git diff --numstat` 应显示**仅新增行**、无删除行。）

### 5.3 Candidate 完整性

```text
data/kb/golden/staging/golden_001.kb.json
  byte_length  27036
  SHA256       fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964
  → 与既有记录一致，**未改动**

data/kb/golden/staging/manifest.json
  byte_length  598
  SHA256       c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8
```

---

## 6. Evidence Level 重算（§42）—— 由正式 validator 机械计算

### 6.1 基线（本会话 `t2` 开始时实测复现）

```text
$ node scripts/kb002/validate-golden.mjs --staging
{"file":"data/kb/golden/staging/golden_001.kb.json","entityOrRelationId":"dish_g001_xieniangcheng",
 "fieldPath":"metadata.evidence_level","code":"KB002_DISH_BELOW_E3",
 "message":"Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: E2)"}
STAGING_CANDIDATE_COUNT = 1
STAGING_MANIFEST_PRESENT = true
STAGING_MANIFEST_ASSET_COUNT = 1
STAGING_VALID = true
PRODUCTION_ADMISSIBLE = false
KB-002 staging candidate PASSED (not production-admissible): 1 production-admission finding(s) reported above
exit = 0

$ node scripts/kb002/validate-golden.mjs --dataset
KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).
QUALIFIED_GOLDEN_COUNT = 0
SHORTFALL = 10
STATUS = EMPTY_GOLDEN_SET
KNOWN_DATA_GAP = 10
exit = 0
```

### 6.2 ⚠️ 本轮结束时的运行受限（诚实记录，不伪造）

本批次**收尾阶段**，执行环境对 `pwsh` / `node` 的进程启动**持续返回**：

```text
Error: spawn EPERM
```

该错误**连带最简命令**（`Write-Output "probe"`）亦复现 → 属**宿主 harness 层的进程启动限制**，
**非**本仓库、非 validator、非证据本身的问题。

**因此本轮对 validator 的复跑请求未能取得新的 stdout。** 处置：

| 项 | 处置 |
|---|---|
| **不伪造**任何 validator 输出 | 本条**如实标注**为「环境受限，未能复跑」 |
| 已完成且非受限的实测 | 见 §6.1（基线，**已实际取得**） |
| 证据对等级的影响 | 见 §6.3（**基于 §9.14.23 的机械判据推定，非人工指定等级**） |
| 后续 | **QA（t3）须在可执行环境中复跑** `--staging` / `--integrity` / `--dataset` 并作最终机械确认 |

> **重要**：`spawn EPERM` **不改变**任何证据的已实测状态 ——
> 本批次**全部** `VERIFIED` 条目的 HTTP 状态 / 字节数 / SHA-256 **均在受限发生之前**已实测取得并落盘。
> 受限**只**影响「本轮末再次复跑 validator」这一动作。

### 6.3 本轮 Evidence Level 重算状态（§42）

```text
EVIDENCE_LEVEL_RECOMPUTE = NOT_RUN — SHELL_UNAVAILABLE
```

**阻断原因**：`pwsh` 工具本轮**完全不可用** —— 每一次调用（含最简 `Write-Output "probe"`）
均返回 `Error: spawn EPERM`。三方（Captain、两个 subagent）互相印证，
属**宿主层 harness 限制**，非仓库 / validator / 证据问题。
本会话 approval 已禁用，**无法 escalation**，也**不应重试**。

**因此本轮未能取得新的 validator stdout。** 按 Captain 明文指令：

- **不**以 §6.1 的基线结果**冒充**本轮复跑结果；
- **不**手工把 E2 写成 E3（§42 严禁）；
- **不**伪造任何退出码或 validator 输出。

**§6.1 的基线仅供对照（outage 之前的实测），非本轮结果。**

### 6.4 对等级的非约束性观察（**非**等级认定）

以下**仅为基于已实测证据的机械判据陈述**，**不构成**等级认定，**不替代** validator 复跑：

- 本批次新增的是**影印锚点映射 / series provenance / 机构馆藏书目 / 整理本 metadata / 学术文献**；
- 按 Rubric 机械前置条件，C1–C9 的**最高支持仍为「数字转录正文（DIRECT）」**；
- **无**任何**影印原件正文**被实际核验（§33 OCR ≠ SCAN），故**预期不足以**触发等级上调。

```text
预期（未由本轮 validator 确认）：
  metadata.evidence_level  预期无变化
  Q3 best                  预期仍 E2（KB002_DISH_BELOW_E3）
  qualified                预期仍 false
  production               预期仍 0
```

> ⚠️ **上述预期必须由 QA（t3）在可执行环境中复跑 `--staging` / `--integrity` / `--dataset`
> 后方可确认为机械结果。** 本记录**不**将此预期表述为已验证结论。

**未修改 Rubric、未修改 validator、未重算 candidate、未 promotion、未手工指定任何等级。**

> **诚实边界（§43）**：若证据过不了 E3，**就是证据不足**。

---

## 7. 交付确认

| 项 | 状态 |
|---|---|
| Evidence Matrix 追加 §9.14 | ✅ 完成（append-only，line 1–772 未变） |
| 本文件（38）新建 | ✅ 完成 |
| §39 全字段填写 | ✅ 17 条来源逐项齐备，未知写 `unknown` |
| §40 support_type 限定 | ✅ 仅用 DIRECT / INDIRECT / INSUFFICIENT / CONTRADICTS |
| §31 V1–V4 维护 | ✅ 未凭推测升级 V2/V3/V4 |
| §32 SCAN_PAGE_VERIFIED | ✅ `false`（理由已更正） |
| §33 OCR ≠ SCAN | ✅ 严格遵守 |
| §34 CATALOG ≠ PASSAGE | ✅ 严格遵守 |
| §41 无虚构 | ✅ 全部字段来自实测或记 `unknown` |
| §42 等级 | ✅ 未手工升级；**已如实标注 `EVIDENCE_LEVEL_RECOMPUTE = NOT_RUN — SHELL_UNAVAILABLE`**（§6.3） |
| §43 toolchain freeze | ✅ 未改 Contract/Rubric/validator/schema |
| §37/§38 append-only | ✅ 旧记录未删未改 |
| Scope | ✅ 仅写 11（append）与 38 两个文件 |

**ACCEPTED_EVIDENCE = 0** —— 认定权属 QA / Security / Reviewer，本记录**不代行**。

---

## 8. 可追溯更正说明（F-1：无来源支撑的 OCLC 标识符）

> **本段为 append-only 追加的可追溯更正说明**，依据 Security(t4) finding **F-1**，
> 由 scoped repair task `t7 / L2-REPAIR-01` 执行（§48 角色隔离：**不由 Security 自行修复**）。
> **未删除**任何来源条目；**未改变**任何 `support_type`。

**发现**：`OCLC 51793193` 与 `OCLC 27170244` 在落盘证据库 `tmp/l2-evidence/` 中 **0 命中**。
对应 Princeton JSON 为**单行截断**，**在 OCLC 字段出现之前即已中断**（byte_length 约 3326 / 2603）。
同记录**其它**字段均可核到 → **记录真实，唯 OCLC 值无支撑**。

**逐条更正对照（原文 → 更正后 → 原因 → 时点）**：

| # | 位置 | 原文 | 更正后 | 原因 | 时点 |
|---|---|---|---|---|---|
| 1 | §2 来源清单表（`L2R2-SRC-011`） | `Princeton catalog（含 call_number / OCLC）` | `Princeton catalog（含 call_number；OCLC 值 F-1 更正为 unknown）` | F-1 | 2026-10-12 |
| 2 | §4.1 V2 理由 | `…series / call_number / OCLC / NCID…` | 移除 OCLC，并注明「OCLC 值经 F-1 更正为 unknown，**不计入**可核验字段」 | F-1 | 2026-10-12 |

**原则声明（§41 不虚构）**：采用「改为 unknown」方式（**未**补录任何新值）；
**未伪造**任何新的 OCLC 值或来源；call_number **未受影响**；Princeton 记录**未删除**；
`L2R2-SRC-011` / `011b` 的 `support_type = INSUFFICIENT` **未改变**。

**影响范围**：仅 OCLC 值及其表述。**不影响** C1–C9 的 `support_type`、
**不影响** V1–V4 版本声明、**不影响** Evidence Level 判定、**不影响** §6.3 的 `NOT_RUN — SHELL_UNAVAILABLE` 标注。

**跨文件一致性**：同一更正已同步至 `11-golden-001-evidence-matrix.md`（§9.14.27）、
`37a-l2-research-findings.md`（§14）、`41-l2-final-report.md`；完整记录见
`docs/kb-002/42-l2-oclc-repair-record.md`。

**复核**：本更正**不由** repair 方自行宣告 PASS；由 Captain 另建任务交 **Security(t4) 重跑本 Gate**（§48）。

---

## 9. ⚠️ 更正 §8：F-1 前提错误，两个 OCLC 值已恢复（append-only）

> **§8 原样保留**（不删不改），供审计追溯。本段记录该错误及其更正。

**发现**：round-2 fresh-context Reviewer（`docs/kb-002/46-l2-review-r2.md`）finding
**`RV2-01`（blocker）** 指出 F-1 前提错误。**Captain 已亲自字节级独立复现**：

```text
out-p3g/princeton-A-9943038583506421.txt  3326 B  末字符 '}'  含 "value":["51793193"],"label":"OCLC"
out-p3g/princeton-C-9945512533506421.txt  2603 B  末字符 '}'  含 "value":["27170244"],"label":"OCLC"
```

两份 JSON 均为**完整文件**（以 `}}}}` 结束），**并未截断**；两个 OCLC 值**一直在落盘证据中**
且**仅**出现在各自记录内 → **有来源、非虚构**。

**错误成因**：文件读取工具对**单行超长文件**在 **2000 字符**处标注 `(line truncated)`；
§8 把**显示层截断**误当**文件本身被截断**，遂误判「OCLC 字段从未进入落盘证据」。

| # | 项 | §8（错误） | 现（已恢复） |
|---|---|---|---|
| 1 | §2 来源清单表 `L2R2-SRC-011` | 「OCLC 值 F-1 更正为 unknown」 | 「含 call_number / OCLC」 |
| 2 | §4.1 V2 理由 | 移除 OCLC 并注明「不计入可核验字段」 | **恢复** OCLC 为可核验字段 |

**责任**：Captain 采纳并传播了该错误前提至 `11`/`37a`/`40`/`41`，**Captain 负责**。

**不影响**：C1–C9 `support_type` · V1–V4 · Evidence Level（仍 **E2**）· promotion（**NO**）。
**权威更正**：`11-golden-001-evidence-matrix.md` **§9.14.28**。