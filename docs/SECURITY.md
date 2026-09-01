# Security model

Last reviewed: **2026-09-01**

## Trust boundaries

Public assessment results are calculated in the browser for responsiveness, but the browser is never trusted for lead eligibility, quality score, version IDs, or consent state. The server binds each eligible submission session to the current published release with a signed, short-lived token and recomputes scoring from validated answers.

The public submission route requires:

- same-origin `POST`;
- `application/json` and a 64 KB body limit;
- strict Zod validation and normalized Thai phone numbers;
- a honeypot, signed assessment session, minimum dwell time, and five-attempt-per-minute hashed-IP rate limit;
- current release/questionnaire/rule IDs;
- complete mode-specific legal/contact configuration plus an explicit live-release flag;
- server-side qualification and scoring; and
- an idempotency key, with D1 uniqueness enforcement.

No PII is placed in URLs, public analytics events, error bodies, or ordinary application logs. The application stores only a short user-agent summary with a submitted lead. Rate-limit keys and purge tombstones are one-way SHA-256 values.

## Administrator authorization

Cloudflare Access protects only `/admin*`. The Worker independently verifies the `Cf-Access-Jwt-Assertion` signature using the configured Access JWKS, exact issuer, and exact AUD. It then requires an exact lower-cased email match in the server-side `ADMIN_EMAILS` allowlist. Client-provided email headers, query parameters, or form values are never treated as identity.

Every state-changing admin API additionally requires:

- a verified Access identity;
- a same-origin request;
- an identity-bound HMAC CSRF token derived from `CSRF_SECRET`; and
- JSON or multipart content type as appropriate.

The required Worker secrets are `ADMIN_EMAILS`, `CSRF_SECRET`, and `ASSESSMENT_SIGNING_SECRET`. They must be Cloudflare secrets, never repository variables, D1 values, browser code, screenshots, or documentation contents.

## Data and media

D1 queries use bound prepared statements. Lead records retain their original questionnaire, scoring, release, consent, and recipient snapshots. Published scores are not silently rewritten. Permanent purge removes lead PII and PII-bearing export snapshots, then retains only a non-PII deletion tombstone and audit event.

The R2 bucket is private. Administrator uploads accept only JPEG, PNG, or WebP, are limited to 5 MB, checked by content signature and decoded dimensions, assigned generated keys, and published only through the controlled `/media/[id]` route after an explicit admin publication action. Executable uploads and direct public R2 writes are not supported.

## Fail-closed release gate

Contact fields and signed assessment tokens remain unavailable while the contact mode is disabled. For either enabled mode, all of the following must be true:

1. the legal document version is marked complete;
2. the legal operator and privacy contact have been reviewed;
3. a retention period from 1–3650 days is present;
4. required Worker secrets are configured; and
5. the current release explicitly enables lead submissions.

Named-installer handoff additionally requires the receiving solar company in Thai and English and its privacy URL. SolarMatch-only validation follow-up must not name or imply an installer recipient and may be exported only for the `solar_match_validation_followup` operational purpose. Named-installer records may be selected or exported only for the exact consented contact-configuration version and recipient. Admin manual selection cannot override either restriction.

The present release deliberately fails this gate and therefore stores no public contact submissions.
