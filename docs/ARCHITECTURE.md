# SolarMatch Thailand architecture

Last reviewed: **2026-09-01**

## Public application

- Next.js App Router compiled for Cloudflare Workers through vinext.
- Thai-first routes with English parity under `/en`.
- One residential assessment contract in `config/assessment.ts`; the published D1 questionnaire may change bilingual wording and ordering without changing answer semantics.
- Nine required residential answers in `residential-questionnaire-v2`: province, bill, property type, ownership, roof area, daytime use, daytime appliances and conditional AC count, roof material, and shade. Immutable v1 retains installation timeframe for historic rendering only.
- The homepage and estimator share the same browser-session province and bill state, so those questions are not repeated on forward entry.
- Results are calculated locally before any contact decision. The visitor then either proceeds directly to a short result-preparation state or, only when a published contact mode is active, may optionally provide contact details before seeing the same full result. Contact is never required to unlock the result. Optional roof direction, slope, phase, map position, and other precision inputs refine an already complete estimate.
- Contact collection has three current fail-closed modes: disabled, SolarMatch-only validation follow-up, and shared residential-solar-company handoff. Historic named-installer records remain readable. `/api/assessment/config` returns no signed submission token and the UI renders no PII fields unless the selected mode passes its legal, retention, consent-version, partner, secret, and release checks.
- Result preparation lasts a fixed-per-journey randomized 3–5 seconds and shows one published bilingual solar fact with its matching original sketch and source citation. A viewed-result marker skips the delay on refresh; the same selected fact survives language switching and is not repeated on the result page.

## Versioned configuration

D1 is authoritative for published questionnaire documents, qualification/scoring rules, contact configurations, loading-fact sets, content releases, legal-version records, lead records, consent-scoped export state, media metadata, and audit events.

Migration `0003_shared_lead_legal_launch.sql` is additive. It retains migration 0002's constrained compatibility columns, adds authoritative `*_v2` contact/consent columns, and avoids rebuilding tables referenced by historic releases. Shared leads use the v2 values; all new reads resolve v2 first and fall back to the historic values.

Public visitors receive only the current published release. Admin edits create a new draft; publishing creates a new immutable release and archives the superseded configuration version. Restoring an older version creates a new draft rather than rewriting history. Every stored contact submission retains the exact questionnaire, rules, release, score explanation, consent text, and recipient snapshot used at submission time.

Question IDs, input types, required status, conditional triggers, and option values are deliberate semantic contracts because the calculator, validation, D1 columns, and historic records depend on them. The admin UI safely edits translations, help text, question order, option order, conditional-field copy, hard qualification thresholds, score weights, score bands, bill thresholds, target provinces, and auto-selection thresholds. A semantic change requires a code/schema release and migration rather than arbitrary executable configuration.

## Lead handling

- The public browser never supplies an authoritative quality score.
- `/api/leads` validates the current signed assessment session, same origin, content type, body size, honeypot, rate limit, questionnaire/rule/release IDs, contact fields, and all assessment answers.
- The server calculates hard eligibility and the deterministic 1–5 quality score from the current published rule version.
- Every valid, consented contact request is stored, including renters, out-of-area requests, and non-sellable submissions.
- Current hard eligibility is owner status **and** at least four installed AC units; the two requirements are centrally configurable and versioned.
- Automatic operational selection requires hard eligibility, the configured quality threshold, and compatibility with the selected consent scope. Manual selection is stored separately, never changes the quality score, and can never broaden a visitor's consent.
- Permanent purge removes the lead and every PII-bearing export snapshot, while keeping only a non-PII tombstone and audit record.
- Shared handoff is manual. Partner eligibility, territory, active contract, consent, suppression, recipient cap, duplicate delivery, and distribution expiry are checked server-side for every recipient. Each actual recipient has a distinct `lead_recipient_deliveries` record.
- Adult/property-authority confirmation and explicit disclosure consent are separate, unticked controls whose exact bilingual text, version, and timestamp are retained with the lead.

## Administration and security

- `/admin/` and `/admin/api/*` are unlinked and `noindex, nofollow`.
- The durable admin application protects `/admin*`. During development, a separate temporary Worker-wide Access gate protects the whole SolarMatch hostname; its AUD is never used by application JWT verification and removal does not alter the admin application.
- Every admin page/API verifies the Cloudflare Access JWT server-side against the exact team issuer and AUD, then checks the authenticated email against the `ADMIN_EMAILS` application allowlist.
- State-changing admin requests additionally require same-origin, strict content type, and an identity-bound HMAC CSRF token.
- D1 writes use prepared statements; R2 remains private. Public media accepts only validated JPEG, PNG, or WebP administrator uploads; partner contracts accept validated PDF only through authenticated, audited contract routes.
- Public pages never expose lead records, drafts, revisions, audit events, private media, allowlisted emails, or secrets.

## Cloudflare resources

- Worker: `solarmatch-thailand`
- D1: `solarmatch-thailand-admin`, binding `DB`
- Private R2: `solarmatch-thailand-storage`, binding `MEDIA`
- Assets: compiled `dist/client`, binding `ASSETS`
- Admin Access application: existing SolarMatch `/admin*` application, using the admin AUD in `wrangler.jsonc`
- Temporary development gate: separate Worker-wide Access application, removable later without changing the admin AUD

No code or configuration in this project targets Milly's.

## Intentionally deferred

- Live contact activation. Shared handoff requires real operator/privacy facts, published legal/consent versions, positive retention and distribution windows, and at least one active territory-compatible contracted partner.
- Commercial solar, commercial property questions, and mixed residential/commercial scoring.
- Custom domain and paid advertising.
- Installer accounts, marketplace or bidding, buyer routing, automated LINE/email distribution, lead payments, customer accounts, checkout, subscriptions, CRM, OTP, and analytics/advertising integrations.
- Automatic lead selling or deletion. Export and deletion remain deliberate administrator actions.
- Engineering design, structural assessment, aerial roof analysis, quote guarantees, or installer performance claims.

See `OPERATIONS.md`, `SECURITY.md`, `CALCULATOR_METHOD.md`, `ADDRESS_MAP_PRIVACY.md`, and `ASSET_PROVENANCE.md`.
