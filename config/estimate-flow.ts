export type EstimateQuestionType = 'address' | 'energy' | 'period' | 'tariff' | 'choice' | 'multichoice';

export type EstimateOption = { value: string; label: string; description?: string };

export type EstimateQuestion = {
  id: 'location' | 'electricity' | 'consumptionPeriod' | 'tariffType' | 'daytimePattern' | 'daytimeLoads' | 'roofMaterial' | 'shade';
  title: string;
  reason: string;
  type: EstimateQuestionType;
  options?: EstimateOption[];
};

const th: EstimateQuestion[] = [
  { id: 'location', title: 'บ้านที่จะติดโซลาร์อยู่ที่ไหน?', reason: 'ที่อยู่ช่วยระบุตำแหน่งและจังหวัดเพื่อปรับค่าพลังงานแสงอาทิตย์ โดย SolarMatch ไม่บันทึกหรือส่งที่อยู่ให้ผู้ติดตั้ง', type: 'address' },
  { id: 'electricity', title: 'คุณมีข้อมูลแบบไหนจากบิลค่าไฟ?', reason: 'จำนวนหน่วย kWh ให้ค่าประมาณที่ตรงกว่ายอดเงิน แต่ใช้ยอดเงินได้หากหา kWh ไม่เจอ', type: 'energy' },
  { id: 'consumptionPeriod', title: 'ตัวเลขนี้มาจากช่วงไหน?', reason: 'ค่าเฉลี่ยหลายเดือนช่วยลดความคลาดเคลื่อนจากฤดูกาล', type: 'period', options: [
    { value: 'average-12', label: 'ค่าเฉลี่ย 12 เดือน' }, { value: 'average-3', label: 'ค่าเฉลี่ย 3 เดือน' }, { value: 'latest', label: 'เดือนล่าสุด' }, { value: 'typical', label: 'เดือนที่ค่าไฟค่อนข้างปกติ' }, { value: 'unknown', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'tariffType', title: 'ในบิลมีคำว่า TOU, On Peak หรือ Off Peak ไหม?', reason: 'อัตรา TOU และค่าไฟที่จ่ายผ่านโครงการต้องคำนวณต่างจากอัตราบ้านอยู่อาศัยมาตรฐาน', type: 'tariff', options: [
    { value: 'standard', label: 'ไม่มี', description: 'อัตราบ้านอยู่อาศัยมาตรฐาน' }, { value: 'tou', label: 'มี', description: 'บิลแยก On Peak และ Off Peak' }, { value: 'private', label: 'จ่ายผ่านเจ้าของโครงการหรือผู้ให้เช่า' }, { value: 'unknown', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'daytimePattern', title: 'วันธรรมดาช่วงประมาณ 9 โมงเช้าถึง 4 โมงเย็น บ้านเป็นแบบไหนบ่อยที่สุด?', reason: 'โซลาร์มีมูลค่ามากที่สุดเมื่อบ้านใช้ไฟระหว่างที่ระบบกำลังผลิต', type: 'choice', options: [
    { value: 'mostly-empty', label: 'ส่วนใหญ่ไม่มีคนอยู่บ้าน' }, { value: 'light-use', label: 'มีคนอยู่ แต่ใช้ไฟไม่มาก' }, { value: 'work-or-ac', label: 'มีคนทำงานที่บ้านหรือเปิดแอร์บางช่วง' }, { value: 'regular-loads', label: 'ใช้แอร์ ปั๊ม หรืออุปกรณ์หลายอย่างเป็นประจำ' }, { value: 'unknown', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'daytimeLoads', title: 'อุปกรณ์อะไรทำงานเป็นประจำช่วงกลางวัน?', reason: 'เลือกได้หลายข้อ เราใช้เพื่อจัดกลุ่มรูปแบบการใช้ไฟ ไม่ได้เดาหน่วยไฟของอุปกรณ์แบบตายตัว', type: 'multichoice', options: [
    { value: 'air-conditioning', label: 'เครื่องปรับอากาศ' }, { value: 'pump', label: 'ปั๊มสระว่ายน้ำหรือปั๊มน้ำ' }, { value: 'ev', label: 'ชาร์จรถไฟฟ้าที่บ้าน' }, { value: 'home-office', label: 'อุปกรณ์สำนักงานที่บ้าน' }, { value: 'home-business', label: 'อุปกรณ์กิจการที่บ้าน' }, { value: 'laundry-cooking', label: 'ซักผ้า อบผ้า หรือทำอาหาร' }, { value: 'none', label: 'ไม่มีรายการเหล่านี้เป็นประจำ' }, { value: 'unknown', label: 'ไม่แน่ใจ' },
  ] },
  { id: 'roofMaterial', title: 'หลังคาส่วนที่จะติดแผงเป็นวัสดุอะไร?', reason: 'วัสดุช่วยเตรียมคำถามสำหรับผู้ติดตั้ง แต่ยังไม่ถูกใช้เพิ่มราคาโดยอัตโนมัติ', type: 'choice', options: [
    { value: 'concrete-tile', label: 'กระเบื้องคอนกรีต' }, { value: 'clay-tile', label: 'กระเบื้องดินเผา' }, { value: 'fibre-cement', label: 'กระเบื้องไฟเบอร์ซีเมนต์' }, { value: 'metal-sheet', label: 'เมทัลชีท' }, { value: 'flat-concrete', label: 'คอนกรีตแบนหรือดาดฟ้า' }, { value: 'other', label: 'วัสดุอื่น' }, { value: 'unknown', label: 'ไม่ทราบ' },
  ] },
  { id: 'shade', title: 'ช่วงประมาณ 10 โมงเช้าถึง 3 โมงเย็น หลังคามีเงาจากต้นไม้ อาคาร หรือสิ่งกีดขวางไหม?', reason: 'ตอบจากสิ่งที่เห็นได้ ไม่ต้องคำนวณเป็นเปอร์เซ็นต์', type: 'choice', options: [
    { value: 'none', label: 'แทบไม่มีเงา' }, { value: 'short', label: 'มีเงาเฉพาะช่วงสั้น ๆ' }, { value: 'several-hours', label: 'มีเงาหลายชั่วโมง' }, { value: 'heavy', label: 'มีเงามากเกือบทั้งช่วงกลางวัน' }, { value: 'unknown', label: 'ไม่แน่ใจ' },
  ] },
];

const en: EstimateQuestion[] = [
  { id: 'location', title: 'Where is the home you are considering for solar?', reason: 'The address helps identify the location and province for the solar-resource estimate. SolarMatch does not save it or send it to installers.', type: 'address' },
  { id: 'electricity', title: 'Which electricity figure can you provide?', reason: 'Electricity use in kWh is more precise, but the bill total works if you cannot find it.', type: 'energy' },
  { id: 'consumptionPeriod', title: 'What period does this figure represent?', reason: 'An average from several months reduces seasonal uncertainty.', type: 'period', options: [
    { value: 'average-12', label: 'A 12-month average' }, { value: 'average-3', label: 'A 3-month average' }, { value: 'latest', label: 'The latest month' }, { value: 'typical', label: 'A fairly typical month' }, { value: 'unknown', label: 'Not sure' },
  ] },
  { id: 'tariffType', title: 'Does the bill show TOU, On Peak or Off Peak usage?', reason: 'TOU and privately billed electricity cannot be calculated as a standard residential tariff.', type: 'tariff', options: [
    { value: 'standard', label: 'No', description: 'Standard residential tariff' }, { value: 'tou', label: 'Yes', description: 'The bill separates On Peak and Off Peak' }, { value: 'private', label: 'I pay a landlord or development' }, { value: 'unknown', label: 'Not sure' },
  ] },
  { id: 'daytimePattern', title: 'On a typical weekday between about 9am and 4pm, which best describes the home?', reason: 'Solar is most valuable when the home uses electricity while the system is producing.', type: 'choice', options: [
    { value: 'mostly-empty', label: 'The home is mostly empty' }, { value: 'light-use', label: 'Someone is home, but electricity use is light' }, { value: 'work-or-ac', label: 'Someone works from home or uses air conditioning for part of the day' }, { value: 'regular-loads', label: 'Air conditioning, pumps or several appliances run regularly' }, { value: 'unknown', label: 'Not sure' },
  ] },
  { id: 'daytimeLoads', title: 'Which of these regularly operate during the day?', reason: 'Select all that apply. We use this to classify the load pattern, not to invent exact appliance consumption.', type: 'multichoice', options: [
    { value: 'air-conditioning', label: 'Air conditioning' }, { value: 'pump', label: 'Pool or water pump' }, { value: 'ev', label: 'EV charging' }, { value: 'home-office', label: 'Home-office equipment' }, { value: 'home-business', label: 'Home-business equipment' }, { value: 'laundry-cooking', label: 'Laundry or cooking appliances' }, { value: 'none', label: 'None regularly' }, { value: 'unknown', label: 'Not sure' },
  ] },
  { id: 'roofMaterial', title: 'What is the main roof surface made from?', reason: 'The material helps prepare installer questions, but it does not automatically change the planning price yet.', type: 'choice', options: [
    { value: 'concrete-tile', label: 'Concrete roof tiles' }, { value: 'clay-tile', label: 'Clay tiles' }, { value: 'fibre-cement', label: 'Fibre-cement tiles' }, { value: 'metal-sheet', label: 'Metal sheet' }, { value: 'flat-concrete', label: 'Flat concrete roof or rooftop' }, { value: 'other', label: 'Another material' }, { value: 'unknown', label: 'I do not know' },
  ] },
  { id: 'shade', title: 'Between about 10am and 3pm, is the roof shaded by trees, buildings or other obstructions?', reason: 'Answer from what you can observe; there is no need to estimate a percentage.', type: 'choice', options: [
    { value: 'none', label: 'Little or no shade' }, { value: 'short', label: 'Shade for a short part of the day' }, { value: 'several-hours', label: 'Shade for several hours' }, { value: 'heavy', label: 'Heavily shaded for most of the day' }, { value: 'unknown', label: 'Not sure' },
  ] },
];

export const estimateFlow = th;
export const estimateFlowEn = en;
