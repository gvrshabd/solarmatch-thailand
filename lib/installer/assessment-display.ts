import { initialQuestionnaire, legacyQuestionnaireV1 } from '@/config/assessment';

const fields: Record<string, [string, string]> = {
  propertyType: ['ประเภทที่พักอาศัย', 'Property type'], ownershipStatus: ['สถานะต่อทรัพย์สิน', 'Ownership status'],
  monthlyBillThb: ['ค่าไฟต่อเดือน', 'Monthly electricity bill'], daytimePattern: ['การใช้ไฟช่วงกลางวัน', 'Daytime electricity use'],
  daytimeLoads: ['อุปกรณ์ที่มีในบ้าน', 'Installed appliances'], airConditionerCount: ['จำนวนเครื่องปรับอากาศ', 'Installed air conditioners'],
  roofArea: ['พื้นที่หลังคา', 'Roof area'], roofMaterial: ['วัสดุหลังคา', 'Roof material'], shade: ['เงาบนหลังคา', 'Roof shading'],
  planningTimeframe: ['ช่วงเวลาที่วางแผนติดตั้ง', 'Installation timeframe'], projectType: ['ประเภทโครงการ', 'Project type'],
};

/** Display only the explicitly supported assessment fields; never render arbitrary objects. */
export function assessmentRows(assessment: Record<string, unknown>, en: boolean) {
  const locale = en ? 'en' : 'th';
  const missing = en ? 'Not specified' : 'ไม่ได้ระบุ';
  return Object.entries(fields).filter(([key]) => Object.hasOwn(assessment, key)).map(([key, labels]) => {
    const questionId = key === 'planningTimeframe' ? 'activelyPlanningSolar' : key;
    const question = initialQuestionnaire.questions.find((item) => item.id === questionId)
      ?? legacyQuestionnaireV1.questions.find((item) => item.id === questionId);
    const format = (value: unknown): string => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        const number = new Intl.NumberFormat(en ? 'en-GB' : 'th-TH').format(value);
        return key === 'monthlyBillThb' ? `${number} ${en ? 'THB/month' : 'บาท/เดือน'}`
          : key === 'airConditionerCount' ? `${number} ${en ? 'units' : 'เครื่อง'}` : number;
      }
      if (typeof value !== 'string' || !value.trim()) return missing;
      return question?.options?.find((option) => option.value === value)?.label[locale]
        ?? (key === 'planningTimeframe' ? legacyQuestionnaireV1.questions.find((item) => item.id === 'installationTimeframe')?.options?.find((option) => option.value === value)?.label[locale] : undefined)
        ?? (en ? 'Other / unrecognised answer' : 'คำตอบอื่น / ไม่พบตัวเลือก');
    };
    const value = assessment[key];
    return { key, label: labels[en ? 1 : 0], value: Array.isArray(value) ? (value.length ? value.map(format).join(', ') : missing) : format(value) };
  });
}

export function sharedResidentialLabel(en: boolean) {
  return en ? 'Shared residential enquiry' : 'คำขอที่อยู่อาศัยแบบแชร์';
}
