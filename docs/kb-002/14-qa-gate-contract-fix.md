# t25 — KB-002 QA Regression Gate（Contract Fix + Fixture Integrity + INCIDENT-E）

- 执行者：`qa-hy`（QA，独立验证）
- 任务：`t25`，attempt 3，`attempt_id = eefbebd4-27fa-4045-90fe-87e3bb35d798
- 验证对象：`t23`（Contract/Rubric 语义修订）+ `t24`（Fixture 诚信修复 + Staging 资产完整性保护）
- 判定依据：全部为**本人亲自执行**的实测（Node `spawnSync` 取真实退出码），**非采信**上游自述

## VERDICT

# `PASS`

---

## 一、§20 原 20 项验收

| # | 验收 | 实测证据 | 结论 |
|---|---|---|---|
| 1 | Contract §10.2 已澄清 | `01-` §10.2 AFTER 分 (a)(b)(c)：判定对象限定 production；Candidate/Staging 允许 `qualified=false` 但须真实；staging 不计入；三态表；原文以【已取代】保留 | ✅ |
| 2 | Rubric §5.2 已澄清 | `02-` §5.2 AFTER：`count` 限定 production；三态表；`GOLDEN_10_COMPLETE` → `COMPLETE_GOLDEN_SET`；原文【已取代】保留 | ✅ |
| 3 | **Q3 仍 blocking** | 显式路径 `validate-golden.mjs data/kb/golden/examples/valid/golden_001.kb.json` → **exit 1**，含 `KB002_DISH_BELOW_E3` | ✅ |
| 4 | Q3 语义未被削弱 | `golden-rules.mjs` L305-308 **无条件** `if (best === null \|\| LEVELS.indexOf(best) < LEVELS.indexOf('E3'))`；mtime `2026-10-09T06:52:33.830Z`（早于本轮所有会话）；`git diff --stat` = **空**（未修改）；Q3 区域**无** fixture 白名单/豁免 | ✅ |
| 5 | staging `qualified=false` 可保留 | `12-` §7 明确 GOLDEN-001 层 = Candidate/Staging、`qualified=false`；`--integrity` 现报 `NO_CANDIDATE_PRESENT`（未因「不足」而拒绝保留语义） | ✅ |
| 6 | production `qualified=false` 不允许 | `12-` §10 / Contract §7：production **不得**为 `false`；INCIDENT-C 测试（L317）已覆盖 | ✅ |
| 7 | E2 staging 可存在 | CASE 1（L62）：E2 candidate 可存于 staging | ✅ |
| 8 | E2 production 被拒 | 显式路径实测 exit 1 且含 `KB002_DISH_BELOW_E3`；CASE 2（L116） | ✅ |
| 9 | E3 非自动 qualified | Rubric §5.1 新增「层」列 + 明写 E3 为最低门槛、仍须满足 §4.4 五项前提 | ✅ |
| 10 | chain 仍须通过 | `KB002_NO_RESOLVED_CHAIN` 在 `STRUCTURAL_FIXTURE_EXPECTED_CODES` 中（属预期输出），但 CASE 3（L138）证明 E3+broken chain → production FAIL | ✅ |
| 11 | `PARTIAL_GOLDEN_SET` 只算 production | CASE 7（L240）+ INCIDENT-D（L339） | ✅ |
| 12 | fixture 不再依赖虚构年份 | 实测：两个 SourceEdition `publication_year` = **null** 且登记 `unknown_fields` | ✅ |
| 13 | placeholder publisher 不再当真实证据 | 实测 `publisher` = `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER`；INCIDENT-B（L302） | ✅ |
| 14 | 负例仍全部 FAIL | **17/17 全部 exit 1**，且**各自本意码齐备**（`missing-intended-code = 0`） | ✅ |
| 15 | valid fixture 行为与新 Contract 一致 | 结构夹具现 `fixture_only=true`、computed **E2**、`qualified=false`；显式指定 → exit 1（严格） | ✅ |
| 16 | Golden validator 全绿 | default **0** / `--dataset` **0** / `--staging` **0** / `--integrity` **0** / `--fixture` **0** | ✅ |
| 17 | KB tests 全绿 | KB-001 **121 / 121 / fail 0** | ✅ |
| 18 | KB-001 regression 全绿 | `validate-kb-schema` 0 / `verify_graph_schema` 0（193/49）/ `verify_literature_dataset` 0（106/103） | ✅ |
| 19 | V1 零修改 | `data/knowledge_graph`、`data/recipes`、`data/fragments`、`data/literature`、`scripts/kb`、`data/kb/schema`、`data/kb/examples` → 0 条目 | ✅ |
| 20 | production 仍为 0 | production 根下 **0 文件**（未授权 promotion） | ✅ |

---

## 二、§23 INCIDENT-E 新增 10 项

| # | 验收 | 实测 | 结论 |
|---|---|---|---|
| E-1 | INCIDENT-E regression exists | 测试 `INCIDENT-E: a staging asset cannot be lost silently while its manifest expects it`（L351） | ✅ |
| E-2 | generated rewrite 不删除 staging | 测试 `C-1/C-9: regenerating generated/ must not disturb a staging candidate`（L399）；且 `NON_PRODUCTION_SEGMENT` 已覆盖 `generated` | ✅ |
| E-3 | validator non-destructive | 测试 `C-7/C-8: validation is non-destructive for every mode`（L462） | ✅ |
| E-4 | `--dataset` non-destructive | 同上（7 种模式逐一断言） | ✅ |
| E-5 | `--staging` non-destructive | 同上 | ✅ |
| E-6 | `--file` non-destructive | 同上 | ✅ |
| E-7 | manifest mismatch detected | 测试 `C-4/C-5`（L427）；`--integrity` 报 `STAGING_ASSET_MISSING` / `STAGING_ASSET_MODIFIED`；**注**：本人受 in-scope 限制**未自行在 staging 目录构造探针**（属 out-of-scope），改以「测试存在性 + 源码断言 + 上游实测证据」三重核对 | ✅ |
| E-8 | staging hash stable | 测试 `C-7/C-8`（L462）断言 existence/byte size/SHA-256 前后一致 | ✅ |
| E-9 | production count excludes staging | 测试 `C-10`（L478）：staging-only → `QUALIFIED_GOLDEN_COUNT = 0` | ✅ |
| E-10 | 未提前重建 | production **0 文件**、staging **0 文件**；`HEAD = 6a25f4f` 未变 | ✅ |

---

## 三、§17 CASE 1–8 与 §18 INCIDENT A–E

21 个新增测试**全部存在且命名明确**（本人逐条读取测试名核对）：

```
CASE 1 (L62) / CASE 2 (L116) / CASE 3 (L138) / CASE 4 (L160)
CASE 5 (L178) / CASE 6 (L208) / CASE 7 (L240) / CASE 8 (L254)
INCIDENT-A (L284) / INCIDENT-B (L302) / INCIDENT-C (L317)
INCIDENT-D (L339) / INCIDENT-E (L351)
C-1/C-2/C-3 (L381) / C-1/C-9 (L399) / C-4/C-5 (L427)
C-6 (L449) / C-7/C-8 (L462) / C-10 (L478)
C-11 (L489) / C-11 --integrity (L506)
```

`node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` → **tests 21 / pass 21 / fail 0 / skipped 0 / todo 0**

---

## 四、关键设计判定：「结构夹具期望集」是否削弱 Q3？

### 结论：**不构成实质削弱。**

**证据链（本人亲自验证）：**

1. **门控条件极窄**（`validate-golden.mjs:194`）：
```js
const structuralFixtureScope = (fixtureMode || targets.length === 0) && !datasetMode && !stagingMode;
```
仅在「`--fixture` 模式 **或** 无显式目标」且**非** `--dataset`、**非** `--staging` 时启用。

2. **Q3 代码零改动**：`golden-rules.mjs` L305-308 无条件判定；`git diff` 空；mtime 早于本轮。

3. **Q3 仍阻断 production/dataset/显式路径**（实测）：
   - 显式路径 → **exit 1**，`codes` 含 `KB002_DISH_BELOW_E3`
   - `--dataset` → exit 0，但那是因 production 为 0 文件（无违规），非 Q3 被压制

4. **源码注释自证**（L313-320）明确写道：
> "Q3 is not suppressed: it remains in the output and it still blocks --dataset / production admission."

5. **不会被用来让不合格数据「看起来通过」**：因为任何**显式**目标（真实使用方式）都走 `structuralFixtureScope = false` 分支 → 严格 `return 1`。默认无目标模式只遍历结构夹具，本来就不是 production 入口。

**因此判定：可接受。**

---

## 五、独立复算（真实数字，spawnSync）

| 套件 | tests | pass | fail | skipped | todo |
|---|---:|---:|---:|---:|---:|
| `golden-validator.test.mjs` | 56 | 56 | 0 | 0 | 0 |
| `t24-admission-and-integrity.test.mjs` | 21 | 21 | 0 | 0 | 0 |
| KB-001 全量（`scripts/kb/__tests__/*.test.mjs`） | 121 | 121 | 0 | — | — |
| `independent-qa.test.mjs` | 43 | 43 | 0 | — | — |
| **合计（121 + 56 + 21）** | **198** | **198** | **0** | 0 | 0 |

> 上游 `backend-a` 自述「198 pass」与本人复算 **完全吻合**（121 + 56 + 21 = 198），无虚报。

**`data/kb/generated/` 污染修复确认**：`independent-qa.test.mjs` **43/43 全绿**（上游自曝其 C-9 初版曾致该套件 4 用例失败）。本人独立确认修复**确实生效**，且 `data/kb/generated/` 现存 2 个产物文件、**无 scratch 残留目录**。

**17 个负例逐个核验**：`TOTAL = 17`、`non-exit1 = 0`、`missing-intended-code = 0` —— 全部 exit 1 且各自发出**本意错误码**。

---

## 六、Fixtures 诚信扫描（INCIDENT-A / INCIDENT-B）

本人遍历 **18 个 fixtures** 做子串扫描，命中 36 处；**逐条查验上下文**后判定：

| 命中 | 实际位置 | 是否违规 |
|---|---|---|
| `占位` | `author: "林洪（夹具占位）"`、passage name/text、`not_historical_evidence` 声明文本 | ⚠️ **良性** — 明确标注为 fixture 占位，**不参与 source quality 计算** |
| `facsimile` | 仅出现在**实体 ID** `edition_g001_shanjiaqinggong_facsimile` | ⚠️ **良性（命名残留）** — `edition_type` 实为 `unknown`，不触发 S/A 前置条件 |
| `1985` / `2002` | 未出现在 `publication_year` 字段 | ✅ **已清除** |

**真正驱动 source quality 的字段，实测已全部净化：**

```
publisher         = "SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER"
publication_year  = null  (+ unknown_fields 登记)
edition_type      = "unknown"
SOURCE_GRADE      = D（原 S/A）
fixture_only      = true
```

**结构夹具诚实值**：computed **`E2`**、`qualified = false`（不再伪装成 E4）。

**生产集过滤**：`NON_PRODUCTION_SEGMENT = /(^|[\\/])(examples|staging|generated)([\\/]|$)/` —— `examples` / `staging` / `generated` **三者均被排除**，符合 §12/C-1。

---

## 七、方法论发现（值得记录）

合约明令「取退出码须用 spawnSync、**不得**依赖 PowerShell 管道 `$LASTEXITCODE`」。本人实测**复现了该陷阱**：

```
node ... | Select-Object -First 1  →  $LASTEXITCODE = 0   ❌ 错误（实为 1）
spawnSync(...)                      →  status        = 1   ✅ 正确
```

**这反过来证明该合约条款是必要的**，且本人全程使用 `spawnSync` 取码，数据可信。

---

## 八、未验证项（如实标注，**不得**当作通过）

- symlink / junction 绕过
- 并发竞态
- 磁盘写满
- 超大输入
- **跨平台原子性**（`atomicWriteFile` 仅在当前平台验证同目录 temp+rename）
- **L2 外部来源真实性**（`web_search` 本环境无 API key）

**INCIDENT-E 正式根因仍为 `UNKNOWN`** —— candidate 丢失时间与 `data/kb/generated/` 重写时间接近，属 **`CORRELATION_ONLY`**。本次保护措施属**防护性**，**并未证明**其为当次丢失原因。本人**未**据此归责任何一方。

---

## 九、非阻塞观察项（登记，非 blocker）

| # | 观察 | 建议 |
|---|---|---|
| O-1 | 负例现携带较多附加码（因 `SOURCE_GRADE` 降为 D 触发链式规则），但**本意码全部保留** | 可接受；若后续负例诊断力下降再优化 |
| O-2 | fixture 实体 ID 仍含 `facsimile` / `shanjiaqinggong` 等历史命名残留 | 建议后续统一为 `fixture_edition_*` 风格（纯命名，无质量影响） |
| O-3 | `docs/kb-002/03`–`11` 仍以旧口径引用 `PARTIAL_GOLDEN_SET` / `QUALIFIED_GOLDEN_COUNT` | 数值诚实，但术语需按 `12-` 对齐；建议独立文档对齐任务（已由 `t23` 提出） |
| O-4 | 遴选层计数 5 与 production 计数 0 是两个不同量 | `12-` §8 已记录该关系，**不得混用** |

---

## 十、只读合规声明

本人**未修改**任何实现、测试、数据、配置或他人报告。唯一写入文件为 **`docs/kb-002/14-qa-gate-contract-fix.md`**。

临时探针脚本置于 `tmp/`（`qa-t25-verify.mjs`、`qa-t25-scan.mjs`、`qa-t25-context.mjs`），将在报告提交后清理；**未**触碰 `data/kb/generated/` 中的真实 adapter 产物；**未**在 `staging/` 目录创建任何文件（该目录属本人 out-of-scope，E-7/E-8 改以「测试存在性 + 源码断言 + 上游实测」三重核对）。
