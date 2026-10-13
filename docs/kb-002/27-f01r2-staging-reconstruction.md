# F01R2 Isolated Staging Reconstruction (t63, attempt 2)

**Outcome: one isolated GOLDEN-001 candidate reconstructed; staging-structure validation passes in the isolated root, while production admission remains false.** This is **not** an import into the repository's actual staging directory and is **not** a promotion.

## Evidence basis and limits

The prior t21 candidate bytes (reported as 30,484 bytes) are unrecoverable. The matrix's append-only §7 explicitly says the claimed t21 artifact was never on disk; therefore this is a source-grounded reconstruction, **not byte-for-byte recovery**. I did not open or copy the 72-error invalid artifact.

The authorized Evidence Matrix maps only the following five claims to the single `recipe_001.original_text` / `dish_001.source_passage` transcription pointer:

| Claim ID | Exact support mapping | Computed grade | Candidate treatment |
|---|---|---:|---|
| `claim_g001_identity` (C1) | `recipe_001` / `dish_001` pointer + `lit_ccs_014` series-level pointer → `passage_g001_xieniangcheng_juanxia` | E2 (SOURCE_GRADE=B) | `insufficient`, `unreviewed`, confidence `unknown`; derivation unresolved; external L2 unverified |
| `claim_g001_method_steaming` (C2) | Repository transcription only → same passage | E2 (B) | `insufficient`, `unreviewed`; no claim of source authenticity |
| `claim_g001_ingredient_use_orange` (C3) | Repository transcription only → same passage | E2 (B) | `insufficient`; citrus species remains unknown |
| `claim_g001_ingredient_use_crab` (C4) | Repository transcription only → same passage | E2 (B) | `insufficient`; crab species remains unknown |
| `claim_g001_technique_steaming_detail` (C5) | Repository transcription only → same passage | E2 (B) | `insufficient`; no claim about utensil construction or faithful modern restoration |
| `claim_g001_crab_species_unknown` (C6) | Matrix explicitly says no supporting evidence | E0 | No `claim_supported_by`; `insufficient`, `unreviewed`, confidence unknown |
| `claim_g001_geography_unknown` (C7) | Matrix explicitly says no supporting evidence | E0 | No `claim_supported_by`; `insufficient`, `unreviewed`, confidence unknown |

C8 is a modern-adaptation/compiler note, not a historical claim and is not used as historical evidence. The matrix reports no dish-specific contradiction; none was invented. Unrelated V1 `recorded_in` conflicts for other dishes were not copied into GOLDEN-001.

The matrix supports `SOURCE_GRADE=B` for the collected-series edition pointer: the publisher is present, but no verifiable publication year is present, so grade A is not achieved; no facsimile/shelfmark supports S. The candidate stores the known series-level title/publisher, leaves publication year null with `unknown_fields`, and does not assert a specific physical copy, catalog shelfmark, page, URL for this edition, external source verification, expert review, or E5. The passage is explicitly labeled a repository transcription, not an externally verified original. `edition_resolution=resolved` denotes the explicit repository title/volume pointer to the series entry only; it is not L2 authentication.

## Isolated files and manifest integrity

Candidate path (temporary repo-shaped root):
`tmp/f01r2-isolated/repo/data/kb/golden/staging/golden_001.kb.json`

Candidate size: **27,036 bytes**  
Candidate SHA-256: **`fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`**

Manifest path:
`tmp/f01r2-isolated/repo/data/kb/golden/staging/manifest.json`

The manifest contains exactly one asset entry; `relative_path` is `data/kb/golden/staging/golden_001.kb.json`, `byte_size=27036`, and the manifest SHA-256 matches the candidate. Manifest file size: **598 bytes**.

## Isolated validation

`KB002_GOLDEN_ROOT` was set to `tmp/f01r2-isolated/repo`; commands were run against this isolated root:

- `node scripts/kb002/validate-golden.mjs --staging data/kb/golden/staging` → **exit 0**
  - `STAGING_CANDIDATE_COUNT = 1`
  - `STAGING_MANIFEST_PRESENT = true`
  - `STAGING_MANIFEST_ASSET_COUNT = 1`
  - `STAGING_VALID = true`
  - `PRODUCTION_ADMISSIBLE = false`
  - Q3 remains visibly reported: `KB002_DISH_BELOW_E3` (`best: E2`)
- Explicit isolated candidate-file `--staging` validation → **exit 0**, with the same visible Q3 finding and status fields.
- `node scripts/kb002/validate-golden.mjs --dataset` with the isolated root → **exit 0**; `QUALIFIED_GOLDEN_COUNT=0`, `SHORTFALL=10`, `STATUS=EMPTY_GOLDEN_SET`, `KNOWN_DATA_GAP=10`.

The candidate's own `metadata.evidence_level` is E0 (minimum across its E2 and E0 claims), and `qualified=false`, matching the validator-calculated result. The visible Q3 finding is a production-admission result; no bypass, promotion, or real dataset import occurred.

## Actual repository freeze

After isolated validation, I confirmed the real repository dataset remains unchanged:

- Production Golden files: **0**
- Real staging directory: **empty**, manifest absent
- Real `--dataset`: **exit 0**, `QUALIFIED_GOLDEN_COUNT=0`, `SHORTFALL=10`, `STATUS=EMPTY_GOLDEN_SET`
- HEAD: `6a25f4f`
- User staged paths: **300**, unchanged
- No writes to real `data/kb/golden/**` or `data/kb/generated/**`

Only GOLDEN-001 was reconstructed; no F02+ work or promotion was performed. The isolated candidate is temporary research material only.
