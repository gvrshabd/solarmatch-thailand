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
  province: z.enum(['bangkok', 'nonthaburi', 'pathum-thani', 'samut-prakan', 'samut-sakhon', 'nakhon-pathom', 'other']),
  customLocation: z.string().trim().min(2).max(100).optional(),
  monthlyBillThb: z.number().finite().positive().max(100_000_000),
  propertyType: z.enum(['detached-home', 'semi-detached-home', 'townhouse', 'large-home', 'other-residential']),
  customPropertyType: z.string().trim().min(2).max(100).optional(),
  ownershipStatus: z.enum(['owner', 'renter', 'other']),
  roofArea: z.enum(['under-30', '30-60', '60-100', '100-200', 'over-200', 'unsure']),
  daytimePattern: z.enum(['very-low', 'low', 'moderate', 'high', 'very-high']),
  daytimeLoads: z.array(z.enum(['air-conditioning', 'pump', 'ev', 'home-office-equipment', 'laundry-cooking', 'other-high-use', 'none'])).min(1),
  customDaytimeLoad: z.string().trim().min(2).max(120).optional(),
  airConditionerCount: z.number().int().min(1).max(100).optional(),
  roofMaterial: z.string().min(1),
  customRoofMaterial: z.string().trim().min(2).max(100).optional(),
  shade: z.enum(['almost-none', 'little', 'some', 'a-lot', 'unsure']),
  installationTimeframe: z.enum(['asap', 'one-three-months', 'three-six-months', 'over-six-months', 'researching']),
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
}).superRefine((answers, context) => {
  if (answers.province === 'other' && !answers.customLocation) {
    context.addIssue({ code: 'custom', path: ['customLocation'], message: 'Please specify the province, district or area.' });
  }
  if (answers.propertyType === 'other-residential' && !answers.customPropertyType) {
    context.addIssue({ code: 'custom', path: ['customPropertyType'], message: 'Please specify the residential property type.' });
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
});

export const estimateDraftSchema = z.object({
  version: z.literal(4),
  answers: z.record(z.string(), z.unknown()),
  step: z.number().int().nonnegative(),
  questionnaireVersionId: z.string().optional(),
  releaseId: z.string().optional(),
  assessmentToken: z.string().optional(),
  assessmentTokenExpiresAt: z.string().datetime().optional(),
});
