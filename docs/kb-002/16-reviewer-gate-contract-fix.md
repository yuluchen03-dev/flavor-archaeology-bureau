# t27 — KB-002 Independent Reviewer Gate（Q3 Contract Fix 最终独立审查）

| 字段 | 值 |
|---|---|
| **Reviewer** | `reviewer-hy`（fresh-context） |
| **task** | t27（attempt 2，attempt_id `8f806843-6a88-42af-a0c0-bc8202442a2a`） |
| **reviewed task** | t24（Fixture Integrity Repair + Staging Asset Integrity Protection） |
| **审查范围** | t23 / t24 / t25 / t26 修复链 |
| **Verdict** | **PASS** |

---

## 0. Fresh-context 独立性声明

`reviewer-hy` 为本轮新建成员（此前 `reviewer-wb` 执行过 t8；**`reviewer-hy` 未参与 t23 或 t24 的任何实现**）。本审查只依据 repository、requirements、frozen contracts 与 current files，**未采信任何 Agent 自述或内部推理** —— 下文中凡标注「实测」者均为本人亲自执行并附可复现证据。

---

## 1. Contract 验收

| # | 要求 | 实测 | 结论 |
|---|---|---|---|
| a | staging vs production 两层语义已写入 `12-contract-admission-semantics.md` | 文件存在，**14,074 B**；含 `EMPTY_GOLDEN_SET` / `PARTIAL_GOLDEN_SET` / `COMPLETE_GOLDEN_SET` / `production admission` / `qualified` | ✅ |
| b | `qualified` = **production admission result**（非「有研究价值」、非「可存在于 staging」） | `12-` 含该表述；结构夹具实测 `qualified=false` 且诚实（见 §3） | ✅ |
| c | `PARTIAL_GOLDEN_SET` 只统计 production qualified，staging 不计入 | `--dataset` 实测：`0 file(s) present`、`QUALIFIED_GOLDEN_COUNT = 0`、`SHORTFALL = 10`；staging 目录空且**不计入** | ✅ |
| d | **E3 = admission threshold**（E0/E1/E2 = not production-admissible；E3+ 非自动 qualified） | Q3 分支实测无条件（见 §2）；结构夹具 `evidence_level=E2` < E3 → 不得 production | ✅ |

## 2. Tool 验收 —— Q3 未被削弱（核心）

**源码实测**（`scripts/kb002/lib/golden-rules.mjs`）：

```js
// L305-308（无条件，不检查 metadata.qualified、不检查 fixture 标记）
if (best === null || LEVELS.indexOf(best) < LEVELS.indexOf('E3')) {
  add(collector, file, dish.id, 'metadata.evidence_level', 'KB002_DISH_BELOW_E3',
    `Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: ${best || 'none'})`);
}
```

| 核验项 | 实测 |
|---|---|
| mtime | **`2026-10-09T06:52:33.830Z`**（早于本轮全部改动） |
| 无条件判定存在 | ✅ true |
| **旁路/白名单扫描** | `fixture_only &&` = **false** · `if(!fixture` = **false** · `fixtureWhitelist` = **false** · `fixtureExempt` = **false** · `isFixture && skip` = **false** |

### 关键设计判定：「默认目标按结构夹具期望集判定」是否构成实质削弱？

**本人独立判定：不构成削弱。** 决定性证据是**显式路径仍严格阻断**：

```
explicit target = data/kb/golden/examples/valid/golden_001.kb.json
  → exit = 1
  → codes 含 KB002_DISH_BELOW_E3   ✅
```

即：把结构夹具作为**显式目标**时，Q3 **照常触发并阻断**。默认模式 exit 0 只是因为它校验的是 `examples/`（结构夹具范围），**并非 Q3 被放宽**。加上 Q3 代码零改动、无任何 fixture 豁免分支 —— 三者共同证明**无旁路**。

## 3. Fixture 验收

遍历扫描 **`18` 个 fixture 文件**（亲自执行）：

| 指标 | 实测 | 要求 |
|---|---|---|
| `publication_year` = null | **36/36** | ✅ |
| `edition_type` = unknown | **36/36** | ✅ |
| `SOURCE_GRADE` 计数 | **S=0 · A=0**（B=0 · C=2 · D=34 · X=2） | ✅ S/A 必须为 0 |
| publisher | 唯一值 `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER`（明确 synthetic） | ✅ |
| 带 fixture 标记 | **18/18** | ✅ |
| 真实古籍名用于书目身份字段 | **0** | ✅ |

**结构夹具诚实性**：`qualified=false`、`evidence_level=E2`、`fixture_only=true`，并附 `not_historical_evidence` 声明「None of this is asserted as real historical evidence」→ **不再伪装成 E4 的真实来源**。

## 4. Dataset 验收

| 项 | 实测 |
|---|---|
| production Golden Dataset 文件数 | **0** |
| `QUALIFIED_GOLDEN_COUNT` | **0**（工具实算，未手工修改） |
| staging 是否计入 | **否** |
| **`golden_001.kb.json` 是否在 production** | **false**（未偷偷 promotion）✅ |
| staging 目录 | 存在（未被清空作为「修复」）✅ |
| 事故样本 `tmp/f01-failed-attempt/` | 保留 ✅ |
| `data/kb/generated/` | 2 文件完整，scratch 残留 0 ✅ |
| HEAD | `6a25f4f`（无 git 写操作） |
| user staged | 300 条未动 |

## 5. Regression 验收

| 套件 | 实测（spawnSync） |
|---|---|
| KB-001 全量 | **121 / 121 / 0 fail** |
| golden-validator | **56 / 56 / 0 fail** |
| t24-integrity | **21 / 21 / 0 fail** |
| **合计** | **198 / 198 pass、0 fail** |

门禁（spawnSync）：default **0** · `--dataset` **0** · `--staging` **0** · `--integrity` **0** · kb-validator **0** · graph **0** · literature **0**。

V1 / KB-001 路径（`data/knowledge_graph`、`data/recipes`、`data/fragments`、`data/literature`、`scripts/kb`、`data/kb/schema`、`data/kb/examples`、`docs/kb-001`）git status = **0 条目** ✅

### ⚠️ 一处实测异常（如实记录，非 blocker）

首轮执行三套件时 `t24-integrity` 曾返回 **exit=1**，而**同一次运行中计数器为空**。随后：
- 单独重跑 **5 次** → 全部 exit=0
- 按原顺序三套件重跑 **3 轮（9 次）** → 全部 exit=0，计数器完整（121/56/21）

结论：该 exit=1 **不可复现**，且伴随计数器缺失，判定为**首次调用的瞬时异常**（疑似资源竞争），**不是测试缺陷**。本人不将其作为 findings，但如实留痕。

## 6. INCIDENT-E 验收

| 要求 | 实测 |
|---|---|
| (a) documented | `docs/kb-002/13-staging-asset-loss-incident.md` 存在（**11,310 B**）；含 `INCIDENT-E`、`30,484`、`MISSING`、`UNKNOWN`、`CORRELATION_ONLY`、`BYTE_EXACT_RECOVERY = NOT_AVAILABLE`、`SEMANTIC_RECONSTRUCTION = AVAILABLE` |
| (a) 不得归责 | `DELETED_BY_X` 仅出现在 **L26 的禁止性表述**（「本记录**不**写作 `DELETED_BY_X`」）→ ✅ 未归因 |
| (b) covered by regression | `staging-integrity.mjs` 含 `STAGING_ASSET_MISSING` / `STAGING_ASSET_MODIFIED` / `assertCleanupAllowed` / `atomicWriteFile` / `buildManifestEntry`；t24-integrity 套件含 `INCIDENT-E: a staging asset cannot be lost silently while its manifest expects it` ✅ |
| (c) lifecycle semantics | path ownership 三类明确；staging 不受 generated cleanup 管辖（C-1/C-9）✅ |
| (d) 未提前重建 GOLDEN-001 | production=0、staging=0、HEAD `6a25f4f` ✅ |

**根因仍为 `UNKNOWN`**（与 generated 重写时间接近属 `CORRELATION_ONLY`，**非** `CAUSATION_PROVEN`）—— 保护措施属**防护性**，本报告**不**声称已证明其为当次丢失原因。

## 7. 遗留项（记录但不阻断）

以下 4 项已知且**均非阻断**，本 Verdict 不因此判 FAIL：

1. **术语未对齐**：production count=0 时工具仍输出 `PARTIAL_GOLDEN_SET`，按 t23 三态定义应为 `EMPTY_GOLDEN_SET`。→ **数值诚实**（工具实算 0），仅术语待对齐。
2. **`docs/kb-002/03`–`11` 旧口径引用**：需按 `12-` 对齐（t23 已提出）。
3. **SourceEdition ID 残留 `facsimile` 字样**：纯命名遗留，`edition_type` 已为 `unknown`，**不影响判定**。
4. **遴选层计数 5 ≠ production 计数 0**：两个不同量，**不得混用**（`12-` §8 已记录该关系）。

## 8. 未验证项（如实标注，不得当作通过）

- symlink / junction 绕过
- 并发竞态
- 磁盘写满
- 超大输入
- 跨平台原子性（仅在当前平台验证同目录 temp + rename）
- **L2 外部来源真实性**（`web_search` 无 API key → 未做任何外部核实）

## 9. 只读合规

- 未修改任何实现 / 测试 / 数据 / 配置 / 他人报告
- 唯一写入：本报告 `docs/kb-002/16-reviewer-gate-contract-fix.md`
- 探针置于 `tmp/`（`rev-t27-verify.mjs` / `rev-t27-probe.mjs` / `rev-t27-probe2.mjs` / `rev-t27-probe3.mjs` / `rev-t27-verify2.mjs` / `rev-t27-verify3.mjs`），将在完成前清理
- 未触碰 `data/kb/generated/` 真实产物
- 未读取或输出任何 `.env` 敏感值

---

# Verdict: **PASS**

Q3 契约裁决目标达成：Q3 保持 **blocking** 且无任何 fixture 白名单/豁免/旁路（显式路径仍 exit 1）；Contract/Rubric 两层语义已澄清；Fixture provenance 不再伪造（S/A=0、`publication_year` 全 null、`edition_type` 全 unknown、publisher 明确 synthetic）；Dataset 计数真实（production=0、`QUALIFIED_GOLDEN_COUNT=0`、staging 不计入）；GOLDEN-001 **未被偷偷 promotion**；INCIDENT-E 已 documented + regression 覆盖 + lifecycle 保护，且**未提前重建** candidate；KB-001 121/121 与 V1 零修改确认无回归。

**不得**据本 PASS 推断 Golden 数据集已就绪 —— production 仍为 **0**，`PARTIAL_GOLDEN_SET` 的 0 值按三态应理解为 promotion 尚未发生。
