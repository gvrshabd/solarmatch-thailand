import {z} from 'zod';
import {provinceOptions} from '@/config/provinces';
import {districtsByProvince} from '@/config/districts';
import {estimateAnswersSchema} from '@/lib/validation/estimate';
import type {EstimateAnswers} from '@/lib/calculator/types';
import {localizedPath,type Locale} from '@/config/i18n';

// These literals belong to this payload version, never a moving default import.
export const sharedEstimateModelVersion='residential-hourly-2026-10-17-v3' as const;
/** Historic v1 engine date; modern links must carry their own explicit date. */
export const sharedEstimateReferenceDate='2026-10-17' as const;
export const sharedEstimateMaximumEncodedLength=12000;

const legacyInputsSchema=z.strictObject({
  province:z.enum(['bangkok','nonthaburi','pathum-thani','samut-prakan','samut-sakhon','nakhon-pathom','other']),
  district:z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),monthlyBillThb:z.number().finite().positive().max(100000000),
  activelyPlanningSolar:z.boolean(),planningTimeframe:z.enum(['within-3-months','three-six-months','six-twelve-months','over-twelve-months','researching']),
  projectType:z.enum(['new-rooftop','solar-with-battery','expand-existing','unsure']),
  propertyType:z.enum(['detached-home','semi-detached-home','townhouse','large-home','other-residential']),
  ownershipStatus:z.enum(['owner','renter','other']),ownerPermission:z.enum(['yes','not-yet']).optional(),
  daytimePattern:z.enum(['very-low','low','moderate','high','very-high']),
  daytimeLoads:z.array(z.enum(['air-conditioning','pump','ev','home-office-equipment','laundry-cooking','other-high-use','none'])).min(1).max(7),
  airConditionerCount:z.number().int().min(1).max(100).optional(),
  roofMaterial:z.enum(['concrete-tile','clay-tile','fibre-cement','metal-sheet','flat-concrete','other','unsure']),
  shade:z.enum(['almost-none','little','some','a-lot','unsure']),
  roofArea:z.enum(['under-30','30-60','60-100','100-200','over-200','unsure']).optional(),
  exactRoofAreaSqm:z.number().finite().positive().max(100000).optional(),
  roofDirection:z.enum(['south-group','east','west','north','flat','several','unsure']).optional(),
  roofSlope:z.enum(['flat','gentle','steep','unsure']).optional(),electricityPhase:z.enum(['single','three','unsure']).optional(),
  futureLoads:z.array(z.enum(['ev','air-conditioning','pump','none','unsure'])).max(5).optional(),
});
const v1PayloadSchema=z.strictObject({version:z.literal(1),inputs:legacyInputsSchema});
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
},'Invalid calendar date');
const referenceDateSchema=dateSchema.refine(value=>value>='2026-05-01'&&value<='2026-12-31','Reference date outside verified model tariff period');
const monthlyRecordSchema=z.strictObject({
  month:z.number().int().min(1).max(12),kwh:z.number().finite().nonnegative().max(100000),
  periodDays:z.number().int().min(1).max(366),billDate:dateSchema.optional(),
});
const plannedLoadSchema=z.strictObject({
  kind:z.enum(['ev','air-conditioning','pump']),startDate:dateSchema,
  monthlyKwh:z.number().finite().nonnegative().max(100000).optional(),
  homeChargingFraction:z.number().finite().min(0).max(1).optional(),
  daytimeFraction:z.number().finite().min(0).max(1).optional(),
  powerKw:z.number().finite().nonnegative().max(1000).optional(),
  units:z.number().int().min(1).max(100).optional(),
  hoursPerDay:z.number().finite().min(0).max(24).optional(),
  startHour:z.number().finite().min(0).lt(24).optional(),
});
const modernInputsSchema=legacyInputsSchema.extend({
  // Ordinary schema permits zero only as the explicit kWh-only compatibility sentinel.
  monthlyBillThb:z.number().finite().nonnegative().max(100000000),
  solarOnlyIllustration:z.boolean().optional(),consumptionInput:z.enum(['bill','kwh']).optional(),
  monthlyConsumptionKwh:z.number().finite().nonnegative().max(100000).optional(),
  billingPeriodDays:z.number().int().min(1).max(366).optional(),billDate:dateSchema.optional(),
  tariffCategory:z.enum(['ordinary-1.1','ordinary-1.2','tou','unknown']).optional(),
  utility:z.enum(['MEA','PEA','unknown']).optional(),
  monthlyRecords:z.array(monthlyRecordSchema).max(12).refine(records=>new Set(records.map(record=>record.month)).size===records.length,'Duplicate months').optional(),
  weekendDaytimePattern:legacyInputsSchema.shape.daytimePattern.optional(),
  daylightAcUnits:z.number().int().min(0).max(100).optional(),
  daylightAcHours:z.number().finite().min(0).max(24).optional(),
  acPowerKw:z.number().finite().nonnegative().max(1000).optional(),
  existingEvMonthlyKwh:z.number().finite().nonnegative().max(100000).optional(),
  evHomeChargingFraction:z.number().finite().min(0).max(1).optional(),
  evDaytimeFraction:z.number().finite().min(0).max(1).optional(),
  pumpPowerKw:z.number().finite().nonnegative().max(1000).optional(),
  pumpHoursPerDay:z.number().finite().min(0).max(24).optional(),
  pumpStartHour:z.number().finite().min(0).max(23.99).optional(),
  plannedLoadChanges:z.array(plannedLoadSchema).max(6).optional(),
  panelTiltDegrees:z.number().finite().min(0).max(90).optional(),
  panelAzimuthDegrees:z.number().finite().min(0).max(360).optional(),
  quoteModuleCount:z.number().int().min(1).max(10000).optional(),
  quoteModuleWp:z.number().finite().positive().max(2000).optional(),
  quoteInverterAcKw:z.number().finite().positive().max(1000).optional(),
  budgetThb:z.number().finite().nonnegative().max(100000000).optional(),
  discountRatePct:z.number().finite().min(0).max(100).optional(),
  quoteSystemKw:z.number().finite().positive().max(1000).optional(),
  quoteCashPriceThb:z.number().finite().positive().max(100000000).optional(),
  quoteBatteryIncluded:z.boolean().optional(),quoteIncludesUtilityApplication:z.boolean().optional(),
});
const v2PayloadSchema=z.strictObject({
  version:z.literal(2),modelVersion:z.literal(sharedEstimateModelVersion),
  assumptionsVersion:z.literal(sharedEstimateModelVersion),
  calculationReferenceDate:referenceDateSchema,inputs:modernInputsSchema,
});
const payloadSchema=z.discriminatedUnion('version',[v1PayloadSchema,v2PayloadSchema]);

function allowlisted(source:object,keys:readonly string[]):Record<string,unknown>{
  const record=source as Record<string,unknown>,result:Record<string,unknown>={};
  for(const key of keys)if(Object.prototype.hasOwnProperty.call(record,key)&&record[key]!==undefined)result[key]=record[key];
  return result;
}
export const sharedEstimatePrefix='#sm-estimate=';
export function permittedEstimateInputs(answers:EstimateAnswers){
  if(answers.estimateModelVersion!==undefined&&answers.estimateModelVersion!=='energy-v3'&&answers.estimateModelVersion!=='legacy-v5')throw Error('unsupported_shared_model');
  const legacy=answers.estimateModelVersion==='legacy-v5';
  if(!legacy&&answers.calculationReferenceDate===undefined)throw Error('missing_shared_reference_date');
  if(!legacy&&!referenceDateSchema.safeParse(answers.calculationReferenceDate).success)throw Error('unsupported_shared_reference_date');
  const inputs=allowlisted(answers,Object.keys(legacy?legacyInputsSchema.shape:modernInputsSchema.shape));
  // Nested records need their own allowlist: never serialize an attached private field.
  if(!legacy){
    if(answers.monthlyRecords!==undefined)inputs.monthlyRecords=answers.monthlyRecords.map(record=>allowlisted(record,Object.keys(monthlyRecordSchema.shape)));
    if(answers.plannedLoadChanges!==undefined)inputs.plannedLoadChanges=answers.plannedLoadChanges.map(record=>allowlisted(record,Object.keys(plannedLoadSchema.shape)));
  }
  // Only a real configured coarse district identifier may leave the browser.
  const district=(districtsByProvince[answers.province]??[]).some(item=>item.value===answers.district)?answers.district:undefined;
  if(district)inputs.district=district;else delete inputs.district;
  return legacy?v1PayloadSchema.parse({version:1,inputs}):v2PayloadSchema.parse({
    version:2,modelVersion:sharedEstimateModelVersion,assumptionsVersion:sharedEstimateModelVersion,
    calculationReferenceDate:answers.calculationReferenceDate,inputs,
  });
}
export function sharedEstimateUrl(answers:EstimateAnswers,origin:string,locale:Locale){
  const url=new URL(localizedPath('/estimate/results',locale),origin);
  const payload=permittedEstimateInputs(answers),encoded=encodeURIComponent(JSON.stringify(payload));
  if(encoded.length>(payload.version===1?5000:sharedEstimateMaximumEncodedLength))throw Error('shared_estimate_too_large');
  url.hash=sharedEstimatePrefix.slice(1)+encoded;return url.href;
}
export function restoreSharedEstimate(fragment:string):EstimateAnswers{
  if(!fragment.startsWith(sharedEstimatePrefix)||fragment.length>sharedEstimatePrefix.length+sharedEstimateMaximumEncodedLength)throw Error('invalid_shared_estimate');
  const encoded=fragment.slice(sharedEstimatePrefix.length),payload=payloadSchema.parse(JSON.parse(decodeURIComponent(encoded)));
  if(payload.version===1&&encoded.length>5000)throw Error('invalid_shared_estimate');
  const {inputs}=payload;
  if(inputs.district&&!(districtsByProvince[inputs.province]??[]).some(item=>item.value===inputs.district))throw Error('invalid_shared_district');
  if(!provinceOptions.some(item=>item.value===inputs.province))throw Error('invalid_shared_province');
  // Fixed descriptions satisfy the ordinary schema, never revive omitted free text.
  return estimateAnswersSchema.parse({...inputs,district:inputs.district??'not-shared',customProvince:inputs.province==='other'?'Other province':undefined,
    customPropertyType:inputs.propertyType==='other-residential'?'Other residential property':undefined,
    customDaytimeLoad:inputs.daytimeLoads.includes('other-high-use')?'Other household equipment':undefined,
    customRoofMaterial:inputs.roofMaterial==='other'?'Other roof material':undefined,
    quoteContactRequested:false,quoteConsentAccepted:undefined,
    estimateModelVersion:payload.version===1?'legacy-v5':'energy-v3',
    calculationReferenceDate:payload.version===1?sharedEstimateReferenceDate:payload.calculationReferenceDate});
}
