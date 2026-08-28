import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().trim().min(5).max(240),
  latitude: z.number().min(5).max(21),
  longitude: z.number().min(96).max(106),
  province: z.string().min(1),
  source: z.enum(['manual-map', 'current-location']),
  confirmed: z.boolean(),
});

export const estimateAnswersSchema = z.object({
  province: z.string().min(1),
  monthlyBillThb: z.number().finite().positive(),
  propertyType: z.enum(['detached-home', 'townhouse', 'large-home', 'shophouse', 'warehouse', 'apartment-building', 'other']),
  roofArea: z.enum(['under-30', '30-60', '60-100', '100-200', 'over-200', 'unsure']),
  daytimePattern: z.enum(['very-low', 'low', 'moderate', 'high', 'very-high']),
  daytimeLoads: z.array(z.enum(['air-conditioning', 'pump', 'ev', 'office-equipment', 'business-equipment', 'laundry-cooking', 'other-high-use', 'none'])).min(1),
  roofMaterial: z.string().min(1),
  shade: z.enum(['almost-none', 'little', 'some', 'a-lot', 'unsure']),
  location: locationSchema.optional(),
  exactRoofAreaSqm: z.number().positive().max(100000).optional(),
  roofDirection: z.enum(['south-group', 'east', 'west', 'north', 'flat', 'several', 'unsure']).optional(),
  roofSlope: z.enum(['flat', 'gentle', 'steep', 'unsure']).optional(),
  electricityPhase: z.enum(['single', 'three', 'unsure']).optional(),
  futureLoads: z.array(z.enum(['ev', 'air-conditioning', 'pump', 'business-equipment', 'none', 'unsure'])).optional(),
  quoteSystemKw: z.number().positive().max(1000).optional(),
  quoteCashPriceThb: z.number().positive().max(100000000).optional(),
  quoteBatteryIncluded: z.boolean().optional(),
  quoteIncludesUtilityApplication: z.boolean().optional(),
});

export const estimateDraftSchema = z.object({
  version: z.literal(3),
  answers: z.record(z.string(), z.unknown()),
  step: z.number().int().nonnegative(),
});
