# ROUTE-FIX-01 — DSH/Paseo Model Registry Diagnosis & Route Gate

**Status: `DSH_SOFTWARE_DEV_ROUTE_GATE = PASS`**
**Date: 2026-10-12**
**Blocker resolved: `DSH_DEEPSEEK_ROUTE_NOT_VERIFIED`**

> Append-only 诊断记录。未修改 candidate / manifest / Contract / Rubric / validator / staging / production / KB 数据 / business source。

---

## 1. 诊断范围

只读检查对象：

| 对象 | 路径 |
|---|---|
| DSH desktop profile | `~/.dsh/profiles/desktop/cordis.patch.yml` |
| **DSH ACP profile（Paseo 实际使用）** | `~/.dsh/profiles/acp/cordis.patch.yml` |
| DSH headless profile | `~/.dsh/profiles/headless/cordis.patch.yml` |
| Paseo settings | `%APPDATA%/Paseo/desktop-settings.json` |
| Paseo logs | `%APPDATA%/Paseo/logs/main.log` |
| DSH credentials（仅键名） | `~/.dsh/.credentials.yaml` |

---

## 2. 身份映射表（§6 要求逐项作答）

`white` 与 `deepseek-v4.1-flash` **不是** model id 与 provider alias 的简单对应，而是**两个独立命名空间**：

```text
UI label "white"  (provider displayName)
  provider_id   = white
  model_id      = n/a  （provider 不是 model）
  profile_id    = desktop / acp 均定义
  route_id      = white
  baseURL       = https://whiteapi.dev/v1      (desktop: api=openai-responses)
  apiKeyEnv     = WHITE_API_KEY

UI label "deepseek-v4.1-flash"  (model id + display name)
  provider_id   = white            （在 desktop profile 中）
  model_id      = deepseek-v4.1-flash
  profile_id    = desktop / acp
  route_id      = white/deepseek-v4.1-flash

Paseo accepted model identifiers = provider + model pair
  即 route 必须由 provider_id 与 model_id 共同解析；
  仅传 model 字符串（如 "white"）不是合法 model identifier
  → 这正是此前 "unknown model option" 的成因（§8）

ACP resolved route（修复前）= xiaobai/deepseek-v4.1-flash
ACP resolved route（修复后）= white/deepseek-v4.1-flash

xiaobai comes from = ~/.dsh/profiles/acp/cordis.patch.yml
                      中 agent-default-model.provider 的显式取值
```

**关键区分（§4 遵守）**：`white` 是 **provider displayName / provider_id**，**不是** model id。修复前把 `white` 当 model option 提交，必然得到 `unknown model option`。

---

## 3. HTTP 404 的真正来源（§7 归类）

**归类 = A + E（provider endpoint 404 + stale provider）**

实测证据（Node `fetch`，非搜索摘要）：

| 请求 | HTTP | 响应体 |
|---|---|---|
| `GET https://whiteapi.cn/v1/models` | **404** | `<html>404 Not Found ... nginx</html>` |
| `GET https://whiteapi.cn/v1/` | **404** | 同上（nginx） |
| `GET https://whiteapi.dev/v1/models`（无 key） | **401** | `{"code":"API_KEY_REQUIRED",...}` |
| `GET https://whiteapi.dev/v1/models`（WHITE_API_KEY） | **200** | `{"data":[{"id":"deepseek-v4-flash"...},{"id":"deepseek-v4.1-flash"...}]}` |

**结论**：
- `whiteapi.cn` 是一个**裸 nginx 站点，根本不提供 `/v1` API** → 任何请求都返回 404 HTML。
- `whiteapi.dev` 才是**真实 API**（返回 JSON，未授权时为 401）。
- ACP profile 把 `xiaobai.baseURL` 指向 **`https://whiteapi.cn/v1`（已失效域名）** → 产生 404。
- 同一 baseURL 在 desktop profile 中却是 `https://whiteapi.dev/v1` → 证明 **stale provider 配置**，非账号或密钥问题。

**排除**：不是 B（model path）、不是 C（profile alias resolution）、不是 D（Paseo 错误路由）、不是 F（unknown model mapping）。

---

## 4. `white unknown model option` 成因（§8）

Paseo 接受的是 **provider/model pair**，不接受 provider displayName 作为 model option。

- 传入 `white` → Paseo 在 model 维度查找，找不到名为 `white` 的 model → `unknown model option`。
- 正确形式：provider `white` + model `deepseek-v4.1-flash`。

**未继续盲试 `white` 作为 model id。**（§8 遵守）

---

## 5. 最小修复（§9）

**唯一修改文件**：`~/.dsh/profiles/acp/cordis.patch.yml`
**备份**：`cordis.patch.yml.bak-routefix01`（SHA-256 `F7D91FF8E218C56A211BF1E56E5F00496E50AD477A4BEBF83B7E8F4F7FBDC9FB`）

diff —— **6 insertions / 6 deletions，unexpected changed lines = 0**：

```diff
 - id: agent-default-model
   name: "@deepseek-ai/dsh-agent-default-model"
   config:
-    provider: xiaobai
+    provider: white
     model: deepseek-v4.1-flash
@@
-      xiaobai:
-        displayName: xiaobai
-        apiKeyEnv: XIAOBAI_API_KEY
-        api: openai-responses
-        baseURL: https://whiteapi.cn/v1
+      white:
+        displayName: white
+        apiKeyEnv: WHITE_API_KEY
+        api: openai-completions
+        baseURL: https://whiteapi.dev/v1
         models:
```

修复后 SHA-256：`B6C20E8A4CD165037717885989D92666F18F2194527F60C01620FB850FC98A01`

**未执行**（§9 禁止项全部遵守）：全局模型迁移 · 改其他 project profile · 删除旧历史 · 修改 KB 数据 · 修改 business source · 格式化整个配置文件。

### 变更理由（逐项）

| 变更 | 理由 |
|---|---|
| `provider: xiaobai` → `white` | 指向用户已配置的软件开发模式 provider |
| `baseURL: whiteapi.cn/v1` → `whiteapi.dev/v1` | `.cn` 实测 404（nginx），`.dev` 实测 200 |
| `apiKeyEnv: XIAOBAI_API_KEY` → `WHITE_API_KEY` | 与 provider `white` 的凭据键一致；两 key 实测均有效，但须匹配 provider 契约 |
| `api: openai-responses` → `openai-completions` | **实测** `/responses` + tools 返回 **504 Gateway Time-out**；`/chat/completions` + tools 返回 **200** 且产生真实 `tool_calls` |

**未变更**：`shushen` provider 全块、model 列表、desktop profile、headless profile、其他任何配置。

---

## 6. ROUTE-02 Minimal Smoke（§11/§12）

**执行方式**：真实 `dsh --profile` 端到端运行（非静态配置检查、非 curl 模拟）。

```text
dsh --profile route-smoke --json "Read the file README.md and reply with exactly: ..."
```

**实测事件序列**：

```text
{"type":"tool_call","tool":"read","input":{"file_path":".../README.md"}}
{"type":"tool_result","status":"completed","result":"<path>...README.md</path>..."}
{"type":"final","text":"ROUTE_SMOKE_OK\nFILE=README.md\nHEADING=风味考古局 - 非遗美食复原AI应用"}
```

**逐项证明（§12）**：

| 要求 | 实测 | 结论 |
|---|---|---|
| mode | DSH software-development 预设（tool-fs / tool-pwsh / skill / workflow 全部挂载） | ✅ |
| provider | `white`（composed config 实测：`provider: white`） | ✅ |
| model | `deepseek-v4.1-flash` | ✅ |
| fallback | **none** —— turn_end reason `{"kind":"completed"}`，无降级事件 | ✅ |
| tool_call | **PASS** —— `read` 真实执行，`status: completed` | ✅ |
| 消费 tool result | **PASS** —— 模型读取工具返回后输出正确 heading | ✅ |

**Smoke 输出与仓库真实内容一致**：`README.md` 首个一级标题 = `风味考古局 - 非遗美食复原AI应用`（与 `README.md:1` 逐字一致）。

临时 smoke profile 已在验证后删除（`~/.dsh/profiles/route-smoke` 不存在 = True）。

---

## 7. Route Gate 判定（§13）

| 判据 | 实测 | 结果 |
|---|---|---|
| model response successful | HTTP 200 + 真实文本输出 | ✅ |
| tool call successful | `read` 执行 `status: completed` | ✅ |
| model consumes tool result | 输出正确 heading | ✅ |
| resolved route correct | `white/deepseek-v4.1-flash` | ✅ |
| xiaobai not used | agent-default-model provider = `white` | ✅ |
| no HTTP 404 | whiteapi.dev 全路径 200/401，无 404 | ✅ |
| no unknown model | provider+model pair 合法 | ✅ |
| no unauthorized fallback | 无 fallback 事件 | ✅ |

### **`DSH_SOFTWARE_DEV_ROUTE_GATE = PASS`**

---

## 8. 未触碰项声明

- `~/.dsh/.credentials.yaml` **未修改**（无新增账号、无新增 API key、无重新登录、无付费）。
- desktop profile `cordis.patch.yml` **未修改**（其 `white` provider 原本即正确指向 `whiteapi.dev/v1`）。
- 其他 project profile **未修改**。
- 未执行任何全局模型迁移。

**结论：阻塞 `DSH_DEEPSEEK_ROUTE_NOT_VERIFIED` 已解除，可进入 GOLDEN-001 外部证据工作。**
