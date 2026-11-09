'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isEnglishPath, localizedPath } from '@/config/i18n';
import { campaignStorageKey, rememberCampaign } from '@/lib/analytics/browser-attribution';
import type { PublicAttributionConfig } from '@/lib/analytics/attribution';
import { readCampaignConsent, saveCampaignConsent, type CampaignConsent } from '@/lib/analytics/campaign-consent';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';

type ConsentPrompt = {
  pathname: string;
  config: PublicAttributionConfig;
  consent?: CampaignConsent;
  storageUnavailable?: boolean;
};

export function CampaignCapture() {
  const pathname = usePathname();
  const english = isEnglishPath(pathname);
  const cookiePolicy = localizedPath('/cookies', english ? 'en' : 'th');
  const preferences = pathname === cookiePolicy;
  const [prompt, setPrompt] = useState<ConsentPrompt | null>(null);

  useEffect(() => {
    // Never inspect auth, staff-link, admin or installer routes/parameters.
    if (/^\/(?:en\/)?(admin|installers|enquiry|api)(\/|$)/u.test(pathname)) return;
    const search = new URLSearchParams(window.location.search);
    let stored = false;
    try {
      stored = window.sessionStorage.getItem(campaignStorageKey) !== null;
    } catch {
      // Browser storage may be denied.
    }
    // Ordinary visits have no attribution to capture or revalidate. Avoid a
    // second assessment/config request alongside the calculator's own fetch.
    if (!preferences && !stored && !['utm_campaign', 'utm_source', 'utm_medium'].some(key => search.has(key))) return;
    const controller = new AbortController();
    fetch('/api/assessment/config', { cache: 'no-store', signal: controller.signal })
      .then(async response => response.ok ? await response.json() as PublicAssessmentConfig : null)
      .then(payload => {
        if (controller.signal.aborted) return;
        const config = payload?.attribution ?? { enabled: false, catalog: [] };
        let consent: CampaignConsent | undefined;
        try {
          consent = readCampaignConsent(window.localStorage);
          rememberCampaign(window.sessionStorage, search, config, consent);
        } catch {
          // Optional tracking stays off if browser storage cannot be read.
        }
        setPrompt(config.enabled ? { pathname, config, consent } : null);
      }).catch(() => {
        // A failed configuration request cannot enable tracking.
      });
    return () => controller.abort();
  }, [pathname, preferences]);

  if (!prompt || prompt.pathname !== pathname) return null;
  if (!preferences && (prompt.consent || prompt.storageUnavailable)) return null;

  const choose = (choice: CampaignConsent['choice']) => {
    let consent: CampaignConsent | undefined;
    try {
      consent = saveCampaignConsent(window.localStorage, choice);
      rememberCampaign(window.sessionStorage, new URLSearchParams(window.location.search), prompt.config, consent);
    } catch {
      // Declining or losing access to storage cannot interrupt the assessment.
    }
    setPrompt({ ...prompt, consent, storageUnavailable: !consent });
  };

  const title = english ? 'Optional campaign tracking' : 'การติดตามแคมเปญตามความสมัครใจ';
  return <section className={`campaign-consent${preferences ? ' campaign-preferences' : ''}`} aria-label={title}>
    <strong>{title}</strong>
    <p>{english
      ? 'Allow SolarMatch to remember campaign codes in this tab and include them with a contact request you submit.'
      : 'หากคุณอนุญาต SolarMatch จะจดจำรหัสแคมเปญในแท็บนี้และแนบรหัสไปกับคำขอติดต่อที่คุณส่ง'}</p>
    {!preferences && <a href={cookiePolicy}>{english ? 'Cookie Policy and preferences' : 'นโยบายคุกกี้และการตั้งค่า'}</a>}
    {preferences && <p role="status">{prompt.storageUnavailable
      ? (english ? 'This browser could not save your preference.' : 'เบราว์เซอร์นี้บันทึกการตั้งค่าของคุณไม่ได้')
      : prompt.consent?.choice === 'accepted'
        ? (english ? 'Optional tracking allowed' : 'อนุญาตการติดตามแบบเลือกได้')
        : (english ? 'Optional tracking off' : 'ปิดการติดตามแบบเลือกได้')}</p>}
    <div className="campaign-consent-actions">
      <button type="button" onClick={() => choose('rejected')}>{english ? 'Decline' : 'ไม่อนุญาต'}</button>
      <button type="button" onClick={() => choose('accepted')}>{english ? 'Accept' : 'อนุญาต'}</button>
    </div>
  </section>;
}
