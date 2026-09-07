import { describe, expect, it, vi } from 'vitest';
import { lockedSharedConsentCopy } from '@/config/contact-content';
import { initialLoadingFactSet } from '@/config/loading-facts';
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
  it('preserves the locked English and Thai consent copy verbatim', () => {
    expect(lockedSharedConsentCopy.en).toBe('I explicitly consent to SolarMatch storing my request and information, and I give SolarMatch permission to share my name, contact details, location and relevant assessment answers with solar service providers, installers, their authorized representatives, or other businesses involved in providing solar services, so they may contact me with relevant solar information and/or offers for solar-related services. I understand that SolarMatch may be paid for the connection and that choosing Yes does not guarantee that I will be contacted or receive a quotation. I have read the Privacy Notice.');
    expect(lockedSharedConsentCopy.th).toBe('ข้าพเจ้ายินยอมโดยชัดแจ้งให้ SolarMatch จัดเก็บคำขอและข้อมูลของข้าพเจ้า และอนุญาตให้ SolarMatch ส่งต่อหรือเปิดเผยชื่อ ข้อมูลติดต่อ สถานที่ตั้ง และคำตอบที่เกี่ยวข้องจากแบบประเมินของข้าพเจ้าแก่ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาตของผู้ให้บริการหรือผู้ติดตั้งดังกล่าว หรือธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์ เพื่อให้บุคคลหรือธุรกิจเหล่านั้นสามารถติดต่อข้าพเจ้าพร้อมข้อมูลที่เกี่ยวข้องกับโซลาร์ และ/หรือข้อเสนอเกี่ยวกับบริการที่เกี่ยวข้องกับโซลาร์ ข้าพเจ้าเข้าใจว่า SolarMatch อาจได้รับค่าตอบแทนจากการเชื่อมโยงดังกล่าว และการเลือก “ใช่” ไม่ได้รับประกันว่าจะมีผู้ใดติดต่อข้าพเจ้า หรือว่าข้าพเจ้าจะได้รับใบเสนอราคา ข้าพเจ้าได้อ่านประกาศความเป็นส่วนตัวแล้ว');
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
    expect(publicConfig.yesLabel?.en).toBe('Yes, I would like solar companies to contact me');
    expect(publicConfig.noLabel?.en).toBe('No, show my estimate without installer contact');
    expect(publicConfig.consent).toEqual(lockedSharedConsentCopy);
  });
});

describe('loading-fact selection', () => {
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
