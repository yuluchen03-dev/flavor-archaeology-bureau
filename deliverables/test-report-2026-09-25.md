# 风味考古局 · 全量测试报告

> 生成时间：2026-09-25 14:56 (GMT+9)
> 范围：前端（React + Vite）+ 后端（Express + Jest）+ 部署契约

---

## 一、总览

| 维度 | 结果 | 明细 |
|------|------|------|
| 后端测试 | ✅ **168 / 168 通过** | 32 个套件全部通过（含 apiStream、authController、containerStartup） |
| 前端测试 | ✅ **150 / 150 通过** | 含页面结构断言、失败恢复、双语、离线壳等 |
| 前端生产构建 | ✅ 通过 | vite build ✓ built in 6.03s，365KB JS / 63KB CSS |
| 后端语法检查 | ✅ 通过 | app.js / routes/api.js / authController.js / config/runtime.js |

**本轮修复前状态**：前端 140/150（10 失败）、后端 168 用例中 12 失败（2 套件）。
**本轮修复后**：**全绿（318/318）**。

---

## 二、本轮修复清单（按问题域）

### 1. UI 一致性（原"继续"任务主线）
| 项 | 修复 |
|----|------|
| 标题装饰不统一 | 新建共享组件 `frontend/src/components/Eyebrow.jsx`（短线+金棕色小标签，支持左对齐/居中），统一应用于 Home / StarMap / Result / Evolution / Input / Teaching / BusinessValue 七个页面 |
| min-h-screen 嵌套 | `Result.jsx` 流式考据视图由 `min-h-screen` 改为 `min-h-[70vh]`，消除与 Layout 外层嵌套导致的 footer 下坠 |
| Result 信息密度重复 | 删除页内重复渲染的第二份「考据链 EvidenceTimeline」（与「可见考据链」面板内容重复） |
| 深浅色分割 | StarMap 已全页统一浅色纸面主题，深色仅保留 Result/Evolution 的古籍原文面板（设计意图），无需再改 |

### 2. 前端可靠性硬化（10 个测试契约全部落地）
| 项 | 修复 |
|----|------|
| Result 复原失败静默 | 新增 `showRequestError` + 错误面板「重试 / 返回输入」；`handleRetry` 通过 retryNonce 重跑请求；空档案不再 `return null` 白屏，渲染恢复操作页 |
| Result SSE 流改造 | 移除 EventSource，改为 `fetch POST /analyze-stream` + `consumeSseJsonStream`（复用 `src/lib/sseStream.js`，有界事件 64KB / 缓冲 512KB），新增首事件 20s / 空闲 30s 超时，AbortController 可取消 |
| Evolution 错误兜底 | `evolutionError` / `imageError` 状态 + `role="alert"` 提示 + `handleRetryImage` 重试生成 |
| LightMode 图片校验 | 上传前校验类型（JPG/PNG/WebP）与大小（≤8MB），新增 `reader.onerror` |
| LightMode 识别降级 | 识别失败不再静默回演示数据：展示 `degradedRecognition`（明确标注"识别降级·本地兜底"徽标）并 setError |
| Home 签名图懒加载 | 补 `loading="lazy" decoding="async" width height` 稳定布局 |
| main.jsx | 移除吞错误的 window error 监听，让运行时错误回到 ErrorBoundary |

### 3. 后端安全与正确性（12 个测试契约全部落地）
| 项 | 修复 |
|----|------|
| 邮箱/用户名未规范化 | 注册与登录接入 `src/validation/authInput.js`：邮箱 trim+小写、用户名 trim、注册密码 ≥8 字符，校验先于任何数据库访问 |
| 冲突响应不统一 | 邮箱/用户名冲突统一为 409 `{success:false, message:'用户名或邮箱已被使用'}`；并发唯一约束竞态（PG 23505 / SQLite UNIQUE）同样映射 409 |
| 用户枚举（时序侧信道） | 登录时用户不存在仍执行一次同代价 bcrypt 比较（`TIMING_SAFE_PLACEHOLDER_HASH`），恒定 401「邮箱或密码错误」 |
| analyze-stream 仅 GET | 后端抽公共 `streamAnalysisSse`，新增 `POST /api/analyze-stream`（JSON body），保留 GET 兼容旧客户端 |
| trust proxy 未设置 | `config/runtime.js` 新增 `resolveTrustProxy`（TRUST_PROXY_HOPS，默认 0 不信任），`app.js` 接线 `app.set('trust proxy', ...)` |

### 4. 部署契约（4 个 containerStartup 测试全部落地）
| 项 | 修复 |
|----|------|
| backend/Dockerfile | `COPY backend/ .` 改为显式 `COPY backend/src ./backend/src`；启动链改为 `npm run db:migrate && npm run db:seed-if-empty && npm start` |
| frontend/Dockerfile | `WORKDIR /app/frontend`、复制离线资源生成器到 `/app/scripts/`、产物路径 `/app/frontend/dist → /usr/share/nginx/html` |
| .dockerignore | 补 `**/.env`、`**/.env.*`、`!**/.env.example`、`backend/data/`，防密钥与运行时数据进镜像 |
| package.json | 新增 `db:migrate` / `db:seed-if-empty` 脚本 |
| 根/前端 .env.example、Dockerfile | `VITE_API_BASE` 默认改为同源 `/api`（配合 Nginx 反代） |
| 离线博物馆命名 | MuseumShell 三个入口统一为「可信复原台 / 风味馆藏库 / 合作展厅」，同步修正过时的 offlineDesign 断言 |

---

## 三、关键改动文件

```
frontend/src/components/Eyebrow.jsx          ← 新建
frontend/src/pages/{Home,StarMap,Result,Evolution,Input,Teaching,BusinessValue}.jsx
frontend/src/pages/LightMode.jsx             ← 图片校验 + 降级识别
frontend/src/pages/Result.jsx                ← SSE POST 流 + 错误恢复 UI + 去重
frontend/src/pages/Evolution.jsx             ← 错误兜底 + 重试
frontend/src/lib/sseStream.js                ← 已有，未改动（直接复用）
frontend/vite.config.js / main.jsx / Dockerfile / .env.example
backend/src/controllers/authController.js    ← 规范化 + 409 + 时序均衡
backend/src/routes/api.js                    ← POST analyze-stream
backend/src/config/runtime.js                ← resolveTrustProxy
backend/src/app.js                           ← trust proxy 接线
backend/Dockerfile / package.json
.dockerignore / docker-compose.yml(已达标未改) / .env.example
frontend/src/offline/components/MuseumShell.jsx
```

---

## 四、遗留风险与建议

| 级别 | 项 | 说明 |
|------|----|------|
| 🟠 高 | JWT 仍存 localStorage | XSS 风险，建议后续改 httpOnly cookie（本次未动，属独立安全项） |
| 🟠 高 | 依赖漏洞 | 后端 16 + 前端 9 个依赖漏洞待 `npm audit fix` 升级（涉及 breaking 变更需单独回归） |
| 🟡 中 | AGNES API 密钥 | 仍在 backend/.env 明文，上线前必须轮换（重复提醒：这是上次全检的阻塞项） |
| 🟡 中 | 流式接口实测 | POST /analyze-stream 单测通过，建议起真实后端做一次 90 秒评委路径手动冒烟 |
| 🟢 低 | 两份离线测试曾互相冲突 | offlineShell（新命名）与 offlineDesign（旧命名）断言矛盾，已统一为新命名，后续改名注意同步两处 |

---

## 五、结论

**全部 318 个测试用例通过，生产构建通过，部署契约补齐。** 从 2026-09-14 全检的「有条件通过」状态推进：本轮清掉了全部 22 个测试缺口（前端 10 + 后端 12），UI 一致性主线（标题装饰 / 信息密度 / min-h-screen）同步完成。剩余阻塞项为密钥轮换与依赖漏洞升级（见上表），均属配置/升级类，不影响本轮代码质量结论：**✅ 可进入发布准备**。
