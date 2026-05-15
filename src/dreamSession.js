import { createDreamWeather, createWeatherTrace } from './dreamWeather.js';
import { selectDreamJourney } from './dreamJourney.js';
import { createEchoTrace, selectPassage } from './passageLattice.js';
import { advanceSessionArc, createSessionArc } from './sessionArc.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { stableHash } from './stableHash.js';

const END_REASONS = Object.freeze({
  maxBeats: 'max_beats',
  checkpoint: 'checkpoint',
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
  beatsToRun = null,
  responses = [],
  initialArc = null,
  recentEchoTraces = [],
  stopWhenReturnAvailable = false,
  existingBeats = [],
  startBeatIndex = null,
  dreamflowState = null,
  sessionId = null
} = {}) {
  if (!dreamflow || typeof dreamflow.selectNext !== 'function') {
    throw new Error('runDreamSession requires a dreamflow generator');
  }

  applyDreamflowState(dreamflow, dreamflowState);

  const activeCovenant = createSessionCovenant(covenant ?? {});
  const beatLimit = normalizeMaxBeats(maxBeats);
  const beats = cloneJsonArray(existingBeats);
  const previousBeatCount = beats.length;
  const remainingBeats = Math.max(0, beatLimit - previousBeatCount);
  const runBudget = normalizeBeatsToRun(beatsToRun, remainingBeats);
  const firstNewBeatIndex = normalizeStartBeatIndex(startBeatIndex, previousBeatCount);
  const echoWindow = [...recentEchoTraces];
  let currentArc = initialArc
    ? createSessionArc(initialArc)
    : beats.at(-1)?.sessionArc
      ? createSessionArc(beats.at(-1).sessionArc)
      : null;
  let endedBecause = previousBeatCount >= beatLimit ? END_REASONS.maxBeats : END_REASONS.checkpoint;

  for (let localIndex = 0; localIndex < runBudget; localIndex += 1) {
    const beatNumber = firstNewBeatIndex + localIndex;
    const beatSeed = createBeatSeed(seed, beatNumber);
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
    const response = selectResponseForBeat(responses, localIndex);
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
      index: beatNumber,
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
  if (!isTerminalEndReason(endedBecause)) {
    endedBecause = beats.length >= beatLimit ? END_REASONS.maxBeats : END_REASONS.checkpoint;
  }

  return {
    schema: 'DreamSessionV1',
    schemaVersion: 1,
    sessionId: sessionId ?? createSessionId({ seed, beatLimit, firstEcho: echoWindow[0]?.passageId ?? null }),
    seed,
    maxBeats: beatLimit,
    completedBeats: beats.length,
    endedBecause,
    beats,
    finalSessionArc: currentArc ?? createSessionArc(),
    recentEchoTraces: echoWindow,
    dreamflowState: snapshotDreamflowState(dreamflow),
    finalDreamWeather: beats.at(-1)?.dreamWeather ?? null,
    finalSelectedDream: beats.at(-1)?.selectedDream ?? null
  };
}

export function runDreamSessionFromRuntime({
  runtime,
  covenant = null,
  seed = 0,
  maxBeats = 4,
  beatsToRun = null,
  responses = [],
  initialArc = null,
  recentEchoTraces = [],
  stopWhenReturnAvailable = false,
  dreamerMemoryContext = null,
  existingBeats = [],
  startBeatIndex = null,
  dreamflowState = null,
  sessionId = null
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
    beatsToRun,
    responses,
    initialArc,
    recentEchoTraces,
    stopWhenReturnAvailable,
    existingBeats,
    startBeatIndex,
    dreamflowState,
    sessionId
  });
}

export function createDreamSessionCheckpoint(session) {
  if (!session || session.schema !== 'DreamSessionV1') {
    throw new Error('createDreamSessionCheckpoint requires a DreamSessionV1 session');
  }

  return {
    schema: 'DreamSessionCheckpointV1',
    schemaVersion: 1,
    sessionId: session.sessionId,
    seed: session.seed,
    maxBeats: session.maxBeats,
    completedBeats: session.completedBeats,
    nextBeatIndex: session.completedBeats + 1,
    endedBecause: session.endedBecause,
    isComplete: isTerminalEndReason(session.endedBecause),
    beats: cloneJsonArray(session.beats),
    finalSessionArc: cloneJson(session.finalSessionArc),
    recentEchoTraces: cloneJsonArray(session.recentEchoTraces),
    dreamflowState: normalizeDreamflowState(session.dreamflowState),
    finalDreamWeather: cloneJson(session.finalDreamWeather),
    finalSelectedDream: cloneJson(session.finalSelectedDream)
  };
}

export function resumeDreamSessionFromRuntime({
  runtime,
  checkpoint,
  covenant = null,
  responses = [],
  beatsToRun = null,
  stopWhenReturnAvailable = false,
  dreamerMemoryContext = null,
  maxBeats = null
} = {}) {
  if (!checkpoint || checkpoint.schema !== 'DreamSessionCheckpointV1') {
    throw new Error('resumeDreamSessionFromRuntime requires a DreamSessionCheckpointV1 checkpoint');
  }
  if (checkpoint.isComplete) {
    return dreamSessionFromCheckpoint(checkpoint);
  }

  return runDreamSessionFromRuntime({
    runtime,
    covenant,
    seed: checkpoint.seed,
    maxBeats: maxBeats ?? checkpoint.maxBeats,
    beatsToRun,
    responses,
    initialArc: checkpoint.finalSessionArc,
    recentEchoTraces: checkpoint.recentEchoTraces,
    stopWhenReturnAvailable,
    dreamerMemoryContext,
    existingBeats: checkpoint.beats,
    startBeatIndex: checkpoint.nextBeatIndex,
    dreamflowState: checkpoint.dreamflowState,
    sessionId: checkpoint.sessionId
  });
}

function dreamSessionFromCheckpoint(checkpoint) {
  return {
    schema: 'DreamSessionV1',
    schemaVersion: 1,
    sessionId: checkpoint.sessionId,
    seed: checkpoint.seed,
    maxBeats: checkpoint.maxBeats,
    completedBeats: checkpoint.completedBeats,
    endedBecause: checkpoint.endedBecause,
    beats: cloneJsonArray(checkpoint.beats),
    finalSessionArc: cloneJson(checkpoint.finalSessionArc),
    recentEchoTraces: cloneJsonArray(checkpoint.recentEchoTraces),
    dreamflowState: normalizeDreamflowState(checkpoint.dreamflowState),
    finalDreamWeather: cloneJson(checkpoint.finalDreamWeather),
    finalSelectedDream: cloneJson(checkpoint.finalSelectedDream)
  };
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

function createSessionId({ seed, beatLimit, firstEcho }) {
  return `dream-session-${stableHash({ seed, beatLimit, firstEcho }).slice(0, 12)}`;
}

function snapshotDreamflowState(dreamflow) {
  return normalizeDreamflowState({
    schema: 'DreamflowRuntimeStateV1',
    schemaVersion: 1,
    randomState: Number.isInteger(dreamflow?.random?.state)
      ? dreamflow.random.state >>> 0
      : null
  });
}

function applyDreamflowState(dreamflow, dreamflowState) {
  const normalized = normalizeDreamflowState(dreamflowState);
  if (Number.isInteger(normalized.randomState) && dreamflow?.random) {
    dreamflow.random.state = normalized.randomState >>> 0;
  }
}

function normalizeDreamflowState(dreamflowState = null) {
  const randomState = Number.isInteger(dreamflowState?.randomState)
    ? dreamflowState.randomState >>> 0
    : null;

  return {
    schema: 'DreamflowRuntimeStateV1',
    schemaVersion: 1,
    randomState
  };
}

function isTerminalEndReason(reason) {
  return [
    END_REASONS.maxBeats,
    END_REASONS.returnAnchor,
    END_REASONS.returnAvailable
  ].includes(reason);
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

function normalizeBeatsToRun(value, remainingBeats) {
  if (remainingBeats <= 0) {
    return 0;
  }
  if (value === null || value === undefined) {
    return remainingBeats;
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return remainingBeats;
  }
  return Math.max(0, Math.min(remainingBeats, number));
}

function normalizeStartBeatIndex(value, previousBeatCount) {
  const expected = previousBeatCount + 1;
  return Number.isInteger(value) && value >= expected ? value : expected;
}

function cloneJsonArray(values = []) {
  return (Array.isArray(values) ? values : []).map(cloneJson);
}

function cloneJson(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}
