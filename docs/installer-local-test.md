# Isolated installer workflow: local testing and recovery

Run only against the dedicated local configuration; its database ID is deliberately fictitious. Do not pass `--remote` or deploy this configuration.

```powershell
node scripts/installer-local-setup.mjs
pnpm exec wrangler d1 migrations apply solarmatch-installer-local-test --config .installer-test/wrangler.jsonc --local --persist-to .wrangler/installer-test-state
$env:INSTALLER_LOCAL_TEST = 'true'
pnpm dev --port 3000 --host localhost
```

Open `http://localhost:3000/installers`. Registration sends a verification preview into the isolated `installer_test_messages` table. Inspect that local table with Wrangler and open the verification URL; never export these private recovery links or treat test previews as real delivery. The configuration disables outbound messages and payments, and settings initially disable collection and delivery. Synthetic fixtures and settings must be configured before running the complete test workflow.

The Worker delegates HTTP handling to vinext and exports a scheduled handler. `runInstallerJobs` accepts local-test, sandbox or deliberate production mode only after validating its origin and setting gates. No cron trigger is configured. The inactive [deployment example](installer-deployment.example.jsonc) uses fictitious bindings, provider modes off and an empty cron list; production `wrangler.jsonc` remains unchanged. During an isolated Wrangler test, use the documented `/__scheduled` local trigger with `wrangler dev --test-scheduled` against a built Worker, or invoke the job through the authenticated admin operation. Never expose an unauthenticated public job endpoint.

The main Vite configuration selects this isolated binding configuration only when `INSTALLER_LOCAL_TEST=true`. Without that opt-in the existing binding configuration is used and installer mode defaults to off. Keep `.installer-test/.dev.vars` ignored; the setup script creates it exclusively and never overwrites existing secrets. It does not read or reuse the repository root `.dev.vars`.

## Repeatable synthetic workflow

For the populated company, four verified fictional homeowner requests, purchased and trial deliveries, claims, staff links, and local notification captures, follow [installer-demo-local.md](installer-demo-local.md) after building and migrating the isolated preview. The script uses the protected loopback admin session and normal application services, including actual local authentication and OTP proof with captured email/SMS transport. It restores paused settings afterward. Use Node.js 22 or newer; this computer's default `node` may be older than the project requirement.

Keep the server running in one terminal. In a second terminal at the same repository, run:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'
$env:INSTALLER_E2E = '1'
pnpm exec playwright test tests/e2e/installer-workflow.spec.ts --project=desktop-chromium --project=mobile-chromium
Remove-Item Env:INSTALLER_E2E
pnpm exec wrangler d1 execute solarmatch-installer-local-test --local --config .installer-test/wrangler.jsonc --persist-to .wrangler/installer-test-state --command "UPDATE installer_platform_settings SET config_json=json_set(config_json, '$.collectionEnabled', json('false'), '$.deliveryPaused', json('true')) WHERE id=1"
pnpm test:e2e
pnpm test
pnpm lint
pnpm typecheck
```

The explicit installer suite calls the loopback-only `/api/installer/test` fixture endpoint, which adds clearly labelled synthetic companies, a synthetic payment order and test credits to this isolated database. It enables collection only for requests to that local test server. It does not publish contact settings, create an administrator bypass or associate the synthetic companies with a real account. Repeated seeding does not reissue fixture credits. The local-only SQL command restores disabled collection and paused delivery before the ordinary regression suite, which verifies those defaults. Email recovery URLs and SMS codes are consumed privately by the tests, not written to the terminal. Browser traces can contain synthetic personal details; keep the ignored `test-results` and `playwright-report` directories private. Authentication and OTP limits are intentionally enforced in tests: rapid repeated suite runs can exhaust a shared loopback bucket; wait for its window instead of weakening limits.

The suite exercises real email/password registration, verification, persistent sessions, company creation, logout/recovery, bilingual 320px layouts and accessibility, No-to-results with no referral, SMS challenge/proof, contact submission and repeat-safe synthetic payment completion. SQLite service tests exercise approvals/terms, trial and paid allocation, recipient caps, ledgers, claims, notifications, suppression and staff links. They are not proof of external provider acceptance.

Run `pnpm build` without `INSTALLER_LOCAL_TEST` for the normal production build profile. Building does not deploy. Do not run `pnpm deploy`, `git push`, remote migration commands or the isolated configuration with `--remote` during this task.

For the broad browser suite, prefer a compiled local preview over the development server. Stop the development server, then use the following commands. The generated Worker must retain the fictitious local database ID; the check prevents accidentally selecting a production build profile.

```powershell
$env:INSTALLER_LOCAL_TEST = 'true'
pnpm build
$previewConfig = Get-Content -Raw dist/server/wrangler.json | ConvertFrom-Json
if ($previewConfig.name -ne 'solarmatch-installer-local-test' -or $previewConfig.d1_databases[0].database_id -ne '00000000-0000-0000-0000-000000000006') { throw 'Refusing non-isolated preview configuration' }
pnpm exec wrangler dev --config .installer-test/preview.jsonc --local --port 3000 --ip localhost --persist-to .wrangler/installer-test-state --log-level error
```

Keep the preview running while the second terminal runs Playwright. Stop it before rebuilding `dist`; no source hot reload is needed for these checks. The dedicated preview configuration sits beside the ignored `.installer-test/.dev.vars`, so Wrangler loads the isolated signing keys correctly. Starting directly from the generated `dist/server/wrangler.json` does not reliably load those keys and may correctly fail authentication/OTP closed. The explicit `--local`, fictitious binding identifiers, private test signing keys and disabled outbound flag preserve isolation. The general suite should run with `INSTALLER_E2E` unset and local collection disabled; the six explicit installer cases are run separately with the opt-in variable.

For a genuinely fresh synthetic run, choose a new directory under `.wrangler` and use that same `--persist-to` directory for migrations, the preview and any local SQL commands. An earlier isolated installer verification used `.wrangler/installer-final-state`. This leaves earlier local fixtures intact and avoids weakening or clearing application abuse limits.

## Queue and notification operation

A verified submission atomically creates its canonical queue record. It does not wait for allocation or messaging before showing results. In local service tests the same queue/outbox services run directly. In a future separately approved deployment, schedule `runInstallerJobs` once per minute; it processes at most 50 enquiries and 30 notifications per invocation. No schedule was activated here. Outside configured Bangkok hours the queue waits. Pending requests with no eligible company become visibly unmatched, without relaxing their eligibility or expiry.

Admin provides queue processing and retry controls behind the existing Access identity and CSRF checks; local tests do not weaken those checks. Failed/ambiguous notifications appear in the outbox. An ambiguous SMS acceptance needs reconciliation, not blind resending. Withdrawal tasks need recorded recipient notification. The current alert surface is the admin attention-required count; no external alert channel was activated.

The protected, loopback-only test clock drives allocation and outbox due/lease times in the isolated demonstration, so a queued delivery made at a pinned 10:00 Bangkok can be captured immediately in that same scenario. Authentication, phone-code expiry, and real provider delivery are not simulated by this clock. A withdrawal cancels pending notifications and access, but cannot retract a provider call already in flight; if that call is accepted after cancellation, the outbox remains cancelled and records the provider reference for operator review. Never interpret cancellation alone as proof that no message reached a recipient.

## Configuration without secret values

| Setting | Purpose and safe default |
| --- | --- |
| `INSTALLER_PLATFORM_MODE` | `off` by default; explicit `local-test`, `sandbox`, or `production`. Production requires a reviewed HTTPS non-loopback origin. No key selects it automatically. |
| `INSTALLER_BASE_URL` | Exact origin. Local tests require loopback; sandbox and production require HTTPS. Future installer hostname must be routed to this same app and added to reviewed authentication origin/callback configuration. |
| `INSTALLER_AUTH_SECRET` | Random signing secret, at least 32 characters, supplied through private environment configuration. |
| `PHONE_VERIFICATION_SECRET` | Separate random secret for OTP and canonical-enquiry HMAC domains. Rotation requires a duplicate-identity continuity plan. |
| `ASSESSMENT_SIGNING_SECRET` | Existing assessment-token signing; isolated setup generates its own, never copies production. |
| `OUTBOUND_MESSAGES_ENABLED` | `false`; enabling it is separate from persisted notification settings and every provider's own live gate. |
| `AUTH_EMAIL_PROVIDER_MODE`, `AUTH_EMAIL_LIVE_ENABLED`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_PROVIDER_TOKEN` | Off/false by default. Explicit Resend sandbox or live transport requires verified sender/domain and credentials. Local mode captures email instead. |
| `OMISE_PROVIDER_MODE`, `OMISE_LIVE_ENABLED`, `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` | Off/false by default. Sandbox/test and production/live modes require matching keys. Purchases also require enabled business settings and actual activated methods/brands; read-only reconciliation can continue after purchases are switched off. |
| `SMS_PROVIDER_MODE`, `SMS_LIVE_ENABLED`, `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_CREDENTIALS_ARE_TEST`, `SMS_FROM`/`SMS_MESSAGING_SERVICE_SID` | Off/false by default. Twilio sandbox uses test credentials and magic sender; production requires explicit live mode, non-test credentials and approved sender or service. Local mode captures messages. Thai deliverability remains untested. |
| `LINE_PROVIDER_MODE`, `LINE_LIVE_ENABLED`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TEST_RECIPIENTS` | Off/false by default. Sandbox requires a JSON test-recipient allowlist; live enquiry pushes require a linked recipient. Leave outbound off until separately authorized. |
| `LOCAL_ADMIN_PASSWORD`, `LOCAL_ADMIN_SESSION_SECRET` | Generated only in ignored isolated `.installer-test/.dev.vars`; protected loopback `/admin/local-access` is unavailable elsewhere. |

Preserve existing `DB`, `MEDIA`, admin Access AUD/team, `ADMIN_EMAILS` and `CSRF_SECRET`. No production secret changes were made. Settings separately gate global pause, collection, purchases, allocation and notifications; all active effects default disabled/paused. Production mode code exists but requires deliberate provider/account activation and acceptance, not merely a flag flip. See [provider setup](INSTALLER_PROVIDER_SETUP.md) and [remaining work](INSTALLER_REMAINING_WORK.md).

## Migration, backup and recovery

The eight additive migrations run from `0006` through `0013`; apply the complete ordered chain to this local database. `0011` adds operation/run tracking and database allocation guards; `0012` contains the isolated test clock; `0013` adds Omise reconciliation timestamps and error codes. Historical leads stay unverified, historic delivery facts remain, and no old consent is rewritten. Verification evidence is stored separately from expiring OTP secrets. Never edit a migration after it has been applied to an authoritative environment.

Before any future production migration, obtain separate approval, export only the SolarMatch D1 database to the established protected backup location, record its Time Travel bookmark and table counts, and inventory SolarMatch private objects. Test restoration and the ordered migrations on a disposable copy. Do not commit backups, read unrelated buckets, or substitute this fake local database ID for production bindings.

Application rollback and database rollback are different. Leave additive tables intact when rolling application code back; reversing a Git commit does not reverse D1. Use a reviewed backup/Time Travel recovery only for an actual data/schema problem. Purging homeowner data is irreversible in normal application operation; never promise a deleted record can be restored. Keep backup retention and deletion requirements in the final privacy policy.

### Completed synthetic recovery exercise (11 October 2026)

The preview was stopped while taking the snapshot. `scripts/installer-local-export.mjs` uses Wrangler's installed Miniflare exporter against the exact fictitious database ID and `.wrangler/installer-final-state/v3/d1`; Wrangler 4.92 `d1 export --local` does not support `--persist-to`, so using its default path would export the wrong local store. No remote API is used.

Private ignored exports:

- `.wrangler/installer-recovery-2026-10-11/synthetic-final.sql` (raw snapshot; SHA-256 `1c583eee342dc431e46583df52a5872590e2be5e6c3461777c52e8c863cf9a5f`).
- `.wrangler/installer-recovery-2026-10-11/synthetic-restore-ordered.sql` (all tables/indexes first, data second, safety triggers last).
- Disposable restored store: `.wrangler/restore12`.

The ordinary raw import failed because referenced tables may appear later in D1's export. The ordered restore also prevents ledger/delivery triggers from replaying charges against already-restored balances. Use a fresh empty destination; do not import over a populated database. Short local folder names avoid the Windows SQLite path-length limit.

Commands exercised with the bundled Node/pnpm runtime:

```powershell
node scripts/installer-local-export.mjs
pnpm exec wrangler d1 execute solarmatch-installer-local-test --local --config .installer-test/preview.jsonc --persist-to .wrangler/restore12 --file .wrangler/installer-recovery-2026-10-11/synthetic-restore-ordered.sql --json
node scripts/installer-local-restore-check.mjs
```

All 55 application tables and 19 triggers matched at the snapshot: eight leads/enquiries, six deliveries, fourteen ledger entries, two claims and thirteen migrations. Foreign-key and ledger-conservation checks passed. Private SQL files include local sessions/verification captures and must not be packaged or committed. Scripts preserve existing exports and reject a changed snapshot instead of overwriting it; choose a separately reviewed fresh private location for another rehearsal. Later demo reruns legitimately add audits and rotate links, so comparison against the earlier snapshot is only expected to pass before further interactions. R2 recovery, production Time Travel and real data restoration were not exercised.
