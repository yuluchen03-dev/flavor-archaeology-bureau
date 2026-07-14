# TRAE Offline Digital Museum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chinese-only, single-file, fully offline digital flavor museum that preserves every existing product capability, adds a Three.js crab-orange evidence exhibit, and ships with a compliant TRAE competition ZIP and evidence pack.

**Architecture:** Keep the existing routed online React application unchanged and add a separate `frontend/src/offline/` application entry. The offline app uses embedded structured data and deterministic browser-side rules, while Vite plus `vite-plugin-singlefile` produces one self-contained HTML; a preprocessing script converts the 40 approved dish images into compact embedded WebP data. Three.js renders a procedural crab-orange exhibit so no external model or CDN is required.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Three.js, vite-plugin-singlefile, Sharp, Node test runner, PowerShell packaging scripts, Playwright/browser verification through the available Codex browser tooling.

---

## 1. File Structure

### Build and packaging

- Create `frontend/offline.html`: dedicated Vite entry for the offline app.
- Create `frontend/vite.offline.config.js`: single-file build configuration.
- Modify `frontend/package.json`: add Three.js, Sharp, vite-plugin-singlefile, and offline build/test scripts.
- Create `scripts/build_offline_assets.mjs`: compress approved images and generate the embedded asset module.
- Create `scripts/verify_offline_bundle.mjs`: fail when the bundle references remote resources or external files.
- Create `scripts/package_trae_submission.ps1`: build, verify, copy the final HTML, and create the ZIP.
- Create `scripts/verify_trae_submission.mjs`: enforce the six competition gates without treating missing human-supplied evidence as complete.

### Offline application shell and state

- Create `frontend/src/offline/main.jsx`: mount the offline app without BrowserRouter or language provider.
- Create `frontend/src/offline/OfflineApp.jsx`: top-level museum shell and exhibit navigation.
- Create `frontend/src/offline/offline.css`: museum visual system, responsive layout, reduced motion, print rules.
- Create `frontend/src/offline/lib/progressStore.js`: local-only progress persistence.
- Create `frontend/src/offline/components/MuseumHeader.jsx`: three-item primary navigation and mobile menu.
- Create `frontend/src/offline/components/ExhibitShell.jsx`: accessible exhibit tabs and return actions.

### Offline data and rules

- Create `frontend/src/offline/data/offlineMuseumData.js`: normalized 40-dish archive, crab-orange evidence, mentor answers, quiz data, museum offer.
- Generate `frontend/src/offline/data/generatedDishImages.js`: compact WebP data URI map created by the asset script.
- Create `frontend/src/offline/lib/clueMatcher.js`: deterministic clue matching and insufficient-evidence response.
- Create `frontend/src/offline/lib/fusionEngine.js`: deterministic lineage fusion.
- Create `frontend/src/offline/lib/dailyRevival.js`: date-stable daily archive selection.
- Create `frontend/src/offline/lib/ancestorMatcher.js`: local image/description heuristic with explicit offline estimate status.
- Create `frontend/src/offline/lib/certificate.js`: local SVG certificate generation and download/print fallback.

### Core journey and 3D

- Create `frontend/src/offline/exhibits/HomeExhibit.jsx`: first viewport and two routes.
- Create `frontend/src/offline/exhibits/RestorationExhibit.jsx`: five-stage 90-second evaluator flow.
- Create `frontend/src/offline/components/EvidenceDrawer.jsx`: layered evidence details.
- Create `frontend/src/offline/components/CrabOrangeStage.jsx`: Three.js canvas and 2.5D fallback switch.
- Create `frontend/src/offline/lib/createCrabOrangeScene.js`: procedural geometry, materials, hotspots, disposal.
- Create `frontend/src/offline/components/CrabOrangeFallback.jsx`: interactive non-WebGL layered fallback.
- Create `frontend/src/offline/exhibits/BusinessExhibit.jsx`: museum pilot handoff.

### Preserved feature exhibits

- Create `frontend/src/offline/exhibits/ArchiveExhibit.jsx`: 40-dish searchable archive and star-map view.
- Create `frontend/src/offline/exhibits/MentorExhibit.jsx`: local multi-turn digital inheritor.
- Create `frontend/src/offline/exhibits/EvolutionExhibit.jsx`: two-parent lineage workflow.
- Create `frontend/src/offline/exhibits/PlayExhibit.jsx`: ancestor match, daily revival, authenticity quiz, and certificate.

### Tests and competition materials

- Create `frontend/src/offline/__tests__/offlineData.test.mjs`.
- Create `frontend/src/offline/__tests__/offlineRules.test.mjs`.
- Create `frontend/src/offline/__tests__/offlineShell.test.mjs`.
- Create `frontend/src/offline/__tests__/offlineRestoration.test.mjs`.
- Create `frontend/src/offline/__tests__/offlineThree.test.mjs`.
- Create `frontend/src/offline/__tests__/offlineFeatures.test.mjs`.
- Create `scripts/__tests__/verify_offline_bundle.test.mjs`.
- Create `scripts/__tests__/verify_trae_submission.test.mjs`.
- Create `docs/competition/trae-initial-round-post.md`: final post draft.
- Create `docs/competition/trae-evidence-manifest.json`: Session IDs and screenshot manifest with honest pending states.
- Create `docs/competition/trae-submission-checklist.md`: six-gate release checklist.
- Create `docs/competition/screenshots/`: final TRAE process screenshots and product screenshots.

### Specification coverage map

| Approved design area | Implemented by |
| --- | --- |
| Single-file offline architecture and asset embedding | Tasks 1, 6 |
| Offline evidence data, refusal behavior, copyright boundary | Tasks 2, 3 |
| Three-entry information architecture and 90-second journey | Task 3 |
| All original feature loops | Task 4 |
| Three.js exhibit, hotspots, reduced motion, 2.5D fallback | Task 5 |
| Chinese desktop-first layout and mobile usability | Tasks 3, 5, 8 |
| Chrome, Edge, Chinese-space path, console and canvas checks | Task 8 |
| Three real TRAE tasks, screenshots, and Session IDs | Tasks 1, 5, 7, 9 |
| Post structure, ZIP, registration URL, six hard gates | Tasks 6, 7, 9, 10 |

## 2. TRAE Evidence Protocol

Implementation is split into three real TRAE Work CN tasks. Before sending each task, create or select a new TRAE task and capture the prompt visibly. After TRAE completes meaningful work, capture one screenshot that shows the task context and progress/result. Copy the real Session ID from TRAE and record it in `docs/competition/trae-evidence-manifest.json`.

The three task titles are fixed:

1. `TRAE-01 离线数字博物馆与功能闭环`
2. `TRAE-02 Three.js 蟹酿橙证据展台`
3. `TRAE-03 离线验证、提交包与参赛材料`

Do not use project teaching session IDs, Codex IDs, invented strings, or screenshots that only show the finished website. A valid screenshot must visibly connect TRAE to the corresponding development task.

## 3. Task Plan

### Task 1: Establish the offline build and asset boundary (TRAE task 01 begins)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/offline.html`
- Create: `frontend/vite.offline.config.js`
- Create: `frontend/src/offline/main.jsx`
- Create: `frontend/src/offline/OfflineApp.jsx`
- Create: `frontend/src/offline/offline.css`
- Create: `scripts/build_offline_assets.mjs`
- Create: `frontend/src/offline/__tests__/offlineShell.test.mjs`
- Create: `docs/competition/trae-evidence-manifest.json`
- Create: `docs/competition/screenshots/`

- [ ] **Step 1: Start TRAE task 01 and capture the visible task prompt**

Send this exact task description in TRAE Work CN:

```text
任务：TRAE-01 离线数字博物馆与功能闭环。
在现有风味考古局项目中新增独立离线入口，不破坏现有在线 React 应用。最终要由 Vite 构建出一个断网双击可运行的单文件 HTML。先完成离线构建边界、数据层、主展厅和原有功能的本地闭环；所有预置和规则结果必须标注离线模式，不能伪装实时 AI。按仓库现有测试风格先写失败测试，再实现并运行测试。不要实现 3D，3D 属于下一个独立任务。
```

Save the prompt screenshot as `docs/competition/screenshots/trae-01-prompt.png`.

- [ ] **Step 2: Write the failing shell/build contract test**

Create `frontend/src/offline/__tests__/offlineShell.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('offline app has a dedicated non-router entry', () => {
  assert.ok(existsSync(resolve(root, 'offline.html')));
  const main = read('src/offline/main.jsx');
  assert.match(main, /OfflineApp/);
  assert.doesNotMatch(main, /BrowserRouter|createBrowserRouter/);
});

test('offline build uses the single-file plugin', () => {
  const config = read('vite.offline.config.js');
  assert.match(config, /viteSingleFile/);
  assert.match(config, /offline\.html/);
  assert.match(config, /dist-offline/);
});

test('offline shell exposes only three primary destinations', () => {
  const app = read('src/offline/OfflineApp.jsx');
  for (const label of ['可信复原', '探索馆藏', '商业合作']) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /离线评审模式/);
});
```

- [ ] **Step 3: Run the new test and verify it fails**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineShell.test.mjs
```

Expected: FAIL because the offline entry, config, and shell do not exist.

- [ ] **Step 4: Add dependencies and scripts**

Run:

```powershell
cd frontend
npm install three
npm install --save-dev vite-plugin-singlefile sharp
```

Add these scripts to `frontend/package.json`:

```json
{
  "build:offline:assets": "node ../scripts/build_offline_assets.mjs",
  "build:offline": "npm run build:offline:assets && vite build --config vite.offline.config.js",
  "test:offline": "node --test src/offline/__tests__/*.test.mjs"
}
```

- [ ] **Step 5: Implement the minimal independent entry and config**

Create `frontend/offline.html` with a `#root` element and `/src/offline/main.jsx` module script. Configure `vite.offline.config.js` with `viteSingleFile()`, `base: './'`, `build.outDir: 'dist-offline'`, `emptyOutDir: true`, and `rollupOptions.input` pointing to `offline.html`.

`OfflineApp.jsx` must initially render:

```jsx
const destinations = ['可信复原', '探索馆藏', '商业合作'];

export default function OfflineApp() {
  return (
    <div className="offline-museum">
      <p className="offline-status">离线评审模式</p>
      <nav aria-label="主展厅">
        {destinations.map((label) => <button key={label}>{label}</button>)}
      </nav>
      <main><h1>风味考古局</h1></main>
    </div>
  );
}
```

Create `build_offline_assets.mjs` so it reads only the approved `dish_001.png` through `dish_040.png`, resizes each to a maximum of 960 by 540, writes WebP at quality 62 into `frontend/src/offline/data/generated/`, and emits `generatedDishImages.js` containing data URIs keyed by dish ID. No candidate or override images may enter the generated module.

- [ ] **Step 6: Run shell test and offline build**

Run:

```powershell
cd frontend
npm run test:offline
npm run build:offline
```

Expected: shell tests PASS; `frontend/dist-offline/offline.html` exists and contains inlined JavaScript/CSS.

- [ ] **Step 7: Record TRAE task 01 Session ID and first progress screenshot**

Initialize `docs/competition/trae-evidence-manifest.json` with this exact honest state, then copy the real ID into the `trae-01` record and add the two existing screenshot paths:

```json
{
  "demoHtml": "release/风味考古局-TRAE初赛/风味考古局-离线体验.html",
  "demoZip": "release/风味考古局-TRAE初赛.zip",
  "postDraft": "docs/competition/trae-initial-round-post.md",
  "registrationUrl": "",
  "traeTasks": [
    { "key": "trae-01", "sessionId": "", "screenshots": ["docs/competition/screenshots/trae-01-prompt.png", "docs/competition/screenshots/trae-01-progress.png"] },
    { "key": "trae-02", "sessionId": "", "screenshots": [] },
    { "key": "trae-03", "sessionId": "", "screenshots": [] }
  ]
}
```

Save a screenshot showing TRAE working on the offline entry as `docs/competition/screenshots/trae-01-progress.png`. Empty future-task and registration fields are intentional release-gate failures, not completed evidence.

- [ ] **Step 8: Commit the build boundary**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/offline.html frontend/vite.offline.config.js frontend/src/offline scripts/build_offline_assets.mjs docs/competition/screenshots docs/competition/trae-evidence-manifest.json
git commit -m "feat: establish offline museum build"
```

### Task 2: Normalize offline museum data and deterministic rules

**Files:**
- Create: `frontend/src/offline/data/offlineMuseumData.js`
- Create: `frontend/src/offline/lib/clueMatcher.js`
- Create: `frontend/src/offline/lib/fusionEngine.js`
- Create: `frontend/src/offline/lib/dailyRevival.js`
- Create: `frontend/src/offline/lib/ancestorMatcher.js`
- Create: `frontend/src/offline/lib/certificate.js`
- Create: `frontend/src/offline/lib/progressStore.js`
- Create: `frontend/src/offline/__tests__/offlineData.test.mjs`
- Create: `frontend/src/offline/__tests__/offlineRules.test.mjs`

- [ ] **Step 1: Write failing data integrity tests**

The tests must assert:

```js
assert.equal(museumDishes.length, 40);
assert.deepEqual(museumDishes.map((dish) => dish.id),
  Array.from({ length: 40 }, (_, index) => `dish_${String(index + 1).padStart(3, '0')}`));
assert.equal(crabOrangeEvidence.hotspots.length, 3);
assert.deepEqual(
  new Set(museumDishes.map((dish) => dish.archiveState)),
  new Set(['证据完整', '推荐考据', '资料待补']),
);
assert.ok(museumDishes.every((dish) => dish.image && dish.name && dish.dynasty));
```

Also assert that the museum offer contains `博物馆互动展项`, `2–4 周`, device forms, deliverables, and evaluation metrics.

- [ ] **Step 2: Write failing rule behavior tests**

Cover exact behaviors:

```js
assert.equal(matchClue('黄熟大橙，蟹膏肉实其内').status, 'matched');
assert.equal(matchClue('今天有点饿').status, 'insufficient');
assert.ok(matchClue('今天有点饿').neededClues.length >= 3);
assert.equal(getDailyRevival(new Date('2026-07-14')).id,
  getDailyRevival(new Date('2026-07-14')).id);
assert.equal(fuseDishes('dish_001', 'dish_002').mode, '离线规则推演');
assert.equal(matchAncestor({ description: '橙香蟹粉面' }).status, '离线推测');
assert.match(createCertificateSvg({ title: '蟹酿橙复原官' }), /<svg/);
```

- [ ] **Step 3: Run tests and verify failure**

```powershell
cd frontend
npm run test:offline
```

Expected: FAIL with missing offline data/rule modules.

- [ ] **Step 4: Implement normalized data**

Import the existing JSON data from `../../../data/` at build time and normalize it into browser-safe records. `dish_001` is the only `证据完整` flagship unless the expert review manifest explicitly approves another dish; evidence-covered dishes become `推荐考据`; the remainder become `资料待补`. Each record includes only fields used by the UI.

Define crab-orange evidence with these fixed categories:

```js
export const evidenceKinds = ['文献明确记载', '跨资料推断', '现代转译', '证据不足', '待专家复核'];
```

The three hotspot records must contain `id`, `label`, `quote`, `source`, `kind`, `confidence`, and `explanation`.

- [ ] **Step 5: Implement deterministic rules and local persistence**

`matchClue` scores exact source-passage tags and returns `insufficient` below the threshold. `fuseDishes` first uses explicit evolution results, then a deterministic fallback based on parent names and flavor profiles. `getDailyRevival` hashes local `YYYY-MM-DD` into the 40-dish list. `matchAncestor` uses image filename plus description terms and always returns `离线推测`. `progressStore` catches storage failures and falls back to in-memory state.

- [ ] **Step 6: Run all offline rule tests**

```powershell
cd frontend
npm run test:offline
```

Expected: PASS for data integrity and rule behavior.

- [ ] **Step 7: Commit data and rules**

```powershell
git add frontend/src/offline/data frontend/src/offline/lib frontend/src/offline/__tests__
git commit -m "feat: add deterministic offline museum data"
```

### Task 3: Build the museum shell and 90-second restoration journey

**Files:**
- Modify: `frontend/src/offline/OfflineApp.jsx`
- Modify: `frontend/src/offline/offline.css`
- Create: `frontend/src/offline/components/MuseumHeader.jsx`
- Create: `frontend/src/offline/components/ExhibitShell.jsx`
- Create: `frontend/src/offline/components/EvidenceDrawer.jsx`
- Create: `frontend/src/offline/exhibits/HomeExhibit.jsx`
- Create: `frontend/src/offline/exhibits/RestorationExhibit.jsx`
- Create: `frontend/src/offline/exhibits/BusinessExhibit.jsx`
- Create: `frontend/src/offline/__tests__/offlineRestoration.test.mjs`

- [ ] **Step 1: Write failing restoration contract tests**

Assert the source contains the five named stages and critical labels:

```js
for (const label of ['装入历史线索', '古籍解码', '证据推演', '3D 复原', '双版本结果']) {
  assert.match(restorationSource, new RegExp(label));
}
for (const label of ['文献明确记载', '跨资料推断', '现代转译', '证据不足', '待专家复核']) {
  assert.match(evidenceSource + restorationSource, new RegExp(label));
}
assert.match(restorationSource, /跳过动效/);
assert.match(restorationSource, /历史复原档案/);
assert.match(restorationSource, /现代厨房转译/);
assert.match(restorationSource, /研究性复原，不替代学术定论/);
```

Assert `HomeExhibit` contains exactly the two route labels `开始 90 秒可信复原` and `自由探索馆藏`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
cd frontend
npm run test:offline
```

Expected: FAIL because the exhibits do not exist.

- [ ] **Step 3: Implement app-level exhibit state**

Use a finite set of exhibit keys instead of URL routes:

```js
const exhibits = new Set(['home', 'restore', 'archive', 'mentor', 'evolution', 'play', 'business']);
const [activeExhibit, setActiveExhibit] = useState('home');
```

`MuseumHeader` exposes only three primary actions. “探索馆藏” opens a secondary exhibit chooser containing archive, mentor, evolution, and play. Persist only the current completed steps and preferences, not uploaded images.

- [ ] **Step 4: Implement the evaluator journey**

`RestorationExhibit` has a visible five-step progress rail and explicit next/back controls. The preloaded clue is the verified crab-orange passage. Free input calls `matchClue`; insufficient results show the three needed clue categories and never load crab-orange by default.

The evidence drawer contains short quotes, source titles, verification notes, copyright boundaries, and evidence kinds. The result contains two parallel sections and a separate uncertainty section. The final action opens `BusinessExhibit` with the museum pilot offer.

- [ ] **Step 5: Implement museum styling and responsive constraints**

Use CSS custom properties for charcoal, warm white, cinnabar, bronze green, and amber gold. Keep card radius at 8px or less. Use stable grid tracks for progress, evidence, and result panels. Add `@media (prefers-reduced-motion: reduce)` and mobile stacking below 760px. No viewport-width font scaling.

- [ ] **Step 6: Run tests, lint, and build**

```powershell
cd frontend
npm run test:offline
npm run lint
npm run build:offline
```

Expected: offline tests PASS, lint PASS, single-file build succeeds.

- [ ] **Step 7: Commit the core journey**

```powershell
git add frontend/src/offline
git commit -m "feat: add offline evaluator restoration journey"
```

### Task 4: Preserve all original features as real offline loops

**Files:**
- Modify: `frontend/src/offline/OfflineApp.jsx`
- Create: `frontend/src/offline/exhibits/ArchiveExhibit.jsx`
- Create: `frontend/src/offline/exhibits/MentorExhibit.jsx`
- Create: `frontend/src/offline/exhibits/EvolutionExhibit.jsx`
- Create: `frontend/src/offline/exhibits/PlayExhibit.jsx`
- Create: `frontend/src/offline/__tests__/offlineFeatures.test.mjs`

- [ ] **Step 1: Write failing feature-loop tests**

Assert all original capabilities exist and use local rules:

```js
for (const label of ['数字传承人', '味觉星图', '风味进化', '拍照认祖', '每日复活', '真假非遗', '分享证书']) {
  assert.match(allOfflineExhibitSources, new RegExp(label));
}
assert.match(archiveSource, /museumDishes/);
assert.match(archiveSource, /证据完整|推荐考据|资料待补/);
assert.match(mentorSource, /离线问答/);
assert.match(evolutionSource, /fuseDishes/);
assert.match(playSource, /matchAncestor|getDailyRevival|createCertificateSvg/);
assert.doesNotMatch(allOfflineExhibitSources, /fetch\(|apiRequest|axios/);
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
cd frontend
npm run test:offline
```

Expected: FAIL with missing feature exhibits.

- [ ] **Step 3: Implement the 40-dish archive and mentor**

Archive filters by dynasty, archive state, and text. The selected detail displays its approved image, short passage, flavor profile, and honest archive state. The star-map view is a stable responsive grid/constellation visualization and does not require canvas.

Mentor supports predefined intents plus keyword-matched free questions. Every answer shows “离线问答” and sources when present. Speech uses browser speech synthesis only after a user click; subtitles always remain visible and stopping speech is available.

- [ ] **Step 4: Implement evolution and play loops**

Evolution requires two distinct parents, calls `fuseDishes`, and displays parent lineage, inherited traits, the offline-rule label, and safety/uncertainty notes.

Play contains four internal tabs. Image selection reads only the filename and preview data in memory; it does not persist image bytes. Daily revival is date-stable. Authenticity quiz draws from real/fake local data and reveals evidence after answer. Certificate uses local SVG and supports download plus print fallback.

- [ ] **Step 5: Run feature tests and build**

```powershell
cd frontend
npm run test:offline
npm run lint
npm run build:offline
```

Expected: all offline feature contracts PASS and the single-file build succeeds.

- [ ] **Step 6: Capture TRAE task 01 completion evidence**

Capture `docs/competition/screenshots/trae-01-complete.png` showing the completed task result in TRAE. Confirm `trae-01` has a real Session ID in the manifest.

- [ ] **Step 7: Commit all preserved feature loops**

```powershell
git add frontend/src/offline docs/competition/screenshots docs/competition/trae-evidence-manifest.json
git commit -m "feat: preserve product features offline"
```

### Task 5: Add the Three.js crab-orange evidence exhibit (TRAE task 02)

**Files:**
- Modify: `frontend/src/offline/exhibits/HomeExhibit.jsx`
- Modify: `frontend/src/offline/exhibits/RestorationExhibit.jsx`
- Modify: `frontend/src/offline/offline.css`
- Create: `frontend/src/offline/components/CrabOrangeStage.jsx`
- Create: `frontend/src/offline/components/CrabOrangeFallback.jsx`
- Create: `frontend/src/offline/lib/createCrabOrangeScene.js`
- Create: `frontend/src/offline/__tests__/offlineThree.test.mjs`

- [ ] **Step 1: Start TRAE task 02 and capture its prompt**

Send:

```text
任务：TRAE-02 Three.js 蟹酿橙证据展台。
在已完成的离线数字博物馆中加入真正的 Three.js 交互展品。用程序化轻量几何表现橙壳、顶盖、蟹馅和蒸盏，支持旋转、缩放、自动回正、结构拆解、线框到材质过渡，以及三个证据热点。点击热点必须联动原文短摘与证据状态。全部资源离线内嵌；WebGL 失败时切换可交互 2.5D 备用视图。先写失败测试，再实现，验证桌面和手机不重叠。
```

Save `docs/competition/screenshots/trae-02-prompt.png`.

- [ ] **Step 2: Write failing Three.js contract tests**

Assert:

```js
assert.match(sceneSource, /WebGLRenderer/);
assert.match(sceneSource, /SphereGeometry/);
assert.match(sceneSource, /OrbitControls/);
assert.match(stageSource, /恢复视角/);
assert.match(stageSource, /拆解结构/);
assert.match(stageSource, /线框|wireframe/);
for (const label of ['以橙为器', '以蟹膏肉实其内', '覆橙顶，入甑蒸熟']) {
  assert.match(stageSource + fallbackSource, new RegExp(label));
}
assert.match(stageSource, /CrabOrangeFallback/);
```

- [ ] **Step 3: Run tests and verify failure**

```powershell
cd frontend
npm run test:offline
```

Expected: FAIL because the scene and components do not exist.

- [ ] **Step 4: Implement procedural geometry and lifecycle**

`createCrabOrangeScene` creates a transparent renderer with capped device pixel ratio, camera, warm key light, fill light, orbit controls with pan disabled, and grouped meshes for bowl, orange shell, filling, and lid. Use clipped sphere geometry or stacked sphere/cylinder primitives; do not load a GLB. Return this interface:

```js
return {
  setProgress(value),
  setExploded(value),
  focusHotspot(id),
  resetView(),
  resize(width, height),
  dispose(),
};
```

`dispose()` cancels animation, disposes controls, geometries, materials, and renderer. `setProgress` transitions material opacity/roughness and wireframe state. Respect reduced-motion by applying final states without long interpolation.

- [ ] **Step 5: Implement accessible stage controls and fallback**

Canvas remains unframed inside the exhibit stage. Provide icon buttons with visible tooltips for reset and explode. Hotspot buttons are keyboard accessible and have fixed positions that do not resize the scene. If renderer construction throws or `webglcontextlost` fires, show `CrabOrangeFallback` with layered self-owned crab-orange imagery and the same three evidence buttons.

- [ ] **Step 6: Integrate 3D into first viewport and restoration stage**

The home stage exposes gentle direct manipulation without forcing an intro. The restoration journey passes its evidence progress to `setProgress`. Clicking a 3D hotspot opens the same evidence record used by the drawer; no duplicate evidence strings are maintained in component code.

- [ ] **Step 7: Run tests, build, and inspect bundle**

```powershell
cd frontend
npm run test:offline
npm run lint
npm run build:offline
```

Expected: PASS and a single HTML containing Three.js code, with no GLB or external texture request.

- [ ] **Step 8: Record TRAE task 02 evidence**

Save `docs/competition/screenshots/trae-02-progress.png` and `trae-02-complete.png`. Record the real Session ID as `trae-02`.

- [ ] **Step 9: Commit the 3D exhibit**

```powershell
git add frontend/src/offline frontend/package.json frontend/package-lock.json docs/competition
git commit -m "feat: add crab orange evidence stage"
```

### Task 6: Add automated bundle verification and packaging

**Files:**
- Create: `scripts/verify_offline_bundle.mjs`
- Create: `scripts/__tests__/verify_offline_bundle.test.mjs`
- Create: `scripts/package_trae_submission.ps1`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write failing verifier tests**

Use temporary HTML fixtures and assert:

```js
assert.equal(inspectOfflineHtml('<script src="./app.js"></script>').ok, false);
assert.equal(inspectOfflineHtml('<img src="https://example.com/a.png">').ok, false);
assert.equal(inspectOfflineHtml('<script>window.APP=true</script><style>body{}</style>').ok, true);
assert.ok(inspectOfflineHtml('<script src="./app.js"></script>').violations.includes('external-script'));
```

Also assert the verifier requires the labels `离线评审模式`, `开始 90 秒可信复原`, `数字传承人`, `味觉星图`, `风味进化`, and `商业合作` to appear in the built HTML.

- [ ] **Step 2: Run test and verify failure**

```powershell
node --test scripts/__tests__/verify_offline_bundle.test.mjs
```

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement bundle verifier**

Export `inspectOfflineHtml(html)` and a CLI. Detect remote URLs in `src`, `href`, CSS `url()`, and script content, while allowing `data:` and fragment links. Detect file-relative script, stylesheet, image, audio, font, and model references. Report HTML bytes and a stable violation list. Exit nonzero with `--enforce` when violations exist or required labels are missing.

- [ ] **Step 4: Implement packaging script**

`package_trae_submission.ps1` must:

1. Run `npm run build:offline` in `frontend`.
2. Run the verifier with `--enforce`.
3. Create `release/风味考古局-TRAE初赛/`.
4. Copy and rename the built file to `风味考古局-离线体验.html`.
5. Add a short `使用说明.txt` that says to extract and double-click the HTML in Chrome or Edge.
6. Create `release/风味考古局-TRAE初赛.zip` with `Compress-Archive`.
7. Never include `.env`, source code, logs, or candidate images.

- [ ] **Step 5: Run verifier tests and create a dry-run package**

```powershell
node --test scripts/__tests__/verify_offline_bundle.test.mjs
powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1
```

Expected: tests PASS; release folder and ZIP exist; verifier reports zero external-resource violations.

- [ ] **Step 6: Commit packaging**

```powershell
git add scripts frontend/package.json frontend/package-lock.json
git commit -m "build: package offline TRAE submission"
```

### Task 7: Create truthful competition evidence gates (TRAE task 03 begins)

**Files:**
- Modify: `docs/competition/trae-evidence-manifest.json`
- Create: `docs/competition/trae-submission-checklist.md`
- Create: `scripts/verify_trae_submission.mjs`
- Create: `scripts/__tests__/verify_trae_submission.test.mjs`

- [ ] **Step 1: Start TRAE task 03 and capture its prompt**

Send:

```text
任务：TRAE-03 离线验证、提交包与参赛材料。
对风味考古局离线 HTML 做断网、Chrome、Edge、中文空格路径、桌面与手机视口、3D 像素和交互、控制台错误、资源内嵌、文件体积与全部功能闭环验证。修复发现的问题，生成最终 ZIP，并整理符合初赛要求的作品帖、至少三张 TRAE 开发过程截图和三个真实 Session ID。报名帖链接暂时只能保留待补状态，最终门禁不得把它误报为完成。
```

Save `docs/competition/screenshots/trae-03-prompt.png`.

- [ ] **Step 2: Write failing submission-gate tests**

Test these states:

```js
assert.equal(evaluateSubmission(emptyManifest).ready, false);
assert.ok(evaluateSubmission(emptyManifest).missing.includes('报名帖链接'));
assert.equal(evaluateSubmission({ ...validManifest, registrationUrl: '【待补】' }).ready, false);
assert.equal(evaluateSubmission(validManifest).ready, true);
```

`validManifest` must contain an existing ZIP, an existing HTML, at least three existing screenshot paths, at least three distinct non-placeholder Session IDs, post sections, and a valid `https://forum.trae.cn/t/topic/` registration URL.

- [ ] **Step 3: Run tests and verify failure**

```powershell
node --test scripts/__tests__/verify_trae_submission.test.mjs
```

Expected: FAIL because the release gate does not exist.

- [ ] **Step 4: Implement evidence manifest and release gate**

Use this schema:

```json
{
  "demoHtml": "release/风味考古局-TRAE初赛/风味考古局-离线体验.html",
  "demoZip": "release/风味考古局-TRAE初赛.zip",
  "postDraft": "docs/competition/trae-initial-round-post.md",
  "registrationUrl": "",
  "traeTasks": [
    { "key": "trae-01", "sessionId": "", "screenshots": [] },
    { "key": "trae-02", "sessionId": "", "screenshots": [] },
    { "key": "trae-03", "sessionId": "", "screenshots": [] }
  ]
}
```

The CLI prints `READY` only when every gate passes; otherwise it prints `NOT READY` and each missing item. Empty values and text containing `待补`, `TODO`, `TBD`, or `placeholder` are invalid.

- [ ] **Step 5: Run gate tests**

```powershell
node --test scripts/__tests__/verify_trae_submission.test.mjs
node scripts/verify_trae_submission.mjs
```

Expected: tests PASS; live manifest reports `NOT READY` until real evidence and registration URL exist.

- [ ] **Step 6: Commit truthful release gates**

```powershell
git add scripts docs/competition
git commit -m "test: enforce TRAE submission evidence gates"
```

### Task 8: Verify the real offline experience across browsers and viewports

**Files:**
- Modify as needed: `frontend/src/offline/**`
- Create: `docs/competition/verification-report.md`
- Create: `docs/competition/screenshots/product-*.png`

- [ ] **Step 1: Build and copy the HTML to a Chinese-space path**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1
Copy-Item -LiteralPath 'release\风味考古局-TRAE初赛\风味考古局-离线体验.html' -Destination 'tmp\中文 空格 验证\风味考古局-离线体验.html' -Force
```

- [ ] **Step 2: Open the file in Chrome with network unavailable and inspect first viewport**

Use browser control to open the `file:///` URL. Verify the title, offline label, two route actions, and a nonblank 3D canvas. Capture a desktop screenshot. Read console logs and require zero uncaught errors.

- [ ] **Step 3: Exercise the full evaluator journey**

Run the crab-orange preset through all five stages. Click all three 3D hotspots, rotate, zoom, explode, reset, open the evidence drawer, inspect both result versions, and reach the museum pilot handoff. Verify the canvas has non-background pixels before and after interaction.

- [ ] **Step 4: Exercise weak clue and every original feature loop**

Submit `今天有点饿` and verify `证据不足` plus at least three requested clue categories. Complete one mentor question, archive filter/detail, evolution result, image ancestor estimate using a local test image, daily revival, authenticity answer, and certificate download/print fallback.

- [ ] **Step 5: Verify mobile layout**

Set viewports to 390x844 and 412x915. Verify header menu, fixed-size 3D controls, hotspot labels, result sections, archive cards, and all buttons. Require no horizontal page scroll, text clipping, or overlap.

- [ ] **Step 6: Repeat critical path in Edge**

Open the same Chinese-space path in Edge and verify first viewport, 3D render, one hotspot, weak-clue refusal, and certificate action. Record any browser-specific fallback.

- [ ] **Step 7: Fix failures with a new failing regression test first**

For each discovered defect, add the narrowest possible Node test or bundle verifier assertion, run it to see failure, implement the fix, and rerun the affected suite.

- [ ] **Step 8: Write the verification report**

Record exact browser versions, tested viewports, file path, bundle size, test commands, console result, 3D pixel result, completed feature loops, and any nonblocking degradation. Do not use “works” without evidence.

- [ ] **Step 9: Commit verified fixes and report**

```powershell
git add frontend/src/offline docs/competition/verification-report.md docs/competition/screenshots
git commit -m "test: verify offline museum experience"
```

### Task 9: Draft the final competition post and complete TRAE evidence

**Files:**
- Create: `docs/competition/trae-initial-round-post.md`
- Modify: `docs/competition/trae-evidence-manifest.json`
- Modify: `docs/competition/trae-submission-checklist.md`

- [ ] **Step 1: Write the post from verified behavior only**

Use exactly these top-level sections:

```markdown
# 社会服务｜风味考古局：给我一行古书，还你一桌失传的盛宴

## 1. Demo 简介
## 2. Demo 创作思路
## 3. Demo 体验方式
## 4. TRAE 实践过程
## 5. 报名帖链接
```

The introduction names museum/heritage education teams as first customers and highlights trustworthy restoration, the 3D evidence exhibit, and the 40-dish archive. The experience section says to extract the ZIP and double-click the HTML in Chrome or Edge without network access. The practice section lists the three real task titles, real Session IDs, screenshot references, implementation decisions, problems fixed, and verification evidence.

- [ ] **Step 2: Capture TRAE task 03 completion evidence**

Save `docs/competition/screenshots/trae-03-progress.png` and `trae-03-complete.png`. Copy the real `trae-03` Session ID into the manifest.

- [ ] **Step 3: Validate that three distinct TRAE tasks are documented**

Run:

```powershell
node scripts/verify_trae_submission.mjs
```

Expected before registration link is supplied: `NOT READY` with only `报名帖链接` missing. If any Session ID, screenshot, ZIP, HTML, or post section is missing, fix that evidence gap before proceeding.

- [ ] **Step 4: Commit competition materials**

```powershell
git add docs/competition scripts
git commit -m "docs: prepare TRAE initial round submission"
```

### Task 10: Final release gate and user-supplied registration link

**Files:**
- Modify: `docs/competition/trae-initial-round-post.md`
- Modify: `docs/competition/trae-evidence-manifest.json`
- Modify: `docs/competition/trae-submission-checklist.md`
- Regenerate: `release/风味考古局-TRAE初赛.zip`

- [ ] **Step 1: Obtain the approved registration post URL from the user**

The value must match:

```text
https://forum.trae.cn/t/topic/<numeric-topic-id>
```

Do not infer or invent this URL.

- [ ] **Step 2: Replace the registration placeholder everywhere**

Update the manifest, post draft, and checklist. Search for forbidden placeholders:

```powershell
rg -n "待补|TODO|TBD|placeholder|SESSION_ID" docs/competition
```

Expected: no unresolved submission placeholder.

- [ ] **Step 3: Run the full automated verification**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
cd frontend
npm run test:offline
npm run build:offline
cd ..
node scripts/verify_offline_bundle.mjs frontend/dist-offline/offline.html --enforce
powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1
node scripts/verify_trae_submission.mjs --enforce
```

Expected: all commands exit 0; final gate prints `READY`.

- [ ] **Step 4: Inspect final ZIP contents**

Require only the self-contained HTML and usage instructions in the user-facing ZIP. Confirm no `.env`, API key, source map, logs, source tree, or unapproved asset appears.

- [ ] **Step 5: Commit the release metadata**

```powershell
git add docs/competition
git commit -m "docs: finalize TRAE submission evidence"
```

## 4. Completion Criteria

Do not claim completion until all of the following are true:

- The final release gate prints `READY`.
- The ZIP exists and extracts successfully.
- The HTML works offline from a path containing Chinese characters and spaces.
- Chrome and Edge critical paths are verified with zero uncaught console errors.
- The Three.js canvas is visibly nonblank, interactive, and has a working fallback.
- Every original feature completes one offline loop.
- The post contains the required four content sections and approved registration link.
- At least three valid TRAE screenshots and three distinct real TRAE Session IDs are present.
- The current implementation and the claims in the post agree.
