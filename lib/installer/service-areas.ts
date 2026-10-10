import { provinceOptions } from '@/config/provinces';
export function normalizeServiceArea(value:string) {
  const normalized=value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en');
  if(['กรุงเทพ','กทม','กทม.','bkk','krung thep'].includes(normalized))return 'bangkok';
  const province=provinceOptions.find(option=>[option.value,option.en.toLocaleLowerCase('en'),option.th].includes(normalized));
  return province?.value ?? normalized;
}
