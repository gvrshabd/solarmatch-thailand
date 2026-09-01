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

export const lockedSharedConsentCopy: LocalizedText = {
  en: 'I explicitly consent to SolarMatch storing my request and information, and I give SolarMatch permission to share my name, contact details, location and relevant assessment answers with solar service providers, installers, their authorized representatives, or other businesses involved in providing solar services, so they may contact me with relevant solar information and/or offers for solar-related services. I understand that SolarMatch may be paid for the connection and that choosing Yes does not guarantee that I will be contacted or receive a quotation. I have read the Privacy Notice.',
  th: 'ข้าพเจ้ายินยอมโดยชัดแจ้งให้ SolarMatch จัดเก็บคำขอและข้อมูลของข้าพเจ้า และอนุญาตให้ SolarMatch ส่งต่อหรือเปิดเผยชื่อ ข้อมูลติดต่อ สถานที่ตั้ง และคำตอบที่เกี่ยวข้องจากแบบประเมินของข้าพเจ้าแก่ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาตของผู้ให้บริการหรือผู้ติดตั้งดังกล่าว หรือธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์ เพื่อให้บุคคลหรือธุรกิจเหล่านั้นสามารถติดต่อข้าพเจ้าพร้อมข้อมูลที่เกี่ยวข้องกับโซลาร์ และ/หรือข้อเสนอเกี่ยวกับบริการที่เกี่ยวข้องกับโซลาร์ ข้าพเจ้าเข้าใจว่า SolarMatch อาจได้รับค่าตอบแทนจากการเชื่อมโยงดังกล่าว และการเลือก “ใช่” ไม่ได้รับประกันว่าจะมีผู้ใดติดต่อข้าพเจ้า หรือว่าข้าพเจ้าจะได้รับใบเสนอราคา ข้าพเจ้าได้อ่านประกาศความเป็นส่วนตัวแล้ว',
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
        en: 'Want real quotes from local installers?',
        th: 'อยากได้ใบเสนอราคาจริงจากผู้ติดตั้งในพื้นที่ไหม?',
      },
      help: {
        en: 'Choose Yes or No to continue.',
        th: 'เลือกใช่หรือไม่ใช่เพื่อดำเนินการต่อ',
      },
      yesLabel: { en: 'Yes, I would like solar companies to contact me', th: 'ใช่ ฉันต้องการให้บริษัทโซลาร์ติดต่อ' },
      noLabel: { en: 'No', th: 'ไม่ใช่' },
      consent: lockedSharedConsentCopy,
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
