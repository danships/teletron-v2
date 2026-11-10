import { describe, expect, it } from 'vitest';
import { decodeSessionMessage } from './session-messages.js';
import { scene } from './scene.test.js';

const generation = '00000000-0000-4000-8000-000000000001';
const address = 'livingroom/hdmi';
const revision = { generation, sequence: 1 };
const bodies = {
  'display.scene.set': {
    address,
    sceneRev: 1,
    scene,
    data: [{ moduleId: 'weather', dataRev: revision, data: { temperature: 12 } }],
  },
  'display.data.update': { address, sceneRev: 1, moduleId: 'weather', dataRev: revision, data: { temperature: 12 } },
  'display.state': { address, sceneRev: 1, dataRevisions: [{ moduleId: 'weather', ...revision }], cached: true },
  'display.resync': { address },
};
function decode(type: string, body: unknown) {
  return decodeSessionMessage(JSON.stringify({ v: 1, type, id: generation, ts: 1, body }), 65_536);
}
describe('display messages AT-M08', () => {
  it('decodes each known message and rejects bad addresses', () => {
    for (const [type, body] of Object.entries(bodies)) {
      expect(decode(type, body)).toMatchObject({ ok: true, value: { known: true } });
      expect(decode(type, { ...body, address: 'bad' }).ok).toBe(false);
    }
  });
  it('rejects invalid revisions and module IDs', () => {
    expect(decode('display.data.update', { ...bodies['display.data.update'], sceneRev: 0 }).ok).toBe(false);
    expect(
      decode('display.data.update', { ...bodies['display.data.update'], dataRev: { ...revision, sequence: 0 } }).ok
    ).toBe(false);
    expect(decode('display.data.update', { ...bodies['display.data.update'], moduleId: '' }).ok).toBe(false);
    expect(
      decode('display.scene.set', {
        ...bodies['display.scene.set'],
        data: [{ moduleId: 'unknown', dataRev: revision, data: {} }],
      }).ok
    ).toBe(false);
  });
});
