import type { LocalizedText } from '@/lib/questionnaire/types';

type ModeCopy = {
  question: LocalizedText;
  help: LocalizedText;
  yesLabel: LocalizedText;
  noLabel: LocalizedText;
  consent: LocalizedText;
};

export type ContactContent = {
  contactModes: {
    validation_interest: ModeCopy;
    named_installer_handoff: ModeCopy;
    shared_solar_company_handoff: ModeCopy;
    common: {
      declineTitle: LocalizedText;
      declineBody: LocalizedText;
      declineContinueLabel: LocalizedText;
      skipLabel: LocalizedText;
      failureTitle: LocalizedText;
      failureBody: LocalizedText;
      adultConfirmation: LocalizedText;
    };
  };
  loading: {
    title: LocalizedText;
    help: LocalizedText;
  };
};

export const contactContent: ContactContent = {
  contactModes: {
    validation_interest: {
      question: {
        en: 'Would you like SolarMatch to contact you about the next step toward arranging a solar site assessment?',
        th: 'ต้องการให้ SolarMatch ติดต่อกลับเพื่อแนะนำขั้นตอนถัดไปในการนัดสำรวจหน้างานไหม?',
      },
      help: {
        en: 'We can confirm your interest and explain what normally happens next. During this validation stage, your details will remain with SolarMatch and will not be sent to a solar company without asking you first.',
        th: 'เราจะติดต่อเพื่อยืนยันความสนใจและอธิบายขั้นตอนถัดไป ในช่วงทดสอบนี้ข้อมูลของคุณจะเก็บไว้กับ SolarMatch และจะไม่ถูกส่งต่อให้บริษัทโซลาร์ เว้นแต่เราจะขอและได้รับความยินยอมจากคุณอีกครั้ง',
      },
      yesLabel: { en: 'Yes, SolarMatch may contact me', th: 'ต้องการให้ SolarMatch ติดต่อกลับ' },
      noLabel: { en: 'Not right now', th: 'ยังไม่ต้องการตอนนี้' },
      consent: {
        en: 'I agree that SolarMatch may store my contact request and contact me through my selected method about the next step toward a residential solar site assessment. My details will not be shared with a solar company without separate permission.',
        th: 'ฉันยินยอมให้ SolarMatch จัดเก็บคำขอติดต่อและติดต่อกลับผ่านช่องทางที่เลือก เพื่อแนะนำขั้นตอนถัดไปในการนัดสำรวจหน้างานโซลาร์สำหรับที่พักอาศัย โดยข้อมูลของฉันจะไม่ถูกส่งต่อให้บริษัทโซลาร์หากยังไม่ได้รับความยินยอมแยกต่างหาก',
      },
    },
    named_installer_handoff: {
      question: {
        en: 'Would you like {{recipient}} to contact you to arrange a site assessment?',
        th: 'ต้องการให้ {{recipient}} ติดต่อกลับเพื่อนัดสำรวจหน้างานไหม?',
      },
      help: {
        en: 'If you continue, SolarMatch will send the information listed below to {{recipient}} so its team can contact you about a residential solar assessment and quotation.',
        th: 'หากดำเนินการต่อ SolarMatch จะส่งข้อมูลตามรายการด้านล่างให้ {{recipient}} เพื่อให้ทีมงานติดต่อคุณเกี่ยวกับการประเมินหน้างานและใบเสนอราคาโซลาร์สำหรับที่พักอาศัย',
      },
      yesLabel: { en: 'Yes, I would like to be contacted', th: 'ต้องการให้ติดต่อ' },
      noLabel: { en: 'Not right now', th: 'ยังไม่ต้องการตอนนี้' },
      consent: {
        en: 'I agree that SolarMatch may send the information listed below to {{recipient}} so that the company may contact me through my selected method about a residential solar site assessment and quotation. I have read the recipient’s Privacy Notice. I understand that SolarMatch is not the installer and may be paid by the receiving company.',
        th: 'ฉันยินยอมให้ SolarMatch ส่งข้อมูลตามรายการด้านล่างให้ {{recipient}} เพื่อให้บริษัทติดต่อกลับผ่านช่องทางที่เลือก เกี่ยวกับการประเมินหน้างานและใบเสนอราคาโซลาร์สำหรับที่พักอาศัย ฉันได้อ่านประกาศความเป็นส่วนตัวของผู้รับข้อมูลแล้ว และเข้าใจว่า SolarMatch ไม่ใช่ผู้ติดตั้งและอาจได้รับค่าตอบแทนจากบริษัทผู้รับข้อมูล',
      },
    },
    shared_solar_company_handoff: {
      question: {
        en: 'Would you like to be contacted by solar companies?',
        th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับไหม?',
      },
      help: {
        en: 'If you choose Yes, SolarMatch may share your name, contact details, location and relevant assessment answers with participating residential solar companies that serve your area. More than one company may receive your information and contact you by phone or LINE, and the number may vary. SolarMatch may receive payment from these companies for the introduction. You will still receive your estimate if you choose No.',
        th: 'หากเลือก “ต้องการ” SolarMatch อาจส่งชื่อ ข้อมูลติดต่อ พื้นที่ และคำตอบที่เกี่ยวข้องจากแบบประเมินของคุณให้บริษัทติดตั้งโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมและให้บริการในพื้นที่ของคุณ ข้อมูลของคุณอาจถูกส่งให้มากกว่าหนึ่งบริษัท และแต่ละบริษัทอาจติดต่อคุณทางโทรศัพท์หรือ LINE โดยจำนวนบริษัทอาจแตกต่างกันไป SolarMatch อาจได้รับค่าตอบแทนจากบริษัทเหล่านี้สำหรับการแนะนำลูกค้า คุณยังคงได้รับผลประเมินแม้เลือก “ไม่ต้องการ”',
      },
      yesLabel: { en: 'Yes, I would like solar companies to contact me', th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับ' },
      noLabel: { en: 'No, show me my estimate', th: 'ไม่ต้องการ ดูผลประเมินต่อ' },
      consent: {
        en: 'I explicitly consent to SolarMatch sharing my name, contact details, location and relevant assessment answers with participating residential solar companies that serve my area, so they may contact me about a residential solar site survey and quotation. I understand that more than one company may receive my information, the number may vary, and SolarMatch may receive payment for the introduction. I have read the Privacy Notice.',
        th: 'ฉันยินยอมโดยชัดแจ้งให้ SolarMatch ส่งชื่อ ข้อมูลติดต่อ พื้นที่ และคำตอบที่เกี่ยวข้องจากแบบประเมินของฉันให้บริษัทติดตั้งโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมและให้บริการในพื้นที่ของฉัน เพื่อให้บริษัทเหล่านั้นติดต่อเกี่ยวกับการสำรวจหน้างานและใบเสนอราคา ฉันเข้าใจว่าข้อมูลของฉันอาจถูกส่งให้มากกว่าหนึ่งบริษัท จำนวนบริษัทอาจแตกต่างกันไป และ SolarMatch อาจได้รับค่าตอบแทนสำหรับการแนะนำลูกค้า ฉันได้อ่านประกาศความเป็นส่วนตัวแล้ว',
      },
    },
    common: {
      declineTitle: { en: 'Continue without contact details', th: 'ดูผลประเมินต่อโดยไม่ต้องให้ข้อมูลติดต่อ' },
      declineBody: {
        en: 'Your estimate is still available. You can continue now without providing contact details.',
        th: 'คุณยังดูผลประเมินได้ตามปกติโดยไม่ต้องให้ข้อมูลติดต่อ',
      },
      declineContinueLabel: { en: 'Continue to my result', th: 'ดูผลประเมินต่อ' },
      skipLabel: { en: 'Continue to my results without submitting', th: 'ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ' },
      failureTitle: { en: 'We could not save your contact request', th: 'ยังบันทึกคำขอติดต่อไม่ได้' },
      failureBody: {
        en: 'Your assessment and result are safe in this browser. You can try again or continue to your result without submitting contact details.',
        th: 'คำตอบและผลประเมินของคุณยังอยู่ในเบราว์เซอร์นี้ คุณสามารถลองอีกครั้งหรือดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ',
      },
      adultConfirmation: {
        en: 'I confirm that I am at least 20 years old and that I am the property owner or am authorized by the property owner to request contact about this property.',
        th: 'ฉันยืนยันว่ามีอายุอย่างน้อย 20 ปี และเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของให้ขอรับการติดต่อเกี่ยวกับอสังหาริมทรัพย์นี้',
      },
    },
  },
  loading: {
    title: { en: 'Preparing your solar estimate', th: 'กำลังเตรียมผลประเมินโซลาร์ของคุณ' },
    help: { en: 'While we prepare your result, here’s a quick solar fact.', th: 'ระหว่างเตรียมผลประเมิน ลองดูเกร็ดน่ารู้เกี่ยวกับพลังงานแสงอาทิตย์' },
  },
};
