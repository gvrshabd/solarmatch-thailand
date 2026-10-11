import { approvedAttribution, captureAttributionFromSearch, type AttributionCodes, type PublicAttributionConfig } from './attribution';

// Safe catalogue codes only; no visitor identifier, referrer, URL or raw query.
export const campaignStorageKey = 'solarmatch-campaign-codes-v1';
export function rememberCampaign(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,search:URLSearchParams,config:PublicAttributionConfig):void {
  try {
    if(!config.enabled){storage.removeItem(campaignStorageKey);return;}
    const hasCampaign=['utm_campaign','utm_source','utm_medium'].some(key=>search.has(key));
    if(!hasCampaign&&readCampaign(storage,config))return;
    const codes=captureAttributionFromSearch(search,config);
    if(codes)storage.setItem(campaignStorageKey,JSON.stringify(codes));
  }catch{/* Storage denial must never block the calculator. */}
}
export function readCampaign(storage:Pick<Storage,'getItem'>,config?:PublicAttributionConfig):AttributionCodes|undefined {
  if(!config?.enabled)return undefined;
  try {
    const codes=approvedAttribution(JSON.parse(storage.getItem(campaignStorageKey)??'null'));
    return codes&&config.catalog.some(item=>item.campaign===codes.campaign&&item.source===codes.source&&item.medium===codes.medium)?codes:undefined;
  }catch{return undefined;}
}
export function currentBrowserCampaign(config?:PublicAttributionConfig):AttributionCodes|undefined {
  try{return readCampaign(window.sessionStorage,config);}catch{return undefined;}
}
