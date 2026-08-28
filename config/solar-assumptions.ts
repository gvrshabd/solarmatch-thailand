export const solarAssumptions = {
  version: 'thailand-ballpark-2026-08-28-v5',
  calculatorMode: 'bill-led-self-consumption' as const,
  provinceYieldKwhPerKwp: {
    bangkok: 1380,
    nonthaburi: 1376,
    'pathum-thani': 1357,
    'samut-prakan': 1398,
    other: 1375,
  },
  monthlyProductionShare: [0.088, 0.092, 0.097, 0.092, 0.083, 0.072, 0.071, 0.071, 0.076, 0.083, 0.087, 0.088],
  orientationFactor: {
    'south-group': 1,
    east: 0.97,
    west: 0.96,
    north: 0.92,
    flat: 0.97,
    several: 0.96,
    unsure: 0.95,
  },
  slopeFactor: {
    'south-group': { flat: 0.98, gentle: 1, steep: 1, unsure: 0.99 },
    east: { flat: 0.96, gentle: 0.96, steep: 0.93, unsure: 0.95 },
    west: { flat: 0.96, gentle: 0.96, steep: 0.93, unsure: 0.95 },
    north: { flat: 0.92, gentle: 0.92, steep: 0.86, unsure: 0.9 },
    flat: { flat: 0.97, gentle: 0.97, steep: 0.95, unsure: 0.97 },
    several: { flat: 0.96, gentle: 0.96, steep: 0.94, unsure: 0.95 },
    unsure: { flat: 0.95, gentle: 0.95, steep: 0.91, unsure: 0.95 },
  },
  shadeFactor: {
    'almost-none': 1,
    little: 0.96,
    some: 0.88,
    'a-lot': 0.75,
    unsure: 0.9,
  },
  // Thai load-profile research supports residential sizing around 30% of
  // annual load and larger daytime-led premises around 40–50%. The estimator
  // interpolates inside those published bands using the user's direct answer.
  sizingTargetAnnualLoadShare: {
    'very-low': 0.24,
    low: 0.28,
    moderate: 0.32,
    high: 0.4,
    'very-high': 0.48,
  },
  selfConsumptionAtBalancedSize: {
    'very-low': 0.5,
    low: 0.56,
    moderate: 0.62,
    high: 0.7,
    'very-high': 0.78,
  },
  propertySizingFloor: {
    'detached-home': 0,
    townhouse: 0,
    'large-home': 0,
    shophouse: 0.35,
    warehouse: 0.42,
    'apartment-building': 0.4,
    other: 0,
  },
  planningPriceAnchorsThb: [
    { kwp: 3, single: 130000, three: 145000 },
    { kwp: 5, single: 175000, three: 195000 },
    { kwp: 10, single: 290000, three: 300000 },
    { kwp: 15, single: 454900, three: 454900 },
    { kwp: 20, single: 550000, three: 550000 },
  ],
  // Representative usable area divided by 5.5 m²/kWp. The 5.5 factor is a
  // conservative planning allowance derived from current 550 W module areas
  // plus access, edge and layout spacing.
  roofAreaCapacityKwp: {
    'under-30': 3.5,
    '30-60': 8,
    '60-100': 14.5,
    '100-200': 27,
    // Open-ended band: do not invent an upper roof-capacity limit.
    'over-200': null,
    unsure: null,
  },
  squareMetresPerKwp: 5.5,
  // NREL's 2024 residential PV benchmark models fixed O&M at 1.02% of CAPEX.
  // Its scope includes cleaning, component failure and inverter-related work,
  // so it is used once as a lifetime maintenance/component reserve.
  annualMaintenanceAndComponentReserveRate: 0.0102,
  annualPanelDegradationRate: 0.005,
  annualTariffEscalationRate: 0,
  analysisYears: 25,
  referenceAnnualYieldKwhPerKwp: 1380,
  fit: {
    rateThbPerKwh: 2.2,
    maxAcKw: 5,
    termYears: 10,
    lastVerified: '2026-08-28',
    includedInBaseResult: false,
    sources: [
      'https://www.pea.co.th/news/corporate-news/2133',
      'https://www.pea.co.th/news/corporate-news/2114',
      'https://erc.or.th/pdfjs/web/viewer.html?file=%2Fweb-upload%2F200xf869baf82be74c18cc110e974eea8d5c%2F202606%2Fm_news%2F9090%2F3441%2Ffile_download%2Fae5c0f3369d23b692064262036b1725f.pdf',
    ],
  },
  tax: {
    deductionCapThb: 200000,
    measureEnds: '2028-12-31',
    lastVerified: '2026-08-28',
    estimateEnabled: false,
    source: 'https://www.pea.co.th/news/corporate-news/2268',
  },
  sources: {
    production: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en',
    thaiLoadProfiles: 'https://www.mdpi.com/1996-1073/14/11/3329',
    pricesPea5: 'https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/',
    pricesPea10: 'https://peashopping.com/product/pea-solar-10kw-3-phase-standard-package/',
    pricesMarket: 'https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf',
    roofModuleTrina: 'https://static.trinasolar.com/sites/default/files/MA_Datasheet_Vertex_DEG19C.20_202011.pdf',
    roofModuleJa: 'https://www.jasolar.com/uploadfile/fujian/2025/0924/91284c078dbf.pdf',
    maintenance: 'https://atb.nrel.gov/electricity/2024b/residential_pv',
    degradation: 'https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2017/Dec/IRENA_Cost_Indicators_PV_2017.pdf',
  },
  assumptionsLastVerified: '2026-08-28',
  disclaimer: 'ตัวเลขเป็นค่าประมาณเบื้องต้นเพื่อเปรียบเทียบทางเลือก ไม่ใช่แบบวิศวกรรม ใบเสนอราคา หรือคำรับรองผลประหยัด',
} as const;
