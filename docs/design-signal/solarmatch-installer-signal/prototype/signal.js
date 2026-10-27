/* SolarMatch for installers · Signal (handoff prototype)
   Vanilla JS, hash routes (bare tokens), EN + TH copy, fictional data.
   Website routes: landing signin apply forgot reset
   Portal routes:  inbox eNN credits company claims terms
   Demo states: the select in the dark bar, or SM.state('pending') in the console.
   Port the markup, classes and copy; the real data and actions come from InstallerPortalData. */
(function () {
  'use strict';
  var root = document.getElementById('app');

  /* ---------- icons (same stroke set as the repo's lucide icons) ---------- */
  var P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    phone: '<path d="M5.5 4h3.3l1.7 4.3-2.2 1.4a10.5 10.5 0 0 0 4.9 4.9l1.4-2.2 4.3 1.7v3.3a1.8 1.8 0 0 1-1.9 1.8C10.6 19.2 4.8 13.4 3.7 5.9A1.8 1.8 0 0 1 5.5 4z"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    inbox: '<path d="M3.5 13.5 6 6.2A2 2 0 0 1 7.9 5h8.2A2 2 0 0 1 18 6.2l2.5 7.3V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-4.5z"/><path d="M3.5 13.5H8l1 2.3h6l1-2.3h4.5"/>',
    wallet: '<path d="M4 8V6.8A2.3 2.3 0 0 1 6.3 4.5H17v3.5"/><rect x="3.5" y="8" width="17" height="11.5" rx="2.5"/><path d="M16 13.8h2"/>',
    building: '<path d="M5 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9.5h3a1 1 0 0 1 1 1v10M3 20.5h18M9 7.5h2M9 11.5h2M9 15.5h2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.8v5M12 16.2h.01"/>', info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8h.01"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>', chev: '<path d="m9 6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>'
  };
  function ic(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; }
  var LOGO = '<svg class="logo" viewBox="0 0 64 56" aria-hidden="true"><g fill="#E2A62B"><path d="M32 0 27.5 8h9L32 0Z"/><path d="m15.5 6.5 1.2 9 7.7-4.5-8.9-4.5Z"/><path d="m48.5 6.5-8.9 4.5 7.7 4.5 1.2-9Z"/><path d="M3 24.5 11.5 29v-9L3 24.5Z"/><path d="m61 24.5-8.5-4.5v9l8.5-4.5Z"/><path d="m9 41 9-1.1-4.5-7.8L9 41Z"/><path d="m55 41-4.5-8.9-4.5 7.8L55 41Z"/></g><path d="M15 37a20.5 20.5 0 1 1 34 0" fill="none" stroke="#E2A62B" stroke-width="6"/><path d="M10 53 39 30M54 53 25 30" fill="none" stroke="#137A50" stroke-linecap="square" stroke-width="6"/></svg>';

  /* ---------- copy: EN + TH (Thai is a draft for native review) ---------- */
  var COPY = {
    en: {
      title: 'SolarMatch for installers', brandSub: 'FOR INSTALLERS', skip: 'Skip to content',
      navMain: 'Main', navHow: 'How it works', navPrice: 'Pricing', navFaq: 'Questions', signIn: 'Sign in', apply: 'Apply', langTh: 'Switch to Thai', langEn: 'Switch to English',
      eyebrow: 'For solar installers · Bangkok & nearby', h1: 'Homeowners who already know their numbers.',
      lede: 'Each enquiry arrives with the bill, the home and the timeframe, from someone who asked to be called.',
      applyLong: 'Apply as an installer', unavailable: 'Applications unavailable',
      exNew: 'New enquiry', exNow: 'just now', exTag: 'Example', exLabel: 'Example enquiry', callName: 'Call {name}',
      fPrice: 'per enquiry', fCos: 'companies at most', fFree: 'free to start', fDays: '{n} days', fClaim: 'to claim wrong details', fNote: 'Draft terms. No subscription and no automatic billing.',
      howEyebrow: 'How it works', howH: 'From approval to first call.',
      s1t: 'Apply', s1p: 'Tell us your company and the provinces you cover.', s2t: 'Get LINE alerts', s2p: 'New enquiries reach your phone straight away.', s3t: 'Call and track', s3p: 'One tap to call. One tap to record how it went.',
      faqH: 'Commonly asked questions', photoAlt: 'Solar panels on a tiled roof beside palm trees',
      q1: 'What do I pay?', a1: '฿400 (2 credits) for each enquiry you receive. No subscription and no automatic top-ups. Your first 2 enquiries are free after approval.',
      q2: 'How many other companies get the same homeowner?', a2: 'At most 2 others. A homeowner never reaches more than 3 companies.',
      q3: 'What if the details are wrong?', a3: 'Ask for a credit review within 7 days if the number is wrong or unreachable, or the request didn’t come from the homeowner. No answer or no sale doesn’t qualify on its own. Claims are reviewed; a credit restoration is not a cash refund.',
      q4: 'Can I pause?', a4: 'Yes. Turn off “Accepting enquiries” at any time. Nothing is sent or charged while you’re paused.',
      q5: 'Is a sale guaranteed?', a5: 'No. A shared enquiry is a request for contact, not a guaranteed sale. You provide your own advice, quotation and installation agreement.',
      footTag: 'Enquiries from Bangkok homeowners who asked to be called.', footInst: 'Installers', footSm: 'SolarMatch', homeSite: 'Homeowner site', privacy: 'Privacy Notice', terms: 'Terms of use', footFine: 'Pre-launch preview. Draft terms.',
      /* auth (existing strings kept word for word) */
      aSignin: 'Sign in', aRegister: 'Create account', aRecover: 'Recover account', aReset: 'Set a new password',
      aName: 'Your name', aEmail: 'Email', aPass: 'Password (at least 12 characters)', aGo: 'Continue', aWorking: 'Working…',
      aHave: 'Already have an account', aCreate: 'Create a company account', aForgot: 'Forgot password', aBack: 'Back to sign in', aClose: 'Close',
      aNote: 'Verify your email before using your account. Companies are reviewed before receiving enquiries. The trial does not start automatic billing.',
      aSentH: 'Check your email', aSentReg: 'We sent a link to {email}. Open it to verify your account, then sign in.', aSentRec: 'Check your email to continue if this account exists.',
      aDemo: 'Demo: continue as a new company',
      /* portal chrome */
      navEnq: 'Enquiries', navCredits: 'Credits', navCompany: 'Company', portalNav: 'Portal', acctMenu: 'Account menu', language: 'Language', signOut: 'Sign out',
      stOn: 'Accepting enquiries', stOff: 'Paused', stPlatform: 'Paused by SolarMatch', stReview: 'Under review', stSetup: 'Set up company', swLabel: 'Accepting enquiries',
      toastOn: 'Accepting new enquiries again.', toastOff: 'Paused. No new enquiries until you turn this back on.',
      /* notices: one at a time, highest priority first */
      nVerify: 'Verify your email to manage your company. We sent a link to {email}.',
      nTerms: 'Accept the current installer terms to receive enquiries.', nTermsBtn: 'Review terms',
      nPlatform: 'New deliveries are paused by SolarMatch. Your preference does not override this.',
      nDebt: '{n} credits owed. New enquiries are on hold until this is cleared.', nEmpty: 'Out of credits. Top up to keep receiving enquiries.', topUp: 'Top up',
      /* inbox */
      enqTitle: 'Enquiries', segWaiting: 'Waiting', segActive: 'Active', segClosed: 'Closed', filter: 'Filter enquiries', search: 'Search', searchPh: 'Search name, area or reference',
      pillWaiting: 'Waiting', pillTrial: 'Free trial', withdrawnName: 'Access withdrawn',
      emptyWaiting: 'No one waiting. New enquiries appear here and in LINE.', emptyPaused: 'You’re paused. Turn on “Accepting enquiries” to receive new ones.', emptyNone: 'Nothing here yet.', emptySearch: 'No match. Try another name, area or reference.',
      emptyNew: 'No enquiries yet. They appear here and in LINE once you’re accepting.', pickOne: 'Choose an enquiry to see the details.',
      /* detail */
      back: 'Enquiries', waitingFor: 'Waiting {t}', receivedAgo: 'Received {t} ago', copy: 'Copy', copied: 'Number copied', 
      copyFail: 'Automatic copy failed. Select the number to copy manually.', copyField: 'Number to copy', demoCall: 'Demo: this would call {n}',
      fBill: 'monthly bill', fUse: 'monthly use', fAc: 'air-conditioners', fOwn: 'ownership', fWhen: 'timeframe', kwh: '{n} kWh',
      progress: 'Progress', stageGroup: 'Set the stage', closeBtn: 'Close', closeAs: 'Close as', closedLine: 'Closed as “{s}”. Tap a stage to reopen.', wonLine: 'Sale agreed. Tap a stage to change it.',
      notesL: 'Notes for your team', notesPh: 'Only record information necessary for this enquiry', notesAuto: 'Saved automatically.', notesSaving: 'Saving…', notesSaved: 'Saved {t}',
      notesConflict: 'Someone else changed these notes. Reload to see the latest version.', notesLocked: 'Verify your email to edit notes.',
      more: 'More about the home', mHome: 'Home', mUse: 'Daytime use', mLoads: 'Appliances', mRoof: 'Roof', mShade: 'Shade', mProject: 'Project',
      share: 'Share with a team member', shareP: 'Anyone with the link can read this enquiry. Forward only to staff handling it for your company. It does not verify the viewer’s identity and can be forwarded again.',
      shareMake: 'Create link', shareNew: 'Create replacement link', shareRevoke: 'Revoke link', shareField: 'Staff access link', shareCopy: 'Copy link', shareMade: 'Link created', shareGone: 'Link revoked', linkCopied: 'Link copied',
      problem: 'Problem with this enquiry?', claimH: 'Credit claim', claimBy: 'Submit by {d}.', claimRule: 'No answer or no purchase does not automatically make an enquiry invalid.',
      claimReason: 'Reason', claimInfo: 'Supporting information', claimGo: 'Submit claim', claimClosed: 'The claim submission window has closed for this enquiry.', claimSent: 'Claim submitted',
      r1: 'Incorrect contact details', r2: 'Duplicate', r3: 'Outside agreed criteria', r4: 'No contact request', r5: 'Withdrawn',
      metaPaid: 'Available in portal {d} · {n} credits · up to {o} other companies may also call', metaTrial: 'Available in portal {d} · Free trial · up to {o} other companies may also call',
      wdH: 'Access withdrawn', wdP: 'Access withdrawn or suppressed. Do not contact the homeowner about this enquiry. Personal details and staff links are unavailable. The financial record remains, and eligible claims can be submitted within the original deadline.',
      /* review checklist */
      rvEyebrow: 'Your application', rvH: 'We’re reviewing your company.', rvP: 'Enquiries start after approval. You can finish the steps below in the meantime.',
      suEyebrow: 'Welcome', suH: 'Set up your company.', suP: 'Add your details and service areas. We review every company before enquiries start.',
      ck1: 'Verify email', ck2: 'Company details', ck3: 'Service areas', ck4: 'Accept installer terms', ck5: 'Connect LINE alerts', ck6: 'SolarMatch approval', optional: 'Optional',
      ckAdd: 'Add', ckReview: 'Review', ckAfter: 'After approval', ckInReview: 'In review', ckStart: 'Add company details',
      /* credits */
      crTitle: 'Credits', crAvail: 'Available', crUnit: 'credits', crEnough: 'Enough for {n} enquiries', crTrial: '{n} free trial left', crTrials: '{n} free trials left', crRes: '{n} reserved', crOwe: '{n} owed',
      crDebtP: 'New deliveries are blocked until this debt is cleared. Purchased credits and purchased-credit restorations offset debt first; only the remainder becomes available. Trial entitlements are separate.',
      pkgCredits: '{n} credits', pkgEach: '{n} enquiries at ฿400 each', payWith: 'Pay with {m}', paySoon: 'Online payment opens soon. You won’t be charged.', payAfter: 'Available after approval.',
      payRule: 'Credits are charged when an enquiry becomes available in the portal—not again when you open it or call. No automatic top-up.',
      qrH: 'Scan to pay', qrAlt: 'Payment QR code', qrP: 'Credits are issued after provider confirmation. Check the purchase history for payment status.', checkStatus: 'Check status', stillPending: 'Still waiting for payment',
      stmt: 'Statement', stEnq: 'Enquiry {r}', stBuy: 'Credit purchase · {n} credits', stTrialGrant: 'Trial allowance · {n} free enquiries', stTrialUse: 'Enquiry {r} · Free trial', stRestore: 'Claim restoration · {r}', free: 'Free',
      oPaid: 'Paid', oPending: 'Pending',
      /* company */
      coTitle: 'Company', coSetupTitle: 'Set up your company', areas: 'Service areas', areasN: '{n} selected', addArea: 'Add another province or area', areaPh: 'Province or area', addBtn: 'Add', removeArea: 'Remove {a}', areasNone: 'Choose at least one area',
      perDay: 'Enquiries per day', fewer: 'Fewer enquiries per day', moreDay: 'More enquiries per day', zeroDay: '0 pauses new deliveries.',
      lineH: 'LINE alerts', lineP: 'New enquiries in LINE, straight away.', lineConnect: 'Connect', lineOn: 'Connected', lineOff: 'Disconnect', lineAfter: 'Available after approval.',
      lineWarn: 'Disconnecting stops new LINE notifications and invalidates pending link invitations. Unsent notifications remain for operator review. You can reconnect later.', lineConfirm: 'Disconnect LINE', cancel: 'Cancel',
      details: 'Company details', coName: 'Company name', coContact: 'Contact name', coPhone: 'Company phone', create: 'Create company',
      unsaved: 'Unsaved changes', saveCh: 'Save changes', saved: 'Saved', claimsLink: 'Credit claims', termsLink: 'Installer terms', accepted: 'Accepted {d}', actionNeeded: 'Action needed',
      /* claims + terms */
      clTitle: 'Credit claims', clP: 'Submit from an enquiry page within seven days of portal availability. Credit restoration is separate from a cash refund.', clNone: 'No claims yet.', openEnq: 'Open enquiry',
      clSubmitted: 'Submitted', clApproved: 'Approved · 2 credits restored', clWdReason: 'Claim for withdrawn enquiry — personal details hidden',
      tmTitle: 'Installer terms', tmVersion: 'Version {v}', tmAccept: 'Accept these terms', tmAccepted: 'Accepted: {d}', tmDone: 'Terms accepted',
      fine1: 'SolarMatch provides a preliminary assessment. The installer provides the quotation, contract and warranties.', fine2: 'All times are Bangkok time',
      backCompany: 'Company', demoSaved: 'Saved', demoLine: 'LINE connected (demo)', demoOut: 'Signed out (demo)'
    },
    th: {
      title: 'SolarMatch สำหรับผู้ติดตั้ง', brandSub: 'สำหรับผู้ติดตั้ง', skip: 'ข้ามไปยังเนื้อหา',
      navMain: 'เมนูหลัก', navHow: 'วิธีการทำงาน', navPrice: 'ราคา', navFaq: 'คำถาม', signIn: 'เข้าสู่ระบบ', apply: 'สมัคร', langTh: 'Switch to Thai', langEn: 'Switch to English',
      eyebrow: 'สำหรับผู้ติดตั้งโซลาร์ · กรุงเทพฯ และปริมณฑล', h1: 'ลูกค้าที่รู้ตัวเลขของตัวเองมาแล้ว',
      lede: 'ทุกคำขอมาพร้อมค่าไฟ ข้อมูลบ้าน และช่วงเวลาที่ต้องการติดตั้ง จากเจ้าของบ้านที่ขอให้ติดต่อกลับเอง',
      applyLong: 'สมัครเป็นผู้ติดตั้ง', unavailable: 'ยังไม่เปิดรับสมัคร',
      exNew: 'คำขอใหม่', exNow: 'เมื่อสักครู่', exTag: 'ตัวอย่าง', exLabel: 'ตัวอย่างคำขอ', callName: 'โทรหา{name}',
      fPrice: 'ต่อคำขอ', fCos: 'บริษัทสูงสุด', fFree: 'คำขอฟรีเริ่มต้น', fDays: '{n} วัน', fClaim: 'ยื่นเคลมข้อมูลผิด', fNote: 'ร่างข้อตกลง ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ',
      howEyebrow: 'วิธีการทำงาน', howH: 'จากอนุมัติถึงสายแรก',
      s1t: 'สมัคร', s1p: 'บอกข้อมูลบริษัทและจังหวัดที่คุณให้บริการ', s2t: 'รับแจ้งเตือนทาง LINE', s2p: 'คำขอใหม่ส่งถึงโทรศัพท์ของคุณทันที', s3t: 'โทรและติดตามผล', s3p: 'แตะเดียวเพื่อโทร แตะเดียวเพื่อบันทึกผล',
      faqH: 'คำถามที่พบบ่อย', photoAlt: 'แผงโซลาร์บนหลังคากระเบื้องข้างต้นปาล์ม',
      q1: 'ต้องจ่ายเท่าไร?', a1: '฿400 (2 เครดิต) ต่อคำขอที่ได้รับ ไม่มีค่าสมาชิกและไม่มีการเติมเครดิตอัตโนมัติ คำขอ 2 รายการแรกฟรีหลังได้รับอนุมัติ',
      q2: 'บริษัทอื่นได้รับเจ้าของบ้านรายเดียวกันกี่แห่ง?', a2: 'ไม่เกินอีก 2 แห่ง เจ้าของบ้านหนึ่งรายจะถูกส่งต่อให้บริษัทไม่เกิน 3 แห่ง',
      q3: 'ถ้าข้อมูลไม่ถูกต้องทำอย่างไร?', a3: 'ขอตรวจสอบเพื่อคืนเครดิตได้ภายใน 7 วัน หากเบอร์ผิดหรือติดต่อไม่ได้ หรือคำขอไม่ได้มาจากเจ้าของบ้าน การไม่รับสายหรือไม่ซื้อเพียงอย่างเดียวไม่เข้าเงื่อนไข คำร้องต้องผ่านการตรวจสอบ การคืนเครดิตไม่ใช่การคืนเงินสด',
      q4: 'พักรับคำขอได้ไหม?', a4: 'ได้ ปิด “รับคำขอใหม่” ได้ทุกเมื่อ ระหว่างพักจะไม่มีการส่งคำขอหรือคิดเครดิต',
      q5: 'รับประกันว่าจะขายได้หรือไม่?', a5: 'ไม่รับประกัน คำขอแบบแชร์เป็นคำขอรับการติดต่อ ไม่ใช่ยอดขายที่รับประกัน บริษัทของคุณเป็นผู้ให้คำแนะนำ ใบเสนอราคา และสัญญาติดตั้งเอง',
      footTag: 'คำขอจากเจ้าของบ้านในกรุงเทพฯ ที่ขอให้ติดต่อกลับ', footInst: 'ผู้ติดตั้ง', footSm: 'SolarMatch', homeSite: 'เว็บไซต์เจ้าของบ้าน', privacy: 'ประกาศความเป็นส่วนตัว', terms: 'ข้อกำหนดการใช้งาน', footFine: 'ตัวอย่างก่อนเปิดบริการ ร่างข้อตกลง',
      aSignin: 'เข้าสู่ระบบ', aRegister: 'สร้างบัญชี', aRecover: 'กู้คืนบัญชี', aReset: 'ตั้งรหัสผ่านใหม่',
      aName: 'ชื่อผู้ติดต่อ', aEmail: 'อีเมล', aPass: 'รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)', aGo: 'ดำเนินการต่อ', aWorking: 'กำลังดำเนินการ…',
      aHave: 'มีบัญชีแล้ว', aCreate: 'สร้างบัญชีบริษัท', aForgot: 'ลืมรหัสผ่าน', aBack: 'กลับไปเข้าสู่ระบบ', aClose: 'ปิด',
      aNote: 'ต้องยืนยันอีเมลก่อนใช้บัญชี บริษัทแต่ละแห่งจะได้รับการตรวจสอบก่อนเริ่มรับคำขอ ไม่มีการเรียกเก็บเงินอัตโนมัติหลังทดลอง',
      aSentH: 'ตรวจสอบอีเมลของคุณ', aSentReg: 'เราส่งลิงก์ไปที่ {email} แล้ว เปิดลิงก์เพื่อยืนยันบัญชี จากนั้นเข้าสู่ระบบ', aSentRec: 'ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ',
      aDemo: 'ตัวอย่าง: ไปต่อในฐานะบริษัทใหม่',
      navEnq: 'คำขอ', navCredits: 'เครดิต', navCompany: 'บริษัท', portalNav: 'เมนูพอร์ทัล', acctMenu: 'เมนูบัญชี', language: 'ภาษา', signOut: 'ออกจากระบบ',
      stOn: 'กำลังรับคำขอ', stOff: 'พักรับคำขอ', stPlatform: 'SolarMatch พักการส่งคำขอ', stReview: 'รอตรวจสอบ', stSetup: 'ตั้งค่าบริษัท', swLabel: 'รับคำขอใหม่',
      toastOn: 'เปิดรับคำขอใหม่แล้ว', toastOff: 'พักรับคำขอแล้ว จะไม่มีคำขอใหม่จนกว่าจะเปิดอีกครั้ง',
      nVerify: 'ยืนยันอีเมลเพื่อจัดการข้อมูลบริษัท เราส่งลิงก์ไปที่ {email} แล้ว',
      nTerms: 'ยอมรับข้อตกลงผู้ติดตั้งฉบับปัจจุบันเพื่อรับคำขอ', nTermsBtn: 'อ่านข้อตกลง',
      nPlatform: 'SolarMatch พักการส่งคำขอใหม่ การตั้งค่าของบริษัทไม่สามารถเปลี่ยนสถานะนี้ได้',
      nDebt: 'ค้างชำระ {n} เครดิต ระงับการรับคำขอใหม่จนกว่าจะชำระยอดนี้', nEmpty: 'เครดิตหมดแล้ว เติมเครดิตเพื่อรับคำขอต่อ', topUp: 'เติมเครดิต',
      enqTitle: 'คำขอ', segWaiting: 'รอติดต่อ', segActive: 'ดำเนินการ', segClosed: 'ปิดแล้ว', filter: 'กรองคำขอ', search: 'ค้นหา', searchPh: 'ค้นหาชื่อ พื้นที่ หรือเลขอ้างอิง',
      pillWaiting: 'รอติดต่อ', pillTrial: 'ทดลองฟรี', withdrawnName: 'ถอนสิทธิ์แล้ว',
      emptyWaiting: 'ไม่มีคำขอที่รอติดต่อ คำขอใหม่จะแสดงที่นี่และใน LINE', emptyPaused: 'คุณพักรับคำขออยู่ เปิด “รับคำขอใหม่” เพื่อรับคำขอใหม่', emptyNone: 'ยังไม่มีรายการ', emptySearch: 'ไม่พบคำขอ ลองค้นหาด้วยชื่อ พื้นที่ หรือเลขอ้างอิงอื่น',
      emptyNew: 'ยังไม่มีคำขอ คำขอจะแสดงที่นี่และใน LINE เมื่อคุณเปิดรับคำขอ', pickOne: 'เลือกคำขอเพื่อดูรายละเอียด',
      back: 'คำขอ', waitingFor: 'รอมาแล้ว {t}', receivedAgo: 'ได้รับเมื่อ {t}ที่แล้ว', copy: 'คัดลอก', copied: 'คัดลอกเบอร์แล้ว', 
      copyFail: 'คัดลอกอัตโนมัติไม่ได้ เลือกหมายเลขเพื่อคัดลอกเอง', copyField: 'หมายเลขสำหรับคัดลอก', demoCall: 'ตัวอย่าง: จะโทรไปที่ {n}',
      fBill: 'ค่าไฟต่อเดือน', fUse: 'หน่วยไฟต่อเดือน', fAc: 'เครื่องปรับอากาศ', fOwn: 'ความเป็นเจ้าของ', fWhen: 'ช่วงเวลาติดตั้ง', kwh: '{n} หน่วย',
      progress: 'ความคืบหน้า', stageGroup: 'เลือกขั้นตอน', closeBtn: 'ปิดคำขอ', closeAs: 'ปิดคำขอเป็น', closedLine: 'ปิดเป็น “{s}” แตะขั้นตอนด้านบนเพื่อเปิดอีกครั้ง', wonLine: 'ตกลงซื้อแล้ว แตะขั้นตอนด้านบนเพื่อเปลี่ยน',
      notesL: 'บันทึกสำหรับทีม', notesPh: 'บันทึกเฉพาะข้อมูลที่จำเป็นต่อคำขอนี้', notesAuto: 'บันทึกอัตโนมัติ', notesSaving: 'กำลังบันทึก…', notesSaved: 'บันทึกแล้ว {t}',
      notesConflict: 'มีผู้อื่นแก้ไขบันทึกนี้ โหลดใหม่เพื่อดูฉบับล่าสุด', notesLocked: 'ยืนยันอีเมลเพื่อแก้ไขบันทึก',
      more: 'ข้อมูลเพิ่มเติมเกี่ยวกับบ้าน', mHome: 'ประเภทที่พักอาศัย', mUse: 'การใช้ไฟกลางวัน', mLoads: 'อุปกรณ์ที่มีในบ้าน', mRoof: 'หลังคา', mShade: 'ร่มเงา', mProject: 'ประเภทโครงการ',
      share: 'แชร์กับทีมงาน', shareP: 'ผู้ที่ได้รับลิงก์สามารถอ่านข้อมูลคำขอนี้ได้ ใช้สำหรับพนักงานที่ดูแลคำขอของบริษัทเท่านั้น ลิงก์ไม่ได้ยืนยันตัวตนผู้เปิดและสามารถส่งต่อได้',
      shareMake: 'สร้างลิงก์', shareNew: 'สร้างลิงก์ใหม่', shareRevoke: 'เพิกถอนลิงก์', shareField: 'ลิงก์สำหรับทีมงาน', shareCopy: 'คัดลอกลิงก์', shareMade: 'สร้างลิงก์แล้ว', shareGone: 'เพิกถอนลิงก์แล้ว', linkCopied: 'คัดลอกลิงก์แล้ว',
      problem: 'คำขอมีปัญหาหรือไม่?', claimH: 'คำร้องคืนเครดิต', claimBy: 'ยื่นได้ถึง {d}', claimRule: 'การไม่รับสายหรือไม่ซื้อ ไม่ถือเป็นคำขอที่ไม่ถูกต้องโดยอัตโนมัติ',
      claimReason: 'เหตุผล', claimInfo: 'ข้อมูลสนับสนุน', claimGo: 'ส่งคำร้อง', claimClosed: 'พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว', claimSent: 'ส่งคำร้องแล้ว',
      r1: 'ข้อมูลติดต่อไม่ถูกต้อง', r2: 'คำขอซ้ำ', r3: 'นอกเกณฑ์', r4: 'ไม่ได้ขอให้ติดต่อ', r5: 'ถอนคำขอแล้ว',
      metaPaid: 'พร้อมใช้ในพอร์ทัล {d} · {n} เครดิต · อาจมีบริษัทอื่นติดต่ออีกไม่เกิน {o} แห่ง', metaTrial: 'พร้อมใช้ในพอร์ทัล {d} · ทดลองฟรี · อาจมีบริษัทอื่นติดต่ออีกไม่เกิน {o} แห่ง',
      wdH: 'ถอนสิทธิ์แล้ว', wdP: 'ถอนหรือระงับสิทธิ์เข้าถึงข้อมูลแล้ว ห้ามติดต่อเจ้าของบ้านจากคำขอนี้ ข้อมูลส่วนบุคคลและลิงก์ทีมงานไม่พร้อมใช้งาน บันทึกการคิดเครดิตยังคงอยู่ และสามารถยื่นคำร้องได้ภายในกำหนดเดิม',
      rvEyebrow: 'ใบสมัครของคุณ', rvH: 'เรากำลังตรวจสอบบริษัทของคุณ', rvP: 'เริ่มรับคำขอได้หลังได้รับอนุมัติ ระหว่างนี้ทำขั้นตอนด้านล่างให้ครบได้เลย',
      suEyebrow: 'ยินดีต้อนรับ', suH: 'ตั้งค่าบริษัทของคุณ', suP: 'กรอกข้อมูลบริษัทและพื้นที่บริการ เราตรวจสอบทุกบริษัทก่อนเริ่มส่งคำขอ',
      ck1: 'ยืนยันอีเมล', ck2: 'ข้อมูลบริษัท', ck3: 'พื้นที่บริการ', ck4: 'ยอมรับข้อตกลงผู้ติดตั้ง', ck5: 'เชื่อมต่อ LINE', ck6: 'การอนุมัติจาก SolarMatch', optional: 'ไม่บังคับ',
      ckAdd: 'เพิ่ม', ckReview: 'อ่าน', ckAfter: 'หลังอนุมัติ', ckInReview: 'กำลังตรวจสอบ', ckStart: 'กรอกข้อมูลบริษัท',
      crTitle: 'เครดิต', crAvail: 'เครดิตพร้อมใช้', crUnit: 'เครดิต', crEnough: 'พอสำหรับ {n} คำขอ', crTrial: 'เหลือสิทธิ์ทดลองฟรี {n}', crTrials: 'เหลือสิทธิ์ทดลองฟรี {n}', crRes: 'สำรองไว้ {n}', crOwe: 'ค้างชำระ {n}',
      crDebtP: 'บริษัทจะยังรับคำขอใหม่ไม่ได้จนกว่าจะชำระยอดนี้ เครดิตที่ซื้อเพิ่มหรือได้รับคืนจะหักยอดค้างก่อน ส่วนที่เหลือจึงเป็นเครดิตพร้อมใช้ สิทธิ์ทดลองแยกจากยอดนี้',
      pkgCredits: '{n} เครดิต', pkgEach: '{n} คำขอ คำขอละ ฿400', payWith: 'ชำระผ่าน {m}', paySoon: 'การชำระเงินออนไลน์จะเปิดเร็วๆ นี้ ยังไม่มีการเรียกเก็บเงิน', payAfter: 'ใช้ได้หลังได้รับอนุมัติ',
      payRule: 'คิดเครดิตเมื่อคำขอพร้อมใช้ในพอร์ทัล ไม่คิดเพิ่มเมื่อเปิดดูหรือโทร ไม่มีการเติมเครดิตอัตโนมัติ',
      qrH: 'สแกนชำระเงิน', qrAlt: 'คิวอาร์โค้ดสำหรับชำระเงิน', qrP: 'เครดิตจะเข้าเมื่อผู้ให้บริการยืนยันการชำระเงินแล้ว ตรวจสอบสถานะในประวัติการซื้อ', checkStatus: 'ตรวจสอบสถานะ', stillPending: 'ยังรอการชำระเงิน',
      stmt: 'รายการเคลื่อนไหว', stEnq: 'รับคำขอ {r}', stBuy: 'ซื้อเครดิต · {n} เครดิต', stTrialGrant: 'ได้รับสิทธิ์ทดลอง · {n} คำขอฟรี', stTrialUse: 'รับคำขอ {r} · ทดลองฟรี', stRestore: 'คืนเครดิตตามคำร้อง · {r}', free: 'ฟรี',
      oPaid: 'ชำระแล้ว', oPending: 'รอชำระ',
      coTitle: 'บริษัท', coSetupTitle: 'ตั้งค่าบริษัทของคุณ', areas: 'พื้นที่บริการ', areasN: 'เลือก {n}', addArea: 'เพิ่มจังหวัดหรือพื้นที่อื่น', areaPh: 'ระบุจังหวัดหรือพื้นที่', addBtn: 'เพิ่ม', removeArea: 'ลบ {a}', areasNone: 'เลือกอย่างน้อยหนึ่งพื้นที่',
      perDay: 'จำนวนคำขอต่อวัน', fewer: 'ลดจำนวนคำขอต่อวัน', moreDay: 'เพิ่มจำนวนคำขอต่อวัน', zeroDay: '0 หมายถึงไม่รับคำขอใหม่',
      lineH: 'การแจ้งเตือน LINE', lineP: 'รับคำขอใหม่ใน LINE ทันที', lineConnect: 'เชื่อมต่อ', lineOn: 'เชื่อมต่อแล้ว', lineOff: 'ยกเลิกการเชื่อมต่อ', lineAfter: 'ใช้ได้หลังได้รับอนุมัติ',
      lineWarn: 'การยกเลิกจะหยุดการแจ้งเตือนใหม่ผ่าน LINE และยกเลิกลิงก์เชื่อมต่อที่รอดำเนินการ ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้', lineConfirm: 'ยกเลิกการเชื่อมต่อ LINE', cancel: 'ยกเลิก',
      details: 'ข้อมูลบริษัท', coName: 'ชื่อบริษัท', coContact: 'ชื่อผู้ติดต่อ', coPhone: 'โทรศัพท์บริษัท', create: 'สร้างบริษัท',
      unsaved: 'ยังไม่ได้บันทึก', saveCh: 'บันทึกการเปลี่ยนแปลง', saved: 'บันทึกแล้ว', claimsLink: 'คำร้องคืนเครดิต', termsLink: 'ข้อตกลงผู้ติดตั้ง', accepted: 'ยอมรับเมื่อ {d}', actionNeeded: 'ต้องดำเนินการ',
      clTitle: 'คำร้องคืนเครดิต', clP: 'ยื่นคำร้องจากหน้าคำขอภายใน 7 วันนับจากพร้อมใช้ในพอร์ทัล การคืนเครดิตแยกจากการคืนเงินสด', clNone: 'ยังไม่มีคำร้อง', openEnq: 'เปิดคำขอ',
      clSubmitted: 'ส่งคำร้องแล้ว', clApproved: 'อนุมัติแล้ว · คืน 2 เครดิต', clWdReason: 'คำร้องสำหรับคำขอที่ถอนแล้ว — ไม่แสดงข้อมูลส่วนบุคคล',
      tmTitle: 'ข้อตกลงผู้ติดตั้ง', tmVersion: 'ฉบับ {v}', tmAccept: 'ยอมรับข้อตกลงฉบับนี้', tmAccepted: 'ยอมรับเมื่อ: {d}', tmDone: 'ยอมรับข้อตกลงแล้ว',
      fine1: 'SolarMatch ให้ข้อมูลประเมินเบื้องต้น ผู้ติดตั้งเป็นผู้เสนอราคา ทำสัญญา และรับประกันงาน', fine2: 'เวลาที่แสดงเป็นเวลาประเทศไทย',
      backCompany: 'บริษัท', demoSaved: 'บันทึกแล้ว', demoLine: 'เชื่อมต่อ LINE แล้ว (ตัวอย่าง)', demoOut: 'ออกจากระบบแล้ว (ตัวอย่าง)'
    }
  };
  /* assessment values as the questionnaire returns them, with Thai labels */
  var VAL = {
    'Owner': 'เจ้าของ', 'Within 3 months': 'ภายใน 3 เดือน', '3–6 months': '3–6 เดือน', '6–12 months': '6–12 เดือน',
    'Detached house': 'บ้านเดี่ยว', 'Townhouse': 'ทาวน์เฮาส์', 'Large house': 'บ้านเดี่ยวขนาดใหญ่',
    'Concrete tiles': 'กระเบื้องคอนกรีต', 'Clay tiles': 'กระเบื้องดินเผา', 'Metal sheet': 'เมทัลชีท',
    'Almost none': 'แทบไม่มี', 'A little': 'มีเล็กน้อย', 'Some': 'มีบางส่วน',
    'High daytime use': 'ใช้ไฟกลางวันมาก', 'Moderate daytime use': 'ใช้ไฟกลางวันปานกลาง', 'Very high daytime use': 'ใช้ไฟกลางวันสูงมาก',
    'Air-con, water pump': 'แอร์, ปั๊มน้ำ', 'Air-con, home office': 'แอร์, ห้องทำงานที่บ้าน', 'Air-con, EV charging': 'แอร์, ชาร์จรถยนต์ไฟฟ้า', 'Air-con, pool pump, EV': 'แอร์, ปั๊มสระว่ายน้ำ, รถยนต์ไฟฟ้า', 'Air-con': 'แอร์',
    'New rooftop system': 'ติดตั้งระบบใหม่บนหลังคา', 'Solar with battery': 'โซลาร์พร้อมแบตเตอรี่'
  };
  /* stages: prototype key → real outcome value (report-outcome) */
  var ST = ['new', 'contacted', 'visit', 'quoted', 'won'];
  var STAGE = {
    en: { new: 'New', contacted: 'Contacted', visit: 'Site visit', quoted: 'Quote sent', won: 'Won', lost: 'Lost', notsuitable: 'Not suitable' },
    th: { new: 'ใหม่', contacted: 'ติดต่อแล้ว', visit: 'สำรวจหน้างาน', quoted: 'เสนอราคาแล้ว', won: 'ตกลงซื้อ', lost: 'ไม่ได้งาน', notsuitable: 'ไม่เหมาะสม' }
  };
  var STAGE_SHORT = { en: { new: 'New', contacted: 'Contacted', visit: 'Site visit', quoted: 'Quoted', won: 'Won' }, th: { new: 'ใหม่', contacted: 'ติดต่อแล้ว', visit: 'สำรวจ', quoted: 'เสนอราคา', won: 'ตกลงซื้อ' } };
  var NEXT = {
    en: { new: 'Mark as contacted', contacted: 'Site visit booked', visit: 'Quote sent', quoted: 'Mark as won' },
    th: { new: 'บันทึกว่าติดต่อแล้ว', contacted: 'นัดสำรวจหน้างานแล้ว', visit: 'ส่งใบเสนอราคาแล้ว', quoted: 'บันทึกว่าตกลงซื้อ' }
  };
  var PROV = [['bangkok', 'Bangkok', 'กรุงเทพมหานคร'], ['nonthaburi', 'Nonthaburi', 'นนทบุรี'], ['pathum-thani', 'Pathum Thani', 'ปทุมธานี'], ['samut-prakan', 'Samut Prakan', 'สมุทรปราการ'], ['samut-sakhon', 'Samut Sakhon', 'สมุทรสาคร'], ['nakhon-pathom', 'Nakhon Pathom', 'นครปฐม']];

  /* ---------- fictional data ---------- */
  var NOW = Date.UTC(2026, 9, 27, 3, 0); /* 27 Oct 2026, 10:00 Bangkok */
  var EMAIL = 'somchai@suriyasolar.co.th';
  var ENQ = [
    { id: 'e39', ref: 'SM-2610-039', name: ['Arun', 'อรุณ'], area: ['Prawet, Bangkok', 'ประเวศ, กรุงเทพมหานคร'], phone: '081 234 5678', mins: 12, bill: 7200, ac: 6, own: 'Owner', when: 'Within 3 months', home: 'Detached house', roof: 'Concrete tiles', shade: 'Almost none', use: 'High daytime use', loads: 'Air-con, water pump', project: 'New rooftop system', stage: 'new', paid: true },
    { id: 'e41', ref: 'SM-2610-041', name: ['Natee', 'นที'], area: ['Sathon, Bangkok', 'สาทร, กรุงเทพมหานคร'], phone: '089 876 5432', mins: 64, kwh: 620, ac: 5, own: 'Owner', when: '3–6 months', home: 'Townhouse', roof: 'Clay tiles', shade: 'A little', use: 'Moderate daytime use', loads: 'Air-con, home office', project: 'Solar with battery', stage: 'new', paid: false },
    { id: 'e36', ref: 'SM-2610-036', name: ['Kanya', 'กัญญา'], area: ['Bang Phli, Samut Prakan', 'บางพลี, สมุทรปราการ'], phone: '086 222 1199', mins: 190, bill: 8800, ac: 7, own: 'Owner', when: 'Within 3 months', home: 'Detached house', roof: 'Metal sheet', shade: 'Almost none', use: 'Very high daytime use', loads: 'Air-con, EV charging', project: 'New rooftop system', stage: 'new', paid: true },
    { id: 'e33', ref: 'SM-2610-033', name: ['Ploy', 'พลอย'], area: ['Bang Na, Bangkok', 'บางนา, กรุงเทพมหานคร'], phone: '086 555 0199', mins: 1560, bill: 9500, ac: 8, own: 'Owner', when: 'Within 3 months', home: 'Large house', roof: 'Metal sheet', shade: 'Almost none', use: 'Very high daytime use', loads: 'Air-con, pool pump, EV', project: 'New rooftop system', stage: 'contacted', paid: true },
    { id: 'e30', ref: 'SM-2610-030', name: ['Somsak', 'สมศักดิ์'], area: ['Pak Kret, Nonthaburi', 'ปากเกร็ด, นนทบุรี'], phone: '085 101 2020', mins: 2900, bill: 5400, ac: 4, own: 'Owner', when: '3–6 months', home: 'Detached house', roof: 'Concrete tiles', shade: 'Some', use: 'Moderate daytime use', loads: 'Air-con', project: 'New rooftop system', stage: 'visit', paid: true },
    { id: 'e28', ref: 'SM-2610-028', name: ['Wichai', 'วิชัย'], area: ['Mueang Samut Prakan, Samut Prakan', 'เมืองสมุทรปราการ, สมุทรปราการ'], phone: '082 300 4411', mins: 5800, bill: 5200, ac: 4, own: 'Owner', when: '6–12 months', home: 'Detached house', roof: 'Concrete tiles', shade: 'Some', use: 'Moderate daytime use', loads: 'Air-con', project: 'New rooftop system', stage: 'quoted', paid: false },
    { id: 'e25', ref: 'SM-2610-025', withdrawn: true, mins: 7400, stage: 'new', paid: true },
    { id: 'e22', ref: 'SM-2610-022', name: ['Malee', 'มาลี'], area: ['Lat Phrao, Bangkok', 'ลาดพร้าว, กรุงเทพมหานคร'], phone: '084 777 3300', mins: 11500, bill: 7800, ac: 6, own: 'Owner', when: 'Within 3 months', home: 'Detached house', roof: 'Concrete tiles', shade: 'Almost none', use: 'High daytime use', loads: 'Air-con, water pump', project: 'New rooftop system', stage: 'won', paid: true }
  ];
  /* ledger: [kind, ref/param, minutes ago, credit units] — sums to 10 available */
  var LEDGER = [['enq', 'SM-2610-039', 12, -2], ['trialUse', 'SM-2610-041', 64, 0], ['enq', 'SM-2610-036', 190, -2], ['enq', 'SM-2610-033', 1560, -2], ['enq', 'SM-2610-030', 2900, -2], ['trialUse', 'SM-2610-028', 5800, 0], ['enq', 'SM-2610-025', 7400, -2], ['buy', 20, 8200, 20], ['enq', 'SM-2610-022', 11500, -2], ['restore', 'SM-2610-019', 12900, 2], ['enq', 'SM-2610-019', 21000, -2], ['trialGrant', 2, 36000, 0]];
  var CLAIMS = [{ ref: 'SM-2610-025', id: 'e25', reason: 'wd', status: 'clSubmitted', mins: 7000 }, { ref: 'SM-2610-019', id: null, reason: 'r1', status: 'clApproved', mins: 14000 }];
  /* the real terms text (lib/installer/settings.ts) filled with the default settings */
  var TERMS = {
    en: 'SolarMatch supplies shared residential enquiries, not guaranteed sales. One enquiry may reach at most 3 companies through SolarMatch, including trials. One credit has a commercial value of ฿200; a shared enquiry costs 2 credits. The current package provides 20 credits for ฿4,000. [TAX TREATMENT TO BE CONFIRMED]. Approved companies may receive 2 free shared enquiries once, with no purchase or automatic billing. Delivery means availability in the receiving company\'s portal. Submit claims within 7 days of original availability; investigation may finish later. Credit restoration is separate from cash refund and never reopens a sharing slot. Staff links grant access to one enquiry and can be forwarded; they do not verify identity. Use personal information only for the permitted solar request, respect withdrawal and do not resell it. Exclusive sales remain disabled. Operator facts and final policies require review before launch.',
    th: 'SolarMatch ให้บริการคำขอที่อยู่อาศัยแบบแชร์ ไม่รับประกันยอดขาย คำขอหนึ่งส่งให้บริษัทได้สูงสุด 3 แห่งผ่าน SolarMatch รวมการทดลองฟรี 1 เครดิตมีมูลค่า 200 บาท คำขอแบบแชร์ใช้ 2 เครดิต แพ็กเกจปัจจุบันได้รับ 20 เครดิต ราคา 4,000 บาท [TAX TREATMENT TO BE CONFIRMED] บริษัทที่อนุมัติมีสิทธิ์ทดลองรับคำขอฟรี 2 รายการครั้งเดียว ไม่ต้องซื้อและไม่มีการเรียกเก็บเงินอัตโนมัติ การส่งมอบคือเวลาที่คำขอพร้อมใช้ในพอร์ทัลบริษัทผู้รับ ต้องยื่นคำร้องภายใน 7 วันนับจากเวลานั้น โดยการตรวจสอบอาจเสร็จภายหลัง การคืนเครดิตแยกจากการคืนเงินสดและไม่เปิดโควตาบริษัทผู้รับใหม่ ลิงก์ทีมงานให้สิทธิ์เข้าถึงคำขอเดียว ส่งต่อได้และไม่ยืนยันตัวตน ใช้ข้อมูลเฉพาะคำขอโซลาร์ที่ได้รับอนุญาต เคารพการถอนความยินยอมและห้ามขายต่อ ยังไม่เปิดขายแบบเฉพาะราย ข้อมูลผู้ประกอบการและนโยบายต้องทบทวนก่อนเปิดบริการ'
  };

  /* demo account states → which InstallerPortalData fields they stand for */
  var STATES = [
    ['approved', 'Approved · accepting'], ['empty', 'Approved · no enquiries yet'], ['paused', 'Paused by the company'], ['platform', 'Paused by SolarMatch'],
    ['unverified', 'Email not verified'], ['terms', 'Terms not accepted'], ['nocredits', 'Out of credits'], ['debt', 'Credit debt'], ['payment', 'PromptPay QR pending'],
    ['pending', 'Pending approval'], ['nocompany', 'Signed up · no company yet']
  ];
  var S = { lang: 'en', acct: 'approved', accepting: true, termsOk: true, stage: {}, notes: {}, share: {}, manual: {}, claimed: {},
    aSeg: 'new', aSel: 'e39', aQ: '', areas: ['bangkok', 'samut-prakan'], extra: [], perDay: 3, line: false, lineAsk: false, dirty: false, auth: '', authEmail: '', company: true };
  ENQ.forEach(function (e) { S.stage[e.id] = e.stage; });

  /* ---------- helpers ---------- */
  function t(k, v) { var s = COPY[S.lang][k]; if (s == null) s = COPY.en[k]; if (s == null) return k; return v ? s.replace(/\{(\w+)\}/g, function (m, x) { return v[x] != null ? v[x] : m; }) : s; }
  function L(pair) { return pair ? pair[S.lang === 'th' ? 1 : 0] : ''; }
  function V(s) { return S.lang === 'th' ? (VAL[s] || s) : s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Math.round(n).toLocaleString(S.lang === 'th' ? 'th-TH' : 'en-GB'); }
  function baht(n) { return '฿' + num(n); }
  function ago(m) { var th = S.lang === 'th'; return m < 60 ? m + (th ? ' นาที' : ' min') : m < 1440 ? Math.round(m / 60) + (th ? ' ชม.' : ' h') : Math.round(m / 1440) + (th ? ' วัน' : ' d'); }
  function when(mins, opts) { return new Date(NOW - mins * 60000).toLocaleString(S.lang === 'th' ? 'th-TH' : 'en-GB', Object.assign({ timeZone: 'Asia/Bangkok' }, opts || { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })); }
  function clock() { return new Date().toLocaleTimeString(S.lang === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }); }
  function enq(id) { return ENQ.filter(function (e) { return e.id === id; })[0]; }
  function stage(e) { return S.stage[e.id]; }
  function isClosed(e) { return e.withdrawn || ['won', 'lost', 'notsuitable'].indexOf(stage(e)) > -1; }
  function A() {
    var a = S.acct;
    return { company: S.company, approved: S.company && a !== 'pending', verified: a !== 'unverified', terms: S.termsOk, platform: a === 'platform',
      debt: a === 'debt' ? 4 : 0, available: a === 'debt' || a === 'nocredits' || !S.company || a === 'pending' ? 0 : credits(), trial: 0, payments: a === 'payment' };
  }
  function deliveries() { var a = A(); return !a.approved || S.acct === 'empty' ? [] : ENQ; }
  function waiting() { return deliveries().filter(function (e) { return !isClosed(e) && stage(e) === 'new'; }).sort(function (a, b) { return b.mins - a.mins; }); }
  function active() { return deliveries().filter(function (e) { return !isClosed(e) && stage(e) !== 'new'; }); }
  function closed() { return deliveries().filter(isClosed); }
  function credits() { return LEDGER.reduce(function (s, r) { return s + r[3]; }, 0); }
  function canAct() { return A().verified; }
  function brand() { return '<a class="brand" href="#landing" aria-label="SolarMatch ' + esc(t('brandSub')) + '">' + LOGO + '<span><b>SolarMatch</b><small>' + t('brandSub') + '</small></span></a>'; }
  function langToggle() { return '<div class="lang" role="group" aria-label="' + t('language') + '"><button type="button" lang="th" data-act="lang" data-v="th" aria-pressed="' + (S.lang === 'th') + '" aria-label="' + COPY.en.langTh + '">ไทย</button><button type="button" lang="en" data-act="lang" data-v="en" aria-pressed="' + (S.lang === 'en') + '" aria-label="' + COPY.en.langEn + '">EN</button></div>'; }
  function sw() { var a = A(); return a.approved ? '<button type="button" class="switch" role="switch" aria-checked="' + S.accepting + '" aria-label="' + t('swLabel') + '" data-act="accept"' + (a.verified ? '' : ' disabled') + '></button>' : ''; }
  function status() { var a = A(); if (!a.company) return ['off', t('stSetup')]; if (!a.approved) return ['amber', t('stReview')]; if (a.platform) return ['off', t('stPlatform')]; return S.accepting ? ['', t('stOn')] : ['off', t('stOff')]; }
  function notice() {
    var a = A();
    if (!a.verified) return ['alert', t('nVerify', { email: EMAIL }), null];
    if (!a.approved) return null; /* the review checklist covers these */
    if (!a.terms) return ['alert', t('nTerms'), ['terms', t('nTermsBtn')]];
    if (a.platform) return ['info', t('nPlatform'), null];
    if (a.debt) return ['alert', t('nDebt', { n: a.debt }), ['credits', t('navCredits')]];
    if (a.available < 2 && a.trial === 0) return ['alert', t('nEmpty'), ['credits', t('topUp')]];
    return null;
  }
  function noticeHtml(here) { var n = notice(); if (!n) return ''; var act = n[2] && n[2][0] !== here ? '<a class="btn" href="#' + n[2][0] + '">' + esc(n[2][1]) + '</a>' : ''; return '<div class="notice' + (n[0] === 'info' ? ' info' : '') + '" role="status">' + ic(n[0]) + '<p>' + esc(n[1]) + '</p>' + act + '</div>'; }
  function acct(cls) {
    var co = S.company ? 'Suriya Solar' : 'Somchai';
    return '<details class="acct ' + (cls || '') + '"><summary aria-label="' + t('acctMenu') + '"><span class="av" aria-hidden="true">S</span></summary><div class="pop"><div class="who2"><b>' + co + '</b><small>' + EMAIL + '</small></div><div class="prow"><span>' + t('language') + '</span>' + langToggle() + '</div><a href="#landing">' + t('homeSite') + '</a><button type="button" class="lnk2" data-act="signout">' + t('signOut') + '</button></div></details>';
  }
  function who() { var s = status(); return '<div class="who">' + acct() + '<div><b>' + (S.company ? 'Suriya Solar' : 'Somchai') + '</b><small><i class="dot' + (s[0] ? ' ' + s[0] : '') + '" aria-hidden="true"></i>' + esc(s[1]) + '</small></div></div>'; }
  function phead(title, id) { return '<div class="phead"><h1 tabindex="-1" id="' + (id || 'qh') + '">' + esc(title) + '</h1>' + acct('end') + '</div>'; }

  /* ---------- prototype chrome (not part of the product) ---------- */
  function chrome(site) {
    return '<div class="cbar"><div class="in"><span class="cb-l">Signal <small>· prototype</small></span><nav class="cseg" aria-label="Prototype view"><a href="#landing" aria-current="' + site + '">Website</a><a href="#inbox" aria-current="' + !site + '">Portal</a></nav>' +
      '<label class="sr" for="demo-state">Demo state</label><select id="demo-state" data-act="state">' + STATES.map(function (s) { return '<option value="' + s[0] + '"' + (S.acct === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div></div>';
  }

  /* =========================================================
     WEBSITE
     ========================================================= */
  function facts4(e, cls) {
    var bill = e.bill != null ? '<div><b>' + baht(e.bill) + '</b><span>' + t('fBill') + '</span></div>' : '<div><b class="kwh">' + t('kwh', { n: num(e.kwh) }) + '</b><span>' + t('fUse') + '</span></div>';
    return '<div class="facts4 ' + (cls || '') + '">' + bill + '<div><b>' + e.ac + '</b><span>' + t('fAc') + '</span></div><div><b>' + esc(V(e.own)) + '</b><span>' + t('fOwn') + '</span></div><div><b>' + esc(V(e.when)) + '</b><span>' + t('fWhen') + '</span></div></div>';
  }
  function exampleCard() {
    var e = ENQ[0], n = L(e.name);
    return '<div class="stack" role="group" aria-label="' + t('exLabel') + '"><div class="notif"><div class="nt"><span class="live" aria-hidden="true"></span><b>' + t('exNew') + '</b><span>' + t('exNow') + '</span></div><div class="nb"><span class="av" aria-hidden="true">' + n[0] + '</span><div><b>' + n + '</b><small>' + L(e.area) + '</small></div></div>' + facts4(e, 'mini') + '<div class="na"><span class="btn primary">' + ic('phone') + t('callName', { name: n }) + '</span><span class="btn soft">' + ic('copy') + t('copy') + '</span></div></div><span class="ex-tag">' + t('exTag') + '</span></div>';
  }
  function authCard(mode) {
    var heads = { signin: 'aSignin', apply: 'aRegister', forgot: 'aRecover', reset: 'aReset' };
    var x = '<a class="x" href="#landing" aria-label="' + t('aClose') + '">' + ic('close') + '</a>';
    if (S.auth === mode && (mode === 'apply' || mode === 'forgot')) {
      return '<section class="auth" aria-labelledby="ah">' + x + '<div class="sent">' + ic('mail') + '<h2 id="ah" tabindex="-1">' + t('aSentH') + '</h2><p class="muted">' + esc(mode === 'apply' ? t('aSentReg', { email: S.authEmail || EMAIL }) : t('aSentRec')) + '</p>' +
        (mode === 'apply' ? '<a class="btn soft sm" href="#inbox" data-act="demo-new">' + t('aDemo') + '</a>' : '<a class="btn ghost sm" href="#signin">' + t('aBack') + '</a>') + '</div></section>';
    }
    var f = '';
    if (mode === 'apply') f += '<div class="field"><label for="au-name">' + t('aName') + '</label><input id="au-name" class="tx" name="name" autocomplete="name" required maxlength="120"></div>';
    if (mode !== 'reset') f += '<div class="field"><label for="au-email">' + t('aEmail') + '</label><input id="au-email" class="tx" name="email" type="email" autocomplete="email" required maxlength="254"></div>';
    if (mode !== 'forgot') f += '<div class="field"><label for="au-pass">' + t('aPass') + '</label><input id="au-pass" class="tx" name="password" type="password" minlength="12" maxlength="128" autocomplete="' + (mode === 'signin' ? 'current-password' : 'new-password') + '" required></div>';
    var alt = mode === 'signin' ? '<a href="#apply">' + t('aCreate') + '</a><a href="#forgot">' + t('aForgot') + '</a>' : mode === 'apply' ? '<a href="#signin">' + t('aHave') + '</a>' : '<a href="#signin">' + t('aBack') + '</a>';
    return '<section class="auth" aria-labelledby="ah">' + x + '<h2 id="ah" tabindex="-1">' + t(heads[mode]) + '</h2><form class="form" data-form="auth" data-mode="' + mode + '" novalidate>' + f + '<button class="btn primary lg" type="submit">' + t('aGo') + '</button></form><div class="alt">' + alt + '</div>' + (mode === 'signin' || mode === 'apply' ? '<p class="note">' + t('aNote') + '</p>' : '') + '</section>';
  }
  function landing(mode) {
    var faq = [1, 2, 3, 4, 5].map(function (i) { return '<details class="qa"><summary>' + esc(t('q' + i)) + '</summary><p>' + esc(t('a' + i)) + '</p></details>'; }).join('');
    return chrome(true) + '<header class="a-hdr"><div class="wrap">' + brand() + '<nav class="a-nav" aria-label="' + t('navMain') + '"><a href="#landing" data-scroll="how">' + t('navHow') + '</a><a href="#landing" data-scroll="price">' + t('navPrice') + '</a><a href="#landing" data-scroll="faq">' + t('navFaq') + '</a></nav><div class="r">' + langToggle() + '<a class="btn ghost sm" href="#signin">' + t('signIn') + '</a><a class="btn primary sm" href="#apply">' + t('apply') + '</a></div></div></header>' +
      '<main id="main"><section class="a-hero' + (mode ? ' authing' : '') + '"><div class="wrap"><div class="copy"><p class="eyebrow">' + t('eyebrow') + '</p><h1>' + t('h1') + '</h1><p class="lede">' + t('lede') + '</p><div class="btns"><a class="btn primary lg" href="#apply">' + t('applyLong') + ic('arrow') + '</a><a class="btn ghost lg" href="#signin">' + t('signIn') + '</a></div></div>' + (mode ? authCard(mode) : exampleCard()) + '</div></section>' +
      '<section class="a-facts" id="price" aria-label="' + t('navPrice') + '"><div class="wrap"><div class="fgrid"><div><b>฿400</b><span>' + t('fPrice') + '</span></div><div><b>3</b><span>' + t('fCos') + '</span></div><div><b>2</b><span>' + t('fFree') + '</span></div><div><b>' + t('fDays', { n: 7 }) + '</b><span>' + t('fClaim') + '</span></div></div><p class="note">' + t('fNote') + '</p></div></section>' +
      '<section class="a-how" id="how"><div class="wrap"><p class="eyebrow">' + t('howEyebrow') + '</p><h2>' + t('howH') + '</h2><ol class="tl"><li><span class="n" aria-hidden="true">1</span><h3>' + t('s1t') + '</h3><p>' + t('s1p') + '</p></li><li><span class="n" aria-hidden="true">2</span><h3>' + t('s2t') + '</h3><p>' + t('s2p') + '</p></li><li><span class="n" aria-hidden="true">3</span><h3>' + t('s3t') + '</h3><p>' + t('s3p') + '</p></li></ol></div></section>' +
      '<section class="a-faq" id="faq"><div class="wrap"><div class="band"><img src="img/palms-roof.jpg" alt="' + t('photoAlt') + '" width="1600" height="1200"><span class="credit">Photo: Kindel Media / Pexels</span><h2>' + t('faqH') + '</h2></div><div class="qas">' + faq + '</div></div></section></main>' +
      '<footer class="foot"><div class="wrap"><div class="fb">' + brand() + '<p>' + t('footTag') + '</p></div><div><h2 class="h4">' + t('footInst') + '</h2><a href="#landing" data-scroll="how">' + t('navHow') + '</a><a href="#landing" data-scroll="price">' + t('navPrice') + '</a><a href="#signin">' + t('signIn') + '</a></div><div><h2 class="h4">' + t('footSm') + '</h2><a href="#landing">' + t('homeSite') + '</a><a href="#landing">' + t('privacy') + '</a><a href="#landing">' + t('terms') + '</a></div><p class="fine">' + t('footFine') + ' <span class="proto">Prototype data is fictional.</span></p></div></footer>';
  }

  /* =========================================================
     PORTAL
     ========================================================= */
  function shell(active, inner, detailOpen) {
    var a = A(), n = a.approved ? waiting().length : 0;
    var nav = [['inbox', 'inbox', t('navEnq'), n], ['credits', 'wallet', t('navCredits'), 0], ['company', 'building', t('navCompany'), 0]];
    var links = function () { return nav.map(function (x) { return '<a href="#' + x[0] + '"' + (active === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1]) + '<span>' + x[2] + '</span>' + (x[3] ? '<em aria-label="' + x[3] + '">' + x[3] + '</em>' : '') + '</a>'; }).join(''); };
    return chrome(false) + '<div class="a-app' + (detailOpen ? ' detail-open' : '') + '"><header class="a-rail"><a class="rail-logo" href="#landing" aria-label="SolarMatch">' + LOGO + '</a><nav class="rnav" aria-label="' + t('portalNav') + '">' + links() + '</nav>' + acct('rail-acct') + '</header>' +
      '<main id="main" class="a-main">' + inner + '</main><nav class="tabbar" aria-label="' + t('portalNav') + '">' + links() + '</nav></div>';
  }
  function row(e) {
    var s = stage(e), sel = S.aSel === e.id ? ' sel' : '';
    if (e.withdrawn) return '<a class="row wd' + sel + '" href="#' + e.id + '"><span class="av" aria-hidden="true">—</span><span class="rt"><span class="r1"><b>' + t('withdrawnName') + '</b><time>' + ago(e.mins) + '</time></span><span class="r2">' + e.ref + '</span></span></a>';
    var fact = e.bill != null ? baht(e.bill) : t('kwh', { n: num(e.kwh) });
    return '<a class="row' + sel + (s === 'new' ? ' unread' : '') + '" href="#' + e.id + '"><span class="av" aria-hidden="true">' + L(e.name)[0] + '</span><span class="rt"><span class="r1"><b>' + L(e.name) + '</b><time>' + ago(e.mins) + '</time></span><span class="r2">' + L(e.area) + ' · ' + fact + '</span><span class="r3">' + (s === 'new' ? '<span class="pill st-new">' + t('pillWaiting') + '</span>' : '<span class="pill st-' + s + '">' + STAGE[S.lang][s] + '</span>') + (!e.paid ? '<span class="pill free">' + t('pillTrial') + '</span>' : '') + '</span></span></a>';
  }
  function progress(e, hl) {
    var s = stage(e), done = ['won', 'lost', 'notsuitable'].indexOf(s) > -1, off = s === 'lost' || s === 'notsuitable', idx = done ? 4 : ST.indexOf(s), dis = canAct() ? '' : ' disabled';
    var bar = '<div class="segbar" aria-hidden="true">' + ST.map(function (x, i) { return '<i class="' + (i <= idx ? (off ? 'lost' : 'on') : '') + '"></i>'; }).join('') + '</div>';
    var labels = '<div class="seglabels" role="group" aria-label="' + t('stageGroup') + '">' + ST.map(function (x) { return '<button type="button" data-act="setstage" data-id="' + e.id + '" data-v="' + x + '" aria-pressed="' + (s === x) + '" aria-label="' + STAGE[S.lang][x] + '"' + dis + '>' + STAGE_SHORT[S.lang][x] + '</button>'; }).join('') + '</div>';
    var act = done ? '<p class="closed-line">' + esc(s === 'won' ? t('wonLine') : t('closedLine', { s: STAGE[S.lang][s] })) + '</p>' :
      '<div class="prog-act"><button type="button" class="btn primary" data-act="adv" data-id="' + e.id + '"' + dis + '>' + NEXT[S.lang][s] + '</button><details class="menu"><summary class="btn ghost"' + (canAct() ? '' : ' aria-disabled="true"') + '>' + t('closeBtn') + ic('down') + '</summary><div class="pop" role="group" aria-label="' + t('closeAs') + '"><button type="button" data-act="setstage" data-id="' + e.id + '" data-v="lost"' + dis + '>' + STAGE[S.lang].lost + '</button><button type="button" data-act="setstage" data-id="' + e.id + '" data-v="notsuitable"' + dis + '>' + STAGE[S.lang].notsuitable + '</button></div></details></div>';
    return '<div class="prog"><div class="prog-top"><' + hl + ' class="h3">' + t('progress') + '</' + hl + '><span class="pill st-' + s + '">' + STAGE[S.lang][s] + '</span></div>' + bar + labels + act + '</div>';
  }
  function notes(e) { var lock = !canAct(); return '<div class="field"><label for="notes-' + e.id + '">' + t('notesL') + '</label><textarea id="notes-' + e.id + '" class="ta" data-act="notes" data-id="' + e.id + '" maxlength="2000" placeholder="' + esc(t('notesPh')) + '"' + (lock ? ' disabled' : '') + '>' + esc(S.notes[e.id] || '') + '</textarea><span class="hint" id="nh-' + e.id + '" role="status">' + (lock ? t('notesLocked') : t('notesAuto')) + '</span></div>'; }
  function moreHome(e) { return '<details class="disc"><summary>' + t('more') + '</summary><div class="kv">' + [['mHome', e.home], ['mUse', e.use], ['mLoads', e.loads], ['mRoof', e.roof], ['mShade', e.shade], ['mProject', e.project]].map(function (r) { return '<div><span>' + t(r[0]) + '</span><b>' + esc(V(r[1])) + '</b></div>'; }).join('') + '</div></details>'; }
  function shareDisc(e) {
    var link = S.share[e.id], dis = canAct() ? '' : ' disabled';
    return '<details class="disc"' + (link ? ' open' : '') + '><summary>' + t('share') + '</summary><div class="in"><p>' + esc(t('shareP')) + '</p>' + (link ? '<div class="share-out"><label class="hint" for="sl-' + e.id + '">' + t('shareField') + '</label><div class="row2"><input id="sl-' + e.id + '" class="tx" readonly value="' + link + '"><button type="button" class="btn soft sm" data-act="copylink" data-v="' + link + '">' + ic('copy') + t('shareCopy') + '</button></div></div><div class="btnrow"><button type="button" class="btn ghost sm" data-act="share" data-id="' + e.id + '"' + dis + '>' + t('shareNew') + '</button><button type="button" class="btn ghost sm" data-act="revoke" data-id="' + e.id + '"' + dis + '>' + t('shareRevoke') + '</button></div>' : '<button type="button" class="btn soft sm" data-act="share" data-id="' + e.id + '"' + dis + '>' + t('shareMake') + '</button>') + '</div></details>';
  }
  function claimDisc(e) {
    var deadline = e.mins - 7 * 1440, open = deadline < 0, d = when(deadline, { dateStyle: 'medium', timeStyle: 'short' });
    var body = S.claimed[e.id] ? '<p class="pill ok">' + ic('check') + t('claimSent') + '</p>' : open ? '<form class="claimf" data-form="claim" data-id="' + e.id + '"><div class="field"><label for="cr-' + e.id + '">' + t('claimReason') + '</label><select id="cr-' + e.id + '">' + ['r1', 'r2', 'r3', 'r4', 'r5'].map(function (r) { return '<option>' + t(r) + '</option>'; }).join('') + '</select></div><div class="field"><label for="ci-' + e.id + '">' + t('claimInfo') + '</label><textarea id="ci-' + e.id + '" class="ta" required maxlength="2000"></textarea></div><button class="btn ghost sm" type="submit"' + (canAct() ? '' : ' disabled') + '>' + t('claimGo') + '</button></form>' : '<p>' + t('claimClosed') + '</p>';
    return '<details class="disc"><summary>' + t('problem') + '</summary><div class="in"><p>' + esc(t('claimBy', { d: d })) + ' ' + esc(t('claimRule')) + '</p>' + body + '</div></details>';
  }
  function meta(e) { return '<p class="meta">' + esc(t(e.paid ? 'metaPaid' : 'metaTrial', { d: when(e.mins), n: 2, o: 2 })) + '</p>'; }
  function detail(e, isPage) {
    var H = isPage ? 'h1' : 'h2', hid = isPage ? ' tabindex="-1" id="qh"' : '';
    var top = '<div class="dtop"><a class="back" href="#inbox">' + ic('back') + t('back') + '</a><span class="ref">' + e.ref + '</span></div>';
    if (e.withdrawn) return '<section class="a-detail" aria-label="' + e.ref + '">' + top + '<div class="card wdcard"><' + H + hid + '>' + t('wdH') + '</' + H + '><p class="muted" role="status">' + esc(t('wdP')) + '</p></div><div class="card discs">' + claimDisc(e) + '</div>' + meta(e) + '</section>';
    var n = L(e.name), s = stage(e);
    var manual = S.manual[e.id] ? '<div class="manual"><p class="note" role="status">' + t('copyFail') + '</p><input class="tx" aria-label="' + t('copyField') + '" readonly value="' + e.phone + '"></div>' : '';
    return '<section class="a-detail" aria-label="' + esc(n) + '">' + top +
      '<div class="dperson"><span class="av lg" aria-hidden="true">' + n[0] + '</span><div><' + H + hid + '>' + esc(n) + '</' + H + '><p>' + L(e.area) + '<span class="ph-only"> · <span class="num">' + e.phone + '</span></span></p></div><span class="wait">' + ic('clock') + (s === 'new' ? t('waitingFor', { t: ago(e.mins) }) : t('receivedAgo', { t: ago(e.mins) })) + '</span></div>' +
      '<div class="dact"><a class="btn primary lg" href="tel:' + e.phone.replace(/\s/g, '') + '" data-act="call" data-v="' + e.phone + '">' + ic('phone') + '<span class="num">' + e.phone + '</span></a><button type="button" class="btn soft lg" data-act="copy" data-id="' + e.id + '" data-v="' + e.phone + '">' + ic('copy') + t('copy') + '</button></div>' + manual +
      facts4(e) + '<div class="card">' + progress(e, isPage ? 'h2' : 'h3') + '</div><div class="card">' + notes(e) + '</div><div class="card discs">' + moreHome(e) + shareDisc(e) + claimDisc(e) + '</div>' + meta(e) +
      '<div class="mcall"><a class="btn primary lg" href="tel:' + e.phone.replace(/\s/g, '') + '" data-act="call" data-v="' + e.phone + '">' + ic('phone') + t('callName', { name: n }) + '</a>' + '<button type="button" class="btn soft lg" data-act="copy" data-id="' + e.id + '" data-v="' + e.phone + '" aria-label="' + t('copy') + '">' + ic('copy') + '</button></div></section>';
  }
  function review() {
    var a = A(), setup = !a.company;
    var items = [
      [a.verified, 'ck1', ''],
      [a.company, 'ck2', setup ? '<a href="#company">' + t('ckAdd') + '</a>' : ''],
      [a.company && S.areas.length > 0, 'ck3', setup ? '<a href="#company">' + t('ckAdd') + '</a>' : ''],
      [a.terms, 'ck4', a.company ? '<a href="#terms">' + t('ckReview') + '</a>' : ''],
      [S.line, 'ck5', '<span class="wait-l">' + t('ckAfter') + '</span>', true],
      [false, 'ck6', a.company ? '<span class="wait-l">' + t('ckInReview') + '</span>' : '']
    ];
    var list = '<ul class="chk">' + items.map(function (x) { return '<li class="' + (x[0] ? 'done' : '') + '"><span class="c" aria-hidden="true">' + (x[0] ? ic('check') : '') + '</span><span>' + t(x[1]) + (x[3] ? '<span class="opt">' + t('optional') + '</span>' : '') + '<span class="sr">' + (x[0] ? ' ✓' : '') + '</span></span>' + (x[0] ? '' : x[2]) + '</li>'; }).join('') + '</ul>';
    return '<div class="a-page"><div class="lhead">' + who() + '</div>' + noticeHtml('inbox') + '<section class="card review"><p class="eyebrow">' + t(setup ? 'suEyebrow' : 'rvEyebrow') + '</p><h1 tabindex="-1" id="qh">' + t(setup ? 'suH' : 'rvH') + '</h1><p class="muted">' + t(setup ? 'suP' : 'rvP') + '</p>' + list + (setup ? '<a class="btn primary" href="#company">' + t('ckStart') + ic('arrow') + '</a>' : '') + '</section></div>';
  }
  function inbox(id) {
    var a = A();
    if (!a.approved) return shell('inbox', review(), false);
    var groups = { new: waiting(), active: active(), closed: closed() };
    if (id) { S.aSel = id; var it = enq(id); S.aSeg = isClosed(it) ? 'closed' : stage(it) === 'new' ? 'new' : 'active'; }
    var q = S.aQ.trim().toLowerCase();
    var list = groups[S.aSeg].filter(function (e) { return !q || (e.withdrawn ? e.ref : L(e.name) + ' ' + L(e.area) + ' ' + e.ref).toLowerCase().indexOf(q) > -1; });
    if (!id && list.length && !list.some(function (e) { return e.id === S.aSel; })) S.aSel = list[0].id;
    var e = list.filter(function (x) { return x.id === S.aSel; })[0] || (id ? enq(id) : null);
    var empty = q ? t('emptySearch') : S.aSeg === 'new' ? (!deliveries().length ? t('emptyNew') : S.accepting ? t('emptyWaiting') : t('emptyPaused')) : t('emptyNone');
    var T = id ? 'h2' : 'h1';
    var head = '<div class="lhead">' + who() + sw() + '</div>' + noticeHtml('inbox') + '<' + T + ' class="ltitle"' + (id ? '' : ' tabindex="-1" id="qh"') + '>' + t('enqTitle') + '</' + T + '>' +
      '<div class="seg3" role="group" aria-label="' + t('filter') + '">' + [['new', 'segWaiting'], ['active', 'segActive'], ['closed', 'segClosed']].map(function (x) { return '<button type="button" data-act="aseg" data-v="' + x[0] + '" aria-pressed="' + (S.aSeg === x[0]) + '">' + t(x[1]) + ' <span>' + groups[x[0]].length + '</span></button>'; }).join('') + '</div>' +
      '<label class="search">' + ic('search') + '<span class="sr">' + t('search') + '</span><input id="asearch" type="search" data-act="asearch" placeholder="' + esc(t('searchPh')) + '" value="' + esc(S.aQ) + '"></label>';
    var listHtml = '<section class="a-list" aria-label="' + t('enqTitle') + '">' + head + '<div class="rows">' + (list.length ? list.map(row).join('') : '<p class="empty">' + esc(empty) + '</p>') + '</div></section>';
    var right = e ? detail(e, !!id) : '<div class="a-detail dempty">' + ic('inbox') + '<p>' + esc(list.length ? t('pickOne') : empty) + '</p></div>';
    return shell('inbox', '<div class="a-split">' + listHtml + right + '</div>', !!id);
  }

  /* credits */
  function stmtRows() {
    var rows = LEDGER.map(function (r) {
      var label = r[0] === 'enq' ? t('stEnq', { r: r[1] }) : r[0] === 'trialUse' ? t('stTrialUse', { r: r[1] }) : r[0] === 'buy' ? t('stBuy', { n: r[1] }) : r[0] === 'restore' ? t('stRestore', { r: r[1] }) : t('stTrialGrant', { n: r[1] });
      var sub = when(r[2]) + (r[0] === 'buy' ? ' · ' + t('oPaid') + ' · PromptPay · ' + baht(4000) : '');
      var amt = r[3] > 0 ? '<span class="amt plus">+' + r[3] + '</span>' : r[3] < 0 ? '<span class="amt">−' + Math.abs(r[3]) + '</span>' : '<span class="amt free">' + (r[0] === 'trialGrant' ? '+' + r[1] + ' ' + t('free') : t('free')) + '</span>';
      return '<div><span><b>' + esc(label) + '</b><small>' + esc(sub) + '</small></span>' + amt + '</div>';
    });
    if (A().payments) rows.unshift('<div><span><b>' + esc(t('stBuy', { n: 20 })) + '</b><small>' + esc(when(3)) + ' · <span class="pill st-new st">' + t('oPending') + '</span> · ' + baht(4000) + '<button type="button" class="lnk3" data-act="toast" data-v="' + esc(t('stillPending')) + '">' + t('checkStatus') + '</button></small></span><span class="amt free">—</span></div>');
    return '<div class="stmt">' + rows.join('') + '</div>';
  }
  function qrSvg() { var c = '', seed = 7; for (var y = 0; y < 25; y++) for (var x = 0; x < 25; x++) { var fin = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17); seed = (seed * 9301 + 49297) % 233280; if (!fin && seed / 233280 > .52) c += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; } var f = function (x, y) { return '<rect x="' + x + '" y="' + y + '" width="7" height="7"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>'; }; return '<svg viewBox="0 0 25 25" fill="#142D26" role="img" aria-label="' + t('qrAlt') + '" shape-rendering="crispEdges">' + c + f(0, 0) + f(18, 0) + f(0, 18) + '</svg>'; }
  function creditsPage() {
    var a = A(), av = a.available, sub = [];
    if (a.trial) sub.push('<em>' + t(a.trial === 1 ? 'crTrial' : 'crTrials', { n: a.trial }) + '</em>');
    if (a.debt) sub.push('<em class="owe">' + t('crOwe', { n: a.debt }) + '</em>');
    var bal = '<div class="bal"><span>' + t('crAvail') + '</span><b>' + av + '<small> ' + t('crUnit') + '</small></b><p>' + t('crEnough', { n: Math.floor(av / 2) }) + '</p>' + (sub.length ? '<div class="sub">' + sub.join('') + '</div>' : '') + (a.debt ? '<p class="sm">' + esc(t('crDebtP')) + '</p>' : '') + '</div>';
    var payOk = a.payments && a.approved;
    var side = a.payments ? '<div class="card qr"><h2 class="h3">' + t('qrH') + '</h2><div class="code">' + qrSvg() + '</div><b class="amt2">' + baht(4000) + '</b><p class="note">' + esc(t('qrP')) + '</p><button type="button" class="btn soft block" data-act="toast" data-v="' + esc(t('stillPending')) + '">' + t('checkStatus') + '</button></div>' :
      '<div class="card pkg"><div class="pr"><b>' + t('pkgCredits', { n: 20 }) + '</b><b>' + baht(4000) + '</b></div><p class="muted">' + t('pkgEach', { n: 10 }) + '</p><div class="methods"><button type="button" class="btn primary block"' + (payOk ? '' : ' disabled') + '>' + t('payWith', { m: 'PromptPay' }) + '</button></div><p class="note">' + (a.approved ? t('paySoon') : t('payAfter')) + '</p><p class="note">' + t('payRule') + '</p></div>';
    return shell('credits', '<div class="a-page">' + phead(t('crTitle')) + noticeHtml('credits') + '<div class="a-two">' + bal + side + '</div><div class="card"><h2 class="h3">' + t('stmt') + '</h2>' + (a.approved ? stmtRows() : '<p class="empty">' + t('emptyNone') + '</p>') + '</div></div>');
  }

  /* company */
  function areaGrid() {
    var tiles = PROV.map(function (p) { var on = S.areas.indexOf(p[0]) > -1; return '<button type="button" class="atile" data-act="area" data-v="' + p[0] + '" aria-pressed="' + on + '">' + (on ? ic('check') : '') + '<span>' + (S.lang === 'th' ? p[2] : p[1]) + '</span></button>'; });
    S.extra.forEach(function (x) { tiles.push('<button type="button" class="atile" data-act="rmarea" data-v="' + esc(x) + '" aria-pressed="true" aria-label="' + esc(t('removeArea', { a: x })) + '">' + ic('check') + '<span>' + esc(x) + '</span><span class="rm" aria-hidden="true">×</span></button>'); });
    return '<div class="agrid">' + tiles.join('') + '</div>';
  }
  function companyPage() {
    var a = A(), setup = !a.company, n = S.areas.length + S.extra.length, dis = a.verified ? '' : ' disabled';
    var lineCtrl = S.line ? '<span class="pill ok">' + ic('check') + t('lineOn') + '</span>' : a.approved ? '<button type="button" class="btn primary sm" data-act="line"' + dis + '>' + ic('chat') + t('lineConnect') + '</button>' : '<span class="note">' + t('lineAfter') + '</span>';
    var lineMore = !S.line ? '' : S.lineAsk ? '<div class="in2"><p class="disc-note">' + esc(t('lineWarn')) + '</p><div class="btnrow"><button type="button" class="btn ghost sm" data-act="lineoff">' + t('lineConfirm') + '</button><button type="button" class="btn soft sm" data-act="lineask">' + t('cancel') + '</button></div></div>' : '<button type="button" class="tlink" data-act="lineask">' + t('lineOff') + '</button>';
    var body = '<div class="card"><div class="sethead"><h2 class="h3">' + t('areas') + '</h2><span class="muted num">' + t('areasN', { n: n }) + '</span></div>' + areaGrid() +
      '<details class="disc extra"><summary>' + t('addArea') + '</summary><div class="row2"><label class="sr" for="xa">' + t('addArea') + '</label><input id="xa" class="tx" maxlength="100" placeholder="' + esc(t('areaPh')) + '"><button type="button" class="btn soft" data-act="addarea">' + t('addBtn') + '</button></div></details>' + (n ? '' : '<p class="note" role="status">' + t('areasNone') + '</p>') + '</div>' +
      '<div class="card"><div class="setrow"><h2 class="h3">' + t('perDay') + '</h2><div class="stepper"><button type="button" data-act="perday" data-v="-1" aria-label="' + t('fewer') + '"' + (S.perDay <= 0 ? ' disabled' : '') + '>−</button><output aria-live="polite">' + S.perDay + '</output><button type="button" data-act="perday" data-v="1" aria-label="' + t('moreDay') + '"' + (S.perDay >= 100 ? ' disabled' : '') + '>+</button></div></div>' + (S.perDay === 0 ? '<p class="note">' + t('zeroDay') + '</p>' : '') + '</div>' +
      '<div class="card"><div class="setrow"><div><h2 class="h3">' + t('lineH') + '</h2><p class="muted sm">' + t('lineP') + '</p></div>' + lineCtrl + '</div>' + lineMore + '</div>' +
      '<div class="card form"><h2 class="h3">' + t('details') + '</h2><div class="field"><label for="co1">' + t('coName') + '</label><input id="co1" class="tx" data-act="dirty" value="' + (setup ? '' : 'Suriya Solar Co., Ltd.') + '" required minlength="2" maxlength="160"></div><div class="field"><label for="co2">' + t('coContact') + '</label><input id="co2" class="tx" data-act="dirty" value="Somchai" required maxlength="120"></div><div class="field"><label for="co3">' + t('coPhone') + '</label><input id="co3" class="tx" type="tel" data-act="dirty" value="' + (setup ? '' : '02 123 4567') + '" required maxlength="40"></div>' + (setup ? '<button type="button" class="btn primary" data-act="create"' + (n ? dis : ' disabled') + '>' + t('create') + '</button>' : '') + '</div>' +
      (setup ? '' : '<div class="card lnks"><a href="#claims"><span>' + t('claimsLink') + '</span><span class="r2">' + CLAIMS.length + ic('chev') + '</span></a><a href="#terms"><span>' + t('termsLink') + '</span><span class="r2">' + (a.terms ? esc(t('accepted', { d: when(36000, { day: 'numeric', month: 'short' }) })) : '<span class="pill st-new">' + t('actionNeeded') + '</span>') + ic('chev') + '</span></a></div>');
    var bar = S.dirty && !setup ? '<div class="savebar" role="status"><span>' + t('unsaved') + '</span><button type="button" class="btn primary sm" data-act="save"' + (n ? dis : ' disabled') + '>' + t('saveCh') + '</button></div>' : '';
    return shell('company', '<div class="a-page">' + phead(t(setup ? 'coSetupTitle' : 'coTitle')) + noticeHtml('company') + '<div class="a-co">' + body + '</div>' + bar + '</div>');
  }
  function claimsPage() {
    var rows = CLAIMS.map(function (c) { return '<div><span><b>' + esc(c.reason === 'wd' ? t('clWdReason') : t(c.reason)) + '</b><small>' + c.ref + ' · ' + esc(t(c.status)) + ' · ' + esc(when(c.mins, { dateStyle: 'medium' })) + '</small></span>' + (c.id ? '<a class="lnk" href="#' + c.id + '">' + t('openEnq') + '</a>' : '') + '</div>'; }).join('');
    return shell('company', '<div class="a-page"><a class="crumb" href="#company">' + ic('back') + t('backCompany') + '</a>' + phead(t('clTitle')) + '<p class="muted">' + esc(t('clP')) + '</p><div class="card clist">' + (rows || '<p class="empty">' + t('clNone') + '</p>') + '</div></div>');
  }
  function termsPage() {
    var a = A();
    return shell('company', '<div class="a-page"><a class="crumb" href="#company">' + ic('back') + t('backCompany') + '</a>' + phead(t('tmTitle')) + '<div class="card terms-text"><p class="note">' + t('tmVersion', { v: 'installer-terms-draft-v1' }) + '</p><p>' + esc(TERMS[S.lang]) + '</p>' +
      (a.terms ? '<p class="pill ok">' + ic('check') + esc(t('tmAccepted', { d: when(36000, { dateStyle: 'medium', timeStyle: 'short' }) })) + '</p>' : '<button type="button" class="btn primary" data-act="acceptterms"' + (a.company ? '' : ' disabled') + '>' + t('tmAccept') + '</button>') +
      '<div class="fine2"><span>' + t('fine1') + '</span><span>' + t('fine2') + '</span></div></div></div>');
  }

  /* ---------- router ---------- */
  var SITE = ['landing', 'signin', 'apply', 'forgot', 'reset'];
  var current = '';
  function route() {
    var v = (location.hash || '#landing').slice(1) || 'landing';
    var html;
    if (SITE.indexOf(v) > -1) html = landing(v === 'landing' ? '' : v);
    else if (v === 'credits') html = creditsPage();
    else if (v === 'company') html = companyPage();
    else if (v === 'claims') html = claimsPage();
    else if (v === 'terms') html = termsPage();
    else if (/^e\d+$/.test(v) && enq(v) && A().approved && deliveries().length) html = inbox(v);
    else { if (v !== 'inbox') v = 'inbox'; html = inbox(); }
    var site = SITE.indexOf(v) > -1;
    document.body.className = site ? 'site' : 'portal';
    document.documentElement.lang = S.lang;
    root.innerHTML = '<a href="#main" class="sr skip">' + t('skip') + '</a>' + html;
    var changed = v !== current; current = v;
    if (changed) {
      window.scrollTo(0, 0);
      var f = document.getElementById(site ? 'ah' : 'qh');
      if (f && v !== 'landing') f.focus({ preventScroll: true });
    }
  }
  function rerender(fid) { var y = window.scrollY, el = document.activeElement, id = fid || (el && el.id); route(); window.scrollTo(0, y); if (id) { var n = document.getElementById(id); if (n) n.focus({ preventScroll: true }); } }
  var tEl;
  function toast(m) { if (!tEl) { tEl = document.createElement('div'); tEl.className = 'toast'; tEl.setAttribute('role', 'status'); document.body.appendChild(tEl); } tEl.textContent = m; tEl.classList.add('show'); clearTimeout(tEl._t); tEl._t = setTimeout(function () { tEl.classList.remove('show'); }, 2400); }
  function setState(s) {
    S.acct = s; S.accepting = s !== 'paused'; S.company = s !== 'nocompany'; S.termsOk = ['terms', 'pending', 'nocompany'].indexOf(s) < 0; S.dirty = false;
    if (s === 'nocompany') { S.areas = []; S.extra = []; } else if (!S.areas.length) S.areas = ['bangkok', 'samut-prakan'];
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act],[data-scroll]'); if (!el) return;
    if (el.dataset.scroll) { ev.preventDefault(); var sc = document.getElementById(el.dataset.scroll); if (sc) sc.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var a = el.dataset.act, v = el.dataset.v, id = el.dataset.id, e = id && enq(id);
    if (a === 'state' || a === 'dirty' || a === 'notes' || a === 'asearch') return;
    if (a === 'lang') { S.lang = v; rerender(); return; }
    if (a === 'accept') { S.accepting = !S.accepting; rerender(); toast(S.accepting ? t('toastOn') : t('toastOff')); return; }
    if (a === 'adv') { var nx = ST[ST.indexOf(stage(e)) + 1]; S.stage[id] = nx; rerender(); toast(L(e.name) + ' · ' + STAGE[S.lang][nx]); return; }
    if (a === 'setstage') { S.stage[id] = v; rerender(); toast(L(e.name) + ' · ' + STAGE[S.lang][v]); return; }
    if (a === 'call') { ev.preventDefault(); toast(t('demoCall', { n: v })); return; }
    if (a === 'copy') { var ok = function () { toast(t('copied')); }, bad = function () { S.manual[id] = true; rerender(); }; try { navigator.clipboard.writeText(v).then(ok, bad); } catch (x) { bad(); } return; }
    if (a === 'copylink') { var ok2 = function () { toast(t('linkCopied')); }; try { navigator.clipboard.writeText(v).then(ok2, ok2); } catch (x) { ok2(); } return; }
    if (a === 'share') { S.share[id] = 'https://solarmatch.example/s/' + Math.random().toString(36).slice(2, 10); rerender(); toast(t('shareMade')); return; }
    if (a === 'revoke') { delete S.share[id]; rerender(); toast(t('shareGone')); return; }
    if (a === 'toast') { toast(v); return; }
    if (a === 'aseg') { S.aSeg = v; rerender(); return; }
    if (a === 'area') { S.areas = S.areas.indexOf(v) > -1 ? S.areas.filter(function (x) { return x !== v; }) : S.areas.concat(v); S.dirty = true; rerender(); return; }
    if (a === 'rmarea') { S.extra = S.extra.filter(function (x) { return x !== v; }); S.dirty = true; rerender(); return; }
    if (a === 'addarea') { var inp = document.getElementById('xa'), val = inp && inp.value.trim(); if (val && S.extra.indexOf(val) < 0) { S.extra.push(val); S.dirty = true; } rerender(); return; }
    if (a === 'perday') { S.perDay = Math.min(100, Math.max(0, S.perDay + Number(v))); S.dirty = true; rerender(); return; }
    if (a === 'line') { S.line = true; rerender(); toast(t('demoLine')); return; }
    if (a === 'lineask') { S.lineAsk = !S.lineAsk; rerender(); return; }
    if (a === 'lineoff') { S.line = false; S.lineAsk = false; rerender(); return; }
    if (a === 'save') { S.dirty = false; rerender(); toast(t('demoSaved')); return; }
    if (a === 'create') { setState('pending'); S.areas = S.areas.length ? S.areas : ['bangkok']; location.hash = 'inbox'; toast(t('demoSaved')); return; }
    if (a === 'acceptterms') { S.termsOk = true; rerender(); toast(t('tmDone')); return; }
    if (a === 'signout') { location.hash = 'landing'; toast(t('demoOut')); return; }
    if (a === 'demo-new') { setState('nocompany'); S.auth = ''; return; }
  });
  document.addEventListener('change', function (ev) { var el = ev.target; if (el.dataset && el.dataset.act === 'state') { setState(el.value); if (SITE.indexOf(current) > -1) location.hash = 'inbox'; else rerender('demo-state'); } });
  document.addEventListener('input', function (ev) {
    var el = ev.target, a = el.dataset && el.dataset.act;
    if (a === 'asearch') { S.aQ = el.value; rerender('asearch'); return; }
    if (a === 'notes') { S.notes[el.dataset.id] = el.value; el.dataset.changed = '1'; return; }
    if (a === 'dirty' && !S.dirty && A().company) { S.dirty = true; rerender(el.id); }
  });
  /* notes autosave on blur (real: save-team-notes with the current notesRevision; 409 → notesConflict) */
  document.addEventListener('focusout', function (ev) {
    var el = ev.target; if (!el.dataset || el.dataset.act !== 'notes' || !el.dataset.changed) return;
    el.dataset.changed = ''; var h = document.getElementById('nh-' + el.dataset.id); if (!h) return;
    h.textContent = t('notesSaving'); setTimeout(function () { h.textContent = t('notesSaved', { t: clock() }); }, 500);
  });
  document.addEventListener('submit', function (ev) {
    ev.preventDefault(); var f = ev.target;
    if (f.dataset.form === 'auth') {
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var m = f.dataset.mode, em = f.querySelector('[type=email]');
      if (m === 'signin') { setState('approved'); location.hash = 'inbox'; return; }
      if (m === 'reset') { location.hash = 'signin'; return; }
      S.auth = m; S.authEmail = em ? em.value : ''; rerender('ah'); return;
    }
    if (f.dataset.form === 'claim') { if (!f.checkValidity()) { f.reportValidity(); return; } S.claimed[f.dataset.id] = true; rerender(); toast(t('claimSent')); return; }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { document.querySelectorAll('details.menu[open],details.acct[open]').forEach(function (d) { d.removeAttribute('open'); }); } });
  document.addEventListener('click', function (ev) { document.querySelectorAll('details.menu[open],details.acct[open]').forEach(function (d) { if (!d.contains(ev.target)) d.removeAttribute('open'); }); }, true);
  window.addEventListener('hashchange', function () { if (SITE.indexOf((location.hash || '').slice(1)) > -1 && (location.hash || '').slice(1) !== current) S.auth = ''; route(); });
  window.SM = { state: function (s) { setState(s); rerender(); }, lang: function (l) { S.lang = l; rerender(); } };
  route();
})();
