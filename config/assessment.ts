import type { AssessmentQuestion, QuestionnaireDocument } from '@/lib/questionnaire/types';

const residentialCoreQuestions: AssessmentQuestion[] = [
  {
    id: 'province', type: 'province', required: true,
    title: { en: 'Where is the property located?', th: 'บ้านหรือที่พักอาศัยนี้อยู่ที่ไหน?' },
    help: {
      en: 'Choose a Greater Bangkok province, or select “Other area” and tell us the province, district or area. You do not need to enter a full street address.',
      th: 'เลือกจังหวัดในกรุงเทพฯ และปริมณฑล หรือเลือก “พื้นที่อื่น” แล้วระบุจังหวัด อำเภอ หรือพื้นที่ใกล้เคียง โดยไม่ต้องกรอกที่อยู่เต็ม',
    },
    conditionalFields: [{
      id: 'customLocation', whenOption: 'other', kind: 'text', required: true, minLength: 2, maxLength: 100,
      label: { en: 'Province, district or area', th: 'จังหวัด อำเภอ หรือพื้นที่' },
      placeholder: { en: 'e.g. Chiang Mai or Bang Lamung, Chonburi', th: 'เช่น เชียงใหม่ หรือบางละมุง จ.ชลบุรี' },
    }],
    relevance: { calculation: true, qualification: false, scoring: true },
  },
  {
    id: 'monthlyBillThb', type: 'bill', required: true,
    title: { en: 'About how much is the electricity bill in a typical month?', th: 'ค่าไฟในเดือนปกติโดยเฉลี่ยประมาณเท่าไร?' },
    help: {
      en: 'Use a normal month that is close to your usual spending. You do not need to find the kWh figure.',
      th: 'ใช้ยอดจากเดือนที่ใกล้เคียงการใช้ไฟตามปกติ ไม่ต้องหาเลขหน่วยไฟ (kWh)',
    },
    relevance: { calculation: true, qualification: false, scoring: true },
  },
  {
    id: 'propertyType', type: 'choice', required: true,
    title: { en: 'What kind of home is this?', th: 'เป็นบ้านหรือที่พักอาศัยประเภทใด?' },
    help: {
      en: 'This helps us understand the likely roof space and electricity-use pattern.',
      th: 'ข้อมูลนี้ช่วยประเมินพื้นที่หลังคาและรูปแบบการใช้ไฟโดยคร่าว ๆ',
    },
    options: [
      { value: 'detached-home', label: { en: 'Detached house', th: 'บ้านเดี่ยว' } },
      { value: 'semi-detached-home', label: { en: 'Semi-detached house', th: 'บ้านแฝด' } },
      { value: 'townhouse', label: { en: 'Townhouse or row house', th: 'ทาวน์เฮาส์หรือบ้านแถว' } },
      { value: 'large-home', label: { en: 'Large or luxury home', th: 'บ้านขนาดใหญ่หรือบ้านหรู' } },
      { value: 'other-residential', label: { en: 'Other residential property', th: 'ที่พักอาศัยประเภทอื่น' } },
    ],
    conditionalFields: [{
      id: 'customPropertyType', whenOption: 'other-residential', kind: 'text', required: true, minLength: 2, maxLength: 100,
      label: { en: 'Please specify the residential property type', th: 'โปรดระบุประเภทที่พักอาศัย' },
      placeholder: { en: 'e.g. a family compound', th: 'เช่น บ้านพักหลายหลังในรั้วเดียวกัน' },
    }],
    relevance: { calculation: false, qualification: false, scoring: true },
  },
  {
    id: 'ownershipStatus', type: 'choice', required: true,
    title: { en: 'What is your relationship to this property?', th: 'คุณมีสถานะอย่างไรกับบ้านหรือที่พักอาศัยนี้?' },
    help: {
      en: 'This helps determine who can approve a rooftop installation.',
      th: 'ข้อมูลนี้ช่วยให้ทราบว่าใครสามารถอนุมัติการติดตั้งบนหลังคาได้',
    },
    options: [
      { value: 'owner', label: { en: 'I own the property', th: 'เป็นเจ้าของกรรมสิทธิ์' } },
      { value: 'renter', label: { en: 'I rent the property', th: 'เป็นผู้เช่า' } },
      { value: 'other', label: { en: 'Another residential arrangement', th: 'มีสิทธิอยู่อาศัยในรูปแบบอื่น' } },
    ],
    relevance: { calculation: false, qualification: true, scoring: true },
  },
  {
    id: 'roofArea', type: 'choice', required: true,
    title: { en: 'About how much roof space may be available for solar panels?', th: 'คาดว่ามีพื้นที่หลังคาสำหรับติดแผงโซลาร์ประมาณเท่าไร?' },
    help: {
      en: 'A rough range is enough. A solar company will measure it during a site assessment.',
      th: 'เลือกช่วงคร่าว ๆ ได้ บริษัทโซลาร์จะวัดพื้นที่จริงตอนประเมินหน้างาน',
    },
    options: [
      { value: 'under-30', label: { en: 'Under 30 m²', th: 'น้อยกว่า 30 ตร.ม.' } },
      { value: '30-60', label: { en: '30–60 m²', th: '30–60 ตร.ม.' } },
      { value: '60-100', label: { en: '60–100 m²', th: '60–100 ตร.ม.' } },
      { value: '100-200', label: { en: '100–200 m²', th: '100–200 ตร.ม.' } },
      { value: 'over-200', label: { en: 'More than 200 m²', th: 'มากกว่า 200 ตร.ม.' } },
      { value: 'unsure', label: { en: 'Unsure', th: 'ไม่แน่ใจ' } },
    ],
    relevance: { calculation: true, qualification: false, scoring: true },
  },
  {
    id: 'daytimePattern', type: 'choice', required: true,
    title: { en: 'How much electricity does the home typically use during the day?', th: 'โดยปกติบ้านนี้ใช้ไฟช่วงกลางวันมากแค่ไหน?' },
    help: {
      en: 'Daytime use affects how much solar electricity the home can use directly.',
      th: 'การใช้ไฟช่วงกลางวันมีผลต่อปริมาณไฟโซลาร์ที่บ้านนำไปใช้ได้ทันที',
    },
    options: [
      { value: 'very-low', label: { en: 'Very low', th: 'น้อยมาก' }, description: { en: 'Most major appliances are off', th: 'อุปกรณ์หลักส่วนใหญ่ปิดอยู่' } },
      { value: 'low', label: { en: 'Low', th: 'น้อย' }, description: { en: 'Only a few appliances run', th: 'มีอุปกรณ์เพียงไม่กี่อย่างทำงาน' } },
      { value: 'moderate', label: { en: 'Moderate', th: 'ปานกลาง' }, description: { en: 'Some air conditioning or appliances run regularly', th: 'มีการใช้แอร์หรือเครื่องใช้ไฟฟ้าบางส่วนเป็นประจำ' } },
      { value: 'high', label: { en: 'High', th: 'มาก' }, description: { en: 'Several appliances run for much of the day', th: 'มีเครื่องใช้ไฟฟ้าหลายอย่างทำงานเกือบตลอดช่วงกลางวัน' } },
      { value: 'very-high', label: { en: 'Very high', th: 'มากเป็นพิเศษ' }, description: { en: 'Air conditioning and several high-use appliances run for long periods', th: 'เปิดแอร์และอุปกรณ์ที่ใช้ไฟสูงหลายอย่างเป็นเวลานาน' } },
    ],
    relevance: { calculation: true, qualification: false, scoring: true },
  },
  {
    id: 'daytimeLoads', type: 'multichoice', required: true,
    title: { en: 'Which appliances regularly run during the day?', th: 'มีอุปกรณ์ใดใช้เป็นประจำในช่วงกลางวันบ้าง?' },
    help: { en: 'Select all that apply.', th: 'เลือกได้มากกว่าหนึ่งข้อ' },
    options: [
      { value: 'air-conditioning', label: { en: 'Air conditioning', th: 'เครื่องปรับอากาศ' } },
      { value: 'pump', label: { en: 'Pool or water pump', th: 'ปั๊มน้ำหรือปั๊มสระ' } },
      { value: 'ev', label: { en: 'EV charging', th: 'การชาร์จรถยนต์ไฟฟ้า' } },
      { value: 'home-office-equipment', label: { en: 'Home-office computers or equipment', th: 'คอมพิวเตอร์หรืออุปกรณ์ทำงานที่บ้าน' } },
      { value: 'laundry-cooking', label: { en: 'Laundry or cooking appliances', th: 'เครื่องซักผ้า เครื่องอบผ้า หรืออุปกรณ์ทำอาหาร' } },
      { value: 'other-high-use', label: { en: 'Other high-use household equipment', th: 'อุปกรณ์ในบ้านที่ใช้ไฟสูงอื่น ๆ' } },
      { value: 'none', label: { en: 'None of these', th: 'ไม่มีรายการเหล่านี้' }, exclusive: true },
    ],
    conditionalFields: [
      {
        id: 'customDaytimeLoad', whenOption: 'other-high-use', kind: 'text', required: true, minLength: 2, maxLength: 120,
        label: { en: 'What other equipment runs during the day?', th: 'มีอุปกรณ์อื่นใดใช้เป็นประจำช่วงกลางวัน?' },
        placeholder: { en: 'e.g. a large water heater', th: 'เช่น เครื่องทำน้ำร้อนขนาดใหญ่' },
      },
      {
        id: 'airConditionerCount', whenOption: 'air-conditioning', kind: 'ac-count', required: true,
        label: { en: 'How many air-conditioning units are installed at this property?', th: 'บ้านหรือที่พักอาศัยนี้ติดตั้งเครื่องปรับอากาศทั้งหมดกี่เครื่อง?' },
        help: { en: 'Count installed units, even if they are not all used at the same time.', th: 'นับจำนวนเครื่องที่ติดตั้งทั้งหมด แม้จะไม่ได้เปิดพร้อมกัน' },
      },
    ],
    relevance: { calculation: true, qualification: true, scoring: true },
  },
  {
    id: 'roofMaterial', type: 'choice', required: true,
    title: { en: 'What is the main roof surface made from?', th: 'หลังคาหลักทำจากวัสดุอะไร?' },
    help: {
      en: 'The material affects installation work and what a solar company must check on site.',
      th: 'วัสดุหลังคามีผลต่อวิธีติดตั้งและสิ่งที่บริษัทโซลาร์ต้องตรวจหน้างาน',
    },
    options: [
      { value: 'concrete-tile', label: { en: 'Concrete roof tiles', th: 'กระเบื้องคอนกรีต' } },
      { value: 'clay-tile', label: { en: 'Clay tiles', th: 'กระเบื้องดินเผา' } },
      { value: 'fibre-cement', label: { en: 'Fibre-cement tiles', th: 'กระเบื้องไฟเบอร์ซีเมนต์' } },
      { value: 'metal-sheet', label: { en: 'Metal sheet', th: 'เมทัลชีท' } },
      { value: 'flat-concrete', label: { en: 'Flat concrete roof or rooftop', th: 'หลังคาคอนกรีตแบนหรือดาดฟ้า' } },
      { value: 'other', label: { en: 'Another material', th: 'วัสดุอื่น' } },
      { value: 'unsure', label: { en: 'Unsure', th: 'ไม่แน่ใจ' } },
    ],
    conditionalFields: [{
      id: 'customRoofMaterial', whenOption: 'other', kind: 'text', required: true, minLength: 2, maxLength: 100,
      label: { en: 'Please specify the roof material', th: 'โปรดระบุวัสดุหลังคา' },
      placeholder: { en: 'e.g. asphalt shingles', th: 'เช่น กระเบื้องยางมะตอย' },
    }],
    relevance: { calculation: false, qualification: false, scoring: true },
  },
  {
    id: 'shade', type: 'choice', required: true,
    title: { en: 'How much is the roof shaded by trees, buildings or other obstructions?', th: 'หลังคามีเงาจากต้นไม้ อาคาร หรือสิ่งกีดขวางมากแค่ไหน?' },
    help: {
      en: 'Answer from what you can observe. You do not need to estimate a percentage.',
      th: 'ตอบจากที่สังเกตได้ โดยไม่ต้องคำนวณเป็นเปอร์เซ็นต์',
    },
    options: [
      { value: 'almost-none', label: { en: 'Almost none', th: 'แทบไม่มี' } },
      { value: 'little', label: { en: 'A little', th: 'เล็กน้อย' } },
      { value: 'some', label: { en: 'Some', th: 'ปานกลาง' } },
      { value: 'a-lot', label: { en: 'A lot', th: 'มาก' } },
      { value: 'unsure', label: { en: 'Unsure', th: 'ไม่แน่ใจ' } },
    ],
    relevance: { calculation: true, qualification: false, scoring: true },
  },
];

const legacyActivePlanningQuestion: AssessmentQuestion = {
  id: 'activelyPlanningSolar', type: 'choice', required: true,
  title: { en: 'Are you actively planning to install solar?', th: 'คุณกำลังวางแผนติดตั้งโซลาร์อยู่หรือไม่?' },
  help: {
    en: 'This helps us understand how close you are to taking the next step.',
    th: 'คำตอบนี้ช่วยให้เราเข้าใจว่าคุณกำลังพิจารณาขั้นตอนต่อไปมากน้อยเพียงใด',
  },
  options: [
    { value: 'yes', label: { en: 'Yes', th: 'ใช่' } },
    { value: 'no', label: { en: 'No', th: 'ไม่ใช่' } },
  ],
  relevance: { calculation: false, qualification: false, scoring: true },
};

const legacyQuoteContactQuestion: AssessmentQuestion = {
  id: 'quoteContactRequested', type: 'choice', required: true,
  title: { en: 'Want real quotes from local installers?', th: 'อยากได้ใบเสนอราคาจริงจากผู้ติดตั้งในพื้นที่ไหม?' },
  help: { en: 'Choose one option to continue.', th: 'เลือกหนึ่งตัวเลือกเพื่อดำเนินการต่อ' },
  options: [
    { value: 'yes', label: { en: 'Yes, I would like solar companies to contact me', th: 'ใช่ ฉันต้องการให้บริษัทโซลาร์ติดต่อ' } },
    { value: 'no', label: { en: 'No', th: 'ไม่ใช่' } },
  ],
  relevance: { calculation: false, qualification: false, scoring: false },
};

const questionsV3: AssessmentQuestion[] = [
  ...residentialCoreQuestions.slice(0, 2),
  legacyActivePlanningQuestion,
  ...residentialCoreQuestions.slice(2),
  legacyQuoteContactQuestion,
];

export const legacyQuestionnaireV3: QuestionnaireDocument = {
  id: 'residential-questionnaire-v3',
  schemaVersion: 6,
  questions: questionsV3,
};

const currentCoreQuestions = residentialCoreQuestions.map((question): AssessmentQuestion => {
  if (question.id === 'province') return {
    ...question,
    help: {
      en: 'Choose the province and district where the property is located. You do not need to enter a full street address.',
      th: 'เลือกจังหวัดและเขตหรืออำเภอที่อสังหาริมทรัพย์ตั้งอยู่ โดยไม่ต้องกรอกที่อยู่เต็ม',
    },
    conditionalFields: undefined,
  };
  if (question.id === 'propertyType') return {
    ...question,
    options: question.options?.map((option) => option.value === 'large-home'
      ? { ...option, label: { en: 'Large detached house', th: 'บ้านเดี่ยวขนาดใหญ่' } }
      : option),
  };
  if (question.id === 'ownershipStatus') return {
    ...question,
    help: {
      en: 'Solar installation requires the property owner’s permission.',
      th: 'การติดตั้งโซลาร์ต้องได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์',
    },
  };
  return question;
});

const activePlanningQuestion: AssessmentQuestion = {
  ...legacyActivePlanningQuestion,
  options: [
    { value: 'within-3-months', label: { en: 'Yes — within 3 months', th: 'ใช่ — ภายใน 3 เดือน' } },
    { value: 'three-six-months', label: { en: 'Yes — within 3–6 months', th: 'ใช่ — ภายใน 3–6 เดือน' } },
    { value: 'six-twelve-months', label: { en: 'Yes — within 6–12 months', th: 'ใช่ — ภายใน 6–12 เดือน' } },
    { value: 'over-twelve-months', label: { en: 'Yes — more than 12 months from now', th: 'ใช่ — อีกมากกว่า 12 เดือน' } },
    { value: 'researching', label: { en: 'No — I am researching and do not have a timeframe yet', th: 'ยังไม่ใช่ — กำลังศึกษาข้อมูลและยังไม่มีกำหนดเวลา' } },
  ],
};

const quoteContactQuestion: AssessmentQuestion = {
  ...legacyQuoteContactQuestion,
  help: {
    en: 'Choose Yes only if you want solar companies to contact you about this request. If you choose No, you will go directly to your estimate without being asked for contact details.',
    th: 'เลือก “ใช่” เฉพาะเมื่อคุณต้องการให้บริษัทโซลาร์ติดต่อเกี่ยวกับคำขอนี้ หากเลือก “ไม่ใช่” คุณจะไปดูผลประเมินได้ทันทีโดยไม่ต้องให้ข้อมูลติดต่อ',
  },
  options: [
    { value: 'yes', label: { en: 'Yes, I would like solar companies to contact me', th: 'ใช่ ฉันต้องการให้บริษัทโซลาร์ติดต่อ' } },
    { value: 'no', label: { en: 'No, show my estimate without installer contact', th: 'ไม่ใช่ ดูผลประเมินโดยไม่ให้ผู้ติดตั้งติดต่อ' } },
  ],
};

function currentQuestion(id: AssessmentQuestion['id']) {
  const question = currentCoreQuestions.find((item) => item.id === id);
  if (!question) throw new Error(`Missing assessment question: ${id}`);
  return question;
}

export const initialQuestionnaire: QuestionnaireDocument = {
  id: 'residential-questionnaire-v4',
  schemaVersion: 7,
  questions: [
    currentQuestion('province'),
    currentQuestion('monthlyBillThb'),
    activePlanningQuestion,
    currentQuestion('propertyType'),
    currentQuestion('ownershipStatus'),
    currentQuestion('daytimePattern'),
    currentQuestion('daytimeLoads'),
    currentQuestion('shade'),
    currentQuestion('roofMaterial'),
    quoteContactQuestion,
  ],
};

export const legacyQuestionnaireV2: QuestionnaireDocument = {
  id: 'residential-questionnaire-v2',
  schemaVersion: 5,
  questions: residentialCoreQuestions,
};

// Immutable compatibility document for historic releases and migration tests.
// New public releases use `initialQuestionnaire` above.
export const legacyQuestionnaireV1: QuestionnaireDocument = {
  id: 'residential-questionnaire-v1',
  schemaVersion: 4,
  questions: [
    ...residentialCoreQuestions,
    {
      id: 'installationTimeframe', type: 'choice', required: true,
      title: { en: 'When are you considering installing solar?', th: 'คุณกำลังวางแผนติดตั้งโซลาร์เมื่อไร?' },
      help: { en: 'A rough timeframe is enough.', th: 'เลือกช่วงเวลาโดยประมาณได้' },
      options: [
        { value: 'asap', label: { en: 'As soon as practical', th: 'ต้องการเริ่มโดยเร็วเมื่อพร้อม' } },
        { value: 'one-three-months', label: { en: 'Within 1–3 months', th: 'ภายใน 1–3 เดือน' } },
        { value: 'three-six-months', label: { en: 'Within 3–6 months', th: 'ภายใน 3–6 เดือน' } },
        { value: 'over-six-months', label: { en: 'More than 6 months', th: 'อีกมากกว่า 6 เดือน' } },
        { value: 'researching', label: { en: 'Researching for now', th: 'กำลังศึกษาข้อมูลอยู่' } },
      ],
      relevance: { calculation: false, qualification: false, scoring: true },
    },
  ],
};
