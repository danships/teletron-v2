import { describe, expect, it } from 'vitest';
import { scene } from './scene.fixture.js';
import { assertSceneTarget, sceneSchema } from './scene.js';

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
