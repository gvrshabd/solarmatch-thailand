'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Clipboard, Download, FileCheck2, RefreshCcw, Save, Trash2, Upload } from 'lucide-react';
import type { LegalDocumentDraft, OperatorProfile } from '@/config/legal-content';

type LegalVersion = { id: string; version_number: number; state: string; documents_json: string; is_complete: number; review_status: string; created_at: string; published_at: string | null };
type Partner = {
  id: string; legal_name_en: string; legal_name_th: string; trading_name: string | null; registration_number: string | null;
  privacy_notice_url: string; service_provinces_json: string; service_areas_json: string; active: number; contract_state: string;
  contract_effective_date: string | null; contract_expiry_date: string | null; delivery_method: 'manual-copy'|'manual-email'|'manual-line';
  operational_capacity: number | null; internal_lead_price_thb: number | null; internal_notes: string | null; archived_at: string | null;
  operational_contact_json: string; accepted_lead_criteria_json: string;
};
type ContractDocument = { id: string; partner_id: string; original_filename: string; byte_size: number; sha256: string; contract_effective_date: string|null; contract_expiry_date: string|null; created_at: string };
type PrivacyRequest = { id: string; lead_id: string|null; request_type: string; received_channel: string; received_at: string; identity_verification_state: 'pending'|'verified'|'failed'|'not-required'; status: 'open'|'verifying'|'in-progress'|'completed'|'rejected'; resolution_notes: string|null; suppression_applied: number; partner_notification_required: number; partner_notification_completed: number; legal_hold: number };
type Delivery = { id: string; lead_id: string; partner_id: string; trading_name: string|null; legal_name_en: string; delivered_at: string; delivery_status: 'delivered'|'accepted'|'rejected'|'withdrawal-notified'|'deleted-notified'; payment_status: 'not-recorded'|'pending'|'paid'|'waived'|'disputed'; survey_status: 'not-recorded'|'scheduled'|'completed'|'cancelled'; quotation_status: 'not-recorded'|'requested'|'provided'|'declined'; outcome_status: 'not-recorded'|'open'|'won'|'lost'|'not-suitable'; deletion_notification_state: 'not-required'|'required'|'sent'|'acknowledged' };
type LegalLaunchPayload = { legal: LegalVersion[]; partners: Partner[]; contracts: ContractDocument[]; privacyRequests: PrivacyRequest[]; deliveries: Delivery[]; sharedLeads: Array<{ id: string; legal_first_name: string; legal_last_name: string; province: string; distribution_expires_at: string|null; suppressed: number; consent_withdrawn_at: string|null }>; defaultLegalDraft: { operator: OperatorProfile; documents: Record<'privacy'|'terms'|'cookies', LegalDocumentDraft> } };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as T | { error?: string; details?: unknown } | null;
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed (${response.status})`);
  return body as T;
}

const emptyPartner = {
  legalNameEn: '', legalNameTh: '', tradingName: '', registrationNumber: '', privacyNoticeUrl: '',
  serviceProvinces: [] as string[], serviceAreas: [] as string[], active: false, contractState: 'pending',
  contractEffectiveDate: null as string|null, contractExpiryDate: null as string|null,
  deliveryMethod: 'manual-copy' as 'manual-copy'|'manual-email'|'manual-line', operationalCapacity: null as number|null, internalLeadPriceThb: null as number|null,
  internalNotes: '', operationalContact: { email: '', phone: '' }, acceptedLeadCriteria: { minimumQualityScore: null as number|null, hardEligibleOnly: false },
};
const provinces = ['bangkok', 'nonthaburi', 'pathum-thani', 'samut-prakan', 'samut-sakhon', 'nakhon-pathom'];

export function LegalLaunchPanel({ csrfToken, setMessage }: { csrfToken: string; setMessage: (value: string) => void }) {
  const [data, setData] = useState<LegalLaunchPayload | null>(null);
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [documents, setDocuments] = useState<Record<'privacy'|'terms'|'cookies', LegalDocumentDraft> | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'pending-legal-review'|'reviewed'|'approved'>('pending-legal-review');
  const [partner, setPartner] = useState({ ...emptyPartner, id: undefined as string|undefined });
  const [privacy, setPrivacy] = useState({ leadId: '', requestType: 'withdrawal', receivedChannel: 'email', resolutionNotes: '' });
  const [distributionLeadId, setDistributionLeadId] = useState('');
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (body?: Record<string, unknown>) => json<Record<string, unknown>>(await fetch('/admin/api/legal-launch', {
    method: body ? 'POST' : 'GET', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: body ? JSON.stringify(body) : undefined,
  })), [csrfToken]);

  const load = useCallback(async () => {
    const result = await json<LegalLaunchPayload>(await fetch('/admin/api/legal-launch', { cache: 'no-store' }));
    setData(result);
    const draft = result.legal.find((item) => item.state === 'draft');
    if (draft) {
      const parsed = JSON.parse(draft.documents_json) as { operator: OperatorProfile; documents: Record<'privacy'|'terms'|'cookies', LegalDocumentDraft> };
      setOperator(parsed.operator); setDocuments(parsed.documents); setReviewStatus(draft.review_status as typeof reviewStatus);
    } else { setOperator(structuredClone(result.defaultLegalDraft.operator)); setDocuments(structuredClone(result.defaultLegalDraft.documents)); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((error: Error) => setMessage(error.message)); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, setMessage]);

  async function perform(body: Record<string, unknown>, success: string) {
    setBusy(true);
    try { await call(body); await load(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.'); }
    finally { setBusy(false); }
  }

  function updateOperator(key: keyof OperatorProfile, value: string | number | null) {
    setOperator((current) => current ? { ...current, [key]: value } : current);
  }

  function editParagraph(type: 'privacy'|'terms'|'cookies', sectionIndex: number, paragraphIndex: number, locale: 'en'|'th', value: string) {
    setDocuments((current) => {
      if (!current) return current;
      const next = structuredClone(current); next[type].sections[sectionIndex].paragraphs[paragraphIndex][locale] = value; return next;
    });
  }

  const legalFields: Array<[keyof OperatorProfile, string, 'text'|'number'|'date']> = [
    ['legalBusinessNameEn', 'Legal business name (English)', 'text'], ['legalBusinessNameTh', 'Legal business name (Thai)', 'text'],
    ['legalEntityType', 'Legal entity type', 'text'], ['registrationOrTaxNumber', 'Registration or tax number', 'text'],
    ['registeredAddressEn', 'Registered address (English)', 'text'], ['registeredAddressTh', 'Registered address (Thai)', 'text'],
    ['publicBusinessPhone', 'Public business phone', 'text'], ['publicBusinessEmail', 'Public business email', 'text'],
    ['privacyContactEmail', 'Privacy contact email', 'text'], ['privacyRightsRequestUrl', 'Privacy rights-request URL', 'text'],
    ['leadRetentionDays', 'Lead retention days', 'number'], ['leadDistributionWindowDays', 'Lead distribution window days', 'number'],
    ['privacyNoticeEffectiveDate', 'Privacy Notice effective date', 'date'], ['termsEffectiveDate', 'Terms effective date', 'date'],
    ['cookiePolicyEffectiveDate', 'Cookie Policy effective date', 'date'], ['dataHostingAndProcessorDetails', 'Hosting and processor details', 'text'],
    ['operatorRepresentativeName', 'Operator representative', 'text'], ['operatorRepresentativeTitle', 'Representative title', 'text'],
  ];

  if (!data || !operator || !documents) return <section className="admin-section"><p>Loading legal-launch configuration…</p></section>;
  const draft = data.legal.find((item) => item.state === 'draft');
  return <section className="admin-section">
    <div className="admin-section-heading"><div><h2>Legal launch and shared-lead operations</h2><p>Drafts, partners and privacy operations remain private. Contact collection stays fail-closed until every readiness condition passes.</p></div><button className="admin-button secondary" type="button" onClick={() => void load()}><RefreshCcw />Refresh</button></div>

    <details open className="admin-config-card"><summary><strong>Operator and legal-document draft</strong></summary>
      <div className="admin-weight-grid">{legalFields.map(([key, label, type]) => <label key={key}><span>{label}</span><input type={type} value={operator[key] === null ? '' : String(operator[key])} onChange={(event) => updateOperator(key, type === 'number' ? (event.target.value ? Number(event.target.value) : null) : (type === 'date' ? event.target.value || null : event.target.value))} /></label>)}</div>
      <label><span>Legal review state</span><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}><option value="pending-legal-review">Pending legal review</option><option value="reviewed">Reviewed</option><option value="approved">Approved</option></select></label>
      <div className="admin-heading-actions"><button className="admin-button secondary" disabled={busy} type="button" onClick={() => void perform({ action: 'save-legal-draft', operator, documents, reviewStatus }, 'Legal/operator changes saved as a private draft.') }><Save />Save draft</button><button className="admin-button" disabled={busy || !draft} type="button" onClick={() => draft && void perform({ action: 'publish-legal', versionId: draft.id }, 'Legal version published in a new fail-closed public release.') }><FileCheck2 />Publish reviewed version</button></div>
      <p className="admin-help">Publishing is blocked until every factual operator field is complete and the review state is no longer pending. Publishing legal content does not activate contact collection.</p>
      <div className="admin-history-grid">{data.legal.map((version) => <article key={version.id}><strong>{version.id}</strong><span>{version.state} · {version.review_status}{version.is_complete ? ' · complete' : ' · incomplete'}</span><small>{new Date(version.created_at).toLocaleString('en-GB')}</small>{version.state !== 'draft' && <button type="button" disabled={busy} onClick={() => void perform({ action: 'restore-legal', versionId: version.id }, 'Legal version restored as a new pending-review draft.')}>Restore as draft</button>}</article>)}</div>
      {(['privacy','terms','cookies'] as const).map((type) => <details key={type} className="admin-legal-document"><summary>{documents[type].title.en} / {documents[type].title.th}</summary>{documents[type].sections.map((item, sectionIndex) => <fieldset key={item.id}><legend>{item.title.en}<small>{item.title.th}</small></legend>{item.paragraphs.map((paragraph, paragraphIndex) => <div className="admin-bilingual-grid" key={paragraphIndex}><label>English<textarea value={paragraph.en} onChange={(event) => editParagraph(type, sectionIndex, paragraphIndex, 'en', event.target.value)} /></label><label>ไทย<textarea lang="th" value={paragraph.th} onChange={(event) => editParagraph(type, sectionIndex, paragraphIndex, 'th', event.target.value)} /></label></div>)}</fieldset>)}</details>)}
    </details>

    <details open className="admin-config-card"><summary><strong>Participating solar companies</strong></summary>
      <div className="admin-weight-grid"><label>Legal name (English)<input value={partner.legalNameEn} onChange={(event) => setPartner({ ...partner, legalNameEn: event.target.value })} /></label><label>Legal name (Thai)<input lang="th" value={partner.legalNameTh} onChange={(event) => setPartner({ ...partner, legalNameTh: event.target.value })} /></label><label>Trading name<input value={partner.tradingName} onChange={(event) => setPartner({ ...partner, tradingName: event.target.value })} /></label><label>Registration number<input value={partner.registrationNumber} onChange={(event) => setPartner({ ...partner, registrationNumber: event.target.value })} /></label><label>Privacy Notice URL<input type="url" value={partner.privacyNoticeUrl} onChange={(event) => setPartner({ ...partner, privacyNoticeUrl: event.target.value })} /></label><label>Operational email<input type="email" value={partner.operationalContact.email} onChange={(event) => setPartner({ ...partner, operationalContact: { ...partner.operationalContact, email: event.target.value } })} /></label><label>Operational phone<input value={partner.operationalContact.phone} onChange={(event) => setPartner({ ...partner, operationalContact: { ...partner.operationalContact, phone: event.target.value } })} /></label><label>Contract state<select value={partner.contractState} onChange={(event) => setPartner({ ...partner, contractState: event.target.value })}><option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></label><label>Contract effective<input type="date" value={partner.contractEffectiveDate ?? ''} onChange={(event) => setPartner({ ...partner, contractEffectiveDate: event.target.value || null })} /></label><label>Contract expiry<input type="date" value={partner.contractExpiryDate ?? ''} onChange={(event) => setPartner({ ...partner, contractExpiryDate: event.target.value || null })} /></label><label>Capacity<input type="number" min="0" value={partner.operationalCapacity ?? ''} onChange={(event) => setPartner({ ...partner, operationalCapacity: event.target.value ? Number(event.target.value) : null })} /></label><label>Internal lead price (THB)<input type="number" min="0" value={partner.internalLeadPriceThb ?? ''} onChange={(event) => setPartner({ ...partner, internalLeadPriceThb: event.target.value ? Number(event.target.value) : null })} /></label><label>Minimum quality score<select value={partner.acceptedLeadCriteria.minimumQualityScore ?? ''} onChange={(event) => setPartner({ ...partner, acceptedLeadCriteria: { ...partner.acceptedLeadCriteria, minimumQualityScore: event.target.value ? Number(event.target.value) : null } })}><option value="">No partner-specific minimum</option>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label></div>
      <fieldset><legend>Service provinces</legend><div className="admin-choice-grid">{provinces.map((value) => <label key={value}><input type="checkbox" checked={partner.serviceProvinces.includes(value)} onChange={(event) => setPartner({ ...partner, serviceProvinces: event.target.checked ? [...partner.serviceProvinces, value] : partner.serviceProvinces.filter((item) => item !== value) })} />{value}</label>)}</div></fieldset>
      <label>Other exact service areas (one per line)<textarea value={partner.serviceAreas.join('\n')} onChange={(event) => setPartner({ ...partner, serviceAreas: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} /></label>
      <label><input type="checkbox" checked={partner.acceptedLeadCriteria.hardEligibleOnly} onChange={(event) => setPartner({ ...partner, acceptedLeadCriteria: { ...partner.acceptedLeadCriteria, hardEligibleOnly: event.target.checked } })} /> Partner accepts only hard-eligible leads</label>
      <label><input type="checkbox" checked={partner.active} onChange={(event) => setPartner({ ...partner, active: event.target.checked })} /> Active for distribution (requires active current contract)</label>
      <label>Internal notes<textarea value={partner.internalNotes} onChange={(event) => setPartner({ ...partner, internalNotes: event.target.value })} /></label>
      <div className="admin-heading-actions"><button className="admin-button" disabled={busy} type="button" onClick={() => void perform({ action: 'save-partner', partner: { ...partner, tradingName: partner.tradingName || null, registrationNumber: partner.registrationNumber || null, internalNotes: partner.internalNotes || null } }, 'Partner record saved.') }><Save />Save partner</button><button className="admin-button secondary" type="button" onClick={() => setPartner({ ...emptyPartner, id: undefined })}>New partner</button></div>
      <div className="admin-history-grid">{data.partners.map((item) => <article key={item.id}><h3>{item.trading_name || item.legal_name_en}</h3><p>{item.active ? 'Active' : 'Inactive'} · {item.contract_state}</p><small>{item.service_provinces_json}</small><div className="admin-heading-actions"><button type="button" onClick={() => { const contact = JSON.parse(item.operational_contact_json) as Record<string,string>; const criteria = JSON.parse(item.accepted_lead_criteria_json) as { minimumQualityScore?: number|null; hardEligibleOnly?: boolean }; setPartner({ id: item.id, legalNameEn: item.legal_name_en, legalNameTh: item.legal_name_th, tradingName: item.trading_name ?? '', registrationNumber: item.registration_number ?? '', privacyNoticeUrl: item.privacy_notice_url, serviceProvinces: JSON.parse(item.service_provinces_json), serviceAreas: JSON.parse(item.service_areas_json), active: Boolean(item.active), contractState: item.contract_state, contractEffectiveDate: item.contract_effective_date, contractExpiryDate: item.contract_expiry_date, deliveryMethod: item.delivery_method, operationalCapacity: item.operational_capacity, internalLeadPriceThb: item.internal_lead_price_thb, internalNotes: item.internal_notes ?? '', operationalContact: { email: contact.email ?? '', phone: contact.phone ?? '' }, acceptedLeadCriteria: { minimumQualityScore: criteria.minimumQualityScore ?? null, hardEligibleOnly: Boolean(criteria.hardEligibleOnly) } }); }}>Edit</button><button className="danger" type="button" onClick={() => confirm('Archive this partner and prevent new deliveries?') && void perform({ action: 'archive-partner', partnerId: item.id }, 'Partner archived.') }><Archive />Archive</button></div><ContractUpload partnerId={item.id} csrfToken={csrfToken} setMessage={setMessage} /><ContractList documents={data.contracts.filter((document) => document.partner_id === item.id)} csrfToken={csrfToken} onChanged={load} setMessage={setMessage} /></article>)}</div>
    </details>

    <details className="admin-config-card"><summary><strong>Privacy rights requests</strong></summary>
      <div className="admin-weight-grid"><label>Lead ID (optional)<input value={privacy.leadId} onChange={(event) => setPrivacy({ ...privacy, leadId: event.target.value })} /></label><label>Request type<select value={privacy.requestType} onChange={(event) => setPrivacy({ ...privacy, requestType: event.target.value })}><option value="access">Access</option><option value="correction">Correction</option><option value="deletion">Deletion</option><option value="restriction">Restriction</option><option value="objection">Objection</option><option value="withdrawal">Withdrawal</option><option value="stop-contact">Stop contact</option></select></label><label>Channel<select value={privacy.receivedChannel} onChange={(event) => setPrivacy({ ...privacy, receivedChannel: event.target.value })}><option value="email">Email</option><option value="phone">Phone</option><option value="rights-page">Rights page</option><option value="other">Other</option></select></label></div><label>Resolution notes<textarea value={privacy.resolutionNotes} onChange={(event) => setPrivacy({ ...privacy, resolutionNotes: event.target.value })} /></label><button className="admin-button" type="button" disabled={busy} onClick={() => void perform({ action: 'save-privacy-request', request: { leadId: privacy.leadId || null, requestType: privacy.requestType, receivedChannel: privacy.receivedChannel, receivedAt: new Date().toISOString(), identityVerificationState: 'pending', status: 'open', dueAt: null, resolutionNotes: privacy.resolutionNotes || null, partnerNotificationRequired: false, partnerNotificationCompleted: false, legalHold: false } }, 'Privacy request recorded; applicable suppression was enforced.')}>Record request</button>
      <div className="admin-history-grid">{data.privacyRequests.map((item) => <PrivacyRequestRow key={item.id} item={item} csrfToken={csrfToken} onChanged={load} setMessage={setMessage} />)}</div>
    </details>
    <details className="admin-config-card"><summary><strong>Manual shared-lead distribution</strong></summary><label>Eligible shared-mode lead<select value={distributionLeadId} onChange={(event) => setDistributionLeadId(event.target.value)}><option value="">Choose a lead</option>{data.sharedLeads.map((lead) => <option key={lead.id} value={lead.id}>{lead.legal_first_name} {lead.legal_last_name} · {lead.province} · expires {lead.distribution_expires_at ?? 'not set'}{lead.suppressed || lead.consent_withdrawn_at ? ' · SUPPRESSED' : ''}</option>)}</select></label>{distributionLeadId ? <LeadDistributionPanel leadId={distributionLeadId} csrfToken={csrfToken} setMessage={setMessage} /> : <p className="admin-help">Only consent-compatible shared-mode leads appear here. The server still rechecks every distribution guardrail.</p>}</details>
    <details className="admin-config-card"><summary><strong>Recipient delivery outcomes</strong></summary><div className="admin-history-grid">{data.deliveries.map((item) => <DeliveryRow key={item.id} item={item} csrfToken={csrfToken} onChanged={load} setMessage={setMessage} />)}</div>{!data.deliveries.length && <p className="admin-help">No recipient deliveries have been recorded.</p>}</details>
  </section>;
}

function ContractUpload({ partnerId, csrfToken, setMessage }: { partnerId: string; csrfToken: string; setMessage: (value: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  async function upload() {
    if (!file) return;
    const form = new FormData(); form.set('file', file); form.set('partnerId', partnerId);
    try { await json(await fetch('/admin/api/partner-contracts', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: form })); setFile(null); setMessage('Private contract PDF uploaded.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Contract upload failed.'); }
  }
  return <div className="admin-contract-upload"><label>Private contract PDF<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!file} onClick={() => void upload()}><Upload />Upload</button></div>;
}

function ContractList({ documents, csrfToken, onChanged, setMessage }: { documents: ContractDocument[]; csrfToken: string; onChanged: () => Promise<void>; setMessage: (value: string) => void }) {
  async function remove(id: string) {
    if (!confirm('Permanently delete this private contract file? This cannot be undone.')) return;
    try {
      await json(await fetch('/admin/api/partner-contracts', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ id, confirmation: 'DELETE CONTRACT' }) }));
      await onChanged(); setMessage('Private contract file permanently deleted.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Contract deletion failed.'); }
  }
  return <div className="admin-contract-list">{documents.map((document) => <div key={document.id}><span>{document.original_filename} · {Math.ceil(document.byte_size / 1024)} KB</span><div><a href={`/admin/api/partner-contracts?id=${document.id}`}><Download />Download</a><button className="danger" type="button" onClick={() => void remove(document.id)}><Trash2 />Delete</button></div></div>)}</div>;
}

function PrivacyRequestRow({ item, csrfToken, onChanged, setMessage }: { item: PrivacyRequest; csrfToken: string; onChanged: () => Promise<void>; setMessage: (value: string) => void }) {
  const [verification, setVerification] = useState(item.identity_verification_state); const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.resolution_notes ?? ''); const [notified, setNotified] = useState(Boolean(item.partner_notification_completed)); const [legalHold, setLegalHold] = useState(Boolean(item.legal_hold));
  async function save() {
    try { await json(await fetch('/admin/api/legal-launch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action: 'update-privacy-request', requestId: item.id, identityVerificationState: verification, status, resolutionNotes: notes || null, partnerNotificationCompleted: notified, legalHold }) })); await onChanged(); setMessage('Privacy request updated and applicable suppression rechecked.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Privacy request update failed.'); }
  }
  return <article><strong>{item.request_type}</strong><small>{item.received_at} · lead {item.lead_id ?? 'not linked'}{item.suppression_applied ? ' · suppressed' : ''}</small><label>Identity verification<select value={verification} onChange={(event) => setVerification(event.target.value as typeof verification)}><option value="pending">Pending</option><option value="verified">Verified</option><option value="failed">Failed</option><option value="not-required">Not required</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="open">Open</option><option value="verifying">Verifying</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></label><label>Resolution notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><label><input type="checkbox" checked={notified} onChange={(event) => setNotified(event.target.checked)} /> Prior partners notified where required</label><label><input type="checkbox" checked={legalHold} onChange={(event) => setLegalHold(event.target.checked)} /> Legal hold applies</label><button type="button" onClick={() => void save()}><Save />Save request</button></article>;
}

function DeliveryRow({ item, csrfToken, onChanged, setMessage }: { item: Delivery; csrfToken: string; onChanged: () => Promise<void>; setMessage: (value: string) => void }) {
  const [deliveryStatus, setDeliveryStatus] = useState(item.delivery_status); const [paymentStatus, setPaymentStatus] = useState(item.payment_status);
  const [surveyStatus, setSurveyStatus] = useState(item.survey_status); const [quotationStatus, setQuotationStatus] = useState(item.quotation_status);
  const [outcomeStatus, setOutcomeStatus] = useState(item.outcome_status); const [deletionState, setDeletionState] = useState(item.deletion_notification_state);
  const [reason, setReason] = useState('');
  async function save() {
    try { await json(await fetch('/admin/api/legal-launch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action: 'update-delivery', deliveryId: item.id, deliveryStatus, rejectionReason: reason || null, paymentStatus, surveyStatus, quotationStatus, outcomeStatus, deletionNotificationState: deletionState }) })); await onChanged(); setMessage('Recipient delivery outcome updated.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Delivery update failed.'); }
  }
  return <article><strong>{item.trading_name || item.legal_name_en}</strong><small>Lead {item.lead_id} · {item.delivered_at}</small><label>Delivery<select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value as typeof deliveryStatus)}><option value="delivered">Delivered</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="withdrawal-notified">Withdrawal notified</option><option value="deleted-notified">Deletion notified</option></select></label>{deliveryStatus === 'rejected' && <label>Rejection reason<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>}<label>Survey<select value={surveyStatus} onChange={(event) => setSurveyStatus(event.target.value as typeof surveyStatus)}><option value="not-recorded">Not recorded</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Quotation<select value={quotationStatus} onChange={(event) => setQuotationStatus(event.target.value as typeof quotationStatus)}><option value="not-recorded">Not recorded</option><option value="requested">Requested</option><option value="provided">Provided</option><option value="declined">Declined</option></select></label><label>Outcome<select value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value as typeof outcomeStatus)}><option value="not-recorded">Not recorded</option><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option><option value="not-suitable">Not suitable</option></select></label><label>Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}><option value="not-recorded">Not recorded</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="waived">Waived</option><option value="disputed">Disputed</option></select></label><label>Deletion notice<select value={deletionState} onChange={(event) => setDeletionState(event.target.value as typeof deletionState)}><option value="not-required">Not required</option><option value="required">Required</option><option value="sent">Sent</option><option value="acknowledged">Acknowledged</option></select></label><button type="button" onClick={() => void save()}><Save />Save outcome</button></article>;
}

export function LeadDistributionPanel({ leadId, csrfToken, setMessage }: { leadId: string; csrfToken: string; setMessage: (value: string) => void }) {
  const [partners, setPartners] = useState<Partner[]>([]); const [selected, setSelected] = useState<string[]>([]); const [prepared, setPrepared] = useState<Array<{ partnerId: string; recipient: string; text: string }>>([]);
  useEffect(() => { void (async () => {
    try { const value = await json<LegalLaunchPayload>(await fetch('/admin/api/legal-launch', { cache: 'no-store' })); setPartners(value.partners.filter((item) => item.active && !item.archived_at)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Partners could not be loaded.'); }
  })(); }, [setMessage]);
  async function request(action: 'prepare-delivery'|'confirm-delivery') {
    const response = await json<{ prepared?: typeof prepared }>(await fetch('/admin/api/legal-launch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action, leadId, partnerIds: selected, ...(action === 'confirm-delivery' ? { clipboardConfirmed: true } : {}) }) }));
    if (action === 'prepare-delivery') { setPrepared(response.prepared ?? []); setMessage('Recipient-specific copies prepared. Review before copying.'); }
    else { setPrepared([]); setSelected([]); setMessage('Actual recipient delivery records created.'); }
  }
  async function copyAndConfirm() {
    if (!prepared.length) return; const text = prepared.map((item) => item.text).join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(text); await request('confirm-delivery'); }
    catch { setMessage('Clipboard access failed. Nothing was marked delivered. Use a secure browser context and try again.'); }
  }
  return <section className="admin-detail-section"><h3>Shared-recipient distribution</h3><p>Preparing a copy does not mark delivery. The server rechecks consent, expiry, suppression, contract and territory before confirmation.</p><div className="admin-choice-grid">{partners.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.trading_name || item.legal_name_en}</label>)}</div><div className="admin-heading-actions"><button type="button" disabled={!selected.length} onClick={() => void request('prepare-delivery')}><Clipboard />Prepare recipient copies</button><button type="button" disabled={!prepared.length} onClick={() => void copyAndConfirm()}><Clipboard />Copy and record actual delivery</button></div>{prepared.map((item) => <details key={item.partnerId}><summary>{item.recipient}</summary><pre>{item.text}</pre></details>)}</section>;
}
