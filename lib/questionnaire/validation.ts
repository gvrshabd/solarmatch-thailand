import { z } from 'zod';

const localizedTextSchema = z.object({ en: z.string().trim().min(1).max(500), th: z.string().trim().min(1).max(500) });
const conditionalFieldSchema = z.object({
  id: z.enum(['customLocation', 'customPropertyType', 'customDaytimeLoad', 'airConditionerCount', 'customRoofMaterial']),
  whenOption: z.string().min(1).max(80),
  kind: z.enum(['text', 'ac-count']),
  label: localizedTextSchema,
  placeholder: localizedTextSchema.optional(),
  help: localizedTextSchema.optional(),
  required: z.boolean(),
  minLength: z.number().int().min(0).max(500).optional(),
  maxLength: z.number().int().min(1).max(2000).optional(),
});
const optionSchema = z.object({
  value: z.string().regex(/^[a-z0-9-]+$/u).max(80),
  label: localizedTextSchema,
  description: localizedTextSchema.optional(),
  exclusive: z.boolean().optional(),
});

export const questionnaireDocumentSchema = z.object({
  id: z.string().min(1).max(100),
  schemaVersion: z.literal(4),
  questions: z.array(z.object({
    id: z.enum(['province', 'monthlyBillThb', 'propertyType', 'ownershipStatus', 'roofArea', 'daytimePattern', 'daytimeLoads', 'roofMaterial', 'shade', 'installationTimeframe']),
    type: z.enum(['province', 'bill', 'choice', 'multichoice']),
    title: localizedTextSchema,
    help: localizedTextSchema,
    required: z.boolean(),
    options: z.array(optionSchema).max(30).optional(),
    conditionalFields: z.array(conditionalFieldSchema).max(5).optional(),
    relevance: z.object({ calculation: z.boolean(), qualification: z.boolean(), scoring: z.boolean() }),
  })).length(10),
}).superRefine((document, context) => {
  const ids = document.questions.map((question) => question.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['questions'], message: 'Question IDs must be unique.' });
  const requiredIds = ['province', 'monthlyBillThb', 'propertyType', 'ownershipStatus', 'roofArea', 'daytimePattern', 'daytimeLoads', 'roofMaterial', 'shade', 'installationTimeframe'];
  requiredIds.forEach((id) => { if (!ids.includes(id as never)) context.addIssue({ code: 'custom', path: ['questions'], message: `Missing required question: ${id}` }); });
  document.questions.forEach((question, questionIndex) => {
    const values = question.options?.map((option) => option.value) ?? [];
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', path: ['questions', questionIndex, 'options'], message: 'Option values must be unique.' });
    question.conditionalFields?.forEach((field, fieldIndex) => {
      if (!values.includes(field.whenOption)) context.addIssue({ code: 'custom', path: ['questions', questionIndex, 'conditionalFields', fieldIndex], message: 'Conditional fields must reference an option in the same question.' });
    });
  });
});

export const scoringConfigurationSchema = z.object({
  id: z.string().min(1).max(100),
  maximumPoints: z.literal(100),
  ownerRequired: z.boolean(),
  minimumAirConditioners: z.number().int().min(0).max(100),
  highQualityThreshold: z.number().int().min(1).max(5),
  automaticSelectionThreshold: z.number().int().min(1).max(5),
  weights: z.object({
    ownership: z.number().int().min(0).max(100),
    airConditioners: z.number().int().min(0).max(100),
    monthlyBill: z.number().int().min(0).max(100),
    daytimeUse: z.number().int().min(0).max(100),
    daytimeLoads: z.number().int().min(0).max(100),
    roofArea: z.number().int().min(0).max(100),
    shade: z.number().int().min(0).max(100),
    roofMaterial: z.number().int().min(0).max(100),
    propertyType: z.number().int().min(0).max(100),
    location: z.number().int().min(0).max(100),
    timeframe: z.number().int().min(0).max(100),
  }),
  billThresholdsThb: z.tuple([z.number().positive(), z.number().positive(), z.number().positive(), z.number().positive(), z.number().positive()]),
  targetProvinces: z.array(z.string().min(1).max(100)).min(1).max(77),
  bands: z.array(z.object({ min: z.number().int().min(0).max(100), max: z.number().int().min(0).max(100), score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) })).length(5),
});
