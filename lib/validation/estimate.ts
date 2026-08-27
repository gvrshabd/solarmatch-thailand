import { z } from 'zod';

export const estimateAnswersSchema = z.object({
  province: z.string().min(1),
  monthlyBillThb: z.number().min(500).max(50000),
  monthlyKwh: z.number().positive().optional(),
  daytimeUsage: z.enum(['high', 'medium', 'low', 'unknown']),
  authority: z.string().min(1),
  propertyType: z.string().min(1),
  roofKnown: z.boolean(),
  roofMaterial: z.string().optional(),
  shade: z.enum(['none', 'partial', 'high', 'unknown']).optional(),
  timing: z.string().min(1),
  energyInterest: z.string().optional(),
});
