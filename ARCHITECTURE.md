# Architecture and decision boundary

Last reviewed: **2026-09-01**

SolarMatch is a Thai-first residential lead-generation product whose assessment calculates a useful preliminary result before any optional contact request and guarantees that full result regardless of the visitor's contact choice.

## Fixed now

- Next App Router application compiled through vinext for the isolated `solarmatch-thailand` Cloudflare Worker.
- Thai public routes with English parity under `/en`, including Home in both desktop and mobile navigation.
- Ten-question residential assessment, browser-session recovery, versioned calculator, transparent methodology, and a full result that never depends on providing contact details.
- Optional contact journey with three modes: disabled, SolarMatch-only validation follow-up, and named-installer handoff. Each mode has an immutable consent and recipient snapshot.
- Result preparation lasting a randomized 3–5 seconds, showing exactly one published bilingual fact, its matching original sketch, citation, and Resources anchor. Refreshing an already viewed result skips the delay.
- D1-backed, versioned questionnaire, scoring, contact, loading-fact, release, lead, export, revision, and audit data.
- Private R2 media with authenticated upload, publication, validation, controlled delivery, and protection against deleting media referenced by a published fact.
- `/admin*` protected by Cloudflare Access plus server-side AUD/issuer verification, the exact `ADMIN_EMAILS` allowlist, same-origin enforcement, and CSRF protection.
- Hard eligibility and quality scoring remain distinct. Consent-compatible export selection is also distinct: no manual action may broaden the user’s consent scope.
- Production contact remains fail-closed and disabled until legal activation details are complete.

## Public journey

```text
assessment → calculate result → optional contact decision (only when enabled)
→ optional one-question-at-a-time contact form → 3–5 second preparation
→ full result + recalled fact + calm reconsideration option
```

Declining, skipping, a network failure, or disabled contact proceeds to the same full result. Unsubmitted name, phone, and LINE values are never persisted in browser storage.

## Intentionally deferred

- Commercial solar and commercial qualification.
- Custom domain and advertising.
- Installer accounts, bidding, multiple quotes, routing, automatic lead selling, and automatic LINE/email distribution.
- Customer accounts, login, checkout, payments, subscriptions, CRM, and OTP.
- Live analytics or advertising providers.
- Engineering design, structural assessment, satellite roof analysis, guarantees, fabricated social proof, or installer-performance claims.

The detailed component, data, security, migration, backup, and recovery design is in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/SECURITY.md](./docs/SECURITY.md), and [docs/OPERATIONS.md](./docs/OPERATIONS.md).
