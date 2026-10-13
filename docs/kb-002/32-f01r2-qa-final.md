# F01R2 Final Isolated Candidate QA — PASS

**Task:** t79 (round 6)  
**Verdict:** **PASS for isolated-candidate QA after t78 clarification.** This is not promotion or an import into real staging/production.

## 1. Clarification and immutable candidate byte check

I independently compared the candidate's exact C1/C3 statements with the curator clarification (`docs/kb-002/31-f01r2-claim-mapping-clarification.md`) and verified the cited repository-pointer fields.

- **C1:** Candidate text at `claim_g001_identity.statement` is exactly: “仓库 dish_001 / recipe_001 指针将蟹酿橙关联到宋代及《山家清供》卷下；该仓库指针并非外部核实。” This matches t78's intended repository-pointer-only claim. `dish_001` contains `dynasty=宋代`, `source_text=山家清供`; `recipe_001` contains `source=《山家清供》卷下`, `dynasty=宋代`. Candidate and clarification explicitly disclaim external authentication; the stronger Evidence Matrix C1 remains a research hypothesis, not asserted as independently verified history.
- **C3:** Candidate text at `claim_g001_ingredient_use_orange.statement` is exactly: “仓库转录称使用黄熟大橙并将橙用作容器。” It matches t78's transcription-supported container-only wording. The “兼调味” phrase occurs in recipe ingredient metadata, not `original_text`, and is omitted from this historical claim.
- **C5:** Candidate C5 is the smaller “入小甑蒸熟” technique subclaim of C2, tied to the same single repository passage. T78 explicitly says it is not independent evidence, adds no source/N/D count, and cannot lift the level above E2.
- **C6/C7:** Both claims remain E0, `insufficient`, `unreviewed`, unknown confidence, with empty basis IDs and no `claim_supported_by` edges.
- **C8:** No C8 HistoricalClaim is present. T78 records the compiler-authored `recipe_001.modern_adaptation` note as modern-only guidance outside historical claims and outside evidence-level calculation.

Artifact integrity, independently recomputed from bytes:

- Candidate `tmp/f01r2-isolated/repo/data/kb/golden/staging/golden_001.kb.json`: **27,036 bytes**, SHA-256 `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`.
- Manifest: **598 bytes**; its one asset entry uses `data/kb/golden/staging/golden_001.kb.json`, byte size `27036`, and the same SHA-256.
- Neither file exists under real `data/kb/golden/**`.

## 2. Claim/source mapping and evidence honesty

The candidate contains seven HistoricalClaims. C1–C5 all point to `passage_g001_xieniangcheng_juanxia`, whose provenance points to repository `recipe_001` / `dish_001` transcription pointers and the series-level `lit_ccs_014` pointer. These remain `insufficient`, `unreviewed`, confidence `unknown`; their source grade is B and no L2 external authenticity is asserted. C6/C7 have no support edges and remain E0. No E3/E4/E5 or expert review is claimed for the actual candidate. No dish-specific contradiction appears in the authorized Matrix; none was invented.

Metadata `evidence_level=E0` is the minimum across all claims because C6/C7 are E0. The validator's Q3 calculation instead checks the best eligible HistoricalClaim, which is E2 (C1–C5); it therefore visibly reports `KB002_DISH_BELOW_E3 (best: E2)`. `qualified=false` is consistent, and this does not admit the candidate to production.

## 3. Isolated staging and dataset behavior

With `KB002_GOLDEN_ROOT` pointed at `tmp/f01r2-isolated/repo`, I independently ran the CLI with Node `spawnSync`:

- `--staging data/kb/golden/staging` → **exit 0**, one candidate and one manifest asset; `STAGING_VALID=true`; `PRODUCTION_ADMISSIBLE=false`; finding `KB002_DISH_BELOW_E3`, best E2.
- `--dataset data/kb/golden` → **exit 0**, `QUALIFIED_GOLDEN_COUNT=0`, `SHORTFALL=10`, `STATUS=EMPTY_GOLDEN_SET`, `KNOWN_DATA_GAP=10`.
- Real repository `--dataset` → same empty production count/shortfall/status.

## 4. t69 matching-hash traversal adversary and controls

In a self-owned disposable `tmp/f01r2-final-qa-probes/` workspace, I created an external sentinel and a valid-schema manifest whose asset path was `data/kb/golden/staging/../outside-sentinel.json`. The manifest byte size and SHA-256 exactly matched the external file.

- Traversal attack: `--integrity` **exit 1** with `KB002_MANIFEST_ASSET_PATH_INVALID`; no `STAGING_ASSET_MISSING` or `STAGING_ASSET_MODIFIED`; sentinel bytes/hash unchanged. This is consistent with rejection before file access/hash.
- Valid contained in-staging asset with matching size/hash: **exit 0**, no findings.
- Missing contained in-staging asset: **exit 1**, `STAGING_ASSET_MISSING`.
- Probe workspace was removed afterward.

## 5. Real dataset freeze

- Real production Golden files: **0**.
- Real staging: **empty**; no real manifest.
- HEAD: `6a25f4f`; user staged paths: **300**, unchanged.
- `tmp/f01-failed-attempt/golden_001.kb.json.INVALID-72-errors` remains present.
- No real Golden/generated data, candidate, manifest, or `.env` was modified/read by this QA.

## Final disposition

**PASS for the isolated reconstruction's QA after the t78 curator clarification.** The t75 claim-scope observations are resolved by exact byte-level C1/C3 matches and explicit t78 C5/C8 dispositions. The artifact remains isolated research material, not byte-for-byte recovery of the lost t21 candidate and not eligible for import/promotion by this report. No real production/staging candidate was created.
