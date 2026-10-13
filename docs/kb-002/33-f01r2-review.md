# Fresh Review: F01R2 Isolated Candidate — PASS for One Staging-Only Import

**Task:** t80, fresh reviewer-gpt review of isolated F01R2 after t63/t69/t76/t78/t79.  
**Verdict:** **PASS** for the narrowly approved next action: one controlled import of this unchanged artifact into the real **staging directory only**.  
**Not authorized:** production write, promotion, or treating the record as qualified. `qualified=false`; `PRODUCTION_ADMISSIBLE=false`; Q3 remains blocking. Genuine S8 remains deferred and is not claimed as passed.

## Independence and method

I performed no candidate reconstruction, clarification, QA, Security, or implementation task (t63/t69/t76/t78/t79). I independently inspected the read-authorized candidate and manifest, the authorized Evidence Matrix, the t78 clarification, QA/Security reports, relevant validator/rubric rules, and the user’s admission/staging contract. I recomputed candidate size/hash, inspected manifest linkage, and reran the dataset validator using its real exit status. I did not edit the candidate or manifest, access `.env`, or write to real Golden/generated data. My temporary inspection probes were removed.

## Artifact identity and manifest binding

The isolated candidate is `tmp/f01r2-isolated/repo/data/kb/golden/staging/golden_001.kb.json`:

- Candidate size: **27,036 bytes**.
- Candidate SHA-256: **`fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`**.
- The adjacent isolated manifest has exactly one asset entry pointing to `data/kb/golden/staging/golden_001.kb.json`; `byte_size=27036` and SHA-256 match the candidate.
- Metadata is `GOLDEN-001`, `contract_version=kb-002.1.2`, `evidence_level=E0`, and `qualified=false`.

This review concerns those exact bytes. The candidate is a source-grounded reconstruction, not byte-for-byte recovery of the lost t21 candidate.

## Claim-to-source mapping and honesty

I compared the candidate’s seven HistoricalClaims with Evidence Matrix §2–§3, the repository recipe/dish/catalog pointers, and clarification `31-f01r2-claim-mapping-clarification.md`.

| Claims | Candidate content and support | Review result |
|---|---|---|
| **C1 — identity/source pointer** | Statement: “仓库 dish_001 / recipe_001 指针将蟹酿橙关联到宋代及《山家清供》卷下；该仓库指针并非外部核实。” `dish_001` supplies the Song label/title pointer; `recipe_001` supplies the source title/volume; `lit_ccs_014` is a collected-series catalog pointer. | **PASS with narrowed scope.** It asserts what repository pointers associate, not that an authenticated historical edition has been externally verified. This is weaker and more accurate than the Matrix’s historical hypothesis “宋代（南宋）有文献记载”. It remains E2/B, `insufficient`, `unreviewed`, confidence unknown, with L2 expressly unverified. No claim of author attribution is made. |
| **C2 — method** | Candidate wording describes only steps present in the repository transcription: hollow orange, crab filling, cover, small steamer, steaming. | **PASS.** One repository transcription pointer only; E2/B and `insufficient`; no assertion of external authenticity. |
| **C3 — orange/container** | Statement: “仓库转录称使用黄熟大橙并将橙用作容器。” The quoted `original_text` says “橙用黄熟大者，截顶去瓤” and describes filling it. The separate compiler-authored `ingredients[0].role` says “容器兼调味”. | **PASS after narrowing.** The candidate omits “兼调味”; that phrase is not in the quoted passage and is not represented as a HistoricalClaim. Candidate wording is limited to the transcription-supported container use. Species remains unknown. |
| **C4 — crab ingredient** | Statement says the repository transcription uses crab paste/meat; specific crab species is not inferred. | **PASS.** E2/B, insufficient; no inference from modern adaptation. |
| **C5 — steaming detail** | Statement: “仓库转录记载入小甑蒸熟这一技法。” It is a narrower subclaim of C2 and points to the same passage. | **PASS with limitation.** It is not an independent source, corroboration, or extra N/D count; it does not raise evidence above E2. The candidate and clarification state this. |
| **C6 — crab species unknown** | Explicitly no support basis/`claim_supported_by`, E0, insufficient, unreviewed, unknown confidence. | **PASS.** Does not guess a species. |
| **C7 — geography unknown** | Explicitly no support basis/`claim_supported_by`, E0, insufficient, unreviewed, unknown confidence. | **PASS.** Does not infer region from dynasty. |
| **C8 — modern adaptation** | No C8 HistoricalClaim exists in the candidate. The separate recipe field `modern_adaptation` is compiler-authored advice, not quoted historical text. | **PASS.** The curator clarification preserves its boundary outside HistoricalClaims and outside level calculations; it is not converted into historical evidence. |

All seven candidate claims remain `insufficient` and `unreviewed`, with confidence `unknown`; C1–C5 use the repository passage as their only support pointer, while C6/C7 have no support edge. The SourceEdition is explicitly a series-level pointer, publisher `中国商业出版社`, `publication_year=null`; it does not assert a particular physical copy, facsimile, shelfmark, page, or external authenticity. No expert review or E5 is asserted.

## Evidence-level semantics: metadata E0 vs Q3 best E2

The candidate’s dish-level `metadata.evidence_level=E0` is **consistent**, not a mismatch: rubric §3.3 says dish metadata equals the **minimum** Claim level (the conservative level). Five claims are E2 and C6/C7 are E0, so the minimum is E0. In contrast, Q3 asks whether **any** HistoricalClaim reaches E3; `checkDish()` computes `best` by taking the highest claim level and emits `KB002_DISH_BELOW_E3` with `best: E2`. Thus:

- declared/computed dish minimum: E0 → no `KB002_DISH_LEVEL_MISMATCH`;
- highest supported claim: E2 → Q3 production admission fails;
- `qualified=false` correctly reflects the production-admission result.

This is the intentional distinction between candidate/staging validity and production admissibility, not a reason to change the candidate’s metadata.

## Manifest/path containment and staging-only readiness

I independently reviewed t69’s resolver and reports, and rechecked their adversarial claim using a disposable temp root: a manifest path with `../` targeting an external sentinel whose size/hash exactly matched was rejected with `KB002_MANIFEST_ASSET_PATH_INVALID`; the sentinel was unchanged. Valid contained assets pass, missing contained assets report `STAGING_ASSET_MISSING`, and malformed schema reports `KB002_MANIFEST_SCHEMA_INVALID`. The validator rejects such a path before target existence/hash/stat checks. No candidate or real dataset paths were mutated.

In the existing isolated repo-shaped root, the candidate validates under `--staging` with exit 0, visible `KB002_DISH_BELOW_E3`, `STAGING_VALID=true`, and `PRODUCTION_ADMISSIBLE=false`. This supports a **single staging-only import** of these unchanged bytes. It does not authorize promotion. Any import task must copy the exact reviewed candidate and manifest/hash into staging, verify the hashes after copy, and stop if either source or destination bytes differ.

## User-approved S8 deferral

No genuine, traceable E3+ candidate exists. The user explicitly deferred S8 until one exists. The synthetic E4 helper is mechanical test data only; it is neither historical evidence nor an S8 pass. This review accepts the artifact for staging-only preservation without waiving or passing S8. L2 external authenticity remains unverified; no E3 upgrade is authorized.

## Frozen real dataset state

After review:

- Real production Golden files: **0**.
- Real `data/kb/golden/staging/`: **empty**, no manifest.
- Real `--dataset`: exit 0, `QUALIFIED_GOLDEN_COUNT=0`, `SHORTFALL=10`, `STATUS=EMPTY_GOLDEN_SET`.
- HEAD: **`6a25f4f`**.
- User staged paths: **300**, unchanged.
- F01 72-error incident sample remains preserved.

## Verdict and authorization boundary

**PASS — authorize one controlled import of the unchanged F01R2 candidate plus its matching manifest into real staging only.** Keep `qualified=false`; retain the Q3 finding; do not write production; do not promote. Production admission has not been met. The explicit genuine-S8 deferral remains in force; synthetic E4 is not counted as evidence.
