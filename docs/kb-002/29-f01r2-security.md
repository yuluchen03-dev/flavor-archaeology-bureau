# F01R2 Isolated Candidate — Final Security / Provenance Review (t76)

**Verdict: PASS** — final independent review after t69 manifest path-containment repair.  
**Reviewer:** security-gpt · **Candidate:** isolated F01R2 GOLDEN-001 under `tmp/f01r2-isolated/repo/data/kb/golden/staging/`  
**S8:** genuine E3+ deferred by explicit user decision; synthetic E4 is not genuine evidence and is not counted as an S8 pass.

## Independence and review method

This review independently inspected the immutable candidate and manifest, the authorized Evidence Matrix and repository source pointers, and the t69 integrity resolver. Adversarial and control manifest cases ran in disposable temporary roots with Node `spawnSync`. I did not modify the candidate/manifest, run any operation against the real Golden data roots, touch generated data, or read `.env`.

## Candidate and manifest integrity

The candidate and manifest remain under the isolated repo-shaped root, not the actual dataset. Independent measurements:

| Artifact | Isolated relative path | Bytes | SHA-256 |
|---|---|---:|---|
| Candidate | `tmp/f01r2-isolated/repo/data/kb/golden/staging/golden_001.kb.json` | 27,036 | `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964` |
| Manifest | `tmp/f01r2-isolated/repo/data/kb/golden/staging/manifest.json` | 598 | `c4dd8c3b9cc0ea91326f476b74a38b5ea53c869c2e5f8547f0098137c50923c8` |

The single manifest asset entry has `relative_path=data/kb/golden/staging/golden_001.kb.json`, `status=present`, `byte_size=27036` and SHA-256 exactly matching the candidate. Candidate and manifest hashes were checked again after review probes and remained unchanged.

## Claim mapping and provenance honesty

I checked the seven candidate HistoricalClaims against the authorized Evidence Matrix (§2 and §3) and repository pointers `recipe_001`, `dish_001`, `lit_ccs_014`:

- Candidate metadata is `GOLDEN-001`, `contract_version=kb-002.1.2`, `evidence_level=E0`, `qualified=false`.
- C1–C5 each point to `passage_g001_xieniangcheng_juanxia`, whose text exactly matches the authorized repository transcription in `recipe_001.original_text` and `dish_001.source_passage`. Their mapping follows Matrix C1–C5: C1 additionally cites dish/recipe and series-level `lit_ccs_014` pointers; C2–C5 cite the repository transcription for the stated method/ingredients/steaming details.
- C1–C5 remain `evidence_status=insufficient`, `derivation=unresolved`, `review_status=unreviewed`, `confidence=unknown`, with uncertainty notes stating that external L2 authenticity is unverified. They are E2/B claims, not promoted to sufficient or qualified.
- C6 (crab species) and C7 (geography) have no support basis IDs or `claim_supported_by` edges; both remain E0/insufficient/unreviewed with explicit no-evidence notes, as the Matrix directs.
- C8 is a modern adaptation/compiler note, not a historical claim; it is absent from the candidate’s HistoricalClaim set and is not used to raise historical evidence.
- The SourceWork attribution remains null/unknown. The SourceEdition records a B-grade series-level pointer, publisher `中国商业出版社`, `publication_year=null`; notes do not assert a specific physical copy, facsimile, shelfmark, page, edition URL, or expert review. The passage is explicitly a repository transcription, not externally verified. L2 authenticity is not claimed.

## t69 manifest-path containment adversarial test

I independently exercised the final `resolveStagingAssetPath()` / `checkStagingIntegrity()` flow in disposable workspaces. The adversarial outside sentinel had a real file and a manifest entry with exactly matching byte size and SHA-256:

| Case | Result |
|---|---|
| Manifest `relative_path=../<outside sentinel>`; file exists outside staging, size/hash match | `--integrity` exit **1**, `KB002_MANIFEST_ASSET_PATH_INVALID`; no outside file satisfies the entry |
| Valid in-root staging file; manifest size/hash match | `--integrity` exit **0**, no finding |
| Missing in-root staging file; well-formed manifest | `--integrity` exit **1**, `STAGING_ASSET_MISSING` |
| Malformed schema (`entries` instead of `assets`) | `--integrity` exit **1**, `KB002_MANIFEST_SCHEMA_INVALID` |

In the hostile case, the sentinel remained present but was rejected based on the `..` path before being accepted as a manifest asset. The entire disposable probe workspace and sentinel were removed. The resolver's code validates normalized relative paths beneath `data/kb/golden/staging/`, then checks the canonical nearest existing ancestor for symlink escape before target existence/hash/stat operations. Thus the t69 fix blocks the previously observed matching-hash path escape.

## Candidate validation and production separation

With the candidate’s isolated root active:

- `--staging data/kb/golden/staging` exits **0**, candidate count is 1, Q3 `KB002_DISH_BELOW_E3` remains visible (`best: E2`), and output states `STAGING_VALID = true`, `PRODUCTION_ADMISSIBLE = false`.
- The candidate metadata remains E0 / `qualified=false`; it is not production-admissible and no promotion was attempted.
- Against the actual empty production root, `--dataset` exits **0** and reports `QUALIFIED_GOLDEN_COUNT=0`, `SHORTFALL=10`, `STATUS=EMPTY_GOLDEN_SET`.

## Regression and frozen repository state

| Command | Exit | Result |
|---|---:|---|
| `node scripts/kb002/validate-golden.mjs --integrity` | 0 | Real staging empty; no manifest |
| `node scripts/kb002/validate-golden.mjs --staging tmp/f01r2-isolated/repo/data/kb/golden/staging` | 0 | Q3 visible; `STAGING_VALID=true`; `PRODUCTION_ADMISSIBLE=false` |
| `node scripts/kb002/validate-golden.mjs --dataset` | 0 | qualified 0 / shortfall 10 / `EMPTY_GOLDEN_SET` |
| `node --test scripts/kb002/__tests__/t24-admission-and-integrity.test.mjs` | 0 | 22/22 pass |

After all probes: real production files **0**; real staging empty/no manifest; `data/kb/generated/` untouched; HEAD `6a25f4f`; user staged entries **300** unchanged. No `.env` access. All temporary security probes and disposable workspaces were cleaned.

## Deferred / unverified matters

Genuine S8 E3+ remains **DEFERRED / NOT VERIFIED** per user decision because no genuine candidate exists; the synthetic E4 fixture is mechanical-only, not historical evidence. External L2 authenticity, controlled concurrency races, disk-full/permission failures, very large inputs and cross-platform atomicity remain unverified. A direct symlink-creation probe was not available in this Windows environment, although the resolver checks the canonical nearest existing ancestor. INCIDENT-E root cause remains `UNKNOWN` / `CORRELATION_ONLY`.

## Final verdict

**PASS** — for the isolated F01R2 candidate’s Security / Provenance review after t69. Candidate remains isolated and honest, Q3 remains visible and blocking for production, and manifest path containment rejects the matching-hash `../` attack. This review is not promotion authorization; `qualified=false` and production remains empty.
