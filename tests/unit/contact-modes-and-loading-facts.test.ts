import { describe, expect, it, vi } from 'vitest';
import { lockedSharedConsentCopy } from '@/config/contact-content';
import { initialLoadingFactSet } from '@/config/loading-facts';
import { currentPublicFact, currentPublicFacts } from '@/lib/loading-facts/public-copy';
import { loadingDurationMs, nextFactHistory, selectLoadingFact } from '@/lib/loading-facts/selection';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import { assessContactReadiness, consentSnapshot, publicContactConfiguration, restrictedOperationalContactConfiguration, type ContactConfigurationRow } from '@/lib/server/contact-mode';
import { leadSchema, normalizeThaiPhone } from '@/lib/validation/lead';

function row(overrides: Partial<ContactConfigurationRow> = {}): ContactConfigurationRow {
  return {
    contact_configuration_version_id: 'contact-configuration-v3', contact_collection_mode: 'disabled', contact_collection_enabled: 0,
    restricted_site_collection_enabled: 0, public_collection_enabled: 0,
    retention_days: null, receiving_company_en: null, receiving_company_th: null, receiving_company_privacy_url: null,
    permitted_contact_methods_json: '["phone","line"]', shared_fields_json: '["legalFirstName","legalLastName","phone","preferredContactMethod","lineId","assessmentAnswers"]',
    legal_complete: 0, content_version_id: 'residential-content-v1', legal_document_version_id: 'legal-v1', content_json: '{}',
    ...overrides,
  };
}

const facts: PublicLoadingFact[] = initialLoadingFactSet.facts.map((fact) => ({ ...fact, imageUrl: `/images/loading-facts/${fact.sketchId}.svg` }));

describe('contact-mode readiness and consent', () => {
  it('preserves the supplied English and Thai launch consent copy verbatim', () => {
    expect(lockedSharedConsentCopy.en).toBe("I consent to [COMPANY_EN], operating SolarMatch, disclosing my name, chosen contact details, property location and relevant assessment answers to up to three participating installation companies serving my area, so they can assess and contact me about this residential solar request using my selected contact method. A new installer may receive my request only within [DISTRIBUTION_DAYS] days after submission. I understand that installers pay SolarMatch for delivered enquiries, that the request is shared, and that I can withdraw this consent at any time by contacting [PRIVACY_EMAIL]. I can receive the free estimate without giving this consent. Details are in the Privacy Notice.");
    expect(lockedSharedConsentCopy.th).toBe("ฉันยินยอมให้ [COMPANY_TH] ผู้ดำเนินการ SolarMatch เปิดเผยชื่อ ช่องทางติดต่อที่ฉันเลือก ที่ตั้งทรัพย์สิน และคำตอบแบบประเมินที่เกี่ยวข้องแก่บริษัทติดตั้งที่เข้าร่วมและให้บริการในพื้นที่ของฉันไม่เกินสามบริษัท เพื่อประเมินและติดต่อฉันเกี่ยวกับคำขอโซลาร์สำหรับที่อยู่อาศัยนี้ผ่านวิธีติดต่อที่ฉันเลือก บริษัทติดตั้งรายใหม่จะได้รับคำขอของฉันได้เฉพาะภายใน [DISTRIBUTION_DAYS] วันนับจากวันที่ส่งคำขอ ฉันเข้าใจว่าบริษัทติดตั้งชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ คำขออาจถูกส่งให้หลายบริษัท และฉันสามารถถอนความยินยอมนี้ได้ทุกเมื่อโดยติดต่อ [PRIVACY_EMAIL] ฉันสามารถรับผลประเมินฟรีได้โดยไม่ให้ความยินยอมนี้ ดูรายละเอียดได้ในประกาศความเป็นส่วนตัว");
  });

  it('keeps disabled mode fail-closed without readiness requirements', () => {
    expect(assessContactReadiness(row())).toEqual({ active: false, mode: 'disabled', issues: [] });
    expect(publicContactConfiguration(row()).enabled).toBe(false);
  });

  it('activates validation mode only with legal completeness and retention', () => {
    const incomplete = row({ contact_collection_mode: 'validation_interest', contact_collection_enabled: 1 });
    expect(assessContactReadiness(incomplete).issues).toEqual(expect.arrayContaining(['legal operator and privacy information is incomplete', 'retention period is missing']));
    const ready = row({ contact_collection_mode: 'validation_interest', contact_collection_enabled: 1, public_collection_enabled: 1, legal_complete: 1, retention_days: 180, adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1' });
    const publicConfig = publicContactConfiguration(ready);
    expect(publicConfig.enabled).toBe(true);
    expect(publicConfig.operationalDistributionEnabled).toBe(false);
    expect(publicConfig.recipient).toBeNull();
    expect(publicConfig.consent?.en).toContain('will not be shared with a solar company without separate permission');
    expect(publicConfig.consent?.th).toContain('จะไม่ถูกส่งต่อให้บริษัทโซลาร์');
    expect(consentSnapshot(publicConfig)).toMatchObject({ consentScope: 'solar_match_validation_followup', solarMatchFollowupAuthorized: true, thirdPartyDisclosureAuthorized: false, recipient: null });
  });

  it('requires a named recipient and privacy URL for installer handoff', () => {
    const incomplete = row({ contact_collection_mode: 'named_installer_handoff', contact_collection_enabled: 1, legal_complete: 1, retention_days: 180 });
    expect(assessContactReadiness(incomplete).active).toBe(false);
    const ready = row({ contact_collection_mode: 'named_installer_handoff', contact_collection_enabled: 1, public_collection_enabled: 1, legal_complete: 1, retention_days: 180, adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1', receiving_company_en: 'Example Solar Co., Ltd.', receiving_company_th: 'บริษัท เอ็กแซมเพิล โซลาร์ จำกัด', receiving_company_privacy_url: 'https://example.com/privacy' });
    const publicConfig = publicContactConfiguration(ready);
    expect(publicConfig.question?.en).toContain('Example Solar Co., Ltd.');
    expect(consentSnapshot(publicConfig)).toMatchObject({ consentScope: 'named_installer_site_assessment', solarMatchFollowupAuthorized: false, thirdPartyDisclosureAuthorized: true });
  });

  it('keeps shared handoff disabled until legal versions, distribution settings, and a contracted partner are ready', () => {
    const incomplete = row({ contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1, legal_complete: 1, retention_days: 180 });
    expect(assessContactReadiness(incomplete).active).toBe(false);
    const ready = row({
      contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1, public_collection_enabled: 1,
      legal_complete: 1, retention_days: 180, distribution_window_days: 14,
      recipient_category: 'solar_service_recipients', active_partner_count: 1,
      adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1',
      privacy_notice_version_id: 'privacy-v1', terms_version_id: 'terms-v1', cookie_policy_version_id: 'cookies-v1',
    });
    const publicConfig = publicContactConfiguration(ready);
    expect(publicConfig.enabled).toBe(true);
    expect(publicConfig.operationalDistributionEnabled).toBe(true);
    expect(publicConfig.recipient).toBeNull();
    expect(publicConfig.question?.en).toBe('Want real quotes from local installers?');
    expect(consentSnapshot(publicConfig)).toMatchObject({ consentScope: 'shared_residential_solar_referral', solarMatchFollowupAuthorized: false, thirdPartyDisclosureAuthorized: true });
  });

  it('shows the operational contact journey only for a verified restricted-site session', () => {
    const publicConfig = restrictedOperationalContactConfiguration(row({ contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1, restricted_site_collection_enabled: 1 }));
    expect(publicConfig).toMatchObject({
      enabled: true,
      preview: false,
      restrictedSiteCollectionEnabled: true,
      operationalDistributionEnabled: true,
      mode: 'shared_solar_company_handoff',
      retentionDays: null,
      distributionWindowDays: null,
      recipient: null,
    });
    expect(publicConfig.question?.en).toBe('Want real quotes from local installers?');
    expect(publicConfig.yesLabel?.en).toBe("Request contact from up to 3 installers");
    expect(publicConfig.noLabel?.en).toBe("Continue without installer contact");
    expect(publicConfig.consent).toEqual(lockedSharedConsentCopy);
  });
});

describe('loading-fact selection', () => {
  it('corrects obsolete displayed claims without mutating historic stored or restored facts', () => {
    const historicHome = { ...facts[0], copy: { en: 'Solar boosts resale value by 4%.', th: 'มูลค่าขายต่อเพิ่มขึ้น 4%' } };
    const before = structuredClone(historicHome);
    const historicPatio = { ...facts.find((fact) => fact.id === 'patio-gardens')!, enabled: true };
    const displayed = currentPublicFacts([historicHome, historicPatio, facts[1]]);
    expect(displayed.map((fact) => fact.id)).toEqual(['home-value', 'carbon-trees']);
    expect(displayed[0].copy.en).not.toContain('4%');
    expect(displayed[0].copy.th).not.toContain('4%');
    expect(displayed[0].copy.en).toContain('does not establish a particular percentage increase');
    expect(currentPublicFact(historicPatio)).toBeNull();
    expect(currentPublicFact(null)).toBeNull();
    expect(historicHome).toEqual(before);
  });

  it('keeps fact, sketch, citation and Resources anchor paired', () => {
    for (const fact of facts) {
      expect(fact.imageUrl).toBe(`/images/loading-facts/${fact.id}.svg`);
      expect(fact.resourcesAnchor).toBe(fact.id);
      expect(fact.reference.citation.length).toBeGreaterThan(3);
      expect(fact.copy.en.length).toBeGreaterThan(40);
    }
  });

  it('avoids an immediate repeat when another enabled fact exists', () => {
    const selected = selectLoadingFact(facts, ['home-value']);
    expect(selected?.id).not.toBe('home-value');
    expect(nextFactHistory(['carbon-trees', 'home-value'], selected!.id).at(-1)).toBe(selected!.id);
  });

  it('supports one active fact and a clean zero-fact fallback', () => {
    expect(selectLoadingFact([facts[0]], ['home-value'])?.id).toBe('home-value');
    expect(selectLoadingFact([], [])).toBeNull();
    expect(selectLoadingFact(facts.map((fact) => ({ ...fact, enabled: false })), [])).toBeNull();
  });

  it('bounds a fresh duration selected from secure randomness to 3.5–5 seconds', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    spy.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 0; return array; });
    expect(loadingDurationMs()).toBe(3500);
    spy.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 1500; return array; });
    expect(loadingDurationMs()).toBe(5000);
    spy.mockRestore();
  });
});

describe('public lead input boundaries', () => {
  it('normalizes Thai mobile numbers and requires LINE ID conditionally', () => {
    expect(normalizeThaiPhone('081 234 5678')).toBe('+66812345678');
    const base = { legalFirstName: 'Somchai', legalLastName: 'Jaidee', contactMethod: 'line', adultConfirmed: true, consent: true, locale: 'th', assessmentToken: 'a'.repeat(80), idempotencyKey: crypto.randomUUID(), website: '', answers: { province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning'], airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'little', quoteContactRequested: true, quoteConsentAccepted: true } };
    expect(leadSchema.safeParse(base).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, lineId: 'somchai' }).success).toBe(true);
  });

  it('rejects client-supplied mode, recipient, and score fields', () => {
    const input = { legalFirstName: 'Somchai', legalLastName: 'Jaidee', phone: '0812345678', contactMethod: 'phone', adultConfirmed: true, consent: true, locale: 'th', assessmentToken: 'a'.repeat(80), idempotencyKey: crypto.randomUUID(), website: '', answers: { province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning'], airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'little', quoteContactRequested: true, quoteConsentAccepted: true }, mode: 'shared_solar_company_handoff', recipient: 'attacker', score: 5 };
    expect(leadSchema.safeParse(input).success).toBe(false);
  });
});
