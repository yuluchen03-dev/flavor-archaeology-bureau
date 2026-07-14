# TRAE 初赛提交检查表

本检查表与 `scripts/verify_trae_submission.mjs` 门禁脚本对齐。提交前运行：

```bash
node scripts/verify_trae_submission.mjs --enforce
```

未就绪时脚本将以非零码退出。证据清单见 `docs/competition/trae-evidence-manifest.json`，对尚未取得的人工证据保持诚实的待补状态，不使用任何虚构内容替代。

| 门槛 | 当前状态 | 完成条件 |
| --- | --- | --- |
| 可交互离线 HTML 与 ZIP | 待完成 | 断网双击主 HTML 通过全部核心验收，ZIP 可正常解压 |
| 核心功能真实可体验 | 待完成 | 主流程与全部原有功能均能完成离线闭环 |
| Demo 简介与创作思路 | 待定稿 | 与最终界面、功能和真实实现一致 |
| TRAE 开发截图不少于 3 张 | 待完成 | 每张可清楚识别真实关键任务与过程 |
| TRAE Session ID 不少于 3 个 | 待完成 | 三个真实任务各保留至少一个 Session ID |
| 审核通过的报名帖链接 | 待补 | 替换作品帖占位符并验证链接可打开 |
