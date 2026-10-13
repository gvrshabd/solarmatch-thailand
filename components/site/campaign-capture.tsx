'use client';
import { useEffect } from 'react';
import { campaignStorageKey, rememberCampaign } from '@/lib/analytics/browser-attribution';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';

export function CampaignCapture(){
  useEffect(()=>{
    // Never inspect auth, staff-link, admin or installer routes/parameters.
    if(/^\/(?:en\/)?(admin|installers|enquiry|api)(\/|$)/u.test(window.location.pathname))return;
    const search=new URLSearchParams(window.location.search);
    let stored=false;
    try{stored=!!window.sessionStorage.getItem(campaignStorageKey);}catch{/* Browser storage may be denied. */}
    // Ordinary visits have no attribution to capture or revalidate. Avoid a
    // second assessment/config request alongside the calculator's own fetch.
    if(!stored&&!['utm_campaign','utm_source','utm_medium'].some(key=>search.has(key)))return;
    const controller=new AbortController();
    fetch('/api/assessment/config',{cache:'no-store',signal:controller.signal})
      .then(async response=>response.ok?await response.json() as PublicAssessmentConfig:null)
      .then((config:PublicAssessmentConfig|null)=>{
        if(!controller.signal.aborted){try{rememberCampaign(window.sessionStorage,search,config?.attribution??{enabled:false,catalog:[]});}catch{/* Browser storage can be denied. */}}
      }).catch(()=>{/* No independent collection or tracking endpoint. */});
    return()=>controller.abort();
  },[]);
  return null;
}
