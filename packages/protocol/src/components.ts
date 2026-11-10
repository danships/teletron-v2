import { z } from 'zod';

export const spacingSchema = z.enum(['none', 'small', 'medium', 'large']);
export const alignmentSchema = z.enum(['start', 'center', 'end']);
export const iconTokenSchema = z.enum([
  'weather-clear',
  'weather-partly-cloudy',
  'weather-cloudy',
  'weather-fog',
  'weather-drizzle',
  'weather-rain',
  'weather-snow',
  'weather-thunderstorm',
  'weather-unknown',
  'people',
]);
export const leafValueSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('literal'), value: z.union([z.string().max(1024), z.number().finite()]) }),
  z.strictObject({ type: z.literal('clock'), format: z.enum(['HH:mm', 'HH:mm:ss']) }),
  z.strictObject({
    type: z.literal('data'),
    path: z
      .string()
      .max(255)
      .refine((path) =>
        path
          .split('.')
          .every(
            (part) => /^[A-Za-z][A-Za-z0-9_]*$/.test(part) && !['__proto__', 'prototype', 'constructor'].includes(part)
          )
      ),
  }),
]);
const style = {
  size: z.enum(['small', 'medium', 'large', 'x-large', 'hero']),
  weight: z.enum(['regular', 'bold']),
  tone: z.enum(['default', 'muted', 'accent', 'warning']),
};
const leafSchemas = [
  z.strictObject({ type: z.literal('text'), value: leafValueSchema, ...style }),
  z.strictObject({ type: z.literal('big-number'), value: leafValueSchema, ...style }),
  z.strictObject({
    type: z.literal('icon'),
    value: leafValueSchema.refine(
      (value) => value.type !== 'literal' || iconTokenSchema.safeParse(value.value).success
    ),
  }),
] as const;
function componentLevel<T extends z.ZodType>(child: T) {
  return z.discriminatedUnion('type', [
    ...leafSchemas,
    z.strictObject({
      type: z.literal('stack'),
      direction: z.enum(['row', 'column']),
      alignment: alignmentSchema,
      gap: spacingSchema,
      children: z.array(child).min(1).max(8),
    }),
  ]);
}
const leafComponentSchema = z.discriminatedUnion('type', leafSchemas);
const levelOne = componentLevel(leafComponentSchema);
const levelTwo = componentLevel(levelOne);
const levelThree = componentLevel(levelTwo);
export const componentSchema = componentLevel(levelThree);
export type Component = z.infer<typeof componentSchema>;
export type LeafValue = z.infer<typeof leafValueSchema>;
export type IconToken = z.infer<typeof iconTokenSchema>;
