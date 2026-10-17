/* SolarMatch v3 prototype (applied minimalism). Vanilla JS, hash routes, EN/TH, real calculator via window.SMEngine. */
(function () {
  'use strict';
  var E = window.SMEngine;
  var root = document.getElementById('app');

  /* ---------------- icons ---------------- */
  var P = {
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
    phone: '<path d="M5.5 4h3.3l1.7 4.3-2.2 1.4a10.5 10.5 0 0 0 4.9 4.9l1.4-2.2 4.3 1.7v3.3a1.8 1.8 0 0 1-1.9 1.8C10.6 19.2 4.8 13.4 3.7 5.9A1.8 1.8 0 0 1 5.5 4z"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17h0A2.5 2.5 0 0 1 4 14.5z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    inbox: '<path d="M3.5 13.5 6 6.2A2 2 0 0 1 7.9 5h8.2A2 2 0 0 1 18 6.2l2.5 7.3V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-4.5z"/><path d="M3.5 13.5H8l1 2.3h6l1-2.3h4.5"/>',
    wallet: '<path d="M4 8V6.8A2.3 2.3 0 0 1 6.3 4.5H17v3.5"/><rect x="3.5" y="8" width="17" height="11.5" rx="2.5"/><path d="M16 13.8h2"/>',
    building: '<path d="M5 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9.5h3a1 1 0 0 1 1 1v10M3 20.5h18M9 7.5h2M9 11.5h2M9 15.5h2"/>',
    pin: '<path d="M12 21s-6.5-5.2-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.8 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    shield: '<path d="M12 3 19.5 6v5.5c0 4.4-3 7.7-7.5 9.5-4.5-1.8-7.5-5.1-7.5-9.5V6L12 3z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    share: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>',
    bolt: '<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12L13 3z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    receipt: '<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19c3-3 6-6 9-8"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5zM10 20.5h4"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.7h.01"/>'
  };
  function ic(n, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + P[n] + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 64 56" aria-hidden="true"><g fill="#E2A62B"><path d="M32 0 27.5 8h9L32 0Z"/><path d="m15.5 6.5 1.2 9 7.7-4.5-8.9-4.5Z"/><path d="m48.5 6.5-8.9 4.5 7.7 4.5 1.2-9Z"/><path d="M3 24.5 11.5 29v-9L3 24.5Z"/><path d="m61 24.5-8.5-4.5v9l8.5-4.5Z"/><path d="m9 41 9-1.1-4.5-7.8L9 41Z"/><path d="m55 41-4.5-8.9-4.5 7.8L55 41Z"/></g><path d="M15 37a20.5 20.5 0 1 1 34 0" fill="none" stroke="#E2A62B" stroke-width="6"/><path d="M10 53 39 30M54 53 25 30" fill="none" stroke="#137A50" stroke-linecap="square" stroke-width="6"/></svg>';

  /* ---------------- copy ---------------- */
  var T = {
    en: {
      proto: 'Design prototype · fictional installer data · estimates use SolarMatch’s real calculator', protoShort: 'Design prototype',
      protoHome: 'Homeowner site', protoInst: 'Installer portal',
      navHow: 'How it works', navTrust: 'Why trust us', navInst: 'For installers', cta: 'Free estimate', ctaLong: 'estimate',
      heroEyebrow: 'Free home solar estimate · Bangkok & nearby',
      heroH1: 'How much could solar save your home?',
      heroLede: 'Enter your monthly electricity bill and answer 10 short questions. You’ll see the right system size, the price and when it pays for itself.',
      billLabel: 'Your typical monthly electricity bill', perMonth: 'per month', perMo: ' / month', seeEstimate: 'See my estimate',
      t1: 'No phone number needed', t2: 'Free, no obligation', t3: 'Official MEA & PEA tariffs',
      exTag: 'Example', exWhere: 'Sathon · ฿6,000 bill', exLess: 'less each month',
      sSystem: 'system', sPrice: 'planning price', sPayback: 'payback', years: 'years', yrs: 'yrs',
      credit: 'Photo: {p} / Pexels',
      pvEyebrow: 'Your estimate', pvH2: 'Plain numbers you can plan with.', pvP: 'No ranges that run from cheap to expensive. One careful figure for each question homeowners actually ask.',
      pv1: 'How much your bill drops each month', pv2: 'The system size that fits your bill and roof', pv3: 'A planning price, including installation', pv4: 'When it pays for itself, and the 25-year picture',
      pvTry: 'Try it with your bill',
      howEyebrow: 'How it works', howH2: 'Three calm steps. No sales calls.',
      h1t: 'Answer 10 short questions', h1p: 'Your bill, home, roof and daytime use. “Not sure” is always an answer.',
      h2t: 'See your full estimate', h2p: 'Every number, with the method behind it. No phone number needed.',
      h3t: 'Compare up to 3 installers', h3p: 'Only if you ask. You choose who contacts you.', soon: 'Opening soon',
      trEyebrow: 'Why trust these numbers', trH2: 'Careful on purpose.',
      trP: 'Many sales quotes promise payback in 3 to 6 years. Ours often looks longer, because we count what those quotes leave out.',
      trRows: [['Maintenance and inverter replacement', 'Included'], ['Panel output dropping with age', 'Included'], ['Income from selling surplus power', 'Not counted'], ['Tax deduction', 'Not counted'], ['Future electricity price rises', 'Not counted']],
      trP2: 'So if an installer quotes a faster payback, you’ll know exactly what to ask.',
      trSrc: 'Built on official sources', src: ['MEA residential tariff · Sep 2026', 'PEA residential tariff', 'ERC 2026 rooftop programme', 'Revenue Department · Royal Decree 805'],
      trLink: 'Read the full method',
      faqEyebrow: 'Before you decide', faqH2: 'Questions worth asking first.',
      faq: [
        ['Will solar panels make my roof leak?', 'Not when installed properly. Mounts are fixed to the roof structure and every point is sealed. Ask installers how they waterproof your roof type, and whether they guarantee the roof work as well as the panels.'],
        ['Does it still work in the rainy season?', 'Yes, with lower output on cloudy days. Your estimate uses long-run solar data for your province, so the rainy months are already counted in the yearly figure.'],
        ['How long do panels and inverters last?', 'Panels usually carry long performance warranties, often 25 years. Inverters usually need replacing once in that time. The yearly maintenance reserve in your estimate sets money aside for it.'],
        ['Do I need approval from MEA or PEA?', 'Yes, for systems connected to the grid. Homes in Bangkok, Nonthaburi and Samut Prakan apply to MEA; elsewhere to PEA. Installers usually handle the paperwork for you.'],
        ['Is SolarMatch an installer?', 'No. We give you an independent estimate. When matching opens, you can choose to compare quotes from up to 3 approved local installers. They pay us a fee per enquiry; you pay nothing.']
      ],
      soonH: 'Compare up to 3 local installers', soonP: 'Opening soon in Bangkok. Your estimate is free either way, and nobody calls you unless you ask.', start: 'Start my estimate',
      finalH: 'See what your roof could do.', finalBtn: 'Start my free estimate',
      ftTag: 'Independent solar estimates for Thai homes.', ftEst: 'Estimate', ftLearn: 'Learn', ftCo: 'Company',
      ftLinks: [['Start an estimate', 'How it works', 'Methodology'], ['Solar guide', 'Official resources', 'Questions'], ['For installers', 'Contact', 'Privacy', 'Terms']],
      ftFine: 'Pre-launch preview. All figures are planning estimates, not quotations.',
      qOf: 'Question {n} of {t}', almost: 'Last question', back: 'Back', next: 'Next', seeMine: 'See my estimate', exit: 'Exit estimate',
      provHelp: 'Sunlight and electricity tariffs depend on where the home is.', otherProv: 'Another province…', district: 'District', districtPh: 'Choose a district (optional)', provinceLbl: 'Province',
      billHelp: 'Use a recent MEA or PEA bill. A rough figure is fine.',
      loadsHelp: 'Choose everything installed, even if it isn’t on all day.',
      contactHelp: 'Matching opens soon. Your estimate is ready either way.',
      contactYes: 'Thanks. When matching opens, we’ll offer it on your results page. We won’t ask for your details today.',
      yourAnswers: 'Your answers', edit: 'Edit', youGet: 'You’ll get', yg: ['System size for your bill and roof', 'Planning price and monthly saving', 'Payback and the 25-year view'], saved: 'Saved in this browser only.',
      sumLbl: { province: 'Location', monthlyBillThb: 'Monthly bill', activelyPlanningSolar: 'Timeframe', projectType: 'Project', propertyType: 'Home', ownershipStatus: 'Ownership', daytimePattern: 'Daytime use', daytimeLoads: 'Appliances', shade: 'Shade', roofMaterial: 'Roof', quoteContactRequested: 'Installer quotes' },
      needChoice: 'Choose an answer to continue.', needBill: 'Enter your bill to continue.', needText: 'Add a short description to continue.',
      ldH: 'Preparing your estimate', ld1: 'Reading the {u} residential tariff', ld2: 'Sizing a system for your bill and roof', ld3: 'Working out savings and payback',
      rEyebrow: 'Your estimate · {place}', rLess: 'less on your electricity bill each month', rPct: 'About {p}% of what you pay today',
      rSystem: 'system size', rPrice: 'planning price', rPayback: 'simple payback',
      rFine: 'Planning estimate, not a quotation.', rHow: 'How we calculate',
      cTitle: '25 years, with and without solar', cWith: 'With solar', cWithout: 'Without solar', cCross: 'Costs cross ≈ year {y}', cGap: '{a} saved', cGapNeg: 'Costs {a} more', cNote: 'Includes the planning price, yearly maintenance reserve and 0.5% yearly panel ageing. Excludes export income, tax relief, finance costs and future price rises.',
      billTitle: 'Your monthly bill', bToday: 'Today', bAfter: 'With solar',
      exTitle: 'Possible extras, not included above', ex1: 'Tax deduction up to ฿200,000', ex2: 'Sell surplus at ฿2.20/kWh', exNote: 'Both depend on eligibility and approval.',
      dfTitle: 'Why installer quotes may differ', dfP: 'Installers survey your roof and choose exact equipment. Some show a faster payback by counting export income or future price rises, which we leave out.',
      rfTitle: 'Make it more precise', rfP: 'Optional. Figures update as you choose.', updated: 'Estimate updated',
      rf: { roofDirection: 'Which way does the roof face?', roofSlope: 'Roof slope', roofArea: 'Usable roof area', electricityPhase: 'Electricity supply' },
      rfo: {
        roofDirection: [['', 'Not specified'], ['south-group', 'South-facing'], ['east', 'East'], ['west', 'West'], ['north', 'North'], ['flat', 'Flat roof'], ['several', 'Several directions'], ['unsure', 'Not sure']],
        roofSlope: [['', 'Not specified'], ['flat', 'Flat'], ['gentle', 'Gentle'], ['steep', 'Steep'], ['unsure', 'Not sure']],
        roofArea: [['', 'Not specified'], ['under-30', 'Under 30 m²'], ['30-60', '30–60 m²'], ['60-100', '60–100 m²'], ['100-200', '100–200 m²'], ['over-200', 'Over 200 m²'], ['unsure', 'Not sure']],
        electricityPhase: [['', 'Not specified'], ['single', 'Single-phase'], ['three', 'Three-phase'], ['unsure', 'Not sure']]
      },
      nsTitle: 'Next steps', nsLine: 'Share to LINE', nsCopy: 'Copy link', copied: 'Link copied', shareNote: 'On the live site this opens LINE with a link to this exact estimate.',
      qaTitle: 'Questions to ask any installer', qa: ['Which panel and inverter brands, and how long are the warranties?', 'Is MEA/PEA approval included in the price?', 'How will you waterproof my roof, and is that work guaranteed?', 'Is there an app to monitor output?', 'What does yearly maintenance cost?'],
      mtTitle: 'Compare up to 3 installers', mtP: 'Opening soon in Bangkok',
      bdTitle: 'Full breakdown and sources', bd: { use: 'Monthly use', gen: 'Yearly generation', self: 'Used in the home', exp: 'Sent to the grid', after: 'Bill after solar', maint: 'Yearly maintenance reserve', net: '25-year net benefit', tariff: 'Tariff', method: 'Method version' },
      change: 'Change my answers', restart: 'Start over',
      verdicts: { 'strong-fit': 'Solar looks worth exploring for your home', 'worth-comparing': 'Solar may suit your home', 'site-check-first': 'A roof check should come first' },
      negNote: 'At this bill, solar costs more over 25 years than it saves. Compare carefully before deciding.',
      /* installers */
      iEyebrow: 'SolarMatch for installers · Bangkok', iH1: 'Homeowners who already know their numbers.',
      iLede: 'Every enquiry arrives with the household’s bill, appliances, roof and timeframe, from a homeowner who asked to be contacted.',
      iApply: 'Apply as an installer', iDemo: 'Explore the demo portal', signIn: 'Sign in', apply: 'Apply',
      tPrice: 'Price per enquiry', tPriceV: '฿400 · 2 credits', tCos: 'Companies per homeowner', tCosV: 'At most 3', tStart: 'To start', tStartV: '2 free enquiries', tClaim: 'Wrong details?', tClaimV: 'Claim within 7 days', draft: 'Draft terms. No subscription, no automatic billing.',
      sample: 'Sample enquiry', iHowH: 'From approval to first call.',
      ih1t: 'Apply', ih1p: 'Tell us about your company and the provinces you cover. We review every installer.',
      ih2t: 'Connect LINE', ih2p: 'New enquiries arrive in LINE the moment they’re assigned to you.',
      ih3t: 'Call fast', ih3p: 'Your first 2 enquiries are free. Up to 2 other companies may also call, so speed matters.',
      fairH: 'Fair by design.', fairP: 'The usual complaints about lead sites are shared leads, shifting prices and refunds that never come. We built the terms the other way round.',
      fairCols: ['Many lead sites', 'SolarMatch'], fair: [['Leads shared with 5 or more pros', 'At most 3 companies'], ['Prices change by auction', 'One fixed price'], ['Refunds at the platform’s discretion', 'Clear 7-day claim review'], ['Monthly membership fees', 'No subscription']],
      iFaqH: 'Installer questions',
      iFaq: [['What counts as a valid claim?', 'Wrong or unreachable contact details, or a request that didn’t come from the homeowner. No answer or no sale doesn’t qualify on its own.'], ['How are enquiries assigned?', 'By service area and your daily limit, and never to more than 3 companies per homeowner.'], ['Can I pause?', 'Yes. Turn off “Accepting enquiries” at any time. Nothing is sent or charged while you’re paused.']],
      /* portal */
      pToday: 'Today', pEnq: 'Enquiries', pCredits: 'Credits', pCompany: 'Company', accepting: 'Accepting enquiries', paused: 'Paused',
      demoView: 'Demo view', approved: 'Approved', pending: 'Pending review', homeSite: 'Homeowner site', signOut: 'Sign out',
      callNext: 'Call next', waiting: 'Waiting {t}', callX: 'Call {n}', openEnq: 'Open enquiry', others: 'Up to 2 other companies may also contact this homeowner.',
      alsoWaiting: 'Also waiting', needOutcome: '{n} enquiries need an outcome', needOutcomeP: 'One tap each. It helps us send you better enquiries.',
      last30: 'Last 30 days', stMedian: 'median first call', stContacted: 'contacted', stQuoted: 'quotes sent', stWon: 'won',
      creditLine: '{c} credits · enough for {n} enquiries', topUp: 'Top up', caught: 'You’re all caught up', caughtP: 'New enquiries appear here and in LINE.',
      pendH: 'Your application is under review', pend1: 'Application submitted', pend2: 'Company review', pend2p: 'We check your registration and contact details, and email you when it’s done.', pend3: 'Choose your service areas', pend4: 'Connect LINE alerts', pend5: '2 free enquiries unlock on approval',
      segNew: 'New', segProg: 'In progress', segClosed: 'Closed', searchPh: 'Search name, area or reference',
      mBill: 'monthly bill', mAc: 'air-cons', free: 'Free trial', cr2: '2 credits', received: 'received {t} ago', none: 'No enquiries here yet',
      st: { new: 'New', contacted: 'Contacted', visit: 'Site visit', quoted: 'Quote sent', won: 'Won', lost: 'Lost' },
      household: 'Household', prefers: 'Prefers {m}', copyNum: 'Copy number', numCopied: 'Number copied', line: 'LINE',
      progress: 'Progress', notes: 'Notes for your team', notesPh: 'e.g. Site visit Saturday 10:00',
      shareTeam: 'Share with a team member', shareTeamP: 'Creates a link to this enquiry only. Anyone with the link can read it, so share it only with staff handling this job. You can revoke it at any time.', createLink: 'Create share link', linkMade: 'Share link created',
      problem: 'Problem with this enquiry?', problemP: 'Wrong number, or not the homeowner? Request a credit review by {d}. No answer or no sale doesn’t qualify on its own.', startClaim: 'Start a claim', claimStarted: 'Claim form opened',
      meta: '{cost} · delivered {d}', paid: 'Paid · 2 credits', trialMeta: 'Free trial enquiry',
      available: 'Available', credits: 'credits', enough: 'Enough for {n} shared enquiries', plusFree: '+ {n} free enquiry', reserved: '{n} reserved · no automatic top-up',
      pkgName: '20 credits', pkgTag: 'Credit package', pkgP: '10 shared enquiries · ฿400 each', payPP: 'Pay with PromptPay', payNote: 'Online payment opens soon. You won’t be charged.', taxNote: 'Tax invoice policy pending.',
      statement: 'Statement', stmt: [['Enquiry SM-2610-039', '14 Oct · Prawet', '−2'], ['Enquiry SM-2610-033', '12 Oct · Bang Na', '−2'], ['Package purchase', '8 Oct · receipt R-0001', '+20'], ['Welcome trial', '1 Oct · 2 free enquiries', 'Free']],
      accRow: 'Accepting new enquiries', accRowP: 'Turn off when your team is fully booked. Nothing is sent or charged while paused.',
      areas: 'Service areas', areasP: 'Provinces you cover', perDay: 'Enquiries per day', perDayP: 'We stop sending once you reach this.',
      lineAlerts: 'LINE alerts', lineAlertsP: 'Get new enquiries in LINE the moment they arrive.', connect: 'Connect', connected: 'Connected',
      coDetails: 'Company details', coName: 'Company name', coContact: 'Contact name', coPhone: 'Company phone', save: 'Save changes', savedT: 'Saved',
      claims: 'Credit claims', claimsP: 'No claims yet. Start one from an enquiry within 7 days of delivery.', terms: 'Installer terms', termsP: 'Draft terms accepted 1 Oct 2026.',
      pausedT: 'Paused. No new enquiries until you turn this back on.', resumedT: 'Accepting new enquiries again.',
      minAgo: '{n} min', hAgo: '{n} h', dAgo: '{n} d', exampleTag: 'Example'
    },
    th: {
      proto: 'ต้นแบบดีไซน์ · ข้อมูลผู้ติดตั้งสมมติ · ผลประเมินใช้เครื่องคำนวณจริงของ SolarMatch', protoShort: 'ต้นแบบดีไซน์',
      protoHome: 'เว็บไซต์เจ้าของบ้าน', protoInst: 'พอร์ทัลผู้ติดตั้ง',
      navHow: 'วิธีการทำงาน', navTrust: 'ทำไมเชื่อถือได้', navInst: 'สำหรับผู้ติดตั้ง', cta: 'ประเมินฟรี', ctaLong: '',
      heroEyebrow: 'ประเมินโซลาร์บ้านฟรี · กรุงเทพฯ และปริมณฑล',
      heroH1: 'โซลาร์ช่วยบ้านคุณประหยัดได้เท่าไร?',
      heroLede: 'กรอกค่าไฟต่อเดือนแล้วตอบคำถามสั้น ๆ 10 ข้อ คุณจะเห็นขนาดระบบที่เหมาะสม ราคา และระยะเวลาคืนทุน',
      billLabel: 'ค่าไฟต่อเดือนโดยประมาณของคุณ', perMonth: 'ต่อเดือน', perMo: ' / เดือน', seeEstimate: 'ดูผลประเมินของฉัน',
      t1: 'ไม่ต้องให้เบอร์โทร', t2: 'ฟรี ไม่มีข้อผูกมัด', t3: 'ใช้อัตราค่าไฟทางการของ กฟน. และ กฟภ.',
      exTag: 'ตัวอย่าง', exWhere: 'สาทร · ค่าไฟ ฿6,000', exLess: 'ค่าไฟลดลงต่อเดือน',
      sSystem: 'ขนาดระบบ', sPrice: 'ราคาโดยประมาณ', sPayback: 'คืนทุน', years: 'ปี', yrs: 'ปี',
      credit: 'ภาพ: {p} / Pexels',
      pvEyebrow: 'ผลประเมินของคุณ', pvH2: 'ตัวเลขชัดเจน ใช้วางแผนได้จริง', pvP: 'ไม่ใช่ช่วงตัวเลขกว้าง ๆ แต่เป็นตัวเลขที่คำนวณอย่างระมัดระวัง สำหรับทุกคำถามที่เจ้าของบ้านอยากรู้',
      pv1: 'ค่าไฟลดลงเดือนละเท่าไร', pv2: 'ขนาดระบบที่เหมาะกับค่าไฟและหลังคาของคุณ', pv3: 'ราคาโดยประมาณ รวมค่าติดตั้ง', pv4: 'คืนทุนเมื่อไร และภาพรวม 25 ปี',
      pvTry: 'ลองกับค่าไฟของคุณ',
      howEyebrow: 'วิธีการทำงาน', howH2: '3 ขั้นตอนง่าย ๆ ไม่มีเซลส์โทรตาม',
      h1t: 'ตอบคำถามสั้น ๆ 10 ข้อ', h1p: 'ค่าไฟ ประเภทบ้าน หลังคา และการใช้ไฟช่วงกลางวัน ตอบ “ไม่แน่ใจ” ได้เสมอ',
      h2t: 'ดูผลประเมินฉบับเต็ม', h2p: 'เห็นทุกตัวเลขพร้อมวิธีคำนวณ ไม่ต้องให้เบอร์โทร',
      h3t: 'เปรียบเทียบผู้ติดตั้งได้สูงสุด 3 ราย', h3p: 'เฉพาะเมื่อคุณขอเท่านั้น และคุณเลือกเองว่าจะให้ใครติดต่อ', soon: 'เร็ว ๆ นี้',
      trEyebrow: 'ทำไมตัวเลขนี้เชื่อถือได้', trH2: 'ตั้งใจคำนวณอย่างระมัดระวัง',
      trP: 'ใบเสนอราคาหลายแห่งมักบอกว่าคืนทุนใน 3–6 ปี ผลของเรามักดูนานกว่า เพราะเรานับรวมสิ่งที่ใบเสนอราคาเหล่านั้นมักละไว้',
      trRows: [['ค่าบำรุงรักษาและค่าเปลี่ยนอินเวอร์เตอร์', 'นับรวม'], ['ประสิทธิภาพแผงที่ลดลงตามอายุ', 'นับรวม'], ['รายได้จากการขายไฟส่วนเกิน', 'ไม่นับ'], ['สิทธิลดหย่อนภาษี', 'ไม่นับ'], ['ค่าไฟที่อาจขึ้นในอนาคต', 'ไม่นับ']],
      trP2: 'ถ้าผู้ติดตั้งเสนอระยะคืนทุนที่เร็วกว่านี้ คุณจะรู้ว่าควรถามอะไร',
      trSrc: 'อ้างอิงแหล่งข้อมูลทางการ', src: ['อัตราค่าไฟบ้าน กฟน. · ก.ย. 2569', 'อัตราค่าไฟบ้าน กฟภ.', 'โครงการโซลาร์ภาคประชาชน กกพ. 2569', 'กรมสรรพากร · พ.ร.ฎ. ฉบับที่ 805'],
      trLink: 'อ่านวิธีคำนวณฉบับเต็ม',
      faqEyebrow: 'ก่อนตัดสินใจ', faqH2: 'คำถามที่ควรรู้ก่อน',
      faq: [
        ['ติดแผงโซลาร์แล้วหลังคาจะรั่วไหม?', 'ถ้าติดตั้งถูกวิธีจะไม่รั่ว ขายึดจะยึดกับโครงหลังคาและซีลทุกจุด ควรถามผู้ติดตั้งว่ากันซึมอย่างไรกับหลังคาแบบของคุณ และรับประกันงานหลังคาด้วยหรือไม่ นอกจากรับประกันแผง'],
        ['หน้าฝนยังผลิตไฟได้ไหม?', 'ได้ แต่ผลิตไฟได้น้อยลงในวันที่ฟ้าครึ้ม ผลประเมินใช้ข้อมูลแสงแดดระยะยาวของจังหวัดคุณ จึงนับรวมเดือนหน้าฝนไว้ในตัวเลขรายปีแล้ว'],
        ['แผงและอินเวอร์เตอร์ใช้ได้นานแค่ไหน?', 'แผงมักมีการรับประกันประสิทธิภาพระยะยาว ส่วนใหญ่ 25 ปี ส่วนอินเวอร์เตอร์มักต้องเปลี่ยนหนึ่งครั้งในช่วงนั้น เงินสำรองค่าบำรุงรักษารายปีในผลประเมินเผื่อไว้สำหรับเรื่องนี้แล้ว'],
        ['ต้องขออนุญาตการไฟฟ้าไหม?', 'ต้องขอ หากระบบเชื่อมต่อกับสายส่งไฟฟ้า บ้านในกรุงเทพฯ นนทบุรี และสมุทรปราการยื่นกับ กฟน. พื้นที่อื่นยื่นกับ กฟภ. โดยปกติผู้ติดตั้งจะดำเนินการเอกสารให้'],
        ['SolarMatch เป็นผู้ติดตั้งหรือเปล่า?', 'ไม่ใช่ เราให้ผลประเมินที่เป็นกลาง เมื่อเปิดบริการจับคู่ คุณเลือกได้ว่าจะเปรียบเทียบใบเสนอราคาจากผู้ติดตั้งในพื้นที่ที่ผ่านการอนุมัติได้สูงสุด 3 ราย ผู้ติดตั้งจ่ายค่าบริการให้เราต่อคำขอ คุณไม่ต้องจ่ายอะไร']
      ],
      soonH: 'เปรียบเทียบผู้ติดตั้งในพื้นที่ได้สูงสุด 3 ราย', soonP: 'เปิดให้บริการในกรุงเทพฯ เร็ว ๆ นี้ ผลประเมินฟรีเสมอ และจะไม่มีใครโทรหาคุณ เว้นแต่คุณขอ', start: 'เริ่มประเมิน',
      finalH: 'ดูว่าหลังคาบ้านคุณทำอะไรได้บ้าง', finalBtn: 'เริ่มประเมินฟรี',
      ftTag: 'ผลประเมินโซลาร์ที่เป็นกลางสำหรับบ้านในไทย', ftEst: 'ประเมิน', ftLearn: 'ความรู้', ftCo: 'บริษัท',
      ftLinks: [['เริ่มประเมิน', 'วิธีการทำงาน', 'วิธีคำนวณ'], ['คู่มือโซลาร์', 'แหล่งข้อมูลทางการ', 'คำถามที่พบบ่อย'], ['สำหรับผู้ติดตั้ง', 'ติดต่อเรา', 'ความเป็นส่วนตัว', 'ข้อกำหนด']],
      ftFine: 'เวอร์ชันก่อนเปิดตัว ตัวเลขทั้งหมดเป็นค่าประเมินเพื่อวางแผน ไม่ใช่ใบเสนอราคา',
      qOf: 'ข้อ {n} จาก {t}', almost: 'ข้อสุดท้าย', back: 'ย้อนกลับ', next: 'ถัดไป', seeMine: 'ดูผลประเมิน', exit: 'ออกจากการประเมิน',
      provHelp: 'ปริมาณแสงแดดและอัตราค่าไฟขึ้นอยู่กับที่ตั้งของบ้าน', otherProv: 'จังหวัดอื่น…', district: 'เขต/อำเภอ', districtPh: 'เลือกเขต/อำเภอ (ไม่บังคับ)', provinceLbl: 'จังหวัด',
      billHelp: 'ดูจากบิลค่าไฟล่าสุดของ กฟน. หรือ กฟภ. ตัวเลขโดยประมาณก็ได้',
      loadsHelp: 'เลือกทุกอย่างที่ติดตั้งไว้ แม้จะไม่ได้เปิดทั้งวัน',
      contactHelp: 'บริการจับคู่จะเปิดเร็ว ๆ นี้ ผลประเมินของคุณพร้อมแล้วไม่ว่าจะเลือกแบบไหน',
      contactYes: 'ขอบคุณ เมื่อเปิดบริการจับคู่ เราจะแสดงตัวเลือกในหน้าผลประเมิน วันนี้เราจะยังไม่ขอข้อมูลติดต่อของคุณ',
      yourAnswers: 'คำตอบของคุณ', edit: 'แก้ไข', youGet: 'สิ่งที่คุณจะได้รับ', yg: ['ขนาดระบบที่เหมาะกับค่าไฟและหลังคา', 'ราคาโดยประมาณและค่าไฟที่ลดลง', 'ระยะคืนทุนและภาพรวม 25 ปี'], saved: 'บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น',
      sumLbl: { province: 'ที่ตั้ง', monthlyBillThb: 'ค่าไฟต่อเดือน', activelyPlanningSolar: 'ช่วงเวลา', projectType: 'โครงการ', propertyType: 'ประเภทบ้าน', ownershipStatus: 'สถานะ', daytimePattern: 'ใช้ไฟกลางวัน', daytimeLoads: 'เครื่องใช้ไฟฟ้า', shade: 'เงาบนหลังคา', roofMaterial: 'หลังคา', quoteContactRequested: 'ใบเสนอราคา' },
      needChoice: 'เลือกคำตอบเพื่อไปต่อ', needBill: 'กรอกค่าไฟเพื่อไปต่อ', needText: 'กรอกรายละเอียดสั้น ๆ เพื่อไปต่อ',
      ldH: 'กำลังเตรียมผลประเมิน', ld1: 'อ่านอัตราค่าไฟบ้านของ {u}', ld2: 'คำนวณขนาดระบบจากค่าไฟและหลังคา', ld3: 'คำนวณการประหยัดและระยะคืนทุน',
      rEyebrow: 'ผลประเมินของคุณ · {place}', rLess: 'ค่าไฟที่ลดลงในแต่ละเดือน', rPct: 'ประมาณ {p}% ของค่าไฟที่จ่ายอยู่ตอนนี้',
      rSystem: 'ขนาดระบบ', rPrice: 'ราคาโดยประมาณ', rPayback: 'คืนทุนอย่างง่าย',
      rFine: 'ผลประเมินเพื่อวางแผน ไม่ใช่ใบเสนอราคา', rHow: 'วิธีคำนวณ',
      cTitle: 'ค่าใช้จ่าย 25 ปี เมื่อติดและไม่ติดโซลาร์', cWith: 'ติดโซลาร์', cWithout: 'ไม่ติดโซลาร์', cCross: 'จุดคุ้มทุนราวปีที่ {y}', cGap: 'ประหยัด {a}', cGapNeg: 'จ่ายมากกว่า {a}', cNote: 'รวมราคาโดยประมาณ เงินสำรองบำรุงรักษารายปี และประสิทธิภาพแผงที่ลดลงปีละ 0.5% ไม่รวมรายได้จากการขายไฟ สิทธิลดหย่อนภาษี ต้นทุนทางการเงิน และค่าไฟที่อาจขึ้นในอนาคต',
      billTitle: 'ค่าไฟต่อเดือน', bToday: 'ตอนนี้', bAfter: 'เมื่อติดโซลาร์',
      exTitle: 'สิทธิประโยชน์เพิ่มเติมที่ยังไม่ได้นับรวม', ex1: 'ลดหย่อนภาษีได้สูงสุด ฿200,000', ex2: 'ขายไฟส่วนเกิน ฿2.20/หน่วย', exNote: 'ทั้งสองข้อขึ้นอยู่กับเงื่อนไขและการอนุมัติ',
      dfTitle: 'ทำไมใบเสนอราคาอาจต่างจากนี้', dfP: 'ผู้ติดตั้งจะสำรวจหลังคาและเลือกอุปกรณ์จริง บางรายแสดงระยะคืนทุนที่เร็วกว่า เพราะนับรายได้จากการขายไฟหรือค่าไฟที่อาจขึ้นในอนาคต ซึ่งเราไม่ได้นับ',
      rfTitle: 'ปรับให้แม่นยำขึ้น', rfP: 'ไม่บังคับ ตัวเลขจะอัปเดตทันทีที่เลือก', updated: 'อัปเดตผลประเมินแล้ว',
      rf: { roofDirection: 'หลังคาหันไปทางไหน?', roofSlope: 'ความชันหลังคา', roofArea: 'พื้นที่หลังคาที่ใช้ได้', electricityPhase: 'ระบบไฟฟ้า' },
      rfo: {
        roofDirection: [['', 'ไม่ระบุ'], ['south-group', 'หันทิศใต้'], ['east', 'ทิศตะวันออก'], ['west', 'ทิศตะวันตก'], ['north', 'ทิศเหนือ'], ['flat', 'หลังคาแบน'], ['several', 'หลายทิศ'], ['unsure', 'ไม่แน่ใจ']],
        roofSlope: [['', 'ไม่ระบุ'], ['flat', 'แบน'], ['gentle', 'ลาดเล็กน้อย'], ['steep', 'ชัน'], ['unsure', 'ไม่แน่ใจ']],
        roofArea: [['', 'ไม่ระบุ'], ['under-30', 'ต่ำกว่า 30 ตร.ม.'], ['30-60', '30–60 ตร.ม.'], ['60-100', '60–100 ตร.ม.'], ['100-200', '100–200 ตร.ม.'], ['over-200', 'มากกว่า 200 ตร.ม.'], ['unsure', 'ไม่แน่ใจ']],
        electricityPhase: [['', 'ไม่ระบุ'], ['single', 'ไฟ 1 เฟส'], ['three', 'ไฟ 3 เฟส'], ['unsure', 'ไม่แน่ใจ']]
      },
      nsTitle: 'ขั้นต่อไป', nsLine: 'แชร์ทาง LINE', nsCopy: 'คัดลอกลิงก์', copied: 'คัดลอกลิงก์แล้ว', shareNote: 'บนเว็บไซต์จริง ปุ่มนี้จะเปิด LINE พร้อมลิงก์ไปยังผลประเมินนี้',
      qaTitle: 'คำถามที่ควรถามผู้ติดตั้ง', qa: ['ใช้แผงและอินเวอร์เตอร์ยี่ห้ออะไร รับประกันกี่ปี?', 'ราคารวมค่าขออนุญาตการไฟฟ้าแล้วหรือไม่?', 'กันซึมหลังคาอย่างไร และรับประกันงานหลังคาไหม?', 'มีแอปดูการผลิตไฟไหม?', 'ค่าบำรุงรักษารายปีเท่าไร?'],
      mtTitle: 'เปรียบเทียบผู้ติดตั้งได้สูงสุด 3 ราย', mtP: 'เปิดให้บริการในกรุงเทพฯ เร็ว ๆ นี้',
      bdTitle: 'รายละเอียดทั้งหมดและแหล่งข้อมูล', bd: { use: 'การใช้ไฟต่อเดือน', gen: 'ผลิตไฟต่อปี', self: 'ใช้เองในบ้าน', exp: 'ส่งเข้าระบบ', after: 'ค่าไฟหลังติดโซลาร์', maint: 'เงินสำรองบำรุงรักษาต่อปี', net: 'ผลประโยชน์สุทธิ 25 ปี', tariff: 'อัตราค่าไฟ', method: 'เวอร์ชันวิธีคำนวณ' },
      change: 'แก้ไขคำตอบ', restart: 'เริ่มใหม่',
      verdicts: { 'strong-fit': 'โซลาร์น่าจะเหมาะกับบ้านของคุณ', 'worth-comparing': 'โซลาร์อาจเหมาะกับบ้านของคุณ', 'site-check-first': 'ควรตรวจหลังคาเป็นอันดับแรก' },
      negNote: 'ที่ค่าไฟระดับนี้ โซลาร์มีค่าใช้จ่ายรวม 25 ปีมากกว่าที่ประหยัดได้ ควรเปรียบเทียบอย่างรอบคอบก่อนตัดสินใจ',
      iEyebrow: 'SolarMatch สำหรับผู้ติดตั้ง · กรุงเทพฯ', iH1: 'ลูกค้าที่รู้ตัวเลขของตัวเองมาแล้ว',
      iLede: 'ทุกคำขอมาพร้อมค่าไฟ เครื่องใช้ไฟฟ้า หลังคา และช่วงเวลาที่ต้องการติดตั้ง จากเจ้าของบ้านที่ขอให้ติดต่อกลับเอง',
      iApply: 'สมัครเป็นผู้ติดตั้ง', iDemo: 'ลองใช้พอร์ทัลตัวอย่าง', signIn: 'เข้าสู่ระบบ', apply: 'สมัคร',
      tPrice: 'ราคาต่อคำขอ', tPriceV: '฿400 · 2 เครดิต', tCos: 'จำนวนบริษัทต่อเจ้าของบ้าน', tCosV: 'ไม่เกิน 3 ราย', tStart: 'เริ่มต้น', tStartV: 'ฟรี 2 คำขอ', tClaim: 'ข้อมูลผิด?', tClaimV: 'ยื่นเคลมได้ใน 7 วัน', draft: 'เงื่อนไขฉบับร่าง ไม่มีค่าสมาชิก ไม่มีการตัดเงินอัตโนมัติ',
      sample: 'ตัวอย่างคำขอ', iHowH: 'จากอนุมัติถึงสายแรก',
      ih1t: 'สมัคร', ih1p: 'บอกข้อมูลบริษัทและจังหวัดที่ให้บริการ เราตรวจสอบผู้ติดตั้งทุกราย',
      ih2t: 'เชื่อมต่อ LINE', ih2p: 'คำขอใหม่ส่งเข้า LINE ทันทีที่ได้รับ',
      ih3t: 'โทรให้ไว', ih3p: '2 คำขอแรกฟรี อาจมีบริษัทอื่นอีกไม่เกิน 2 รายติดต่อด้วย ความเร็วจึงสำคัญ',
      fairH: 'ยุติธรรมตั้งแต่การออกแบบ', fairP: 'ปัญหาที่ผู้ติดตั้งมักเจอจากเว็บหาลูกค้า คือแชร์ลูกค้าให้หลายราย ราคาเปลี่ยนไปมา และขอคืนเงินยาก เราจึงออกแบบเงื่อนไขให้ตรงกันข้าม',
      fairCols: ['เว็บหาลูกค้าทั่วไป', 'SolarMatch'], fair: [['แชร์ให้ผู้ให้บริการ 5 รายขึ้นไป', 'ไม่เกิน 3 บริษัท'], ['ราคาเปลี่ยนตามการประมูล', 'ราคาคงที่ราคาเดียว'], ['คืนเงินตามดุลยพินิจของแพลตฟอร์ม', 'ตรวจสอบเคลมชัดเจนภายใน 7 วัน'], ['มีค่าสมาชิกรายเดือน', 'ไม่มีค่าสมาชิก']],
      iFaqH: 'คำถามจากผู้ติดตั้ง',
      iFaq: [['เคลมแบบไหนที่ใช้ได้?', 'ข้อมูลติดต่อผิดหรือติดต่อไม่ได้ หรือคำขอที่ไม่ได้มาจากเจ้าของบ้าน การไม่รับสายหรือไม่ได้งานเพียงอย่างเดียวไม่นับเป็นเหตุเคลม'], ['คำขอถูกส่งให้อย่างไร?', 'ตามพื้นที่ให้บริการและจำนวนคำขอต่อวันของคุณ และไม่เกิน 3 บริษัทต่อเจ้าของบ้านหนึ่งราย'], ['หยุดรับชั่วคราวได้ไหม?', 'ได้ ปิด “รับคำขอใหม่” ได้ทุกเมื่อ ระหว่างหยุดจะไม่มีการส่งคำขอหรือเรียกเก็บเงิน']],
      pToday: 'วันนี้', pEnq: 'คำขอ', pCredits: 'เครดิต', pCompany: 'บริษัท', accepting: 'รับคำขอใหม่', paused: 'หยุดรับชั่วคราว',
      demoView: 'มุมมองตัวอย่าง', approved: 'อนุมัติแล้ว', pending: 'รอตรวจสอบ', homeSite: 'เว็บไซต์เจ้าของบ้าน', signOut: 'ออกจากระบบ',
      callNext: 'โทรหาคนถัดไป', waiting: 'รอ {t}', callX: 'โทรหา {n}', openEnq: 'เปิดคำขอ', others: 'อาจมีบริษัทอื่นอีกไม่เกิน 2 รายติดต่อเจ้าของบ้านรายนี้',
      alsoWaiting: 'รอการติดต่อ', needOutcome: 'มี {n} คำขอที่ยังไม่ได้อัปเดตผล', needOutcomeP: 'แตะครั้งเดียวต่อรายการ ช่วยให้เราส่งคำขอที่ตรงกับคุณมากขึ้น',
      last30: '30 วันที่ผ่านมา', stMedian: 'เวลาโทรครั้งแรก (มัธยฐาน)', stContacted: 'ติดต่อแล้ว', stQuoted: 'ส่งใบเสนอราคา', stWon: 'ปิดการขาย',
      creditLine: '{c} เครดิต · พอสำหรับ {n} คำขอ', topUp: 'เติมเครดิต', caught: 'ติดต่อครบทุกรายแล้ว', caughtP: 'คำขอใหม่จะแสดงที่นี่และใน LINE',
      pendH: 'ใบสมัครของคุณอยู่ระหว่างตรวจสอบ', pend1: 'ส่งใบสมัครแล้ว', pend2: 'ตรวจสอบบริษัท', pend2p: 'เราตรวจสอบข้อมูลจดทะเบียนและข้อมูลติดต่อ และจะแจ้งทางอีเมลเมื่อเสร็จ', pend3: 'เลือกพื้นที่ให้บริการ', pend4: 'เชื่อมต่อการแจ้งเตือน LINE', pend5: 'รับ 2 คำขอฟรีเมื่อได้รับอนุมัติ',
      segNew: 'ใหม่', segProg: 'กำลังดำเนินการ', segClosed: 'ปิดแล้ว', searchPh: 'ค้นหาชื่อ พื้นที่ หรือเลขอ้างอิง',
      mBill: 'ค่าไฟต่อเดือน', mAc: 'เครื่องปรับอากาศ', free: 'ทดลองฟรี', cr2: '2 เครดิต', received: 'ได้รับเมื่อ {t} ที่แล้ว', none: 'ยังไม่มีคำขอในหมวดนี้',
      st: { new: 'ใหม่', contacted: 'ติดต่อแล้ว', visit: 'นัดดูหน้างาน', quoted: 'ส่งใบเสนอราคา', won: 'ปิดการขายได้', lost: 'ไม่ได้งาน' },
      household: 'ข้อมูลบ้าน', prefers: 'สะดวกติดต่อทาง {m}', copyNum: 'คัดลอกเบอร์', numCopied: 'คัดลอกเบอร์แล้ว', line: 'LINE',
      progress: 'ความคืบหน้า', notes: 'บันทึกสำหรับทีม', notesPh: 'เช่น นัดดูหน้างานวันเสาร์ 10:00',
      shareTeam: 'แชร์ให้ทีมงาน', shareTeamP: 'สร้างลิงก์ไปยังคำขอนี้เท่านั้น ใครมีลิงก์ก็เปิดอ่านได้ จึงควรแชร์เฉพาะทีมงานที่ดูแลงานนี้ และยกเลิกลิงก์ได้ทุกเมื่อ', createLink: 'สร้างลิงก์แชร์', linkMade: 'สร้างลิงก์แชร์แล้ว',
      problem: 'คำขอนี้มีปัญหา?', problemP: 'เบอร์ผิด หรือไม่ใช่เจ้าของบ้าน? ขอตรวจสอบเครดิตได้ภายใน {d} การไม่รับสายหรือไม่ได้งานเพียงอย่างเดียวไม่นับเป็นเหตุเคลม', startClaim: 'เริ่มยื่นเคลม', claimStarted: 'เปิดแบบฟอร์มเคลมแล้ว',
      meta: '{cost} · ส่งเมื่อ {d}', paid: 'ชำระแล้ว · 2 เครดิต', trialMeta: 'คำขอทดลองฟรี',
      available: 'คงเหลือ', credits: 'เครดิต', enough: 'พอสำหรับ {n} คำขอแบบแชร์', plusFree: '+ ฟรีอีก {n} คำขอ', reserved: 'กันไว้ {n} · ไม่มีการตัดเงินอัตโนมัติ',
      pkgName: '20 เครดิต', pkgTag: 'แพ็กเกจเครดิต', pkgP: '10 คำขอแบบแชร์ · คำขอละ ฿400', payPP: 'ชำระผ่านพร้อมเพย์', payNote: 'การชำระเงินออนไลน์จะเปิดเร็ว ๆ นี้ คุณจะไม่ถูกเรียกเก็บเงิน', taxNote: 'นโยบายใบกำกับภาษีอยู่ระหว่างจัดทำ',
      statement: 'รายการเคลื่อนไหว', stmt: [['คำขอ SM-2610-039', '14 ต.ค. · ประเวศ', '−2'], ['คำขอ SM-2610-033', '12 ต.ค. · บางนา', '−2'], ['ซื้อแพ็กเกจ', '8 ต.ค. · ใบเสร็จ R-0001', '+20'], ['สิทธิ์ทดลอง', '1 ต.ค. · ฟรี 2 คำขอ', 'ฟรี']],
      accRow: 'รับคำขอใหม่', accRowP: 'ปิดเมื่อทีมงานคิวเต็ม ระหว่างหยุดจะไม่มีการส่งคำขอหรือเรียกเก็บเงิน',
      areas: 'พื้นที่ให้บริการ', areasP: 'จังหวัดที่คุณให้บริการ', perDay: 'จำนวนคำขอต่อวัน', perDayP: 'เราจะหยุดส่งเมื่อถึงจำนวนนี้',
      lineAlerts: 'แจ้งเตือนทาง LINE', lineAlertsP: 'รับคำขอใหม่ทาง LINE ทันทีที่เข้ามา', connect: 'เชื่อมต่อ', connected: 'เชื่อมต่อแล้ว',
      coDetails: 'ข้อมูลบริษัท', coName: 'ชื่อบริษัท', coContact: 'ชื่อผู้ติดต่อ', coPhone: 'เบอร์โทรบริษัท', save: 'บันทึกการเปลี่ยนแปลง', savedT: 'บันทึกแล้ว',
      claims: 'การเคลมเครดิต', claimsP: 'ยังไม่มีการเคลม เริ่มได้จากหน้าคำขอภายใน 7 วันหลังได้รับ', terms: 'ข้อตกลงผู้ติดตั้ง', termsP: 'ยอมรับข้อตกลงฉบับร่างเมื่อ 1 ต.ค. 2569',
      pausedT: 'หยุดรับชั่วคราว จะไม่มีคำขอใหม่จนกว่าคุณจะเปิดอีกครั้ง', resumedT: 'กลับมารับคำขอใหม่แล้ว',
      minAgo: '{n} นาที', hAgo: '{n} ชม.', dAgo: '{n} วัน', exampleTag: 'ตัวอย่าง'
    }
  };

  /* ---------------- v3 copy: simpler, fewer words ---------------- */
  Object.assign(T.en, {
    proto: 'Design prototype v3 · fictional installer data · estimates use SolarMatch’s real calculator', protoShort: 'Prototype v3',
    heroLede: 'Answer 10 short questions and see your home’s future with solar.',
    billLabel: 'Your monthly electricity bill', t1: 'Free', t2: 'Official MEA & PEA tariffs',
    exEyebrow: 'Example estimate', exH2: 'Real numbers you can plan with.', exWhere: 'Sathon · ฿6,000 bill',
    exBill: 'Monthly bill', today: 'Today', withSolar: 'With solar', exSave: '{a} less each month',
    howH2: 'How it works',
    h1p: 'Your bill, home and roof. “Not sure” is always an answer.', h2p: 'Every number, with the method behind it.', h3p: 'Only if you ask. You choose who calls.',
    trP: 'We count the costs and leave out the extras. If an installer quotes a faster payback, ask which extras they counted.',
    trRows: [['Full installation', 'Included'], ['Maintenance and inverter replacement', 'Included'], ['Panels ageing 0.5% a year', 'Included'], ['Income from selling surplus power', 'Not included'], ['Tax deduction up to ฿200,000', 'Not included']],
    trP: 'We count the real costs and leave out the extras. So if an installer quotes a faster payback, you’ll know exactly what to ask.',
    src: ['MEA residential tariff', 'PEA residential tariff', 'Solar resource & price evidence'],
    faqH2: 'Commonly asked questions', ansEmpty: 'Your answers will appear here as you go.',
    provinceLbl: 'Province', district: 'District', districtPh: 'Choose', districtNone: 'Not needed', otherProv: 'Another province', customLoc: 'Province or area', customLocPh: 'e.g. Chonburi',
    privacy: 'Your answers stay in this browser. Contact details are only sent if you submit them.',
    rEyebrow: 'Your monthly bill · {place}', rSave: '{a} less each month', rPct: 'about {p}% of today’s bill',
    xTitle: 'Extras you may qualify for', xP: 'Not in the estimate above. Add the ones that apply to you.',
    xTax: 'Tax deduction', xTaxP: 'Up to ฿200,000 off taxable income, once. Grid-connected, installed by 31 Dec 2028, with an e-Tax invoice.',
    xRate: 'Your top income tax rate', xSell: 'Sell surplus power', xSellP: '฿2.20 a unit for 10 years under the ERC programme, if approved.', xSellNo: 'Only systems up to 5 kW qualify.',
    xTaxV: 'less tax, once', xSellV: 'a year from surplus', xPbV: 'payback with extras', x25: '{a} over 25 years with extras',
    rfTitle: 'Make it more precise', rfOpt: 'Optional',
    iLede: 'Every enquiry comes with the bill, home, roof and timeframe, from a homeowner who asked to be called.',
    iApply: 'Apply as an installer', iDemo: 'Explore the demo',
    iFacts: [['฿400', 'per enquiry'], ['3', 'companies at most'], ['2', 'free enquiries to start'], ['7 days', 'to claim wrong details']],
    draft: 'Draft terms. No subscription and no automatic billing.',
    iHowH: 'How it works', ih1p: 'Tell us your company and the provinces you cover.', ih2p: 'New enquiries arrive in LINE straight away.', ih3p: 'Your first 2 enquiries are free. Speed wins jobs.',
    nextAct: { new: 'Mark as contacted', contacted: 'Site visit booked', visit: 'Quote sent', quoted: 'Mark as won' }, markLost: 'Mark as lost', reopen: 'Reopen', closedAs: 'Closed · {s}',
    moreHome: 'More about the home', autosave: 'Saved automatically.',
    needOutcome: '{n} enquiries need an update', lineAlertsP: 'New enquiries in LINE, straight away.'
  });
  Object.assign(T.th, {
    proto: 'ต้นแบบดีไซน์ v3 · ข้อมูลผู้ติดตั้งสมมติ · ผลประเมินใช้เครื่องคำนวณจริงของ SolarMatch', protoShort: 'ต้นแบบ v3',
    heroLede: 'ตอบคำถามสั้น ๆ 10 ข้อ แล้วดูอนาคตของบ้านคุณกับโซลาร์',
    billLabel: 'ค่าไฟต่อเดือนของคุณ', t1: 'ฟรี', t2: 'อัตราค่าไฟทางการของ กฟน. และ กฟภ.',
    exEyebrow: 'ตัวอย่างผลประเมิน', exH2: 'ตัวเลขจริงที่ใช้วางแผนได้', exWhere: 'สาทร · ค่าไฟ ฿6,000',
    exBill: 'ค่าไฟต่อเดือน', today: 'ตอนนี้', withSolar: 'เมื่อติดโซลาร์', exSave: 'ลดลง {a} ต่อเดือน',
    howH2: 'วิธีการทำงาน',
    h1p: 'ค่าไฟ บ้าน และหลังคา ตอบ “ไม่แน่ใจ” ได้เสมอ', h2p: 'เห็นทุกตัวเลขพร้อมวิธีคำนวณ', h3p: 'เฉพาะเมื่อคุณขอ และคุณเลือกเองว่าใครจะโทรมา',
    trP: 'เรานับต้นทุนครบ และไม่นับสิทธิประโยชน์เสริม ถ้าผู้ติดตั้งเสนอระยะคืนทุนที่เร็วกว่า ลองถามว่าเขานับข้อไหนเข้าไปบ้าง',
    trRows: [['ค่าติดตั้งครบชุด', 'รวมแล้ว'], ['ค่าบำรุงรักษาและเปลี่ยนอินเวอร์เตอร์', 'รวมแล้ว'], ['แผงเสื่อมประสิทธิภาพปีละ 0.5%', 'รวมแล้ว'], ['รายได้จากการขายไฟส่วนเกิน', 'ไม่ได้รวม'], ['ลดหย่อนภาษีสูงสุด ฿200,000', 'ไม่ได้รวม']],
    trP: 'เรานับต้นทุนจริงครบ และไม่นับสิทธิประโยชน์เสริม ถ้าผู้ติดตั้งเสนอระยะคืนทุนที่เร็วกว่านี้ คุณจะรู้ว่าควรถามอะไร',
    src: ['อัตราค่าไฟบ้าน กฟน.', 'อัตราค่าไฟบ้าน กฟภ.', 'ข้อมูลแสงแดดและราคาอ้างอิง'],
    faqH2: 'คำถามที่พบบ่อย', ansEmpty: 'คำตอบของคุณจะแสดงที่นี่',
    provinceLbl: 'จังหวัด', district: 'เขต/อำเภอ', districtPh: 'เลือก', districtNone: 'ไม่ต้องระบุ', otherProv: 'จังหวัดอื่น', customLoc: 'จังหวัดหรือพื้นที่', customLocPh: 'เช่น ชลบุรี',
    privacy: 'คำตอบของคุณเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ข้อมูลติดต่อจะถูกส่งเมื่อคุณกดส่งเองเท่านั้น',
    rEyebrow: 'ค่าไฟต่อเดือน · {place}', rSave: 'ลดลง {a} ต่อเดือน', rPct: 'ประมาณ {p}% ของค่าไฟตอนนี้',
    xTitle: 'สิทธิประโยชน์ที่คุณอาจได้รับ', xP: 'ไม่ได้รวมในผลประเมินด้านบน เลือกเพิ่มเฉพาะข้อที่ตรงกับคุณ',
    xTax: 'ลดหย่อนภาษี', xTaxP: 'ลดหย่อนเงินได้สูงสุด ฿200,000 ครั้งเดียว สำหรับระบบที่เชื่อมต่อการไฟฟ้า ติดตั้งภายใน 31 ธ.ค. 2571 และมีใบกำกับภาษีอิเล็กทรอนิกส์',
    xRate: 'อัตราภาษีเงินได้สูงสุดที่คุณเสีย', xSell: 'ขายไฟส่วนเกิน', xSellP: 'หน่วยละ ฿2.20 นาน 10 ปี ตามโครงการของ กกพ. หากได้รับอนุมัติ', xSellNo: 'เฉพาะระบบไม่เกิน 5 kW',
    xTaxV: 'ภาษีที่ลดลง ครั้งเดียว', xSellV: 'ต่อปีจากการขายไฟ', xPbV: 'คืนทุนเมื่อรวมสิทธิประโยชน์', x25: '{a} ใน 25 ปี เมื่อรวมสิทธิประโยชน์',
    rfTitle: 'ปรับให้แม่นยำขึ้น', rfOpt: 'ไม่บังคับ',
    iLede: 'ทุกคำขอมาพร้อมค่าไฟ ข้อมูลบ้าน หลังคา และช่วงเวลาที่ต้องการติดตั้ง จากเจ้าของบ้านที่ขอให้โทรกลับเอง',
    iApply: 'สมัครเป็นผู้ติดตั้ง', iDemo: 'ลองใช้พอร์ทัลตัวอย่าง',
    iFacts: [['฿400', 'ต่อคำขอ'], ['3', 'บริษัทสูงสุดต่อเจ้าของบ้าน'], ['2', 'คำขอฟรีเมื่อเริ่มต้น'], ['7 วัน', 'ยื่นเคลมข้อมูลผิด']],
    draft: 'เงื่อนไขฉบับร่าง ไม่มีค่าสมาชิก และไม่มีการตัดเงินอัตโนมัติ',
    iHowH: 'วิธีการทำงาน', ih1p: 'บอกข้อมูลบริษัทและจังหวัดที่ให้บริการ', ih2p: 'คำขอใหม่ส่งเข้า LINE ทันที', ih3p: '2 คำขอแรกฟรี ยิ่งโทรเร็วยิ่งได้งาน',
    nextAct: { new: 'ติดต่อแล้ว', contacted: 'นัดดูหน้างานแล้ว', visit: 'ส่งใบเสนอราคาแล้ว', quoted: 'ปิดการขายได้' }, markLost: 'ไม่ได้งาน', reopen: 'เปิดอีกครั้ง', closedAs: 'ปิดแล้ว · {s}',
    moreHome: 'ข้อมูลบ้านเพิ่มเติม', autosave: 'บันทึกอัตโนมัติ',
    needOutcome: 'มี {n} คำขอที่ต้องอัปเดต', lineAlertsP: 'รับคำขอใหม่ทาง LINE ทันที'
  });

  /* ---------------- state ---------------- */
  function load(k, d) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function store(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  var S = {
    lang: (function () { try { return localStorage.getItem('sm-lang') || 'en'; } catch (e) { return 'en'; } })(),
    answers: load('sm-answers', { province: 'bangkok', monthlyBillThb: 4000 }),
    step: load('sm-step', 0),
    refine: load('sm-refine', {}),
    extras: load('sm-extras', { tax: false, rate: '0.2', sell: false }),
    portal: { accepting: true, approval: 'approved', seg: 'new', q: '', status: { e39: 'new', e41: 'new', e33: 'contacted', e28: 'quoted' }, notes: {}, areas: ['bangkok', 'samut-prakan'], perDay: 3, line: false, ex: false }
  };
  var NOW = Date.now();
  var ENQ = [
    { id: 'e39', ref: 'SM-2610-039', name: 'Arun', loc: { en: 'Prawet, Bangkok', th: 'ประเวศ กรุงเทพฯ' }, phone: '081 234 5678', mins: 12, cost: 'paid', method: 'phone', a: { propertyType: 'detached-home', ownershipStatus: 'owner', monthlyBillThb: 7200, daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump'], airConditionerCount: 6, roofMaterial: 'concrete-tile', shade: 'almost-none', activelyPlanningSolar: 'within-3-months', projectType: 'new-rooftop' } },
    { id: 'e41', ref: 'SM-2610-041', name: 'Natee', loc: { en: 'Sathon, Bangkok', th: 'สาทร กรุงเทพฯ' }, phone: '089 876 5432', mins: 64, cost: 'trial', method: 'line', a: { propertyType: 'townhouse', ownershipStatus: 'owner', monthlyBillThb: 6000, daytimePattern: 'moderate', daytimeLoads: ['air-conditioning', 'home-office-equipment'], airConditionerCount: 5, roofMaterial: 'clay-tile', shade: 'little', activelyPlanningSolar: 'three-six-months', projectType: 'solar-with-battery' } },
    { id: 'e33', ref: 'SM-2610-033', name: 'Ploy', loc: { en: 'Bang Na, Bangkok', th: 'บางนา กรุงเทพฯ' }, phone: '086 555 0199', mins: 60 * 26, cost: 'paid', method: 'phone', a: { propertyType: 'large-home', ownershipStatus: 'owner', monthlyBillThb: 9500, daytimePattern: 'very-high', daytimeLoads: ['air-conditioning', 'pump', 'ev'], airConditionerCount: 8, roofMaterial: 'metal-sheet', shade: 'almost-none', activelyPlanningSolar: 'within-3-months', projectType: 'new-rooftop' } },
    { id: 'e28', ref: 'SM-2610-028', name: 'Wichai', loc: { en: 'Mueang, Samut Prakan', th: 'เมือง สมุทรปราการ' }, phone: '082 300 4411', mins: 60 * 24 * 4, cost: 'trial', method: 'phone', a: { propertyType: 'detached-home', ownershipStatus: 'owner', monthlyBillThb: 5200, daytimePattern: 'moderate', daytimeLoads: ['air-conditioning'], airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'some', activelyPlanningSolar: 'six-twelve-months', projectType: 'new-rooftop' } }
  ];

  function t(k, vars) { var v = (T[S.lang] && T[S.lang][k] !== undefined) ? T[S.lang][k] : T.en[k]; if (typeof v === 'string' && vars) Object.keys(vars).forEach(function (x) { v = v.split('{' + x + '}').join(vars[x]); }); return v; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function baht(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }
  function bahtK(n) { return Math.abs(n) >= 1000000 ? '฿' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M' : '฿' + Math.round(n / 1000) + 'k'; }
  function fmtYears(y) { var r = Math.round(y * 10) / 10; return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)); }
  function ago(mins) { if (mins < 60) return t('minAgo', { n: mins }); if (mins < 60 * 24) return t('hAgo', { n: Math.round(mins / 60) }); return t('dAgo', { n: Math.round(mins / 1440) }); }
  function Q(id) { return E.initialQuestionnaire.questions.filter(function (q) { return q.id === id; })[0]; }
  function optLabel(qid, val) { var q = Q(qid); if (!q || !q.options) return val; var o = q.options.filter(function (x) { return x.value === val; })[0]; return o ? o.label[S.lang] : val; }
  function provLabel(v) { var p = E.provinceOptions.filter(function (x) { return x.value === v; })[0]; return p ? (p.label ? p.label[S.lang] : (p[S.lang] || v)) : v; }
  function distList(p) { return (E.districtsByProvince[p] || []).slice().sort(function (a, b) { return a[S.lang].localeCompare(b[S.lang], S.lang); }); }
  function distLabel(p, v) { var d = (E.districtsByProvince[p] || []).filter(function (x) { return x.value === v; })[0]; return d ? d[S.lang] : ''; }

  /* ---------------- calculator ---------------- */
  function engineAnswers(a, extra) {
    var tf = a.activelyPlanningSolar;
    var out = {
      province: a.province || 'bangkok', district: a.district || undefined, monthlyBillThb: Number(a.monthlyBillThb) || 0,
      activelyPlanningSolar: tf ? tf !== 'researching' : true, planningTimeframe: tf || 'within-3-months',
      projectType: a.projectType || 'new-rooftop', propertyType: a.propertyType || 'detached-home', ownershipStatus: a.ownershipStatus || 'owner',
      daytimePattern: a.daytimePattern || 'moderate', daytimeLoads: (a.daytimeLoads && a.daytimeLoads.length) ? a.daytimeLoads : ['none'],
      airConditionerCount: a.airConditionerCount || 0, roofMaterial: a.roofMaterial || 'unsure', shade: a.shade || 'unsure', quoteContactRequested: false
    };
    if (out.daytimeLoads.indexOf('air-conditioning') < 0) delete out.airConditionerCount;
    if (a.customPropertyType) out.customPropertyType = a.customPropertyType;
    if (a.province === 'other' && a.customLocation) out.customLocation = a.customLocation;
    if (a.customDaytimeLoad) out.customDaytimeLoad = a.customDaytimeLoad;
    Object.keys(extra || {}).forEach(function (k) { if (extra[k]) out[k] = extra[k]; });
    return out;
  }
  function calc(a, extra) { try { return E.calculateEstimate(engineAnswers(a, extra)); } catch (e) { console.error(e); return null; } }
  var EXAMPLE = { province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'almost-none' };

  /* ---------------- layout pieces ---------------- */
  function protoStrip(side) {
    return '<div class="proto"><div class="wrap"><span class="long">' + esc(t('proto')) + '</span><span class="short">' + esc(t('protoShort')) + '</span><nav aria-label="Prototype sections"><a href="#home" aria-current="' + (side === 'home') + '">' + esc(t('protoHome')) + '</a><a href="#portal" aria-current="' + (side === 'portal') + '">' + esc(t('protoInst')) + '</a></nav></div></div>';
  }
  function langToggle() { return '<div class="lang" role="group" aria-label="Language"><button type="button" data-act="lang" data-v="th" aria-pressed="' + (S.lang === 'th') + '" lang="th">ไทย</button><button type="button" data-act="lang" data-v="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div>'; }
  function brand(sub) { return '<a class="brand" href="#home" aria-label="SolarMatch home">' + LOGO + '<span><b>SolarMatch</b><small>' + (sub || 'THAILAND') + '</small></span></a>'; }
  function siteHeader(active, installer) {
    var nav = installer
      ? '<nav class="nav" aria-label="Main"><a href="#installers" aria-current="page">' + esc(t('navInst')) + '</a><a href="#home">' + esc(t('protoHome')) + '</a></nav>'
      : '<nav class="nav" aria-label="Main"><a href="#home" data-scroll="how">' + esc(t('navHow')) + '</a><a href="#home" data-scroll="trust">' + esc(t('navTrust')) + '</a><a href="#installers">' + esc(t('navInst')) + '</a></nav>';
    var cta = installer ? '<a class="btn btn-ghost" href="#portal">' + esc(t('signIn')) + '</a><a class="btn btn-primary" href="#portal">' + esc(t('apply')) + '</a>'
      : '<a class="btn btn-primary hdr-cta" href="#estimate">' + esc(t('cta')) + '</a>';
    return '<header class="hdr" id="hdr"><div class="wrap">' + brand(installer ? 'FOR INSTALLERS' : 'THAILAND') + nav + '<div class="hdr-right">' + langToggle() + cta + '</div></div></header>';
  }
  function footer() {
    var g = S.lang === 'th' ? [['SolarMatch', [['#estimate', 'เริ่มประเมิน'], ['#home', 'วิธีการทำงาน'], ['#home', 'วิธีคำนวณ'], ['#home', 'คู่มือโซลาร์']]], ['บริษัท', [['#installers', 'สำหรับผู้ติดตั้ง'], ['#home', 'ติดต่อเรา'], ['#home', 'ความเป็นส่วนตัว'], ['#home', 'ข้อกำหนด']]]]
      : [['SolarMatch', [['#estimate', 'Start an estimate'], ['#home', 'How it works'], ['#home', 'Methodology'], ['#home', 'Solar guide']]], ['Company', [['#installers', 'For installers'], ['#home', 'Contact'], ['#home', 'Privacy'], ['#home', 'Terms']]]];
    return '<footer class="footer"><div class="wrap"><div class="fbrand">' + brand() + '<p>' + esc(t('ftTag')) + '</p></div>' +
      g.map(function (x) { return '<div><h4>' + esc(x[0]) + '</h4>' + x[1].map(function (l) { return '<a href="' + l[0] + '">' + esc(l[1]) + '</a>'; }).join('') + '</div>'; }).join('') +
      '<p class="fine">' + esc(t('ftFine')) + '</p></div></footer>';
  }

  /* ---------------- home ---------------- */
  function beforeAfter(was, now, cls) {
    return '<div class="ba ' + (cls || '') + '"><span class="sr">' + esc(t('today')) + '</span><s class="was num">' + baht(was) + '</s><span class="sr">' + esc(t('withSolar')) + '</span><span class="now num">' + baht(now) + '</span></div>';
  }
  function statRow(r) {
    return '<div class="rstats"><div><b>' + r.planningSystemKw + ' kWp</b><span>' + esc(t('rSystem')) + '</span></div><div><b>' + baht(r.planningInstalledCostThb) + '</b><span>' + esc(t('rPrice')) + '</span></div><div><b>' + fmtYears(r.planningPaybackYears) + ' ' + esc(t('yrs')) + '</b><span>' + esc(t('rPayback')) + '</span></div></div>';
  }
  function exampleCard(r) {
    return '<div class="excard"><div class="exnums"><div class="top"><span class="lbl">' + esc(t('exBill')) + '</span><span class="chip chip-dark">' + esc(t('exWhere')) + '</span></div>' +
      beforeAfter(r.currentMonthlyBillThb, r.planningAfterSolarMonthlyBillThb) +
      '<p class="save">' + esc(t('exSave', { a: baht(r.planningMonthlySavingsThb) })) + '</p>' + statRow(r) + '</div>' +
      '<div class="chartbox">' + chartSVG(r, true) + '</div></div>';
  }
  function steps3(items) {
    return '<ol class="steps3">' + items.map(function (s, i) { return '<li><span class="n">' + (i + 1) + '</span><div><h3>' + esc(s[0]) + (s[2] ? ' <span class="chip chip-gold">' + esc(s[2]) + '</span>' : '') + '</h3><p>' + esc(s[1]) + '</p></div></li>'; }).join('') + '</ol>';
  }
  function heroBill() {
    var bill = S.answers.monthlyBillThb || 4000;
    return '<form class="billcard" data-form="bill"><label for="bill">' + esc(t('billLabel')) + '</label>' +
      '<div class="money-input"><span>฿</span><input id="bill" name="bill" inputmode="numeric" autocomplete="off" value="' + bill.toLocaleString('en-US') + '" aria-describedby="bill-unit"><small id="bill-unit">' + esc(t('perMonth')) + '</small></div>' +
      '<input class="range" type="range" min="500" max="25000" step="100" value="' + Math.min(25000, bill) + '" data-act="billhero" aria-label="' + esc(t('billLabel')) + '">' +
      '<button class="btn btn-primary btn-block" type="submit">' + esc(t('seeEstimate')) + ic('arrow') + '</button></form>' +
      '<div class="trust"><span>' + ic('check') + esc(t('t1')) + '</span><span>' + ic('check') + esc(t('t2')) + '</span></div>';
  }
  function photoHero(img, imgM, alt, credit, inner, cls) {
    return '<section class="hero3 ' + (cls || '') + '"><div class="hero-bg"><picture><source media="(max-width:899px)" srcset="' + imgM + '"><img src="' + img + '" alt="' + esc(alt) + '" fetchpriority="high"></picture><span class="credit">' + esc(t('credit', { p: credit })) + '</span></div><div class="wrap"><div class="hero-copy">' + inner + '</div></div></section>';
  }
  function viewHome() {
    var ex = calc(EXAMPLE);
    return protoStrip('home') + siteHeader('home') + '<main id="main">' +
      photoHero('img/home-hero-wide.jpg', 'img/home-hero-wide-m.jpg', 'A waterside house with rooftop solar panels among palm trees at sunset', 'Robert So',
        '<h1>' + esc(t('heroH1')) + '</h1><p class="lede">' + esc(t('heroLede')) + '</p>' + heroBill(), 'dark') +
      (ex ? '<section class="section" id="example"><div class="wrap exstack"><div class="ex-head"><p class="eyebrow">' + esc(t('exEyebrow')) + '</p><h2>' + esc(t('exH2')) + '</h2></div>' + exampleCard(ex) + '<p class="ex-link"><a class="link" href="#estimate">' + esc(t('pvTry')) + ic('arrow') + '</a></p></div></section>' : '') +
      '<section class="section band-sage" id="how"><div class="wrap"><h2 class="sec-h">' + esc(t('howH2')) + '</h2>' +
      steps3([[t('h1t'), t('h1p')], [t('h2t'), t('h2p')], [t('h3t'), t('h3p'), t('soon')]]) + '</div></section>' +
      '<section class="section band-dark" id="trust"><div class="wrap trustgrid"><div><p class="eyebrow">' + esc(t('trEyebrow')) + '</p><h2 class="sec-h" style="margin-top:12px">' + esc(t('trH2')) + '</h2><p class="trp">' + esc(t('trP')) + '</p>' +
      '<p class="eyebrow" style="margin-top:30px">' + esc(t('trSrc')) + '</p><div class="sources">' + t('src').map(function (x) { return '<span class="chip">' + ic('shield') + esc(x) + '</span>'; }).join('') + '</div><p style="margin-top:22px"><a class="link" style="color:#fff" href="#home">' + esc(t('trLink')) + ic('arrow') + '</a></p></div>' +
      '<div class="compare" style="align-self:center">' + t('trRows').map(function (r, i) { return '<div' + (i < 3 ? ' class="inc"' : '') + '><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div></div></section>' +
      '<section class="section" id="faq"><div class="wrap"><div class="faqband"><img src="img/palms-roof.jpg" alt="Solar panels on a tiled roof beside palm trees" width="1600" height="1200"><span class="credit">' + esc(t('credit', { p: 'Kindel Media' })) + '</span><div class="inner"><h2>' + esc(t('faqH2')) + '</h2></div></div><div class="faq">' + t('faq').map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div></div></section>' +
      '<section class="section band-sage"><div class="wrap cta-final"><h2>' + esc(t('finalH')) + '</h2><a class="btn btn-primary" href="#estimate">' + esc(t('finalBtn')) + ic('arrow') + '</a></div></section>' +
      '</main>' + footer();
  }

  /* ---------------- estimate flow ---------------- */
  var FLOW = ['monthlyBillThb', 'province', 'activelyPlanningSolar', 'projectType', 'propertyType', 'ownershipStatus', 'daytimePattern', 'daytimeLoads', 'shade', 'roofMaterial', 'quoteContactRequested'];
  function summaryValue(id) {
    var a = S.answers, v = a[id];
    if (id === 'province' && v === 'other') return a.customLocation || t('otherProv');
    if (id === 'province') return v ? provLabel(v) + (a.district ? ' · ' + distLabel(v, a.district) : '') : '';
    if (id === 'monthlyBillThb') return v ? baht(v) : '';
    if (false) return a.customLocation || t('otherProv');
    if (Array.isArray(v)) return v.length ? v.map(function (x) { return optLabel(id, x); }).join(', ') + (v.indexOf('air-conditioning') > -1 && a.airConditionerCount ? ' (' + a.airConditionerCount + ')' : '') : '';
    return v ? optLabel(id, v) : '';
  }
  function select(id, act, label, opts, value, disabled) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><select class="select" id="' + id + '" data-act="' + act + '"' + (disabled ? ' disabled' : '') + '>' + opts + '</select></div>';
  }
  function viewEstimate() {
    var step = Math.min(Math.max(S.step, 0), FLOW.length - 1), id = FLOW[step], q = Q(id), a = S.answers;
    var last = step === FLOW.length - 1;
    var count = last ? t('almost') : t('qOf', { n: step + 1, t: FLOW.length - 1 });
    var bar = FLOW.slice(0, FLOW.length - 1).map(function (_, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('');
    var body = '';
    if (id === 'province') {
      var launch = E.initialLaunchProvinces.map(function (p) { return p.value; });
      var other = a.province === 'other';
      var provOpts = launch.map(function (v) { return '<option value="' + v + '"' + (a.province === v ? ' selected' : '') + '>' + esc(provLabel(v)) + '</option>'; }).join('') + '<option value="other"' + (other ? ' selected' : '') + '>' + esc(t('otherProv')) + '</option>';
      var dl = distList(a.province);
      var second = other
        ? '<div class="field"><label for="cf-customLocation">' + esc(t('customLoc')) + '</label><input class="text" id="cf-customLocation" data-act="cftext" data-k="customLocation" maxlength="100" placeholder="' + esc(t('customLocPh')) + '" value="' + esc(a.customLocation || '') + '"></div>'
        : select('district', 'district', t('district'), dl.length ? '<option value="">' + esc(t('districtPh')) + '</option>' + dl.map(function (d) { return '<option value="' + d.value + '"' + (a.district === d.value ? ' selected' : '') + '>' + esc(d[S.lang]) + '</option>'; }).join('') : '<option>' + esc(t('districtNone')) + '</option>', a.district, !dl.length);
      body = '<div class="pair">' + select('prov', 'prov-select', t('provinceLbl'), provOpts, a.province) + second + '</div>';
    } else if (id === 'monthlyBillThb') {
      var b = a.monthlyBillThb || '';
      body = '<div class="money-input big"><span>฿</span><input id="bill2" inputmode="numeric" autocomplete="off" aria-label="' + esc(q.title[S.lang]) + '" value="' + (b ? Number(b).toLocaleString('en-US') : '') + '" data-act="bill2"><small>' + esc(t('perMonth')) + '</small></div>' +
        '<input class="range" type="range" min="500" max="25000" step="100" value="' + Math.min(25000, b || 4000) + '" data-act="billrange" aria-label="' + esc(q.title[S.lang]) + '">';
    } else if (q.type === 'choice') {
      body = '<div class="opts" role="radiogroup" aria-label="' + esc(q.title[S.lang]) + '">' + q.options.map(function (o) {
        return '<button type="button" class="opt" role="radio" data-act="choose" data-v="' + o.value + '" aria-checked="' + (a[id] === o.value) + '"><span class="txt"><b>' + esc(o.label[S.lang]) + '</b>' + (o.description ? '<span>' + esc(o.description[S.lang]) + '</span>' : '') + '</span><span class="mark">' + ic('check') + '</span></button>';
      }).join('') + '</div>';
      (q.conditionalFields || []).forEach(function (cf) { if (a[id] === cf.whenOption && cf.kind === 'text') body += '<div class="field"><label for="cf-' + cf.id + '">' + esc(cf.label[S.lang]) + '</label><input class="text" id="cf-' + cf.id + '" data-act="cftext" data-k="' + cf.id + '" maxlength="' + cf.maxLength + '" placeholder="' + esc(cf.placeholder[S.lang]) + '" value="' + esc(a[cf.id] || '') + '"></div>'; });
      if (id === 'quoteContactRequested' && a[id] === 'yes') body += '<p class="note callout">' + esc(t('contactYes')) + '</p>';
      if (last) body += '<p class="note" style="margin-top:18px">' + esc(t('privacy')) + '</p>';
    } else if (q.type === 'multichoice') {
      var sel = a[id] || [];
      body = '<div class="opts" role="group" aria-label="' + esc(q.title[S.lang]) + '">' + q.options.map(function (o) {
        return '<button type="button" class="opt multi" data-act="toggle" data-v="' + o.value + '" aria-pressed="' + (sel.indexOf(o.value) > -1) + '"><span class="txt"><b>' + esc(o.label[S.lang]) + '</b></span><span class="mark">' + ic('check') + '</span></button>';
      }).join('') + '</div>';
      (q.conditionalFields || []).forEach(function (cf) {
        if (sel.indexOf(cf.whenOption) < 0) return;
        if (cf.kind === 'ac-count') body += '<div class="field inline"><label>' + esc(cf.label[S.lang]) + '</label><div class="stepper"><button type="button" data-act="ac" data-v="-1" aria-label="−">−</button><output aria-live="polite">' + (a.airConditionerCount || 1) + '</output><button type="button" data-act="ac" data-v="1" aria-label="+">+</button></div></div>';
        if (cf.kind === 'text') body += '<div class="field"><label for="cf-' + cf.id + '">' + esc(cf.label[S.lang]) + '</label><input class="text" id="cf-' + cf.id + '" data-act="cftext" data-k="' + cf.id + '" maxlength="' + cf.maxLength + '" placeholder="' + esc(cf.placeholder[S.lang]) + '" value="' + esc(a[cf.id] || '') + '"></div>';
      });
    }
    var nav = '<div class="flow-nav"><div class="in">' + (step > 0 ? '<button type="button" class="btn btn-ghost" data-act="prev">' + ic('back') + '<span class="sr">' + esc(t('back')) + '</span></button>' : '') + '<button type="button" class="btn btn-primary" data-act="next">' + esc(last ? t('seeMine') : t('next')) + ic('arrow') + '</button></div><p class="note" id="flow-err" role="alert" style="margin-top:8px;color:var(--danger)"></p></div>';
    var answered = FLOW.slice(0, FLOW.length - 1).filter(function (k) { return summaryValue(k); });
    var aside = '<aside class="aside"><div class="card"><h3 style="font-size:17px;margin-bottom:8px">' + esc(t('yourAnswers')) + '</h3>' + (answered.length ? '<dl class="summary">' + answered.map(function (k) { return '<div><dt>' + esc(t('sumLbl')[k]) + '</dt><dd><span>' + esc(summaryValue(k)) + '</span><button type="button" data-act="goto" data-v="' + FLOW.indexOf(k) + '">' + esc(t('edit')) + '</button></dd></div>'; }).join('') + '</dl>' : '<p class="note">' + esc(t('ansEmpty')) + '</p>') + '</div></aside>';
    return protoStrip('home') + '<main class="wrap flow" id="main"><div class="flow-hdr">' + brand() + '<span class="count" aria-live="polite">' + esc(count) + '</span><a class="icon-btn" href="#home" aria-label="' + esc(t('exit')) + '">' + ic('close') + '</a></div><div class="bar" aria-hidden="true">' + bar + '</div>' +
      '<div class="flow-body"><div class="q" id="q"><h1 tabindex="-1" id="qh">' + esc(q.title[S.lang].replace(/([^?])$/, '$1?')) + '</h1>' + body + nav + '</div>' + aside + '</div></main>';
  }
  function validStep() {
    var id = FLOW[S.step], a = S.answers, q = Q(id);
    if (id === 'province') return !a.province ? t('needChoice') : (a.province === 'other' && !(a.customLocation && a.customLocation.trim().length >= 2)) ? t('needText') : '';
    if (id === 'monthlyBillThb') return Number(a.monthlyBillThb) > 0 ? '' : t('needBill');
    if (q.type === 'multichoice') { if (!(a[id] && a[id].length)) return t('needChoice'); if (a[id].indexOf('other-high-use') > -1 && !(a.customDaytimeLoad && a.customDaytimeLoad.trim().length >= 2)) return t('needText'); return ''; }
    if (!a[id]) return t('needChoice');
    if (id === 'propertyType' && a[id] === 'other-residential' && !(a.customPropertyType && a.customPropertyType.trim().length >= 2)) return t('needText');
    return '';
  }

  /* ---------------- loading ---------------- */
  function viewLoading() {
    var u = /PEA|กฟภ/.test((calc(S.answers) || {}).tariffLabelEn || '') ? (S.lang === 'th' ? 'กฟภ.' : 'PEA') : (S.lang === 'th' ? 'กฟน.' : 'MEA');
    return protoStrip('home') + '<main class="wrap loading" id="main"><div class="box"><span class="brand" style="pointer-events:none">' + LOGO + '</span><h1 tabindex="-1" id="qh">' + esc(t('ldH')) + '</h1><ul class="ltasks">' +
      [t('ld1', { u: u }), t('ld2'), t('ld3')].map(function (x, i) { return '<li data-i="' + i + '"><i>' + ic('check') + '</i>' + esc(x) + '</li>'; }).join('') + '</ul></div></main>';
  }

  /* ---------------- results ---------------- */
  function chartSVG(r, compact) {
    var s = r.lifetimeCostSeries || [];
    if (!s.length) return '';
    var narrow = compact || window.innerWidth < 640;
    var W = narrow ? 360 : 640, H = narrow ? 230 : 300, L = narrow ? 46 : 54, R = narrow ? 10 : 16, Tp = 16, B = 30;
    var max = 0; s.forEach(function (p) { max = Math.max(max, p.withoutSolarThb, p.withSolarThb); });
    var step = max > 1500000 ? 500000 : max > 600000 ? 250000 : 100000; var top = Math.ceil(max / step) * step;
    var x = function (y) { return L + (y / 25) * (W - L - R); }, y = function (v) { return Tp + (1 - v / top) * (H - Tp - B); };
    var grid = ''; for (var g = 0; g <= top; g += step) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="#E1E4DB"/><text x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="#5B6A61">' + (g === 0 ? '0' : bahtK(g)) + '</text>';
    var xt = [0, 5, 10, 15, 20, 25].map(function (v) { return '<text x="' + x(v) + '" y="' + (H - 12) + '" text-anchor="' + (v === 25 ? 'end' : v === 0 ? 'start' : 'middle') + '" font-size="11" fill="#5B6A61">' + v + (v === 25 ? (S.lang === 'th' ? ' ปี' : ' yrs') : '') + '</text>'; }).join('');
    var pw = s.map(function (p) { return x(p.year) + ',' + y(p.withSolarThb); }).join(' '), po = s.map(function (p) { return x(p.year) + ',' + y(p.withoutSolarThb); }).join(' ');
    var cross = null; for (var i = 1; i < s.length; i++) { var d0 = s[i - 1].withSolarThb - s[i - 1].withoutSolarThb, d1 = s[i].withSolarThb - s[i].withoutSolarThb; if (d0 > 0 && d1 <= 0) { var f = d0 / (d0 - d1); cross = { yr: s[i - 1].year + f, v: s[i - 1].withoutSolarThb + f * (s[i].withoutSolarThb - s[i - 1].withoutSolarThb) }; break; } }
    var last = s[s.length - 1], gap = r.planningTwentyFiveYearNetBenefitThb;
    var mark = '';
    if (cross) { var cx = x(cross.yr), cy = y(cross.v); mark = '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#D6EF91" stroke="#142D26" stroke-width="2.5"/><line x1="' + cx + '" x2="' + cx + '" y1="' + (cy + 9) + '" y2="' + (H - B) + '" stroke="#142D26" stroke-dasharray="3 3" stroke-width="1"/><text x="' + (cx + 8) + '" y="' + (cy + 22) + '" font-size="' + (narrow ? 11 : 12) + '" font-weight="700" fill="#142D26">' + esc(t('cCross', { y: Math.round(cross.yr) })) + '</text>'; }
    var gx = x(25) - 4, gy1 = y(last.withoutSolarThb), gy2 = y(last.withSolarThb);
    var gapMark = '<line x1="' + gx + '" x2="' + gx + '" y1="' + Math.min(gy1, gy2) + '" y2="' + Math.max(gy1, gy2) + '" stroke="' + (gap >= 0 ? '#137A50' : '#A4402A') + '" stroke-width="3"/><text x="' + (gx - 6) + '" y="' + (Math.min(gy1, gy2) - 8) + '" text-anchor="end" font-size="' + (narrow ? 11 : 12) + '" font-weight="800" fill="' + (gap >= 0 ? '#137A50' : '#A4402A') + '">' + esc(gap >= 0 ? t('cGap', { a: bahtK(gap) }) : t('cGapNeg', { a: bahtK(-gap) })) + '</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('cTitle')) + '" font-family="Manrope,Anuphan,sans-serif">' + grid + xt +
      '<polyline points="' + po + '" fill="none" stroke="#9AA79E" stroke-width="2.5" stroke-dasharray="6 5"/><polyline points="' + pw + '" fill="none" stroke="#142D26" stroke-width="3"/>' + mark + gapMark + '</svg>';
  }
  function extrasFor(r) {
    var x = S.extras, cost = r.planningInstalledCostThb;
    var tax = x.tax && (S.answers.ownershipStatus === 'owner' || !S.answers.ownershipStatus) ? Math.round(Math.min(cost, 200000) * Number(x.rate)) : 0;
    var canSell = r.planningSystemKw <= 5;
    var sellYr = x.sell && canSell ? Math.round(r.planningAnnualExportedKwh * 2.2) : 0;
    if (!tax && !sellYr) return { tax: 0, sellYr: 0, canSell: canSell, on: false };
    var s = r.lifetimeCostSeries, pb = null;
    var adj = function (p) { return p.withSolarThb - tax - sellYr * Math.min(p.year, 10); };
    for (var i = 1; i < s.length; i++) { var d0 = adj(s[i - 1]) - s[i - 1].withoutSolarThb, d1 = adj(s[i]) - s[i].withoutSolarThb; if (d0 > 0 && d1 <= 0) { pb = s[i - 1].year + d0 / (d0 - d1); break; } }
    return { tax: tax, sellYr: sellYr, canSell: canSell, on: true, pb: pb, net: r.planningTwentyFiveYearNetBenefitThb + tax + sellYr * 10 };
  }
  function extrasCard(r) {
    var x = S.extras, e = extrasFor(r);
    var rates = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35];
    return '<div class="card xcard"><h3>' + esc(t('xTitle')) + '</h3><p class="note" style="margin-top:4px">' + esc(t('xP')) + '</p>' +
      (S.answers.ownershipStatus === 'owner' || !S.answers.ownershipStatus ? '<div class="xrow"><div class="t"><b>' + esc(t('xTax')) + '</b><span>' + esc(t('xTaxP')) + '</span></div><button type="button" class="switch" role="switch" aria-checked="' + x.tax + '" aria-label="' + esc(t('xTax')) + '" data-act="xtax"></button></div>' : '') +
      (x.tax && (S.answers.ownershipStatus === 'owner' || !S.answers.ownershipStatus) ? '<div class="field" style="margin-top:0"><label for="xrate">' + esc(t('xRate')) + '</label><select class="select" id="xrate" data-act="xrate">' + rates.map(function (v) { return '<option value="' + v + '"' + (Number(x.rate) === v ? ' selected' : '') + '>' + Math.round(v * 100) + '%</option>'; }).join('') + '</select></div>' : '') +
      '<div class="xrow"><div class="t"><b>' + esc(t('xSell')) + '</b><span>' + esc(e.canSell ? t('xSellP') : t('xSellNo')) + '</span></div><button type="button" class="switch" role="switch" aria-checked="' + (x.sell && e.canSell) + '" aria-label="' + esc(t('xSell')) + '" data-act="xsell"' + (e.canSell ? '' : ' disabled') + '></button></div>' +
      (e.on ? '<div class="xsum"><div><b class="num">' + (e.tax ? baht(e.tax) : '—') + '</b><span>' + esc(t('xTaxV')) + '</span></div><div><b class="num">' + (e.sellYr ? baht(e.sellYr) : '—') + '</b><span>' + esc(t('xSellV')) + '</span></div><div><b class="num">' + (e.pb ? fmtYears(Math.round(e.pb * 10) / 10) + ' ' + esc(t('yrs')) : '—') + '</b><span>' + esc(t('xPbV')) + '</span></div></div><p class="note">' + esc(t('x25', { a: baht(e.net) })) + '</p>' : '') + '</div>';
  }
  function viewResults() {
    var r = calc(S.answers, S.refine);
    if (!r) { location.hash = 'estimate'; return ''; }
    var a = S.answers;
    var place = a.province === 'other' ? (a.customLocation || t('otherProv')) : (a.district ? distLabel(a.province, a.district) + ', ' : '') + provLabel(a.province);
    var careful = r.recommendation !== 'strong-fit';
    var neg = r.planningTwentyFiveYearNetBenefitThb < 0;
    var rf = function (k) { return '<div class="field" style="margin-top:0"><label for="rf-' + k + '">' + esc(t('rf')[k]) + '</label><select class="select" id="rf-' + k + '" data-act="refine" data-k="' + k + '">' + t('rfo')[k].map(function (o) { return '<option value="' + o[0] + '"' + ((S.refine[k] || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; };
    return protoStrip('home') + siteHeader('results') + '<main id="main">' +
      '<section class="rhero"><div class="wrap rgrid"><div><p class="eyebrow">' + esc(t('rEyebrow', { place: place })) + '</p>' +
      beforeAfter(r.currentMonthlyBillThb, r.planningAfterSolarMonthlyBillThb, 'xl') +
      '<h1 class="rsub" tabindex="-1" id="qh">' + esc(t('rSave', { a: baht(r.planningMonthlySavingsThb) })) + '<span class="muted pct">' + esc(t('rPct', { p: Math.round(r.planningBillReductionPct) })) + '</span></h1>' +
      '<span class="verdict' + (careful ? ' careful' : '') + '">' + ic(careful ? 'info' : 'sun', ' style="width:16px;height:16px"') + esc(t('verdicts')[r.recommendation] || '') + '</span>' +
      (neg ? '<p class="rfine" style="color:#F3D9A0">' + esc(t('negNote')) + '</p>' : '') + '</div>' +
      '<div>' + statRow(r) + '<p class="rfine">' + esc(t('rFine')) + ' <a href="#home">' + esc(t('rHow')) + '</a></p></div></div></section>' +
      '<div class="wrap rbody"><div class="col">' +
      '<div class="card"><div class="card-head"><h3>' + esc(t('cTitle')) + '</h3><div class="legend"><span><i></i>' + esc(t('cWith')) + '</span><span><i class="dash"></i>' + esc(t('cWithout')) + '</span></div></div>' + chartSVG(r) + '</div>' +
      extrasCard(r) +
      '<div class="card" style="padding-top:4px;padding-bottom:4px"><details class="disc" style="border-top:0"' + (Object.keys(S.refine).some(function (k) { return S.refine[k]; }) ? ' open' : '') + '><summary><span>' + esc(t('rfTitle')) + ' <span class="opt-tag">' + esc(t('rfOpt')) + '</span></span></summary><div class="in"><div class="grid2">' + rf('roofDirection') + rf('roofSlope') + rf('roofArea') + rf('electricityPhase') + '</div></div></details></div>' +
      '</div><div class="col">' +
      '<div class="card nextsteps"><h3>' + esc(t('nsTitle')) + '</h3><div class="row"><button type="button" class="btn btn-primary btn-sm" data-act="share">' + ic('chat') + esc(t('nsLine')) + '</button><button type="button" class="btn btn-soft btn-sm" data-act="copylink">' + ic('copy') + esc(t('nsCopy')) + '</button></div>' +
      '<details class="disc"><summary>' + esc(t('qaTitle')) + '</summary><div class="in"><ul class="checklist">' + t('qa').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></details>' +
      '<div class="setrow" style="border-top:1px solid var(--line);padding-top:14px"><div class="t"><b>' + esc(t('mtTitle')) + '</b></div><span class="chip chip-gold">' + esc(t('soon')) + '</span></div></div>' +
      '<div class="card" style="padding-top:4px;padding-bottom:4px"><details class="disc" style="border-top:0"><summary>' + esc(t('bdTitle')) + '</summary><div class="in"><div class="kv">' +
      [[t('bd').use, r.estimatedMonthlyConsumptionKwh.toLocaleString('en-US') + ' kWh'], [t('bd').gen, r.planningAnnualProductionKwh.toLocaleString('en-US') + ' kWh'], [t('bd').self, r.planningAnnualSelfConsumedKwh.toLocaleString('en-US') + ' kWh'], [t('bd').exp, r.planningAnnualExportedKwh.toLocaleString('en-US') + ' kWh'], [t('bd').maint, baht(r.planningAnnualMaintenanceReserveThb)], [t('bd').net, baht(r.planningTwentyFiveYearNetBenefitThb)], [t('bd').tariff, S.lang === 'th' ? r.tariffLabelTh : r.tariffLabelEn], [t('bd').method, r.assumptionVersion]]
        .map(function (kv) { return '<div><span>' + esc(kv[0]) + '</span><b>' + esc(kv[1]) + '</b></div>'; }).join('') + '</div><p class="note">' + esc(t('cNote')) + '</p></div></details></div>' +
      '<div class="actions2"><button type="button" class="btn btn-ghost btn-sm" data-act="goto" data-v="0">' + esc(t('change')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="restart">' + esc(t('restart')) + '</button></div>' +
      '</div></div></main>' + footer();
  }

  /* ---------------- installers landing ---------------- */
  function viewInstallers() {
    return protoStrip('portal') + siteHeader('installers', true) + '<main id="main">' +
      photoHero('img/installer.jpg', 'img/installer.jpg', 'A solar technician fixing a panel on a roof', 'Los Muertos Crew',
        '<h1>' + esc(t('iH1')) + '</h1><p class="lede">' + esc(t('iLede')) + '</p><div class="btns"><a class="btn btn-primary" href="#portal">' + esc(t('iApply')) + ic('arrow') + '</a><a class="btn btn-ghost" href="#portal">' + esc(t('iDemo')) + '</a></div>', 'inst') +
      '<section class="fstrip-sec"><div class="wrap"><div class="fstrip">' + t('iFacts').map(function (f) { return '<div><b class="num">' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div><p class="note" style="margin-top:12px">' + esc(t('draft')) + '</p></div></section>' +
      '<section class="section band-sage"><div class="wrap"><h2 class="sec-h">' + esc(t('iHowH')) + '</h2>' + steps3([[t('ih1t'), t('ih1p')], [t('ih2t'), t('ih2p')], [t('ih3t'), t('ih3p')]]) + '</div></section>' +
      '<section class="section"><div class="wrap"><h2 class="sec-h">' + esc(t('faqH2')) + '</h2><div class="faq">' + t('iFaq').map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div></div></section>' +
      '</main>' + footer();
  }

  /* ---------------- portal ---------------- */
  function enq(id) { return ENQ.filter(function (e) { return e.id === id; })[0]; }
  function statusOf(e) { return S.portal.status[e.id] || 'new'; }
  function waitMins(e) { return e.mins + Math.floor((Date.now() - NOW) / 60000); }
  function statusChip(e) { var s = statusOf(e); return '<span class="status ' + s + '"><i></i>' + esc(t('st')[s]) + '</span>'; }
  function costChip(e) { return e.cost === 'trial' ? '<span class="chip chip-line">' + esc(t('free')) + '</span>' : '<span class="chip">' + esc(t('cr2')) + '</span>'; }
  function portalShell(active, inner) {
    var newCount = S.portal.approval === 'approved' ? ENQ.filter(function (e) { return statusOf(e) === 'new'; }).length : 0;
    var items = [['portal', 'grid', t('pToday')], ['enquiries', 'inbox', t('pEnq')], ['credits', 'wallet', t('pCredits')], ['company', 'building', t('pCompany')]];
    var side = '<nav class="side" aria-label="Portal">' + brand('FOR INSTALLERS') + items.map(function (it) { return '<a class="nv" href="#' + it[0] + '" aria-current="' + (active === it[0] ? 'page' : 'false') + '">' + ic(it[1]) + esc(it[2]) + (it[0] === 'enquiries' && newCount ? '<span class="cnt">' + newCount + '</span>' : '') + '</a>'; }).join('') +
      '<div class="foot">' + demoSwitch() + '<a class="nv" href="#home" style="font-size:14px;color:var(--muted)">' + ic('back') + esc(t('homeSite')) + '</a></div></nav>';
    var tabs = '<nav class="tabbar" aria-label="Portal">' + items.map(function (it) { return '<a href="#' + it[0] + '" aria-current="' + (active === it[0] ? 'page' : 'false') + '">' + ic(it[1]) + esc(it[2]) + (it[0] === 'enquiries' && newCount ? '<span class="cnt">' + newCount + '</span>' : '') + '</a>'; }).join('') + '</nav>';
    var acc = S.portal.approval === 'approved' ? '<div class="accept"><span class="acc-label">' + esc(S.portal.accepting ? t('accepting') : t('paused')) + '</span><button type="button" class="switch" role="switch" aria-checked="' + S.portal.accepting + '" aria-label="' + esc(t('accepting')) + '" data-act="accept"></button></div>' : '<span class="chip chip-gold">' + esc(t('pending')) + '</span>';
    var hdr = '<div class="phdr"><div class="who"><span class="avatar">S</span><div><b>Suriya Solar</b><small><span class="dot" style="background:' + (S.portal.approval !== 'approved' ? 'var(--gold)' : S.portal.accepting ? 'var(--ok)' : '#B8C1B4') + '"></span>' + esc(S.portal.approval !== 'approved' ? t('pending') : S.portal.accepting ? t('accepting') : t('paused')) + '</small></div></div><div class="right">' + acc + langToggle() + '</div></div>';
    return protoStrip('portal') + '<div class="portal">' + side + '<main class="pmain" id="main"><div class="wrap">' + hdr + inner + '<div class="mobile-demo" style="margin-top:28px">' + demoSwitch() + '</div></div></main></div>' + tabs;
  }
  function demoSwitch() { return '<div class="demo-switch"><span class="muted" style="font-weight:700">' + esc(t('demoView')) + '</span><div class="seg"><button type="button" data-act="approval" data-v="approved" aria-pressed="' + (S.portal.approval === 'approved') + '">' + esc(t('approved')) + '</button><button type="button" data-act="approval" data-v="pending" aria-pressed="' + (S.portal.approval === 'pending') + '">' + esc(t('pending')) + '</button></div></div>'; }
  function viewToday() {
    if (S.portal.approval !== 'approved') {
      var ck = function (state, title, sub) { return '<div class="' + state + '"><i>' + (state === 'done' ? ic('check') : '') + '</i><div><b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div></div>'; };
      return portalShell('portal', '<div class="ptitle"><h1 tabindex="-1" id="qh">' + esc(t('pendH')) + '</h1></div><div class="pgrid"><div class="card"><div class="checklist2">' + ck('done', t('pend1')) + ck('now', t('pend2'), t('pend2p')) + ck(S.portal.areas.length ? 'done' : '', t('pend3')) + ck(S.portal.line ? 'done' : '', t('pend4')) + ck('', t('pend5')) + '</div></div><div class="list"><a href="#company"><span class="tile">' + ic('pin') + '</span><span class="grow"><b>' + esc(t('areas')) + '</b><small>' + esc(S.portal.areas.map(provLabel).join(', ')) + '</small></span>' + ic('chev', ' class="chev"') + '</a><a href="#company"><span class="tile">' + ic('bell') + '</span><span class="grow"><b>' + esc(t('lineAlerts')) + '</b><small>' + esc(S.portal.line ? t('connected') : t('lineAlertsP')) + '</small></span>' + ic('chev', ' class="chev"') + '</a></div></div>');
    }
    var waiting = ENQ.filter(function (e) { return statusOf(e) === 'new'; }).sort(function (a, b) { return waitMins(b) - waitMins(a); });
    var next = waiting[0];
    var others = waiting.filter(function (e) { return e !== next; });
    var openOutcome = ENQ.filter(function (e) { return ['contacted', 'visit', 'quoted'].indexOf(statusOf(e)) > -1; }).length;
    var date = new Date().toLocaleDateString(S.lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var call = next ? '<div class="callnext"><div class="top"><span class="eyebrow">' + esc(t('callNext')) + '</span><span class="wait">' + ic('clock', ' style="width:15px;height:15px"') + esc(t('waiting', { t: ago(waitMins(next)) })) + '</span></div>' +
      '<div class="person"><span class="avatar">' + next.name[0] + '</span><div><b>' + esc(next.name) + '</b><small>' + esc(next.loc[S.lang]) + '</small></div></div>' +
      '<div class="cfacts"><span class="chip chip-dark">' + baht(next.a.monthlyBillThb) + esc(t('perMo')) + '</span><span class="chip chip-dark">' + next.a.airConditionerCount + ' ' + esc(t('mAc')) + '</span><span class="chip chip-dark">' + esc(optLabel('activelyPlanningSolar', next.a.activelyPlanningSolar)) + '</span></div>' +
      '<div class="btns"><a class="btn btn-lime" href="tel:' + next.phone.replace(/\s/g, '') + '">' + ic('phone') + esc(t('callX', { n: next.name })) + '</a><a class="btn btn-ghost-dark" href="#enquiry-' + next.id + '">' + esc(t('openEnq')) + '</a></div></div>'
      : '<div class="card empty"><span class="tile">' + ic('check') + '</span><h3>' + esc(t('caught')) + '</h3><p class="muted">' + esc(t('caughtP')) + '</p></div>';
    return portalShell('portal', '<div class="ptitle"><div><h1 tabindex="-1" id="qh">' + esc(t('pToday')) + '</h1><p class="muted" style="margin-top:6px">' + esc(date) + '</p></div></div><div class="pgrid"><div style="display:grid;gap:18px">' + call +
      (others.length ? '<div><p class="eyebrow" style="margin:6px 0 10px">' + esc(t('alsoWaiting')) + '</p><div class="list">' + others.map(function (e) { return '<a href="#enquiry-' + e.id + '"><span class="avatar">' + e.name[0] + '</span><span class="grow"><b>' + esc(e.name) + '</b><small>' + esc(e.loc[S.lang]) + ' · ' + baht(e.a.monthlyBillThb) + ' · ' + esc(t('waiting', { t: ago(waitMins(e)) })) + '</small></span>' + costChip(e) + ic('chev', ' class="chev"') + '</a>'; }).join('') + '</div></div>' : '') +
      '</div><div class="list"><a href="#credits"><span class="tile dark">' + ic('wallet') + '</span><span class="grow"><b>' + esc(t('creditLine', { c: 18, n: 9 })) + '</b></span><span class="btn btn-soft btn-sm">' + esc(t('topUp')) + '</span></a>' +
      (openOutcome ? '<a href="#enquiries" data-act="seg" data-v="progress"><span class="tile">' + ic('flag') + '</span><span class="grow"><b>' + esc(t('needOutcome', { n: openOutcome })) + '</b></span>' + ic('chev', ' class="chev"') + '</a>' : '') + '</div></div>');
  }
  function viewEnquiries() {
    var seg = S.portal.seg, q = S.portal.q.trim().toLowerCase();
    var groups = { new: ['new'], progress: ['contacted', 'visit', 'quoted'], closed: ['won', 'lost'] };
    var list = ENQ.filter(function (e) { return groups[seg].indexOf(statusOf(e)) > -1; }).filter(function (e) { return !q || (e.name + ' ' + e.loc.en + ' ' + e.loc.th + ' ' + e.ref).toLowerCase().indexOf(q) > -1; });
    var cnt = function (g) { return ENQ.filter(function (e) { return groups[g].indexOf(statusOf(e)) > -1; }).length; };
    return portalShell('enquiries', '<div class="ptitle"><h1 tabindex="-1" id="qh">' + esc(t('pEnq')) + '</h1></div><div class="etools"><div class="seg2" role="group">' +
      [['new', t('segNew')], ['progress', t('segProg')], ['closed', t('segClosed')]].map(function (s) { return '<button type="button" data-act="seg" data-v="' + s[0] + '" aria-pressed="' + (seg === s[0]) + '">' + esc(s[1]) + ' <span class="num">' + cnt(s[0]) + '</span></button>'; }).join('') +
      '</div><label class="search">' + ic('search') + '<span class="sr">' + esc(t('searchPh')) + '</span><input type="search" id="esearch" data-act="search" placeholder="' + esc(t('searchPh')) + '" value="' + esc(S.portal.q) + '"></label></div>' +
      (list.length ? '<div class="ecards">' + list.map(function (e) {
        return '<a class="ecard" href="#enquiry-' + e.id + '"><div class="top"><span class="avatar">' + e.name[0] + '</span><div style="flex:1;min-width:0"><b>' + esc(e.name) + '</b><small>' + esc(e.loc[S.lang]) + '</small></div>' + costChip(e) + '</div>' +
          '<div class="nums"><div><b>' + baht(e.a.monthlyBillThb) + '</b><span>' + esc(t('mBill')) + '</span></div><div><b>' + e.a.airConditionerCount + '</b><span>' + esc(t('mAc')) + '</span></div></div>' +
          '<div class="bottom">' + statusChip(e) + '<span class="muted" style="font-size:13px">' + esc(t('received', { t: ago(waitMins(e)) })) + '</span></div></a>';
      }).join('') + '</div>' : '<div class="card empty"><span class="tile">' + ic('inbox') + '</span><p class="muted">' + esc(t('none')) + '</p></div>'));
  }
  function viewEnquiry(id) {
    var e = enq(id); if (!e) return viewEnquiries();
    var s = statusOf(e), steps = ['new', 'contacted', 'visit', 'quoted', 'won'];
    var closed = s === 'won' || s === 'lost';
    var idx = closed ? 4 : steps.indexOf(s);
    var fact = function (label, val, hl) { return '<div' + (hl ? ' class="hl"' : '') + '><span>' + esc(label) + '</span><b>' + esc(val) + '</b></div>'; };
    var fl = S.lang === 'th' ? ['ประเภทที่พักอาศัย', 'สถานะต่อทรัพย์สิน', 'ค่าไฟต่อเดือน', 'การใช้ไฟช่วงกลางวัน', 'อุปกรณ์ที่มีในบ้าน', 'จำนวนเครื่องปรับอากาศ', 'วัสดุหลังคา', 'เงาบนหลังคา', 'ช่วงเวลาที่วางแผนติดตั้ง', 'ประเภทโครงการ'] : ['Property type', 'Ownership', 'Monthly bill', 'Daytime use', 'Appliances', 'Air-conditioners', 'Roof material', 'Roof shading', 'Timeframe', 'Project type'];
    var deadline = new Date(NOW - waitMins(e) * 60000 + 7 * 86400000).toLocaleDateString(S.lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short' });
    var delivered = new Date(NOW - waitMins(e) * 60000).toLocaleString(S.lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    var nextStage = closed ? null : steps[idx + 1];
    var progress = '<div class="card"><div class="card-head"><h3>' + esc(t('progress')) + '</h3>' + statusChip(e) + '</div>' +
      '<div class="pbar" aria-hidden="true">' + steps.map(function (st, i) { return '<i class="' + (i <= idx ? (s === 'lost' && i === 4 ? 'lost' : 'on') : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="pact">' + (closed ? '<span class="muted" style="font-weight:700">' + esc(t('closedAs', { s: t('st')[s] })) + '</span><button type="button" class="btn btn-ghost btn-sm" data-act="status" data-id="' + e.id + '" data-v="quoted">' + esc(t('reopen')) + '</button>'
        : '<button type="button" class="btn btn-primary btn-sm" data-act="status" data-id="' + e.id + '" data-v="' + nextStage + '">' + esc(t('nextAct')[s]) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="status" data-id="' + e.id + '" data-v="lost">' + esc(t('markLost')) + '</button>') + '</div>' +
      '<div class="field"><label for="notes">' + esc(t('notes')) + '</label><textarea class="textarea" id="notes" data-act="notes" data-id="' + e.id + '" placeholder="' + esc(t('notesPh')) + '">' + esc(S.portal.notes[e.id] || '') + '</textarea><span class="hint">' + esc(t('autosave')) + '</span></div></div>';
    return portalShell('enquiries', '<div class="dtop"><a class="link" href="#enquiries">' + ic('back') + esc(t('pEnq')) + '</a><span class="muted num" style="font-size:13px">' + e.ref + '</span></div>' +
      '<div class="detail"><div style="display:grid;gap:18px"><div class="card" style="display:grid;gap:18px"><div class="person"><span class="avatar" style="background:var(--sage);color:var(--pine)">' + e.name[0] + '</span><div><h1 tabindex="-1" id="qh" style="font-size:30px">' + esc(e.name) + '</h1><small class="muted">' + esc(e.loc[S.lang]) + ' · ' + esc(t('received', { t: ago(waitMins(e)) })) + '</small></div></div>' +
      '<div class="contactbar"><a class="btn btn-primary call" href="tel:' + e.phone.replace(/\s/g, '') + '">' + ic('phone') + '<span class="num">' + e.phone + '</span></a><div class="row2">' + (e.method === 'line' ? '<button type="button" class="btn btn-soft" data-act="toast" data-v="line">' + ic('chat') + 'LINE</button>' : '') + '<button type="button" class="btn btn-soft" data-act="copynum" data-v="' + e.phone + '">' + ic('copy') + esc(t('copyNum')) + '</button></div></div></div>' +
      '<div class="card"><h3 style="margin-bottom:12px">' + esc(t('household')) + '</h3><div class="facts">' +
      fact(fl[2], baht(e.a.monthlyBillThb), true) + fact(fl[5], String(e.a.airConditionerCount), true) + fact(fl[1], optLabel('ownershipStatus', e.a.ownershipStatus), true) + fact(fl[8], optLabel('activelyPlanningSolar', e.a.activelyPlanningSolar), true) +
      '</div><details class="disc" style="margin-top:12px"><summary>' + esc(t('moreHome')) + '</summary><div class="in"><div class="kv">' +
      [[fl[0], optLabel('propertyType', e.a.propertyType)], [fl[3], optLabel('daytimePattern', e.a.daytimePattern)], [fl[6], optLabel('roofMaterial', e.a.roofMaterial)], [fl[7], optLabel('shade', e.a.shade)], [fl[9], optLabel('projectType', e.a.projectType)], [fl[4], e.a.daytimeLoads.map(function (x) { return optLabel('daytimeLoads', x); }).join(', ')]].map(function (kv) { return '<div><span>' + esc(kv[0]) + '</span><b>' + esc(kv[1]) + '</b></div>'; }).join('') +
      '</div></div></details></div></div>' +
      '<div style="display:grid;gap:18px">' + progress +
      '<div class="card" style="padding-top:4px;padding-bottom:4px"><details class="disc" style="border-top:0"><summary>' + esc(t('shareTeam')) + '</summary><div class="in"><p>' + esc(t('shareTeamP')) + '</p><button type="button" class="btn btn-soft btn-sm" style="justify-self:start" data-act="toast" data-v="linkMade">' + esc(t('createLink')) + '</button></div></details>' +
      '<details class="disc"><summary>' + esc(t('problem')) + '</summary><div class="in"><p>' + esc(t('problemP', { d: deadline })) + '</p><button type="button" class="btn btn-ghost btn-sm" style="justify-self:start" data-act="toast" data-v="claimStarted">' + esc(t('startClaim')) + '</button></div></details></div>' +
      '<p class="note">' + esc(t('meta', { cost: e.cost === 'trial' ? t('trialMeta') : t('paid'), d: delivered })) + '</p></div></div>');
  }
  function viewCredits() {
    return portalShell('credits', '<div class="ptitle"><h1 tabindex="-1" id="qh">' + esc(t('pCredits')) + '</h1></div><div class="pgrid"><div style="display:grid;gap:18px"><div class="balance"><span class="eyebrow" style="color:var(--lime)">' + esc(t('available')) + '</span><div style="display:flex;align-items:baseline;gap:10px"><span class="big">18</span><span style="font-size:20px;font-weight:600">' + esc(t('credits')) + '</span></div><p style="font-size:17px">' + esc(t('enough', { n: 9 })) + ' <span class="muted">' + esc(t('plusFree', { n: 1 })) + '</span></p></div>' +
      '<div class="card"><h3 style="margin-bottom:6px">' + esc(t('statement')) + '</h3><div class="statement">' + t('stmt').map(function (r) { return '<div><span class="tile">' + ic(r[2].indexOf('+') === 0 ? 'receipt' : r[2] === '−2' ? 'inbox' : 'sun') + '</span><span style="flex:1;min-width:0"><b style="display:block">' + esc(r[0]) + '</b><span class="muted" style="font-size:13.5px">' + esc(r[1]) + '</span></span><span class="amt' + (r[2].indexOf('+') === 0 ? ' plus' : '') + '">' + esc(r[2]) + '</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="card pkg"><div class="price"><b>' + esc(t('pkgName')) + '</b><b>฿4,000</b></div><p class="muted">' + esc(t('pkgP')) + '</p><button type="button" class="btn btn-primary btn-block" disabled>' + esc(t('payPP')) + '</button><p class="note">' + esc(t('payNote')) + '</p></div></div>');
  }
  function viewCompany() {
    var launch = E.initialLaunchProvinces.map(function (p) { return p.value; });
    return portalShell('company', '<div class="ptitle"><h1 tabindex="-1" id="qh">' + esc(t('pCompany')) + '</h1></div><div class="pgrid"><div style="display:grid;gap:18px">' +
      '<div class="card" style="display:grid;gap:14px"><div class="setrow"><div class="t"><b>' + esc(t('areas')) + '</b></div><span class="muted num" style="font-weight:700">' + S.portal.areas.length + ' / ' + launch.length + '</span></div><div class="areagrid">' + launch.map(function (v) { return '<button type="button" class="pchip" data-act="area" data-v="' + v + '" aria-pressed="' + (S.portal.areas.indexOf(v) > -1) + '">' + esc(provLabel(v)) + '</button>'; }).join('') + '</div></div>' +
      '<div class="card setrow"><div class="t"><b>' + esc(t('perDay')) + '</b></div><div class="stepper"><button type="button" data-act="perday" data-v="-1" aria-label="−">−</button><output aria-live="polite">' + S.portal.perDay + '</output><button type="button" data-act="perday" data-v="1" aria-label="+">+</button></div></div>' +
      '<div class="card setrow"><div class="t"><b>' + esc(t('lineAlerts')) + '</b><span>' + esc(t('lineAlertsP')) + '</span></div>' + (S.portal.line ? '<span class="chip chip-ok">' + ic('check') + esc(t('connected')) + '</span>' : '<button type="button" class="btn btn-primary btn-sm" data-act="line">' + ic('chat') + esc(t('connect')) + '</button>') + '</div></div>' +
      '<div style="display:grid;gap:18px"><form class="card" data-form="company" style="display:grid;gap:4px"><h3>' + esc(t('coDetails')) + '</h3>' +
      [['co-name', t('coName'), 'Suriya Solar Co., Ltd.'], ['co-contact', t('coContact'), 'Somchai'], ['co-phone', t('coPhone'), '02 123 4567']].map(function (f) { return '<div class="field" style="margin-top:12px"><label for="' + f[0] + '">' + esc(f[1]) + '</label><input class="text" id="' + f[0] + '" value="' + esc(f[2]) + '"></div>'; }).join('') +
      '<button class="btn btn-primary" type="submit" style="margin-top:18px">' + esc(t('save')) + '</button></form>' +
      '<div class="card" style="padding-top:4px;padding-bottom:4px"><details class="disc" style="border-top:0"><summary>' + esc(t('claims')) + '</summary><div class="in"><p>' + esc(t('claimsP')) + '</p></div></details><details class="disc"><summary>' + esc(t('terms')) + '</summary><div class="in"><p>' + esc(t('termsP')) + '</p></div></details></div></div></div>');
  }

  /* ---------------- router ---------------- */
  var current = '';
  function route() {
    var h = (location.hash || '#home').slice(1) || 'home';
    var html;
    document.documentElement.lang = S.lang;
    if (h === 'home') html = viewHome();
    else if (h === 'estimate') html = viewEstimate();
    else if (h === 'loading') html = viewLoading();
    else if (h === 'results') html = viewResults();
    else if (h === 'installers') html = viewInstallers();
    else if (h === 'portal') html = viewToday();
    else if (h === 'enquiries') html = viewEnquiries();
    else if (h.indexOf('enquiry-') === 0) html = viewEnquiry(h.slice(8));
    else if (h === 'credits') html = viewCredits();
    else if (h === 'company') html = viewCompany();
    else html = viewHome();
    var changed = h !== current; current = h;
    root.innerHTML = html;
    var names = { estimate: 'Estimate', loading: 'Estimate', results: 'Your estimate', installers: 'For installers', portal: 'Today', enquiries: 'Enquiries', credits: 'Credits', company: 'Company' };
    document.title = 'SolarMatch Prototype' + (names[h.replace(/^enquiry-.*/, 'enquiries')] ? ' · ' + names[h.replace(/^enquiry-.*/, 'enquiries')] : '');
    if (changed) { window.scrollTo(0, 0); var f = document.getElementById('qh'); if (f && h !== 'home') f.focus({ preventScroll: true }); }
    if (h === 'loading') runLoading();
    onScroll();
  }
  function rerender(keepFocusId) { var y = window.scrollY; var el = document.activeElement; var id = keepFocusId || (el && el.id); var pos = el && el.selectionStart; route(); window.scrollTo(0, y); if (id) { var n = document.getElementById(id); if (n) { n.focus({ preventScroll: true }); try { if (pos != null && n.setSelectionRange) n.setSelectionRange(pos, pos); } catch (e) { /* not a text input */ } } } }
  function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
  function saveFlow() { store('sm-answers', S.answers); store('sm-step', S.step); store('sm-refine', S.refine); store('sm-extras', S.extras); }
  var timer;
  function runLoading() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = Array.prototype.slice.call(document.querySelectorAll('.ltasks li')), dur = reduce ? 250 : 750, i = 0;
    clearTimeout(timer);
    (function tick() {
      if (!document.querySelector('.ltasks')) return;
      items.forEach(function (li, k) { li.className = k < i ? 'done' : k === i ? 'doing' : ''; });
      if (i > items.length) { go('results'); return; }
      i++; timer = setTimeout(tick, i > items.length ? 350 : dur);
    })();
  }
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  function parseBill(v) { var n = Number(String(v).replace(/[^0-9]/g, '').slice(0, 7)); return n || 0; }
  function onScroll() { var h = document.getElementById('hdr'); if (h) h.classList.toggle('scrolled', window.scrollY > 8); }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act],[data-scroll]'); if (!el) return;
    if (el.dataset.scroll) { ev.preventDefault(); if ((location.hash || '#home') !== '#home') { go('home'); } setTimeout(function () { var s = document.getElementById(el.dataset.scroll); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 30); return; }
    var act = el.dataset.act, v = el.dataset.v, a = S.answers;
    if (act === 'lang') { S.lang = v; try { localStorage.setItem('sm-lang', v); } catch (e) { /* ignore */ } rerender(); return; }
    if (act === 'xtax') { S.extras.tax = !S.extras.tax; saveFlow(); rerender(); return; }
    if (act === 'xsell') { S.extras.sell = !S.extras.sell; saveFlow(); rerender(); return; }
    if (act === 'choose') {
      var id = FLOW[S.step]; a[id] = v; saveFlow(); rerender();
      var q = Q(id), needsMore = (q.conditionalFields || []).some(function (cf) { return cf.whenOption === v; }) || id === 'quoteContactRequested';
      if (!needsMore) setTimeout(function () { if (FLOW[S.step] === id && location.hash === '#estimate') { S.step++; saveFlow(); route(); } }, 260);
      return;
    }
    if (act === 'toggle') {
      var sel = (a.daytimeLoads || []).slice(), opt = Q('daytimeLoads').options.filter(function (o) { return o.value === v; })[0];
      if (sel.indexOf(v) > -1) sel = sel.filter(function (x) { return x !== v; });
      else { if (opt && opt.exclusive) sel = [v]; else { sel = sel.filter(function (x) { var o = Q('daytimeLoads').options.filter(function (oo) { return oo.value === x; })[0]; return !(o && o.exclusive); }); sel.push(v); } }
      a.daytimeLoads = sel; if (sel.indexOf('air-conditioning') > -1 && !a.airConditionerCount) a.airConditionerCount = 2; saveFlow(); rerender(); return;
    }
    if (act === 'ac') { a.airConditionerCount = Math.min(30, Math.max(1, (a.airConditionerCount || 1) + Number(v))); saveFlow(); rerender(); return; }
    if (act === 'next') {
      var err = validStep(); var box = document.getElementById('flow-err');
      if (err) { if (box) box.textContent = err; return; }
      if (S.step >= FLOW.length - 1) { saveFlow(); go('loading'); return; }
      S.step++; saveFlow(); route(); return;
    }
    if (act === 'prev') { S.step = Math.max(0, S.step - 1); saveFlow(); route(); return; }
    if (act === 'goto') { S.step = Number(v); saveFlow(); go('estimate'); return; }
    if (act === 'restart') { S.answers = { province: 'bangkok', monthlyBillThb: 4000 }; S.refine = {}; S.extras = { tax: false, rate: '0.2', sell: false }; S.step = 0; saveFlow(); go('estimate'); return; }
    if (act === 'share') { toast(t('shareNote')); return; }
    if (act === 'copylink') { var url = location.href.split('#')[0] + '#results'; var done = function () { toast(t('copied')); }; if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done(); return; }
    if (act === 'copynum') { var d2 = function () { toast(t('numCopied')); }; if (navigator.clipboard) navigator.clipboard.writeText(v).then(d2, d2); else d2(); return; }
    if (act === 'toast') { toast(v === 'line' ? 'LINE' : t(v)); return; }
    if (act === 'approval') { S.portal.approval = v; rerender(); return; }
    if (act === 'accept') { S.portal.accepting = !S.portal.accepting; rerender(); toast(S.portal.accepting ? t('resumedT') : t('pausedT')); return; }
    if (act === 'seg') { S.portal.seg = v; if (el.tagName === 'A') return; rerender(); return; }
    if (act === 'status') { S.portal.status[el.dataset.id] = v; rerender(); return; }
    if (act === 'area') { var ar = S.portal.areas; S.portal.areas = ar.indexOf(v) > -1 ? ar.filter(function (x) { return x !== v; }) : ar.concat(v); rerender(); return; }
    if (act === 'perday') { S.portal.perDay = Math.min(20, Math.max(1, S.portal.perDay + Number(v))); rerender(); return; }
    if (act === 'line') { S.portal.line = true; rerender(); toast(t('connected')); return; }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, act = el.dataset && el.dataset.act;
    if (el.id === 'bill') { var n = parseBill(el.value); el.value = n ? n.toLocaleString('en-US') : ''; S.answers.monthlyBillThb = n; var hr = document.querySelector('[data-act=billhero]'); if (hr && n) hr.value = Math.min(25000, n); saveFlow(); return; }
    if (act === 'billhero') { S.answers.monthlyBillThb = Number(el.value); var hb = document.getElementById('bill'); if (hb) hb.value = Number(el.value).toLocaleString('en-US'); saveFlow(); return; }
    if (act === 'bill2') { var n2 = parseBill(el.value); el.value = n2 ? n2.toLocaleString('en-US') : ''; S.answers.monthlyBillThb = n2; var r = document.querySelector('[data-act=billrange]'); if (r) r.value = Math.min(25000, n2 || 4000); saveFlow(); return; }
    if (act === 'billrange') { S.answers.monthlyBillThb = Number(el.value); var i2 = document.getElementById('bill2'); if (i2) i2.value = Number(el.value).toLocaleString('en-US'); saveFlow(); return; }
    if (act === 'cftext') { S.answers[el.dataset.k] = el.value; saveFlow(); return; }
    if (act === 'search') { S.portal.q = el.value; rerender('esearch'); return; }
    if (act === 'notes') { S.portal.notes[el.dataset.id] = el.value; return; }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target, act = el.dataset && el.dataset.act;
    if (act === 'district') { S.answers.district = el.value || undefined; saveFlow(); rerender(el.id); return; }
    if (act === 'prov-select') { S.answers.province = el.value; delete S.answers.district; saveFlow(); rerender(el.id); return; }
    if (act === 'xrate') { S.extras.rate = el.value; saveFlow(); rerender(el.id); return; }
    if (act === 'refine') { S.refine[el.dataset.k] = el.value; saveFlow(); rerender(el.id); toast(t('updated')); return; }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target; ev.preventDefault();
    if (f.dataset.form === 'bill') { if (!S.answers.monthlyBillThb) { document.getElementById('bill').focus(); return; } S.step = 1; saveFlow(); go('estimate'); return; }
    if (f.dataset.form === 'company') { toast(t('savedT')); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && location.hash === '#estimate' && ev.target.tagName === 'INPUT' && ev.target.id === 'bill2') { ev.preventDefault(); var b = document.querySelector('[data-act=next]'); if (b) b.click(); }
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', route);
  setInterval(function () { if (/^#(portal|enquiries|enquiry-)/.test(location.hash) && !document.activeElement.matches('input,textarea')) rerender(); }, 60000);
  if (!E) { root.innerHTML = '<p style="padding:24px">Calculator failed to load.</p>'; return; }
  route();
})();
