'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {localizedPath,type Locale} from '@/config/i18n';
import {designText} from '@/config/design-v2-copy';
import {homeownerText} from '@/config/homeowner-v3-copy';
export function HeroEstimator({locale='th'}:{locale?:Locale}) {
  const text=designText(locale),v3=homeownerText(locale),[bill,setBill]=useState('4,000'),[error,setError]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{queueMicrotask(()=>setReady(true));},[]);
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const amount=Number(bill.replace(/,/g,''));if(!amount||amount<1||amount>100000000){setError(locale==='en'?'Enter a typical monthly bill to continue.':'กรอกค่าไฟของเดือนปกติเพื่อดำเนินการต่อ');return;}try{sessionStorage.removeItem('solarmatch:estimate-draft');sessionStorage.removeItem('solarmatch:estimate');sessionStorage.setItem('solarmatch:starter',JSON.stringify({version:4,answers:{monthlyBillThb:amount},step:0}));}catch{/* Assessment remains usable without browser storage. */}window.location.assign(localizedPath('/estimate',locale));}
  return <form className="billcard" id="hero-estimator" onSubmit={submit}><label htmlFor="hero-monthly-bill">{v3.billLabel}</label><div className="money-input"><span aria-hidden="true">฿</span><input id="hero-monthly-bill" inputMode="numeric" autoComplete="off" disabled={!ready} value={bill} aria-describedby={error?'hero-bill-unit hero-bill-error':'hero-bill-unit'} aria-invalid={!!error} onChange={event=>{const digits=event.target.value.replace(/\D/g,'').slice(0,9);setBill(digits?Number(digits).toLocaleString('en-US'):'');setError('');}}/><small id="hero-bill-unit">{text.perMonth}</small></div><input className="range" type="range" min={500} max={25000} step={100} aria-label={v3.billLabel} disabled={!ready} value={Math.min(25000,Math.max(500,Number(bill.replace(/,/g,''))||500))} onChange={event=>{setBill(Number(event.target.value).toLocaleString('en-US'));setError('');}}/><button className="btn btn-primary" disabled={!ready} type="submit">{text.seeEstimate}<ArrowRight aria-hidden="true"/></button>{error&&<p id="hero-bill-error" className="form-error" role="alert">{error}</p>}</form>;
}
