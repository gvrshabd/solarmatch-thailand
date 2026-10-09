/** Display-only legal review. This does not enable collection or create a lead. */
export const contactReviewCopy = {
  label: { en: 'Test', th: 'ทดสอบ (Test)' },
  help: {
    en: 'Preview the consent checkbox and contact form. No request will be submitted.',
    th: 'ดูช่องความยินยอมและแบบฟอร์มข้อมูลติดต่อ โดยไม่มีการส่งคำขอติดต่อ',
  },
  notice: {
    en: 'Test only — nothing you enter here is sent, saved or shared. Use sample details to review the form.',
    th: 'สำหรับทดสอบเท่านั้น ข้อมูลที่กรอกที่นี่จะไม่ถูกส่ง บันทึก หรือส่งต่อ กรุณาใช้ข้อมูลสมมติเพื่อตรวจสอบแบบฟอร์ม',
  },
  finish: { en: 'Finish test and view my estimate', th: 'จบการทดสอบและดูผลประเมิน' },
  skip: { en: 'View my estimate without completing the test', th: 'ดูผลประเมินโดยไม่ต้องกรอกแบบฟอร์มทดสอบให้ครบ' },
} as const;
