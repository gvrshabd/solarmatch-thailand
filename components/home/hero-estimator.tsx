'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BillSlider } from '@/components/estimate/bill-slider';
import type { Locale } from '@/config/i18n';
import { localizedPath } from '@/config/i18n';
import { provinceOptions } from '@/config/provinces';

export function HeroEstimator({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [province, setProvince] = useState('bangkok');
  const [monthlyBillThb, setMonthlyBillThb] = useState<number>();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);

  function startEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!monthlyBillThb || monthlyBillThb <= 0) {
      setError(english ? 'Enter a typical monthly bill to continue.' : 'กรอกค่าไฟของเดือนปกติเพื่อดำเนินการต่อ');
      return;
    }
    sessionStorage.removeItem('solarmatch:estimate-draft');
    sessionStorage.removeItem('solarmatch:estimate');
    sessionStorage.setItem('solarmatch:starter', JSON.stringify({ version: 3, answers: { province, monthlyBillThb }, step: 0 }));
    window.location.assign(localizedPath('/estimate', locale));
  }

  return (
    <form className="hero-estimator hero-bill-starter" id="hero-estimator" onSubmit={startEstimate}>
      <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
        <div className="hero-estimator-heading">
          <strong>{english ? 'Start with one normal electricity bill' : 'เริ่มจากค่าไฟของเดือนปกติ'}</strong>
          <span>{english ? 'We will turn it into a practical solar starting point.' : 'เราจะเปลี่ยนเป็นจุดเริ่มต้นโซลาร์ที่เข้าใจง่าย'}</span>
        </div>
        <label className="hero-province" htmlFor="hero-province">
          <span>{english ? 'Province' : 'จังหวัด'}</span>
          <select id="hero-province" value={province} onChange={(event) => setProvince(event.target.value)}>
            {provinceOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}
          </select>
        </label>
        <BillSlider value={monthlyBillThb} onChange={(value) => { setMonthlyBillThb(value); setError(''); }} locale={locale} id="hero-monthly-bill" invalid={Boolean(error)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button estimator-button" type="submit">{english ? 'See my solar estimate' : 'ดูค่าประเมินโซลาร์'} <ArrowRight aria-hidden="true" /></button>
      </fieldset>
    </form>
  );
}
