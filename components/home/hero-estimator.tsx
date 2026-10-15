'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {localizedPath,type Locale} from '@/config/i18n';
import {designText} from '@/config/design-v2-copy';
export function HeroEstimator({locale='th'}:{locale?:Locale}) {
  const text=designText(locale),[bill,setBill]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{queueMicrotask(()=>setReady(true));},[]);
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const amount=Number(bill.replace(/,/g,''));if(!amount||amount<1||amount>100000000){setError(locale==='en'?'Enter a typical monthly bill to continue.':'กรอกค่าไฟของเดือนปกติเพื่อดำเนินการต่อ');return;}try{sessionStorage.removeItem('solarmatch:estimate-draft');sessionStorage.removeItem('solarmatch:estimate');sessionStorage.setItem('solarmatch:starter',JSON.stringify({version:4,answers:{monthlyBillThb:amount},step:0}));}catch{/* Assessment remains usable without browser storage. */}window.location.assign(localizedPath('/estimate',locale));}
  return <form className="billcard" id="hero-estimator" onSubmit={submit}><label htmlFor="hero-monthly-bill">{text.billLabel}</label><div className="bill-row"><div className="money-input"><span aria-hidden="true">฿</span><input id="hero-monthly-bill" inputMode="numeric" autoComplete="off" disabled={!ready} value={bill} aria-describedby="hero-bill-unit" aria-invalid={!!error} onChange={event=>{const digits=event.target.value.replace(/\D/g,'').slice(0,9);setBill(digits?Number(digits).toLocaleString('en-US'):'');setError('');}}/><small id="hero-bill-unit">{text.perMonth}</small></div><button className="btn btn-primary" disabled={!ready} type="submit">{text.seeEstimate}<ArrowRight aria-hidden="true"/></button></div>{error&&<p className="form-error" role="alert">{error}</p>}</form>;
}
