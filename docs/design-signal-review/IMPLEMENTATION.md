# Signal installer integration

Baseline: `e02855e6a44da50e3f6af6baa34e7baa27ac3877`. Integration branch: `feature/installer-signal-integration`. The existing LINE repair `63b656d` is an ancestor. No homeowner application, calculator, questionnaire, legal configuration, migration or production binding was changed.

The untouched original handoff is in `../design-signal/solarmatch-installer-signal/`. `SOURCE_MANIFEST.json` records every original byte length and SHA-256; tests recheck all 59 files and the 52 original reference PNGs. Git attributes preserve these bytes. The ZIP hash is `8e34eb969751025f8c61821dfac2b520f15087543b3fe190e0dc642016cce1c3`.

## Six phases and existing contracts

| Phase | Implementation | Existing boundary preserved |
|---|---|---|
| Landing | `components/installers/landing.tsx`, `signal-landing-copy.ts` | Real account availability and commercial configuration; inert labelled example; existing legal FAQ |
| Authentication | `components/installers/portal.tsx` | Existing fields, validation, email verification, reset, sessions, same-origin endpoints and callback destinations |
| Workspace | `portal.tsx`, `workspace.tsx`, `signal-state.ts` | Real portal projection, tenant identity and scoped detail GET; legacy overview/missing-view aliases; company setup and approval |
| Enquiry detail | `enquiry-detail.tsx`, `team-notes.ts`, `action-result.ts` | Existing outcomes, revision-checked notes, claims, staff links, withdrawal and permission checks |
| Credits | `credits.tsx` | Real available/reserved/trial/debt balances, configured packages/methods, authoritative order amounts and provider-confirmed settlement |
| Company | `company.tsx` | Existing mutation validation, service areas, preference/limit, LINE linking/disconnection and full terms/claims navigation |

`app/installers-signal.css` ports the complete final prototype cascade under `.signal`. The unused v2 stylesheet is removed. The independent staff-link page retains its original scoped stylesheet; the payment-return route imports that stylesheet locally to preserve its existing status screen. Neither supporting flow was replaced with mock behavior.

Notes use an explicit success/error acknowledgement at the client action boundary; no API contract changed. Drafts live in memory under company/delivery keys. Writes serialize, preserve newer edits, use the original revision after conflicts and flush before controlled navigation. Failed drafts remain available; unload warns rather than pretending an asynchronous unload save is reliable. Logout, expired authorization, account changes and withdrawal clear or redact the relevant state. A transient 503 hides the unavailable workspace without discarding a draft; returning identity is checked before restoring access. No notes enter browser storage.

Waiting records sort by actual delivery time and stable ID, oldest first. Global warnings prioritize unverified email, terms, platform/allocation pause, debt, then insufficient entitlement. Company setup/approval has its own checklist. A company preference does not claim effective eligibility while another restriction applies. Inline transaction, claim and form failures remain visible.

## Necessary departures from the mock

- The prototype initially selects Arun while sorting Kanya first. Desktop selects the oldest waiting enquiry as the specification requests.
- The prototype uses different names in the company header and form. The real contract has one company name.
- The source ledger comment says 10; its actual postings total 8. Synthetic fixtures follow the arithmetic, not the comment. Production balances always come from the server.
- Existing assessment descriptions, dates, legal disclosures, claim rules and full agreements are retained. Some are longer than prototype shorthand.
- The verification warning does not claim that a new email was sent without evidence.
- Historical payment method/expiry metadata absent from the existing public contract is not invented. Orders retain the available authoritative status, amount and currency. A QR is never payment confirmation.
- Missing historical enquiry references use the existing event label rather than a fictional reference.
- Account entry points remain unavailable when their configuration is disabled; long disabled labels wrap on narrow phones.
- Call and Copy respect busy, verification and management permissions. There is no homeowner LINE action. Calls do not change the outcome.
- Lucide supplies permitted interface icons; the supplied SolarMatch mark and palette are retained. Accessibility adds real headings, labels, focus targets and status announcements.
- The source palm image is byte-identical to the existing credited project asset (`046d5696dc288ac2fa3f14383550395d155e1b218d5f7842b6b248325bb2462a`). Existing Kindel Media / Pexels credit remains. No new provenance claim or replacement photography was invented.

## Review and isolation

`scripts/signal-comparison.mjs` serves the untouched prototype separately, captures deterministic synthetic portal responses and records geometry/fonts/images. Canonical pairs match reference dimensions; genuine-height boundary captures are separate. No screenshot masks or reference edits are used. `scripts/signal-visual-diff.mjs` creates unmasked 50% overlays and red pixel-difference images for all 52 pairs. Pixel disagreement is reported, not equated with a failed financial or legal comparison.

The staging-only viewer is `/design-review/signal/`. Its exact path allowlist rejects private reports and arbitrary files. Assets are assembled under ignored `.wrangler/`, never `public/` or the normal production build. The owner-only staging worker verifies Access before serving them. Signal review uses `connect-src 'none'` and `form-action 'none'`; the reference prototype has an additional network/form guard. No installer login is required to view synthetic comparisons after owner Access. The working portal still requires its ordinary account login. Older homeowner review evidence is preserved and clearly labelled historical.

## Native Thai and external review limits

New Thai presentation copy requires native review: landing hero/facts/steps/FAQ labels, enquiry tabs/search/empty states, setup and approval checklist, eligibility status, short stage/next-action labels, autosave statuses/retry wording, credit statement labels and company form/navigation labels. Existing legal/privacy/auth/withdrawal/claim/payment/LINE warning text and accepted agreements are preserved. This work does not assert native-speaker, lawyer, physical-device, screen-reader or real-provider approval.

Existing company facts, legal/tax decisions, model calibration/quotation/VAT/MEA verification and provider activation remain outstanding where previously documented. This design release resolves none of those by implication.

## Deployment and rollback

No migration is required; the reviewed chain remains 0001–0019. Before deployment both databases were exported into separate private owner-ACL folders, encrypted with AES-256-GCM with a DPAPI-protected key, decrypted and restored to disposable SQLite, then checked against all 60 table fingerprints, foreign keys and the financial ledger. Plaintext temporary exports were removed only after recovery verification. No backup, key, database or sensitive trace is committed.

Production rollback point: `e02855e6a44da50e3f6af6baa34e7baa27ac3877`, Worker version `4d400461-2fd2-48ee-a881-9443901aaba8`. Staging prior Worker version: `084fd214-448a-40e7-be53-d35b260d63b7`. Prefer normal application revert/redeployment if required; no database restore is warranted for a visual regression. Republish prior configuration separately if configuration ever changes. Deliberately purged information cannot be restored through a Git revert.

All real operations remain disabled/paused, including outbound messages and automatic allocation. No test clock is left enabled. No operation in this task targets Milly's or another repository/resource.
