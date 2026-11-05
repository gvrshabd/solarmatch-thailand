'use client';

import {useEffect,useRef,useState} from 'react';
import {designExampleResult} from '@/config/design-example-result';
import {designText} from '@/config/design-v2-copy';
import {homeownerText} from '@/config/homeowner-v3-copy';
import type {Locale} from '@/config/i18n';
import {baht,payback} from '@/lib/design-v2/figures';
import {COUNT_MS,countUpValue} from '@/lib/home/motion';
import {HomeLifetimeChart} from './home-lifetime-chart';
import {useReveal} from './use-reveal';

/** Final V3 composition backed by the current energy model. The server HTML holds the final figures; client code only animates over them. */
export function ExampleResult({locale}:{locale:Locale}) {
  const text=designText(locale),v3=homeownerText(locale),r=designExampleResult;
  const [now,setNow]=useState(r.planningAfterSolarMonthlyBillThb),[price,setPrice]=useState(r.planningInstalledCostThb);
  const run=useRef(0),frame=useRef(0);
  const ref=useReveal<HTMLDivElement>(()=>{
    const token=++run.current;let start:number|null=null;
    const step=(time:number)=>{
      if(token!==run.current)return;
      start??=time;const k=Math.min(1,(time-start)/COUNT_MS);
      setNow(countUpValue(r.currentMonthlyBillThb,r.planningAfterSolarMonthlyBillThb,k));setPrice(countUpValue(0,r.planningInstalledCostThb,k));
      if(k<1)frame.current=requestAnimationFrame(step);
    };
    frame.current=requestAnimationFrame(step);
  },()=>{run.current++;cancelAnimationFrame(frame.current);setNow(r.currentMonthlyBillThb);setPrice(0);});
  useEffect(()=>()=>{run.current++;cancelAnimationFrame(frame.current);},[]);
  return <div className="excard" data-testid="home-example" ref={ref}>
    <div className="exnums">
      <p className="lbl">{v3.exampleBill}</p>
      <p className="ba"><span className="sr-only">{v3.today}</span><s className="was num">{baht(r.currentMonthlyBillThb)}</s> <span className="sr-only">{v3.withSolar}</span><span className="now num">{baht(now)}</span></p>
      <p className="save">{locale==='en'?`${baht(r.planningMonthlySavingsThb)} less each month`:`ลดลง ${baht(r.planningMonthlySavingsThb)} ต่อเดือน`}</p>
      <div className="rstats"><div><b className="num">{r.planningSystemKw.toFixed(1)} kWp</b><span>{text.rSystem}</span></div><div><b className="num">{baht(price)}</b><span>{text.rPrice}</span></div><div><b className="num">{payback(r.planningPaybackYears)} {text.yrs}</b><span>{text.rPayback}</span></div></div>
    </div>
    <div className="exc"><HomeLifetimeChart data={r.lifetimeCostSeries} net={r.planningTwentyFiveYearNetBenefitThb} locale={locale}/></div>
  </div>;
}
