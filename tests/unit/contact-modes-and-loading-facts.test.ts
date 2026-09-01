import { describe, expect, it, vi } from 'vitest';
import { initialLoadingFactSet } from '@/config/loading-facts';
import { loadingDurationMs, nextFactHistory, selectLoadingFact } from '@/lib/loading-facts/selection';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import { assessContactReadiness, consentSnapshot, privatePreviewContactConfiguration, publicContactConfiguration, type ContactConfigurationRow } from '@/lib/server/contact-mode';
import { leadSchema, normalizeThaiPhone } from '@/lib/validation/lead';

function row(overrides: Partial<ContactConfigurationRow> = {}): ContactConfigurationRow {
  return {
    contact_configuration_version_id: 'contact-configuration-v2', contact_collection_mode: 'disabled', contact_collection_enabled: 0,
    retention_days: null, receiving_company_en: null, receiving_company_th: null, receiving_company_privacy_url: null,
    permitted_contact_methods_json: '["phone","line"]', shared_fields_json: '["legalFirstName","legalLastName","phone","preferredContactMethod","lineId","assessmentAnswers"]',
    legal_complete: 0, content_version_id: 'residential-content-v1', legal_document_version_id: 'legal-v1', content_json: '{}',
    ...overrides,
  };
}

const facts: PublicLoadingFact[] = initialLoadingFactSet.facts.map((fact) => ({ ...fact, imageUrl: `/images/loading-facts/${fact.sketchId}.svg` }));

describe('contact-mode readiness and consent', () => {
  it('keeps disabled mode fail-closed without readiness requirements', () => {
    expect(assessContactReadiness(row())).toEqual({ active: false, mode: 'disabled', issues: [] });
    expect(publicContactConfiguration(row()).enabled).toBe(false);
  });

  it('activates validation mode only with legal completeness and retention', () => {
    const incomplete = row({ contact_collection_mode: 'validation_interest', contact_collection_enabled: 1 });
    expect(assessContactReadiness(incomplete).issues).toEqual(expect.arrayContaining(['legal operator and privacy information is incomplete', 'retention period is missing']));
    const ready = row({ contact_collection_mode: 'validation_interest', contact_collection_enabled: 1, legal_complete: 1, retention_days: 180, adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1' });
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
    const ready = row({ contact_collection_mode: 'named_installer_handoff', contact_collection_enabled: 1, legal_complete: 1, retention_days: 180, adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1', receiving_company_en: 'Example Solar Co., Ltd.', receiving_company_th: 'บริษัท เอ็กแซมเพิล โซลาร์ จำกัด', receiving_company_privacy_url: 'https://example.com/privacy' });
    const publicConfig = publicContactConfiguration(ready);
    expect(publicConfig.question?.en).toContain('Example Solar Co., Ltd.');
    expect(consentSnapshot(publicConfig)).toMatchObject({ consentScope: 'named_installer_site_assessment', solarMatchFollowupAuthorized: false, thirdPartyDisclosureAuthorized: true });
  });

  it('keeps shared handoff disabled until legal versions, distribution settings, and a contracted partner are ready', () => {
    const incomplete = row({ contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1, legal_complete: 1, retention_days: 180 });
    expect(assessContactReadiness(incomplete).active).toBe(false);
    const ready = row({
      contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1,
      legal_complete: 1, retention_days: 180, distribution_window_days: 14,
      recipient_category: 'participating_residential_solar_companies', active_partner_count: 1,
      adult_confirmation_version_id: 'adult-v1', consent_version_id: 'consent-v1',
      privacy_notice_version_id: 'privacy-v1', terms_version_id: 'terms-v1', cookie_policy_version_id: 'cookies-v1',
    });
    const publicConfig = publicContactConfiguration(ready);
    expect(publicConfig.enabled).toBe(true);
    expect(publicConfig.operationalDistributionEnabled).toBe(true);
    expect(publicConfig.recipient).toBeNull();
    expect(publicConfig.question?.en).toBe('Would you like to be contacted by solar companies?');
    expect(consentSnapshot(publicConfig)).toMatchObject({ consentScope: 'shared_residential_solar_referral', solarMatchFollowupAuthorized: false, thirdPartyDisclosureAuthorized: true });
  });

  it('shows the shared contact journey privately while permanently disabling partner distribution', () => {
    const publicConfig = privatePreviewContactConfiguration(row());
    expect(publicConfig).toMatchObject({
      enabled: true,
      preview: true,
      operationalDistributionEnabled: false,
      mode: 'shared_solar_company_handoff',
      retentionDays: null,
      distributionWindowDays: null,
      recipient: null,
    });
    expect(publicConfig.question?.en).toBe('Would you like to be contacted by solar companies?');
    expect(publicConfig.yesLabel?.en).toBe('Yes, I would like solar companies to contact me');
    expect(publicConfig.noLabel?.en).toBe('No, show me my estimate');
    expect(publicConfig.consent?.en).toContain('I explicitly consent');
  });
});

describe('loading-fact selection', () => {
  it('keeps fact, sketch, citation and Resources anchor paired', () => {
    for (const fact of facts) {
      expect(fact.imageUrl).toBe(`/images/loading-facts/${fact.id}.svg`);
      expect(fact.resourcesAnchor).toBe(fact.id);
      expect(fact.reference.citation.length).toBeGreaterThan(3);
      expect(fact.copy.en).toMatch(/\([^)]*20\d{2}\)\.$/u);
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

  it('bounds a duration selected from secure randomness to 3–5 seconds', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    spy.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 0; return array; });
    expect(loadingDurationMs()).toBe(3000);
    spy.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 2000; return array; });
    expect(loadingDurationMs()).toBe(5000);
    spy.mockRestore();
  });
});

describe('public lead input boundaries', () => {
  it('normalizes Thai mobile numbers and requires LINE ID conditionally', () => {
    expect(normalizeThaiPhone('081 234 5678')).toBe('+66812345678');
    const base = { legalFirstName: 'Somchai', legalLastName: 'Jaidee', phone: '081 234 5678', contactMethod: 'line', adultConfirmed: true, consent: true, locale: 'th', assessmentToken: 'a'.repeat(80), idempotencyKey: crypto.randomUUID(), website: '', answers: { province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '60-100', daytimePattern: 'high', daytimeLoads: ['air-conditioning'], airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'little' } };
    expect(leadSchema.safeParse(base).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, lineId: 'somchai' }).success).toBe(true);
  });

  it('rejects client-supplied mode, recipient, and score fields', () => {
    const input = { legalFirstName: 'Somchai', legalLastName: 'Jaidee', phone: '0812345678', contactMethod: 'phone', adultConfirmed: true, consent: true, locale: 'th', assessmentToken: 'a'.repeat(80), idempotencyKey: crypto.randomUUID(), website: '', answers: { province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '60-100', daytimePattern: 'high', daytimeLoads: ['air-conditioning'], airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'little' }, mode: 'shared_solar_company_handoff', recipient: 'attacker', score: 5 };
    expect(leadSchema.safeParse(input).success).toBe(false);
  });
});
