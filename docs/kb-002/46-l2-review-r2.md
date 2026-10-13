# KB-002-L2 — FRESH-CONTEXT INDEPENDENT FINAL REVIEW (round 2)

**Reviewer**: independent fresh-context reviewer (did **not** participate in research, curation, repair t7/t10, security t4/t13, or QA t3/t12)
**Date**: 2026-10-12
**Scope**: repaired L2 evidence package for `GOLDEN-001` 蟹釀橙（《山家清供》林洪）vs Evidence Level E2 → E3
**Verdict**: **`REQUEST_CHANGES`**

> I wrote exactly one file — this report. Every other path in the repository was read-only for me.

---

## 1. Execution conditions (what I could and could not do)

| Capability | Status | Evidence |
|---|---|---|
| `pwsh` process launch | **WORKED** | `node --version` → `v24.15.0`; validators and `Get-FileHash` produced real output |
| `node scripts/kb002/validate-golden.mjs` | **RAN, exit 0** (all three modes) | see §2 rows M1–M3 |
| read / glob / grep tools | **WORKED** | all file inspection below |
| `read_image` | **WORKED** | 3 frames rendered (§2 row I1) |
| **Network / fresh HTTP fetch** | **NOT ATTEMPTED** | explicitly out of scope; I re-read landed bytes only. No HTTP status in this report is a fresh observation. |
| git history as an append-only witness | **UNUSABLE** | `git status` shows a large unrelated dirty tree; `docs/kb-002/**` (incl. `11-…`) is **untracked** — no committed baseline exists to diff against. Line-number/content anchors were used instead. |

**Distinction I maintain throughout**: every capture artifact I cite (URL / `http_status` / `byte_length` / `sha256`) is **evidence captured earlier and re-read from disk by me now**, re-verified by recomputing hashes over the landed bytes. I performed **no** new network request. The machine-validator runs (M1–M3) **are** executions I performed in this round.

---

## 2. Independent check results

Legend: **PASS** = claim independently confirmed · **FAIL** = claim contradicted · **PARTIAL** = partly confirmed, residual gap.

| # | Check | Method | Observed evidence | Result |
|---|---|---|---|---|
| **RV-01** | `40-l2-security.md` no longer claims the validator ran this round | read `40` §5 (l.199–203), §7 (l.235–254), §8 (l.263) | l.238–240 `validate-golden --staging → NOT_RUN — SHELL_UNAVAILABLE`; l.200–202 "validator 本轮未能运行 … 不存在任何退出码或 stdout"; l.245 baseline block labelled "**仅供对照**，系 outage 之前取得"; l.251 "**也不代表**审计员在本轮复跑过这些命令". No unqualified current-round run claim remains. | **PASS** |
| **RV-02 / F-1a** | OCLC identifiers now `unknown` in current substantive records | grep `OCLC` across `11`, `37a`, `38`, `41` | `11:1157` `OCLC unknown（未取得可核验来源 — 见 §9.14.27 F-1）`; `11:1305`, `11:1307` `OCLC unknown（…）`; `37a:366`, `37a:409`, `37a:541`, `37a:542` unknown; `38:62`, `38:142` unknown; `41:205` unknown. No field asserts a numeric OCLC. | **PASS** |
| **RV-02 / F-1b** | Traceable correction ledger exists | read `11` §9.14.27 (l.1649–1693), `42-l2-oclc-repair-record.md` | `11:1671–1677` = full original → corrected → reason → date table; `42` documents the same plus append-only rationale and scope declaration. | **PASS** |
| **RV-02 / F-1c** | Princeton record **not deleted**; other fields survive | read `out-p3g/index.json` + both `.txt` bodies | Both records still present: `princeton-A-9943038583506421` (3326 B, `9100/1035.13 vol.32`, 藝文印書館, 民國55 [1966], 夷門廣牘;第3函) and `princeton-C-9945512533506421` (2603 B, `9100/3525 v.456`, 臺灣商務印書館). `11` still lists `L2R2-SRC-011` and `011b`. | **PASS** |
| **RV-02 / F-1d** | **Underlying claim: those two values have no source in `tmp/l2-evidence/`** | own recursive grep for `51793193` / `27170244` over the whole evidence tree | **2 hits each**, and they are *not* "no hits": `51793193` occurs **inside** `out-p3g/princeton-A-9943038583506421.{txt,bin}` as `"oclc_s"…{"value":["51793193"],"label":"OCLC"}`; `27170244` occurs **inside** `out-p3g/princeton-C-9945512533506421.{txt,bin}` as `{"value":["27170244"],"label":"OCLC"}`. Neither value appears anywhere else. | **FAIL** — see **RV2-01** |
| **RV-02 / F-1e** | Stated rationale "Princeton JSON is truncated before the OCLC field" | byte-level inspection of both bodies | Both files are **complete, valid, untruncated JSON ending in `}}}}`**; literal `truncated` is **absent** (`A_has_truncated=False`); `oclc_s` sits before `original_language_display`, i.e. **before** the final fields. Truncation is impossible for a file whose closing braces are present. | **FAIL** — see **RV2-01** |
| **QA-R2-01** | `40` carries a prominent Captain addendum reconciling historical `fabricated_catalog = 1` with current `0`, without erasing history | read `40` l.1–19 | Addendum at l.3–19 states the body is the pre-repair **historical snapshot "内容仍然真实、保留不改"**; table gives current `fabricated_catalog = 0`, marks old value **"已被取代，不得当作当前门禁结果"**, points to `44-l2-security-r2.md` as authoritative, and is signed as Captain's, **not** the security member's ("**不冒充**其署名"). Body §§0–10 preserved intact. | **PASS** |
| **QA-R2-02** | `41-l2-final-report.md` updated; no stale round-1 placeholders; accurate E2 / no-promotion outcome | read `41` l.1–120, grep `OCLC` | l.3 `Status: FINAL`; l.13 `GOLDEN-001_STAGING_VERIFIED_E2`; l.26–29 now records Security t13 PASS (scoped), QA-R2 REQUEST_CHANGES (**documentation only**, fixed), and honestly states **round-2 reviewer had not completed** rather than claiming PASS; l.30 `promotion = NO; production = 0; qualified = false`; l.205 OCLC = unknown. No round-1 placeholder left. | **PASS** |
| **I1** | Facsimile images: inspect `scan-0001.png`, `scan-0002.png` myself | `read_image` on both (+ `scan-0003.png`) | **scan-0001** 800×1565: a **cover / title leaf** — vertical framed cartouche reading 「**景明刻本 夷門廣牘**」 with 「**十五**」 in the lower box. **scan-0002** 800×1162: a **woodblock table-of-contents leaf** — first column 「**山家清供目錄 / 上卷**」, then double-column dish titles 青精飯・苜蓿盤・太守羹・藍田玉・蟠桃飯・黃金雞・地黃餛飩 / 碧澗羹・考亭蔞・水壺珍・豆粥・寒具・槐葉淘・梅花湯餅. **scan-0003** 800×1177: continuation 椿根餛飩・百合麪・素蒸鴨・傍林鮮・錦帶羹・土芝丹・松黃餅・元修菜・銀絲供 / 玉糝羹・括蔞粉・黃精果・雕胡飯・煿金煮玉・柳葉韭・酥瓊葉・紫英菊・鳧茈粉. All three descriptions match `37-captain-recon-p1-p2-p3.md:166–168` **exactly**, item for item. **None is the target dish (page 47) leaf.** | **PASS** |
| **I2** | `40` §2.2 claim that `scan-000N.png` are re-encoded viewer copies with hashes **different** from the network records | recompute SHA-256 of `scan-000N.png` and of the corresponding network `.bin` | **Identical in all three cases**: scan-0001 = `e8989b65b30ca0d85b84f3a80eeb2b9e366434cb6d9a3a11616185eb02076cad` = `out-img1/img-s0840015-0001.bin` (108712 B); scan-0002 = `ce73429aa7bf32165327b368804aa55986baa198203b71c1ef16cf9fa62945b6` = `out-img2/img-s0840015-0002.bin` (19432 B); scan-0003 = `060e41b4f65ecedfba3a6bb4c204e3f606a50bb42a198cdd7a304ab6f4dfd3ff` = `out-a4/img-s0840015-0003.bin` (20158 B). All three files begin `89 50 4E 47 0D 0A 1A 0A` = **true PNG**. | **FAIL** — see **RV2-02** |
| **SCAN_PAGE_VERIFIED** | target `file=83896&page=47` is behind a login gate ⇒ `false` is correct | read `out-p1c/ctext-viewer-83896-p47.txt` in full | Body contains `請<a href="account.pl?if=gb">登入帳戶</a>以顯示這一頁。` and a `#logininfo` block linking `account.pl?…return=%2Flibrary%2Epl%3Fif%3Dgb%26file%3D83896%26page%3D47`. No page image or OCR body is served. Additionally `out-img1/index.json` and `out-img2/index.json` record `s0840015_0047.png`, `…_046.png`, `…_048.png`, `…_047.png` all as **HTTP 404, 0 bytes**. `SCAN_PAGE_VERIFIED=false` is correct; no access control was bypassed. | **PASS** |
| **C1–C9** | claims supported by captured source text; three-way divergence preserved | substring-verify each claim's quoted fragment in the three landed witnesses | **CText** (`out-p1b/ctext-wiki-chapter-917283.txt`) yields **True** for all 10 probed fragments incl. `加苦酒入鹽供` and `危異齋`. **Wikisource** (`wikisource-shanjiaqinggong.txt`) yields **True** for `橙用黃熟大者截頂`, `仍以帶枝頂覆之`, `用醋鹽供食`, `危巽齋`. **識典** (`out-p3a/shidianguji-GJDS006-45.txt`) yields **True** for `橙大者截頂`, `以蟹膏肉實其内`, `如苦酒，入鹽供`. The three-way C7 divergence and the C9 `異/巽` variant are **stated in `11:1393–1412` and preserved, not smoothed** — and I reproduced all three readings myself. | **PASS** |
| **V1** | no manual Evidence upgrade | read `data/kb/golden/staging/golden_001.kb.json` + run `--staging` | validator Q3: `KB002_DISH_BELOW_E3 — no HistoricalClaim reaches Evidence Level >= E3 (best: E2)`; `STAGING_VALID=true`, `PRODUCTION_ADMISSIBLE=false`. Metadata/qualified state as recorded in `45` §2. | **PASS** |
| **V2** | candidate / manifest SHA-256 | `Get-FileHash` recompute | `golden_001.kb.json` = 27036 B, `FA923CE875E0332220F1E125C05A7B1CF71B26F82790A2E941C690985E003964`; `manifest.json` = 598 B, `C4DD8C3B9CC0EA91326F476B74A38B5EA53C869C2E5F8547F0098137C50923C8`. **Both match `45-l2-qa-r2.md:57–58` and `40:227–229`.** | **PASS** |
| **M1** | `--staging` | executed | `STAGING_CANDIDATE_COUNT = 1`; `STAGING_MANIFEST_PRESENT = true`; `KB002_DISH_BELOW_E3 (best: E2)`; `STAGING_VALID = true`; `PRODUCTION_ADMISSIBLE = false`; **exit 0** | **PASS** |
| **M2** | `--integrity` | executed | candidate/manifest presence reported; **exit 0** | **PASS** |
| **M3** | `--dataset` | executed | `QUALIFIED_GOLDEN_COUNT = 0`; `SHORTFALL = 10`; `STATUS = EMPTY_GOLDEN_SET`; `KNOWN_DATA_GAP = 10`; **exit 0** | **PASS** |
| **W1** | capture metadata integrity at scale (beyond the 4–5 spot-checks requested) | scripted recompute of SHA-256 **and** byte length for **every** `file` reference in every landed `index.json` | **52 records scanned; 51/52 hash- and length-verified.** The single non-verified record is `out-p3d/nlc-guji-index`, whose own index honestly records `http_status: null, byte_length: 0, sha256: null, error: "TypeError: fetch failed", file: null` — i.e. a **declared failure**, not a mismatch. Zero silent mismatches. | **PASS** |
| **A1** | append-only: `11` lines 1–772 unchanged, §9.14 starts at 778 | line-anchored read of `11` | File is 1696 lines. Line 772 = `**注意**：本条仅记录一次 **route smoke**…（§0/§40 遵守）。` — a plausible original final line; lines 773–777 blank/`---`; **line 778 = `### 9.14 L2 轮次追加证据…（append-only）`**, and l.780 self-declares "追加时 §0–§9.13 共 **772 行**". Boundary is exactly as claimed. | **PASS** |
| **R1** | release posture truthful | read `41`, `44`, `45` + validators | `promotion = NO` / `production = 0` / `qualified = false` consistently stated; `manifest` reports `promotion_status=not_promoted`; dataset validator confirms 0 qualified. Machine-gate status is reported truthfully: Security's PASS is explicitly scoped and explicitly **excludes** machine gates (`40:15`), while the validator runs are attributed to **QA t12** (`45` §1.1) — a correct attribution I independently reproduced (M1–M3). | **PASS** |

---

## 3. Findings

### RV2-01 — **`blocker`** — The F-1 rationale is factually false; the "unsupported" OCLC values *are* supported by landed evidence

**Files / lines**
- `docs/kb-002/42-l2-oclc-repair-record.md:26` — "**单行 JSON，`(line truncated)`，在 OCLC 字段前中断**"
- `docs/kb-002/42-l2-oclc-repair-record.md:28` — "检索命中的 4 处均为 Princeton 输出的**同一条截断行**，其中**并无** `51793193`/`27170244` 字面量"
- `docs/kb-002/42-l2-oclc-repair-record.md:35` — "落盘响应体在 OCLC 字段**之前**即被截断，故该字段**从未进入落盘证据**"
- `docs/kb-002/42-l2-oclc-repair-record.md:52`, `:60`, `:158` — repeated rationale, and the claim that `call_number` survives on exactly the same basis
- `docs/kb-002/11-golden-001-evidence-matrix.md:1169`, `:1660`, `:1665`, `:1672`
- `docs/kb-002/37a-l2-research-findings.md:374`, `:412`, `:849`, `:859`, `:861`
- `docs/kb-002/40-l2-security.md:106–107`, `:133–136`, `:170`
- `docs/kb-002/41-l2-final-report.md:206`, `:345`

**Problem.** The whole F-1/RV-02 chain rests on one factual assertion: that the Princeton response bodies are truncated *before* the `oclc` field, so no OCLC value ever entered the landed evidence. **That assertion is false, and I disproved it by direct inspection.**

1. `tmp/l2-evidence/out-p3g/princeton-A-9943038583506421.txt` contains, verbatim:
   `"oclc_s":{"id":"https://catalog.princeton.edu/catalog/9943038583506421#oclc_s","type":"document_value","attributes":{"value":["51793193"],"label":"OCLC"}}`
2. `tmp/l2-evidence/out-p3g/princeton-C-9945512533506421.txt` contains:
   `"oclc_s":{…"attributes":{"value":["27170244"],"label":"OCLC"}}`
3. Each value occurs **exactly twice** in the evidence tree — both times inside its own Princeton record: `51793193` only in the A pair, `27170244` only in the C pair. **Zero** other occurrences.
4. Neither body is truncated. `A_has_truncated=False`; both files end in the closing braces `}}}}` that terminate the JSON document; `oclc_s` appears **before** the final `original_language_display` field. A file that ends with its closing braces cannot have been cut off before an earlier field.
5. The `byte_length` figures cited as truncation evidence (3326 / 2603) are numerically correct — they are simply the **complete** response sizes, not truncation artifacts. `index.json` confirms **no** `error` on either record.

**Consequence.** The two OCLC values were *not* unsupported. They were **supported by the landed Princeton capture all along**, and statements to the contrary — including "该字段**从未进入落盘证据**" and the claim that the same evidence supports `call_number` but not `OCLC` — are inaccurate. The finding F-1 and its repair RV-02 therefore rest on a **false premise**. This is exactly the class of defect this review exists to catch: not a fabricated number, but an **incorrect provenance rationale** propagated through `11`, `37a`, `38`, `40`, `41`, `42`, and endorsed by `44` and `45`.

**Required fix.**
1. Correct the characterization in `42`, `11` §9.14.27, `37a` §14, `38` §8, and `40` §3: the Princeton JSON bodies are **complete**, and `oclc_s` **is present** in both.
2. **Restore** `OCLC 51793193` (record A) and `OCLC 27170244` (record C) to the `identifier` fields, citing `tmp/l2-evidence/out-p3g/princeton-{A,C}-*.txt` as the source, with `http_status 200 / byte_length / sha256` from `out-p3g/index.json`.
3. Remove the now-incorrect `limitations` sentences asserting the OCLC value could not be verified.
4. Re-issue the correction ledger as a **second** entry (append-only): record the original → `unknown` → **restored** transition with the reason, so the history of this error is preserved rather than erased.
5. Re-run the Security gate (§46 `fabricated_catalog`) against the corrected values and re-verify that the earlier `unknown` period is not silently dropped.

> Note: `40:134–136` also states the bodies are `单行、被截断（…"label" (line truncated)）`. I found **no** literal `truncated` in either body. Whatever produced that reading, the landed bytes do not support it. This should be corrected as well.

### RV2-02 — **`high`** — `40-l2-security.md` §2.2 asserts a hash difference that does not exist, and two mutually contradictory claims about the same three files stand in the package

**Files / lines**
- `docs/kb-002/40-l2-security.md:99–112` (§2.2), esp. `:101–103` and `:106–107`
- contradicts `docs/kb-002/37-captain-recon-p1-p2-p3.md:164–168`, `:175`

**Problem.** `40` §2.2 states that `scan-000N.png` have sha256 `95e1f7a0…` / `a389d195…` / `40bc7831…` and that these **differ** from the network records' `e8989b65…` / `ce73429a…` / `060e41b4…`, concluding the local files are "**查看器/归一化副本**" that were re-encoded.

I recomputed all six hashes myself. **The pairs are byte-identical:**

| file | sha256 (recomputed now) | bytes | equals network capture |
|---|---|---:|---|
| `scan-0001.png` | `e8989b65b30ca0d85b84f3a80eeb2b9e366434cb6d9a3a11616185eb02076cad` | 108712 | `out-img1/img-s0840015-0001.bin` ✅ identical |
| `scan-0002.png` | `ce73429aa7bf32165327b368804aa55986baa198203b71c1ef16cf9fa62945b6` | 19432 | `out-img2/img-s0840015-0002.bin` ✅ identical |
| `scan-0003.png` | `060e41b4f65ecedfba3a6bb4c204e3f606a50bb42a198cdd7a304ab6f4dfd3ff` | 20158 | `out-a4/img-s0840015-0003.bin` ✅ identical |

All three are genuine PNGs (`89 50 4E 47 0D 0A 1A 0A`). The `95e1f7a0…` / `a389d195…` / `40bc7831…` values in `37-captain-recon` and in `40` §2.2 are **not** the SHA-256 of these files; they are in fact the digests `read_image` reports for its **normalized preview** (the `95e1f7a0…` and `a389d195…` values I obtained from `read_image` in this very review match them exactly), while `read_image` simultaneously reports the **source** digest as the `e8989b65…`/`ce73429a…` series. So `40` §2.2's "network vs local differ" conclusion is an artifact of confusing a preview digest with a file digest.

Two further problems in the same passage: `40` §2.2 says `read_image` "实测将其报告为 JPEG 而非 PNG，说明已被重新编码" — the files begin with the PNG signature and are byte-identical to `content_type: image/png` network captures, so they were not re-encoded; the JPEG/WebP labels are `read_image`'s preview format. And `40:107` states the network originals were "另存于 `out-img1`/`out-img2`/`out-a4` 的 `*.bin`" as if those were *different* bytes — they are the *same* bytes.

**Impact.** The §2.2 conclusion happens to land on "not a finding", so no evidence was wrongly rejected — but the reasoning is wrong, and the package now contains two contradictory statements about the same three artifacts (`37:164–168` plainly labels the second hash set as "**Captain 读取值**", which is the accurate reading). Reader-facing confusion about which hashes authenticate the facsimiles is a real provenance defect.

**Required fix.** Correct `40` §2.2 to state that `scan-000N.png` are **byte-identical** to the `library.ctext.org` network captures (same SHA-256, same byte length, valid PNG), that they are therefore *not* re-encoded copies, and that the `95e1f7a0…`/`a389d195…`/`40bc7831…` values are `read_image` **preview** digests — not file digests. Keep the historical text but append a labelled correction (as done for QA-R2-01), and align `37:164–168`'s parenthetical so the two documents no longer contradict each other.

### RV2-03 — **`medium`** — QA-R2-01's reconciliation table itself carries the RV2-01 false premise into the "current authoritative status" block

**File / lines**: `docs/kb-002/40-l2-security.md:11–13` (Captain addendum)

**Problem.** The addendum is the *authoritative current-status* statement readers are told to trust, and it asserts the repair premise as settled: "由 scoped repair **t7 / L2-REPAIR-01** 将两值改为 `OCLC unknown（未取得可核验来源）`" with `fabricated_catalog = 0` because "两个值已不再以确定语气陈述". Since the premise is false (§RV2-01), this addendum currently certifies as **current** a state that removed two *correctly sourced* identifiers — and it makes the removal, rather than the identification of values, the basis for the `0` count.

**Required fix.** After RV2-01 is resolved, update the addendum so its "current" column reflects the restored values and their landed sources, and so the `fabricated_catalog = 0` basis is stated as "both values are traceable to `out-p3g` captures" rather than "the values were removed". Keep the historical `1 类` snapshot text untouched.

### RV2-04 — **`low`** — `41-l2-final-report.md` still attributes F-1/RV-02 to the same false truncation rationale

**File / lines**: `docs/kb-002/41-l2-final-report.md:205–207`, `:344–347`

**Problem.** `41:346` says t7 "已将两值改为 `OCLC unknown（未取得可核验来源）`" and `41:345`/`:206` repeat "Princeton JSON 在 OCLC 字段前截断". These inherit RV2-01. Because `41` is the top-level deliverable, this propagates the incorrect provenance rationale to any downstream reader who reads only the final report.

**Required fix.** After RV2-01 is resolved, update `41` to state that both OCLC values are present in the `out-p3g` captures, that they were restored with source citations, and that the interim `unknown` period is recorded in the correction ledger. Do not remove the historical narrative.

---

## 4. Verdict

# **`REQUEST_CHANGES`**

`RV2-01` is a **blocker**: the F-1/RV-02 repair chain — the central substantive change of this round — is built on a factual assertion about the evidence that I disproved by direct byte-level inspection. The OCLC identifiers were never unsupported; they are present in the landed Princeton captures, and the bodies said to be "truncated before the OCLC field" are complete JSON ending in their closing braces.

Everything else I checked held up. RV-01 is genuinely closed. QA-R2-01 and QA-R2-02 are genuinely closed. The append-only boundary is exactly as claimed. All three machine validators ran and exited 0 with the stated values. Candidate/manifest hashes match. 51 of 52 landed capture records verify against their `index.json` by both SHA-256 and byte length, with the 52nd an honestly declared fetch failure. The facsimile images are genuine, and I independently read all three as the cover leaf and two table-of-contents leaves — none being the target dish page. The login gate on page 47 is real and quoted verbatim, so `SCAN_PAGE_VERIFIED = false` is correct. C1–C9 are supported by the captured text, and I reproduced the C7 and C9 divergences myself rather than taking the matrix's word for them. Release posture is truthful and no manual upgrade occurred.

The package's transparency is genuinely good — the failures I found are errors of analysis, not of concealment, and the append-only discipline made them findable. But a false provenance rationale that has been copied into eight documents, blessed by two independent gates, and made the load-bearing justification for deleting two correct bibliographic identifiers cannot ship.

```text
L2-REVIEW-R2 VERDICT = REQUEST_CHANGES
BLOCKING FINDINGS: RV2-01 (blocker)
ADDITIONAL: RV2-02 (high), RV2-03 (medium), RV2-04 (low)
PROMOTION: NO
EVIDENCE LEVEL: E2 (best), no upgrade — unchanged and correct
```

---

## 5. Limitations — what I could **not** independently verify

1. **No fresh network access.** I made no HTTP request. Every URL, `http_status`, `byte_length` and `sha256` in this report is **re-read from landed bytes and re-hashed by me**, not observed from a live server. I cannot confirm the captures still correspond to what those sites serve today.
2. **`sha256` absent on one record.** `L2R2-SRC-011`'s Princeton A record *does* carry a hash in `out-p3g/index.json` (`2ecfd7cc…`), which I verified — but `40:87` records it as "（记 unknown）". I note the discrepancy without resolving which document is authoritative for that field; it is cosmetic relative to RV2-01.
3. **`(line truncated)` provenance unresolved.** I confirmed the literal string `truncated` is **absent** from both Princeton bodies, but I could not determine what produced the `40`/`42` claim that it was present. I did not inspect the fetching script's truncation logic; that is a separate avenue a repairer should pursue.
4. **append-only uniqueness not provable.** `docs/kb-002/**` is untracked in git, so I verified the line-772/778 boundary and the self-declared "772 行" anchor but **cannot** prove by diff that no earlier line was edited. My confirmation is structural and content-anchored, not a cryptographic comparison against a prior revision.
5. **No re-run of the wider test suite.** I ran only the three specified `validate-golden` modes. I did not execute the `golden-validator` / `t24` / kb-schema / graph / literature tests that `45:141–148` reports, nor did I locate an ALIGN-03 entry point. Their results are **NOT independently verified** by me.
6. **`claim`-level grading not re-derived.** I confirmed each C1–C9 quoted fragment exists in the named witness and that the divergences are preserved. I did **not** independently re-derive the `DIRECT` / `E2` mechanical grade from the rubric; I confirmed only that the validator still reports `best: E2` and `< E3`.
7. **C9 in 識典 not confirmed.** `11:1391` records 識典 as "（未见）" for C9; I did not exhaustively search the 識典 capture for an alternate rendering.

---

## 6. Scope declaration

I **created exactly one file** in this session:

```text
docs/kb-002/46-l2-review-r2.md   (this report — new)
```

I modified **nothing** else. Specifically, I did **not** modify: `11-golden-001-evidence-matrix.md`, `37-captain-recon-p1-p2-p3.md`, `37a-l2-research-findings.md`, `38-l2-evidence-curation.md`, `40-l2-security.md`, `41-l2-review.md`, `41-l2-final-report.md`, `42-l2-oclc-repair-record.md`, `43-l2-rv01-repair-record.md`, `44-l2-security-r2.md`, `45-l2-qa-r2.md`, the candidate `data/kb/golden/staging/golden_001.kb.json`, the `manifest.json`, any file under `tmp/l2-evidence/`, any script, Contract, Rubric, Q3, schema, staging/production data, or any business source.

One incidental artifact was created by my own tooling and is disclosed for completeness: my bulk hash-verification script wrote `tmp/_rv2_hashes.csv` (a working scratch file outside the deliverable tree). No source or evidence artifact was touched.

**No fabrication.** Every exit code, validator line, hash, byte length and image description in this report is either output I generated in this session or a value I recomputed from bytes on disk; the distinction between the two is marked explicitly in §1 and §2. No HTTP status in this report is presented as a fresh observation. Where I could not verify something, §5 says so instead of presuming a result.

**Independence.** I performed none of the research, curation, repair (t7/t10), security (t4/t13) or QA (t3/t12) work reviewed here, and I reviewed no code I authored. I recomputed the contested hashes and re-read the contested bytes myself rather than restating the other reports' conclusions — which is how RV2-01 and RV2-02 surfaced despite both having passed two prior gates.
