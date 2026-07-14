# 风味考古局 · 优化清单

> 作为资深黑客松考官审查后生成，按优先级排列，全部已执行完毕。

---

## 一、关键问题（Critical）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| C1 | 5个前端页面硬编码 `http://localhost:3001/api`，部署即失效 | 上线即崩 | ✅ 已修复 |
| C2 | 后端缺少 `.gitignore`（已存在且完善） | 安全 | ✅ 已确认 |
| C3 | Input页历史时期/地域选项未绑定state，用户选择无效 | 功能缺失 | ✅ 已修复 |

**C1 修复方式**：创建 `frontend/.env`，所有页面改为 `import.meta.env.VITE_API_BASE`，fallback 保留 localhost。

**C3 修复方式**：`Input.jsx` 新增 `period` / `region` state，绑定 select，navigate 时一并传入。

---

## 二、体验问题（UX）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| U1 | 导航栏无移动端菜单，7个导航项在手机上溢出 | 移动端不可用 | ✅ 已修复 |
| U2 | 导航含"复原结果""数字传承"两个目标页，直接点击显示空状态 | 体验割裂 | ✅ 已修复 |
| U3 | 推理链新步骤出现时不自动滚动 | 核心流程体验差 | ✅ 已修复 |
| U4 | Teaching对话区新消息不自动滚到底部 | 对话体验差 | ✅ 已修复 |
| U5 | 复原置信度硬编码85%，与实际API数据脱节 | 数据不可信 | ✅ 已修复 |
| U6 | 无404页面，输错URL白屏 | 体验断裂 | ✅ 已修复 |

**U1 修复方式**：`Layout.jsx` 新增汉堡按钮（md:hidden），移动端展开时显示垂直菜单，动画平滑。

**U2 修复方式**：导航精简为5项（首页、轻量玩法、线索输入、味觉星图、风味进化）。

**U3 修复方式**：`Result.jsx` 新增 `useEffect` 监听 `reasoningSteps`，自动 `scrollIntoView`。

**U4 修复方式**：`Teaching.jsx` 新增 `messagesEndRef`，每次 `messages` 变化时滚到底。

**U5 修复方式**：`{restoredDish.confidence || 85}` 动态读取，宽度同步。

**U6 修复方式**：新增 `NotFound.jsx`，`App.jsx` 添加 `path="*"` 路由。

---

## 三、可靠性（Reliability）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| R1 | ErrorBoundary组件存在但从未使用，组件崩溃会白屏 | 可靠性 | ✅ 已修复 |

**R1 修复方式**：`App.jsx` 根层包裹 `<ErrorBoundary>`。

---

## 四、文档（Documentation）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| D1 | README缺少 `.env` 配置说明 | 评委启动困难 | ✅ 已修复 |

**D1 修复方式**：README 前端启动说明补充 `VITE_API_BASE` 说明。

---

## 修改文件汇总

```
frontend/
├── .env                          ← 新建：VITE_API_BASE
├── src/
│   ├── App.jsx                   ← ErrorBoundary包裹 + 404路由
│   ├── components/Layout.jsx     ← 移动端菜单 + 导航精简
│   ├── pages/
│   │   ├── Input.jsx             ← period/region state绑定
│   │   ├── Result.jsx            ← API_BASE env + 自动滚动 + 动态置信度
│   │   ├── StarMap.jsx           ← API_BASE env
│   │   ├── LightMode.jsx         ← API_BASE env
│   │   ├── Evolution.jsx         ← API_BASE env
│   │   ├── Teaching.jsx          ← API_BASE env + 自动滚动
│   │   └── NotFound.jsx          ← 新建：404页面
README.md                         ← 补充.env说明
```
