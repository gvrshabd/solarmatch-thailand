export type EstimateQuestionType = 'choice' | 'number' | 'roof';

export type EstimateOption = {
  value: string;
  label: string;
  description?: string;
};

export type EstimateQuestion = {
  id: string;
  title: string;
  reason: string;
  type: EstimateQuestionType;
  required: boolean;
  analyticsEvent: 'estimate_step_completed';
  options?: EstimateOption[];
};

export const estimateFlow: EstimateQuestion[] = [
  {
    id: 'province',
    title: 'บ้านที่กำลังคิดจะติดโซลาร์อยู่จังหวัดไหน?',
    reason: 'ใช้เพื่อปรับสมมติฐานและดูว่ามีผู้ติดตั้งครอบคลุมพื้นที่หรือไม่',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'bangkok', label: 'กรุงเทพมหานคร' },
      { value: 'nonthaburi', label: 'นนทบุรี' },
      { value: 'pathum-thani', label: 'ปทุมธานี' },
      { value: 'samut-prakan', label: 'สมุทรปราการ' },
      { value: 'other', label: 'จังหวัดอื่น' },
    ],
  },
  {
    id: 'monthlyBillThb',
    title: 'ปกติค่าไฟบ้านประมาณเท่าไรต่อเดือน?',
    reason: 'ช่วยให้เราประเมินการใช้ไฟและช่วงขนาดระบบเบื้องต้น',
    type: 'number',
    required: true,
    analyticsEvent: 'estimate_step_completed',
  },
  {
    id: 'daytimeUsage',
    title: 'บ้านคุณใช้ไฟช่วงกลางวันมากแค่ไหน?',
    reason: 'โซลาร์ผลิตไฟตอนกลางวัน ข้อนี้จึงมีผลต่อไฟที่คุณใช้จากระบบได้เอง',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'high', label: 'มาก', description: 'มีคนอยู่บ้าน ใช้แอร์ ปั๊ม หรือทำงานที่บ้านช่วงกลางวัน' },
      { value: 'medium', label: 'ปานกลาง', description: 'ใช้ไฟทั้งกลางวันและช่วงเย็นพอ ๆ กัน' },
      { value: 'low', label: 'น้อย', description: 'กลางวันบ้านค่อนข้างว่าง โหลดหลักอยู่ช่วงเย็นหรือกลางคืน' },
      { value: 'unknown', label: 'ไม่แน่ใจ' },
    ],
  },
  {
    id: 'authority',
    title: 'บ้านนี้เป็นบ้านของคุณหรือครอบครัวใช่ไหม?',
    reason: 'การติดตั้งจริงต้องมีผู้มีสิทธิ์ในทรัพย์สินร่วมตัดสินใจ',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'owner', label: 'เป็นเจ้าของบ้าน' },
      { value: 'family', label: 'เป็นผู้ตัดสินใจร่วมกับครอบครัว' },
      { value: 'renter', label: 'เช่าอยู่' },
      { value: 'other', label: 'อื่น ๆ' },
    ],
  },
  {
    id: 'propertyType',
    title: 'บ้านแบบไหนใกล้เคียงที่สุด?',
    reason: 'รูปแบบอาคารช่วยให้เราอธิบายข้อจำกัดของพื้นที่หลังคาได้เหมาะขึ้น',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'detached', label: 'บ้านเดี่ยว' },
      { value: 'semi-detached', label: 'บ้านแฝด' },
      { value: 'townhome', label: 'ทาวน์โฮม / ทาวน์เฮาส์' },
      { value: 'other', label: 'อาคารพักอาศัยอื่น ๆ' },
      { value: 'unknown', label: 'ไม่แน่ใจ' },
    ],
  },
  {
    id: 'roof',
    title: 'รู้ข้อมูลหลังคาคร่าว ๆ ไหม?',
    reason: 'ข้อมูลวัสดุและเงาบังช่วยให้ช่วงประมาณการแคบลง แต่ไม่จำเป็นต้องเดา',
    type: 'roof',
    required: true,
    analyticsEvent: 'estimate_step_completed',
  },
  {
    id: 'timing',
    title: 'ถ้าเหมาะกับบ้าน คุณคิดว่าจะติดประมาณเมื่อไร?',
    reason: 'ช่วยให้ขั้นตอนต่อไปเหมาะกับจังหวะการตัดสินใจของคุณ',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: '0-3', label: 'ภายใน 3 เดือน' },
      { value: '3-6', label: '3–6 เดือน' },
      { value: '6-12', label: '6–12 เดือน' },
      { value: '12+', label: 'เกิน 1 ปี' },
      { value: 'research', label: 'ตอนนี้แค่ศึกษาข้อมูล' },
    ],
  },
  {
    id: 'energyInterest',
    title: 'สนใจอะไรเป็นพิเศษ?',
    reason: 'ช่วยแยกคำถามเรื่องระบบโซลาร์กับแบตเตอรี่โดยไม่บังคับให้ตัดสินใจตอนนี้',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'solar', label: 'Solar Rooftop' },
      { value: 'solar-battery', label: 'Solar + Battery' },
      { value: 'unknown', label: 'ยังไม่แน่ใจ' },
    ],
  },
];
