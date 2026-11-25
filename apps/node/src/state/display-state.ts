import type { DisplayDataUpdateBody, DisplaySceneSetBody, ResumeState } from '@teletron/protocol';

export function resumeState(state?: DisplaySceneSetBody): ResumeState {
  return {
    sceneRev: state?.sceneRev ?? null,
    dataRevisions: state?.data?.map(({ moduleId, dataRev }) => ({ moduleId, ...dataRev })) ?? [],
  };
}

export function applyScene(state: DisplaySceneSetBody | undefined, next: DisplaySceneSetBody, generation: string) {
  if (state && next.sceneRev <= state.sceneRev) return;
  return { ...next, data: next.data?.filter(({ dataRev }) => dataRev.generation === generation) ?? [] };
}

export function applyData(state: DisplaySceneSetBody | undefined, next: DisplayDataUpdateBody, generation: string) {
  const { sceneRev, moduleId, dataRev, data } = next;
  if (dataRev.generation !== generation) return;
  if (!state || sceneRev !== state.sceneRev) return 'resync';
  if (!state.scene.modules.some((module) => module.id === moduleId && module.mode !== 'local')) return 'resync';
  const previous = state.data?.find((item) => item.moduleId === moduleId);
  if (previous?.dataRev.generation === generation && previous.dataRev.sequence >= dataRev.sequence) return;
  return {
    ...state,
    data: [...(state.data ?? []).filter((item) => item.moduleId !== moduleId), { moduleId, dataRev, data }],
  };
}
