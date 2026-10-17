'use client';

import { EnergyNumberField, isEnergyIsoDate, useEnergyDraftRows, type EnergyAnswersChange } from '@/components/estimate/energy-input-fields';
import type { EstimateAnswers } from '@/lib/calculator/types';

export type EnergyRefinementsProps = { answers: EstimateAnswers; locale: 'en' | 'th'; onChange: EnergyAnswersChange };
type PlannedLoad = NonNullable<EstimateAnswers['plannedLoadChanges']>[number];
const completeLoad = (load: PlannedLoad) => isEnergyIsoDate(load.startDate) && (load.kind === 'ev'
  ? load.monthlyKwh !== undefined && load.homeChargingFraction !== undefined && load.daytimeFraction !== undefined
  : load.powerKw !== undefined && load.units !== undefined && load.hoursPerDay !== undefined && load.startHour !== undefined);

export function EnergyRefinements({ answers, locale, onChange }: EnergyRefinementsProps) {
  const en = locale === 'en';
  const t = (english: string, thai: string) => en ? english : thai;
  const [loads, setLoads] = useEnergyDraftRows<PlannedLoad>(answers.plannedLoadChanges, rows => rows.filter(completeLoad), rows => onChange('plannedLoadChanges', rows));
  const updateLoad = (index: number, patch: Partial<PlannedLoad>) => setLoads(loads.map((load, i) => i === index ? { ...load, ...patch } : load));

  return <>
    <fieldset className="inline-followup">
      <legend>{t('Compare a real installer quotation (optional)', 'เปรียบเทียบใบเสนอราคาจากผู้ติดตั้ง (ถ้ามี)')}</legend>
      <p className="note">{t('Use the exact total cash price and equipment from the quotation. Panel DC capacity and inverter AC capacity can differ. A battery requires a separate model.', 'ใช้ราคารวมเงินสดและข้อมูลอุปกรณ์ตามใบเสนอราคาจริง กำลังแผง DC อาจต่างจากกำลังอินเวอร์เตอร์ AC หากรวมแบตเตอรี่ต้องใช้แบบจำลองแยก')}</p>
      <div className="grid accuracy-fields">
        <EnergyNumberField label={t('Quoted panel capacity, DC (kWp)', 'กำลังแผงรวมตามใบเสนอราคา DC (kWp)')} value={answers.quoteSystemKw} min={0.1} max={1000} onChange={value => onChange('quoteSystemKw', value)} />
        <EnergyNumberField label={t('Exact total installed cash price, including VAT (THB)', 'ราคารวมติดตั้งเงินสด รวม VAT ตามใบเสนอราคา (บาท)')} value={answers.quoteCashPriceThb} min={1} max={100000000} step={0.01} onChange={value => onChange('quoteCashPriceThb', value)} />
        <EnergyNumberField label={t('Number of quoted solar modules', 'จำนวนแผงตามใบเสนอราคา (แผง)')} value={answers.quoteModuleCount} min={1} max={2000} step={1} onChange={value => onChange('quoteModuleCount', value)} />
        <EnergyNumberField label={t('Nameplate capacity per module (Wp)', 'กำลังตามป้ายต่อแผง (Wp)')} value={answers.quoteModuleWp} min={100} max={1000} step={1} onChange={value => onChange('quoteModuleWp', value)} />
        <EnergyNumberField label={t('Quoted inverter output, AC (kW)', 'กำลังจ่ายอินเวอร์เตอร์ตามใบเสนอราคา AC (kW)')} value={answers.quoteInverterAcKw} min={0.1} max={1000} onChange={value => onChange('quoteInverterAcKw', value)} />
        <label>{t('Does this quotation include a battery?', 'ใบเสนอราคานี้รวมแบตเตอรี่หรือไม่?')}<select value={answers.quoteBatteryIncluded === undefined ? '' : String(answers.quoteBatteryIncluded)} onChange={event => onChange('quoteBatteryIncluded', event.currentTarget.value === '' ? undefined : event.currentTarget.value === 'true')}>
          <option value="">{t('Not sure', 'ไม่แน่ใจ')}</option><option value="false">{t('No battery included', 'ไม่รวมแบตเตอรี่')}</option><option value="true">{t('Battery included', 'รวมแบตเตอรี่')}</option>
        </select></label>
      </div>
    </fieldset>
    <fieldset className="inline-followup">
      <legend>{t('Actual panel mounting plane (optional)', 'แนวติดตั้งแผงจริง (ถ้าทราบ)')}</legend>
      <p className="note">{t('Enter the panels’ tilt and direction, which can differ from the roof. For a flat roof, use the mounting design. Zero tilt means horizontal panels, so direction has no effect.', 'ระบุความเอียงและทิศของแผง ซึ่งอาจต่างจากหลังคา หากเป็นดาดฟ้าให้ใช้แบบโครงติดตั้ง ความเอียง 0° คือแผงแนวนอน จึงไม่มีผลจากทิศ')}</p>
      <div className="grid accuracy-fields">
        <EnergyNumberField label={t('Panel tilt from horizontal (0–90°)', 'ความเอียงแผงจากแนวราบ (0–90°)')} value={answers.panelTiltDegrees} max={90} onChange={value => onChange('panelTiltDegrees', value)} />
        <EnergyNumberField label={t('Panel compass direction (0–360°)', 'ทิศของแผงตามเข็มทิศ (0–360°)')} value={answers.panelAzimuthDegrees} max={360} onChange={value => onChange('panelAzimuthDegrees', value)} hint={t('0°/360° north · 90° east · 180° south · 270° west', '0°/360° เหนือ · 90° ตะวันออก · 180° ใต้ · 270° ตะวันตก')} />
      </div>
    </fieldset>
    <fieldset className="inline-followup">
      <legend>{t('Quantify planned new electricity use (optional)', 'ระบุการใช้ไฟที่จะเพิ่มในอนาคต (ถ้ามี)')}</legend>
      <p className="note">{t('Only new use outside your current bill is added. Complete the start date and energy or power schedule. Incomplete rows are not calculated; up to 6 changes can be entered.', 'ระบุเฉพาะการใช้ไฟใหม่ที่ยังไม่รวมในบิลปัจจุบัน กรอกวันที่เริ่มใช้และหน่วยไฟหรือกำลังไฟพร้อมตารางใช้งานให้ครบ แถวที่ไม่ครบจะยังไม่ใช้คำนวณ เพิ่มได้สูงสุด 6 รายการ')}</p>
      {loads.map((load, index) => <fieldset className="inline-followup" key={index}>
        <legend>{t(`New electricity use ${index + 1}`, `การใช้ไฟใหม่รายการที่ ${index + 1}`)}</legend>
        <div className="grid accuracy-fields">
          <label>{t('New appliance', 'อุปกรณ์ที่จะเพิ่ม')}<select value={load.kind} onChange={event => {
            const kind = event.currentTarget.value as PlannedLoad['kind'];
            setLoads(loads.map((current, i) => i === index ? { kind, startDate: current.startDate } : current));
          }}><option value="ev">{t('Electric vehicle', 'รถยนต์ไฟฟ้า')}</option><option value="air-conditioning">{t('Air conditioning', 'เครื่องปรับอากาศ')}</option><option value="pump">{t('Pump', 'ปั๊ม')}</option></select></label>
          <label>{t('Planned first-use date (whole starting month is modeled)', 'วันที่คาดว่าจะเริ่มใช้ (คำนวณเต็มเดือนที่เริ่ม)')}<input type="date" min="2000-01-01" max="2100-12-31" value={load.startDate} onChange={event => {
            const date = event.currentTarget.value;
            if (!date || isEnergyIsoDate(date)) updateLoad(index, { startDate: date });
          }} /></label>
          {load.kind === 'ev' ? <>
            <EnergyNumberField label={t('New EV wall charging energy (kWh/month)', 'หน่วยไฟชาร์จ EV ใหม่ วัดที่ปลั๊ก (kWh/เดือน)')} value={load.monthlyKwh} max={100000} onChange={value => updateLoad(index, { monthlyKwh: value })} />
            <EnergyNumberField label={t('New EV charging done at home (%)', 'สัดส่วนการชาร์จ EV ใหม่ที่บ้าน (%)')} value={load.homeChargingFraction === undefined ? undefined : load.homeChargingFraction * 100} max={100} onChange={value => updateLoad(index, { homeChargingFraction: value === undefined ? undefined : value / 100 })} />
            <EnergyNumberField label={t('Home EV charging in daytime (%)', 'สัดส่วนการชาร์จ EV ที่บ้านในช่วงกลางวัน (%)')} value={load.daytimeFraction === undefined ? undefined : load.daytimeFraction * 100} max={100} onChange={value => updateLoad(index, { daytimeFraction: value === undefined ? undefined : value / 100 })} hint={t('Day charging is modeled at 09:00–17:00; the rest at 20:00–06:00.', 'จำลองการชาร์จกลางวันช่วง 09:00–17:00 น. ส่วนที่เหลือช่วง 20:00–06:00 น.')} />
          </> : <>
            <EnergyNumberField label={t('Average electric input per unit (kW)', 'กำลังไฟฟ้าเฉลี่ยต่อเครื่อง (kW)')} value={load.powerKw} min={0.01} max={load.kind === 'pump' ? 100 : 20} onChange={value => updateLoad(index, { powerKw: value })} hint={load.kind === 'air-conditioning' ? t('Electric input including compressor cycling, not cooling capacity.', 'ใช้กำลังไฟฟ้าเฉลี่ยรวมจังหวะตัด–ต่อคอมเพรสเซอร์ ไม่ใช่กำลังความเย็น') : undefined} />
            <EnergyNumberField label={t('Number of new units', 'จำนวนเครื่องที่จะเพิ่ม (เครื่อง)')} value={load.units} min={1} max={100} step={1} onChange={value => updateLoad(index, { units: value })} />
            <EnergyNumberField label={t('Daily running time per unit (hours)', 'เวลาใช้งานต่อเครื่องในแต่ละวัน (ชั่วโมง)')} value={load.hoursPerDay} max={24} onChange={value => updateLoad(index, { hoursPerDay: value })} />
            <EnergyNumberField label={t('Daily start time (hour, 0–23.99)', 'เวลาเริ่มใช้ในแต่ละวัน (ชั่วโมง 0–23.99)')} value={load.startHour} max={23.99} onChange={value => updateLoad(index, { startHour: value })} hint={t('For example, 9 = 09:00; 13.5 = 13:30.', 'เช่น 9 = 09:00 น. และ 13.5 = 13:30 น.')} />
          </>}
        </div>
        {!completeLoad(load) && <p className="note">{t('Complete all fields in this row to include it.', 'กรอกข้อมูลในรายการนี้ให้ครบเพื่อใช้คำนวณ')}</p>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLoads(loads.filter((_, i) => i !== index))}>{t(`Remove new-use item ${index + 1}`, `ลบการใช้ไฟใหม่รายการที่ ${index + 1}`)}</button>
      </fieldset>)}
      <button type="button" className="btn btn-soft btn-sm" disabled={loads.length >= 6} onClick={() => setLoads([...loads, { kind: 'ev', startDate: '' }])}>{t('Add planned electricity use', 'เพิ่มรายการใช้ไฟในอนาคต')}</button>
    </fieldset>
  </>;
}
