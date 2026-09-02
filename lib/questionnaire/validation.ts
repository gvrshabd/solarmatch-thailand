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
  schemaVersion: z.union([z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  questions: z.array(z.object({
    id: z.enum(['province', 'monthlyBillThb', 'activelyPlanningSolar', 'propertyType', 'ownershipStatus', 'roofArea', 'daytimePattern', 'daytimeLoads', 'roofMaterial', 'shade', 'quoteContactRequested', 'installationTimeframe']),
    type: z.enum(['province', 'bill', 'choice', 'multichoice']),
    title: localizedTextSchema,
    help: localizedTextSchema,
    required: z.boolean(),
    options: z.array(optionSchema).max(30).optional(),
    conditionalFields: z.array(conditionalFieldSchema).max(5).optional(),
    relevance: z.object({ calculation: z.boolean(), qualification: z.boolean(), scoring: z.boolean() }),
  })).min(9).max(11),
}).superRefine((document, context) => {
  const ids = document.questions.map((question) => question.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['questions'], message: 'Question IDs must be unique.' });
  const requiredIds = ['province', 'monthlyBillThb', 'propertyType', 'ownershipStatus', 'daytimePattern', 'daytimeLoads', 'roofMaterial', 'shade'];
  requiredIds.forEach((id) => { if (!ids.includes(id as never)) context.addIssue({ code: 'custom', path: ['questions'], message: `Missing required question: ${id}` }); });
  if (document.schemaVersion <= 6 && !ids.includes('roofArea')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Historic questionnaire versions require roofArea.' });
  if (document.schemaVersion === 4 && !ids.includes('installationTimeframe')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 4 requires installationTimeframe.' });
  if (document.schemaVersion === 5 && ids.includes('installationTimeframe')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 5 must not include installationTimeframe.' });
  if (document.schemaVersion === 6) {
    if (ids.includes('installationTimeframe')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 6 must not include installationTimeframe.' });
    if (!ids.includes('activelyPlanningSolar')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 6 requires activelyPlanningSolar.' });
    if (!ids.includes('quoteContactRequested')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 6 requires quoteContactRequested.' });
    if (ids.indexOf('activelyPlanningSolar') !== ids.indexOf('monthlyBillThb') + 1) context.addIssue({ code: 'custom', path: ['questions'], message: 'Active planning must follow the monthly bill.' });
    if (ids.at(-1) !== 'quoteContactRequested') context.addIssue({ code: 'custom', path: ['questions'], message: 'The quote decision must be the final assessment question.' });
  }
  if (document.schemaVersion === 7) {
    const expected = ['province', 'monthlyBillThb', 'activelyPlanningSolar', 'propertyType', 'ownershipStatus', 'daytimePattern', 'daytimeLoads', 'shade', 'roofMaterial', 'quoteContactRequested'];
    if (ids.join('|') !== expected.join('|')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 7 must use the published ten-step public-funnel order.' });
    if (ids.includes('roofArea') || ids.includes('installationTimeframe')) context.addIssue({ code: 'custom', path: ['questions'], message: 'Version 7 keeps roof area optional and removes the legacy timeframe question.' });
  }
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
    activePlanning: z.number().int().min(0).max(100).optional(),
    airConditioners: z.number().int().min(0).max(100),
    monthlyBill: z.number().int().min(0).max(100),
    daytimeUse: z.number().int().min(0).max(100),
    daytimeLoads: z.number().int().min(0).max(100),
    roofArea: z.number().int().min(0).max(100),
    shade: z.number().int().min(0).max(100),
    roofMaterial: z.number().int().min(0).max(100),
    propertyType: z.number().int().min(0).max(100),
    location: z.number().int().min(0).max(100),
    timeframe: z.number().int().min(0).max(100).optional(),
  }),
  billThresholdsThb: z.tuple([z.number().positive(), z.number().positive(), z.number().positive(), z.number().positive(), z.number().positive()]),
  targetProvinces: z.array(z.string().min(1).max(100)).min(1).max(77),
  bands: z.array(z.object({ min: z.number().int().min(0).max(100), max: z.number().int().min(0).max(100), score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) })).length(5),
});
