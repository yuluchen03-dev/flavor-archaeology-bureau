# ALIGN-03 Targeted QA — PASS (S1–S7 + t57 path traversal; S8 explicitly deferred)

**Task:** t58 (independent QA rerun after t57)
**Scope:** Final ALIGN-03 snapshot after t51 and the F-01 workspace path traversal repair t57.
**Verdict:** **PASS for the user-approved S1–S7 scope; genuine S8 is deferred and is not claimed as passed.**

## Independence and method

I did not implement t51. I inspected the current validator, ALIGN-03 targeted tests, test workspace helper, and the applicable frozen contract. I independently created isolated temp workspaces and ran each S1–S7 scenario against the CLI with Node `spawnSync`; exit codes were taken from `spawnSync.status`. Finding codes were extracted from JSONL using a complete JSON `code` field capture, not prefix slicing. No candidate was written to the real Golden dataset. The probe used only temporary workspace files and was removed after the run.

## Targeted semantic results

| Case | Independently exercised input | Result |
|---|---|---|
| **S1 — honest E2 staging** | Structural example converted to an honest non-fixture candidate, preserving its calculated E2 and `qualified=false`, in a FIX-03 temp staging root. | **PASS:** exit 0; `STAGING_VALID = true`; `PRODUCTION_ADMISSIBLE = false`; JSON finding code `KB002_DISH_BELOW_E3` remains visible. |
| **S2 — same E2 in production** | Same candidate placed at the production path inside an isolated temp dataset root. | **PASS:** exit 1; code `KB002_DISH_BELOW_E3`. |
| **S3 — honest E0 staging** | Removed all `claim_supported_by` edges for the claim, retained its structural claim/about links, set honest insufficient/unresolved/unreviewed declarations, and declared E0; all files remained in a temp root. | **PASS:** exit 0; `STAGING_VALID = true`; `PRODUCTION_ADMISSIBLE = false`; Q3 visible; candidate remained present in temp staging until cleanup. |
| **S4 — evidence-level lie** | E2-calculated candidate declaring E3. | **PASS:** exit 1; codes included `KB002_DISH_BELOW_E3` and `KB002_DISH_LEVEL_MISMATCH`. |
| **S5 — qualified lie** | Candidate calculated unqualified but declaring `qualified=true`. | **PASS:** exit 1; codes included `KB002_QUALIFIED_MISMATCH` (and associated rule findings). |
| **S6 — missing manifest asset** | Correct manifest schema and required asset keys (`asset_logical_id`, `relative_path`, `status`), referring to a nonexistent staging asset. | **PASS:** exit 1; `STAGING_ASSET_MISSING`; no `KB002_MANIFEST_SCHEMA_INVALID`. |
| **S7 — malformed manifest** | Manifest used `entries` instead of `assets`. | **PASS:** exit 1; `KB002_MANIFEST_SCHEMA_INVALID`. |
| **S8 — genuine E3+** | No genuine, traceable E3+ candidate exists in the repository; creating one would violate the no-fabrication/no-new-candidate freeze. | **DEFERRED by explicit user decision; not verified and not claimed passed.** The existing synthetic E4 test is mechanical-only and is not historical evidence or a genuine S8 candidate. |

## Production gate remains strict

The production Q3 blocker remains active: S2 independently confirmed that the same E2 candidate fails in `--dataset` with `KB002_DISH_BELOW_E3`. The staging success does not hide Q3: it reports that finding and explicitly reports non-admissibility. The structural fixture also independently exits 1 when validated as an explicit file; its complete JSON finding codes include `KB002_DISH_BELOW_E3` (and `E_TRACE_WEAKENS_CLAIM`).

## Regression and negative fixtures

All commands below were executed in this QA run. Test suite counts are from Node's test-runner output; CLI and probe exit codes were taken from process return statuses (Node `spawnSync`).

| Command | Exit | Result |
|---|---:|---|
| `node --test scripts/kb002/__tests__/t45-staging-semantics.test.mjs` | 0 | **10/10 pass**, 0 fail, 0 skipped, 0 todo; includes t57 traversal/cleanup, S1–S8 mechanical cases. Genuine S8 remains deferred despite mechanical synthetic E4 case. |
| `node --test scripts/kb002/__tests__/golden-validator.test.mjs` | 0 | **76/76 pass**, 0 fail, 0 skipped, 0 todo. |
| `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | 0 | **21/21 pass**, 0 fail, 0 skipped, 0 todo. |
| `node --test "scripts/kb/__tests__/*.test.mjs"` | 0 | **121/121 pass**, 0 fail, 0 skipped, 0 todo. |
| `node scripts/kb002/validate-golden.mjs --staging` | 0 | Empty staging validates as empty; no candidate was created. |
| `node scripts/kb002/validate-golden.mjs --dataset` | 0 | Honest empty-set behavior. |
| `node scripts/kb002/validate-golden.mjs --integrity` | 0 | No manifest or staging assets present; no integrity findings. |
| `node scripts/kb/validate-kb-schema.mjs` | 0 | PASS. |
| `node scripts/verify_graph_schema.mjs` | 0 | PASS. |
| `node scripts/verify_literature_dataset.mjs` | 0 | PASS. |

I independently invoked all 17 intended negative fixtures, accounting for the renamed `golden_002.kb.json` N-01 fixture. **17/17 exited 1 and emitted their intended codes.** The existing golden-validator suite also tests this mapping.

## FIX-03 / FIX-04 and scope checks

- The targeted suite uses `createWorkspace()` and resolves candidate paths under distinct OS-temp roots. S1–S7 used these isolated roots.
- The S6 malformed-manifest / missing-asset cases used the formal entry keys and independently produced `KB002_MANIFEST_SCHEMA_INVALID` / `STAGING_ASSET_MISSING` respectively.
- The t57 regression test was independently run and the helper inspected. It rejects `../`, `../../`, absolute POSIX, and drive-root paths before creating outside files; an in-root write succeeds; cleanup removes only its owned workspace and preserves a sibling sentinel. I additionally reproduced those properties in a separate temp-only probe.
- Current ALIGN-03 implementation paths observed on disk: `scripts/kb002/validate-golden.mjs`, `scripts/kb002/__tests__/t45-staging-semantics.test.mjs`, and `docs/kb-002/05-ingestion-tooling.md`. No fixture or contract files were changed by t51/t57.

## Frozen invariants

After probes and regression runs:

- Production Golden files: **0**.
- Staging entries: **0**; manifest absent.
- `--dataset`: **`QUALIFIED_GOLDEN_COUNT = 0`**, **`SHORTFALL = 10`**, **`STATUS = EMPTY_GOLDEN_SET`**, **`KNOWN_DATA_GAP = 10`**; exit 0.
- HEAD: **`6a25f4f`**.
- User staged changes: **300 paths**, unchanged.
- No writes to `data/kb/generated/` and no `.env` access.
- Temporary QA probe was removed before this report.

## Limits

S8 is deferred exactly as decided by the user. No genuine E3+ candidate was manufactured or inferred. Unverified: symlink/junction attacks, controlled concurrent stress, disk-full/permission failure, very large inputs, cross-platform atomicity beyond this Windows environment, and L2 external source authenticity (external search credentials are unavailable). Incident-E root cause remains UNKNOWN/CORRELATION_ONLY. `TEST PATH ISOLATION DEFECT = CONFIRMED`; `NONDETERMINISTIC FAILURE CAUSATION = NOT PROVEN`.
