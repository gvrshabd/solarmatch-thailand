import type { Page } from '@playwright/test';
import type { InstallerDelivery, InstallerPortalAction, InstallerPortalData } from '../../lib/installer/portal-contract';

/** Fictional handoff data only. No accounts, provider checkout or message delivery. */
export const SIGNAL_NOW = Date.UTC(2026, 9, 27, 3, 0);
export const SIGNAL_STATES = ['approved', 'empty', 'paused', 'platform', 'unverified', 'terms', 'nocredits', 'debt', 'payment', 'pending', 'nocompany'] as const;
export type SignalState = typeof SIGNAL_STATES[number] | 'combined';
export type SignalLanguage = 'en' | 'th';
export const signalId = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const ago = (minutes: number) => new Date(SIGNAL_NOW - minutes * 60_000).toISOString();

// Source: original prototype ENQ. Assessment values map to supported questionnaire keys.
const enquiries = [
  { n: 39, name: ['Arun', 'อรุณ'], area: ['Prawet, Bangkok', 'ประเวศ, กรุงเทพมหานคร'], phone: '0812345678', minutes: 12, bill: 7200, ac: 6, home: 'detached-home', roof: 'concrete-tile', shade: 'almost-none', use: 'high', loads: ['air-conditioning', 'pump'], when: 'within-3-months', outcome: null, paid: true },
  { n: 41, name: ['Natee', 'นที'], area: ['Sathon, Bangkok', 'สาทร, กรุงเทพมหานคร'], phone: '0898765432', minutes: 64, kwh: 620, ac: 5, home: 'townhouse', roof: 'clay-tile', shade: 'little', use: 'moderate', loads: ['air-conditioning', 'home-office-equipment'], when: 'three-six-months', outcome: null, paid: false },
  { n: 36, name: ['Kanya', 'กัญญา'], area: ['Bang Phli, Samut Prakan', 'บางพลี, สมุทรปราการ'], phone: '0862221199', minutes: 190, bill: 8800, ac: 7, home: 'detached-home', roof: 'metal-sheet', shade: 'almost-none', use: 'very-high', loads: ['air-conditioning', 'ev'], when: 'within-3-months', outcome: null, paid: true },
  { n: 33, name: ['Ploy', 'พลอย'], area: ['Bang Na, Bangkok', 'บางนา, กรุงเทพมหานคร'], phone: '0865550199', minutes: 1560, bill: 9500, ac: 8, home: 'large-home', roof: 'metal-sheet', shade: 'almost-none', use: 'very-high', loads: ['air-conditioning', 'pump', 'ev'], when: 'within-3-months', outcome: 'contacted', paid: true },
  { n: 30, name: ['Somsak', 'สมศักดิ์'], area: ['Pak Kret, Nonthaburi', 'ปากเกร็ด, นนทบุรี'], phone: '0851012020', minutes: 2900, bill: 5400, ac: 4, home: 'detached-home', roof: 'concrete-tile', shade: 'some', use: 'moderate', loads: ['air-conditioning'], when: 'three-six-months', outcome: 'site_visit', paid: true },
  { n: 28, name: ['Wichai', 'วิชัย'], area: ['Mueang Samut Prakan, Samut Prakan', 'เมืองสมุทรปราการ, สมุทรปราการ'], phone: '0823004411', minutes: 5800, bill: 5200, ac: 4, home: 'detached-home', roof: 'concrete-tile', shade: 'some', use: 'moderate', loads: ['air-conditioning'], when: 'six-twelve-months', outcome: 'quoted', paid: false },
  { n: 22, name: ['Malee', 'มาลี'], area: ['Lat Phrao, Bangkok', 'ลาดพร้าว, กรุงเทพมหานคร'], phone: '0847773300', minutes: 11500, bill: 7800, ac: 6, home: 'detached-home', roof: 'concrete-tile', shade: 'almost-none', use: 'high', loads: ['air-conditioning', 'pump'], when: 'within-3-months', outcome: 'won', paid: true },
];

const terms = {
  en: "SolarMatch supplies shared residential enquiries, not guaranteed sales. One enquiry may reach at most 3 companies through SolarMatch, including trials. One credit has a commercial value of ฿200; a shared enquiry costs 2 credits. The current package provides 20 credits for ฿4,000. [TAX TREATMENT TO BE CONFIRMED]. Approved companies may receive 2 free shared enquiries once, with no purchase or automatic billing. Delivery means availability in the receiving company's portal. Submit claims within 7 days of original availability; investigation may finish later. Credit restoration is separate from cash refund and never reopens a sharing slot. Staff links grant access to one enquiry and can be forwarded; they do not verify identity. Use personal information only for the permitted solar request, respect withdrawal and do not resell it. Exclusive sales remain disabled. Operator facts and final policies require review before launch.",
  th: 'SolarMatch ให้บริการคำขอที่อยู่อาศัยแบบแชร์ ไม่รับประกันยอดขาย คำขอหนึ่งส่งให้บริษัทได้สูงสุด 3 แห่งผ่าน SolarMatch รวมการทดลองฟรี 1 เครดิตมีมูลค่า 200 บาท คำขอแบบแชร์ใช้ 2 เครดิต แพ็กเกจปัจจุบันได้รับ 20 เครดิต ราคา 4,000 บาท [TAX TREATMENT TO BE CONFIRMED] บริษัทที่อนุมัติมีสิทธิ์ทดลองรับคำขอฟรี 2 รายการครั้งเดียว ไม่ต้องซื้อและไม่มีการเรียกเก็บเงินอัตโนมัติ การส่งมอบคือเวลาที่คำขอพร้อมใช้ในพอร์ทัลบริษัทผู้รับ ต้องยื่นคำร้องภายใน 7 วันนับจากเวลานั้น โดยการตรวจสอบอาจเสร็จภายหลัง การคืนเครดิตแยกจากการคืนเงินสดและไม่เปิดโควตาบริษัทผู้รับใหม่ ลิงก์ทีมงานให้สิทธิ์เข้าถึงคำขอเดียว ส่งต่อได้และไม่ยืนยันตัวตน ใช้ข้อมูลเฉพาะคำขอโซลาร์ที่ได้รับอนุญาต เคารพการถอนความยินยอมและห้ามขายต่อ ยังไม่เปิดขายแบบเฉพาะราย ข้อมูลผู้ประกอบการและนโยบายต้องทบทวนก่อนเปิดบริการ',
};

export function signalFixture(state: SignalState = 'approved', lang: SignalLanguage = 'en'): InstallerPortalData {
  const locale = lang === 'en' ? 0 : 1;
  const noCompany = state === 'nocompany';
  const pending = state === 'pending';
  const combined = state === 'combined';
  const termsAccepted = !['nocompany', 'pending', 'terms', 'combined'].includes(state);
  const deliveries: InstallerDelivery[] = enquiries.map(e => ({
    id: signalId(e.n), enquiryId: signalId(1000 + e.n), reference: 'SM-2610-' + String(e.n).padStart(3, '0'), product: 'shared_residential',
    fundingSource: e.paid ? 'purchased' : 'trial', creditCost: e.paid ? 2 : 0, deliveredAt: ago(e.minutes), notificationStatus: 'sent',
    claimDeadline: new Date(SIGNAL_NOW - e.minutes * 60_000 + 7 * 86400_000).toISOString(), withdrawn: false,
    homeownerName: e.name[locale], phone: e.phone, location: e.area[locale], requestedAt: ago(e.minutes + 1),
    teamNotes: '', notesRevision: 1, notesUpdatedAt: null, qualification: '', outcome: e.outcome,
    assessment: {
      ...(e.bill === undefined ? { billInputStatus: 'not-supplied', monthlyConsumptionKwh: e.kwh } : { monthlyBillThb: e.bill }),
      propertyType: e.home, ownershipStatus: 'owner', planningTimeframe: e.when, airConditionerCount: e.ac,
      roofMaterial: e.roof, shade: e.shade, daytimePattern: e.use, daytimeLoads: e.loads, projectType: e.n === 41 ? 'solar-with-battery' : 'new-rooftop',
    },
  }));
  // Withdrawn payload deliberately has no personal details, matching the public contract.
  deliveries.splice(6, 0, { id: signalId(25), enquiryId: signalId(1025), reference: 'SM-2610-025', product: 'shared_residential', fundingSource: 'purchased', creditCost: 2, deliveredAt: ago(7400), notificationStatus: 'cancelled', claimDeadline: new Date(SIGNAL_NOW - 7400 * 60_000 + 7 * 86400_000).toISOString(), withdrawn: true, homeownerName: '', phone: '', location: '', requestedAt: ago(7401), assessment: {}, qualification: '', outcome: null, notesRevision: 1, teamNotes: '' });
  const ledger: InstallerPortalData['ledger'] = [
    ['delivery', 39, 12, -2, 0], ['delivery', 41, 64, 0, -1], ['delivery', 36, 190, -2, 0], ['delivery', 33, 1560, -2, 0],
    ['delivery', 30, 2900, -2, 0], ['delivery', 28, 5800, 0, -1], ['delivery', 25, 7400, -2, 0], ['purchase', 200, 8200, 20, 0],
    ['delivery', 22, 11500, -2, 0], ['claim-restoration', 319, 12900, 2, 0], ['delivery', 19, 21000, -2, 0], ['trial-grant', 400, 36000, 0, 2],
  ].map(([kind, source, minutes, units, trial], i) => ({ id: signalId(500 + i), kind: String(kind), sourceId: signalId(Number(source)), units: Number(units), availableDelta: Number(units), reservedDelta: 0, trialDelta: Number(trial), debtDelta: 0, reason: '', createdAt: ago(Number(minutes)) }));
  return {
    session: { user: { id: signalId(1), name: 'Somchai', email: 'somchai@suriyasolar.co.th', emailVerified: state !== 'unverified' && !combined } },
    company: noCompany ? null : { id: signalId(2), name: 'Suriya Solar', approvalStatus: pending ? 'pending' : 'approved', contactName: 'Somchai', phone: '02 123 4567', serviceAreas: ['bangkok', 'samut-prakan'], supportedProducts: ['shared_residential'], dailyLimit: 3, paused: state === 'paused', lineLinked: false, termsAcceptedVersion: termsAccepted ? 'installer-terms-draft-v1' : null },
    products: [{ id: 'shared_residential', nameEn: 'Shared residential enquiry', nameTh: 'คำขอที่อยู่อาศัยแบบแชร์', creditCost: 2, enabled: true }],
    packages: [{ id: signalId(3), nameEn: 'Shared enquiry package', nameTh: 'แพ็กเกจคำขอแบบแชร์', credits: 20, amountMinor: 400000, currency: 'THB', taxLabel: '[TAX TREATMENT TO BE CONFIRMED]' }],
    // The source comment says 10, but its real LEDGER and credits() sum to 8.
    balance: { available: ['debt', 'nocredits', 'pending', 'nocompany', 'combined'].includes(state) ? 0 : 8, reserved: 0, trialRemaining: 0, debt: state === 'debt' || combined ? 4 : 0 },
    deliveries: noCompany || pending || state === 'empty' ? [] : deliveries,
    orders: noCompany || pending ? [] : [{ id: signalId(200), status: 'paid', credits: 20, amountMinor: 400000, currency: 'THB', createdAt: ago(8200), receiptReference: 'SIGNAL-SYNTHETIC-200' }, ...(state === 'payment' ? [{ id: signalId(201), status: 'pending', credits: 20, amountMinor: 400000, currency: 'THB', createdAt: ago(3), receiptReference: null }] : [])],
    ledger: noCompany || pending ? [] : ledger,
    claims: [{ id: signalId(325), deliveryId: signalId(25), reason: 'withdrawn', status: 'submitted', submittedAt: ago(7000), decision: null }, { id: signalId(319), deliveryId: signalId(19), reason: 'incorrect-contact', status: 'approved', submittedAt: ago(14000), decision: '2 credits restored' }],
    terms: { version: 'installer-terms-draft-v1', textEn: terms.en, textTh: terms.th, acceptedAt: termsAccepted ? ago(36000) : null },
    integrations: { paymentsEnabled: state === 'payment', paymentMethods: ['promptpay'], lineConfigured: true, mode: 'synthetic-signal-test' },
    availability: { platformPaused: state === 'platform' || combined, allocationPaused: false, notificationsEnabled: true, canManage: true },
    commercial: { creditValueMinor: 20000, sharedCredits: 2, claimDays: 7, trialDeliveries: 2, recipientLimit: 3 },
  };
}

/** Exact deterministic non-payment QR illustration from prototype qrSvg(). */
export function signalQrImage() {
  let cells = '', seed = 7;
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    seed = (seed * 9301 + 49297) % 233280;
    if (!finder && seed / 233280 > .52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  const finder = (x: number, y: number) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="#142D26" shape-rendering="crispEdges">${cells}${finder(0, 0)}${finder(18, 0)}${finder(0, 18)}</svg>`);
}

export async function mockSignalPortal(page: Page, state: SignalState = 'approved', lang: SignalLanguage = 'en') {
  const data = signalFixture(state, lang);
  const actions: InstallerPortalAction[] = [];
  await page.clock.setFixedTime(SIGNAL_NOW);
  await page.route('**/api/**', route => route.fulfill({ status: 501, json: { error: 'unmocked_synthetic_api' } }));
  await page.route('**/api/installer-auth/**', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/installer/portal**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: data });
    if (route.request().method() !== 'POST') return route.fulfill({ status: 405, json: { error: 'synthetic_method_only' } });
    const action = route.request().postDataJSON() as InstallerPortalAction;
    actions.push(action);
    let extra: Record<string, unknown> = {};
    if (action.action === 'set-accepting' && data.company) data.company.paused = !action.accepting;
    if (action.action === 'accept-terms') { data.terms.acceptedAt = new Date(SIGNAL_NOW).toISOString(); if (data.company) data.company.termsAcceptedVersion = action.version; }
    if (action.action === 'report-outcome') { const delivery = data.deliveries.find(item => item.id === action.deliveryId); if (delivery) delivery.outcome = action.outcome; }
    if (action.action === 'save-team-notes') {
      const delivery = data.deliveries.find(item => item.id === action.deliveryId);
      if (delivery && action.revision !== delivery.notesRevision) return route.fulfill({ status: 409, json: { error: 'notes_changed_or_unavailable' } });
      if (delivery) { delivery.teamNotes = action.notes; delivery.notesRevision = (delivery.notesRevision || 0) + 1; delivery.notesUpdatedAt = new Date(SIGNAL_NOW).toISOString(); }
    }
    if (action.action === 'checkout') extra = { orderId: signalId(201), qrImageUrl: signalQrImage() };
    if (action.action === 'reconcile-order') extra = { instructions: lang === 'en' ? 'Still waiting for payment' : 'ยังรอการชำระเงิน' };
    if (action.action === 'rotate-share-link') extra = { shareUrl: 'https://solarmatch.example/s/signal-synthetic-only' };
    if (action.action === 'create-claim') data.claims.unshift({ id: signalId(999), deliveryId: action.deliveryId, reason: action.reason, status: 'submitted', submittedAt: new Date(SIGNAL_NOW).toISOString(), decision: null });
    if (action.action === 'update-company' && data.company) data.company = { ...data.company, ...action };
    return route.fulfill({ json: { ok: true, ...extra } });
  });
  return { data, actions };
}

/** Fonts, decoded images and two animation frames, without timing sleeps. */
export async function signalReady(page: Page) {
  await page.locator('.signal h1').first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
