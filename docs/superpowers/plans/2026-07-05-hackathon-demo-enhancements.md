# Hackathon Demo Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the high-impact hackathon demo moments: one-click demo clue, visible evidence graph, star-map focus, and evolution reveal.

**Architecture:** Keep changes in the existing React page modules and source-level Node tests. The UI stays inside the museum/archive visual system already defined in `frontend/src/index.css`.

**Tech Stack:** React 19, Vite, Tailwind CSS classes, Node `node:test` source checks.

---

### Task 1: One-Click Demo Clue

**Files:**
- Modify: `frontend/src/pages/Input.jsx`
- Test: `frontend/src/pages/__tests__/hackathonDemoEnhancements.test.mjs`

- [ ] Add a `demoClue` constant with the full蟹酿橙 ancient text.
- [ ] Add a "现场 Demo" button that fills the textarea, sets `inputType` to `text`, `period` to `宋元`, and `region` to `江南`.
- [ ] Add a test that checks the button label, helper text, and preset state setters are present.

### Task 2: Evidence Graph And Dramatic Timeline

**Files:**
- Modify: `frontend/src/pages/Result.jsx`
- Test: `frontend/src/pages/__tests__/hackathonDemoEnhancements.test.mjs`

- [ ] Add fixed four-stage evidence labels: 古籍解码, 食材校验, 技法推演, 成品复原.
- [ ] Add an `EvidenceGraphPanel` rendering `古籍 -> 菜品 -> 食材 -> 技法 -> 朝代/地域 -> 替代食材` with relation labels and evidence-source chips.
- [ ] Show the graph on the final result page near the visible reasoning section.
- [ ] Add a test that checks the graph component, relation labels, and evidence source chips are present.

### Task 3: Star Map Demo Focus

**Files:**
- Modify: `frontend/src/pages/StarMap.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/pages/__tests__/hackathonDemoEnhancements.test.mjs`

- [ ] Default-select 蟹酿橙 when it appears in the star-map data.
- [ ] Mark that selected node as a demo focus node.
- [ ] Add subtle pulse and drawer-slide styling through semantic classes.
- [ ] Add a test that checks the default focus behavior and style classes.

### Task 4: Evolution Reveal

**Files:**
- Modify: `frontend/src/pages/Evolution.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/pages/__tests__/hackathonDemoEnhancements.test.mjs`

- [ ] Add a demo reveal class to the generated "新物种" panel.
- [ ] Add a visual lineage strip from parent dish names to generated dish.
- [ ] Add CSS for the reveal moment and lineage strip.
- [ ] Add a test that checks the reveal and lineage elements.

### Verification

- [ ] Run `cd frontend; node --test src\pages\__tests__\hackathonDemoEnhancements.test.mjs`.
- [ ] Run `cd frontend; node --test src\pages\__tests__\starmapLightVisualRefresh.test.mjs src\pages\__tests__\evolutionSelectionLayout.test.mjs src\pages\__tests__\completionBlockingPolish.test.mjs`.
- [ ] Run `cd frontend; npm run build`.
