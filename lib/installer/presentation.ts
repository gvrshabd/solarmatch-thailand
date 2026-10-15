import { localizedProvinceOptions } from '@/config/provinces';
import { localizedDistrictOptions } from '@/config/districts';
import type { InstallerDelivery } from './portal-contract';
export function deliveryLocation(item: Pick<InstallerDelivery,'province'|'district'|'customArea'|'location'>, en: boolean) {
  if (!item.province) return item.location;
  const locale=en?'en':'th';
  const province=localizedProvinceOptions(locale).find(p=>p.value===item.province)?.label||item.province;
  const district=localizedDistrictOptions(item.province,locale).find(d=>d.value===item.district)?.label||item.district;
  return [district,item.customArea,province].filter(Boolean).join(', ');
}
export function thaiPhone(value: string) {
  const local=value.replace(/^\+66/,'0').replace(/[^0-9]/g,'');
  return /^0[689]\d{8}$/.test(local)?local.slice(0,3)+' '+local.slice(3,6)+' '+local.slice(6):value;
}
export function portalMoney(minor: number, currency: string, en: boolean, whole=false) {
  return new Intl.NumberFormat(en?'en-GB':'th-TH',{style:'currency',currency,currencyDisplay:currency==='THB'?'narrowSymbol':'symbol',minimumFractionDigits:whole?0:2,maximumFractionDigits:whole?0:2}).format(minor/100);
}
