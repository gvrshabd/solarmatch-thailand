export const siteConfig = {
  name: 'SolarMatch Thailand',
  shortName: 'SolarMatch',
  mode: 'prototype' as const,
  description:
    'ประเมิน Solar Rooftop เบื้องต้นและเตรียมเปรียบเทียบผู้ติดตั้งที่เหมาะสมในไทย',
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
  assumptionVersion: 'thailand-ballpark-2026-08-28-v5',
} as const;

export type SiteConfig = typeof siteConfig;
