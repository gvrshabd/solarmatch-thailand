import historicalCopy from './legal-review-copy.json' with { type: 'json' };

/** New local content revision. The supplied historical JSON and D1 snapshots remain untouched. */
const privacySections = historicalCopy.documents.privacy.sections.map(section => {
  if (section.id === 'data') return {
    ...section,
    bullets: section.bullets?.map(bullet => ({
      en: bullet.en.replace('telephone number, LINE ID or other contact details you choose to provide, and your preferred contact method', 'verified mobile number for new contact requests; historical records may include a previously selected LINE contact method'),
      th: bullet.th.replace('หมายเลขโทรศัพท์ LINE ID หรือช่องทางอื่นที่คุณเลือกให้ และวิธีติดต่อที่คุณต้องการ', 'หมายเลขโทรศัพท์มือถือที่ยืนยันแล้วสำหรับคำขอติดต่อใหม่ โดยข้อมูลในอดีตอาจมีช่องทาง LINE ที่เคยเลือกไว้'),
    })),
    paragraphs: [...section.paragraphs, {
      en: 'New contact requests use a mobile phone number verified by an SMS code. Receiving a code does not authorize advertising. Installer accounts also record company membership, account verification, purchases, credit transactions, enquiry access, claims and outcomes. Payment providers process payment details; SolarMatch does not store card numbers or security codes.',
      th: 'คำขอติดต่อใหม่ใช้หมายเลขโทรศัพท์มือถือที่ยืนยันด้วยรหัสทาง SMS การรับรหัสไม่ได้หมายถึงการอนุญาตให้ส่งโฆษณา บัญชีผู้ติดตั้งมีบันทึกสมาชิกบริษัท การยืนยันบัญชี การซื้อ รายการเครดิต การเข้าถึงคำขอ คำร้อง และผลการติดต่อเพิ่มเติม ผู้ให้บริการชำระเงินเป็นผู้ประมวลผลข้อมูลการชำระเงิน SolarMatch ไม่จัดเก็บหมายเลขบัตรหรือรหัสความปลอดภัยของบัตร',
    }],
  };
  if (section.id === 'sharing') return {
    ...section,
    paragraphs: [...section.paragraphs.map(paragraph => ({
      en: paragraph.en.replace('chosen contact details', 'verified mobile number').replace('Participating installers pay SolarMatch for delivered enquiries.', 'Participating installers may use a free trial or pay SolarMatch for delivered enquiries.'),
      th: paragraph.th.replace('ช่องทางติดต่อที่คุณเลือก', 'หมายเลขโทรศัพท์มือถือที่ยืนยันแล้ว').replace('บริษัทติดตั้งที่เข้าร่วมชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ', 'บริษัทติดตั้งที่เข้าร่วมอาจใช้สิทธิ์ทดลองฟรีหรือชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ'),
    })), {
      en: 'A receiving company may give its staff a limited-access link to its individual enquiry. Links expire and may be revoked. A shared enquiry can reach at most three distinct companies, including trial deliveries. Restoring a credit does not open another company slot.',
      th: 'บริษัทผู้รับข้อมูลอาจให้พนักงานใช้ลิงก์ที่จำกัดการเข้าถึงคำขอเฉพาะรายการของบริษัท ลิงก์มีวันหมดอายุและเพิกถอนได้ คำขอแบบใช้ร่วมกันส่งให้บริษัทที่แตกต่างกันได้ไม่เกินสามราย รวมการส่งในสิทธิ์ทดลอง การคืนเครดิตไม่เปิดโควตาบริษัทผู้รับเพิ่มเติม',
    }],
  };
  if (section.id === 'retention') return {
    ...section,
    paragraphs: section.paragraphs.map(paragraph => ({
      en: paragraph.en.startsWith('We normally retain identifiable homeowner enquiry records for no longer than') ? 'The retention period for identifiable homeowner enquiry records is pending review and will be stated here before the contact service launches. Records are deleted or anonymised when no longer needed and no lawful retention reason remains.' : paragraph.en,
      th: paragraph.th.startsWith('โดยปกติ เราเก็บบันทึกคำขอของเจ้าของบ้านที่ระบุตัวบุคคลได้ไม่เกิน') ? 'ระยะเวลาเก็บบันทึกคำขอของเจ้าของบ้านที่ระบุตัวบุคคลได้อยู่ระหว่างการทบทวน และจะระบุไว้ที่นี่ก่อนเปิดบริการติดต่อ เราจะลบหรือทำให้ข้อมูลไม่สามารถระบุตัวบุคคลได้เมื่อหมดความจำเป็นและไม่มีเหตุอันชอบด้วยกฎหมายให้เก็บต่อ' : paragraph.th,
    })),
  };
  if (section.id === 'age') return {
    ...section,
    paragraphs: section.paragraphs.map(paragraph => ({
      en: paragraph.en.replace('who own the property or are authorised by its owner', 'who meet the property-authority criteria stated when they request contact'),
      th: paragraph.th.replace('ซึ่งเป็นเจ้าของทรัพย์สินหรือได้รับอนุญาตจากเจ้าของ', 'ซึ่งผ่านเกณฑ์อำนาจเกี่ยวกับทรัพย์สินที่ระบุเมื่อขอรับการติดต่อ'),
    })),
  };
  return section;
});
const termsSections = historicalCopy.documents.terms.sections.map(section => {
  if (section.id === 'service') return {...section, paragraphs: section.paragraphs.map(paragraph => ({
    en: paragraph.en.replace('Installers pay us for delivered enquiries.', 'Participating installers may use a free trial or pay for delivered enquiries.'),
    th: paragraph.th.replace('บริษัทติดตั้งชำระค่าบริการให้เราสำหรับคำขอที่ได้รับ', 'บริษัทติดตั้งที่เข้าร่วมอาจใช้สิทธิ์ทดลองฟรีหรือชำระค่าบริการสำหรับคำขอที่ได้รับ'),
  }))};
  if (section.id === 'eligibility') return {...section, paragraphs: section.paragraphs.map(paragraph => ({
    en: paragraph.en.replace('who own the property or are authorised by the owner', 'who meet the property-authority criteria stated in the contact request').replace('Give accurate information and your own contact details.', 'Give accurate information and your own mobile number, which must be verified by SMS.'),
    th: paragraph.th.replace('ซึ่งเป็นเจ้าของทรัพย์สินหรือได้รับอนุญาตจากเจ้าของ', 'ซึ่งผ่านเกณฑ์อำนาจเกี่ยวกับทรัพย์สินที่ระบุในคำขอรับการติดต่อ').replace('โปรดให้ข้อมูลที่ถูกต้องและข้อมูลติดต่อของตนเอง', 'โปรดให้ข้อมูลที่ถูกต้องและหมายเลขโทรศัพท์มือถือของตนเอง ซึ่งต้องยืนยันด้วย SMS'),
  }))};
  return section;
});
const currentCopy = {
  ...historicalCopy,
  contentVersion: 'legal-review-installer-commercial-2026-10-11-v3',
  contactLaunch: {
    ...historicalCopy.contactLaunch,
    shortDisclosure: {
      en: historicalCopy.contactLaunch.shortDisclosure.en.replace('chosen contact details', 'verified mobile number').replace('Those companies pay SolarMatch for delivered enquiries', 'Those companies may use a free trial or pay SolarMatch for delivered enquiries'),
      th: historicalCopy.contactLaunch.shortDisclosure.th.replace('ช่องทางติดต่อที่คุณเลือก', 'หมายเลขโทรศัพท์มือถือที่ยืนยันแล้ว').replace('บริษัทเหล่านี้ชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ', 'บริษัทเหล่านี้อาจใช้สิทธิ์ทดลองฟรีหรือชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ'),
    },
    consent: {
      en: historicalCopy.contactLaunch.consent.en.replace('chosen contact details', 'verified mobile number').replace('using my selected contact method', 'by telephone').replace('installers pay SolarMatch', 'installers may pay SolarMatch'),
      th: historicalCopy.contactLaunch.consent.th.replace('ช่องทางติดต่อที่ฉันเลือก', 'หมายเลขโทรศัพท์มือถือที่ยืนยันแล้วของฉัน').replace('ผ่านวิธีติดต่อที่ฉันเลือก', 'ทางโทรศัพท์').replace('บริษัทติดตั้งชำระค่าบริการให้ SolarMatch', 'บริษัทติดตั้งอาจชำระค่าบริการให้ SolarMatch'),
    },
    adultConfirmation: {
      en: historicalCopy.contactLaunch.adultConfirmation.en.replace('my own accurate contact details', 'my own accurate mobile number'),
      th: historicalCopy.contactLaunch.adultConfirmation.th.replace('ข้อมูลติดต่อของตนเองที่ถูกต้อง', 'หมายเลขโทรศัพท์มือถือของตนเองที่ถูกต้อง'),
    },
    recipientConfirmation: {
      en: historicalCopy.contactLaunch.recipientConfirmation.en.replace('through [SELECTED_CONTACT_METHOD]', 'by telephone'),
      th: historicalCopy.contactLaunch.recipientConfirmation.th.replace('ผ่าน [SELECTED_CONTACT_METHOD]', 'ทางโทรศัพท์'),
    },
  },
  documents: {
    ...historicalCopy.documents,
    privacy: {
      ...historicalCopy.documents.privacy,
      sections: privacySections,
    },
    terms: {...historicalCopy.documents.terms, sections: termsSections},
  },
  disclosures: {
    ...historicalCopy.disclosures,
    privacyRequests: {
      en: historicalCopy.disclosures.privacyRequests.en.replace('48-hour credit-claim window', 'seven-day credit-claim submission window'),
      th: historicalCopy.disclosures.privacyRequests.th.replace('กำหนดเวลา 48 ชั่วโมงสำหรับบริษัทติดตั้งขอคืนเครดิต', 'กำหนดเวลาเจ็ดวันสำหรับบริษัทติดตั้งยื่นคำร้องขอคืนเครดิต'),
    },
  },
};
export default currentCopy;
