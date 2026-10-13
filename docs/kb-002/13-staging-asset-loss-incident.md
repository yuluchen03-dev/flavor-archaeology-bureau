# INCIDENT-E — STAGING_ASSET_LOSS 事故记录

| 字段 | 值 |
|---|---|
| **incident id** | `INCIDENT-E — STAGING_ASSET_LOSS` |
| **severity** | `DATA_INTEGRITY_INCIDENT` |
| **阻断级别** | `NON_PRODUCTION_CONTAMINATION`（丢失的是 staging candidate；production Golden Dataset 始终为 0，故**无 production 污染**） |
| **detected_at** | 2026-10-09（t23 完成后 Captain 例行 baseline 对比时发现） |
| **detected_by** | Captain |
| **recorded_at** | 2026-10-09 |
| **状态** | 已登记、已遏制；重建**延后至 t27 PASS 后**（人工裁决 `REBUILD_AFTER_T27_PASS`） |

---

## 1. Missing Asset

| 项 | 值 |
|---|---|
| **asset** | GOLDEN-001 staging candidate（蟹酿橙） |
| **原路径** | `data/kb/golden/staging/golden_001.kb.json` |
| **原大小** | **30,484 B** |
| **原角色** | 真实研究候选（Candidate / Staging Layer）；非 production Golden Record |
| **当前状态** | **`MISSING`** |
| **last known state** | 实测存在（Captain 于 t22 后独立核验：17 实体 / 25 关系 / 7 Claim = 5×E2 + 2×E0 / 全部 `insufficient` / 全部 `unreviewed` / `qualified=false` / `evidence_level=E0` / 无 fixture 标记 / 无伪造年份 / 无 facsimile / 无 verified / 无 E5 / chain `resolved`） |

> **注**：本记录**不**写作 `DELETED_BY_X`。删除操作方**未确定**（见 §4）。

---

## 2. Production Impact

| 项 | 值 |
|---|---|
| production Golden Dataset file count | **0**（事故前、事故后均如此） |
| `QUALIFIED_GOLDEN_COUNT` | **0**（真实计算值，未受影响） |
| production 污染 | **无** |
| 门禁影响 | **无**（golden validator 0 / golden tests 56 pass / kb validator 0 / KB-001 121 pass / graph 0 / literature 0） |

**结论**：本事故**不构成 production 污染**，但构成**真实的数据完整性事故**。

---

## 3. 为何仍属真实数据完整性事故

- 一份**有研究价值的诚实 candidate** 被移除
- 该文件当时**未被 Git 跟踪**
- **无 stash** 可恢复
- **回收站无**恢复副本
- `staging/` 目录**仍存在**（文件级资产丢失，非目录删除）
- 删除操作**没有明确 provenance**

---

## 4. Root Cause

### 4.1 正式根因

```
ROOT_CAUSE = UNKNOWN
```

**不得**在无直接证据的情况下写作：`curator 删除` / `Captain 删除` / `validator 删除` / `generated rewrite 删除` / 任何具体 Agent 删除。

### 4.2 已知时间相关性

| 时间 | 事件 |
|---|---|
| 00:43:57 | `curator-a`（t22）落盘候选，30,484 B；Captain 随后独立核验通过 |
| 14:07:43 | `validate-golden.mjs` mtime（t19 时期，非本轮） |
| 14:08:11 – 14:09:35 | t23 修改 3 个文档（仅文档） |
| **14:10:22** | **`data/kb/generated/` 被重写**（`kb-v2.kb.json` 367,163 B；`adaptation-report.json` 119,972 B） |
| t23 完成后 | Captain 例行对比 baseline 时发现 `--staging` 由 **1 → 0**、staging 文件数由 **1 → 0** |

**定性**：candidate 丢失时间点与 `data/kb/generated/` 重写时间**接近**。

```
CLASSIFICATION = CORRELATION_ONLY
NOT = CAUSATION_PROVEN
```

**不得**据此归责任何一方。

### 4.3 Captain 自身责任表述

Captain **无法完全排除**自己的某条操作存在**间接副作用**。

但审计显示：已执行的 PowerShell 命令中**没有**任何明确针对 staging candidate 的删除命令（如 `Remove-Item <staging candidate>`）。

因此正式记录两项并存的事实：

```
DIRECT_DELETE_COMMAND_NOT_OBSERVED
INDIRECT_SIDE_EFFECT_NOT_RULED_OUT
```

保持诚实，不做过度归因。

---

## 5. Recovery Attempts

| 途径 | 结果 | 原因 |
|---|---|---|
| **Git recovery** | **FAIL** | 文件**从未被 Git tracked**（`data/kb/golden/` 为未跟踪目录） |
| **Stash recovery** | **FAIL** | 无对应 stash 条目 |
| **Recycle Bin recovery** | **FAIL** | 无对应文件 |
| 全盘搜索 | **FAIL** | 磁盘上已无该 30,484 B 文件（仅存 `examples/valid/` 夹具 17,607 B 与事故样本 14,009 B） |

```
BYTE_EXACT_RECOVERY = NOT_AVAILABLE
```

---

## 6. Reconstructability

```
SEMANTIC_RECONSTRUCTION = AVAILABLE
```

**保留的重建依据（source-of-truth）**：

| 依据 | 状态 |
|---|---|
| `docs/kb-002/11-golden-001-evidence-matrix.md` | ✅ **完整保留**（541 行，含 §7 Captain 更正、§8 curator-a 发现） |
| 仓库指针 `dish_001` | ✅ 存在（蟹酿橙 / 宋代 / `source_text=山家清供`） |
| 仓库指针 `recipe_001` | ✅ 存在（`source=《山家清供》卷下`；5 食材 / 6 步骤） |
| 仓库指针 `text_001` | ✅ 存在（山家清供） |
| 仓库指针 `lit_ccs_014` | ✅ 存在（山家清供；含 authority 块） |
| 生成规格（历史记录） | 17 实体 / 25 关系 / 5×E2 + 2×E0 / claims=`insufficient` / `qualified=false` / dish level `E0` |

> **⚠️ 重要限定**：上述生成规格属**历史 reconstruction evidence**，**不得**直接当作新 candidate 的最终 truth。重建时必须**重新读取真实仓库状态**，并依 **t23–t27 后的最终 Contract** 重新生成。

---

## 7. Immediate Containment（已执行）

| # | 措施 | 状态 |
|---|---|---|
| 1 | 停止一切 candidate 重建尝试 | ✅ 已停止 |
| 2 | 保持 `F01R1 = BLOCKED_CONTRACT_CLARIFICATION_AND_ASSET_INTEGRITY` | ✅ |
| 3 | 保持 production Golden Dataset = 0 | ✅ 实测 0 |
| 4 | 保持 `staging/` 目录存在（不清空、不删除目录作为「修复」） | ✅ 目录存在 |
| 5 | 保留事故样本 `tmp/f01-failed-attempt/`（未提交，ignored） | ✅ 保留 |
| 6 | 保留 Evidence Matrix（含 §7/§8），不覆盖、不删除 | ✅ |
| 7 | 保留 `curator-a` 越界记录（`AUTHORIZED_AFTER_THE_FACT_FOR_INCIDENT_DISCOVERY`），不因 candidate 丢失而删除 | ✅ |
| 8 | 未修改 Q3 / 未降 E3 / 未改 Validator | ✅ |
| 9 | 未新建 replacement candidate / 未手工近似 golden_001 / 未从事故报告复制 JSON / 未把 incident sample 当 replacement | ✅ |
| 10 | 未指责任何成员 | ✅（根因 `UNKNOWN`） |

---

## 8. Permanent Corrective Actions（授权 t24 实施）

本次事故新增 `INCIDENT-E` 至永久事故回归清单：

| 编号 | 事故模式 |
|---|---|
| INCIDENT-A | fixture 使用虚构 `publication_year` 达成 admission |
| INCIDENT-B | placeholder publisher 被错误用于 provenance quality |
| INCIDENT-C | `qualified=false` candidate 可能混入 production |
| INCIDENT-D | `PARTIAL_GOLDEN_SET` 错误统计 staging candidate |
| **INCIDENT-E** | **关键 staging candidate 可被静默删除且缺乏资产保护** |

### 8.1 Staging Asset Integrity Protection（t24 最小子范围）

**这不是 F01 数据重建**，而是防止同类数据资产再次静默丢失。

| # | 要求 |
|---|---|
| C-1 | **路径隔离验证**：证明对 `data/kb/generated/**` 的 rewrite / cleanup / validation / regeneration **不得删除** KB-002 staging candidate。Generated lifecycle 与 Staging lifecycle **必须相互隔离** |
| C-2 | **禁止 broad cleanup**：KB tooling 不得通过过宽路径执行 recursive delete / clean directory / recreate parent directory / remove wildcard 从而影响 staging assets。cleanup 只能作用于工具**明确 ownership** 的目录 |
| C-3 | **Path Ownership 三类明确**：`generated`（机器可重新派生，允许 generator 生命周期管理）／`staging`（有研究价值、尚未 production-admitted，**禁止 generated tooling 清理**）／`production`（正式 Golden Dataset，只有 promotion/authorized mutation workflow 可修改） |
| C-4 | **Staging asset manifest**（轻量）：至少记录 asset logical id / expected relative path / status / byte size / SHA-256 / generated-or-reconstructed at / source task / lifecycle class = staging / promotion status。**不得**做成复杂 artifact database |
| C-5 | **Manifest 不得伪造资产存在**：若 manifest 记录 asset exists 但文件不存在，integrity check 必须报 **`STAGING_ASSET_MISSING`**；**不得**仅因 manifest 存在即视为 candidate 完整 |
| C-6 | **Atomic write**：staging candidate 应使用 write temp → fsync/close → atomic rename（或项目当前等效安全方式）。按平台能力实施，**不**为实现跨平台完美原子性扩大 scope |
| C-7 | **Validator 禁止删除 candidate**：Golden validator 只读验证，不得删除 / move / rewrite / normalize 后覆盖 candidate。若已纯只读，**新增 regression test 固化** |
| C-8 | **`--dataset` / `--staging` / `--file` 非破坏性测试**：input assets 的 existence / byte size / hash 在验证前后必须一致 |
| C-9 | **Candidate preservation test**：创建 synthetic staging candidate → 记录 SHA-256 → 运行所有相关 KB-002 validators → 运行 generated regeneration/validation 路径 → 再算 SHA-256；必须 file still exists **AND** hash unchanged |
| C-10 | **Production isolation test**：staging = 1、production = 0 时，`QUALIFIED_GOLDEN_COUNT` 必须 = **0** |
| C-11 | **Empty staging ≠ success**：staging 为空时，**不得**把 validator exit 0 解释为「GOLDEN-001 candidate healthy」。必须区分 **asset-presence integrity** 与 **schema/quality validation** 两个概念 |

---

## 9. 状态定义（本次裁决后）

```
KB-002 STATUS = CONTRACT_FIX_IN_PROGRESS
F01R1         = BLOCKED_CONTRACT_CLARIFICATION_AND_ASSET_INTEGRITY
Production Golden Dataset  = 0
Staging Golden Candidate   = 0 currently present
Lost candidate             = reconstructible
Incident                   = STAGING_ASSET_LOSS / INCIDENT-E
```

---

## 10. 后续恢复点（不得跳步）

```
t24 Fixture + Asset Integrity Repair
  ↓
t25 QA   ∥   t26 Security
  ↓ 二者 PASS
t27 Independent Reviewer
  ↓ PASS
Captain Contract Fix Release Gate
  ↓ PASS
解除 BLOCKED_CONTRACT_CLARIFICATION_AND_ASSET_INTEGRITY
  ↓
创建 KB-002-F01R2 — GOLDEN-001 Candidate Reconstruction（新唯一 ID，不覆盖旧任务）
  ↓
写入 staging → 计算 SHA-256 → 更新 staging manifest → staging validation
  ↓
后续 F01 qualification workflow
```

**重建时的强制约束（§32/§33/§34/§35）**：

- 表述必须是 **`RECONSTRUCTED_FROM_PRESERVED_EVIDENCE`**，**不得**声称 `RECOVERED_ORIGINAL`
- 必须重新读取：Evidence Matrix、仓库指针、**accepted Contract**、**accepted Rubric**、current schemas、current validator
- **不得**只根据 t22 output 自动生成
- 输出先写 **staging**，随即计算 SHA-256、更新 manifest、运行 staging validation、保留 reconstruction task id
- **不得**直接 production promotion
- 若重建结果与原记录不同：**允许**，但必须记录 **`RECONSTRUCTION_DIFF`**（哪些字段不同 / 为何不同 / 是否由 Contract clarification 导致 / 是否影响 Evidence Level / 是否影响 qualification）
- **不得**为了匹配历史 30,484 B 而人为调整内容

---

## 11. Final Principle（三条同时成立）

1. **不合格 candidate 必须允许保留。** —— Staging Candidate 的价值不在于它已 qualified，而在于它保存了**真实研究状态**。
2. **不合格 candidate 必须禁止进入 production。**
3. **候选资产本身也必须受到完整性保护**，不能因为它未被 Git 跟踪就允许静默消失。
