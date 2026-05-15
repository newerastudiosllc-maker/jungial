import { stableHash } from './stableHash.js';

const NEXT_MOVES = Object.freeze(['deepen', 'distort', 'mirror', 'soften', 'return']);
const DREAM_MODULE_IDS = Object.freeze(new Set([
  'cabin',
  'garden',
  'white_void',
  'space_black_hole',
  'mirror_hall'
]));
const WEATHER_TAGS = Object.freeze(new Set([
  'silence',
  'threshold',
  'soft_lamp',
  'mirror',
  'ash',
  'mist',
  'static',
  'gravity',
  'garden',
  'warmth',
  'cold',
  'distant_voice',
  'watching',
  'boundless',
  'contained',
  'pursuit',
  'bodyUnease',
  'cosmicDread',
  'disorientation',
  'loss',
  'claustrophobia',
  'annihilation',
  'rebirth',
  'cosmic_mystery',
  'reflection',
  'shadow',
  'self_observation',
  'safety',
  'memory',
  'hearth',
  'containment',
  'growth',
  'innocence',
  'fertility',
  'beauty',
  'dissolution',
  'void',
  'star',
  'unknown',
  'invitation',
  'door',
  'breath',
  'lamp'
]));
const WEATHER_PRESSURE_SCORE = Object.freeze({
  low: 0.08,
  medium: 0.16,
  heavy: 0.24,
  storm: 0.32
});

export function createExperienceDirective({
  seed = 0,
  firstListeningRun = null,
  sessionCovenant = {},
  sessionArc = {},
  dreamWeather = null,
  dreamerMemoryContext = null,
  architectState = null,
  appliedGniDirective = null
} = {}) {
  const nextMove = chooseNextMove({ firstListeningRun, sessionArc, dreamWeather });
  const ceiling = clamp01(sessionCovenant?.intensityCeiling ?? dreamWeather?.ceiling ?? 0.35);
  const pacingBias = createPacingBias({ architectState, appliedGniDirective });
  const pressureTarget = createPressureTarget({
    nextMove,
    ceiling,
    sessionArc,
    dreamWeather,
    pacingBias
  });
  const returnReadiness = createReturnReadiness({ nextMove, firstListeningRun, sessionArc });
  const reasonCodes = createReasonCodes({
    nextMove,
    firstListeningRun,
    sessionArc,
    dreamWeather,
    dreamerMemoryContext,
    appliedGniDirective
  });

  return {
    schema: 'ExperienceDirectiveV1',
    schemaVersion: 1,
    directiveId: createDirectiveId({ seed, nextMove, pressureTarget, returnReadiness }),
    seed: Number.isFinite(seed) ? seed : 0,
    nextMove,
    suggestedRole: roleForMove(nextMove),
    pressureTarget,
    returnReadiness,
    toneTags: uniqueTags([
      ...(sessionCovenant?.toneTags ?? []),
      ...(firstListeningRun?.derivedToneTags ?? [])
    ]),
    weatherTagBias: createWeatherTagBias({ firstListeningRun, dreamWeather }),
    dreamWeightOverrides: createDreamWeightOverrides({
      nextMove,
      sessionArc,
      architectState,
      appliedGniDirective,
      returnReadiness
    }),
    pacingBias,
    maskPressure: createMaskPressure({ architectState, appliedGniDirective }),
    returnAnchorKind: normalizeToken(sessionCovenant?.returnAnchor?.kind) || normalizeToken(firstListeningRun?.returnAnchorHint?.kind) || 'image',
    returnAnchorValue: String(sessionCovenant?.returnAnchor?.value ?? firstListeningRun?.returnAnchorHint?.value ?? 'threshold_note').trim(),
    reasonCodes
  };
}

function chooseNextMove({ firstListeningRun, sessionArc, dreamWeather }) {
  const arcDecision = NEXT_MOVES.includes(sessionArc?.lastDecision) ? sessionArc.lastDecision : 'deepen';
  const listeningBoundary = hasFirstListeningBoundary(firstListeningRun);
  const returnReadiness = clamp01(sessionArc?.returnReadiness ?? 0);

  if (arcDecision === 'return' || returnReadiness >= 0.82) {
    return 'return';
  }
  if (listeningBoundary || sessionArc?.boundarySignalCount > 0) {
    return 'soften';
  }
  if (dreamWeather?.pressure === 'storm' && returnReadiness >= 0.55) {
    return 'soften';
  }
  return arcDecision;
}

function createPressureTarget({ nextMove, ceiling, sessionArc, dreamWeather, pacingBias }) {
  const weatherPressure = WEATHER_PRESSURE_SCORE[dreamWeather?.pressure] ?? 0;
  let target = clamp01(sessionArc?.pressure ?? 0) + weatherPressure;
  target += (pacingBias.intensity ?? 0) * 0.12;
  target -= (pacingBias.silence ?? 0) * 0.08;

  if (nextMove === 'soften') {
    target *= 0.72;
  } else if (nextMove === 'return') {
    target *= 0.58;
  } else if (nextMove === 'deepen') {
    target += 0.06;
  }

  return round(Math.max(0, Math.min(ceiling, target)));
}

function createReturnReadiness({ nextMove, firstListeningRun, sessionArc }) {
  let readiness = clamp01(sessionArc?.returnReadiness ?? 0);
  if (hasFirstListeningBoundary(firstListeningRun)) {
    readiness += 0.14;
  }
  if (nextMove === 'soften') {
    readiness += 0.08;
  }
  if (nextMove === 'return') {
    readiness = Math.max(readiness, 0.86);
  }
  return clamp01(readiness);
}

function createDreamWeightOverrides({
  nextMove,
  sessionArc,
  architectState,
  appliedGniDirective,
  returnReadiness
}) {
  const overrides = {};

  addKnownWeights(overrides, architectState?.globalDreamWeights, { mode: 'replace' });
  addKnownWeights(overrides, sessionArc?.weightOverrides, { mode: 'replaceIfHigher' });
  if (nextMove === 'soften') {
    overrides.garden = round(Math.max(overrides.garden ?? 1, 1.18 + returnReadiness * 0.2));
    overrides.cabin = round(Math.max(overrides.cabin ?? 1, 1.16 + returnReadiness * 0.18));
  } else if (nextMove === 'return') {
    overrides.cabin = round(Math.max(overrides.cabin ?? 1, 1.25 + returnReadiness * 0.2));
    overrides.garden = round(Math.max(overrides.garden ?? 1, 1.1 + returnReadiness * 0.1));
  } else if (nextMove === 'mirror') {
    overrides.mirror_hall = round(Math.max(overrides.mirror_hall ?? 1, 1.2));
  } else if (nextMove === 'distort') {
    overrides.mirror_hall = round(Math.max(overrides.mirror_hall ?? 1, 1.15));
    overrides.white_void = round(Math.max(overrides.white_void ?? 1, 1.1));
  } else {
    overrides.space_black_hole = round(Math.max(overrides.space_black_hole ?? 1, 1.12));
    overrides.white_void = round(Math.max(overrides.white_void ?? 1, 1.08));
  }

  for (const [moduleId, delta] of Object.entries(appliedGniDirective?.dreamWeightDeltas ?? {})) {
    if (!DREAM_MODULE_IDS.has(moduleId) || !Number.isFinite(delta)) {
      continue;
    }
    overrides[moduleId] = clampMultiplier((overrides[moduleId] ?? 1) + delta);
  }

  return Object.fromEntries(Object.entries(overrides).sort(([left], [right]) => left.localeCompare(right)));
}

function addKnownWeights(target, weights = {}, { mode }) {
  for (const [moduleId, value] of Object.entries(weights ?? {})) {
    if (!DREAM_MODULE_IDS.has(moduleId) || !Number.isFinite(value)) {
      continue;
    }
    const clamped = clampMultiplier(value);
    if (mode === 'replaceIfHigher') {
      target[moduleId] = round(Math.max(target[moduleId] ?? 0, clamped));
    } else {
      target[moduleId] = clamped;
    }
  }
}

function createPacingBias({ architectState, appliedGniDirective }) {
  return {
    intensity: clampSigned((architectState?.pacingProfile?.intensity ?? 0) + (appliedGniDirective?.pacingDelta?.intensity ?? 0)),
    repetition: clampSigned((architectState?.pacingProfile?.repetition ?? 0) + (appliedGniDirective?.pacingDelta?.repetition ?? 0)),
    silence: clampSigned((architectState?.pacingProfile?.silence ?? 0) + (appliedGniDirective?.pacingDelta?.silence ?? 0))
  };
}

function createMaskPressure({ architectState, appliedGniDirective }) {
  const result = {};
  for (const [maskId, value] of Object.entries(architectState?.maskPressure ?? {})) {
    if (isSafeToken(maskId) && Number.isFinite(value)) {
      result[maskId] = clampSigned(value);
    }
  }
  for (const [maskId, value] of Object.entries(appliedGniDirective?.maskPressure ?? {})) {
    if (isSafeToken(maskId) && Number.isFinite(value)) {
      result[maskId] = clampSigned((result[maskId] ?? 0) + value);
    }
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function createWeatherTagBias({ firstListeningRun, dreamWeather }) {
  return uniqueTags([
    ...(dreamWeather?.weatherTags ?? []),
    ...(firstListeningRun?.beats ?? []).flatMap((beat) => beat.motifTags ?? [])
  ].map(normalizeToken).filter((tag) => WEATHER_TAGS.has(tag)));
}

function createReasonCodes({
  nextMove,
  firstListeningRun,
  sessionArc,
  dreamWeather,
  dreamerMemoryContext,
  appliedGniDirective
}) {
  return uniqueTags([
    `session_arc_${nextMove}`,
    hasFirstListeningBoundary(firstListeningRun) ? 'first_listening_boundary' : null,
    dreamWeather?.pressure === 'heavy' || dreamWeather?.pressure === 'storm' ? 'weather_pressure_high' : null,
    hasMemoryEchoes(dreamerMemoryContext) ? 'memory_echo_present' : null,
    appliedGniDirective ? 'gni_directive_applied' : null,
    clamp01(sessionArc?.returnReadiness ?? 0) >= 0.55 ? 'return_available' : null
  ]);
}

function hasFirstListeningBoundary(firstListeningRun) {
  return (firstListeningRun?.beats ?? []).some((beat) => {
    return beat.responseKind === 'wait'
      || beat.responseKind === 'withdraw'
      || (beat.boundarySignals ?? []).length > 0;
  });
}

function hasMemoryEchoes(context) {
  return Boolean(
    context?.strongSymbols?.length
    || context?.familiarDreamModules?.length
    || context?.familiarMasks?.length
  );
}

function roleForMove(move) {
  if (move === 'soften' || move === 'return') {
    return 'return';
  }
  if (move === 'mirror' || move === 'distort') {
    return 'mirror';
  }
  return 'pressure';
}

function createDirectiveId({ seed, nextMove, pressureTarget, returnReadiness }) {
  const hash = stableHash({ seed, nextMove, pressureTarget, returnReadiness }).slice(0, 10);
  return `experience-${hash}`;
}

function uniqueTags(tags = []) {
  return [...new Set(tags.filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function isSafeToken(value) {
  return normalizeToken(value) === value && Boolean(value);
}

function clampMultiplier(value) {
  return round(Math.max(0.05, Math.min(3, value)));
}

function clampSigned(value) {
  return round(Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0)));
}

function clamp01(value) {
  return round(Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)));
}

function round(value) {
  return Number(Number(value).toFixed(3));
}
