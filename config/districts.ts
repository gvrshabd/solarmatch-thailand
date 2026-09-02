import type { Locale } from './i18n';

type DistrictOption = { value: string; en: string; th: string };

export const districtsByProvince: Record<string, DistrictOption[]> = {
  bangkok: [
    ['bang-bon', 'Bang Bon', 'บางบอน'], ['bang-kapi', 'Bang Kapi', 'บางกะปิ'], ['bang-khae', 'Bang Khae', 'บางแค'],
    ['bang-khen', 'Bang Khen', 'บางเขน'], ['bang-kho-laem', 'Bang Kho Laem', 'บางคอแหลม'], ['bang-khun-thian', 'Bang Khun Thian', 'บางขุนเทียน'],
    ['bang-na', 'Bang Na', 'บางนา'], ['bang-phlat', 'Bang Phlat', 'บางพลัด'], ['bang-rak', 'Bang Rak', 'บางรัก'],
    ['bang-sue', 'Bang Sue', 'บางซื่อ'], ['bangkok-noi', 'Bangkok Noi', 'บางกอกน้อย'], ['bangkok-yai', 'Bangkok Yai', 'บางกอกใหญ่'],
    ['bueng-kum', 'Bueng Kum', 'บึงกุ่ม'], ['chatuchak', 'Chatuchak', 'จตุจักร'], ['chom-thong', 'Chom Thong', 'จอมทอง'],
    ['din-daeng', 'Din Daeng', 'ดินแดง'], ['don-mueang', 'Don Mueang', 'ดอนเมือง'], ['dusit', 'Dusit', 'ดุสิต'],
    ['huai-khwang', 'Huai Khwang', 'ห้วยขวาง'], ['khan-na-yao', 'Khan Na Yao', 'คันนายาว'], ['khlong-sam-wa', 'Khlong Sam Wa', 'คลองสามวา'],
    ['khlong-san', 'Khlong San', 'คลองสาน'], ['khlong-toei', 'Khlong Toei', 'คลองเตย'], ['lak-si', 'Lak Si', 'หลักสี่'],
    ['lat-krabang', 'Lat Krabang', 'ลาดกระบัง'], ['lat-phrao', 'Lat Phrao', 'ลาดพร้าว'], ['min-buri', 'Min Buri', 'มีนบุรี'],
    ['nong-chok', 'Nong Chok', 'หนองจอก'], ['nong-khaem', 'Nong Khaem', 'หนองแขม'], ['pathum-wan', 'Pathum Wan', 'ปทุมวัน'],
    ['phasi-charoen', 'Phasi Charoen', 'ภาษีเจริญ'], ['phaya-thai', 'Phaya Thai', 'พญาไท'], ['phra-khanong', 'Phra Khanong', 'พระโขนง'],
    ['phra-nakhon', 'Phra Nakhon', 'พระนคร'], ['pom-prap-sattru-phai', 'Pom Prap Sattru Phai', 'ป้อมปราบศัตรูพ่าย'],
    ['prawet', 'Prawet', 'ประเวศ'], ['rat-burana', 'Rat Burana', 'ราษฎร์บูรณะ'], ['ratchathewi', 'Ratchathewi', 'ราชเทวี'],
    ['sai-mai', 'Sai Mai', 'สายไหม'], ['samphanthawong', 'Samphanthawong', 'สัมพันธวงศ์'], ['saphan-sung', 'Saphan Sung', 'สะพานสูง'],
    ['sathon', 'Sathon', 'สาทร'], ['suan-luang', 'Suan Luang', 'สวนหลวง'], ['taling-chan', 'Taling Chan', 'ตลิ่งชัน'],
    ['thawi-watthana', 'Thawi Watthana', 'ทวีวัฒนา'], ['thon-buri', 'Thon Buri', 'ธนบุรี'], ['thung-khru', 'Thung Khru', 'ทุ่งครุ'],
    ['wang-thonglang', 'Wang Thonglang', 'วังทองหลาง'], ['watthana', 'Watthana', 'วัฒนา'], ['yan-nawa', 'Yan Nawa', 'ยานนาวา'],
  ].map(([value, en, th]) => ({ value, en, th })),
  nonthaburi: [
    ['mueang-nonthaburi', 'Mueang Nonthaburi', 'เมืองนนทบุรี'], ['bang-kruai', 'Bang Kruai', 'บางกรวย'],
    ['bang-yai', 'Bang Yai', 'บางใหญ่'], ['bang-bua-thong', 'Bang Bua Thong', 'บางบัวทอง'],
    ['pak-kret', 'Pak Kret', 'ปากเกร็ด'], ['sai-noi', 'Sai Noi', 'ไทรน้อย'],
  ].map(([value, en, th]) => ({ value, en, th })),
  'pathum-thani': [
    ['mueang-pathum-thani', 'Mueang Pathum Thani', 'เมืองปทุมธานี'], ['khlong-luang', 'Khlong Luang', 'คลองหลวง'],
    ['thanyaburi', 'Thanyaburi', 'ธัญบุรี'], ['nong-suea', 'Nong Suea', 'หนองเสือ'], ['lat-lum-kaeo', 'Lat Lum Kaeo', 'ลาดหลุมแก้ว'],
    ['lam-luk-ka', 'Lam Luk Ka', 'ลำลูกกา'], ['sam-khok', 'Sam Khok', 'สามโคก'],
  ].map(([value, en, th]) => ({ value, en, th })),
  'samut-prakan': [
    ['mueang-samut-prakan', 'Mueang Samut Prakan', 'เมืองสมุทรปราการ'], ['bang-bo', 'Bang Bo', 'บางบ่อ'],
    ['bang-phli', 'Bang Phli', 'บางพลี'], ['phra-pradaeng', 'Phra Pradaeng', 'พระประแดง'],
    ['phra-samut-chedi', 'Phra Samut Chedi', 'พระสมุทรเจดีย์'], ['bang-sao-thong', 'Bang Sao Thong', 'บางเสาธง'],
  ].map(([value, en, th]) => ({ value, en, th })),
  'samut-sakhon': [
    ['mueang-samut-sakhon', 'Mueang Samut Sakhon', 'เมืองสมุทรสาคร'], ['krathum-baen', 'Krathum Baen', 'กระทุ่มแบน'],
    ['ban-phaeo', 'Ban Phaeo', 'บ้านแพ้ว'],
  ].map(([value, en, th]) => ({ value, en, th })),
  'nakhon-pathom': [
    ['mueang-nakhon-pathom', 'Mueang Nakhon Pathom', 'เมืองนครปฐม'], ['kamphaeng-saen', 'Kamphaeng Saen', 'กำแพงแสน'],
    ['nakhon-chai-si', 'Nakhon Chai Si', 'นครชัยศรี'], ['don-tum', 'Don Tum', 'ดอนตูม'], ['bang-len', 'Bang Len', 'บางเลน'],
    ['sam-phran', 'Sam Phran', 'สามพราน'], ['phutthamonthon', 'Phutthamonthon', 'พุทธมณฑล'],
  ].map(([value, en, th]) => ({ value, en, th })),
};

export function localizedDistrictOptions(province: string, locale: Locale) {
  return (districtsByProvince[province] ?? []).map((district) => ({ value: district.value, label: district[locale] }));
}
