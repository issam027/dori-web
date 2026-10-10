import { z } from 'zod';

export const tierAssociationSchema = z.object({
  queueId: z.number().int().positive(),
  tierId: z.number().int().positive(),
  price: z.number().min(0),
  currency: z.union([z.literal(''), z.string().length(3)]),
  order: z.number().int().min(0),
  default: z.boolean(),
});

export const notificationRuleSchema = z
  .object({
    queueId: z.number().int().positive(),
    tierId: z.number().int().positive(),
    type: z.enum(['welcome', 'threshold']),
    channel: z.enum(['sms', 'email']),
    threshold: z.enum(['position', 'estimatedTime']),
    value: z.number().int().positive(),
    tracking: z.boolean(),
  })
  .refine((value) => value.type !== 'threshold' || value.value > 0, { path: ['value'] });

export const translationSchema = z.object({
  key: z.string().trim().min(1),
  category: z.enum(['ihm', 'sms', 'error']),
  locale: z.string().trim().min(2),
  content: z.string().trim().min(1),
  params: z.string(),
});
