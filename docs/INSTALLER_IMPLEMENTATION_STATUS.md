# Installer platform implementation and launch decisions

This implementation remains a local/test system. No production deployment, migration, customer collection, payments, messaging, DNS changes or merchant activation were performed. Existing public calculator and internal admin remain in this repository and share the database architecture.

## Implemented workflow

Verified email company accounts use maintained Better Auth with persistent D1 sessions, salted password hashing, recovery and logout. Company memberships are separate from users. The Thai-first mobile portal provides profile, service areas, capacity, pause, terms, credit history, payments, inbox, claim submission and LINE linking. Private APIs enforce membership and verified email; account-free staff links expose only their delivery, accept a bearer token from the fragment and remove it immediately from browser history. Tokens are hashed server-side, expire, rotate and revoke independently of financial delivery records.

The additive migration keeps legacy enquiries unverified and in review. The credit ledger records integer deltas and rejects overdrafts and edits. Database delivery triggers enforce consent, eligibility, company approval, areas, terms, capacity, funding, delivery hours and lifetime recipient limits, while committing the charge, rotation and durable outbox together. Trial units are separate from purchased credits and restricted to shared deliveries. Omise hosted components and server confirmation support sandbox payment orders; provider credentials and merchant activation remain external requirements.

## Verification and remaining gaps

Five additive migrations (`0006`–`0010`) extend the existing five migrations. The complete ten-migration chain has been applied both to isolated SQLite fixtures and to the dedicated local Wrangler D1 database, never remotely. A migration-preservation test starts with historic phone and LINE leads and manual delivery history, applies the new migrations, and confirms that original fields remain unchanged, legacy verification remains absent, no funding is invented, and foreign keys remain valid.

The complete unit suite currently passes 143 tests across 24 files. These include concurrent recipient/credit safeguards, duplicate association, claims and restorations, privacy redaction, settings revisions, provider fixtures, queue/outbox integration, membership isolation, phone verification and actual submission handling. Real local Workerd authentication also passes both desktop and mobile browser tests: registration, email verification, persistent HttpOnly sessions, company creation, logout and password recovery. Thai 320px checks report no horizontal overflow or axe violations; Thai/English screenshots were inspected. Final full regression/build results are recorded below when completed.

Auth email, SMS and LINE previews are synthetic local captures. Provider account tests remain unperformed because no external accounts or credentials were activated. Browser/service tests do not establish provider acceptance, deliverability, bank settlement or legal readiness.

## Commercial and legal launch configuration

The current draft model is ฿200 per credit, two credits for a shared residential enquiry, 20 credits for ฿4,000, two free shared enquiries per approved company, and a seven-day claim submission deadline. Delivery means availability in the receiving company's portal, not a clipboard copy, accepted notification or proven reading. Investigation may continue after the submission deadline; credit restoration is distinct from cash refund and never reopens a recipient slot. Exclusive residential support remains disabled; factory/commercial offers are deferred.

Required unresolved settings include operator legal identity, contact/address/registration details, VAT status and tax wording, invoice requirements, approved merchant and bank settlement accounts, activated payment methods, credit expiry and unused-credit/refund policy, final claim eligibility, enquiry freshness, qualification assumptions, share-link expiry and retention periods. Development defaults are not legal approval. Historical contracts and versioned consent snapshots remain historical evidence. Current public legal copy must be reviewed against the new draft before activation; archived legal-review drafts containing obsolete pricing or deadlines must not be presented as launch terms.

## Activation checklist

1. Review the final Thai/English commercial and privacy text, operator facts, taxes and unresolved policies with responsible business/legal reviewers.
2. Back up the authoritative database and private objects; validate restore procedures and migration on a test copy before separately authorized production migration.
3. Configure strong auth signing secrets and HTTPS trusted origin; verify email sender ownership and recovery end to end. Never enable loopback previews on production.
4. Complete Omise merchant approval and settlement-bank setup, enable only approved methods and verify sandbox webhook/reconciliation/reversal behavior before any live switch.
5. Configure SMS test credentials and LINE Official Account Messaging API; validate account linking, webhook signatures, duplicate handling, retries and suppression.
6. Review company approval/terms, service areas, qualification settings, trial grants, financial reconciliation, withdrawal, share access and manual/automatic allocation checks.
7. Configure operational alerts and scheduled queue/outbox processing in a separately approved deployment; no cron is enabled in this implementation.
8. Activate collection, payments, allocation and outbound messaging separately after documented acceptance. Domain/subdomain changes require separate authorization.

Use [installer-local-test.md](installer-local-test.md) for isolated setup. Never run its fictitious configuration remotely. Preserve test/customer isolation and keep personal details, recovery URLs and bearer tokens out of logs and analytics.

## Privacy redaction and retention

The tested Better Auth 1.7.7 IP parser references `zod.validate`, which is absent from the installed Zod package. The application therefore handles authentication IP throttling through its own atomic D1 HTTP gate using trusted Cloudflare request metadata, strips untrusted IP headers, and disables the library's IP tracking/internal limiter. Limits remain 30 requests per minute overall, five password sign-ins per minute, three registrations per minute, and three reset/verification requests per five minutes. This workaround was verified through an actual local Workerd signup; upgrade compatibility must be retested before removing it.

In local/test installer mode, the existing authenticated admin purge action redacts canonical homeowner records and associated notes, score explanations, export snapshots, claim notes and audit payloads. It preserves non-personal canonical tombstones, financial records and immutable lifetime recipient slots. Legal holds abort the complete batch. Canonical withdrawal immediately suppresses further allocation, revokes staff tokens, cancels pending notifications and creates privacy tasks for companies already supplied. These tasks require responsible-person action; copies already downloaded cannot be retracted. Redaction is irreversible without restoring an authorized backup.

The retention helper previews candidates only after an explicit duration is supplied; scheduled jobs do not apply an invented legal retention period. Existing R2 media assets have no homeowner lead relationship, and partner contract documents belong to companies; this workflow does not delete those unrelated objects. Administrator ledger reasons should contain operational explanations only, never homeowner contact details, because the financial ledger remains immutable.
