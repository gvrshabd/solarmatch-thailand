import { z } from 'zod';
import type { EstimateAnswers } from '@/lib/calculator/types';

export const estimateCalendarDateSchema = z.iso.date();
const finiteNonnegative = (maximum: number) => z.number().finite().min(0).max(maximum);
const fractionSchema = finiteNonnegative(1);
const daytimePatternSchema = z.enum(['very-low', 'low', 'moderate', 'high', 'very-high']);
const monthlyRecordSchema = z.object({
  month: z.number().int().min(1).max(12), kwh: finiteNonnegative(100000),
  periodDays: z.number().int().min(1).max(366), billDate: estimateCalendarDateSchema.optional(),
});
const plannedLoadSchema = z.object({
  kind: z.enum(['ev', 'air-conditioning', 'pump']), startDate: estimateCalendarDateSchema,
  monthlyKwh: finiteNonnegative(100000).optional(), homeChargingFraction: fractionSchema.optional(),
  daytimeFraction: fractionSchema.optional(), powerKw: finiteNonnegative(1000).optional(),
  units: z.number().int().min(1).max(100).optional(), hoursPerDay: finiteNonnegative(24).optional(),
  startHour: z.number().finite().min(0).lt(24).optional(),
}).superRefine((load, context) => {
  if (load.kind === 'ev' && load.monthlyKwh === undefined) context.addIssue({ code: 'custom', path: ['monthlyKwh'], message: 'EV changes require monthly charging kWh.' });
  if (load.kind !== 'ev') {
    if (load.powerKw === undefined) context.addIssue({ code: 'custom', path: ['powerKw'], message: 'Appliance changes require electric input power.' });
    if (load.hoursPerDay === undefined) context.addIssue({ code: 'custom', path: ['hoursPerDay'], message: 'Appliance changes require hours per day.' });
  }
});

const locationSchema = z.object({
  address: z.string().trim().min(5).max(240),
  latitude: z.number().min(5).max(21),
  longitude: z.number().min(96).max(106),
  province: z.string().min(1),
  source: z.enum(['manual-map', 'current-location']),
  confirmed: z.boolean(),
});

const estimateAnswerFieldsSchema = z.object({
  estimateModelVersion: z.enum(['energy-v3', 'legacy-v5']).optional(),
  solarOnlyIllustration: z.boolean().optional(),
  calculationReferenceDate: estimateCalendarDateSchema.optional(),
  consumptionInput: z.enum(['bill', 'kwh']).optional(),
  monthlyConsumptionKwh: finiteNonnegative(100000).optional(),
  billingPeriodDays: z.number().int().min(1).max(366).optional(),
  billDate: estimateCalendarDateSchema.optional(),
  tariffCategory: z.enum(['ordinary-1.1', 'ordinary-1.2', 'tou', 'unknown']).optional(),
  utility: z.enum(['MEA', 'PEA', 'unknown']).optional(),
  monthlyRecords: z.array(monthlyRecordSchema).max(12).refine(records => new Set(records.map(record => record.month)).size === records.length, 'Monthly records must have unique months.').optional(),
  weekendDaytimePattern: daytimePatternSchema.optional(),
  daylightAcUnits: z.number().int().min(0).max(100).optional(),
  daylightAcHours: finiteNonnegative(24).optional(),
  acPowerKw: finiteNonnegative(1000).optional(),
  existingEvMonthlyKwh: finiteNonnegative(100000).optional(),
  evHomeChargingFraction: fractionSchema.optional(),
  evDaytimeFraction: fractionSchema.optional(),
  pumpPowerKw: finiteNonnegative(1000).optional(),
  pumpHoursPerDay: finiteNonnegative(24).optional(),
  pumpStartHour: finiteNonnegative(23.99).optional(),
  plannedLoadChanges: z.array(plannedLoadSchema).max(6).optional(),
  panelTiltDegrees: finiteNonnegative(90).optional(),
  panelAzimuthDegrees: finiteNonnegative(360).optional(),
  quoteModuleCount: z.number().int().min(1).max(10000).optional(),
  quoteModuleWp: z.number().finite().positive().max(2000).optional(),
  quoteInverterAcKw: z.number().finite().positive().max(1000).optional(),
  budgetThb: finiteNonnegative(100000000).optional(),
  discountRatePct: finiteNonnegative(100).optional(),
  province: z.enum(['bangkok', 'nonthaburi', 'pathum-thani', 'samut-prakan', 'samut-sakhon', 'nakhon-pathom', 'other']),
  customLocation: z.string().trim().min(2).max(100).optional(),
  customProvince: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100),
  postcode: z.string().trim().regex(/^\d{5}$/u).optional(),
  // Zero is an absent-bill compatibility sentinel only for explicit meter-kWh
  // input. It is not a supplied bill or a modeled electricity charge.
  monthlyBillThb: z.number().finite().min(0).max(100_000_000).default(0),
  activelyPlanningSolar: z.boolean(),
  planningTimeframe: z.enum(['within-3-months', 'three-six-months', 'six-twelve-months', 'over-twelve-months', 'researching']),
  projectType: z.enum(['new-rooftop', 'solar-with-battery', 'expand-existing', 'unsure']),
  propertyType: z.enum(['detached-home', 'semi-detached-home', 'townhouse', 'large-home', 'other-residential']),
  customPropertyType: z.string().trim().min(2).max(100).optional(),
  ownershipStatus: z.enum(['owner', 'renter', 'other']),
  ownerPermission: z.enum(['yes', 'not-yet']).optional(),
  roofArea: z.enum(['under-30', '30-60', '60-100', '100-200', 'over-200', 'unsure']).optional(),
  daytimePattern: z.enum(['very-low', 'low', 'moderate', 'high', 'very-high']),
  daytimeLoads: z.array(z.enum(['air-conditioning', 'pump', 'ev', 'home-office-equipment', 'laundry-cooking', 'other-high-use', 'none'])).min(1),
  customDaytimeLoad: z.string().trim().min(2).max(120).optional(),
  airConditionerCount: z.number().int().min(1).max(100).optional(),
  roofMaterial: z.string().min(1),
  customRoofMaterial: z.string().trim().min(2).max(100).optional(),
  shade: z.enum(['almost-none', 'little', 'some', 'a-lot', 'unsure']),
  quoteContactRequested: z.boolean(),
  quoteConsentAccepted: z.boolean().optional(),
  installationTimeframe: z.enum(['asap', 'one-three-months', 'three-six-months', 'over-six-months', 'researching']).optional(),
  location: locationSchema.optional(),
  exactRoofAreaSqm: z.number().positive().max(100000).optional(),
  roofDirection: z.enum(['south-group', 'east', 'west', 'north', 'flat', 'several', 'unsure']).optional(),
  roofSlope: z.enum(['flat', 'gentle', 'steep', 'unsure']).optional(),
  electricityPhase: z.enum(['single', 'three', 'unsure']).optional(),
  futureLoads: z.array(z.enum(['ev', 'air-conditioning', 'pump', 'none', 'unsure'])).optional(),
  quoteSystemKw: z.number().positive().max(1000).optional(),
  quoteCashPriceThb: z.number().positive().max(100000000).optional(),
  quoteBatteryIncluded: z.boolean().optional(),
  quoteIncludesUtilityApplication: z.boolean().optional(),
});

export const estimateAnswersSchema = estimateAnswerFieldsSchema.superRefine((answers, context) => {
  if (answers.province === 'other' && !answers.customProvince && !answers.customLocation) {
    context.addIssue({ code: 'custom', path: ['customProvince'], message: 'Please specify the province or area.' });
  }
  if (answers.activelyPlanningSolar !== (answers.planningTimeframe !== 'researching')) {
    context.addIssue({ code: 'custom', path: ['planningTimeframe'], message: 'Planning intent and timeframe must agree.' });
  }
  if (answers.propertyType === 'other-residential' && !answers.customPropertyType) {
    context.addIssue({ code: 'custom', path: ['customPropertyType'], message: 'Please specify the residential property type.' });
  }
  if (answers.ownershipStatus !== 'owner' && !answers.ownerPermission) {
    context.addIssue({ code: 'custom', path: ['ownerPermission'], message: 'Please state whether the property owner has given permission.' });
  }
  if (answers.ownershipStatus === 'owner' && answers.ownerPermission !== undefined) {
    context.addIssue({ code: 'custom', path: ['ownerPermission'], message: 'Owner permission must be empty for property owners.' });
  }
  if (answers.daytimeLoads.includes('none') && answers.daytimeLoads.length > 1) {
    context.addIssue({ code: 'custom', path: ['daytimeLoads'], message: '“None of these” cannot be combined with another appliance.' });
  }
  if (answers.daytimeLoads.includes('air-conditioning') && !answers.airConditionerCount) {
    context.addIssue({ code: 'custom', path: ['airConditionerCount'], message: 'Please enter the number of installed air-conditioning units.' });
  }
  if (!answers.daytimeLoads.includes('air-conditioning') && answers.airConditionerCount !== undefined) {
    context.addIssue({ code: 'custom', path: ['airConditionerCount'], message: 'AC count must be empty unless air conditioning is selected.' });
  }
  if (answers.daytimeLoads.includes('other-high-use') && !answers.customDaytimeLoad) {
    context.addIssue({ code: 'custom', path: ['customDaytimeLoad'], message: 'Please specify the other equipment.' });
  }
  if (answers.roofMaterial === 'other' && !answers.customRoofMaterial) {
    context.addIssue({ code: 'custom', path: ['customRoofMaterial'], message: 'Please specify the roof material.' });
  }
  if (answers.quoteContactRequested && answers.quoteConsentAccepted !== true) {
    context.addIssue({ code: 'custom', path: ['quoteConsentAccepted'], message: 'Consent is required when contact is requested.' });
  }
  if (answers.quoteContactRequested && answers.ownershipStatus !== 'owner' && answers.ownerPermission !== 'yes') {
    context.addIssue({ code: 'custom', path: ['quoteContactRequested'], message: 'Property-owner permission is required before requesting installer contact.' });
  }
  if (!answers.quoteContactRequested && answers.quoteConsentAccepted !== undefined) {
    context.addIssue({ code: 'custom', path: ['quoteConsentAccepted'], message: 'Consent must be empty when contact is declined.' });
  }
  if (answers.consumptionInput === 'kwh' && !(answers.monthlyConsumptionKwh !== undefined && answers.monthlyConsumptionKwh > 0)) {
    context.addIssue({ code: 'custom', path: ['monthlyConsumptionKwh'], message: 'Meter consumption requires positive monthly kWh.' });
  }
  if (answers.consumptionInput !== 'kwh' && answers.monthlyBillThb <= 0) {
    context.addIssue({ code: 'custom', path: ['monthlyBillThb'], message: 'Bill input requires a positive supplied bill amount.' });
  }
  if ((answers.daylightAcUnits === undefined) !== (answers.daylightAcHours === undefined)) {
    context.addIssue({ code: 'custom', path: ['daylightAcHours'], message: 'Existing AC schedules require both units and hours.' });
  }
  if (answers.daylightAcUnits !== undefined && answers.airConditionerCount !== undefined && answers.daylightAcUnits > answers.airConditionerCount) {
    context.addIssue({ code: 'custom', path: ['daylightAcUnits'], message: 'Daylight AC units cannot exceed installed AC units.' });
  }
  if ((answers.pumpPowerKw === undefined) !== (answers.pumpHoursPerDay === undefined)) {
    context.addIssue({ code: 'custom', path: ['pumpHoursPerDay'], message: 'Existing pump schedules require both power and hours.' });
  }
  if (answers.estimateModelVersion === 'energy-v3' && answers.roofArea === undefined && answers.exactRoofAreaSqm === undefined) {
    context.addIssue({ code: 'custom', path: ['roofArea'], message: 'Select a roof-area band or explicitly choose unsure.' });
  }
});

/** Partial drafts use the same bounded fields, without completed-answer requirements. */
export const estimateDraftAnswersSchema = estimateAnswerFieldsSchema.omit({ quoteConsentAccepted: true }).partial();

/** Restore only recognized, individually valid values; never retain arbitrary draft keys. */
export function sanitizeEstimateDraftAnswers(raw: unknown): Partial<EstimateAnswers> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(estimateDraftAnswersSchema.shape)) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    const parsed = field.safeParse(value);
    if (parsed.success) safe[key] = parsed.data;
  }
  return safe as Partial<EstimateAnswers>;
}

export const estimateDraftSchema = z.object({
  version: z.union([z.literal(4), z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10), z.literal(11)]),
  answers: z.record(z.string(), z.unknown()).transform(sanitizeEstimateDraftAnswers),
  step: z.number().int().nonnegative(),
  questionnaireVersionId: z.string().optional(),
  releaseId: z.string().optional(),
  assessmentToken: z.string().optional(),
  assessmentTokenExpiresAt: z.string().datetime().optional(),
});
