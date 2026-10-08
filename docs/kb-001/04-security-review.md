# KB-001D3 安全审查报告（Security Review）

- 审查人：Security（DSH Software Development Team，software-factory profile）
- 任务：t6 / KB-001D3
- 审查方式：**只读**。未修改任何被审查文件；写入范围仅本文件
- 审查对象：KB-001 本轮全部新增/变更产物
- 结论：**无 blocker / 无 high**；有 **1 项 medium** 与 **3 项 low** 观察项（详见第 9 节）

> 本报告所有结论均基于**实际执行命令**与**实际读取文件**，并给出文件:行号或命令证据。
> 凡未实际验证的项目，在第 10 节明确标为「未验证」，不得视为通过。
> 报告本身不含任何密钥、token 或 `.env` 取值；所有命中均只记录**模式名称与文件:行号**，不记录匹配值。

---

## 1. 审查范围与方法

### 1.1 审查对象（实测存在于磁盘）

| 文件 | 大小 |
|---|---|
| `scripts/kb/validate-kb-schema.mjs` | 5,179 B |
| `scripts/kb/adapt-v1-to-v2.mjs` | 58,934 B |
| `scripts/kb/lib/errors.mjs` | 1,565 B |
| `scripts/kb/lib/schema.mjs` | 4,080 B |
| `scripts/kb/lib/validate.mjs` | 43,938 B |
| `scripts/kb/lib/adapt/mapping.mjs` | 4,467 B |
| `scripts/kb/__tests__/validate-kb-schema.test.mjs` | 24,833 B |
| `data/kb/schema/kb-schema.v2.json` | 22,388 B |
| `data/kb/examples/valid/*.kb.json` | 3 个 |
| `data/kb/examples/invalid/*.kb.json` | 7 个 |
| `data/kb/generated/kb-v2.kb.json` | 367,163 B（派生，已 gitignore） |
| `data/kb/generated/adaptation-report.json` | 119,972 B（派生，已 gitignore） |
| `.gitignore` | 追加 1 行 |

### 1.2 方法

全部检查使用 `node` 执行脚本完成，**未使用 `pwsh Get-Content`** 做文本断言。
原因（已复现确认的工具陷阱）：`pwsh Get-Content` 以 ANSI 误读 UTF-8 中文，同一文件 `Get-Content` 报 876 行、`node` 报 **1083 行**，会把完好文件误判为内容缺失。

### 1.3 审查用临时产物已全部清除

审查期间在 `tmp/` 下创建探针脚本与夹具，并在仓外 `D:\systemDir\sec-real-escape-probe` 产生过一次越界写入探针（见第 6 节）。
**全部已删除**：`tmp/sec-audit-*.mjs`、`tmp/sec-probe/`、`tmp/sec-cleanup.mjs`、`tmp/sec-escape-check.mjs`、`D:\systemDir\sec-real-escape-probe\`。
复核 `git status --porcelain` 无本次审查残留（唯一未跟踪文件 `backend/test_escape_8.js` 经核实为**团队开始前既有**，见第 9 节 L2）。

---

## 2. 来源可信边界（用户核心要求）

### 2.1 结论：**通过** —— 普通网络线索未被升级为权威历史证据

契约 N4 要求：V1 中 `source_text` 为「…线索」的 **30** 条菜品，在 V2 输出中必须为
`evidence_status=insufficient` + `provenance.derivation=unresolved` + `review_status=unreviewed`。

**我的实测**（直接比对 V1 输入与 V2 输出）：

| 检查 | 结果 |
|---|---|
| V1 中 `source_text` 含「线索」的菜品数 | **30** |
| 在 V2 输出中匹配到的实体数 | **30**（无遗漏） |
| 违反三项要求的记录数 | **0** |
| 全部 40 条 Dish 中 `evidence_status=sufficient` 的数量 | **0** |

**证据**：对 `data/kb/generated/kb-v2.kb.json` 的 282 个实体按 `id` 与 `data/knowledge_graph/nodes_dish.json` 交叉比对；
对 30 条线索类菜品逐条断言 `evidence_status==='insufficient' && provenance.derivation==='unresolved' && review_status==='unreviewed'`，违规数 0。

### 2.2 结论：**通过** —— 全库无任何记录被标记为已核验

| 检查 | 结果 |
|---|---|
| 输出中 `review_status` 分布 | `{"unreviewed": 282}` —— **282/282 全部 unreviewed** |
| 全文件字面量 `"verified"` 出现次数 | **0** |
| `review_status=verified` 的实体数 | **0** |
| 34 条 `HistoricalClaim` 中 `evidence_status=sufficient` | **0**（全部 insufficient） |

契约 §7 R1 明确 `review_status` 枚举**刻意不含 `verified`**（5 值：`unreviewed` / `internal_reviewed` / `pending_external_expert` / `external_reviewed` / `rejected`）。
**这使得「来源不足被静默标记为 verified」在结构上不可能发生**，而不只是依赖实现者的自律。

### 2.3 结论：**通过** —— 适配报告含明确免责声明

`data/kb/generated/adaptation-report.json` 逐字包含：

> `adaptation_disclaimer`：**「适配成功只表示结构转换成功，不代表历史真实性已经核验。」**

并同时包含：

> `no_silently_verified_record`：「…silently-verified record is structurally impossible.」

**证据**：对报告全文做子串匹配，两项均命中（`true`）。

---

## 3. 缺失 provenance 未被伪造补全

### 3.1 结论：**通过** —— 5 个无出处古籍节点未被补造

V1 中 `text_001`–`text_005` 是**完全没有任何出处字段**的古籍节点（实测：`nodes_ancient_text.json` 中无 `source_url`/`catalog_url`/`verification_note`/`authority_institution` 的节点恰为这 5 个）。

适配后在 V2 中对应为 `work_text_001`–`work_text_005`（`SourceWork`）：

| 输出 ID | evidence_status | derivation | review_status | source_locator |
|---|---|---|---|---|
| `work_text_001` | insufficient | unresolved | unreviewed | 不存在（`undefined`） |
| `work_text_002` | insufficient | unresolved | unreviewed | 不存在 |
| `work_text_003` | insufficient | unresolved | unreviewed | 不存在 |
| `work_text_004` | insufficient | unresolved | unreviewed | 不存在 |
| `work_text_005` | insufficient | unresolved | unreviewed | 不存在 |

对这 5 个实体单独断言 `source_url` / `catalog_url` / `verification_note` 是否存在 → **全部为 `false`（均不存在）**。
`provenance.basis_ids` 全部为 `[]`（空数组），即未声称任何依据。

**未补造任何来源信息。**

### 3.2 结论：**通过** —— 无编造的 URL / 页码 / 版本年份

我做了**双向交叉核对**（这是发现伪造的关键手段）：把 V2 输出中出现的每一个 URL 与 V1 真实来源集合比对。

| 检查 | 结果 |
|---|---|
| V1 真实来源中出现的不同 URL 数 | 6 |
| V2 输出中出现的不同 URL 数 | **0** |
| **V2 中出现但 V1 不存在的 URL（即伪造）** | **0** |
| V1 中 `verification_note` 数 / V2 中数 / 伪造数 | 3 / 0 / **0** |
| `SourceEdition` 中 `publication_year` 非 null 的数量 | **0**（106 条全部为 null） |
| `SourcePassage` 中任一 `locator` 成员非 null 的数量 | **0**（19 条全部为 null） |
| `ExpertReview` 的 `review_outcome` | 全部 `pending`（4/4），`reviewer_kind` 仅 `internal_editor` |
| `Experiment` 实体数 | **0**（未编造实验数据） |

**说明**：全库检索 `source_url`/`catalog_url`/`verification_note` 字面量会有命中（5 个 `SourceWork` 实体带这些**空字符串**键），
我已逐一核对确认其值均为空串或不存在，**不构成伪造**。这一点特别容易被误判，故在此明确记录。

### 3.3 结论：**通过** —— 同名著作未被错误建链

契约要求：`lit_ccs_006`（随园食单）/ `lit_ccs_014`（山家清供）/ `lit_ccs_027`（饮膳正要）的 title **恰好等于**内容著作名，
但它们是**丛刊册次**，不得按 title 相等当作内容著作的版本建链。

**我的实测**：

| 检查 | 结果 |
|---|---|
| `edition_of_work` 关系总数 | 106 |
| 其中指向**内容著作**（`work_text_001`–`work_text_005`）的数量 | **0** |
| `edition_lit_ccs_006` 的 `edition_of_work` 目标 | `work_src_chinese_cooking_classics_series`（丛刊） |
| `edition_lit_ccs_014` 的 `edition_of_work` 目标 | `work_src_chinese_cooking_classics_series`（丛刊） |
| `edition_lit_ccs_027` 的 `edition_of_work` 目标 | `work_src_chinese_cooking_classics_series`（丛刊） |
| `edition_contains_work` 关系数 | 11，目标全部为内容著作 |

**三条同名条目全部正确指向丛刊，未按 title 建链。**

### 3.4 结论：**通过** —— SourceWork = 10，含 2 个显式未解析书名

| ID | name | attribution_status | derivation | unknown_fields |
|---|---|---|---|---|
| `work_src_ancient_food_literature_collection_2021` | 《古代饮食文献集成》 | attributed | v1_adapter | `["compiled_period_id"]` |
| `work_src_china_food_culture_classics_2025` | 《中国历代饮食文化典籍丛刊》 | attributed | v1_adapter | `["compiled_period_id"]` |
| `work_src_chinese_cooking_classics_series` | 中国烹饪古籍丛刊 | attributed | v1_adapter | `["compiled_period_id"]` |
| `work_text_001` | 山家清供 | attributed | unresolved | `["compiled_period_id"]` |
| `work_text_002` | 随园食单 | attributed | unresolved | `["compiled_period_id"]` |
| `work_text_003` | 齐民要术 | attributed | unresolved | `["compiled_period_id"]` |
| `work_text_004` | 饮膳正要 | attributed | unresolved | `["compiled_period_id"]` |
| `work_text_005` | 东京梦华录 | attributed | unresolved | `["compiled_period_id"]` |
| `work_unresolved_001` | **东坡志林** | **unknown** | unresolved | `["author","compiled_period_id"]` |
| `work_unresolved_002` | **烧尾宴食单** | **unknown** | unresolved | `["author","compiled_period_id"]` |

**合计 10 条 = 5 内容著作 + 3 丛刊 + 2 未解析书名**，与契约要求一致。
两个未解析书名以 `attribution_status=unknown` 显式保留，**未丢弃、未编造版本信息**。

### 3.5 结论：**通过** —— 未消歧（正确反映 V1 真实证据水平）

| 检查 | 结果 |
|---|---|
| `SourcePassage` 总数 | 19 |
| `edition_resolution` 分布 | `{"ambiguous": 16, "unresolved": 3}` |
| `resolved` 数量 | **0** |
| `passage_in_edition` 关系数 | **0** |
| `edition_id` 非 null 的 Passage | **0** |

**判定：这是正确反映 V1 真实证据水平，不是缺陷。** 契约 TR1/TR2 的「禁止消歧」要求已被实现遵守：
16 条 ambiguous 与 3 条 unresolved 的 Passage 均未被迫任选一个候选版本来凑基数 —— 那将等同于伪造「该版本确含此段」。

---

## 4. 敏感信息检查

### 4.1 结论：**通过** —— 无密钥、凭据或个人配置泄露

**扫描范围**：`scripts/kb/**`、`data/kb/**`、`docs/kb-001/**`，共 **24 个文件**。

**扫描模式与结果**：

| 模式 | 命中 |
|---|---|
| 私钥块 `-----BEGIN ... PRIVATE KEY-----` | 0 |
| AWS Access Key ID (`AKIA...`) | 0 |
| Google API Key (`AIza...`) | 0 |
| OpenAI 风格密钥 (`sk-...`) | 0 |
| Slack token (`xox...`) | 0 |
| GitHub token (`ghp_...`) | 0 |
| JWT 三段式 (`eyJ...`) | 0 |
| `Bearer` 字面量 | 0 |
| `password/passwd/pwd` 赋值字面量 | 0 |
| `api_key/secret/token` 赋值字面量 | 0 |
| 硬编码邮箱 | 0 |
| `//user:pass@host` 形式 | 0 |
| 绝对用户路径（`X:\Users\...`） | **1**（已定性，见 4.2） |

### 4.2 唯一命中的定性：**误报（防御性代码，非泄露）**

命中位置：`scripts/kb/lib/errors.mjs:7`

```
L6: const ABSOLUTE_PATH_PATTERNS = [
L7:   // Windows drive paths, e.g. C:\Users\name\repo\...
```

这是**注释中的示例文本**，属于一段**用于脱敏的正则模式定义**（`ABSOLUTE_PATH_PATTERNS`），
并非存储的路径值。同文件 L15 注释明确其目的：

```
L15: // V4: messages must not echo whole source text, .env values, or absolute paths
L18: export function sanitizeMessage(message) { ... }
```

**我做了实证验证**（不是仅看代码）：

```
输入: C:\Users\someone\repo\file.json and /home/someone/x and \\server\share\y
输出: <path> and <path> and <path>
```

→ `sanitizeMessage()` **确实把绝对路径全部替换为 `<path>`**。这是**安全增强**，不是漏洞。

### 4.3 结论：**通过** —— `.env` 从未被 KB-001 代码读取

| 检查 | 结果 |
|---|---|
| KB-001 代码中 `process.env` 引用数 | **0** |
| 字面量 `".env"` 字符串 | 0 |
| `readFileSync` 指向 `.env` | 0 |
| `dotenv` 导入 | 0 |
| **真实 `.env` 访问命中** | **0** |

唯一匹配 `/\.env/` 的行是 `scripts/kb/lib/errors.mjs:15` 的**注释**（「messages must not echo … `.env` values」），
属安全约束说明，非文件访问。

**本审查未读取 `backend/.env` 的值**，也未输出任何环境变量取值。

---

## 5. 不将外部文本当作工具指令执行

### 5.1 结论：**通过** —— 数据文本不进入任何执行汇点

对 `scripts/kb/**` 全部 6 个 `.mjs` 生产文件 + 1 个测试文件做危险构造扫描：

| 构造 | 命中（生产代码） |
|---|---|
| `eval(` | 0 |
| `new Function(` | 0 |
| `child_process` 导入 | **0** |
| `exec(` / `execSync(` | 0 |
| `spawn(` / `spawnSync(` | 0 |
| `shell: true` | 0 |
| 非字面量动态 `import()` | 0 |
| `require(` | 0 |

**唯一命中**：`scripts/kb/__tests__/validate-kb-schema.test.mjs` 使用 `spawnSync` 与 `node:child_process` ——
这是**测试代码以子进程方式调用校验器 CLI**（`execFileSync`/`spawnSync` 传**参数数组**，非 shell 拼接），属正常测试手法，不构成注入面。
**生产代码零 shell 调用。**

### 5.2 结论：**通过** —— 数据文件中的文本仅作数据处理

数据文件（`data/kb/**/*.json`）中的中文文本（含疑似「指令」式内容）仅被 `JSON.parse` 解析后作为字段值处理，
不存在任何把字段值传给 `eval`/`Function`/shell 的代码路径。适配器与校验器均为**纯数据转换**。

---

## 6. 数据读取路径安全

### 6.1 ⚠ **发现：`--out` 未做仓库边界校验（medium，见第 9 节 M1）**

**代码证据**：`scripts/kb/adapt-v1-to-v2.mjs:1330`

```js
const outDir = path.resolve(REPO_ROOT, args.out);
```

`path.resolve` 会**正常解析** `..` 穿越，但代码**未**校验结果是否仍在仓库内。
`parseArgs`（L1246–L1250）仅检查 `--out` 是否有取值，不检查取值内容。

**我做了实证验证（真实越界写入）**：

```bash
node scripts/kb/adapt-v1-to-v2.mjs --out ../../sec-real-escape-probe
# 退出码 0，stderr: "wrote 282 entities and 214 relations to ../../sec-real-escape-probe"
```

**结果**：在**仓库之外**创建了目录与 2 个文件：

```
D:\systemDir\sec-real-escape-probe\kb-v2.kb.json          367,163 B
D:\systemDir\sec-real-escape-probe\adaptation-report.json 119,972 B
```

（仓库根为 `D:\systemDir\Desktop\风味考古局`，该目录在其**两级父目录之外**。）

**影响评估**：
- **可被利用性低**：该 CLI 是**开发者手动执行**的工具，**未被任何服务/路由调用**（我已检索 `backend/src`、`service`，引用数 **0**）；本轮也没有任何自动化流程把不可信输入接到 `--out`。
- **契约未禁止**：契约 §13.6（L925–L933）只规定输出**内容**不得含绝对路径，并**未**要求 `--out` 必须限制在仓库内；A1–A5 也未涉及。
- **因此定级 medium 而非 high/blocker**：它是「缺少纵深防御」，不是「已存在可利用漏洞」。

**建议修复（交回负责人，非本审查实施）**：在 L1330 后增加包含性校验，例如
拒绝 `--out` 解析结果不以 `REPO_ROOT + path.sep` 开头的情形，并以退出码 **2**（CLI 用法错误）报错。

### 6.2 结论：**通过** —— `--dry-run` 无副作用

| 检查 | 结果 |
|---|---|
| `--dry-run` 退出码 | **0** |
| 是否创建文件 | **否**（连 `data/kb/generated` 目录都未创建） |
| 是否删除文件 | **否**（运行前已存在的 `generated/` 仍在） |
| `--dry-run` 配合越界 `--out` | 退出 0，**未创建**任何目录（含仓外） |

契约 A5「`--dry-run` 下不得创建或修改任何文件」**满足**。

### 6.3 结论：**通过** —— 输入路径异常处理安全

| 场景 | 退出码 | 输出 |
|---|---|---|
| 不存在的路径 | **2** | `E_DOC_SHAPE`：`target path does not exist: ...` |
| 目录穿越路径 `../../../etc/passwd` | **2** | 同上（**拒绝**，未读取系统文件） |
| 畸形 JSON | **1** | `file is not valid JSON`（不泄露内容、不泄露环境变量） |
| 空目录（无 `.kb.json`） | 非 0 | 不静默通过 |

**符号链接测试**：因 Windows 权限（`EPERM`）无法创建符号链接，**该项未验证**（见第 10 节）。

### 6.4 结论：**通过** —— 校验器/适配器不修改输入

**我独立复算**（不依赖实现方自述）：对 13 个 V1 输入文件在**运行适配器前后**计算 SHA-256：

```
inputs checked: 13
inputs changed by adapter run: 0
```

契约 A3「运行后输入文件 SHA-256 不变」**满足**。

---

## 7. 错误输出安全

### 7.1 结论：**通过** —— 错误输出不泄露绝对路径或环境变量

| 检查 | 结果 |
|---|---|
| CLI 错误输出含盘符绝对路径（`C:\` / `D:\`） | **false** |
| CLI 错误输出含 `Users` | **false** |
| CLI 错误输出含 `JWT_SECRET` / `API_KEY` 等 | **false** |
| 畸形 JSON 错误信息 | `file is not valid JSON`（仅说明性质，不回显原文） |
| 报告文件含盘符绝对路径 | **false** |
| 报告文件含 `Users\` | **false** |
| 报告文件含密钥模式 | **false** |

错误输出使用**仓库相对路径**（如 `data/kb/examples/invalid/...`），配合 `sanitizeMessage()` 二次脱敏（见 4.2）。

### 7.2 结论：**通过** —— 错误信息不把外部文本当指令

错误消息由 `code` + `fieldPath` + 固定文案构成，不回显整段源文本，亦不执行任何内容。

---

## 8. 依赖与权限边界

### 8.1 结论：**通过** —— 未引入任何第三方依赖

| 检查 | 结果 |
|---|---|
| KB-001 代码的 import 来源 | **仅 `node:` 内置模块 + 相对路径** |
| 非内置、非相对的导入 | **0** |
| `frontend/package.json` 改动 | 无 |
| `service/requirements.txt` 改动 | 无 |
| `backend/package.json` 改动 | **有，但为团队开始前既有**（新增 `db:migrate`/`db:seed-if-empty` 脚本与 `cookie-parser`），非本轮引入 |

### 8.2 结论：**通过** —— 生产代码不使用 shell

见 5.1：`scripts/kb/**` 生产代码 `child_process` 导入数 **0**，无 `exec`/`spawn`/`shell:true`。
适配器为**纯 Node 文件读写**，无 shell 调用。

### 8.3 结论：**通过** —— 输出目录正确纳入版本控制边界

| 检查 | 结果 |
|---|---|
| `.gitignore` 中 `data/kb/generated/` 条目 | **存在**（L27） |
| `git check-ignore -v data/kb/generated/kb-v2.kb.json` | 命中 `.gitignore:27`，退出码 **0** |
| 该条目出现次数（连续运行 2 次适配器后） | **1**（幂等，未重复插入） |
| `.gitignore` 是否被污染（BOM / CRLF） | 无 BOM、无 CRLF |
| 是否改动了既有条目 | 未改动（纯追加 1 行） |

---

## 9. 发现汇总

### BLOCKERS
**无。**

### HIGH
**无。**

### MEDIUM

| ID | 问题 | 位置 | 证据 | 建议修复 |
|---|---|---|---|---|
| **M1** | `--out` 未做仓库边界校验，可写出仓库外 | `scripts/kb/adapt-v1-to-v2.mjs:1330`（`path.resolve(REPO_ROOT, args.out)`） | 实测 `--out ../../sec-real-escape-probe` 退出 0，在仓外创建 `kb-v2.kb.json`(367KB) 与 `adaptation-report.json`(120KB) | 增加包含性校验（`outDir` 必须以 `REPO_ROOT + sep` 开头），违规以退出码 2 报错。契约 §13.6 未要求，故属加固建议 |

**M1 为何不阻断交付**：该 CLI 为开发者手动工具，**未被任何服务或路由调用**（`backend/src`、`service` 引用数均为 0）；本轮无任何自动化把不可信输入接到 `--out`；契约亦未要求该约束。属纵深防御缺失，不构成当前可利用漏洞。**但应在 KB-002 之前修复**，以免后续把该 CLI 接入自动化流程时放大风险。

### LOW / 观察项

| ID | 观察项 | 证据 | 说明 |
|---|---|---|---|
| L1 | 错误输出使用仓库相对路径，但**传入绝对路径参数时**会回显该绝对路径（经 `sanitizeMessage` 脱敏为 `<path>`） | 4.2 实证 | 已有脱敏，风险可接受 |
| L2 | 仓库存在未跟踪调试脚本 `backend/test_escape_8.js` | mtime `2026-09-25T13:05`，早于本轮 `2026-10-08`；被引用数 **0**；密钥模式 0 命中；与 KB-001 无关（内容为 `Dish.search` LIKE 转义测试） | **非本轮引入**。建议后续清理，但不在 KB-001 范围 |
| L3 | 适配器测试文件使用 `spawnSync` 调用 CLI | `scripts/kb/__tests__/validate-kb-schema.test.mjs` | 传参数数组、非 shell 拼接，属正常测试手法。仅记录 |
| L4 | `data/kb/generated/` 为派生数据且已 gitignore，但其内容包含 V1 全部 106 条文献元数据 | `.gitignore:27` | 不构成泄露（数据本身来自仓库内公开 JSON），仅提示该目录不应被误纳入发布物 |

### NON_BLOCKERS（与安全无关但需下游知晓）

- `scripts/__tests__/*.test.mjs` 有 **7 个基线已存在**的失败（引用了仓库中不存在的 `scripts/python-quality-gate.ps1`），**非本轮引入**，本轮未修复（范围外）。
- 契约 §13.6 的 `--out` 约束缺失是 M1 的**契约层根因**；若采纳 M1 修复，建议同步在契约中补写该约束。

---

## 10. 未验证项（不得视为通过）

| 项 | 状态 | 原因 |
|---|---|---|
| 符号链接（symlink）输入处理 | **未验证** | Windows 下创建符号链接返回 `EPERM`，无法构造测试用例 |
| 并发运行适配器的竞态行为 | **未验证** | 超出本任务范围，且无并发调用方 |
| 磁盘写满 / 权限拒绝时的错误路径 | **未验证** | 未构造该故障场景 |
| 适配器在超大输入下的资源消耗 | **未验证** | 本轮输入规模固定，无 DoS 评估需求 |
| `backend/.env` 的实际内容 | **未读取（有意为之）** | 按任务红线，只允许核对键名，不读取值 |

---

## 11. 审查结论

| 维度 | 结论 |
|---|---|
| 来源可信边界 | **通过** —— 30 条线索类菜品全部 insufficient/unresolved/unreviewed；282/282 实体 unreviewed；`verified` 字面量 0 |
| 缺失 provenance 未被伪造 | **通过** —— `text_001–005` 未补造；伪造 URL 0、伪造 note 0、伪造版本年份 0；同名条目未错误建链 |
| 敏感信息 | **通过** —— 24 文件扫描 0 密钥命中；唯一命中为脱敏正则的注释（已实证其脱敏有效）；`.env` 零访问 |
| 外部文本不当作指令 | **通过** —— 生产代码无 `eval`/`Function`/shell；数据文本仅作数据处理 |
| 数据读取路径安全 | **基本通过**，有 **1 项 medium**（M1 `--out` 越界写入）；`--dry-run` 无副作用；输入异常均安全退出；输入文件零改动 |
| 错误输出安全 | **通过** —— 无绝对路径、无环境变量、无密钥泄露 |
| 依赖与权限边界 | **通过** —— 零第三方依赖；生产代码零 shell；输出目录正确 gitignore 且幂等 |

**最终判定：无 blocker、无 high 发现。**

按任务合同，**blocker/high 才阻断交付**；M1 为 medium，**不阻断** KB-001 交付，但建议在 KB-002 启动前修复，并同步补齐契约 §13.6 的 `--out` 约束。

---

## 12. 复现方式

本报告全部结论可通过以下命令复现（均为只读，除 M1 探针会临时写入仓外目录）：

```bash
# 来源可信边界：线索类菜品未被升级
node -e "…交叉比对 nodes_dish.json 与 kb-v2.kb.json…"   # 见第 2.1 节

# review_status 分布与 verified 计数
node -e "…统计 kb-v2.kb.json 的 review_status…"          # 见第 2.2 节

# 伪造来源双向核对（关键）
node -e "…比对 V1 URL 集合与 V2 URL 集合…"               # 见第 3.2 节，伪造数 0

# 脱敏函数实证
node -e "import('./scripts/kb/lib/errors.mjs').then(m=>console.log(m.sanitizeMessage('C:\\\\Users\\\\x')))"

# 输入不可变性（独立复算 SHA-256）
node -e "…13 个输入文件运行前后哈希…"                     # 见第 6.4 节，changed 0

# --dry-run 无副作用
node scripts/kb/adapt-v1-to-v2.mjs --dry-run             # 退出 0

# 参数校验退出码
node scripts/kb/adapt-v1-to-v2.mjs --bogus               # 退出 2
node scripts/kb/adapt-v1-to-v2.mjs --out                 # 退出 2

# M1 越界写入（复现后请删除 D:\systemDir\sec-real-escape-probe）
node scripts/kb/adapt-v1-to-v2.mjs --out ../../sec-real-escape-probe
```

审查期间创建的所有探针与临时文件**均已删除**；仓内 `git status` 无本次审查残留。
