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

export const estimateFlowEn: EstimateQuestion[] = [
  {
    id: 'province',
    title: 'Which province is the home you are considering for solar in?',
    reason: 'This helps us adjust assumptions and understand future installer coverage.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'bangkok', label: 'Bangkok' },
      { value: 'nonthaburi', label: 'Nonthaburi' },
      { value: 'pathum-thani', label: 'Pathum Thani' },
      { value: 'samut-prakan', label: 'Samut Prakan' },
      { value: 'other', label: 'Another province' },
    ],
  },
  {
    id: 'monthlyBillThb',
    title: 'About how much is the home’s usual monthly electricity bill?',
    reason: 'This helps us estimate electricity use and an initial system-size range.',
    type: 'number',
    required: true,
    analyticsEvent: 'estimate_step_completed',
  },
  {
    id: 'daytimeUsage',
    title: 'How much electricity does the home use during the day?',
    reason: 'Solar generates during daylight hours, so this affects how much solar energy the home may use directly.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'high', label: 'High', description: 'People are home, with air conditioning, pumps, or home-working loads during the day.' },
      { value: 'medium', label: 'Moderate', description: 'Electricity use is spread fairly evenly across daytime and evening.' },
      { value: 'low', label: 'Low', description: 'The home is mostly empty during the day and the main loads occur in the evening or at night.' },
      { value: 'unknown', label: 'Not sure' },
    ],
  },
  {
    id: 'authority',
    title: 'Is this your home or a family home?',
    reason: 'A real installation requires someone with authority over the property to be involved in the decision.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'owner', label: 'I own the home' },
      { value: 'family', label: 'I decide together with my family' },
      { value: 'renter', label: 'I rent the home' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'propertyType',
    title: 'Which property type is the closest match?',
    reason: 'The building type helps us explain likely roof-space constraints more clearly.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'detached', label: 'Detached house' },
      { value: 'semi-detached', label: 'Semi-detached house' },
      { value: 'townhome', label: 'Townhome / townhouse' },
      { value: 'other', label: 'Another residential building' },
      { value: 'unknown', label: 'Not sure' },
    ],
  },
  {
    id: 'roof',
    title: 'Do you know any basic details about the roof?',
    reason: 'Roof material and shade can narrow the estimate, but there is no need to guess.',
    type: 'roof',
    required: true,
    analyticsEvent: 'estimate_step_completed',
  },
  {
    id: 'timing',
    title: 'If solar suits the home, when might you install it?',
    reason: 'This helps any future next step fit your decision timeline.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: '0-3', label: 'Within 3 months' },
      { value: '3-6', label: '3–6 months' },
      { value: '6-12', label: '6–12 months' },
      { value: '12+', label: 'More than 1 year' },
      { value: 'research', label: 'I am only researching for now' },
    ],
  },
  {
    id: 'energyInterest',
    title: 'What are you most interested in?',
    reason: 'This separates solar-only and battery questions without forcing a decision now.',
    type: 'choice',
    required: true,
    analyticsEvent: 'estimate_step_completed',
    options: [
      { value: 'solar', label: 'Rooftop solar' },
      { value: 'solar-battery', label: 'Solar + battery' },
      { value: 'unknown', label: 'Not sure yet' },
    ],
  },
];
