# Readiness verification — 3 November 2026

Baseline main: 3238368edde145845232ff11e9f10395d997f218. Branch: feature/nonlegal-launch-readiness. Implementation commit: 4b4aeb6bfbb6b66dc2e3794ee1d37a30aaea6bf4; final small copy/memo/test corrections are included in the following local commit. No push/main merge/production deployment is authorized by this task.

## Completed checks

| Check | Actual result |
|---|---|
| Final full unit/service suite | 691 passed, 84 files |
| Final affected consumption/draft/provider/scenario/security suite | 91 passed |
| Additional persistence/registration/landing regressions | 25 passed |
| Typecheck | Passed |
| Final lint | 0 errors, 14 existing warnings |
| Normal production-profile build | Passed; correct production identities, mode off; no review assets. Built only, not deployed. |
| Isolated local compiled build | Passed |
| Repaired combined contact/configuration/optional-scenario browsers | 78 passed across desktop Chromium, mobile Chromium and mobile WebKit; both languages |
| Final updated-terms refresh failure flow | 6 passed across the same three projects, original assertions/timeouts |
| Final homepage/results availability regression | 12 passed across desktop Chromium, mobile Chromium and mobile WebKit; both languages and both capability states |
| Real local signup, email capture/verification, session/recovery, OTP/contact submission, payment idempotency and rejected-request lifecycle | 8 passed across Chromium desktop/mobile; real local database/services, capture providers only |
| Admin, notes, payment return and legal/public preparation run | 50 passed, 2 fixture-period failures initially |
| Complete admin sequence after selecting the correct fixture period | 8 passed across Chromium desktop/mobile |
| Signal mobile control/state regression | 36 passed; Thai/English, 320–desktop breakpoints, notes conflict, outcomes, empty/debt/approval/pause states and axe checks |
| Connected demonstration | Passed through supported local APIs: five saved enquiries, six deliveries, 13 ledger postings, two claims; consent, 08:59 hold/10:00 delivery, trial/purchase distinction, withdrawal, repeat-safe purchase/restoration, retries, scoped link revocation/regeneration and lifetime three-company cap |
| Safety cleanup | Both installer-ready and installer-proof: collection/payments/notifications false, allocation/global platform paused, clock null; original demo pointers restored |

The connected demo is a separate consistent SQLite backup of the existing synthetic baseline, not production or a modified existing demo. It exercises actual HTTP authentication, captured email/SMS, signed synthetic LINE events, allocation, portal projections and credit/claim services together. No real email/SMS/LINE API request, charge or provider acceptance is claimed.

Automated axe/keyboard and responsive checks cover relevant public and installer surfaces and 320/390/768/1440 widths, with existing intermediate breakpoint cases. Screenshots were visually inspected. These are browser emulation checks, not physical-device, screen-reader, native-language or legal acceptance.

## Failures and diagnosis retained

- Initial broad service run passed the 676 existing tests. A new availability test initially failed because its beforeEach returned the mock itself, which Vitest treated as a cleanup callback. The hook now returns nothing; its rejection/fail-closed assertions remain.
- Initial 32 contact/browser cases: 30 passed, two mobile result-readiness failures. Expanded 180-case run: 170 passed, ten failures. Six exposed restored Yes selection; three exposed rejection of the deliberately read-only legal preview; one concerned initial result readiness.
- Restored draft data retained the old contact choice. Draft sanitization now removes both that choice and consent; neither is preselected. Read-only preview facts remain accepted with every collection gate off; enabling contact on a restored journey requires the exact supported questionnaire and rules.
- Result traces showed successful script/configuration responses but the initial loading view remained beyond the five-second assertion. Optional interval modelling ran synchronously even when export was not requested. It now runs only for the explicitly selected optional export scenario; arithmetic is unchanged. The complete repaired 78-case sequence passed, followed by six final failure-flow cases. The original broader failures are not relabelled as passes and assertions/timeouts were not increased.
- The combined admin report test selected October, while this fresh supported-flow store contained November submissions. Reporting therefore correctly had no matching rows. Explicit reporting-window parameters preserve the archived October default; this run selected November 1–30. The full eight-case admin sequence then passed without removing missing-cost, CSV privacy, authentication, CSRF, Thai or read-only assertions.
- Workerd email transport used unsupported redirect:error. Actual Workerd tests now verify manual redirect handling, successful synthetic provider acceptance and rejection of a 302 without forwarding authorization. This is not real inbox delivery.
- The authenticated staging walkthrough caught a remaining hard-coded results badge after the initial publication. It now uses the shared capability component, matching the homepage without changing the design. The new results assertion initially used an incomplete saved-answer fixture (missing quoteContactRequested); the application correctly rejected that fixture. The fixture now includes the explicit No answer. All twelve complete homepage-to-results availability cases then passed without weakening assertions or increasing timeouts.

Private failure/run logs remain under .wrangler/readiness-*. Browser traces were inspected privately during diagnosis; none is exported into source or the viewer. Published captures contain synthetic public screens only.

## Data and staging boundary

Fresh staging backup: .wrangler/homeowner-v3-release/staging-2026-11-02T20-12-31-563Z-mBwb95.
Source SHA256: c18ac6237a9e83366fc3a2f4ad77a22f92b21a1c5e02a57095e354fe5853a48a.
Encrypted round trip and local restore verified across 60 tables; zero foreign-key/ledger mismatches. Before publication: two leads/enquiries, one delivery, two ledger postings, three legal versions, 19 migrations.

No migration is required. No remote record, legal version, release pointer or business setting is changed by this release. R2 objects/bindings are untouched; database restoration does not claim R2 recovery.

Previous staging version/rollback point: 361d723f-5230-499e-b278-479f3a283eb9.
Protected staging build/publication and post-deployment verification are recorded below when completed.

## Intentional boundaries

Approved legal/consent texts, versions and installer footer draft disclaimer remain intact. No legal readiness is inferred from code readiness. General support fields remain empty until a real monitored contact is supplied; placeholders cannot become actionable support links.

Missing real provider acceptance, production LINE rollout/installer linking, approved roster/capacity, monitoring ownership/routing and calculator calibration/MEA/quotation-VAT evidence are detailed in README.md and CALCULATOR_SOURCES.md. Paid acceptance is separate from a free trial pilot.

No Milly's resource is targeted. Main and production configuration/data remain untouched. No tracking, real registration/collection/payment/messaging or automatic allocation is activated.
