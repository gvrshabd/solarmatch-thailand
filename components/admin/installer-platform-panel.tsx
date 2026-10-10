'use client';

import { useCallback, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Collection = 'companies' | 'enquiries' | 'deliveries' | 'orders' | 'claims' | 'ledger' | 'outbox';
type Payload = Record<Collection, Row[]> & { settings: Record<string, unknown>; summary: Record<string, unknown>; preview?:Row[];retentionDays?:number };
type Action = 'approve-company' | 'grant-trial' | 'allocate' | 'process-queue' | 'retry-outbox' | 'decide-claim' | 'adjust-credit' | 'save-settings' | 'reconcile' | 'pause-company' | 'suppress-enquiry' | 'record-ad-spend' | 'acknowledge-privacy-notification' | 'review-enquiry' | 'preview-retention';
const sections: Collection[] = ['companies', 'enquiries', 'deliveries', 'orders', 'claims', 'ledger', 'outbox'];
const visibleColumns: Record<Collection, string[]> = {
  companies: ['id', 'legal_name_en', 'legal_name_th', 'legal_name', 'name', 'status', 'approval_status', 'paused', 'daily_limit', 'available', 'reserved', 'debt', 'available_credits', 'reserved_credits', 'trial_remaining'],
  enquiries: ['id', 'reference', 'province', 'status', 'verification_state', 'qualification_state', 'qualification_snapshot', 'duplicate_state', 'request_expires_at', 'created_at', 'requested_at', 'recipient_count', 'suppressed_at', 'suppressed'],
  deliveries: ['id', 'enquiry_id', 'company_id', 'partner_id', 'product', 'funding_source', 'credit_cost', 'credit_units', 'allocated_at', 'available_at', 'delivered_at', 'notification_status'],
  orders: ['id', 'company_id', 'package_id', 'amount_minor', 'currency', 'status', 'provider', 'provider_order_id', 'created_at'],
  claims: ['id', 'delivery_id', 'company_id', 'reason', 'status', 'submitted_at', 'decision', 'resolved_at'],
  ledger: ['id', 'company_id', 'units', 'available_delta', 'reserved_delta', 'trial_delta', 'debt_delta', 'kind', 'source', 'source_id', 'order_id', 'delivery_id', 'claim_id', 'reason', 'created_at'],
  outbox: ['id', 'delivery_id', 'kind', 'channel', 'state', 'status', 'attempts', 'last_error', 'available_at', 'created_at'],
};
async function read(response: Response): Promise<Payload> {
  const body = await response.json().catch(() => null) as Payload & { error?: string } | null;
  if (!response.ok || !body) throw new Error(body?.error ?? `Request failed (${response.status})`);
  return body;
}
function cell(value: unknown) { return value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value); }

export function InstallerPlatformPanel({ csrfToken, setMessage }: { csrfToken: string; setMessage: (value: string) => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [section, setSection] = useState<Collection>('companies');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>('approve-company');
  const [companyId, setCompanyId] = useState('');
  const [enquiryId, setEnquiryId] = useState('');
  const [claimId, setClaimId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [outboxId, setOutboxId] = useState('');
  const [leadId,setLeadId]=useState('');
  const [reviewDecision,setReviewDecision]=useState('same-project');
  const [retentionPreview,setRetentionPreview]=useState<Row[]|null>(null);
  const [reason, setReason] = useState('');
  const [units, setUnits] = useState('');
  const [decision, setDecision] = useState('approved');
  const [booleanChoice, setBooleanChoice] = useState(true);
  const [settings, setSettings] = useState('');
  const load = useCallback(async () => {
    try { const result = await read(await fetch('/admin/api/installer-platform', { cache: 'no-store' })); setData(result); setSettings(JSON.stringify(result.settings, null, 2)); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load installer operations.'); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/admin/api/installer-platform', { cache: 'no-store', signal: controller.signal }).then(read).then(result => {
      setData(result); setSettings(JSON.stringify(result.settings, null, 2));
    }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Unable to load installer operations.'); });
    return () => controller.abort();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!csrfToken || busy) return;
    setBusy(true); setError('');
    try {
      const payload: Row = { action };
      if (['approve-company','grant-trial','pause-company','adjust-credit'].includes(action)) payload.companyId = companyId;
      if (action === 'approve-company') payload.approve = booleanChoice;
      if (action === 'pause-company') payload.paused = booleanChoice;
      if (action === 'allocate' || action === 'suppress-enquiry') payload.enquiryId = enquiryId;
      if (action === 'allocate' && companyId) payload.companyIds = [companyId];
      if (action === 'decide-claim') { payload.claimId = claimId; payload.decision = decision; payload.notes = reason; }
      if (action === 'adjust-credit') { const amount = Number(units); if (!Number.isSafeInteger(amount) || amount === 0) throw new Error('Enter a nonzero whole number of credit units.'); payload.units = amount; payload.reason = reason; }
      if (action === 'suppress-enquiry') payload.reason = reason;
      if (action === 'review-enquiry') {payload.enquiryId=enquiryId;payload.decision=reviewDecision;payload.reason=reason;if(reason.trim().length<20)throw new Error('Document at least 20 characters of review evidence.');if(reviewDecision==='distinct-project')payload.leadId=leadId;}
      if (action === 'reconcile' && orderId) payload.orderId = orderId;
      if (action === 'record-ad-spend') { const amountMinor=Number(units);if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)throw new Error('Enter advertising spend in positive integer satang.');payload.amountMinor=amountMinor;payload.reason=reason; }
      if (action === 'acknowledge-privacy-notification') { payload.outboxId=outboxId;payload.notes=reason; }
      if (action === 'save-settings') payload.settings = JSON.parse(settings);
      const result=await read(await fetch('/admin/api/installer-platform', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(payload) }));
      if(action==='preview-retention'){setRetentionPreview(result.preview??[]);setMessage(`Retention preview for configured ${result.retentionDays} days; no records changed.`);return;}
      setMessage(`Installer operation recorded: ${action}.`); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Operation failed.'); } finally { setBusy(false); }
  }
  const rows = data?.[section] ?? [];
  const columns = visibleColumns[section].filter(column => rows.some(row => column in row));
  const companyNeeded = ['approve-company','grant-trial','pause-company','adjust-credit','allocate'].includes(action);
  return <section className="admin-section">
    <div className="admin-section-heading"><div><h2>Installer operations</h2><p>Shared residential enquiries, company approvals, credits and provider reconciliation. Enquiry availability in the portal starts the draft claim window{data ? ` (${String(data.settings.claimDays)} days under current settings)` : ''}.</p></div><button className="admin-button secondary" type="button" disabled={busy} onClick={() => void load()}>Refresh</button></div>
    {error && <p className="admin-alert error" role="alert">{error}</p>}
    {data && <div className="admin-stats">{Object.entries(data.summary ?? {}).filter(([,value]) => typeof value === 'number').map(([key,value]) => <article key={key}><span>{key.replaceAll('_',' ')}</span><strong>{String(value)}</strong></article>)}</div>}
    <p className="admin-guardrail-note">Trial grants are restricted to {data ? String(data.settings.trialDeliveries) : 'the configured number of'} shared residential enquiries per approved company. Credit restorations do not reopen recipient slots. Payment capture, unused credits and earned enquiry fees are separate records. Available credit value uses the current nominal credit price; it is not a historical cash liability calculation. Bank settlement is unverified unless independently reconciled.</p>
    <form className="admin-media-form" onSubmit={event => void submit(event)}>
      <label>Operation<select value={action} onChange={event => setAction(event.target.value as Action)}>
        <option value="approve-company">Review company approval</option><option value="grant-trial">Grant configured free shared enquiry trial</option><option value="pause-company">Pause / resume company</option><option value="allocate">Allocate through shared eligibility service</option><option value="review-enquiry">Review duplicate / separate project</option><option value="process-queue">Process eligible business-hours queue</option><option value="retry-outbox">Retry pending notifications</option><option value="decide-claim">Resolve credit claim</option><option value="adjust-credit">Audited credit adjustment</option><option value="suppress-enquiry">Withdraw / suppress enquiry</option><option value="reconcile">Reconcile payment status</option><option value="record-ad-spend">Record advertising spend</option><option value="acknowledge-privacy-notification">Record recipient withdrawal notification</option><option value="preview-retention">Preview configured retention (no deletion)</option><option value="save-settings">Save validated business settings</option>
      </select></label>
      {companyNeeded && <label>{action === 'allocate' ? 'Company (optional; blank uses fair allocation)' : 'Company'}<select value={companyId} required={action !== 'allocate'} onChange={event => setCompanyId(event.target.value)}><option value="">Select company</option>{data?.companies?.map(row => <option value={String(row.id)} key={String(row.id)}>{cell(row.legal_name_en ?? row.legal_name ?? row.name ?? row.id)} · {cell(row.status ?? row.approval_status)}</option>)}</select></label>}
      {['approve-company','pause-company'].includes(action) && <label>Result<select value={String(booleanChoice)} onChange={event => setBooleanChoice(event.target.value === 'true')}><option value="true">{action === 'approve-company' ? 'Approved' : 'Paused'}</option><option value="false">{action === 'approve-company' ? 'Not approved' : 'Resumed'}</option></select></label>}
      {['allocate','suppress-enquiry','review-enquiry'].includes(action) && <label>Enquiry<select value={enquiryId} required onChange={event => setEnquiryId(event.target.value)}><option value="">Select enquiry</option>{data?.enquiries?.map(row => <option value={String(row.id)} key={String(row.id)}>{cell(row.reference ?? row.id)} · {cell(row.status)}</option>)}</select></label>}
      {action==='review-enquiry'&&<><label>Review decision<select value={reviewDecision} onChange={event=>setReviewDecision(event.target.value)}><option value="same-project">Same project; retain existing sharing slots</option><option value="distinct-project">Distinct verified project/property</option><option value="reject">Reject / retain review status</option></select></label>{reviewDecision==='distinct-project'&&<label>Verified new submission lead ID<input value={leadId} onChange={event=>setLeadId(event.target.value)} required /><small>A genuinely different property key and independently verified new request are required. This cannot reset slots for the same property.</small></label>}<p>Review does not override consent, qualification, expiry, withdrawal or recipient caps.</p></>}
      {action==='preview-retention'&&<p>Uses the saved positive retention period. No retention policy is assumed and this action does not delete personal information.</p>}
      {action === 'decide-claim' && <><label>Claim<select value={claimId} required onChange={event => setClaimId(event.target.value)}><option value="">Select claim</option>{data?.claims?.map(row => <option value={String(row.id)} key={String(row.id)}>{cell(row.id)} · {cell(row.status)} · {cell(row.reason)}</option>)}</select></label><label>Decision<select value={decision} onChange={event => setDecision(event.target.value)}><option value="approved">Approve restoration</option><option value="rejected">Reject</option><option value="needs-information">Request information</option></select></label></>}
      {action === 'adjust-credit' && <label>Whole credit units (+ / −)<input required type="number" step="1" value={units} onChange={event => setUnits(event.target.value)} /></label>}
      {action === 'record-ad-spend' && <label>Advertising spend in satang (฿1 = 100 satang)<input required type="number" min="1" step="1" value={units} onChange={event => setUnits(event.target.value)} /></label>}
      {action === 'acknowledge-privacy-notification' && <label>Withdrawal notification requiring acknowledgement<select required value={outboxId} onChange={event => setOutboxId(event.target.value)}><option value="">Select notification task</option>{data?.outbox?.filter(row => row.kind==='withdrawal' && row.state==='action-required').map(row => <option key={String(row.id)} value={String(row.id)}>{cell(row.id)} · {cell(row.company_id)}</option>)}</select><small>Record the actual recipient notification and evidence below; opening a task does not confirm notification.</small></label>}
      {['decide-claim','adjust-credit','suppress-enquiry','record-ad-spend','acknowledge-privacy-notification','review-enquiry'].includes(action) && <label>{action==='record-ad-spend'?'Campaign / source':action==='acknowledge-privacy-notification'?'Notification evidence and responsible person':'Recorded explanation'}<textarea required minLength={action==='review-enquiry'?20:3} maxLength={['record-ad-spend','review-enquiry'].includes(action)?1000:2000} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      {action === 'reconcile' && <label>Order (optional; blank reconciles pending orders)<select value={orderId} onChange={event => setOrderId(event.target.value)}><option value="">All pending orders</option>{data?.orders?.map(row => <option value={String(row.id)} key={String(row.id)}>{cell(row.id)} · {cell(row.status)}</option>)}</select></label>}
      {action === 'save-settings' && <label>Business settings JSON<textarea rows={18} required spellCheck={false} value={settings} onChange={event => setSettings(event.target.value)} /><small>Server validates settings and records their history. Real collection, live payments and outbound messages remain separately gated.</small></label>}
      <button className="admin-button" type="submit" disabled={busy || !csrfToken || !data}>{busy ? 'Recording…' : 'Record operation'}</button>
    </form>
    {retentionPreview&&<section><h3>Retention preview only</h3><p>{retentionPreview.length} candidate records; maximum 100 shown. Nothing was deleted.</p><table className="admin-table"><thead><tr><th>Lead reference</th><th>Original request date</th></tr></thead><tbody>{retentionPreview.map(row=><tr key={String(row.id)}><td>{cell(row.id)}</td><td>{cell(row.created_at)}</td></tr>)}</tbody></table></section>}
    <nav className="admin-tabs" aria-label="Installer records">{sections.map(value => <button type="button" key={value} className={section === value ? 'active' : ''} onClick={() => setSection(value)}>{value} ({data?.[value]?.length ?? 0})</button>)}</nav>
    <div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr>{columns.map(column => <th key={column}>{column.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={String(row.id ?? index)}>{columns.map(column => <td key={column}>{cell(row[column])}</td>)}</tr>)}</tbody></table></div>
    {!rows.length && <p>{data ? 'No records in this section.' : 'Loading installer records…'}</p>}
  </section>;
}
