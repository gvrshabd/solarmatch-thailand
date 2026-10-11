import { z } from 'zod';

/** Reviewed draft catalogue, not a general-purpose slug/URL/PII acceptance rule. */
export const ATTRIBUTION_CATALOG = [
  {campaign:'direct',source:'direct',medium:'none'},
  {campaign:'unknown',source:'unknown',medium:'unknown'},
  {campaign:'pilot-search',source:'google',medium:'cpc'},
  {campaign:'pilot-social',source:'facebook',medium:'paid-social'},
  {campaign:'pilot-line',source:'line',medium:'messaging'},
] as const;
export type AttributionCodes = typeof ATTRIBUTION_CATALOG[number];
export type AttributionGate = {CAMPAIGN_ATTRIBUTION_ENABLED?:string;CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED?:string};
export type PublicAttributionConfig = {enabled:boolean;catalog:readonly AttributionCodes[]};
export function attributionEnabled(env:AttributionGate) {
  return env.CAMPAIGN_ATTRIBUTION_ENABLED==='true' && env.CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED==='true';
}
export function publicAttributionConfig(env:AttributionGate):PublicAttributionConfig {
  const enabled=attributionEnabled(env);
  return {enabled,catalog:enabled?ATTRIBUTION_CATALOG:[]};
}
export function approvedAttribution(value:unknown):AttributionCodes|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const input=value as Record<string,unknown>;
  if(Object.keys(input).length!==3)return null;
  return ATTRIBUTION_CATALOG.find(row=>row.campaign===input.campaign&&row.source===input.source&&row.medium===input.medium)??null;
}
export const attributionSchema=z.object({
  campaign:z.enum(['direct','unknown','pilot-search','pilot-social','pilot-line']),
  source:z.enum(['direct','unknown','google','facebook','line']),
  medium:z.enum(['none','unknown','cpc','paid-social','messaging']),
}).strict().refine(value=>approvedAttribution(value)!==null,{message:'unknown_campaign_combination'});

/** No referrer, URL, other query values, anonymous identifier or persistent storage. */
export function captureAttributionFromSearch(search:URLSearchParams,config:PublicAttributionConfig):AttributionCodes|undefined {
  if(!config.enabled)return undefined;
  const keys=['utm_campaign','utm_source','utm_medium'] as const;
  const values=keys.map(key=>search.getAll(key));
  if(values.every(items=>items.length===0))return ATTRIBUTION_CATALOG[0];
  if(values.some(items=>items.length!==1))return ATTRIBUTION_CATALOG[1];
  const approved=approvedAttribution({campaign:values[0][0],source:values[1][0],medium:values[2][0]});
  return approved&&config.catalog.some(row=>row.campaign===approved.campaign&&row.source===approved.source&&row.medium===approved.medium)
    ?approved:ATTRIBUTION_CATALOG[1];
}
