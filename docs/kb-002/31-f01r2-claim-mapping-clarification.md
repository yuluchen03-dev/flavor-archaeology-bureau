# F01R2 Claim-Mapping Clarification (Append-only)

**Purpose:** Address the four claim-mapping clarification findings raised by final QA t75. This is a curator clarification only. It does not alter the isolated candidate, its manifest, the Evidence Matrix, or any QA/Security report. At clarification time, candidate bytes remained 27,036 bytes with SHA-256 `fa923ce875e0332220f1e125c05a7b1cf71b26f82790a2e941c690985e003964`; no import into real staging and no promotion is authorized.

## Source references

- Authorized Evidence Matrix: `docs/kb-002/11-golden-001-evidence-matrix.md` §0 (source pointers), §1 (source grade), §2 (Claims C1–C8), §2.1 (conflict status), §3 (computed levels), §6.6 (unknowns), and §7 (prior candidate-loss correction).
- Repository recipe pointer: `data/recipes/ancient_recipes.json`, `recipe_001`, especially `source` and `original_text` (lines 3–7), ingredients (lines 8–14), and modern-adaptation note (line 24).
- Repository dish pointer: `data/knowledge_graph/nodes_dish.json`, `dish_001`, especially `name`, `dynasty`, `source_text`, and `source_passage` (lines 3–8).
- Repository collected-series pointer: `data/literature/authoritative_recipe_texts.json`, `lit_ccs_014`, especially `title`, `collection`, `included_texts`, and `authority` fields (lines 2595–2616). This is a series-level catalog pointer, not proof of a specific physical edition or external L2 authenticity.
- Rubric source-level calculation: `docs/kb-002/02-evidence-quality-rubric.md` §3.2.1, R1–R5; Matrix §1 concludes the edition is grade B, and §3 calculates C1–C5 as E2 and C6–C7 as E0.
- Candidate/staging vs production: `docs/kb-002/12-contract-admission-semantics.md` §§2 and 6. Staging validity is distinct from production admission; Q3 remains a production blocker.

## Finding dispositions

### C1 — Narrowed to a repository-pointer claim; not the stronger Matrix wording

**QA concern:** The isolated candidate statement risked reading as the Matrix's stronger historical assertion that “蟹酿橙为宋代（南宋）有文献记载的菜品，载于《山家清供》卷下.”

**Clarification:** The candidate's C1 wording is intentionally narrower: it records that repository pointers `dish_001` and `recipe_001` associate the dish with a Song label and 《山家清供》卷下. It does **not** assert that the historical source, edition, or transcription has been externally authenticated. The underlying Matrix C1 is still preserved as a research hypothesis at E2/B, `insufficient`, `unreviewed`; the narrowed wording is not a replacement for, nor an upgrade of, that Matrix claim. If the candidate's actual text is later found to state the stronger historical-documentation proposition without this qualification, do not import it until corrected through a new authorized task.

**Disposition:** Clarification only; no new historical fact is asserted. External L2 authenticity remains unverified.

### C3 — “兼调味” omitted because it is not in the quoted passage

**QA concern:** C3 included the phrase “容器兼调味,” while the quoted `original_text` does not say that the orange is used as a seasoning.

**Clarification:** The quotation says “橙用黄熟大者，截顶去瓤” and describes filling the orange with crab paste/meat. It supports describing the orange as a container in the repository transcription. The separate recipe metadata at `recipe_001.ingredients[0].role` says “容器兼调味,” but that role is compiler-authored recipe metadata, not part of `original_text`. Therefore the isolated candidate's C3 wording is limited to the quoted-text-supported “使用黄熟大橙并将橙用作容器”; “兼调味” is not included as a historical claim. If the candidate bytes still contain a C3 statement asserting “兼调味,” that byte-level discrepancy is **unresolved** and must not be silently waived: do not import until a separately authorized correction is made.

**Disposition:** Claim scope narrowed to the transcription. The recipe metadata remains a distinct repository note, not quoted historical text.

### C5 — Overlaps C2 and is not independent evidence or an extra count

**QA concern:** C5 (“关键技法为蒸”) restates a detail already contained in C2's method claim and must not be treated as an independent source or independent evidentiary contribution.

**Clarification:** Matrix C2 is the full method statement; C5 is a narrower subclaim extracted from the same single `recipe_001.original_text` / `passage_g001_xieniangcheng_juanxia` pointer. Both map to the **same** passage and same grade-B source. C5 adds no new source, no independent corroboration, and no extra N/D count. It cannot raise the evidence level above E2. Both claims remain `insufficient` and `unreviewed` because the source is grade B and L2 external verification is unavailable. The candidate's duplicated claim is retained only as a separately identified subclaim for traceability; it is not evidence multiplication.

**Disposition:** Explicitly non-independent; no level uplift or additional source count.

### C8 — Modern-adaptation boundary kept outside HistoricalClaims

**QA concern:** Matrix C8 concerns modern kitchen adaptations and must not be represented as a historical fact.

**Clarification:** The only repository pointer is `recipe_001.modern_adaptation` (a compiler-authored note: modern cookware substitution and alternative crab choices). It is not quoted in `recipe_001.original_text` and does not establish Song-period practice. Therefore C8 is excluded from the candidate's `HistoricalClaim` set. Its boundary is preserved here as a curator/restoration note: modern substitutions are modern adaptation guidance, not historical evidence, and they do not support any E-level calculation.

**Disposition:** No C8 HistoricalClaim, no evidence-level contribution, no historical inference from the adaptation note.

## Integrity, byte state, and unresolved items

- No candidate, manifest, Evidence Matrix, QA report, or Security report was changed by this clarification.
- The prior candidate's original 30,484-byte contents cannot be recovered; t63's isolated reconstruction is not byte-for-byte recovery.
- The isolated candidate remains temporary research material only. This report does not authorize copying it into the repository's real staging directory.
- If byte-level inspection shows C1 or C3 text does not match the clarified wording above, treat that as unresolved and keep the candidate out of any real staging import pending a new scoped curator task and independent re-review.
- Production remains frozen at 0 files; real staging remains empty; `qualified=false`; Q3 remains visible and blocks production admission. No promotion is performed.
