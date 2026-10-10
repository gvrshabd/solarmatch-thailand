# Isolated installer workflow: local testing and recovery

Run only against the dedicated local configuration; its database ID is deliberately fictitious. Do not pass `--remote` or deploy this configuration.

```powershell
node scripts/installer-local-setup.mjs
pnpm exec wrangler d1 migrations apply solarmatch-installer-local-test --config .installer-test/wrangler.jsonc --local --persist-to .wrangler/installer-test-state
$env:INSTALLER_LOCAL_TEST = 'true'
pnpm dev --port 3000 --host localhost
```

Open `http://localhost:3000/installers`. Registration sends a verification preview into the isolated `installer_test_messages` table. Inspect that local table with Wrangler and open the verification URL; never export these private recovery links or treat test previews as real delivery. The configuration disables outbound messages and payments, and settings initially disable collection and delivery. Synthetic fixtures and settings must be configured before running the complete test workflow.

The Worker delegates HTTP handling to vinext and exports a scheduled handler. It invokes `runInstallerJobs` only in local-test or sandbox mode; the jobs also enforce their settings. No cron trigger is configured. Future activation requires separately reviewed production credentials, flags and cron setup. During an isolated Wrangler test, use the documented `/__scheduled` local trigger with `wrangler dev --test-scheduled` against a built Worker, or invoke the job through the authenticated admin operation.

The main Vite configuration selects this isolated binding configuration only when `INSTALLER_LOCAL_TEST=true`. Without that opt-in the existing binding configuration is used and installer mode defaults to off. Keep `.installer-test/.dev.vars` ignored; the setup script creates it exclusively and never overwrites existing secrets. It does not read or reuse the repository root `.dev.vars`.

## Repeatable synthetic workflow

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
pnpm exec wrangler dev --config dist/server/wrangler.json --local --port 3000 --ip localhost --persist-to .wrangler/installer-test-state --env-file .installer-test/.dev.vars --log-level error
```

Keep the preview running while the second terminal runs Playwright. Stop it before rebuilding `dist`; no source hot reload is needed for these checks. The explicit `--local`, fictitious binding identifiers, private test signing keys and disabled outbound flag preserve isolation. The general suite should run with `INSTALLER_E2E` unset and local collection disabled; the six explicit installer cases are run separately with the opt-in variable.

## Queue and notification operation

A verified submission atomically creates its canonical queue record. It does not wait for allocation or messaging before showing results. In local service tests the same queue/outbox services run directly. In a future separately approved deployment, schedule `runInstallerJobs` once per minute; it processes at most 50 enquiries and 30 notifications per invocation. No schedule was activated here. Outside configured Bangkok hours the queue waits. Pending requests with no eligible company become visibly unmatched, without relaxing their eligibility or expiry.

Admin provides queue processing and retry controls behind the existing Access identity and CSRF checks; local tests do not weaken those checks. Failed/ambiguous notifications appear in the outbox. An ambiguous SMS acceptance needs reconciliation, not blind resending. Withdrawal tasks need recorded recipient notification. The current alert surface is the admin attention-required count; no external alert channel was activated.

## Configuration without secret values

| Setting | Purpose and safe default |
| --- | --- |
| `INSTALLER_PLATFORM_MODE` | `off` by default; only explicit `local-test` or `sandbox` accepted. No live provider mode exists. |
| `INSTALLER_BASE_URL` | Exact origin. Local tests require loopback; sandbox uses HTTPS. Future installer hostname must be routed to this same app and added to the reviewed authentication origin/callback configuration. |
| `INSTALLER_AUTH_SECRET` | Random signing secret, at least 32 characters, supplied through private environment configuration. |
| `PHONE_VERIFICATION_SECRET` | Separate random secret for OTP and canonical-enquiry HMAC domains. Rotation requires a duplicate-identity continuity plan. |
| `ASSESSMENT_SIGNING_SECRET` | Existing assessment-token signing; isolated setup generates its own, never copies production. |
| `OUTBOUND_MESSAGES_ENABLED` | `false`; enabling it is separate from persisted notification settings. |
| `AUTH_EMAIL_FROM`, `AUTH_EMAIL_PROVIDER_TOKEN` | Verified sender and Resend API credential; local mode captures email instead. Requires a separately authorized email-delivery exercise. |
| `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` | Test merchant credentials/signature verification only. Live keys rejected. Activated methods/brands must also be configured in business settings. |
| `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_CREDENTIALS_ARE_TEST` | Twilio test credentials only; true test marker required. Local mode captures messages. Real Thai SMS deliverability remains untested. |
| `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TEST_RECIPIENTS` | OA webhook verification, Messaging API token, explicit JSON test-recipient allowlist. Leave outbound off until separately authorized. |

Preserve existing `DB`, `MEDIA`, admin Access AUD/team, `ADMIN_EMAILS` and `CSRF_SECRET`. No production secret changes were made. Settings separately gate collection, purchases, delivery pause and notifications; all default disabled/paused. A future production mode requires deliberate implementation and acceptance, not merely a flag flip.

## Migration, backup and recovery

The new additive migrations start at `0006`; apply the complete ordered chain to this local database. Historical leads stay unverified, historic delivery facts remain, and no old consent is rewritten. Verification evidence is stored separately from expiring OTP secrets. Never edit a migration after it has been applied to an authoritative environment.

Before any future production migration, obtain separate approval, export only the SolarMatch D1 database to the established protected backup location, record its Time Travel bookmark and table counts, and inventory SolarMatch private objects. Test restoration and the ordered migrations on a disposable copy. Do not commit backups, read unrelated buckets, or substitute this fake local database ID for production bindings.

Application rollback and database rollback are different. Leave additive tables intact when rolling application code back; reversing a Git commit does not reverse D1. Use a reviewed backup/Time Travel recovery only for an actual data/schema problem. Purging homeowner data is irreversible in normal application operation; never promise a deleted record can be restored. Keep backup retention and deletion requirements in the final privacy policy.
