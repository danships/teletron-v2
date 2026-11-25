import { manifestSchema } from '@teletron/protocol';

export function displayManifest(instance: string) {
  const parameters = { target: 'web', viewport: { width: 1920, height: 1080 } };
  return manifestSchema.parse({
    revision: 1,
    kind: 'pi',
    limits: { maxJsonBytes: 65_536, maxBinaryBytes: 65_536 },
    capabilities: [{ type: 'display:web', instance, scope: 'local', parameters }],
  });
}
