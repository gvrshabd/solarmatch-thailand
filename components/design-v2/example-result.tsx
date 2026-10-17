import {calculateEstimate} from '@/lib/calculator';
import {designV2Example} from '@/config/design-v2-example';
import {designText} from '@/config/design-v2-copy';
import type {Locale} from '@/config/i18n';
import {baht,compactBaht,payback} from '@/lib/design-v2/figures';
import {LifetimePlot} from './lifetime-plot';
export function ExampleResult({locale,mini=false}:{locale:Locale;mini?:boolean}) {
  const text=designText(locale),r=calculateEstimate(designV2Example);
  const basis=locale==='en'?'Assumed example: ฿6,000 bill, 60 m² usable roof, single phase and high daytime use. Synthetic profiles; tariff reference 17 October 2026.':'ตัวอย่างสมมติ: ค่าไฟ 6,000 บาท พื้นที่หลังคาใช้ได้ 60 ตร.ม. ไฟ 1 เฟส ใช้ไฟกลางวันมาก ใช้รูปแบบจำลองและอัตราอ้างอิง 17 ตุลาคม 2569';
  if(mini)return <div className="card v2-mini-result"><div className="example-top"><span className="eyebrow">{text.pvEyebrow}</span><span className="chip chip-dark">{text.exWhere}</span></div><div className="num v2-mini-figure">{baht(r.planningMonthlySavingsThb)}</div><p>{text.rLess}</p><div className="rstats"><div><b>{r.planningSystemKw} kWp</b><span>{text.rSystem}</span></div><div><b>{baht(r.planningInstalledCostThb)}</b><span>{text.rPrice}</span></div><div><b>{payback(r.planningPaybackYears)} {text.yrs}</b><span>{text.rPayback}</span></div></div><p className="note">{basis}</p><div className="v2-mini-chart"><LifetimePlot data={r.lifetimeCostSeries} net={r.planningTwentyFiveYearNetBenefitThb} locale={locale} compact/></div></div>;
  return <div className="example"><div className="example-top"><span className="chip chip-gold">{text.exTag}</span><span className="muted">{text.exWhere}</span></div><div className="num big">{baht(r.planningMonthlySavingsThb)}<small>{text.exLess}</small></div><div className="stats3"><div><b>{r.planningSystemKw} kWp</b><span>{text.sSystem}</span></div><div><b>{compactBaht(r.planningInstalledCostThb)}</b><span>{text.sPrice}</span></div><div><b>{payback(r.planningPaybackYears)} {text.yrs}</b><span>{text.sPayback}</span></div></div><p className="note">{basis}</p></div>;
}
