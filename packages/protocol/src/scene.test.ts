import { describe, expect, it } from 'vitest';
import { decodeJsonMessage } from './envelope.js';
import { decodeSessionMessage } from './session-messages.js';
import { scene } from './scene.fixture.js';
import { assertSceneTarget, sceneSchema } from './scene.js';

const stack = (children: unknown[]) => ({ type: 'stack', direction: 'row', alignment: 'start', gap: 'none', children });

describe('web scenes AT-M01–M07', () => {
  it('accepts the complete scene and preserves markup as text', () => {
    expect(sceneSchema.parse(scene)).toEqual(scene);
  });
  it('rejects invalid mode and source combinations', () => {
    for (const module of [
      { ...scene.modules[0], source: 'weather.home' },
      { ...scene.modules[1], source: undefined },
      { ...scene.modules[1], mode: 'mixed', source: undefined },
    ]) {
      expect(sceneSchema.safeParse({ ...scene, modules: [module] }).success).toBe(false);
    }
  });
  it('rejects free-form fields, invalid tokens and unsafe paths', () => {
    for (const key of ['html', 'css', 'url', 'script', 'onClick']) {
      expect(sceneSchema.safeParse({ ...scene, [key]: 'bad' }).success).toBe(false);
      expect(
        sceneSchema.safeParse({
          ...scene,
          modules: [{ ...scene.modules[0], component: { ...scene.modules[0]?.component, [key]: 'bad' } }],
        }).success
      ).toBe(false);
    }
    for (const value of [
      { type: 'data', path: 'a.constructor' },
      { type: 'data', path: 'a.__proto__' },
      { type: 'data', path: 'a.prototype' },
      { type: 'data', path: 'a..b' },
    ]) {
      expect(
        sceneSchema.safeParse({
          ...scene,
          modules: [{ ...scene.modules[0], component: { ...scene.modules[0]?.component, value } }],
        }).success
      ).toBe(false);
    }
    expect(sceneSchema.safeParse({ ...scene, theme: 'other' }).success).toBe(false);
    expect(
      sceneSchema.safeParse({ ...scene, modules: [{ ...scene.modules[0], component: { type: 'html' } }] }).success
    ).toBe(false);
  });
  it('rejects duplicate IDs and grid overflow', () => {
    expect(sceneSchema.safeParse({ ...scene, modules: [scene.modules[0], scene.modules[0]] }).success).toBe(false);
    for (const column of [0, -1, 4])
      expect(
        sceneSchema.safeParse({
          ...scene,
          modules: [{ ...scene.modules[0], placement: { row: 1, column, rowSpan: 1, columnSpan: 1 } }],
        }).success
      ).toBe(false);
  });
  it('reports target mismatch', () => expect(assertSceneTarget({ target: 'pixel' }, 'display:web').ok).toBe(false));
  it('rejects a non-web capability', () => expect(assertSceneTarget({ target: 'web' }, 'other').ok).toBe(false));
  it('validates a large scene separately from its complete message frame', () => {
    const leaf = {
      type: 'text',
      value: { type: 'literal', value: 'a'.repeat(850) },
      size: 'small',
      weight: 'regular',
      tone: 'default',
    };
    const largeScene = {
      ...scene,
      modules: [
        {
          ...scene.modules[1],
          component: stack(Array.from({ length: 8 }, () => stack(Array.from({ length: 8 }, () => leaf)))),
        },
      ],
    };
    const sceneBytes = new TextEncoder().encode(JSON.stringify(largeScene)).byteLength;
    expect(sceneBytes).toBeGreaterThan(60_000);
    expect(sceneSchema.safeParse(largeScene).success).toBe(true);

    const message = {
      v: 1,
      type: 'display.scene.set',
      id: '00000000-0000-4000-8000-000000000001',
      ts: 1,
      body: {
        address: 'livingroom/hdmi',
        sceneRev: 1,
        scene: largeScene,
        data: [
          {
            moduleId: 'weather',
            dataRev: { generation: '00000000-0000-4000-8000-000000000001', sequence: 1 },
            data: { value: '' },
          },
        ],
      },
    };
    const frameLimit = 65_536;
    const baseBytes = new TextEncoder().encode(JSON.stringify(message)).byteLength;
    expect(baseBytes).toBeLessThan(frameLimit);
    message.body.data[0]!.data.value = 'a'.repeat(frameLimit - baseBytes);
    const frame = JSON.stringify(message);
    expect(new TextEncoder().encode(frame).byteLength).toBe(frameLimit);
    expect(decodeJsonMessage(frame, frameLimit).ok).toBe(true);
    expect(decodeSessionMessage(frame, frameLimit).ok).toBe(true);

    message.body.data[0]!.data.value += 'a';
    const oversizedFrame = JSON.stringify(message);
    expect(new TextEncoder().encode(oversizedFrame).byteLength).toBe(frameLimit + 1);
    expect(decodeJsonMessage(oversizedFrame, frameLimit)).toMatchObject({
      ok: false,
      error: { code: 'LIMIT_EXCEEDED' },
    });
  });
  it('bounds tree depth and child count', () => {
    let component: unknown = scene.modules[0]?.component;
    for (let index = 0; index < 20; index++)
      component = { type: 'stack', direction: 'row', alignment: 'start', gap: 'none', children: [component] };
    expect(sceneSchema.safeParse({ ...scene, modules: [{ ...scene.modules[0], component }] }).success).toBe(false);
    expect(
      sceneSchema.safeParse({
        ...scene,
        modules: [
          {
            ...scene.modules[0],
            component: {
              type: 'stack',
              direction: 'row',
              alignment: 'start',
              gap: 'none',
              children: Array.from({ length: 100 }, () => scene.modules[0]?.component),
            },
          },
        ],
      }).success
    ).toBe(false);
  });
});
