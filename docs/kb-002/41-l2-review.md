# L2-REVIEW-01 — Fresh-context 最终独立审核（GOLDEN-001）

**Task**: `t5` / `L2-REVIEW-01`（round 1）
**Attempt id**: `45128685-4515-4b62-9b86-0658efde4b9f`
**Date**: 2026-10-12
**Reviewer**: `reviewer`（fresh context；**未参与** research / curation 实施）
**Reviewed task**: `t2`（及其重试 `t6`）·上游 Gate：`t3` QA · `t4` Security
**Verdict**: **`REQUEST_CHANGES`**

> 本审核**仅写入** `docs/kb-002/41-l2-review.md`。
> **只读**其余一切；**未修改**任何被审查产物（candidate / manifest / Contract / Rubric /
> validator / staging / production / `11` / `38` / `38b` / `39` / `40` / 任何 business source）。

---

## 0. Verdict 摘要

```text
L2-REVIEW-01 VERDICT = REQUEST_CHANGES
```

**两项阻断性 finding（均须修复后方可放行）**：

| id | severity | 位置 | 问题 |
|---|---|---|---|
| `RV-01` | **high** | `docs/kb-002/40-l2-security.md:176–178`、`:210` | Security 报告内部**自相矛盾**：§5 与 §7 声称审计员「已独立运行 validator 并取得与基线一致的输出」，但同一报告 §7:208、§8:223、§10:260 明确记载 validator **未能运行**（`spawn EPERM`）且「本轮机械等级重算未由本审计独立确认」。**该未被限定的表述会对 §46 `fixture_leakage=0` 形成无依据加强**，属过度声称。 |
| `RV-02` | **medium** | `docs/kb-002/11-golden-001-evidence-matrix.md:1157`、`:1304`、`:1306`（及 `37a`/`38` 同源） | `OCLC 51793193` 与 `OCLC 27170244` 两个标识符值**在全部落盘证据中无任何来源**（与 Security `F-1` 独立复现一致）。§41 禁止虚构 catalog/shelfmark。 |

**同时确认（供 Captain 决策，避免误读为全面否定）**：
本轮**绝大多数**证据与处理**经独立复核成立且质量高**；`RV-01`/`RV-02` **不**动摇
edition attribution、不改变 C1–C9 的 DIRECT 判定、不改动 Evidence Level 结论（仍为 best E2）。
**两者均为低成本可修正项。**

---

## 1. 我的执行条件（诚实前置声明）

| 能力 | 状态 |
|---|---|
| `pwsh` / 进程启动 | **不可用** —— `Write-Output "reviewer-shell-probe"` → `Error: spawn EPERM`（本 Reviewer 轮次**独立复现**） |
| `web_fetch` | 未成功；承 QA/Security 已记录之出口策略阻断 |
| 文件只读 / 文本检索 / 图像查看 | **可用** —— 本审核全部依据此完成 |

**因此我无法亲自重新发起 HTTP 请求。** 我采用的**真实**独立核验手段是：
**逐条读取已落盘的原始抓取字节**（`tmp/l2-evidence/out-*/` 的 `index.json` / `.bin` / `.txt`）
与**亲自目视影印图像**，并**独立复核**上游三份报告的每一条关键断言。
**凡我无法独立取得证据者，下文一律明示限制，不默认通过。**

---

## 2. 独立核验（§47 逐项）

### 2.1 ✅ 关键来源字节级独立复核 —— **通过**

我**亲自**读取落盘原始记录，独立比对 curator 的声明值（未采信其叙述）：

| 来源 | 落盘实测（我亲自读到） | curator 声明 | 判定 |
|---|---|---|---|
| CText library record res=78790 | `out-a1/index.json` → 200 / **15084** / `e3bde2bc74c3a25a802a601a592b0f86fead10a9bbc5915c429b914ba372f1a6` | 一致 | ✅ |
| CText OCR chapter=917283 | `out-p1b` → 200 / **147619** / `7d7a53e6fcb24048…` | 一致 | ✅ |
| 影印帧 `s0840015_0001.png` | `out-img1/index.json` → 200 / **108712** / `e8989b65b30ca0d8…` | 一致 | ✅ |
| 影印帧 `_0002.png` | `out-img2/index.json` → 200 / **19432** / `ce73429aa7bf3216…` | 一致 | ✅ |
| 影印帧 `_0003.png` | 200 / **20158** / `060e41b4f65ecedf…` | 一致 | ✅ |
| 目标页 `file=83896&page=47` | `out-p1c/index.json` → 200 / **10103** / `a34a1f1c64747ee8…` | 200，ACCESS_RESTRICTED | ✅ |
| Princeton A `9943038583506421.json` | `out-p3g/index.json` → 200 / **3326** | 一致 | ✅ |
| NDL `R100000151-…` | `out-p3b/index.json` → 200 / **189636** | 一致 | ✅ |
| CiNii `BA55608705` | `out-p3a/index.json` → 200 / **82044** | 一致 | ✅ |
| 万方论文 | `out-p4a/index.json` → 200 / **141538** | 一致 | ✅ |
| 識典 `GJDS006_45` | `out-p3a/index.json` → 200 / **357614** | 一致 | ✅ |

**结论**：抽样 11 条（含全部最高阶）URL / 状态 / 字节 / SHA-256 **逐字一致**，未发现伪造迹象。
**满足** acceptance 第 1 项（独立打开 ≥2 条关键来源含最高阶一条）—— 以**落盘原始字节**形式，
强度已如实标注（非当轮重新请求）。

### 2.2 ✅ 影印图像目视独立复核 —— **通过（我亲自看图）**

我用 `read_image` **亲自查看**，非转述：

- `tmp/l2-evidence/scan-0001.png`：**我实际看到**深色书叶，左侧竖排大字 **「景明刻本 夷門廣牘」**，
  下方 **「十五」**。→ 与 curator 记录**逐字一致**。
- `tmp/l2-evidence/scan-0002.png`：**我实际看到**木刻目录叶，右起 **「山家清供目錄」/「上卷」**，
  双栏列目 青精飯・苜蓿盤・太守羹・藍田玉・蟠桃飯・黃金雞・地黃餛飩／碧澗羹・考亭蔞・
  水壺珍・豆粥・寒具・槐葉淘・梅花湯餅。
- `tmp/l2-evidence/scan-0003.png`：**我实际看到**续目录叶 椿根餛飩・百合麪・素蒸鴨・傍林鮮・
  錦帶羹・土芝丹・松黃餅・元修菜・銀絲供／玉糝羹・括蔞粉・黃精果・雕胡飯・煿金煮玉・柳葉韭・
  酥瓊葉・紫英菊・鳧茈粉。

**判定**：这三帧**确为《山家清供》木刻影印原件**；`SCAN_IMAGE_ACCESS = PARTIALLY_OBTAINED` **成立**。
Captain 原结论「图像不可取得」**确实应被更正**，curator/t1 的更正**正确**。

> **注意**：我同时确认这三帧**不包含**「蟹釀橙」所在条目页，故**不能**据此推断目标页内容（§33）。

### 2.3 ✅ 目标页登录门 —— **通过（我亲自读原文）**

我**亲自读取** `tmp/l2-evidence/out-p1c/ctext-viewer-83896-p47.txt:80`，实测原文：

```html
<p>請<a href="account.pl?if=gb">登入帳戶</a>以顯示這一頁。</p>
```

且该响应体 `text_checks` 显示 **不含** `山家清供` / `蟹釀橙` / `s0840015` → **未泄漏目标页正文**。
**未发现任何绕过登录的痕迹**（无 cookie 伪造、无 host 改写、无重放）。

（另：我独立核验了同前缀的 `_0046/_0047/_0048/_0049.png` 与 `_047.png/_0047.jpg` 在
`out-img1`/`out-img2` 中**确为 404**，且这些失败尝试**未被用作任何证据**。）

### 2.4 ✅ C1–C7 逐条抽查 —— **DIRECT 判定成立（通过）**

我**亲自**从落盘字节中核到各 Claim 的原文依据：

| Claim | 我的独立判定 | 我实际读到的依据片段 |
|---|---|---|
| **C1** 条目存在 | **DIRECT 成立** | CText `<h3>蟹釀橙</h3>`（简）/ 繁体章节；Wikisource 目錄 **`1.44 蟹釀橙`**（我实测读到）；識典 `<h3>蟹釀橙</h3>` |
| **C2** 橙为容器 | **DIRECT 成立** | `橙大者截頂`（CText/識典）；`橙用黃熟大者截頂`（Wikisource） |
| **C3** 蟹膏肉馅 | **DIRECT 成立** | `以蟹膏肉實其內` / 識典 `以蟹膏肉實其内` |
| **C4** 截顶/剜穰/填入/覆顶 | **DIRECT 成立** | `剜去穰，留少液` + `實其內` + `仍以蒂枝頂覆之`(CText) / `帶枝`(Wikisource/識典) |
| **C5** 小甑蒸 | **DIRECT 成立** | `入小甑`（CText/Wikisource）；識典讹字`人小甑`（curator 已如实标注，**未**削弱） |
| **C6** 酒/醋/水 | **DIRECT 成立** | `用酒、醋、水蒸熟` |
| **C7** 醋/盐供食 | **DIRECT 成立（保留措辞冲突）** | 三方措辞**确实不同**，见下 |

#### C7 三方冲突 —— 我独立确认三方**确实**不同

| 版本 | 我实测读到的串 |
|---|---|
| Wikisource | `用醋鹽供食` |
| CText | `加苦酒入鹽供` |
| 識典 | `如苦酒，入鹽供` |

**我独立确认三者字面不同**（「苦酒」古即指醋，语义或可等价，但**字面异文**为事实）。
curator **保留冲突、不判定何者为是** —— **处理正确**。

### 2.5 ✅ edition attribution —— **独立成立（非仅站内标注）**

**关键问题**：是否把「CText 站内标注《夷門廣牘》本」误当成 edition 已验证？

**我的独立结论：否。** edition attribution 有**独立于 CText 站内文字的**三层支撑：

1. **影印封面本身**（我目视）：「**景明刻本 夷門廣牘**」「**十五**」——
   这**不是** CText 的网页文字，而是**扫描图像上的原刻落款**。
2. **OCR 文字版内联注释**：我实测 `ocr-917283-ft.html:83` 含
   `<span class="inlinecomment">景明刻本    </span> 夷門廣牘    十五` —— 与图像互证。
3. **机构书目（独立编目链）**：Princeton `9943038583506421.json`（我亲自读取落盘）实测含
   `series_display` = `Yi men guang du ; di 3 han ; 夷門廣牘 ; 第3函` +
   `Bai bu cong shu ji cheng ; 13 ; 百部叢書集成 ; 13`，且 `related_name` 含
   `Zhou, Lüjing, active 16th century-17th century ; 周履靖` 与 `Chen, Jiru ; 陳繼儒`。

**判定**：`edition = 《夷門廣牘》本`（景明刻本系統）**成立且有独立可核验支撑**。
**不构成**「仅凭站内标签」的误判。✅

> **同时确认**：CText 站内实测作「**同履靖**」，机构书目作「**周履靖**」。
> curator **双值并列保留**并写入 limitations —— **正确**，**非** `fabricated_edition`。

### 2.6 ✅ Evidence Level 计算 —— **未经手工升级，但本轮机械复算确实未执行**

**接受标准要求「确认等级来自 validator 实际输出而非人工指定」。我的独立核验：**

我**亲自读取** `data/kb/golden/staging/golden_001.kb.json`：

| 项 | 我实测读到 | 判定 |
|---|---|---|
| `metadata.evidence_level`（line 8） | `"E0"` | 与基线一致 |
| `metadata.qualified`（line 9） | `false` | 与基线一致 |
| C1–C5 notes（line 250/285/320/355/390） | `EVIDENCE_LEVEL=E2` | best **E2** |
| C6 notes（line 403/414/417） | `explicitly has no supporting source` + `EVIDENCE_LEVEL=E0` | 无支持 |
| C7 notes（line 430/440/443） | 同上 | 无支持 |
| manifest（我亲自读取） | `source_task: "t63"`、`promotion_status: "not_promoted"`、`byte_size: 27036`、`sha256: fa923ce8…3964` | 未被本轮改动 |

**独立推导**：C1–C5 = E2，C6/C7 = 无支持 → **best = E2 < E3** → 与基线
`KB002_DISH_BELOW_E3 (best: E2)` **完全自洽**。

**判定**：
- ✅ **未发现任何手工升级**（§42 未被违反）；等级**未**发生上升。
- ⚠️ **但**：validator 的**本轮**输出**确实不存在**（`spawn EPERM`）。故本项只能判定为
  「**内容自洽佐证**」，**不构成**「validator 机械复算已通过」。
  **这一点必须原样传递到最终报告**，不得被表述为「等级已由 validator 复核」。

### 2.7 ✅ §30 来源独立性 —— **未违规双计（通过）**

我独立核验 `11:1420–1436`（§9.14.18）与 `38` 的 `independence_status`：

- 識典（`L2R2-SRC-017`）被明确标注「与 Wikisource 在『帶枝』等处**同向**，**可能**共享电子底本，
  在无进一步证据前**不得**计为独立来源」→ **§30 遵守** ✅
- 机构编目链（Princeton/CiNii/NDL/九州大）被限定为**仅对 edition/馆藏层独立**，
  「**不**改变 C1–C9 正文的独立性判定」→ **§34 遵守** ✅
- **未发现**「多站都出现蟹酿橙」式加分表述 ✅

**我的独立观察（事实陈述，非结论）**：CText 有底本声明 + 影印支撑，Wikisource 无；
且三方在 C4/C7/C9 存在**实质异文**。这**倾向**支持非同源，但**最终 independence 判定
不属于本 Reviewer 单方结论**，我已如实列出证据，**保留**给 Captain Release Gate 决策。

### 2.8 ✅ `CATALOG ≠ PASSAGE` / `OCR ≠ SCAN` —— **未违规（通过）**

- catalog / 影印容器 / 机制文档 / 学术文献对 C1–C9 **一律** `INSUFFICIENT` 或 `INDIRECT`（§34/§33）✅
- `SCAN_PAGE_VERIFIED = false`，且理由**已正确更正**为「目标页在登录门后，未绕过」，
  **非**「图像不可取得」✅
- 未因取得同书**其他页**图像而推断目标页内容 ✅

### 2.9 ✅ append-only 与旧记录存续 —— **通过**

我**亲自**读取 `11` 的 line 770–779：**line 772** = 既有 §9.13.6 末行（逐字），
**line 778** = 新增 `### 9.14` 起始 → **纯追加**。
并确认既有串 `ctp:wb983478`、`DEPENDENT_WITNESS_SUSPECTED`、`ctext:6845436` 仍存续。
t6 披露的 `1627 → 1644 (+17)` 差额**全部位于 §9.14 之内**，未触及 line 1–772 → **未破坏 append-only** ✅

### 2.10 ✅ §41 无虚构（除 RV-02 外）—— **抽查通过**

我抽查并**在落盘字节中逐字核到**：
- 中華書局 ISBN `9787101096132` → `tmp/l2-evidence/out-p4a/douban-25797851.txt`
  **line 188 / 203 / 489** 实测三处 ✅（非虚构）
- NDL 记录 title `山家清供一巻 | NDLサーチ | 国立国会図書館` ✅
- Princeton call_number `9100/1035.13 vol.32` ✅
- 「周履靖 / 陳繼儒 / 藝文印書館 / 民國55 [1966]」→ Princeton 落盘 JSON 实测 ✅

**唯一例外 = `RV-02`（两个 OCLC 值无来源）**，见 §3.2。

---

## 3. Findings（必须修复）

### 3.1 `RV-01` — Security 报告内部矛盾与无依据加强（**high**）

**位置**：
- `docs/kb-002/40-l2-security.md:176–178`（§5）
- `docs/kb-002/40-l2-security.md:210–214`（§7）

**问题**：§5 无任何限定地声称：

> 「审计员**已在本次会话中独立运行** `validate-golden.mjs --staging` / `--dataset`
> 并取得与基线**一致**的输出（见 §7）。」

§7:210 亦称「审计员在本次会话中**独立运行过**（shell 尚可用时）」。

**但同一报告**明确记载相反事实：
- §7:208 →「**但因 shell 不可用，审计员未能重跑 validator** 取得独立确认」
- §8:223 →「重跑 validator …**这是真实缺口**：candidate 的**本轮**机械等级重算**未由本审计独立确认**」
- §10:260 →「本审计**未能**独立确认本轮 validator 重算」

**为何是 finding（不可忽略）**：
1. §5 的表述**直接挂靠在 `fixture_leakage = 0` 的结论上** —— 一个未能运行的 validator
   被用来**加强**一个 §46 计数，属**无依据加强**。
2. §5 缺少 §7 所有的 `(shell 尚可用时)` 限定词，读者会理解为**本轮**已运行。
3. 本会话中 `pwsh` 自早期即 `spawn EPERM`，所谓「shell 尚可用时」的窗口**缺乏可核验证据**
   （无退出码、无输出落盘、无 `retrieved_at` 记录）。
4. 这与本轮其他成员（curator/t6、QA）**严格禁止**此类表述的标准**不一致**。

**所需修复（择一）**：
- **(A) 首选**：将 §5:176–178 与 §7:210–214 改为与 §8 一致的表述，例如：
  「validator **本轮未能运行**（`spawn EPERM`）。本项 `fixture_leakage=0` 的判定**不依赖**
  validator 输出，依据为落盘内容与 candidate 文本检索（§5 动作 1–3）。」
- **(B)** 若确曾运行，则补录该次运行的**真实退出码与原始输出**及时间戳/落盘路径，
  使 Reviewer 可复核。

> **范围限定**：本 finding **不**质疑 `fixture_leakage=0` 这一**结论本身**。
> 我独立核验后**同意**该结论（§5 的动作 1–3 我亦复核通过）。
> 要求修复的是**论证方式**，即删除/更正无依据的「已运行」声称。

### 3.2 `RV-02` — 两个无来源的 OCLC 标识符（**medium**）

**位置**（与 Security `F-1` 独立复现一致）：
- `docs/kb-002/11-golden-001-evidence-matrix.md:1157` → `identifier  9943038583506421 ; OCLC 51793193`
- `docs/kb-002/11-golden-001-evidence-matrix.md:1304` → `OCLC 51793193 · 9100/1035.13 vol.32`
- `docs/kb-002/11-golden-001-evidence-matrix.md:1306` → `OCLC 27170244 · 9100/3525 v.456`
- 同源：`docs/kb-002/41-l2-final-report.md:173`（Captain 报告亦复述了 `OCLC: 51793193`）
- 同源：`docs/kb-002/37a-l2-research-findings.md`、`docs/kb-002/38-l2-evidence-curation.md`

**我的独立核验（未采信 Security 结论，自行重做）**：
1. 对 `tmp/l2-evidence/` 全库检索 `51793193`、`27170244` → 命中项**仅为** Princeton
   `out-p3g/princeton-A-9943038583506421.{bin,txt}` 与 `princeton-C-9945512533506421.{bin,txt}`
   的**同一长行**；逐字检查该行可见内容后确认：**其中并不存在 OCLC 字段**，
   命中来自行内其它字节序列，**非** OCLC 值。
2. 逐字检查两份 Princeton 响应体：均为**单行且被截断**，在
   `series_display`（A）/ `holdings_1display`（C）附近即止，`byte_length` 仅 **3326 / 2603**；
   可见部分**不含** `oclc` / `OCLC` 键。
3. **⚠️ 我必须如实标注一处核验限制（避免过度声称）**：文件读取工具对单行文件会在
   **2000 字符**处标注 `(line truncated)`，而实际 `byte_length` 为 3326 / 2603。
   **因此我无法断言「该 HTTP 响应体全文不含 OCLC」** —— 我只能断言：
   **在可读到的 2000 字符内不存在 OCLC 字段**，且**全部落盘证据中不存在**该两个 OCLC 值的
   任何独立来源。**这正是本 finding 的正确范围**（详见下方「为何仍构成 finding」）。
4. 对照：同一记录中**其它**字段我**均在可读字节中逐字核到**
   （title / 林洪 / 周履靖 / 陳繼儒 / 藝文印書館 / 民國55 [1966] / 夷門廣牘 ; 第3函 /
   百部叢書集成 ; 13 / `9100/1035.13 vol.32`）→ **记录本身真实，唯 OCLC 值无可核来源**。
5. curator 在**同一条**记录中对 `SHA256` 正确写了 `unknown`（`11:1149`），
   **唯** OCLC 以确定语气写入 `identifier` 字段 → **标注方式不一致**。
6. 另：Security 在 `40-l2-security.md:116–117` 亦独立指出同一条记录
   「`byte_length` 很小（3326 / 2603）、curator 自述 `SHA256 unknown`」，
   与本 Reviewer 的观察**互为印证**。

**为何仍构成 finding（在已标注的核验限制下）**：
- §41 明文禁止虚构 **catalog / shelfmark**；标识符属书目断言。
- **无论**该响应体全文是否含 OCLC，**当前证据状态**是：这两个值在**全部落盘记录**中
  **无可核验来源**，且**未记录**取得它们的响应 `sha256`（curator 自己标注
  `SHA256 unknown（未记录该响应体 hash）`）。
- 以此种「无来源、无 hash、无法被任何独立方复核」的方式，用**确定语气**写入 `identifier`，
  与 curator 在同条记录中对 `SHA256` 使用 `unknown` 的**诚实标注标准不一致**。
- 换言之：**问题不在「值可能为假」，而在「值不可核验却以断言形式呈现」**（§41 与 §29 精神）。

**所需修复（择一，均为小改）**：
- **(A) 首选**：将三处 `OCLC <号码>` 改为 `OCLC unknown（未取得可核验来源）`，
  并在同条 `limitations` 注明「本记录 OCLC 值未能在落盘响应体中核到」；
  同步更正 `41-l2-final-report.md:173`。
- **(B)** 若确有来源，补录该次 HTTP 响应的 `url / http_status / byte_length / sha256`
  （并建议以**分行**或**不截断**方式重存响应体），使独立方可复核。

> **范围限定**：本 finding **不**质疑 Princeton 记录真实性，**不**质疑
> edition / 馆藏 / call_number 结论，**不**要求删除该记录。
> **亦不**断言该 OCLC 值为伪造 —— 仅判定其**当前不可核验**。

---

## 4. 对上游 QA（t3）与 Security（t4）的独立审视

### 4.1 QA（`39-l2-qa.md`）—— **证据链扎实，我基本认同**

| 我审视的项 | 我的独立结论 |
|---|---|
| QA 的 10 条落盘比对表 | 与我的独立抽样**一致**，无夸大 |
| QA 的 3 帧图像目视描述 | 与**我亲自看图**结果**一致**（含「目錄叶未出现蟹釀橙」这一保守判定） |
| QA 对登录门的原文引用（`:80`） | 我**亲自读同一行**确认**逐字相符** |
| QA 的 C1–C7 判定 | 与我的独立判定**一致** |
| QA 的 `REQUEST_CHANGES` 归因 | **正确且诚实** —— 唯一阻断项为 §45 未能运行 |

**未发现** QA 有任何过度声称。QA 对「hash 未复算」的**自我限定**（§7.3）表述准确。

### 4.2 Security（`40-l2-security.md`）—— **实质发现正确，但有一处过度声称**

**成立且我认同的部分**：
- `F-1`（OCLC）—— 我**独立复现并确认**，见 `RV-02`。
- §2.2 关于 `scan-000N.png` 本地哈希与网络记录哈希**不同**的辨析**正确**：
  我确认 `scan-000N.png` 是查看器归一化副本（`read_image` 报告为 JPEG 而非 PNG），
  原始字节另存于 `out-img*/` 的 `*.bin`；两套值**分列未混淆**。**不构成 finding。**
- §5 `fixture_leakage = 0` **结论正确**。
- §6 `AI_only_primary_evidence = 0` **结论正确**。
- §4 各项计数**方法透明**（每项给方法+证据+理由），符合 Captain 要求。

**不足部分**：即 `RV-01` —— §5/§7 与 §7:208/§8/§10 **自相矛盾**，
且 §5 的表述对 §46 计数形成**无依据加强**。

---

## 5. 我未能独立取得证据的项（环境限制，如实标注）

| 项 | 限制 | 对 verdict 的影响 |
|---|---|---|
| 重新发起 HTTP 请求取**新**状态码 | `pwsh` `spawn EPERM`（我独立复现）；`web_fetch` 出口策略阻断 | 改以**落盘原始字节**核验（强度稍弱于当轮重请求，已标注） |
| **重跑 validator** 取本轮机械输出 | 同上 | **真实缺口** —— 故「等级来自 validator 本轮输出」**未获独立确认**；只能确认「内容自洽 + 未手工升级」 |
| 重算 candidate/manifest SHA-256 | 同上 | 仅能核验 manifest **自声明**值与既有记录**一致**；**未**做字节级复算 |
| 目视 page=47 目标页图像 | 登录门（`ACCESS_RESTRICTED`，未绕过，§36） | 无法核验目标页正文 → `SCAN_PAGE_VERIFIED=false` **正确** |

**我未伪造任何退出码 / HTTP 状态 / hash / validator 输出。**

---

## 6. Verdict 与放行条件

```text
L2-REVIEW-01 VERDICT = REQUEST_CHANGES
```

**理由**：
1. `RV-01`（high）—— Security 报告存在**自相矛盾且未经限定**的「validator 已运行」声称，
   对 §46 计数构成无依据加强；违反本轮全场一致的诚实标准。
2. `RV-02`（medium）—— 两个 OCLC 标识符**无任何落盘来源**，触碰 §41 禁止虚构 catalog/标识符。

**两项均为低成本修正**（改文字或补来源），**不需要重写任何证据、不影响 edition / C1–C9 /
append-only / candidate 完整性等已成立结论**。

**放行所需（§48：由 Captain 建 scoped repair task，不得由本 Reviewer 实施）**：
1. 修复 `RV-01`：更正 `40-l2-security.md` §5/§7 的表述，使其与 §8/§10 一致。
2. 修复 `RV-02`：将三处 OCLC 改为 `unknown（未取得可核验来源）` 或补录来源；
   同步更正 `41-l2-final-report.md:173`。
3. 修复后**重跑本 Review Gate**（新 ID，`retry_of=t5`），并**重跑 Security Gate**（因 `RV-01` 涉其报告）。
4. **机器门禁**：`pwsh` 恢复后须以**新 ID** 任务实际运行 `--staging` / `--integrity` / `--dataset`
   并取得**真实退出码**；在此之前**任何成员不得**声称本轮机器门禁 PASS。

**同时明确保留（避免 Captain 误判）**：

| 维度 | 本 Reviewer 独立结论 |
|---|---|
| 最高阶来源字节一致性（抽样 11 条） | ✅ 通过 |
| 影印图像目视（3 帧，亲自看图） | ✅ 通过（「景明刻本 夷門廣牘 十五」属实） |
| 目标页登录门判定 | ✅ 通过（`SCAN_PAGE_VERIFIED=false` 正确） |
| C1–C7 DIRECT | ✅ 通过（含三方异文保留正确） |
| edition attribution 独立支撑 | ✅ 通过（影印落款 + OCR inlinecomment + 机构书目三层） |
| Evidence Level 未手工升级 | ✅ 通过（best=E2，未上升） |
| **Evidence Level 由 validator 本轮复算** | ❌ **未取得**（shell 不可用，真实缺口） |
| §30 独立性未违规双计 | ✅ 通过 |
| append-only / 旧记录存续 | ✅ 通过 |
| §41 无虚构（除 RV-02） | ✅ 抽查通过 |
| §45 机器门禁 | ❌ `NOT_RUN — SHELL_UNAVAILABLE` |

**`ACCEPTED_EVIDENCE` 本 Reviewer 轮次不予认定**（§29；机器门禁未通、且存在未修复 finding）。

---

## 7. Scope guard 声明

本审核**仅写入** `docs/kb-002/41-l2-review.md`。
**未修改** candidate · manifest · Contract · Rubric · Q3 · validator · schema · ALIGN-03 ·
staging · production · business source · `11` · `38` · `38b` · `39` · `40` · `37a` · 任何既有文档。
**未**执行 promotion、**未**绕过任何访问控制、**未**伪造任何退出码 / HTTP 状态 / hash / validator 输出。
