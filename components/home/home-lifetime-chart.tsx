'use client';

import {useEffect,useId,useRef} from 'react';
import type {LifetimeCostPoint} from '@/lib/calculator/types';
import type {Locale} from '@/config/i18n';
import {designText} from '@/config/design-v2-copy';
import {baht,compactBaht,lifetimeCrossing} from '@/lib/design-v2/figures';
import {DRAW_MS,drawWidth} from '@/lib/home/motion';
import {useReveal} from './use-reveal';

const W=600,H=300,L=62,R=576,T=22,B=252,CLIP_PAD=14;

/** Home-only lifetime chart (the results page keeps using LifetimePlot). Draws itself when scrolled into view. */
export function HomeLifetimeChart({data,net,locale}:{data:LifetimeCostPoint[];net:number;locale:Locale}) {
  const text=designText(locale),cross=lifetimeCrossing(data),last=data.at(-1),clipId='home-reveal-'+useId().replace(/[^a-zA-Z0-9]/g,'');
  const rectRef=useRef<SVGRectElement>(null),run=useRef(0),frame=useRef(0);
  const full=R-L+CLIP_PAD;
  const setWidth=(width:number)=>rectRef.current?.setAttribute('width',width.toFixed(1));
  const ref=useReveal<HTMLElement>(()=>{
    const token=++run.current;let start:number|null=null;
    const step=(now:number)=>{
      if(token!==run.current)return;
      start??=now;const k=Math.min(1,(now-start)/DRAW_MS);setWidth(drawWidth(full,k));
      if(k<1)frame.current=requestAnimationFrame(step);
    };
    frame.current=requestAnimationFrame(step);
  },()=>{run.current++;cancelAnimationFrame(frame.current);setWidth(0);});
  useEffect(()=>()=>{run.current++;cancelAnimationFrame(frame.current);},[]);
  if(!last)return null;
  const max=Math.max(...data.flatMap(p=>[p.withSolarThb,p.withoutSolarThb])),step=max>1500000?500000:max>600000?250000:100000,top=Math.max(step,Math.ceil(max/step)*step);
  const x=(year:number)=>L+(R-L)*year/25,y=(value:number)=>B-(B-T)*value/top;
  const positive=net>=0,tone=positive?'var(--sm-green)':'var(--sm-danger)';
  const x25=x(25),yWithout=y(last.withoutSolarThb),yWith=y(last.withSolarThb);
  const savingLabel=(positive?text.cGap:text.cGapNeg).replace('{a}',compactBaht(Math.abs(net)));
  const label=`${text.cTitle}. ${positive?text.cGap.replace('{a}',baht(net)):text.cGapNeg.replace('{a}',baht(-net))}`;
  const line=(key:'withoutSolarThb'|'withSolarThb')=>data.map(p=>`${x(p.year).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const cx=cross?x(cross.year):0,cy=cross?y(cross.value):0,flip=!!cross&&cross.year>15;
  return <figure className="chartbox home-chart" ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {Array.from({length:Math.floor(top/step)+1},(_,i)=>i*step).map(g=><g key={g}><line className="g" x1={L} x2={R} y1={y(g)} y2={y(g)}/><text className="ax" x={L-10} y={y(g)+4} textAnchor="end">{g===0?'0':compactBaht(g)}</text></g>)}
      {[0,5,10,15,20,25].map(v=><text className="ax" key={v} x={x(v)} y={B+24} textAnchor={v===25?'end':v===0?'start':'middle'}>{v}{v===25?(locale==='en'?' yrs':' ปี'):''}</text>)}
      <clipPath id={clipId}><rect ref={rectRef} x={L-2} y={0} width={full} height={H}/></clipPath>
      <g clipPath={`url(#${clipId})`}><polyline className="wo" points={line('withoutSolarThb')}/><polyline className="wi" points={line('withSolarThb')}/></g>
      {cross&&<g data-testid="lifetime-crossing">
        <line className="dv" x1={cx} x2={cx} y1={cy} y2={B}/>
        <circle className="cross pop" cx={cx} cy={cy} r="8" style={{transformOrigin:`${cx.toFixed(1)}px ${cy.toFixed(1)}px`}}/>
        <text className="lbl fade" x={flip?cx-14:cx+14} y={cy+34} textAnchor={flip?'end':'start'}>{text.cCross.replace('{y}',String(Math.round(cross.year)))}</text>
      </g>}
      <line className="gap grow" x1={x25} x2={x25} y1={yWithout} y2={yWith} style={{stroke:tone,transformOrigin:`${x25.toFixed(1)}px ${yWith.toFixed(1)}px`}}/>
      <text className="sv fade" x={x25-8} y={Math.max(14,Math.min(yWithout,yWith)-10)} textAnchor="end" style={{fill:tone}}>{savingLabel}</text>
    </svg>
    <figcaption className="legend"><span className="lw">{text.cWithout}</span><span className="li">{text.cWith}</span></figcaption>
  </figure>;
}
