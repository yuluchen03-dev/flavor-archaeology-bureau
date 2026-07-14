# Offline Museum Comprehensive Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the offline experience as a polished digital museum and flavor-archaeology workbench while preserving all 40 archives, offline rules, honest evidence boundaries, and a final self-contained HTML file no larger than 3,000,000 bytes.

**Architecture:** Keep the online application untouched and refactor only `frontend/src/offline`. A shared reducer owns navigation, selected dish, restoration stage, evidence, and model state; focused exhibit components render that state through a persistent museum shell. Three.js remains isolated behind a scene adapter with a feature-equivalent 2.5D fallback, and build plus browser gates enforce offline behavior, responsive layout, canvas rendering, and the byte budget.

**Tech Stack:** React 19, Vite 8, Three.js, lucide-react, Node.js `node:test`, Playwright, Sharp, PowerShell packaging scripts.

---

## Working Rules

- Implement only the offline entry unless a task explicitly names a shared script.
- Preserve the user's existing uncommitted changes in `frontend/src/offline/data/offlineMuseumData.js` and its data test.
- Do not write Codex evidence into `docs/competition/trae-evidence-manifest.json`.
- After every task, run the named focused tests before the commit.
- Do not commit generated `frontend/dist-offline`, browser screenshots, `release/`, or dependency caches.
- The size limit is exactly `3_000_000` UTF-8 bytes for `frontend/dist-offline/offline.html`.

## File Map

**New state and resilience files**

- `frontend/src/offline/state/museumSession.js`: pure initial state, actions, reducer, and persistence projection.
- `frontend/src/offline/state/MuseumSessionContext.jsx`: reducer provider, persistence effect, and context hook.
- `frontend/src/offline/components/OfflineErrorBoundary.jsx`: recover-current-view and return-home failure UI.

**New shell and workbench files**

- `frontend/src/offline/components/MuseumShell.jsx`: desktop rail, mobile navigation, top status, and content frame.
- `frontend/src/offline/components/WorkflowRail.jsx`: five-step restoration navigation and completion states.
- `frontend/src/offline/components/EvidenceInspector.jsx`: selected evidence, citation, confidence, dispute, and evidence legend.
- `frontend/src/offline/components/RestorationReport.jsx`: historical result, modern translation, unknowns, and coverage.
- `frontend/src/offline/exhibits/ResearchLab.jsx`: selected-dish-aware mentor, evolution, and play tabs.

**New style files**

- `frontend/src/offline/styles/tokens.css`: color, typography, dimensions, focus, and reset tokens.
- `frontend/src/offline/styles/shell.css`: museum shell and navigation.
- `frontend/src/offline/styles/home.css`: immersive home scene and evidence strip.
- `frontend/src/offline/styles/workbench.css`: restoration workbench, scene annotations, evidence, and report.
- `frontend/src/offline/styles/archive.css`: timeline, archive list, detail, and filters.
- `frontend/src/offline/styles/research.css`: mentor, evolution, quiz, upload, and certificate tools.
- `frontend/src/offline/styles/partnership.css`: exhibit specification and implementation timeline.
- `frontend/src/offline/styles/responsive.css`: 1280, 760, reduced-motion, and print rules.

**New verification files**

- `frontend/src/offline/__tests__/museumSession.test.mjs`: pure reducer and persistence tests.
- `frontend/src/offline/__tests__/offlineDesign.test.mjs`: shell, workbench, style, and accessibility contract tests.
- `scripts/verify_offline_ui.mjs`: Edge/Chrome workflow, screenshots, overlap, network, fallback, and canvas checks.
- `scripts/__tests__/verify_offline_ui.test.mjs`: pure geometry and pixel-stat helpers used by browser verification.

**Major modified files**

- `frontend/src/offline/OfflineApp.jsx`: session provider consumer and finite exhibit composition.
- `frontend/src/offline/main.jsx`: error boundary and split style imports.
- `frontend/src/offline/exhibits/HomeExhibit.jsx`: immersive hero and evidence strip.
- `frontend/src/offline/exhibits/RestorationExhibit.jsx`: persistent three-column workbench.
- `frontend/src/offline/exhibits/ArchiveExhibit.jsx`: timeline/list/detail plus research tab.
- `frontend/src/offline/exhibits/MentorExhibit.jsx`: selected-dish-aware embedded mode.
- `frontend/src/offline/exhibits/EvolutionExhibit.jsx`: selected dish as parent A in embedded mode.
- `frontend/src/offline/exhibits/PlayExhibit.jsx`: selected dish inherited by certificate and local tools.
- `frontend/src/offline/exhibits/BusinessExhibit.jsx`: specification table and implementation timeline.
- `frontend/src/offline/components/CrabOrangeStage.jsx`: model modes, numbered annotations, accessible controls.
- `frontend/src/offline/components/CrabOrangeFallback.jsx`: matching modes, explode state, and evidence behavior.
- `frontend/src/offline/lib/createCrabOrangeScene.js`: improved procedural model and complete resource cleanup.
- `frontend/src/offline/lib/progressStore.js`: versioned persistent state with explicit fallback status.
- `frontend/src/offline/offline.css`: reduced to the import-compatible shared base or removed after split imports.
- `frontend/package.json` and `frontend/package-lock.json`: icons, Playwright, and verification scripts.
- `scripts/build_offline_assets.mjs`: lower image dimensions and deterministic WebP budget.
- `scripts/verify_offline_bundle.mjs`: 3,000,000-byte hard gate and new required labels.
- `scripts/__tests__/verify_offline_bundle.test.mjs`: exact boundary tests.
- `scripts/verify-all.ps1`: offline build, bundle, and UI gates.

### Task 1: Enforce the 3,000,000-Byte Offline Budget

**Files:**
- Modify: `scripts/verify_offline_bundle.mjs`
- Modify: `scripts/__tests__/verify_offline_bundle.test.mjs`
- Modify: `scripts/build_offline_assets.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write failing byte-boundary tests**

Add these cases to `scripts/__tests__/verify_offline_bundle.test.mjs`:

```js
test('accepts a bundle at the exact byte budget', () => {
  const result = inspectOfflineHtml('x'.repeat(3_000_000));
  assert.equal(result.bytes, 3_000_000);
  assert.ok(!result.violations.includes('bundle-too-large'));
});

test('rejects a bundle one byte above the byte budget', () => {
  const result = inspectOfflineHtml('x'.repeat(3_000_001));
  assert.equal(result.ok, false);
  assert.ok(result.violations.includes('bundle-too-large'));
});
```

- [ ] **Step 2: Run the test and verify the new case fails**

Run: `node --test scripts/__tests__/verify_offline_bundle.test.mjs`  
Expected: FAIL because `bundle-too-large` is not emitted.

- [ ] **Step 3: Add the exact byte gate**

Add to `scripts/verify_offline_bundle.mjs` and include the violation in `ok`:

```js
export const MAX_OFFLINE_HTML_BYTES = 3_000_000;

export function inspectOfflineHtml(html) {
  const violations = [];
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > MAX_OFFLINE_HTML_BYTES) {
    violations.push('bundle-too-large');
  }
  // Keep the existing resource, label, CSS URL, and fetch checks below this guard.
  const ok = violations.length === 0 && missingLabels.length === 0;
  return { ok, violations, missingLabels, bytes, maxBytes: MAX_OFFLINE_HTML_BYTES };
}
```

Update `REQUIRED_LABELS` to the approved product labels:

```js
const REQUIRED_LABELS = [
  '离线评审模式',
  '开始可信复原',
  '风味馆藏库',
  '互动研究',
  '合作展厅',
];
```

- [ ] **Step 4: Reduce image output before adding new UI code**

Set deterministic archive-image constants in `scripts/build_offline_assets.mjs`:

```js
const MAX_WIDTH = 720;
const MAX_HEIGHT = 405;
const WEBP_QUALITY = 56;
```

Keep the approved `dish_001.png` through `dish_040.png` source allowlist unchanged.

- [ ] **Step 5: Add a repeatable bundle verification script**

Add to `frontend/package.json`:

```json
"verify:offline:bundle": "node ../scripts/verify_offline_bundle.mjs dist-offline/offline.html --enforce"
```

- [ ] **Step 6: Run tests and build**

Run: `node --test scripts/__tests__/verify_offline_bundle.test.mjs`  
Expected: all tests PASS.

Run: `npm run build:offline` from `frontend`  
Expected: `dist-offline/offline.html` is generated.

Run: `npm run verify:offline:bundle` from `frontend`  
Expected: `Status: OK` and size below `3,000,000` bytes.

- [ ] **Step 7: Commit**

```bash
git add scripts/verify_offline_bundle.mjs scripts/__tests__/verify_offline_bundle.test.mjs scripts/build_offline_assets.mjs frontend/package.json frontend/package-lock.json
git commit -m "test: enforce offline bundle budget"
```

### Task 2: Add a Shared Museum Session Reducer

**Files:**
- Create: `frontend/src/offline/state/museumSession.js`
- Create: `frontend/src/offline/state/MuseumSessionContext.jsx`
- Create: `frontend/src/offline/__tests__/museumSession.test.mjs`
- Modify: `frontend/src/offline/lib/progressStore.js`

- [ ] **Step 1: Write reducer tests first**

Create `frontend/src/offline/__tests__/museumSession.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SESSION,
  museumSessionReducer,
  persistentSession,
} from '../state/museumSession.js';

test('selecting a dish is shared without changing the active exhibit', () => {
  const state = museumSessionReducer(INITIAL_SESSION, {
    type: 'selectDish',
    dishId: 'dish_012',
  });
  assert.equal(state.selectedDishId, 'dish_012');
  assert.equal(state.activeExhibit, 'home');
});

test('opening evidence records coverage without duplicates', () => {
  const once = museumSessionReducer(INITIAL_SESSION, {
    type: 'selectEvidence',
    evidenceId: 'hotspot_shell',
  });
  const twice = museumSessionReducer(once, {
    type: 'selectEvidence',
    evidenceId: 'hotspot_shell',
  });
  assert.deepEqual(twice.viewedEvidenceIds, ['hotspot_shell']);
});

test('reset to home keeps selected dish but clears transient restoration state', () => {
  const dirty = {
    ...INITIAL_SESSION,
    selectedDishId: 'dish_008',
    activeExhibit: 'restore',
    stage: 4,
    selectedEvidenceId: 'hotspot_shell',
  };
  const reset = museumSessionReducer(dirty, { type: 'returnHome' });
  assert.equal(reset.activeExhibit, 'home');
  assert.equal(reset.selectedDishId, 'dish_008');
  assert.equal(reset.stage, 0);
  assert.equal(reset.selectedEvidenceId, null);
});

test('persistence excludes clue text and uploaded image state', () => {
  const stored = persistentSession({
    ...INITIAL_SESSION,
    clueText: 'private clue',
    uploadedImageUrl: 'blob:private',
  });
  assert.equal(stored.clueText, undefined);
  assert.equal(stored.uploadedImageUrl, undefined);
  assert.equal(stored.selectedDishId, 'dish_001');
});
```

- [ ] **Step 2: Run the reducer tests and confirm module-not-found failure**

Run: `node --test frontend/src/offline/__tests__/museumSession.test.mjs`  
Expected: FAIL because `museumSession.js` does not exist.

- [ ] **Step 3: Implement the pure reducer**

Create `frontend/src/offline/state/museumSession.js` with these public values and actions:

```js
export const EXHIBITS = new Set(['home', 'restore', 'archive', 'business']);

export const INITIAL_SESSION = Object.freeze({
  activeExhibit: 'home',
  archiveTab: 'collection',
  researchTool: 'mentor',
  selectedDishId: 'dish_001',
  secondaryDishId: null,
  stage: 0,
  clueText: '',
  matchResult: null,
  selectedEvidenceId: null,
  viewedEvidenceIds: [],
  modelMode: 'historical',
  exploded: false,
  completedSteps: [],
  reducedMotion: false,
});

export function museumSessionReducer(state, action) {
  switch (action.type) {
    case 'navigate':
      return EXHIBITS.has(action.exhibit)
        ? { ...state, activeExhibit: action.exhibit }
        : state;
    case 'returnHome':
      return {
        ...state,
        activeExhibit: 'home',
        stage: 0,
        clueText: '',
        matchResult: null,
        selectedEvidenceId: null,
        viewedEvidenceIds: [],
        modelMode: 'historical',
        exploded: false,
      };
    case 'selectDish':
      return { ...state, selectedDishId: action.dishId };
    case 'selectSecondaryDish':
      return { ...state, secondaryDishId: action.dishId };
    case 'setArchiveTab':
      return { ...state, archiveTab: action.tab };
    case 'setResearchTool':
      return { ...state, researchTool: action.tool };
    case 'setStage':
      return { ...state, stage: Math.max(0, Math.min(4, action.stage)) };
    case 'setClue':
      return { ...state, clueText: action.text, matchResult: action.result ?? state.matchResult };
    case 'setMatchResult':
      return { ...state, matchResult: action.result };
    case 'selectEvidence': {
      const viewedEvidenceIds = state.viewedEvidenceIds.includes(action.evidenceId)
        ? state.viewedEvidenceIds
        : [...state.viewedEvidenceIds, action.evidenceId];
      return { ...state, selectedEvidenceId: action.evidenceId, viewedEvidenceIds };
    }
    case 'setModelMode':
      return { ...state, modelMode: action.mode };
    case 'setExploded':
      return { ...state, exploded: Boolean(action.value) };
    case 'completeStep':
      return state.completedSteps.includes(action.step)
        ? state
        : { ...state, completedSteps: [...state.completedSteps, action.step] };
    case 'setReducedMotion':
      return { ...state, reducedMotion: Boolean(action.value) };
    default:
      return state;
  }
}

export function persistentSession(state) {
  return {
    selectedDishId: state.selectedDishId,
    completedSteps: state.completedSteps,
    reducedMotion: state.reducedMotion,
  };
}
```

- [ ] **Step 4: Make persistence versioned and observable**

Change `progressStore.js` to use `fengwei_offline_progress_v2`. Make `saveProgress` return `'local'` after a successful `localStorage.setItem` and `'memory'` after fallback. Preserve the current catch behavior and ensure uploaded images are never accepted by `persistentSession`.

Create `MuseumSessionContext.jsx` with the exact provider interface:

```jsx
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { loadProgress, saveProgress } from '../lib/progressStore.js';
import { INITIAL_SESSION, museumSessionReducer, persistentSession } from './museumSession.js';

const MuseumSessionContext = createContext(null);

export function MuseumSessionProvider({ children }) {
  const persisted = loadProgress();
  const [state, dispatch] = useReducer(museumSessionReducer, {
    ...INITIAL_SESSION,
    ...persisted,
  });
  useEffect(() => {
    saveProgress(persistentSession(state));
  }, [state.selectedDishId, state.completedSteps, state.reducedMotion]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MuseumSessionContext.Provider value={value}>{children}</MuseumSessionContext.Provider>;
}

export function useMuseumSession() {
  const value = useContext(MuseumSessionContext);
  if (!value) throw new Error('useMuseumSession must be used inside MuseumSessionProvider');
  return value;
}
```

- [ ] **Step 5: Run state and existing offline tests**

Run: `node --test frontend/src/offline/__tests__/museumSession.test.mjs frontend/src/offline/__tests__/offlineRules.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline/state frontend/src/offline/__tests__/museumSession.test.mjs frontend/src/offline/lib/progressStore.js
git commit -m "feat: add shared offline museum session"
```

### Task 3: Establish the Museum Design System and Persistent Shell

**Files:**
- Create: `frontend/src/offline/components/MuseumShell.jsx`
- Create: `frontend/src/offline/styles/tokens.css`
- Create: `frontend/src/offline/styles/shell.css`
- Create: `frontend/src/offline/styles/responsive.css`
- Create: `frontend/src/offline/__tests__/offlineDesign.test.mjs`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/OfflineApp.jsx`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Write the shell contract test**

Create `frontend/src/offline/__tests__/offlineDesign.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('museum shell exposes the three approved destinations and offline status', () => {
  const source = read('src/offline/components/MuseumShell.jsx');
  for (const label of ['可信复原台', '风味馆藏库', '合作展厅', '离线评审模式']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /aria-current/);
  assert.match(source, /museum-mobile-nav/);
});

test('offline styles use museum tokens and zero letter spacing', () => {
  const tokens = read('src/offline/styles/tokens.css');
  assert.match(tokens, /--ink-950:\s*#0b0e0d/);
  assert.match(tokens, /--paper-100:\s*#f3efe5/);
  assert.match(tokens, /--cinnabar-500:\s*#c64a3b/);
  assert.match(tokens, /--bronze-500:\s*#52796f/);
  assert.match(tokens, /letter-spacing:\s*0/);
});

test('offline entry imports split style files', () => {
  const source = read('src/offline/main.jsx');
  for (const file of ['tokens.css', 'shell.css', 'responsive.css']) {
    assert.match(source, new RegExp(file.replace('.', '\\.')));
  }
});
```

- [ ] **Step 2: Run the design test and confirm failure**

Run: `node --test frontend/src/offline/__tests__/offlineDesign.test.mjs`  
Expected: FAIL because the shell and style files do not exist.

- [ ] **Step 3: Install tree-shakeable icons**

Run from `frontend`: `npm install lucide-react@0.468.0`  
Expected: `package.json` and `package-lock.json` contain `lucide-react`; no other runtime package is added.

- [ ] **Step 4: Create the design tokens**

Create `tokens.css` with this base, then include only element resets required by the offline entry:

```css
:root {
  --ink-950: #0b0e0d;
  --ink-900: #121715;
  --ink-800: #1c2421;
  --paper-100: #f3efe5;
  --paper-200: #e6dfd0;
  --paper-700: #5f5a50;
  --cinnabar-500: #c64a3b;
  --cinnabar-600: #a93b30;
  --bronze-500: #52796f;
  --amber-400: #d3a84b;
  --line-dark: #303a36;
  --line-paper: #cbc3b3;
  --font-serif: "Songti SC", "STSong", "Noto Serif CJK SC", serif;
  --font-sans: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  --rail-width: 14rem;
  --topbar-height: 4rem;
  color: var(--paper-100);
  background: var(--ink-950);
  font-family: var(--font-sans);
  letter-spacing: 0;
}

* { box-sizing: border-box; }
html, body, #root { min-height: 100%; margin: 0; }
button, input, textarea, select { font: inherit; letter-spacing: 0; }
:focus-visible { outline: 2px solid var(--amber-400); outline-offset: 3px; }
```

- [ ] **Step 5: Implement the persistent shell**

`MuseumShell.jsx` must render desktop and mobile navigation from one constant and use icon-only controls only where the symbol is familiar:

```jsx
import { Archive, FlaskConical, Landmark } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'restore', label: '可信复原台', Icon: FlaskConical },
  { key: 'archive', label: '风味馆藏库', Icon: Archive },
  { key: 'business', label: '合作展厅', Icon: Landmark },
];

export default function MuseumShell({ activeExhibit, onNavigate, children }) {
  const navigation = (className) => (
    <nav className={className} aria-label="数字博物馆主导航">
      {NAV_ITEMS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className="museum-destination"
          aria-current={activeExhibit === key ? 'page' : undefined}
          onClick={() => onNavigate(key)}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="museum-shell">
      <aside className="museum-rail">
        <button className="museum-brand" type="button" onClick={() => onNavigate('home')}>
          <span className="museum-seal" aria-hidden="true">味</span>
          <span><strong>风味考古局</strong><small>数字风味博物馆</small></span>
        </button>
        {navigation('museum-desktop-nav')}
        <p className="museum-offline-state"><span aria-hidden="true" />离线评审模式</p>
      </aside>
      <div className="museum-viewport">
        <header className="museum-topbar">
          <span>研究性复原 · 不替代学术定论</span>
          <span>40 道馆藏 · 本地证据库</span>
        </header>
        <main className="museum-content">{children}</main>
      </div>
      {navigation('museum-mobile-nav')}
    </div>
  );
}
```

- [ ] **Step 6: Wire the shell to shared state**

Wrap `OfflineApp` with `MuseumSessionProvider` in `main.jsx`. In `OfflineApp.jsx`, read `{ state, dispatch }`, map only `home`, `restore`, `archive`, and `business`, and pass the active exhibit through `MuseumShell`. Use:

```jsx
const navigate = (exhibit) => dispatch({ type: 'navigate', exhibit });

return (
  <MuseumShell activeExhibit={state.activeExhibit} onNavigate={navigate}>
    {state.activeExhibit === 'home' && <HomeExhibit onNavigate={navigate} />}
    {state.activeExhibit === 'restore' && <RestorationExhibit />}
    {state.activeExhibit === 'archive' && <ArchiveExhibit />}
    {state.activeExhibit === 'business' && <BusinessExhibit onNavigate={navigate} />}
  </MuseumShell>
);
```

Import `tokens.css`, `shell.css`, and `responsive.css` from `main.jsx`. Do not remove the old `offline.css` import until the exhibit styles have moved in later tasks.

- [ ] **Step 7: Add shell and responsive CSS**

Implement a fixed `14rem` desktop rail, a `4rem` topbar, a content area with `min-width: 0`, and a mobile bottom navigation below `760px`. Use `padding-bottom: calc(5rem + env(safe-area-inset-bottom))` on mobile content. Every radius must be `8px` or less.

- [ ] **Step 8: Run focused tests and both builds**

Run: `npm test -- --test-name-pattern="museum shell|offline styles|offline entry"` from `frontend`  
Expected: the new design tests PASS.

Run: `npm run build` and `npm run build:offline` from `frontend`  
Expected: both builds PASS; the online entry is unchanged.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/offline/components/MuseumShell.jsx frontend/src/offline/styles frontend/src/offline/__tests__/offlineDesign.test.mjs frontend/src/offline/main.jsx frontend/src/offline/OfflineApp.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add persistent offline museum shell"
```

### Task 4: Rebuild the Procedural Crab-Orange Artifact

**Files:**
- Modify: `frontend/src/offline/lib/createCrabOrangeScene.js`
- Modify: `frontend/src/offline/components/CrabOrangeStage.jsx`
- Modify: `frontend/src/offline/components/CrabOrangeFallback.jsx`
- Modify: `frontend/src/offline/__tests__/offlineThree.test.mjs`
- Create: `frontend/src/offline/styles/workbench.css`

- [ ] **Step 1: Strengthen the 3D contract tests**

Add assertions to `offlineThree.test.mjs`:

```js
test('scene exposes historical and modern modes with complete cleanup', () => {
  const source = read('src/offline/lib/createCrabOrangeScene.js');
  assert.match(source, /setMode/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /cancelAnimationFrame/);
  assert.match(source, /geometry\.dispose|geo\.dispose/);
  assert.match(source, /material\.dispose|mat\.dispose/);
  assert.match(source, /renderer\.dispose/);
});

test('stage uses numbered evidence annotations instead of corner quote buttons', () => {
  const source = read('src/offline/components/CrabOrangeStage.jsx');
  assert.match(source, /evidence-annotation-index/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /历史结构/);
  assert.match(source, /现代成品/);
});

test('fallback supports the same model modes and explode state', () => {
  const source = read('src/offline/components/CrabOrangeFallback.jsx');
  assert.match(source, /modelMode/);
  assert.match(source, /exploded/);
  assert.match(source, /selectedEvidenceId/);
});
```

- [ ] **Step 2: Run and confirm the new assertions fail**

Run: `node --test frontend/src/offline/__tests__/offlineThree.test.mjs`  
Expected: FAIL on missing `setMode` and new annotation contracts.

- [ ] **Step 3: Improve geometry with deterministic roughness**

Add this helper to `createCrabOrangeScene.js` and call it for the outer shell and lid before creating meshes:

```js
function roughenGeometry(geometry, amount = 0.025) {
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const offset = (seed - Math.floor(seed) - 0.5) * amount;
    vertex.multiplyScalar(1 + offset);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
```

Replace the filling sphere with a registered `THREE.Group` containing 11 small deterministic `IcosahedronGeometry` pieces in crab-meat and crab-roe colors. Add an inner-shell mesh with a pale pith material and a thin bamboo steamer ring. Keep the total geometry procedural and do not add textures.

- [ ] **Step 4: Add mode and state methods to the scene adapter**

Expose this public interface from `createCrabOrangeScene`:

```js
return {
  setProgress,
  setExploded,
  setMode(mode) {
    modelMode = mode === 'modern' ? 'modern' : 'historical';
    applyModelMode();
  },
  focusHotspot,
  resetView,
  resize,
  dispose,
};
```

Historical mode shows the steamer structure and restrained material; modern mode hides the steamer ring, strengthens the prepared-filling color, and places the orange on the serving base. `dispose()` must traverse every mesh in the root group and dispose each unique geometry and material exactly once.

- [ ] **Step 5: Refactor `CrabOrangeStage` into a controlled component**

Use this public signature:

```jsx
export default function CrabOrangeStage({
  progress = 1,
  selectedEvidenceId = null,
  modelMode = 'historical',
  exploded = false,
  onEvidenceSelect,
  onModelModeChange,
  onExplodedChange,
  variant = 'workbench',
})
```

Render hotspot buttons as `01`, `02`, and `03` anchors with `.evidence-annotation-index`, a short label, `aria-pressed`, and an accessible name containing the quote. The toolbar uses only imported `RotateCcw`, `Layers3`, `History`, and `ChefHat` icons plus tooltips. Forward all controlled state changes to the scene adapter through effects.

- [ ] **Step 6: Match the 2.5D fallback behavior**

Change `CrabOrangeFallback` to accept the same selected evidence, model mode, exploded state, and callbacks. The SVG group transforms must be driven by class names rather than inline animation, and all three hotspot buttons must remain keyboard operable.

- [ ] **Step 7: Add unframed scene and annotation styles**

In `workbench.css`, make `.crab-orange-stage` and `.crab-orange-canvas-wrap` fill their assigned area without a decorative card. Use stable `aspect-ratio: 16 / 10`, `min-height: 22rem`, and a solid ink background. Place numbered annotation anchors around the artifact with connector borders, and stack them below the scene at `max-width: 760px`.

- [ ] **Step 8: Run focused tests and build budget gate**

Run: `node --test frontend/src/offline/__tests__/offlineThree.test.mjs`  
Expected: all 3D tests PASS.

Run: `npm run build:offline` from `frontend`  
Expected: the offline file builds successfully.

Run: `npm run verify:offline:bundle` from `frontend`  
Expected: PASS and size remains below `3,000,000` bytes.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/offline/lib/createCrabOrangeScene.js frontend/src/offline/components/CrabOrangeStage.jsx frontend/src/offline/components/CrabOrangeFallback.jsx frontend/src/offline/__tests__/offlineThree.test.mjs frontend/src/offline/styles/workbench.css
git commit -m "feat: rebuild crab orange evidence artifact"
```

### Task 5: Build the Immersive Museum Home

**Files:**
- Modify: `frontend/src/offline/exhibits/HomeExhibit.jsx`
- Create: `frontend/src/offline/styles/home.css`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/__tests__/offlineRestoration.test.mjs`

- [ ] **Step 1: Write the home hierarchy test**

Replace the old route-label test with:

```js
test('home presents one primary action, archive access, and first-view evidence signals', () => {
  const source = read('src/offline/exhibits/HomeExhibit.jsx');
  assert.match(source, /以文献为证，复原失传中国味道/);
  assert.match(source, /开始可信复原/);
  assert.match(source, /浏览风味馆藏/);
  assert.match(source, /40 道馆藏/);
  assert.match(source, /《山家清供》/);
  assert.match(source, /variant="hero"/);
  assert.doesNotMatch(source, /home-route-primary.*home-route-secondary/s);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test frontend/src/offline/__tests__/offlineRestoration.test.mjs`  
Expected: FAIL on the new title and hero contract.

- [ ] **Step 3: Recompose the home exhibit**

Use the session context for selected evidence and render this hierarchy:

```jsx
<section className="museum-home" aria-labelledby="museum-home-title">
  <div className="home-artifact" aria-label="蟹酿橙数字藏品">
    <CrabOrangeStage
      variant="hero"
      selectedEvidenceId={state.selectedEvidenceId}
      onEvidenceSelect={(evidence) => dispatch({ type: 'selectEvidence', evidenceId: evidence.id })}
    />
  </div>
  <div className="home-overlay">
    <p className="home-kicker">南宋食谱 · 数字风味藏品 001</p>
    <h1 id="museum-home-title">风味考古局</h1>
    <p className="home-proposition">以文献为证，复原失传中国味道</p>
    <div className="home-actions">
      <button type="button" className="command-primary" onClick={() => onNavigate('restore')}>开始可信复原</button>
      <button type="button" className="command-secondary" onClick={() => onNavigate('archive')}>浏览风味馆藏</button>
    </div>
  </div>
  <div className="home-next-signal" aria-label="馆藏摘要">
    <blockquote>“以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟。”</blockquote>
    <dl><div><dt>证据热点</dt><dd>3 项</dd></div><div><dt>馆藏规模</dt><dd>40 道馆藏</dd></div><div><dt>出处</dt><dd>《山家清供》</dd></div></dl>
  </div>
</section>
```

- [ ] **Step 4: Style a full-bleed first viewport**

In `home.css`, use a stable minimum hero height of `calc(100svh - var(--topbar-height))`, keep the 3D scene unframed, position readable text over a solid scene scrim, and expose at least `5rem` of `.home-next-signal` in a 900px-high viewport. At `390px`, stack actions and constrain the hero so the next signal begins before the first 844px ends.

- [ ] **Step 5: Import the new style and run tests**

Import `home.css` after `shell.css` in `main.jsx`.

Run: `node --test frontend/src/offline/__tests__/offlineRestoration.test.mjs`  
Expected: PASS.

Run: `npm run build:offline`  
Expected: the offline file builds successfully.

Run: `npm run verify:offline:bundle`  
Expected: PASS under the byte limit.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline/exhibits/HomeExhibit.jsx frontend/src/offline/styles/home.css frontend/src/offline/main.jsx frontend/src/offline/__tests__/offlineRestoration.test.mjs
git commit -m "feat: create immersive offline museum home"
```

### Task 6: Replace the Wizard with a Persistent Restoration Workbench

**Files:**
- Create: `frontend/src/offline/components/WorkflowRail.jsx`
- Create: `frontend/src/offline/components/EvidenceInspector.jsx`
- Create: `frontend/src/offline/components/RestorationReport.jsx`
- Modify: `frontend/src/offline/exhibits/RestorationExhibit.jsx`
- Modify: `frontend/src/offline/styles/workbench.css`
- Modify: `frontend/src/offline/__tests__/offlineRestoration.test.mjs`

- [ ] **Step 1: Write component-boundary and workflow tests**

Add to `offlineRestoration.test.mjs`:

```js
test('restoration is composed as a persistent workbench', () => {
  const source = read('src/offline/exhibits/RestorationExhibit.jsx');
  for (const component of ['WorkflowRail', 'CrabOrangeStage', 'EvidenceInspector', 'RestorationReport']) {
    assert.match(source, new RegExp(component));
  }
  assert.match(source, /restoration-workbench/);
  assert.match(source, /data-testid="restoration-next"/);
});

test('evidence inspector carries the complete trust record', () => {
  const source = read('src/offline/components/EvidenceInspector.jsx');
  for (const label of ['原文短摘', '出处', '证据类型', '可信度', '争议说明']) {
    assert.match(source, new RegExp(label));
  }
});

test('restoration report has four approved result sections', () => {
  const source = read('src/offline/components/RestorationReport.jsx');
  for (const label of ['历史复原结论', '现代厨房转译', '不可确认项', '证据覆盖率']) {
    assert.match(source, new RegExp(label));
  }
});
```

- [ ] **Step 2: Run tests and confirm missing-component failure**

Run: `node --test frontend/src/offline/__tests__/offlineRestoration.test.mjs`  
Expected: FAIL because the three components do not exist.

- [ ] **Step 3: Create `WorkflowRail`**

Use the approved labels and dispatch only stages that are already reached:

```jsx
export const RESTORATION_STAGES = ['装入历史线索', '古籍解码', '证据推演', '结构复原', '复原结论'];

export default function WorkflowRail({ stage, completedSteps, onSelect }) {
  return (
    <ol className="workflow-rail" aria-label="可信复原进度">
      {RESTORATION_STAGES.map((label, index) => {
        const reached = index <= stage || completedSteps.includes(label);
        return (
          <li key={label} data-state={index === stage ? 'current' : reached ? 'reached' : 'pending'}>
            <button type="button" disabled={!reached} aria-current={index === stage ? 'step' : undefined} onClick={() => onSelect(index)}>
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Create `EvidenceInspector`**

Accept `{ evidence, viewedCount, totalCount }`. When evidence is null, show the next research action rather than an empty card. When present, render a semantic `dl` with the five tested labels, the exact quote and source, and an evidence-kind legend below it.

```jsx
const EMPTY_MESSAGE = '选择模型热点或证据条目，查看原文、来源与可信边界。';

export default function EvidenceInspector({ evidence, viewedCount, totalCount }) {
  if (!evidence) return <aside className="evidence-inspector"><p>{EMPTY_MESSAGE}</p></aside>;
  return (
    <aside className="evidence-inspector" aria-live="polite">
      <p className="evidence-counter">证据 {viewedCount}/{totalCount}</p>
      <h2>{evidence.label}</h2>
      <dl>
        <dt>原文短摘</dt><dd><blockquote>{evidence.quote}</blockquote></dd>
        <dt>出处</dt><dd>{evidence.source}</dd>
        <dt>证据类型</dt><dd>{evidence.kind}</dd>
        <dt>可信度</dt><dd>{evidence.confidence}</dd>
        <dt>争议说明</dt><dd>{evidence.dispute || evidence.explanation}</dd>
      </dl>
    </aside>
  );
}
```

- [ ] **Step 5: Create `RestorationReport`**

Accept `{ dish, evidence, coverage, onNavigate }`. Render the historical metadata from `dish`, the existing modern ingredient/step/heat values, the four known uncertainty bullets, and a textual coverage value such as `3 / 3（100%）`. Provide `打印复原档案`, `浏览相关馆藏`, and `查看合作展厅` actions. The print button calls `window.print()` inside a try/catch and reports the print fallback in an `aria-live` status.

- [ ] **Step 6: Recompose `RestorationExhibit` around shared state**

Keep the current `matchClue` and `PRELOADED_CLUE`, but remove local copies of stage, evidence, explode, and model mode. Compose the workbench as:

```jsx
<section className="restoration-workbench" data-stage={state.stage}>
  <aside className="workbench-flow"><WorkflowRail stage={state.stage} completedSteps={state.completedSteps} onSelect={setStage} /></aside>
  <div className="workbench-artifact">
    <CrabOrangeStage
      progress={coverage}
      selectedEvidenceId={state.selectedEvidenceId}
      modelMode={state.modelMode}
      exploded={state.exploded}
      onEvidenceSelect={selectEvidence}
      onModelModeChange={(mode) => dispatch({ type: 'setModelMode', mode })}
      onExplodedChange={(value) => dispatch({ type: 'setExploded', value })}
    />
    <section className="workbench-task" aria-live="polite">{renderStageTask()}</section>
  </div>
  <EvidenceInspector evidence={selectedEvidence} viewedCount={state.viewedEvidenceIds.length} totalCount={crabOrangeEvidence.hotspots.length} />
  <footer className="workbench-commands">
    <button type="button" onClick={previousStage} disabled={state.stage === 0}>上一步</button>
    <button type="button" data-testid="restoration-next" onClick={nextStage} disabled={!canAdvance}>下一步</button>
  </footer>
</section>
```

Stage 0 contains the clue textarea and both match actions. Stage 1 displays the citation and extracted dynasty, region, ingredient, vessel, and technique terms. Stage 2 lists all three evidence records. Stage 3 gives concise manipulation instructions. Stage 4 replaces the task area with `RestorationReport` while keeping the artifact visible.

- [ ] **Step 7: Style the desktop and mobile workbench**

Desktop grid: `12rem minmax(28rem, 1fr) minmax(18rem, 23rem)`, with commands spanning the final two columns. At `max-width: 1100px`, move the evidence inspector below the artifact. At `max-width: 760px`, use one column and a bottom command bar with `padding-bottom: env(safe-area-inset-bottom)`. No inspector or command may overlap the canvas.

- [ ] **Step 8: Run focused and full offline tests**

Run: `npm run test:offline` from `frontend`  
Expected: all offline tests PASS with updated five-stage labels.

Run: `npm run build:offline`  
Expected: the offline file builds successfully.

Run: `npm run verify:offline:bundle`  
Expected: PASS below `3,000,000` bytes.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/offline/components/WorkflowRail.jsx frontend/src/offline/components/EvidenceInspector.jsx frontend/src/offline/components/RestorationReport.jsx frontend/src/offline/exhibits/RestorationExhibit.jsx frontend/src/offline/styles/workbench.css frontend/src/offline/__tests__/offlineRestoration.test.mjs
git commit -m "feat: build continuous restoration workbench"
```

### Task 7: Turn the Archive into a Shared-Context Collection and Research Lab

**Files:**
- Create: `frontend/src/offline/exhibits/ResearchLab.jsx`
- Modify: `frontend/src/offline/exhibits/ArchiveExhibit.jsx`
- Modify: `frontend/src/offline/exhibits/MentorExhibit.jsx`
- Modify: `frontend/src/offline/exhibits/EvolutionExhibit.jsx`
- Modify: `frontend/src/offline/exhibits/PlayExhibit.jsx`
- Create: `frontend/src/offline/styles/archive.css`
- Create: `frontend/src/offline/styles/research.css`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/__tests__/offlineFeatures.test.mjs`

- [ ] **Step 1: Write shared-context feature tests**

Add to `offlineFeatures.test.mjs`:

```js
test('archive provides collection and research tabs with a shared selected dish', () => {
  const archive = read('src/offline/exhibits/ArchiveExhibit.jsx');
  assert.match(archive, /馆藏档案/);
  assert.match(archive, /互动研究/);
  assert.match(archive, /selectedDishId/);
  assert.match(archive, /ResearchLab/);
});

test('research tools inherit the selected dish', () => {
  const mentor = read('src/offline/exhibits/MentorExhibit.jsx');
  const evolution = read('src/offline/exhibits/EvolutionExhibit.jsx');
  const play = read('src/offline/exhibits/PlayExhibit.jsx');
  assert.match(mentor, /selectedDishId/);
  assert.match(evolution, /selectedDishId/);
  assert.match(play, /selectedDishId/);
});

test('archive images remain lazy and only render in visible list or selected detail', () => {
  const archive = read('src/offline/exhibits/ArchiveExhibit.jsx');
  assert.match(archive, /loading="lazy"/);
  assert.doesNotMatch(archive, /museumDishes\.map[\s\S]*<img[\s\S]*museumDishes\.map/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test frontend/src/offline/__tests__/offlineFeatures.test.mjs`  
Expected: FAIL because `ResearchLab` and selected-dish props do not exist.

- [ ] **Step 3: Rebuild the archive composition**

Read selection and tabs from `useMuseumSession`. Render segmented `馆藏档案` and `互动研究` controls. For collection mode, keep the existing filter logic but render one button per dish in a chronological list with dynasty marker, name, region, technique, and textual archive state. Render an image only for the selected detail and for the first six visible list rows; all images use `loading="lazy"` and explicit `width` plus `height`.

Use this selection action:

```js
const selectDish = (dishId) => dispatch({ type: 'selectDish', dishId });
```

When no filtered result exists, preserve the current explicit empty state. The selected detail remains adjacent on desktop and becomes a full-width section below the list on mobile.

- [ ] **Step 4: Create `ResearchLab`**

Use one segmented control and keep every tool mounted only when selected:

```jsx
const TOOLS = [
  { key: 'mentor', label: '考据问答' },
  { key: 'evolution', label: '风味进化' },
  { key: 'play', label: '互动任务' },
];

export default function ResearchLab({ selectedDishId }) {
  const { state, dispatch } = useMuseumSession();
  return (
    <section className="research-lab" aria-label="互动研究">
      <nav className="segmented-control" aria-label="研究工具">
        {TOOLS.map((tool) => <button key={tool.key} type="button" aria-pressed={state.researchTool === tool.key} onClick={() => dispatch({ type: 'setResearchTool', tool: tool.key })}>{tool.label}</button>)}
      </nav>
      {state.researchTool === 'mentor' && <MentorExhibit embedded selectedDishId={selectedDishId} />}
      {state.researchTool === 'evolution' && <EvolutionExhibit embedded selectedDishId={selectedDishId} />}
      {state.researchTool === 'play' && <PlayExhibit embedded selectedDishId={selectedDishId} />}
    </section>
  );
}
```

- [ ] **Step 5: Adapt the three tools without duplicating shells**

Each tool accepts `embedded = false` and `selectedDishId`. When embedded, return only its content; otherwise keep `ExhibitShell` for compatibility until obsolete routes are removed.

For mentor answers, derive safe archive facts from the selected dish:

```js
function buildSelectedDishAnswer(dish) {
  return {
    question: `${dish.name}有哪些可核验信息？`,
    answer: `${dish.name}的馆藏记录标注为${dish.archiveState}。现有字段支持朝代${dish.dynasty}、地域${dish.region}与技法${dish.technique || '待补'}；未记录内容不作确定推断。`,
    source: dish.source ? `${dish.source} · 离线馆藏` : '离线馆藏 · 资料待补',
  };
}
```

For evolution, initialize parent A from `selectedDishId` and only ask for parent B. For play, initialize the certificate dish name and ancestor description from the selected dish without persisting the uploaded image.

- [ ] **Step 6: Add archive and research styles**

Use an unframed two-column collection layout, a real vertical dynasty rule, dense list rows, and a warm-paper selected detail. Research tools use the same paper surface and segmented control; remove nested card backgrounds. At mobile width, filters become a two-row grid and the detail follows the list.

- [ ] **Step 7: Import styles and run tests**

Import `archive.css` and `research.css` from `main.jsx`.

Run: `npm run test:offline`  
Expected: all offline tests PASS.

Run: `npm run build:offline`  
Expected: the offline file builds successfully.

Run: `npm run verify:offline:bundle`  
Expected: PASS under the byte limit.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/offline/exhibits/ResearchLab.jsx frontend/src/offline/exhibits/ArchiveExhibit.jsx frontend/src/offline/exhibits/MentorExhibit.jsx frontend/src/offline/exhibits/EvolutionExhibit.jsx frontend/src/offline/exhibits/PlayExhibit.jsx frontend/src/offline/styles/archive.css frontend/src/offline/styles/research.css frontend/src/offline/main.jsx frontend/src/offline/__tests__/offlineFeatures.test.mjs
git commit -m "feat: unify archive and interactive research"
```

### Task 8: Reframe Commercial Value as a Museum Pilot Specification

**Files:**
- Modify: `frontend/src/offline/exhibits/BusinessExhibit.jsx`
- Create: `frontend/src/offline/styles/partnership.css`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/__tests__/offlineRestoration.test.mjs`

- [ ] **Step 1: Write the partnership-content test**

Add:

```js
test('partnership exhibit uses a specification and implementation timeline', () => {
  const source = read('src/offline/exhibits/BusinessExhibit.jsx');
  for (const label of ['展项规格', '实施时间轴', '适用设备', '交付内容', '评估指标', '2–4 周']) {
    assert.match(source, new RegExp(label));
  }
  assert.doesNotMatch(source, /business-grid/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test frontend/src/offline/__tests__/offlineRestoration.test.mjs`  
Expected: FAIL because the current page still uses `business-grid`.

- [ ] **Step 3: Recompose the partnership exhibit**

Use `museumOffer` as the only source. Render a literal heading `把这套复原体验带进博物馆`, a semantic specification table for device, purpose, deployment mode, and content boundary, then a four-step ordered timeline:

```jsx
const PILOT_STEPS = [
  ['第 1 周', '标杆菜与文献范围确认'],
  ['第 2 周', '证据档案与互动原型'],
  ['第 3 周', '展台适配与研学内容'],
  ['第 4 周', '现场验证与指标基线'],
];
```

Follow it with deliverables and metrics as plain definition lists. End with `返回复原结论` and `浏览馆藏资产` commands. Do not include a contact form or invented pricing.

- [ ] **Step 4: Style as an exhibit specification**

Use full-width bands, a table with visible row separators, and a horizontal timeline that stacks below `760px`. Do not place cards inside cards. Import `partnership.css` in `main.jsx`.

- [ ] **Step 5: Run tests and build**

Run: `node --test frontend/src/offline/__tests__/offlineRestoration.test.mjs`  
Expected: PASS.

Run: `npm run build:offline`  
Expected: the offline file builds successfully.

Run: `npm run verify:offline:bundle`  
Expected: PASS under the byte limit.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline/exhibits/BusinessExhibit.jsx frontend/src/offline/styles/partnership.css frontend/src/offline/main.jsx frontend/src/offline/__tests__/offlineRestoration.test.mjs
git commit -m "feat: present museum pilot specification"
```

### Task 9: Add Recovery States, Print Fallbacks, and Accessibility Gates

**Files:**
- Create: `frontend/src/offline/components/OfflineErrorBoundary.jsx`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/styles/tokens.css`
- Modify: `frontend/src/offline/styles/responsive.css`
- Modify: `frontend/src/offline/__tests__/offlineDesign.test.mjs`

- [ ] **Step 1: Add failure and accessibility contract tests**

Append:

```js
test('offline entry is protected by a dedicated recoverable error boundary', () => {
  const main = read('src/offline/main.jsx');
  const boundary = read('src/offline/components/OfflineErrorBoundary.jsx');
  assert.match(main, /OfflineErrorBoundary/);
  assert.match(boundary, /恢复当前展厅/);
  assert.match(boundary, /返回首页/);
  assert.doesNotMatch(boundary, /window\.location\.href\s*=\s*['"]\//);
});

test('responsive styles cover reduced motion, mobile safe area, and print', () => {
  const source = read('src/offline/styles/responsive.css');
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /@media print/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test frontend/src/offline/__tests__/offlineDesign.test.mjs`  
Expected: FAIL because the boundary does not exist.

- [ ] **Step 3: Implement the offline error boundary**

Create a class component that remounts children through `resetKey` and returns home without a server path:

```jsx
import { Component } from 'react';
import { clearProgress } from '../lib/progressStore.js';

export default class OfflineErrorBoundary extends Component {
  state = { error: null, resetKey: 0 };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('离线展厅错误:', error); }
  recover = () => this.setState(({ resetKey }) => ({ error: null, resetKey: resetKey + 1 }));
  returnHome = () => { clearProgress(); window.location.reload(); };
  render() {
    if (this.state.error) {
      return (
        <main className="offline-failure" role="alert">
          <p>当前展厅未能继续运行，馆藏数据仍保存在本机。</p>
          <button type="button" onClick={this.recover}>恢复当前展厅</button>
          <button type="button" onClick={this.returnHome}>返回首页</button>
        </main>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
```

Wrap `MuseumSessionProvider` and `OfflineApp` with this boundary in `main.jsx`.

- [ ] **Step 4: Complete reduced-motion, focus, print, and safe-area styles**

In reduced-motion mode, set animation and transition duration to `0.01ms`, and disable scene auto-rotation through the existing JavaScript media query. In print mode, hide navigation, canvas controls, workbench commands, and interactive tabs; print `RestorationReport` on a white background with black text. Ensure every interactive control has a visible `:focus-visible` state.

- [ ] **Step 5: Run design, lint, and build tests**

Run: `npm run test:offline`  
Expected: PASS.

Run: `npm run lint`  
Expected: PASS with no React hook errors.

Run: `npm run build` and `npm run build:offline`  
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline/components/OfflineErrorBoundary.jsx frontend/src/offline/main.jsx frontend/src/offline/styles/tokens.css frontend/src/offline/styles/responsive.css frontend/src/offline/__tests__/offlineDesign.test.mjs
git commit -m "feat: add offline recovery and accessibility states"
```

### Task 10: Add Repeatable Browser and Canvas Verification

**Files:**
- Create: `scripts/verify_offline_ui.mjs`
- Create: `scripts/__tests__/verify_offline_ui.test.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write pure verification-helper tests**

Create `scripts/__tests__/verify_offline_ui.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { findOverlaps, hasPixelVariance } from '../verify_offline_ui.mjs';

test('findOverlaps reports intersecting visible controls', () => {
  const controls = [
    { name: 'a', left: 0, top: 0, right: 40, bottom: 40, visible: true },
    { name: 'b', left: 20, top: 20, right: 60, bottom: 60, visible: true },
  ];
  assert.deepEqual(findOverlaps(controls), [['a', 'b']]);
});

test('hasPixelVariance rejects blank canvas samples', () => {
  assert.equal(hasPixelVariance({ channels: [{ stdev: 0 }, { stdev: 0 }, { stdev: 0 }] }), false);
  assert.equal(hasPixelVariance({ channels: [{ stdev: 12 }, { stdev: 7 }, { stdev: 3 }] }), true);
});
```

- [ ] **Step 2: Run and confirm module-not-found failure**

Run: `node --test scripts/__tests__/verify_offline_ui.test.mjs`  
Expected: FAIL because `verify_offline_ui.mjs` does not exist.

- [ ] **Step 3: Install browser automation without bundling a browser into the app**

Run from `frontend`: `npm install --save-dev playwright@1.55.0`  
Expected: Playwright appears only in `devDependencies`; the offline runtime bundle remains unchanged.

- [ ] **Step 4: Implement pure helpers and browser target selection**

Export these helpers from `scripts/verify_offline_ui.mjs`:

```js
export function findOverlaps(items) {
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const a = items[leftIndex];
      const b = items[rightIndex];
      if (!a.visible || !b.visible) continue;
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (width * height > 4) overlaps.push([a.name, b.name]);
    }
  }
  return overlaps;
}

export function hasPixelVariance(stats) {
  return stats.channels.slice(0, 3).some((channel) => channel.stdev > 2);
}
```

When executed directly, read `frontend/dist-offline/offline.html` as a file URL. Run `msedge` and `chrome` channels by default; allow `OFFLINE_BROWSER_CHANNELS=msedge` for a focused local run, but the release command in Task 11 must use both.

- [ ] **Step 5: Automate the complete judge path**

For each browser and viewport `1440x900`, `1280x720`, and `390x844`, the script must:

1. Listen for console errors, page errors, and any request whose protocol is not `file:` or `data:`.
2. Open the built file and assert `风味考古局`, `开始可信复原`, and a nonzero canvas rectangle.
3. Save a screenshot under `artifacts/offline-ui/<browser>-<viewport>-home.png`.
4. Click `开始可信复原`, load the preset clue, and complete all five stages with `data-testid="restoration-next"`.
5. Select each of the three evidence annotations and assert the inspector quote changes.
6. Toggle structure explode, historical mode, and modern mode.
7. Visit the archive, select `dish_012`, open `互动研究`, and verify the selected dish appears in mentor, evolution, and certificate contexts.
8. Visit the partnership exhibit and assert the 2–4 week timeline.
9. Collect visible button/input rectangles and fail on overlap or horizontal document overflow.
10. Screenshot the canvas element and use Sharp stats with `hasPixelVariance` to reject a blank render.

Run a second page with this initialization before app code to force fallback:

```js
await context.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function patched(type, options) {
    if (String(type).startsWith('webgl')) return null;
    return original.call(this, type, options);
  };
});
```

Assert the fallback figure, three evidence buttons, model mode controls, and final report remain usable.

- [ ] **Step 6: Add scripts and ignore generated screenshots**

Add to `frontend/package.json`:

```json
"verify:offline:ui": "node ../scripts/verify_offline_ui.mjs"
```

Add `artifacts/offline-ui/` to `.gitignore`.

- [ ] **Step 7: Run helper and focused Edge verification**

Run: `node --test scripts/__tests__/verify_offline_ui.test.mjs`  
Expected: PASS.

Run from `frontend` in PowerShell: `$env:OFFLINE_BROWSER_CHANNELS='msedge'; npm run verify:offline:ui`  
Expected: all three viewports and fallback PASS, screenshots are nonblank, and no overlap/network/console error is reported.

- [ ] **Step 8: Commit**

```bash
git add scripts/verify_offline_ui.mjs scripts/__tests__/verify_offline_ui.test.mjs frontend/package.json frontend/package-lock.json .gitignore
git commit -m "test: verify offline museum in real browsers"
```

### Task 11: Remove Obsolete Offline UI and Consolidate Styles

**Files:**
- Delete: `frontend/src/offline/components/MuseumHeader.jsx`
- Delete: `frontend/src/offline/components/ExhibitShell.jsx` if no compatibility caller remains
- Delete: `frontend/src/offline/components/EvidenceDrawer.jsx`
- Modify: `frontend/src/offline/offline.css`
- Modify: `frontend/src/offline/main.jsx`
- Modify: `frontend/src/offline/OfflineApp.jsx`
- Modify: `frontend/src/offline/__tests__/offlineShell.test.mjs`
- Modify: `frontend/src/offline/__tests__/offlineFeatures.test.mjs`

- [ ] **Step 1: Write an obsolete-surface test**

Add to `offlineShell.test.mjs`:

```js
test('offline app has no obsolete museum menu or evidence drawer', () => {
  const app = read('src/offline/OfflineApp.jsx');
  assert.doesNotMatch(app, /MuseumHeader|EvidenceDrawer|exploreOpen/);
  assert.match(app, /MuseumShell/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure before cleanup**

Run: `node --test frontend/src/offline/__tests__/offlineShell.test.mjs`  
Expected: FAIL if any obsolete import remains.

- [ ] **Step 3: Remove dead components and routes**

Use `rg "MuseumHeader|ExhibitShell|EvidenceDrawer|activeExhibit === 'mentor'|activeExhibit === 'evolution'|activeExhibit === 'play'" frontend/src/offline` to locate callers. Delete a component only after the search shows no caller. Remove obsolete mentor/evolution/play top-level routes because `ResearchLab` now owns them.

- [ ] **Step 4: Retire the monolithic stylesheet**

Move any still-used rule from `offline.css` into the responsibility-specific style file, then remove its import from `main.jsx`. Delete `offline.css` if `rg "offline.css" frontend/src` returns no import. Run a class-name audit:

```powershell
rg -o 'className="[^"]+' frontend/src/offline | Sort-Object -Unique
```

For every class still referenced by JSX, confirm it has a rule or intentionally inherits base styles. Remove unused old selectors rather than carrying both visual systems.

- [ ] **Step 5: Run lint, all frontend tests, and both builds**

Run from `frontend`:

```powershell
npm run lint
npm test
npm run build
npm run build:offline
npm run verify:offline:bundle
```

Expected: every command exits `0`; the online build remains valid and the offline file remains below `3,000,000` bytes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline
git commit -m "refactor: remove obsolete offline museum surfaces"
```

### Task 12: Integrate Release Gates and Produce the Verified Package

**Files:**
- Modify: `scripts/verify-all.ps1`
- Modify: `docs/competition/verification-report.md`
- Regenerate but do not commit unless explicitly requested: `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`
- Regenerate but do not commit unless explicitly requested: `release/风味考古局-TRAE初赛.zip`

- [ ] **Step 1: Add offline commands to the full quality gate**

Add required `Invoke-Step` blocks after the normal frontend build:

```powershell
Invoke-Step "Offline frontend build" {
  Push-Location (Join-Path $Root 'frontend')
  try { npm run build:offline }
  finally { Pop-Location }
}

Invoke-Step "Offline bundle verification" {
  Push-Location (Join-Path $Root 'frontend')
  try { npm run verify:offline:bundle }
  finally { Pop-Location }
}

Invoke-Step "Offline UI verification" {
  Push-Location (Join-Path $Root 'frontend')
  try { npm run verify:offline:ui }
  finally { Pop-Location }
}
```

Do not mark these steps optional.

- [ ] **Step 2: Run focused gates before the full repository suite**

Run from `frontend`:

```powershell
npm run lint
npm test
npm run build
npm run build:offline
npm run verify:offline:bundle
$env:OFFLINE_BROWSER_CHANNELS='msedge,chrome'
npm run verify:offline:ui
```

Expected: all commands PASS, both browser channels complete all viewports, fallback passes, and final size is at most `3,000,000` bytes. If a stable browser is not installed, record that as a blocking verification gap; do not claim cross-browser completion.

- [ ] **Step 3: Run repository-wide verification**

Run: `powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1`  
Expected: backend, frontend, offline, Python, data, asset, and Docker configuration gates all PASS.

- [ ] **Step 4: Rebuild the release package**

Run: `powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1`  
Expected: the package script rebuilds, enforces the byte limit, creates the Chinese-named HTML plus usage instructions, and writes the ZIP.

- [ ] **Step 5: Test the packaged file from a path containing Chinese characters and spaces**

Extract the ZIP to a temporary directory named `风味考古局 离线验收`, open the packaged HTML in Edge and Chrome with the same UI verification script using an `OFFLINE_HTML_PATH` override, and complete the main path. Expected: no missing resources, network calls, console errors, or path failures.

- [ ] **Step 6: Update the verification report honestly**

Record in `docs/competition/verification-report.md`:

- final HTML byte count and limit;
- offline test count;
- online build result;
- Edge and Chrome versions actually tested;
- desktop/mobile viewports;
- WebGL normal and forced-fallback results;
- network, console, overflow, overlap, and canvas-pixel results;
- exact release ZIP path;
- statement that Codex work is not TRAE task evidence.

Do not add a TRAE Session ID or TRAE screenshot for this optimization.

- [ ] **Step 7: Commit the gates and verification report**

```bash
git add scripts/verify-all.ps1 docs/competition/verification-report.md
git commit -m "docs: record optimized offline museum verification"
```

- [ ] **Step 8: Final worktree audit**

Run: `git status --short`  
Expected: only the user's pre-existing changes and intentionally untracked generated release/artifact files remain. No source file from this plan is left uncommitted.

## Final Acceptance Checklist

- [ ] `offline.html` is one self-contained file and no larger than `3,000,000` bytes.
- [ ] The first viewport signals the brand, actual artifact, core evidence, and next section.
- [ ] The five-step workbench retains one continuous 3D artifact and one evidence inspector.
- [ ] Historical and modern modes, explode, reset, three hotspots, and reduced motion work.
- [ ] The 2.5D fallback completes the same evidence and result path.
- [ ] All 40 dishes remain searchable, filterable, and honest about archive state.
- [ ] Mentor, evolution, play, and certificate inherit the selected dish.
- [ ] The partnership exhibit presents device, deliverable, timeline, and metric specifications.
- [ ] Edge and Chrome pass desktop, compact desktop, and mobile viewports with no overlap or overflow.
- [ ] Canvas screenshots have nonblank pixel variance and are correctly framed.
- [ ] Runtime performs no network request and reports no unhandled console error.
- [ ] The original online frontend still lints, tests, and builds.
- [ ] Codex changes are documented separately from TRAE evidence.
