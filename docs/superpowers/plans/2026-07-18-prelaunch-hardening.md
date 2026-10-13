# Prelaunch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove confirmed launch blockers in test reliability, container security and persistence, backend failure handling, frontend request handling, runtime asset size, and release verification without redesigning the product or changing its domain configuration.

**Architecture:** Keep the existing React, Express, SQLite, Python bridge, and offline museum boundaries. Harden each boundary independently with a failing regression test first, make the smallest production change, then run both the focused test and the repository quality gate. Preserve all pre-existing uncommitted competition and offline-museum work.

**Tech Stack:** React 19, Vite 8, Node.js 22, Express 4, Jest 29, SQLite/Knex, Python standard library, PowerShell, Docker Compose, Node test runner.

---

### Task 1: Make the quality gate deterministic

**Files:**
- Create: `backend/jest.config.cjs`
- Modify: `scripts/verify-all.ps1`
- Modify: `scripts/source-check-deployment.ps1`
- Test: `scripts/__tests__/verify_asset_budget.test.mjs`

- [ ] **Step 1: Reproduce the failing full backend suite**

Run: `cd backend; npm.cmd test -- --runInBand --no-cache`

Expected before the fix: external JSON imports under repository `data/` fail during the full suite even though a focused suite and direct Node `require()` pass.

- [ ] **Step 2: Index repository data in Jest**

Create `backend/jest.config.cjs` with both `src` and `../data` roots and retain tests under `src/**/__tests__`.

- [ ] **Step 3: Verify the Jest hypothesis**

Run: `cd backend; npm.cmd test -- --runInBand --no-cache`

Expected: repository JSON resolution failures disappear. Any remaining Python process restriction is reported separately.

- [ ] **Step 4: Turn the asset report into a real gate**

Add a source assertion that `verify-all.ps1` invokes `verify_asset_budget.mjs` with `--enforce`, then run `node scripts/verify_asset_budget.mjs --enforce` and confirm it fails while runtime assets exceed 50 MiB.

- [ ] **Step 5: Resolve Python explicitly**

Add a PowerShell resolver that prefers `PYTHON_BIN`, `.venv/Scripts/python.exe`, `python.exe`, `python3.exe`, then a user-local Python installation. Propagate the selected executable to Node through `PYTHON_BIN` and use it for unittest.

- [ ] **Step 6: Run focused gates**

Run: `powershell -ExecutionPolicy Bypass -File scripts/source-check-deployment.ps1`

Run: `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1`

Expected after later asset work: both exit 0 and every mandatory step prints its own result.

### Task 2: Prevent secrets and runtime data from entering images

**Files:**
- Modify: `.dockerignore`
- Modify: `backend/Dockerfile`
- Modify: `scripts/source-check-deployment.ps1`

- [ ] **Step 1: Add failing source checks**

Assert that `.dockerignore` excludes nested `.env` files, `backend/data`, dependency/build output, test caches, and unapproved candidate/override dish images. Assert that `backend/Dockerfile` copies only package manifests, `backend/src`, `service`, and repository `data` instead of the full backend directory.

- [ ] **Step 2: Verify the checks fail**

Run: `powershell -ExecutionPolicy Bypass -File scripts/source-check-deployment.ps1`

Expected: failure on missing ignore or Dockerfile whitelist patterns.

- [ ] **Step 3: Implement the copy boundary**

Update `.dockerignore` and replace `COPY backend ./backend` with explicit production file copies. Never read, print, or copy local secret values.

- [ ] **Step 4: Verify the checks pass**

Run the source deployment check again. If Docker is available, inspect the build context and image filesystem without printing environment values.

### Task 3: Make production database startup persistent and non-destructive

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `scripts/source-check-deployment.ps1`
- Test: `backend/src/scripts/__tests__/startup.test.js`

- [ ] **Step 1: Write failing startup contract tests**

Assert that the production command runs migrations but never seeds, and that Compose mounts a named volume at `/app/backend/data`.

- [ ] **Step 2: Verify red**

Run: `cd backend; npm.cmd test -- --runInBand src/scripts/__tests__/startup.test.js`

Expected: current `db:init` startup and missing volume fail the assertions.

- [ ] **Step 3: Split migration from demo initialization**

Add a migration-only npm script, keep `db:init` for explicit local demo seeding, and change the container command to migration then start.

- [ ] **Step 4: Add the SQLite volume**

Declare `backend_data` in Compose and mount it at the configured production data directory. Keep CORS and API base parameterized through environment/build args without choosing a domain.

- [ ] **Step 5: Verify green**

Run the focused test and `docker compose config` with a temporary `JWT_SECRET`.

### Task 4: Harden backend process and provider boundaries

**Files:**
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/services/AgnesImageService.js`
- Modify: `backend/src/services/vision/OpenAIVisionProvider.js`
- Modify: `backend/src/middleware/rateLimit.js`
- Test: `backend/src/routes/__tests__/generateImageRoute.test.js`
- Test: `backend/src/services/__tests__/AgnesImageService.test.js`
- Test: `backend/src/services/__tests__/OpenAIVisionProvider.test.js`
- Test: `backend/src/middleware/__tests__/rateLimit.test.js`

- [ ] **Step 1: Add regressions for the Python wrapper path and input bounds**

Verify the wrapper path exists under repository `service/api_wrapper.py`, reject missing or oversized dish/prompt values with 400, and XML-escape any request-derived text used in fallback SVG.

- [ ] **Step 2: Verify red**

Run the four focused Jest files and confirm the new assertions fail for the expected behavior.

- [ ] **Step 3: Fix the wrapper path and validation**

Resolve the script from repository root, validate input before external or child-process work, and return a truthful degraded response only for genuine provider/process failure.

- [ ] **Step 4: Add provider timeouts**

Write timeout tests with injected fetch implementations and an abort signal, then add bounded `AbortController` handling to image and vision providers.

- [ ] **Step 5: Bound rate-limit state**

Test cleanup of expired buckets and a trustworthy proxy-key strategy, then implement periodic stale-bucket deletion without adding a dependency.

- [ ] **Step 6: Verify green**

Run all focused backend tests followed by the complete backend suite.

### Task 5: Harden authentication and frontend network behavior

**Files:**
- Modify: `backend/src/controllers/authController.js`
- Test: `backend/src/controllers/__tests__/authController.test.js`
- Modify: `frontend/src/lib/apiClient.js`
- Modify: `frontend/src/components/AuthPanel.jsx`
- Test: `frontend/src/lib/__tests__/apiClient.test.mjs`
- Test: `frontend/src/components/__tests__/authPanel.test.mjs`

- [ ] **Step 1: Add authentication validation tests**

Cover trimming and normalizing email, valid email syntax, username/email length limits, and a minimum/maximum password length before bcrypt work.

- [ ] **Step 2: Implement normalized validation**

Return stable 400 responses for invalid input and keep login errors non-enumerating.

- [ ] **Step 3: Add real API client behavior tests**

Cover network errors, non-JSON error bodies, empty success responses, timeout/abort, and 401 session cleanup.

- [ ] **Step 4: Implement resilient request handling**

Parse responses by content type, preserve useful HTTP status context, impose a bounded timeout, and do not hide authentication expiry.

- [ ] **Step 5: Make the auth panel operable without hover**

Add explicit expanded state, labels/autocomplete, Escape/outside-close behavior, focus management, password visibility, and mobile-safe dimensions while preserving the existing museum header design.

- [ ] **Step 6: Verify focused and full frontend suites**

Run: `cd frontend; npm.cmd run lint`

Run: `cd frontend; npm.cmd test`

Run: `cd frontend; npm.cmd run build`

### Task 6: Remove runtime asset bloat without deleting design evidence

**Files:**
- Modify: `scripts/build_offline_assets.mjs`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/pages/StarMap.jsx`
- Modify: `data/visual_assets/dish_backgrounds.json`
- Modify: `.dockerignore`
- Test: `scripts/__tests__/verify_asset_budget.test.mjs`
- Test: `frontend/src/pages/__tests__/starMapDishBackgrounds.test.mjs`

- [ ] **Step 1: Add an approved-runtime-assets test**

Assert production output contains only the 40 manifest-approved optimized WebP images and no `candidate` or `override` files.

- [ ] **Step 2: Verify red against the current 227.43 MiB dist**

Run a clean frontend build, summarize `frontend/dist`, and confirm the runtime budget fails.

- [ ] **Step 3: Generate shared optimized WebP assets**

Extend the existing Sharp pipeline to emit browser-served WebP files from the approved 40 PNG sources. Keep source candidates in place for design traceability but exclude them from Vite public copying and Docker context.

- [ ] **Step 4: Point online pages and manifest at optimized assets**

Use stable `/dish-backgrounds/<id>.webp` paths and preserve lazy loading/aspect-ratio behavior.

- [ ] **Step 5: Verify the runtime budget**

Run the asset budget with `--enforce` against production output. Expected: no unapproved variants and total runtime dish assets below 50 MiB.

### Task 7: Strengthen release verification and run launch acceptance

**Files:**
- Modify: `scripts/verify_trae_submission.mjs`
- Modify: `scripts/package_trae_submission.ps1`
- Test: `scripts/__tests__/verify_trae_submission.test.mjs`

- [ ] **Step 1: Write failing ZIP integrity tests**

Test required archive entry names, duplicate/missing entries, extracted byte sizes, and SHA-256 equality with release files.

- [ ] **Step 2: Implement post-package verification**

Generate a release manifest and verify the final ZIP after compression. Keep the human registration-link gate truthful and separate from engineering readiness.

- [ ] **Step 3: Run all automated gates**

Run backend tests, frontend lint/test/build, Python unittest with the resolved interpreter, data validators, enforced asset budget, Compose config, offline bundle verification, and release ZIP integrity.

- [ ] **Step 4: Run browser acceptance**

Start the local backend/frontend, verify health and API root, then exercise home, clue input, result, teaching, star map, evolution, light mode, auth, 404, offline museum, WebGL, and fallback behavior at 1440x900 and 390x844. Record console/page/network failures and fix confirmed regressions test-first.

- [ ] **Step 5: Perform final independent review**

Run OCR when configured, otherwise record the unavailable prerequisite and use an independent review agent. Re-read every changed file, inspect `git diff`, and repeat the full quality gate before any completion claim.

