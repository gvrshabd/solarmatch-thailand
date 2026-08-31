export const siteConfig = {
  name: 'SolarMatch Thailand',
  shortName: 'SolarMatch',
  description:
    'ประเมิน Solar Rooftop เบื้องต้นสำหรับบ้านในไทย ก่อนเลือกขอให้บริษัทโซลาร์ติดต่อ',
  url: 'https://solarmatch-thailand.deluxejahseh.workers.dev',
  contact: {
    lineUrl: '',
    lineId: '',
    phone: '',
    email: '',
    businessHours: '',
  },
  initialMarkets: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร', 'นครปฐม'],
  assumptionVersion: 'thailand-ballpark-2026-08-28-v5',
} as const;

export type SiteConfig = typeof siteConfig;
