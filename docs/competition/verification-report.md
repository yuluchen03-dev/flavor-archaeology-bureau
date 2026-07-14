# 风味考古局 · 离线体验验证报告

- 验证日期：2026-07-14
- 分支：feat/trae-offline-museum
- 验证人：自动化验证（子代理执行）
- 构建版本：vite v8.0.16，47 modules transformed

## 1. 构建产物路径与大小

| 产物 | 路径 | 大小 |
| --- | --- | --- |
| 构建产物 | `frontend/dist-offline/offline.html` | 918,776 bytes（897.24 KB） |
| 打包产物 | `release/风味考古局-TRAE初赛/风味考古局-离线体验.html` | 918,776 bytes（897.24 KB） |
| 提交 ZIP | `release/风味考古局-TRAE初赛.zip` | 234,124 bytes（228.64 KB） |
| 中文空格路径副本 | `tmp/中文 空格 验证/风味考古局-离线体验.html` | 918,776 bytes（897.24 KB） |

三个 HTML 文件字节大小完全一致，确认为同一份产物的副本。gzip 后约 236.49 KB。

## 2. 自动化验证命令与结果

### 2.1 离线单元测试（自动化验证通过）

命令：`cd frontend && npm run test:offline`

```
ℹ tests 37
ℹ pass 37
ℹ fail 0
ℹ duration_ms 866.246
```

覆盖内容：40 道馆藏菜品格式、蟹橙证据三热点、三种档案状态、五种证据类别、博物馆试点方案、真假非遗答题、传承人离线问答、风味进化融合引擎、拍照认祖/每日复活/证书、离线展品不调用网络 API、复原旅程五阶段、主页双路由标签、商业合作展品、线索匹配、每日复活、融合推理、祖先匹配、证书 SVG、进度存储、离线入口无路由器、单文件插件配置、模块预加载禁用、三主目的地、Three.js 场景/WebGLRenderer/球体/轨道控制、重置/爆炸/线框控制、三热点引文、WebGL 失败回退。

### 2.2 ESLint 静态检查（自动化验证通过）

命令：`cd frontend && npm run lint`

```
> eslint .
（无输出，退出码 0）
```

### 2.3 离线构建（自动化验证通过）

命令：`cd frontend && npm run build:offline`

```
[done] 生成 40 张图片，写入 generatedDishImages.js
vite v8.0.16 building client environment for production...
✓ 47 modules transformed.
[plugin vite:singlefile] Inlining: offline-CgrtJmK1.js
[plugin vite:singlefile] Inlining: style-pnSbtCW7.css
dist-offline/offline.html  918.77 kB │ gzip: 236.49 kB
✓ built in 1.93s
```

### 2.4 离线包验证器（自动化验证通过）

命令：`node scripts/verify_offline_bundle.mjs frontend/dist-offline/offline.html --enforce`

```
File: frontend/dist-offline/offline.html
Size: 897.24 KB
Status: OK
```

退出码 0，无违规项。

### 2.5 脚本测试套件（自动化验证通过）

命令：`node --test scripts/__tests__/*.test.mjs`

```
ℹ tests 27
ℹ pass 27
ℹ fail 0
ℹ duration_ms 811.3779
```

覆盖内容：资产预算汇总、超限资产标记、字节格式化、知识图谱校验（端点、源元数据、专家清单、节点类型）、关系覆盖统计、覆盖率阈值、Markdown 输出、离线包验证器（外部脚本/远程图片/内联 HTML/外部样式表/必需标签/标签缺失/fetch 调用检测）、提交清单门禁（空清单/占位符链接/有效链接/占位符 Session ID/重复 Session ID）。

### 2.6 TRAE 提交清单验证（自动化验证通过——门禁逻辑正确；清单数据待人工补充）

命令：`node scripts/verify_trae_submission.mjs`

```
NOT READY
缺失项 (8):
- 参赛帖草稿
- 报名帖链接
- trae-01 Session ID
- trae-01 开发截图
- trae-02 Session ID
- trae-02 开发截图
- trae-03 Session ID
- trae-03 开发截图
```

说明：验证器逻辑本身通过测试（5 项门禁测试全绿）。`NOT READY` 是因为 `docs/competition/trae-evidence-manifest.json` 中的 Session ID、报名帖链接和截图路径均未填写——这些属于人工产出，需由参赛者在 TRAE IDE 中实际操作后补充。

## 3. 中文空格路径验证（自动化验证通过）

命令：`node scripts/verify_offline_bundle.mjs 'tmp\中文 空格 验证\风味考古局-离线体验.html' --enforce`

```
File: tmp\中文 空格 验证\风味考古局-离线体验.html
Size: 897.24 KB
Status: OK
```

退出码 0。验证器能正确读取包含中文和空格的路径（`tmp\中文 空格 验证\风味考古局-离线体验.html`）并完成全部检查，无违规项。

## 4. 必需标签检查（自动化验证通过）

使用 PowerShell 逐项检查 `frontend/dist-offline/offline.html` 是否包含以下 6 个必需标签：

| 标签 | 是否存在 |
| --- | --- |
| 离线评审模式 | True |
| 开始 90 秒可信复原 | True |
| 数字传承人 | True |
| 味觉星图 | True |
| 风味进化 | True |
| 商业合作 | True |

6/6 全部存在。验证器 `verify_offline_bundle.mjs` 的 `REQUIRED_LABELS` 检查同样通过。

## 5. 外部资源检查（自动化验证通过）

验证器 `verify_offline_bundle.mjs` 检查以下外部资源引用，均为 0 违规：

- 外部 `<script src>`：0
- 外部 `<link href>`：0
- 外部 `<img src>`：0
- 外部 `<audio>/<video>/<source src>`：0
- CSS `url()` 外部引用：0

## 6. .glb/.gltf 引用检查（自动化验证通过）

对 `frontend/dist-offline/offline.html` 执行正则搜索 `\.glb|\.gltf`：

```
No matches found
```

构建产物不包含任何 3D 模型文件引用。Three.js 展台使用程序化生成的球体几何（`WebGLRenderer` + `sphere geometry`），不依赖外部模型文件。

## 7. fetch() 调用检查（自动化验证通过——修复后）

### 7.1 发现的问题

首次构建产物中检测到 1 处 `fetch(` 调用，来自 Vite 默认注入的模块预加载 polyfill：

```js
// Vite module preload polyfill（构建产物第 20 行，压缩后）
t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();
```

该 polyfill 会在运行时尝试 `fetch(e.href, n)` 预加载模块。虽然单文件构建中不存在 `<link rel="modulepreload">` 元素（polyfill 实际为死代码），但 `fetch(` 调用的存在违反"完全离线、无网络依赖"的约束。

### 7.2 修复措施

1. **先写失败测试**（TDD）：
   - `scripts/__tests__/verify_offline_bundle.test.mjs`：新增 `rejects fetch() calls in script content` 和 `accepts html without any fetch() calls` 两个测试。修复前第一个测试失败（`result.ok` 为 `true`，期望 `false`）。
   - `frontend/src/offline/__tests__/offlineShell.test.mjs`：新增 `offline build disables module preload polyfill to avoid fetch() calls` 测试。

2. **扩展验证器**：
   - `scripts/verify_offline_bundle.mjs`：在 `inspectOfflineHtml` 中新增第 6 项检查，使用正则 `/\bfetch\s*\(/` 检测原始 HTML 中的 `fetch(` 调用，命中则追加 `network-fetch` 违规码。

3. **修复构建配置**：
   - `frontend/vite.offline.config.js`：在 `build` 中添加 `modulePreload: false`，禁用 Vite 模块预加载 polyfill 注入。

### 7.3 修复后验证

重新构建后对 `frontend/dist-offline/offline.html` 执行正则搜索 `fetch\(`：

```
No matches found
```

验证器输出：

```
File: frontend/dist-offline/offline.html
Size: 897.24 KB
Status: OK
```

构建产物从 48 modules 降为 47 modules，文件从 919.47 kB 降为 918.77 kB（polyfill 代码被移除）。

## 8. 控制台错误检查（待人工补充）

- 状态：**待人工补充**
- 原因：自动化验证无法打开浏览器执行运行时检查。
- 人工验证步骤建议：
  1. 在 Chrome 中打开 `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`（双击或拖入浏览器）。
  2. 按 F12 打开开发者工具，查看 Console 标签页。
  3. 确认无红色错误（警告可接受，但 Error 必须为 0）。
  4. 在 Network 标签页确认所有请求均为 `data:` URI 或无网络请求。
  5. 重复以上步骤在 Edge 中执行一次。

## 9. 3D 像素检查（待人工补充）

- 状态：**待人工补充**
- 原因：自动化测试已验证 Three.js 场景结构（`WebGLRenderer`、`sphere geometry`、`orbit controls`、三热点引文、WebGL 失败回退 `CrabOrangeFallback`），但无法验证实际渲染像素。
- 自动化已覆盖的部分：
  - 场景使用 `WebGLRenderer` 和球体几何（`offlineThree.test.mjs`：`scene uses WebGLRenderer and sphere geometry with orbit controls` ✓）
  - 舞台暴露重置、爆炸、线框控制（`stage exposes reset, explode and wireframe controls` ✓）
  - 三个热点存在且引文精确（`three hotspots are present with exact quotes` ✓）
  - WebGL 失败时回退到 `CrabOrangeFallback`（`stage falls back to CrabOrangeFallback when WebGL fails` ✓）
- 人工验证步骤建议：
  1. 在浏览器中打开离线 HTML。
  2. 导航到"可信复原"展台。
  3. 确认 3D 蟹橙球体可见且可交互（拖拽旋转、滚轮缩放）。
  4. 点击三个热点，确认弹出对应引文。
  5. 点击重置/爆炸/线框按钮，确认视觉反馈。
  6. 在不支持 WebGL 的环境（或禁用 WebGL）中确认回退组件显示。

## 10. 桌面/手机视口检查（待人工补充）

- 状态：**待人工补充**
- 原因：自动化测试无法模拟不同视口尺寸的渲染。
- 人工验证步骤建议：
  1. 桌面视口（1920×1080 或 1440×900）：打开离线 HTML，确认布局正常、无横向滚动条、三主目的地可见。
  2. 平板视口（768×1024）：使用 DevTools 设备模拟，确认布局自适应。
  3. 手机视口（375×667 或 390×844）：确认导航可折叠、文字可读、3D 展台可触摸交互。
  4. 确认所有展品在窄屏下不溢出。

## 11. Chrome/Edge 浏览器检查（待人工补充）

- 状态：**待人工补充**
- 原因：自动化验证无法在真实浏览器中执行。
- 人工验证步骤建议：
  1. Chrome（最新稳定版）：打开离线 HTML，完整走查六个展品（主页/可信复原/探索馆藏/数字传承人/风味进化/商业合作）。
  2. Edge（最新稳定版）：重复上述走查。
  3. 确认两个浏览器中行为一致，无控制台错误。
  4. 推荐使用说明中已标注"推荐使用 Chrome 或 Edge 浏览器获得最佳体验"。

## 12. 完成的功能闭环（基于测试覆盖）

以下功能闭环已由自动化测试验证（共 37 项离线测试 + 27 项脚本测试）：

### 数据层
- 40 道馆藏菜品，ID 遵循 `dish_001..dish_040` 零填充格式
- 每道菜品携带图片、名称、朝代
- 蟹橙证据暴露三个固定热点，携带完整引用字段
- 蟹橙证据覆盖壳、馅、蒸制结构
- 证据种类列出五个规范类别
- 博物馆方案描述互动展台、时间线、设备、交付物和指标
- 真假非遗答题数据暴露真实和假冒非遗菜品
- 传承人答案可用于离线指导

### 展品层
- 所有原始能力存在于离线展品（数字传承人、味觉星图、风味进化、拍照认祖、每日复活、真假非遗、分享证书）
- 档案展品使用本地菜品数据和档案状态
- 传承人展品标注离线问答
- 进化展品使用本地融合引擎
- 互动展品使用本地祖先匹配、每日复活和证书
- 离线展品从不调用网络 API（`fetch(`、`apiRequest`、`axios` 均不存在于源码）

### 复原旅程
- 复原旅程包含五个命名阶段
- 复原旅程显示证据种类和必需标签
- 主页展品包含恰好两个路由标签
- 商业展品包含博物馆试点方案

### 引擎层
- `matchClue` 对规范蟹橙段落返回 matched
- `matchClue` 对弱线索返回 insufficient
- insufficient 线索结果列出至少三个需要的线索
- `getDailyRevival` 对同一日期返回同一菜品
- `fuseDishes` 报告离线规则推理模式
- `matchAncestor` 将每个结果标记为离线推理
- `createCertificateSvg` 返回 SVG 文档
- 进度存储持久化和清除离线进度

### 构建层
- 离线应用有专用非路由入口
- 离线构建使用单文件插件
- 离线构建禁用模块预加载 polyfill（避免 `fetch()` 调用）
- 离线外壳暴露恰好三个主目的地
- 离线包验证器检测外部脚本/图片/样式表/CSS url/fetch 调用

### 3D 层
- 场景使用 `WebGLRenderer` 和球体几何及轨道控制
- 舞台暴露重置、爆炸、线框控制
- 三个热点存在且引文精确
- WebGL 失败时回退到 `CrabOrangeFallback`

### 脚本验证层
- 资产预算汇总报告总字节和最大文件
- 超限资产标记为失败
- 字节格式化使用人类可读的二进制单位
- 知识图谱校验接受有效图谱
- 知识图谱校验拒绝端点不存在、源元数据缺失、专家清单缺失/引用未知对象/状态非允许列表/节点类型不一致/节点集合非数组
- 关系覆盖统计按菜品计数
- 覆盖率阈值报告低于最小核心关系的菜品
- Markdown 输出包含覆盖率和优先级章节

## 13. 非阻断降级

1. **WebGL 不可用时降级为 `CrabOrangeFallback`**：已由测试 `stage falls back to CrabOrangeFallback when WebGL fails` 覆盖。在不支持 WebGL 的设备上，3D 展台自动降级为静态fallback组件，不影响其他展品功能。

2. **TRAE 提交清单 `NOT READY`**：`docs/competition/trae-evidence-manifest.json` 中 Session ID、报名帖链接和截图路径为空。这不影响离线 HTML 本身的可用性，但需要在最终提交前由人工补充。验证器逻辑本身已通过 5 项门禁测试。

3. **模块预加载 polyfill 移除**：禁用 `modulePreload` 后，构建产物不再包含 Vite 的模块预加载 polyfill。在单文件构建中所有 JS/CSS 均已内联，不存在需要预加载的模块，因此该移除无功能影响。

## 14. 修复的文件清单

| 文件 | 修改类型 | 说明 |
| --- | --- | --- |
| `frontend/vite.offline.config.js` | 修复 | 新增 `modulePreload: false`，禁用 Vite 模块预加载 polyfill，消除 `fetch()` 调用 |
| `scripts/verify_offline_bundle.mjs` | 增强 | 在 `inspectOfflineHtml` 中新增 `network-fetch` 检测，使用 `/\bfetch\s*\(/` 正则检查原始 HTML |
| `scripts/__tests__/verify_offline_bundle.test.mjs` | 新增测试 | 新增 `rejects fetch() calls in script content` 和 `accepts html without any fetch() calls` |
| `frontend/src/offline/__tests__/offlineShell.test.mjs` | 新增测试 | 新增 `offline build disables module preload polyfill to avoid fetch() calls` |
| `docs/competition/verification-report.md` | 新增 | 本验证报告 |

## 15. 结论

### 自动化验证通过项（11/11）
1. 离线单元测试 37/37 ✓
2. ESLint 静态检查 ✓
3. 离线构建 ✓
4. 离线包验证器（外部资源 + 必需标签 + fetch 检测）✓
5. 脚本测试套件 27/27 ✓
6. 中文空格路径验证 ✓
7. 必需标签检查 6/6 ✓
8. 外部资源检查 0 违规 ✓
9. .glb/.gltf 引用检查 0 匹配 ✓
10. fetch() 调用检查 0 匹配（修复后）✓
11. TRAE 提交清单验证器逻辑（5/5 门禁测试）✓

### 待人工补充项（4/4）
1. 控制台错误检查（Chrome + Edge）
2. 3D 像素渲染检查
3. 桌面/手机视口检查
4. Chrome/Edge 浏览器走查

### 待人工补充的提交清单数据（8 项）
1. 参赛帖草稿文件 `docs/competition/trae-initial-round-post.md`
2. 报名帖链接 `registrationUrl`
3. trae-01 Session ID
4. trae-01 开发截图
5. trae-02 Session ID
6. trae-02 开发截图
7. trae-03 Session ID
8. trae-03 开发截图
