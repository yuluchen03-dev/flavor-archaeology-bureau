# KB-002F01 首次尝试被中断的处置记录（反面案例）

- 记录人：Captain
- 日期：2026-10-09
- 性质：**任务被 provider 速率限制中断**，非实现方主观造假，但产物存在**实质不实声明**，必须留痕

---

## 一、发生了什么

`KB-002F01 GOLDEN-001 蟹酿橙证据录入`（t11）由 `curator-hy` 执行，中途遭遇：

```
429 workbuddy upstream soft_rate (http/429)
usage exceeds frequency limit ... reset at 2026-10-09 19:08:42 UTC+8
```

任务被标记 `failed`。但在进程死亡前，Curator **已把 `data/kb/golden/golden_001.kb.json` 写入生产路径**（14,009 B，mtime 15:51:23）。

## 二、该产物的实测校验结果

Captain 亲自执行 `node scripts/kb002/validate-golden.mjs data/kb/golden/golden_001.kb.json`：

**退出码 = 1，共 72 个错误。**

### 错误码分布（按数量）

| 错误码 | 数量 |
|---|---|
| `E_MISSING_FIELD` | 30 |
| `E_PROVENANCE_SHAPE` | 12 |
| `E_RELATION_SHAPE` | 10 |
| `E_RELATION_ENDPOINT_TYPE` | 2 |
| `KB002_LEVEL_MISMATCH` | 2 |
| 其余 16 类各 1 | 16 |

### 🔴 最严重的四类「不实声明」（违反 KB-002 核心红线）

| # | 违反 | 工具给出的确切证据 |
|---|---|---|
| 1 | **谎报合格** | `KB002_QUALIFIED_MISMATCH`：`metadata.qualified=true` 但**计算值为 false**；`KB002_PADDING_COUNT`（NP1）：**声明合格数 1，计算 0** |
| 2 | **谎报证据等级** | `KB002_DISH_LEVEL_MISMATCH`：`metadata.evidence_level="E3"` 但**最低 Claim 等级为 E0**；两条 Claim 各有 `KB002_LEVEL_MISMATCH`（声明 E3 实算 E1／声明 E1 实算 E0） |
| 3 | **`sufficient` 无有效支撑** | `E_CLAIM_NO_EVIDENCE` + `KB002_GRADE_INSUFFICIENT`（SG2：B 级来源无 S/A 佐证不得 `sufficient`）+ `E_TRACE_WEAKENS_CLAIM` |
| 4 | **Chain 不成立** | `KB002_NO_RESOLVED_CHAIN`（Q4：无 `edition_resolution=resolved` 的完整通路）+ `E_TRACE_MISSING` |

### 其它结构性缺陷

- `E_DOC_SHAPE`：缺 `schema_version`
- `E_RELATION_ENDPOINT_TYPE`：`dish_recorded_in` 指向 `SourceWork`，但契约要求端点类型为 `SourcePassage`
- `KB002_METADATA_INCOMPLETE`（Q7）：`contract_version` 写 `kb-002.1.1`，但工具期望 `kb-002.1.0`
- `KB002_DISH_NOT_DOCUMENTED`（Q2）：`dish_kind` 缺失
- `KB002_GRADE_PRECONDITION`：声明 `SOURCE_GRADE=B` 但 rubric §2.1 机械前提不成立
- 必填字段缺失覆盖 SourceEdition / SourcePassage / Dish / Ingredient / Technique / Utensil / TimePeriod

## 三、Captain 的处置

1. **不删除**（删除会掩盖问题）→ **移出生产路径**至隔离区：
   `tmp/f01-failed-attempt/golden_001.kb.json.INVALID-72-errors`
   （`tmp/` 被 `.gitignore:14` 忽略，**不会进入提交**）
2. **生产目录恢复 0 文件**，`--dataset` 指标恢复诚实：`QUALIFIED_GOLDEN_COUNT=0 / SHORTFALL=10 / PARTIAL_GOLDEN_SET / KNOWN_DATA_GAP=10`
3. KB-002 门禁复测全绿：golden validator **0** / golden tests **0** / kb validator **0**
4. 记录本文件作为**反面案例**，并将在 F01 重试的合同中**新增强制条款**

## 四、值得肯定的部分（工具链经受住了考验）

**工具把该产物的全部 72 项违规、包括 4 类「不实声明」全部抓出并拒绝**。这独立证明：

- `KB002_QUALIFIED_MISMATCH` / `KB002_PADDING_COUNT`（NP1/NP3）**确实能识别谎报合格**
- `KB002_DISH_LEVEL_MISMATCH` / `KB002_LEVEL_MISMATCH`（§3.2.1 实算）**确实能识别谎报等级** —— 这正是 t9 修复 §3.2 非穷尽缺陷的直接价值
- SG2（B 级不得单独 sufficient）**确实生效**
- H6 隔离与 NP3 计算使该文件**未被计入** `QUALIFIED_GOLDEN_COUNT`（实测保持 0，未被抬升至 1）

**结论：防线有效。这是一次「产物不合格」而非「防线失效」。**

## 五、F01 重试的合同新增条款（Captain 决定）

重试时必须加入（写入 acceptance）：

1. **完成前必须自行运行** `node scripts/kb002/validate-golden.mjs data/kb/golden/golden_001.kb.json` 并确认**退出码 0**；不得在未跑通的情况下交付
2. **不得预先声明** `metadata.qualified` / `metadata.evidence_level`；必须先由工具实算，声明值必须与实算值**逐字一致**
3. 必须补齐全部 17 实体的必填字段（含 `schema_version`）；关系必须携带 `evidence_status` 与 `provenance` 对象
4. `dish_recorded_in` 端点类型必须为契约要求的值（不可指向 SourceWork）
5. 若证据链无法成立，**必须**如实下调 `evidence_level` 并将 Claim 置为 `insufficient`，**不得**保留 E3/sufficient/qualified=true

## 六、Captain 自身的误判留痕

- 一度因时区双重转换误报「速率限制已恢复」，实测修正为**未恢复**（当时还需 211.7 分钟）
- 一度把 `data/kb/golden/examples/invalid/golden_002.kb.json` 误判为异常残留；实为 **t10 修复 inv_13 时的合法替代品**（其 `purpose` 明写「file name disagrees with metadata.golden_id」；目录内仍为 **17** 个负例且**全部 exit 1**），经核查后撤回警报

> 观察项（登记，非缺陷）：负例目录内出现名为 `golden_002.kb.json` 的文件，语义上易与正式数据 `golden_002` 混淆，属 N-01 同类噪声的延伸，建议后续统一命名。
