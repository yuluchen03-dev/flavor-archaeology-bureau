# Investor Readiness Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or focused worker agents task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the investor, judge-demo, technical-trust, and onsite-reliability optimizations identified in the Trae CN hackathon review so the project reads as a fundable B2B cultural AI product, not only a strong demo.

**Architecture:** Keep the current React/Vite frontend, Express backend, Python knowledge service, JSON knowledge graph, and PowerShell demo workflow. Add investor-facing artifacts, judge-guided UI affordances, auditability reports, stronger smoke checks, and runtime evidence without changing the core product premise.

**Tech Stack:** React 19, Vite, Node `node:test`, Express/Jest, Python stdlib tests, PowerShell, Docker Compose, Markdown evidence package.

---

## Current Constraints

- The local `.git` directory is invalid; `git status` fails. Git worktrees and commits are unavailable in this workspace. Work must be file-scoped, non-destructive, and verified with command output.
- Subagents may edit disjoint file sets. Each subagent must report changed files, commands run, and any residual risk.
- Production behavior changes require tests first where practical. Documentation and configuration changes require source checks or runtime verification.

## Completion Requirements

### Track A: Investor And Commercial Materials

**Files:**
- Create: `docs/hackathon/investor-one-pager.md`
- Create: `docs/hackathon/pilot-packages.md`
- Create: `docs/hackathon/competitive-matrix.md`
- Modify: `docs/hackathon/README.md`
- Modify: `docs/hackathon/judge-demo-script.md`

- [x] Add investor one-pager with ICP, pain, solution, why now, business model, moat, progress, metrics, and cooperation ask.
- [x] Add three pilot packages: museum interactive exhibit, study-tour curriculum, restaurant cultural dish R&D.
- [x] Add competitive matrix against AI recipe generators, digital exhibition vendors, restaurant marketing agencies, and generic RAG systems.
- [x] Update the hackathon material index.
- [x] Make the 3-minute pitch end with pilot-package pricing, next-step ask, and fundable wedge.

### Track B: Judge Mode Frontend Experience

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Input.jsx`
- Modify: `frontend/src/pages/Result.jsx`
- Modify: `frontend/src/pages/StarMap.jsx`
- Modify: `frontend/src/pages/LightMode.jsx`
- Create or modify: `frontend/src/pages/BusinessValue.jsx`
- Modify: `frontend/src/index.css`
- Create or modify: `frontend/src/pages/__tests__/investorReadiness.test.mjs`

- [x] Add a persistent Judge Mode progress strip: Input, Result, Star Map, Light Mode, Business Value.
- [x] Ensure each judge-mode page has one obvious next CTA matching the 90-second/3-minute script.
- [x] Hide or demote AuthPanel noise in judge mode.
- [x] Add a Business Value page showing customer pain, product module, deliverable, KPI, and pilot package.
- [x] Add a Result-page evidence drawer showing citation fields, source URL/anchor, verification note, expert review state, copyright boundary, and AI mode.
- [x] Add a one-click weak-clue test that visibly returns insufficient evidence instead of silently switching to the cached demo.
- [x] Add local fallback data for StarMap and LightMode so the back half of the demo never collapses into a dead state.
- [x] Verify with focused frontend source tests and `npm run build`.

### Track C: Technical Trust And Moat

**Files:**
- Create: `scripts/verify_knowledge_graph_coverage.mjs`
- Create: `docs/hackathon/graph-coverage-report.md`
- Modify: `docs/hackathon/technical-architecture.md`
- Modify: `docs/hackathon/data-sources.md`
- Create or modify: `backend/src/services/AiRunAuditService.js`
- Modify: `backend/src/migrations/001_initial_schema.js`
- Modify: `backend/src/services/AnalysisService.js`
- Modify: `backend/src/services/RestorationService.js`
- Create or modify: `backend/src/services/__tests__/AiRunAuditService.test.js`
- Modify: `service/restoration_engine.py`
- Modify: `service/test_restoration_engine.py`

- [x] Add a graph coverage script that reports dish-level core relation coverage and can emit Markdown.
- [x] Publish the coverage report and short-term coverage targets.
- [x] Add an AI run audit service/table or JSONL fallback with run id, input hash, provider/model/mode, fallback reason, prompt/data versions, citation ids, output hash, and latency.
- [x] Add explicit `evidenceScore` and `evidenceBreakdown` for restoration results and insufficient-evidence responses.
- [x] Add JSON/schema validation or source checks for graph relation endpoints and required source metadata.
- [x] Add a lightweight expert-review manifest or fields for flagship citations/nodes.
- [x] Verify with backend tests, Python tests, and graph coverage script.

### Track D: Onsite Reliability And Delivery Hygiene

**Files:**
- Modify: `scripts/start-demo.ps1`
- Create: `scripts/stop-demo.ps1`
- Modify: `scripts/verify-demo-stack.ps1`
- Modify: `scripts/verify-all.ps1`
- Modify: `docker-compose.yml`
- Create: `.gitignore`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `backend/README.md`

- [x] Make `start-demo.ps1` check Node/npm/Python, dependencies, ports, backend DB init, PID recording, and actual URLs.
- [x] Add `stop-demo.ps1` that stops only recorded demo processes.
- [x] Add `verify-demo-stack.ps1 -RequireRunning -FrontendPort` with hard failures for `/health`, `/api`, and frontend HTTP 200.
- [x] Add Docker backend healthcheck and frontend dependency on service health.
- [x] Add `.gitignore` for env files, logs, build output, tmp, node_modules, and Python caches.
- [x] Document local, Docker, LAN/tunnel, degraded, and API-key modes consistently.
- [x] Run `docker compose config`, focused script checks, and relevant build/test commands.

### Track E: Asset And Performance Budget

**Files:**
- Create or modify: `scripts/verify_asset_budget.mjs`
- Modify: `README.md` or `docs/hackathon/data-sources.md`
- Optionally modify: selected files under `frontend/public/dish-backgrounds`

- [x] Add an asset budget script that reports total `dish-backgrounds` size and largest files.
- [x] Document the current size and a short-term target below 50 MB for shareable demo packages.
- [x] Do not delete or convert visual assets without a verified replacement path and visual QA.

## Final Verification Gate

- [x] `node scripts/verify_knowledge_graph_coverage.mjs`
- [x] `node scripts/verify_graph_schema.mjs`
- [x] `node scripts/verify_literature_dataset.mjs`
- [x] `powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1`
- [x] If services are running: `powershell -ExecutionPolicy Bypass -File scripts/verify-demo-stack.ps1 -RequireRunning`
- [x] `cd backend; npm test -- --runInBand`
- [x] `cd frontend; npm run lint`
- [x] `cd frontend; npm run test`
- [x] `cd frontend; npm run build`
- [x] `python -m unittest discover -s service -p 'test*.py'`
- [x] `docker compose config`
- [x] Browser smoke: home, judge input, result evidence drawer, weak clue test, star map fallback, light mode fallback, business value page.
