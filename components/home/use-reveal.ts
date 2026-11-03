'use client';

import {useEffect,useRef} from 'react';
import {REVEAL_RATIO,startsBelowFold} from '@/lib/home/motion';

/**
 * Scroll reveal. The server HTML already shows the final state; on the client an element that starts below the fold
 * waits in `data-reveal="pre"` (set with transitions off, so nothing animates backwards), plays when 35% is on screen,
 * and re-arms when it leaves below the screen so scrolling back up and down replays it.
 * With prefers-reduced-motion the element is never armed and stays final.
 */
export function useReveal<T extends HTMLElement>(onPlay?:()=>void,onArm?:()=>void) {
  const ref=useRef<T>(null),handlers=useRef({onPlay,onArm});
  useEffect(()=>{handlers.current={onPlay,onArm};});
  useEffect(()=>{
    const el=ref.current;
    if(!el||typeof IntersectionObserver==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const arm=()=>{
      el.setAttribute('data-settle','');el.setAttribute('data-reveal','pre');handlers.current.onArm?.();
      void el.offsetHeight;el.removeAttribute('data-settle');
    };
    if(startsBelowFold(el.getBoundingClientRect().top,window.innerHeight))arm();
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        const state=el.getAttribute('data-reveal');
        if(entry.isIntersecting&&entry.intersectionRatio>=REVEAL_RATIO&&state==='pre'){el.setAttribute('data-reveal','play');handlers.current.onPlay?.();}
        else if(!entry.isIntersecting&&entry.boundingClientRect.top>0&&state==='play')arm();
      }
    },{threshold:[0,REVEAL_RATIO]});
    observer.observe(el);
    return ()=>{observer.disconnect();el.removeAttribute('data-reveal');el.removeAttribute('data-settle');};
  },[]);
  return ref;
}
