import { SeededRandom } from './random.js';
import { stableHash } from './stableHash.js';

export const SESSION_ARC_PHASES = Object.freeze([
  'opening',
  'deepening',
  'distorting',
  'mirroring',
  'softening',
  'returning'
]);
export const SESSION_ARC_DECISIONS = Object.freeze([
  'deepen',
  'distort',
  'mirror',
  'soften',
  'return'
]);

const WEATHER_PRESSURE = Object.freeze({
  still: 0,
  uneasy: 0.1,
  heavy: 0.18,
  abyssal: 0.26
});

export function createSessionArc(snapshot = {}) {
  const decision = SESSION_ARC_DECISIONS.includes(snapshot.lastDecision)
    ? snapshot.lastDecision
    : 'deepen';
  return {
    schema: 'SessionArcV1',
    schemaVersion: 1,
    phase: SESSION_ARC_PHASES.includes(snapshot.phase) ? snapshot.phase : phaseForDecision(decision),
    beatCount: nonNegativeInteger(snapshot.beatCount, 0),
    pressure: clamp01(snapshot.pressure ?? 0),
    returnReadiness: clamp01(snapshot.returnReadiness ?? 0),
    continuationSeed: nonNegativeInteger(snapshot.continuationSeed, 0),
    recentBeatRoles: normalizeRoles(snapshot.recentBeatRoles),
    boundarySignalCount: nonNegativeInteger(snapshot.boundarySignalCount, 0),
    lastDecision: decision,
    weightOverrides: normalizeNumberMap(snapshot.weightOverrides)
  };
}

export function advanceSessionArc({
  previousArc = null,
  covenant = {},
  echoTrace = null,
  dreamWeather = null,
  dreamerMemoryContext = null,
  seed = 0
} = {}) {
  const previous = createSessionArc(previousArc ?? {});
  const ceiling = clamp01(covenant?.intensityCeiling ?? 0.35);
  const boundarySignals = Array.isArray(echoTrace?.boundarySignals) ? echoTrace.boundarySignals : [];
  const acceptedPressure = clamp01(echoTrace?.pressureAccepted ?? 0.35);
  const weatherPressure = WEATHER_PRESSURE[dreamWeather?.pressure] ?? 0;
  const dreadPressure = strongestDread(dreamWeather?.dreadBudget);
  const pressureDelta = calculatePressureDelta({
    acceptedPressure,
    weatherPressure,
    dreadPressure,
    boundarySignalCount: boundarySignals.length,
    returnAnchorUsed: Boolean(echoTrace?.returnAnchorUsed)
  });
  const pressure = clampToCeiling(previous.pressure + pressureDelta, ceiling);
  const beatCount = previous.beatCount + 1;
  const returnReadiness = calculateReturnReadiness({
    previous: previous.returnReadiness,
    pressure,
    ceiling,
    beatCount,
    boundarySignalCount: boundarySignals.length,
    returnAnchorUsed: Boolean(echoTrace?.returnAnchorUsed)
  });
  const decision = chooseDecision({
    pressure,
    ceiling,
    beatCount,
    returnReadiness,
    boundarySignalCount: boundarySignals.length,
    acceptedPressure,
    dreamerMemoryContext,
    seed,
    previous
  });
  const weightOverrides = createArcWeightOverrides({
    decision,
    dreamerMemoryContext,
    pressure,
    returnReadiness
  });
  const arc = createSessionArc({
    phase: phaseForDecision(decision),
    beatCount,
    pressure,
    returnReadiness,
    continuationSeed: nextContinuationSeed({ seed, previous, beatCount, decision }),
    recentBeatRoles: [...previous.recentBeatRoles.slice(-5), roleForDecision(decision)],
    boundarySignalCount: previous.boundarySignalCount + boundarySignals.length,
    lastDecision: decision,
    weightOverrides
  });

  return {
    arc,
    directive: {
      schema: 'SessionArcDirectiveV1',
      schemaVersion: 1,
      decision,
      suggestedRole: roleForDecision(decision),
      pressureDelta: round(pressureDelta),
      returnAvailable: returnReadiness >= 0.55 || decision === 'soften' || decision === 'return',
      weightOverrides
    }
  };
}

function calculatePressureDelta({
  acceptedPressure,
  weatherPressure,
  dreadPressure,
  boundarySignalCount,
  returnAnchorUsed
}) {
  let delta = 0.04 + acceptedPressure * 0.24 + weatherPressure + dreadPressure * 0.12;
  delta -= boundarySignalCount * 0.22;
  if (returnAnchorUsed) {
    delta -= 0.3;
  }
  return round(delta);
}

function calculateReturnReadiness({
  previous,
  pressure,
  ceiling,
  beatCount,
  boundarySignalCount,
  returnAnchorUsed
}) {
  let readiness = previous + beatCount * 0.025;
  if (pressure >= ceiling * 0.75) {
    readiness += 0.16;
  }
  if (beatCount >= 6) {
    readiness += 0.18;
  }
  readiness += boundarySignalCount * 0.22;
  if (returnAnchorUsed) {
    readiness += 0.35;
  }
  return clamp01(readiness);
}

function chooseDecision({
  pressure,
  ceiling,
  beatCount,
  returnReadiness,
  boundarySignalCount,
  acceptedPressure,
  dreamerMemoryContext,
  seed,
  previous
}) {
  if (boundarySignalCount > 0 || acceptedPressure < 0.25) {
    return 'soften';
  }
  if (returnReadiness >= 0.82 || beatCount >= 9) {
    return 'return';
  }
  if (returnReadiness >= 0.68 && pressure >= ceiling * 0.7) {
    return 'return';
  }
  if (pressure >= ceiling * 0.72 && acceptedPressure >= 0.5) {
    return 'deepen';
  }
  if (beatCount >= 3 && hasMemoryEchoes(dreamerMemoryContext)) {
    return 'mirror';
  }
  if (pressure >= ceiling * 0.52) {
    const rng = new SeededRandom(stableHash({ seed, pressure, beatCount, previous: previous.continuationSeed }));
    return rng.next() > 0.45 ? 'distort' : 'mirror';
  }
  return 'deepen';
}

function createArcWeightOverrides({
  decision,
  dreamerMemoryContext,
  pressure,
  returnReadiness
}) {
  const overrides = {};
  if (decision === 'deepen') {
    overrides.space_black_hole = round(1.12 + pressure * 0.5);
    overrides.white_void = round(1.06 + pressure * 0.25);
  } else if (decision === 'distort') {
    overrides.mirror_hall = round(1.12 + pressure * 0.35);
    overrides.white_void = round(1.08 + pressure * 0.2);
  } else if (decision === 'mirror') {
    overrides.mirror_hall = round(1.18 + pressure * 0.25);
  } else if (decision === 'soften') {
    overrides.garden = round(1.2 + returnReadiness * 0.25);
    overrides.cabin = round(1.14 + returnReadiness * 0.2);
  } else if (decision === 'return') {
    overrides.cabin = round(1.28 + returnReadiness * 0.25);
    overrides.garden = round(1.12 + returnReadiness * 0.12);
  }

  for (const moduleId of dreamerMemoryContext?.familiarDreamModules ?? []) {
    if (typeof moduleId === 'string' && moduleId.trim()) {
      overrides[moduleId] = round(Math.max(overrides[moduleId] ?? 1, 1.04));
    }
  }
  return overrides;
}

function roleForDecision(decision) {
  if (decision === 'soften' || decision === 'return') {
    return 'return';
  }
  if (decision === 'mirror' || decision === 'distort') {
    return 'mirror';
  }
  return 'pressure';
}

function phaseForDecision(decision) {
  return {
    deepen: 'deepening',
    distort: 'distorting',
    mirror: 'mirroring',
    soften: 'softening',
    return: 'returning'
  }[decision] ?? 'opening';
}

function strongestDread(dreadBudget = {}) {
  return Math.max(0, ...Object.values(dreadBudget ?? {}).filter(Number.isFinite));
}

function hasMemoryEchoes(context) {
  return Boolean(
    context?.strongSymbols?.length
    || context?.familiarDreamModules?.length
    || context?.familiarMasks?.length
  );
}

function nextContinuationSeed({ seed, previous, beatCount, decision }) {
  return SeededRandom.normalizeSeed(stableHash({
    seed,
    previous: previous.continuationSeed,
    beatCount,
    decision
  }));
}

function normalizeRoles(roles = []) {
  return (Array.isArray(roles) ? roles : [])
    .filter((role) => ['entry', 'pressure', 'mirror', 'return'].includes(role))
    .slice(-6);
}

function normalizeNumberMap(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => typeof key === 'string' && Number.isFinite(value))
      .map(([key, value]) => [key, round(Math.max(0.05, Math.min(3, value)))])
  );
}

function nonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function clampToCeiling(value, ceiling) {
  return round(Math.max(0, Math.min(ceiling, value)));
}

function clamp01(value) {
  return round(Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)));
}

function round(value) {
  return Number(value.toFixed(3));
}
