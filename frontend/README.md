# 风味考古局前端

React/Vite 前端负责首页、评委演示路径、线索输入、复原结果、味觉星图、轻量玩法、风味进化和数字传承人教学。

## 启动

```powershell
npm install
$env:VITE_API_BASE="http://localhost:3001/api"
npm run dev -- --host 0.0.0.0 --port 5173
```

默认访问:

- 前端: `http://localhost:5173`
- 后端 API: `http://localhost:3001/api`

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:3001/api` | 浏览器请求的后端 API 地址。局域网、隧道或公开部署时必须改成用户浏览器能访问的地址。 |

本地评委机演示推荐使用根目录脚本:

```powershell
powershell -ExecutionPolicy Bypass -File ..\scripts\start-demo.ps1
```

停止演示:

```powershell
powershell -ExecutionPolicy Bypass -File ..\scripts\stop-demo.ps1
```

## 验证

```powershell
npm run lint
npm run test
npm run build
```

根目录的 `scripts/verify-demo-stack.ps1` 会同时检查 Python 桥接、可选 HTTP smoke 和前端构建。

## 演示注意事项

- 如果 Vite 端口被占用，手动启动时请同步更新 `VITE_API_BASE`、后端 `CORS_ORIGIN` 和演示文档里的前端 URL。
- 手机、投屏、隧道或公网访问时，不能使用浏览器侧的 `localhost` 作为 API 地址；那会指向观众自己的机器。
- 未配置外部 AI key 时，界面会展示本地规则、缓存演示或降级状态，不应把这些状态口播成真实模型生成。
