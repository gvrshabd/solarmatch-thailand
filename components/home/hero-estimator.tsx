'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export function HeroEstimator() {
  const router = useRouter();
  const [province, setProvince] = useState('bangkok');
  const [bill, setBill] = useState(5000);
  const [ready, setReady] = useState(false);

  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);

  function startEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sessionStorage.setItem(
      'solarmatch:starter',
      JSON.stringify({ province, monthlyBillThb: bill }),
    );
    router.push('/estimate');
  }

  return (
    <form className="hero-estimator" id="hero-estimator" onSubmit={startEstimate}>
      <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
      <div className="field-grid">
        <label>
          <span>บ้านอยู่จังหวัดไหน?</span>
          <select value={province} onChange={(event) => setProvince(event.target.value)}>
            <option value="bangkok">กรุงเทพมหานคร</option>
            <option value="nonthaburi">นนทบุรี</option>
            <option value="pathum-thani">ปทุมธานี</option>
            <option value="samut-prakan">สมุทรปราการ</option>
            <option value="other">จังหวัดอื่น</option>
          </select>
        </label>
        <label>
          <span>ค่าไฟเฉลี่ยต่อเดือน</span>
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
            <small id="bill-suffix">/ เดือน</small>
          </div>
        </label>
      </div>
      <input
        aria-label="ปรับค่าไฟต่อเดือน"
        className="bill-slider"
        min="500"
        max="20000"
        step="500"
        type="range"
        value={Math.min(bill, 20000)}
        onChange={(event) => setBill(Number(event.target.value))}
      />
      <button className="button estimator-button" type="submit">
        ดูผลประเมินเบื้องต้น <ArrowRight size={19} aria-hidden="true" />
      </button>
      </fieldset>
    </form>
  );
}
