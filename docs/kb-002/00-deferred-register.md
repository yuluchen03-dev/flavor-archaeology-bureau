# KB-002 延期登记簿（Deferred Register）

- 维护人：Captain
- 用途：登记**本轮明确不修复、移交后续独立任务**的债务与发现
- 原则：**不在 KB-002 执行过程中顺手修复**；每项须可追溯来源与建议修复动作

---

## 一、DSH 配置债务（CONFIG DEBT）

### DEFERRED_DSH_CONFIG_FIX — `wudian-kb-v1` profile 仍引用失效路由

| 项 | 值 |
|---|---|
| 状态 | **登记，本轮不修** |
| 登记依据 | KB-002 授权 §6（CONFIG-DEBT-001）；§19（DSH-GOV-001） |
| 位置 | `C:\Users\hacjr\.dsh\profiles\desktop\cordis.patch.yml` → `agent-teams.profiles.wudian-kb-v1.members` |
| 问题 | 9 个成员仍为 `provider: workbuddy-ai` + `model: deepseek-v4.1-flash`；该 provider 已因账号/Provider 配置变化而不存在 |
| 实测残留（2026-10-08） | 全文件 `workbuddy-ai` = **10**（其中 9 处属 wudian 成员 ×1 provider，另 1 处待查）；`deepseek-v4.1-flash` = **9** |
| 影响 | 未来任何使用 `wudian-kb-v1` profile 的团队都会 `UNKNOWN_MODEL` |
| 不修原因 | 与 KB-002 无关；避免扩大本轮配置改动范围（授权 §4：只改与 software-factory 路由直接相关的配置） |
| 建议修复（后续） | `workbuddy-ai` → `deepseek-account`；`deepseek-v4.1-flash` → `deepseek-flash` |
| 归属 | 后续独立任务 **`DSH-GOV-001`** |

### DEFERRED_DSH_GOVERNANCE_FIX — `software-factory` protocol 仍含 Codex 治理残留

| 项 | 值 |
|---|---|
| 状态 | **登记，本轮不修** |
| 登记依据 | KB-002 授权 §6（CONFIG-DEBT-002）；§0/§19 |
| 位置 | `cordis.patch.yml` → `agent-teams.profiles.software-factory.protocol` |
| 问题 | protocol 文本仍要求：Codex 负责上游规划 / Codex 负责最终验收 / 阻塞项交 Codex / 「最终必须由 Codex 独立验收，不得自行宣布整个项目 CLOSED」 |
| 冲突 | 与当前正式治理 `Requirements/Architecture → Implementation → QA → Security → Reviewer → Captain Release Gate → CLOSED` 直接矛盾；且项目已明确「不得使用 Codex」 |
| 不阻塞 KB-002 的原因 | KB-002 使用**独立团队**（`flavor-archaeology-kb002`，6 名成员显式指定路由），**不加载** `software-factory` profile |
| 不修原因 | §19：不得一边执行 KB-002 一边顺手改配置 |
| 建议修复（后续） | 删除 Codex upstream planning / Codex final acceptance / Codex blocker handoff；改为完整 DSH team-native lifecycle；并扫描全部 profile 的 stale provider、stale model 与 Codex 治理残留 |
| 归属 | 后续独立任务 **`DSH-GOV-001`** |

---

## 二、KB-003+ 功能建议（DEFERRED_KB_003_PLUS）

> §8 要求：执行过程中若发现 KB-003+ 需求，登记为 `DEFERRED_KB_003_PLUS`，**不得顺手实现**。

| # | 发现 | 来源 | 状态 |
|---|---|---|---|
| — | （暂无） | — | 待执行 t1–t5 后填充 |

**本轮明确禁止实现**（scope lock）：
Hybrid Retrieval · Vector Search · GraphRAG · Temporal Validator 完整引擎 · Claim-level LLM generation · Dual Restoration UI · Restoration Experiment Flywheel · 大规模 UI 改版 · Neo4j · Elasticsearch · Milvus · Kafka · 与本 Epic 无关的架构重构 · 大规模 V1 数据迁移

---

## 三、本轮已知基线（KB-002 执行期间保护目标）

| 项 | 基线值 | 来源 |
|---|---|---|
| KB-001 测试 | **121 / 121 PASS** | KB-001 CLOSED |
| KB-001 Schema validator | PASS | 同上 |
| KB-001 graph schema | PASS（193 / 49） | 同上 |
| KB-001 literature dataset | PASS（106 / 103） | 同上 |
| V1 意外修改 | **0** | 同上 |
| KB-001 checkpoint | `c783262`、`6a25f4f` | 同上 |
| 用户既有 frontend staged 修改 | **约 300 条** | 工作区既有，**不得吞入** |
| `.agent-teams` metadata | 默认不进入正式产品提交 | §14 |
| `tmp/cordis.patch.yml.bak` | 临时恢复资产，**不提交、不作为项目产物** | §7 |

**新增失败必须为 0；已知历史基线失败不得错误归因给 KB-002。**
