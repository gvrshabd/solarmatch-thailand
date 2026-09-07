import type { Locale } from './i18n';

export const provinceOptions = [
  { value: 'bangkok', th: 'กรุงเทพมหานคร', en: 'Bangkok', initialLaunchArea: true },
  { value: 'nonthaburi', th: 'นนทบุรี', en: 'Nonthaburi', initialLaunchArea: true },
  { value: 'pathum-thani', th: 'ปทุมธานี', en: 'Pathum Thani', initialLaunchArea: true },
  { value: 'samut-prakan', th: 'สมุทรปราการ', en: 'Samut Prakan', initialLaunchArea: true },
  { value: 'samut-sakhon', th: 'สมุทรสาคร', en: 'Samut Sakhon', initialLaunchArea: true },
  { value: 'nakhon-pathom', th: 'นครปฐม', en: 'Nakhon Pathom', initialLaunchArea: true },
  { value: 'other', th: 'พื้นที่อื่น', en: 'Other area', initialLaunchArea: false },
] as const;

export function localizedProvinceOptions(locale: Locale) {
  return provinceOptions.map((province) => ({
    value: province.value,
    label: province[locale],
  }));
}

export const initialLaunchProvinces = provinceOptions.filter((province) => province.initialLaunchArea);
