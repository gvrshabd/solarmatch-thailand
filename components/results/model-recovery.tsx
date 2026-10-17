import Link from '@/components/site/internal-link';
import {localizedPath, type Locale} from '@/config/i18n';
import type {EstimateAnswers, EstimateResult} from '@/lib/calculator/types';

/** Explain the actual blocker, never replace it with an invented calculation. */
export function modelRecovery(answers: EstimateAnswers, result: EstimateResult, locale: Locale) {
  const t=(en:string,th:string)=>locale==='en'?en:th;
  const has=(code:string)=>result.warnings?.some(w=>w.code===code);
  if(has('quote-scope-unknown')) return {illustrate:false,quotation:true,
    title:t('Confirm what your quotation includes','โปรดยืนยันว่าใบเสนอราคารวมอะไรบ้าง'),
    body:t('Choose whether the quotation includes a battery before comparing its price. Your answers are saved; no estimate has been substituted.','โปรดระบุว่าใบเสนอราคารวมแบตเตอรี่หรือไม่ก่อนเปรียบเทียบราคา คำตอบของคุณยังอยู่ และเราไม่ได้ใช้ค่าประเมินอื่นแทน')};
  if(has('unsupported-quote')) return {illustrate:false,quotation:true,
    title:t('Check the equipment in your quotation','ตรวจสอบข้อมูลอุปกรณ์ในใบเสนอราคา'),
    body:t('The panel totals conflict or the quoted capacity exceeds this residential calculator’s limits. Review the panel count, wattage, DC size and inverter capacity.','กำลังรวมแผงไม่ตรงกัน หรือขนาดที่ระบุเกินขอบเขตเครื่องคำนวณสำหรับบ้าน โปรดตรวจจำนวนแผง กำลังต่อแผง ขนาด DC และกำลังอินเวอร์เตอร์')};
  if(has('unsupported-tariff')) return {illustrate:false,quotation:false,
    title:t('Check your electricity tariff and bill date','ตรวจสอบประเภทอัตราค่าไฟและวันที่บิล'),
    body:t('This tariff or date is not covered by our verified residential rates. TOU needs a separate calculation. Review your bill details; do not change a correct tariff just to obtain a result.','อัตราหรือวันที่นี้อยู่นอกช่วงอัตราบ้านอยู่อาศัยที่เราตรวจสอบแล้ว อัตรา TOU ต้องคำนวณแยก โปรดตรวจรายละเอียดบิล และอย่าเปลี่ยนอัตราที่ถูกต้องเพียงเพื่อให้ได้ผลประเมิน')};
  if(has('residential-boundary')) return {illustrate:false,quotation:false,
    title:t('Your electricity use needs an individual assessment','การใช้ไฟของคุณต้องประเมินเป็นรายกรณี'),
    body:t('The entered consumption is outside this residential calculator’s range. Check the units and billing period. If they are correct, ask an installer for an individual assessment.','ข้อมูลการใช้ไฟอยู่นอกช่วงที่เครื่องคำนวณสำหรับบ้านรองรับ โปรดตรวจหน่วยและจำนวนวันในบิล หากถูกต้องแล้ว ควรให้ผู้ติดตั้งประเมินเป็นรายกรณี')};
  if(has('unsupported-project')) return projectModelRecovery(answers,locale);
  return {illustrate:false,quotation:false,
    title:t('Review your project details','ตรวจสอบรายละเอียดโครงการของคุณ'),
    body:t('We cannot calculate a reliable estimate from these inputs. Your answers are saved. Review the details and limitations below.','ยังไม่สามารถคำนวณผลประเมินที่น่าเชื่อถือจากข้อมูลนี้ได้ คำตอบของคุณยังอยู่ โปรดตรวจรายละเอียดและข้อจำกัดด้านล่าง')};
}

export function projectModelRecovery(answers:EstimateAnswers,locale:Locale){
  const t=(en:string,th:string)=>locale==='en'?en:th;
  return {illustrate:true,quotation:false,
    title:answers.projectType==='expand-existing'
      ?t('An existing system needs a separate assessment','ระบบโซลาร์เดิมต้องประเมินแยกต่างหาก')
      :t('A battery system needs a separate estimate','ระบบที่มีแบตเตอรี่ต้องประเมินแยกต่างหาก'),
    body:t('Your answers are saved. You can still explore a new solar-panel-only system using your electricity use and roof details. This illustration excludes batteries, backup power and any existing solar system; it is not an estimate for the project you selected.','คำตอบของคุณยังอยู่ คุณเลือกดูตัวอย่างระบบแผงโซลาร์ใหม่โดยใช้ข้อมูลการใช้ไฟและหลังคาที่กรอกได้ ตัวอย่างนี้ไม่รวมแบตเตอรี่ ไฟสำรอง หรือระบบโซลาร์เดิม และไม่ใช่ผลประเมินสำหรับโครงการที่คุณเลือก')};
}

export function ModelRecovery({guidance,locale,illustrated=false,onIllustrate,onReviewQuotation}:{guidance:ReturnType<typeof modelRecovery>;locale:Locale;illustrated?:boolean;onIllustrate:(enabled:boolean)=>void;onReviewQuotation:()=>void}) {
  const en=locale==='en';
  return <div className="result-model-recovery" aria-label={en?'Ways to continue':'ทางเลือกในการดำเนินการต่อ'}>
    <p>{guidance.body}</p>
    {guidance.illustrate&&<label className="consent-row"><input type="checkbox" checked={illustrated} onChange={e=>onIllustrate(e.target.checked)}/>{en?'Show a new-system solar-only illustration. This does not model my battery or existing system.':'แสดงตัวอย่างระบบใหม่เฉพาะโซลาร์ โดยไม่ใช่แบบจำลองแบตเตอรี่หรือระบบเดิมของฉัน'}</label>}
    {guidance.quotation&&<button type="button" className="btn btn-soft" onClick={onReviewQuotation}>{en?'Review quotation details':'ตรวจสอบรายละเอียดใบเสนอราคา'}</button>}
    <Link className="btn btn-soft" href={localizedPath('/estimate',locale)}>{en?'Review my answers':'ตรวจสอบคำตอบของฉัน'}</Link>
  </div>;
}
