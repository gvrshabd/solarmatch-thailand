'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, BookOpen, Check, ChevronDown, Clipboard, ContactRound, FileClock, Image as ImageIcon, LayoutList, RefreshCcw, Save, Search, Settings2, ShieldCheck, Trash2, Upload } from 'lucide-react';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { LoadingFactSet } from '@/lib/loading-facts/types';
import type { QuestionnaireDocument } from '@/lib/questionnaire/types';
import { calculateLeadAssessment, type ScoringConfiguration } from '@/lib/qualification/scoring';
import { LegalLaunchPanel } from './legal-launch-panel';

type Lead = {
  id: string; created_at: string; legal_first_name: string; legal_last_name: string; phone_display: string | null;
  preferred_contact_method: 'phone' | 'line'; line_id: string | null; province: string; custom_location: string | null;
  ownership_status: string; air_conditioner_count: number; monthly_bill_thb: number; daytime_pattern: string;
  quality_score: number; raw_score: number; hard_eligible: number; status: string; exported_at: string | null;
  selected: boolean; selectionReason: string; explanation: { factors: Array<{ key: string; points: number; maximum: number; explanationEn: string }> };
  selectionCompatible: boolean; contact_collection_mode: 'validation_interest'|'named_installer_handoff'|'shared_solar_company_handoff'; contact_configuration_version_id: string;
  actively_planning_solar: number | null; quote_contact_requested: number | null;
  submission_environment: 'production'|'private_development_preview'|'restricted_site_operational'; is_test_submission: number; distribution_allowed: number; suppressed: number;
};

type ConfigurationPayload = {
  questionnaires: Array<{ id: string; version_number: number; state: string; document: QuestionnaireDocument; created_by: string; created_at: string; published_at: string | null }>;
  rules: Array<{ id: string; version_number: number; state: string; configuration: ScoringConfiguration; created_by: string; created_at: string; published_at: string | null }>;
  contacts: Array<{ id: string; version_number: number; state: string; contact_collection_mode: 'disabled'|'validation_interest'|'named_installer_handoff'|'shared_solar_company_handoff'; contact_collection_enabled: number; restricted_site_collection_enabled: number; public_collection_enabled: number; retention_days: number|null; distribution_window_days: number|null; recipient_category: string|null; adult_confirmation_version_id: string|null; consent_version_id: string|null; privacy_notice_version_id: string|null; terms_version_id: string|null; cookie_policy_version_id: string|null; internal_recipient_cap: number|null; receiving_company_en: string|null; receiving_company_th: string|null; receiving_company_privacy_url: string|null; permittedContactMethods: Array<'phone'|'line'>; sharedFields: string[]; created_by: string; created_at: string; published_at: string|null }>;
  facts: Array<{ id: string; version_number: number; state: string; factSet: LoadingFactSet; created_by: string; created_at: string; published_at: string|null }>;
  release: Record<string, unknown> | null;
  audit: Array<{ id: string; actor_email: string; action: string; entity_type: string; entity_id: string; created_at: string }>;
  restrictedSiteAccess: { configured: boolean };
};

type ContactDraft = {
  mode: 'disabled'|'validation_interest'|'named_installer_handoff'|'shared_solar_company_handoff'; enabled: boolean;
  restrictedSiteCollectionEnabled: boolean; publicCollectionEnabled: boolean; retentionDays: number|null;
  distributionWindowDays: number|null; recipientCategory: string|null; adultConfirmationVersionId: string|null; consentVersionId: string|null;
  privacyNoticeVersionId: string|null; termsVersionId: string|null; cookiePolicyVersionId: string|null; internalRecipientCap: number|null;
  receivingCompanyEn: string|null; receivingCompanyTh: string|null; receivingCompanyPrivacyUrl: string|null;
  permittedContactMethods: Array<'phone'|'line'>; sharedFields: string[];
};

type LeadDetailPayload = {
  lead: Record<string, unknown> & {
    id: string; legal_first_name: string; legal_last_name: string; phone_display: string | null;
    preferred_contact_method: string; line_id?: string | null; quality_score: number; raw_score: number;
    hard_eligible: number; questionnaire_version_id: string; rule_version_id: string; release_id: string;
    contact_collection_mode: 'validation_interest'|'named_installer_handoff'|'shared_solar_company_handoff';
    submission_environment?: 'production'|'private_development_preview'|'restricted_site_operational'; is_test_submission?: number; distribution_allowed?: number;
    answers: Record<string, unknown>; scoringExplanation: { factors?: Array<{ key: string; points: number; maximum: number; explanationEn: string }>; eligibilityReasons?: Array<{ key: string; passed: boolean; explanationEn: string }> };
  };
  scoreHistory: Array<Record<string, unknown>>;
  statusEvents: Array<Record<string, unknown>>;
  notes: Array<{ id: string; note: string; actor_email: string; created_at: string }>;
};

type Tab = 'leads' | 'assessment' | 'scoring' | 'contact' | 'legal-launch' | 'facts' | 'media' | 'history';

const targetProvinceOptions = [
  ['bangkok', 'Bangkok'], ['nonthaburi', 'Nonthaburi'], ['pathum-thani', 'Pathum Thani'],
  ['samut-prakan', 'Samut Prakan'], ['samut-sakhon', 'Samut Sakhon'], ['nakhon-pathom', 'Nakhon Pathom'],
] as const;

const scorePreviewCases: Array<{ name: string; answers: EstimateAnswers }> = [
  {
    name: 'Strong owner lead: 8 AC units, high daytime use',
    answers: {
      province: 'bangkok', monthlyBillThb: 12000, activelyPlanningSolar: true, quoteContactRequested: false, propertyType: 'large-home', ownershipStatus: 'owner',
      roofArea: '100-200', daytimePattern: 'very-high', daytimeLoads: ['air-conditioning', 'pump', 'ev'],
      airConditionerCount: 8, roofMaterial: 'concrete-tile', shade: 'almost-none', installationTimeframe: 'one-three-months',
    },
  },
  {
    name: 'Low-suitability owner: 2 AC units, shade and limited roof',
    answers: {
      province: 'bangkok', monthlyBillThb: 2500, activelyPlanningSolar: false, quoteContactRequested: false, propertyType: 'townhouse', ownershipStatus: 'owner',
      roofArea: 'under-30', daytimePattern: 'low', daytimeLoads: ['air-conditioning'], airConditionerCount: 2,
      roofMaterial: 'unsure', shade: 'a-lot', installationTimeframe: 'researching',
    },
  },
  {
    name: 'Renter with otherwise strong signals',
    answers: {
      province: 'nonthaburi', monthlyBillThb: 12000, activelyPlanningSolar: true, quoteContactRequested: false, propertyType: 'detached-home', ownershipStatus: 'renter',
      roofArea: '100-200', daytimePattern: 'very-high', daytimeLoads: ['air-conditioning', 'pump', 'ev'],
      airConditionerCount: 8, roofMaterial: 'metal-sheet', shade: 'little', installationTimeframe: 'asap',
    },
  },
];

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed (${response.status})`);
  return body as T;
}

function leadClipboard(leads: Lead[], exportScope: 'solar_match_validation_followup'|'named_installer_handoff', recipientKey: string) {
  const lines = ['SolarMatch Thailand — selected residential leads', `Consent scope: ${exportScope === 'solar_match_validation_followup' ? 'SolarMatch validation follow-up only' : `Named installer handoff (${recipientKey})`}`, `Prepared: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}`, ''];
  leads.forEach((lead, index) => {
    lines.push(`${index + 1}. ${lead.legal_first_name} ${lead.legal_last_name}`);
    lines.push(lead.preferred_contact_method === 'phone' ? `Phone: ${lead.phone_display ?? 'Not provided'}` : `LINE ID: ${lead.line_id ?? 'Not provided'}`);
    lines.push(`Preferred contact: ${lead.preferred_contact_method === 'line' ? `LINE${lead.line_id ? ` (${lead.line_id})` : ''}` : 'Phone'}`);
    lines.push(`Location: ${lead.custom_location || lead.province}`);
    lines.push(`Qualification: ${lead.quality_score}/5 · ${lead.ownership_status} · ${lead.air_conditioner_count} AC units · typical bill ฿${lead.monthly_bill_thb.toLocaleString('en-US')}`);
    lines.push(`Sellable under current rules: ${lead.hard_eligible ? 'Yes' : 'No'}`, '');
  });
  return lines.join('\n').trim();
}

export function AdminDashboard({ csrfToken, signedInEmail }: { csrfToken: string; signedInEmail: string }) {
  const [tab, setTab] = useState<Tab>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [configuration, setConfiguration] = useState<ConfigurationPayload | null>(null);
  const [questionnaireDraft, setQuestionnaireDraft] = useState<QuestionnaireDocument | null>(null);
  const [rulesDraft, setRulesDraft] = useState<ScoringConfiguration | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [factDraft, setFactDraft] = useState<LoadingFactSet | null>(null);
  const [media, setMedia] = useState<Array<Record<string, unknown>>>([]);
  const [query, setQuery] = useState('');
  const [score, setScore] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [ownership, setOwnership] = useState('');
  const [location, setLocation] = useState('');
  const [minimumAc, setMinimumAc] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('active');
  const [submissionType, setSubmissionType] = useState('');
  const [sort, setSort] = useState('recent');
  const [exportScope, setExportScope] = useState<'solar_match_validation_followup'|'named_installer_handoff'>('solar_match_validation_followup');
  const [recipientKey, setRecipientKey] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<LeadDetailPayload | null>(null);
  const [note, setNote] = useState('');
  const selected = useMemo(() => leads.filter((lead) => lead.selected), [leads]);
  const scorePreview = useMemo(() => rulesDraft ? scorePreviewCases.map((testCase) => ({
    name: testCase.name,
    result: calculateLeadAssessment(testCase.answers, rulesDraft),
  })) : [], [rulesDraft]);

  const api = useCallback(async (url: string, init?: RequestInit) => readJson(await fetch(url, { cache: 'no-store', ...init, headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'X-CSRF-Token': csrfToken, ...init?.headers } })), [csrfToken]);

  const loadLeads = useCallback(async () => {
    const parameters = new URLSearchParams({ sort, status, exportScope, recipientKey });
    if (query.trim()) parameters.set('query', query.trim());
    if (score) parameters.set('score', score);
    if (eligibility) parameters.set('eligibility', eligibility);
    if (ownership) parameters.set('ownership', ownership);
    if (location) parameters.set('location', location);
    if (minimumAc) parameters.set('minimumAc', minimumAc);
    if (from) parameters.set('from', from);
    if (to) parameters.set('to', to);
    if (submissionType) parameters.set('submissionType', submissionType);
    const response = await api(`/admin/api/leads?${parameters}`) as { leads: Lead[] };
    setLeads(response.leads);
  }, [api, eligibility, exportScope, from, location, minimumAc, ownership, query, recipientKey, score, sort, status, submissionType, to]);

  const loadConfiguration = useCallback(async () => {
    const response = await api('/admin/api/config') as ConfigurationPayload;
    setConfiguration(response);
    setQuestionnaireDraft(structuredClone(response.questionnaires.find((version) => version.state === 'draft')?.document ?? response.questionnaires.find((version) => version.state === 'published')?.document ?? null));
    setRulesDraft(structuredClone(response.rules.find((version) => version.state === 'draft')?.configuration ?? response.rules.find((version) => version.state === 'published')?.configuration ?? null));
    const contact = response.contacts.find((version) => version.state === 'draft') ?? response.contacts.find((version) => version.state === 'published');
    setContactDraft(contact ? { mode: contact.contact_collection_mode, enabled: Boolean(contact.contact_collection_enabled), restrictedSiteCollectionEnabled: Boolean(contact.restricted_site_collection_enabled), publicCollectionEnabled: Boolean(contact.public_collection_enabled), retentionDays: contact.retention_days, distributionWindowDays: contact.distribution_window_days, recipientCategory: contact.recipient_category, adultConfirmationVersionId: contact.adult_confirmation_version_id, consentVersionId: contact.consent_version_id, privacyNoticeVersionId: contact.privacy_notice_version_id, termsVersionId: contact.terms_version_id, cookiePolicyVersionId: contact.cookie_policy_version_id, internalRecipientCap: contact.internal_recipient_cap, receivingCompanyEn: contact.receiving_company_en, receivingCompanyTh: contact.receiving_company_th, receivingCompanyPrivacyUrl: contact.receiving_company_privacy_url, permittedContactMethods: [...contact.permittedContactMethods], sharedFields: [...contact.sharedFields] } : null);
    setFactDraft(structuredClone(response.facts.find((version) => version.state === 'draft')?.factSet ?? response.facts.find((version) => version.state === 'published')?.factSet ?? null));
  }, [api]);

  const loadMedia = useCallback(async () => {
    const response = await api('/admin/api/media') as { media: Array<Record<string, unknown>> };
    setMedia(response.media);
  }, [api]);

  useEffect(() => {
    queueMicrotask(() => { void Promise.all([loadLeads(), loadConfiguration(), loadMedia()]).catch((error: Error) => setMessage(error.message)); });
  }, [loadConfiguration, loadLeads, loadMedia]);

  async function mutateLeads(body: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('');
    try { await api('/admin/api/leads', { method: 'POST', body: JSON.stringify(body) }); await loadLeads(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed'); }
    finally { setBusy(false); }
  }

  async function changeSelection(lead: Lead, selectedValue: boolean) {
    await mutateLeads({ action: 'set-selection', leadId: lead.id, selection: selectedValue ? 'selected' : 'deselected', exportScope, recipientKey }, selectedValue ? 'Lead selected for this consent scope.' : 'Lead deselected for this consent scope.');
  }

  async function copySelected() {
    if (!selected.length) { setMessage('Select at least one lead before copying.'); return; }
    const text = leadClipboard(selected, exportScope, recipientKey);
    try { await navigator.clipboard.writeText(text); setMessage(`${selected.length} lead${selected.length === 1 ? '' : 's'} copied. Use “Mark copied/exported” when you have pasted them successfully.`); }
    catch {
      const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select();
      const copied = document.execCommand('copy'); textarea.remove(); setMessage(copied ? `${selected.length} leads copied.` : 'Clipboard access failed. Please try from a secure browser context.');
    }
  }

  async function saveQuestionnaireDraft() {
    if (!questionnaireDraft) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'save-questionnaire-draft', document: questionnaireDraft }) }); await loadConfiguration(); setMessage('Assessment draft saved. Public visitors still receive the published version.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Draft could not be saved.'); }
    finally { setBusy(false); }
  }

  async function saveRulesDraft() {
    if (!rulesDraft) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'save-rules-draft', configuration: rulesDraft }) }); await loadConfiguration(); setMessage('Scoring draft saved. Historic lead scores were not changed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Draft could not be saved.'); }
    finally { setBusy(false); }
  }

  async function saveContactDraft() {
    if (!contactDraft) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'save-contact-draft', configuration: contactDraft }) }); await loadConfiguration(); setMessage('Contact configuration saved as a draft. Production remains unchanged until publishing.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Contact draft could not be saved.'); }
    finally { setBusy(false); }
  }

  async function saveFactsDraft() {
    if (!factDraft) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'save-facts-draft', factSet: factDraft }) }); await loadConfiguration(); setMessage('Solar facts saved as a draft. Public facts remain unchanged until publishing.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Fact draft could not be saved.'); }
    finally { setBusy(false); }
  }

  async function publish(kind: 'questionnaire' | 'rules' | 'contact' | 'facts') {
    const versions = kind === 'questionnaire' ? configuration?.questionnaires : kind === 'rules' ? configuration?.rules : kind === 'contact' ? configuration?.contacts : configuration?.facts;
    const version = versions?.find((item) => item.state === 'draft');
    if (!version || !confirm(`Publish ${version.id}? New submissions will use this version; historic records keep their original version.`)) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'publish', kind, versionId: version.id }) }); await loadConfiguration(); setMessage(`${kind === 'questionnaire' ? 'Assessment' : kind === 'rules' ? 'Scoring rules' : kind === 'contact' ? 'Contact configuration' : 'Solar facts'} published.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Publish failed.'); }
    finally { setBusy(false); }
  }

  async function restoreVersion(kind: 'questionnaire' | 'rules' | 'contact' | 'facts', versionId: string) {
    if (!confirm(`Create a new draft from ${versionId}? The public release will not change until you publish that draft.`)) return;
    setBusy(true);
    try { await api('/admin/api/config', { method: 'POST', body: JSON.stringify({ action: 'restore', kind, versionId }) }); await loadConfiguration(); setTab(kind === 'questionnaire' ? 'assessment' : kind === 'rules' ? 'scoring' : kind); setMessage(`${versionId} restored as a new draft.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Version could not be restored.'); }
    finally { setBusy(false); }
  }

  async function openLead(id: string) {
    try { setDetail(await api(`/admin/api/leads/${id}`) as LeadDetailPayload); } catch (error) { setMessage(error instanceof Error ? error.message : 'Lead could not be opened.'); }
  }

  async function addLeadNote() {
    if (!detail || !note.trim()) return;
    try {
      await api(`/admin/api/leads/${detail.lead.id}`, { method: 'POST', body: JSON.stringify({ action: 'add-note', note: note.trim() }) });
      setNote('');
      await openLead(detail.lead.id);
      setMessage('Internal note added.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Note could not be added.'); }
  }

  return <main className="admin-dashboard">
    <header className="admin-topbar"><div><p>SolarMatch Thailand</p><h1>Administration</h1></div><div className="admin-identity"><ShieldCheck /><span>Protected by Cloudflare Access</span><small>{signedInEmail}</small></div></header>
    {!csrfToken && <div className="admin-alert error" role="alert">State-changing controls are disabled because CSRF protection is unavailable.</div>}
    {configuration?.restrictedSiteAccess.configured && <div className="admin-alert private-preview-admin" role="status"><strong>Access-restricted collection is configured.</strong> Approved Access users can create ordinary operational submissions. Public collection remains controlled by its own launch switch.</div>}
    {message && <div className="admin-alert" role="status">{message}<button type="button" onClick={() => setMessage('')}>Dismiss</button></div>}
    <nav className="admin-tabs" aria-label="Administration sections">
      {([['leads', LayoutList, 'Leads'], ['assessment', Settings2, 'Assessment'], ['scoring', ShieldCheck, 'Scoring'], ['contact', ContactRound, 'Contact and consent'], ['legal-launch', ShieldCheck, 'Legal launch'], ['facts', BookOpen, 'Solar facts'], ['media', ImageIcon, 'Media'], ['history', FileClock, 'History']] as const).map(([value, Icon, label]) => <button type="button" key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon />{label}</button>)}
    </nav>

    {tab === 'leads' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Residential contact submissions</h2><p>Stored submissions are distinct from sellable leads. The quality score is never shown to public users.</p></div><button className="admin-button secondary" type="button" onClick={() => void loadLeads()}><RefreshCcw />Refresh</button></div>
      <div className="admin-filters"><label><span>Search name, phone or LINE ID</span><div><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadLeads(); }} /></div></label><label><span>Score</span><select value={score} onChange={(event) => setScore(event.target.value)}><option value="">All</option>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{value}/5</option>)}</select></label><label><span>Sellability</span><select value={eligibility} onChange={(event) => setEligibility(event.target.value)}><option value="">All</option><option value="sellable">Sellable</option><option value="non-sellable">Non-sellable</option></select></label><label><span>Ownership</span><select value={ownership} onChange={(event) => setOwnership(event.target.value)}><option value="">All</option><option value="owner">Owner</option><option value="renter">Renter</option><option value="other">Other</option></select></label><label><span>Province</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All</option><option value="bangkok">Bangkok</option><option value="nonthaburi">Nonthaburi</option><option value="pathum-thani">Pathum Thani</option><option value="samut-prakan">Samut Prakan</option><option value="samut-sakhon">Samut Sakhon</option><option value="nakhon-pathom">Nakhon Pathom</option><option value="other">Other</option></select></label><label><span>Minimum AC units</span><input type="number" min="0" max="100" value={minimumAc} onChange={(event) => setMinimumAc(event.target.value)} /></label><label><span>From date</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>To date</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label><span>Submission type</span><select value={submissionType} onChange={(event) => setSubmissionType(event.target.value)}><option value="">All</option><option value="production">Operational</option><option value="test">Historical test</option></select></label><label><span>Records</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="exported">Exported</option><option value="archived">Archived</option><option value="deleted">Deleted</option></select></label><label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Newest</option><option value="score">Highest score</option></select></label><button className="admin-button" type="button" onClick={() => void loadLeads()}>Apply</button></div>
      <div className="admin-export-scope"><label>Operational use<select value={exportScope} onChange={(event) => setExportScope(event.target.value as typeof exportScope)}><option value="solar_match_validation_followup">SolarMatch validation follow-up</option><option value="named_installer_handoff">Named installer handoff</option></select></label>{exportScope === 'named_installer_handoff' && <label>Recipient configuration<select value={recipientKey} onChange={(event) => setRecipientKey(event.target.value)}><option value="">Select the consented recipient</option>{configuration?.contacts.filter((version) => version.contact_collection_mode === 'named_installer_handoff').map((version) => <option key={version.id} value={version.id}>{version.id} · {version.receiving_company_en || 'Unnamed draft'}</option>)}</select></label>}<button className="admin-button secondary" type="button" onClick={() => void loadLeads()}>Apply consent scope</button></div>
      <div className="admin-bulkbar"><strong>{selected.length} selected</strong>{status !== 'deleted' && <><button type="button" onClick={() => void copySelected()} disabled={!selected.length}><Clipboard />Copy relevant leads info</button><button type="button" disabled={!selected.length || busy} onClick={() => void mutateLeads({ action: 'mark-exported', leadIds: selected.map((lead) => lead.id), exportScope, recipientKey }, 'Selected consent-compatible leads marked copied/exported.')}><Check />Mark copied/exported</button><button type="button" disabled={!selected.length || busy} onClick={() => void mutateLeads({ action: status === 'archived' ? 'restore' : 'archive', leadIds: selected.map((lead) => lead.id) }, status === 'archived' ? 'Leads restored.' : 'Leads archived.')}><Archive />{status === 'archived' ? 'Restore' : 'Archive'}</button><button type="button" className="danger" disabled={!selected.length || busy} onClick={() => { if (confirm('Soft-delete the selected records? They can still be permanently purged later.')) void mutateLeads({ action: 'soft-delete', leadIds: selected.map((lead) => lead.id) }, 'Selected leads moved to deleted state.'); }}><Trash2 />Delete</button></>}{status === 'deleted' && <button type="button" className="danger" disabled={!selected.length || busy} onClick={() => { const confirmation = prompt('Permanent deletion cannot be undone. Type PERMANENTLY DELETE to purge the selected personal data.'); if (confirmation === 'PERMANENTLY DELETE') void mutateLeads({ action: 'purge', leadIds: selected.map((lead) => lead.id), confirmation }, 'Selected personal data permanently purged.'); }}><Trash2 />Permanently purge</button>}</div>
      <div className="admin-table-wrap"><table className="admin-lead-table"><thead><tr><th>Submitted</th><th>Contact</th><th>Location</th><th>Qualification</th><th>Status</th><th>Selection reason</th><th>Actions</th><th className="selection-column">Select</th></tr></thead><tbody>{leads.length ? leads.map((lead) => <tr key={lead.id} className={lead.is_test_submission ? 'admin-test-lead-row' : undefined}><td><time dateTime={lead.created_at}>{new Date(lead.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}</time></td><td><button type="button" className="admin-lead-link" onClick={() => void openLead(lead.id)}>{lead.legal_first_name} {lead.legal_last_name}</button>{Boolean(lead.is_test_submission) && <span className="admin-test-badge">Historical test</span>}<small>{lead.preferred_contact_method === 'line' ? `LINE · ${lead.line_id ?? 'Not provided'}` : `${lead.phone_display ?? 'Not provided'} · PHONE`}</small></td><td>{lead.custom_location || lead.province}</td><td><span className={`admin-score score-${lead.quality_score}`}>{lead.quality_score}/5</span><small>{lead.hard_eligible ? 'Sellable' : 'Non-sellable'} · {lead.air_conditioner_count} AC · {lead.actively_planning_solar ? 'actively planning' : 'not actively planning'}</small></td><td>{lead.status}{lead.exported_at && <small>Copied {new Date(lead.exported_at).toLocaleDateString('en-GB')}</small>}</td><td><small>{lead.selectionReason}</small></td><td><button type="button" className="admin-row-action" onClick={() => void openLead(lead.id)}>View</button>{status !== 'deleted' && <button type="button" className="admin-row-action danger" onClick={() => { if (confirm(`Soft-delete ${lead.legal_first_name} ${lead.legal_last_name}?`)) void mutateLeads({ action: 'soft-delete', leadIds: [lead.id] }, 'Lead moved to deleted state.'); }}>Delete</button>}</td><td className="selection-column"><input aria-label={`Select ${lead.legal_first_name} ${lead.legal_last_name}`} title={lead.selectionReason} type="checkbox" checked={lead.selected} disabled={!lead.selectionCompatible} onChange={(event) => void changeSelection(lead, event.target.checked)} /></td></tr>) : <tr><td colSpan={8} className="empty-admin-table">No submissions match these filters.</td></tr>}</tbody></table></div>
    </section>}

    {tab === 'assessment' && questionnaireDraft && <section className="admin-section">
      <div className="admin-section-heading"><div><h2>Assessment configuration</h2><p>Edit bilingual wording and order in a draft. The public flow changes only after explicit publishing.</p></div><div className="admin-heading-actions"><button className="admin-button secondary" type="button" onClick={() => window.open(`/admin/preview?questionnaireVersion=${encodeURIComponent(configuration?.questionnaires.find((item) => item.state === 'draft')?.id ?? configuration?.questionnaires.find((item) => item.state === 'published')?.id ?? '')}`, '_blank', 'noopener')}>Preview</button><button className="admin-button secondary" type="button" disabled={busy || !csrfToken} onClick={() => void saveQuestionnaireDraft()}><Save />Save new draft</button><button className="admin-button" type="button" disabled={busy || !configuration?.questionnaires.some((item) => item.state === 'draft')} onClick={() => void publish('questionnaire')}>Publish draft</button></div></div>
      <p className="admin-guardrail-note">Question IDs, input types, required status, and option values are fixed semantic contracts because calculations, validation, and historic lead records depend on them. Wording, help text, question order, option order, and conditional-field copy are safely editable here.</p>
      <div className="admin-editor-list">{questionnaireDraft.questions.map((question, questionIndex) => <details open={questionIndex === 0} key={question.id} className="admin-editor-card">
        <summary><span>{questionIndex + 1}. {question.title.en}</span><code>{question.id} · {question.type}</code><ChevronDown /></summary>
        <div className="admin-editor-fields">
          <label>English question<input value={question.title.en} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].title.en = event.target.value; return next; })} /></label>
          <label>Thai question<input lang="th" value={question.title.th} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].title.th = event.target.value; return next; })} /></label>
          <label>English help<textarea value={question.help.en} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].help.en = event.target.value; return next; })} /></label>
          <label>Thai help<textarea lang="th" value={question.help.th} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].help.th = event.target.value; return next; })} /></label>
          <label className="admin-checkbox"><input type="checkbox" checked={question.required} disabled />Required core answer</label>
          <div className="admin-question-flags" aria-label="Question relevance"><span>Calculation: {question.relevance.calculation ? 'yes' : 'no'}</span><span>Qualification: {question.relevance.qualification ? 'yes' : 'no'}</span><span>Scoring: {question.relevance.scoring ? 'yes' : 'no'}</span></div>
          <div className="admin-order-buttons"><button type="button" disabled={questionIndex === 0} onClick={() => setQuestionnaireDraft((current) => { const next = structuredClone(current!); [next.questions[questionIndex - 1], next.questions[questionIndex]] = [next.questions[questionIndex], next.questions[questionIndex - 1]]; return next; })}>Move up</button><button type="button" disabled={questionIndex === questionnaireDraft.questions.length - 1} onClick={() => setQuestionnaireDraft((current) => { const next = structuredClone(current!); [next.questions[questionIndex + 1], next.questions[questionIndex]] = [next.questions[questionIndex], next.questions[questionIndex + 1]]; return next; })}>Move down</button></div>
        </div>
        {question.conditionalFields?.map((field, fieldIndex) => <div className="admin-conditional-editor" key={field.id}><h3>Conditional field · <code>{field.id}</code></h3><p>Shown when <code>{field.whenOption}</code> is selected.</p><div><label>English label<input value={field.label.en} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].conditionalFields![fieldIndex].label.en = event.target.value; return next; })} /></label><label>Thai label<input lang="th" value={field.label.th} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].conditionalFields![fieldIndex].label.th = event.target.value; return next; })} /></label>{field.placeholder && <><label>English placeholder<input value={field.placeholder.en} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].conditionalFields![fieldIndex].placeholder!.en = event.target.value; return next; })} /></label><label>Thai placeholder<input lang="th" value={field.placeholder.th} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].conditionalFields![fieldIndex].placeholder!.th = event.target.value; return next; })} /></label></>}</div></div>)}
        {question.options && <div className="admin-option-editor"><h3>Answer options</h3>{question.options.map((option, optionIndex) => <div key={option.value}><code>{option.value}</code><input aria-label={`${option.value} English`} value={option.label.en} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].options![optionIndex].label.en = event.target.value; return next; })} /><input lang="th" aria-label={`${option.value} Thai`} value={option.label.th} onChange={(event) => setQuestionnaireDraft((current) => { const next = structuredClone(current!); next.questions[questionIndex].options![optionIndex].label.th = event.target.value; return next; })} /><span className="admin-option-order"><button type="button" aria-label={`Move ${option.value} up`} disabled={optionIndex === 0} onClick={() => setQuestionnaireDraft((current) => { const next = structuredClone(current!); [next.questions[questionIndex].options![optionIndex - 1], next.questions[questionIndex].options![optionIndex]] = [next.questions[questionIndex].options![optionIndex], next.questions[questionIndex].options![optionIndex - 1]]; return next; })}>↑</button><button type="button" aria-label={`Move ${option.value} down`} disabled={optionIndex === question.options!.length - 1} onClick={() => setQuestionnaireDraft((current) => { const next = structuredClone(current!); [next.questions[questionIndex].options![optionIndex + 1], next.questions[questionIndex].options![optionIndex]] = [next.questions[questionIndex].options![optionIndex], next.questions[questionIndex].options![optionIndex + 1]]; return next; })}>↓</button></span></div>)}</div>}
      </details>)}</div>
    </section>}

    {tab === 'scoring' && rulesDraft && <section className="admin-section">
      <div className="admin-section-heading"><div><h2>Qualification and quality scoring</h2><p>Hard eligibility and the 1–5 quality score remain separate. New rules affect new leads only.</p></div><div className="admin-heading-actions"><button className="admin-button secondary" disabled={busy || !csrfToken} type="button" onClick={() => void saveRulesDraft()}><Save />Save new draft</button><button className="admin-button" type="button" disabled={busy || !configuration?.rules.some((item) => item.state === 'draft')} onClick={() => void publish('rules')}>Publish draft</button></div></div>
      <div className="admin-rule-grid">
        <label>Require owner<select value={rulesDraft.ownerRequired ? 'yes' : 'no'} onChange={(event) => setRulesDraft({ ...rulesDraft, ownerRequired: event.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Minimum installed AC units<input type="number" min="0" max="100" value={rulesDraft.minimumAirConditioners} onChange={(event) => setRulesDraft({ ...rulesDraft, minimumAirConditioners: Number(event.target.value) })} /></label>
        <label>High-quality threshold<select value={rulesDraft.highQualityThreshold} onChange={(event) => setRulesDraft({ ...rulesDraft, highQualityThreshold: Number(event.target.value) as 1|2|3|4|5 })}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label>
        <label>Automatic selection threshold<select value={rulesDraft.automaticSelectionThreshold} onChange={(event) => setRulesDraft({ ...rulesDraft, automaticSelectionThreshold: Number(event.target.value) as 1|2|3|4|5 })}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label>
      </div>
      <h3>Factor weights <small>must total exactly 100</small></h3>
      <div className="admin-weight-grid">{Object.entries(rulesDraft.weights).map(([key, value]) => <label key={key}><span>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span><input type="number" min="0" max="100" value={value} onChange={(event) => setRulesDraft({ ...rulesDraft, weights: { ...rulesDraft.weights, [key]: Number(event.target.value) } })} /></label>)}</div>
      <p className={`admin-weight-total ${Object.values(rulesDraft.weights).reduce((sum, value) => sum + value, 0) === 100 ? 'valid' : 'invalid'}`}>Current total: {Object.values(rulesDraft.weights).reduce((sum, value) => sum + value, 0)} / 100</p>
      <h3>Monthly-bill thresholds</h3>
      <div className="admin-weight-grid">{rulesDraft.billThresholdsThb.map((value, index) => <label key={index}><span>Threshold {index + 1}</span><input type="number" min="1" value={value} onChange={(event) => { const values = [...rulesDraft.billThresholdsThb] as ScoringConfiguration['billThresholdsThb']; values[index] = Number(event.target.value); setRulesDraft({ ...rulesDraft, billThresholdsThb: values }); }} /></label>)}</div>
      <fieldset className="admin-checkbox-grid"><legend>Target locations</legend>{targetProvinceOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={rulesDraft.targetProvinces.includes(value)} onChange={(event) => setRulesDraft({ ...rulesDraft, targetProvinces: event.target.checked ? [...rulesDraft.targetProvinces, value] : rulesDraft.targetProvinces.filter((province) => province !== value) })} />{label}</label>)}</fieldset>
      <h3>Quality bands <small>must cover every point from 0 through 100 exactly once</small></h3>
      <div className="admin-band-grid">{rulesDraft.bands.map((band, index) => <fieldset key={band.score}><legend>{band.score}/5</legend><label>Minimum<input type="number" min="0" max="100" value={band.min} onChange={(event) => { const bands = structuredClone(rulesDraft.bands); bands[index].min = Number(event.target.value); setRulesDraft({ ...rulesDraft, bands }); }} /></label><label>Maximum<input type="number" min="0" max="100" value={band.max} onChange={(event) => { const bands = structuredClone(rulesDraft.bands); bands[index].max = Number(event.target.value); setRulesDraft({ ...rulesDraft, bands }); }} /></label></fieldset>)}</div>
      <div className="admin-score-preview"><h3>Preview test cases</h3><p>These examples recalculate immediately and are never written to the lead database.</p><div>{scorePreview.map(({ name, result }) => <article key={name}><strong>{name}</strong><span>{result.qualityScore}/5 · {result.rawPoints}/100</span><small>{result.hardEligible ? 'Sellable under this draft' : 'Not sellable under this draft'}</small></article>)}</div></div>
    </section>}

    {tab === 'contact' && contactDraft && <section className="admin-section">
      <div className="admin-section-heading"><div><h2>Contact and consent</h2><p>Choose what the optional contact step promises and who may use a submitted record. Public collection remains fail-closed until every legal requirement is complete.</p></div><div className="admin-heading-actions"><button className="admin-button secondary" type="button" disabled={busy || !csrfToken} onClick={() => void saveContactDraft()}><Save />Save new draft</button><button className="admin-button" type="button" disabled={busy || !configuration?.contacts.some((item) => item.state === 'draft')} onClick={() => void publish('contact')}>Run readiness check and publish</button></div></div>
      <p className="admin-guardrail-note">Production must stay disabled while any of these are unresolved: legal operator name in English and Thai, operator address, public privacy contact, and retention period. Named-installer mode additionally requires the installer’s legal bilingual name, Privacy Notice URL, permitted methods, and exact shared fields.</p>
      <div className="admin-rule-grid admin-contact-grid">
        <label>Contact mode<select value={contactDraft.mode} onChange={(event) => { const mode = event.target.value as ContactDraft['mode']; setContactDraft({ ...contactDraft, mode, enabled: mode === 'disabled' ? false : contactDraft.enabled, recipientCategory: mode === 'shared_solar_company_handoff' ? 'participating_residential_solar_companies' : null, receivingCompanyEn: mode === 'named_installer_handoff' ? contactDraft.receivingCompanyEn : null, receivingCompanyTh: mode === 'named_installer_handoff' ? contactDraft.receivingCompanyTh : null, receivingCompanyPrivacyUrl: mode === 'named_installer_handoff' ? contactDraft.receivingCompanyPrivacyUrl : null }); }}><option value="disabled">Disabled</option><option value="validation_interest">Validation interest — SolarMatch follow-up only</option><option value="named_installer_handoff">Legacy named installer handoff</option><option value="shared_solar_company_handoff">Shared participating solar-company handoff</option></select></label>
        <label>Retention days<input type="number" min="1" max="3650" value={contactDraft.retentionDays ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, retentionDays: event.target.value ? Number(event.target.value) : null })} /></label>
        <label className="admin-checkbox"><input type="checkbox" checked={contactDraft.enabled} disabled={contactDraft.mode === 'disabled'} onChange={(event) => setContactDraft({ ...contactDraft, enabled: event.target.checked, restrictedSiteCollectionEnabled: event.target.checked ? contactDraft.restrictedSiteCollectionEnabled : false, publicCollectionEnabled: event.target.checked ? contactDraft.publicCollectionEnabled : false })} />Enable this contact configuration</label>
        <label className="admin-checkbox"><input type="checkbox" checked={contactDraft.restrictedSiteCollectionEnabled} disabled={!contactDraft.enabled || !configuration?.restrictedSiteAccess.configured} onChange={(event) => setContactDraft({ ...contactDraft, restrictedSiteCollectionEnabled: event.target.checked })} />Allow collection while the whole site is Access-protected</label>
        <label className="admin-checkbox"><input type="checkbox" checked={contactDraft.publicCollectionEnabled} disabled={!contactDraft.enabled} onChange={(event) => setContactDraft({ ...contactDraft, publicCollectionEnabled: event.target.checked })} />Allow public collection after legal readiness passes</label>
      </div>
      <fieldset className="admin-checkbox-grid"><legend>Permitted contact methods</legend>{(['phone','line'] as const).map((method) => <label key={method}><input type="checkbox" checked={contactDraft.permittedContactMethods.includes(method)} onChange={(event) => setContactDraft({ ...contactDraft, permittedContactMethods: event.target.checked ? [...contactDraft.permittedContactMethods, method] : contactDraft.permittedContactMethods.filter((item) => item !== method) })} />{method === 'phone' ? 'Phone' : 'LINE'}</label>)}</fieldset>
      {contactDraft.mode === 'named_installer_handoff' && <div className="admin-editor-fields admin-contact-recipient"><label>Installer legal name — English<input value={contactDraft.receivingCompanyEn ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, receivingCompanyEn: event.target.value || null })} /></label><label>Installer legal name — Thai<input lang="th" value={contactDraft.receivingCompanyTh ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, receivingCompanyTh: event.target.value || null })} /></label><label className="admin-field-wide">Installer Privacy Notice URL<input type="url" placeholder="https://" value={contactDraft.receivingCompanyPrivacyUrl ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, receivingCompanyPrivacyUrl: event.target.value || null })} /></label></div>}
      {contactDraft.mode === 'shared_solar_company_handoff' && <div className="admin-editor-fields admin-contact-recipient"><label>Distribution window days<input type="number" min="1" max="365" value={contactDraft.distributionWindowDays ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, distributionWindowDays: event.target.value ? Number(event.target.value) : null })} /></label><label>Recipient category<input value="Participating residential solar companies" readOnly aria-readonly="true" /></label><label>Internal recipient cap<input type="number" min="1" max="20" value={contactDraft.internalRecipientCap ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, internalRecipientCap: event.target.value ? Number(event.target.value) : null })} /></label><label>Adult-confirmation version<input value={contactDraft.adultConfirmationVersionId ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, adultConfirmationVersionId: event.target.value || null })} /></label><label>Consent version<input value={contactDraft.consentVersionId ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, consentVersionId: event.target.value || null })} /></label><label>Privacy version<input value={contactDraft.privacyNoticeVersionId ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, privacyNoticeVersionId: event.target.value || null })} /></label><label>Terms version<input value={contactDraft.termsVersionId ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, termsVersionId: event.target.value || null })} /></label><label>Cookie version<input value={contactDraft.cookiePolicyVersionId ?? ''} onChange={(event) => setContactDraft({ ...contactDraft, cookiePolicyVersionId: event.target.value || null })} /></label></div>}
      <fieldset className="admin-checkbox-grid"><legend>Fields authorized for this contact purpose</legend>{['legalFirstName','legalLastName','phone','preferredContactMethod','lineId','assessmentAnswers'].map((field) => <label key={field}><input type="checkbox" checked={contactDraft.sharedFields.includes(field)} onChange={(event) => setContactDraft({ ...contactDraft, sharedFields: event.target.checked ? [...contactDraft.sharedFields, field] : contactDraft.sharedFields.filter((item) => item !== field) })} />{field}</label>)}</fieldset>
      <div className="admin-score-preview"><h3>Public-copy preview</h3><p>{contactDraft.mode === 'disabled' ? 'No contact question or personal-information fields will appear.' : contactDraft.mode === 'validation_interest' ? 'SolarMatch asks permission for its own follow-up and explicitly states that data will not be shared with a solar company without separate permission.' : contactDraft.mode === 'shared_solar_company_handoff' ? 'The question discloses that more than one participating residential solar company may receive the enquiry and that SolarMatch may be paid.' : `The legacy question names ${contactDraft.receivingCompanyEn || '[installer legal name]'} and links to the recipient’s Privacy Notice before consent.`}</p><div><article><strong>Activation status requested</strong><span>{contactDraft.enabled ? 'Enabled after readiness passes' : 'Disabled'}</span><small>Publishing an incomplete active configuration is rejected server-side.</small></article></div></div>
    </section>}

    {tab === 'legal-launch' && <LegalLaunchPanel csrfToken={csrfToken} setMessage={setMessage} />}

    {tab === 'facts' && factDraft && <section className="admin-section">
      <div className="admin-section-heading"><div><h2>Solar facts</h2><p>Edit the bilingual fact, paired sketch, citation, Resources anchor, and research context as one versioned record.</p></div><div className="admin-heading-actions"><button className="admin-button secondary" type="button" onClick={() => window.open('/en/resources', '_blank', 'noopener')}>Preview published Resources</button><button className="admin-button secondary" type="button" disabled={busy || !csrfToken} onClick={() => void saveFactsDraft()}><Save />Save new draft</button><button className="admin-button" type="button" disabled={busy || !configuration?.facts.some((item) => item.state === 'draft')} onClick={() => void publish('facts')}>Publish fact set</button></div></div>
      <p className="admin-guardrail-note">Publishing creates an immutable fact-set version and a new public release. Stable IDs and Resources anchors must be unique. References support the subject; they do not supply the SolarMatch illustration or endorse SolarMatch.</p>
      <div className="admin-editor-list">{factDraft.facts.map((fact, factIndex) => <details open={factIndex === 0} key={fact.id} className="admin-editor-card"><summary><span>{factIndex + 1}. {fact.title.en}</span><code>{fact.id} · #{fact.resourcesAnchor}</code><ChevronDown /></summary><div className="admin-editor-fields">
        <label>English title<input value={fact.title.en} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].title.en = event.target.value; return next; })} /></label><label>Thai title<input lang="th" value={fact.title.th} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].title.th = event.target.value; return next; })} /></label>
        <label>English fact<textarea value={fact.copy.en} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].copy.en = event.target.value; return next; })} /></label><label>Thai fact<textarea lang="th" value={fact.copy.th} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].copy.th = event.target.value; return next; })} /></label>
        <label>English image alternative text<textarea value={fact.alt.en} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].alt.en = event.target.value; return next; })} /></label><label>Thai image alternative text<textarea lang="th" value={fact.alt.th} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].alt.th = event.target.value; return next; })} /></label>
        <label>Sketch source<select value={fact.sketchSource} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); const source = event.target.value as 'built-in'|'media'; next.facts[factIndex].sketchSource = source; next.facts[factIndex].sketchId = source === 'built-in' ? fact.id : null; next.facts[factIndex].mediaId = null; return next; })}><option value="built-in">Original built-in SVG</option><option value="media">Published private-R2 raster</option></select></label>
        {fact.sketchSource === 'built-in' ? <label>Built-in sketch ID<input value={fact.sketchId ?? ''} readOnly /></label> : <label>Published media ID<input value={fact.mediaId ?? ''} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].mediaId = event.target.value || null; return next; })} /></label>}
        <label>Short citation<input value={fact.reference.citation} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reference.citation = event.target.value; return next; })} /></label><label>Resources anchor<input value={fact.resourcesAnchor} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].resourcesAnchor = event.target.value; return next; })} /></label>
        <label className="admin-field-wide">Full reference<textarea value={fact.reference.fullReference} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reference.fullReference = event.target.value; return next; })} /></label><label className="admin-field-wide">DOI or official HTTPS URL<input type="url" value={fact.reference.url} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reference.url = event.target.value; return next; })} /></label>
        <label>English research context<textarea value={fact.reference.context.en} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reference.context.en = event.target.value; return next; })} /></label><label>Thai research context<textarea lang="th" value={fact.reference.context.th} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reference.context.th = event.target.value; return next; })} /></label>
        <label>Review date<input type="date" value={fact.reviewedOn} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].reviewedOn = event.target.value; return next; })} /></label><label>Selection weight<input type="number" min="1" max="20" value={fact.weight} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].weight = Number(event.target.value); return next; })} /></label><label className="admin-checkbox"><input type="checkbox" checked={fact.enabled} onChange={(event) => setFactDraft((current) => { const next = structuredClone(current!); next.facts[factIndex].enabled = event.target.checked; return next; })} />Active in the published shuffle bag</label>
      </div></details>)}</div>
    </section>}

    {tab === 'media' && <MediaPanel media={media} csrfToken={csrfToken} onChanged={loadMedia} setMessage={setMessage} />}
    {tab === 'history' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Versions and audit history</h2><p>Published releases are immutable references for historic submissions. Restoring creates a new draft; it never rewrites an old version.</p></div></div><div className="admin-history-grid"><article><h3>Questionnaire versions</h3>{configuration?.questionnaires.map((version) => <div key={version.id}><strong>{version.id}</strong><span>{version.state}</span><small>{new Date(version.created_at).toLocaleString('en-GB')}</small><button type="button" disabled={busy} onClick={() => void restoreVersion('questionnaire', version.id)}>Restore as draft</button></div>)}</article><article><h3>Scoring versions</h3>{configuration?.rules.map((version) => <div key={version.id}><strong>{version.id}</strong><span>{version.state}</span><small>{new Date(version.created_at).toLocaleString('en-GB')}</small><button type="button" disabled={busy} onClick={() => void restoreVersion('rules', version.id)}>Restore as draft</button></div>)}</article><article><h3>Contact versions</h3>{configuration?.contacts.map((version) => <div key={version.id}><strong>{version.id}</strong><span>{version.state} · {version.contact_collection_mode}</span><small>{new Date(version.created_at).toLocaleString('en-GB')}</small><button type="button" disabled={busy} onClick={() => void restoreVersion('contact', version.id)}>Restore as draft</button></div>)}</article><article><h3>Solar-fact versions</h3>{configuration?.facts.map((version) => <div key={version.id}><strong>{version.id}</strong><span>{version.state}</span><small>{new Date(version.created_at).toLocaleString('en-GB')}</small><button type="button" disabled={busy} onClick={() => void restoreVersion('facts', version.id)}>Restore as draft</button></div>)}</article><article><h3>Recent audit events</h3>{configuration?.audit.map((event) => <div key={event.id}><strong>{event.action}</strong><span>{event.entity_type}</span><small>{new Date(event.created_at).toLocaleString('en-GB')} · {event.actor_email}</small></div>)}</article></div></section>}

    {detail && <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setDetail(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" onMouseDown={(event) => event.stopPropagation()}><div className="admin-modal-heading"><div><p>Residential contact submission</p><h2 id="lead-detail-title">{detail.lead.legal_first_name} {detail.lead.legal_last_name}</h2></div><button type="button" onClick={() => setDetail(null)}>Close</button></div><div className="admin-detail-summary"><article><span>Contact</span><strong>{detail.lead.preferred_contact_method === 'line' ? detail.lead.line_id ?? 'Not provided' : detail.lead.phone_display ?? 'Not provided'}</strong><small>{detail.lead.preferred_contact_method.toUpperCase()}</small></article><article><span>Quality</span><strong>{detail.lead.quality_score}/5</strong><small>{detail.lead.raw_score}/100 points</small></article><article><span>Sellability</span><strong>{detail.lead.hard_eligible ? 'Sellable' : 'Non-sellable'}</strong><small>Scoring never changes this hard gate</small></article></div><section className="admin-detail-section"><h3>Why this result was assigned</h3>{detail.lead.scoringExplanation.eligibilityReasons?.map((reason) => <p key={reason.key}><strong>{reason.passed ? 'Pass' : 'Fail'}:</strong> {reason.explanationEn}</p>)}<div className="admin-factor-list">{detail.lead.scoringExplanation.factors?.map((factor) => <div key={factor.key}><strong>{factor.key}</strong><span>{factor.points}/{factor.maximum}</span><small>{factor.explanationEn}</small></div>)}</div></section><section className="admin-detail-section"><h3>Assessment answers</h3><dl>{Object.entries(detail.lead.answers).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</dd></div>)}</dl></section><section className="admin-detail-section"><h3>Consent and authority record</h3><p>Consent: <code>{String(detail.lead.consent_version ?? '—')}</code> · {String(detail.lead.consented_at ?? '—')}</p><p>Adult/property authority: <code>{String(detail.lead.adult_confirmation_version ?? '—')}</code> · {String(detail.lead.adult_confirmed_at ?? '—')}</p><p>Privacy Notice: <code>{String(detail.lead.privacy_notice_version_id ?? detail.lead.privacy_version ?? '—')}</code></p><details><summary>Immutable wording snapshots</summary><p>{String(detail.lead.consent_text_en ?? '')}</p><p>{String(detail.lead.adult_confirmation_text_en ?? '')}</p></details></section><section className="admin-detail-section"><h3>Version record</h3><p>Questionnaire: <code>{detail.lead.questionnaire_version_id}</code></p><p>Rules: <code>{detail.lead.rule_version_id}</code></p><p>Release: <code>{detail.lead.release_id}</code></p></section><section className="admin-detail-section"><h3>Internal notes</h3>{detail.notes.length ? detail.notes.map((item) => <article key={item.id}><p>{item.note}</p><small>{new Date(item.created_at).toLocaleString('en-GB')} · {item.actor_email}</small></article>) : <p>No notes yet.</p>}<label>Add a note<textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label><button className="admin-button" type="button" disabled={!note.trim() || busy} onClick={() => void addLeadNote()}>Add note</button></section><details className="admin-technical-detail"><summary>Technical record and history</summary><pre>{JSON.stringify({ scoreHistory: detail.scoreHistory, statusEvents: detail.statusEvents }, null, 2)}</pre></details></section></div>}
  </main>;
}

function MediaPanel({ media, csrfToken, onChanged, setMessage }: { media: Array<Record<string, unknown>>; csrfToken: string; onChanged: () => Promise<void>; setMessage: (message: string) => void }) {
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await readJson(await fetch('/admin/api/media', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: form }));
      event.currentTarget.reset(); await onChanged(); setMessage('Image uploaded as a private draft. Publish it explicitly before use.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
  }
  async function action(id: string, value: 'publish'|'archive'|'delete') {
    if (value === 'delete' && !confirm('Delete this media object from private storage?')) return;
    try { await readJson(await fetch('/admin/api/media', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ id, action: value }) })); await onChanged(); setMessage(`Media ${value} action completed.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Media action failed.'); }
  }
  return <section className="admin-section"><div className="admin-section-heading"><div><h2>Approved website media</h2><p>Uploads remain in the private R2 bucket and are not public until explicitly published.</p></div></div><form className="admin-media-form" onSubmit={(event) => void upload(event)}><label>Image file<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Purpose<input name="purpose" required maxLength={100} /></label><label>English alternative text<input name="altEn" required maxLength={300} /></label><label>Thai alternative text<input name="altTh" lang="th" required maxLength={300} /></label><button className="admin-button" type="submit" disabled={!csrfToken}><Upload />Upload private draft</button></form><div className="admin-media-grid">{media.map((asset) => <article key={String(asset.id)}><div><ImageIcon /><strong>{String(asset.original_filename)}</strong><small>{String(asset.width)}×{String(asset.height)} · {Math.round(Number(asset.byte_size)/1024)} KB</small><span>{String(asset.publication_state)}</span></div><div><button type="button" onClick={() => void action(String(asset.id), 'publish')}>Publish</button><button type="button" onClick={() => void action(String(asset.id), 'archive')}>Archive</button><button type="button" className="danger" onClick={() => void action(String(asset.id), 'delete')}>Delete</button></div></article>)}</div></section>;
}
