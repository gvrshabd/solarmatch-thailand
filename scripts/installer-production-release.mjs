import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { cloudflare, account } from './installer-staging-cloudflare.mjs';
import { triggerSafeStatement } from './installer-staging-migration-transport.mjs';

// Read-only inspection and local migration rehearsal for the approved production
// release. This helper never deploys, imports remote data or activates operations.
const database = '61d0704e-5c1f-4bf6-bf58-32dbe07e9f65';
const name = 'solarmatch-thailand-admin';
const directory = '.wrangler/production-release-2026-10-14';
if (execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim() !== 'https://github.com/gvrshabd/solarmatch-thailand.git') throw Error('Wrong repository');
if (!['feature/installer-shared-workflow', 'main'].includes(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim())) throw Error('Wrong release branch');
const metadata = await cloudflare(`accounts/${account}/d1/database/${database}`);
if (metadata.name !== name || metadata.uuid !== database) throw Error('Production database identity mismatch');
const query = async sql => (await cloudflare(`accounts/${account}/d1/database/${database}/query`, 'POST', { sql }))[0].results;
const hash = value => createHash('sha256').update(value).digest('hex');
function restore(db, sql) {
  // Cloudflare exports tables in name order, not foreign-key dependency order.
  // Disable enforcement only in this disposable SQLite restore, then validate.
  db.exec('PRAGMA foreign_keys=OFF;');
  db.exec(sql);
  db.exec('PRAGMA foreign_keys=ON;');
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Backup has foreign-key violations');
}
const migrations = (await readdir('migrations')).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort();
const applied = (await query('SELECT name FROM d1_migrations ORDER BY name')).map(row => row.name);
if (JSON.stringify(applied) !== JSON.stringify(migrations.slice(0, applied.length))) throw Error('Remote migration history is not the exact source prefix');
const counts = {};
for (const table of ['leads', 'media_assets', 'legal_document_versions', 'audit_events', 'lead_recipient_deliveries', 'solar_company_partners']) counts[table] = (await query(`SELECT count(*) count FROM ${table}`))[0].count;
const releases = await query('SELECT id,questionnaire_version_id,rule_version_id,legal_document_version_id,contact_configuration_version_id,live_lead_submissions,is_current FROM public_releases ORDER BY id');
const settings = await query('SELECT setting_key,value_json FROM public_settings ORDER BY setting_key');
const fingerprint = {};
const historical = ['leads','lead_notes','lead_status_events','lead_score_history','legal_document_versions','public_releases','contact_configuration_versions','audit_events','lead_recipient_deliveries','solar_company_partners','media_assets','privacy_rights_requests'];
for (const table of historical) fingerprint[table] = hash(JSON.stringify((await query(`SELECT * FROM ${table}`)).map(row => JSON.stringify(row)).sort()));
const snapshot = { timestamp: new Date().toISOString(), database, name, applied, counts, releases, settings, fingerprint };
await mkdir(directory, { recursive: true });
const action = process.argv[2] || 'inspect';
if (action === 'inspect') {
  await writeFile(`${directory}/before.json`, JSON.stringify(snapshot, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ ...snapshot, fingerprint: 'Stored privately; no row values exported' }));
} else if (action === 'rehearse') {
  const backup = await readFile(`${directory}/production-before.sql`, 'utf8');
  const original = new DatabaseSync(':memory:');
  const candidate = new DatabaseSync(':memory:');
  const transport = new DatabaseSync(':memory:');
  const { unstable_splitSqlQuery } = await import('wrangler');
  for (const db of [original,candidate,transport]) restore(db, backup);
  const pending = migrations.slice(applied.length);
  const manifest = [];
  const migrationDirectory = path.resolve(directory, 'migrations');
  await mkdir(migrationDirectory, { recursive: true });
  for (const file of pending) {
    const source = await readFile(`migrations/${file}`, 'utf8');
    const statements = unstable_splitSqlQuery(source).map(triggerSafeStatement);
    const transported = statements.map(statement => statement.trim().replace(/;\s*$/, '') + ';').join('\n');
    candidate.exec(source);
    transport.exec(transported);
    await writeFile(path.join(migrationDirectory,file), transported, { flag: 'wx' });
    manifest.push({ file, sourceSha256: hash(source), transportSha256: hash(transported), statements: statements.length });
  }
  const tables = original.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all().map(row => row.name);
  for (const table of tables) {
    const columns = original.prepare(`PRAGMA table_info("${table}")`).all().map(row => `"${row.name}"`).join(',');
    const rows = db => JSON.stringify(db.prepare(`SELECT ${columns} FROM "${table}"`).all().map(row => JSON.stringify(row)).sort());
    if (rows(original) !== rows(candidate) || rows(candidate) !== rows(transport)) throw Error(`Historical data changed: ${table}`);
  }
  const tablesAfter = candidate.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
  for (const table of tablesAfter) {
    const columns = candidate.prepare(`PRAGMA table_info("${table}")`).all().map(row => row.name).filter(column => !['created_at','updated_at'].includes(column)).map(column => `"${column}"`).join(',');
    const rows = db => JSON.stringify(db.prepare(`SELECT ${columns} FROM "${table}"`).all().map(row => JSON.stringify(row)).sort());
    if (rows(candidate) !== rows(transport)) throw Error(`Transport data differs: ${table}`);
  }
  for (const db of [candidate,transport]) {
    if (db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Integrity check failed');
  }
  const rehearsal = { backupSha256: hash(backup), pending: manifest, historicalTablesPreserved: tables.length, resultingTables: tablesAfter.length, foreignKeys: 'passed', integrity: 'passed', sourceAndTransportRowsMatch: true };
  await writeFile(`${directory}/rehearsal.json`, JSON.stringify(rehearsal,null,2), { flag: 'wx' });
  await writeFile(`${directory}/migration-config.json`, JSON.stringify({ name:'solarmatch-thailand',account_id:account,compatibility_date:'2026-05-22',d1_databases:[{binding:'DB',database_name:name,database_id:database,migrations_dir:migrationDirectory}] },null,2), { flag: 'wx' });
  console.log(JSON.stringify(rehearsal));
  for (const db of [original,candidate,transport]) db.close();
} else if (action === 'verify') {
  const before = JSON.parse(await readFile(`${directory}/before.json`, 'utf8'));
  // Compare original column values, not newly added NULL/default columns.
  const backup = new DatabaseSync(':memory:');
  restore(backup, await readFile(`${directory}/production-before.sql`, 'utf8'));
  for (const table of historical) {
    const columns = backup.prepare(`PRAGMA table_info("${table}")`).all().map(row => `"${row.name}"`).join(',');
    const expected = hash(JSON.stringify(backup.prepare(`SELECT ${columns} FROM "${table}"`).all().map(row => JSON.stringify(row)).sort()));
    const actual = hash(JSON.stringify((await query(`SELECT ${columns} FROM "${table}"`)).map(row => JSON.stringify(row)).sort()));
    if (actual !== expected) throw Error(`Historical record fingerprint changed: ${table}`);
  }
  backup.close();
  if (JSON.stringify(applied) !== JSON.stringify(migrations)) throw Error('Migration chain incomplete');
  const platform = (await query('SELECT config_json FROM installer_platform_settings WHERE id=1'))[0];
  const clock = (await query('SELECT fixed_at FROM installer_test_clock WHERE id=1'))[0];
  const operations = await query('SELECT (SELECT count(*) FROM installer_auth_user) users,(SELECT count(*) FROM installer_enquiries) enquiries,(SELECT count(*) FROM installer_payment_orders) orders,(SELECT count(*) FROM installer_credit_ledger) ledger,(SELECT count(*) FROM installer_outbox) outbox');
  snapshot.platform = JSON.parse(platform.config_json);
  snapshot.clock = clock.fixed_at;
  snapshot.operations = operations;
  if (!snapshot.platform.platformPaused || snapshot.platform.collectionEnabled || snapshot.platform.paymentsEnabled || !snapshot.platform.deliveryPaused || snapshot.platform.notificationsEnabled || snapshot.clock !== null) throw Error('Operational holds are not intact');
  await writeFile(`${directory}/verified-${Date.now()}.json`,JSON.stringify(snapshot,null,2),{flag:'wx'});
  console.log(JSON.stringify({counts,applied:applied.length,historicalFingerprints:'matched',platform:snapshot.platform,clock:snapshot.clock,operations,preReleaseLeads:before.counts.leads}));
} else throw Error('Unknown read-only release action');
