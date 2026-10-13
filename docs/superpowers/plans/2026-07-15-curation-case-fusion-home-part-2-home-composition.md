# Curation Case Fusion Home - Part 2: Home Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Present the featured fusion as a museum curation commission home with a stable, responsive archival visual system.

**Architecture:** This part composes the FeaturedFusion component and the openFusion action delivered by Part 1 into the home exhibit. CSS owns named layout regions and responsive rules while preserving the existing Three.js stage and research tool structure.

**Tech Stack:** React 19, Three.js, Lucide React, CSS, Node test runner, ESLint.

---

## Prerequisites And Boundary

- Start from a branch containing the completed Part 1 commits.
- Confirm FeaturedFusion.jsx exists and the museum reducer handles openFusion before changing the home.
- This document covers original Tasks 3-4 only.
- Do not regenerate release files, modify browser verifier scripts, or update competition evidence in this part.
- Commit the completed work before handing the branch to Part 3.
### Task 1: Curation Commission Home Composition

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

### Task 2: Archival Visual System And Responsive Layout

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
