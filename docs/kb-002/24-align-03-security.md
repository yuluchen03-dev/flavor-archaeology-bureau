# ALIGN-03 Targeted Security / Provenance Review

**结论：PASS**（ALIGN-03 Delta Security Gate；S8 按用户决定延后，不计作本轮通过）  
**任务：t59** · **复核对象：t51 ALIGN-03 + t57 F-01 修复** · **复核者：security-gpt**  
**范围：** staging/production 语义、provenance 诚实、测试 workspace 路径/cleanup 安全、FIX-03/FIX-04 保留情况。本人未参与 t51 或 t57 实现。

> t55 是 t57 修复前的历史 Security review，结论 `REQUEST_CHANGES` 与 F-01 finding 保持原样。本报告是 F-01 修复后的**新独立复核**，不改写或覆盖 t55 记录。

## 结论摘要

t57 已修复此前可复现的 workspace traversal 缺陷。独立验证确认 `resolve()` 拒绝相对 traversal 与绝对路径；`write()` 在任何 mkdir/write 前复核规范化路径及现有祖先 realpath；symlink escape 在本 Windows 环境可创建并被拒绝；cleanup 只移除其自有 temp root。ALIGN-03 的 admission 与 integrity 行为也通过复测。最终 verdict：**PASS**。

**S8 说明：** 用户明确裁决将真实、可追溯 E3+ candidate 的 S8 延至未来该类候选真实存在时再验证。当前无 genuine E3+ candidate；测试中的 synthetic E4 仅作机械路由覆盖，不是真实史料、不满足 S8，本报告不将其计为通过。

## F-01 路径逃逸修复复核

只读检查 `scripts/kb002/__tests__/workspace.mjs`：

- `resolve(relPath)` 拒绝空 / 非字符串、POSIX absolute、Windows drive absolute（`path.win32.isAbsolute`），并以 `path.relative(root, resolved)` 拒绝 root 本身、`..` 及越界路径。
- `write()` 先调用安全 `resolve()`，再在 mkdir/write 前验证目标位置于 workspace 内；逐级检查已存在目录的 `realpath`，若其中 symlink 指向 workspace 外则拒绝。
- `cleanup()` 仅递归移除 `mkdtempSync()` 创建的唯一 `root`，没有对 repository、Golden 根或 wildcard 的 cleanup 路径。
- 隔离测试 `t45-staging-semantics.test.mjs` 明确覆盖 `../`、`../../`、POSIX absolute、Windows `C:\...` 路径；断言 `resolve()` / `write()` 均在写入前 throw，且外部目标不存在。测试也证明 workspace 内正常写入有效。
- symlink：我独立用系统临时 workspace 尝试创建指向 workspace 外的目录符号链接；环境允许创建，写入被拒绝且外部探针文件未创建。该测试亦存在于 suite 中；本环境没有 junction 单独测试，故 junction 行为未验证。

**F-01 修复结果：通过。** 本报告不重复 t55 的原 finding；t55 仍保留为历史 REQUEST_CHANGES。

## ALIGN-03 判定与 integrity 行为

我以 `spawnSync` 在 FIX-03 的独立 workspace 中复测：

| 场景 | exit | finding / 状态 |
|---|---:|---|
| 诚实 E2 staging | 0 | `KB002_DISH_BELOW_E3` 可见；`STAGING_VALID=true`；`PRODUCTION_ADMISSIBLE=false` |
| 同一 E2 放入隔离 workspace 的 production root、`--dataset` | 1 | `KB002_DISH_BELOW_E3`，production admission 仍 blocking |
| 诚实 E0 staging | 0 | Q3 可见；staging valid、production inadmissible |
| 声明 E3、计算等级较低 | 1 | `KB002_DISH_LEVEL_MISMATCH`（同时 Q3） |
| 声明 `qualified=true`、计算不合格 | 1 | `KB002_QUALIFIED_MISMATCH`（同时计数 finding） |
| 正确 schema manifest 指向缺失资产 | 1 | `STAGING_ASSET_MISSING` |
| 错误 schema manifest（`entries` 代替 `assets`） | 1 | `KB002_MANIFEST_SCHEMA_INVALID` |
| 正确 manifest 中资产摘要/大小不匹配 | 1 | `STAGING_ASSET_MODIFIED` |
| synthetic E4 helper | 0 | 仅机械测试；不是 genuine S8、不是历史证据 |

`golden-rules.mjs:319-321` 的 Q3 分支仍无条件生成 `KB002_DISH_BELOW_E3`。ALIGN-03 只使 staging validation 将该 production-admission finding 与 staging-blocking findings 区分；生产路径仍严格失败。

FIX-04 仍 fail-closed：manifest schema 错误产生 `KB002_MANIFEST_SCHEMA_INVALID`；合法 schema 引用缺失文件产生 `STAGING_ASSET_MISSING`；摘要/字节修改产生 `STAGING_ASSET_MODIFIED`。未改动 `staging-integrity.mjs`，未触碰 generated data。

## Provenance 与生产冻结

只读扫描全部 18 个 `data/kb/golden/examples/**` fixture：

- `publication_year` 非 null = **0**；`edition_type` = `{unknown: 36}`；publisher 仅为 `SYNTHETIC-TEST-PRESS-NOT-A-REAL-PUBLISHER`。
- 18/18 文件仍标为 fixture；真实古籍名未用于 `SourceWork.name` / `SourceEdition.publisher`；Edition URL、shelfmark/catalog ID = 0。
- `inv_12` 的 `metadata.contract_version` 仍缺失，purpose 仍为 `Negative fixture: metadata.contract_version is missing.`
- 合成作者字段带明确“夹具占位”说明，不作为真实作者来源声明；本次未修改任何 candidate、fixture 或 provenance。

生产冻结最终状态：production `.kb.json` 文件 **0**；staging 为空、无 manifest；dataset 结果 `QUALIFIED_GOLDEN_COUNT=0` / `SHORTFALL=10` / `STATUS=EMPTY_GOLDEN_SET`。HEAD `6a25f4f`；user staged 文件数 **300**，前后不变。

## 独立回归结果

均使用 Node `spawnSync` 取得退出码：

| 命令 | exit | 结果 |
|---|---:|---|
| `node --test scripts/kb002/__tests__/t45-staging-semantics.test.mjs` | 0 | 10/10 pass（含 traversal / absolute / symlink / cleanup） |
| `node scripts/kb002/validate-golden.mjs --staging` | 0 | 无候选；空 staging summary |
| `node scripts/kb002/validate-golden.mjs --dataset` | 0 | qualified 0 / shortfall 10 / EMPTY |
| `node scripts/kb002/validate-golden.mjs --integrity` | 0 | 无 manifest/candidate |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | 0 | 76/76；skip=0，todo=0 |
| `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | 0 | 21/21；skip=0，todo=0 |

## 限定与结论

- **S8 genuine E3+：DEFERRED / NOT VERIFIED**（用户决定）；synthetic E4 test 仅机械覆盖，不算 genuine S8 PASS。
- 未验证：junction 单独路径、受控并发竞态、磁盘满 / 权限拒绝、超大输入、跨平台原子性、外部 L2 来源真实性。未将这些项目当作通过。
- `INCIDENT-E` 根因仍 `UNKNOWN`（`CORRELATION_ONLY`）；`test path isolation defect = CONFIRMED`；`nondeterministic failure causation = NOT PROVEN`。
- 临时安全探针均在 OS temp / `tmp/` 并已清理；未触碰 `data/kb/generated/`、未读取 `.env`，未写真实 Golden 数据。

**最终 verdict：PASS**（t57 修复后的 ALIGN-03 targeted Security checks）。
