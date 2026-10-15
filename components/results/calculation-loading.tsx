'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Check} from 'lucide-react';
import {BrandMark} from '@/components/site/brand-mark';
import type {Locale} from '@/config/i18n';
import type {PublicLoadingFact} from '@/lib/loading-facts/types';
import {track} from '@/lib/analytics/track';

export function CalculationLoading({locale,initialStartedAt,onStarted,onComplete,prepared=true,calculated=true,savingRequest=false}:{
  facts:PublicLoadingFact[];locale:Locale;initialFact?:PublicLoadingFact|null;initialDurationMs?:number;initialStartedAt?:number;
  onStarted:(fact:PublicLoadingFact|null,durationMs:number,startedAt:number)=>void;onComplete:(fact:PublicLoadingFact|null)=>void;
  prepared?:boolean;calculated?:boolean;savingRequest?:boolean;
}) {
  const [startedAt]=useState(()=>initialStartedAt??Date.now()),started=useRef(false),english=locale==='en';
  useLayoutEffect(()=>{document.body.classList.add('calculation-loading-active');return()=>document.body.classList.remove('calculation-loading-active');},[]);
  useEffect(()=>{
    if(started.current)return;started.current=true;
    // No fabricated stages or required presentation delay: parent awaits its real
    // calculation/submission separately. Slow work remains visible, never faked.
    track('calculation_loading_started',{language:locale,durationMs:0});
    onStarted(null,0,startedAt);
    onComplete(null);
  },[locale,onComplete,onStarted,startedAt]);
  const rows=english?['Assessment answers checked','Residential tariff and system assumptions','Savings and payback result']:['ตรวจสอบคำตอบแบบประเมินแล้ว','อัตราค่าไฟบ้านและสมมติฐานระบบ','ผลประหยัดและระยะเวลาคืนทุน'];
  const done=[true,calculated,prepared];
  return <main className="calculation-loading-page v2-loading"><section className="loading box" role="status" aria-live="polite" aria-busy={!prepared} aria-labelledby="preparing-title"><span className="v2-loading-brand" aria-hidden="true"><BrandMark/></span><h1 id="preparing-title" tabIndex={-1}>{english?'Preparing your estimate':'กำลังเตรียมผลประเมิน'}</h1><ul className="ltasks">{rows.map((row,index)=><li key={row} className={done[index]?'done':index===1||calculated?'doing':''}><i aria-hidden="true"><Check/></i>{row}</li>)}</ul>{savingRequest&&<p className="note">{english?'Saving your contact request… Your estimate is already calculated.':'กำลังบันทึกคำขอติดต่อ… ผลประเมินของคุณคำนวณไว้แล้ว'}</p>}</section></main>;
}
