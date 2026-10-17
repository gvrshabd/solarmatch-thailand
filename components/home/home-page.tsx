import {PublicSchema} from '@/components/site/public-schema';
import {ArrowRight,Check,ShieldCheck} from 'lucide-react';
import Link from '@/components/site/internal-link';
import {HeroEstimator} from './hero-estimator';
import {ExampleResult} from './example-result';
import {designText} from '@/config/design-v2-copy';
import {homeownerText} from '@/config/homeowner-v3-copy';
import {localizedPath,type Locale} from '@/config/i18n';

export function HomePage({locale='th'}:{locale?:Locale}) {
  const text=designText(locale),v3=homeownerText(locale),link=(path:string)=>localizedPath(path,locale);
  const steps=[[v3.stepTitle,v3.stepBody],[text.h2t,v3.secondBody],[text.h3t,text.h3p]];
  return <main className="design-v2-home homeowner-home-v3"><PublicSchema locale={locale} faq={text.faq}/>
    <section className="hero3 dark" id="top"><div className="hero-bg"><picture><source media="(max-width:899px)" srcSet="/design-v3/home-hero-wide-m.jpg"/><img src="/design-v3/home-hero-wide.jpg" width="1774" height="887" fetchPriority="high" alt={locale==='en'?'A waterside house with rooftop solar panels among palm trees at sunset':'บ้านริมน้ำพร้อมแผงโซลาร์บนหลังคาท่ามกลางต้นปาล์มยามเย็น'}/></picture><span className="credit">{text.credit.replace('{p}','Robert So')}</span></div><div className="wrap"><div className="hero-copy"><h1>{text.heroH1}</h1><p className="lede">{v3.heroLede}</p><HeroEstimator locale={locale}/><div className="trust">{v3.trust.map(t=><span key={t}><Check aria-hidden="true"/>{t}</span>)}</div></div></div></section>
    <section className="section" id="example"><div className="wrap exstack"><div className="ex-head"><p className="eyebrow">{v3.exampleEyebrow}</p><h2>{v3.exampleHeading}</h2></div><ExampleResult locale={locale}/><p className="ex-link"><Link className="link" href={link('/estimate')}>{text.pvTry}<ArrowRight aria-hidden="true"/></Link></p></div></section>
    <section className="section band-sage" id="how"><div className="wrap"><h2 className="sec-h">{v3.howHeading}</h2><ol className="steps3">{steps.map(([title,body],i)=><li key={title}><span className="n">{i+1}</span><div><h3>{title}{i===2&&<span className="chip chip-gold">{text.soon}</span>}</h3><p>{body}</p></div></li>)}</ol></div></section>
    <section className="section band-dark" id="trust"><div className="wrap trustgrid"><div><p className="eyebrow">{text.trEyebrow}</p><h2 className="sec-h">{text.trH2}</h2><p className="trp">{v3.trustBody}</p><p className="eyebrow source-heading">{text.trSrc}</p><div className="sources">{v3.sources.map((label,i)=><Link className="chip" key={label} href={link(i===2?'/methodology':'/resources')}><ShieldCheck aria-hidden="true"/>{label}</Link>)}</div><p className="method-link"><Link className="link" href={link('/methodology')}>{text.trLink}<ArrowRight aria-hidden="true"/></Link></p></div><div className="compare">{v3.rows.map(([label,value],i)=><div key={label} className={i<3?'inc':undefined}><span>{label}</span><b>{value}</b></div>)}</div></div></section>
    <section className="section" id="questions"><div className="wrap"><div className="faqband"><img src="/design-v3/palms-roof.jpg" alt={locale==='en'?'Solar panels on a tiled roof beside palm trees':'แผงโซลาร์บนหลังคากระเบื้องใกล้ต้นปาล์ม'} width="1600" height="1200"/><span className="credit">{text.credit.replace('{p}','Kindel Media')}</span><div className="inner"><h2>{v3.faqHeading}</h2></div></div><div className="faq">{text.faq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
    <section className="section band-sage"><div className="wrap cta-final"><h2>{text.finalH}</h2><Link className="btn btn-primary" href={link('/estimate')}>{text.finalBtn}<ArrowRight aria-hidden="true"/></Link></div></section>
  </main>;
}
