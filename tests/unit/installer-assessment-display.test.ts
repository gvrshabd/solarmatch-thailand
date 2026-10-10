import { describe, expect, it } from 'vitest';
import { assessmentRows, sharedResidentialLabel } from '@/lib/installer/assessment-display';

describe('installer assessment display', () => {
  it('localizes the same safe answers for both installer views', () => {
    const answers = { propertyType: 'detached-home', ownershipStatus: 'owner', monthlyBillThb: 4500, daytimeLoads: ['air-conditioning', 'ev'], airConditionerCount: 3, roofArea: '30-60', roofMaterial: 'metal-sheet', shade: 'little', planningTimeframe: 'within-3-months', projectType: 'new-rooftop' };
    const english = assessmentRows(answers, true);
    const thai = assessmentRows(answers, false);
    expect(english.find((row) => row.key === 'propertyType')?.value).toBe('Detached house');
    expect(thai.find((row) => row.key === 'propertyType')?.value).toBe('บ้านเดี่ยว');
    expect(english.find((row) => row.key === 'daytimeLoads')?.value).toBe('Air conditioning, EV charging');
    expect(english.find((row) => row.key === 'monthlyBillThb')?.value).toBe('4,500 THB/month');
    expect(thai.find((row) => row.key === 'airConditionerCount')?.value).toBe('3 เครื่อง');
    expect(english.find((row) => row.key === 'planningTimeframe')?.value).toBe('Yes — within 3 months');
    expect(english.find((row) => row.key === 'projectType')?.value).toBe('A new rooftop solar system');
    expect(english.find((row) => row.key === 'roofArea')?.value).toBe('30–60 m²');
  });
  it('does not expose arbitrary assessment keys, objects or unknown codes', () => {
    expect(assessmentRows({ privateNote: 'secret', propertyType: { nested: 'secret' }, shade: 'unknown-code', daytimeLoads: [], monthlyBillThb: null }, false)).toEqual([
      { key: 'propertyType', label: 'ประเภทที่พักอาศัย', value: 'ไม่ได้ระบุ' },
      { key: 'monthlyBillThb', label: 'ค่าไฟต่อเดือน', value: 'ไม่ได้ระบุ' },
      { key: 'daytimeLoads', label: 'อุปกรณ์ที่มีในบ้าน', value: 'ไม่ได้ระบุ' },
      { key: 'shade', label: 'เงาบนหลังคา', value: 'คำตอบอื่น / ไม่พบตัวเลือก' },
    ]);
    expect(sharedResidentialLabel(true)).toBe('Shared residential enquiry');
    expect(sharedResidentialLabel(false)).toBe('คำขอที่อยู่อาศัยแบบแชร์');
  });
});
