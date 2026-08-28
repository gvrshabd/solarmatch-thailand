import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().trim().min(5).max(240),
  latitude: z.number().min(5).max(21),
  longitude: z.number().min(96).max(106),
  province: z.string().min(1),
  source: z.enum(['manual-map', 'current-location']),
  confirmed: z.literal(true),
});

export const estimateAnswersSchema = z.object({
  province: z.string().min(1),
  location: locationSchema,
  electricityInputKind: z.enum(['kwh', 'bill', 'help']),
  monthlyBillThb: z.number().min(300).max(50000).optional(),
  monthlyKwh: z.number().min(50).max(10000).optional(),
  additionalMonthlyValues: z.array(z.number().positive().max(50000)).max(11).optional(),
  consumptionPeriod: z.enum(['average-12', 'average-3', 'latest', 'typical', 'unknown']),
  tariffType: z.enum(['standard', 'tou', 'private', 'unknown']),
  touOnPeakKwh: z.number().nonnegative().max(10000).optional(),
  touOffPeakKwh: z.number().nonnegative().max(10000).optional(),
  daytimePattern: z.enum(['mostly-empty', 'light-use', 'work-or-ac', 'regular-loads', 'unknown']),
  daytimeLoads: z.array(z.enum(['air-conditioning', 'pump', 'ev', 'home-office', 'home-business', 'laundry-cooking', 'none', 'unknown'])).min(1),
  acDaytimeHours: z.enum(['under-2', '2-4', 'over-4', 'unknown']).optional(),
  evChargesInDaytime: z.enum(['yes', 'no', 'unknown']).optional(),
  roofMaterial: z.string().min(1),
  shade: z.enum(['none', 'short', 'several-hours', 'heavy', 'unknown']),
  roofDirection: z.enum(['south-group', 'east', 'west', 'north', 'flat', 'several', 'unknown']).optional(),
  roofSlope: z.enum(['flat', 'gentle', 'steep', 'unknown']).optional(),
  roofArea: z.enum(['small', 'medium', 'large', 'unknown']).optional(),
  electricityPhase: z.enum(['single', 'three', 'unknown']).optional(),
  futureLoads: z.array(z.enum(['ev', 'air-conditioning', 'pump', 'home-business', 'none', 'unknown'])).optional(),
  quoteSystemKw: z.number().positive().max(30).optional(),
  quoteCashPriceThb: z.number().positive().max(3000000).optional(),
  quoteBatteryIncluded: z.boolean().optional(),
  quoteIncludesUtilityApplication: z.boolean().optional(),
}).superRefine((answers, context) => {
  if (answers.electricityInputKind === 'kwh' && answers.monthlyKwh === undefined) context.addIssue({ code: 'custom', path: ['monthlyKwh'], message: 'Monthly kWh is required.' });
  if (answers.electricityInputKind !== 'kwh' && answers.monthlyBillThb === undefined) context.addIssue({ code: 'custom', path: ['monthlyBillThb'], message: 'Monthly bill is required.' });
});

export const estimateDraftSchema = z.object({
  version: z.literal(2),
  answers: z.record(z.string(), z.unknown()),
  step: z.number().int().nonnegative(),
});
