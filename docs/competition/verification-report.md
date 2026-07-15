# 风味考古局离线体验验证报告

- 验证日期：2026-07-15
- 分支：`feat/trae-offline-museum`
- 构建环境：Vite 8.0.16，Edge 147，Chrome 150
- 结论：工程交付、发布包与 TRAE 开发证据已归档；比赛提交仅缺审核通过的报名帖链接

## 1. 发布产物

| 产物 | 字节数 | 结果 |
| --- | ---: | --- |
| `frontend/dist-offline/offline.html` | 2,058,152 | 低于 3,000,000 字节上限 |
| `release/风味考古局-TRAE初赛/风味考古局-离线体验.html` | 2,058,152 | 与构建产物 SHA-256 一致 |
| `release/风味考古局-TRAE初赛.zip` | 1,066,335 | 包含离线 HTML 与使用说明 |

离线 HTML 内嵌 40 张 WebP 菜品图、Three.js 程序化场景、样式与脚本，不依赖服务器、CDN、网络字体或外部模型。

## 2. 自动化验证

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 仓库级质量门禁 | `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1` | 通过 |
| 后端测试 | 由 `verify-all.ps1` 执行 | 128/128 |
| 前端测试 | `cd frontend; npm test` | 133/133 |
| Python 测试 | 由 `verify-all.ps1` 执行 | 9/9 |
| 离线专项测试 | `cd frontend; npm run test:offline` | 61/61 |
| 脚本测试 | `node --test scripts/__tests__/*.test.mjs` | 36/36 |
| ESLint | `cd frontend; npm run lint` | 通过 |
| 在线前端构建 | `cd frontend; npm run build` | 通过 |
| 离线单文件构建 | `cd frontend; npm run build:offline` | 通过 |
| 离线包门禁 | `node scripts/verify_offline_bundle.mjs frontend/dist-offline/offline.html --enforce` | 通过，1.96 MiB |

离线包门禁验证外部脚本、样式、图片、媒体、CSS `url()` 和 `fetch()` 调用均为 0，并检查关键离线界面标签和 3,000,000 字节上限。

## 3. 浏览器验收

打包后执行：先将 `OFFLINE_HTML_PATH` 设为 `release/风味考古局-TRAE初赛/风味考古局-离线体验.html` 的绝对路径，再运行 `cd frontend; npm run verify:offline:ui`。

| 浏览器 | 1440x900 | 1280x720 | 390x844 | WebGL 强制降级 |
| --- | --- | --- | --- | --- |
| Edge 147 | 通过 | 通过 | 通过 | 三个视口均通过 |
| Chrome 150 | 通过 | 通过 | 通过 | 三个视口均通过 |

每个常规视口均验证：

- 直接加载本地 `file:` HTML，不产生外部网络请求或运行时错误。
- 首页 Three.js 画布可见，尺寸有效，截图像素不是空白画布。
- 在关闭自动旋转后，真实拖拽、滚轮缩放、恢复视角、结构拆解和历史/现代切换均会改变 Canvas 像素。
- 可完成五阶段可信复原，并切换拆解、历史结构和现代成品。
- 三个证据热点均可点击，证据详情会随选择变化。
- 首页可经“查看融合推演”进入预选的蟹酿橙 × 玉糁羹研究状态，并显示“蟹粉橙香米羹”规则提案。
- 可进入 40 道馆藏、互动研究和合作展厅，选中菜品会贯穿后续工具。
- 页面无非预期横向溢出，屏幕内交互控件没有重叠。

强制 WebGL 初始化失败后，首页与复原台都会切换到 2.5D 备用视图，证据热点、拆解和模式切换仍可使用。

## 4. 本轮缺陷修复

强制降级验收最初在首页“拆解结构”处失败。根因是 `CrabOrangeStage` 没有把 `hero` 变体传给 `CrabOrangeFallback`，备用视图使用默认居中布局后落入首页文字覆盖层。

修复内容：

- 将舞台 `variant` 透传到备用视图。
- 为备用视图生成 `crab-orange-fallback-hero` 类名。
- 首页备用视图的热点固定在右侧，控件固定在右下可操作区。
- 在 `offlineThree.test.mjs` 中增加变体透传与布局契约回归断言，并完成红绿验证。
- 将强制降级浏览器验收扩展到两个浏览器的全部三个视口，并加入控件重叠检查。
- 为被忽略的图片生成模块增加 `pretest` 与 `pretest:offline`，干净检出时会自动重建且哈希稳定。
- 提交门禁固定要求 `trae-01..03`，并要求作品帖同步包含报名链接、Session ID 和截图文件名。
- 融合规则返回的结构化风味指标在研究页被格式化为可读文本，避免 React 将对象直接渲染为子节点。
- 1280px 下首页提前切换为双列策展布局，移动端顶栏保留可访问的品牌首页按钮，确保融合研究后能返回首页。

## 5. 路径与打包验证

- 发布脚本已从最新构建重新生成 HTML 与 ZIP。
- ZIP 可读取并包含 `风味考古局-离线体验.html`、`使用说明.txt`。
- 离线 HTML 可从中文及空格路径由 `file:` 协议加载。
- `product-final.png` 取自 Chrome 1440x900 的真实自动化验收截图。

## 6. TRAE 开发证据归档

| 任务 | Session ID | 执行日期 | 过程截图 | 归档状态 |
| --- | --- | --- | --- | --- |
| TRAE-01 离线数字博物馆 | `6a55f8c1fd3185fa87ee5d3a` | 2026-07-14 | `docs/competition/screenshots/trae-01-progress.png` | 已归档 |
| TRAE-02 Three.js 展台 | `6a562c2ffd3185fa87ee63f0` | 2026-07-14 至 2026-07-15 | `docs/competition/screenshots/trae-02-progress.png` | 已归档 |
| TRAE-03 验证与提交 | `6a56f39ca1f7f092c0593b3d` | 2026-07-15 | `docs/competition/screenshots/trae-03-verification.png` | 已归档 |

三个 Session ID 互不相同；每项任务均至少有一张真实开发过程截图，并已写入 `docs/competition/trae-evidence-manifest.json`。这些证据由提交门禁实际读取，不依赖报告中的手工声明。

## 7. 仍需人工补充

以下内容无法从代码、自动化测试或现有开发记录中真实生成，继续由提交门禁标记为待补：

1. 审核通过且可访问的报名帖链接，格式为 `https://forum.trae.cn/t/topic/<数字>`。

当前状态为“工程交付完成、TRAE 证据已归档、报名帖链接待补”。填写并核验该链接后，运行 `node scripts/verify_trae_submission.mjs --enforce`；在门禁输出 `READY` 前，不能标记为正式参赛材料。
