import type { LocalizedText } from '@/lib/questionnaire/types';

export type LegalSection = { id: string; title: LocalizedText; paragraphs: LocalizedText[]; bullets?: LocalizedText[] };
export type LegalDocumentDraft = { type: 'privacy' | 'terms' | 'cookies'; title: LocalizedText; lastUpdatedLabel: LocalizedText; effectiveDate: string | null; pendingLegalReview: boolean; sections: LegalSection[] };
export type OperatorProfile = {
  legalBusinessNameEn: string; legalBusinessNameTh: string; legalEntityType: string; registrationOrTaxNumber: string;
  registeredAddressEn: string; registeredAddressTh: string; publicBusinessPhone: string; publicBusinessEmail: string;
  privacyContactEmail: string; privacyRightsRequestUrl: string; leadRetentionDays: number | null; leadDistributionWindowDays: number | null;
  privacyNoticeEffectiveDate: string | null; termsEffectiveDate: string | null; cookiePolicyEffectiveDate: string | null;
  dataHostingAndProcessorDetails: string; operatorRepresentativeName: string; operatorRepresentativeTitle: string;
};

export const emptyOperatorProfile: OperatorProfile = {
  legalBusinessNameEn: '', legalBusinessNameTh: '', legalEntityType: '', registrationOrTaxNumber: '', registeredAddressEn: '', registeredAddressTh: '',
  publicBusinessPhone: '', publicBusinessEmail: '', privacyContactEmail: '', privacyRightsRequestUrl: '', leadRetentionDays: null,
  leadDistributionWindowDays: null, privacyNoticeEffectiveDate: null, termsEffectiveDate: null, cookiePolicyEffectiveDate: null,
  dataHostingAndProcessorDetails: 'Cloudflare services are used for website delivery, security, database storage and private file storage. Processing locations may include locations outside Thailand.',
  operatorRepresentativeName: '', operatorRepresentativeTitle: '',
};

const section = (id: string, enTitle: string, thTitle: string, en: string[], th: string[]): LegalSection => ({
  id, title: { en: enTitle, th: thTitle }, paragraphs: en.map((value, index) => ({ en: value, th: th[index] ?? '' })),
});

const privacySections: LegalSection[] = [
  section('who-we-are', '1. Who we are', '1. ผู้ให้บริการ', [
    'SolarMatch Thailand (“SolarMatch”) is an information and referral service operated by [LEGAL COMPANY NAME EN], [LEGAL ENTITY TYPE], registration or tax number [COMPANY REGISTRATION / TAX NUMBER], with its registered address at [REGISTERED ADDRESS EN].',
    'For privacy questions or requests concerning personal data, contact [PRIVACY CONTACT EMAIL] or use [PRIVACY RIGHTS REQUEST URL].',
  ], [
    'SolarMatch Thailand (“SolarMatch”) เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ดำเนินงานโดย [LEGAL COMPANY NAME TH] ซึ่งเป็น [LEGAL ENTITY TYPE] เลขทะเบียนนิติบุคคลหรือเลขประจำตัวผู้เสียภาษี [COMPANY REGISTRATION / TAX NUMBER] และมีที่อยู่จดทะเบียนที่ [REGISTERED ADDRESS TH]',
    'หากมีคำถามเกี่ยวกับความเป็นส่วนตัวหรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล โปรดติดต่อ [PRIVACY CONTACT EMAIL] หรือใช้ช่องทาง [PRIVACY RIGHTS REQUEST URL]',
  ]),
  section('scope', '2. Scope', '2. ขอบเขตของประกาศ', [
    'This notice applies when a person uses SolarMatch, completes the solar assessment, provides contact details, requests quotes or contact, communicates with SolarMatch, or exercises privacy rights.',
  ], ['ประกาศฉบับนี้ใช้เมื่อบุคคลใช้ SolarMatch ทำแบบประเมินโซลาร์ ให้ข้อมูลติดต่อ ขอใบเสนอราคาหรือขอรับการติดต่อ ติดต่อสื่อสารกับ SolarMatch หรือใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล']),
  section('data', '3. Personal data we may collect', '3. ข้อมูลส่วนบุคคลที่อาจเก็บรวบรวม', [
    'Assessment information may include province or location, an optional address or map location, electricity bill, property type, relationship to or authority regarding the property, solar-planning answers, project type, daytime electricity use, appliances, AC count, roof information, and other assessment details voluntarily supplied.',
    'Contact information may include first name, last name, Thai mobile number, preferred contact method, and LINE ID where provided.',
    'Consent and referral records may include the contact choice, age/property-authority confirmation, consent and Privacy Notice versions, date and time, recipient and disclosure history, withdrawals, suppression, and correction or deletion requests.',
    'Technical and security data may include browser and device information, session and idempotency identifiers, anti-abuse information, protected or hashed network identifiers used for rate limiting, and necessary service-delivery records.',
    'SolarMatch does not intentionally request national identification numbers, bank details, exact income, health information or other sensitive personal data through the standard assessment.',
  ], [
    'ข้อมูลแบบประเมินอาจรวมถึงจังหวัดหรือพื้นที่ ที่อยู่หรือตำแหน่งบนแผนที่ซึ่งผู้ใช้เลือกให้ ค่าไฟ ประเภทอสังหาริมทรัพย์ ความสัมพันธ์หรืออำนาจเกี่ยวกับอสังหาริมทรัพย์ คำตอบเกี่ยวกับแผนติดตั้งโซลาร์ ประเภทโครงการ การใช้ไฟช่วงกลางวัน เครื่องใช้ไฟฟ้า จำนวนเครื่องปรับอากาศ ข้อมูลหลังคา และรายละเอียดอื่นที่ผู้ใช้สมัครใจให้',
    'ข้อมูลติดต่ออาจรวมถึงชื่อ นามสกุล หมายเลขโทรศัพท์มือถือไทย ช่องทางที่สะดวกให้ติดต่อ และ LINE ID เมื่อผู้ใช้ให้ข้อมูล',
    'บันทึกความยินยอมและการส่งต่ออาจรวมถึงการเลือกขอรับการติดต่อ การยืนยันอายุและอำนาจเกี่ยวกับอสังหาริมทรัพย์ รุ่นของความยินยอมและประกาศความเป็นส่วนตัว วันและเวลา ประวัติผู้รับและข้อมูลที่เปิดเผย การถอนความยินยอม การระงับการใช้ข้อมูล และคำขอแก้ไขหรือลบข้อมูล',
    'ข้อมูลทางเทคนิคและความปลอดภัยอาจรวมถึงข้อมูลเบราว์เซอร์และอุปกรณ์ ตัวระบุเซสชันและคำขอ ข้อมูลป้องกันการใช้งานในทางที่ผิด ตัวระบุเครือข่ายที่ได้รับการปกป้องหรือแฮชเพื่อจำกัดคำขอ และบันทึกที่จำเป็นต่อการให้บริการ',
    'SolarMatch ไม่มีเจตนาเก็บเลขบัตรประชาชน ข้อมูลธนาคาร รายได้ที่แน่นอน ข้อมูลสุขภาพ หรือข้อมูลส่วนบุคคลที่มีความอ่อนไหวอื่นผ่านแบบประเมินมาตรฐาน',
  ]),
  section('purposes', '4. Why we use personal data', '4. วัตถุประสงค์ในการใช้ข้อมูล', [
    'SolarMatch may use relevant personal data to provide the requested estimate; process a contact or quote request; assess which solar-service recipients may be relevant; disclose permitted information after explicit consent; enable recipients to contact the user with relevant solar information and/or offers for solar-related services; record disclosures; manage quality and disputes; process consent withdrawal and rights requests; prevent abuse and fraud; secure the service; comply with applicable law; and establish or defend legal claims where applicable.',
  ], ['SolarMatch อาจใช้ข้อมูลส่วนบุคคลที่เกี่ยวข้องเพื่อจัดทำผลประเมินตามคำขอ ดำเนินการตามคำขอรับการติดต่อหรือใบเสนอราคา ประเมินว่าผู้รับข้อมูลด้านบริการโซลาร์รายใดอาจเกี่ยวข้อง เปิดเผยข้อมูลที่ได้รับอนุญาตหลังได้รับความยินยอมโดยชัดแจ้ง ให้ผู้รับข้อมูลติดต่อผู้ใช้พร้อมข้อมูลที่เกี่ยวข้องกับโซลาร์ และ/หรือข้อเสนอเกี่ยวกับบริการที่เกี่ยวข้องกับโซลาร์ บันทึกการเปิดเผยข้อมูล จัดการคุณภาพและข้อพิพาท ดำเนินการเมื่อมีการถอนความยินยอมหรือใช้สิทธิ ป้องกันการใช้งานในทางที่ผิดและการฉ้อโกง รักษาความปลอดภัย ปฏิบัติตามกฎหมายที่ใช้บังคับ และก่อตั้ง ใช้ หรือยกข้อต่อสู้สิทธิเรียกร้องเมื่อเกี่ยวข้อง']),
  section('sharing', '5. Sharing with solar-service recipients', '5. การเปิดเผยข้อมูลแก่ผู้รับข้อมูลด้านบริการโซลาร์', [
    'Where permitted by the applicable consent or another lawful basis, SolarMatch may share the user’s name, contact details, location and relevant assessment answers with solar service providers, installers, their authorized representatives, or other businesses involved in providing solar services.',
    'The same request may be shared with more than one recipient, and the number may vary. Recipients may contact the user with relevant solar information and/or offers for solar-related services. SolarMatch does not guarantee that any recipient will contact the user or provide a quotation.',
    'SolarMatch does not authorize recipients to resell the data, use it for unrelated products or services, disclose it for unrelated purposes, or continue using it beyond the permitted purpose and retention framework. A recipient may be independently responsible for its handling of the data it receives.',
  ], [
    'เมื่อได้รับอนุญาตตามความยินยอมที่ใช้บังคับหรือมีฐานทางกฎหมายอื่น SolarMatch อาจส่งต่อหรือเปิดเผยชื่อ ข้อมูลติดต่อ สถานที่ตั้ง และคำตอบที่เกี่ยวข้องจากแบบประเมินแก่ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาตของบุคคลดังกล่าว หรือธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์',
    'คำขอเดียวกันอาจถูกส่งให้ผู้รับมากกว่าหนึ่งราย และจำนวนอาจแตกต่างกัน ผู้รับข้อมูลอาจติดต่อผู้ใช้พร้อมข้อมูลที่เกี่ยวข้องกับโซลาร์ และ/หรือข้อเสนอเกี่ยวกับบริการที่เกี่ยวข้องกับโซลาร์ SolarMatch ไม่รับประกันว่าจะมีผู้รับข้อมูลติดต่อผู้ใช้หรือออกใบเสนอราคา',
    'SolarMatch ไม่อนุญาตให้ผู้รับข้อมูลนำข้อมูลไปขายต่อ ใช้สำหรับผลิตภัณฑ์หรือบริการที่ไม่เกี่ยวข้อง เปิดเผยเพื่อวัตถุประสงค์ที่ไม่เกี่ยวข้อง หรือใช้ต่อเกินวัตถุประสงค์และกรอบระยะเวลาเก็บรักษาที่ได้รับอนุญาต ผู้รับข้อมูลอาจมีหน้าที่รับผิดชอบโดยอิสระต่อการจัดการข้อมูลที่ตนได้รับ',
  ]),
  section('revenue', '6. How SolarMatch earns revenue', '6. รายได้ของ SolarMatch', [
    'SolarMatch may receive payment from a recipient for the connection. Payment does not give the recipient unrestricted ownership or unrestricted rights to use personal data.',
  ], ['SolarMatch อาจได้รับค่าตอบแทนจากผู้รับข้อมูลสำหรับการเชื่อมโยงดังกล่าว การได้รับค่าตอบแทนไม่ได้ทำให้ผู้รับข้อมูลมีสิทธิเป็นเจ้าของหรือใช้ข้อมูลส่วนบุคคลโดยไม่จำกัด']),
  section('basis', '7. Legal basis and consent', '7. ฐานทางกฎหมายและความยินยอม', [
    'SolarMatch relies on explicit consent for the sharing and contact described in the consent wording. Choosing No does not prevent the user from receiving the estimate. Where permitted by applicable law, SolarMatch may also process limited information to provide and secure the requested service, keep records required by law, comply with legal obligations, and establish or defend legal claims.',
  ], ['SolarMatch อาศัยความยินยอมโดยชัดแจ้งสำหรับการเปิดเผยข้อมูลและการติดต่อที่ระบุในข้อความขอความยินยอม การเลือก “ไม่ใช่” ไม่ทำให้ผู้ใช้เสียสิทธิรับผลประเมิน เมื่อกฎหมายที่ใช้บังคับอนุญาต SolarMatch อาจประมวลผลข้อมูลที่จำเป็นในขอบเขตจำกัดเพื่อให้บริการและรักษาความปลอดภัย เก็บบันทึกตามที่กฎหมายกำหนด ปฏิบัติตามหน้าที่ทางกฎหมาย และก่อตั้ง ใช้ หรือยกข้อต่อสู้สิทธิเรียกร้อง']),
  section('processors', '8. Service providers and international processing', '8. ผู้ให้บริการและการประมวลผลระหว่างประเทศ', [
    '[DATA HOSTING AND PROCESSOR DETAILS] SolarMatch may also use service providers for maintenance and other functions needed to operate the service. Some providers may process data outside Thailand. Where required by applicable law, SolarMatch will use appropriate contractual or legal measures.',
  ], ['SolarMatch ใช้บริการของ Cloudflare ในการส่งมอบและรักษาความปลอดภัยของเว็บไซต์ รวมถึงจัดเก็บข้อมูลในฐานข้อมูลและพื้นที่เก็บไฟล์ส่วนตัว SolarMatch อาจใช้ผู้ให้บริการสำหรับการดูแลระบบและงานอื่นที่จำเป็นต่อการให้บริการ ผู้ให้บริการบางรายอาจประมวลผลข้อมูลนอกประเทศไทย และ SolarMatch จะใช้มาตรการทางสัญญาหรือกฎหมายที่เหมาะสมเมื่อกฎหมายที่ใช้บังคับกำหนด']),
  section('retention', '9. Retention and distribution', '9. ระยะเวลาเก็บรักษาและส่งต่อ', [
    'A contact request may be shared with a new eligible recipient only during the [LEAD DISTRIBUTION WINDOW DAYS]-day distribution window, subject to valid consent. After that period, SolarMatch will not newly distribute the request unless fresh permission or another lawful basis permits it.',
    'Contact and related records are normally retained for [LEAD RETENTION DAYS] days from submission or the latest relevant activity. Limited records may be retained longer where lawfully necessary for legal obligations, disputes, claims, consent evidence, or suppression and withdrawal records. If consent is withdrawn earlier, future consent-based distribution stops as applicable.',
  ], [
    'คำขอรับการติดต่ออาจถูกส่งให้ผู้รับรายใหม่ที่มีคุณสมบัติเหมาะสมได้เฉพาะภายในช่วงเวลา [LEAD DISTRIBUTION WINDOW DAYS] วัน และต้องอยู่ภายใต้ความยินยอมที่ยังใช้ได้ หลังพ้นช่วงเวลาดังกล่าว SolarMatch จะไม่ส่งคำขอให้ผู้รับรายใหม่ เว้นแต่ได้รับอนุญาตใหม่หรือมีฐานทางกฎหมายอื่นรองรับ',
    'โดยปกติ SolarMatch เก็บคำขอรับการติดต่อและบันทึกที่เกี่ยวข้องเป็นเวลา [LEAD RETENTION DAYS] วัน นับจากวันที่ส่งข้อมูลหรือกิจกรรมที่เกี่ยวข้องล่าสุด บันทึกบางส่วนอาจถูกเก็บไว้นานกว่านั้นเมื่อกฎหมายอนุญาตและจำเป็นต่อหน้าที่ทางกฎหมาย ข้อพิพาท สิทธิเรียกร้อง หลักฐานความยินยอม หรือบันทึกการระงับและถอนความยินยอม หากถอนความยินยอมก่อนกำหนด SolarMatch จะหยุดการส่งต่อในอนาคตที่อาศัยความยินยอมดังกล่าวตามที่เกี่ยวข้อง',
  ]),
  section('security', '10. Security', '10. ความปลอดภัย', [
    'SolarMatch uses reasonable technical and organizational measures designed to protect personal data, including access controls, secure storage, validation, logging and procedures for restricting, deleting or suppressing data where appropriate. No internet service can guarantee absolute security.',
  ], ['SolarMatch ใช้มาตรการทางเทคนิคและการบริหารจัดการตามสมควรเพื่อปกป้องข้อมูลส่วนบุคคล รวมถึงการควบคุมการเข้าถึง การจัดเก็บอย่างปลอดภัย การตรวจสอบความถูกต้องของข้อมูล การบันทึกเหตุการณ์ และกระบวนการจำกัด ลบ หรือระงับข้อมูลตามความเหมาะสม อย่างไรก็ตาม ไม่มีบริการอินเทอร์เน็ตใดรับประกันความปลอดภัยได้อย่างสมบูรณ์']),
  section('rights', '11. Your rights', '11. สิทธิของคุณ', [
    'Subject to applicable law, a person may have rights to request access, information or a copy; correction; deletion or anonymization; restriction; objection; withdrawal of consent; applicable data portability; and submission of a complaint to a competent authority. Legal exceptions may apply.',
  ], ['ภายใต้กฎหมายที่ใช้บังคับ บุคคลอาจมีสิทธิขอเข้าถึง รับข้อมูลหรือสำเนา ขอแก้ไข ขอให้ลบหรือทำให้ไม่สามารถระบุตัวบุคคล ขอจำกัดการใช้ คัดค้าน ถอนความยินยอม ขอรับหรือโอนข้อมูลเมื่อใช้บังคับ และร้องเรียนต่อหน่วยงานที่มีอำนาจ ทั้งนี้อาจมีข้อยกเว้นตามกฎหมาย']),
  section('withdrawal', '12. Withdrawing consent and stopping contact', '12. การถอนความยินยอมและหยุดการติดต่อ', [
    'Consent may be withdrawn through [PRIVACY CONTACT EMAIL] or [PRIVACY RIGHTS REQUEST URL]. Future consent-based sharing will stop as applicable. Withdrawal does not automatically invalidate prior lawful processing, and SolarMatch may retain limited records where permitted or required by law. Prior recipients may be notified where appropriate.',
  ], ['ผู้ใช้สามารถถอนความยินยอมผ่าน [PRIVACY CONTACT EMAIL] หรือ [PRIVACY RIGHTS REQUEST URL] โดยการเปิดเผยข้อมูลในอนาคตที่อาศัยความยินยอมจะหยุดลงตามที่เกี่ยวข้อง การถอนความยินยอมไม่ทำให้การประมวลผลก่อนหน้าที่ชอบด้วยกฎหมายเป็นโมฆะโดยอัตโนมัติ และ SolarMatch อาจเก็บบันทึกบางส่วนเมื่อกฎหมายอนุญาตหรือกำหนด รวมถึงอาจแจ้งผู้รับข้อมูลก่อนหน้าตามความเหมาะสม']),
  section('age', '13. Age and property authority', '13. อายุและอำนาจเกี่ยวกับอสังหาริมทรัพย์', [
    'As a SolarMatch service-eligibility rule, contact requests are intended for users aged at least 20 who own the property or are authorized by the property owner.',
  ], ['ตามเกณฑ์การใช้บริการของ SolarMatch การส่งคำขอรับการติดต่อมีไว้สำหรับผู้ใช้ที่มีอายุอย่างน้อย 20 ปี และเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของ']),
  section('cookies', '14. Cookies and similar technologies', '14. คุกกี้และเทคโนโลยีที่คล้ายกัน', [
    'SolarMatch uses necessary technologies and browser storage to operate and protect the service and preserve non-sensitive assessment progress. The Cookie Policy explains the technologies currently used.',
  ], ['SolarMatch ใช้เทคโนโลยีที่จำเป็นและพื้นที่จัดเก็บในเบราว์เซอร์เพื่อให้บริการทำงานอย่างปลอดภัยและเก็บความคืบหน้าของแบบประเมินที่ไม่ใช่ข้อมูลอ่อนไหว รายละเอียดเทคโนโลยีที่ใช้อยู่ระบุไว้ในนโยบายคุกกี้']),
  section('changes', '15. Changes to this notice', '15. การเปลี่ยนแปลงประกาศ', [
    'SolarMatch may update this notice when the service, law or data practices change. The current effective date and version will be shown. A material change will not silently broaden consent previously given.',
  ], ['SolarMatch อาจปรับปรุงประกาศฉบับนี้เมื่อบริการ กฎหมาย หรือวิธีจัดการข้อมูลเปลี่ยนแปลง โดยจะแสดงวันที่มีผลบังคับใช้และรุ่นปัจจุบัน การเปลี่ยนแปลงสาระสำคัญจะไม่ขยายขอบเขตความยินยอมที่เคยให้ไว้โดยไม่แจ้งให้ทราบ']),
  section('contact', '16. Contact and complaints', '16. ติดต่อและร้องเรียน', [
    'For privacy questions or requests, contact [PRIVACY CONTACT EMAIL], call [PUBLIC BUSINESS PHONE], or use [PRIVACY RIGHTS REQUEST URL]. Subject to applicable law, a person may also have the right to complain to Thailand’s competent personal-data authority.',
  ], ['หากมีคำถามหรือคำขอเกี่ยวกับความเป็นส่วนตัว โปรดติดต่อ [PRIVACY CONTACT EMAIL] โทร [PUBLIC BUSINESS PHONE] หรือใช้ช่องทาง [PRIVACY RIGHTS REQUEST URL] ภายใต้กฎหมายที่ใช้บังคับ บุคคลอาจมีสิทธิร้องเรียนต่อหน่วยงานของประเทศไทยที่มีอำนาจด้านการคุ้มครองข้อมูลส่วนบุคคล']),
];

const termsSections: LegalSection[] = [
  section('operator', '1. Operator and acceptance', '1. ผู้ให้บริการและการยอมรับข้อกำหนด', ['SolarMatch Thailand is operated by [LEGAL COMPANY NAME EN], [LEGAL ENTITY TYPE], registration or tax number [COMPANY REGISTRATION / TAX NUMBER], with its registered address at [REGISTERED ADDRESS EN]. By using the website, you agree to the current Terms of Use.'], ['SolarMatch Thailand ดำเนินงานโดย [LEGAL COMPANY NAME TH] ซึ่งเป็น [LEGAL ENTITY TYPE] เลขทะเบียนนิติบุคคลหรือเลขประจำตัวผู้เสียภาษี [COMPANY REGISTRATION / TAX NUMBER] และมีที่อยู่จดทะเบียนที่ [REGISTERED ADDRESS TH] การใช้เว็บไซต์ถือว่าคุณตกลงใช้บริการภายใต้ข้อกำหนดการใช้งานฉบับปัจจุบัน']),
  section('service', '2. The service', '2. ลักษณะบริการ', ['SolarMatch is an information and referral service and is not a solar installer, electrical contractor, engineer or party to any agreement between a user and a third-party provider.'], ['SolarMatch เป็นบริการให้ข้อมูลและแนะนำผู้ให้บริการ ไม่ใช่บริษัทติดตั้งโซลาร์ ผู้รับเหมาไฟฟ้า วิศวกร หรือคู่สัญญาในข้อตกลงระหว่างผู้ใช้กับผู้ให้บริการภายนอก']),
  section('estimates', '3. Estimates', '3. ผลประเมิน', ['All SolarMatch estimates are preliminary and provided for general planning. They are not engineering designs, structural assessments, official quotations, financial advice or guarantees of electricity production, savings, payback, installation cost, suitability or property value.'], ['ผลประเมินทั้งหมดจาก SolarMatch เป็นข้อมูลเบื้องต้นเพื่อใช้ประกอบการวางแผนทั่วไป ไม่ใช่การออกแบบทางวิศวกรรม การประเมินโครงสร้าง ใบเสนอราคาอย่างเป็นทางการ คำแนะนำทางการเงิน หรือการรับประกันผลผลิตไฟฟ้า ผลประหยัด ระยะเวลาคืนทุน ราคาติดตั้ง ความเหมาะสม หรือมูลค่าอสังหาริมทรัพย์']),
  section('eligibility', '4. Eligibility', '4. คุณสมบัติผู้ใช้', ['Contact requests are intended for people at least 20 years old who own the property or are authorized by the owner. Users must provide accurate information and must not impersonate another person.'], ['คำขอรับการติดต่อมีไว้สำหรับผู้มีอายุอย่างน้อย 20 ปี ซึ่งเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของ ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและห้ามแอบอ้างเป็นบุคคลอื่น']),
  section('acceptable-use', '5. Acceptable use', '5. การใช้งานที่ยอมรับได้', ['Do not submit fake, abusive, unlawful or misleading requests; interfere with the service; attempt unauthorized access; scrape protected data; upload malicious material; or use the site to harm another person.'], ['ห้ามส่งคำขอปลอม ก่อกวน ผิดกฎหมาย หรือทำให้เข้าใจผิด รบกวนระบบ พยายามเข้าถึงโดยไม่ได้รับอนุญาต เก็บข้อมูลที่ได้รับการปกป้อง อัปโหลดสิ่งที่เป็นอันตราย หรือใช้เว็บไซต์เพื่อทำร้ายผู้อื่น']),
  section('providers', '6. Independent providers', '6. ผู้ให้บริการอิสระ', ['Solar service providers, installers, their authorized representatives, and other businesses involved in providing solar services are independent from SolarMatch. SolarMatch does not control or guarantee their advice, pricing, availability, licensing, products, workmanship, warranties, financing, contracts or performance.'], ['ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาต และธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์ ดำเนินงานโดยอิสระจาก SolarMatch โดย SolarMatch ไม่ได้ควบคุมหรือรับประกันคำแนะนำ ราคา ความพร้อม ใบอนุญาต ผลิตภัณฑ์ คุณภาพงาน การรับประกัน การจัดหาเงินทุน สัญญา หรือผลการดำเนินงานของบุคคลหรือธุรกิจเหล่านั้น']),
  section('contact', '7. Contact and services', '7. การติดต่อและบริการ', ['SolarMatch does not guarantee that any recipient will contact a user, provide information, conduct a site visit, make an offer, or provide a quotation. Users should independently evaluate each provider and any advice, licence, product, warranty, financing arrangement, offer or contract.'], ['SolarMatch ไม่รับประกันว่าจะมีผู้รับข้อมูลติดต่อผู้ใช้ ให้ข้อมูล เข้าสำรวจหน้างาน เสนอข้อเสนอ หรือออกใบเสนอราคา ผู้ใช้ควรตรวจสอบผู้ให้บริการ คำแนะนำ ใบอนุญาต ผลิตภัณฑ์ การรับประกัน การจัดหาเงินทุน ข้อเสนอ และสัญญาด้วยตนเอง']),
  section('contracts', '8. Third-party contracts', '8. สัญญากับบุคคลภายนอก', ['Any survey, quotation, purchase, financing, installation or warranty agreement is entered directly between the user and the relevant provider. SolarMatch is not a party unless expressly stated in a separate written agreement.'], ['ข้อตกลงเกี่ยวกับการสำรวจ ใบเสนอราคา การซื้อ การจัดหาเงินทุน การติดตั้ง หรือการรับประกัน เกิดขึ้นโดยตรงระหว่างผู้ใช้กับผู้ให้บริการที่เกี่ยวข้อง SolarMatch ไม่ใช่คู่สัญญา เว้นแต่จะระบุไว้อย่างชัดแจ้งในข้อตกลงเป็นลายลักษณ์อักษรแยกต่างหาก']),
  section('payment', '9. Payment and shared requests', '9. ค่าตอบแทนและคำขอที่อาจส่งให้หลายราย', ['SolarMatch may receive payment from a recipient for the connection. A contact request may be shared with more than one recipient and is not necessarily exclusive.'], ['SolarMatch อาจได้รับค่าตอบแทนจากผู้รับข้อมูลสำหรับการเชื่อมโยงดังกล่าว คำขอรับการติดต่ออาจถูกส่งให้ผู้รับมากกว่าหนึ่งรายและไม่จำเป็นต้องเป็นคำขอแบบเฉพาะราย']),
  section('ip', '10. Intellectual property', '10. ทรัพย์สินทางปัญญา', ['The SolarMatch website, original branding, text, code-native artwork and software are protected to the extent applicable. Users may use the service for personal, lawful assessment purposes but may not reproduce or exploit protected material without permission.'], ['เว็บไซต์ แบรนด์ เนื้อหาต้นฉบับ งานภาพที่สร้างขึ้นสำหรับโครงการ และซอฟต์แวร์ของ SolarMatch ได้รับการคุ้มครองเท่าที่กฎหมายใช้บังคับ ผู้ใช้สามารถใช้บริการเพื่อการประเมินส่วนบุคคลที่ชอบด้วยกฎหมาย แต่ห้ามทำซ้ำหรือแสวงหาประโยชน์จากเนื้อหาที่ได้รับการคุ้มครองโดยไม่ได้รับอนุญาต']),
  section('availability', '11. Availability and changes', '11. ความพร้อมและการเปลี่ยนแปลงบริการ', ['SolarMatch may maintain, update, suspend or discontinue parts of the service. SolarMatch does not guarantee uninterrupted or error-free availability.'], ['SolarMatch อาจบำรุงรักษา ปรับปรุง ระงับ หรือยุติบางส่วนของบริการ และไม่รับประกันว่าบริการจะต่อเนื่องหรือปราศจากข้อผิดพลาดตลอดเวลา']),
  section('liability', '12. Liability', '12. ความรับผิด', ['To the extent permitted by applicable law, SolarMatch is not responsible for decisions made solely from preliminary estimates or for independent providers’ acts, omissions, products, information, offers, quotations, installations or contracts. Nothing in these Terms excludes mandatory consumer rights or liability that cannot lawfully be excluded.'], ['เท่าที่กฎหมายอนุญาต SolarMatch ไม่รับผิดชอบต่อการตัดสินใจที่อาศัยผลประเมินเบื้องต้นเพียงอย่างเดียว หรือการกระทำ การละเว้น ผลิตภัณฑ์ ข้อมูล ข้อเสนอ ใบเสนอราคา การติดตั้ง หรือสัญญาของผู้ให้บริการอิสระ ข้อความนี้ไม่ตัดสิทธิผู้บริโภคที่กฎหมายบังคับหรือความรับผิดที่กฎหมายห้ามยกเว้น']),
  section('suspension', '13. Suspension', '13. การระงับการใช้งาน', ['SolarMatch may restrict access or reject submissions associated with abuse, security threats, fraud or violation of these Terms.'], ['SolarMatch อาจจำกัดการเข้าถึงหรือปฏิเสธคำขอที่เกี่ยวข้องกับการก่อกวน ภัยด้านความปลอดภัย การฉ้อโกง หรือการฝ่าฝืนข้อกำหนดเหล่านี้']),
  section('privacy', '14. Privacy', '14. ความเป็นส่วนตัว', ['Personal data is handled according to the current Privacy Notice and the user’s applicable consent choices.'], ['SolarMatch จัดการข้อมูลส่วนบุคคลตามประกาศความเป็นส่วนตัวฉบับปัจจุบันและการเลือกให้ความยินยอมที่เกี่ยวข้องของผู้ใช้']),
  section('law', '15. Governing law', '15. กฎหมายที่ใช้บังคับ', ['These Terms are governed by the laws of Thailand, subject to mandatory consumer rights and applicable jurisdiction rules.'], ['ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายไทย โดยไม่กระทบสิทธิผู้บริโภคที่กฎหมายกำหนดและหลักเขตอำนาจศาลที่ใช้บังคับ']),
  section('changes', '16. Changes and contact', '16. การเปลี่ยนแปลงและการติดต่อ', ['The current effective date is shown above. Material changes apply prospectively and will not silently expand existing consent. Questions may be sent to [PUBLIC BUSINESS EMAIL] or [PUBLIC BUSINESS PHONE].'], ['วันที่มีผลบังคับใช้ปัจจุบันแสดงไว้ด้านบน การเปลี่ยนแปลงสาระสำคัญจะมีผลในอนาคตและจะไม่ขยายความยินยอมเดิมโดยไม่แจ้งให้ทราบ หากมีคำถาม โปรดติดต่อ [PUBLIC BUSINESS EMAIL] หรือ [PUBLIC BUSINESS PHONE]']),
];

const cookieSections: LegalSection[] = [
  section('scope', '1. Scope', '1. ขอบเขต', ['This policy explains the cookies, browser storage and similar technologies used by SolarMatch.'], ['นโยบายนี้อธิบายคุกกี้ พื้นที่จัดเก็บในเบราว์เซอร์ และเทคโนโลยีที่คล้ายกันซึ่ง SolarMatch ใช้']),
  section('necessary', '2. Necessary technologies', '2. เทคโนโลยีที่จำเป็น', ['SolarMatch and its infrastructure providers may use necessary cookies or tokens for security, session integrity, fraud and abuse prevention, rate limiting, and reliable service delivery.'], ['SolarMatch และผู้ให้บริการโครงสร้างพื้นฐานอาจใช้คุกกี้หรือโทเคนที่จำเป็นเพื่อความปลอดภัย ความสมบูรณ์ของเซสชัน การป้องกันการฉ้อโกงและการใช้งานในทางที่ผิด การจำกัดคำขอ และการให้บริการอย่างน่าเชื่อถือ']),
  section('functional', '3. Functional browser storage', '3. พื้นที่จัดเก็บในเบราว์เซอร์เพื่อการทำงาน', ['SolarMatch uses browser session storage to preserve non-sensitive assessment answers, language, progress, selected solar facts and results during the browsing session. Contact details and consent choices are kept in the current in-memory form and are sent to the secure server only when the user submits them.'], ['SolarMatch ใช้ session storage ของเบราว์เซอร์เพื่อเก็บคำตอบแบบประเมินที่ไม่ใช่ข้อมูลอ่อนไหว ภาษา ความคืบหน้า เกร็ดโซลาร์ที่เลือก และผลประเมินระหว่างเซสชัน ข้อมูลติดต่อและการเลือกให้ความยินยอมจะอยู่ในแบบฟอร์มของเซสชันปัจจุบัน และจะส่งไปยังเซิร์ฟเวอร์ที่ปลอดภัยเมื่อผู้ใช้กดส่งเท่านั้น']),
  section('maps', '4. Maps and external resources', '4. แผนที่และทรัพยากรภายนอก', ['If a user opens the optional map, SolarMatch loads map tiles from OpenStreetMap. The map provider may receive technical request information such as the user’s IP address and browser headers. Typed address text is not sent to an external geocoding service.'], ['หากผู้ใช้เปิดแผนที่เสริม SolarMatch จะโหลดภาพแผนที่จาก OpenStreetMap ซึ่งผู้ให้บริการแผนที่อาจได้รับข้อมูลทางเทคนิคของคำขอ เช่น หมายเลข IP และส่วนหัวของเบราว์เซอร์ โดยข้อความที่อยู่ซึ่งผู้ใช้พิมพ์จะไม่ถูกส่งไปยังบริการค้นหาพิกัดภายนอก']),
  section('analytics', '5. Analytics', '5. การวิเคราะห์', ['SolarMatch currently does not use optional analytics cookies on the public website.'], ['ปัจจุบัน SolarMatch ไม่ใช้คุกกี้วิเคราะห์แบบไม่บังคับบนเว็บไซต์สาธารณะ']),
  section('advertising', '6. Advertising', '6. การโฆษณา', ['SolarMatch currently does not use optional advertising or retargeting cookies on the public website.'], ['ปัจจุบัน SolarMatch ไม่ใช้คุกกี้โฆษณาหรือคุกกี้ติดตามเพื่อแสดงโฆษณาซ้ำแบบไม่บังคับบนเว็บไซต์สาธารณะ']),
  section('future', '7. Future changes', '7. การเปลี่ยนแปลงในอนาคต', ['If SolarMatch introduces additional optional analytics or advertising technologies, this policy and any required consent controls will be updated before those technologies are used.'], ['หาก SolarMatch นำเทคโนโลยีวิเคราะห์หรือโฆษณาแบบไม่บังคับเพิ่มเติมมาใช้ นโยบายนี้และเครื่องมือขอความยินยอมที่จำเป็นจะได้รับการปรับปรุงก่อนเริ่มใช้เทคโนโลยีดังกล่าว']),
  section('manage', '8. Managing storage', '8. การจัดการข้อมูลในเบราว์เซอร์', ['Users can clear cookies and browser storage through browser settings. Clearing necessary storage may sign the user out or reset assessment progress and results.'], ['ผู้ใช้สามารถล้างคุกกี้และข้อมูลในเบราว์เซอร์ผ่านการตั้งค่าเบราว์เซอร์ การล้างข้อมูลที่จำเป็นอาจทำให้ต้องเข้าสู่ระบบใหม่ หรือรีเซ็ตความคืบหน้าและผลประเมิน']),
  section('contact', '9. Changes and contact', '9. การเปลี่ยนแปลงและการติดต่อ', ['The current effective date is shown above. Questions about this policy may be sent to [PRIVACY CONTACT EMAIL].'], ['วันที่มีผลบังคับใช้ปัจจุบันแสดงไว้ด้านบน หากมีคำถามเกี่ยวกับนโยบายนี้ โปรดติดต่อ [PRIVACY CONTACT EMAIL]']),
];

export const legalLaunchDocuments: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft> = {
  privacy: { type: 'privacy', title: { en: 'Privacy Notice', th: 'ประกาศความเป็นส่วนตัว' }, lastUpdatedLabel: { en: 'Effective date', th: 'มีผลบังคับใช้' }, effectiveDate: null, pendingLegalReview: true, sections: privacySections },
  terms: { type: 'terms', title: { en: 'Terms of Use', th: 'ข้อกำหนดการใช้งาน' }, lastUpdatedLabel: { en: 'Effective date', th: 'มีผลบังคับใช้' }, effectiveDate: null, pendingLegalReview: true, sections: termsSections },
  cookies: { type: 'cookies', title: { en: 'Cookie Policy', th: 'นโยบายคุกกี้' }, lastUpdatedLabel: { en: 'Effective date', th: 'มีผลบังคับใช้' }, effectiveDate: null, pendingLegalReview: true, sections: cookieSections },
};

export const legalLaunchDraft = { schemaVersion: 3, operator: emptyOperatorProfile, documents: legalLaunchDocuments, pendingLegalReview: true };

export function operatorProfileComplete(profile: OperatorProfile) {
  return Boolean(profile.legalBusinessNameEn && profile.legalBusinessNameTh && profile.legalEntityType && profile.registrationOrTaxNumber &&
    profile.registeredAddressEn && profile.registeredAddressTh && profile.publicBusinessPhone && profile.publicBusinessEmail &&
    profile.privacyContactEmail && profile.privacyRightsRequestUrl && profile.leadRetentionDays && profile.leadDistributionWindowDays &&
    profile.privacyNoticeEffectiveDate && profile.termsEffectiveDate && profile.cookiePolicyEffectiveDate &&
    profile.dataHostingAndProcessorDetails && profile.operatorRepresentativeName && profile.operatorRepresentativeTitle);
}

export function interpolateLegalDocuments(documents: Record<'privacy' | 'terms' | 'cookies', LegalDocumentDraft>, profile: OperatorProfile) {
  const values: Record<string, string> = {
    '[LEGAL COMPANY NAME EN]': profile.legalBusinessNameEn, '[LEGAL COMPANY NAME TH]': profile.legalBusinessNameTh,
    '[LEGAL BUSINESS NAME EN]': profile.legalBusinessNameEn, '[LEGAL BUSINESS NAME TH]': profile.legalBusinessNameTh,
    '[LEGAL ENTITY TYPE]': profile.legalEntityType, '[COMPANY REGISTRATION / TAX NUMBER]': profile.registrationOrTaxNumber,
    '[BUSINESS REGISTRATION OR TAX NUMBER]': profile.registrationOrTaxNumber, '[REGISTERED ADDRESS EN]': profile.registeredAddressEn,
    '[REGISTERED ADDRESS TH]': profile.registeredAddressTh, '[REGISTERED BUSINESS ADDRESS EN]': profile.registeredAddressEn,
    '[REGISTERED BUSINESS ADDRESS TH]': profile.registeredAddressTh, '[PUBLIC BUSINESS PHONE]': profile.publicBusinessPhone,
    '[PUBLIC BUSINESS EMAIL]': profile.publicBusinessEmail, '[PRIVACY CONTACT EMAIL]': profile.privacyContactEmail,
    '[PRIVACY RIGHTS REQUEST URL]': profile.privacyRightsRequestUrl, '[LEAD RETENTION DAYS]': String(profile.leadRetentionDays ?? ''),
    '[LEAD DISTRIBUTION WINDOW DAYS]': String(profile.leadDistributionWindowDays ?? ''), '[DATA HOSTING AND PROCESSOR DETAILS]': profile.dataHostingAndProcessorDetails,
  };
  const replace = (source: string) => Object.entries(values).reduce((result, [token, value]) => value ? result.replaceAll(token, value) : result, source);
  const next = structuredClone(documents);
  (Object.keys(next) as Array<keyof typeof next>).forEach((type) => {
    next[type].effectiveDate = type === 'privacy' ? profile.privacyNoticeEffectiveDate : type === 'terms' ? profile.termsEffectiveDate : profile.cookiePolicyEffectiveDate;
    next[type].sections.forEach((value) => value.paragraphs.forEach((paragraph) => { paragraph.en = replace(paragraph.en); paragraph.th = replace(paragraph.th); }));
  });
  return next;
}
