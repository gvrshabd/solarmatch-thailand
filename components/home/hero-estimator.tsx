'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import type { Locale } from '@/config/i18n';
import { localizedPath } from '@/config/i18n';
import { makeInitialLocation } from '@/lib/maps/provider';

export function HeroEstimator({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [address, setAddress] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);

  function startEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = makeInitialLocation(address.trim());
    sessionStorage.removeItem('solarmatch:estimate-draft');
    sessionStorage.removeItem('solarmatch:estimate');
    sessionStorage.setItem('solarmatch:starter', JSON.stringify({ version: 2, answers: { location, province: location.province }, step: 0 }));
    window.location.assign(localizedPath('/estimate', locale));
  }

  return (
    <form className="hero-estimator hero-address-starter" id="hero-estimator" onSubmit={startEstimate}>
      <fieldset className="hydration-fieldset" disabled={!ready} aria-busy={!ready}>
        <label htmlFor="hero-home-address">
          <span>{english ? 'Where is the home you are considering for solar?' : 'บ้านที่จะติดโซลาร์อยู่ที่ไหน?'}</span>
          <div className="hero-address-input"><MapPin aria-hidden="true" /><input id="hero-home-address" required minLength={5} maxLength={240} autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder={english ? 'House number, street, district and province' : 'บ้านเลขที่ ถนน เขต/อำเภอ และจังหวัด'} /></div>
        </label>
        <p>{english ? 'The address stays in this browser. You will position the home on a map next.' : 'ที่อยู่จะอยู่ในเบราว์เซอร์นี้ และขั้นต่อไปให้คุณวางตำแหน่งบ้านบนแผนที่'}</p>
        <button className="button estimator-button" type="submit">{english ? 'Continue to map' : 'ไปวางตำแหน่งบนแผนที่'} <ArrowRight aria-hidden="true" /></button>
      </fieldset>
    </form>
  );
}
