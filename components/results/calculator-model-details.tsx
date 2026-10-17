'use client';

import type {EstimateAnswers,EstimateResult} from '@/lib/calculator/types';
import type {EnergyAnswersChange} from '@/components/estimate/energy-input-fields';
import {EnergyNumberField} from '@/components/estimate/energy-input-fields';
import {payback} from '@/lib/design-v2/figures';

export function CalculatorModelDetails({answers,result,locale,onChange,onRecalculate}:{answers:EstimateAnswers;result:EstimateResult;locale:'en'|'th';onChange:EnergyAnswersChange;onRecalculate:()=>void}){
 const en=locale==='en',t=(a:string,b:string)=>en?a:b;
 const money=(v:number)=>'฿'+v.toLocaleString(en?'en-US':'th-TH',{maximumFractionDigits:2});
 const n=(v:number)=>v.toLocaleString(en?'en-US':'th-TH',{maximumFractionDigits:1});
 const modern=answers.estimateModelVersion==='energy-v3';
 const reason=(v:string)=>({
  'roof-too-small':t('Roof allowance too small','พื้นที่หลังคาตามข้อมูลไม่พอ'),
  'phase-mismatch':t('Different electricity phase','ระบบไฟฟ้าไม่ตรงกัน'),
  'over-budget':t('Above your budget','เกินงบประมาณ'),
  'unsupported-capacity':t('Outside supported residential capacity','เกินขนาดที่แบบจำลองบ้านรองรับ'),
  'module-dc-mismatch':t('Module count × Wp conflicts with stated DC capacity','จำนวนแผง × Wp ไม่ตรงกับกำลังรวม DC ที่ระบุ'),
 }[v]??v);
 return <section className="card calculator-model-details" aria-labelledby="model-title">
  <h2 id="model-title">{t('Model, assumptions and alternatives','แบบจำลอง สมมติฐาน และทางเลือก')}</h2>
  <p className="note">{modern?`${result.modelVersion} · ${result.calculationReferenceDate}`:t('Saved legacy estimate. Its original model is retained; it has not silently changed to the new model.','ผลประเมินเดิมยังใช้แบบจำลองเดิม ไม่ได้เปลี่ยนเป็นแบบใหม่โดยอัตโนมัติ')}</p>
  {!modern&&<button className="btn btn-soft btn-sm" type="button" onClick={onRecalculate}>{t('Recalculate with current model','คำนวณใหม่ด้วยแบบจำลองปัจจุบัน')}</button>}
  {result.warnings?.filter(w=>w.code!=='unsupported-project').map(w=><p className="note" key={w.code}><strong>{w[locale]}</strong></p>)}
  {modern&&<>
   <p className="note">{result.recommendationReason?.[locale]}</p>
   <p className="note">{t('An area band uses its conservative lower boundary (under 30 m² uses 15 m²), not a measured roof. Enter exact usable area if available. Prices and physical/electrical suitability require an installer quotation and utility approval.','ช่วงพื้นที่ใช้ขอบล่างอย่างระมัดระวัง (ต่ำกว่า 30 ตร.ม. ใช้ 15 ตร.ม.) ไม่ใช่พื้นที่ที่วัดจริง หากทราบให้ระบุพื้นที่ใช้ได้จริง ราคาและความเหมาะสมต้องตรวจโดยผู้ติดตั้งและขออนุมัติการไฟฟ้า')}</p>
   <details className="disc"><summary>{t('Compare evaluated installation options','เปรียบเทียบตัวเลือกติดตั้งที่ประเมิน')}</summary><div className="in">
    {result.candidateSystems?.map(c=><article className="inline-followup" key={c.id}>
     <h3>{c[en?'labelEn':'labelTh']}{result.selectedSystem?.id===c.id?' · '+t('Selected','ตัวเลือกที่เลือก'):''}</h3>
     <p>{c.moduleCount||'?'} × {c.moduleWp||'?'} Wp · {c.dcKwp} kWp DC / {c.inverterAcKw} kW AC · {c.phase==='single'?t('Single phase','1 เฟส'):c.phase==='three'?t('Three phase','3 เฟส'):t('Phase unknown','ยังไม่ทราบเฟส')}</p>
     <p>{t('Roof allowance','พื้นที่อ้างอิง')} {n(c.requiredRoofAreaSqm)} m² · {money(c.priceThb)}</p>
     <p>{c.feasible?(c.conditional?t('Conditional: verify phase, roof and location.','มีเงื่อนไข ต้องยืนยันเฟส หลังคาและพื้นที่'):t('Passes the entered constraints; site approval still required.','ผ่านข้อจำกัดที่กรอก แต่ยังต้องตรวจหน้างาน')):c.reasons.map(reason).join(' · ')}</p>
     {(c.feasible||c.id==='user-quotation')&&result.modelStatus!=='unsupported'&&<p>{t('First-year bill saving','ประหยัดค่าไฟปีแรก')} {money(c.annualSavingsThb)} · {t('25-year net benefit','ผลประโยชน์สุทธิ 25 ปี')} {money(c.lifetimeBenefitThb)} · {t('Simple payback','คืนทุนอย่างง่าย')} {payback(c.paybackYears)}{c.paybackYears!==null?' '+t('years','ปี'):''}</p>}
     {c.sourceUrl&&<a href={c.sourceUrl} target="_blank" rel="noreferrer">{t('Published package and scope','ข้อมูลชุดและขอบเขตงานที่เผยแพร่')}</a>}
    </article>)}
   </div></details>
   {result.energy&&result.modelStatus!=='unsupported'&&<details className="disc"><summary>{t('First-year energy balance','สมดุลพลังงานปีแรก')}</summary><div className="in"><div className="kv">{[
    [t('Household demand','ความต้องการไฟของบ้าน'),result.energy.demandKwh],
    [t('Solar generation','ไฟฟ้าที่ผลิตจากโซลาร์'),result.energy.generationKwh],
    [t('Immediate self-consumption','ใช้โซลาร์ทันที'),result.energy.selfConsumedKwh],
    [t('Grid imports','ใช้ไฟจากโครงข่าย'),result.energy.gridImportKwh],
    [t('Surplus: export/curtailment, no base revenue','ไฟส่วนเกิน ส่งออกหรือลดการผลิต ไม่คิดรายได้ในฐาน'),result.energy.surplusKwh],
   ].map(([label,v])=><div key={String(label)}><span>{label}</span><b>{n(Number(v))} kWh</b></div>)}</div><p className="note">{t('Existing scheduled appliances reallocate the measured bill consumption; they are not added twice. Quantified future loads are additional from their selected month/year. The representative solar/load year is 2027.','อุปกรณ์ที่ใช้อยู่ปรับช่วงเวลาใช้ไฟภายในยอดบิล ไม่ได้เพิ่มซ้ำ โหลดใหม่ที่ระบุปริมาณจะเพิ่มตั้งแต่เดือนและปีที่เลือก ใช้ปีตัวแทน 2027 สำหรับรูปแบบแสงอาทิตย์และโหลด')}</p></div></details>}
   {result.uncertaintyScenarios&&result.uncertaintyScenarios.length>0&&<details className="disc"><summary>{t('Lower / central / higher scenarios','กรณีต่ำ / กลาง / สูง')}</summary><div className="in">{result.uncertaintyScenarios.map(s=><p key={s.id}><strong>{s.id==='lower'?t('Lower','ต่ำ'):s.id==='higher'?t('Higher','สูง'):t('Central','กลาง')}:</strong> {s[en?'basisEn':'basisTh']} · {t('25-year net','สุทธิ 25 ปี')} {money(s.lifetimeBenefitThb)}</p>)}<p className="note">{t('Sensitivity assumptions, not measured confidence intervals. Regional yield and synthetic household profiles require calibration with actual meter/site data.','เป็นกรณีทดสอบความไว ไม่ใช่ช่วงความเชื่อมั่นจากการวัด ต้องเทียบข้อมูลมิเตอร์และหน้างานจริงเพื่อปรับสมมติฐานผลผลิตและโหลด')}</p></div></details>}
   {result.selectedSystem&&result.modelStatus!=='unsupported'&&<details className="disc"><summary>{t('Operating cash flow and discounted value','กระแสเงินสดดำเนินงานและมูลค่าคิดลด')}</summary><div className="in"><EnergyNumberField label={t('Optional annual discount rate (%)','อัตราคิดลดต่อปี (ถ้าต้องการ %)')} value={answers.discountRatePct} max={30} onChange={v=>onChange('discountRatePct',v)}/><p>{t('Discounted net present value','มูลค่าปัจจุบันสุทธิ')} {money(result.discountedValueThb??0)} · {answers.discountRatePct??0}%</p><p className="note">{t('Simple payback divides price by first-year savings less reserve. Cumulative break-even uses the degrading yearly energy and bill path; they are not the same measure. Export, tax and financing are excluded here.','คืนทุนอย่างง่ายหารราคาด้วยประหยัดปีแรกหักเงินสำรอง ส่วนจุดคุ้มทุนสะสมใช้เส้นทางพลังงานและค่าไฟที่เสื่อมลงในแต่ละปี จึงไม่ใช่ตัวชี้วัดเดียวกัน ส่วนนี้ไม่รวมขายไฟ ภาษีและสินเชื่อ')}</p><table className="accessible-data-table" tabIndex={0}><caption>{t('Selected annual cash flows (THB)','กระแสเงินสดรายปีที่เลือก (บาท)')}</caption><thead><tr><th>{t('Year','ปี')}</th><th>{t('Gross bill saving','ประหยัดค่าไฟรวม')}</th><th>{t('Reserve','เงินสำรอง')}</th><th>{t('Net operating cash','เงินสดสุทธิ')}</th></tr></thead><tbody>{result.annualFinancials?.filter(r=>[1,5,10,15,20,25].includes(r.year)).map(r=><tr key={r.year}><td>{r.year}</td><td>{money(r.grossSavingsThb)}</td><td>{money(r.reserveThb)}</td><td>{money(r.netCashFlowThb)}</td></tr>)}</tbody></table></div></details>}
  </>}
 </section>;
}
