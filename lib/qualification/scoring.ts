import type { EstimateAnswers } from '@/lib/calculator/types';

export type ScoringFactor = {
  key: string;
  points: number;
  maximum: number;
  value: unknown;
  explanationEn: string;
  explanationTh: string;
};

export type ScoringConfiguration = {
  id: string;
  maximumPoints: 100;
  ownerRequired: boolean;
  minimumAirConditioners: number;
  highQualityThreshold: number;
  automaticSelectionThreshold: number;
  weights: {
    ownership: number;
    airConditioners: number;
    monthlyBill: number;
    daytimeUse: number;
    daytimeLoads: number;
    roofArea: number;
    shade: number;
    roofMaterial: number;
    propertyType: number;
    location: number;
    timeframe?: number;
  };
  billThresholdsThb: [number, number, number, number, number];
  targetProvinces: string[];
  bands: Array<{ min: number; max: number; score: 1 | 2 | 3 | 4 | 5 }>;
};

export type LeadAssessment = {
  rawPoints: number;
  qualityScore: 1 | 2 | 3 | 4 | 5;
  hardEligible: boolean;
  highQuality: boolean;
  eligibilityReasons: Array<{ key: string; passed: boolean; explanationEn: string; explanationTh: string }>;
  factors: ScoringFactor[];
};

export const initialScoringConfiguration: ScoringConfiguration = {
  id: 'residential-rules-v2',
  maximumPoints: 100,
  ownerRequired: true,
  minimumAirConditioners: 4,
  highQualityThreshold: 4,
  automaticSelectionThreshold: 4,
  weights: {
    ownership: 10,
    airConditioners: 18,
    monthlyBill: 17,
    daytimeUse: 13,
    daytimeLoads: 5,
    roofArea: 11,
    shade: 11,
    roofMaterial: 5,
    propertyType: 5,
    location: 5,
  },
  billThresholdsThb: [1500, 3000, 5000, 8000, 12000],
  targetProvinces: ['bangkok', 'nonthaburi', 'pathum-thani', 'samut-prakan', 'samut-sakhon', 'nakhon-pathom'],
  bands: [
    { min: 0, max: 24, score: 1 },
    { min: 25, max: 44, score: 2 },
    { min: 45, max: 64, score: 3 },
    { min: 65, max: 79, score: 4 },
    { min: 80, max: 100, score: 5 },
  ],
};

export const legacyScoringConfigurationV1: ScoringConfiguration = {
  ...initialScoringConfiguration,
  id: 'residential-rules-v1',
  weights: {
    ownership: 10,
    airConditioners: 18,
    monthlyBill: 15,
    daytimeUse: 12,
    daytimeLoads: 5,
    roofArea: 10,
    shade: 10,
    roofMaterial: 5,
    propertyType: 5,
    location: 5,
    timeframe: 5,
  },
};

function bracket<T extends string>(value: T, points: Record<T, number>) {
  return points[value] ?? 0;
}

function weighted(basePoints: number, baseMaximum: number, configuredMaximum: number) {
  return Math.round((basePoints / baseMaximum) * configuredMaximum);
}

export function calculateLeadAssessment(
  answers: EstimateAnswers,
  configuration: ScoringConfiguration = initialScoringConfiguration,
): LeadAssessment {
  const acCount = answers.airConditionerCount ?? 0;
  const ownershipPoints = weighted(bracket(answers.ownershipStatus, { owner: 10, other: 2, renter: 0 }), 10, configuration.weights.ownership);
  const acPoints = weighted(acCount >= 9 ? 18 : acCount >= 7 ? 16 : acCount >= 5 ? 13 : acCount >= 4 ? 10 : acCount === 3 ? 6 : acCount >= 1 ? 3 : 0, 18, configuration.weights.airConditioners);
  const bill = answers.monthlyBillThb;
  const [billLow, billMediumLow, billMedium, billHigh, billVeryHigh] = configuration.billThresholdsThb;
  const billPoints = weighted(bill >= billVeryHigh ? 15 : bill >= billHigh ? 13 : bill >= billMedium ? 10 : bill >= billMediumLow ? 7 : bill >= billLow ? 3 : 0, 15, configuration.weights.monthlyBill);
  const daytimePoints = weighted(bracket(answers.daytimePattern, { 'very-low': 0, low: 3, moderate: 6, high: 9, 'very-high': 12 }), 12, configuration.weights.daytimeUse);
  const loadPoints = weighted(Math.min(5,
    (answers.daytimeLoads.includes('ev') ? 3 : 0)
    + (answers.daytimeLoads.includes('pump') ? 2 : 0)
    + (answers.daytimeLoads.includes('other-high-use') ? 2 : 0)
    + (answers.daytimeLoads.includes('home-office-equipment') ? 1 : 0)
    + (answers.daytimeLoads.includes('laundry-cooking') ? 1 : 0)), 5, configuration.weights.daytimeLoads);
  const roofAreaPoints = weighted(bracket(answers.roofArea, { 'under-30': 1, '30-60': 5, '60-100': 8, '100-200': 10, 'over-200': 10, unsure: 3 }), 10, configuration.weights.roofArea);
  const shadePoints = weighted(bracket(answers.shade, { 'almost-none': 10, little: 8, some: 5, 'a-lot': 0, unsure: 4 }), 10, configuration.weights.shade);
  const roofMaterialPoints = weighted(answers.roofMaterial === 'unsure' ? 2 : answers.roofMaterial === 'other' ? 3 : 5, 5, configuration.weights.roofMaterial);
  const propertyPoints = weighted(bracket(answers.propertyType, { 'detached-home': 5, 'large-home': 5, 'semi-detached-home': 4, townhouse: 3, 'other-residential': 2 }), 5, configuration.weights.propertyType);
  const targetProvinces = new Set(configuration.targetProvinces);
  const locationPoints = weighted(targetProvinces.has(answers.province) ? 5 : 1, 5, configuration.weights.location);
  const timeframeMaximum = configuration.weights.timeframe ?? 0;
  const timeframePoints = answers.installationTimeframe && timeframeMaximum > 0
    ? weighted(bracket(answers.installationTimeframe, { asap: 5, 'one-three-months': 5, 'three-six-months': 4, 'over-six-months': 2, researching: 1 }), 5, timeframeMaximum)
    : 0;

  const factors: ScoringFactor[] = [
    { key: 'ownership', points: ownershipPoints, maximum: configuration.weights.ownership, value: answers.ownershipStatus, explanationEn: `${answers.ownershipStatus} ownership status`, explanationTh: `สถานะต่อทรัพย์สิน: ${answers.ownershipStatus}` },
    { key: 'air-conditioners', points: acPoints, maximum: configuration.weights.airConditioners, value: acCount, explanationEn: `${acCount} installed AC units`, explanationTh: `ติดตั้งเครื่องปรับอากาศ ${acCount} เครื่อง` },
    { key: 'monthly-bill', points: billPoints, maximum: configuration.weights.monthlyBill, value: bill, explanationEn: `Typical bill ฿${Math.round(bill).toLocaleString('en-US')}`, explanationTh: `ค่าไฟเดือนปกติประมาณ ${Math.round(bill).toLocaleString('th-TH')} บาท` },
    { key: 'daytime-use', points: daytimePoints, maximum: configuration.weights.daytimeUse, value: answers.daytimePattern, explanationEn: `${answers.daytimePattern} daytime use`, explanationTh: `การใช้ไฟช่วงกลางวัน: ${answers.daytimePattern}` },
    { key: 'daytime-loads', points: loadPoints, maximum: configuration.weights.daytimeLoads, value: answers.daytimeLoads, explanationEn: 'Residential daytime appliances', explanationTh: 'อุปกรณ์ที่ใช้ไฟช่วงกลางวัน' },
    { key: 'roof-area', points: roofAreaPoints, maximum: configuration.weights.roofArea, value: answers.roofArea, explanationEn: `${answers.roofArea} roof-area band`, explanationTh: `ช่วงพื้นที่หลังคา ${answers.roofArea}` },
    { key: 'shade', points: shadePoints, maximum: configuration.weights.shade, value: answers.shade, explanationEn: `${answers.shade} shade`, explanationTh: `เงาบัง: ${answers.shade}` },
    { key: 'roof-material', points: roofMaterialPoints, maximum: configuration.weights.roofMaterial, value: answers.roofMaterial, explanationEn: 'Roof-material information', explanationTh: 'ข้อมูลวัสดุหลังคา' },
    { key: 'property-type', points: propertyPoints, maximum: configuration.weights.propertyType, value: answers.propertyType, explanationEn: 'Residential property type', explanationTh: 'ประเภทที่พักอาศัย' },
    { key: 'location', points: locationPoints, maximum: configuration.weights.location, value: answers.province, explanationEn: targetProvinces.has(answers.province) ? 'Within Greater Bangkok' : 'Outside the initial target area', explanationTh: targetProvinces.has(answers.province) ? 'อยู่ในกรุงเทพฯ และปริมณฑล' : 'อยู่นอกพื้นที่เป้าหมายเริ่มต้น' },
    ...(timeframeMaximum > 0 ? [{ key: 'timeframe', points: timeframePoints, maximum: timeframeMaximum, value: answers.installationTimeframe, explanationEn: 'Installation timeframe', explanationTh: 'ช่วงเวลาที่วางแผนติดตั้ง' }] : []),
  ];
  const rawPoints = Math.max(0, Math.min(configuration.maximumPoints, factors.reduce((sum, factor) => sum + factor.points, 0)));
  const qualityScore = configuration.bands.find((band) => rawPoints >= band.min && rawPoints <= band.max)?.score ?? 1;
  const ownerPassed = !configuration.ownerRequired || answers.ownershipStatus === 'owner';
  const acPassed = acCount >= configuration.minimumAirConditioners;
  const hardEligible = ownerPassed && acPassed;

  return {
    rawPoints,
    qualityScore,
    hardEligible,
    highQuality: qualityScore >= configuration.highQualityThreshold,
    eligibilityReasons: [
      { key: 'owner', passed: ownerPassed, explanationEn: ownerPassed ? 'Owner requirement met' : 'Owner requirement not met', explanationTh: ownerPassed ? 'ผ่านเงื่อนไขเจ้าของกรรมสิทธิ์' : 'ไม่ผ่านเงื่อนไขเจ้าของกรรมสิทธิ์' },
      { key: 'air-conditioners', passed: acPassed, explanationEn: acPassed ? `At least ${configuration.minimumAirConditioners} AC units` : `Fewer than ${configuration.minimumAirConditioners} AC units`, explanationTh: acPassed ? `มีเครื่องปรับอากาศอย่างน้อย ${configuration.minimumAirConditioners} เครื่อง` : `มีเครื่องปรับอากาศน้อยกว่า ${configuration.minimumAirConditioners} เครื่อง` },
    ],
    factors,
  };
}

export function validateScoringConfiguration(configuration: ScoringConfiguration) {
  const errors: string[] = [];
  if (configuration.maximumPoints !== 100) errors.push('Maximum points must equal 100.');
  if (configuration.minimumAirConditioners < 0 || configuration.minimumAirConditioners > 100) errors.push('AC minimum must be between 0 and 100.');
  if (configuration.highQualityThreshold < 1 || configuration.highQualityThreshold > 5) errors.push('High-quality threshold must be between 1 and 5.');
  if (configuration.automaticSelectionThreshold < 1 || configuration.automaticSelectionThreshold > 5) errors.push('Automatic-selection threshold must be between 1 and 5.');
  if (configuration.automaticSelectionThreshold < configuration.highQualityThreshold) errors.push('Automatic selection cannot be below the high-quality threshold.');
  if (Object.values(configuration.weights).some((weight) => !Number.isInteger(weight) || weight < 0 || weight > 100)) errors.push('Every scoring weight must be a whole number from 0 through 100.');
  if (Object.values(configuration.weights).reduce((sum, weight) => sum + weight, 0) !== 100) errors.push('Scoring weights must total exactly 100.');
  if (configuration.billThresholdsThb.some((threshold, index, values) => threshold <= 0 || (index > 0 && threshold <= values[index - 1]))) errors.push('Bill thresholds must be positive and strictly increasing.');
  if (new Set(configuration.targetProvinces).size !== configuration.targetProvinces.length) errors.push('Target locations must not contain duplicates.');
  if (new Set(configuration.bands.map((band) => band.score)).size !== 5) errors.push('Quality bands must define each score from 1 through 5 exactly once.');
  const coverage = Array.from({ length: 101 }, () => 0);
  configuration.bands.forEach((band) => {
    if (band.min > band.max) errors.push(`The ${band.score}/5 band minimum cannot exceed its maximum.`);
    for (let value = band.min; value <= band.max; value += 1) coverage[value] += 1;
  });
  if (coverage.some((count) => count !== 1)) errors.push('Score bands must cover every point from 0 through 100 exactly once without gaps or overlaps.');
  return errors;
}
