import { z } from 'zod';

export const thaiPhonePattern = /^(?:\+66|0)[0-9]{8,9}$/;

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'กรุณากรอกชื่อ').max(80),
  phone: z.string().transform((value) => value.replace(/[-\s]/g, '')).refine((value) => thaiPhonePattern.test(value), 'กรุณากรอกเบอร์โทรไทยให้ถูกต้อง'),
  contactMethod: z.enum(['phone', 'line']),
  lineId: z.string().trim().max(80).optional(),
  convenientTime: z.enum(['morning', 'afternoon', 'evening', 'anytime']),
  consent: z.literal(true, { error: 'กรุณายืนยันความยินยอม' }),
}).superRefine((value, context) => {
  if (value.contactMethod === 'line' && !value.lineId) {
    context.addIssue({ code: 'custom', path: ['lineId'], message: 'กรุณากรอก LINE ID' });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;
