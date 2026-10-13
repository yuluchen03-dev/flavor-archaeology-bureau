# KB-002-L2 DSH FINAL REPORT

**Status: `FINAL`（2026-10-12）**

> 由 Captain 在 `NO CODEX` 治理链下独立闭环执行。
> **最终结论依据**：机器结果 + 独立 Gate。**未使用** Codex 规划 / 验收 / Reviewer / handoff。

---

## FINAL STATUS

```text
GOLDEN-001_STAGING_VERIFIED_E2
```

**依据**：

1. **Route Gate = PASS** —— `white/deepseek-v4.1-flash` 端到端 smoke 通过（含 tool_call 与结果消费）。
2. **Evidence Level = E2（best），未发生上升**。
   机器门禁本轮**实际运行**（QA t12 + Captain 复跑），结果与基线一致：
   `--staging` exit 0 · `STAGING_VALID=true` · `PRODUCTION_ADMISSIBLE=false` ·
   Q3 `KB002_DISH_BELOW_E3 (best: E2)`。
3. 按 Rubric 机械判据，C1–C9 的最高支持仍为**数字转录正文（DIRECT）**；
   **无**任何**影印原件正文**被实际核验（§33 OCR ≠ SCAN）→ **不足以**触发等级上调。
4. 因此**不满足 §50 的 E3+ 条件** → **不得进入 Promotion Gate**；按 §49 收敛。
5. **Security Gate = PASS**（t13，范围限 §46 计数 + t7/t10 修复）。
6. **QA Gate = REQUEST_CHANGES**（round 1 环境阻断；round 2 仅两项**文档一致性** finding，
   已修复）。QA **未发现任何内容级来源虚构**。
7. **Fresh Reviewer round-2 = REQUEST_CHANGES**（`RV2-01` blocker + RV2-02/03/04）；
   Captain 已逐项修复（值恢复 + 哈希更正 + 文档同步）。
8. **promotion = NO**；production = 0；qualified = false。

> **本结果属于 §49「正常 PASS」** —— 证据不足即证据不足，不因环境或流程压力升级。

---

## ROUTE

```text
software_dev_mode: 软件开发模式（software-development 预设）
provider:          white
model:             deepseek-v4.1-flash
resolved_route:    white/deepseek-v4.1-flash
fallback:          none（turn_end reason = {"kind":"completed"}）
route_gate:        PASS
```

**修复摘要**（详见 `docs/kb-002/36-route-fix-01-diagnosis.md`）：

- 根因：ACP profile（`~/.dsh/profiles/acp/cordis.patch.yml`）把 `xiaobai.baseURL` 指向
  **`https://whiteapi.cn/v1`** —— 实测 **HTTP 404**（裸 nginx，无 API）。
- 最小修复（6 行，`unexpected changed lines = 0`）：
  `provider: xiaobai → white` · `baseURL: whiteapi.cn → whiteapi.dev` ·
  `apiKeyEnv: XIAOBAI_API_KEY → WHITE_API_KEY` · `api: openai-responses → openai-completions`
  （实测 `/responses` + tools = **504**；`/chat/completions` + tools = **200**）
- ROUTE-02 smoke：真实 `dsh --profile` 端到端运行，`tool_call` 成功 → 模型消费结果 →
  输出 `ROUTE_SMOKE_OK / FILE=README.md / HEADING=风味考古局 - 非遗美食复原AI应用`
  （与 `README.md:1` 逐字一致）。
- §8 结论：`white` 是 **provider displayName/ID**，**不是 model id** ——
  以 `white` 作 model option 提交正是 "unknown model option" 的成因。
- 未新增账号 / API key / 登录 / 付费。

---

## TEAM

**members**（正式 5 角色，全部绑定**已批准 route** —— 无 xiaobai 继承）：

| member | role | route |
|---|---|---|
| researcher | 外部史料检索 | workbuddy-ai/deepseek-v4.1-flash |
| curator | 证据结构化 | workbuddy-ai/deepseek-v4.1-flash |
| qa | 独立验证 | workbuddy-ai/deepseek-v4.1-flash |
| security | 来源真实性与 provenance | workbuddy-ai/deepseek-v4.1-flash |
| reviewer | fresh-context 最终独立审核 | workbuddy-ai/deepseek-v4.1-flash |

（因 provider rate-limit 阻断，另临时增补若干同角色成员用于重试，
如 `qa-luna` / `security-white` / `rv01-*`；均已随后移除，不计入正式 roster。）

**task DAG**（最终形态，15 tasks）：

```text
t1  research            completed
t2  curation            failed  ── 内容完成；环境阻断（verify 命令无法运行）
t6  curation retry_of=t2 failed  ── append-only/完整性/§42 已补齐；validator 输出仍缺
t7  OCLC repair (F-1/RV-02)  completed
t8  repair-round-2      failed  ── provider rate-limit（由 t10 承接）
t10 RV-01 repair retry_of=t8 completed
t9  review-round-2      failed  ── provider rate-limit（由 t14 承接）
t11 security re-gate    failed  ── provider rate-limit（由 t13 承接）
t13 security re-gate    completed  ── PASS（范围限 §46 计数 + t7/t10 修复）
t3  QA round-1          failed  ── 环境阻断（REQUEST_CHANGES）
t12 QA round-2          failed/needs_revision ── 机器门禁实际运行通过；2 项文档一致性 finding（已修复）
t4  Security round-1    failed  ── REQUEST_CHANGES（F-1）
t5  Review round-1      failed  ── REQUEST_CHANGES（RV-01/RV-02）
t15 repair QA-R2-01     failed  ── provider rate-limit（Captain 亲自执行）
t14 Review round-2      pending/failed ── provider rate-limit（未产出，如实记录）
```

**failed tasks**（§59 保留历史，**全部未删除**）：

| id | subject | 失败原因 |
|---|---|---|
| `t2` | L2-CURATION-01 | 环境阻断：契约 verify 命令无法运行（`spawn EPERM`） |
| `t6` | L2-CURATION-01R（retry_of=t2） | 同上；append-only/完整性/§42 三项已补齐并通过 |
| `t3` | L2-QA-01 | 环境阻断（`REQUEST_CHANGES`） |
| `t4` | L2-SECURITY-01 | `REQUEST_CHANGES`（finding F-1） |
| `t5` | L2-REVIEW-01 | `REQUEST_CHANGES`（RV-01 / RV-02） |
| `t8` | repair-round-2 | provider rate-limit 429 |
| `t9` | review-round-2 | provider rate-limit 429 |
| `t11` | security re-gate | provider rate-limit 429 |
| `t12` | L2-QA-02 | `REQUEST_CHANGES`（仅文档一致性；机器门禁实际通过） |
| `t14` | L2-REVIEW-02 | provider rate-limit 429（round-2 review 未产出） |
| `t15` | L2-REPAIR-02（QA-R2-01） | provider rate-limit 429（Captain 亲自执行修复） |

**retries**（§59 要求 `retry_of=<id>` 已显式记录）：
`t6 = retry_of(t2)` · `t10 = retry_of(t8)` · `t13 = retry_of(t11)` ·
`t12 = retry_of(t3)` · `t14 = retry_of(t9)`

**DAG 修复记录**：`docs/kb-002/39a-l2-task-dag-repair.md`（含 5 次依赖重接的治理说明）

---

## SOURCES

```text
discovered:       17
verified:         21
accepted:         0        ← 认定权属 QA/Security/Reviewer；本轮未推进
independent:      （未定论 —— 三方实质异文，倾向非同源，最终判定待独立 Gate）
dependent:        （未定论 —— 同上）
```

**三态严格分离**（§29）：`DISCOVERED → ACCEPTED_EVIDENCE` 直通被禁止。
本批次**未**产生任何 `ACCEPTED_EVIDENCE`。

**计数**：`DISCOVERED = 17` · `VERIFIED = 21` · `ACCESS_RESTRICTED = 4~6`（含目标页登录门）·
`UNREACHABLE = 1` · `ACCEPTED_EVIDENCE = 0`。

**关键来源（本批次新增，全部 TOOL-OBSERVED）**：

| source_id | 内容 | HTTP | status |
|---|---|---|---|
| `L2R2-SRC-001` | CText library record（res=78790） | 200 | VERIFIED |
| `L2R2-SRC-002` | 《夷門廣牘》系列 record（collection=56） | 200 | VERIFIED |
| `L2R2-SRC-003` | 影印翻页（file=83896，/94 页） | 200 | VERIFIED |
| `L2R2-SRC-004` | CText OCR 全文（chapter=917283，含锚点） | 200 | VERIFIED |
| `L2R2-SRC-005` | CText 官方 OCR↔影印机制文档 | 200 | VERIFIED |
| `L2R2-SRC-006/007/008` | 影印图像帧 1/2/3（已目视核验） | 200 | VERIFIED |
| `L2R2-SRC-009` | 目标影印页 page=47 | 200 | **ACCESS_RESTRICTED** |
| `L2R2-SRC-010` | 历史标识 chapter=6845436（已删除页） | 200 | VERIFIED（否定证据） |
| `L2R2-SRC-011` | Princeton catalog（含 call_number） | 200 | VERIFIED |
| `L2R2-SRC-012` | 九州大学附属図書館 OPAC | 200 | VERIFIED |
| `L2R2-SRC-013` | CiNii Books（BA55608705 / BN07716458） | 200 | VERIFIED |
| `L2R2-SRC-014` | 国立国会図書館 NDL Search | 200 | VERIFIED |
| `L2R2-SRC-015` | 中華書局 2013 整理本（ISBN 9787101096132） | 200 | VERIFIED |
| `L2R2-SRC-016` | 万方同行评审论文（摘要层） | 200 | VERIFIED |
| `L2R2-SRC-017` | 識典古籍（第三数字见证） | 200 | VERIFIED |

**pre-existing**：`SRC-L2-001`（Wikisource，VERIFIED）

---

## CTEXT

```text
edition:        《夷門廣牘》本；影印落款「景明刻本 夷門廣牘 十五」
scan located:   true —— file=83896（共 /94 页）；锚点 lib83896.47/48 → page=47
scan verified:  false
page:           file=83896&page=47（目标条目页）
```

**`SCAN_PAGE_VERIFIED = false`**（§32 第 5 条未满足）

**理由（已更正，须准确表述）**：**不是**「图像不可取得」——
同一 edition 的**前 3 帧图像已实际取得并目视核验**（封面「景明刻本 夷門廣牘 十五」、
目录叶「山家清供目錄/上卷」）；
**而是**「**目标条目所在页 `page=47` 处于登录门之后**（页面文本「請登入帳戶以顯示這一頁。」），
**未取得、未绕过**」。

| 状态 | 值 |
|---|---|
| `OCR_WITNESS` | `VERIFIED`（锚点映射已确证，条件 1–4 满足） |
| `SCAN_IMAGE_ACCESS` | `PARTIALLY_OBTAINED`（前 3 帧已取得并目视核验；目标页未取得） |
| `SCAN_PAGE_VERIFIED` | **`false`** |

**§33 遵守**：OCR 只证明 text witness，**不能**证明 scan；
**不得**因取得同书其他页图像而推断目标页内容。

**URN 更正**：`ctp:wb983478` = work URN（`res=983478` = 山家清供）；
`6845436` = datawiki 条目号（其 chapter 页含「該資料已刪除」）。
目标全文在 `chapter=917283`。

---

## CATALOG

```text
verified:     true（多个机构，均实测 HTTP 200）
institution:  Princeton University Library · 九州大学附属図書館 · CiNii (NII) · 国立国会図書館 (NDL)
identifier:   Princeton 9943038583506421 / 9943029463506421 / 9945512533506421
              九州大 OPAC（(宋)林洪撰）
              CiNii NCID BA55608705 / BN07716458
              NDL R100000151-IN0042023090106388
call_number:  Princeton 9100/1035.13 vol.32 · 8280/4237(2) · 9100/3525 v.456
OCLC:         Princeton 51793193（记录 A）· 27170244（记录 C）
              —— 均可核：out-p3g/princeton-A-*.txt / princeton-C-*.txt（完整 JSON，非截断）
              （原 F-1「无来源」判定已被 round-2 RV2-01 推翻；值已恢复，见 11 §9.14.28）
```

**关键 provenance 交叉印证**：
- Princeton `9943038583506421`：series = **夷門廣牘 ; 第3函** ；
  notes = **據「明萬曆周履靖輯刊本」影印**；publisher = 藝文印書館 1966
- CiNii `BA55608705`：`dc.creator` = **周, 履靖** + **林, 洪 (宋)** ；
  `dc.publisher` = 藝文印書館 ；`dc.date` = 1966
- CText 站内实测显示 **「同履靖」**（按实测保留，与机构书目的「周履靖」差异列入 limitations）

**§34 遵守**：CATALOG **不能**证明 C1–C9 正文 → 一律标 `INSUFFICIENT`。

---

## CLAIMS

**口径**：正文证据来自 `L2R2-SRC-004`（CText OCR）· `L2R2-SRC-017`（識典）·
`SRC-L2-001`（Wikisource）。catalog / 影印容器 / 学术文献一律 `INSUFFICIENT` 或 `INDIRECT`。

| Claim | support_type | 说明 |
|---|---|---|
| C1 条目存在「蟹釀橙」 | **DIRECT** | 三方见证均有条目标题 |
| C2 橙为容器 | **DIRECT** | `橙大者截頂，剜去穰` |
| C3 蟹膏/蟹肉为馅 | **DIRECT** | `以蟹膏肉實其內` |
| C4 截顶/剜穰/填入/覆顶 | **DIRECT** | 三方一致（覆顶用字有异文） |
| C5 小甑蒸 | **DIRECT** | `入小甑 … 蒸熟` |
| C6 酒/醋/水 | **DIRECT** | 三方一致（措辞有异文） |
| C7 醋盐供食 | **DIRECT（措辞实质冲突）** | 见下「异文」 |
| C8 新酒菊花香橙螃蟹意象 | **DIRECT** | 三方一致 |
| C9 危巽斋赞蟹 | **DIRECT** | 人名有异文 |

### 三处实质异文（**保留未平滑**）

| 位置 | Wikisource | CText | 識典古籍 |
|---|---|---|---|
| 覆顶 | `仍以帶枝頂覆之` | `仍以蒂枝頂覆之` | `仍以帶枝頂覆之` |
| C7 调味 | `用醋鹽供食` | `加苦酒入鹽供` | `如苦酒，入鹽供` |
| C9 人名 | `危巽齋` | `危異齋` | `危巽齋` |

**意义**：三方在措辞上**实质分歧**，属真实的版本学证据；
**independence 升级判定留待独立 Gate**，Captain 不代行。

---

## VERSION CLAIMS

```text
V1:  VERIFIED              —— CText 标注《夷門廣牘》本（站内实测）
V2:  PARTIAL（未升级）      —— 系列层 + 机构书目有支撑，但原刊年缺失；
                              1966/1990/2013 属后世影印整理本
V3:  PARTIALLY_VERIFIED     —— 「连结层锚点已确证」（lib83896.47/48 → page=47）
                              vs「图像层未取得」（page=47 登录门）
                              严格区分，**未**升级为 VERIFIED
V4:  EVIDENCE_FOUND（未判定）—— 三处实质异文已记录，倾向非同源；
                              independence 判定留给独立 Gate（§30）
```

---

## EVIDENCE

```text
before:  best = E2（5 × E2: C1–C5；2 × E0: C6–C7）；metadata.evidence_level = E0；
         qualified = false；production = 0
after:   EVIDENCE_LEVEL_RECOMPUTE = NOT_RUN — SHELL_UNAVAILABLE
         → 保持基线（**未**发生等级上升）
Rubric:  未修改（§43 toolchain freeze 遵守）
```

**为何本轮不上升**：新增证据属**影印锚点映射 / series provenance / 机构馆藏书目 /
整理本 metadata / 学术文献** —— 按 Rubric 机械前置条件，
C1–C9 的最高支持仍为**数字转录正文（DIRECT）**；
**无**任何**影印原件正文**被实际核验（§33 OCR ≠ SCAN）→ **不足以**触发等级上调。

**§42 遵守**：未手工把 E2 改为 E3。等级结论**只能**来自 validator 实际输出。

---

## QA

```text
result:  REQUEST_CHANGES（round 1 t3 = 环境阻断；round 2 t12 = 文档一致性）
```

**交付**：`docs/kb-002/39-l2-qa.md`（round 1）· `docs/kb-002/45-l2-qa-r2.md`（round 2）

### round 1（t3）— 环境阻断

`QA-BLK-01`（blocker）：§45 机器门禁**全部 NOT_RUN — SHELL_UNAVAILABLE**
（`spawn EPERM`，宿主层限制）。按 §44 **不给无证据的 PASS**。

**独立通过项（QA 亲自读取 / 亲自目视）**：落盘 provenance 一致性（10 条）、
影印图像目视复核（3 帧）、目标页登录门判定、C1–C7 DIRECT 判定、V1–V4 未越权升级、
§30 未违规双计、candidate 结构自洽、append-only 边界。
**有价值发现**：`scan-0002.png`（目录叶）**未出现「蟹釀橙」行**
→ curator 对 C1 判 `INSUFFICIENT` **保守正确**（§33 不得以邻近页推断）。

### round 2（t12）— 机器门禁本轮**实际运行并通过**；结论仍 REQUEST_CHANGES

本轮 shell 恢复后，QA **实际执行**了机器门禁与测试（见下 REGRESSION），
并**独立复算** candidate/manifest SHA-256（逐字相符）。

**两项 finding（均为文档一致性，非证据缺陷）**：

| id | severity | 内容 | 处置 |
|---|---|---|---|
| `QA-R2-01` | medium | `40-l2-security.md` 保留修复前 §46 快照（`fabricated_catalog=1 类`），与 t13 当前结论 `0` 呈现冲突 | **已修复**：Captain 在 `40` 追加醒目「当前状态附加说明」，保留历史、明确当前权威结论为 t13/`44` |
| `QA-R2-02` | low | 最终报告未同步 t12/t13 结果 | **已修复**：本报告即为此更新 |

**性质**：QA **未发现任何内容级来源虚构**；`ACCEPTED_EVIDENCE` 本 QA 轮次不予认定（§29）。

---

## SECURITY

```text
result:  PASS（t13 / L2-SECURITY-03，独立 re-gate；范围限 §46 计数 + t7/t10 修复，不含机器门禁）
```

**交付**：
- `docs/kb-002/40-l2-security.md` —— t4 原始审计（历史快照，已加 Captain 当前状态附加说明 per QA-R2-01）
- `docs/kb-002/44-l2-security-r2.md` —— **t13 独立 re-gate（当前权威结论，PASS）**

**§46 逐项计数（以当前产物计，t13 独立复核）**：

| 项 | 计数（当前产物） |
|---|---|
| `fabricated_url` | **0** |
| `fabricated_edition` | **0** |
| `fabricated_year` | **0** |
| `fabricated_publisher` | **0** |
| **`fabricated_catalog`** | **0** ← 理由：**两个 OCLC 值均可追溯至落盘 Princeton 捕获**（有来源、非虚构）；旧值 `1 类` 为修复前快照 |
| `fabricated_page` | **0** |
| `fabricated_expert_review` | **0** |
| `AI_only_primary_evidence` | **0** |
| `fixture_leakage` | **0** |

**F-1 的更正（重要）**：t4/t5 曾判定 `OCLC 51793193` / `OCLC 27170244`「无来源支撑」，
t7 遂将两值改为 `unknown`。**但该前提是错的** —— round-2 fresh-context Reviewer
（`46-l2-review-r2.md`，finding **`RV2-01` blocker**）证明这两个值**一直在落盘证据中**，
对应 Princeton 捕获是**完整 JSON**（非截断）：

```text
out-p3g/princeton-A-9943038583506421.txt  3326 B  含 "value":["51793193"],"label":"OCLC"
out-p3g/princeton-C-9945512533506421.txt  2603 B  含 "value":["27170244"],"label":"OCLC"
```

**两值已恢复**（`11` §9.14.28）—— **有来源、从未是虚构值**。
`fabricated_catalog = 0` 的**理由随之更正**为「两值均可追溯至落盘 Princeton 捕获」，
**而非**「值已被移除」。**Captain 对该错误前提的采纳与传播负责。**
Princeton 记录的其余字段（title / 林洪 / 周履靖・陳繼儒 / 藝文印書館 1966 /
夷門廣牘;第3函 / call_number `9100/1035.13 vol.32`）始终未被删除，`support_type` 未变。

**RV-01（validator 措辞，已修复）**：`40` §5/§7 原误称 validator 本轮已运行；
t10 已改为 `NOT_RUN — SHELL_UNAVAILABLE`，基线仅作 outage 前对照。
修复记录 `docs/kb-002/43-l2-rv01-repair-record.md`。

**图像哈希更正（RV2-02）**：`scan-000N.png` 与网络捕获**字节完全相同**
（`e8989b65…` / `ce73429a…` / `060e41b4…`）；
`37` 与 `40` 原列的 `95e1f7a0…` 等是 `read_image` **预览**摘要，**非**文件摘要 —— 两处均已更正。

**Security 澄清的另一项「非缺陷」**：
CText 站内「同履靖」vs 机构书目「周履靖」**双值并列保留** —— 属**正确**处理，**非**虚构。

**诚实边界**：Security PASS **不含机器门禁**；
其复核亦**未发起新 HTTP 请求**（基于落盘字节），强度低于当轮重取，已在 `44` §4 标注。

---

## REVIEWER

```text
result: REQUEST_CHANGES（t5 / round 1）→ RV-01/RV-02 已修复 → round-2 review 见 §REVIEWER-R2
```

交付：`docs/kb-002/41-l2-review.md`（fresh-context 独立审核，round 1）。

- **RV-01（high）**：Security 报告自相矛盾（§5/§7 称 validator 已运行 vs §7:208/§8/§10 称未能运行）
  → 已由 **t10** 修复（措辞改为 `NOT_RUN — SHELL_UNAVAILABLE`）。
- **RV-02（medium）**：两个 OCLC 标识符被判「无来源」→ t7 改为 `unknown`；
  **但该前提本身是错的**，round-2 已推翻并恢复原值（见 §REVIEWER-R2 与 `11` §9.14.28）。

Round-1 review 同时**独立通过**多项：11 条来源字节级比对、3 帧影印亲自目视、
登录门逐字复核、C1–C7 逐条、edition 三层支撑、candidate 无手工升级、§30/§33/§34、append-only 边界。

### REVIEWER-R2

```text
result:  REQUEST_CHANGES（round 2，fresh-context；已修复后收敛）
交付:    docs/kb-002/46-l2-review-r2.md
```

**Round-2 fresh-context Reviewer 独立复核并通过多项**：
RV-01 确已闭合 · QA-R2-01/02 确已闭合 · append-only 边界（772/778）确切 ·
三门禁实际运行 exit 0 · candidate/manifest 哈希相符 · **51/52** 落盘捕获记录哈希与字节数双验证 ·
三帧影印亲自读取确为真实木刻（封面与两页目录叶）· 登录门逐字复核 ·
C1–C9 引文自证（含 C7/C9 异文自行复现）· release posture 属实 · 无手工升级。

**关键 finding `RV2-01`（blocker）—— 已修复**：
Reviewer 证明 **F-1 的前提是错的**：两个 OCLC 值**一直在落盘证据中**，
Princeton 捕获是**完整 JSON**（非截断），「0 命中 / 截断」实为**读取工具的显示层截断**被误读。
这是本轮**最有价值的发现** —— 它纠正了一条已传播至 8 份文档、并被 2 个独立 Gate 背书的错误前提。
**Captain 已亲自字节级复现并修复**：两值恢复（`11` §9.14.28），
`37a` §15 / `38` §9 / `40`（附加说明 + §2.2）/ `41` 均已同步更正。

**`RV2-02`（high）—— 已修复**：图像哈希「不同」的结论有误；
实测 `scan-000N.png` 与网络捕获**字节完全相同**，原列值是 `read_image` **预览**摘要。
`37` 与 `40` 两处均已更正。

**`RV2-03`（medium）/ `RV2-04`（low）—— 已修复**：
`40` 的 Captain 附加说明已改写为反映「恢复」而非「移除」；
`41` 已移除截断理由并改为正确表述。

**最终 verdict 处理**：RV2-01 为 blocker，Captain 修复后本报告如实记录；
**不伪称** round-2 已在此修复后重新复裁 —— 但所有 blocker/high finding 均**已有字节级证据**支撑其闭合。

---

## Round-2 gates（本轮真实结果）

```text
Security re-gate (t13):  PASS — 范围限 §46 计数 + t7/t10 修复；不含机器门禁
                         ⚠️ 其「fabricated_catalog=0」的理由沿用了 RV2-01 错误前提，
                            已由 11 §9.14.28 更正为「两值可追溯」而非「值已被移除」
QA re-gate (t12):        REQUEST_CHANGES — 两项文档一致性 finding（QA-R2-01/02，均已修复）
                         机器门禁由 QA 实际运行且全部通过（见 REGRESSION）
Fresh reviewer (t14):    REQUEST_CHANGES（RV2-01 blocker + RV2-02/03/04）
                         → Captain 已逐项修复（见 §REVIEWER-R2）
```

**本轮机器门禁（QA t12 实际运行，非基线）**：

```text
validate-golden --staging    exit 0 · STAGING_VALID=true · PRODUCTION_ADMISSIBLE=false · Q3 best E2
validate-golden --integrity  exit 0
validate-golden --dataset    exit 0 · QUALIFIED=0 · SHORTFALL=10 · EMPTY_GOLDEN_SET
```

Evidence 保持 **E2** 基线，qualified=false，production=0，promotion=**NO**。

---

## PROMOTION

```text
eligible:   NO —— Evidence = E2 < E3；机器门禁未显示任何等级上升
performed:  NO —— 未执行任何 staging → production promotion
```

**§52 Snapshot（promotion 前记录，用于对照）**：

| 项 | 值 |
|---|---|
| candidate SHA | `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`（27,036 B） |
| manifest SHA | `c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8`（598 B） |
| Evidence Level | best = **E2**；`metadata.evidence_level = E0` |
| qualified | `false` |
| production count | **0** |
| shortfall | **10** |
| dataset status | `EMPTY_GOLDEN_SET` |
| promotion_status | `not_promoted` |

---

## DATASET

```text
staging:     1 candidate（STAGING_VALID = true；PRODUCTION_ADMISSIBLE = false）
production:  0
qualified:   0
shortfall:   10
status:      EMPTY_GOLDEN_SET
```

**来源**：manifest.json 实测 + **本轮实际运行** `--staging` / `--dataset`（均 exit 0）。
数值与 outage 前基线一致。

---

## REGRESSION

```text
results:  PASS（本轮 QA t12 实际运行；Captain 亦独立复跑核心命令）
```

**本轮实际运行结果**（非 outage 前基线）：

| 门禁 | 结果 |
|---|---|
| `validate-golden --staging` | **exit 0** · STAGING_CANDIDATE_COUNT=1 · STAGING_VALID=true · PRODUCTION_ADMISSIBLE=false · Q3 `KB002_DISH_BELOW_E3 (best: E2)` |
| `validate-golden --integrity` | **exit 0** · staging asset/manifest presence 报告 |
| `validate-golden --dataset` | **exit 0** · QUALIFIED_GOLDEN_COUNT=0 · SHORTFALL=10 · STATUS=EMPTY_GOLDEN_SET |
| `golden-validator.test.mjs` | **76/76 pass** |
| `t24-admission-and-integrity.test.mjs` | **22/22 pass** |
| `validate-kb-schema.mjs`（+测试） | **PASS**（3 file / 23 entities / 26 relations；测试 45/45） |
| `verify_graph_schema.mjs`（+测试） | **ok=true**（193 nodes / 49 relations；测试 8/8） |
| `verify_knowledge_graph_coverage.mjs` | **exit 0**（蟹酿橙具备全部 4 类核心关系） |
| `verify_literature_dataset.mjs` | **exit 0**（106 文献条目 / 103 古籍节点） |
| ALIGN-03 独立脚本入口 | **未找到独立入口**（诚实记录，未据此声称 PASS） |

**与基线对照**：全部数值与 outage 前基线**一致**，无新增失败。

**未运行**：无（核心门禁本轮均已实际执行）。

**candidate / manifest 完整性**：本轮 QA 独立复算（`Get-FileHash`）——
candidate 27,036 B / `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`；
manifest 598 B / `c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8` —— **均与历史值逐字相符**。

---

## GIT

```text
HEAD:                6a25f4f（feat/trae-offline-museum）—— 未变
user staged:         300 —— **完整保持**
unexpected changes:  0（未执行 git add . / -A / push / merge / rebase / reset --hard / stash）
commit:              NONE（默认不自动 commit；§58 遵守）
push:                NONE
```

**本轮新增文件**（未 commit，未 stage）：

```text
docs/kb-002/36-route-fix-01-diagnosis.md
docs/kb-002/37-captain-recon-p1-p2-p3.md
docs/kb-002/37a-l2-research-findings.md
docs/kb-002/38-l2-evidence-curation.md
docs/kb-002/38a-l2-environment-constraint-notice.md
docs/kb-002/38b-l2-verify-recompute.md
docs/kb-002/39-l2-qa.md
docs/kb-002/39a-l2-task-dag-repair.md
docs/kb-002/40-l2-security.md
docs/kb-002/41-l2-review.md
docs/kb-002/42-l2-oclc-repair-record.md
docs/kb-002/43-l2-rv01-repair-record.md
docs/kb-002/44-l2-security-r2.md
docs/kb-002/45-l2-qa-r2.md
docs/kb-002/46-l2-review-r2.md
docs/kb-002/39-l2-task-dag-repair.md（占位）
docs/kb-002/38-l2-environment-constraint-notice.md（占位）
tmp/l2-evidence/**（临时核验材料，非交付数据）
```

**修改的既有文件**：`docs/kb-002/11-golden-001-evidence-matrix.md`（**append-only** §9.14 / §9.14.27 / §9.14.28）

---

## OPEN ISSUES

1. **目标影印页 `page=47` 处于登录门** → `SCAN_PAGE_VERIFIED = false`；
   影印原件正文**未核验**（未绕过 §36）。
2. **F-1 的更正历史** —— round-1 误判两个 OCLC 值「无来源」并改为 unknown，
   round-2 `RV2-01` 证明前提错误，值已恢复（`11` §9.14.28）。
   **保留全过程**：§9.14.27（错误更正）→ §9.14.28（正确恢复）。
3. **`44-l2-security-r2.md`（t13）仍沿用 RV2-01 错误前提** ——
   其 PASS 的「计数 0」结论仍成立（值有来源），但**理由**已由 `11` §9.14.28 更正；
   该报告为历史记录，未回改（保持 App/Captain 附加说明为准）。
4. **来源独立性未定论**：Wikisource / CText / 識典 三方存在实质异文（帶/蒂、用醋鹽供食/
   加苦酒入鹽供、巽齋/異齋），倾向非同源，但最终判定待独立 Gate。
5. **国图（NLC）具体馆藏记录未取得**（`read.nlc.cn` UNREACHABLE）→
   `unknown`（**未假设**该馆收藏）。
6. **2 条 OpenAlex DOI 未通过 Crossref 二次确证**（`10.29991/jhs.201212.0004`、
   `10.30152/jcdc.200701.0001` → Crossref 404）→ 保持 `DISCOVERED`。
7. **V2 未达 VERIFIED**：原刊年缺失（现存刊年属后世影印整理本）。
8. **ALIGN-03 无独立脚本入口** —— 未找到，未据此声称 PASS。
9. **`40-l2-security.md` 表格仍记历史 `fabricated_catalog = 1 类`** ——
   已加 Captain 当前状态附加说明；历史快照按 §38 保留不删。
10. **round-2 Reviewer 未在修复后重新复裁** —— RV2-01 blocker 已有字节级证据闭合，
    但未取得「修复后再审」的独立 verdict；如实标注。

---

## NEXT RECOMMENDATION

**仅建议，不得自动启动 F02。**

1. **冲 E3 的真实缺口**（按 §14–§17 优先级）：
   - 取得 `page=47` 的影印图像正文（需登录或其它无门影印源）→ 方可使
     `SCAN_PAGE_VERIFIED = true`；
   - 或取得国图 / 其它机构**可核验的原刊影印正文**；
   - 或证明三方 witness 属**不同 edition chain**（可提升独立性）。
2. **若 E3 仍未达成**（当前即如此）：GOLDEN-001 维持
   `STAGING_ACCEPTED_NOT_PROMOTED`（`qualified=false`）—— 这属**正常 PASS**，不是失败（§49）。
3. **补做 round-2 Fresh Reviewer**：provider 速率限制解除后，以新 ID 建 review 任务，
   复核 RV-01/RV-02 闭合与 QA/Security round-2 证据。
4. **不要**为达 E3 而修改 Contract / Rubric / validator（§43 toolchain freeze）。
5. **不要**把「多站出现蟹酿橙」当作独立来源加分（§30）。
6. **不要**启动 F02（§56）。

---

**报告状态**：`FINAL`（2026-10-12）。
**最终结论**：`GOLDEN-001_STAGING_VERIFIED_E2`（Evidence = E2 < E3；promotion = NO）。
**STOP** —— 不启动 F02。
