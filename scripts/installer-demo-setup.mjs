import { readFile, writeFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';

const base = new URL(process.env.INSTALLER_DEMO_ORIGIN ?? 'http://localhost:3000');
if(base.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('Synthetic demonstration requires a loopback HTTP origin.');
const origin = base.origin;
const email = 'preview-installer@example.test';
const installerPassword = process.env.INSTALLER_DEMO_PASSWORD;
if (!installerPassword) throw new Error('Set INSTALLER_DEMO_PASSWORD privately to the verified synthetic installer account password.');
const vars = Object.fromEntries((await readFile('.installer-test/.dev.vars', 'utf8')).split(/\r?\n/u).filter(Boolean).map(line => [line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
if (!vars.LOCAL_ADMIN_PASSWORD) throw new Error('Run node scripts/installer-local-setup.mjs before building the local preview.');

async function request(path, options = {}, cookie = '') {
  const headers = { Origin: origin, ...(options.body ? { 'Content-Type': options.form ? 'application/x-www-form-urlencoded' : 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
  const response = await fetch(`${origin}${path}`, { method: options.method ?? 'GET', headers, body: options.body, redirect: 'manual' });
  if (response.status >= 400) throw new Error(`${path} returned ${response.status}`);
  return response;
}
function cookies(response) { return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; '); }
async function json(path, body, cookie, csrf) {
  const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) throw new Error(`${path}: ${result.error ?? response.status}`);
  return result;
}
async function postStatus(path, body, expectedStatus, cookie = '') {
  const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (response.status !== expectedStatus) throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  return response;
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const adminLogin = await request('/admin/api/local-session', { method: 'POST', form: true, body: new URLSearchParams({ password: vars.LOCAL_ADMIN_PASSWORD }).toString() });
const adminCookie = cookies(adminLogin);
if (!adminCookie.includes('solarmatch_local_admin=')) throw new Error('Synthetic admin sign in failed. Rebuild the local preview with the isolated keys.');
const adminSession = await (await request('/admin/api/session', {}, adminCookie)).json();
if (!adminSession.csrfToken) throw new Error('Synthetic admin CSRF session unavailable.');
const adminPost = body => json('/admin/api/installer-platform', body, adminCookie, adminSession.csrfToken);
const adminGet = async () => (await (await request('/admin/api/installer-platform', {}, adminCookie)).json());

// Better Auth sets an HttpOnly session cookie; read it only from the response headers.
const signIn = () => fetch(`${origin}/api/installer-auth/sign-in/email`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: installerPassword, rememberMe: true }), redirect: 'manual' });
let signInResponse = await signIn();
if (!signInResponse.ok) {
  const signup = await fetch(`${origin}/api/installer-auth/sign-up/email`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Synthetic Preview Installer', email, password: installerPassword }), redirect: 'manual' });
  if (!signup.ok) throw new Error('Synthetic installer account could not sign in or be created.');
  const capture = await (await request('/api/installer/test')).json();
  const verification = capture.messages.find(row => row.channel === 'email' && row.recipient === email && JSON.parse(row.body).kind === 'verification');
  const verificationUrl = verification && JSON.parse(verification.body).url;
  if (!verificationUrl || new URL(verificationUrl).origin !== origin) throw new Error('Synthetic email verification capture unavailable.');
  await fetch(verificationUrl, { redirect: 'manual' });
  signInResponse = await signIn();
}
if (!signInResponse.ok) throw new Error('Synthetic installer sign in failed.');
const installerCookie = cookies(signInResponse);
if (!installerCookie) throw new Error('Synthetic installer session cookie unavailable.');
const portalPost = body => json('/api/installer/portal', body, installerCookie);
const portalGet = async () => (await (await request('/api/installer/portal', {}, installerCookie)).json());

let admin = await adminGet();
let portal = await portalGet();
if (!portal.company) {
  await portalPost({ action: 'create-company', name: 'Synthetic Preview Solar', contactName: 'Synthetic Demo Team', phone: '0000000000', serviceAreas: ['bangkok'], supportedProducts: ['shared_residential'], dailyLimit: 10, paused: true });
  portal = await portalGet();
  admin = await adminGet();
}
const companyId = portal.company?.id;
if (!companyId || !admin.companies.some(company => company.id === companyId && String(company.legal_name_en).startsWith('Synthetic '))) throw new Error('Expected synthetic company membership is missing.');
const statePath = '.installer-test/demo-state.json';
let state = { leadIds: [] };
try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

async function ensureSyntheticLeads() {
  for (let index = 0; index < 5; index++) {
    admin = await adminGet();
    if (state.leadIds[index] && admin.enquiries.some(row => row.lead_id === state.leadIds[index])) continue;
    if (index === 4) {
      const existing = admin.enquiries.find(row => row.verification_state === 'verified' && row.qualification_state === 'eligible' && ['queued','unmatched'].includes(String(row.status)) && !row.suppressed_at && Date.parse(String(row.request_expires_at)) > Date.now() && !state.leadIds.includes(row.lead_id) && !admin.deliveries.some(delivery => delivery.enquiry_id === row.id));
      if (existing) {
        state.leadIds[index] = existing.lead_id;
        await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
        continue;
      }
    }
    const phone = `+66800000${String(101 + index)}`;
    const config = await (await request('/api/assessment/config')).json();
    if (!config.assessmentToken) throw new Error('Assessment token unavailable for synthetic homeowner journey.');
    await new Promise(resolve => setTimeout(resolve, 1600));
    const challenge = await json('/api/phone-verification', { phone, assessmentToken: config.assessmentToken }, '');
    const captures = await (await request('/api/installer/test')).json();
    const message = captures.messages.find(row => row.id === challenge.challengeId && row.channel === 'sms');
    const code = message?.body.match(/SolarMatch: (\d{6})/u)?.[1];
    if (!code) throw new Error('Local SMS verification capture unavailable.');
    const verification = await json('/api/phone-verification', { phone, assessmentToken: config.assessmentToken, challengeId: challenge.challengeId, code }, '');
    const answers = { province: 'bangkok', district: ['sathon','bang-rak','watthana','pathum-wan','lat-phrao'][index], monthlyBillThb: 9000 + index * 1000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', daytimePattern: 'very-high', daytimeLoads: ['air-conditioning','pump'], airConditionerCount: 6, roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: true, quoteConsentAccepted: true };
    const lead = await json('/api/leads', { legalFirstName: 'Synthetic', legalLastName: `Homeowner ${index + 1}`, phone, contactMethod: 'phone', phoneVerificationId: challenge.challengeId, phoneVerificationProof: verification.proof, adultConfirmed: true, consent: true, locale: index % 2 ? 'th' : 'en', assessmentToken: config.assessmentToken, idempotencyKey: `f6e5f005-0000-4000-8000-00000000010${index + 1}`, answers }, '');
    if (!lead.leadId) throw new Error('Synthetic contact request did not return a lead ID.');
    state.leadIds[index] = lead.leadId;
    await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
}
async function linkSyntheticLine() {
  portal = await portalGet();
  if (portal.company.lineLinked) return;
  if (!vars.LINE_CHANNEL_SECRET) throw new Error('Missing isolated LINE_CHANNEL_SECRET; rerun local setup and rebuild preview.');
  const userId = `U${companyId.replaceAll('-', '')}`;
  const webhook = async event => {
    const body = JSON.stringify({ destination: `U${'0'.repeat(32)}`, events: [event] });
    const signature = createHmac('sha256', vars.LINE_CHANNEL_SECRET).update(body).digest('base64');
    const response = await fetch(`${origin}/api/installer/webhooks/line`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Line-Signature': signature }, body });
    if (!response.ok) throw new Error(`Synthetic signed LINE webhook returned ${response.status}`);
  };
  await webhook({ type: 'follow', webhookEventId: randomUUID(), timestamp: Date.now(), source: { type: 'user', userId } });
  const captures = await (await request('/api/installer/test')).json();
  const invitation = captures.messages.find(row => row.channel === 'line' && row.recipient === userId);
  const text = invitation && JSON.parse(invitation.body).messages?.[0]?.text;
  const invitationUrl = text?.match(/https?:\/\/[^\s]+/u)?.[0];
  if (!invitationUrl || new URL(invitationUrl).origin !== origin) throw new Error('Captured LINE invitation unavailable.');
  const linkRequest = new URL(invitationUrl).searchParams.get('linkRequest');
  const pending = await portalPost({ action: 'link-line', linkRequest });
  const nonce = new URL(pending.authorizationUrl).searchParams.get('nonce');
  if (!nonce) throw new Error('Synthetic LINE link challenge unavailable.');
  await webhook({ type: 'accountLink', webhookEventId: randomUUID(), timestamp: Date.now(), source: { type: 'user', userId }, link: { result: 'ok', nonce } });
  portal = await portalGet();
  if (!portal.company.lineLinked) throw new Error('Signed synthetic LINE account link was not applied.');
}

async function settingsChange(changes) {
  admin = await adminGet();
  await adminPost({ action: 'save-settings', settings: { ...admin.settings, ...changes } });
}
async function verifyUnrelatedCompanyIsolation(deliveryId) {
  const unrelatedEmail='isolated-installer@example.test';
  const auth=(path,body)=>fetch(`${origin}/api/installer-auth/${path}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
  let login=await auth('sign-in/email',{email:unrelatedEmail,password:installerPassword,rememberMe:true});
  if (!login.ok) {
    const signup=await auth('sign-up/email',{name:'Synthetic Isolated Installer',email:unrelatedEmail,password:installerPassword});
    if (!signup.ok) throw new Error('Unrelated synthetic account creation failed; respect local authentication rate limits before retrying.');
    const captures=(await (await request('/api/installer/test')).json()).messages;
    const message=captures.find(row=>row.channel==='email'&&row.recipient===unrelatedEmail&&JSON.parse(row.body).kind==='verification');
    const url=message&&JSON.parse(message.body).url;
    if (!url||new URL(url).origin!==origin) throw new Error('Unrelated account verification capture unavailable.');
    await fetch(url,{redirect:'manual'});
    login=await auth('sign-in/email',{email:unrelatedEmail,password:installerPassword,rememberMe:true});
  }
  if (!login.ok) throw new Error('Unrelated synthetic account sign-in failed.');
  const cookie=cookies(login);
  let data=await (await request('/api/installer/portal',{},cookie)).json();
  if (!data.company) {
    await json('/api/installer/portal',{action:'create-company',name:'Synthetic Isolation Solar',contactName:'Synthetic Isolation Team',phone:'0000000000',serviceAreas:['nonthaburi'],supportedProducts:['shared_residential'],dailyLimit:1,paused:true},cookie);
    data=await (await request('/api/installer/portal',{},cookie)).json();
  }
  assert(data.company?.id!==companyId&&data.orders.length===0&&data.ledger.length===0&&data.deliveries.length===0,'Unrelated account exposed primary-company financial or enquiry data.');
  const scoped=await (await request(`/api/installer/portal?deliveryId=${encodeURIComponent(deliveryId)}`,{},cookie)).json();
  assert(scoped.deliveries.length===0,'Unrelated authenticated account accessed another company delivery.');
  await postStatus('/api/installer/portal',{action:'rotate-share-link',deliveryId},400,cookie);
}
function localTimeToday(hour, minute = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const utcHour = hour - 7;
  return `${parts.year}-${parts.month}-${parts.day}T${String(utcHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

try {
  await adminPost({ action: 'record-company-contract', companyId, registrationNumber: 'SYNTHETIC-LOCAL-TEST-ONLY', privacyNoticeUrl: 'https://example.test/privacy', contractEffectiveDate: '2026-01-01', contractExpiryDate: '2030-12-31', reason: 'Synthetic local demonstration agreement only; no real counterparty.' });
  await adminPost({ action: 'approve-company', companyId, approve: true });
  await adminPost({ action: 'set-company-preferences', companyId, minimumBill: 3000, propertyTypes: ['detached-home'] });
  await portalPost({ action: 'update-company', name: 'Synthetic Preview Solar', contactName: 'Synthetic Demo Team', phone: '0000000000', serviceAreas: ['bangkok'], supportedProducts: ['shared_residential'], dailyLimit: 10, paused: false });
  portal = await portalGet();
  if (portal.terms.acceptedAt == null) await portalPost({ action: 'accept-terms', version: portal.terms.version });
  await linkSyntheticLine();
  portal = await portalGet();
  if (portal.balance.trialRemaining === 0 && !admin.ledger.some(row => row.company_id === companyId && row.kind === 'trial-grant')) await adminPost({ action: 'grant-trial', companyId });

  await settingsChange({ collectionEnabled: true, deliveryPaused: false, paymentsEnabled: true, notificationsEnabled: true, platformPaused: false });
  await ensureSyntheticLeads();
  admin = await adminGet();
  const enquiries = state.leadIds.map(leadId => admin.enquiries.find(row => row.lead_id === leadId));
  assert(enquiries.every(Boolean), 'All five synthetic canonical enquiries must exist.');
  assert(enquiries.slice(0, 4).every(row => row.verification_state === 'verified' && row.qualification_state === 'eligible'), 'Four synthetic enquiries must be verified and eligible.');
  await adminPost({ action: 'set-local-test-clock', fixedAt: localTimeToday(8, 59) });
  const overnight = await adminPost({ action: 'allocate', enquiryId: enquiries[0].id, companyIds: [companyId] });
  assert(overnight.allocated?.length === 0 && overnight.reason === 'paused_or_outside_hours', '08:59 Bangkok allocation must wait for opening time.');
  if (!enquiries[4].suppressed_at) await adminPost({ action: 'suppress-enquiry', enquiryId: enquiries[4].id, reason: 'Synthetic homeowner withdrawal before dispatch.' });
  const lateConsent = { legalFirstName: 'Synthetic', legalLastName: 'Late Consent', phone: '+66800000999', contactMethod: 'phone', phoneVerificationId: randomUUID(), phoneVerificationProof: 'a'.repeat(43), adultConfirmed: true, consent: true, locale: 'en', assessmentToken: 'a'.repeat(50), idempotencyKey: randomUUID(), answers: { province: 'bangkok', district: 'sathon', monthlyBillThb: 9000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', daytimePattern: 'very-high', daytimeLoads: ['air-conditioning'], airConditionerCount: 6, roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: true, quoteConsentAccepted: false } };
  await postStatus('/api/leads', lateConsent, 400);
  await adminPost({ action: 'set-local-test-clock', fixedAt: localTimeToday(10) });
  const withdrawnAttempt = await adminPost({ action: 'allocate', enquiryId: enquiries[4].id, companyIds: [companyId] });
  assert(withdrawnAttempt.allocated?.length === 0, 'Withdrawn enquiry must never be delivered.');
  let paidOrder = admin.orders.find(row => row.company_id === companyId && row.provider === 'local-test' && row.status === 'paid');
  if (!paidOrder) {
    const checkout = await portalPost({ action: 'checkout', packageId: 'credits-20' });
    await json('/api/installer/test', { action: 'payment', orderId: checkout.orderId, status: 'paid' }, '');
    admin = await adminGet();
    paidOrder = admin.orders.find(row => row.id === checkout.orderId && row.status === 'paid');
  }
  assert(paidOrder, 'Synthetic local-test purchase must be paid.');
  const purchaseLedgerBefore = admin.ledger.filter(row => row.source_id === paidOrder.id && row.kind === 'purchase');
  const purchaseBalanceBefore = (await portalGet()).balance.available;
  await json('/api/installer/test', { action: 'payment', orderId: paidOrder.id, status: 'paid' }, '');
  admin = await adminGet();
  assert(purchaseLedgerBefore.length === 1 && admin.ledger.filter(row => row.source_id === paidOrder.id && row.kind === 'purchase').length === 1, 'Repeated payment event must not issue credits twice.');
  assert((await portalGet()).balance.available === purchaseBalanceBefore, 'Repeated payment event changed the credit balance.');
  admin = await adminGet();
  for (const enquiry of admin.enquiries.filter(row => state.leadIds.includes(row.lead_id) && row.verification_state === 'verified' && row.qualification_state === 'eligible' && ['queued','unmatched','partially-delivered'].includes(String(row.status))).slice(0, 4)) {
    if (!admin.deliveries.some(row => row.enquiry_id === enquiry.id && row.partner_id === companyId)) await adminPost({ action: 'allocate', enquiryId: enquiry.id, companyIds: [companyId] });
  }
  await adminPost({ action: 'retry-outbox' });
  let afterOutbox = await adminGet();
  const deliveryLedgerBeforeRetry = afterOutbox.ledger.filter(row => row.kind === 'delivery').length;
  await adminPost({ action: 'retry-outbox' });
  afterOutbox = await adminGet();
  assert(afterOutbox.ledger.filter(row => row.kind === 'delivery').length === deliveryLedgerBeforeRetry, 'Repeated notification processing created another charge.');
  portal = await portalGet();
  const demoDeliveries = portal.deliveries.filter(delivery => admin.enquiries.some(row => state.leadIds.includes(row.lead_id) && row.id === delivery.enquiryId));
  if (demoDeliveries.filter(delivery => delivery.fundingSource === 'trial').length < 2 || demoDeliveries.filter(delivery => delivery.fundingSource === 'purchased').length < 2) throw new Error('Demo requires two validated trial and two validated purchased deliveries; inspect admin eligibility before retrying.');
  assert(demoDeliveries.every(delivery => delivery.notificationStatus === 'accepted'), 'Installer LINE notifications must be captured locally.');
  const messageCaptures = (await (await request('/api/installer/test')).json()).messages;
  assert(messageCaptures.some(row => row.channel === 'installer-delivery') && messageCaptures.some(row => row.channel === 'homeowner-confirmation'), 'Both LINE and SMS notification previews must be locally captured.');
  const claimExamples = [demoDeliveries.find(delivery => delivery.fundingSource === 'purchased'), demoDeliveries.find(delivery => delivery.fundingSource === 'trial')];
  const anonymousPrivate = await fetch(`${origin}/api/installer/portal?deliveryId=${encodeURIComponent(claimExamples[0].id)}`, { redirect: 'manual' });
  assert(anonymousPrivate.status === 401, 'Private installer delivery must require authenticated membership.');
  await verifyUnrelatedCompanyIsolation(claimExamples[0].id);
  const links = [];
  const revokedTokens = [];
  for (const delivery of claimExamples) {
    const before = await adminGet();
    const original = before.deliveries.find(row => row.id === delivery.id);
    const link = await portalPost({ action: 'rotate-share-link', deliveryId: delivery.id });
    const token = new URL(link.url).hash.match(/^#token=([A-Za-z0-9_-]{43})$/u)?.[1];
    assert(token, 'Scoped staff link token missing from URL fragment.');
    const read = await json('/api/installer/share', { token }, '');
    assert(read.delivery?.reference === delivery.reference, 'Staff link exposed a different enquiry.');
    await request('/enquiry?lang=en');
    await request('/enquiry?lang=th');
    await portalPost({ action: 'revoke-share-link', deliveryId: delivery.id });
    await postStatus('/api/installer/share', { token }, 404);
    revokedTokens.push(token);
    const regenerated = await portalPost({ action: 'rotate-share-link', deliveryId: delivery.id });
    const regeneratedToken = new URL(regenerated.url).hash.match(/^#token=([A-Za-z0-9_-]{43})$/u)?.[1];
    assert(regeneratedToken && regeneratedToken !== token, 'Regenerated link must have a new token.');
    assert((await json('/api/installer/share', { token: regeneratedToken }, '')).delivery?.reference === delivery.reference, 'Regenerated staff link did not resolve its assigned enquiry.');
    const after = await adminGet();
    assert(after.deliveries.length === before.deliveries.length && after.ledger.length === before.ledger.length, 'Staff link rotation changed delivery or ledger records.');
    assert(after.deliveries.find(row => row.id === delivery.id)?.claim_deadline === original?.claim_deadline, 'Staff link regeneration changed the claim deadline.');
    links.push({ deliveryId: delivery.id, url: regenerated.url, expiresAt: regenerated.expiresAt });
  }
  if (links.length) await writeFile('.installer-test/demo-share-links.json', JSON.stringify({ generatedAt: new Date().toISOString(), links }, null, 2), { mode: 0o600 });
  if (links.length) {
    const { chromium, expect } = await import('@playwright/test');
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    let browserStage='revoked-link denial';
    try {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
      const delivery = claimExamples[0];
      const reference = delivery.reference;
      await page.goto(`${origin}/enquiry?lang=en#token=${revokedTokens[0]}`);
      await page.getByRole('heading', { name: 'This enquiry is unavailable' }).waitFor({ timeout: 15000 });
      const token = new URL(links[0].url).hash.slice('#token='.length);
      browserStage='replacement-link view';
      // A fragment-only navigation does not remount the one-use token reader.
      await page.goto('about:blank');
      await page.goto(`${origin}/enquiry?lang=en#token=${token}`);
      await page.getByRole('heading', { name: reference, exact: true }).waitFor({ timeout: 15000 });
      assert(await page.locator('.installer-shell').getAttribute('lang') === 'en', 'Staff link English view was unavailable.');
      browserStage='Thai mobile view';
      await page.getByRole('button', { name: 'ไทย' }).click();
      await expect(page.locator('.installer-shell')).toHaveAttribute('lang','th');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Staff link mobile view overflowed.');
      await page.close();
    } catch { throw new Error(`Synthetic staff link browser check failed at ${browserStage}; private token omitted.`); }
    finally { await browser.close(); }
  }
  for (const delivery of claimExamples) {
    if (!portal.claims.some(claim => claim.deliveryId === delivery.id)) await portalPost({ action: 'create-claim', deliveryId: delivery.id, reason: 'incorrect-contact', notes: 'Synthetic claim for local demonstration only.' });
  }
  portal = await portalGet();
  const purchasedClaim = portal.claims.find(claim => claim.deliveryId === claimExamples[0].id);
  if (purchasedClaim?.status === 'submitted') await adminPost({ action: 'decide-claim', claimId: purchasedClaim.id, decision: 'approved', notes: 'Synthetic local test purchased-credit restoration; no real contact or billing.' });
  admin = await adminGet();
  assert(admin.ledger.filter(row => row.kind === 'claim-restoration' && row.source_id === purchasedClaim.id).length === 1, 'Purchased claim must restore exactly once.');
  await json('/api/installer/test', { action: 'seed' }, '');
  for (const fixtureCompany of ['synthetic-company-1', 'synthetic-company-2']) {
    admin = await adminGet();
    if (!admin.deliveries.some(row => row.enquiry_id === claimExamples[0].enquiryId && row.partner_id === fixtureCompany)) {
      const allocation = await adminPost({ action: 'allocate', enquiryId: claimExamples[0].enquiryId, companyIds: [fixtureCompany] });
      assert(allocation.allocated?.length === 1, 'Synthetic recipient-cap fixture company did not pass normal allocation.');
    }
  }
  admin = await adminGet();
  const recipientCount = () => admin.deliveries.filter(row => row.enquiry_id === claimExamples[0].enquiryId).length;
  assert(recipientCount() === 3, 'One shared enquiry must reach exactly three distinct companies after the test allocations.');
  const chargesBeforeFourth = admin.ledger.filter(row => row.kind === 'delivery').length;
  const fourth = await adminPost({ action: 'allocate', enquiryId: claimExamples[0].enquiryId, companyIds: ['synthetic-company-3'] });
  admin = await adminGet();
  assert(fourth.allocated?.length === 0 && recipientCount() === 3, 'Fourth recipient must be rejected after purchased-credit restoration.');
  assert(admin.ledger.filter(row => row.kind === 'delivery').length === chargesBeforeFourth, 'Rejected fourth recipient must not be charged.');
  assert(!admin.deliveries.some(row => row.enquiry_id === enquiries[4].id), 'Withdrawn enquiry gained a delivery.');
  console.log('Connected synthetic journey passed: overnight wait, consent, withdrawal, one-time payment and claim restoration, notification retry, scoped link revoke/regenerate, and lifetime three-company cap.');
  console.log('Staff links saved privately to ignored .installer-test/demo-share-links.json; URLs and tokens were not printed.');
} finally {
  const cleanupFailures = [];
  try { await adminPost({ action: 'set-local-test-clock', fixedAt: null }); } catch { cleanupFailures.push('test clock'); }
  try { await settingsChange({ collectionEnabled: false, deliveryPaused: true, paymentsEnabled: false, notificationsEnabled: false, platformPaused: false }); } catch { cleanupFailures.push('platform settings'); }
  try { await adminPost({ action: 'pause-company', companyId, paused: true }); } catch { cleanupFailures.push('company pause'); }
  if (cleanupFailures.length) throw new Error(`Local demo cleanup needs administrator attention: ${cleanupFailures.join(', ')}`);
  console.log('Local test clock cleared; collection, allocation, payments and notifications disabled; synthetic company paused.');
}
