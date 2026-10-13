# QA Test Cases Report: 风味考古局

| Field | Value |
|-------|-------|
| **Date** | 2026-09-14 |
| **Project** | 风味考古局 (Flavor Archaeology) |
| **Tier** | Exhaustive |
| **Scope** | Full Stack (Frontend + Backend + Python Service + Database) |
| **Framework** | React 19 / Express.js / SQLite / Python |

---

## 一、测试环境

### 1.1 基础环境

| 项目 | 要求 |
|------|------|
| Node.js | >= 18.x |
| Python | >= 3.9 |
| 包管理 | npm (backend + frontend), pip (service) |
| 数据库 | SQLite 3 (开发: 文件存储, 测试: 内存数据库) |
| 浏览器 | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| 分辨率 | 1920x1080 (桌面), 1440x900 (笔记本), 375x812 (移动端) |

### 1.2 环境变量配置

```bash
# backend/.env
NODE_ENV=test
JWT_SECRET=test-secret-key-32chars-minimum
JWT_EXPIRES_IN=7d
PORT=3001
RATE_LIMIT_DISABLED=true          # 测试时可禁用
AUTH_RATE_LIMIT_DISABLED=true     # 测试时可禁用
PYTHON_BIN=python
CORS_ORIGIN=http://localhost:5173
# OPENAI_API_KEY=                 # 可选, 测试降级模式
# AGNES_API_KEY=                  # 可选, 测试降级模式

# frontend/.env
VITE_API_BASE=/api
VITE_API_TIMEOUT_MS=30000
```

### 1.3 启动方式

```powershell
# 方式一：PowerShell一键启动
powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1

# 方式二：Docker Compose
$env:JWT_SECRET="test-secret-key-32chars-minimum"
docker compose up --build

# 方式三：分别启动
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
cd service && pip install -r requirements.txt
```

---

## 二、前置数据 (Seed Data)

### 2.1 基础菜品数据

| dish_id | name | dynasty | 用途 |
|---------|------|---------|------|
| dish_001 | 蟹酿橙 | 南宋 | 核心演示菜品、复原测试、进化测试 |
| dish_002 | 槐叶冷淘 | 唐代 | 复原测试、星图测试 |
| dish_003 | 玉糁羹 | 宋代 | 复原测试、进化测试 |
| dish_004 | 王太守八宝豆腐 | 清代 | 复原测试 |
| dish_005 | 驼蹄羹 | 唐代 | 复原测试 |
| dish_006 | 浑羊殁忽 | 唐代 | 进化测试 |
| dish_007 | 荷包鱼 | 宋代 | 进化测试 |
| dish_008 | 荔枝腰子 | 宋代 | 星图测试 |
| dish_009 | 莲房鱼包 | 宋代 | 星图测试 |
| dish_010 | 东坡肉 | 宋代 | 进化测试 |
| dish_011 | 炙羊肉 | 元代 | 进化测试 |

### 2.2 用户测试账号

| 用户名 | 邮箱 | 密码 | 用途 |
|--------|------|------|------|
| testuser | test@example.com | Test@123456 | 登录/注册测试 |
| — | — | — | 未登录状态测试 (optionalAuth) |

### 2.3 古籍线索数据

```
线索一（蟹酿橙，完整）：
"橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内，仍以带枝顶覆之。入甑，用酒、醋、水蒸熟。"

线索二（弱线索，证据不足）：
"一道很香的古菜"

线索三（跨朝代）：
"《齐民要术》载：取羊胛肉，细切，以葱白、豉汁、橘皮调之。"

线索四（超长输入）：
构造8000字符的超长线索

线索五（特殊字符）：
"<script>alert('xss')</script>蟹酿橙的制作方法"
```

### 2.4 知识图谱数据

数据文件位于 `data/` 目录：
- `knowledge_graph/nodes_dish.json` - 菜品节点
- `knowledge_graph/nodes_dynasty.json` - 朝代节点
- `knowledge_graph/nodes_ingredient.json` - 食材节点
- `knowledge_graph/nodes_technique.json` - 技法节点
- `knowledge_graph/relationships.json` - 关系数据
- `fragments/ancient_fragments.json` - 古籍碎片
- `light_mode/fake_dishes.json` - 虚构菜品（用于真假非遗）
- `light_mode/quiz_real_dishes.json` - 真实菜品（用于真假非遗）

---

## 三、核心测试用例清单

### 模块 1: 用户认证 (Auth)

#### 1.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| AUTH-001 | 用户注册成功 | 未登录 | 1. POST /api/auth/register<br>2. body: {username:"newuser", email:"new@test.com", password:"Test@123456"} | 201, success:true, 返回user+token | P0 |
| AUTH-002 | 用户登录成功 | 已注册 | 1. POST /api/auth/login<br>2. body: {email:"new@test.com", password:"Test@123456"} | 200, success:true, 返回user+token | P0 |
| AUTH-003 | 获取当前用户信息 | 已登录, 持有token | 1. GET /api/auth/me<br>2. Header: Authorization: Bearer {token} | 200, 返回完整用户信息(不含password_hash) | P0 |
| AUTH-004 | 注册后自动登录 | 未登录 | 1. 注册成功后使用返回的token | token可直接访问/auth/me | P1 |

#### 1.2 边界值

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| AUTH-005 | 用户名最小长度(2字符) | 未登录 | 注册 username:"ab" | 201, 成功 | P1 |
| AUTH-006 | 用户名最大长度(32字符) | 未登录 | 注册 username: 32字符 | 201, 成功 | P1 |
| AUTH-007 | 用户名1字符(低于最小值) | 未登录 | 注册 username:"a" | 400, 格式校验失败 | P1 |
| AUTH-008 | 用户名33字符(超过最大值) | 未登录 | 注册 username: 33字符 | 400, 格式校验失败 | P1 |
| AUTH-009 | 密码最小长度(8字符) | 未登录 | 注册 password:"Test@123" | 201, 成功 | P1 |
| AUTH-010 | 密码7字符(低于最小值) | 未登录 | 注册 password:"Test@12" | 400, 密码不能少于8字符 | P1 |
| AUTH-011 | 密码72字节UTF-8边界 | 未登录 | 注册 password: 恰好72字节UTF-8 | 201, 成功 | P1 |
| AUTH-012 | 密码超过72字节UTF-8 | 未登录 | 注册 password: 超过72字节 | 400, 密码UTF-8编码超过bcrypt限制 | P1 |
| AUTH-013 | 邮箱254字符(最大长度) | 未登录 | 注册 email: 254字符有效邮箱 | 201, 成功 | P2 |
| AUTH-014 | 邮箱超过254字符 | 未登录 | 注册 email: 255字符 | 400, 邮箱长度限制 | P2 |

#### 1.3 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| AUTH-015 | 空用户名注册 | 未登录 | 注册 username:"" | 400, 用户名校验失败 | P0 |
| AUTH-016 | 空邮箱注册 | 未登录 | 注册 email:"" | 400, 邮箱为必填项 | P0 |
| AUTH-017 | 空密码注册 | 未登录 | 注册 password:"" | 400, 密码为必填项 | P0 |
| AUTH-018 | 无效邮箱格式 | 未登录 | 注册 email:"notanemail" | 400, 邮箱格式不正确 | P0 |
| AUTH-019 | 重复邮箱注册 | 已有test@example.com | 注册相同email | 409, 用户名或邮箱已被使用 | P0 |
| AUTH-020 | 重复用户名注册 | 已有testuser | 注册相同username | 409, 用户名或邮箱已被使用 | P0 |
| AUTH-021 | 用户名含特殊字符 | 未登录 | 注册 username:"user@#$" | 400, 用户名校验失败 | P1 |
| AUTH-022 | 中文用户名 | 未登录 | 注册 username:"测试用户" | 201, 成功 (支持中文) | P1 |
| AUTH-023 | 用户名含下划线/连字符 | 未登录 | 注册 username:"test_user-01" | 201, 成功 | P1 |
| AUTH-024 | 不存在的邮箱登录 | 未登录 | 登录 email:"nonexist@test.com" | 401, 邮箱或密码错误 | P0 |
| AUTH-025 | 错误密码登录 | 已注册 | 登录 password:"wrongpass" | 401, 邮箱或密码错误 | P0 |
| AUTH-026 | SQL注入用户名 | 未登录 | 注册 username:"' OR 1=1 --" | 400, 用户名校验失败 | P0 |
| AUTH-027 | SQL注入邮箱 | 未登录 | 注册 email:"' OR 1=1 --@test.com" | 400, 邮箱格式不正确 | P0 |
| AUTH-028 | XSS用户名 | 未登录 | 注册 username:"<script>alert(1)</script>" | 400, 用户名校验失败 | P0 |

#### 1.4 权限场景

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| AUTH-029 | 无token访问/auth/me | 未登录 | GET /api/auth/me (无Authorization头) | 401, 未提供认证令牌 | P0 |
| AUTH-030 | 无效token访问/auth/me | 未登录 | GET /api/auth/me, Authorization: Bearer invalid_token | 401, 无效的认证令牌 | P0 |
| AUTH-031 | 过期token访问/auth/me | 持有过期token | GET /api/auth/me, Authorization: Bearer {expired} | 401, 认证令牌已过期 | P0 |
| AUTH-032 | 伪造JWT访问/auth/me | 未登录 | GET /api/auth/me, Authorization: Bearer {伪造token} | 401, 无效的认证令牌 | P0 |
| AUTH-033 | 可选认证端点无token | 未登录 | POST /api/analyze (无Authorization) | 200, 正常处理(无用户ID) | P1 |
| AUTH-034 | 可选认证端点有token | 已登录 | POST /api/analyze (带Authorization) | 200, 正常处理(带用户ID) | P1 |

---

### 模块 2: 古籍分析 (Analyze)

#### 2.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| ANALYZE-001 | SSE流式分析(蟹酿橙) | 后端运行 | 1. POST /api/analyze-stream<br>2. body: {clue: "橙用黄熟大者，截顶去瓤..."} | 200, SSE流返回4步推理+result事件 | P0 |
| ANALYZE-002 | 分析返回推理步骤 | 后端运行 | 同ANALYZE-001 | 返回step1-4: 解析线索→食材考证→技法推演→整菜重建 | P0 |
| ANALYZE-003 | 分析返回完整菜品信息 | 后端运行 | 同ANALYZE-001 | result事件包含: id, name, dynasty, source, confidence, ingredients, cookingSteps | P0 |
| ANALYZE-004 | 分析返回证据评分 | 后端运行 | 同ANALYZE-001 | result.dish包含evidenceScore(0-100), evidenceBreakdown | P1 |
| ANALYZE-005 | 分析返回分享卡 | 后端运行 | 同ANALYZE-001 | result.dish包含shareCard对象 | P1 |
| ANALYZE-006 | 弱线索拒绝复原 | 后端运行 | POST /api/analyze-stream, body: {clue: "一道很香的古菜"} | 返回insufficient-evidence, needsMoreClues:true | P0 |
| ANALYZE-007 | 传统REST分析 | 后端运行 | POST /api/analyze, body: {inputType:"text", content:"蟹酿橙线索"} | 200, success:true | P1 |

#### 2.2 边界值

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| ANALYZE-008 | 线索最大字符数(8000) | 后端运行 | POST /api/analyze-stream, clue: 8000字符 | 200, 正常处理 | P1 |
| ANALYZE-009 | 线索超过8000字符 | 后端运行 | POST /api/analyze-stream, clue: 8001字符 | 400, clue must not exceed 8000 characters | P1 |
| ANALYZE-010 | 线索最大字节数(24KB) | 后端运行 | POST /api/analyze-stream, clue: 超过24KB UTF-8 | 400, clue must not exceed 24576 UTF-8 bytes | P1 |
| ANALYZE-011 | 空线索 | 后端运行 | POST /api/analyze-stream, body: {clue: ""} | 400, clue must be a non-empty string | P0 |
| ANALYZE-012 | 纯空格线索 | 后端运行 | POST /api/analyze-stream, body: {clue: "   "} | 400, clue must be a non-empty string | P1 |

#### 2.3 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| ANALYZE-013 | GET方法访问analyze-stream | 后端运行 | GET /api/analyze-stream | 405, Use POST with a JSON clue body | P1 |
| ANALYZE-014 | 非字符串clue | 后端运行 | POST /api/analyze-stream, body: {clue: 12345} | 400, clue must be a non-empty string | P1 |
| ANALYZE-015 | null clue | 后端运行 | POST /api/analyze-stream, body: {clue: null} | 400, clue must be a non-empty string | P1 |
| ANALYZE-016 | XSS在线索中 | 后端运行 | POST /api/analyze-stream, body: {clue: "<img src=x onerror=alert(1)>蟹酿橙"} | 200, 正常处理（XSS被安全转义） | P0 |
| ANALYZE-017 | Python服务超时 | 后端运行,Python慢 | 线索触发Python长时间运行 | 30秒超时后返回错误事件 | P1 |

---

### 模块 3: 菜品复原 (Restore)

#### 3.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| RESTORE-001 | 复原已有菜品 | 后端运行 | POST /api/restore, body: {dishId:"dish_001"} | 200, 返回完整复原结果 | P0 |
| RESTORE-002 | 基于线索复原 | 后端运行 | POST /api/restore, body: {clues:{possibleDishes:["蟹酿橙"]}} | 200, 返回蟹酿橙复原结果 | P0 |
| RESTORE-003 | 复原结果包含完整字段 | 后端运行 | 同RESTORE-001 | 包含: name, dynasty, source, ingredients, cookingSteps, confidence | P0 |
| RESTORE-004 | 获取复原历史(已登录) | 已登录 | GET /api/restore/history | 200, 返回历史记录数组 | P1 |
| RESTORE-005 | 获取复原历史(未登录) | 未登录 | GET /api/restore/history | 401, 未提供认证令牌 | P1 |

#### 3.2 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| RESTORE-006 | 无analysisId也无clues | 后端运行 | POST /api/restore, body: {} | 400, 请提供分析ID或线索信息 | P0 |
| RESTORE-007 | 不存在的dishId | 后端运行 | POST /api/restore, body: {dishId:"nonexist"} | 200, 返回needsMoreClues或默认处理 | P1 |

---

### 模块 4: 菜品详情与搜索 (Recipe)

#### 4.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| RECIPE-001 | 获取菜品详情 | 后端运行 | GET /api/recipe/1 | 200, 返回dish+similarDishes | P0 |
| RECIPE-002 | 搜索菜品(关键词) | 后端运行 | GET /api/recipe/search?keyword=蟹 | 200, 返回含"蟹"的菜品列表 | P0 |
| RECIPE-003 | 搜索菜品(朝代) | 后端运行 | GET /api/recipe/search?dynasty=南宋 | 200, 返回南宋菜品列表 | P1 |
| RECIPE-004 | 搜索菜品(分页) | 后端运行 | GET /api/recipe/search?page=1&limit=5 | 200, 最多返回5条 | P1 |
| RECIPE-005 | 不存在的菜品 | 后端运行 | GET /api/recipe/99999 | 404, 菜品不存在 | P0 |

---

### 模块 5: 数字传承人教学 (Teach)

#### 5.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| TEACH-001 | 发起教学对话 | 后端运行 | POST /api/teach, body: {dishId:"dish_001", message:"如何选择橙子？"} | 200, 返回教学回复 | P0 |
| TEACH-002 | 教学包含sessionId | 后端运行 | POST /api/teach, body: {dishId, message, sessionId:"s1"} | 200, 返回持续对话结果 | P1 |
| TEACH-003 | 获取教学历史(已登录) | 已登录 | GET /api/teach/history | 200, 返回历史记录 | P1 |

#### 5.2 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| TEACH-004 | 缺少dishId | 后端运行 | POST /api/teach, body: {message:"如何做？"} | 400, 菜品ID和消息为必填项 | P0 |
| TEACH-005 | 缺少message | 后端运行 | POST /api/teach, body: {dishId:"dish_001"} | 400, 菜品ID和消息为必填项 | P0 |

---

### 模块 6: 味觉星图 (StarMap)

#### 6.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| STARMAP-001 | 获取完整星图数据 | 后端运行 | GET /api/star-map | 200, 返回菜品列表含味觉维度数据 | P0 |
| STARMAP-002 | 获取菜品星图位置 | 后端运行 | GET /api/star-map/dish/1 | 200, 返回菜品味觉坐标 | P0 |
| STARMAP-003 | 按朝代筛选星图 | 后端运行 | GET /api/star-map?dynasty=宋代 | 200, 返回宋代菜品 | P1 |
| STARMAP-004 | 不存在菜品的位置 | 后端运行 | GET /api/star-map/dish/99999 | 404, 菜品不存在 | P1 |

---

### 模块 7: 风味进化 (Evolution)

#### 7.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| EVOLVE-001 | 正常融合两个菜品 | 后端运行 | POST /api/evolution, body: {dishId1:"dish_001", dishId2:"dish_003"} | 200, 返回newDish+fusionConcept | P0 |
| EVOLVE-002 | 进化结果含分享卡 | 后端运行 | 同EVOLVE-001 | 返回shareCard对象 | P1 |
| EVOLVE-003 | 进化结果含图片提示 | 后端运行 | 同EVOLVE-001 | 返回imagePrompt字段 | P1 |

#### 7.2 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| EVOLVE-004 | 缺少dishId1 | 后端运行 | POST /api/evolution, body: {dishId2:"dish_001"} | 400, 需要提供两个菜品ID | P0 |
| EVOLVE-005 | 缺少dishId2 | 后端运行 | POST /api/evolution, body: {dishId1:"dish_001"} | 400, 需要提供两个菜品ID | P0 |
| EVOLVE-006 | 不存在的菜品ID | 后端运行 | POST /api/evolution, body: {dishId1:"invalid", dishId2:"dish_001"} | 500, 错误消息或优雅降级 | P1 |
| EVOLVE-007 | 两个相同菜品融合 | 前端禁用 | POST /api/evolution, body: {dishId1:"dish_001", dishId2:"dish_001"} | 前端阻止/后端处理 | P2 |

---

### 模块 8: 轻量模式 (Light Mode)

#### 8.1 拍照认祖

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| LIGHT-001 | 文字描述认祖 | 后端运行 | POST /api/light/ancestor, body: {description:"橙香蟹粉拌面"} | 200, 返回ancestor+confidence+vision | P0 |
| LIGHT-002 | 带图片认祖 | 后端运行 | POST /api/light/ancestor, body: {description, imageLabel:"food.jpg", imageData:"data:image/..."} | 200, 返回识别结果 | P0 |
| LIGHT-003 | 空描述认祖 | 后端运行 | POST /api/light/ancestor, body: {} | 500 或 优雅降级 | P1 |
| LIGHT-004 | 超大图片(>6MB) | 前端校验 | 上传>6MB图片 | 前端拒绝: 图片过大 | P1 |

#### 8.2 每日复活

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| LIGHT-005 | 获取每日复活 | 后端运行 | GET /api/light/daily | 200, 返回每日菜品+dish+confidence+draws | P0 |
| LIGHT-006 | 抽卡(draw=1) | 后端运行 | GET /api/light/daily?draw=1 | 200, 返回新菜品, draws.remaining减少 | P0 |
| LIGHT-007 | 用完每日抽卡次数 | 后端运行 | 连续draw直到remaining=0 | 200, 返回当日最后菜品 | P1 |
| LIGHT-008 | 排除已抽菜品 | 后端运行 | GET /api/light/daily?draw=1&excludeDishId=dish_001 | 200, 返回不同菜品 | P1 |

#### 8.3 真假非遗

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| LIGHT-009 | 获取真假非遗题目 | 后端运行 | GET /api/light/authenticity | 200, 返回question+options+answerId+explanation | P0 |
| LIGHT-010 | 带seed获取题目 | 后端运行 | GET /api/light/authenticity?seed=12345 | 200, 返回确定性题目 | P1 |
| LIGHT-011 | 带朝代筛选题目 | 后端运行 | GET /api/light/authenticity?dynasty=宋代 | 200, 返回宋代相关题目 | P2 |

#### 8.4 分享卡

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| LIGHT-012 | 生成分享卡 | 后端运行 | POST /api/light/share-card, body: {dishId:"dish_001", type:"revival"} | 200, 返回shareCard对象 | P1 |

---

### 模块 9: 古籍碎片 (Fragments)

#### 9.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| FRAG-001 | 获取所有碎片列表 | 后端运行 | GET /api/fragments | 200, 返回碎片列表 | P1 |
| FRAG-002 | 获取单个碎片详情 | 后端运行 | GET /api/fragments/{valid_id} | 200, 返回碎片详情 | P1 |
| FRAG-003 | 不存在的碎片 | 后端运行 | GET /api/fragments/nonexist | 404, 古籍碎片不存在 | P1 |

---

### 模块 10: 图片生成 (Image Generation)

#### 10.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| IMG-001 | GET方式生成图片 | 后端运行 | GET /api/generate-image?dishId=dish_001&dishName=蟹酿橙 | 200, 返回imageUrl | P0 |
| IMG-002 | POST方式生成图片 | 后端运行 | POST /api/generate-image, body: {dishId:"dish_001", dishName:"蟹酿橙", prompt:"..."} | 200, 返回imageUrl | P0 |
| IMG-003 | 无API Key降级 | 无AGNES_API_KEY | GET /api/generate-image?dishName=蟹酿橙 | 200, 返回SVG placeholder, status:"degraded" | P0 |
| IMG-004 | 纯prompt生成 | 后端运行 | GET /api/generate-image?prompt=蟹酿橙复原图 | 200, 返回图片或placeholder | P1 |

#### 10.2 异常输入

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| IMG-005 | 无任何参数 | 后端运行 | GET /api/generate-image | 400, Provide a dishId, dishName, or prompt | P0 |
| IMG-006 | 超长prompt(>2000字符) | 后端运行 | GET /api/generate-image?prompt={2001字符} | 400, prompt must not exceed 2000 characters | P1 |
| IMG-007 | 超长dishName(>80字符) | 后端运行 | GET /api/generate-image?dishName={81字符} | 400, dishName must not exceed 80 characters | P1 |
| IMG-008 | 超长dishId(>64字符) | 后端运行 | GET /api/generate-image?dishId={65字符} | 400, dishId must not exceed 64 characters | P1 |

---

### 模块 11: 速率限制 (Rate Limit)

#### 11.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| RATE-001 | 正常请求含RateLimit头 | 限速启用 | GET /api/ | 响应含X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset | P1 |
| RATE-002 | 触发限速 | 限速启用 | 连续发送超过maxRequests请求 | 429, 请求过于频繁，请稍后再试 | P1 |
| RATE-003 | 限速窗口重置 | 限速启用 | 触发限速后等待windowMs | 限速解除, 可正常请求 | P1 |
| RATE-004 | 限速禁用 | RATE_LIMIT_DISABLED=true | 任意数量请求 | 无限速, 无429 | P1 |

---

### 模块 12: 错误处理与通用

#### 12.1 正常流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|----------|--------|
| COMMON-001 | 健康检查 | 后端运行 | GET /health | 200, 返回readiness report | P0 |
| COMMON-002 | API根路径信息 | 后端运行 | GET /api/ | 200, 返回版本和端点列表 | P1 |
| COMMON-003 | 404处理 | 后端运行 | GET /api/nonexist | 404, 请求的资源不存在 | P0 |
| COMMON-004 | JSON解析错误 | 后端运行 | POST /api/analyze (body: invalid json) | 400, JSON解析错误 | P1 |

---

## 四、前端测试用例

### 模块 F1: 页面路由

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-ROUTE-001 | 首页加载 | 访问 / | 正确渲染Home组件 | P0 |
| F-ROUTE-002 | 输入页 | 访问 /input | 正确渲染Input组件, 包含3种输入类型 | P0 |
| F-ROUTE-003 | 结果页(直接访问无state) | 访问 /result | 展示缓存演示或默认处理 | P0 |
| F-ROUTE-004 | 教学页 | 访问 /teaching | 正确渲染Teaching组件 | P1 |
| F-ROUTE-005 | 星图页 | 访问 /starmap | 正确渲染StarMap组件 | P1 |
| F-ROUTE-006 | 进化页 | 访问 /evolution | 正确渲染Evolution组件 | P0 |
| F-ROUTE-007 | 轻量模式页 | 访问 /light | 正确渲染LightMode组件 | P0 |
| F-ROUTE-008 | 商业价值页 | 访问 /business-value | 正确渲染BusinessValue组件 | P2 |
| F-ROUTE-009 | 404页 | 访问 /nonexist-path | 正确渲染NotFound组件 | P1 |
| F-ROUTE-010 | 评委模式 | 访问 /input?demo=judge | 自动填充蟹酿橙线索, 锁定宋元江南 | P0 |

### 模块 F2: 输入页交互

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-INPUT-001 | 切换输入类型 | 点击"古籍片段"→"古画描述"→"口述线索" | placeholder和标签正确切换 | P1 |
| F-INPUT-002 | 使用蟹酿橙线索 | 点击"使用蟹酿橙线索" | 自动填入demoClue, period="宋元", region="江南" | P0 |
| F-INPUT-003 | 空输入提交 | 不输入内容直接提交 | 表单阻止提交(textarea required) | P0 |
| F-INPUT-004 | 正常提交 | 输入线索→点击"开始复原" | 跳转到/result, 传递state | P0 |
| F-INPUT-005 | 评委模式提交 | 评委模式下点击"下一步：可信复原" | 跳转到/result?demo=judge | P0 |

### 模块 F3: 结果页交互

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-RESULT-001 | SSE流式推理展示 | 从输入页提交线索 | 逐步展示推理步骤动画 | P0 |
| F-RESULT-002 | 复原结果展示 | SSE完成后 | 展示菜品名称、朝代、置信度、食材、步骤 | P0 |
| F-RESULT-003 | 证据链图谱 | 查看结果 | 展示6个节点: 古籍→菜品→食材→技法→朝代→替代食材 | P1 |
| F-RESULT-004 | 证据抽屉 | 展开证据抽屉 | 显示citation详情: 短摘、source_url、verification_note | P1 |
| F-RESULT-005 | 复活证书 | 查看证书区域 | 显示证书标题、标签、证书ID、复活认证印章 | P1 |
| F-RESULT-006 | 复制分享文案 | 点击"复制分享文案" | 剪贴板包含分享文案 | P1 |
| F-RESULT-007 | 弱线索测试 | 评委模式点击"一键弱线索测试" | 显示evidenceStatus:insufficient | P0 |
| F-RESULT-008 | 重试功能 | 点击"重试"按钮 | 重新发起请求 | P1 |
| F-RESULT-009 | AI状态标签 | 查看结果 | 显示: 真实AI/降级/缓存演示/本地规则 | P1 |
| F-RESULT-010 | 连接失败降级 | 后端不可用 | 自动降级到缓存蟹酿橙演示 | P0 |
| F-RESULT-011 | SSE超时处理 | 后端不响应 | 15秒后显示"考据链未能及时开始" | P1 |
| F-RESULT-012 | SSE空闲超时 | SSE中间断开 | 30秒后显示"考据链等待响应超时" | P1 |
| F-RESULT-013 | 导航到教学 | 点击"学习制作" | 跳转到/teaching, 传递dishId和dishName | P1 |
| F-RESULT-014 | 导航到进化 | 点击"风味进化" | 跳转到/evolution | P1 |
| F-RESULT-015 | 导航到星图 | 点击"味觉星图" | 跳转到/starmap | P1 |

### 模块 F4: 进化页交互

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-EVOLVE-001 | 选择亲本菜品 | 点击亲本A/B的菜品选项 | 选中高亮, 另一方禁用该选项 | P0 |
| F-EVOLVE-002 | 风味雷达图 | 选择两个菜品后 | 显示两个6维雷达图(酸甜苦辛咸鲜) | P1 |
| F-EVOLVE-003 | 发起进化 | 点击"开始进化" | 显示加载动画, 返回融合结果 | P0 |
| F-EVOLVE-004 | 进化结果展示 | 进化完成 | 展示新物种名、血统图、风味对比、分享证书 | P0 |
| F-EVOLVE-005 | 进化图片生成 | 进化完成 | 自动请求generate-image, 展示成品图 | P1 |
| F-EVOLVE-006 | 重新选择 | 点击"重新选择" | 清空结果, 恢复选择状态 | P1 |
| F-EVOLVE-007 | 相同菜品不可融合 | 选择两个相同菜品 | 进化按钮disabled | P1 |

### 模块 F5: 轻量模式交互

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-LIGHT-001 | 拍照认祖-文字描述 | 输入描述→点击"识别祖先菜" | 展示祖先菜、置信度、故事、视觉证据 | P0 |
| F-LIGHT-002 | 拍照认祖-上传图片 | 选择图片→输入描述→提交 | 展示识别结果 | P0 |
| F-LIGHT-003 | 内置样例按钮 | 点击"内置样例" | 自动填充样例描述 | P1 |
| F-LIGHT-004 | 每日复活抽卡 | 点击"抽一张" | 展示每日菜品卡, 包含信心度和稀有度 | P0 |
| F-LIGHT-005 | 再抽一张 | 再次点击"再抽一张" | 展示不同菜品 | P1 |
| F-LIGHT-006 | 抽卡次数用完 | 耗尽每日次数 | 按钮显示"今日次数已用完", disabled | P1 |
| F-LIGHT-007 | 真假非遗答题 | 选择一个选项 | 正确/错误反馈, 展示解释 | P0 |
| F-LIGHT-008 | 下一题 | 点击"下一题" | 加载新的真假非遗题目 | P1 |
| F-LIGHT-009 | 图片类型校验 | 上传非图片文件(如.txt) | 前端拒绝: "请选择JPEG/PNG/WebP/GIF图片" | P1 |
| F-LIGHT-010 | 降级模式标识 | 后端不可用 | 显示"本地演示数据"标识, 本地演示数据正常展示 | P0 |
| F-LIGHT-011 | 数字传承人面板 | 识别完成后 | 展示风味向导、语音播放、证据要点 | P1 |

### 模块 F6: 认证面板

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| F-AUTH-001 | 打开登录面板 | 点击"进入风味局" | 弹出登录表单 | P0 |
| F-AUTH-002 | 切换到注册 | 点击"注册" | 切换到注册表单, 显示用户名字段 | P0 |
| F-AUTH-003 | 注册成功 | 填写完整信息→提交 | 面板关闭, 显示"已登录" | P0 |
| F-AUTH-004 | 登录成功 | 填写邮箱密码→提交 | 面板关闭, 显示用户名和"退出"按钮 | P0 |
| F-AUTH-005 | 退出登录 | 点击"退出" | 清除认证, 恢复"进入风味局"按钮 | P0 |
| F-AUTH-006 | ESC关闭面板 | 打开面板后按ESC | 面板关闭 | P1 |
| F-AUTH-007 | 点击外部关闭 | 打开面板后点击外部 | 面板关闭 | P1 |
| F-AUTH-008 | 处理中状态 | 提交表单后 | 按钮显示"处理中...", disabled | P1 |
| F-AUTH-009 | 错误消息显示 | 提交失败后 | 面板内显示红色错误消息 | P1 |

---

## 五、非功能测试

### 5.1 性能测试

| ID | 用例 | 指标 | 预期 | 优先级 |
|----|------|------|------|--------|
| PERF-001 | 首页加载时间 | TTFB + FCP | < 3秒 | P1 |
| PERF-002 | SSE首事件延迟 | 从POST到首个step事件 | < 5秒 | P0 |
| PERF-003 | 图片生成响应时间 | 从请求到返回 | < 30秒 (降级placeholder < 1秒) | P1 |
| PERF-004 | API全局速率限制 | 窗口期内最大请求数 | 120次/60秒 | P1 |
| PERF-005 | 认证接口速率限制 | 窗口期内最大请求 | 10次/15分钟 | P1 |
| PERF-006 | JSON body大小限制 | express.json limit | 10MB | P1 |
| PERF-007 | Python执行超时 | execFile timeout | 30秒 | P1 |

### 5.2 安全测试

| ID | 用例 | 操作步骤 | 预期结果 | 优先级 |
|----|------|----------|----------|--------|
| SEC-001 | SQL注入防护 | 在搜索/输入中注入SQL | 参数化查询, 无SQL执行 | P0 |
| SEC-002 | XSS防护 | 在输入中注入脚本标签 | 内容被转义, 不执行 | P0 |
| SEC-003 | CORS配置 | 跨域请求 | 只允许配置的origin | P0 |
| SEC-004 | JWT密钥安全 | 生产环境无JWT_SECRET | 启动时抛出错误 | P0 |
| SEC-005 | 密码哈希存储 | 检查数据库 | 密码以bcrypt哈希存储, 不返回password_hash | P0 |
| SEC-006 | 错误栈不泄露 | 生产环境500错误 | 不返回stack trace | P0 |
| SEC-007 | 输入长度限制 | 发送超大输入 | 被clue/image/dishName长度限制阻止 | P1 |
| SEC-008 | SVG注入防护 | 构造恶意dishName | escapeXml转义特殊字符 | P1 |
| SEC-009 | 不存在用户登录防御 | 使用不存在邮箱登录 | 使用DUMMY_PASSWORD_HASH做恒定时间比较 | P1 |
| SEC-010 | token过期清理 | 401/403响应 | 前端自动清除过期认证 | P1 |

### 5.3 兼容性测试

| ID | 用例 | 浏览器 | 预期结果 | 优先级 |
|----|------|--------|----------|--------|
| COMPAT-001 | Chrome功能完整性 | Chrome 120+ | 所有功能正常 | P0 |
| COMPAT-002 | Firefox功能完整性 | Firefox 120+ | 所有功能正常 | P1 |
| COMPAT-003 | Safari功能完整性 | Safari 17+ | 所有功能正常 | P1 |
| COMPAT-004 | Edge功能完整性 | Edge 120+ | 所有功能正常 | P2 |
| COMPAT-005 | 移动端响应式 | Chrome Mobile | 布局自适应, 无水平滚动 | P1 |
| COMPAT-006 | SSE浏览器兼容 | 所有目标浏览器 | SSE流正常工作 | P0 |
| COMPAT-007 | Clipboard API兼容 | 所有目标浏览器 | 复制分享文案功能正常 | P2 |

### 5.4 可用性/无障碍测试

| ID | 用例 | 检查项 | 预期结果 | 优先级 |
|----|------|--------|----------|--------|
| A11Y-001 | 键盘导航 | Tab遍历 | 所有交互元素可Tab到达 | P1 |
| A11Y-002 | 图片alt属性 | 检查所有img | 每张图片有有意义的alt | P1 |
| A11Y-003 | 表单label | 检查所有input/textarea | 每个表单控件有关联label | P1 |
| A11Y-004 | ARIA属性 | 检查dialog/alert | 正确使用role和aria属性 | P2 |
| A11Y-005 | 颜色对比度 | 文字与背景 | WCAG AA标准(4.5:1) | P2 |
| A11Y-006 | ErrorBoundary | JS运行时错误 | 友好错误页面, 不白屏 | P0 |

---

## 六、回归测试清单

### 6.1 核心回归项 (每次提交必须验证)

| ID | 功能 | 验证方法 | 优先级 |
|------|------|----------|--------|
| REG-001 | 后端健康检查 | GET /health → 200 | P0 |
| REG-002 | SSE流式分析链 | POST /api/analyze-stream → 4步推理+result | P0 |
| REG-003 | 弱线索拒绝 | 弱线索输入 → insufficient-evidence | P0 |
| REG-004 | 图片降级模式 | 无API Key → SVG placeholder | P0 |
| REG-005 | 用户注册→登录→获取信息 | 完整认证流程 | P0 |
| REG-006 | 进化融合 | 两菜品融合 → 返回新菜品 | P0 |
| REG-007 | 前端路由 | 所有页面可访问 | P0 |
| REG-008 | 缓存演示降级 | 后端不可用 → 蟹酿橙演示 | P0 |

### 6.2 功能回归项 (主要功能变更时验证)

| ID | 功能 | 验证方法 | 优先级 |
|------|------|----------|--------|
| REG-009 | 星图数据完整性 | GET /api/star-map → 所有菜品含味觉维度 | P1 |
| REG-010 | 每日复活抽卡 | draw=1 → 新菜品 + 剩余次数减少 | P1 |
| REG-011 | 真假非遗 | GET /api/light/authenticity → 2个选项+答案 | P1 |
| REG-012 | 教学对话 | POST /api/teach → 返回教学回复 | P1 |
| REG-013 | 古籍碎片 | GET /api/fragments → 碎片列表 | P2 |
| REG-014 | 速率限制响应头 | X-RateLimit-* 头存在 | P2 |

---

## 七、测试重点分级总结

### P0 (必须通过 - 阻塞发布)

共 **42** 个测试用例，覆盖：
- 用户认证核心流程 (注册/登录/权限)
- 古籍分析SSE流式链路
- 弱线索证据不足拒绝
- 图片生成降级模式
- 菜品复原核心流程
- 风味进化核心流程
- 轻量模式核心功能 (认祖/每日/真假非遗)
- 缓存演示降级
- SQL注入/XSS/CORS安全防护
- ErrorBoundary容错
- 前端路由完整性

### P1 (应该通过 - 严重问题需修复)

共 **60+** 个测试用例，覆盖：
- 边界值测试 (输入长度、密码字节数)
- 分页/筛选/搜索功能
- 历史记录获取
- 速率限制行为
- 前端交互细节
- 降级/超时处理
- 跨浏览器兼容
- 键盘导航/无障碍基础
- 性能基线

### P2 (建议通过 - 可延后修复)

共 **15+** 个测试用例，覆盖：
- 极端边界值
- 相同菜品融合前端阻止
- Edge浏览器兼容
- 颜色对比度
- 次要UI细节

---

## 八、现有测试套件分析

项目已有的测试文件：

| 文件 | 覆盖模块 | 状态 |
|------|----------|------|
| backend/src/config/__tests__/auth.test.js | JWT配置 | ✅ 存在 |
| backend/src/config/__tests__/runtime.test.js | 运行时配置 | ✅ 存在 |
| backend/src/controllers/__tests__/authController.test.js | 认证控制器 | ✅ 存在 |
| backend/src/middleware/__tests__/rateLimit.test.js | 速率限制 | ✅ 存在 |
| backend/src/routes/__tests__/apiStream.test.js | SSE流式API | ✅ 存在 |
| backend/src/routes/__tests__/fragmentRoutes.test.js | 碎片路由 | ✅ 存在 |
| backend/src/routes/__tests__/generateImageRoute.test.js | 图片生成路由 | ✅ 存在 |
| backend/src/routes/__tests__/historyAuth.test.js | 历史记录认证 | ✅ 存在 |
| backend/src/routes/__tests__/lightRoutes.test.js | 轻量模式路由 | ✅ 存在 |
| backend/src/services/__tests__/*.test.js | 多个服务层测试 | ✅ 存在 (14个) |
| backend/src/validation/__tests__/authInput.test.js | 输入验证 | ✅ 存在 |
| service/test_api_wrapper.py | Python API包装 | ✅ 存在 |
| service/test_evolution_naming.py | 进化命名 | ✅ 存在 |
| service/test_restoration_engine.py | 复原引擎 | ✅ 存在 |

**前端测试**: 暂无独立测试文件 (frontend/package.json 无 test 脚本)

**建议补充**: 前端关键页面的组件测试 (Input, Result, Evolution, LightMode, AuthPanel)

---

## 九、测试执行策略

1. **冒烟测试 (Quick)**: REG-001 ~ REG-008, 约5分钟
2. **标准测试 (Standard)**: P0 + 核心P1, 约30分钟
3. **全量测试 (Exhaustive)**: P0 + P1 + P2 + 非功能, 约2小时
4. **回归测试**: REG-001 ~ REG-014, 每次提交前
