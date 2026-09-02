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
  customProvince: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100),
  postcode: z.string().trim().regex(/^\d{5}$/u).optional(),
  monthlyBillThb: z.number().finite().positive().max(100_000_000),
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
}).superRefine((answers, context) => {
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
});

export const estimateDraftSchema = z.object({
  version: z.union([z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  answers: z.record(z.string(), z.unknown()),
  step: z.number().int().nonnegative(),
  questionnaireVersionId: z.string().optional(),
  releaseId: z.string().optional(),
  assessmentToken: z.string().optional(),
  assessmentTokenExpiresAt: z.string().datetime().optional(),
});
