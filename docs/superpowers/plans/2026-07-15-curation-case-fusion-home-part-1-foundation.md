# Curation Case Fusion Home - Part 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Establish the atomic featured-fusion navigation and a data-backed FeaturedFusion component that later home work can safely compose.

**Architecture:** This part owns the shared museum-session contract and the reusable featured-fusion presentation. It deliberately does not change the home layout, so the next part can consume stable component and state interfaces.

**Tech Stack:** React 19, Lucide React, Node test runner, existing offline museum data and fusion engine.

---

## Execution Boundary

- Execute this document first, from the baseline branch.
- This document covers original Tasks 1-2 only.
- Do not modify HomeExhibit.jsx, home.css, research.css, release artifacts, or competition documentation in this part.
- Commit the completed work before handing the branch to Part 2.
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
