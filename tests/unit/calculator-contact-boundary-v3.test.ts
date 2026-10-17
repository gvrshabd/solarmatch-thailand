import { beforeEach, describe, expect, it, vi } from 'vitest';

const sideEffects = vi.hoisted(() => ({
  database: vi.fn(() => { throw new Error('Rejected contact must not reach the database'); }),
  token: vi.fn(async () => null),
  proof: vi.fn(async () => null),
}));
vi.mock('@/lib/server/runtime', () => ({
  getRuntimeEnv: () => ({ INSTALLER_PLATFORM_MODE: 'local-test', INSTALLER_BASE_URL: 'http://localhost:3000' }),
  requireDatabase: sideEffects.database,
}));
vi.mock('@/lib/installer/platform', () => ({ assertPlatformRequest: () => ({ mode: 'local-test' }) }));
vi.mock('@/lib/server/assessment-token', async original => ({
  ...await original<typeof import('@/lib/server/assessment-token')>(), verifyAssessmentToken: sideEffects.token,
}));
vi.mock('@/lib/installer/phone-verification', async original => ({
  ...await original<typeof import('@/lib/installer/phone-verification')>(), phoneProof: sideEffects.proof,
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/leads/route';
import { estimateAnswersSchema } from '@/lib/validation/estimate';
import { leadSchema } from '@/lib/validation/lead';
import { calculateLeadAssessment } from '@/lib/qualification/scoring';

const answers = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true,
  planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home',
  ownershipStatus: 'owner', roofArea: '60-100', daytimePattern: 'high', daytimeLoads: ['air-conditioning'],
  airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'almost-none',
  quoteContactRequested: true, quoteConsentAccepted: true,
} as const;

function body(change: Record<string, unknown> = {}) {
  return {
    legalFirstName: 'Synthetic', legalLastName: 'Review', phone: '0812345678', contactMethod: 'phone',
    phoneVerificationId: '00000000-0000-4000-8000-000000000001', phoneVerificationProof: 'p'.repeat(43),
    adultConfirmed: true, consent: true, locale: 'en', assessmentToken: 'synthetic-v6-token-'.repeat(4),
    idempotencyKey: '00000000-0000-4000-8000-000000000002', website: '', answers: { ...answers, ...change },
  };
}
function request(value: unknown) {
  return new NextRequest('http://localhost:3000/api/leads', { method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
}
beforeEach(() => vi.clearAllMocks());

describe('calculator v3 contact input readiness boundary', () => {
  it('retains a full no-contact meter-only estimate without inventing a bill', () => {
    const parsed = estimateAnswersSchema.parse({ ...answers, monthlyBillThb: undefined, consumptionInput: 'kwh', monthlyConsumptionKwh: 1200,
      estimateModelVersion: 'energy-v3', quoteContactRequested: false, quoteConsentAccepted: undefined });
    expect(parsed.consumptionInput).toBe('kwh');
    expect(parsed.monthlyConsumptionKwh).toBe(1200);
    expect(parsed.monthlyBillThb).toBe(0);
    expect(parsed.quoteContactRequested).toBe(false);
  });

  it.each([undefined, 0, 6000])('rejects kWh contact with accompanying bill %s before token, proof or database work', async monthlyBillThb => {
    const value = body({ consumptionInput: 'kwh', monthlyConsumptionKwh: 1200, monthlyBillThb });
    // A valid calculator-shaped input is not permission to use a new contact mode.
    expect(leadSchema.safeParse(value).success).toBe(true);
    const response = await POST(request(value));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, code: 'contact_consumption_input_not_supported' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(sideEffects.token).not.toHaveBeenCalled();
    expect(sideEffects.proof).not.toHaveBeenCalled();
    expect(sideEffects.database).not.toHaveBeenCalled();
  });

  it('rejects a positive fractional bill that would round to a database-invalid zero', async () => {
    const response = await POST(request(body({ monthlyBillThb: 0.1 })));
    expect(response.status).toBe(422);
    expect(sideEffects.token).not.toHaveBeenCalled();
    expect(sideEffects.database).not.toHaveBeenCalled();
  });

  it('keeps the published bill contact flow on its existing authentication path', async () => {
    const response = await POST(request(body()));
    expect(response.status).toBe(403); // deliberately invalid synthetic token
    expect(await response.json()).toMatchObject({ code: 'invalid_assessment_session' });
    expect(sideEffects.token).toHaveBeenCalledOnce();
    expect(sideEffects.database).not.toHaveBeenCalled();
  });

  it('preserves the owner plus four installed AC hard gates independently of calculator mode', () => {
    const valid = estimateAnswersSchema.parse(answers);
    expect(calculateLeadAssessment(valid).hardEligible).toBe(true);
    expect(calculateLeadAssessment({ ...valid, airConditionerCount: 3 }).hardEligible).toBe(false);
    expect(calculateLeadAssessment({ ...valid, ownershipStatus: 'renter', ownerPermission: 'yes' }).hardEligible).toBe(false);
    expect(calculateLeadAssessment({ ...valid, consumptionInput: 'kwh', monthlyConsumptionKwh: 1200, monthlyBillThb: 0 }).hardEligible).toBe(true);
  });
});
