import Link from '@/components/site/internal-link';
import {localizedPath, type Locale} from '@/config/i18n';
import type {EstimateAnswers, EstimateResult} from '@/lib/calculator/types';

/** Explain the actual blocker, never replace it with an invented calculation. */
export function modelRecovery(answers: EstimateAnswers, result: EstimateResult, locale: Locale) {
  const t=(en:string,th:string)=>locale==='en'?en:th;
  const has=(code:string)=>result.warnings?.some(w=>w.code===code);
  if(result.modelStatus==='no-feasible-option'||result.modelStatus==='no-economic-option')return {illustrate:Boolean(answers.solarOnlyIllustration&&answers.projectType!=='expand-existing'&&(answers.projectType==='solar-with-battery'||answers.quoteBatteryIncluded)),quotation:true,
    title:result.modelStatus==='no-feasible-option'?t('Let’s review what can fit your home','มาดูว่าระบบแบบใดเหมาะกับพื้นที่ของคุณ'):t('The current options cost more than they save','ตัวเลือกปัจจุบันมีต้นทุนมากกว่าผลประหยัด'),
    body:t('No recommended installation meets the current roof, electricity, budget and price assumptions. Check the optional details if you have better information, or take your answers to an installer for a site-specific assessment.','ยังไม่มีระบบที่แนะนำซึ่งผ่านเงื่อนไขพื้นที่หลังคา ระบบไฟ งบประมาณ และสมมติฐานราคา หากมีข้อมูลที่แม่นยำขึ้น คุณแก้ไขรายละเอียดเพิ่มเติมได้ หรือนำคำตอบไปให้ผู้ติดตั้งประเมินหน้างาน'),
    detailsLabel:t('Review optional details','ตรวจสอบรายละเอียดเพิ่มเติม')};
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
  if(answers.projectType==='expand-existing')return {illustrate:false,quotation:false,project:true,
    title:t('Let’s check your existing solar system','มาดูข้อมูลระบบโซลาร์เดิมของคุณ'),
    body:t('An upgrade needs details of your existing panels, inverter, generation and electricity use before solar. Your current bill alone cannot tell us what an upgrade would save. Keep your answers and ask an installer to assess the existing system, or edit the project choice if you meant a new installation.','การปรับปรุงระบบต้องทราบข้อมูลแผง อินเวอร์เตอร์ การผลิตไฟของระบบเดิม และการใช้ไฟก่อนติดโซลาร์ ค่าไฟปัจจุบันอย่างเดียวไม่เพียงพอที่จะประเมินผลประหยัดจากการปรับปรุงระบบ คำตอบของคุณยังอยู่ คุณนำข้อมูลไปให้ผู้ติดตั้งประเมินระบบเดิมได้ หรือแก้ไขประเภทโครงการหากตั้งใจจะติดตั้งระบบใหม่')};
  return {illustrate:true,quotation:false,
    title:t('Your solar-panel estimate','ผลประเมินเฉพาะแผงโซลาร์ของคุณ'),
    body:t('We can estimate your solar panels. Battery costs, savings and backup performance aren’t included yet.','เราประเมินระบบแผงโซลาร์ให้คุณได้ แต่ยังไม่รวมต้นทุน ผลประหยัด และประสิทธิภาพการสำรองไฟของแบตเตอรี่')};
}

export function ModelRecovery({guidance,locale,illustrated=false,onIllustrate,onReviewQuotation}:{guidance:ReturnType<typeof modelRecovery>;locale:Locale;illustrated?:boolean;onIllustrate:(enabled:boolean)=>void;onReviewQuotation:()=>void}) {
  const en=locale==='en';
  const project=guidance.illustrate||('project' in guidance&&guidance.project);
  return <div className="result-model-recovery" aria-label={en?'Ways to continue':'ทางเลือกในการดำเนินการต่อ'}>
    <p>{guidance.illustrate&&illustrated&&!('detailsLabel' in guidance)?(en?'These figures cover solar panels only. Your original project preference is unchanged; battery costs, savings and backup performance are not included.':'ตัวเลขนี้เป็นผลประเมินเฉพาะแผงโซลาร์ ประเภทโครงการที่คุณเลือกไว้ยังไม่เปลี่ยน และไม่รวมต้นทุน ผลประหยัด หรือประสิทธิภาพการสำรองไฟของแบตเตอรี่'):guidance.body}</p>
    {guidance.illustrate&&<button type="button" className="btn btn-soft solar-only-action" onClick={()=>onIllustrate(!illustrated)}>{illustrated?(en?'Back to my battery request':'กลับไปดูความสนใจเรื่องแบตเตอรี่'):(en?'See my solar-only estimate':'ดูผลประเมินเฉพาะโซลาร์ของฉัน')}</button>}
    {guidance.quotation&&<button type="button" className="btn btn-soft" onClick={onReviewQuotation}>{'detailsLabel' in guidance?guidance.detailsLabel:en?'Review quotation details':'ตรวจสอบรายละเอียดใบเสนอราคา'}</button>}
    <Link className="btn btn-soft" href={localizedPath('/estimate',locale)+(project?'#projectType':'')}>{project?(en?'Edit my project choice':'แก้ไขประเภทโครงการ'):(en?'Review my answers':'ตรวจสอบคำตอบของฉัน')}</Link>
  </div>;
}
