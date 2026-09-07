'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/config/i18n';

type PublicOperator = {
  legalBusinessNameEn: string; legalBusinessNameTh: string; registeredAddressEn: string; registeredAddressTh: string;
  publicBusinessPhone: string; publicBusinessEmail: string; privacyContactEmail: string; privacyRightsRequestUrl: string;
};

export function OperatorDisclosure({ locale, variant = 'page' }: { locale: Locale; variant?: 'page'|'footer' }) {
  const [operator, setOperator] = useState<PublicOperator | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/public/operator', { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as { operator?: PublicOperator | null };
    }).then((payload) => setOperator(payload?.operator ?? null)).catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!operator) return null;
  const english = locale === 'en';
  const name = english ? operator.legalBusinessNameEn : operator.legalBusinessNameTh;
  const address = english ? operator.registeredAddressEn : operator.registeredAddressTh;
  return <section className={`operator-disclosure operator-disclosure-${variant}`} aria-label={english ? 'SolarMatch operator' : 'ผู้ดำเนินงาน SolarMatch'}>
    <p>{english ? `SolarMatch Thailand is operated by ${name}.` : `SolarMatch Thailand ดำเนินงานโดย ${name}`}</p>
    {variant === 'page' && <address>
      <span>{address}</span>
      <a href={`tel:${operator.publicBusinessPhone.replace(/[^+\d]/gu, '')}`}>{operator.publicBusinessPhone}</a>
      <a href={`mailto:${operator.publicBusinessEmail}`}>{operator.publicBusinessEmail}</a>
      <a href={operator.privacyRightsRequestUrl}>{english ? 'Privacy rights requests' : 'ยื่นคำขอใช้สิทธิด้านข้อมูลส่วนบุคคล'}</a>
    </address>}
  </section>;
}
