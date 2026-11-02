import { siteConfig } from './site';

/** The public help configuration is shared by Contact and saved-request help. */
export function supportChannels(contact: {email?: string; phone?: string} = siteConfig.contact) {
  const email = contact.email?.trim() ?? '';
  const phone = contact.phone?.trim() ?? '';
  const validEmail = /^[^\s@<>\[\]]+@[^\s@<>\[\]]+\.[^\s@<>\[\]]+$/u.test(email)
    && !/[\r\n]/u.test(email) && !/\.(invalid|test|example)$/iu.test(email);
  const canonicalPhone = phone.replace(/[\s()-]/gu, '');
  return {
    email: validEmail ? email : '',
    emailHref: validEmail ? 'mailto:' + encodeURIComponent(email).replace('%40', '@') : '',
    phone: /^\+?\d{9,15}$/u.test(canonicalPhone) ? phone : '',
    phoneHref: /^\+?\d{9,15}$/u.test(canonicalPhone) ? 'tel:' + canonicalPhone : '',
  };
}

