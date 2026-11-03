/* SolarMatch for installers · landing page (final design). Vanilla JS reference for the React port.
   Two behaviours matter: ExampleFeed (auto-scrolling examples) and SunPath (scroll-linked sun).
   Everything else is static markup. Example customers are fictional and always labelled EXAMPLES.
   ไทย / EN toggle switches the copy; in the real site this is ?lang=en and the existing setLanguage(). */
(function () {
  'use strict';
  var root = document.getElementById('app');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- icons (lucide equivalents in the repo: ArrowRight, Phone, MessageCircle, Mail, Pause, Play) ---------- */
  var P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    phone: '<path d="M5.5 4h3.3l1.7 4.3-2.2 1.4a10.5 10.5 0 0 0 4.9 4.9l1.4-2.2 4.3 1.7v3.3a1.8 1.8 0 0 1-1.9 1.8C10.6 19.2 4.8 13.4 3.7 5.9A1.8 1.8 0 0 1 5.5 4z"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>', play: '<path d="M7.5 5.5v13l11-6.5z"/>'
  };
  function ic(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; }
  var LOGO = '<svg class="logo" viewBox="0 0 64 56" aria-hidden="true"><g fill="#E2A62B"><path d="M32 0 27.5 8h9L32 0Z"/><path d="m15.5 6.5 1.2 9 7.7-4.5-8.9-4.5Z"/><path d="m48.5 6.5-8.9 4.5 7.7 4.5 1.2-9Z"/><path d="M3 24.5 11.5 29v-9L3 24.5Z"/><path d="m61 24.5-8.5-4.5v9l8.5-4.5Z"/><path d="m9 41 9-1.1-4.5-7.8L9 41Z"/><path d="m55 41-4.5-8.9-4.5 7.8L55 41Z"/></g><path d="M15 37a20.5 20.5 0 1 1 34 0" fill="none" stroke="#E2A62B" stroke-width="6"/><path d="M10 53 39 30M54 53 25 30" fill="none" stroke="#137A50" stroke-linecap="square" stroke-width="6"/></svg>';

  /* ---------- copy (Thai is a draft for native review). Numbers marked {..} come from InstallerPublicConfig.commercial ---------- */
  var CFG = { price: '฿400', companies: 3, trial: 2, claimDays: 7 }; /* stand-ins for commercial values */
  var COPY = {
    en: {
      brandSub: 'FOR INSTALLERS', navMain: 'Main', navHow: 'How it works', navFaq: 'Questions', signIn: 'Sign in', apply: 'Apply',
      eyebrow: 'Bangkok & nearby', h1a: 'Get connected with homeowners ', h1b: 'who asked to be called.', applyLong: 'Apply as a solar installer',
      examples: 'Examples', examplesLabel: 'Example customers', pause: 'Pause examples', play: 'Play examples', acs: '{n} air-cons',
      howH: 'How it works', s1: 'Apply', s2: 'Receive customer information', s2p: 'Through LINE or email', s3: 'Call and earn!',
      faqH: 'Commonly asked questions', photoAlt: 'Solar panels on a tiled roof in a garden',
      q1: 'What does each enquiry cost?', a1: '{price} per enquiry. No subscription and no automatic billing.',
      q2: 'How many companies get the same homeowner?', a2: '{companies} at most, including you.',
      q3: 'Is there a free trial?', a3: 'Yes. Your first {trial} enquiries are free once you’re approved.',
      q4: 'What if a customer’s details are wrong?', a4: 'Report it within {claimDays} days. If the details are wrong, you get your credits back.',
      homeSite: 'Homeowner site', privacy: 'Privacy Notice', terms: 'Terms of use', fine: 'Pre-launch preview.', skip: 'Skip to content', footer: 'Footer'
    },
    th: {
      brandSub: 'สำหรับผู้ติดตั้ง', navMain: 'เมนูหลัก', navHow: 'วิธีการทำงาน', navFaq: 'คำถาม', signIn: 'เข้าสู่ระบบ', apply: 'สมัคร',
      eyebrow: 'กรุงเทพฯ และปริมณฑล', h1a: 'เชื่อมต่อกับเจ้าของบ้าน', h1b: 'ที่ขอให้ติดต่อกลับ', applyLong: 'สมัครเป็นผู้ติดตั้งโซลาร์',
      examples: 'ตัวอย่าง', examplesLabel: 'ตัวอย่างลูกค้า', pause: 'หยุดตัวอย่าง', play: 'เล่นตัวอย่าง', acs: 'แอร์ {n} เครื่อง',
      howH: 'วิธีการทำงาน', s1: 'สมัคร', s2: 'รับข้อมูลลูกค้า', s2p: 'ผ่าน LINE หรืออีเมล', s3: 'โทรแล้วสร้างรายได้!',
      faqH: 'คำถามที่พบบ่อย', photoAlt: 'แผงโซลาร์บนหลังคากระเบื้องในสวน',
      q1: 'ค่าคำขอเท่าไร?', a1: 'คำขอละ {price} ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ',
      q2: 'มีบริษัทได้รับลูกค้ารายเดียวกันกี่แห่ง?', a2: 'ไม่เกิน {companies} บริษัท รวมคุณด้วย',
      q3: 'ทดลองใช้ฟรีได้ไหม?', a3: 'ได้ คำขอ {trial} รายการแรกฟรีหลังได้รับอนุมัติ',
      q4: 'ถ้าข้อมูลลูกค้าไม่ถูกต้องล่ะ?', a4: 'แจ้งเราภายใน {claimDays} วัน หากข้อมูลผิดจริง คุณจะได้เครดิตคืน',
      homeSite: 'เว็บไซต์เจ้าของบ้าน', privacy: 'ประกาศความเป็นส่วนตัว', terms: 'ข้อกำหนดการใช้งาน', fine: 'ตัวอย่างก่อนเปิดบริการ', skip: 'ข้ามไปเนื้อหา', footer: 'ส่วนท้าย'
    }
  };
  var WHEN = [['Within 3 months', 'ภายใน 3 เดือน'], ['3–6 months', '3–6 เดือน'], ['6–12 months', '6–12 เดือน']];
  var EXAMPLES = [
    { n: ['Arun', 'อรุณ'], a: ['Prawet, Bangkok', 'ประเวศ, กรุงเทพฯ'], bill: 7200, ac: 6, w: 0, t: ['just now', 'เมื่อสักครู่'] },
    { n: ['Natee', 'นที'], a: ['Sathon, Bangkok', 'สาทร, กรุงเทพฯ'], bill: 6000, ac: 5, w: 1, t: ['3 min ago', '3 นาทีที่แล้ว'] },
    { n: ['Kanya', 'กัญญา'], a: ['Bang Phli, Samut Prakan', 'บางพลี, สมุทรปราการ'], bill: 8800, ac: 7, w: 0, t: ['9 min ago', '9 นาทีที่แล้ว'] },
    { n: ['Ploy', 'พลอย'], a: ['Bang Na, Bangkok', 'บางนา, กรุงเทพฯ'], bill: 9500, ac: 8, w: 0, t: ['16 min ago', '16 นาทีที่แล้ว'] },
    { n: ['Somsak', 'สมศักดิ์'], a: ['Pak Kret, Nonthaburi', 'ปากเกร็ด, นนทบุรี'], bill: 5400, ac: 4, w: 1, t: ['24 min ago', '24 นาทีที่แล้ว'] },
    { n: ['Malee', 'มาลี'], a: ['Lat Phrao, Bangkok', 'ลาดพร้าว, กรุงเทพฯ'], bill: 7800, ac: 6, w: 2, t: ['38 min ago', '38 นาทีที่แล้ว'] }
  ];
  var S = { lang: 'en' };
  function t(k, v) { var s = COPY[S.lang][k]; v = v || CFG; return s.replace(/\{(\w+)\}/g, function (m, x) { return v[x] != null ? v[x] : m; }); }
  function L(p) { return p[S.lang === 'th' ? 1 : 0]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function baht(n) { return '฿' + n.toLocaleString('en-US'); }

  /* ---------- markup ---------- */
  function brand() { return '<a class="brand" href="#" aria-label="SolarMatch ' + esc(t('brandSub')) + '">' + LOGO + '<span><b>SolarMatch</b><small>' + t('brandSub') + '</small></span></a>'; }
  function langToggle() { return '<div class="lang" role="group" aria-label="Language"><button type="button" lang="th" data-act="lang" data-v="th" aria-pressed="' + (S.lang === 'th') + '" aria-label="Switch to Thai">ไทย</button><button type="button" lang="en" data-act="lang" data-v="en" aria-pressed="' + (S.lang === 'en') + '" aria-label="Switch to English">EN</button></div>'; }
  function header() {
    return '<header class="hdr"><div class="wrap">' + brand() + '<nav class="hnav" aria-label="' + t('navMain') + '"><a href="#how">' + t('navHow') + '</a><a href="#faq">' + t('navFaq') + '</a></nav>' +
      '<div class="r">' + langToggle() + '<button type="button" class="btn ghost sm signin">' + t('signIn') + '</button><button type="button" class="btn primary sm">' + t('apply') + '</button></div></div></header>';
  }
  function exampleCard(c, dup) {
    return '<article class="pc"' + (dup ? ' aria-hidden="true"' : '') + '><span class="av" aria-hidden="true">' + Array.from(L(c.n))[0] + '</span><b>' + L(c.n) + '</b><time>' + L(c.t) + '</time><small>' + L(c.a) + '</small><span class="call" aria-hidden="true">' + ic('phone') + '</span>' +
      '<span class="tags"><span>' + baht(c.bill) + '</span><span>' + t('acs', { n: c.ac }) + '</span><span>' + L(WHEN[c.w]) + '</span></span></article>';
  }
  function feed() {
    return '<div class="feed" role="region" aria-label="' + t('examplesLabel') + '"><div class="feed-h"><span class="live" aria-hidden="true"></span><b>' + t('examples') + '</b>' +
      '<button type="button" class="btn ghostd sm fp" data-act="feedpause" aria-pressed="false" aria-label="' + t('pause') + '">' + ic('pause') + '</button></div>' +
      '<div class="feed-v" tabindex="0" role="group" aria-label="' + t('examplesLabel') + '"><div class="feed-l">' +
      EXAMPLES.map(function (c) { return exampleCard(c); }).join('') + EXAMPLES.map(function (c) { return exampleCard(c, true); }).join('') + '</div></div></div>';
  }
  function sunPath() {
    var sub = '<p class="st-ic"><span class="chip-line" aria-hidden="true">' + ic('chat') + '</span><span class="chip-mail" aria-hidden="true">' + ic('mail') + '</span><span>' + t('s2p') + '</span></p>';
    return '<div class="path"><svg viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">' +
      '<path id="arc" d="M120,218 Q500,-26 880,218" fill="none" stroke="#CDD3C6" stroke-width="2" stroke-dasharray="6 9" vector-effect="non-scaling-stroke"/>' +
      '<path id="arcdone" d="M120,218 Q500,-26 880,218" pathLength="1" fill="none" stroke="#E2A62B" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>' +
      '<span class="sun" aria-hidden="true"></span><ol><li><span class="n" aria-hidden="true">1</span><h3>' + t('s1') + '</h3></li><li><span class="n" aria-hidden="true">2</span><h3>' + t('s2') + '</h3>' + sub + '</li><li class="earn"><span class="n" aria-hidden="true">3</span><h3>' + t('s3') + '</h3></li></ol></div>';
  }
  function page() {
    var glow = '<div class="glow" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span><span class="grain"></span></div>';
    var copy = '<div class="copy"><p class="eyebrow">' + t('eyebrow') + '</p><h1>' + t('h1a') + '<em>' + t('h1b') + '</em></h1><div class="btns"><button type="button" class="btn primary lg">' + t('applyLong') + ic('arrow', 'arr') + '</button><button type="button" class="btn ghost lg">' + t('signIn') + '</button></div></div>';
    var qas = [1, 2, 3, 4].map(function (i) { return '<details class="qa"><summary>' + esc(t('q' + i)) + '<span class="pm" aria-hidden="true"></span></summary><p>' + esc(t('a' + i)) + '</p></details>'; }).join('');
    return '<div class="landing" lang="' + S.lang + '"><a href="#main" class="sr skip">' + t('skip') + '</a>' + header() +
      '<main id="main"><div class="top">' + glow + '<section class="hero"><div class="wrap">' + copy + feed() + '</div></section></div>' +
      '<section class="how" id="how"><div class="wrap"><h2>' + t('howH') + '</h2>' + sunPath() + '</div></section>' +
      '<section class="faq" id="faq"><div class="band"><img src="img/roof-tile.jpg" alt="' + esc(t('photoAlt')) + '" width="1200" height="880"><span class="credit">Photo: Kindel Media / Pexels</span><div class="wrap"><h2>' + t('faqH') + '</h2></div></div><div class="wrap"><div class="qas">' + qas + '</div></div></section></main>' +
      '<footer class="foot"><div class="wrap">' + brand() + '<nav aria-label="' + t('footer') + '"><a href="#how">' + t('navHow') + '</a><a href="#faq">' + t('navFaq') + '</a><a href="#">' + t('signIn') + '</a><a href="#">' + t('homeSite') + '</a><a href="#">' + t('privacy') + '</a><a href="#">' + t('terms') + '</a></nav><p class="fine">' + t('fine') + '</p></div></footer></div>';
  }

  /* ---------- ExampleFeed: continuous scroll (vertical ≥960px, sideways below), loops over the doubled list ---------- */
  function initFeed(off) {
    var v = root.querySelector('.feed-v'), btn = root.querySelector('[data-act=feedpause]');
    var mq = matchMedia('(max-width:959px)'), pos = 0, last = 0, hold = 0, hover = false, paused = reduce, mine = false, raf;
    function setBtn() { btn.setAttribute('aria-pressed', paused ? 'true' : 'false'); btn.setAttribute('aria-label', paused ? t('play') : t('pause')); btn.innerHTML = ic(paused ? 'play' : 'pause'); }
    setBtn();
    root._feedToggle = function () { paused = !paused; setBtn(); };
    function frame(ts) {
      var dt = last ? Math.min(50, ts - last) : 16; last = ts;
      var sideways = mq.matches;
      if (!paused && !hover && Date.now() > hold && !document.hidden) {
        var half = (sideways ? v.scrollWidth : v.scrollHeight) / 2;   /* one full copy of the list */
        pos += dt * (sideways ? 0.032 : 0.026);                        /* px per ms */
        if (pos >= half) pos -= half;
        mine = true; if (sideways) v.scrollLeft = pos; else v.scrollTop = pos;
      }
      raf = requestAnimationFrame(frame);
    }
    function user() { hold = Date.now() + 3500; }                       /* a touch, wheel or key pauses for 3.5 s */
    v.addEventListener('scroll', function () {
      if (mine) { mine = false; return; }
      var s = mq.matches, cur = s ? v.scrollLeft : v.scrollTop, half = (s ? v.scrollWidth : v.scrollHeight) / 2;
      if (cur >= half) { cur -= half; if (s) v.scrollLeft = cur; else v.scrollTop = cur; }
      pos = cur;
    }, { passive: true });
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (e) { v.addEventListener(e, user, { passive: true }); });
    v.addEventListener('mouseenter', function () { hover = true; }); v.addEventListener('mouseleave', function () { hover = false; });
    raf = requestAnimationFrame(frame);
    off.push(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- SunPath: progress 0→1 as the section scrolls from 85% to 30% of the viewport ---------- */
  function initPath(off) {
    var box = root.querySelector('.path'), arc = box.querySelector('#arc'), done = box.querySelector('#arcdone'), sun = box.querySelector('.sun');
    var ol = box.querySelector('ol'), lis = [].slice.call(ol.children), len = arc.getTotalLength(), wide = matchMedia('(min-width:860px)'), queued = false;
    function update() {
      queued = false;
      var r = box.getBoundingClientRect(), vh = window.innerHeight;
      var p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.55)));
      if (wide.matches) {
        var pt = arc.getPointAtLength(p * len);                         /* viewBox units: x 0–1000, y 0–240 */
        sun.style.transform = 'translate(' + (pt.x / 1000 * box.clientWidth) + 'px,' + pt.y + 'px)';
        done.style.strokeDashoffset = String(1 - p);
      } else {
        sun.style.transform = 'translate(0,' + (10 + p * (ol.offsetHeight - 20)) + 'px)';
      }
      lis.forEach(function (li, k) { li.classList.toggle('lit', p >= [0.02, 0.5, 0.98][k]); });
    }
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); update();
    off.push(function () { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); });
  }

  /* ---------- render ---------- */
  var off = [];
  function render(keep) {
    off.forEach(function (f) { f(); }); off = [];
    var y = window.scrollY;
    document.documentElement.lang = S.lang;
    root.innerHTML = page();
    initFeed(off); initPath(off);
    window.scrollTo(0, keep ? y : 0);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    if (el.dataset.act === 'lang') { S.lang = el.dataset.v; render(true); var b = root.querySelector('[data-act=lang][data-v=' + S.lang + ']'); if (b) b.focus({ preventScroll: true }); }
    if (el.dataset.act === 'feedpause' && root._feedToggle) root._feedToggle();
  });
  window.LP = { lang: function (l) { S.lang = l; render(true); } };
  render(false);
})();
