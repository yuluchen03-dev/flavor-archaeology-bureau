# Curation Case Fusion Home - Part 3: Verification And Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Verify the completed curation-fusion journey in browsers, regenerate the offline release, and record only measured competition evidence.

**Architecture:** This part extends the existing Playwright verifier to exercise the new fusion shortcut, then runs the full build, package, browser, and repository quality gates. Documentation is refreshed strictly from the resulting artifacts and measurements.

**Tech Stack:** Playwright, Node test runner, Vite single-file build, PowerShell packaging, Chrome, Edge.

---

## Prerequisites And Boundary

- Start from a branch containing the completed Part 1 and Part 2 commits.
- Confirm the home renders FeaturedFusion, dispatches openFusion, and passes the focused UI tests before starting.
- This document covers original Tasks 5-6 only.
- Do not claim real TRAE session evidence, screenshots, or registration status unless those facts are actually available.
- Preserve unrelated worktree changes.
### Task 1: Browser Journey And Packaged Artifact Verification

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

### Task 2: Competition Narrative And Final Release Evidence

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
