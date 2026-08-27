import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Eye, Scale, ShieldCheck } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';

export const metadata: Metadata = { title: 'เกี่ยวกับ SolarMatch' };
export default function AboutPage() {
  return <main><PageHero eyebrow="About" title="สร้างพื้นที่ให้เจ้าของบ้านได้คิด ก่อนถูกขอให้ตัดสินใจ"><p>SolarMatch Thailand เป็นเว็บไซต์ต้นแบบที่กำลังตรวจสอบว่าการอธิบายความต้องการโซลาร์แบบเป็นกลางจะช่วยให้การพูดคุยระหว่างเจ้าของบ้านกับผู้ติดตั้งดีขึ้นหรือไม่</p></PageHero>
    <section className="site-shell about-grid"><article><Eye /><h2>เริ่มจากความชัดเจน</h2><p>บอกให้เห็นว่าส่วนใดเป็นข้อมูล ส่วนใดเป็นสมมติฐาน และส่วนใดยังไม่พร้อมใช้จริง</p></article><article><Scale /><h2>ไม่สร้างข้อสรุปเกินข้อมูล</h2><p>แสดงผลเป็นช่วงและไม่อ้างว่าระบบใด “ดีที่สุด” โดยไม่มีการสำรวจหน้างาน</p></article><article><ShieldCheck /><h2>ความยินยอมมาก่อนการส่งต่อ</h2><p>ผู้ใช้ควรเห็นผลก่อน และต้องรู้ชัดว่าข้อมูลใดจะถูกส่งให้ใคร เพราะเหตุใด</p></article></section>
    <section className="founder-note"><div className="site-shell"><p className="eyebrow">สถานะโครงการ</p><h2>กำลังสร้างควบคู่กับการสัมภาษณ์ตลาด</h2><p>เกณฑ์คุณสมบัติลีด ราคา การจับคู่ และข้อกำหนดผู้ติดตั้งยังถูกตั้งใจเว้นไว้ จนกว่าจะมีหลักฐานจากทั้งเจ้าของบ้านและผู้ซื้อที่มีศักยภาพ</p><Link className="text-link" href="/methodology">อ่านวิธีที่เราแยกต้นแบบออกจากของจริง <ArrowRight size={18} /></Link></div></section>
  </main>;
}
