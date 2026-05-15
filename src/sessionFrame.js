import { stableHash } from './stableHash.js';

const FRAME_KINDS = Object.freeze(['threshold_silent', 'threshold_awake', 'threshold_portal', 'dream', 'return']);

export function buildSessionFrame({
  seed = 0,
  frameIndex = 1,
  frameKind = null,
  thresholdPresentation,
  experienceDirective,
  sessionCovenant = {},
  trace = null
} = {}) {
  const presentation = structuredClone(thresholdPresentation);
  const directive = structuredClone(experienceDirective);
  const dreamAtmosphere = presentation?.dreamAtmosphere ?? {};
  const comfort = dreamAtmosphere.comfort ?? {};
  const traceEntries = Array.isArray(trace?.entries) ? trace.entries : [];
  const resolvedFrameKind = FRAME_KINDS.includes(frameKind) ? frameKind : inferFrameKind({ presentation, directive });

  return {
    schema: 'SessionFrameV1',
    schemaVersion: 1,
    frameId: createFrameId({ seed, frameIndex, frameKind: resolvedFrameKind, directiveId: directive?.directiveId }),
    frameIndex: normalizeFrameIndex(frameIndex),
    frameKind: resolvedFrameKind,
    presentation,
    experienceDirective: directive,
    comfort: {
      intensityCeiling: clamp01(sessionCovenant?.intensityCeiling ?? comfort.ceiling ?? 0.35),
      returnAvailable: directive?.nextMove === 'return' || (directive?.returnReadiness ?? 0) >= 0.82,
      returnAnchorKind: String(directive?.returnAnchorKind ?? comfort.returnAnchorKind ?? 'image'),
      suddenFlashAllowed: Boolean(comfort.suddenFlashAllowed),
      pursuitAllowed: Boolean(comfort.pursuitAllowed),
      hapticsEnabled: Boolean(dreamAtmosphere.haptics?.enabled),
      locomotionIntensity: clamp01(comfort.locomotionIntensity ?? 0)
    },
    rendererHints: {
      nextMove: directive?.nextMove ?? 'deepen',
      suggestedRole: directive?.suggestedRole ?? 'pressure',
      pressureTarget: clamp01(directive?.pressureTarget ?? 0),
      returnReadiness: clamp01(directive?.returnReadiness ?? 0),
      atmosphereMood: dreamAtmosphere.mood ?? 'stillness',
      weatherPressure: dreamAtmosphere.pressure ?? 'low',
      lightingIntensityScale: clamp01(dreamAtmosphere.lighting?.intensityScale ?? 0),
      fogDensity: clamp01(dreamAtmosphere.fog?.density ?? 0),
      audioTension: clamp01(dreamAtmosphere.audio?.tension ?? 0),
      hapticAmplitude: clamp01(dreamAtmosphere.haptics?.amplitude ?? 0),
      movementDrag: clamp01(dreamAtmosphere.movement?.drag ?? 0)
    },
    debug: {
      eventCount: traceEntries.length,
      lastEventType: traceEntries.at(-1)?.type ?? null
    },
    playerFacingText: null
  };
}

function inferFrameKind({ presentation, directive }) {
  if (directive?.nextMove === 'return') {
    return 'return';
  }
  if (presentation?.portal?.open) {
    return 'threshold_portal';
  }
  if (presentation?.room?.awakened) {
    return 'threshold_awake';
  }
  return 'threshold_silent';
}

function createFrameId({ seed, frameIndex, frameKind, directiveId }) {
  return `session-frame-${stableHash({
    seed,
    frameIndex,
    frameKind,
    directiveId: directiveId ?? null
  }).slice(0, 10)}`;
}

function normalizeFrameIndex(value) {
  return Number.isInteger(value) && value >= 0 ? value : 1;
}

function clamp01(value) {
  const number = Number(value);
  return Number(Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0)).toFixed(3));
}
