# Curation Case Fusion Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the offline home into a museum curation commission that exposes the real dish-fusion workflow and carries judges from evidence restoration to a reusable digital exhibit.

**Architecture:** Keep the existing four-exhibit shell and Three.js stage. Add one focused `FeaturedFusion` presentation component, one atomic session action for opening the featured fusion, and shared secondary-parent state in `EvolutionExhibit`; then rebuild the home composition and validate the packaged `file:` experience in both supported browsers.

**Tech Stack:** React 19, Three.js, Lucide React, CSS, Node test runner, Vite single-file build, Playwright, Sharp, PowerShell packaging.

---

## File Map

- Create `frontend/src/offline/components/FeaturedFusion.jsx`: derive and display the featured fusion from existing museum data and `fuseDishes`.
- Modify `frontend/src/offline/state/museumSession.js`: add the atomic `openFusion` action and keep the second parent in shared state.
- Modify `frontend/src/offline/exhibits/EvolutionExhibit.jsx`: read and update `secondaryDishId` through the museum session.
- Modify `frontend/src/offline/exhibits/HomeExhibit.jsx`: compose the commission brief, Three.js artifact, featured fusion, and four-step outcome chain.
- Modify `frontend/src/offline/styles/home.css`: implement the archival commission layout, entrance sequence, desktop/tablet/mobile framing, and image fallback.
- Modify `frontend/src/offline/styles/research.css`: style the preselected fusion state without changing the research tool structure.
- Modify `frontend/src/offline/__tests__/museumSession.test.mjs`: verify the atomic navigation state.
- Modify `frontend/src/offline/__tests__/offlineRestoration.test.mjs`: replace the old home contract with the curation-case contract.
- Modify `frontend/src/offline/__tests__/offlineFeatures.test.mjs`: verify that the featured component uses real local data and the fusion engine.
- Modify `scripts/verify_offline_ui.mjs`: exercise the home fusion shortcut and continue through the existing end-to-end journey.
- Update `docs/competition/trae-initial-round-post.md`, `docs/competition/verification-report.md`, and `docs/competition/trae-submission-checklist.md` only after fresh verification.
- Regenerate `frontend/dist-offline/offline.html`, `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`, `release/风味考古局-TRAE初赛.zip`, and `docs/competition/screenshots/product-final.png` through existing scripts.

### Task 1: Atomic Fusion Navigation And Shared Parents

**Files:**
- Modify: `frontend/src/offline/__tests__/museumSession.test.mjs`
- Modify: `frontend/src/offline/state/museumSession.js`
- Modify: `frontend/src/offline/__tests__/offlineFeatures.test.mjs`
- Modify: `frontend/src/offline/exhibits/EvolutionExhibit.jsx`

- [ ] **Step 1: Write the failing reducer test**

Append this test to `museumSession.test.mjs`:

```js
test('opening the featured fusion configures the complete research destination atomically', () => {
  const state = museumSessionReducer(INITIAL_SESSION, { type: 'openFusion' });
  assert.deepEqual(
    {
      activeExhibit: state.activeExhibit,
      archiveTab: state.archiveTab,
      researchTool: state.researchTool,
      selectedDishId: state.selectedDishId,
      secondaryDishId: state.secondaryDishId,
    },
    {
      activeExhibit: 'archive',
      archiveTab: 'research',
      researchTool: 'evolution',
      selectedDishId: 'dish_001',
      secondaryDishId: 'dish_003',
    },
  );
});
```

- [ ] **Step 2: Run the reducer test and verify RED**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/museumSession.test.mjs
```

Expected: FAIL because `openFusion` currently falls through to the unchanged home state.

- [ ] **Step 3: Implement the atomic reducer action**

Insert this case before `navigate` in `museumSessionReducer`:

```js
case 'openFusion':
  return {
    ...state,
    activeExhibit: 'archive',
    archiveTab: 'research',
    researchTool: 'evolution',
    selectedDishId: 'dish_001',
    secondaryDishId: 'dish_003',
  };
```

Keep the existing `selectSecondaryDish` case; it already accepts either a dish ID or `null`.

- [ ] **Step 4: Run the reducer test and verify GREEN**

Run the command from Step 2.

Expected: all tests in `museumSession.test.mjs` PASS.

- [ ] **Step 5: Write the failing shared-parent component contract**

Append this test to `offlineFeatures.test.mjs`:

```js
test('evolution keeps the second parent in the shared museum session', () => {
  const evolution = read('src/offline/exhibits/EvolutionExhibit.jsx');
  assert.match(evolution, /useMuseumSession/);
  assert.match(evolution, /state\.secondaryDishId/);
  assert.match(evolution, /type:\s*'selectSecondaryDish'/);
  assert.doesNotMatch(evolution, /useState\(''\)/);
});
```

- [ ] **Step 6: Run the feature test and verify RED**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineFeatures.test.mjs
```

Expected: FAIL because `EvolutionExhibit` still owns `parentBId` in local state.

- [ ] **Step 7: Move the second parent into shared state**

In `EvolutionExhibit.jsx`, replace the React state import and local parent state with:

```jsx
import { useMemo, useState } from 'react';
import { useMuseumSession } from '../state/useMuseumSession.js';

// Inside EvolutionExhibit:
const { state, dispatch } = useMuseumSession();
const [result, setResult] = useState(null);
const parentBId = state.secondaryDishId || '';
const setParentBId = (dishId) => dispatch({
  type: 'selectSecondaryDish',
  dishId: dishId || null,
});
```

Use these exact event handlers:

```jsx
onChange={(event) => {
  setParentBId(event.target.value);
  setResult(null);
}}
```

```jsx
onClick={() => {
  setParentBId('');
  setResult(null);
}}
```

Do not change `fuseDishes`, the parent A calculation, or the explicit/fallback rule behavior.

- [ ] **Step 8: Run the focused offline tests**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/museumSession.test.mjs src/offline/__tests__/offlineFeatures.test.mjs
```

Expected: both files PASS with no warnings.

- [ ] **Step 9: Commit the state slice**

```powershell
git add -- frontend/src/offline/state/museumSession.js frontend/src/offline/exhibits/EvolutionExhibit.jsx frontend/src/offline/__tests__/museumSession.test.mjs frontend/src/offline/__tests__/offlineFeatures.test.mjs
git commit -m "feat: open featured dish fusion atomically"
```

### Task 2: Featured Fusion Component Backed By Real Rules

**Files:**
- Create: `frontend/src/offline/components/FeaturedFusion.jsx`
- Modify: `frontend/src/offline/__tests__/offlineFeatures.test.mjs`

- [ ] **Step 1: Write the failing component contract**

Append this test to `offlineFeatures.test.mjs`:

```js
test('featured fusion derives its proposal from local dishes and the fusion engine', () => {
  const featuredPath = resolve(root, 'src/offline/components/FeaturedFusion.jsx');
  assert.equal(existsSync(featuredPath), true, 'FeaturedFusion component must exist');
  const featured = read('src/offline/components/FeaturedFusion.jsx');
  for (const contract of [
    /museumDishes/,
    /fuseDishes\('dish_001',\s*'dish_003'\)/,
    /查看融合推演/,
    /待专家复核/,
    /featured-fusion-parent/,
  ]) {
    assert.match(featured, contract);
  }
  assert.doesNotMatch(featured, /fetch\(|axios|apiRequest/);
});
```

Add `existsSync` to the test file's existing `node:fs` import:

```js
import { existsSync, readFileSync } from 'node:fs';
```

- [ ] **Step 2: Run the feature test and verify RED**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineFeatures.test.mjs
```

Expected: FAIL with `FeaturedFusion component must exist`; the test must not fail from a syntax or file-read error.

- [ ] **Step 3: Create the featured fusion component**

Create `FeaturedFusion.jsx` with this implementation:

```jsx
import { ArrowRight, GitMerge } from 'lucide-react';
import { museumDishes } from '../data/offlineMuseumData.js';
import { fuseDishes } from '../lib/fusionEngine.js';

const parentIds = ['dish_001', 'dish_003'];
const parents = parentIds.map((id) => museumDishes.find((dish) => dish.id === id));
const featuredResult = fuseDishes('dish_001', 'dish_003');

function FusionParent({ dish, label }) {
  if (!dish) return null;
  return (
    <figure className="featured-fusion-parent">
      <div className="featured-fusion-image-wrap">
        <img
          src={dish.image}
          alt={dish.name}
          width="320"
          height="180"
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.parentElement?.classList.add('is-image-missing');
          }}
        />
      </div>
      <figcaption>
        <span>{label}</span>
        <strong>{dish.name}</strong>
        <small>{dish.dynasty} · {dish.technique}</small>
      </figcaption>
    </figure>
  );
}

export default function FeaturedFusion({ onOpen }) {
  return (
    <section className="featured-fusion" aria-labelledby="featured-fusion-title">
      <header className="featured-fusion-heading">
        <span><GitMerge aria-hidden="true" size={16} /> 衍生展项提案</span>
        <strong>待专家复核</strong>
      </header>
      <div className="featured-fusion-equation" aria-label="蟹酿橙与玉糁羹融合">
        <FusionParent dish={parents[0]} label="父本 A" />
        <span className="featured-fusion-plus" aria-hidden="true">×</span>
        <FusionParent dish={parents[1]} label="父本 B" />
      </div>
      <div className="featured-fusion-result">
        <span>融合结果 001</span>
        <h2 id="featured-fusion-title">{featuredResult.resultName}</h2>
        <p>{featuredResult.description}</p>
        <dl>
          <div><dt>继承</dt><dd>橙香蟹鲜 · 米羹结构</dd></div>
          <div><dt>用途</dt><dd>数字展项 · 研学试作</dd></div>
        </dl>
      </div>
      <button type="button" className="featured-fusion-command" onClick={onOpen}>
        <span>查看融合推演</span>
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run rule and component tests**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineRules.test.mjs src/offline/__tests__/offlineFeatures.test.mjs
```

Expected: PASS, including the existing deterministic offline-rule assertions.

- [ ] **Step 5: Commit the featured fusion component**

```powershell
git add -- frontend/src/offline/components/FeaturedFusion.jsx frontend/src/offline/__tests__/offlineFeatures.test.mjs
git commit -m "feat: present a traceable featured fusion"
```

### Task 3: Curation Commission Home Composition

**Files:**
- Modify: `frontend/src/offline/__tests__/offlineRestoration.test.mjs`
- Modify: `frontend/src/offline/exhibits/HomeExhibit.jsx`

- [ ] **Step 1: Replace the old home contract with a failing curation contract**

Replace the existing `home presents one primary action...` test with:

```js
test('home presents a curation commission from restoration to new life', () => {
  const homeSource = read('src/offline/exhibits/HomeExhibit.jsx');
  for (const label of [
    '策展委托',
    '风味考古局',
    '从复原到新生',
    '接手这宗风味案',
    '古籍线索',
    '证据复原',
    '菜品融合',
    '数字展项',
  ]) {
    assert.match(homeSource, new RegExp(label));
  }
  assert.match(homeSource, /FeaturedFusion/);
  assert.match(homeSource, /type:\s*'openFusion'/);
  assert.match(homeSource, /variant="hero"/);
  assert.doesNotMatch(homeSource, /AI平台|智能助手|浏览风味馆藏/);
});
```

- [ ] **Step 2: Run the restoration test and verify RED**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineRestoration.test.mjs
```

Expected: FAIL because the current home has the old proposition and does not import `FeaturedFusion`.

- [ ] **Step 3: Replace the home composition**

Replace `HomeExhibit.jsx` with:

```jsx
import { ArrowRight, FileSearch } from 'lucide-react';
import CrabOrangeStage from '../components/CrabOrangeStage.jsx';
import FeaturedFusion from '../components/FeaturedFusion.jsx';
import { useMuseumSession } from '../state/useMuseumSession.js';

const OUTCOME_STEPS = ['古籍线索', '证据复原', '菜品融合', '数字展项'];

export default function HomeExhibit({ onNavigate }) {
  const { state, dispatch } = useMuseumSession();

  return (
    <section className="museum-home" aria-labelledby="museum-home-title">
      <div className="home-artifact" aria-label="蟹酿橙数字藏品">
        <CrabOrangeStage
          variant="hero"
          selectedEvidenceId={state.selectedEvidenceId}
          modelMode={state.modelMode}
          exploded={state.exploded}
          onEvidenceSelect={(evidence) => dispatch({
            type: 'selectEvidence',
            evidenceId: evidence.id,
          })}
          onModelModeChange={(mode) => dispatch({ type: 'setModelMode', mode })}
          onExplodedChange={(value) => dispatch({ type: 'setExploded', value })}
        />
      </div>

      <article className="home-commission">
        <header className="home-commission-heading">
          <span><FileSearch aria-hidden="true" size={16} /> 策展委托</span>
          <strong>CASE · SC-001</strong>
        </header>
        <p className="home-kicker">南宋饮食文化数字展项</p>
        <h1 id="museum-home-title">风味考古局</h1>
        <p className="home-proposition">从复原到新生</p>
        <p className="home-commission-copy">
          委托方：非遗馆策展组。依据《山家清供》复原蟹酿橙，
          并将可信古菜转化为可互动、可衍生的数字展项。
        </p>
        <button type="button" className="command-primary" onClick={() => onNavigate('restore')}>
          <span>接手这宗风味案</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </article>

      <aside className="home-fusion-panel">
        <FeaturedFusion onOpen={() => dispatch({ type: 'openFusion' })} />
      </aside>

      <footer className="home-outcome-chain" aria-label="策展交付流程">
        <blockquote>“以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟。”</blockquote>
        <ol>
          {OUTCOME_STEPS.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </footer>
    </section>
  );
}
```

- [ ] **Step 4: Run the restoration test and verify GREEN**

Run the command from Step 2.

Expected: all tests in `offlineRestoration.test.mjs` PASS.

- [ ] **Step 5: Run ESLint on the changed JSX before styling**

Run:

```powershell
cd frontend
npx eslint src/offline/exhibits/HomeExhibit.jsx src/offline/components/FeaturedFusion.jsx src/offline/exhibits/EvolutionExhibit.jsx
```

Expected: exit code 0 with no warnings.

- [ ] **Step 6: Commit the semantic home**

```powershell
git add -- frontend/src/offline/exhibits/HomeExhibit.jsx frontend/src/offline/__tests__/offlineRestoration.test.mjs
git commit -m "feat: frame the home as a curation commission"
```

### Task 4: Archival Visual System And Responsive Layout

**Files:**
- Modify: `frontend/src/offline/__tests__/offlineDesign.test.mjs`
- Modify: `frontend/src/offline/styles/home.css`
- Modify: `frontend/src/offline/styles/research.css`

- [ ] **Step 1: Write the failing visual contract**

Append this test to `offlineDesign.test.mjs`:

```js
test('curation home has stable commission, fusion, motion, and mobile regions', () => {
  const home = read('src/offline/styles/home.css');
  for (const contract of [
    /\.home-commission\s*{/,
    /\.home-fusion-panel\s*{/,
    /\.featured-fusion-equation\s*{/,
    /\.home-outcome-chain\s*{/,
    /@keyframes\s+commission-arrival/,
    /@media\s*\(max-width:\s*760px\)/,
    /grid-template-areas/,
  ]) {
    assert.match(home, contract);
  }
});
```

- [ ] **Step 2: Run the design test and verify RED**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineDesign.test.mjs
```

Expected: FAIL because the new layout selectors and entrance animation do not exist.

- [ ] **Step 3: Rebuild `home.css` around named regions**

Keep the existing `.crab-orange-stage-hero`, WebGL/fallback hotspot, and control positioning rules. Replace the old overlay/next-signal layout with these exact structural rules, then add detailed typography, borders, hover states, and image fallback under the same selectors:

```css
.museum-home {
  position: relative;
  display: grid;
  min-height: calc(100svh - var(--topbar-height));
  grid-template-areas:
    "commission artifact fusion"
    "outcome outcome outcome";
  grid-template-columns: minmax(19rem, 0.78fr) minmax(28rem, 1.35fr) minmax(20rem, 0.87fr);
  grid-template-rows: minmax(40rem, calc(100svh - var(--topbar-height) - 8.5rem)) auto;
  overflow: hidden;
  isolation: isolate;
  background: var(--ink-950);
}

.home-artifact { grid-area: artifact; min-width: 0; overflow: hidden; }
.home-commission { grid-area: commission; z-index: 5; align-self: center; padding: 2rem; }
.home-fusion-panel { grid-area: fusion; z-index: 5; align-self: stretch; min-width: 0; border-left: 1px solid var(--line-dark); }
.home-outcome-chain { grid-area: outcome; z-index: 6; min-height: 8.5rem; }

.home-commission,
.home-fusion-panel,
.home-outcome-chain {
  animation: commission-arrival 620ms both;
}

.home-fusion-panel { animation-delay: 220ms; }
.home-outcome-chain { animation-delay: 420ms; }

@keyframes commission-arrival {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

.featured-fusion-equation {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.5rem minmax(0, 1fr);
  gap: 0.5rem;
  align-items: center;
}

.featured-fusion-image-wrap {
  min-height: 5.5rem;
  overflow: hidden;
  background: var(--ink-800);
}

.featured-fusion-image-wrap img {
  display: block;
  width: 100%;
  height: 5.5rem;
  object-fit: cover;
}

.featured-fusion-image-wrap.is-image-missing::after {
  display: grid;
  min-height: 5.5rem;
  place-items: center;
  color: var(--paper-200);
  content: '馆藏图像待恢复';
}

.home-outcome-chain {
  display: grid;
  grid-template-columns: minmax(18rem, 0.9fr) minmax(32rem, 1.4fr);
  gap: 2rem;
  align-items: center;
  padding: 1.25rem 2rem;
  border-top: 1px solid var(--line-paper);
  color: var(--ink-950);
  background: var(--paper-100);
}

.home-outcome-chain ol {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 1100px) {
  .museum-home {
    grid-template-areas:
      "commission artifact"
      "fusion fusion"
      "outcome outcome";
    grid-template-columns: minmax(18rem, 0.8fr) minmax(26rem, 1.2fr);
    grid-template-rows: minmax(36rem, 1fr) auto auto;
  }
}

@media (max-width: 760px) {
  .museum-home {
    min-height: auto;
    grid-template-areas: "commission" "artifact" "fusion" "outcome";
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 33rem auto auto;
    overflow: clip;
  }

  .home-commission { padding: 1.25rem 1rem; }
  .home-fusion-panel { border-top: 1px solid var(--line-dark); border-left: 0; }
  .home-outcome-chain { grid-template-columns: 1fr; padding: 1rem; }
  .home-outcome-chain ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

Required detailed rules in the same edit:

- `.home-commission-heading` and `.featured-fusion-heading` are flex rows with stable 2.5rem minimum height.
- `.home-commission h1` uses `var(--font-serif)`, a fixed `4rem` desktop size, line-height `1.05`, and letter-spacing `0`; set it to `3.2rem` under 1100px and `2.5rem` under 760px instead of scaling with viewport width.
- `.home-proposition` uses `var(--amber-400)` and no viewport-width font scaling.
- `.command-primary` and `.featured-fusion-command` use icon-plus-text flex layouts, 4px radius, and minimum 3rem height.
- `.featured-fusion` fills the panel as an unframed section; no nested card backgrounds or rounded card shells.
- `.featured-fusion-result` uses a top and bottom rule instead of a floating card.
- `.featured-fusion-parent figcaption` keeps all text inside its column with `min-width: 0` and overflow wrapping.
- Mobile Three.js and 2.5D control positions retain their existing 0.5rem insets and fixed grid tracks.

- [ ] **Step 4: Add the research handoff state**

Append to `research.css`:

```css
.evolution-selector select:has(option:checked:not([value=""])) {
  border-color: var(--bronze-500);
  box-shadow: inset 3px 0 0 var(--bronze-500);
}
```

Do not add card containers around `.evolution-selectors` or `.evolution-result`.

- [ ] **Step 5: Run design, restoration, and feature tests**

Run:

```powershell
cd frontend
node --test src/offline/__tests__/offlineDesign.test.mjs src/offline/__tests__/offlineRestoration.test.mjs src/offline/__tests__/offlineFeatures.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the visual system**

```powershell
git add -- frontend/src/offline/styles/home.css frontend/src/offline/styles/research.css frontend/src/offline/__tests__/offlineDesign.test.mjs
git commit -m "feat: stage the curation case home"
```

### Task 5: Browser Journey And Packaged Artifact Verification

**Files:**
- Modify: `scripts/verify_offline_ui.mjs`
- Modify: `scripts/__tests__/verify_offline_ui.test.mjs`

- [ ] **Step 1: Write the failing verifier source contract**

Add this test to `scripts/__tests__/verify_offline_ui.test.mjs`:

```js
test('browser verifier exercises the featured fusion shortcut', () => {
  const source = readFileSync(resolve(root, 'scripts/verify_offline_ui.mjs'), 'utf8');
  for (const label of ['接手这宗风味案', '查看融合推演', '蟹粉橙香米羹']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /inspectFeaturedFusion/);
});
```

Use the test file's existing `root`, `readFileSync`, and `resolve` declarations rather than redeclaring them.

- [ ] **Step 2: Run the script test and verify RED**

Run:

```powershell
node --test scripts/__tests__/verify_offline_ui.test.mjs
```

Expected: FAIL because the verifier still looks for “开始可信复原” and has no fusion shortcut inspection.

- [ ] **Step 3: Extend the Playwright journey**

Change `completeRestoration` to click `接手这宗风味案`. Add:

```js
async function inspectFeaturedFusion(page) {
  await visibleButton(page, '查看融合推演').click();
  await page.locator('.evolution-parent-fixed').waitFor({ state: 'visible' });
  assert.match(await page.locator('.evolution-parent-fixed').innerText(), /蟹酿橙/);
  assert.equal(await page.locator('.evolution-selector select').inputValue(), 'dish_003');
  await visibleButton(page, '推演融合').click();
  await page.getByRole('heading', { name: '蟹粉橙香米羹' }).waitFor();
}
```

In `verifyViewport`, after `assertLayout(page, `${label}-home`)` and before `completeRestoration(page)`, call:

```js
await inspectFeaturedFusion(page);
await assertLayout(page, `${label}-fusion`);
await page.getByRole('button', { name: /风味考古局/ }).click();
await page.getByRole('heading', { name: '风味考古局' }).waitFor();
```

Change the initial home button wait to `接手这宗风味案`. In fallback verification, keep the same home command and confirm `查看融合推演` remains visible before entering restoration.

- [ ] **Step 4: Run the script tests and verify GREEN**

Run:

```powershell
node --test scripts/__tests__/verify_offline_ui.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run the complete automated quality gate**

Run:

```powershell
cd frontend
npm run test:offline
npm test
npm run lint
npm run build
npm run build:offline
npm run verify:offline:bundle
cd ..
node --test scripts/__tests__/*.test.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
```

Expected: every command exits 0; the bundle verifier reports zero external resources/network calls and a file below 3,000,000 bytes.

- [ ] **Step 6: Build the release package**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package_trae_submission.ps1
```

Expected: the release HTML and ZIP are regenerated from the latest build and the ZIP contains exactly the HTML plus `使用说明.txt`.

- [ ] **Step 7: Verify the actual release file in both browsers**

Run:

```powershell
$env:OFFLINE_HTML_PATH = (Resolve-Path 'release/风味考古局-TRAE初赛/风味考古局-离线体验.html').Path
cd frontend
npm run verify:offline:ui
cd ..
Remove-Item Env:\OFFLINE_HTML_PATH
```

Expected: Edge and Chrome pass 1440×900, 1280×720, and 390×844 in WebGL and forced-fallback modes with no external requests, runtime errors, overlaps, blank canvas, or horizontal overflow.

- [ ] **Step 8: Refresh the final product screenshot**

Run:

```powershell
Copy-Item -LiteralPath 'artifacts/offline-ui/chrome-1440x900-home.png' -Destination 'docs/competition/screenshots/product-final.png' -Force
```

Open the image and verify that the brand, commission brief, 3D artifact, featured fusion, and four-step outcome chain are readable and not overlapping.

- [ ] **Step 9: Commit verifier and product changes**

```powershell
git add -- scripts/verify_offline_ui.mjs scripts/__tests__/verify_offline_ui.test.mjs docs/competition/screenshots/product-final.png
git commit -m "test: verify the curation fusion journey"
```

### Task 6: Competition Narrative And Final Release Evidence

**Files:**
- Modify: `docs/competition/trae-initial-round-post.md`
- Modify: `docs/competition/verification-report.md`
- Modify: `docs/competition/trae-submission-checklist.md`
- Modify/regenerate: `release/风味考古局-TRAE初赛/风味考古局-离线体验.html`
- Modify/regenerate: `release/风味考古局-TRAE初赛.zip`

- [ ] **Step 1: Update the competition narrative from measured results**

In `trae-initial-round-post.md`, add the following product claim in the Demo introduction and preserve the evidence disclaimer:

```markdown
它不止把一道古菜复原回来，还把可信馆藏变成可继续生长的文化资产：策展人可选择两道有历史档案的父本，通过离线规则推演查看继承技法、现代转译、风险与待复核项。例如“蟹酿橙 × 玉糁羹”会形成“蟹粉橙香米羹”展项提案，串起“古籍线索 → 证据复原 → 菜品融合 → 数字展项”的完整闭环。
```

Replace the old generic first-screen description with the museum/non-heritage curator use case. Do not add “AI platform”, “AI assistant”, invented expert review, invented chef tasting, or unverified commercial revenue claims.

- [ ] **Step 2: Record fresh verification facts**

Run:

```powershell
$html = Get-Item -LiteralPath 'release/风味考古局-TRAE初赛/风味考古局-离线体验.html'
$zip = Get-Item -LiteralPath 'release/风味考古局-TRAE初赛.zip'
[pscustomobject]@{ HtmlBytes = $html.Length; ZipBytes = $zip.Length; VerifiedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') } | Format-List
```

Use those exact byte counts and the fresh test/browser totals in `verification-report.md` and `trae-submission-checklist.md`. Keep the competition gate at `NOT READY` until real TRAE Session IDs, screenshots, and registration URL exist.

- [ ] **Step 3: Run submission and repository integrity checks**

Run:

```powershell
node scripts/verify_trae_submission.mjs
git diff --check
git status --short
```

Expected: repository diff check exits 0; submission verifier reports only the known human-evidence gaps rather than a package, post, or screenshot failure.

- [ ] **Step 4: Commit the final release evidence**

```powershell
git add -- docs/competition/trae-initial-round-post.md docs/competition/verification-report.md docs/competition/trae-submission-checklist.md release/风味考古局-TRAE初赛/风味考古局-离线体验.html release/风味考古局-TRAE初赛/使用说明.txt release/风味考古局-TRAE初赛.zip
git commit -m "docs: present the restoration to fusion story"
```

- [ ] **Step 5: Final verification before completion**

Run:

```powershell
cd frontend
npm run test:offline
npm run verify:offline:bundle
cd ..
node --test scripts/__tests__/*.test.mjs
node scripts/verify_trae_submission.mjs
git status --short --branch
```

Expected: all automated engineering checks PASS; the competition verifier remains `NOT READY` only for truthful external TRAE evidence gaps; unrelated pre-existing worktree changes remain untouched.
