import {z} from 'zod';
import {provinceOptions} from '@/config/provinces';
import {districtsByProvince} from '@/config/districts';
import {estimateAnswersSchema} from '@/lib/validation/estimate';
import type {EstimateAnswers} from '@/lib/calculator/types';
import {localizedPath,type Locale} from '@/config/i18n';

const payloadSchema=z.strictObject({version:z.literal(1),inputs:z.strictObject({
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
})});
const keys=Object.keys(payloadSchema.shape.inputs.shape) as (keyof z.infer<typeof payloadSchema>['inputs'])[];
export const sharedEstimatePrefix='#sm-estimate=';
export function permittedEstimateInputs(answers:EstimateAnswers){
  const inputs:Record<string,unknown>={};
  for(const key of keys)if(answers[key]!==undefined)inputs[key]=answers[key];
  // Only a real configured coarse district identifier may leave the browser.
  const district=(districtsByProvince[answers.province]??[]).some(item=>item.value===answers.district)?answers.district:undefined;
  if(district)inputs.district=district;else delete inputs.district;
  return payloadSchema.parse({version:1,inputs});
}
export function sharedEstimateUrl(answers:EstimateAnswers,origin:string,locale:Locale){
  const url=new URL(localizedPath('/estimate/results',locale),origin);
  const encoded=encodeURIComponent(JSON.stringify(permittedEstimateInputs(answers)));
  if(encoded.length>5000)throw Error('shared_estimate_too_large');
  url.hash=sharedEstimatePrefix.slice(1)+encoded;return url.href;
}
export function restoreSharedEstimate(fragment:string):EstimateAnswers{
  if(!fragment.startsWith(sharedEstimatePrefix)||fragment.length>5020)throw Error('invalid_shared_estimate');
  const {inputs}=payloadSchema.parse(JSON.parse(decodeURIComponent(fragment.slice(sharedEstimatePrefix.length))));
  if(inputs.district&&!(districtsByProvince[inputs.province]??[]).some(item=>item.value===inputs.district))throw Error('invalid_shared_district');
  if(!provinceOptions.some(item=>item.value===inputs.province))throw Error('invalid_shared_province');
  // Fixed descriptions satisfy the ordinary schema, never revive omitted free text.
  return estimateAnswersSchema.parse({...inputs,district:inputs.district??'not-shared',customProvince:inputs.province==='other'?'Other province':undefined,
    customPropertyType:inputs.propertyType==='other-residential'?'Other residential property':undefined,
    customDaytimeLoad:inputs.daytimeLoads.includes('other-high-use')?'Other household equipment':undefined,
    customRoofMaterial:inputs.roofMaterial==='other'?'Other roof material':undefined,
    quoteContactRequested:false,quoteConsentAccepted:undefined});
}
