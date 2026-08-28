export type EstimateQuestionType = 'province' | 'bill' | 'choice' | 'multichoice';
export type EstimateOption = { value: string; label: string; description?: string };

export type EstimateQuestion = {
  id: 'province' | 'monthlyBillThb' | 'propertyType' | 'roofArea' | 'daytimePattern' | 'daytimeLoads' | 'roofMaterial' | 'shade';
  title: string;
  reason: string;
  type: EstimateQuestionType;
  options?: EstimateOption[];
};

const th: EstimateQuestion[] = [
  { id: 'province', title: 'สถานที่ติดตั้งอยู่จังหวัดไหน?', reason: 'จังหวัดช่วยปรับค่าพลังงานแสงอาทิตย์ โดยไม่ต้องกรอกที่อยู่เต็ม', type: 'province' },
  { id: 'monthlyBillThb', title: 'ค่าไฟต่อเดือนโดยเฉลี่ยเท่าไร?', reason: 'ใช้ยอดจากเดือนปกติที่ใกล้เคียงค่าเฉลี่ย ไม่ต้องหาเลขหน่วยไฟ', type: 'bill' },
  { id: 'propertyType', title: 'สถานที่เป็นประเภทไหน?', reason: 'ประเภทอาคารช่วยเลือกรูปแบบการใช้ไฟและข้อจำกัดขนาดระบบที่เหมาะสม', type: 'choice', options: [
    { value: 'detached-home', label: 'บ้านเดี่ยวหรือบังกะโล' }, { value: 'townhouse', label: 'ทาวน์เฮาส์หรือบ้านแฝด' }, { value: 'large-home', label: 'บ้านขนาดใหญ่หรือบ้านหรู' }, { value: 'shophouse', label: 'อาคารพาณิชย์หรือธุรกิจขนาดเล็ก' }, { value: 'warehouse', label: 'โกดังหรืออาคารเชิงพาณิชย์' }, { value: 'apartment-building', label: 'อพาร์ตเมนต์หรืออาคารชุด' }, { value: 'other', label: 'ประเภทอื่น' },
  ] },
  { id: 'roofArea', title: 'มีพื้นที่หลังคาที่น่าจะติดแผงได้ประมาณเท่าไร?', reason: 'เลือกช่วงคร่าว ๆ ได้ ผู้ติดตั้งจะวัดพื้นที่จริงอีกครั้ง', type: 'choice', options: [
    { value: 'under-30', label: 'น้อยกว่า 30 ตร.ม.' }, { value: '30-60', label: '30–60 ตร.ม.' }, { value: '60-100', label: '60–100 ตร.ม.' }, { value: '100-200', label: '100–200 ตร.ม.' }, { value: 'over-200', label: 'มากกว่า 200 ตร.ม.' }, { value: 'unsure', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'daytimePattern', title: 'ช่วงกลางวันใช้ไฟมากแค่ไหน?', reason: 'ไฟที่ใช้ขณะมีแดดมีผลต่อเงินที่ประหยัดได้มากที่สุด', type: 'choice', options: [
    { value: 'very-low', label: 'น้อยมาก', description: 'แทบไม่มีอุปกรณ์หลักทำงาน' }, { value: 'low', label: 'น้อย', description: 'มีอุปกรณ์พื้นฐานบางส่วน' }, { value: 'moderate', label: 'ปานกลาง', description: 'ใช้แอร์หรืออุปกรณ์เป็นช่วง ๆ' }, { value: 'high', label: 'มาก', description: 'มีหลายอุปกรณ์ทำงานสม่ำเสมอ' }, { value: 'very-high', label: 'มากเป็นพิเศษ', description: 'ธุรกิจ เครื่องจักร หรือโหลดต่อเนื่อง' },
  ] },
  { id: 'daytimeLoads', title: 'อะไรใช้ไฟเป็นประจำช่วงกลางวัน?', reason: 'เลือกได้หลายข้อ เพื่อปรับสัดส่วนไฟโซลาร์ที่คาดว่าจะใช้ได้เอง', type: 'multichoice', options: [
    { value: 'air-conditioning', label: 'เครื่องปรับอากาศ' }, { value: 'pump', label: 'ปั๊มน้ำหรือปั๊มสระ' }, { value: 'ev', label: 'ชาร์จรถไฟฟ้า' }, { value: 'office-equipment', label: 'อุปกรณ์สำนักงาน' }, { value: 'business-equipment', label: 'อุปกรณ์ธุรกิจหรือเครื่องจักร' }, { value: 'laundry-cooking', label: 'ซักผ้า อบผ้า หรือทำอาหาร' }, { value: 'other-high-use', label: 'อุปกรณ์ใช้ไฟสูงอื่น ๆ' }, { value: 'none', label: 'ไม่มีรายการเหล่านี้' },
  ] },
  { id: 'roofMaterial', title: 'หลังคาหลักทำจากวัสดุอะไร?', reason: 'วัสดุมีผลต่อการติดตั้งและสิ่งที่ผู้ติดตั้งต้องตรวจหน้างาน', type: 'choice', options: [
    { value: 'concrete-tile', label: 'กระเบื้องคอนกรีต' }, { value: 'clay-tile', label: 'กระเบื้องดินเผา' }, { value: 'fibre-cement', label: 'กระเบื้องไฟเบอร์ซีเมนต์' }, { value: 'metal-sheet', label: 'เมทัลชีท' }, { value: 'flat-concrete', label: 'คอนกรีตแบนหรือดาดฟ้า' }, { value: 'other', label: 'วัสดุอื่น' }, { value: 'unsure', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'shade', title: 'หลังคามีเงาจากต้นไม้ อาคาร หรือสิ่งกีดขวางมากแค่ไหน?', reason: 'ตอบจากที่สังเกตได้ ไม่ต้องคำนวณเป็นเปอร์เซ็นต์', type: 'choice', options: [
    { value: 'almost-none', label: 'แทบไม่มี' }, { value: 'little', label: 'เล็กน้อย' }, { value: 'some', label: 'ปานกลาง' }, { value: 'a-lot', label: 'มาก' }, { value: 'unsure', label: 'ไม่แน่ใจ' },
  ] },
];

const en: EstimateQuestion[] = [
  { id: 'province', title: 'Which province is the property in?', reason: 'The province adjusts local solar production without requiring your exact address.', type: 'province' },
  { id: 'monthlyBillThb', title: 'What is a typical monthly electricity bill?', reason: 'Use a normal month. You do not need to find the kWh figure.', type: 'bill' },
  { id: 'propertyType', title: 'What type of property is it?', reason: 'Property type helps us choose a suitable load profile and starting system size.', type: 'choice', options: [
    { value: 'detached-home', label: 'Detached home or bungalow' }, { value: 'townhouse', label: 'Townhouse or semi-detached home' }, { value: 'large-home', label: 'Large or luxury home' }, { value: 'shophouse', label: 'Shophouse or small business' }, { value: 'warehouse', label: 'Warehouse or commercial building' }, { value: 'apartment-building', label: 'Apartment or condominium building' }, { value: 'other', label: 'Another property type' },
  ] },
  { id: 'roofArea', title: 'About how much usable roof space is available?', reason: 'A broad estimate is enough. An installer will measure it later.', type: 'choice', options: [
    { value: 'under-30', label: 'Under 30 m²' }, { value: '30-60', label: '30–60 m²' }, { value: '60-100', label: '60–100 m²' }, { value: '100-200', label: '100–200 m²' }, { value: 'over-200', label: 'More than 200 m²' }, { value: 'unsure', label: 'Unsure' },
  ] },
  { id: 'daytimePattern', title: 'How much electricity is used during the day?', reason: 'Electricity used while the sun is shining has the greatest effect on savings.', type: 'choice', options: [
    { value: 'very-low', label: 'Very low', description: 'Almost no major equipment runs' }, { value: 'low', label: 'Low', description: 'A few basic appliances run' }, { value: 'moderate', label: 'Moderate', description: 'Air conditioning or appliances run at times' }, { value: 'high', label: 'High', description: 'Several appliances run regularly' }, { value: 'very-high', label: 'Very high', description: 'Business equipment, machinery or continuous loads' },
  ] },
  { id: 'daytimeLoads', title: 'What regularly uses electricity during the day?', reason: 'Select all that apply. This adjusts the likely share of solar used on site.', type: 'multichoice', options: [
    { value: 'air-conditioning', label: 'Air conditioning' }, { value: 'pump', label: 'Pool or water pump' }, { value: 'ev', label: 'EV charging' }, { value: 'office-equipment', label: 'Office equipment' }, { value: 'business-equipment', label: 'Business equipment or machinery' }, { value: 'laundry-cooking', label: 'Laundry or cooking appliances' }, { value: 'other-high-use', label: 'Other high-use equipment' }, { value: 'none', label: 'None of these' },
  ] },
  { id: 'roofMaterial', title: 'What is the main roof surface made from?', reason: 'The material affects installation work and what an installer must check on site.', type: 'choice', options: [
    { value: 'concrete-tile', label: 'Concrete roof tiles' }, { value: 'clay-tile', label: 'Clay tiles' }, { value: 'fibre-cement', label: 'Fibre-cement tiles' }, { value: 'metal-sheet', label: 'Metal sheet' }, { value: 'flat-concrete', label: 'Flat concrete roof or rooftop' }, { value: 'other', label: 'Another material' }, { value: 'unsure', label: 'Unsure' },
  ] },
  { id: 'shade', title: 'How much is the roof shaded by trees, buildings or other obstructions?', reason: 'Answer from what you can observe; no percentage is needed.', type: 'choice', options: [
    { value: 'almost-none', label: 'Almost none' }, { value: 'little', label: 'A little' }, { value: 'some', label: 'Some' }, { value: 'a-lot', label: 'A lot' }, { value: 'unsure', label: 'Unsure' },
  ] },
];

export const estimateFlow = th;
export const estimateFlowEn = en;
