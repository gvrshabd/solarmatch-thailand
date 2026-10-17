'use client';

import { useRef, useState, type FormEvent } from 'react';

type Preflight = { currentReleaseId: string | null; csrfToken: string; publication: 'explicit-disabled-only' };
const endpoint = '/admin/api/homeowner-v3-release';

/** Narrow release control only; no collection, provider or platform activation. */
export function HomeownerV3ReleasePanel() {
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [backupSha256, setBackupSha256] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState('Read the current release and held-runtime checks before publication.');
  const inFlight = useRef(false);

  async function inspect() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setPreflight(null); setConfirmed(false);
    try {
      const response = await fetch(endpoint, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('preflight_failed');
      const value = await response.json() as Preflight;
      if (value.publication !== 'explicit-disabled-only' || !value.csrfToken || !value.currentReleaseId) throw new Error('invalid_preflight');
      setPreflight(value); setAttempted(false);
      setStatus(value.currentReleaseId === 'residential-release-v9'
        ? 'Homeowner v3 is already published. Do not submit again. Run the preservation verifier.'
        : 'Runtime and database holds are intact. Review the current release and verified backup before publishing.');
    } catch { setStatus('Read-only preflight unavailable. Confirm owner admin access and all operation holds. This read did not publish; any earlier uncertain outcome still requires verification.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || attempted || !preflight || !confirmed || !/^[a-f0-9]{64}$/.test(backupSha256)
      || preflight.currentReleaseId === 'residential-release-v9') return;
    inFlight.current = true; setBusy(true); setAttempted(true);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': preflight.csrfToken },
        body: JSON.stringify({ action: 'publish-homeowner-v3-disabled', expectedCurrentReleaseId: preflight.currentReleaseId, backupSha256 }),
        signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('publication_failed');
      const value = await response.json() as { ok?: boolean; releaseId?: string; liveLeadSubmissions?: boolean; kwhContactSupported?: boolean };
      if (value.ok !== true || value.releaseId !== 'residential-release-v9' || value.liveLeadSubmissions !== false || value.kwhContactSupported !== false) throw new Error('unexpected_result');
      setStatus('Published residential-release-v9 with contact collection disabled. Run the fresh-backup preservation verifier and public configuration checks now.');
      setPreflight(null); setConfirmed(false);
    } catch {
      setStatus('Publication was rejected or its outcome is uncertain. Do not retry blindly. Read the current release again and inspect preservation/audit evidence first.');
      setPreflight(null); setConfirmed(false);
    } finally { inFlight.current = false; setBusy(false); }
  }

  const unavailable = busy || attempted || !preflight || preflight.currentReleaseId === 'residential-release-v9';
  return <section className="admin-section" aria-labelledby="homeowner-release-heading">
    <div className="admin-section-heading"><div><h1 id="homeowner-release-heading">Publish homeowner v3 — collection stays disabled</h1>
      <p>This publishes questionnaire v8 / schema 11 with existing rules v4. It does not migrate data, enable contact collection, payments, allocation, messages or providers. kWh contact remains unavailable.</p></div></div>
    <button type="button" className="admin-button secondary" disabled={busy} onClick={() => void inspect()}>Read current release and holds</button>
    <p role="status" aria-live="polite">{status}</p>
    {preflight && <p>Current release: <strong>{preflight.currentReleaseId}</strong></p>}
    <form onSubmit={event => void publish(event)}>
      <div className="admin-editor-fields"><label>Verified fresh backup export SHA-256
        <input name="backupSha256" value={backupSha256} onChange={event => { setBackupSha256(event.target.value.trim().toLowerCase()); setConfirmed(false); }}
          required pattern="[a-f0-9]{64}" minLength={64} maxLength={64} autoComplete="off" spellCheck={false} disabled={unavailable} />
      </label></div>
      <p>The hash is an operator attestation recorded in the audit trail. This page cannot verify your local encrypted backup. Confirm the fresh backup and disposable restore succeeded for this exact target.</p>
      <label><input type="checkbox" checked={confirmed} disabled={unavailable} onChange={event => setConfirmed(event.target.checked)} />
        I verified the fresh encrypted backup for this target, reviewed the current release, and authorize only disabled homeowner v3 publication.</label>
      <p><button className="admin-button" type="submit" disabled={unavailable || !confirmed || !/^[a-f0-9]{64}$/.test(backupSha256)}>Publish homeowner v3 with collection disabled</button></p>
    </form>
  </section>;
}
