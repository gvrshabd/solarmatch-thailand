export const CONTACT_CONSUMPTION_VERSION = 'residential-consumption-v1';
export type ContactConsumptionSnapshot = {
  version: typeof CONTACT_CONSUMPTION_VERSION;
  input: 'bill' | 'kwh';
  reportedBillThb: number | null;
  reportedKwh: number | null;
  billingPeriodDays: number | null;
  periodAssumed: boolean;
  monthlyKwh: number | null;
  qualificationBillThb: number;
  tariff: {id: string; authority: string; category: string; referenceDate: string; ft: number; vat: number; service: number; tiers: unknown; source: string; warnings: string[]} | null;
};

/** Read the server-owned immutable scoring snapshot; legacy rows retain their original bill. */
export function storedContactConsumption(explanation:unknown):ContactConsumptionSnapshot|null {
  try {const v=typeof explanation==='string'?JSON.parse(explanation):explanation;
    const c=(v as {consumption?:ContactConsumptionSnapshot}|null)?.consumption;
    return c?.version===CONTACT_CONSUMPTION_VERSION&&['bill','kwh'].includes(c.input)&&Number.isFinite(c.qualificationBillThb)?c:null;
  }catch{return null;}
}
export function consumptionSummary(c:ContactConsumptionSnapshot|null,legacyBill:number,en=true) {
  if(c?.input==='kwh')return en?`${c.reportedKwh} kWh / ${Number(c.billingPeriodDays?.toFixed(2))} days${c.periodAssumed?' (period assumed)':''}; no bill supplied. Qualification equivalent: ฿${Math.round(c.qualificationBillThb).toLocaleString('en-US')}/month (${c.version}).`:`${c.reportedKwh} kWh / ${Number(c.billingPeriodDays?.toFixed(2))} วัน${c.periodAssumed?' (สมมติจำนวนวัน)':''}; ไม่ได้กรอกค่าไฟ ค่าไฟเทียบเท่าเพื่อคัดกรอง ${Math.round(c.qualificationBillThb).toLocaleString('th-TH')} บาท/เดือน (${c.version})`;
  return en?`Homeowner-provided bill: ฿${(c?.reportedBillThb??legacyBill).toLocaleString('en-US')}/month`:`ค่าไฟที่ผู้ใช้กรอก: ${(c?.reportedBillThb??legacyBill).toLocaleString('th-TH')} บาท/เดือน`;
}
