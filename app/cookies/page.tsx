import { LegalShell } from '@/components/content/legal-shell';
import { thaiMetadata } from '@/lib/seo/localized-metadata';

export const metadata = thaiMetadata('ร่างนโยบายคุกกี้', '/cookies');
export default function CookiesPage() {
  return <LegalShell title="คุกกี้และการจัดเก็บในเบราว์เซอร์" summary="ต้นแบบใช้ session storage เพื่อทำแบบประเมินต่อเนื่อง และไม่มีคุกกี้ analytics หรือโฆษณา"><h2>1. สิ่งที่เก็บในเบราว์เซอร์</h2><p>แบบประเมินเก็บข้อความที่อยู่ พิกัดที่ยืนยัน จังหวัด ข้อมูลค่าไฟ คำตอบหลังคา และผลลัพธ์ใน session storage เพื่อให้รีเฟรชและเปลี่ยนภาษาได้โดยไม่เริ่มใหม่ ข้อมูลนี้ไม่ใช่ฐานข้อมูลของ SolarMatch</p><h2>2. สิ่งที่ไม่เปิดใช้</h2><p>ไม่มีคุกกี้โฆษณา analytics pixel heatmap ตัวติดตามข้ามเว็บไซต์ CRM หรือฐานข้อมูลลูกค้าฝั่งเซิร์ฟเวอร์</p><h2>3. คำขอแผนที่จากบุคคลที่สาม</h2><p>เมื่อเปิดแผนที่ เบราว์เซอร์จะขอแผ่นภาพของบริเวณที่มองเห็นจาก OpenStreetMap ตามเงื่อนไขและนโยบายความเป็นส่วนตัวของ OpenStreetMap Foundation โดยไม่มีข้อความที่อยู่ที่พิมพ์อยู่ในคำขอ</p><h2>4. การลบข้อมูลชั่วคราว</h2><p>กด “ล้างข้อมูลและเริ่มใหม่” เพื่อลบข้อมูลแบบประเมินทันที หรือปิดเซสชันตามพฤติกรรมของเบราว์เซอร์</p></LegalShell>;
}
