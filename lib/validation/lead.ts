import { z } from 'zod';
import { estimateAnswersSchema } from './estimate';
import { attributionSchema } from '@/lib/analytics/attribution';

export const thaiPhonePattern = /^(?:\+66|0)[689][0-9]{8}$/u;

export function normalizeThaiPhone(value: string) {
  const compact = value.replace(/[\s()-]/gu, '');
  if (compact.startsWith('+66')) return compact;
  if (compact.startsWith('0')) return `+66${compact.slice(1)}`;
  return compact;
}

export const leadSchema = z.object({
  legalFirstName: z.string().trim().min(1).max(80),
  legalLastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().transform((value) => value.replace(/[\s()-]/gu, '')).refine((value) => thaiPhonePattern.test(value)),
  contactMethod: z.literal('phone'),
  phoneVerificationId: z.string().uuid(),
  phoneVerificationProof: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
  adultConfirmed: z.literal(true),
  consent: z.literal(true),
  locale: z.enum(['en', 'th']),
  assessmentToken: z.string().min(40).max(4096),
  idempotencyKey: z.string().uuid(),
  website: z.string().max(0).optional(),
  answers: estimateAnswersSchema,
  attribution: attributionSchema.optional(),
}).strict().superRefine((value, context) => {
  if (!value.answers.quoteContactRequested || !value.answers.quoteConsentAccepted) {
    context.addIssue({ code: 'custom', path: ['answers', 'quoteContactRequested'], message: 'contact_request_and_consent_required' });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;
