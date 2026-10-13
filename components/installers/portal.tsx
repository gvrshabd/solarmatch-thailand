'use client';
import { assessmentRows, sharedResidentialLabel } from '@/lib/installer/assessment-display';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstallerPortalAction, InstallerPortalData } from '@/lib/installer/portal-contract';
import { CreditBalance, enquiryGroup, PortalBrand, PortalInbox, PortalNavigation, PortalOverview, SolarCity, type PortalView } from './workspace';

type View = PortalView;
export function InstallerPortal({ deliveryId }: { deliveryId?: string }) {
  const router = useRouter();
  const [en, setEn] = useState(false);
  const [data, setData] = useState<InstallerPortalData | null>(null);
  const [view, setView] = useState<View>('overview');
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [share, setShare] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [lineRequest, setLineRequest] = useState<string | undefined>();
  const [viewTime, setViewTime] = useState(0);
  const t = (th: string, english: string) => {
    const commercial=data?.commercial;
    if(commercial&&english==='One credit has a commercial value of ฿200. A shared enquiry uses two credits. No automatic billing.') return en ? `One credit has a commercial value of ฿${commercial.creditValueMinor/100}. A shared enquiry uses ${commercial.sharedCredits} credits. No automatic billing.` : `1 เครดิตมีมูลค่า ${commercial.creditValueMinor/100} บาท คำขอแบบแชร์ใช้ ${commercial.sharedCredits} เครดิต ไม่มีการเรียกเก็บเงินอัตโนมัติ`;
    if(commercial&&english==='Submit from an enquiry page within seven days of portal availability. Credit restoration is separate from a cash refund.') return en ? `Submit from an enquiry page within ${commercial.claimDays} days of portal availability. Credit restoration is separate from a cash refund.` : `ยื่นคำร้องจากหน้าคำขอภายใน ${commercial.claimDays} วันนับจากพร้อมใช้ในพอร์ทัล การคืนเครดิตแยกจากการคืนเงินสด`;
    if(commercial&&english==='Shared residential enquiries only, with at most three receiving companies per enquiry.') return en ? `Shared residential enquiries only, with at most ${commercial.recipientLimit} receiving companies per enquiry.` : `รับคำขอที่อยู่อาศัยแบบแชร์เท่านั้น สูงสุด ${commercial.recipientLimit} บริษัทต่อคำขอ`;
    return en ? english : th;
  };
  useEffect(() => { document.documentElement.lang = en ? 'en' : 'th'; }, [en]);
  useEffect(() => {
    queueMicrotask(() => setViewTime(Date.now()));
    const timer = window.setInterval(() => setViewTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  async function load() {
    const response = await fetch('/api/installer/portal' + (deliveryId ? '?deliveryId=' + encodeURIComponent(deliveryId) : ''), { cache: 'no-store', credentials: 'same-origin' });
    if (response.status === 503) { setData(null); setUnavailable(true); setLoaded(true); return; }
    setUnavailable(false);
    if (response.status === 401) { setData(null); setLoaded(true); return; }
    if (!response.ok) throw new Error(t('ระบบพอร์ทัลยังไม่พร้อม กรุณาลองใหม่ภายหลัง', 'The portal is unavailable. Please try again later.'));
    setData(await response.json()); setLoaded(true);
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view') as View | null;
    if (requestedView && ['overview', 'inbox', 'credits', 'profile', 'terms', 'claims'].includes(requestedView)) queueMicrotask(() => setView(requestedView));
    const invitation = params.get('linkRequest');
    if (invitation) { params.delete('linkRequest'); window.history.replaceState({}, '', window.location.pathname + (params.size ? '?' + params.toString() : '')); queueMicrotask(() => setLineRequest(invitation)); }
    queueMicrotask(() => { setEn(params.get('lang') === 'en'); if (params.has('token')) setAuthMode('reset'); });
    queueMicrotask(() => { void load().catch((error: Error) => { setMessage(error.message); setUnavailable(true); setLoaded(true); }); });
    const back = () => { const params = new URLSearchParams(window.location.search); const value = params.get('view'); setView(['overview', 'inbox', 'credits', 'profile', 'terms', 'claims'].includes(value || '') ? value as View : 'overview'); setEn(params.get('lang') === 'en'); };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
    // Language changes do not reload private data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function action(body: InstallerPortalAction) {
    if (body.action === 'link-line') body = { ...body, linkRequest: lineRequest };
    if (body.action === 'create-company' || body.action === 'update-company') body = { ...body, supportedProducts: body.supportedProducts.map((value) => value.replaceAll('-', '_')) };
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/installer/portal?lang=' + (en ? 'en' : 'th'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      const result = await response.json() as { error?: string; instructions?: string; shareUrl?: string; checkout?: Record<string, unknown>; orderId?: string; order?: { id: string }; qrImageUrl?: string; checkoutUrl?: string; authorizationUrl?: string; url?: string };
      if (!response.ok) throw new Error(portalErrorMessage(response.status,result.error,en));
      if (result.shareUrl) setShare(result.shareUrl);
      if (body.action === 'rotate-share-link' && result.url) { setShare(result.url); await load(); return; }
      if (result.checkout) {
        await openHostedPayment(result.orderId || result.order?.id || '', result.checkout);
        return;
      }
      if (result.qrImageUrl) setQrImage(result.qrImageUrl);
      const redirect = result.checkoutUrl || result.authorizationUrl || result.url;
      if (redirect) { window.location.assign(redirect); return; }
      if (body.action === 'unlink-line') {
        setLineRequest(undefined);
        setMessage(t('ยกเลิกการเชื่อมต่อ LINE แล้ว ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้ ข้อความที่ส่งไปแล้วไม่สามารถเรียกคืนได้', 'LINE disconnected. Unsent notifications are retained for operator review. You can reconnect later. Messages already sent cannot be recalled.'));
      } else setMessage(result.instructions || t('บันทึกแล้ว', 'Saved.'));
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : t('เกิดข้อผิดพลาด', 'Something went wrong.')); }
    finally { setBusy(false); }
  }
  async function openHostedPayment(orderId: string, checkout: Record<string, unknown>) {
    if (!orderId || !checkout.publicKey) throw new Error(t('ข้อมูลชำระเงินไม่ครบ', 'Payment configuration is incomplete.'));
    const browser = window as unknown as { OmiseCard?: { configure: (options: Record<string, unknown>) => void; open: (options: Record<string, unknown>) => void } };
    if (!browser.OmiseCard) await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.omise.co/omise.js'; script.async = true;
      script.onload = () => resolve(); script.onerror = () => reject(new Error(t('โหลดหน้าชำระเงินไม่สำเร็จ', 'Unable to load the payment form.'))); document.head.appendChild(script);
    });
    if (!browser.OmiseCard) throw new Error(t('หน้าชำระเงินยังไม่พร้อม', 'The payment form is unavailable.'));
    browser.OmiseCard.configure({ publicKey: checkout.publicKey });
    browser.OmiseCard.open({ ...checkout, locale: en ? 'en' : 'th', onCreateTokenSuccess: (nonce: string) => { void action({ action: 'authorize-payment', orderId, tokenOrSourceId: nonce }); } });
  }
  async function authSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    const base = window.location.origin + '/installers' + (en ? '?lang=en' : '');
    const endpoint = authMode === 'register' ? 'sign-up/email' : authMode === 'recovery' ? 'request-password-reset' : authMode === 'reset' ? 'reset-password' : 'sign-in/email';
    const body = authMode === 'register' ? { email, password, name: form.get('name'), callbackURL: base } : authMode === 'recovery' ? { email, redirectTo: base } : authMode === 'reset' ? { newPassword: password, token: new URLSearchParams(window.location.search).get('token') } : { email, password, rememberMe: true, callbackURL: base };
    try {
      const response = await fetch('/api/installer-auth/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(t('ไม่สามารถดำเนินการได้ ตรวจสอบข้อมูลและยืนยันอีเมลก่อนเข้าสู่ระบบ', 'Unable to continue. Check your details and verify your email before signing in.'));
      if (authMode === 'login') await load();
      else { setMessage(t('ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ', 'Check your email to continue if this account exists.')); if (authMode === 'reset') { setAuthMode('login'); window.history.replaceState({}, '', base); } }
      void result;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/installer-auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('sign_out_failed');
      setData(null); setShare(''); setQrImage(''); setLineRequest(undefined);
    } catch {
      setMessage(t('ยังออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง', 'You are still signed in. Please try signing out again.'));
    } finally { setBusy(false); }
  }
  const delivery = data?.deliveries.find((item) => item.id === deliveryId);
  const claimOpen = delivery && Date.parse(delivery.claimDeadline) >= viewTime;
  const navigate = (item: View) => {
    if (deliveryId) { router.push('/installers?lang=' + (en ? 'en' : 'th') + '&view=' + item); return; }
    setView(item);
    const url = new URL(window.location.href); url.searchParams.set('view', item); window.history.pushState({}, '', url);
    window.requestAnimationFrame(() => { document.getElementById('installer-page-title')?.focus(); });
  };
  const title = deliveryId ? t('รายละเอียดคำขอ', 'Enquiry details') : ({ overview: t('ภาพรวมของคุณ', 'Your workspace'), inbox: t('คำขอจากเจ้าของบ้าน', 'Your enquiries'), credits: t('เครดิต', 'Credits'), profile: t('บัญชีบริษัท', 'Your company'), claims: t('คำร้องคืนเครดิต', 'Credit claims'), terms: t('ข้อตกลงผู้ติดตั้ง', 'Installer terms') })[view];
  if (loaded && unavailable) return <main className="installer-shell installer-signed-out" lang={en ? 'en' : 'th'}>
    <header className="installer-header"><a href={'/installers?lang=' + (en ? 'en' : 'th')} className="installer-brand"><PortalBrand /></a><div className="installer-header-actions"><button aria-label={en ? 'Switch to Thai' : 'Switch to English'} onClick={() => { setEn(!en); const url = new URL(window.location.href); url.searchParams.set('lang', en ? 'th' : 'en'); window.history.replaceState({}, '', url); }}>{en ? 'ไทย' : 'English'}</button></div></header>
    <div className="installer-content"><section className="installer-card"><p className="installer-eyebrow">SOLARMATCH FOR INSTALLERS</p><h1>{t('พอร์ทัลผู้ติดตั้งยังไม่เปิดให้บริการ', 'The installer portal is not open yet')}</h1><p role="status">{t('ขณะนี้ยังไม่เปิดรับสมัครบัญชีบริษัทหรือซื้อเครดิต คุณยังสามารถใช้เครื่องคำนวณโซลาร์สำหรับเจ้าของบ้านได้โดยไม่ต้องให้ข้อมูลติดต่อ', 'Company registration and credit purchases are currently unavailable. You can still use the homeowner solar calculator without providing contact details.')}</p><a className="button button-primary" href={en ? '/en/estimate' : '/estimate'}>{t('ไปที่เครื่องคำนวณโซลาร์', 'Open the solar calculator')}</a></section></div>
  </main>;
  return <main className={'installer-shell' + (data ? ' installer-workspace' : ' installer-signed-out')} lang={en ? 'en' : 'th'}>
    <a className="installer-skip" href="#installer-content">{t('ข้ามไปเนื้อหา', 'Skip to content')}</a>
    <header className="installer-header"><a href={'/installers?lang=' + (en ? 'en' : 'th')} className="installer-brand"><PortalBrand /></a>{data && <div className="installer-company-heading"><span className="installer-avatar" aria-hidden="true">{Array.from(data.company?.name || data.session.user.name)[0]}</span><div><strong>{data.company?.name || data.session.user.name}</strong><small>{data.company ? statusLabel(data.company.approvalStatus, en) + ' · ' + (data.company.paused ? t('พักรับคำขอ', 'Deliveries paused') : t('ตั้งค่ารับคำขอแล้ว', 'Delivery preferences saved')) : t('ตั้งค่าบริษัทของคุณ', 'Set up your company')}</small></div></div>}<div className="installer-header-actions"><a href={en ? '/en' : '/'}>{t('สำหรับเจ้าของบ้าน', 'Homeowner website')}</a><button aria-label={en ? 'Switch to Thai' : 'Switch to English'} onClick={() => { setEn(!en); const url = new URL(window.location.href); url.searchParams.set('lang', en ? 'th' : 'en'); window.history.replaceState({}, '', url); }}>{en ? 'ไทย' : 'English'}</button></div></header>
    {data && <PortalNavigation view={deliveryId ? 'inbox' : view} en={en} count={data.deliveries.filter(item => enquiryGroup(item) === 'new').length} navigate={navigate} />}
    <div className="installer-content" id="installer-content">
    {message && <p className="installer-notice" role="status">{['Saved.', 'บันทึกแล้ว'].includes(message) ? t('บันทึกแล้ว', 'Saved.') : ['Check your email to continue if this account exists.', 'ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ'].includes(message) ? t('ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ', 'Check your email to continue if this account exists.') : message}</p>}
    {qrImage && <section className="installer-card"><h2>{t('สแกนชำระเงิน', 'Scan to pay')}</h2>{/* Provider-created QR only; status is confirmed server-side. */}<img src={qrImage} alt={t('คิวอาร์โค้ดสำหรับชำระเงิน', 'Payment QR code')} width={240} height={240} /><p>{t('เครดิตจะเข้าเมื่อผู้ให้บริการยืนยันการชำระเงินแล้ว ตรวจสอบสถานะในประวัติการซื้อ', 'Credits are issued after provider confirmation. Check the purchase history for payment status.')}</p></section>}
    {!loaded ? <div className="installer-skeleton" role="status"><span>{t('กำลังโหลดพอร์ทัล', 'Loading your workspace')}</span><div /><div /></div> : !data ? <section className="installer-auth"><div className="installer-auth-story"><p className="installer-eyebrow">SOLARMATCH FOR INSTALLERS</p><h1>{t('โอกาสใหม่สำหรับบริษัทติดตั้งโซลาร์', 'New opportunities for solar installation companies')}</h1><p>{t('รับคำขอจากเจ้าของบ้านในพื้นที่บริการของคุณ บริษัทที่ได้รับอนุมัติมีสิทธิ์ทดลองรับคำขอแบบแชร์ 2 รายการ โดยไม่ต้องซื้อเครดิต', 'Receive homeowner enquiries in your service area. Approved companies receive two free shared enquiries, with no purchase required.')}</p><SolarCity /><p className="installer-muted">{t('ข้อมูลที่ช่วยให้คุณพร้อมก่อนเริ่มพูดคุย', 'The context you need before the conversation.')}</p></div><div className="installer-card installer-auth-form"><form onSubmit={authSubmit}>
      <h2>{authMode === 'register' ? t('สร้างบัญชี', 'Create account') : authMode === 'recovery' ? t('กู้คืนบัญชี', 'Recover account') : authMode === 'reset' ? t('ตั้งรหัสผ่านใหม่', 'Set a new password') : t('เข้าสู่ระบบ', 'Sign in')}</h2>
      {authMode === 'register' && <label>{t('ชื่อผู้ติดต่อ', 'Your name')}<input name="name" autoComplete="name" required maxLength={120} /></label>}
      {authMode !== 'reset' && <label>{t('อีเมล', 'Email')}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {authMode !== 'recovery' && <label>{t('รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)', 'Password (at least 12 characters)')}<input name="password" type="password" minLength={12} maxLength={128} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required /></label>}
      <button className="installer-primary" disabled={busy}>{busy ? t('กำลังดำเนินการ…', 'Working…') : t('ดำเนินการต่อ', 'Continue')}</button>
    </form><div className="installer-auth-links"><button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>{authMode === 'register' ? t('มีบัญชีแล้ว', 'Already have an account') : t('สร้างบัญชีบริษัท', 'Create a company account')}</button><button onClick={() => setAuthMode('recovery')}>{t('ลืมรหัสผ่าน', 'Forgot password')}</button></div><p className="installer-muted">{t('ต้องยืนยันอีเมลก่อนใช้บัญชี บริษัทแต่ละแห่งจะได้รับการตรวจสอบก่อนเริ่มรับคำขอ ไม่มีการเรียกเก็บเงินอัตโนมัติหลังทดลอง', 'Verify your email before using your account. Companies are reviewed before receiving enquiries. The trial does not start automatic billing.')}</p></div></section> : <>
      <div className="installer-welcome"><div><p className="installer-eyebrow">{t('พอร์ทัลผู้ติดตั้ง', 'Installer portal')}</p><h1 id="installer-page-title" tabIndex={-1}>{title}</h1></div><button disabled={busy} onClick={signOut}>{t('ออกจากระบบ', 'Sign out')}</button></div>
      {!data.session.user.emailVerified && <p className="installer-notice">{t('กรุณายืนยันอีเมลก่อนใช้ข้อมูลบริษัท', 'Please verify your email before using company controls.')}</p>}
      {['profile', 'claims', 'terms'].includes(view) && !deliveryId && <div className="installer-secondary-nav"><button aria-current={view === 'profile' ? 'page' : undefined} onClick={() => navigate('profile')}>{t('ข้อมูลบริษัท', 'Company details')}</button><button aria-current={view === 'claims' ? 'page' : undefined} onClick={() => navigate('claims')}>{t('คำร้อง', 'Claims')}</button><button aria-current={view === 'terms' ? 'page' : undefined} onClick={() => navigate('terms')}>{t('ข้อตกลง', 'Terms')}</button></div>}
      {data.company && data.balance.debt > 0 && <p className="installer-notice" role="status">{t('เครดิตค้างชำระ', 'Credit debt')}: {data.balance.debt}. {t('บริษัทจะยังรับคำขอใหม่ไม่ได้จนกว่าจะชำระยอดนี้ เครดิตที่ซื้อเพิ่มหรือได้รับคืนจะหักยอดค้างก่อน ส่วนที่เหลือจึงเป็นเครดิตพร้อมใช้ สิทธิ์ทดลองแยกจากยอดนี้', 'New deliveries are blocked until this debt is cleared. Purchased credits and purchased-credit restorations offset debt first; only the remainder becomes available. Trial entitlements are separate.')}</p>}
      {deliveryId ? delivery ? <section className="installer-card installer-detail">
        <a href={'/installers?view=inbox&lang=' + (en ? 'en' : 'th')}>← {t('กลับไปที่คำขอ', 'Back to inbox')}</a><h2>{delivery.reference}</h2>
        {delivery.withdrawn ? <p className="installer-notice">{t('ถอนหรือระงับสิทธิ์เข้าถึงข้อมูลแล้ว ห้ามติดต่อเจ้าของบ้านจากคำขอนี้ ข้อมูลส่วนบุคคลและลิงก์ทีมงานไม่พร้อมใช้งาน บันทึกการคิดเครดิตยังคงอยู่ และสามารถยื่นคำร้องได้ภายในกำหนดเดิม', 'Access withdrawn or suppressed. Do not contact the homeowner about this enquiry. Personal details and staff links are unavailable. The financial record remains, and eligible claims can be submitted within the original deadline.')}</p> : <>
          <div className="installer-detail-person"><span className="installer-avatar" aria-hidden="true">{Array.from(delivery.homeownerName)[0]}</span><div><h3>{delivery.homeownerName}</h3><p>{delivery.location}</p></div><a className="installer-call" href={'tel:' + delivery.phone}>{delivery.phone}</a></div><p className="installer-muted">{t('ร้องขอเมื่อ', 'Requested')}: {date(delivery.requestedAt, en)}</p>
          <p>{delivery.qualification}</p><dl>{assessmentRows(delivery.assessment, en).map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          <h3>{t('แชร์กับทีมงาน', 'Share with staff')}</h3><p>{t('ผู้ที่ได้รับลิงก์สามารถอ่านข้อมูลคำขอนี้ได้ ใช้สำหรับพนักงานที่ดูแลคำขอของบริษัทเท่านั้น ลิงก์ไม่ได้ยืนยันตัวตนผู้เปิดและสามารถส่งต่อได้', 'Anyone with the link can read this enquiry. Forward only to staff handling it for your company. It does not verify the viewer’s identity and can be forwarded again.')}</p>
          <button disabled={busy} onClick={() => action({ action: 'rotate-share-link', deliveryId: delivery.id })}>{t('สร้างลิงก์ใหม่', 'Create replacement link')}</button><button disabled={busy} onClick={() => { setShare(''); action({ action: 'revoke-share-link', deliveryId: delivery.id }); }}>{t('เพิกถอนลิงก์', 'Revoke link')}</button>{share && <label>{t('ลิงก์สำหรับทีมงาน', 'Staff access link')}<input readOnly value={share} onFocus={(event) => event.target.select()} /></label>}
          <h3>{t('รายงานผล', 'Report outcome')}</h3><select aria-label={t('ผลการติดต่อ', 'Contact outcome')} disabled={busy} defaultValue={delivery.outcome || ''} onChange={(event) => action({ action: 'report-outcome', deliveryId: delivery.id, outcome: event.target.value })}><option value="">{t('เลือกผล', 'Choose outcome')}</option>{['open', 'won', 'lost', 'not-suitable'].map((value) => <option key={value} value={value}>{statusLabel(value, en)}</option>)}</select>
        </>}
        <p>{t('พร้อมใช้ในพอร์ทัลเมื่อ', 'Available in portal')}: {date(delivery.deliveredAt, en)}</p><p>{statusLabel(delivery.product, en)} · {delivery.fundingSource === 'trial' ? t('ทดลองฟรี', 'Free trial') : delivery.creditCost + ' ' + t('เครดิต', 'credits')}</p>
        <p>{t('สถานะการแจ้งเตือน', 'Notification status')}: {statusLabel(delivery.notificationStatus, en)}</p>
        <h3>{t('คำร้องคืนเครดิต', 'Credit claim')}</h3><p>{t('ยื่นได้ถึง', 'Submit by')}: {date(delivery.claimDeadline, en)}. {t('การไม่รับสายหรือไม่ซื้อ ไม่ถือเป็นคำขอที่ไม่ถูกต้องโดยอัตโนมัติ', 'No answer or no purchase does not automatically make an enquiry invalid.')}</p>
        {claimOpen ? <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); action({ action: 'create-claim', deliveryId: delivery.id, reason: String(form.get('reason')), notes: String(form.get('notes')) }); }}><label>{t('เหตุผล', 'Reason')}<select name="reason">{['incorrect-contact', 'duplicate', 'outside-criteria', 'no-request', 'withdrawn'].map((value) => <option key={value} value={value}>{statusLabel(value, en)}</option>)}</select></label><label>{t('ข้อมูลสนับสนุน', 'Supporting information')}<textarea name="notes" required maxLength={2000} /></label><button disabled={busy}>{t('ส่งคำร้อง', 'Submit claim')}</button></form> : <p>{t('พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว', 'The claim submission window has closed for this enquiry.')}</p>}
      </section> : <p className="installer-card">{t('ไม่พบคำขอในบัญชีบริษัทนี้', 'This enquiry is not available to your company.')}</p> : <>
      {view === 'overview' && <PortalOverview data={data} en={en} navigate={navigate} />}
      {view === 'inbox' && <PortalInbox data={data} en={en} />}
      {view === 'profile' || !data.company ? <section className="installer-card"><h2>{t('ข้อมูลบริษัทและการรับคำขอ', 'Company and delivery preferences')}</h2><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); action({ action: data.company ? 'update-company' : 'create-company', name: String(form.get('name')), contactName: String(form.get('contactName')), phone: String(form.get('phone')), serviceAreas: String(form.get('serviceAreas')).split(',').map((x) => x.trim()).filter(Boolean), supportedProducts: ['shared-residential'], dailyLimit: Number(form.get('dailyLimit')), paused: form.get('paused') === 'on' }); }}>
        <label>{t('ชื่อบริษัท', 'Company name')}<input name="name" defaultValue={data.company?.name} required maxLength={160} /></label><label>{t('ชื่อผู้ติดต่อ', 'Contact name')}<input name="contactName" defaultValue={data.company?.contactName || data.session.user.name} required maxLength={120} /></label><label>{t('โทรศัพท์บริษัท', 'Company phone')}<input name="phone" type="tel" defaultValue={data.company?.phone} required /></label><label>{t('พื้นที่บริการ (คั่นด้วยจุลภาค)', 'Service areas (comma-separated)')}<input name="serviceAreas" defaultValue={data.company?.serviceAreas.join(', ')} placeholder={t('กรุงเทพมหานคร, นนทบุรี', 'Bangkok, Nonthaburi')} required /></label><label>{t('จำนวนคำขอสูงสุดต่อวัน', 'Maximum daily deliveries')}<input name="dailyLimit" type="number" min={0} max={100} defaultValue={data.company?.dailyLimit ?? 2} required /></label><label className="installer-check"><input name="paused" type="checkbox" defaultChecked={data.company?.paused} />{t('พักรับคำขอ', 'Pause deliveries')}</label><p>{t('รับคำขอที่อยู่อาศัยแบบแชร์เท่านั้น สูงสุด 3 บริษัทต่อคำขอ', 'Shared residential enquiries only, with at most three receiving companies per enquiry.')}</p><button disabled={busy || !data.session.user.emailVerified} className="installer-primary">{t('บันทึกข้อมูลบริษัท', 'Save company')}</button></form><h3>LINE</h3><p>{data.company?.lineLinked ? t('เชื่อมต่อแล้ว', 'Connected') : t('ยังไม่เชื่อมต่อ', 'Not connected')}</p><button disabled={busy || !data.integrations.lineConfigured || data.company?.approvalStatus !== 'approved'} onClick={() => action({ action: 'link-line' })}>{t('เชื่อมต่อ LINE อย่างปลอดภัย', 'Connect LINE securely')}</button>{data.company?.lineLinked && <><button disabled={busy} onClick={() => action({ action: 'unlink-line' })}>{t('ยกเลิกการเชื่อมต่อ LINE', 'Disconnect LINE')}</button><p>{t('การยกเลิกจะหยุดการแจ้งเตือนใหม่ผ่าน LINE และยกเลิกลิงก์เชื่อมต่อที่รอดำเนินการ ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้', 'Disconnecting stops new LINE notifications and invalidates pending link invitations. Unsent notifications remain for operator review. You can reconnect later.')}</p></>}</section> : null}
      {view === 'credits' && <>
        <div className="installer-credits-grid"><CreditBalance data={data} en={en} /><section className="installer-package-list" aria-label={t('แพ็กเกจเครดิต', 'Credit packages')}>
          {data.packages.map((pack) => <div className="installer-package" key={pack.id}><p className="installer-eyebrow">{t('แพ็กเกจเครดิต', 'CREDIT PACKAGE')}</p><h2>{en ? pack.nameEn : pack.nameTh}</h2><div className="installer-package-price"><strong>{pack.credits} {t('เครดิต', 'credits')}</strong><span>{money(pack.amountMinor, pack.currency, en)}</span></div><p>{pack.taxLabel}</p><div className="installer-package-actions">{data.integrations.paymentMethods.map((method) => <button className="installer-primary" disabled={busy || !data.integrations.paymentsEnabled || data.company?.approvalStatus !== 'approved'} key={method} onClick={() => action({ action: 'checkout', packageId: pack.id, method })}>{t('ชำระผ่าน', 'Pay with')} {method}</button>)}</div></div>)}
          {!data.packages.length && <div className="installer-package"><h2>{t('แพ็กเกจเครดิต', 'Credit packages')}</h2><p>{t('ยังไม่มีแพ็กเกจให้เลือกในขณะนี้', 'No packages are currently available.')}</p></div>}
          {!data.integrations.paymentsEnabled && <p className="installer-muted">{t('ยังไม่เปิดรับชำระเงิน', 'Payments are not enabled.')}</p>}
        </section></div>
        <p className="installer-muted">{t('1 เครดิตมีมูลค่า ฿200 · คำขอแบบแชร์ใช้ 2 เครดิต · ไม่มีการเรียกเก็บเงินอัตโนมัติ', 'One credit has a commercial value of ฿200. A shared enquiry uses two credits. No automatic billing.')}</p>
        <section className="installer-card installer-activity"><h2>{t('รายการเครดิต', 'Credit transactions')}</h2>{!data.ledger.length && <p className="installer-muted">{t('ยังไม่มีรายการเครดิต', 'No credit activity yet.')}</p>}{data.ledger.map((entry) => <div className="installer-row" key={entry.id}><div><strong>{statusLabel(entry.kind, en)}</strong><p>{entry.reason}</p><small>{date(entry.createdAt, en)}</small></div><span className={'installer-transaction-value' + (entry.units > 0 ? ' is-positive' : '')}>{entry.units > 0 ? '+' : ''}{entry.units} {t('เครดิต', 'cr')}</span></div>)}</section>
        <details className="installer-card installer-orders"><summary>{t('ประวัติการซื้อ', 'Purchase history')}<span>{data.orders.length}</span></summary>{!data.orders.length && <p>{t('ยังไม่มีรายการซื้อ', 'No purchases yet.')}</p>}{data.orders.map((order) => <div className="installer-row" key={order.id}><div><strong>{money(order.amountMinor, order.currency, en)}</strong><p>{statusLabel(order.status, en)} · {date(order.createdAt, en)}</p><small>{order.receiptReference || order.id}</small></div><button disabled={busy} onClick={() => action({ action: 'reconcile-order', orderId: order.id })}>{t('ตรวจสอบสถานะ', 'Check status')}</button></div>)}</details>
      </>}
      {view === 'claims' && <section className="installer-card"><h2>{t('คำร้องคืนเครดิต', 'Credit claims')}</h2><p>{t('ยื่นคำร้องจากหน้าคำขอภายใน 7 วันนับจากพร้อมใช้ในพอร์ทัล การคืนเครดิตแยกจากการคืนเงินสด', 'Submit from an enquiry page within seven days of portal availability. Credit restoration is separate from a cash refund.')}</p>{!data.claims.length && <p>{t('ยังไม่มีคำร้อง', 'No claims yet.')}</p>}{data.claims.map((claim) => <div className="installer-row" key={claim.id}><div><strong>{statusLabel(claim.reason, en)}</strong><p>{statusLabel(claim.status, en)} · {date(claim.submittedAt, en)}</p>{claim.decision && <p>{claim.decision}</p>}</div><a href={'/installers/enquiry/' + claim.deliveryId + '?lang=' + (en ? 'en' : 'th')}>{t('เปิดคำขอ', 'Open enquiry')}</a></div>)}</section>}
      {view === 'terms' && <section className="installer-card"><h2>{t('ข้อตกลงผู้ติดตั้ง', 'Installer terms')}</h2><p>{data.terms.version}</p><div className="installer-terms">{en ? data.terms.textEn : data.terms.textTh}</div>{data.terms.acceptedAt ? <p>{t('ยอมรับเมื่อ', 'Accepted')}: {date(data.terms.acceptedAt, en)}</p> : <button disabled={busy || !data.company} className="installer-primary" onClick={() => action({ action: 'accept-terms', version: data.terms.version })}>{t('ยอมรับข้อตกลงฉบับนี้', 'Accept these terms')}</button>}</section>}
      </>}
    </>}
    <footer className="installer-footer">{t('SolarMatch ให้ข้อมูลประเมินเบื้องต้น ผู้ติดตั้งเป็นผู้เสนอราคา ทำสัญญา และรับประกันงาน', 'SolarMatch provides a preliminary assessment. The installer provides the quotation, contract and warranties.')}<span>{t('เวลาที่แสดงเป็นเวลาประเทศไทย', 'All times are Bangkok time')}</span></footer>
    </div>
  </main>;
}
function date(value: string, en: boolean) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(en ? 'en-GB' : 'th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }); }
function money(amount: number, currency: string, en: boolean) { return new Intl.NumberFormat(en ? 'en-GB' : 'th-TH', { style: 'currency', currency }).format(amount / 100); }
function statusLabel(value: string, en: boolean) {
  if (value === 'withdrawn-claim') return en ? 'Claim for withdrawn enquiry — personal details hidden' : 'คำร้องสำหรับคำขอที่ถอนแล้ว — ไม่แสดงข้อมูลส่วนบุคคล';
  if (['shared-residential', 'shared_residential'].includes(value)) return sharedResidentialLabel(en);
  value = value.replaceAll('_', '-');
  if (value === 'action-required') return en ? 'Operator action required' : 'ต้องให้ผู้ดูแลดำเนินการ';
  const extra: Record<string, [string, string]> = { submitted: ['ส่งคำร้องแล้ว', 'Submitted'], 'needs-information': ['ต้องการข้อมูลเพิ่มเติม', 'More information needed'], authorizing: ['กำลังอนุมัติการชำระเงิน', 'Authorizing payment'], reversed: ['ยกเลิกยอดชำระแล้ว', 'Payment reversed'], 'trial-grant': ['ได้รับสิทธิ์ทดลอง', 'Trial allowance granted'], 'claim-restoration': ['คืนเครดิตตามคำร้อง', 'Claim credit restoration'], 'payment-reversal': ['หักเครดิตจากการคืนเงิน', 'Payment credit reversal'], reservation: ['สำรองเครดิต', 'Credit reservation'], release: ['คืนเครดิตที่สำรอง', 'Reserved credits released'] };
  if (extra[value]) return extra[value][en ? 1 : 0];
  const outcomes: Record<string, [string, string]> = { open: ['อยู่ระหว่างดำเนินการ', 'In progress'], won: ['ตกลงซื้อ', 'Sale agreed'], lost: ['ไม่ได้งาน', 'Not won'], 'not-suitable': ['ไม่เหมาะสม', 'Not suitable'] };
  if (outcomes[value]) return outcomes[value][en ? 1 : 0];
  const labels: Record<string, [string, string]> = { approved: ['อนุมัติแล้ว', 'Approved'], pending: ['รอตรวจสอบ', 'Pending'], rejected: ['ไม่อนุมัติ', 'Rejected'], paid: ['ชำระแล้ว', 'Paid'], failed: ['ไม่สำเร็จ', 'Failed'], cancelled: ['ยกเลิก', 'Cancelled'], refunded: ['คืนเงินแล้ว', 'Refunded'], 'shared-residential': ['คำขอที่อยู่อาศัยแบบแชร์', 'Shared residential'], 'incorrect-contact': ['ข้อมูลติดต่อไม่ถูกต้อง', 'Incorrect contact details'], duplicate: ['คำขอซ้ำ', 'Duplicate'], 'outside-criteria': ['นอกเกณฑ์ที่ตกลง', 'Outside agreed criteria'], 'no-request': ['ไม่ได้ขอให้ติดต่อ', 'No contact request'], withdrawn: ['ไม่ต้องการใบเสนอราคาแล้ว', 'No longer wants quotes'], contacted: ['ติดต่อแล้ว', 'Contacted'], quoted: ['เสนอราคาแล้ว', 'Quoted'], won: ['ตกลงซื้อ', 'Sale agreed'], 'not-interested': ['ไม่สนใจ', 'Not interested'], unreachable: ['ยังติดต่อไม่ได้', 'Unreachable'], restored: ['คืนเครดิตแล้ว', 'Credits restored'], purchase: ['ซื้อเครดิต', 'Credit purchase'], delivery: ['รับคำขอ', 'Enquiry delivery'], restoration: ['คืนเครดิต', 'Credit restoration'] };
  return labels[value]?.[en ? 1 : 0] || (en ? value.replaceAll('-', ' ').replaceAll('_', ' ') : value);
}
function portalErrorMessage(status:number,code:string|undefined,en:boolean) {
  if(status===429)return en?'Too many attempts. Please wait a moment and try again.':'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if(status===401)return en?'Please sign in with a verified email account to continue.':'กรุณาเข้าสู่ระบบด้วยบัญชีที่ยืนยันอีเมลแล้ว';
  if(status===403)return en?'Only the company account owner can make this change.':'เฉพาะเจ้าของบัญชีบริษัทเท่านั้นที่ทำรายการนี้ได้';
  if(code==='claim_window_closed')return en?'The claim submission window has closed for this enquiry.':'พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว';
  if(status>=500)return en?'The service is temporarily unavailable. Please try again later.':'ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
  return en?'Unable to complete this request. Check the company status, details and accepted terms, then try again.':'ทำรายการไม่สำเร็จ กรุณาตรวจสอบสถานะบริษัท ข้อมูล และการยอมรับข้อตกลง แล้วลองใหม่';
}
