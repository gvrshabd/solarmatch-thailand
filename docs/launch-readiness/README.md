# SolarMatch launch readiness — 3 November 2026

This is the current non-legal launch checklist. It supersedes remaining-work claims in INSTALLER_REMAINING_WORK.md, the original staging preparation narrative and September OPERATIONS.md. Those files remain historical evidence. Code/configuration checks and mock acceptance are distinct from provider acceptance. Nothing in this checklist authorizes activation.

Baseline: main 3238368edde145845232ff11e9f10395d997f218. Implementation: feature/nonlegal-launch-readiness. See VERIFICATION.md for this run's actual results.

## Current capabilities and actions

| Item | State / evidence | Tested environment/date | Remaining action / owner | Free pilot | Paid launch |
|---|---|---|---|---|---|
| Calculator / no-contact result | Implemented, full result independent of submission; negative, unsupported and saved scenarios covered | Local browser/services this run; public baseline audited Nov 3 | Calibration/source limits below; engineering | Ready within stated limits | Same |
| Optional contact | Implemented bill/kWh normalization, token, OTP, consent snapshots, idempotency, canonical enquiry | Disposable SQLite and local browser, Nov 3 | Activate only after complete public contact configuration and providers are accepted; owner | Blocks real collection until accepted | Blocks |
| Availability UI | Fixed hard-coded homepage/footer/supporting messages; server-derived public status contains one Boolean, no tokens/settings | New unit/browser cases Nov 3 | Publish reviewed branch separately when authorized | Prepared | Prepared |
| Saved answers / refresh | Exact same questionnaire/rules can refresh capability; consent never restored; changed assessment closes submission and retains estimate | New restored/stale cases Nov 3 | No feature prerequisite | Prepared | Prepared |
| HTTPS staging and comparisons | Existing owner-only isolated Worker, separate admin and private storage; current Signal/homeowner viewers retained | Authenticated staging this run | Access login may require ordinary owner verification | Already exists | Already exists |
| kWh storage/scoring | Completed Oct 19; residential-consumption-v1, original units + immutable tariff/equivalent provenance; no fabricated reported bill | Contact-consumption integration tests | No missing rebuild | Already exists | Already exists |
| Installer workspace | Signal design; outcomes, legacy values, revisioned notes, claims, redaction, team links, tenant boundaries | Existing service/browser suites rerun as recorded | Approve real roster/areas/capacity only outside this task; operator | Real roster blocks useful referral pilot | Same |
| Registration / recovery | Existing Better Auth, HTTP-only sessions, verification/reset; email Worker transport defect repaired | Local capture and actual Workerd synthetic outbound service | Verified sender domain/account and actual inbox acceptance; provider/operator | Blocks self-service onboarding (invitation-assisted process still needs secure recovery) | Same |
| Phone verification | Existing Twilio integration; invalid/expired/replayed proof and stale assessment blocked | Mock/local services; no SMS sent | Thai-capable sender/account and real handset acceptance; operator/provider | Blocks real contact collection | Same |
| LINE | Owner invitation/link/delivery/unlink/reconnect actually completed Oct 14 using repair63b656d; signed events retained | Historical controlled staging receipt + current regression tests | Review production channel/webhook rollout and link each approved installer; operator | Blocks LINE notifications until accepted | Same |
| Allocation/jobs | Engine, fencing, expiry, three-company lifetime cap, credit accounting, pause/hour checks implemented | Real SQLite constraints and job service tests | Scheduling configuration deliberately inactive; planned activation below | Blocks automated operational delivery until enabled safely | Same |
| Monitoring | DB-local deduplicated/recovering alerts and job/queue health exist | Operations-readiness tests | Name on-call owner, external alert destination and response cadence; owner | Operational prerequisite | Same |
| Payments | Hosted Omise/test integration, satang conversions, reconciliation/ledger exist; no real charges in this task | Mock/local provider and payment-return tests | Merchant approval, method acceptance, real settlement/refund/reversal exercise; provider/operator | May remain OFF; use explicit trials only | Blocks paid sales |
| Support / withdrawal | One validated email/phone source shared by Contact and request help; invalid/placeholders never become clickable help | New support validation tests | Populate actual monitored email/phone in config/site.ts and staff rights/complaints/claims; owner | Blocks staffed real service | Same |
| Migration / recovery | 19 migrations, current schema supports changes; fresh encrypted staging export restored and verified | Staging read-only backup Nov 3, 60 tables; verification report | Periodic restore drill / recovery custodian; operator | Existing preparation | Same |
| Attribution / analytics | Attribution code exists, off; generic analytics no-op; no pixels added | Source/config | Optional, separately authorized privacy review if desired | Not a blocker | Not a blocker |
| Homeowner accounts/status tools | Not implemented; receipt is not proof of installer delivery; staff links are not homeowner access | Existing access-gap document | Optional separately scoped homeowner authorization; use staffed support initially | Not required | Not required |
| Battery economics / TOU / expansion | Explicitly unsupported; battery interest can opt into solar-only without overwriting preference | Model recovery and calculator tests | Future independently calibrated implementation only if promised | Not required for ordinary new rooftop scope | Same |

Legal/company facts, policies and native-language approval remain owner/counsel decisions. Their existing activation checks remain intact; this task does not satisfy or waive them. No approved legal/consent document or historical record is rewritten.

## Operator decisions that code cannot supply

1. Real monitored general/privacy support channels and the person handling requests, complaints and credit claims.
2. Approved installer roster, service areas, daily capacity, receiving preferences and commercial qualification policy. Synthetic fixture eligibility is not approval of a real company.
3. Free trial pilot versus paid launch. Explicit trials are distinct from purchased balances and cash liabilities.
4. Provider accounts/senders/merchant verification and an authorized real acceptance-test window.
5. On-call person, alert destination and response expectations.
6. Current installed quotation/VAT/scope evidence, independent MEA confirmation and measured-load calibration plan.
7. Outstanding company/legal/photo/native-language decisions already recorded; none invented or marked approved here.

The dedicated workers.dev staging address already supplies HTTPS for supported return/link/webhook testing. A purchased website domain is not a universal integration prerequisite. A verified sending domain may separately be required by the email provider. Future external callback tests need an explicitly authorized reachable signed endpoint while preserving owner-only protection elsewhere; the current exact LINE exception does not authorize opening other routes.

## Future production publication and activation — NOT executed

First authorize code publication separately. Fetch/review main, take a recoverable backup if data/schema changes are needed, run release checks, merge normally and monitor the existing GitHub deployment. Do not deploy a local-test/staging binding build. No migration is required by this change.

Publication is separate from activation. Keep controls off while checking the public build. Before real activation, accept the provider/contact/legal/roster/support prerequisites, then authorize a specific pilot window. Configure each capability independently; do not treat one global flag as approval for collection, payments and messaging together.

New registration additionally requires INSTALLER_REGISTRATION_ENABLED="true" and a compatible enabled email provider. It defaults off and is explicitly false in staging. This does not disable an existing verified installer's sign-in or access to retained records. Recovery/verification email is separately unavailable while its sender is off. Checkout visibility requires both its settings and valid matching provider mode/keys/methods; switching a database flag alone does not offer a dead-end purchase.

Existing inactive scheduler example: docs/installer-deployment.example.jsonc. Candidate production cadence after authorization: UTC cron "* * * * *", INSTALLER_SCHEDULER_EXPECTED="true". The scheduler itself must continue enforcing Asia/Bangkok 09:00–17:00 delivery hours, pauses and consent. Do not change a test clock to bypass hours. Verify a completed run and queue/retry/reconciliation health; cron presence alone is not acceptance.

Monitoring is DB-local today. Until an external alert route is approved and verified, an assigned operator must inspect Processing health and alerts during each operating window and handle missed runs/action-required items. No external notification delivery is claimed. Pause collection/allocation and sending on unexplained financial, consent or delivery failures; preserve history and reconcile before retry.

Payment settlement/refunds require provider evidence. A shutdown liability report is read-only estimated liability, not an approved or executed cash refund. Preserve purchased/trial/debt/reversal/refunded distinctions.

## Preflight interpretation

lib/installer/launch-preflight.ts is a presence checklist, not the activation gate or a record of completed manual acceptance. Its ready:false and manual blocked entries intentionally cannot turn green from environment strings alone. Do not remove them to manufacture readiness. Use this evidence register and provider receipts alongside actual server gates.

## Recovery

Application: restore the previous staging Worker version and retain its compatible settings. Never upload production bindings or activate business controls during rollback. No database migration is involved.

Configuration: restore only reviewed prior version pointers/settings through existing administrative controls. Git rollback does not roll back D1.

Database: use the encrypted, restore-verified staging backup with the existing recovery procedure only for actual data loss/corruption; no restore was applied remotely in this task. Local database rehearsal does not prove R2 object recovery. Deliberately purged PII cannot be restored through application undo.

Never change the old controlled LINE attempt history or reuse its exhausted test budget.

