import type { LocalizedText } from '@/lib/questionnaire/types';

export type LegalSection = { id: string; title: LocalizedText; paragraphs: LocalizedText[]; bullets?: LocalizedText[] };
export type LegalDocumentDraft = {
  type: 'privacy' | 'terms' | 'cookies';
  title: LocalizedText;
  lastUpdatedLabel: LocalizedText;
  effectiveDate: string | null;
  pendingLegalReview: boolean;
  sections: LegalSection[];
};

export type OperatorProfile = {
  legalBusinessNameEn: string;
  legalBusinessNameTh: string;
  legalEntityType: string;
  registrationOrTaxNumber: string;
  registeredAddressEn: string;
  registeredAddressTh: string;
  publicBusinessPhone: string;
  publicBusinessEmail: string;
  privacyContactEmail: string;
  privacyRightsRequestUrl: string;
  leadRetentionDays: number | null;
  leadDistributionWindowDays: number | null;
  privacyNoticeEffectiveDate: string | null;
  termsEffectiveDate: string | null;
  cookiePolicyEffectiveDate: string | null;
  dataHostingAndProcessorDetails: string;
  operatorRepresentativeName: string;
  operatorRepresentativeTitle: string;
};

export const emptyOperatorProfile: OperatorProfile = {
  legalBusinessNameEn: '', legalBusinessNameTh: '', legalEntityType: '', registrationOrTaxNumber: '',
  registeredAddressEn: '', registeredAddressTh: '', publicBusinessPhone: '', publicBusinessEmail: '',
  privacyContactEmail: '', privacyRightsRequestUrl: '', leadRetentionDays: null, leadDistributionWindowDays: null,
  privacyNoticeEffectiveDate: null, termsEffectiveDate: null, cookiePolicyEffectiveDate: null,
  dataHostingAndProcessorDetails: '', operatorRepresentativeName: '', operatorRepresentativeTitle: '',
};

const section = (id: string, enTitle: string, thTitle: string, en: string[], th: string[], enBullets?: string[], thBullets?: string[]): LegalSection => ({
  id,
  title: { en: enTitle, th: thTitle },
  paragraphs: en.map((value, index) => ({ en: value, th: th[index] ?? '' })),
  bullets: enBullets?.map((value, index) => ({ en: value, th: thBullets?.[index] ?? '' })),
});

const privacySections: LegalSection[] = [
  section('who-we-are', '1. Who we are', '1. ผู้ให้บริการ', [
    'SolarMatch Thailand (“SolarMatch”) is an information and referral service operated by [LEGAL BUSINESS NAME EN], a [LEGAL ENTITY TYPE], registration or tax number [BUSINESS REGISTRATION OR TAX NUMBER], with its registered or principal business address at [REGISTERED BUSINESS ADDRESS EN].',
    'For questions about this Privacy Notice or requests concerning personal data, contact [PRIVACY CONTACT EMAIL], [PUBLIC BUSINESS PHONE], or [PRIVACY RIGHTS REQUEST URL].',
  ], [
    'SolarMatch Thailand (“SolarMatch”) เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ดำเนินงานโดย [LEGAL BUSINESS NAME TH] ซึ่งเป็น [LEGAL ENTITY TYPE] เลขทะเบียนนิติบุคคลหรือเลขประจำตัวผู้เสียภาษี [BUSINESS REGISTRATION OR TAX NUMBER] และมีที่อยู่จดทะเบียนหรือสถานประกอบการหลักที่ [REGISTERED BUSINESS ADDRESS TH]',
    'หากมีคำถามเกี่ยวกับประกาศฉบับนี้หรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล โปรดติดต่อ [PRIVACY CONTACT EMAIL], [PUBLIC BUSINESS PHONE] หรือ [PRIVACY RIGHTS REQUEST URL]',
  ]),
  section('scope', '2. What this Privacy Notice covers', '2. ขอบเขตของประกาศ', [
    'This notice explains how SolarMatch collects, uses, stores, protects and shares personal data when a user uses the website, completes a residential solar assessment, requests contact from solar companies, contacts SolarMatch, or exercises privacy rights.',
  ], [
    'ประกาศฉบับนี้อธิบายวิธีที่ SolarMatch เก็บรวบรวม ใช้ จัดเก็บ ปกป้อง และเปิดเผยข้อมูลส่วนบุคคล เมื่อผู้ใช้ใช้เว็บไซต์ ทำแบบประเมินโซลาร์สำหรับที่พักอาศัย ขอให้บริษัทโซลาร์ติดต่อ ติดต่อ SolarMatch หรือใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล',
  ]),
  section('data', '3. Personal data we may collect', '3. ข้อมูลที่อาจเก็บรวบรวม', [
    'Assessment information may include location, residential property type, ownership status, approximate electricity bill, daytime electricity use, relevant appliances, AC count, roof area, material, shade, and other assessment information voluntarily provided.',
    'Contact information may include legal first and last name, Thai mobile number, preferred contact method, and LINE ID when voluntarily provided.',
    'Consent and referral records may include the contact choice, adult/property-authority confirmation, consent and legal-document versions, timestamps, actual recipient companies, fields disclosed, deliveries, withdrawals, objections, suppression, correction and deletion records.',
    'Limited technical and security information may include browser/device information, session and idempotency identifiers, anti-abuse information, protected or hashed network identifiers, cookie preferences, and separately permitted analytics information.',
    'SolarMatch does not intentionally request national identification numbers, bank details, exact income, health information or other sensitive personal data through the standard assessment.',
  ], [
    'ข้อมูลแบบประเมินอาจรวมถึงพื้นที่ ประเภทที่พักอาศัย สถานะต่ออสังหาริมทรัพย์ ค่าไฟโดยประมาณ รูปแบบการใช้ไฟช่วงกลางวัน เครื่องใช้ไฟฟ้าที่เกี่ยวข้อง จำนวนเครื่องปรับอากาศ และพื้นที่ วัสดุ หรือเงาบังของหลังคา รวมถึงข้อมูลอื่นที่ผู้ใช้สมัครใจให้',
    'ข้อมูลติดต่ออาจรวมถึงชื่อจริง นามสกุล หมายเลขโทรศัพท์มือถือไทย ช่องทางที่สะดวกให้ติดต่อ และ LINE ID เมื่อผู้ใช้สมัครใจให้ข้อมูล',
    'บันทึกความยินยอมและการแนะนำลูกค้าอาจรวมถึงการเลือกขอรับการติดต่อ การยืนยันอายุและอำนาจจากเจ้าของ รุ่นของความยินยอมและเอกสารทางกฎหมาย วันเวลา บริษัทที่ได้รับข้อมูลจริง รายการข้อมูลและการส่งข้อมูล ตลอดจนการถอนความยินยอม คัดค้าน ระงับ แก้ไข และลบข้อมูล',
    'ข้อมูลทางเทคนิคและความปลอดภัยที่จำเป็นอาจรวมถึงข้อมูลเบราว์เซอร์และอุปกรณ์ ตัวระบุเซสชันและคำขอ ข้อมูลป้องกันการใช้งานในทางที่ผิด ตัวระบุเครือข่ายที่ปกป้องหรือแฮช การตั้งค่าคุกกี้ และข้อมูลวิเคราะห์ที่ได้รับอนุญาตแยกต่างหาก',
    'SolarMatch ไม่มีเจตนาเก็บเลขบัตรประชาชน ข้อมูลธนาคาร รายได้ที่แน่นอน ข้อมูลสุขภาพ หรือข้อมูลส่วนบุคคลที่มีความอ่อนไหวอื่นผ่านแบบประเมินมาตรฐาน',
  ]),
  section('purposes', '4. Why we use personal data', '4. วัตถุประสงค์ในการใช้ข้อมูล', [
    'SolarMatch may use personal data to provide a preliminary residential solar estimate; process a contact request; assess relevance to participating companies; share information when explicit consent exists; enable contact about a site survey and quotation; record recipients; manage quality, disputes, withdrawals and deletion; prevent abuse; secure the service; meet legal obligations; and answer questions and rights requests.',
  ], [
    'SolarMatch อาจใช้ข้อมูลเพื่อแสดงผลประเมินเบื้องต้น ดำเนินการตามคำขอรับการติดต่อ ประเมินความเกี่ยวข้องกับบริษัทที่เข้าร่วม เปิดเผยข้อมูลเมื่อได้รับความยินยอมโดยชัดแจ้ง ให้บริษัทติดต่อเรื่องสำรวจหน้างานและใบเสนอราคา บันทึกผู้รับข้อมูล จัดการคุณภาพ ข้อพิพาท การถอนความยินยอมและการลบข้อมูล ป้องกันการใช้งานในทางที่ผิด รักษาความปลอดภัย ปฏิบัติตามกฎหมาย และตอบคำถามหรือคำขอใช้สิทธิ',
  ]),
  section('sharing', '5. Sharing with participating solar companies', '5. การเปิดเผยข้อมูลแก่บริษัทโซลาร์', [
    'When the user explicitly consents, SolarMatch may share the user’s name, contact details, location and relevant assessment answers with one or more participating residential solar companies serving that area.',
    'More than one company may receive the same enquiry, and the number may vary. Each recipient may contact the user through the selected method about a residential solar site survey, suitability assessment, quotation and reasonable follow-up connected to that request.',
    'SolarMatch does not authorize recipients to resell the data, disclose it to unrelated companies, use it for unrelated products, add the user to unrelated permanent marketing lists, or continue using it after the permitted purpose and retention period end. Each company may be independently responsible for data it receives.',
  ], [
    'เมื่อผู้ใช้ให้ความยินยอมโดยชัดแจ้ง SolarMatch อาจส่งชื่อ ข้อมูลติดต่อ พื้นที่ และคำตอบที่เกี่ยวข้องให้บริษัทติดตั้งโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมหนึ่งบริษัทหรือมากกว่า ซึ่งให้บริการในพื้นที่ของผู้ใช้',
    'คำขอเดียวกันอาจถูกส่งให้มากกว่าหนึ่งบริษัท และจำนวนบริษัทอาจแตกต่างกัน แต่ละบริษัทอาจติดต่อผ่านช่องทางที่ผู้ใช้เลือกเกี่ยวกับการสำรวจหน้างาน การประเมินความเหมาะสม ใบเสนอราคา และการติดตามที่เกี่ยวข้องโดยสมเหตุสมผล',
    'SolarMatch ไม่อนุญาตให้บริษัทนำข้อมูลไปขายต่อ เปิดเผยแก่ธุรกิจที่ไม่เกี่ยวข้อง ใช้เสนอผลิตภัณฑ์ที่ไม่เกี่ยวข้อง เพิ่มผู้ใช้ในรายชื่อการตลาดถาวรที่ไม่เกี่ยวข้อง หรือใช้ต่อหลังสิ้นสุดวัตถุประสงค์และระยะเวลาเก็บรักษาที่อนุญาต แต่ละบริษัทอาจมีหน้าที่รับผิดชอบโดยอิสระต่อข้อมูลที่ได้รับ',
  ]),
  section('revenue', '6. How SolarMatch earns revenue', '6. รายได้ของ SolarMatch', [
    'SolarMatch may receive payment from participating solar companies for qualified customer introductions. Payment does not give a company unrestricted ownership of personal data. The company may use it only for the disclosed residential-solar referral purpose and according to applicable law and its contract.',
  ], [
    'SolarMatch อาจได้รับค่าตอบแทนจากบริษัทโซลาร์ที่เข้าร่วมสำหรับการแนะนำลูกค้าที่ผ่านเกณฑ์ การชำระเงินไม่ทำให้บริษัทมีสิทธิใช้ข้อมูลอย่างไม่จำกัด บริษัทใช้ข้อมูลได้เฉพาะเพื่อวัตถุประสงค์การแนะนำลูกค้าด้านโซลาร์สำหรับที่พักอาศัยที่แจ้งไว้ ภายใต้กฎหมายและสัญญาที่เกี่ยวข้อง',
  ]),
  section('basis', '7. Legal basis and consent', '7. ฐานการประมวลผลและความยินยอม', [
    'SolarMatch relies on explicit consent to share personal data with participating companies and allow contact for the stated purpose. Choosing No does not prevent the user from receiving the estimate. Where applicable, limited information may also be processed to provide and secure the requested service, retain legally required records, establish or defend legal claims, and comply with law.',
  ], [
    'SolarMatch อาศัยความยินยอมโดยชัดแจ้งในการเปิดเผยข้อมูลและอนุญาตให้บริษัทติดต่อเพื่อวัตถุประสงค์ที่ระบุ ผู้ใช้เลือก “ไม่ต้องการ” และยังได้รับผลประเมินได้ เมื่อเหมาะสม SolarMatch อาจประมวลผลข้อมูลที่จำเป็นเพื่อให้และรักษาความปลอดภัยของบริการ เก็บบันทึกที่กฎหมายกำหนด ก่อตั้ง ใช้ หรือยกข้อต่อสู้สิทธิเรียกร้อง และปฏิบัติตามกฎหมาย',
  ]),
  section('processors', '8. Service providers and international processing', '8. ผู้ให้บริการและการประมวลผลต่างประเทศ', [
    'SolarMatch may use providers for hosting, database/file storage, security, communications, maintenance and separately permitted analytics. Current provider and data-location details: [DATA HOSTING AND PROCESSOR DETAILS]. Some providers may process data outside Thailand; appropriate contractual or legal safeguards will be used where required.',
  ], [
    'SolarMatch อาจใช้ผู้ให้บริการด้านโฮสติ้ง ฐานข้อมูลหรือไฟล์ ความปลอดภัย การสื่อสาร การดูแลซอฟต์แวร์ และการวิเคราะห์ที่ได้รับอนุญาตแยกต่างหาก รายละเอียดผู้ให้บริการและสถานที่ประมวลผล: [DATA HOSTING AND PROCESSOR DETAILS] ผู้ให้บริการบางรายอาจประมวลผลข้อมูลนอกประเทศไทย โดยจะใช้มาตรการทางสัญญาหรือกฎหมายที่เหมาะสมเมื่อจำเป็น',
  ]),
  section('retention', '9. Retention and distribution', '9. ระยะเวลาเก็บรักษาและส่งต่อ', [
    'Lead/contact records are normally retained for [LEAD RETENTION DAYS] days from submission or the latest relevant activity unless an earlier valid deletion applies, consent is withdrawn, law requires retention, or the record is needed for a dispute or claim.',
    'A lead may be disclosed to a new participating company only during [LEAD DISTRIBUTION WINDOW DAYS] days after the contact request. After that, SolarMatch will not disclose it to another company without obtaining new permission where required.',
  ], [
    'โดยปกติ SolarMatch เก็บข้อมูลคำขอและข้อมูลติดต่อเป็นเวลา [LEAD RETENTION DAYS] วัน นับจากวันที่ส่งข้อมูลหรือกิจกรรมที่เกี่ยวข้องล่าสุด เว้นแต่มีคำขอลบที่ใช้บังคับ มีการถอนความยินยอม กฎหมายกำหนดให้เก็บไว้ หรือจำเป็นต่อข้อพิพาทหรือสิทธิเรียกร้อง',
    'SolarMatch อาจส่งข้อมูลให้บริษัทใหม่ได้เฉพาะภายใน [LEAD DISTRIBUTION WINDOW DAYS] วัน หลังคำขอรับการติดต่อ หลังจากนั้นจะไม่ส่งให้บริษัทเพิ่มเติมโดยไม่ได้รับอนุญาตใหม่เมื่อจำเป็น',
  ]),
  section('security', '10. Security', '10. ความปลอดภัย', ['SolarMatch uses reasonable administrative and technical measures, including restricted admin access, authenticated routes, private storage, server-side validation, audit records, export controls, and deletion/suppression procedures. No internet service can guarantee absolute security.'], ['SolarMatch ใช้มาตรการทางเทคนิคและการบริหารตามสมควร เช่น จำกัดสิทธิผู้ดูแล ยืนยันตัวตนในเส้นทางผู้ดูแล ใช้พื้นที่จัดเก็บส่วนตัว ตรวจสอบข้อมูลฝั่งเซิร์ฟเวอร์ บันทึกการตรวจสอบ ควบคุมการส่งออก และมีกระบวนการระงับหรือลบข้อมูล ไม่มีบริการอินเทอร์เน็ตใดรับประกันความปลอดภัยได้ทั้งหมด']),
  section('rights', '11. Rights', '11. สิทธิของผู้ใช้', ['Subject to applicable law, users may have rights to request access, information, correction, deletion or anonymization, restriction, objection, consent withdrawal, applicable data transfer, and submission of a complaint to a competent authority.'], ['ภายใต้กฎหมายที่ใช้บังคับ ผู้ใช้อาจมีสิทธิขอเข้าถึง รับข้อมูล ขอแก้ไข ขอให้ลบหรือทำให้ไม่สามารถระบุตัวบุคคล ขอจำกัด คัดค้าน ถอนความยินยอม ขอรับหรือโอนข้อมูลเมื่อใช้บังคับ และร้องเรียนต่อหน่วยงานที่มีอำนาจ']),
  section('withdrawal', '12. Withdrawal and stopping contact', '12. การถอนความยินยอมและหยุดการติดต่อ', ['Users may withdraw consent or request that future sharing/contact stop through [PRIVACY CONTACT EMAIL] or [PRIVACY RIGHTS REQUEST URL]. Withdrawal applies to future processing covered by that consent and does not automatically invalidate earlier lawful processing. Where appropriate, SolarMatch will record the withdrawal and notify companies that previously received the lead.'], ['ยื่นคำขอถอนความยินยอมหรือหยุดการส่งต่อและการติดต่อได้ทาง [PRIVACY CONTACT EMAIL] หรือ [PRIVACY RIGHTS REQUEST URL] การถอนความยินยอมมีผลต่อการประมวลผลในอนาคตที่อาศัยความยินยอมนั้น และไม่ทำให้การประมวลผลก่อนหน้าที่ชอบด้วยกฎหมายเป็นโมฆะโดยอัตโนมัติ เมื่อเหมาะสม SolarMatch จะบันทึกคำขอและแจ้งบริษัทที่เคยได้รับข้อมูล']),
  section('children', '13. Children and young people', '13. เด็กและเยาวชน', ['The contact-request service is intended for people at least 20 years old who own the property or are authorized by the owner. A person under 20 should not submit contact information without a parent or legal representative’s involvement where required.'], ['บริการขอรับการติดต่อมีไว้สำหรับผู้มีอายุอย่างน้อย 20 ปี ซึ่งเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของ ผู้มีอายุต่ำกว่า 20 ปีไม่ควรส่งข้อมูลติดต่อโดยปราศจากการมีส่วนร่วมจากผู้ปกครองหรือผู้แทนโดยชอบด้วยกฎหมายเมื่อจำเป็น']),
  section('cookies', '14. Cookies and similar technologies', '14. คุกกี้และเทคโนโลยีที่คล้ายกัน', ['SolarMatch uses necessary technologies to operate the website, preserve assessment progress, protect the service and support secure administration. Analytics or advertising technologies must not be activated unless described in the Cookie Policy and handled according to the user’s applicable consent choice.'], ['SolarMatch ใช้เทคโนโลยีที่จำเป็นเพื่อให้เว็บไซต์ทำงาน เก็บความคืบหน้า ปกป้องบริการ และรองรับระบบผู้ดูแลที่ปลอดภัย ห้ามเปิดใช้การวิเคราะห์หรือโฆษณาจนกว่าจะอธิบายในนโยบายคุกกี้และจัดการตามความยินยอมที่เกี่ยวข้อง']),
  section('changes', '15. Changes', '15. การเปลี่ยนแปลงประกาศ', ['SolarMatch may update this notice when the service, law or data practices change. The current version/effective date will be displayed. A material update must not silently broaden earlier consent.'], ['SolarMatch อาจปรับปรุงประกาศเมื่อบริการ กฎหมาย หรือวิธีใช้ข้อมูลเปลี่ยนไป โดยแสดงรุ่นและวันที่มีผลบังคับใช้ การเปลี่ยนแปลงสาระสำคัญต้องไม่ขยายความยินยอมเดิมโดยอัตโนมัติ']),
  section('contact', '16. Contact and complaints', '16. ติดต่อและร้องเรียน', ['Contact SolarMatch through [PRIVACY CONTACT EMAIL] or [PUBLIC BUSINESS PHONE]. Users may also have the right to complain to Thailand’s Personal Data Protection Committee or another competent authority.'], ['ติดต่อ SolarMatch ผ่าน [PRIVACY CONTACT EMAIL] หรือ [PUBLIC BUSINESS PHONE] ผู้ใช้อาจมีสิทธิร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลของประเทศไทยหรือหน่วยงานอื่นที่มีอำนาจ']),
];

const termEntries: Array<[string, string, string, string]> = [
  ['operator', '1. Operator and acceptance', '1. ผู้ให้บริการและการยอมรับข้อกำหนด', 'Identify the operator using configured legal details. Using the site is subject to the current Terms.'],
  ['service', '2. The service', '2. ลักษณะบริการ', 'SolarMatch is an information and referral service and is not a solar installer, electrical contractor, engineer or party to any installation agreement between a homeowner and a solar company.'],
  ['estimates', '3. Estimates', '3. ผลประเมิน', 'All SolarMatch estimates are preliminary and provided for general planning purposes. They are not engineering designs, structural assessments, official quotations, financial advice or guarantees of electricity production, savings, payback or property value.'],
  ['eligibility', '4. Eligibility', '4. คุณสมบัติผู้ใช้', 'Contact requests are intended for people at least 20 years old who own the property or are authorized by the owner. Users must provide accurate information and must not impersonate another person.'],
  ['acceptable-use', '5. Acceptable use', '5. การใช้งานที่ยอมรับได้', 'Do not submit fake, abusive, unlawful or misleading enquiries; interfere with the service; attempt unauthorized access; scrape protected data; upload malicious material; or use the site to harm another person.'],
  ['companies', '6. Independent companies', '6. บริษัทอิสระ', 'Participating solar companies are independent businesses. SolarMatch does not control and does not guarantee their advice, pricing, availability, workmanship, licences, warranties, products, financing, contracts or performance.'],
  ['contact', '7. Contact and quotations', '7. การติดต่อและใบเสนอราคา', 'SolarMatch does not guarantee that any company will contact the user, conduct a survey or provide a quotation. The homeowner must independently evaluate each company, quotation, licence, product, warranty, financing arrangement and contract.'],
  ['contracts', '8. Contracts', '8. สัญญากับบริษัทโซลาร์', 'Any survey, quotation, purchase, financing, installation or warranty agreement is entered directly between the homeowner and the selected company. SolarMatch is not a party unless expressly stated in a separate written agreement.'],
  ['payment', '9. Payment and shared leads', '9. ค่าตอบแทนและการส่งข้อมูลร่วม', 'SolarMatch may receive payment from participating solar companies for qualified customer introductions. A lead may be shared with multiple companies and is not necessarily exclusive.'],
  ['ip', '10. Intellectual property', '10. ทรัพย์สินทางปัญญา', 'The SolarMatch website, original branding, text, code-native artwork and software are protected to the extent applicable. Users may use the service for personal, lawful assessment purposes but may not reproduce or exploit protected material without permission.'],
  ['availability', '11. Availability and changes', '11. ความพร้อมและการเปลี่ยนแปลงบริการ', 'SolarMatch may maintain, update, suspend or discontinue parts of the service. It does not guarantee uninterrupted or error-free availability.'],
  ['liability', '12. Liability', '12. ความรับผิด', 'To the extent permitted by applicable law, SolarMatch is not responsible for decisions made solely from preliminary estimates or for independent companies’ acts, omissions, products, quotations, installations or contracts. Nothing excludes rights or liability that cannot lawfully be excluded.'],
  ['suspension', '13. Suspension', '13. การระงับการใช้งาน', 'SolarMatch may restrict access or reject submissions associated with abuse, security threats, fraud or violation of these Terms.'],
  ['privacy', '14. Privacy', '14. ความเป็นส่วนตัว', 'Personal data is handled according to the current Privacy Notice and applicable consent choices.'],
  ['law', '15. Governing law', '15. กฎหมายที่ใช้บังคับ', 'These Terms are governed by the laws of Thailand, subject to mandatory consumer rights and applicable jurisdiction rules.'],
  ['changes', '16. Changes and contact', '16. การเปลี่ยนแปลงและการติดต่อ', 'The current effective date and operator contact details will be shown. Material changes apply prospectively and must not silently expand existing consent.'],
];

const thaiTerms: Record<string, string> = {
  operator: 'ระบุผู้ดำเนินงานตามข้อมูลทางกฎหมายจริง การใช้เว็บไซต์อยู่ภายใต้ข้อกำหนดฉบับปัจจุบัน',
  service: 'SolarMatch เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ไม่ใช่บริษัทติดตั้งโซลาร์ ผู้รับเหมาไฟฟ้า วิศวกร หรือคู่สัญญาในสัญญาติดตั้งระหว่างเจ้าของบ้านกับบริษัทโซลาร์',
  estimates: 'ผลประเมินทั้งหมดจาก SolarMatch เป็นข้อมูลเบื้องต้นเพื่อใช้ประกอบการวางแผนทั่วไป ไม่ใช่การออกแบบทางวิศวกรรม การประเมินโครงสร้าง ใบเสนอราคาอย่างเป็นทางการ คำแนะนำทางการเงิน หรือการรับประกันผลผลิตไฟฟ้า ผลประหยัด ระยะเวลาคืนทุน หรือมูลค่าอสังหาริมทรัพย์',
  eligibility: 'การขอรับการติดต่อมีไว้สำหรับผู้มีอายุอย่างน้อย 20 ปี ซึ่งเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของ ผู้ใช้ต้องให้ข้อมูลถูกต้องและห้ามแอบอ้างเป็นบุคคลอื่น',
  'acceptable-use': 'ห้ามส่งคำขอปลอม ก่อกวน ผิดกฎหมาย หรือทำให้เข้าใจผิด รบกวนระบบ พยายามเข้าถึงโดยไม่ได้รับอนุญาต เก็บข้อมูลที่ได้รับการปกป้อง อัปโหลดสิ่งที่เป็นอันตราย หรือใช้บริการเพื่อทำร้ายผู้อื่น',
  companies: 'บริษัทโซลาร์ที่เข้าร่วมเป็นธุรกิจอิสระ SolarMatch ไม่ได้ควบคุมและไม่รับประกันคำแนะนำ ราคา ความพร้อม คุณภาพงาน ใบอนุญาต การรับประกัน ผลิตภัณฑ์ การจัดหาเงินทุน สัญญา หรือผลการดำเนินงานของบริษัทเหล่านั้น',
  contact: 'SolarMatch ไม่รับประกันว่าจะมีบริษัทติดต่อ สำรวจหน้างาน หรือออกใบเสนอราคา เจ้าของบ้านต้องตรวจสอบบริษัท ใบเสนอราคา ใบอนุญาต ผลิตภัณฑ์ การรับประกัน การจัดหาเงินทุน และสัญญาด้วยตนเอง',
  contracts: 'สัญญาสำรวจ ซื้อ จัดหาเงินทุน ติดตั้ง หรือรับประกัน เกิดขึ้นโดยตรงระหว่างเจ้าของบ้านกับบริษัทที่เลือก SolarMatch ไม่ใช่คู่สัญญา เว้นแต่มีข้อตกลงเป็นลายลักษณ์อักษรระบุไว้โดยชัดแจ้ง',
  payment: 'SolarMatch อาจได้รับค่าตอบแทนจากบริษัทโซลาร์ที่เข้าร่วมสำหรับการแนะนำลูกค้าที่ผ่านเกณฑ์ โดยข้อมูลลูกค้ารายหนึ่งอาจถูกส่งให้มากกว่าหนึ่งบริษัทและไม่จำเป็นต้องเป็นข้อมูลแบบเฉพาะราย',
  ip: 'เว็บไซต์ แบรนด์ เนื้อหาต้นฉบับ งานภาพที่สร้างขึ้นสำหรับโครงการ และซอฟต์แวร์ของ SolarMatch ได้รับการคุ้มครองเท่าที่กฎหมายใช้บังคับ ผู้ใช้ใช้บริการได้เพื่อการประเมินส่วนบุคคลที่ชอบด้วยกฎหมาย แต่ห้ามทำซ้ำหรือแสวงหาประโยชน์จากเนื้อหาที่ได้รับการคุ้มครองโดยไม่ได้รับอนุญาต',
  availability: 'SolarMatch อาจบำรุงรักษา ปรับปรุง ระงับ หรือยุติบางส่วนของบริการ และไม่รับประกันว่าบริการจะต่อเนื่องหรือปราศจากข้อผิดพลาดตลอดเวลา',
  liability: 'เท่าที่กฎหมายอนุญาต SolarMatch ไม่รับผิดชอบต่อการตัดสินใจที่อาศัยผลประเมินเบื้องต้นเพียงอย่างเดียว หรือการกระทำ การละเว้น ผลิตภัณฑ์ ใบเสนอราคา การติดตั้ง หรือสัญญาของบริษัทอิสระ ข้อความนี้ไม่ตัดสิทธิหรือความรับผิดที่กฎหมายห้ามยกเว้น',
  suspension: 'SolarMatch อาจจำกัดการเข้าถึงหรือปฏิเสธคำขอที่เกี่ยวข้องกับการก่อกวน ภัยด้านความปลอดภัย การฉ้อโกง หรือการฝ่าฝืนข้อกำหนด',
  privacy: 'SolarMatch จัดการข้อมูลตามประกาศความเป็นส่วนตัวและการเลือกให้ความยินยอมของผู้ใช้',
  law: 'ข้อกำหนดอยู่ภายใต้กฎหมายไทย โดยไม่กระทบสิทธิผู้บริโภคที่กฎหมายกำหนดและหลักเขตอำนาจศาลที่ใช้บังคับ',
  changes: 'แสดงวันที่มีผลบังคับใช้และข้อมูลติดต่อจริง การเปลี่ยนแปลงสาระสำคัญมีผลในอนาคตและต้องไม่ขยายความยินยอมเดิมโดยอัตโนมัติ',
};

const cookieSections: LegalSection[] = [
  section('scope', '1. Scope', '1. ขอบเขต', ['This policy explains cookies, browser storage and similar technologies used by SolarMatch.'], ['นโยบายนี้อธิบายการใช้คุกกี้ พื้นที่จัดเก็บในเบราว์เซอร์ และเทคโนโลยีที่คล้ายกันของ SolarMatch']),
  section('necessary', '2. Strictly necessary technologies', '2. เทคโนโลยีที่จำเป็นอย่างยิ่ง', ['SolarMatch and Cloudflare may use necessary cookies or tokens for security, Access authentication, session integrity, fraud prevention, rate limiting and reliable delivery. These are required for the requested service or its protection.'], ['SolarMatch และ Cloudflare อาจใช้คุกกี้หรือโทเคนที่จำเป็นเพื่อความปลอดภัย การยืนยันตัวตนผ่าน Access ความสมบูรณ์ของเซสชัน การป้องกันการฉ้อโกง การจำกัดคำขอ และการให้บริการอย่างน่าเชื่อถือ เทคโนโลยีเหล่านี้จำเป็นต่อบริการที่ผู้ใช้ร้องขอหรือการปกป้องบริการ']),
  section('functional', '3. Functional storage', '3. พื้นที่จัดเก็บเพื่อการทำงาน', ['SolarMatch may use browser session storage to preserve non-sensitive assessment answers, language, progress and results during the browsing session. Contact details and consent values must not be persistently stored unless the user submits them to the secure server endpoint.'], ['SolarMatch อาจใช้ session storage เพื่อเก็บคำตอบที่ไม่อ่อนไหว ภาษา ความคืบหน้า และผลประเมินระหว่างเซสชัน ห้ามเก็บข้อมูลติดต่อและค่าความยินยอมแบบถาวร เว้นแต่ผู้ใช้ส่งข้อมูลผ่านปลายทางเซิร์ฟเวอร์ที่ปลอดภัย']),
  section('maps', '4. Maps and external content', '4. แผนที่และเนื้อหาภายนอก', ['Where an OpenStreetMap-based map is displayed, map-tile providers may receive technical request information such as IP address and browser headers. The exact current provider is documented and the map is not loaded before needed.'], ['เมื่อแสดงแผนที่ที่อาศัย OpenStreetMap ผู้ให้บริการแผ่นภาพแผนที่อาจได้รับข้อมูลคำขอทางเทคนิค เช่น หมายเลข IP และส่วนหัวเบราว์เซอร์ โดยจะระบุผู้ให้บริการจริงและหลีกเลี่ยงการโหลดแผนที่ก่อนจำเป็น']),
  section('analytics', '5. Analytics', '5. การวิเคราะห์', ['No optional analytics is active unless the published configuration says otherwise and the user has made any legally required choice.'], ['ไม่มีการเปิดใช้เครื่องมือวิเคราะห์แบบไม่จำเป็น เว้นแต่การตั้งค่าที่เผยแพร่ระบุไว้และผู้ใช้ได้เลือกตามที่กฎหมายกำหนด']),
  section('advertising', '6. Advertising', '6. การโฆษณา', ['SolarMatch does not activate advertising or retargeting technologies as part of this implementation.'], ['งานนี้ไม่เปิดใช้เทคโนโลยีโฆษณาหรือการติดตามเพื่อนำเสนอโฆษณาซ้ำ']),
  section('future', '7. Future optional technologies', '7. เทคโนโลยีเสริมในอนาคต', ['Before enabling analytics or advertising, SolarMatch must add a versioned preference interface with necessary, analytics and advertising categories. Optional categories must be off by default, must not load before permission, and must support later withdrawal.'], ['ก่อนเปิดใช้การวิเคราะห์หรือโฆษณา ต้องมีหน้าตั้งค่าที่มีเวอร์ชัน แบ่งเป็น “จำเป็น” “วิเคราะห์” และ “โฆษณา” หมวดเสริมต้องปิดโดยค่าเริ่มต้น ห้ามโหลดก่อนอนุญาต และต้องถอนการอนุญาตภายหลังได้']),
  section('manage', '8. Managing storage', '8. การจัดการพื้นที่จัดเก็บ', ['Users can clear browser storage through browser settings. Clearing necessary storage may sign the user out or reset assessment progress.'], ['ผู้ใช้ล้างข้อมูลผ่านการตั้งค่าเบราว์เซอร์ได้ การล้างข้อมูลที่จำเป็นอาจทำให้ออกจากระบบหรือรีเซ็ตความคืบหน้าของแบบประเมิน']),
  section('changes', '9. Changes and contact', '9. การเปลี่ยนแปลงและการติดต่อ', ['The current effective date will be shown. Questions may be directed to [PRIVACY CONTACT EMAIL].'], ['จะแสดงวันที่มีผลบังคับใช้ และให้ติดต่อ [PRIVACY CONTACT EMAIL] หากมีคำถาม']),
];

export const legalLaunchDocuments: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft> = {
  privacy: { type: 'privacy', title: { en: 'Privacy Notice', th: 'ประกาศความเป็นส่วนตัว' }, lastUpdatedLabel: { en: 'Last updated', th: 'ปรับปรุงล่าสุด' }, effectiveDate: null, pendingLegalReview: true, sections: privacySections },
  terms: { type: 'terms', title: { en: 'Terms of Use', th: 'ข้อกำหนดการใช้งาน' }, lastUpdatedLabel: { en: 'Effective date', th: 'วันที่มีผลบังคับใช้' }, effectiveDate: null, pendingLegalReview: true, sections: termEntries.map(([id, enTitle, thTitle, en]) => section(id, enTitle, thTitle, [en], [thaiTerms[id]])) },
  cookies: { type: 'cookies', title: { en: 'Cookie Policy', th: 'นโยบายคุกกี้' }, lastUpdatedLabel: { en: 'Last updated', th: 'ปรับปรุงล่าสุด' }, effectiveDate: null, pendingLegalReview: true, sections: cookieSections },
};

export const legalLaunchDraft = {
  schemaVersion: 2,
  operator: emptyOperatorProfile,
  documents: legalLaunchDocuments,
  pendingLegalReview: true,
};

export function operatorProfileComplete(profile: OperatorProfile) {
  return Boolean(
    profile.legalBusinessNameEn && profile.legalBusinessNameTh && profile.legalEntityType &&
    profile.registrationOrTaxNumber && profile.registeredAddressEn && profile.registeredAddressTh &&
    profile.publicBusinessPhone && profile.publicBusinessEmail && profile.privacyContactEmail &&
    profile.privacyRightsRequestUrl && profile.leadRetentionDays && profile.leadDistributionWindowDays &&
    profile.privacyNoticeEffectiveDate && profile.termsEffectiveDate && profile.cookiePolicyEffectiveDate &&
    profile.dataHostingAndProcessorDetails && profile.operatorRepresentativeName && profile.operatorRepresentativeTitle
  );
}

export function interpolateLegalDocuments(documents: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft>, profile: OperatorProfile) {
  const values: Record<string, string> = {
    '[LEGAL BUSINESS NAME EN]': profile.legalBusinessNameEn,
    '[LEGAL BUSINESS NAME TH]': profile.legalBusinessNameTh,
    '[LEGAL ENTITY TYPE]': profile.legalEntityType,
    '[BUSINESS REGISTRATION OR TAX NUMBER]': profile.registrationOrTaxNumber,
    '[REGISTERED BUSINESS ADDRESS EN]': profile.registeredAddressEn,
    '[REGISTERED BUSINESS ADDRESS TH]': profile.registeredAddressTh,
    '[PUBLIC BUSINESS PHONE]': profile.publicBusinessPhone,
    '[PUBLIC BUSINESS EMAIL]': profile.publicBusinessEmail,
    '[PRIVACY CONTACT EMAIL]': profile.privacyContactEmail,
    '[PRIVACY RIGHTS REQUEST URL]': profile.privacyRightsRequestUrl,
    '[LEAD RETENTION DAYS]': String(profile.leadRetentionDays ?? ''),
    '[LEAD DISTRIBUTION WINDOW DAYS]': String(profile.leadDistributionWindowDays ?? ''),
    '[DATA HOSTING AND PROCESSOR DETAILS]': profile.dataHostingAndProcessorDetails,
  };
  const replace = (source: string) => Object.entries(values).reduce((result, [token, value]) => value ? result.replaceAll(token, value) : result, source);
  const next = structuredClone(documents);
  (Object.keys(next) as Array<keyof typeof next>).forEach((type) => {
    next[type].effectiveDate = type === 'privacy' ? profile.privacyNoticeEffectiveDate : type === 'terms' ? profile.termsEffectiveDate : profile.cookiePolicyEffectiveDate;
    next[type].sections.forEach((sectionValue) => {
      sectionValue.paragraphs.forEach((paragraph) => { paragraph.en = replace(paragraph.en); paragraph.th = replace(paragraph.th); });
      sectionValue.bullets?.forEach((bullet) => { bullet.en = replace(bullet.en); bullet.th = replace(bullet.th); });
    });
  });
  return next;
}
