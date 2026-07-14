# 数据来源与扩展计划

## 当前数据规模

截至 2026-07-06 本地数据统计:

| 数据集 | 文件 | 数量 |
| --- | --- | ---: |
| 菜品节点 | `data/knowledge_graph/nodes_dish.json` | 40 |
| 图谱关系 | `data/knowledge_graph/relationships.json` | 49 |
| 古籍文本节点 | `data/knowledge_graph/nodes_ancient_text.json` | 108 |
| 食材节点 | `data/knowledge_graph/nodes_ingredient.json` | 16 |
| 技法节点 | `data/knowledge_graph/nodes_technique.json` | 10 |
| 古籍片段 | `data/fragments/ancient_fragments.json` | 8 |
| 古食方 | `data/recipes/ancient_recipes.json` | 5 |
| 权威文献条目 | `data/literature/authoritative_recipe_texts.json` | 106 |
| 真假非遗真实菜 | `data/light_mode/quiz_real_dishes.json` | 40 |
| 真假非遗虚构菜 | `data/light_mode/fake_dishes.json` | 12 |
| 菜品背景图 | `frontend/public/dish-backgrounds` | 150 |

## 数据类型

- 古籍与文献: 菜品出处、原文片段、食方文本。
- 食材与替代: 古代食材、现代替代品、可得性说明。
- 技法: 蒸、酿、羹、炙等古法转译节点。
- 视觉资产: 菜品背景图、候选图和经过人工挑选的 override 图。
- 轻量玩法: 真实菜与虚构菜题库，用于公众互动和幻觉识别教育。

## 当前边界

当前数据是黑客松种子库，适合证明 workflow 和演示完整体验。它还不是全国非遗饮食全量库。古籍片段和食方数量仍需扩充，尤其需要专家校对和版本来源管理。

## 扩展路线

1. 结构化采集  
把古籍片段拆成菜名、食材、器具、技法、朝代、地域、出处和可信等级。

2. 专家校对  
邀请饮食史、非遗、地方志和烹饪教师参与审核，给每个节点标注来源和争议点。

3. 用户贡献  
允许用户提交家族口述、地方菜线索和照片，但进入公开库前必须通过证据审核。

4. 机构共建  
与博物馆、地方文旅、学校和餐饮品牌共建专题库，例如“宋代文人饮食”“城市风味地图”“节令食俗课程”。

5. 可追溯发布  
每个复原包输出展陈文案、课程讲义、菜单描述、短视频脚本和分享证书，形成可复用的文化内容资产。

## 演示资产预算

当前菜品背景图目录 `frontend/public/dish-backgrounds` 共有 150 个文件，`node scripts/verify_asset_budget.mjs --limit 8` 统计总量为 227.43 MB。这个规模适合本地评委机演示，但不适合作为弱网下载包、移动端预加载包或快速交付压缩包。

短期目标是保留完整审核资产库，同时产出一个 50 MB 以内的 shareable demo asset set：

- 只预装 40 道菜的 approved 主图，候选图和 rejected 图进入离线审核包。
- 优先把 PNG 转为 WebP/AVIF，并保留蟹酿橙等标杆样本的高质量版本。
- 用 `scripts/verify_asset_budget.mjs --enforce --max-mb 50` 作为发布前预算门禁。
- 任何裁剪或格式转换都必须保留 `data/visual_assets/dish_backgrounds.json` 的审核状态、原始文件名和替换路径，避免把人工审核链切断。

## 图谱覆盖率说明与短期补强目标

40 个菜品节点已经能支撑演示目录，但关系覆盖率还不足以支撑“完整知识图谱”的投资人叙事。`node scripts/verify_knowledge_graph_coverage.mjs` 的当前审计结果为: 至少 1 类核心关系覆盖 10/40，0 类核心关系缺口 30/40；四类核心关系中，文献出处 `recorded_in` 为 9/40，食材构成 `contains` 为 7/40，技法连接 `uses_technique` 为 6/40，时代来源 `originated_in` 为 10/40。

短期补强目标是先提升可审计关系密度，而不是继续单纯扩菜品数量。48 小时内优先把 0 类核心关系菜品清零，并将 `recorded_in` 提升到 40/40、`contains` 提升到至少 32/40、`uses_technique` 提升到至少 24/40。补强完成后，演示前可用 `node scripts/verify_knowledge_graph_coverage.mjs --min-core-relations 1` 阻断无核心关系的图谱发布。
## Graph schema trust gate

`node scripts/verify_graph_schema.mjs` is the lightweight release gate for graph trust. It validates that relationship source/target endpoints exist, relationship types match `data/knowledge_graph/schema.json`, `recorded_in` relations carry source metadata, dish nodes keep source text and source passage fields, and flagship review entries in `data/knowledge_graph/expert_review_manifest.json` reference real nodes and citation objects.

The expert-review manifest is intentionally transparent: current flagship entries are marked `internal_reviewed` or `pending_external_expert`, not externally certified. It gives investors a machine-checkable review trail now while preserving the remaining work item of outside food-history or intangible-heritage expert sign-off.
