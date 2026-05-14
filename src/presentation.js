import { FeelingState } from './feeling.js';

export function buildThresholdPresentation({ chamber, feeling }) {
  const chamberSnapshot = snapshotFrom(chamber);
  const feelingState = feeling instanceof FeelingState ? feeling : new FeelingState(feeling);
  const atmosphere = feelingState.toPresentationParams();

  return {
    schema: 'ThresholdPresentationV1',
    room: {
      awakened: chamberSnapshot.awakened,
      boundaryState: chamberSnapshot.boundaryState,
      atmosphereState: feelingState.vibeState
    },
    note: {
      text: chamberSnapshot.note,
      visible: true,
      material: chamberSnapshot.awakened ? 'ink_warmed_by_heartlight' : 'dry_ink_in_dim_room'
    },
    heartlight: {
      awake: chamberSnapshot.heartlight?.awake ?? false,
      intensity: chamberSnapshot.heartlight?.intensity ?? 0,
      color: chamberSnapshot.heartlight?.color ?? 'low ember',
      bloom: atmosphere.postProcess.bloom
    },
    portal: {
      open: chamberSnapshot.portalOpen,
      material: chamberSnapshot.portalOpen ? 'threshold_rim_light' : 'dormant_keyhole_shadow'
    },
    toolSigils: {
      visible: (chamberSnapshot.visibleToolSigils ?? []).map((tool) => ({
        id: tool.id,
        name: tool.name,
        effect: tool.effect,
        material: `${tool.id}_sigil_placeholder`
      }))
    },
    forms: (chamberSnapshot.spawnedForms ?? []).map((form) => ({ ...form })),
    atmosphere
  };
}

function snapshotFrom(value) {
  if (typeof value?.snapshot === 'function') {
    return value.snapshot();
  }
  return value ?? {};
}
