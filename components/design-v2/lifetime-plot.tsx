import type {LifetimeCostPoint} from '@/lib/calculator/types';
import type {Locale} from '@/config/i18n';
import {baht,compactBaht,lifetimeCrossing} from '@/lib/design-v2/figures';
import {designText} from '@/config/design-v2-copy';
export function LifetimePlot({data,net,locale,compact=false}:{data:LifetimeCostPoint[];net:number;locale:Locale;compact?:boolean}) {
  const text=designText(locale),cross=lifetimeCrossing(data),last=data.at(-1);
  if(!last)return null;
  const max=Math.max(...data.flatMap(p=>[p.withSolarThb,p.withoutSolarThb])),step=max>1500000?500000:max>600000?250000:100000,top=Math.max(step,Math.ceil(max/step)*step);
  const chart=(narrow:boolean)=>{
    const W=narrow?360:640,H=narrow?230:300,L=narrow?46:54,R=narrow?10:16,T=16,B=30;
    const x=(year:number)=>L+year/25*(W-L-R),y=(value:number)=>T+(1-value/top)*(H-T-B);
    const gx=x(25)-4,gy=Math.min(y(last.withoutSolarThb),y(last.withSolarThb));
    return <svg className={'chart '+(compact?'chart-compact':narrow?'chart-narrow':'chart-wide')} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${text.cTitle}. ${net>=0?text.cGap.replace('{a}',baht(net)):text.cGapNeg.replace('{a}',baht(-net))}`}>
      {Array.from({length:Math.floor(top/step)+1},(_,i)=>i*step).map(g=><g key={g}><line x1={L} x2={W-R} y1={y(g)} y2={y(g)} stroke="var(--sm-line)"/><text x={L-8} y={y(g)+4} textAnchor="end" fontSize="11" fill="var(--sm-muted)">{g===0?'0':compactBaht(g)}</text></g>)}
      {[0,5,10,15,20,25].map(v=><text key={v} x={x(v)} y={H-12} textAnchor={v===25?'end':v===0?'start':'middle'} fontSize="11" fill="var(--sm-muted)">{v}{v===25?(locale==='en'?' yrs':' ปี'):''}</text>)}
      <polyline points={data.map(p=>`${x(p.year)},${y(p.withoutSolarThb)}`).join(' ')} fill="none" stroke="#9AA79E" strokeWidth="2.5" strokeDasharray="6 5"/>
      <polyline points={data.map(p=>`${x(p.year)},${y(p.withSolarThb)}`).join(' ')} fill="none" stroke="var(--sm-pine)" strokeWidth="3"/>
      {cross&&<g data-testid="lifetime-crossing"><circle cx={x(cross.year)} cy={y(cross.value)} r="6" fill="var(--sm-lime)" stroke="var(--sm-pine)" strokeWidth="2.5"/><line x1={x(cross.year)} x2={x(cross.year)} y1={y(cross.value)+9} y2={H-B} stroke="var(--sm-pine)" strokeDasharray="3 3"/><text x={x(cross.year)+(cross.year>15?-8:8)} y={Math.min(H-B-5,y(cross.value)+22)} textAnchor={cross.year>15?'end':'start'} fontSize={narrow?11:12} fontWeight="700" fill="var(--sm-pine)">{text.cCross.replace('{y}',String(Math.round(cross.year)))}</text></g>}
      <line x1={gx} x2={gx} y1={y(last.withoutSolarThb)} y2={y(last.withSolarThb)} stroke={net>=0?'var(--sm-green)':'var(--sm-danger)'} strokeWidth="3"/>
      <text x={gx-6} y={Math.max(12,gy-8)} textAnchor="end" fontSize={narrow?11:12} fontWeight="800" fill={net>=0?'var(--sm-green)':'var(--sm-danger)'}>{(net>=0?text.cGap:text.cGapNeg).replace('{a}',compactBaht(Math.abs(net)))}</text>
    </svg>;
  };
  return <>{compact?chart(true):<>{chart(false)}{chart(true)}</>}</>;
}
