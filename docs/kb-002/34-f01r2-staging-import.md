# F01R2 Staging Import — Closeout Record (read-only verification)

**Task:** t83 · **Scope:** read-only verification of the already-present real-staging F01R2 artifacts.
**Conclusion: `F01R2_CLOSEOUT = PASS`** — hashes identical, staging valid, integrity PASS, production 0, Q3 visible, no promotion, regression no new failure.

> This document records the **state that exists on disk**. It does **not** re-import, overwrite, delete, or modify anything, and it does **not** retroactively mark t82 as successful.

---

## Candidate

| Field | Value |
|---|---|
| path | `data/kb/golden/staging/golden_001.kb.json` |
| size | **27,036 B** |
| sha256 | **`fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`** |

Metadata: `GOLDEN-001`, `contract_version = kb-002.1.2`, `evidence_level = E0` (minimum across claims), `qualified = false`.

## Manifest

| Field | Value |
|---|---|
| path | `data/kb/golden/staging/manifest.json` |
| size | **598 B** |
| sha256 | **`c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8`** |
| manifest_version | 1 |
| lifecycle_class | `staging` |
| assets count | 1 |
| asset.relative_path | `data/kb/golden/staging/golden_001.kb.json` |
| asset.byte_size | 27036 (matches actual 27036) |
| asset.sha256 | `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964` (matches actual) |
| asset.promotion_status | `not_promoted` |

## Authorized Isolated Artifact

| Artifact | staging size / sha256 | isolated size / sha256 | byte-for-byte identical |
|---|---|---|---|
| candidate | 27,036 B · `fa923ce8…3964` | 27,036 B · `fa923ce8…3964` | **true** |
| manifest | 598 B · `c4dd8c3b…` | 598 B · `c4dd8c3b…` | **true** |

Isolated reference root: `tmp/f01r2-isolated/repo/data/kb/golden/staging/`.
**All four digests were recomputed from bytes during this closeout** (not carried over from any earlier report).

## t82

| Field | Value |
|---|---|
| status | **`FAILED`** (terminal status unchanged) |
| reason | safe no-overwrite — target staging was already populated |
| qualification | **`FAILED_SAFE_IDEMPOTENCY_GUARD`** |

t82 detected that `data/kb/golden/staging/` already contained the candidate and its matching manifest. It **stopped before writing**: no overwrite, no delete, no rewrite, no copy, no modification of any existing file, and no report was produced.

**t82 is not a business failure and not an authorization failure.** It is the idempotency guard working as intended.

Audit chain:

```
existing candidate present
  → t82 detects non-empty target
  → t82 refuses to overwrite
  → t82 FAILED
  → Captain independently verified candidate hashes match the authorized isolated artifact
  → t83 records the evidence (this document)
```

t82 is **not** marked PASS/COMPLETED, and this closeout does **not** retroactively approve it.

## Write Origin

**`STAGING_WRITE_ORIGIN_UNKNOWN`** — the session audit does not identify **which earlier attempt** wrote the authorized bytes into real staging.

Registered as **`AUDIT_PROVENANCE_GAP`**, **not** `DATA_CONTENT_INTEGRITY_FAILURE`: the current content is verified byte-for-byte identical to the authorized isolated artifact by SHA-256.

No responsibility is attributed — not to the curator, not to the Captain, not to the validator, and not to any script. No write provenance is invented.

## Staging

| Field | Value |
|---|---|
| valid | **true** |
| production admissible | **false** |

`--staging` → exit **0**; `STAGING_CANDIDATE_COUNT = 1`; `STAGING_MANIFEST_PRESENT = true`; `STAGING_MANIFEST_ASSET_COUNT = 1`; `STAGING_VALID = true`; `PRODUCTION_ADMISSIBLE = false`; `KB-002 staging candidate PASSED (not production-admissible): 1 production-admission finding(s)`.

`--integrity` → exit **0**; `CANDIDATE_PRESENT`; candidate 1; manifest present true; asset 1. No `STAGING_ASSET_MISSING`, no `STAGING_ASSET_MODIFIED`, no `KB002_MANIFEST_SCHEMA_INVALID`, no `KB002_MANIFEST_ASSET_PATH_INVALID`.

## Q3

| Field | Value |
|---|---|
| visible | **true** |
| not weakened | **true** |

```
{"file":"data/kb/golden/staging/golden_001.kb.json","entityOrRelationId":"dish_g001_xieniangcheng",
 "fieldPath":"metadata.evidence_level","code":"KB002_DISH_BELOW_E3",
 "message":"Q3: no HistoricalClaim reaches Evidence Level >= E3 (best: E2)"}
```

Q3 remains an unconditional production-admission blocker. Nothing in this closeout weakens it.

## Production

**0 files.** `data/kb/golden/` contains no production `.kb.json` record. Staging content does not count toward production.

## Dataset

| Field | Value |
|---|---|
| qualified | **0** |
| shortfall | **10** |
| status | **`EMPTY_GOLDEN_SET`** |
| known_data_gap | 10 |

`--dataset` → exit **0**; `KB-002 Golden dataset: 0 file(s) present (KB-002F+ has not run yet).`

## Promotion

**performed = false.** No promotion workflow was run or authorized.

---

## Regression (no new failure)

| Suite | exit | tests | pass | fail |
|---|---:|---:|---:|---:|
| `scripts/kb002/__tests__/golden-validator.test.mjs` | 0 | 76 | 76 | 0 |
| `scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | 0 | 22 | 22 | 0 |
| `scripts/kb002/__tests__/t45-staging-semantics.test.mjs` (ALIGN-03) | 0 | 13 | 13 | 0 |
| `scripts/kb/__tests__/*.test.mjs` (KB-001) | 0 | 121 | 121 | 0 |
| `scripts/kb/validate-kb-schema.mjs` | 0 | — | — | — |
| `scripts/verify_graph_schema.mjs` | 0 | — | — | — |
| `scripts/verify_literature_dataset.mjs` | 0 | — | — | — |

All exit codes taken with Node `spawnSync` (`status`), never from a PowerShell pipeline.

## Environment

- HEAD: **`6a25f4f`** — no commit, no push, no git add.
- User staged changes: **300** paths, unchanged.
- F01 incident sample preserved: `tmp/f01-failed-attempt/golden_001.kb.json.INVALID-72-errors`.
- No writes outside this document. Candidate, manifest, validator, Contract and Evidence Level untouched.

---

## F01R2 accepted semantics

```text
F01R2 = STAGING_ACCEPTED_NOT_PROMOTED

STAGING_VALID = true
PRODUCTION_ADMISSIBLE = false

GOLDEN-001:
  present_in_staging = true
  qualified = false
  best_evidence_level = E2
  promoted = false
```

This decision does **not** record `PRODUCTION_PASS`, `GOLDEN_COMPLETE`, or `qualified`.

## Boundary statements (not achieved / not claimed)

- **Genuine S8 (a real, traceable E3+ candidate) remains DEFERRED — not passed.** The synthetic E4 helper is mechanical test data only.
- **L2 external source authenticity remains UNVERIFIED.** All pointers are traceable only within the repository; no external source has been checked in this environment.
- The candidate is a source-grounded **reconstruction**, **not** byte-for-byte recovery of the lost t21 candidate.
- Best evidence level remains **E2**; `KB002_DISH_BELOW_E3` blocks production admission.

## Closeout criteria (all satisfied)

| Criterion | Result |
|---|---|
| hashes identical (staging vs authorized isolated) | ✅ true |
| staging valid | ✅ true |
| integrity PASS | ✅ true |
| production count 0 | ✅ 0 |
| Q3 still visible | ✅ true |
| no promotion | ✅ true |
| regression no new failure | ✅ all exit 0 |

**`F01R2_CLOSEOUT = PASS`**
