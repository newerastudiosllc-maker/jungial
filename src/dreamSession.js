import { createDreamWeather, createWeatherTrace } from './dreamWeather.js';
import { selectDreamJourney } from './dreamJourney.js';
import { createEchoTrace, selectPassage } from './passageLattice.js';
import { advanceSessionArc, createSessionArc } from './sessionArc.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { stableHash } from './stableHash.js';

const END_REASONS = Object.freeze({
  maxBeats: 'max_beats',
  returnAnchor: 'return_anchor',
  returnAvailable: 'return_available'
});

const DEFAULT_RESPONSE = Object.freeze({
  kind: 'approach',
  gestureTags: ['approached'],
  pressureAccepted: 0.4
});

export function runDreamSession({
  dreamflow,
  passages = [],
  archetypeState,
  feelingState,
  roomConfig = {},
  covenant = null,
  dreamerMemoryContext = null,
  architectState = null,
  seed = 0,
  maxBeats = 4,
  responses = [],
  initialArc = null,
  recentEchoTraces = [],
  stopWhenReturnAvailable = false
} = {}) {
  if (!dreamflow || typeof dreamflow.selectNext !== 'function') {
    throw new Error('runDreamSession requires a dreamflow generator');
  }

  const activeCovenant = createSessionCovenant(covenant ?? {});
  const beatLimit = normalizeMaxBeats(maxBeats);
  const echoWindow = [...recentEchoTraces];
  let currentArc = initialArc ? createSessionArc(initialArc) : null;
  let endedBecause = END_REASONS.maxBeats;
  const beats = [];

  for (let index = 0; index < beatLimit; index += 1) {
    const beatSeed = createBeatSeed(seed, index + 1);
    const weatherPreview = createDreamWeather({
      covenant: activeCovenant,
      archetypeVector: cloneArchetypeVector(archetypeState),
      vibeState: feelingState?.vibeState,
      dreamerMemoryContext,
      recentEchoTraces: echoWindow,
      seed: `${beatSeed}:preview`
    });
    const passageSelection = selectPassage({
      passages,
      covenant: activeCovenant,
      seed: `${beatSeed}:passage`,
      recentEchoTraces: echoWindow,
      dreamerMemoryContext,
      architectState,
      dreamWeather: weatherPreview
    });
    const response = selectResponseForBeat(responses, index);
    const echoTrace = createEchoTrace({
      passage: passageSelection.passage,
      response,
      dreamflowDeltas: response.dreamflowDeltas
    });
    const arcAdvance = advanceSessionArc({
      previousArc: currentArc,
      covenant: activeCovenant,
      echoTrace,
      dreamWeather: weatherPreview,
      dreamerMemoryContext,
      seed: `${beatSeed}:arc`
    });
    const dreamJourney = selectDreamJourney({
      dreamflow,
      archetypeState,
      feelingState,
      roomConfig,
      weightOverrides: arcAdvance.directive.weightOverrides
    });
    const selectedDream = selectDreamFromJourney(dreamJourney, arcAdvance.directive.suggestedRole);
    const currentEchoTraces = [...echoWindow, echoTrace];
    const weatherSourceTags = uniqueTags([
      ...(selectedDream.symbolicTags ?? []),
      ...(passageSelection.passage.motifs ?? []),
      ...(passageSelection.passage.pressureTags ?? [])
    ]);
    const dreamWeather = createDreamWeather({
      covenant: activeCovenant,
      archetypeVector: cloneArchetypeVector(archetypeState),
      vibeState: feelingState?.vibeState,
      dreamerMemoryContext,
      selectedDream,
      activePassage: passageSelection.passage,
      recentEchoTraces: currentEchoTraces,
      weatherTags: weatherSourceTags,
      seed: `${beatSeed}:weather`
    });
    const weatherTrace = createWeatherTrace({
      weather: dreamWeather,
      sourceTags: weatherSourceTags,
      seed: `${beatSeed}:weather`
    });
    const beat = {
      schema: 'DreamSessionBeatV1',
      schemaVersion: 1,
      index: index + 1,
      passage: passageSelection.passage,
      echoTrace,
      sessionArc: arcAdvance.arc,
      arcDirective: arcAdvance.directive,
      selectedDream,
      dreamJourney,
      dreamWeather,
      weatherTrace,
      returnAvailable: arcAdvance.directive.returnAvailable
    };

    beats.push(beat);
    echoWindow.push(echoTrace);
    currentArc = arcAdvance.arc;

    if (echoTrace.returnAnchorUsed) {
      endedBecause = END_REASONS.returnAnchor;
      break;
    }
    if (stopWhenReturnAvailable && arcAdvance.directive.returnAvailable) {
      endedBecause = END_REASONS.returnAvailable;
      break;
    }
  }

  return {
    schema: 'DreamSessionV1',
    schemaVersion: 1,
    sessionId: `dream-session-${stableHash({ seed, beatLimit, firstEcho: echoWindow[0]?.passageId ?? null }).slice(0, 12)}`,
    seed,
    maxBeats: beatLimit,
    completedBeats: beats.length,
    endedBecause,
    beats,
    finalSessionArc: currentArc ?? createSessionArc(),
    recentEchoTraces: echoWindow,
    finalDreamWeather: beats.at(-1)?.dreamWeather ?? null,
    finalSelectedDream: beats.at(-1)?.selectedDream ?? null
  };
}

export function runDreamSessionFromRuntime({
  runtime,
  covenant = null,
  seed = 0,
  maxBeats = 4,
  responses = [],
  initialArc = null,
  recentEchoTraces = [],
  stopWhenReturnAvailable = false,
  dreamerMemoryContext = null
} = {}) {
  if (!runtime) {
    throw new Error('runDreamSessionFromRuntime requires a Jungial runtime');
  }

  return runDreamSession({
    dreamflow: runtime.dreamflow,
    passages: runtime.catalog?.passages ?? [],
    archetypeState: runtime.archetypes,
    feelingState: runtime.feeling,
    roomConfig: runtime.chamber?.snapshot?.() ?? {},
    covenant,
    dreamerMemoryContext,
    architectState: runtime.architect?.snapshot?.() ?? null,
    seed,
    maxBeats,
    responses,
    initialArc,
    recentEchoTraces,
    stopWhenReturnAvailable
  });
}

function selectDreamFromJourney(journey, suggestedRole) {
  const beat = journey.beats.find((entry) => entry.role === suggestedRole)
    ?? journey.beats[0];

  return {
    id: beat.moduleId,
    name: beat.moduleName,
    symbolicTags: [...beat.symbolicTags],
    weightBreakdown: { ...beat.weightBreakdown }
  };
}

function selectResponseForBeat(responses, index) {
  const selected = Array.isArray(responses) && responses.length > 0
    ? responses[index] ?? responses[responses.length - 1]
    : DEFAULT_RESPONSE;

  return selected && typeof selected === 'object'
    ? selected
    : DEFAULT_RESPONSE;
}

function createBeatSeed(seed, beatNumber) {
  return stableHash({ seed, beatNumber }).slice(0, 16);
}

function cloneArchetypeVector(archetypeState) {
  return { ...(archetypeState?.archetypeVector ?? archetypeState?.archetype_vector ?? {}) };
}

function uniqueTags(tags) {
  return [...new Set(tags.filter(Boolean))];
}

function normalizeMaxBeats(value) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return 4;
  }
  return Math.max(1, Math.min(24, number));
}
