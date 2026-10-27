# Signal release checks — 27 October 2026

Application commit: `c5a218f481fc235440914ea98bf6f586b15a34bc`. Integrated evidence/viewer commit: `b3ded6b2648298c4e96711a7ac1bf3c9de844795`. Production baseline: `e02855e6a44da50e3f6af6baa34e7baa27ac3877`.

## Checks performed

| Check | Result |
|---|---|
| Full unit/service suite, `pnpm test --maxWorkers=1` | 676 passed, 81 files |
| Final focused staging security, viewer and notes checks | 27 passed |
| Signal browser suite | 108 passed: 36 each Chromium desktop, Chromium mobile, Windows WebKit mobile |
| Existing Studio + Repair suite | 72 passed across the same three projects |
| Existing payment-return suite | 30 passed across those projects; no real provider requests |
| Notes race/failure/withdrawal/reload suite | 18 passed across those projects |
| Real isolated signup, email verification, persistence, recovery and rejected-request lifecycle | 4 passed, Chromium desktop/mobile; local capture providers only |
| Local authenticated admin/accessibility checks | 4 passed, Chromium desktop/mobile |
| Homeowner optional bill/kWh contact checks | 12 passed across Chromium desktop/mobile and mobile WebKit, intercepted synthetic endpoints |
| Final homeowner navigation/no-contact/restoration/consent checks | 15 passed across those projects |
| Lint | Passed, zero errors; 14 warnings (including archived homeowner reference scripts and the provider QR image) |
| Typecheck | Passed |
| Production build | Passed; production Worker/D1/R2 identity verified, operations off, no design-review assets |
| Protected staging build and graph guard | Passed; dedicated staging bindings, owner/admin audiences and worker-first asset protection verified |
| Canonical visual comparison | 52 pairs; 131 generated images including companions; zero capture errors/overflow |
| Additional responsive comparisons | 100 pairs / 200 images, both languages, genuine-height breakpoints; zero capture errors/overflow |
| Viewer safety/browser checks | All 52 case selections and comparison modes, 360/390/768/1440, zoom/opacity, original references, guarded mock prototype; all 183 packaged PNG hashes verified |
| Protected text review | All 28 protected bilingual literals and 16 existing portal error literals retained; full terms remain server-provided |

Signal axe checks include WCAG 2 A/AA, 2.1 A/AA, 2.2 AA and best practices on the integrated application. This is automated browser evidence, not physical-device, screen-reader, native-language or legal approval.

## Failures retained and resolved

- The first full unit run passed 667/668; one unchanged calculator test exceeded its existing five-second timeout under concurrent browser capture load. The full suite subsequently passed with one worker, without increasing timeouts or changing calculator code. Additional tests brought the final count to 676.
- Old account tests still expected Today, inline company fields and a closed account menu. They were updated to exercise the actual setup checklist, Company navigation and normal menu state. Real signup and recovery then passed, including persistent HTTP-only sessions and failed sign-out handling.
- First integrated browser checks found global font inheritance overriding Signal typography, missing landing skip navigation, and a long phone line overflowing at 320px. Source fixes were rebuilt and verified.
- Visual inspection found a 24px withdrawn heading instead of 32px, eight pixels lost to global SVG baseline reset, a 48px instead of 54px auth button, and a longer Thai next-action label. Final affected pairs were recaptured and inspected after correction.
- The first 102-case legacy browser run passed 100 and failed two link-Tab assertions in bundled Windows WebKit. Minimal plain HTML reproduced that browser's skipping of links on Tab/Option+Tab. The final checks preserve Chromium's first-Tab assertion and verify WebKit's natural tab order, real focus and Enter-to-main activation. All 72 Studio/Repair cases then passed; no case was skipped or application workaround added.
- The first 27 homeowner cases passed 26 and failed one Thai WebKit alignment measurement. Atomic same-frame measurements showed both controls aligned while two sequential remote measurements could straddle a viewport transition. The original two-pixel assertion remains, now measured in one frame. All 15 flow cases passed afterward. Homeowner application files did not change.
- The first local hold checker encountered empty raw migration settings rather than explicit Boolean flags. Collection/payments/notifications already normalize off; the fresh disposable store was explicitly set to all held values and its clock cleared before leaving. The final read-only safety check passes. Original demos and remote configuration were not changed.

## Authenticated staging publication

Worker: `solarmatch-installer-staging`. Version: `361d723f-5230-499e-b278-479f3a283eb9`; deployment: `0d56a8a9-5d2c-4cc3-8b3f-136bc568b6db`.

Fresh anonymous requests to the installer pages, comparison viewer, its script/image and admin all redirect to existing Cloudflare Access. After the owner completed ordinary authentication, the actual staged installer session loaded. Read-only inspection confirmed:

- Enquiries and its existing synthetic delivery load through the real portal endpoint.
- Detail has the reference fallback name, assessment facts, progression, revision-aware notes, disclosures, claims and Call/Copy; no mutation was performed.
- Thai credits show two available credits and the two existing ledger entries; payments remain unavailable.
- Thai Company shows the actual service area, limit, linked LINE state, terms and claims links without changing them.
- The deployed viewer serves original/implementation images and switches page, Thai language and overlay mode. It requires owner Access, not an installer-account check.
- The separately protected admin loads Installer operations and its actual synthetic counts. Global pause ON, collection off, allocation paused, notifications off and payments off are visible. The earlier LINE-test action-required history remains; no retry or real message was sent.

No migration ran. Staging still has two leads, two enquiries, one delivery, two ledger postings, three legal versions and all 19 migration records. All 60 table histories/configuration fingerprints are preserved apart from ordinary session metadata refresh. Foreign-key and ledger mismatch counts are zero.

## Backups and release boundary

Private verified staging export: `.wrangler/homeowner-v3-release/staging-2026-10-27T13-00-50-984Z-q2KBgN/`; production export: `.wrangler/homeowner-v3-release/production-2026-10-27T13-00-57-705Z-00lbVu/`. Both are encrypted and restore-verified; keys, SQL, databases and sensitive traces are excluded from Git. Production baseline has seven leads and seven enquiries, no installer account/credit ledger, three legal versions and 19 migrations.

The staging build is published directly only to the existing isolated Worker. Production publication follows the normal GitHub/main pipeline; final production deployment identifiers and live smoke results are recorded in the release handoff after that pipeline completes. No new release/questionnaire/consent/configuration record is required for this design-only release.

See `IMPLEMENTATION.md` for the phase map, necessary prototype differences, new Thai requiring review and rollback points. Company/legal/tax/provider decisions and previously recorded calculator calibration/source gaps remain unchanged. No Milly's resource was targeted.
