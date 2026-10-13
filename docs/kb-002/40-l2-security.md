# KB-002-L2 — Security / Provenance 独立审计（L2-SECURITY-01）

> ## ⚠️ 当前状态附加说明（Captain addendum，2026-10-12；**已按 round-2 Reviewer `RV2-01`/`RV2-03` 更正**）
>
> **本文件正文（含 §0–§10）是 t4 的「修复前」历史审计快照，内容仍然真实、保留不改。**
> 但正文中的 §46 计数（尤其 `fabricated_catalog = 1 类（2 个值）` 与「不满足全部为 0」）
> **不代表当前产物的状态**。当前权威状态如下：
>
> | 项 | 当前状态 |
> |---|---|
> | `F-1` 的**前提** | ⚠️ **已被推翻** —— round-2 Reviewer `RV2-01`（blocker）证明两个 OCLC 值**一直在落盘证据中**；Captain 已字节级复现。详见 `11` **§9.14.28** |
> | `OCLC 51793193` / `27170244` | **已恢复为确定值**（原值**有来源、从未是虚构值**）—— 分别见 `out-p3g/princeton-A-*`、`princeton-C-*`（均 200，3326 / 2603 B，完整 JSON） |
> | `fabricated_catalog`（**当前产物**） | **`0`** —— **理由**：两个 OCLC 值**均可追溯至落盘 Princeton 捕获**（有来源、非虚构）。**不是**「值已被移除」 |
> | 当前权威 Security 结论 | **t13 / `docs/kb-002/44-l2-security-r2.md`** = **PASS**，范围限 (a) 九项 §46 计数在当前产物下为 0、(b) t7 与 t10 两项 scoped 修复已闭合 —— **但 t13 亦沿用了 `RV2-01` 的错误前提**，故其理由须以本说明及 `11` §9.14.28 为准 |
> | `RV-01`（validator 措辞） | **已修复** —— 由 **t10** 见本文件 §5/§7（现明确 `NOT_RUN — SHELL_UNAVAILABLE`）；修复记录 `docs/kb-002/43-l2-rv01-repair-record.md` |
> | §2.2 图像哈希 | ⚠️ **已更正** —— `scan-000N.png` 与网络捕获**字节完全相同**；`95e1f7a0…` 等是 `read_image` **预览**摘要，非文件摘要（见 `RV2-02` 更正段） |
> | 机器门禁 | **Security 的 PASS 明确不含机器门禁**。QA 轮次 **t12** 后来**实际运行** `validate-golden --staging` / `--integrity` / `--dataset`（**均 exit 0**；staging `STAGING_VALID=true` / `PRODUCTION_ADMISSIBLE=false` / Q3 best E2；dataset `QUALIFIED=0` / `SHORTFALL=10` / `EMPTY_GOLDEN_SET`）—— 该运行是**独立的 QA 证据**，**不是**本 Security 审计自己的运行，不得混同 |
>
> **未改动**：本文件其它 §46 计数、证据记录与审计发现（历史原样保留）。
> **署名**：本附加说明由 **Captain** 追加（原 per QA-R2-01，现按 `RV2-01`/`RV2-03` 更正）；
> **不是** security 成员自己的结论，**不冒充**其署名。
> **责任**：Captain 采纳并传播了 F-1 的错误前提，**Captain 负责**。

---

**Task**: `t4` / `L2-SECURITY-01`
**Attempt id**: `1d87a7d9-cd16-4ff0-bb9e-4e6d134cbf3d`
**Date**: 2026-10-12
**Auditor**: security（独立于 researcher / curator）
**Verdict**: **`REQUEST_CHANGES`** ← **历史快照（修复前）**；当前权威结论见上方附加说明与 `44-l2-security-r2.md`

> 默认只读审计。**未修改** candidate / manifest / Contract / Rubric / Q3 / validator / schema /
> ALIGN-03 / staging / production / 任何 business source / 任何既有文档。
> 本次仅写入本文件（`docs/kb-002/40-l2-security.md`）。

---

## 0. 结论摘要

**多数 provenance 声明经独立核验通过**；但有**一项**实质性、可复现的 provenance 缺陷，
按 §41（禁止虚构 catalog / identifier）**必须**在放行前修正，故给 `REQUEST_CHANGES`。

| 项 | 结果 |
|---|---|
| 落盘字节比对覆盖 | 全部 `out-*/index.json`（约 40 份）+ 3 帧影印图像 |
| 逐条不符 | **1 类**（OCLC 标识符，2 个值，见 §3） |
| 影印图像目视核验 | ✅ 通过（3/3 帧，审计员亲自 `read_image`） |
| C7 三方措辞冲突 | ✅ 属实（审计员亲自从源字节核出） |
| candidate / manifest 完整性 | ✅ 通过（与验收期望值逐字一致） |
| append-only | ✅ 通过（line 776/778 边界清晰） |
| fixture_leakage | ✅ 0（见 §5） |
| AI_only_primary_evidence | ✅ 0（见 §6） |

---

## 1. 审计方法（在 shell 不可用条件下的真实核验手段）

本轮宿主环境对 `pwsh` / `node` 的进程启动返回 `Error: spawn EPERM`（含最简 `Write-Output`），
且 `web_fetch` 被出口策略阻断（non-public IP）。**审计员未重试受限操作，也未伪造任何 HTTP 状态 / 退出码 / hash。**

审计改为**只读可实证**路径 —— 这同样是**真实的 provenance 核验**，且强度不低于重新打开 URL：

| 手段 | 说明 | 覆盖 |
|---|---|---|
| **(a) 落盘原始字节比对** | 逐条读取 `tmp/l2-evidence/out-*/index.json`，比对 curator 声明的 url / http_status / byte_length / sha256 / text_checks | 全部来源 |
| **(b) 亲历文本核验** | 直接在落盘 `.txt`/`.bin` 中 grep 目标字符串（原文片段、ISBN、call_number、系列名） | C1–C9、P3、P4 |
| **(c) 亲自目视核验** | 用 `read_image` 亲自查看 3 帧影印图像 | fabricated_page |
| **(d) 落盘文件系统核验** | candidate / manifest 存在性与 SHA-256、append-only 边界、scope | 完整性 |

**声明**：下述每条判定均给出「看到什么证据」。凡审计员**无法**取得独立证据者，一律明示限制，**不默认写 0**。

---

## 2. 逐条来源比对结果（落盘字节 vs curator 声明）

### 2.1 完全一致（独立核验通过）

| source_id | URL（关键片段） | 落盘 http_status | 落盘 byte_length | 落盘 sha256（前缀） | curator 声明 | 判定 |
|---|---|---:|---:|---|---|---|
| L2R2-SRC-001 | `library.pl?if=gb&res=78790&by_title=…` | 200 | 15084 | `e3bde2bc74c3a25a…` | 一致 | ✅ |
| L2R2-SRC-002 | `library.pl?if=gb&collection=56` | 200 | 22162 | `32875299513fde7a…` | 一致 | ✅ |
| L2R2-SRC-003 | `library.pl?if=gb&file=83896&page=1` | 200 | 15046 | `e63b0a94f5a31e92…` | 一致 | ✅ |
| L2R2-SRC-004 | `wiki.pl?if=gb&chapter=917283` | 200 | 147619 | `7d7a53e6fcb24048…` | 一致 | ✅ |
| L2R2-SRC-005 | `instructions/ocr/zhs` | 200 | 80714 | `29f6d654768b7065…` | 一致 | ✅ |
| L2R2-SRC-006 | `library.ctext.org/s0840015/s0840015_0001.png` | 200 | 108712 | `e8989b65b30ca0d8…` | 一致 | ✅ |
| L2R2-SRC-007 | `…/s0840015_0002.png` | 200 | 19432 | `ce73429aa7bf3216…` | 一致 | ✅ |
| L2R2-SRC-008 | `…/s0840015_0003.png` | 200 | 20158 | `060e41b4f65ecedf…` | 一致 | ✅ |
| L2R2-SRC-009 | `library.pl?if=gb&file=83896&page=47` | 200 | 10103 | `a34a1f1c64747ee8…` | 一致 | ✅ |
| L2R2-SRC-010 | `wiki.pl?if=gb&chapter=6845436` | 200 | 11371 | `db35729b05dd9ad0…` | 一致 | ✅ |
| L2R2-SRC-011 | `catalog.princeton.edu/catalog/9943038583506421.json` | 200 | 3326 | （记 unknown） | 一致 | ⚠️ 见 §3 |
| L2R2-SRC-011b | `catalog.princeton.edu/catalog/9945512533506421.json` | 200 | 2603 | `6be09dbabb9116f4…` | 一致 | ⚠️ 见 §3 |
| L2R2-SRC-012 | `api.lib.kyushu-u.ac.jp/opac_details/?…bibid=1000767294` | 200 | 74154 | `eff26ccf1d8a7546…` | 一致 | ✅ |
| L2R2-SRC-013 | `ci.nii.ac.jp/ncid/BA55608705` | 200 | 82044 | `6c30f293ca811c5c…` | 一致 | ✅ |
| L2R2-SRC-014 | `ndlsearch.ndl.go.jp/books/R100000151-…` | 200 | 189636 | `eceeac0b35ee2998…` | 一致 | ✅ |
| L2R2-SRC-015 | `book.douban.com/subject/25797851/` | 200 | 113974 | `a63459ab3559ee8b…` | 一致 | ✅ |
| L2R2-SRC-016 | `med.wanfangdata.com.cn/Paper/Detail?id=…202305006` | 200 | 141538 | `a67824bb85d94f51…` | 一致 | ✅ |
| L2R2-SRC-017 | `shidianguji.com/zh/book/GJDS006/chapter/GJDS006_45` | 200 | 357614 | `6bdf7b650062c877…` | 一致 | ✅ |

**结论**：17 条来源的 **URL / HTTP 状态 / 字节数 / SHA-256 全部与落盘记录一致**，无一条存在
URL 臆造、状态码伪造或字节数/哈希不符迹象。

### 2.2 审计员额外发现：本地 `scan-000N.png` 与网络记录哈希**不同** —— 非缺陷

> **⚠️ 本小节结论已被 round-2 Reviewer `RV2-02`（high）更正 —— 见下方更正段。**
> **历史文本原样保留**。

审计员在核验时注意到：`tmp/l2-evidence/scan-000{1,2,3}.png` 的 sha256
（`95e1f7a0…` / `a389d195…` / `40bc7831…`）与网络记录中 `s0840015_000{1,2,3}.png` 的
sha256（`e8989b65…` / `ce73429a…` / `060e41b4…`）**不同**。

**经查明，这不是矛盾，也不是缺陷**：
- `scan-000N.png` 是**查看器/归一化副本**（`read_image` 实测将其报告为 JPEG 而非 PNG，
  说明已被重新编码）；网络原始字节另存于 `out-img1`/`out-img2`/`out-a4` 的 `*.bin`。
- Captain 在 `docs/kb-002/37-captain-recon-p1-p2-p3.md:164–168` **明确**把该组哈希标注为
  「Captain 读取值」，与网络记录哈希**分列**，**未混淆**。
- 两套值各自可复算，**无一条被冒充为对方**。

**判定**：透明、可复核。**不构成 finding。**

#### ⚠️ 更正段（Captain，per round-2 `RV2-02`，2026-10-12）

**上述结论有误，已由 Captain 字节级复现更正**：

| 文件 | 实测 SHA-256（`Get-FileHash`） | 字节 | 与网络捕获 |
|---|---|---:|---|
| `scan-0001.png` | `e8989b65b30ca0d85b84f3a80eeb2b9e366434cb6d9a3a11616185eb02076cad` | 108712 | **完全相同** |
| `scan-0002.png` | `ce73429aa7bf32165327b368804aa55986baa198203b71c1ef16cf9fa62945b6` | 19432 | **完全相同** |
| `scan-0003.png` | `060e41b4f65ecedfba3a6bb4c204e3f606a50bb42a198cdd7a304ab6f4dfd3ff` | 20158 | **完全相同** |

**事实**：三帧 `scan-000N.png` 与 `library.ctext.org` 网络捕获**字节完全一致**
（同 SHA-256、同字节数、均为合法 PNG，头 `89 50 4E 47`）。
它们**不是**「归一化/重新编码副本」。

**`95e1f7a0…` / `a389d195…` / `40bc7831…` 的真实身份**：
这三个是 `read_image` 工具对其**预览副本**报告的摘要，
**不是**这些文件的 SHA-256。`read_image` 同时报告「source digest」为 `e8989b65…` 系列
（即真实文件摘要）。**把一个预览摘要当成文件摘要**，才产生了「两者不同」的误判。
「报告为 JPEG」同理，属预览格式，非文件被转码。

**影响**：§2.2 的结论恰好落在「非缺陷」，故**没有**错误地拒收任何证据；
但**推理是错的**，且与本包内 `37:164–168` 的准确标注**互相矛盾**，
会让读者对「哪组哈希才是影印件的认证值」产生混淆 —— 属真实的 provenance 表述缺陷。

**更正后结论**：`scan-000N.png` 与网络捕获**同源同字节**，
认证值即 `e8989b65…` / `ce73429a…` / `060e41b4…` 系列。

---

## 3. finding（唯一一项）—— 未获支撑的 OCLC 标识符

### F-1（severity: medium）

**位置**：
- `docs/kb-002/11-golden-001-evidence-matrix.md:1157` → `identifier  9943038583506421 ; OCLC 51793193`
- `docs/kb-002/11-golden-001-evidence-matrix.md:1306` → `OCLC 27170244 · 9100/3525 v.456`
- `docs/kb-002/11-golden-001-evidence-matrix.md:1304` → `OCLC 51793193 · 9100/1035.13 vol.32`
- 同源：`docs/kb-002/37a-l2-research-findings.md:366`、`:408`、`:539`、`:540`
- `docs/kb-002/38-l2-evidence-curation.md:62`、`:140`

**问题**：`OCLC 51793193` 与 `OCLC 27170244` 这两个标识符值在整个落盘证据库中**找不到任何来源**。

**审计员实际做的核验**：
1. 对 `tmp/l2-evidence/` 全库检索 `51793193` / `27170244` → **0 命中**（仅命中无关的
   `_type_oclc` UI 属性与 `<option value="51791">楚辞</option>`）。
2. 逐份读取 Princeton JSON 落盘记录：
   `out-p3g/princeton-A-9943038583506421.txt`、`out-p3g/princeton-C-9945512533506421.txt`
   —— 两者均为**单行、被截断**（`…"label" (line truncated)`），
   **在 OCLC 字段出现之前即已截断**。
3. 该记录 `byte_length = 3326`（A）/ `2603`（C），体积很小；curator 亦自述
   `SHA256 unknown（未记录该响应体 hash）`。
4. 同一记录中**其他**字段审计员**均能**在落盘字节中逐字核到
   （title / author / 周履靖 / 陳繼儒 / 藝文印書館 / 民國55 [1966] / 夷門廣牘 ; 第3函 /
   百部叢書集成 ; 13 / 據「明萬曆周履靖輯刊本」影印 / `9100/1035.13 vol.32`）——
   即**记录本身真实，唯 OCLC 值不可核**。

**为何这是 finding（而非可忽略）**：
- §41 明文禁止**虚构 catalog / shelfmark**；标识符属书目断言。
- 两个 OCLC 值以**确定语气**写入 `identifier` 字段，与 `unknown` 的诚实标注方式不一致
  （curator 对 `SHA256`、`author`、`edition`、`date` 均正确使用 `unknown`，**唯此处未用**）。
- 缺失 OCLC 不影响该记录的证明力：`call_number 9100/1035.13 vol.32` 与
  `NCID BA55608705` 均已实测可核，edition provenance 已由系列层 + 机构书目支撑。
  **故修正是低成本的。**

**所需修复（二择一，均为小改）**：
- **(A) 首选**：将两处 `OCLC <号码>` 改为 `OCLC unknown（未取得可核验来源）`，
  并在同条 `limitations` 注明「本记录的 OCLC 值未能在落盘响应体中核到」；或
- **(B)** 若确有该值来源，请补录该次 HTTP 响应的 `url / http_status / byte_length / sha256`
  到落盘证据库，使审计员可复核。

> **注意**：本 finding **不**质疑该 Princeton 记录的真实性，**不**质疑 edition/馆藏结论，
> 也**不**要求删除该记录。仅要求把**无法核验的标识符**改为 `unknown` 或补齐来源。

---

## 4. §46 逐项 fabrications 计数（每项均给方法 + 证据 + 理由）

| # | 项 | 计数 | 审计方法与实际证据 | 判定理由 |
|---|---|---:|---|---|
| 1 | `fabricated_url` | **0** | 逐条比对 17 条来源 URL 与落盘 `index.json` 的 `url`/`final_url` 字段（§2.1）。全部逐字一致；域名均为真实站点（ctext.org / library.ctext.org / catalog.princeton.edu / ci.nii.ac.jp / ndlsearch.ndl.go.jp / book.douban.com / api.lib.kyushu-u.ac.jp / shidianguji.com / med.wanfangdata.com.cn）。无拼写臆造、无占位域名。 | URL 可追溯到落盘 HTTP 记录，**0 虚构** |
| 2 | `fabricated_edition` | **0** | edition 断言逐条在落盘字节中核到：「景明刻本 夷門廣牘 十五」（`out-a1` page=1 viewer + 审计员**亲自目视**封面帧）；「據『明萬曆周履靖輯刊本』影印」（Princeton 落盘 JSON）；「(明)周履靖撰」（CiNii BN07716458 落盘）；「夷門廣牘 ; 第3函」（Princeton 落盘）。CText「同履靖」vs 机构「周履靖」**双值并列保留**并写入 limitations —— 属**正确**处理，**非**虚构 | 全部有落盘来源支撑；差异已诚实保留 |
| 3 | `fabricated_year` | **0** | 年份断言核到：1966 / 民國55（Princeton JSON ×2、CiNii `dc.date 1966`）；1990.4（CiNii `dc.date 1990`）；2013-12-4（豆瓣落盘 line 482）。原刊年**未**被断言 —— curator 明确记 `刊年 unknown`（`38:146`、`11:1463`）。**未**发现无来源年份 | 有来源年份均可核；无来源者记 unknown |
| 4 | `fabricated_publisher` | **0** | 出版社核到：藝文印書館（Princeton `pub_created_display` + CiNii `dc.publisher`）；臺灣商務印書館（Princeton C）；書目文獻出版社（CiNii BN07716458 line 40）；中华书局（豆瓣落盘 line 472）。**且 curator 主动降级**豆瓣为 `institution: Douban Books（商业聚合书目，非机构馆藏）`、`source_type: COMMERCIAL_BIBLIOGRAPHIC_AGGREGATOR`，并注明「本轮**未取得**中华书局官方页」——属**加强**诚信披露 | 全部有来源；聚合源已如实降级标注 |
| 5 | `fabricated_catalog` | **1 类** | **见 §3 F-1**：`OCLC 51793193` / `OCLC 27170244` 在全库**0 命中**，Princeton 落盘 JSON 在 OCLC 字段前已截断。其余 catalog 断言（`9100/1035.13 vol.32`、`9100/3525 v.456`、`NCID BA55608705`、`NCID BN07716458`、`R100000151-…`、`bibid=1000767294`）**均已**在落盘字节中核到 | **2 个未获支撑的标识符值** → 需修正为 unknown 或补来源 |
| 6 | `fabricated_page` | **0** | 页码/叶码断言核到：「15山家清供 第1頁」title（`out-a1`）；`/94` 分页（`out-p1a`/`out-a1`）；`file=83896`（多处）；`第3函`（Princeton）；`[46] double leaves`（Princeton）。**目标页 page=47 未获图像**，curator **未**断言其内容，且明确 `SCAN_PAGE_VERIFIED=false`、理由为「目标页在登录门后，未绕过」。审计员**亲自复核**登录门原文：`out-p1c/ctext-viewer-83896-p47.txt:80` = 「請<a href="account.pl?if=gb">登入帳戶</a>以顯示這一頁。」**逐字相符** | 已断言页均属实；未断言者明确标注未取得 |
| 7 | `fabricated_expert_review` | **0** | 全库检索未见任何「专家评审 / expert review / 鉴定 / 权威认证」类断言。curator 未声称任何来源经同行评审以外的专家背书；`ACCEPTED_EVIDENCE = 0` 明确保留认定权给独立 Gate | 无此类断言，**0** |
| 8 | `AI_only_primary_evidence` | **0** | 见 §6。每条 VERIFIED 均指向**外部 TOOL-OBSERVED** 来源；未发现以模型输出作为证据的情况；`11` 与 `38` 亦未见「模型記憶 / AI 生成」类表述 | 无 AI 自证，**0** |
| 9 | `fixture_leakage` | **0** | 见 §5 | 未混入合成数据，**0** |

**计数说明**：`fabricated_catalog` 记 **1 类（2 个值）**；其余 8 项记 0。
按契约「每项必须为 0 才算通过」→ **未全部为 0** → `REQUEST_CHANGES`。

---

## 5. fixture_leakage 专项核验

**核验动作**：
1. 对 `docs/kb-002/38-l2-evidence-curation.md` 检索 `examples/invalid|golden_002|inv_0|synthetic|fixture|E5|mock` → **0 命中**。
2. 对 `docs/kb-002/11-golden-001-evidence-matrix.md` 检索同组关键词 → 仅 2 命中，
   且均在 **line 22 / line 261**，位于 append-only 边界（line 776/778）**之前**，
   属**既有原文**（讨论 staging 不得携带 `metadata.fixture`），**非**本轮新增。
3. 对 candidate `data/kb/golden/staging/golden_001.kb.json` 检索
   `L2R2-SRC|s0840015|ctext\.org|library\.ctext|lib83896|識典|shidianguji|Princeton|夷門廣牘|夷门广牍`
   → **0 命中**。

**结论**：本轮新增的外部证据**未**混入
`data/kb/golden/examples/invalid/`（ALIGN-03 合成 E4 测试数据）；
**亦未**反向渗入 staging candidate。

> 附带确认：candidate 内 C1–C5 标注的 `calculated E2` 是**真实**的机械计算结果
> （`KB002_DISH_BELOW_E3`），**不是** fixture。
>
> ⚠️ **本条判定的依据是上列动作 1–3（落盘内容检索与 candidate 文本检索），
> 而非 validator 输出。** validator **本轮未能运行** ——
> `pwsh`/`node` 在本次会话中返回 `Error: spawn EPERM`（详见 §8），
> 故本轮**不存在**任何 `validate-golden` 的退出码或 stdout 可供引用。
> 有关 `E2` 与 Q3 的基线值仅作**对照**之用，见 §7（已明确标注为 outage 之前、非本轮结果）。

**`fixture_leakage = 0`**

---

## 6. AI_only_primary_evidence 专项核验

**核验动作**：
1. 全部 17 条来源的 `URL` 均指向**外部机构**（CText / Princeton / CiNii / NDL / 九州大 /
   豆瓣 / 万方 / 識典），无一条指向模型输出或本仓库自产内容。
2. 检索 `11` 中 `模型記憶|AI 生成|由 AI|模型聲稱|as primary` → **0 命中**。
3. 每条逐字 `passage` 均可在**落盘响应字节**中核到（§2.1、§4 各行）。
4. `11:1549`、`38:334` 明确 `ACCEPTED_EVIDENCE = 0`，认定权保留给独立 Gate ——
   未被 AI 自行"接受"。

**`AI_only_primary_evidence = 0`**

---

## 7. 完整性核验（candidate / manifest / append-only / scope）

| 项 | 期望值 | 审计员独立实测 | 判定 |
|---|---|---|---|
| staging candidate sha256 | `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964` | **逐字相符** | ✅ |
| staging candidate byte_size | 27036 | **相符** | ✅ |
| manifest sha256 | — | 文件存在，598 B，`assets[0].sha256` 与 candidate **一致** | ✅ |
| `promotion_status` | `not_promoted` | **`not_promoted`** | ✅ |
| production 文件数 | 0 | `data/kb/golden/` 下**无** production 文件 | ✅ |
| append-only 边界 | §0–§9.13 未改 | line 772 = 原文末行；line 776 = `---`；**line 778 = §9.14 起始**。边界清晰，追加未回改 | ✅ |
| Contract / Rubric / validator | 未修改 | 审阅 `38:310`、`38b:11` 声明；本审计未发现相反证据；**但因 shell 不可用，审计员未能重跑 validator 取得独立确认**（限制见 §8） | ⚠️ 限制 |

**本轮机器门禁状态（须先明确）**：

```text
validate-golden.mjs --staging   →  NOT_RUN — SHELL_UNAVAILABLE
validate-golden.mjs --dataset   →  NOT_RUN — SHELL_UNAVAILABLE
```

`pwsh`/`node` 在本次会话中返回 `Error: spawn EPERM`，命令**从未启动**，
故**不存在**本轮退出码或输出。**本审计未、也不能**以机器门禁结果支撑任何结论。

**基线对照（`outage` 之前，由 Captain 侧记录，非本轮结果）**：

- `validate-golden.mjs --staging` → exit 0 · `STAGING_VALID=true` · `PRODUCTION_ADMISSIBLE=false` · Q3 `KB002_DISH_BELOW_E3 (best: E2)`
- `validate-golden.mjs --dataset` → exit 0 · `QUALIFIED_GOLDEN_COUNT=0` · `SHORTFALL=10` · `STATUS=EMPTY_GOLDEN_SET`

> **限定**：以上两行**仅供对照**，系 **outage 之前**取得，**不构成本轮的机器门禁结论**，
> **也不代表**审计员在本轮复跑过这些命令。

其与 curator `38:224–246` 与 `38b` 记录的基线**文字一致**，
可佐证三者**引用同一基线**；但**不能**佐证本轮已复跑。

---

## 8. 未能取得独立证据的项（环境限制，如实标注）

| 项 | 限制 | 影响 |
|---|---|---|
| 重新打开每条来源 URL 取新 HTTP 状态 | `pwsh`/`node` spawn EPERM；`web_fetch` 出口策略阻断（non-public IP） | **不降低**本次审计效力：改以**落盘原始字节**比对（手段 a），其可核强度等同 |
| 重跑 validator（`--staging`/`--integrity`/`--dataset`） | 同上 | **这是真实缺口**：candidate 的**本轮**机械等级重算未由本审计独立确认。已交由 **QA（t3）** 在可执行环境中完成 |
| 重新目视 page=47 图像 | 目标页在登录门后（`ACCESS_RESTRICTED`，未绕过，§36） | 无法核验目标页正文图像；curator **已**如实置 `SCAN_PAGE_VERIFIED=false` |
| OCLC 值来源 | 落盘响应体在 OCLC 字段前截断 | **构成 §3 的 F-1 finding** |

**审计员未伪造任何退出码 / HTTP 状态 / hash / validator 输出。**

---

## 9. 逐项 §46 计数的诚实边界声明

- 上述 9 项计数中,有 **8 项为 0**、**1 项（`fabricated_catalog`）为 1 类**。
- **凡审计员无法取得独立证据之处均已明示**（§8），**未**以「无法核验」默认记 0。
- `fabricated_page` 记 0 的依据是：已断言的页码均可核，**且**未取得的 page=47 被明确标注为未取得
  —— 若 curator 曾断言 page=47 的正文内容，本项将记 >0；经查其**未**如此断言。

---

## 10. 最终结论

### **Verdict: `REQUEST_CHANGES`**

**理由**：§46 要求 9 项 fabrications 计数**全部为 0**。经独立核验，
`fabricated_catalog = 1 类（2 个 OCLC 值未获落盘来源支撑）`，故**不满足全部为 0** 的放行条件。

**但须明确指出**：本次审计**未发现**任何 URL 臆造、年份/出版社虚构、页码伪造、
专家评审伪造、AI 自证或 fixture 混入。**全部 17 条来源的 URL / 状态 / 字节 / SHA-256 均真实可核**；
影印图像经审计员**亲自目视**确认为真实木刻影印；广受关注的登录门、
`.cn`/`.dev` 差异、「同履靖/周履靖」双值均已**正确**处理。

**所需修复（唯一、低成本）**：
将 `11` 中两处 `OCLC 51793193` / `OCLC 27170244` 改为
`OCLC unknown（未取得可核验来源）`（并在 limitations 注明），
**或**补录其 HTTP 响应到落盘证据库。

修复后请由 Captain 指派 **scoped repair task**（§48），并按 §48 重跑本 Gate。
**不得**由本审计员自行修复（角色隔离）。

**同时提醒下游**：本审计**未能**独立确认本轮 validator 重算（§8）——
该项须由 **QA（t3）** 在可执行环境中完成，**不得**由本次 Security PASS/REQUEST_CHANGES 替代。

---

## 11. Scope guard 声明

本次审计**仅写入** `docs/kb-002/40-l2-security.md`。
**未修改** candidate · manifest · Contract · Rubric · Q3 · validator · schema · ALIGN-03 ·
staging semantics · status semantics · production · 任何 business source · 任何既有 KB 文档。
**未**重写 append-only 历史。**未**执行 promotion。**未**绕过任何访问控制。
