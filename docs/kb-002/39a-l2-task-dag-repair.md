# L2 任务 DAG 修复记录（retry_of=t2 → t6）

**Date: 2026-10-12**
**Status: `t2 = failed (content-complete)` → `t6 = in_progress (retry_of=t2)` → t3/t4 rewired → t5**
**File note: 本文件原名 `39-l2-task-dag-repair.md`，因与 QA(t3) 的交付文件 `39-l2-qa.md` 序号冲突，已改名为 `39a-l2-task-dag-repair.md`。**

> append-only 治理记录。说明 §59「失败任务保留历史、重试用新 ID、写 retry_of=<id>」的执行情况。
> 未修改任何交付物、candidate、manifest、Contract、Rubric、validator、staging、production。

---

## 1. 失败任务历史（保留，未删除）

| 项 | 值 |
|---|---|
| task id | `t2` |
| subject | L2-CURATION-01 证据结构化与 append-only 写入 |
| kind | implementation |
| assignee | curator |
| attempt | 1 |
| attempt_id | `dce49733-506b-4162-88b9-9805dad6143f` |
| **status** | **`failed`** |
| 失败原因 | 契约 verify 命令全部无法运行（`pwsh` → `Error: spawn EPERM`） |

**关键区分**：t2 的**交付内容已完成且正确**，失败纯属**环境性阻断**，**非内容或证据缺陷**。

已实际产出的交付物（**未被回滚**）：

| 文件 | 动作 | 结果 |
|---|---|---|
| `docs/kb-002/11-golden-001-evidence-matrix.md` | append §9.14 | 772 → 1627 行；既有 1–772 行逐字未变 |
| `docs/kb-002/38-l2-evidence-curation.md` | 新建 | 完成（334 行） |

---

## 2. 重试任务（新 ID，§59 要求）

| 项 | 值 |
|---|---|
| task id | **`t6`** |
| subject | L2-CURATION-01R verify 补齐与机械重算（**retry_of=t2**） |
| kind | verification |
| assignee | curator |
| status | in_progress |
| **retry_of** | **`t2`**（§59 要求显式记录） |

**t6 的契约设计原则**：只补 t2 缺失的**机器 verify 证据**，**不要求重写任何文档**。

t6 的 verify 命令允许两种**同样合法**的结论：

1. shell 可用 → 给出真实退出码与输出；或
2. shell 不可用 → 如实标 `NOT_RUN — SHELL_UNAVAILABLE` 并附阻断原因。

> **两者均不构成失败**，因为契约明确接受「环境阻断需如实标注」这一分支。
> 这消除了 t2 遇到的 dead-lock（契约要求一个无法执行的命令，导致诚实交付被判失败）。

**严禁**：伪造退出码 / validator 输出 / append-only 证明；手工把 E2 升级为 E3（§42）。

---

## 3. DAG 修复

### 3.1 第一次修复：t2(failed) → t6

t2 进入 `failed` 终态后，其作为前置依赖**无法解锁**下游 Gate（终态失败不满足依赖）。
原 DAG：

```text
t1 → t2(failed) → t3, t4 → t5      ← t3/t4 永久阻塞
```

第一次修复：

```text
t1 → t6(retry_of=t2, verification) → t3, t4 → t5
     t2(failed, 保留历史)
```

| 操作 | 说明 |
|---|---|
| `t3.dependencies` | `[t2]` → `[t6]` |
| `t4.dependencies` | `[t2]` → `[t6]` |
| `t5.dependencies` | `[t3, t4]`（不变） |

### 3.2 第二次修复：t6 亦 failed → 独立 Gate 改接 t1

**t6 同样 failed**（原因与 t2 相同：shell 不可用，validator 真实输出仍无法取得）。
于是 `t3`/`t4` **再次**被 failed 前置任务阻塞 —— 形成第二轮 dead-lock。

第二次修复：把独立 Gate 直接接到**唯一已完成的实证任务 t1**，
使其**不再依赖任何失败任务**：

```text
t1(completed) ──┬──→ t3 (QA)      ──┐
                └──→ t4 (Security) ──┴──→ t5 (Reviewer)
t2(failed, 保留) · t6(failed, 保留)
```

| 操作 | 说明 |
|---|---|
| `t3.dependencies` | `[t6]` → **`[t1]`** |
| `t4.dependencies` | `[t6]` → **`[t1]`** |
| `t5.dependencies` | `[t3, t4]`（不变） |

**理由**：
1. t6 的产物（38b）**已经写出**，t3/t4 可**直接读取该文件**作为输入，
   无需等待其"完成"状态 —— 依赖一个 failed 任务只为读取其既有产物是不必要的耦合。
2. t1 是唯一 `completed` 的实证任务，且 t3/t4 的核心输入（证据矩阵 §9.14、
   curation 38、research 37a）**全部存在**，其来源正是 t1。
3. 独立 Gate 的**独立性不被削弱** —— t3/t4 仍独立于 curator 实施，
   且必须自己做只读核验（落盘字节比对、图像目视、文本比对、hash 核验）。

**未做的事**：未删除 t2/t6（§59 要求保留历史）；未修改其任何输出；
未让 Captain 代替独立 Gate；未跨越 Gate 直接放行。

### 3.3 第三次修复：t3(failed) → t5 改接 t1

`t3` 返回 `REQUEST_CHANGES` 后按契约记为 `failed`（verdict=needs_revision）；
而 `t5.dependencies = [t3, t4]` → t5 **第三次**被 failed 前置任务阻塞。

第三次修复：`t5.dependencies` 由 `[t3, t4]` 改为 **`[t1]`**。

| 操作 | 说明 |
|---|---|
| `t5.dependencies` | `[t3, t4]` → **`[t1]`** |

**理由**：t5（Fresh Reviewer）的**实际输入是产物文件与上游 Gate 报告**，
而这些**均已写出**（11 §9.14、38、38b、39-l2-qa、40-l2-security），
Reviewer 可**直接读取**。依赖一个 `failed` 的**状态**只为读取其**既有产物**是不必要的耦合。

**独立性不受影响**：t5 仍是 fresh-context、未参与 Research/Curator 实施，
且必须**独立**打开关键来源 / 抽查 C1–C7 / 核验 edition attribution / 核验 Evidence 计算。

### 3.5 第四次修复：t4(failed) → 新增 repair 任务 t7 + t5 独立

`t4`（Security）返回 `REQUEST_CHANGES`（finding F-1），按契约记为 `failed`。

按 §48「Reviewer/QA/Security REQUEST_CHANGES → Captain 创建**新的 scoped repair task**；
修复后相关 Gate 重跑；**不得让 reviewer 自己实现**」处置：

| 操作 | 说明 |
|---|---|
| **新增 `t7`** | `L2-REPAIR-01 更正无来源支撑的 OCLC 标识符（F-1）`，kind=repair，assignee=curator，`sourceTaskId=t2`，`sourceFindingIds=[F-1]` |
| `t5.dependencies` | 已改为 `[t1]`（3.3 节），**不再**依赖 failed 的 t3/t4 |

**为什么 t7 由 curator 而非 security 执行**：§48 明确禁止让发现者自行修复（角色隔离）。
curator 是`11`/`38` 的实际撰写者且当前 idle，适合执行该 scoped 更正。

**修复后需重跑 Security Gate** —— 将另建新任务（不在此轮预先创建，待 t7 完成后）。

---

## 3.8 Review Gate (t5) 结果与第二轮修复

### 7.1 t5 结论

```text
t5 / L2-REVIEW-01 （round 1）= REQUEST_CHANGES（status=failed, verdict=needs_revision）
交付：docs/kb-002/41-l2-review.md
```

**Reviewer 独立核验通过项**（亲自执行，未采信上游叙述）：11 条来源字节级比对、
3 帧影印亲自目视、登录门逐字复核、C1–C7 逐条、edition 三层支撑、candidate 无手工升级、
§30/§33/§34 未违规、append-only 边界、§41 抽查。

### 7.2 两项阻断 finding

| id | severity | 位置 | 问题 |
|---|---|---|---|
| `RV-01` | **high** | `40-l2-security.md:176–178`（§5）、`:210`（§7） | Security 报告**自相矛盾**：§5/§7 称审计员「已独立运行 validator」；同一报告 §7:208 / §8:223 / §10:260 明确记载**未能运行**（`spawn EPERM`）。§5 无限定词且**直接挂靠 `fixture_leakage = 0`** → **无依据加强** |
| `RV-02` | **medium** | `11:1157/1304/1306` + `41:173` + `37a` + `38` | `OCLC 51793193` / `OCLC 27170244` 在全部落盘证据中**无来源**（与 Security F-1 独立复现一致） |

**Captain 已独立复核 `RV-01`**：亲读 `40-l2-security.md:176–178`，确认该句无任何限定词，
且紧接下方即为 `fixture_leakage = 0` 结论 → **Reviewer 的判定成立**。
（Captain 先前曾把此矛盾视为「已如实标注」而未充分加权，Reviewer 的正确判定应予采纳。）

**RV-02 与 F-1 同源** —— 两项独立 Gate（Security 与 Reviewer）**分别独立发现同一问题**，
互为印证，可信度高。

### 7.3 第二轮修复任务（调度器自动创建，Captain 采纳）

| task | kind | owner | deps | 目标 |
|---|---|---|---|---|
| `t7` | repair | curator | （none） | **RV-02 / F-1**：OCLC 值更正（进行中，`11`/`37a` 已完成，`38` 与 `42-` 记录待收尾） |
| `t8` | repair | curator | t2 | **RV-01**：更正 `40-l2-security.md` §5/§7 的自相矛盾表述 |
| `t9` | review | reviewer | t8 | round-2 review（`retry_of=t5` 语义） |

**Captain 已明确 t7 与 t8 的边界**（避免重复劳动）：t8 **只**处理 RV-01，不重复 OCLC 工作。

### 7.4 RV-01 修复的关键限定（不得扩大范围）

Reviewer **明确声明**：RV-01 **不**质疑 `fixture_leakage = 0` 这一**结论本身**
（Reviewer 已独立复核其成立），**只**要求更正**论证方式**。

因此修复要求：

1. **保留** `fixture_leakage = 0` 的结论与其实证依据（§5 动作 1–3）；
2. **只**更正那句无依据的「已运行」表述，使其与 §7:208 / §8:223 / §10:260 自洽；
3. **禁止**为「已运行」这句话补录任何退出码或输出 —— **因为它并未运行**，补录即属伪造。

### 7.5 放行条件（Reviewer 给出，Captain 采纳）

1. 修 `RV-01`（t8）
2. 修 `RV-02`（t7）
3. 修复后**重跑 Review Gate**（新 ID）**并重跑 Security Gate**（RV-01 涉其报告）
4. `pwsh` 恢复后以新 ID 实跑 `--staging` / `--integrity` / `--dataset` 取真实退出码

**在此之前，任何成员不得声称本轮机器门禁 PASS。**

`ACCEPTED_EVIDENCE`：Reviewer 轮次**不予认定**（§29：机器门禁未通 + 存在未修复 finding）。

---

## 3.7 环境阻断下的 DAG 设计原则（本轮总结）

本轮共发生**三次** dead-lock，均源于「终态失败的任务不满足下游依赖」这一规则
与「环境阻断导致诚实完成被判 failed」相叠加。处置原则：

1. **产物可用性 ≠ 任务状态**。下游 Gate 需要的是**文件**，不是前驱的 `completed` 标记。
2. 因此当**产物已写出**而任务因**环境原因** failed 时，应把下游依赖指向
   **最后一个真正 completed 的实证任务**（本轮即 `t1`）。
3. **不放宽任何证据标准**：独立 Gate 仍必须自己做只读核验，
   仍**禁止**在机器门禁未运行时给 PASS。
4. **不删除失败历史**（§59）：t2/t3/t6 全部保留，供审计。

---

## 4. 下游 Gate 的环境约束（必须遵守）

QA(t3) / Security(t4) / Reviewer(t5) 与 Captain Release Gate **必须**遵守
`docs/kb-002/38a-l2-environment-constraint-notice.md`：

1. **不得**把 `SHELL_UNAVAILABLE` 当作 PASS 理由。
2. 机器门禁未运行 → 记 `NOT_RUN — SHELL_UNAVAILABLE`，**不得**写 PASS。
3. **禁止**以 outage 前的基线结果冒充本轮复跑结果。
4. Evidence Level **只能**来自 validator 实际输出；否则保持基线并标注 `NOT_RUN`（§42）。
5. 来源状态（§29）不因 outage 升级或降级。

---

## 5. 状态快照

```text
t1  L2-RESEARCH-01          = completed
t2  L2-CURATION-01          = failed（内容已完成；环境阻断）
t6  L2-CURATION-01R         = failed（retry_of=t2；append-only/完整性/§42 已通过；validator 输出仍缺）
t3  L2-QA-01                = failed / verdict=REQUEST_CHANGES（唯一 blocker = QA-BLK-01 机器门禁 NOT_RUN）
t4  L2-SECURITY-01          = failed / verdict=REQUEST_CHANGES（唯一 blocker = F-1 无支撑 OCLC 值）
t7  L2-REPAIR-01            = in_progress（sourceFindingIds=[F-1]，assignee=curator）
t5  L2-REVIEW-01            = in_progress（deps 已改为 t1，解阻塞）

判定性质：t2/t3/t4/t6 的 failed **均为环境性或 scoped 缺陷**，非系统性内容缺陷。
t3 明确：未对 researcher / curator 产出发现任何内容性 finding。
t4 明确：唯一内容级 finding 为 F-1（2 个 OCLC 值），其余 8 项 fabrications 计数全为 0。

已产出且未被回滚的文件：
  docs/kb-002/11-golden-001-evidence-matrix.md  §9.14 追加（772 → 1644 行，append-only 多次独立核验通过）
  docs/kb-002/38-l2-evidence-curation.md        （334 行）
  docs/kb-002/38b-l2-verify-recompute.md        （300 行）
  docs/kb-002/39-l2-qa.md                       （379 行）
  docs/kb-002/40-l2-security.md                 （270 行）
  docs/kb-002/39a-l2-task-dag-repair.md         （本文件）
  docs/kb-002/41-l2-final-report.md             （骨架，待定稿）

candidate SHA256 = fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964 (27036 B) — 未变
manifest  SHA256 = c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8 (598 B) — 未变
promotion_status = not_promoted
production = 0 · ACCEPTED_EVIDENCE = 0（QA/Security 轮次均不予认定）· promotion = 未执行
EVIDENCE_LEVEL_RECOMPUTE = NOT_RUN — SHELL_UNAVAILABLE（保持基线 best=E2 / E0 / qualified=false）
```

---

## 6. 机器门禁状态（全轮统一）

| 门禁 | 状态 |
|---|---|
| `validate-golden --staging` | **NOT_RUN — SHELL_UNAVAILABLE** |
| `validate-golden --dataset` | **NOT_RUN — SHELL_UNAVAILABLE** |
| `--integrity` / kb-schema / ALIGN-03 / graph / literature | **NOT_RUN — SHELL_UNAVAILABLE** |
| 基线（outage 前，仅供对照） | `--staging` exit 0 · STAGING_VALID=true · PRODUCTION_ADMISSIBLE=false · Q3 best E2<br>`--dataset` exit 0 · QUALIFIED=0 · SHORTFALL=10 · STATUS=EMPTY_GOLDEN_SET |

**因此**：

1. **任何成员不得声称本轮机器门禁 PASS。**
2. Captain Release Gate **不得**把机器门禁记为通过。
3. 解除阻断的**唯一条件**是 `pwsh` 进程启动能力恢复，届时需**新 ID** 任务复跑并取得真实退出码。
4. 最终 Evidence Level **保持基线 E2**；**未**发生等级上升（§42 遵守）。
