import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Delete your SolarMatch Installers account' },
  description: 'How to delete a SolarMatch Installers account, and what is deleted or kept.',
};

// Public deletion instructions for the store listings (Google Play requires a page outside the
// app). It needs no sign-in and collects nothing. Thai copy is a draft and needs native review.
export default async function DeleteInstallerAccount({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const en = (await searchParams).lang === 'en';
  const t = (th: string, english: string) => en ? english : th;
  const portal = '/installers/app?view=profile&lang=' + (en ? 'en' : 'th');
  return <div className="signal" lang={en ? 'en' : 'th'}>
    <main className="signal-unavailable account-deletion-page">
      <article className="card">
        <p className="muted"><a className="lnk" href={'/installers/delete-account?lang=' + (en ? 'th' : 'en')} hrefLang={en ? 'th' : 'en'}>{en ? 'ภาษาไทย' : 'English'}</a></p>
        <h1>{t('ลบบัญชี SolarMatch Installers', 'Delete your SolarMatch Installers account')}</h1>
        <p>{t('แอป SolarMatch Installers และพอร์ทัลผู้ติดตั้งบนเว็บใช้บัญชีเดียวกัน คุณลบบัญชีได้ด้วยตัวเอง โดยไม่ต้องติดต่อเรา',
          'The SolarMatch Installers app and the installer web portal share one account. You can delete it yourself; you don’t need to contact us.')}</p>
        <h2 className="h3">{t('วิธีลบบัญชี', 'How to delete it')}</h2>
        <ol>
          <li>{t('เปิดแอป SolarMatch Installers หรือ ', 'Open the SolarMatch Installers app, or ')}<a href={portal}>{t('พอร์ทัลผู้ติดตั้งบนเว็บ', 'the installer portal on the web')}</a>{t(' แล้วเข้าสู่ระบบ', ', and sign in.')}</li>
          <li>{t('แตะ “บริษัท” แล้วเลื่อนไปที่ “บัญชีของคุณ”', 'Tap “Company”, then scroll to “Your account”.')}</li>
          <li>{t('แตะ “ลบบัญชี” ใส่รหัสผ่านปัจจุบัน แล้วแตะ “ลบบัญชีถาวร”', 'Tap “Delete account”, enter your current password, then tap “Delete my account permanently”.')}</li>
        </ol>
        <p>{t('หากลืมรหัสผ่าน ให้ใช้ “ลืมรหัสผ่าน” ในหน้าเข้าสู่ระบบก่อน', 'If you’ve forgotten your password, use “Forgot password” on the sign-in screen first.')}</p>
        <h2 className="h3">{t('สิ่งที่ถูกลบทันที', 'Deleted straight away')}</h2>
        <ul>
          <li>{t('ชื่อ อีเมล และรหัสผ่านของคุณ', 'Your name, email address and password')}</li>
          <li>{t('การเข้าสู่ระบบในทุกอุปกรณ์ และลิงก์กู้คืนรหัสผ่านที่ยังไม่ได้ใช้', 'Your sign-ins on every device, and any unused password-reset links')}</li>
          <li>{t('การเป็นสมาชิกบริษัทของคุณ', 'Your membership of your company')}</li>
          <li>{t('อีเมลของคุณในบันทึกการทำงาน ซึ่งจะถูกแทนด้วยรหัสอ้างอิงที่ไม่แสดงชื่อหรืออีเมล', 'Your email address in activity records, which is replaced with a coded ID that shows neither your name nor your email')}</li>
        </ul>
        <h2 className="h3">{t('หากคุณเป็นสมาชิกคนสุดท้ายของบริษัท', 'If you’re your company’s last member')}</h2>
        <p>{t('บริษัทจะหยุดรับคำขอใหม่และยกเลิกการแจ้งเตือน LINE ทีม SolarMatch จะตรวจสอบเครดิตที่ซื้อแล้วแต่ยังไม่ได้ใช้',
          'The company stops receiving new enquiries and its LINE alerts are disconnected. SolarMatch will review any purchased credits that haven’t been used.')}</p>
        <h2 className="h3">{t('สิ่งที่เก็บไว้', 'What we keep')}</h2>
        <p>{t('ประวัติการซื้อเครดิต การใช้เครดิต คำร้อง และคำขอที่ได้รับเป็นของบริษัท การลบบัญชีของคุณจึงไม่ลบข้อมูลเหล่านี้ เราเก็บไว้เท่าที่กฎหมายภาษี บัญชี หรือข้อกำหนดทางกฎหมายอื่นกำหนดเท่านั้น',
          'The company’s credit purchases, credit use, claims and received enquiries belong to the company, so deleting your account doesn’t delete them. We keep them only for as long as tax, accounting or other legal obligations require.')}</p>
        {/* OWNER DECISION: state the retention period here once legal review confirms it. */}
      </article>
    </main>
  </div>;
}
