# 风味考古局 TRAE 初赛完善与验收指南

## 当前结论

离线产品、自动化测试、双浏览器运行时验收和最新 ZIP 已完成。三个真实 TRAE Session ID 与对应开发过程截图也已归档；项目当前不能直接提交比赛的唯一剩余阻断项是审核通过的报名帖链接：

- 审核通过的报名帖链接。

不得用占位符或虚构内容替代这些材料。

## 已完成的工程交付

- 单文件离线 HTML：2,050,652 字节，低于 3,000,000 字节限制。
- 最新 ZIP：`release/风味考古局-TRAE初赛.zip`，1,064,604 字节。
- 40 张菜品图片均转为 WebP 数据 URI 并内嵌。
- Three.js 蟹酿橙场景不依赖 GLB、外部贴图或 CDN。
- WebGL 失败时自动切换 2.5D 备用视图，热点和控件仍可交互。
- Edge 147 与 Chrome 150 均通过 1440x900、1280x720、390x844 验收。
- 首页、五阶段复原、馆藏、研究工具和合作展厅已完成真实点击链检查。
- 最终产品截图已保存为 `docs/competition/screenshots/product-final.png`。

## 最新验证基线

| 验证 | 结果 |
| --- | --- |
| 后端测试 | 128/128 |
| 前端全量测试 | 133/133 |
| Python 测试 | 9/9 |
| 离线专项测试 | 61/61 |
| 脚本测试 | 36/36 |
| ESLint | 通过 |
| 在线与离线构建 | 通过 |
| 离线包门禁 | 通过，外部资源与网络调用 0 违规 |
| 浏览器矩阵 | Edge/Chrome 共 12 个场景通过 |

完整证据见 `docs/competition/verification-report.md`。

## 重新构建与验收

在项目根目录执行：

```powershell
cd frontend
npm run test:offline
npm run build:offline
npm run verify:offline:bundle
cd ..

node --test scripts/__tests__/*.test.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1

$env:OFFLINE_HTML_PATH = (Resolve-Path 'release/风味考古局-TRAE初赛/风味考古局-离线体验.html').Path
cd frontend
npm run verify:offline:ui
cd ..
Remove-Item Env:\OFFLINE_HTML_PATH
```

浏览器门禁必须放在打包之后，并通过 `OFFLINE_HTML_PATH` 直接加载发布目录中的最终 HTML；不能只验证打包前的 `dist-offline/offline.html`。

发布后核对：

- [x] HTML 小于 3,000,000 字节。
- [x] HTML 不包含外部资源或 `fetch()` 调用。
- [x] ZIP 中包含离线 HTML 和中文使用说明。
- [x] Edge 与 Chrome 的 WebGL 场景可见且非空白 Canvas。
- [x] 手机视口没有非预期横向滚动或控件重叠。
- [x] 强制 WebGL 失败后显示 2.5D 备用视图。
- [x] 2.5D 首页与复原台的热点、拆解和模式切换可用。

## 准备 TRAE 证据

三个任务建议保持以下对应关系：

| 任务 | 内容 | 必备证据 |
| --- | --- | --- |
| TRAE-01 | 离线博物馆主流程与原有功能迁移 | Session ID、任务提示截图、开发过程截图 |
| TRAE-02 | Three.js 蟹酿橙证据展台与 2.5D 降级 | Session ID、任务提示截图、3D 实现截图 |
| TRAE-03 | 单文件构建、验证和参赛打包 | Session ID、任务提示截图、测试或构建截图 |

截图放入：

```text
docs/competition/screenshots/
├── trae-01-prompt.png
├── trae-01-progress.png
├── trae-02-prompt.png
├── trae-03-prompt.png
└── product-final.png
```

证据清单 `docs/competition/trae-evidence-manifest.json` 已填写三个 `sessionId` 与实际截图路径。取得报名帖后，只填写真实 `registrationUrl`。

## 最终提交门禁

```powershell
node scripts/verify_trae_submission.mjs --enforce
```

只有输出以下内容才表示比赛材料完整：

```text
READY
所有提交门禁已通过。
```

当前清单：

- [x] 离线产品与 ZIP 已完成。
- [x] 3MB 体积限制已满足。
- [x] 3D、2.5D、桌面端与手机端已验证。
- [x] 作品帖草稿与产品截图已生成。
- [x] 三个真实 TRAE Session ID 已填写。
- [x] 三组真实 TRAE 开发截图已放入。
- [ ] 审核通过的报名帖链接已填写。
- [ ] 提交门禁输出 `READY`。
