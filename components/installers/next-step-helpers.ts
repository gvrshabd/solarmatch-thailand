// Thai workflow copy is a draft and needs native review.
export const stages = [
  ['open', 'ใหม่', 'New'], ['contacted', 'ติดต่อแล้ว', 'Contacted'],
  ['site_visit', 'สำรวจ', 'Visit'], ['quoted', 'เสนอราคา', 'Quoted'], ['won', 'ตกลงซื้อ', 'Won'],
] as const;

export const closeReasons = [
  ['other-company', 'เลือกบริษัทอื่น', 'Chose another company'], ['price', 'ราคา', 'Price'],
  ['not-ready', 'ยังไม่พร้อม', 'Not ready yet'], ['unreachable', 'ติดต่อไม่ได้', 'Couldn’t reach them'],
  ['not-suitable', 'ไม่เหมาะกับการติดโซลาร์', 'Not suitable for solar'],
] as const;

export function textTemplate(name: string, company: string, attempted: boolean, en: boolean) {
  if (en) return attempted
    ? `Hi ${name}, this is ${company}. We got your solar quote request from SolarMatch and tried to call you. When is a good time to talk? Just reply to this message.`
    : `Hi ${name}, this is ${company}. We got your solar quote request from SolarMatch and will call you shortly from this number.`;
  return attempted
    ? `สวัสดีคุณ${name} ${company} ได้รับคำขอใบเสนอราคาโซลาร์ของคุณจาก SolarMatch และได้โทรหาคุณ สะดวกคุยช่วงไหน ตอบกลับข้อความนี้ได้เลย`
    : `สวัสดีคุณ${name} ${company} ได้รับคำขอใบเสนอราคาโซลาร์ของคุณจาก SolarMatch แล้ว จะโทรหาคุณจากเบอร์นี้ในไม่ช้า`;
}

const bangkokOffset = 7 * 60 * 60 * 1000;
export function visitDays(now: number, savedVisit?: string | null) {
  const first = new Date(now + bangkokOffset).toISOString().slice(0, 10);
  const days = Array.from({length: 5}, (_, index) =>
    new Date(Date.parse(first + 'T00:00:00Z') + index * 86400000).toISOString().slice(0, 10));
  if (savedVisit) {
    const saved = new Date(Date.parse(savedVisit) + bangkokOffset).toISOString().slice(0, 10);
    if (!days.includes(saved)) days.push(saved);
  }
  return days;
}

export function localizedTime(iso: string, en: boolean, withDate = true) {
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'th-TH', {
    timeZone: 'Asia/Bangkok', ...(withDate ? {weekday: 'short', day: 'numeric', month: 'short'} as const : {}),
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(iso));
}

export function calendarFile(start: string, deliveryId: string, en: boolean, now: number) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // Only opaque IDs and dates enter the file. A stable UID lets calendar clients match repeat exports.
  const uid = deliveryId.replace(/[^a-z0-9-]/gi, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SolarMatch//Installers//EN', 'BEGIN:VEVENT',
    'UID:' + uid + '@installers.solarmatch', 'DTSTAMP:' + stamp(new Date(now)),
    'DTSTART:' + stamp(new Date(start)), 'DTEND:' + stamp(new Date(Date.parse(start) + 3600000)),
    'SUMMARY:' + (en ? 'SolarMatch site visit' : 'นัดสำรวจหน้างาน SolarMatch'),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export const callKey = 'solarmatch-installer-call';
export function clearPendingCall() {
  try { sessionStorage.removeItem(callKey); } catch { /* Storage may be disabled. */ }
}
