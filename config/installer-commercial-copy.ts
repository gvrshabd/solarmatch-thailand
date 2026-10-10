import historicalCopy from './legal-review-copy.json' with { type: 'json' };

/** New local content revision. The supplied historical JSON and D1 snapshots remain untouched. */
const currentCopy = {
  ...historicalCopy,
  contentVersion: 'legal-review-installer-commercial-2026-10-11-v2',
  contactLaunch: {
    ...historicalCopy.contactLaunch,
    consent: {
      en: historicalCopy.contactLaunch.consent.en.replace('chosen contact details', 'verified mobile number').replace('using my selected contact method', 'by telephone').replace('installers pay SolarMatch', 'installers may pay SolarMatch'),
      th: historicalCopy.contactLaunch.consent.th.replace('ช่องทางติดต่อที่ฉันเลือก', 'หมายเลขโทรศัพท์มือถือที่ยืนยันแล้วของฉัน').replace('ผ่านวิธีติดต่อที่ฉันเลือก', 'ทางโทรศัพท์').replace('บริษัทติดตั้งชำระค่าบริการให้ SolarMatch', 'บริษัทติดตั้งอาจชำระค่าบริการให้ SolarMatch'),
    },
  },
  documents: {
    ...historicalCopy.documents,
    privacy: {
      ...historicalCopy.documents.privacy,
      sections: historicalCopy.documents.privacy.sections.map(section => section.id === 'data' ? {
        ...section,
        paragraphs: [...section.paragraphs, {
          en: 'New contact requests use a mobile phone number verified by an SMS code. Verification records help prevent misuse; receiving a code does not authorize advertising. Historical records may retain a previously selected LINE contact method. Installer accounts additionally record company membership, account verification, purchases, credit transactions, enquiry access, claims and outcomes. Payment providers process payment details; SolarMatch does not store card numbers or security codes.',
          th: 'คำขอติดต่อใหม่ใช้หมายเลขโทรศัพท์มือถือที่ยืนยันด้วยรหัสทาง SMS บันทึกการยืนยันช่วยป้องกันการใช้งานในทางที่ผิด การรับรหัสไม่ได้หมายถึงการอนุญาตให้ส่งโฆษณา ข้อมูลในอดีตอาจยังมีช่องทาง LINE ที่เคยเลือกไว้ บัญชีผู้ติดตั้งมีบันทึกสมาชิกบริษัท การยืนยันบัญชี การซื้อ รายการเครดิต การเข้าถึงคำขอ คำร้อง และผลการติดต่อเพิ่มเติม ผู้ให้บริการชำระเงินเป็นผู้ประมวลผลข้อมูลการชำระเงิน SolarMatch ไม่จัดเก็บหมายเลขบัตรหรือรหัสความปลอดภัยของบัตร',
        }],
      } : section.id === 'sharing' ? {
        ...section,
        paragraphs: [...section.paragraphs, {
          en: 'An authorized receiving company may give its staff a limited-access enquiry link. Each link exposes only that company’s individual enquiry, expires, and may be revoked. Shared enquiries are limited to three distinct companies, including trial deliveries. Restoring a company’s credit does not create permission to share with an additional company.',
          th: 'บริษัทผู้รับข้อมูลที่ได้รับอนุญาตอาจให้พนักงานใช้ลิงก์ที่จำกัดการเข้าถึงคำขอ ลิงก์แต่ละรายการเปิดได้เฉพาะคำขอของบริษัทนั้น มีวันหมดอายุ และเพิกถอนได้ คำขอแบบใช้ร่วมกันจำกัดผู้รับไว้ที่บริษัทที่แตกต่างกันไม่เกินสามราย รวมการส่งในสิทธิ์ทดลอง การคืนเครดิตให้บริษัทไม่ได้เป็นการอนุญาตให้ส่งข้อมูลแก่บริษัทเพิ่มเติม',
        }],
      } : section),
    },
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
