import type {LifetimeCostPoint} from '@/lib/calculator/types';
export function lifetimeCrossing(series:LifetimeCostPoint[]) {
  for(let i=1;i<series.length;i++) {
    const before=series[i-1],after=series[i],d0=before.withSolarThb-before.withoutSolarThb,d1=after.withSolarThb-after.withoutSolarThb;
    if(d0>0&&d1<=0){const fraction=d0/(d0-d1);return {year:before.year+fraction*(after.year-before.year),value:before.withoutSolarThb+fraction*(after.withoutSolarThb-before.withoutSolarThb)};}
  }
  return null;
}
export const baht=(value:number)=>'฿'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(value);
export const compactBaht=(value:number)=>Math.abs(value)>=1000000?'฿'+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value/1000000)+'M':'฿'+Math.round(value/1000)+'k';
export const payback=(value:number|null)=>value===null||!Number.isFinite(value)?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);
