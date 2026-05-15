import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { createDeterministicClock } from './clock.js';
import { createDreamSessionCheckpoint, resumeDreamSessionFromRuntime, runDreamSessionFromRuntime } from './dreamSession.js';
import { toDreamJourneyTracePolicy, toGniDreamJourneyContext } from './dreamJourney.js';
import { toGniWeatherContext } from './dreamWeather.js';
import { GniBridge } from './gniBridge.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { applyPlayerInput } from './input.js';
import { buildThresholdPresentation } from './presentation.js';
import { loadGameState, saveGameState } from './persistence.js';
import { toGniPassageContext } from './passageLattice.js';
import { createJungialRuntime, createJungialRuntimeFromSave } from './runtime.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { SymbolGrammar } from './symbolGrammar.js';
import { TraceRecorder, writeTrace } from './trace.js';
import { deriveSessionCovenantFromListening, runFirstListeningSequence } from './firstListening.js';
import { createExperienceDirective } from './experienceDirector.js';
import { buildSessionFrame } from './sessionFrame.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const DEFAULT_MAX_BEATS = 5;
const DEFAULT_CHECKPOINT_AFTER_BEATS = 2;

export async function startDreamSessionCheckpointRun({
  seed = 777,
  savePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  maxBeats = DEFAULT_MAX_BEATS,
  checkpointAfterBeats = DEFAULT_CHECKPOINT_AFTER_BEATS,
  responses = [],
  sessionCovenant = null,
  firstListening = false,
  firstListeningBeats = undefined,
  trace = undefined,
  tracePath = undefined,
  catalog = undefined,
  clock = undefined
} = {}) {
  const runtime = createJungialRuntime({ seed, catalog, clock });
  const traceRecorder = createDreamSessionTraceRecorder({ trace, clock });
  const firstListeningRun = firstListening
    ? runFirstListeningSequence({
        seed,
        beats: firstListeningBeats
      })
    : null;
  const activeSessionCovenant = firstListeningRun
    ? deriveSessionCovenantFromListening({
        listeningRun: firstListeningRun,
        explicitSessionSettings: sessionCovenant ?? {}
      })
    : createSessionCovenant(sessionCovenant ?? {});
  const normalizedCheckpointAfterBeats = normalizeCheckpointBeatCount({ checkpointAfterBeats, maxBeats });
  traceRecorder.record('dream.session.started', {
    seed,
    maxBeats,
    checkpointAfterBeats: normalizedCheckpointAfterBeats
  });
  const transcript = prepareThreshold(runtime, { traceRecorder, firstListeningRun });
  const dreamSession = runDreamSessionFromRuntime({
    runtime,
    covenant: activeSessionCovenant,
    seed,
    maxBeats,
    beatsToRun: normalizedCheckpointAfterBeats,
    responses
  });
  recordDreamSessionBeats(traceRecorder, dreamSession, { fromBeatIndex: 1 });
  const checkpoint = createDreamSessionCheckpoint(dreamSession);
  traceRecorder.record('dream.session.checkpoint.saved', {
    savePath,
    sessionId: checkpoint.sessionId,
    completedBeats: checkpoint.completedBeats,
    nextBeatIndex: checkpoint.nextBeatIndex
  });
  const traceSnapshot = traceRecorder.snapshot();
  const savePayload = createDreamSessionSavePayload({
    runtime,
    dreamSession,
    checkpoint,
    sessionCovenant: activeSessionCovenant,
    firstListeningRun,
    traceSnapshot
  });

  await saveGameState(savePath, savePayload, { clock });
  if (tracePath) {
    await writeTrace(tracePath, traceSnapshot);
  }
  transcript.push(`Dream session checkpoint saved to ${savePath}.`);

  return {
    transcript,
    dreamSession,
    checkpoint,
    trace: traceSnapshot,
    thresholdPresentation: savePayload.thresholdPresentation,
    sessionCovenant: activeSessionCovenant,
    firstListeningRun,
    savePath
  };
}

export async function resumeDreamSessionCheckpointRun({
  savePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  outputPath = savePath,
  responses = [],
  beatsToRun = null,
  stopWhenReturnAvailable = false,
  sessionCovenant = null,
  dreamerMemoryContext = null,
  gniResponse = null,
  gniProvider = null,
  emulateGni = false,
  trace = undefined,
  tracePath = undefined,
  catalog = undefined,
  clock = undefined
} = {}) {
  const savedState = await loadGameState(savePath);
  const checkpoint = savedState.dreamSessionCheckpoint;

  if (!checkpoint || checkpoint.schema !== 'DreamSessionCheckpointV1') {
    throw new Error('resumeDreamSessionCheckpointRun requires a save with DreamSessionCheckpointV1');
  }

  const runtime = await createJungialRuntimeFromSave(savePath, {
    seed: checkpoint.seed,
    catalog,
    clock
  });
  const traceRecorder = createDreamSessionTraceRecorder({
    trace,
    savedTrace: savedState.trace,
    clock
  });
  traceRecorder.record('dream.session.resumed', {
    savePath,
    sessionId: checkpoint.sessionId,
    completedBeats: checkpoint.completedBeats,
    nextBeatIndex: checkpoint.nextBeatIndex
  });
  const activeSessionCovenant = createSessionCovenant(sessionCovenant ?? savedState.sessionCovenant ?? {});
  const dreamSession = resumeDreamSessionFromRuntime({
    runtime,
    checkpoint,
    covenant: activeSessionCovenant,
    responses,
    beatsToRun,
    stopWhenReturnAvailable,
    dreamerMemoryContext
  });
  const resumedCheckpoint = createDreamSessionCheckpoint(dreamSession);
  recordDreamSessionBeats(traceRecorder, dreamSession, { fromBeatIndex: checkpoint.nextBeatIndex });
  const shouldApplyReturnEffects = !checkpoint.isComplete && resumedCheckpoint.isComplete;
  const returnEffects = shouldApplyReturnEffects
    ? applyDreamReturnEffects({ runtime, dreamSession, sessionCovenant: activeSessionCovenant })
    : null;
  if (returnEffects) {
    recordDreamReturnEffects(traceRecorder, { dreamSession, returnEffects });
  }
  const gniEffects = returnEffects
    ? await processDreamReturnGni({
        runtime,
        returnEffects,
        gniResponse,
        gniProvider,
        emulateGni,
        seed: dreamSession.seed,
        traceRecorder
      })
    : null;
  const experienceDirective = returnEffects
    ? createExperienceDirective({
        seed: dreamSession.seed,
        firstListeningRun: savedState.firstListeningRun ?? null,
        sessionCovenant: activeSessionCovenant,
        sessionArc: dreamSession.finalSessionArc,
        dreamWeather: dreamSession.finalDreamWeather,
        dreamerMemoryContext,
        architectState: runtime.architect.snapshot(),
        appliedGniDirective: gniEffects?.appliedGniDirective ?? null
      })
    : savedState.experienceDirective ?? null;
  if (experienceDirective) {
    traceRecorder.record('experience.directive.created', {
      directiveId: experienceDirective.directiveId,
      nextMove: experienceDirective.nextMove,
      suggestedRole: experienceDirective.suggestedRole,
      pressureTarget: experienceDirective.pressureTarget,
      returnReadiness: experienceDirective.returnReadiness,
      reasonCodes: experienceDirective.reasonCodes
    });
  }
  traceRecorder.record(resumedCheckpoint.isComplete ? 'dream.session.saved' : 'dream.session.checkpoint.saved', {
    savePath: outputPath,
    sessionId: resumedCheckpoint.sessionId,
    completedBeats: resumedCheckpoint.completedBeats,
    endedBecause: resumedCheckpoint.endedBecause,
    isComplete: resumedCheckpoint.isComplete
  });
  const traceSnapshot = traceRecorder.snapshot();
  const savePayload = createDreamSessionSavePayload({
    runtime,
    dreamSession,
    checkpoint: resumedCheckpoint,
    sessionCovenant: activeSessionCovenant,
    returnEffects,
    gniEffects,
    experienceDirective,
    traceSnapshot,
    previousState: savedState
  });
  const transcript = ['Dream session resumed from checkpoint.'];

  if (returnEffects?.entry) {
    transcript.push(`Journal of Mirrors: ${returnEffects.entry.text}`);
    transcript.push(`Architect updates ${Object.keys(returnEffects.architectUpdate.adjustedWeights).length} dream weight(s).`);
    transcript.push(`GNI request prepared as ${gniEffects.pendingGniRequest.contract.inputFormat} -> ${gniEffects.pendingGniRequest.contract.outputFormat}.`);
    if (gniEffects.appliedGniDirective) {
      transcript.push(`GNI directive applied: ${Object.keys(gniEffects.appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
    } else if (gniEffects.queuedGniRequest) {
      transcript.push('GNI request queued for later processing.');
    }
  } else if (!resumedCheckpoint.isComplete) {
    transcript.push(`Dream session checkpoint saved to ${outputPath}.`);
  } else {
    transcript.push('Dream session was already complete; no new return entry was written.');
  }

  await saveGameState(outputPath, savePayload, { clock });
  if (tracePath) {
    await writeTrace(tracePath, traceSnapshot);
  }

  return {
    transcript,
    dreamSession,
    checkpoint: resumedCheckpoint,
    entry: returnEffects?.entry ?? null,
    architectUpdate: returnEffects?.architectUpdate ?? null,
    gniRequest: gniEffects?.pendingGniRequest ?? null,
    gniBridgeResult: gniEffects?.gniBridgeResult ?? null,
    gniQueue: runtime.gniQueue.snapshot(),
    appliedGniDirective: gniEffects?.appliedGniDirective ?? null,
    directiveUpdate: gniEffects?.directiveUpdate ?? null,
    experienceDirective,
    trace: traceSnapshot,
    thresholdPresentation: savePayload.thresholdPresentation,
    sessionCovenant: activeSessionCovenant,
    savePath,
    outputPath
  };
}

export async function runDreamSessionCheckpointDemo({
  seed = 777,
  checkpointSavePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  finalSavePath = join(root, 'saves', 'dream-session-resumed.json'),
  sessionCovenant = {
    toneTags: ['strange', 'dark'],
    intensityCeiling: 0.62
  },
  gniResponse = null,
  gniProvider = null,
  emulateGni = false,
  firstListening = false,
  firstListeningBeats = undefined,
  tracePath = undefined,
  clock = undefined,
  catalog = undefined
} = {}) {
  const start = await startDreamSessionCheckpointRun({
    seed,
    savePath: checkpointSavePath,
    maxBeats: DEFAULT_MAX_BEATS,
    checkpointAfterBeats: DEFAULT_CHECKPOINT_AFTER_BEATS,
    sessionCovenant,
    firstListening,
    firstListeningBeats,
    catalog,
    clock,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.46 }
    ]
  });
  const resumed = await resumeDreamSessionCheckpointRun({
    savePath: checkpointSavePath,
    outputPath: finalSavePath,
    sessionCovenant,
    gniResponse,
    gniProvider,
    emulateGni,
    tracePath,
    catalog,
    clock,
    responses: [
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
      {
        kind: 'return_anchor',
        gestureTags: ['touched_note'],
        pressureAccepted: 0.2,
        returnAnchorUsed: true
      }
    ]
  });

  return {
    checkpointSavePath,
    finalSavePath,
    start,
    resumed,
    transcript: [...start.transcript, ...resumed.transcript]
  };
}

export function parseDreamSessionSaveFlowArgs(args = []) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      options.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--checkpoint-save=')) {
      options.checkpointSavePath = arg.slice('--checkpoint-save='.length);
    } else if (arg.startsWith('--final-save=')) {
      options.finalSavePath = arg.slice('--final-save='.length);
    } else if (arg === '--first-listening') {
      options.firstListening = true;
    } else if (arg.startsWith('--trace=')) {
      options.tracePath = arg.slice('--trace='.length);
    } else if (arg.startsWith('--gni-response=')) {
      options.gniResponsePath = arg.slice('--gni-response='.length);
    } else if (arg === '--emulate-gni') {
      options.emulateGni = true;
    } else if (arg.startsWith('--gni-endpoint=')) {
      options.gniEndpoint = arg.slice('--gni-endpoint='.length);
    } else if (arg.startsWith('--gni-token-env=')) {
      options.gniTokenEnv = arg.slice('--gni-token-env='.length);
    } else if (arg.startsWith('--gni-timeout-ms=')) {
      options.gniTimeoutMs = Number(arg.slice('--gni-timeout-ms='.length));
    } else if (arg.startsWith('--clock-start=')) {
      options.clockStartIso = arg.slice('--clock-start='.length);
    } else if (arg.startsWith('--clock-step-ms=')) {
      options.clockStepMs = Number(arg.slice('--clock-step-ms='.length));
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

export function createGniProviderFromDreamSessionOptions(options = {}) {
  if (!options.gniEndpoint) {
    return null;
  }

  const tokenEnv = options.gniTokenEnv ?? 'GNI_API_KEY';
  return new GniHttpProvider({
    endpoint: options.gniEndpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: Number.isFinite(options.gniTimeoutMs) ? options.gniTimeoutMs : 10000
  });
}

function prepareThreshold(runtime, { traceRecorder = null, firstListeningRun = null } = {}) {
  const transcript = [];

  transcript.push('Threshold Chamber: silent, dim, confined.');
  transcript.push(`A small note waits: "${runtime.chamber.note}".`);
  if (firstListeningRun) {
    transcript.push('The room listens before the key turns.');
    recordFirstListeningTrace(traceRecorder, firstListeningRun);
  }
  traceRecorder?.record('threshold.input', { kind: 'speech', text: 'the word' });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  transcript.push('The Heartlight opens. Tools become visible.');
  traceRecorder?.record('threshold.awakened', {
    room: runtime.chamber.snapshot(),
    vibeState: runtime.feeling.vibeState,
    dominantArchetype: runtime.archetypes.dominantArchetype()
  });
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);
  transcript.push('The Key of Portals turns without sound.');
  traceRecorder?.record('portal.opened', { room: runtime.chamber.snapshot() });

  return transcript;
}

function recordFirstListeningTrace(traceRecorder, firstListeningRun) {
  traceRecorder?.record('first.listening.started', {
    seed: firstListeningRun.seed,
    beatCount: firstListeningRun.beats.length
  });
  for (const beat of firstListeningRun.beats) {
    traceRecorder?.record('first.listening.beat.recorded', {
      beatId: beat.beatId,
      symbolicObjectId: beat.symbolicObjectId,
      responseKind: beat.responseKind,
      gestureTags: beat.gestureTags,
      motifTags: beat.motifTags,
      pressureAccepted: beat.pressureAccepted,
      boundarySignals: beat.boundarySignals
    });
  }
  traceRecorder?.record('first.listening.completed', {
    derivedToneTags: firstListeningRun.derivedToneTags,
    intensityHint: firstListeningRun.intensityHint,
    returnAnchorHint: firstListeningRun.returnAnchorHint,
    redactedSummary: firstListeningRun.redactedSummary
  });
}

function applyDreamReturnEffects({ runtime, dreamSession, sessionCovenant }) {
  const dreamJourney = createDreamSessionJourney(dreamSession);
  const symbolGrammar = createDreamSessionSymbolGrammar({
    dreamSession,
    vibeState: runtime.feeling.vibeState
  });
  const entry = runtime.journal.writeReturnEntry({
    symbols: dreamJourney.symbolTrail,
    actions: runtime.archetypes.recentActions(),
    dominantArchetype: runtime.archetypes.dominantArchetype(),
    vibeState: runtime.feeling.vibeState,
    journey: dreamJourney,
    symbolGrammar
  });
  const lastBeat = dreamSession.beats.at(-1) ?? null;
  const bundle = runtime.witness.toSessionBundle({ selectedDream: dreamSession.finalSelectedDream });

  bundle.sessionCovenant = sessionCovenant;
  bundle.passageContext = toGniPassageContext({
    activePassage: lastBeat?.passage ?? null,
    recentEchoTraces: dreamSession.recentEchoTraces
  });
  bundle.dreamWeatherContext = toGniWeatherContext({
    dreamWeather: dreamSession.finalDreamWeather,
    weatherTrace: lastBeat?.weatherTrace ?? null
  });
  bundle.dreamJourneyContext = toGniDreamJourneyContext(dreamJourney);

  return {
    entry,
    dreamJourney,
    symbolGrammar,
    sessionBundle: bundle,
    architectUpdate: runtime.architect.update(bundle)
  };
}

async function processDreamReturnGni({
  runtime,
  returnEffects,
  gniResponse,
  gniProvider,
  emulateGni,
  seed,
  traceRecorder = null
}) {
  const gniBridge = new GniBridge({ adapter: runtime.gni, provider: gniProvider });
  const gniBridgeResult = await gniBridge.processSessionBundle({
    sessionBundle: returnEffects.sessionBundle,
    providedDirective: gniResponse,
    emulate: emulateGni,
    seed
  });
  const pendingGniRequest = gniBridgeResult.request;
  if (pendingGniRequest) {
    traceRecorder?.record('gni.request.created', {
      provider: pendingGniRequest.provider,
      endpoint: pendingGniRequest.endpoint,
      contract: pendingGniRequest.contract,
      sessionId: pendingGniRequest.payload.sessionId
    });
  }
  if (gniBridgeResult.firebreakTrace?.changed) {
    traceRecorder?.record('gni.firebreak.applied', {
      source: gniBridgeResult.firebreakTrace.source,
      suppressedCounts: gniBridgeResult.firebreakTrace.suppressedCounts,
      clampCounts: gniBridgeResult.firebreakTrace.clampCounts,
      boundaryTags: gniBridgeResult.firebreakTrace.boundaryTags
    });
  }
  if (gniBridgeResult.source === 'emulator') {
    traceRecorder?.record('gni.emulator.directive.created', {
      directive: gniBridgeResult.directive
    });
  }
  if (gniBridgeResult.source === 'provider' && gniBridgeResult.status === 'directive_ready') {
    traceRecorder?.record('gni.provider.directive.created', {
      directive: gniBridgeResult.directive
    });
  }
  if (gniBridgeResult.status === 'provider_error') {
    traceRecorder?.record('gni.provider.error', { errors: gniBridgeResult.errors });
  }
  const appliedGniDirective = gniBridgeResult.directive;
  const queuedGniRequest = !appliedGniDirective && pendingGniRequest
    ? runtime.gniQueue.enqueue({
        request: pendingGniRequest,
        reason: gniBridgeResult.status,
        providerJob: gniBridgeResult.providerJob
      })
    : null;
  if (queuedGniRequest) {
    traceRecorder?.record('gni.request.queued', {
      id: queuedGniRequest.id,
      reason: queuedGniRequest.reason,
      sessionId: pendingGniRequest.payload.sessionId
    });
  }
  const directiveUpdate = appliedGniDirective
    ? runtime.architect.applyDirective(appliedGniDirective)
    : null;
  if (appliedGniDirective) {
    traceRecorder?.record('gni.directive.applied', {
      directive: appliedGniDirective,
      update: directiveUpdate
    });
  }

  return {
    pendingGniRequest,
    gniBridgeResult,
    queuedGniRequest,
    appliedGniDirective,
    directiveUpdate
  };
}

function createDreamSessionSavePayload({
  runtime,
  dreamSession,
  checkpoint,
  sessionCovenant,
  firstListeningRun = null,
  experienceDirective = null,
  returnEffects = null,
  gniEffects = null,
  traceSnapshot = null,
  previousState = {}
}) {
  const lastBeat = dreamSession.beats.at(-1) ?? null;
  const dreamJourney = returnEffects?.dreamJourney
    ?? previousState.dreamJourney
    ?? (checkpoint.isComplete ? createDreamSessionJourney(dreamSession) : null);
  const symbolGrammar = returnEffects?.symbolGrammar?.snapshot?.()
    ?? previousState.symbolGrammar
    ?? (checkpoint.isComplete
      ? createDreamSessionSymbolGrammar({ dreamSession, vibeState: runtime.feeling.vibeState }).snapshot()
      : new SymbolGrammar().snapshot());
  const thresholdPresentation = buildThresholdPresentation({
    chamber: runtime.chamber,
    feeling: runtime.feeling,
    dreamWeather: dreamSession.finalDreamWeather,
    sessionCovenant
  });
  const sessionFrame = experienceDirective
    ? buildSessionFrame({
        seed: dreamSession.seed,
        thresholdPresentation,
        experienceDirective,
        sessionCovenant,
        trace: traceSnapshot ?? previousState.trace
      })
    : previousState.sessionFrame;

  return stripUndefined({
    room: runtime.chamber.snapshot(),
    archetypeState: runtime.archetypes.snapshot(),
    feelingState: runtime.feeling.snapshot(),
    journal: runtime.journal.snapshot(),
    architectState: runtime.architect.snapshot(),
    dreamSession,
    dreamSessionCheckpoint: checkpoint,
    dreamJourney,
    symbolGrammar,
    thresholdPresentation,
    sessionFrame,
    sessionCovenant,
    firstListeningRun: firstListeningRun ?? previousState.firstListeningRun,
    experienceDirective: experienceDirective ?? previousState.experienceDirective,
    activePassage: lastBeat?.passage ?? previousState.activePassage ?? null,
    echoTrace: lastBeat?.echoTrace ?? previousState.echoTrace ?? null,
    dreamWeather: dreamSession.finalDreamWeather ?? previousState.dreamWeather ?? null,
    weatherTrace: lastBeat?.weatherTrace ?? previousState.weatherTrace ?? null,
    lastSessionBundle: returnEffects?.sessionBundle ?? previousState.lastSessionBundle,
    pendingGniRequest: gniEffects?.pendingGniRequest ?? previousState.pendingGniRequest,
    gniBridgeResult: gniEffects?.gniBridgeResult ?? previousState.gniBridgeResult,
    appliedGniDirective: gniEffects ? gniEffects.appliedGniDirective : previousState.appliedGniDirective,
    directiveUpdate: gniEffects ? gniEffects.directiveUpdate : previousState.directiveUpdate,
    trace: traceSnapshot ?? previousState.trace,
    gniQueue: runtime.gniQueue.snapshot()
  });
}

function recordDreamSessionBeats(traceRecorder, dreamSession, { fromBeatIndex }) {
  for (const beat of dreamSession.beats.filter((entry) => entry.index >= fromBeatIndex)) {
    traceRecorder.record('dream.session.beat.completed', {
      sessionId: dreamSession.sessionId,
      index: beat.index,
      passageId: beat.passage?.id ?? null,
      selectedDreamId: beat.selectedDream?.id ?? null,
      selectedDreamName: beat.selectedDream?.name ?? null,
      arcDecision: beat.arcDirective?.decision ?? null,
      suggestedRole: beat.arcDirective?.suggestedRole ?? null,
      returnAvailable: Boolean(beat.returnAvailable),
      echoTrace: beat.echoTrace,
      weatherId: beat.dreamWeather?.weatherId ?? null,
      weatherPressure: beat.dreamWeather?.pressure ?? null
    });
  }
}

function recordDreamReturnEffects(traceRecorder, { dreamSession, returnEffects }) {
  traceRecorder.record('dream.session.completed', {
    sessionId: dreamSession.sessionId,
    endedBecause: dreamSession.endedBecause,
    completedBeats: dreamSession.completedBeats,
    finalDreamId: dreamSession.finalSelectedDream?.id ?? null
  });
  traceRecorder.record('dream.journey.selected', {
    summary: returnEffects.dreamJourney.summary,
    symbolTrail: returnEffects.dreamJourney.symbolTrail,
    beats: returnEffects.dreamJourney.beats,
    policy: toDreamJourneyTracePolicy(returnEffects.dreamJourney)
  });
  traceRecorder.record('journal.entry.written', {
    entryId: returnEffects.entry.id,
    symbols: returnEffects.entry.symbols,
    dominantArchetype: returnEffects.entry.dominantArchetype,
    vibeState: returnEffects.entry.vibeState
  });
  traceRecorder.record('witness.bundle.created', {
    sessionId: returnEffects.sessionBundle.sessionId,
    dominantArchetype: returnEffects.sessionBundle.dominantArchetype,
    coherence: returnEffects.sessionBundle.coherence,
    recentSymbols: returnEffects.sessionBundle.recentSymbols,
    dreamJourneyContext: returnEffects.sessionBundle.dreamJourneyContext
  });
}

function createDreamSessionTraceRecorder({ trace = null, savedTrace = null, clock = undefined } = {}) {
  if (trace) {
    return trace;
  }

  const recorder = new TraceRecorder({
    clock: clock?.fork?.() ?? undefined,
    runId: savedTrace?.runId
  });
  if (savedTrace?.schema === 'JungialTraceV1' && Array.isArray(savedTrace.entries)) {
    recorder.entries = savedTrace.entries.map((entry) => structuredClone(entry));
  }
  return recorder;
}

function createDreamSessionJourney(dreamSession) {
  const beats = dreamSession.beats.map((beat) => ({
    role: beat.arcDirective?.suggestedRole ?? 'entry',
    moduleId: beat.selectedDream?.id ?? null,
    moduleName: beat.selectedDream?.name ?? 'Unknown',
    symbolicTags: [...(beat.selectedDream?.symbolicTags ?? [])],
    weightBreakdown: { ...(beat.selectedDream?.weightBreakdown ?? {}) }
  }));
  const symbolTrail = uniqueTags(beats.flatMap((beat) => beat.symbolicTags));
  const policies = dreamSession.beats
    .map((beat) => beat.dreamJourney?.policy)
    .filter(Boolean);

  return {
    schema: 'DreamJourneyV1',
    beats,
    symbolTrail,
    summary: beats.map((beat) => `${beat.role}:${beat.moduleName}`).join(' -> '),
    policy: {
      schema: 'DreamJourneyPolicyV1',
      schemaVersion: 1,
      hardBoundaryTags: uniqueTags(policies.flatMap((policy) => policy.hardBoundaryTags ?? [])),
      suppressedModuleIds: uniqueTags(policies.flatMap((policy) => policy.suppressedModuleIds ?? [])),
      replacementRoutes: uniqueRoutes(policies.flatMap((policy) => policy.replacementRoutes ?? [])),
      fallbackUsed: policies.some((policy) => policy.fallbackUsed),
      playerFacingText: null
    }
  };
}

function createDreamSessionSymbolGrammar({ dreamSession, vibeState }) {
  const grammar = new SymbolGrammar();

  for (const beat of dreamSession.beats) {
    grammar.ingest({
      symbols: beat.selectedDream?.symbolicTags ?? [],
      vibeState
    });
  }

  return grammar;
}

function normalizeCheckpointBeatCount({ checkpointAfterBeats, maxBeats }) {
  const beatLimit = Number.isInteger(Number(maxBeats)) ? Math.max(1, Number(maxBeats)) : DEFAULT_MAX_BEATS;
  const requested = Number.isInteger(Number(checkpointAfterBeats))
    ? Number(checkpointAfterBeats)
    : DEFAULT_CHECKPOINT_AFTER_BEATS;
  const largestIncompleteBeat = Math.max(1, beatLimit - 1);

  return Math.max(1, Math.min(requested, largestIncompleteBeat));
}

function uniqueTags(tags = []) {
  return [...new Set(tags.filter(Boolean))];
}

function uniqueRoutes(routes = []) {
  const seen = new Set();
  const result = [];
  for (const route of routes) {
    const key = JSON.stringify(route);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(route);
    }
  }
  return result;
}

function stripUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseDreamSessionSaveFlowArgs(process.argv.slice(2));
  const clock = options.clockStartIso
    ? createDeterministicClock({ startIso: options.clockStartIso, stepMs: options.clockStepMs ?? 1000 })
    : undefined;
  const gniResponse = options.gniResponsePath
    ? JSON.parse(await readFile(options.gniResponsePath, 'utf8'))
    : null;
  const result = await runDreamSessionCheckpointDemo({
    ...options,
    gniResponse,
    gniProvider: createGniProviderFromDreamSessionOptions(options),
    clock
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.transcript.join('\n'));
    console.log(`Checkpoint save: ${result.checkpointSavePath}`);
    console.log(`Final save: ${result.finalSavePath}`);
  }
}
