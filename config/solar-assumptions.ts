export const solarAssumptions = {
  version: 'prototype-2026-08-27',
  mode: 'prototype' as const,
  referenceAnnualYieldKwhPerKwp: 1300,
  simplifiedRetailValueThbPerKwh: 4.2,
  daytimeShare: {
    high: 0.72,
    medium: 0.55,
    low: 0.36,
    unknown: 0.48,
  },
  shadeFactor: {
    none: 1,
    partial: 0.9,
    high: 0.74,
    unknown: 0.86,
  },
  fit: {
    rateThbPerKwh: 2.2,
    maxAcKw: 5,
    termYears: 10,
    lastVerified: '2026-08-27',
    includedInBaseResult: false,
  },
  tax: {
    deductionCapThb: 200000,
    lastVerified: '2026-08-27',
    estimateEnabled: false,
  },
  disclaimer:
    'ตัวเลขใช้สมมติฐานเบื้องต้นเพื่อทดสอบประสบการณ์ใช้งาน ยังไม่ควรใช้ตัดสินใจซื้อระบบจริง',
} as const;
