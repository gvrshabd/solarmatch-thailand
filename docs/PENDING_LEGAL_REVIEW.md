# SolarMatch pending legal review register

Last reviewed: **2026-10-09**

Nothing in this register is represented as lawyer-approved. Public contact collection remains disabled while a blocking item is unresolved. The factual owner is responsible for supplying accurate business facts; the legal-review owner should be qualified Thai counsel.

| Item | Current status / version | Factual owner | Legal-review owner | Open question and evidence | Resolution/date | Blocks activation |
|---|---|---|---|---|---|---|
| Privacy Notice | Supplied review copy, legal-review-2026-10-09 | Operator | Qualified Thai counsel | Confirm operator, processors, cross-border processing, rights channel, retention and Thai PDPA wording. | Open | Yes |
| Terms of Use | Supplied review copy, legal-review-2026-10-09 | Operator | Qualified Thai counsel | Confirm operator, liability, consumer rights, governing-law and independent-company language. | Open | Yes |
| Cookie Policy | Supplied Cookie and Browser Storage Policy, legal-review-2026-10-09 | Engineering/operator | Qualified Thai counsel | Confirm actual browser storage, map requests and infrastructure cookies. Optional analytics and advertising remain off. | Open | Yes |
| Explicit consent wording | Inactive launch review copy, legal-review-2026-10-09 | Operator | Qualified Thai counsel | Review specific disclosure to up to three installation companies, distribution window and withdrawal. A compatible published contact/content version is still required before collection. | Open | Yes |
| Adult/property-authority confirmation | Supplied launch review copy, legal-review-2026-10-09 | Operator | Qualified Thai counsel | Confirm age threshold, own-contact-details requirement and matching server-side wording snapshot before activation. | Open | Yes |
| Shared-recipient wording | Up to three distinct installation companies | Operator | Qualified Thai counsel | Confirm lifetime distinct-company cap, named-recipient notification and no automatic renewal. These controls are not implemented by this copy task. | Open | Yes |
| Operator/entity details | Empty structured fields | Operator | Qualified Thai counsel | Supply and verify legal names, entity type, registration/tax number, bilingual address, phone, emails and representative details. DBD evidence required. | Open | Yes |
| Retention period | Not selected | Operator | Qualified Thai counsel | Set evidence-based `[LEAD RETENTION DAYS]`. | Open | Yes |
| Distribution period | Not selected | Operator | Qualified Thai counsel | Set evidence-based `[LEAD_DISTRIBUTION_WINDOW_DAYS]`. | Open | Yes |
| Privacy-rights workflow | Implemented foundation; procedure unapproved | Operator | Qualified Thai counsel | Confirm verification, due dates, partner notification and complaint workflow. | Open | Yes |
| Recipient-company data obligations | Technical restrictions implemented | Operator | Qualified Thai counsel | Confirm recipient restrictions, controller/processor roles, security and deletion duties. | Open | Yes |
| Buyer/partner contract | Exact bilingual installer services and credit agreement saved as a website-inactive review draft | Operator | Qualified Thai counsel | Approve contract, VAT, unused credits, claim criteria and procedures before use. No payment or credit system was added. | Open | Yes |
| Remote/electronic contracting | Not implemented | Operator | Qualified Thai counsel | Confirm whether electronic records/signatures are required; ETDA materials are research inputs only. | Open | No for disabled mode; yes before relying on electronic contract formation |
| DBD registration classification | Unresolved | Operator | Qualified Thai counsel/accountant | Confirm registration/display obligations from current DBD sources. | Open | Yes |
| ETDA digital-platform classification | Unresolved | Operator | Qualified Thai counsel | Confirm whether the service falls within any regulated platform category. | Open | Yes |
| OCPB/direct-marketing classification | Unresolved | Operator | Qualified Thai counsel | Confirm contact/referral and consumer-protection obligations. | Open | Yes |
| Tax and invoicing classification | Unresolved | Operator | Qualified Thai tax adviser | Confirm VAT, withholding, invoice and referral-fee treatment. | Open | Yes before paid referrals |
| Cross-border processing | Unresolved | Engineering/operator | Qualified Thai counsel | Confirm actual Cloudflare/provider regions and safeguards. | Open | Yes |
| Cloudflare/processor disclosures | Placeholder | Engineering/operator | Qualified Thai counsel | Supply accurate hosting, database, object storage, Access, logging and subprocessors description. | Open | Yes |
| Cookie/tracking architecture | Necessary-only; no ads/analytics | Engineering/operator | Qualified Thai counsel | Re-review before activating any optional analytics or advertising. | Open | No while optional tracking remains off |
| Liability/consumer-protection wording | Draft | Operator | Qualified Thai counsel | Confirm exclusions do not overreach mandatory Thai consumer rights. | Open | Yes |
| Age/authority handling | Separate confirmation implemented | Operator | Qualified Thai counsel | Confirm records and handling of authorized non-owner submissions. | Open | Yes |
| Deletion and partner notification | Structured workflow foundation | Operator | Qualified Thai counsel | Approve deletion exceptions, legal hold, partner notification evidence and non-PII tombstones. | Open | Yes |

## Activation rule

The administration system must not activate shared contact collection until every blocking item has a documented resolution, complete factual values have replaced all placeholders, the applicable bilingual legal/confirmation/consent versions are explicitly published, and an eligible contracted partner exists for the served area.

## Supplied legal text review

The owner supplied `SolarMatch-legal-text-executor-prompt.txt` and explicitly instructed that every placeholder remain literal. The source SHA-256 is `cfb102b2607e7d21bd40162f944185483c34f4b330c0774070bf79d90943d228`. The new repository content revision is `legal-review-2026-10-09`; this is not a published D1 legal/consent revision or lawyer approval. Existing stored legal, questionnaire, consent, delivery and audit records remain unchanged.

Exact bilingual page content and disclosures live in `config/legal-review-copy.json`. The existing Privacy, Terms and Cookies routes render the new incomplete review fallback. Published complete legal documents remain supported by the existing reader and administration schema. The operator profile remains blank and the existing completeness/publish gates remain intact. The supplied prelaunch notice qualifies the planned referral and credit provisions while services are off.

The calculator order, installed-appliance semantics, calculations, navigation and contact-collection gates are unchanged. The existing optional contact decision remains inside the calculator before results. No new contact route, matching screen, recipient confirmation control, payment feature or withdrawal workflow was introduced. Choosing No still reaches the full estimate without contact data or referral consent.

Inactive launch wording is saved in `docs/legal-review/contact-launch-copy.txt`. The exact bilingual installer agreement is saved in `docs/legal-review/installer-services-and-credit-agreement.txt`; neither file is a public website route. Request receipt and actual-recipient messages are review text, not evidence of implemented notifications or delivery.

### Unresolved placeholders

All of the following remain literal, including when the protected review shows the legal pages:

- `[COMPANY_EN]`, `[COMPANY_TH]`, `[ENTITY_DESCRIPTION_EN]`, `[ENTITY_DESCRIPTION_TH]`
- `[REGISTRATION_NUMBER]`, `[ADDRESS_EN]`, `[ADDRESS_TH]`
- `[GENERAL_EMAIL]`, `[PRIVACY_EMAIL]`
- `[EFFECTIVE_DATE_EN]`, `[EFFECTIVE_DATE_TH]`, `[VERSION]`
- `[DISTRIBUTION_DAYS]`, `[ENQUIRY_RETENTION_DAYS]`
- `[MAX_ENQUIRY_AGE_HOURS]`, `[DUPLICATE_WINDOW_DAYS]`
- `[VAT_STATEMENT_EN]`, `[VAT_STATEMENT_TH]`
- `[UNUSED_CREDIT_POLICY_EN]`, `[UNUSED_CREDIT_POLICY_TH]`
- `[ACTUAL_INSTALLER_NAMES]`, `[SELECTED_CONTACT_METHOD]` are future notification runtime values, not configured business facts.

Placeholder emails are plain text, not fabricated mail links. No unknown phone number or privacy-request URL is invented. Privacy, Terms and Cookies references link to the existing localized routes. Factual company details, counsel-approved dates/versions and operational periods must be resolved in a later authorized activation task.

### Later implementation requirements

These are gaps, not claims that editing legal text implemented the planned service:

1. Enforce a maximum of three distinct installation companies across the full disclosure history of an enquiry. Credit returns, archive/restore and resends must not bypass that lifetime cap. The current optional internal cap alone is not proof of that behavior.
2. Notify the homeowner of each actual recipient using an appropriate confirmed channel. The supplied receipt and confirmation wording is inactive; no new notification or matching automation exists.
3. Publish a new compatible contact/content/consent and adult-confirmation version before activation, with exact server-side accepted wording snapshots matching what was displayed. The current historical versions and hard-coded older adult snapshot in `/api/leads` were not rewritten. Do not activate new UI copy against those old evidence records.
4. Apply the stated retention review, deletion/anonymisation, exceptions and minimal suppression-record policy through a reviewed operating procedure and, where needed, later automation. Existing manual privacy-request/purge foundations do not establish automatic compliance with every draft deadline.
5. Review withdrawal and prior-recipient notification duties, deletion requests, identity verification, breach handling, cross-border safeguards and legal holds. No new rights-response or notification mechanism was added.
6. Implement installer credit purchase, balance/ledger, delivery debits, fresh-enquiry age, duplicate windows, 48-hour credit claims, taxes/invoices, unused-credit treatment and complaints only under a separate approved task. The proposed agreement does not mean these systems or a payment processor are live.
7. Add or amend launch-only disclosure/receipt/recipient controls only when explicitly authorized. Preserve the calculator step position and the free No path. The three-company maximum is not a promise of three responses or quotations.

### Claims and actual technology

The current-display home-value claim uses the supplied U.S.-market association wording without a 4% promise. The patio-garden homeowner fact is excluded from loading and Resources. Stored fact-set versions remain historical records; the public display layer also corrects a restored obsolete loading fact. Other fact references and geographic qualifications remain intact.

The supplied tax/export wording is conditional and remains excluded from calculator savings. Current primary-source checks include the [Revenue Department residential solar infographic](https://www.rd.go.th/fileadmin/user_upload/lorkhor/newsbanner/2025/11/solar.pdf), [Royal Decree 805](https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf) and the [PEA residential programme](https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766). The infographic supports conditional expenditure up to ฿200,000 through 31 December 2028, with grid/e-tax-invoice requirements. PEA states the conditional ฿2.20/kWh ten-year programme, capacity limits and approval requirements. Current remaining quota, individual eligibility and final legal/tax classification remain unverified. ERC news and PEA Q&A links are labeled as such, not as binding regulations. No calculator constant was changed.

Source inspection found session storage for assessment progress, results, context and loading-fact history, in-memory contact fields, lazy OpenStreetMap tile requests, and no implemented optional analytics/advertising provider. `FEATURE_ANALYTICS` remains false. Existing infrastructure authentication/security cookies are not removed. No new tracker, consent-preference control or persistent contact storage was added.

### Scope and production state

The checkout origin is `https://github.com/gvrshabd/solarmatch-thailand.git`; this task branch is `legal-review-copy-2026-10-09`, based on `d7ab910204f052f0b8867e698da464f6dd0a8a98`. After local validation, the owner authorized pushing to `main` and deploying through the existing GitHub-to-Cloudflare pipeline. This does not authorize contact activation or replacing placeholders. No migration, Worker secret, Access policy, production D1 record or R2 object change is part of this release. No operation targets Milly's. The application rollback point is the base commit above; use a normal revert, not a database restore, for a presentation regression.

A read-only public configuration check on 9 October 2026 returned release `residential-release-v8`, `liveLeadSubmissions=false`, `publicCollectionEnabled=false`, `contact.enabled=false` and `operationalDistributionEnabled=false`. The pre-existing restricted-site collection flag remains true; it was not toggled, and a normal public session still cannot collect leads. Payments and optional tracking remain unavailable. Existing feature flags are preserved rather than silently changed.

Pre-deployment D1 counts: 7 leads, 0 media assets, 3 legal versions, 0 recipient deliveries and 9 audit events. The count query wrote no rows. D1 Time Travel bookmark: `000000a3-00000000-000050ff-68f875a71aaea5d53798fcdcb6be7e8b`. No schema or bulk data operation is required for this copy release.

### Validation

- Exact source-text comparison found no missing English or Thai legal/disclosure/launch-copy passages.
- ESLint and TypeScript passed.
- All 57 unit tests passed across 9 files.
- The clean production build passed.
- Full Playwright suite: 107 passed, 6 intentional skips. This includes Thai/English legal text and links, the free No path, disabled-contact behavior, current consent in a mocked enabled fixture, calculator regressions, navigation, axe audits, narrow-width overflow checks and mobile/Safari coverage.
- Thai mobile and English desktop legal screenshots were visually reviewed; the existing readable layout and literal placeholders remain intact.
- There are no changes to assessment definitions, calculation/scoring code, feature flags, `/api/leads` submission logic, admin APIs, Wrangler configuration or migrations.

### Changed files and routes

The page changes affect `/privacy`, `/terms`, `/cookies`, `/contact`, `/how-it-works`, `/solar-guide`, `/methodology`, `/resources`, `/estimate`, `/estimate/results` and their `/en` counterparts, plus the homepage FAQ and shared footer. About remains removed. The optional contact step remains part of the existing estimate journey; no separate contact-capture page is created.

Changed source and tests:

```text
app/how-it-works/page.tsx
app/solar-guide/page.tsx
components/content/legal-shell.tsx
components/content/legal-text.tsx
components/content/published-legal-document.tsx
components/estimate/estimate-shell.tsx
components/home/home-page.tsx
components/lead/lead-capture.tsx
components/pages/contact-content.tsx
components/pages/english-pages.tsx
components/pages/methodology-content.tsx
components/pages/resources-content.tsx
components/results/calculation-loading.tsx
components/results/results-shell.tsx
components/site/site-footer.tsx
config/contact-content.ts
config/legal-content.ts
config/legal-review-copy.json
config/legal-review.ts
config/loading-facts.ts
lib/loading-facts/public-copy.ts
lib/server/releases.ts
tests/e2e/public-preparation.spec.ts
tests/e2e/site.spec.ts
tests/unit/contact-modes-and-loading-facts.test.ts
docs/PENDING_LEGAL_REVIEW.md
docs/legal-review/contact-launch-copy.txt
docs/legal-review/installer-services-and-credit-agreement.txt
```

## Display-only contact review — 9 October 2026

The existing calculator quote-choice step now offers **Test** / **ทดสอบ (Test)**. This is a transient UI choice, not a new questionnaire answer, collection mode, permission or lead status. It displays the current `contactLaunchReviewCopy.consent` verbatim with an unchecked checkbox and localized Privacy Notice link, then the existing single-panel contact form and separate unchecked adult/property-authority confirmation. Existing placeholders remain literal.

Reviewers are instructed to use sample details. The review completion action performs local field validation only and continues to the ordinary estimate; it never calls `/api/leads`, refreshes a submission token, reports a saved request, records referral consent, or writes to D1/R2. This remains true even with an otherwise enabled real-contact configuration. Test details and checkbox acceptance stay in component memory only and are cleared on leaving the review, selecting No, or restarting. Closing/reloading the page intentionally discards them; ordinary non-sensitive assessment progress remains resumable.

The normal No path, calculation logic, question order, real submission gates, published configuration, historical records, admin protection, recipient controls and deployment bindings are unchanged. Real collection remains disabled in an ordinary public session. The deferred legal/operational gaps listed above are not solved or activated by this preview.

Validation: lint, TypeScript, all 57 unit tests and the clean production build passed. The final full browser suite passed 115 tests with 6 intentional skips, including the display-only test in both languages, exact review consent, required unchecked boxes, conditional contact fields, no submission/token refresh during review, no stored test PII, Back/No/restart clearing, 320px overflow and axe checks. Existing enabled-contact fixtures and the free estimate path also passed. English desktop and Thai 320px screenshots were visually reviewed. Read-only preflight counts remain 7 leads, 0 media assets, 3 legal versions, 0 deliveries and 9 audit events; no migration or data mutation is required.
