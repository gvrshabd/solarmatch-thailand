'use client';
import { useEffect } from 'react';
import { rememberCampaign } from '@/lib/analytics/browser-attribution';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';

export function CampaignCapture(){
  useEffect(()=>{
    // Never inspect auth, staff-link, admin or installer routes/parameters.
    if(/^\/(?:en\/)?(admin|installers|enquiry|api)(\/|$)/u.test(window.location.pathname))return;
    const controller=new AbortController();
    fetch('/api/assessment/config',{cache:'no-store',signal:controller.signal})
      .then(async response=>response.ok?await response.json() as PublicAssessmentConfig:null)
      .then((config:PublicAssessmentConfig|null)=>{
        if(!controller.signal.aborted){try{rememberCampaign(window.sessionStorage,new URLSearchParams(window.location.search),config?.attribution??{enabled:false,catalog:[]});}catch{/* Browser storage can be denied. */}}
      }).catch(()=>{/* No independent collection or tracking endpoint. */});
    return()=>controller.abort();
  },[]);
  return null;
}
