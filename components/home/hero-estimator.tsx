'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/config/i18n';
import { localizedPath } from '@/config/i18n';

export function HeroEstimator({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [province, setProvince] = useState('bangkok');
  const [bill, setBill] = useState(5000);
  const [ready, setReady] = useState(false);

  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);

  function startEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sessionStorage.removeItem('solarmatch:estimate-draft');
    sessionStorage.removeItem('solarmatch:estimate');
    sessionStorage.setItem(
      'solarmatch:starter',
      JSON.stringify({ province, monthlyBillThb: bill }),
    );
    window.location.assign(localizedPath('/estimate', locale));
  }

  return (
    <form className="hero-estimator" id="hero-estimator" onSubmit={startEstimate}>
      <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
      <div className="field-grid">
        <label>
          <span>{english ? 'Which province is the home in?' : 'บ้านอยู่จังหวัดไหน?'}</span>
          <select value={province} onChange={(event) => setProvince(event.target.value)}>
            <option value="bangkok">{english ? 'Bangkok' : 'กรุงเทพมหานคร'}</option>
            <option value="nonthaburi">{english ? 'Nonthaburi' : 'นนทบุรี'}</option>
            <option value="pathum-thani">{english ? 'Pathum Thani' : 'ปทุมธานี'}</option>
            <option value="samut-prakan">{english ? 'Samut Prakan' : 'สมุทรปราการ'}</option>
            <option value="other">{english ? 'Another province' : 'จังหวัดอื่น'}</option>
          </select>
        </label>
        <label>
          <span>{english ? 'Average monthly electricity bill' : 'ค่าไฟเฉลี่ยต่อเดือน'}</span>
          <div className="currency-input">
            <span>฿</span>
            <input
              inputMode="numeric"
              min="500"
              max="50000"
              step="100"
              type="number"
              value={bill}
              onChange={(event) => setBill(Number(event.target.value))}
              aria-describedby="bill-suffix"
            />
            <small id="bill-suffix">{english ? '/ month' : '/ เดือน'}</small>
          </div>
        </label>
      </div>
      <input
        aria-label={english ? 'Adjust monthly electricity bill' : 'ปรับค่าไฟต่อเดือน'}
        className="bill-slider"
        min="500"
        max="20000"
        step="500"
        type="range"
        value={Math.min(bill, 20000)}
        onChange={(event) => setBill(Number(event.target.value))}
      />
      <button className="button estimator-button" type="submit">
        {english ? 'See your initial estimate' : 'ดูผลประเมินเบื้องต้น'} <ArrowRight size={19} aria-hidden="true" />
      </button>
      </fieldset>
    </form>
  );
}
