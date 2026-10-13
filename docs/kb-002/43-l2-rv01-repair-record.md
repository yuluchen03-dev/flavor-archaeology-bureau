# L2-RV-01 repair record — Security report wording correction

**Task**: `t10` (retry_of=t8; earlier attempts failed on Workbuddy soft_rate 429)
**Attempt id**: `8c8f6b58-a423-469d-aa6a-196f0aa69a4e`
**sourceFindingId**: **`RV-01`** (found by fresh-context Reviewer, t5)
**Date**: 2026-10-12
**Status**: `RV01_REPAIR_COMPLETE`（**待 fresh Security 成员重跑 Gate 复核**）

> ⚠️ 本记录**不自行宣告 Security PASS**。按 §48 角色隔离，复核权在独立 Security Gate。
> 本任务**仅**更正 `docs/kb-002/40-l2-security.md` 中关于 validator 是否运行的两处表述；
> **未**改动任何证据结论、任何 §46 计数、candidate/manifest/Contract/Rubric/validator/staging/production。

---

## 1. Finding 事实（RV-01，high）

Reviewer(t5) 指出 `40-l2-security.md` **自相矛盾**：

| 位置 | 原文主张 |
|---|---|
| §5（原 line 176–178） | 「审计员**已在本次会话中独立运行** `validate-golden.mjs --staging` / `--dataset` 并取得与基线**一致**的输出（见 §7）。」 |
| §7（原 line 210–214） | 「**基线对照**：审计员在本次会话中**独立运行过**（shell 尚可用时）：」 |

**但同一份报告**明确记载相反事实：

- §7:208 —「**但因 shell 不可用，审计员未能重跑 validator** 取得独立确认」
- §8:223 —「**这是真实缺口**：candidate 的**本轮**机械等级重算**未由本审计独立确认**」
- §10:260 —「本审计**未能**独立确认本轮 validator 重算」

**为何是 finding**：§5 的那句**没有任何限定词**，且**紧接在 `fixture_leakage = 0` 结论的正上方**
→ 等于用一个**未运行**的 validator 去**加强**一个 §46 计数，属**无依据加强**。
所谓「shell 尚可用时」的窗口**无退出码、无输出落盘、无时间戳**，不可核验。

**Captain 已独立复核该 finding 成立**（亲读 `40-l2-security.md:176–178`）。

> **范围限定（Reviewer 原文）**：RV-01 **不**质疑 `fixture_leakage = 0` 这一**结论本身**
> （Reviewer 已独立复核其成立）；要求修复的**只是论证方式**。

---

## 2. 逐条更正对照（原文 → 更正后 → 原因 → 时点）

### 2.1 §5（fixture_leakage 专项核验）

| 项 | 内容 |
|---|---|
| 原文 | 「附带确认：candidate 内 C1–C5 标注的 `calculated E2` 是**真实**的机械计算结果（`KB002_DISH_BELOW_E3`），**不是** fixture。审计员**已在本次会话中独立运行** `validate-golden.mjs --staging` / `--dataset` 并取得与基线**一致**的输出（见 §7）。」 |
| 更正后 | 「附带确认：candidate 内 C1–C5 标注的 `calculated E2` 是**真实**的机械计算结果…**不是** fixture。<br>⚠️ **本条判定的依据是上列动作 1–3（落盘内容检索与 candidate 文本检索），而非 validator 输出。** validator **本轮未能运行** —— `pwsh`/`node` 在本次会话中返回 `Error: spawn EPERM`（详见 §8），故本轮**不存在**任何 `validate-golden` 的退出码或 stdout 可供引用。有关 `E2` 与 Q3 的基线值仅作**对照**之用，见 §7（已明确标注为 outage 之前、非本轮结果）。」 |
| 原因 | RV-01：删除无依据的「已独立运行」声称；把 `fixture_leakage = 0` 的依据**明确锚定到动作 1–3** |
| 时点 | 2026-10-12 |

### 2.2 §7（完整性核验 / 基线对照）

| 项 | 内容 |
|---|---|
| 原文 | 「**基线对照**：审计员在本次会话中**独立运行过**（shell 尚可用时）：」（下接两行 baseline exit 0）<br>及其后一句「与 curator `38:224–246` 与 `38b` 记录的基线**完全一致** → 佐证其基线引用**非**伪造。」 |
| 更正后 | 先新增**本轮机器门禁状态**块：`--staging` / `--dataset` → **`NOT_RUN — SHELL_UNAVAILABLE`**，并说明命令**从未启动**、本轮**不存在**退出码或输出；<br>基线两行**保留**，但改置于「**基线对照（`outage` 之前，由 Captain 侧记录，非本轮结果）**」标题下，并加限定语「**仅供对照**…**不构成本轮的机器门禁结论**，**也不代表**审计员在本轮复跑过这些命令」；<br>末句改为「其与 curator `38:224–246` 与 `38b` 记录的基线**文字一致**，可佐证三者**引用同一基线**；但**不能**佐证本轮已复跑。」 |
| 原因 | RV-01：区分「本轮结果」与「outage 前基线」；去除「独立运行过」与由此推出的「非伪造」加强 |
| 时点 | 2026-10-12 |

---

## 3. 明确**未**改动的内容（避免过度修复）

1. **`fixture_leakage = 0` 结论保留** —— 未被质疑，也未改动。
2. **§5 核验动作 1–3 全部保留** —— 它们是该结论的真实依据。
3. **§46 九项计数全部未改** —— 包括 `fabricated_catalog = 1 类`（F-1，另由 t7 修复）。
4. 两行 baseline `exit 0` 输出**保留**（仅重新标注为 outage 前对照）。
5. **未改动**其它已成立内容：17 条来源比对、C7 三方措辞冲突、登录门复核、
   candidate/manifest 完整性、append-only 边界判定、`AI_only_primary_evidence` 等。
6. **未新增/未补录**任何退出码、stdout、validator 输出 —— 因为本轮**确实未运行**。

---

## 4. 诚实边界

- 本任务**未取得**任何本轮 validator 输出；报告现况如实反映 `NOT_RUN — SHELL_UNAVAILABLE`。
- **未伪造**任何退出码 / HTTP 状态 / hash / validator 输出。
- `fixture_leakage = 0` 的依据为**落盘内容检索与 candidate 文本检索**（动作 1–3），
  其核验强度与 validator 运行无关，故本更正**不削弱**该结论。
- 本任务**不**代表 Security Gate 通过；复核由独立 Security 成员执行。

---

## 5. Scope guard 声明

**仅修改**：

```text
docs/kb-002/40-l2-security.md   （§5 与 §7 两处表述更正）
docs/kb-002/43-l2-rv01-repair-record.md   （本记录，新建）
```

**未修改**：candidate · manifest · Contract · Rubric · Q3 · validator · schema · ALIGN-03 ·
staging semantics · status semantics · production · 任何 business source ·
`11` / `37a` / `38` / `39-l2-qa` / `41-l2-review` / `42-l2-oclc-repair-record`。
**未**重写 append-only 历史。**未**执行 promotion。**未**绕过任何访问控制。
