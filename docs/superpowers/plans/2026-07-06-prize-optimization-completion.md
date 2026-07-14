# Prize Optimization Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn the current hackathon demo into a prize-ready, reproducible, trustworthy, and judge-guided product experience for the TRAE CN AI creativity competition.

**Architecture:** Keep the project as a React/Vite frontend, Express backend, and Python knowledge/AI service. Add clear demo-mode orchestration, honest AI provider/degraded-state metadata, startup reproducibility, and judge-facing documentation without replacing the existing visual identity or data model.

**Tech Stack:** React 19, Vite, Tailwind CSS classes, Express, Jest, Node `node:test`, Python stdlib/unittest/pytest-compatible tests.

---

## Current Constraint

The project directory contains an empty or invalid `.git` directory. `git rev-parse --show-toplevel` fails, so git worktrees and commits are unavailable. Implementers must not run destructive git commands. Modify files directly in the current workspace and list changed paths in every status report.

## Task 1: Reproducible Demo Runtime

**Files:**
- Create: `service/requirements.txt`
- Create: `.env.example`
- Create: `frontend/.env.example`
- Create: `backend/.env.example`
- Create: `scripts/start-demo.ps1`
- Create: `scripts/verify-demo-stack.ps1`
- Modify: `frontend/.env`
- Modify: `frontend/src/lib/apiClient.js`
- Modify: `frontend/src/pages/Result.jsx`
- Modify: `frontend/src/pages/StarMap.jsx`
- Modify: `frontend/src/pages/Evolution.jsx`
- Modify: `frontend/src/pages/Teaching.jsx`
- Modify: `frontend/src/lib/__tests__/apiClient.test.mjs`
- Modify: `README.md`

- [x] Write tests or source checks proving the frontend default API base is `http://localhost:3001/api`.
- [x] Change all frontend API fallback values and `frontend/.env` to `http://localhost:3001/api`.
- [x] Add Python requirements needed by the existing service tests and bridge scripts.
- [x] Add environment templates documenting backend, frontend, OpenAI/Doubao, Agnes, CORS, and JWT variables.
- [x] Add a PowerShell demo launcher that starts backend on port 3001 and frontend on port 5173.
- [x] Add a PowerShell verifier that checks `/health`, `/api`, Python `list_dishes`, and frontend build readiness.
- [x] Update README with one-command demo startup, manual startup, API key modes, and degraded offline mode.
- [x] Verify with `cd frontend; node --test src\lib\__tests__\apiClient.test.mjs`.

## Task 2: Honest AI Provider And Degraded-State Metadata

**Files:**
- Create: `backend/src/services/AiRunMetadata.js`
- Create: `backend/src/services/__tests__/AiRunMetadata.test.js`
- Modify: `backend/src/config/ai.js`
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/services/AgnesImageService.js`
- Modify: `backend/src/services/VisionService.js`
- Modify: `backend/src/services/__tests__/AgnesImageService.test.js`
- Modify: `backend/src/services/__tests__/VisionService.test.js`
- Modify: `backend/src/routes/__tests__/generateImageRoute.test.js`

- [x] Write failing Jest tests for metadata shape: `provider`, `model`, `latencyMs`, `mode`, `fallbackReason`, and `configured`.
- [x] Replace fixed `mockMode: true` with environment-driven mode detection.
- [x] Return `status: "generated"` for real image providers and `status: "degraded"` for local placeholder fallback.
- [x] Preserve demo usability while exposing fallback reasons in JSON.
- [x] Add metadata to VLM fallback responses without breaking current callers.
- [x] Verify with `cd backend; npm test -- --runInBand`.

## Task 3: Evidence-Gated Restoration Workflow

**Files:**
- Modify: `backend/src/services/RestorationService.js`
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/services/__tests__/RestorationService.test.js`
- Modify: `backend/src/routes/__tests__/apiStream.test.js`
- Modify: `service/restoration_engine.py`
- Modify: `service/test_restoration_engine.py`

- [x] Write failing tests for unknown/weak clues returning an uncertain result instead of defaulting to the first dish.
- [x] Add a minimum evidence threshold to restoration suggestions.
- [x] Include `evidenceStatus`, `fallbackReason`, and `needsMoreClues` fields in uncertain responses.
- [x] Keep the known蟹酿橙 demo path stable.
- [x] Ensure stream responses emit a graceful uncertain result or actionable error for weak clues.
- [x] Verify with backend route tests and Python restoration tests.

## Task 4: Judge Mode Frontend Flow

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Input.jsx`
- Modify: `frontend/src/pages/Result.jsx`
- Modify: `frontend/src/pages/StarMap.jsx`
- Modify: `frontend/src/pages/LightMode.jsx`
- Modify: `frontend/src/pages/Evolution.jsx`
- Modify: `frontend/src/pages/Teaching.jsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/pages/__tests__/hackathonDemoEnhancements.test.mjs`
- Add or modify focused frontend source tests as needed.

- [x] Add a visible “现场演示” judge-mode entry that routes into the one-click demo path.
- [x] Reduce homepage CTA competition by making the restoration demo the primary path and demoting secondary paths.
- [x] Add a cached蟹酿橙 demo result for Result page network/stream failure.
- [x] Display AI status labels: real AI, degraded fallback, cached demo, or local rule result.
- [x] Make StarMap look like a broader 40-dish archive with meaningful collected/recommended states.
- [x] Fix LightMode textarea so user-cleared input does not snap back unexpectedly; add built-in sample input.
- [x] Default Evolution to a story-rich蟹酿橙 + 槐叶冷淘 pair with stable reveal copy.
- [x] Give Teaching a stronger digital inheritor identity, opening line, and suggested judge-demo questions.
- [x] Verify with `cd frontend; node --test src\pages\__tests__\hackathonDemoEnhancements.test.mjs` and `npm run build`.

## Task 5: Prize Evidence Package

**Files:**
- Create: `docs/hackathon/README.md`
- Create: `docs/hackathon/judge-demo-script.md`
- Create: `docs/hackathon/technical-architecture.md`
- Create: `docs/hackathon/trust-and-safety.md`
- Create: `docs/hackathon/data-sources.md`
- Modify: `README.md`

- [x] Document the 90-second and 3-minute demo scripts.
- [x] Document the AI workflow: clue ingestion, KG retrieval, LLM reasoning, evidence graph, image generation, fallback.
- [x] Document what is real AI, what is deterministic fallback, and what is static demo cache.
- [x] Document data scale and next-stage expansion plan.
- [x] Document business/social-value paths for museums, education, cultural tourism, and restaurants.
- [x] Link this evidence package from the root README.

## Task 6: Security And Deployment Readiness

**Files:**
- Modify: `backend/src/app.js`
- Modify: `backend/src/config/auth.js`
- Modify: `backend/package.json`
- Modify: `backend/src/routes/__tests__` or add focused tests.
- Create: `Dockerfile` or `backend/Dockerfile` and `frontend/Dockerfile` if time permits.
- Create: `docker-compose.yml` if time permits.

- [x] Make JWT defaults safe for development but explicit in production.
- [x] Make CORS origin configurable and documented.
- [x] Add basic rate limiting or request-size/cost guard if it fits existing dependencies.
- [x] Add readiness/health detail useful for demo verification.
- [x] Verify backend tests remain green.

## Final Verification

- [x] `node scripts/verify_literature_dataset.mjs`
- [x] `python -m pytest -q` from `service`
- [x] `python service/api_wrapper.py list_dishes "{}"`
- [x] `python service/api_wrapper.py analyze "{\"text\":\"橙用黄熟大者，以蟹膏肉实其内\"}"`
- [x] `cd backend; npm test -- --runInBand`
- [x] `cd frontend; npm run lint`
- [x] `cd frontend; npm run build`
- [x] Root README startup instructions match actual `.env.example` and fallback ports.


