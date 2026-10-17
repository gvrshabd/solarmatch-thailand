'use client';
import type {Locale} from '@/config/i18n';
import {baht} from '@/lib/design-v2/figures';
export function SavingsChart({currentBill,estimatedBill,locale='th',modeled=false}:{currentBill:number;estimatedBill:number;locale?:Locale;modeled?:boolean}) {
 const beforeLabel=modeled?(locale==='en'?'Without solar':'ไม่ติดโซลาร์'):(locale==='en'?'Today':'ตอนนี้');
 const rows=[{label:beforeLabel,value:currentBill,after:false},{label:locale==='en'?'With solar':'เมื่อติดโซลาร์',value:estimatedBill,after:true}];
 return <div className="bars">{rows.map(row=><div className="row" key={row.label}><span className="muted">{row.label}</span><div className="track" aria-hidden="true"><div className={'fill'+(row.after?' after':'')} style={{width:Math.min(100,Math.max(0,row.value/Math.max(1,currentBill)*100))+'%'}}/></div><b className="num">{baht(row.value)}</b></div>)}</div>;
}
