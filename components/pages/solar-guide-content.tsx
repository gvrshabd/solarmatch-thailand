import Link from '@/components/site/internal-link';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import { legalReviewDisclosures, prelaunchNotice } from '@/config/legal-review';
import { localizedPath, type Locale } from '@/config/i18n';

const checkedOn = '2026-10-19';

export function SolarGuideContent({ locale }: { locale: Locale }) {
  const en = locale === 'en';
  const path = (value: string) => localizedPath(value, locale);
  return <main>
    <PageHero eyebrow="Solar guide" title={en ? 'A guide to home solar' : 'คู่มือโซลาร์สำหรับบ้าน'}>
      <p>{en ? 'Use this guide to decide what to investigate, then ask installers to survey and quote for your home.' : 'ใช้คู่มือนี้เพื่อวางคำถามก่อนสำรวจหน้างานและขอใบเสนอราคาสำหรับบ้านของคุณ'}</p>
      <p className="updated-date">{en ? 'Guide updated 19 October 2026' : 'ปรับปรุงคู่มือ 19 ตุลาคม 2569'} · <time dateTime={checkedOn}>{checkedOn}</time></p>
    </PageHero>
    <section className="site-shell guide-layout">
      <nav className="guide-index" aria-label={en ? 'Contents' : 'สารบัญ'}>
        <strong>{en ? 'On this page' : 'ในหน้านี้'}</strong>
        <a href="#explore">{en ? 'Worth exploring?' : 'ควรศึกษาเพิ่มไหม'}</a>
        <a href="#price">{en ? 'Installation price' : 'ราคาติดตั้ง'}</a>
        <a href="#quotes">{en ? 'Compare quotes' : 'เทียบใบเสนอราคา'}</a>
        <a href="#warranties">{en ? 'Warranties' : 'การรับประกัน'}</a>
        <a href="#process">{en ? 'Survey to handover' : 'สำรวจถึงส่งมอบ'}</a>
      </nav>
      <article className="prose guide-prose">
        <section id="explore">
          <p className="eyebrow">01 · {en ? 'Your home' : 'บ้านของคุณ'}</p>
          <h2>{en ? 'Is solar worth exploring?' : 'บ้านนี้ควรศึกษาโซลาร์ต่อไหม'}</h2>
          <p>{en ? 'Start with a recent bill or actual kWh, how much electricity you use while the sun is up, and whether the roof has clear, usable space. Daytime use often makes self-consumption more valuable; shade, roof condition, phase and the timing of future loads can change the answer. A weak estimate means more information is needed, not that installation is impossible.' : 'เริ่มจากบิลล่าสุดหรือหน่วยไฟจริง ดูว่าใช้ไฟช่วงมีแดดมากเพียงใด และหลังคามีพื้นที่ใช้ได้ที่ไม่ถูกบังหรือไม่ การใช้ไฟกลางวันช่วยเพิ่มโอกาสใช้ไฟที่ผลิตเอง เงา สภาพหลังคา ระบบเฟส และเวลาเริ่มใช้เครื่องใช้ไฟฟ้าใหม่อาจเปลี่ยนผลได้ ผลประเมินที่ยังสรุปไม่ได้หมายถึงต้องหาข้อมูลเพิ่ม ไม่ได้แปลว่าติดตั้งไม่ได้'}</p>
          <p>{en ? 'The calculator is a planning tool using a regional solar reference and modeled household usage. It cannot check roof strength, wiring, permissions or actual site generation.' : 'เครื่องประเมินเป็นเครื่องมือวางแผนจากข้อมูลแสงแดดอ้างอิงระดับภูมิภาคและรูปแบบการใช้ไฟจำลอง จึงตรวจความแข็งแรงหลังคา สายไฟ การอนุญาต หรือผลผลิตจริงหน้างานไม่ได้'} <Link href={path('/estimate')}>{en ? 'Try the calculator' : 'ลองเครื่องประเมิน'}</Link> · <Link href={path('/methodology')}>{en ? 'Read the method' : 'อ่านวิธีคำนวณ'}</Link></p>
        </section>
        <section id="price">
          <p className="eyebrow">02 · {en ? 'Scope' : 'ขอบเขตงาน'}</p>
          <h2>{en ? 'What does the installation price include?' : 'ราคาติดตั้งรวมอะไรบ้าง'}</h2>
          <p>{en ? 'The calculator uses published package prices with a planning allowance. It is not an installer quotation. Ask each installer to state the panel and inverter models, mounting, wiring and protection, monitoring, commissioning, VAT, utility applications and fees, and what is excluded. Roof repairs, structural reinforcement, switchboard or meter changes, scaffolding, and battery or backup work may require separate prices.' : 'เครื่องประเมินใช้ราคาแพ็กเกจที่เผยแพร่พร้อมเงินเผื่อเพื่อวางแผน ไม่ใช่ใบเสนอราคาจากผู้ติดตั้ง ขอให้แต่ละรายระบุรุ่นแผงและอินเวอร์เตอร์ อุปกรณ์ยึด สายไฟและอุปกรณ์ป้องกัน ระบบติดตาม การทดสอบก่อนส่งมอบ VAT การยื่นเรื่องและค่าธรรมเนียมการไฟฟ้า รวมถึงรายการที่ไม่รวม งานซ่อมหลังคา เสริมโครงสร้าง ปรับตู้ไฟหรือมิเตอร์ นั่งร้าน และแบตเตอรี่หรือไฟสำรองอาจมีราคาแยก'}</p>
          <p>{en ? 'The model also deducts a yearly maintenance and component reserve from projected benefit. That reserve is a calculation, not prepaid service or a warranty.' : 'แบบจำลองหักเงินสำรองค่าดูแลและอุปกรณ์รายปีจากผลประโยชน์ที่คาดไว้ เงินสำรองนี้เป็นตัวเลขคำนวณ ไม่ใช่บริการที่จ่ายล่วงหน้าหรือการรับประกัน'}</p>
        </section>
        <section id="quotes">
          <p className="eyebrow">03 · {en ? 'Compare' : 'เปรียบเทียบ'}</p>
          <h2>{en ? 'Compare the same scope, not just the total' : 'เทียบขอบเขตเดียวกัน ไม่ใช่แค่ยอดรวม'}</h2>
          <p>{en ? 'Record cash price and VAT separately from financing. Check DC panel capacity against AC inverter capacity, generation assumptions, battery and backup scope, approvals, payment milestones and exclusions. Mark anything absent as “Not specified” and ask for a written answer. A lower number may omit roof or electrical work.' : 'แยกราคาเงินสดและ VAT จากแผนผ่อน ตรวจขนาดแผง DC เทียบกับกำลังอินเวอร์เตอร์ AC สมมติฐานผลผลิต ขอบเขตแบตเตอรี่และไฟสำรอง การขออนุญาต งวดชำระ และสิ่งที่ไม่รวม รายการที่ไม่มีข้อมูลให้ระบุว่า “ไม่ระบุ” แล้วขอคำตอบเป็นลายลักษณ์อักษร ราคาที่ต่ำกว่าอาจไม่รวมงานหลังคาหรืองานไฟฟ้า'}</p>
          <p><Link href={path('/quotation-comparison')}>{en ? 'Open the quotation comparison worksheet' : 'เปิดแบบเทียบใบเสนอราคา'}</Link></p>
        </section>
        <section id="warranties">
          <p className="eyebrow">04 · {en ? 'Coverage' : 'ความคุ้มครอง'}</p>
          <h2>{en ? 'Which warranty covers what?' : 'การรับประกันแต่ละแบบคุ้มครองอะไร'}</h2>
          <p>{en ? 'Ask separately about equipment defects (panels, inverter and battery, if any), panel performance, installation workmanship and roof waterproofing. A performance warranty is not a promise of your household savings. Check the named provider, start date, exclusions and claims process, including labour, travel, removal and reinstallation. Keep written terms and serial numbers at handover.' : 'ถามแยกเรื่องอุปกรณ์ชำรุด (แผง อินเวอร์เตอร์ และแบตเตอรี่ถ้ามี) ประสิทธิภาพแผง ฝีมือติดตั้ง และการกันรั่วของหลังคา การรับประกันประสิทธิภาพไม่ใช่คำสัญญาว่าบ้านจะประหยัดเงินได้ตามตัวเลข ตรวจชื่อผู้รับผิดชอบ วันเริ่ม เงื่อนไขยกเว้น และวิธีเคลม รวมถึงค่าแรง ค่าเดินทาง ค่าถอดและติดตั้งกลับ เก็บเงื่อนไขเป็นลายลักษณ์อักษรและหมายเลขเครื่องตอนส่งมอบ'}</p>
        </section>
        <section id="process">
          <p className="eyebrow">05 · {en ? 'Next steps' : 'ขั้นตอนต่อไป'}</p>
          <h2>{en ? 'From survey to handover' : 'จากสำรวจหน้างานถึงส่งมอบ'}</h2>
          <p>{en ? 'A site survey checks roof structure, shade, electrical supply and phase, cable routes and access. The installer then prepares a design and itemised quotation, identifies who handles applications and fees, agrees milestones, installs and tests the system, and hands over operating instructions, as-built details, monitoring access and warranty documents. Ask when the system may be operated and who resolves any inspection or connection issue.' : 'การสำรวจหน้างานตรวจโครงสร้างหลังคา เงา ระบบไฟและเฟส ทางเดินสาย และการเข้าทำงาน จากนั้นผู้ติดตั้งจัดทำแบบและใบเสนอราคาแจกแจง ระบุผู้รับผิดชอบการยื่นเรื่องและค่าธรรมเนียม ตกลงงวดงาน ติดตั้งและทดสอบระบบ แล้วส่งมอบวิธีใช้งาน แบบงานจริง สิทธิ์เข้าระบบติดตาม และเอกสารรับประกัน ถามให้ชัดว่าเริ่มใช้งานได้เมื่อใดและใครแก้ปัญหาหากการตรวจหรือเชื่อมต่อยังไม่ผ่าน'}</p>
          <div className="callout"><strong>{en ? 'Before choosing' : 'ก่อนตัดสินใจ'}</strong><p>{legalReviewDisclosures.installerChecks[locale]}</p><p>{prelaunchNotice[locale]}</p></div>
          <p>{en ? 'Further reading:' : 'อ่านเพิ่มเติม:'} <Link href={path('/resources')}>{en ? 'sources and resources' : 'แหล่งข้อมูลอ้างอิง'}</Link> · <a href="https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/" target="_blank" rel="noopener noreferrer">{en ? 'Bangkok Environmental Office home solar guide' : 'คู่มือโซลาร์สำหรับบ้านของสำนักสิ่งแวดล้อม กรุงเทพมหานคร'}</a> ({en ? 'checked 19 October 2026; source use is not endorsement' : 'ตรวจ 19 ตุลาคม 2569 การอ้างอิงไม่ได้หมายถึงการรับรอง SolarMatch'})</p>
        </section>
      </article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>{en ? 'Start with your own electricity use' : 'เริ่มจากข้อมูลการใช้ไฟของบ้านคุณ'}</h2><Link className="button" href={path('/estimate')}>{en ? 'Start estimate' : 'เริ่มประเมิน'} <ArrowRight size={18} /></Link></div></section>
  </main>;
}
