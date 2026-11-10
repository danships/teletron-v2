import { z } from 'zod';
import { componentSchema, spacingSchema } from './components.js';

export const moduleIdSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const placementSchema = z.strictObject({
  row: z.number().int().positive(),
  column: z.number().int().positive(),
  rowSpan: z.number().int().positive(),
  columnSpan: z.number().int().positive(),
});
export const moduleSchema = z
  .strictObject({
    id: moduleIdSchema,
    mode: z.enum(['local', 'data', 'mixed']),
    source: z.enum(['weather.home', 'youtube.followers']).optional(),
    placement: placementSchema,
    component: componentSchema,
  })
  .refine((module) => (module.mode === 'local' ? module.source === undefined : module.source !== undefined));
export const sceneSchema = z
  .strictObject({
    target: z.literal('web'),
    theme: z.literal('dark'),
    grid: z.strictObject({
      rows: z.number().int().min(1).max(12),
      columns: z.number().int().min(1).max(12),
      gap: spacingSchema,
      padding: spacingSchema,
    }),
    modules: z.array(moduleSchema).min(1).max(12),
  })
  .refine(
    (scene) =>
      new Set(scene.modules.map((module) => module.id)).size === scene.modules.length &&
      scene.modules.every(
        ({ placement }) =>
          placement.row + placement.rowSpan - 1 <= scene.grid.rows &&
          placement.column + placement.columnSpan - 1 <= scene.grid.columns
      )
  );
export function assertSceneTarget(
  scene: { target: string },
  capability: string
): { ok: true } | { ok: false; error: string } {
  return scene.target === 'web' && capability === 'display:web'
    ? { ok: true }
    : { ok: false, error: 'Scene target mismatch' };
}
export type Scene = z.infer<typeof sceneSchema>;
export type SceneModule = z.infer<typeof moduleSchema>;
