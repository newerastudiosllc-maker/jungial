import { createSystemClock } from './clock.js';
import { SeededRandom } from './random.js';
import { stableHash } from './stableHash.js';
import { DREAD_BUDGET_AXES, WEATHER_TAGS } from './dreamWeather.js';

const DEFAULT_CONSENT = Object.freeze({
  profileMemory: true,
  crossSaveEchoes: false
});
const WEATHER_SYMBOLIC_TAGS = Object.freeze([
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
]);
const ALLOWED_WEATHER_TAGS = Object.freeze(new Set([
  ...WEATHER_TAGS,
  ...DREAD_BUDGET_AXES,
  ...WEATHER_SYMBOLIC_TAGS
]));
const ALLOWED_DREAD_AXES = Object.freeze(new Set(DREAD_BUDGET_AXES));

export class DreamerProfile {
  constructor(snapshot = {}, { clock = createSystemClock() } = {}) {
    this.clock = clock;
    this.profileId = snapshot.profileId ?? clock.nextId('dreamer');
    this.rootSeed = snapshot.rootSeed ?? clock.nextId('root_seed');
    this.createdAt = snapshot.createdAt ?? clock.nowIso();
    this.updatedAt = snapshot.updatedAt ?? this.createdAt;
    this.consent = {
      ...DEFAULT_CONSENT,
      ...(snapshot.consent ?? {})
    };
    this.memory = {
      sessionCount: snapshot.memory?.sessionCount ?? 0,
      symbols: cloneMap(snapshot.memory?.symbols),
      archetypes: cloneMap(snapshot.memory?.archetypes),
      actions: cloneMap(snapshot.memory?.actions),
      dreamModules: cloneMap(snapshot.memory?.dreamModules),
      masks: cloneMap(snapshot.memory?.masks),
      vibeStates: cloneMap(snapshot.memory?.vibeStates),
      passages: cloneMap(snapshot.memory?.passages),
      motifs: cloneMap(snapshot.memory?.motifs),
      gestures: cloneMap(snapshot.memory?.gestures),
      echoThreads: cloneMap(snapshot.memory?.echoThreads),
      weatherTags: cloneMap(snapshot.memory?.weatherTags),
      dreadAxes: cloneMap(snapshot.memory?.dreadAxes),
      lastSessionDigest: snapshot.memory?.lastSessionDigest ?? null
    };
  }

  recordSession({ sessionBundle, dreamJourney = null, mask = null, echoTrace = null, dreamWeather = null } = {}) {
    if (!this.consent.profileMemory || !sessionBundle) {
      return this.snapshot();
    }

    const at = this.clock.nowIso();
    this.updatedAt = at;
    this.memory.sessionCount += 1;

    for (const symbol of collectSymbols(sessionBundle, dreamJourney)) {
      incrementMemory(this.memory.symbols, symbol, { at });
    }
    for (const [archetype, weight] of Object.entries(sessionBundle.archetypeVector ?? {})) {
      addWeight(this.memory.archetypes, archetype, weight, { at });
    }
    for (const action of sessionBundle.recentActions ?? []) {
      incrementMemory(this.memory.actions, action, { at });
    }
    for (const moduleId of collectDreamModules(sessionBundle, dreamJourney)) {
      incrementMemory(this.memory.dreamModules, moduleId, { at });
    }
    if (mask?.id) {
      incrementMemory(this.memory.masks, mask.id, { at });
    }
    if (sessionBundle.vibeState) {
      incrementMemory(this.memory.vibeStates, sessionBundle.vibeState, { at });
    }
    if (echoTrace?.passageId) {
      incrementMemory(this.memory.passages, echoTrace.passageId, { at });
    }
    for (const motif of echoTrace?.motifsTouched ?? []) {
      incrementMemory(this.memory.motifs, motif, { at });
    }
    for (const gesture of echoTrace?.gestureTags ?? []) {
      incrementMemory(this.memory.gestures, gesture, { at });
    }
    for (const tag of dreamWeather?.weatherTags ?? []) {
      if (!ALLOWED_WEATHER_TAGS.has(tag)) {
        continue;
      }
      incrementMemory(this.memory.weatherTags, tag, { at });
    }
    for (const [axis, value] of Object.entries(dreamWeather?.dreadBudget ?? {})) {
      if (!ALLOWED_DREAD_AXES.has(axis)) {
        continue;
      }
      if (value > 0.05) {
        addWeight(this.memory.dreadAxes, axis, value, { at });
      }
    }

    this.memory.lastSessionDigest = stableHash({
      sessionId: sessionBundle.sessionId,
      dominantArchetype: sessionBundle.dominantArchetype,
      vibeState: sessionBundle.vibeState,
      symbols: collectSymbols(sessionBundle, dreamJourney),
      actions: sessionBundle.recentActions ?? [],
      dreamModules: [...collectDreamModules(sessionBundle, dreamJourney)],
      maskId: mask?.id ?? null,
      echoTrace: echoTrace
        ? {
            passageId: echoTrace.passageId,
            motifsTouched: echoTrace.motifsTouched,
            gestureTags: echoTrace.gestureTags,
            boundarySignals: echoTrace.boundarySignals
          }
        : null
    });

    return this.snapshot();
  }

  deriveRunSeed({ slotId = 'default', mode = 'continue', incarnationIndex = 0 } = {}) {
    return SeededRandom.normalizeSeed(stableHash({
      profileId: this.profileId,
      rootSeed: this.rootSeed,
      slotId,
      mode,
      incarnationIndex
    }));
  }

  toGniMemoryContext({ slotId = 'default', mode = 'continue', limit = 8 } = {}) {
    return {
      schema: 'DreamerMemoryContextV1',
      schemaVersion: 1,
      profileId: this.consent.crossSaveEchoes ? this.profileId : null,
      slotId,
      saveMode: mode,
      sessionCount: this.memory.sessionCount,
      strongSymbols: topKeys(this.memory.symbols, limit),
      recurringArchetypes: topKeys(this.memory.archetypes, limit, 'weight'),
      familiarMasks: topKeys(this.memory.masks, limit),
      familiarDreamModules: topKeys(this.memory.dreamModules, limit),
      familiarActions: topKeys(this.memory.actions, limit),
      familiarPassages: topKeys(this.memory.passages, limit),
      familiarMotifs: topKeys(this.memory.motifs, limit),
      familiarGestures: topKeys(this.memory.gestures, limit),
      echoThreadIds: topKeys(this.memory.echoThreads, limit),
      vibeEchoes: topKeys(this.memory.vibeStates, limit),
      familiarWeatherTags: topKeys(this.memory.weatherTags, limit),
      familiarDreadAxes: topKeys(this.memory.dreadAxes, limit, 'weight'),
      lastSessionDigest: this.memory.lastSessionDigest
    };
  }

  snapshot() {
    return {
      schema: 'DreamerProfileV1',
      schemaVersion: 1,
      profileId: this.profileId,
      rootSeed: this.rootSeed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      consent: { ...this.consent },
      memory: {
        sessionCount: this.memory.sessionCount,
        symbols: cloneMap(this.memory.symbols),
        archetypes: cloneMap(this.memory.archetypes),
        actions: cloneMap(this.memory.actions),
        dreamModules: cloneMap(this.memory.dreamModules),
        masks: cloneMap(this.memory.masks),
        vibeStates: cloneMap(this.memory.vibeStates),
        passages: cloneMap(this.memory.passages),
        motifs: cloneMap(this.memory.motifs),
        gestures: cloneMap(this.memory.gestures),
        echoThreads: cloneMap(this.memory.echoThreads),
        weatherTags: cloneMap(this.memory.weatherTags),
        dreadAxes: cloneMap(this.memory.dreadAxes),
        lastSessionDigest: this.memory.lastSessionDigest
      }
    };
  }
}

function collectSymbols(sessionBundle, dreamJourney) {
  const dreamSymbols = new Set([
    ...(sessionBundle?.selectedDream?.symbolicTags ?? []),
    ...(dreamJourney?.symbolTrail ?? [])
  ].filter(isNonEmptyString));

  return [
    ...(sessionBundle?.recentSymbols ?? []),
    ...dreamSymbols
  ].filter(isNonEmptyString);
}

function collectDreamModules(sessionBundle, dreamJourney) {
  const ids = new Set();
  if (sessionBundle?.selectedDream?.id) {
    ids.add(sessionBundle.selectedDream.id);
  }
  for (const beat of dreamJourney?.beats ?? []) {
    if (beat.moduleId) {
      ids.add(beat.moduleId);
    }
  }
  return ids;
}

function incrementMemory(map, key, { at }) {
  if (!isNonEmptyString(key)) {
    return;
  }
  const current = map[key] ?? { count: 0, weight: 0, lastSeenAt: null };
  map[key] = {
    count: current.count + 1,
    weight: round((current.weight ?? 0) + 1),
    lastSeenAt: at
  };
}

function addWeight(map, key, weight, { at }) {
  if (!isNonEmptyString(key) || !Number.isFinite(weight)) {
    return;
  }
  const current = map[key] ?? { count: 0, weight: 0, lastSeenAt: null };
  map[key] = {
    count: current.count + 1,
    weight: round((current.weight ?? 0) + weight),
    lastSeenAt: at
  };
}

function topKeys(map, limit, scoreKey = 'count') {
  return Object.entries(map)
    .sort(([leftKey, left], [rightKey, right]) => {
      const delta = (right[scoreKey] ?? 0) - (left[scoreKey] ?? 0);
      return delta === 0 ? leftKey.localeCompare(rightKey) : delta;
    })
    .slice(0, limit)
    .map(([key]) => key);
}

function cloneMap(input = {}) {
  return Object.fromEntries(
    Object.entries(input ?? {}).map(([key, value]) => [key, { ...value }])
  );
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function round(value) {
  return Number(value.toFixed(3));
}
