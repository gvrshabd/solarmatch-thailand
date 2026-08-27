export const siteConfig = {
  name: 'SolarMatch Thailand',
  shortName: 'SolarMatch',
  mode: 'prototype' as const,
  description:
    'เครื่องมือประเมิน Solar Rooftop เบื้องต้นสำหรับเจ้าของบ้านในไทย',
  url: 'https://solarmatch-thailand.deluxejahseh.workers.dev',
  contact: {
    lineUrl: '',
    lineId: '',
    phone: '',
    email: '',
    businessHours: '',
  },
  initialMarkets: [
    'กรุงเทพมหานคร',
    'นนทบุรี',
    'ปทุมธานี',
    'สมุทรปราการ',
  ],
  assumptionVersion: 'prototype-2026-08-27',
} as const;

export type SiteConfig = typeof siteConfig;
