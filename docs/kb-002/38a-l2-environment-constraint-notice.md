# L2 ENVIRONMENT CONSTRAINT NOTICE — shell / network outage

**Status: `SHELL_UNAVAILABLE` (host-level) · `WEB_FETCH_EGRESS_BLOCKED` (policy)**
**Date: 2026-10-12**
**Affects: t3 (QA), t4 (Security), t5 (Reviewer), and Captain machine gates**
**File note: 本文件原名 `38-l2-environment-constraint-notice.md`，因与 curator(t2) 的交付文件
`38-l2-evidence-curation.md` 序号冲突，已改名为 `38a-l2-environment-constraint-notice.md`。**

> append-only 环境事件记录。供下游 Gate 正确解读证据状态，**不得**被当作「验证已通过」或「验证已失败」。

---

## 1. 实测症状

### 1.1 `pwsh` 工具完全不可用

自本会话某时点起，`pwsh` 的**每一次**调用均返回，**包括最简 no-op**：

```text
Error: spawn EPERM
```

实测样本（三处独立来源，互相印证）：

| 调用方 | 命令 | 结果 |
|---|---|---|
| Captain | `Write-Output "shell-alive"` | `Error: spawn EPERM` |
| Captain | `Get-Location` | `Error: spawn EPERM` |
| subagent A | `Write-Output "hello"` | `Error: spawn EPERM` |
| subagent B | `node --version; New-Item ...` | `Error: spawn EPERM` |
| subagent B | `echo hello` | `Error: spawn EPERM` |
| subagent B | 后台 job `pwsh-928` | `subprocess failed before reporting an outcome: Error: spawn EPERM` |

**性质判定**：这是**宿主 harness 层面的进程/stdio 限制**（sandbox stdio boundary），
**不是**命令内容错误、**不是**仓库问题。按 `diagnose-windows-sandbox-acl` skill 的说明，
**piped grandchild `spawn EPERM` 属于预期内的 confinement denial**，**不是**可通过 ACL 修复的问题。

**未尝试绕过**：本会话 approval prompts 已禁用，escalation 会被自动拒绝；未重复重试同一失败（遵守 skill 指引）。

### 1.2 `web_fetch` 被出口策略阻断

所有 URL 在**发出请求之前**即被拒绝，错误完全一致：

```text
Error: URL hostname "<host>" resolves to a non-public IP address
```

实测样本：

| URL | 结果 |
|---|---|
| `https://ci.nii.ac.jp/ncid/BA55608705.rdf` | non-public IP |
| `https://ci.nii.ac.jp/ncid/BA55608705.json` | non-public IP |
| `https://ndlsearch.ndl.go.jp/books/R100000151-IN0042023090106388` | non-public IP |
| `https://www.shidianguji.com/zh/book/GJDS006/chapter/GJDS006_45` | non-public IP |
| `https://library.ctext.org/s0840015/s0840015_0002.png` | non-public IP |
| **`https://example.com/`（对照组）** | **non-public IP** |

**对照组意义**：`example.com` 同样被拒 → 这是**全局出口策略**，**与具体站点无关**，换域名无用。

### 1.3 `web_search` 无凭据

```text
Error: DeepSeek search has no API key for "DEEPSEEK_API_KEY"
```

---

## 2. 关键区分：哪些证据**不受**影响

**本轮全部外部证据均在 shell 失效之前完成实测并落盘**。因此：

| 证据 | 状态 | 是否受 outage 影响 |
|---|---|---|
| CText library record（res=78790） | HTTP 200 / 15084 B / sha256 已记录 | ❌ 不受影响 |
| CText 系列 record（collection=56） | HTTP 200 / 22262 B | ❌ 不受影响 |
| CText 影印页 file=83896 | HTTP 200 / 共 /94 页 | ❌ 不受影响 |
| **影印图像 s0840015_0001–0003** | **HTTP 200 / 108712・19432・20158 B / sha256 已记录** | ❌ 不受影响（**字节已落盘，Captain 已目视核验**） |
| CText OCR 章节 chapter=917283 | HTTP 200 / 147691 B / sha256 已记录 | ❌ 不受影响 |
| Princeton catalog 记录 | JSON 实测 HTTP 200，字段已提取 | ❌ 不受影响 |
| NDL「山家清供一巻」 | HTTP 200 / 189636 B / 含 山家清供+林洪 | ❌ 不受影响 |
| CiNii BA55608705 | HTTP 200 / 82044 B / dc.* 元数据已实测 | ❌ 不受影响 |
| CiNii BN07716458 | HTTP 200 / 67743 B | ❌ 不受影响 |
| 識典古籍 GJDS006_45 | HTTP 200 / 357614 B / 含蟹釀橙 | ❌ 不受影响 |
| 万方论文 | HTTP 200 / 141538 B | ❌ 不受影响 |
| Captain DOI 文献（Crossref） | HTTP 200 元数据实测 | ❌ 不受影响（Captain 侧完成于 outage 前） |

抓取原始字节留存于 `tmp/l2-evidence/`（含各 `out-*/index.json` 记录 url/http_status/byte_length/sha256）。

---

## 3. 对下游 Gate 的影响（**必须遵守**）

### 3.1 **不得**把 SHELL_UNAVAILABLE 当作任一 Gate 的通过理由

validator / 机器门禁**未能在本轮重新运行**。因此：

- QA(t3) 的 §45 机器门禁：**若其自身 shell 亦不可用**，必须如实记为
  `NOT_RUN — SHELL_UNAVAILABLE`，**不得**写 PASS。
- 若 QA 的 shell 可用，则应正常运行并给出真实退出码。
- **禁止**以「Captain 之前跑过 --staging 得 exit 0」为由声称本轮门禁通过；
  那属于**基线**结果（见 §4），需明确标注为基线而非本轮复跑。

### 3.2 Evidence Level 重算（§42）

本轮**未能**在 outage 后重新运行 validator 计算 Evidence Level。
因此最终等级判定必须满足以下之一，**否则不得上调**：

1. QA(t3) 或 curator(t2) 在其轮次**实际运行** `validate-golden --staging/--dataset` 并给出真实输出；或
2. 明确保持**基线等级**（E2），并在最终报告中标注
   `EVIDENCE_LEVEL_RECOMPUTE = NOT_RUN_SHELL_UNAVAILABLE`。

**严禁**任何成员手工把 E2 改成 E3（§42）。

### 3.3 §29 来源状态不得因 outage 升级

`DISCOVERED → VERIFIED → ACCEPTED_EVIDENCE` 的推进**只能**基于实际打开。
outage **不构成**升级理由，也**不构成**降级理由。未复核项保持原状态。

---

## 4. 基线（outage 前实测，供对照）

```text
node scripts/kb002/validate-golden.mjs --staging
  exit 0 · STAGING_CANDIDATE_COUNT=1 · STAGING_VALID=true · PRODUCTION_ADMISSIBLE=false
  Q3 finding: KB002_DISH_BELOW_E3 (best: E2)

node scripts/kb002/validate-golden.mjs --dataset
  exit 0 · QUALIFIED_GOLDEN_COUNT=0 · SHORTFALL=10 · STATUS=EMPTY_GOLDEN_SET
```

**声明**：以上为 **outage 之前**的基线实测结果，**不是**本轮复跑结果。

---

## 5. 诚实边界

- 本轮**未**产生任何伪造的运行结果、HTTP 状态或 hash。
- 两个 subagent 均**主动拒绝**以推测填补未实测字段（正确行为），并留下
  `tmp/l2-route/PROBE.md` 与 `tmp/l2-evidence/ctext/EXECUTION-BLOCKED.md` 记录阻断原因。
- 目标页 `page=47` 影印图像**仍未取得**（登录门，未绕过）→ `SCAN_PAGE_VERIFIED = false`。
- 最终 Evidence Level 是否达到 E3，**取决于独立 Gate 在可用环境下的实际机器计算**，
  Captain **不代为宣布**。
