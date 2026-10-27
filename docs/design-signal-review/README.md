# Signal comparison evidence

The controlling handoff is the untouched `docs/design-signal/solarmatch-installer-signal/` folder. `scripts/signal-comparison.mjs` serves its original prototype through an independent read-only localhost server. It changes no source files and applies no screenshot masks. Only the explicitly excluded prototype toolbar is hidden and its reserved height is set to zero in the capture browser.

The original reference set contains **52 PNGs**: 26 desktop images at 1440 physical pixels wide and 26 phone images at 780 physical pixels wide. Phone images represent CSS width 390 at device scale 2. Desktop scale is 1. Original desktop heights range from 900 to 2452 pixels; phone heights range from 1688 to 5686 physical pixels. Every exact dimension is in `source-inventory.json`.

Matched captures use each original PNG height divided by device scale as the viewport height and capture the viewport. This preserves the original fixed-bar placement without changing product CSS. When product content extends beyond that viewport, a separate full-page companion retains it. Genuine phone interaction and overflow checks separately use height 844 (desktop 900); the automated boundary checks cover CSS widths 360, 390, 768, 859, 860, 899, 900, 959, 960, 999, 1000 and 1440.

`index.html` presents source and implementation side by side. `comparison.json` records the URL, state, language, browser, viewport, device scale, actual screenshot dimensions, document dimensions, font readiness, image loading and computed layout metrics. Captures report differences rather than declaring pixel equality.

## Synthetic fixture mapping

`tests/e2e/signal-fixtures.ts` maps the original fictional `ENQ`, `LEDGER`, `CLAIMS` and terms to `InstallerPortalData`. Time is fixed at **2026-10-27T03:00:00.000Z**, the prototype's `NOW`. All entity IDs use valid synthetic UUIDs. The last digits retain the source enquiry number. No credentials, real account changes, messages, provider checkout or live portal API calls are used.

| Source | Synthetic UUID suffix | Minutes before NOW | State | Funding |
|---|---|---:|---|---|
| e39, Arun / อรุณ | 039 | 12 | Waiting | Purchased |
| e41, Natee / นที | 041 | 64 | Waiting; 620 kWh and no supplied bill | Trial |
| e36, Kanya / กัญญา | 036 | 190 | Waiting | Purchased |
| e33, Ploy / พลอย | 033 | 1560 | Contacted | Purchased |
| e30, Somsak / สมศักดิ์ | 030 | 2900 | Site visit | Purchased |
| e28, Wichai / วิชัย | 028 | 5800 | Quoted | Trial |
| e25, access withdrawn | 025 | 7400 | Closed; personal fields empty | Purchased |
| e22, Malee / มาลี | 022 | 11500 | Won | Purchased |

The fixture retains the original source monetary settings: one credit ฿200, shared enquiry two credits, recipient limit three, two free trials and seven claim days. These are fixture values; production presentation still reads configuration. The source's ledger comment says the balance is 10, but its twelve actual postings total **8**. The fixture follows the executable source arithmetic and uses 8 available credits, enough for four enquiries.

| Source account state | Contract changes relative to approved |
|---|---|
| approved | Verified, approved company, terms accepted, receiving preference on, 8 available, no trial/reserved/debt |
| empty | No deliveries; other approved data retained |
| paused | `company.paused=true` |
| platform | `availability.platformPaused=true` |
| unverified | `session.user.emailVerified=false` |
| terms | No accepted timestamp or accepted terms version |
| nocredits | Available balance 0 |
| debt | Available 0, debt 4 |
| payment | Payments enabled; pending synthetic order; mocked checkout supplies QR illustration |
| pending | Pending company, no deliveries/history, available 0, terms not accepted |
| nocompany | Company null, no deliveries/history, available 0, terms not accepted |
| combined, additional regression state | Unverified + unaccepted terms + platform pause + debt 4 + available 0; resolves through the priority chain one condition at a time |

All browser API paths have a synthetic fallback. Specific GET/POST portal handlers record actions and update only the in-memory fixture. The payment illustration reproduces the prototype's deterministic `qrSvg()` shapes; it is returned solely by mocked checkout and cannot represent a real provider transaction. Notes conflicts use the existing `notes_changed_or_unavailable` response code and preserve the user's text.

## Deliberate differences and source inconsistencies

- The source inbox initially selects e39/Arun while sorting e36/Kanya first. The implementation follows the spec and opens the oldest waiting enquiry, e36, on desktop.
- The source uses `Suriya Solar` in the header and `Suriya Solar Co., Ltd.` in the company form. The contract has one company name; the fixture uses `Suriya Solar`.
- Existing supported questionnaire labels are longer than the simplified prototype labels. No alternative assessment values are invented to shorten them.
- The verification notice identifies the address and required verification without claiming that a fresh link was sent. Browser tests assert the single warning, the address and permission disabling.
- Claim, withdrawal, payment, auth and other protected legal wording remains the existing product wording, even where a prototype paraphrase is shorter.
- Historical e19 is referenced in the source statement but is absent from the source delivery list. The contract contains source IDs rather than a second reference field, so missing historical references can fall back to the event label.
- Ordinary full-page browser screenshots can position fixed controls differently from the original reference capture pipeline. Canonical pairs therefore use the matched viewport recipe above; actual interaction tests retain normal screen heights.

## Reproduction

Use the bundled Node 24 runtime with a running local compiled preview. The script does not build or start the app.

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3000'
node scripts/signal-comparison.mjs
```

Optional environment settings: `SIGNAL_CAPTURE_FILTER` is a filename regular expression; `SIGNAL_CAPTURE_SURFACES` selects `prototype`, `implementation` or both; `SIGNAL_CAPTURE_OUTPUT` selects a separate output directory; `SIGNAL_CAPTURE_BOUNDARIES=1` adds representative genuine-width captures; `SIGNAL_REFERENCE_VIEWPORT=0` uses normal 844/900-height full-page capture semantics. Chromium is the default. WebKit can be selected explicitly for diagnostic evidence with `SIGNAL_CAPTURE_BROWSER=webkit`.

`SIGNAL_CAPTURE_MERGE=1` refreshes only selected cases while retaining the full existing inventory. The final small visual corrections were recaptured this way rather than dropping the other reference cases.

The independent homeowner baseline is stored under `.wrangler/signal-review/homeowner-before/`: homepage, worksheet and synthetic no-contact result, EN/TH, at 390 and 1440 CSS pixels. No forms are submitted and every non-GET/HEAD request is blocked. `--homeowner-public-config` saves the public production questionnaire/model configuration without ephemeral submission tokens. `--homeowner-after` reuses that configuration against the local preview, so a fresh local questionnaire release does not produce a false CSS regression.

## Verification evidence

- Final canonical inventory: 52 source/implementation pairs, 104 primary PNGs plus 27 full-page companions, 131 referenced generated images. No capture errors or horizontal overflow.
- Separate `boundaries/` inventory: 100 pairs, 200 PNGs, covering landing, inbox, e39 detail, company and credits in both languages at ten additional breakpoint widths. No capture errors or horizontal overflow. These use genuine 844/900-height viewports.
- The auth phone card height is exactly 455.109375 CSS pixels in source and implementation after restoring the 54-pixel Continue button. The Thai e41 progress card is exactly 143 pixels on both sides after using the source action label.
- Five focused landing unit tests cover configured commercial values, missing-config dashes, unavailable-account disabling, protected claim/sale copy, the inert example, auth replacement and the single-main skip target.
- Final Signal browser run: **108/108 passed** in 8.8 minutes, comprising all 36 cases on desktop Chromium, mobile Chromium and bundled Windows WebKit. The run covers all eleven states, the combined warning chain, every requested axe tag, breakpoint routing, privacy, notes revisions/conflicts, unconfirmed QR balances and keyboard skip behavior.
- Bundled Windows WebKit skips a plain anchor on Tab even in minimal HTML. Its skip-link check therefore verifies natural `tabIndex=0` and first focusable DOM order, explicitly focuses the link, then retains actual focus and keyboard Enter-to-main assertions. Chromium retains the real first-Tab assertion. This is a documented test-runtime limitation, not a physical Safari claim or an application workaround.

The homeowner check has twelve matching-dimension before/after shots, with no horizontal overflow or mutation attempts. Nine primary pairs are byte-identical after correcting one initially premature worksheet baseline capture; readiness now requires the correct language, an enabled input and the restored synthetic value. Production-only repeat evidence independently matches the local desktop English home and Thai result. The remaining phone Thai home shows slight colour raster variance between production-only repeats as well. Computed body/hero geometry, typography and the result's radial-gradient styles match exactly, and a controlled Thai-result repeat is byte-identical. No homeowner layout or text regression was observed; this does not claim that every initial PNG was pixel-identical. Original handoff references and customer-facing homeowner files remain unchanged.
