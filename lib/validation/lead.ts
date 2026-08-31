import { z } from 'zod';
import { estimateAnswersSchema } from './estimate';

export const thaiPhonePattern = /^(?:\+66|0)[0-9]{8,9}$/u;

export function normalizeThaiPhone(value: string) {
  const compact = value.replace(/[\s()-]/gu, '');
  if (compact.startsWith('+66')) return compact;
  if (compact.startsWith('0')) return `+66${compact.slice(1)}`;
  return compact;
}

export const leadSchema = z.object({
  legalFirstName: z.string().trim().min(1).max(80),
  legalLastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().transform((value) => value.replace(/[\s()-]/gu, '')).refine((value) => thaiPhonePattern.test(value), 'invalid_thai_phone'),
  contactMethod: z.enum(['phone', 'line']),
  lineId: z.string().trim().max(80).optional(),
  consent: z.literal(true),
  locale: z.enum(['en', 'th']),
  assessmentToken: z.string().min(40).max(4096),
  idempotencyKey: z.string().uuid(),
  website: z.string().max(0).optional(),
  answers: estimateAnswersSchema,
}).superRefine((value, context) => {
  if (value.contactMethod === 'line' && !value.lineId) {
    context.addIssue({ code: 'custom', path: ['lineId'], message: 'line_id_required' });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;
