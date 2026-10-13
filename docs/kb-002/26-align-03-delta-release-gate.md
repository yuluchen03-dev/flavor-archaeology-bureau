# KB-002 ALIGN-03 Delta Release Gate

**Decision: `ALIGN-03 DELTA RELEASE GATE = PASS`**

**Scope of this decision:** ALIGN-03 staging-validation semantics plus the t55 F-01 workspace-path-containment repair, limited to the user-approved S1–S7 cases and the post-repair targeted QA/Security/Reviewer evidence. This is not a claim that S8 has passed, nor that KB-002 is closed.

## Required independent gates

| Gate | Task | Result | Evidence |
|---|---:|---|---|
| ALIGN-03 implementation and F-01 repair | t51 + t57 | Completed | Implementation separates staging validity from production admission; F-01 closes workspace traversal/absolute-path escape before filesystem mutation. |
| Targeted QA on final snapshot | t58 | **PASS** | `docs/kb-002/23-align-03-qa.md`; independently reran S1–S7 and traversal/cleanup cases. |
| Targeted Security on final snapshot | t59 | **PASS** | `docs/kb-002/24-align-03-security.md`; independently confirmed final semantics, path containment, provenance and frozen state. Direct symlink creation was denied by Windows `EPERM` and remains unverified. |
| Fresh Reviewer on final snapshot | t60 | **PASS** | `docs/kb-002/25-align-03-review.md`; fresh-context reviewer; confirms S8 deferral is not misrepresented. |

## Captain's independent machine verification

Run with Node `spawnSync` for exit codes:

- `node scripts/kb002/validate-golden.mjs --staging` — exit 0
- `node scripts/kb002/validate-golden.mjs --dataset` — exit 0; `QUALIFIED_GOLDEN_COUNT = 0`, `SHORTFALL = 10`, `STATUS = EMPTY_GOLDEN_SET`, `KNOWN_DATA_GAP = 10`
- `node scripts/kb002/validate-golden.mjs --integrity` — exit 0
- `node --test scripts/kb002/__tests__/t45-staging-semantics.test.mjs` — 10/10, skipped 0, todo 0
- `node --test scripts/kb002/__tests__/golden-validator.test.mjs` — 76/76, skipped 0, todo 0
- `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` — 21/21, skipped 0, todo 0
- `node --test "scripts/kb/__tests__/*.test.mjs"` — 121/121, skipped 0, todo 0
- `node scripts/kb/validate-kb-schema.mjs` — exit 0
- `node scripts/verify_graph_schema.mjs` — exit 0
- `node scripts/verify_literature_dataset.mjs` — exit 0

## Semantics retained

- Honest calculated E0/E2 candidates can be preserved in staging with exit 0, while `KB002_DISH_BELOW_E3` remains visible and `STAGING_VALID=true` / `PRODUCTION_ADMISSIBLE=false` is explicit.
- The same E2 candidate in production/dataset remains blocked by Q3 (`KB002_DISH_BELOW_E3`, nonzero exit).
- Dish-level and `qualified` lies remain staging blockers.
- Invalid manifest schema, missing assets, and modified assets remain staging blockers with their respective integrity findings.
- Workspace traversal and absolute/drive-root paths are rejected before writes; cleanup remains bounded to the owned temp root.
- FIX-03 isolation and FIX-04 fail-closed behavior remain intact.
- No candidate evidence was changed or manufactured.

## Explicit S8 deferral

Per the user's explicit decision, **genuine S8 (a real, traceable E3+ candidate) is deferred until such a candidate exists**. No such candidate currently exists, and manufacturing one would violate the no-fabrication constraint. The synthetic E4 test is mechanical routing coverage only and is not genuine S8 evidence. S8 is **not passed** and is not silently waived; it remains a future validation item when a real candidate becomes available.

## Frozen state at release decision

- Production Golden files: **0**
- Staging entries: **0**; manifest absent
- `QUALIFIED_GOLDEN_COUNT = 0`
- `SHORTFALL = 10`
- `STATUS = EMPTY_GOLDEN_SET`
- HEAD: `6a25f4f`
- User staged paths: **300**, unchanged
- F01 72-error incident sample preserved

## Explicit exclusions / remaining unknowns

This decision does not authorize promotion or claim external-source authenticity (L2). Symlink behavior could not be directly exercised because Windows denied symlink creation with `EPERM`; it remains unverified. Controlled concurrency, disk-full/permission failures, very large inputs and cross-platform atomicity also remain unverified. Incident-E root cause remains `UNKNOWN` / `CORRELATION_ONLY`; test path isolation defect is confirmed, while nondeterministic failure causation remains not proven.

**Captain decision: `ALIGN-03 DELTA RELEASE GATE = PASS` for the user-approved S1–S7 scope and F-01 repair, with S8 explicitly deferred. F01R2 is now eligible to be planned; this decision does not itself create or promote a candidate.**
